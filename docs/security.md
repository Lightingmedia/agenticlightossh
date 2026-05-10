# LightOS Security and Trust Architecture

**Scope:** Boot trust, OS hardening, device identity, enrollment, mTLS, OTA integrity, fleet CA  
**Target:** All LightOS deployments (appliance, cluster controller, edge)

---

## Threat Model

LightOS is deployed in environments where:
- Physical hardware may be delivered through a supply chain with partial trust
- Network access to cluster nodes may be shared with other tenants (co-lo, cloud-adjacent edge)
- Firmware-level attacks (BIOS/UEFI tampering, boot chain injection) are in scope
- Insider threats (rogue operator with physical access) must be detected, not just blocked
- Software supply chain integrity (OTA image tampering, dependency injection) is a concern

**Out of scope (for Phase 1–2):**
- Side-channel attacks on workload data
- Hardware Trojan detection
- Cryptographic key extraction from PCB-level physical access

---

## Boot Trust Chain

### UEFI Secure Boot

Every LightOS image is built with a Secure Boot chain:

```
UEFI firmware (platform keys: PK, KEK)
  └── shim.efi (signed by Microsoft KEK for broad HW compat)
        └── grub.efi (signed by LightRail Secure Boot key)
              └── vmlinuz-6.8-lightrail (signed by LightRail kernel signing key)
                    └── initramfs (verified by kernel dm-verity at pivot)
```

**LightRail Secure Boot key:** 2048-bit RSA, stored offline in an HSM. Used only during image build.

For appliance hardware (LightRail NCE series): the platform ships with LightRail's own PK and KEK enrolled, removing the need for the shim/Microsoft intermediary.

### Measured Boot (TPM 2.0)

At each boot stage, the bootloader extends TPM PCR registers:

| PCR | Content |
|---|---|
| PCR[0] | UEFI firmware measurement (BIOS) |
| PCR[2] | UEFI option ROMs |
| PCR[4] | Boot loader code (shim + GRUB) |
| PCR[7] | Secure Boot policy state |
| PCR[8] | GRUB command line |
| PCR[9] | Initramfs |
| PCR[11] | LightRail custom: dm-verity rootfs hash |
| PCR[12] | LightRail custom: `lrd.conf` hash |

On enrollment, the Fleet CA receives a PCR quote (PCR[0–12]) signed by the TPM's Attestation Key. The CA stores the "known-good" PCR baseline per device model.

On each subsequent Fleet API call (telemetry, OTA poll), `lrd` sends a fresh PCR quote. The Fleet API validates it:
- If PCR values changed unexpectedly → node flagged `attestation_ok: false`
- Operator is notified (FleetApp shows `ATTEST FAILED` badge)
- OTA updates are blocked for the node until re-attested

### dm-verity Rootfs Integrity

The A and B rootfs partitions are formatted with dm-verity:

```
dm-verity layout:
  /dev/sda2    (Slot A, ext4)
  /dev/sda2+h  (Hash tree — appended to partition or separate)
  
Root hash embedded in kernel cmdline (GRUB config — itself measured by PCR[8]):
  dm-verity.root_hash=sha256:<hash>
  
At boot: device-mapper verifies every 4KB block against the hash tree.
Any tampered block causes an I/O error (kernel panic if rootfs).
```

The root hash is signed with the OTA signing key. GRUB verifies the signature before adding the cmdline parameter.

---

## AppArmor Profiles

AppArmor is the primary LSM. All LightRail services ship with mandatory enforcement profiles.

**Profile strategy:**
- Phase 2: develop profiles in `complain` mode (log violations, don't block)
- Phase 3: move to `enforce` mode after profiling real workloads
- Profiles are version-controlled and deployed as part of the OS image (not configurable post-boot)

**Key profiles:**

```
/etc/apparmor.d/
  usr.lib.lightrail.lrd              (lrd daemon: fabric MMIO, /sys/bus/pci, gRPC port 7100)
  usr.lib.lightrail.ota-agent        (OTA: http/https outbound, /dev/sdaX write, /sys/block)
  usr.lib.lightrail.enrollment       (enrollment: TPM /dev/tpm0, outbound https fleet CA)
  usr.lib.lightrail.telemetry        (telemetry: outbound https prometheus, read /proc /sys)
  usr.bin.k3s                        (K3s: broad container management, restricted syscalls)
```

**lrd profile key rules:**
```
/dev/tpm0 rw,                       # TPM access for key ops and PCR quotes
/sys/bus/pci/devices/**/resource* r, # NCE hardware register MMIO read
/sys/bus/pci/devices/**/resource*w r, # NCE write for dispatch commands
network tcp port 7100,               # gRPC scheduler API
/etc/lightrail/** r,                 # config read
/var/lib/lightrail/** rw,            # state write
deny /proc/*/mem rw,                 # deny process memory injection
deny @{PROC}/@{pid}/task/{[0-9]*,}/ w,
```

---

## Device Identity and Enrollment

### Key Hierarchy

```
LightRail Root CA (offline, HSM — air-gapped)
  └── Fleet Intermediate CA (online, HSM-backed, 3-year validity)
        ├── Device Certificate (TPM-bound, 1-year validity, per-node)
        ├── Cluster Service Certificate (per K3s cluster control plane)
        └── OTA Image Signing Key (Ed25519, separate HSM slot)
```

### First Boot Enrollment Sequence

```
1. lrd starts → detects no device cert at /etc/lightrail/device.crt
2. Generate EC P-256 key pair in TPM 2.0 NVRAM (restricted key, no export)
3. Generate PKCS#10 CSR:
     CN = <hostname>
     SAN = lightrail-device:<serial>
     Subject: O=LightRailAI, OU=Fleet, CN=<hostname>
4. Collect TPM PCR[0–12] quote (signed by TPM AIK)
5. POST to Fleet CA:
     {
       "csr_pem": "...",
       "pcr_quote_hex": "...",
       "pcr_signature_hex": "...",
       "device_serial": "LR-NCE-2024-0001"
     }
6. Fleet CA validates:
     a. PCR values match known-good baseline for this device model
     b. CSR signature verifiable by TPM endorsement key cert chain
     c. Serial not already enrolled (prevent replay)
7. Fleet CA issues device cert (1 year), signs with Intermediate CA
8. lrd stores cert at /etc/lightrail/device.crt (world-readable, key stays in TPM)
9. lrd transitions to ENROLLED state → starts fleet API heartbeat with mTLS
```

### Certificate Renewal

30 days before expiry, `lrd` automatically:
1. Generates a new CSR from the same TPM key (or a fresh key if configured)
2. Posts renewal request with current device cert (proves continuity of identity)
3. Fleet CA issues renewed cert
4. Old cert stays valid until new cert is confirmed active

Operators can force renewal via `POST /fleet/certs/{device_id}/renew` or the FleetApp UI.

### Certificate Revocation

CRL distributed via Fleet API endpoint: `GET /fleet/certs/crl` (DER-encoded CRL).  
`lrd` fetches CRL on startup and every 6 hours. Revoked device certs cause immediate lockout.

---

## mTLS Fleet Control Plane

All communication between `lrd` and Fleet API uses mutual TLS:

```
Client (lrd): presents device cert (TPM-backed)
Server (Fleet API): presents cluster service cert
Both: validate the peer cert chain against Fleet Intermediate CA
```

**WireGuard overlay (Phase 3):**
For large deployments, the fleet control plane runs over a WireGuard mesh:
- Each node has a WireGuard peer key generated at provisioning
- WireGuard public keys published to Fleet API
- `lrd` generates the WireGuard config and brings up `wg0` interface
- Fleet API is only reachable via WireGuard overlay (not exposed to physical network)

---

## OTA Image Integrity

OTA bundles are signed at build time with an Ed25519 key stored in an offline HSM:

```
OTA bundle structure:
  lightos-2.0.1-x86_64.tar.zst        (compressed rootfs image)
  lightos-2.0.1-x86_64.sha256         (sha256 of compressed bundle)
  lightos-2.0.1-x86_64.sig            (Ed25519 signature of sha256 file)
  lightos-2.0.1-x86_64.manifest.json  (metadata: version, dm-verity root hash, compatible SKUs)
```

`lightrail-ota-agent` verification sequence:
1. Fetch manifest + signature from Fleet OTA repository
2. Verify Ed25519 signature against embedded OTA public key (in `/etc/lightrail/ota-pubkey.pem`)
3. Download compressed bundle; verify SHA256 in-flight (streaming)
4. Write to inactive slot
5. Compute dm-verity hash tree for inactive slot; verify against manifest `dm_verity_root_hash`
6. If all pass: mark slot bootable. If any fail: discard and report error.

---

## Audit Logging

All security-relevant events are logged to:
- Local: `/var/log/lightrail/audit.log` (append-only, rotated, compressed)
- Remote: `lrd` ships logs to Fleet API audit endpoint (`POST /fleet/audit/events`) over mTLS

**Audit events captured:**
- Boot completion + PCR quote (every boot)
- Enrollment attempt (success/failure)
- Certificate issuance, renewal, revocation
- OTA stage, verify, apply, rollback
- Fleet API authentication failure (mTLS cert mismatch)
- AppArmor policy violations (forwarded from kernel audit)
- Privileged process executions (`execve` for root processes)

---

## Phase-by-Phase Security Delivery

| Control | Phase 2 | Phase 3 | Phase 4 |
|---|---|---|---|
| Secure Boot | ✓ | ✓ | ✓ |
| Measured boot + TPM PCR | ✓ | ✓ | ✓ |
| dm-verity rootfs | ✓ | ✓ | ✓ |
| AppArmor profiles | complain | enforced | + FIPS |
| Device cert enrollment | dev CA | prod HSM | + revocation CRL |
| mTLS fleet control plane | ✓ | ✓ | + WireGuard overlay |
| OTA Ed25519 signing | dev key | prod HSM | + offline key ceremony |
| TPM re-attestation | at enroll | daily | continuous |
| Audit logging | local | + remote | + SIEM integration |
| FIPS 140-3 | — | — | ✓ |
| Air-gap CA | — | — | ✓ |
