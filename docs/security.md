# LightOS Security Architecture

## Design Principles

1. **Zero-trust device enrollment**: no device is trusted before cryptographic attestation
2. **Immutable rootfs**: the OS root filesystem is read-only and hash-verified at boot
3. **Least privilege**: every process runs with minimum AppArmor and capability scope
4. **Mutual authentication**: all control plane channels use mTLS with TPM-backed certificates
5. **Auditability**: all security events emit structured logs to a tamper-evident log store

---

## Boot Trust Chain

```
┌───────────────────────────────────────────────────────────────┐
│  Power On                                                     │
│      ↓                                                        │
│  UEFI Secure Boot (MOK signed shim)                           │
│      ↓                                                        │
│  GRUB2 (MOK signed, measures kernel + initrd into TPM PCR[4]) │
│      ↓                                                        │
│  Kernel 6.8-lightrail-rv64 (IMA appraisal enabled)                 │
│      ↓                                                        │
│  initrd: dm-verity mount of rootfs (PCR[9] = verity hash)     │
│      ↓                                                        │
│  systemd: starts lrd, verifies PCR policy before unsealing    │
│  device key from TPM NVRAM                                     │
└───────────────────────────────────────────────────────────────┘
```

### PCR Register Usage

| PCR | Content | Used For |
|-----|---------|----------|
| 0 | UEFI firmware | Platform identity |
| 4 | Boot loader (GRUB2) | Boot integrity |
| 7 | Secure Boot state | Policy gate |
| 9 | dm-verity root hash | Rootfs integrity |
| 11 | IMA measurement log | Runtime file integrity |
| 14 | MOK certificates | Key attestation |

### dm-verity

The rootfs is a squashfs volume mounted read-only with dm-verity. The Verity hash tree is stored in a separate partition. The root hash is embedded in the initrd and verified at mount time. Any bit-flip in the rootfs causes an I/O error, not silent data corruption.

```
/dev/sda3 (rootfs, squashfs, RO)
   └── dm-verity device
         ├── hash tree: /dev/sda4
         └── root hash: embedded in initrd (signed with OTA signing key)
```

---

## TPM Enrollment Flow

```
Device                          Fleet Control Plane (lrd enrollment svc)
  │                                         │
  │── 1. GET /fleet/enroll/nonce ──────────▶│
  │◀── nonce (random 32 bytes) ─────────────│
  │                                         │
  │  2. TPM2_Quote(PCRs=[0,4,7,9,11,14],   │
  │               nonce=nonce,             │
  │               key=AK)                  │
  │                                         │
  │── 3. POST /fleet/devices/enroll ───────▶│
  │     { hostname, serial, model,          │
  │       pcr_quote (TPM2B_ATTEST),         │  4. Verify EK cert chain
  │       pcr_signature (TPMT_SIGNATURE),   │     against TPM mfr CA
  │       nonce, ek_cert (PEM) }            │
  │                                         │  5. Validate PCR quote
  │                                         │     against known-good PCR values
  │                                         │
  │◀── 6. { device_id, est_token } ────────│
  │                                         │
  │── 7. EST /simpleenroll (CSR) ──────────▶│
  │◀── 8. Device Certificate (PEM) ─────────│  (signed by Fleet CA Intermediate)
  │                                         │
  │  9. Seal device key to TPM              │
  │     PCR policy = [0,4,7,9]             │
  │                                         │
  │── 10. First telemetry heartbeat ───────▶│
```

### Fleet CA Hierarchy

```
LightRail Offline Root CA (air-gapped HSM)
  └── LightRail Fleet Intermediate CA G1 (online, HSM-backed)
        └── Device Certificate (TPM EK-bound, 1-year validity)
              └── mTLS identity for all fleet control channels
```

- Root CA: offline, stored in HSM, used only to sign intermediate
- Intermediate CA: online, HSM-backed, issues device certs via EST
- Device certs: tied to TPM EK, valid 1 year, renewable via EST re-enrollment
- CRL published every 6 hours; OCSP responder for real-time checks

---

## AppArmor Profiles

AppArmor is the primary LSM. All LightRail services run under enforce-mode profiles.

### Profile Strategy

| Process | Profile | Key Restrictions |
|---------|---------|-----------------|
| lrd | `/etc/apparmor.d/lightrail.lrd` | No exec of arbitrary binaries, TPM char device access only |
| containerd | `/etc/apparmor.d/lightrail.containerd` | Cannot write to host rootfs |
| GPU workload containers | `/etc/apparmor.d/lightrail.gpu-workload` | No network unless explicitly allowed |
| Fabric driver | `/etc/apparmor.d/lightrail.fabric-driver` | Only lightrail PCI devices |
| Operator desktop (Wayland) | `/etc/apparmor.d/lightrail.desktop` | No access to /etc, /boot, /sys/firmware |

### Example: lrd profile

```
#include <tunables/global>

profile lightrail-lrd /usr/sbin/lrd {
  #include <abstractions/base>

  /dev/tpm0 rw,
  /dev/tpmrm0 rw,
  /var/lib/lrd/** rw,
  /etc/lightrail/** r,
  /run/lrd.sock rw,

  network inet stream,
  network inet6 stream,

  deny /boot/** rwx,
  deny /etc/shadow r,
  deny /proc/sysrq-trigger w,

  capability net_admin,
  capability sys_ptrace,

  deny capability sys_admin,
  deny capability sys_rawio,
}
```

---

## mTLS Architecture

All control plane communication uses mTLS. The device certificate (from Fleet CA) serves as both the client and server identity.

```
lrd (device cert) ────────── mTLS ────────── Fleet Control Plane (server cert)
lrd (device cert) ────────── mTLS ────────── Cluster API (server cert)
operator shell   ────────── mTLS ────────── API Gateway (server cert)
```

- TLS 1.3 only (no TLS 1.2 fallback)
- Cipher suite: TLS_AES_256_GCM_SHA384, TLS_CHACHA20_POLY1305_SHA256
- Certificate pinning on lrd: Fleet CA intermediate SPKI hash pinned in lrd config
- HSTS on all HTTPS endpoints

---

## OTA Image Signing

OTA images are signed with Ed25519 keys managed in the LightRail signing HSM.

```
Build Pipeline:
  squashfs image → sha256sum → Ed25519 sign (HSM) → publish to CDN

Device:
  download image → verify sha256 → verify Ed25519 sig (against embedded public key) → apply
```

- Signing key rotated annually
- Previous public key retained for 90 days (overlap for in-flight OTA)
- Image manifest includes: version, sha256, sig, min_os_version, rollback_allowed

---

## Security Event Logging

All security-relevant events are logged to a structured, append-only audit log:

| Event | Fields |
|-------|--------|
| Device enrolled | device_id, hostname, pcr_digest, ip, timestamp |
| Attestation verified | device_id, pcr_quote_hash, result |
| Attestation failed | device_id, expected_pcr, actual_pcr |
| OTA applied | device_id, from_version, to_version, image_hash |
| Cert issued | device_id, serial, expiry, issuer |
| Cert revoked | device_id, reason |
| mTLS auth failure | client_ip, sni, error |
| AppArmor deny | process, denied_operation, timestamp |

Logs are shipped to a SIEM via syslog-ng + TLS. Retention: 1 year minimum.
