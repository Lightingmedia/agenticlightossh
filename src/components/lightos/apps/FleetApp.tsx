import { useState } from "react";
import {
  Server,
  Shield,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Key,
  Download,
  ChevronDown,
  ChevronRight,
  Circle,
  Search,
  Filter,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type DeviceState = "active" | "provisioned" | "enrolled" | "decommissioned" | "pending";
type OTAStatus = "current" | "update-available" | "updating" | "update-failed" | "unknown";
type CertStatus = "valid" | "expiring-soon" | "expired" | "pending";

interface Device {
  id: string;
  hostname: string;
  serial: string;
  sku: string;
  state: DeviceState;
  otaStatus: OTAStatus;
  imageVersion: string;
  certStatus: CertStatus;
  certExpiry: string;
  enrolledAt: string;
  lastSeen: string;
  ip: string;
  fabricId: string;
  tpmPresent: boolean;
  attestationOk: boolean;
  location: string;
}

interface OTAPolicy {
  id: string;
  name: string;
  channel: "stable" | "beta" | "canary";
  strategy: "rolling" | "canary" | "all-at-once" | "manual";
  maintenanceWindow: string;
  targetCount: number;
  appliedCount: number;
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const DEVICES: Device[] = [
  {
    id: "dev-001", hostname: "lightos-ctrl-01", serial: "LR-NCE-2024-0001",
    sku: "LightRail Controller Gen2", state: "active", otaStatus: "current",
    imageVersion: "2.0.1-stable", certStatus: "valid", certExpiry: "2026-11-14",
    enrolledAt: "2025-09-01", lastSeen: "now", ip: "10.10.0.1",
    fabricId: "photonic-mesh-20x64", tpmPresent: true, attestationOk: true,
    location: "Rack A-01",
  },
  {
    id: "dev-002", hostname: "lightos-worker-01", serial: "LR-NCE-2024-0002",
    sku: "LightRail Worker Gen2", state: "active", otaStatus: "update-available",
    imageVersion: "2.0.0-stable", certStatus: "valid", certExpiry: "2026-11-14",
    enrolledAt: "2025-09-01", lastSeen: "12s ago", ip: "10.10.0.2",
    fabricId: "photonic-mesh-20x64", tpmPresent: true, attestationOk: true,
    location: "Rack A-01",
  },
  {
    id: "dev-003", hostname: "lightos-worker-02", serial: "LR-NCE-2024-0003",
    sku: "LightRail Worker Gen2", state: "active", otaStatus: "update-available",
    imageVersion: "2.0.0-stable", certStatus: "expiring-soon", certExpiry: "2026-06-02",
    enrolledAt: "2025-09-01", lastSeen: "8s ago", ip: "10.10.0.3",
    fabricId: "photonic-mesh-20x64", tpmPresent: true, attestationOk: true,
    location: "Rack A-02",
  },
  {
    id: "dev-004", hostname: "lightos-worker-03", serial: "LR-NCE-2024-0004",
    sku: "LightRail Worker Gen2", state: "active", otaStatus: "updating",
    imageVersion: "2.0.0-stable → 2.0.1", certStatus: "valid", certExpiry: "2026-11-14",
    enrolledAt: "2025-09-02", lastSeen: "3s ago", ip: "10.10.0.4",
    fabricId: "ring-topology-16x128", tpmPresent: true, attestationOk: true,
    location: "Rack B-01",
  },
  {
    id: "dev-005", hostname: "lightos-edge-01", serial: "LR-EDGE-2024-0001",
    sku: "LightRail Edge Node", state: "active", otaStatus: "update-failed",
    imageVersion: "1.9.8-stable", certStatus: "valid", certExpiry: "2026-11-14",
    enrolledAt: "2025-10-15", lastSeen: "2m ago", ip: "10.20.0.1",
    fabricId: "butterfly-8x256", tpmPresent: true, attestationOk: false,
    location: "Edge Rack E-01",
  },
  {
    id: "dev-006", hostname: "lightos-worker-04", serial: "LR-NCE-2024-0005",
    sku: "LightRail Worker Gen2", state: "provisioned", otaStatus: "unknown",
    imageVersion: "—", certStatus: "pending", certExpiry: "—",
    enrolledAt: "—", lastSeen: "never", ip: "10.10.0.5",
    fabricId: "—", tpmPresent: true, attestationOk: false,
    location: "Rack A-02",
  },
];

const OTA_POLICIES: OTAPolicy[] = [
  {
    id: "policy-001", name: "Production Rolling", channel: "stable",
    strategy: "rolling", maintenanceWindow: "Sun 02:00–06:00 UTC",
    targetCount: 4, appliedCount: 2,
  },
  {
    id: "policy-002", name: "Edge Canary", channel: "beta",
    strategy: "canary", maintenanceWindow: "Daily 03:00–05:00 UTC",
    targetCount: 1, appliedCount: 0,
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function StateIcon({ state }: { state: DeviceState }) {
  const map: Record<DeviceState, { icon: typeof Circle; color: string }> = {
    active: { icon: CheckCircle, color: "text-emerald-400" },
    enrolled: { icon: CheckCircle, color: "text-blue-400" },
    provisioned: { icon: Clock, color: "text-yellow-400" },
    decommissioned: { icon: XCircle, color: "text-foreground/30" },
    pending: { icon: Clock, color: "text-yellow-400" },
  };
  const { icon: Icon, color } = map[state];
  return <Icon className={`w-3.5 h-3.5 ${color}`} />;
}

function OTABadge({ status }: { status: OTAStatus }) {
  const map: Record<OTAStatus, string> = {
    current: "text-emerald-400 bg-emerald-400/10 border-emerald-400/30",
    "update-available": "text-blue-400 bg-blue-400/10 border-blue-400/30",
    updating: "text-yellow-400 bg-yellow-400/10 border-yellow-400/30",
    "update-failed": "text-red-400 bg-red-400/10 border-red-400/30",
    unknown: "text-foreground/30 bg-foreground/5 border-foreground/20",
  };
  const label: Record<OTAStatus, string> = {
    current: "CURRENT",
    "update-available": "UPDATE",
    updating: "UPDATING",
    "update-failed": "FAILED",
    unknown: "UNKNOWN",
  };
  return (
    <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${map[status]}`}>
      {label[status]}
    </span>
  );
}

function CertBadge({ status }: { status: CertStatus }) {
  const map: Record<CertStatus, string> = {
    valid: "text-emerald-400",
    "expiring-soon": "text-yellow-400",
    expired: "text-red-400",
    pending: "text-foreground/40",
  };
  const icon: Record<CertStatus, typeof Key> = {
    valid: Key, "expiring-soon": AlertTriangle, expired: XCircle, pending: Clock,
  };
  const Icon = icon[status];
  return <Icon className={`w-3 h-3 ${map[status]}`} />;
}

// ─── Device Row ───────────────────────────────────────────────────────────────

function DeviceRow({ device, expanded, onToggle }: {
  device: Device;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="border border-border/40 rounded-lg overflow-hidden bg-card/30">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-foreground/5 transition-colors text-left"
      >
        <StateIcon state={device.state} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm text-foreground truncate">{device.hostname}</span>
            {!device.attestationOk && (
              <AlertTriangle className="w-3 h-3 text-yellow-400 shrink-0" title="Attestation failed" />
            )}
          </div>
          <div className="text-[10px] font-mono text-foreground/40">{device.ip} · {device.location}</div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <OTABadge status={device.otaStatus} />
          <CertBadge status={device.certStatus} />
          <div className="text-[10px] font-mono text-foreground/30 hidden sm:block">{device.lastSeen}</div>
        </div>
        {expanded ? (
          <ChevronDown className="w-3.5 h-3.5 text-foreground/30 shrink-0" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-foreground/30 shrink-0" />
        )}
      </button>

      {expanded && (
        <div className="border-t border-border/40 px-3 py-3 bg-background/40">
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 mb-3">
            {[
              ["Serial", device.serial],
              ["SKU", device.sku],
              ["OS Image", device.imageVersion],
              ["Fabric", device.fabricId],
              ["Enrolled", device.enrolledAt],
              ["Cert Expiry", device.certExpiry],
              ["TPM Present", device.tpmPresent ? "Yes" : "No"],
              ["Attestation", device.attestationOk ? "OK" : "FAILED"],
            ].map(([k, v]) => (
              <div key={k}>
                <div className="text-[9px] font-mono text-foreground/30 uppercase">{k}</div>
                <div className={`text-xs font-mono ${
                  k === "Attestation" && v === "FAILED" ? "text-yellow-400" :
                  k === "TPM Present" && v === "No" ? "text-red-400" : "text-foreground/70"
                }`}>{v}</div>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            {device.otaStatus === "update-available" && (
              <button className="flex items-center gap-1.5 text-[10px] font-mono px-2 py-1 rounded border border-blue-400/30 text-blue-400 hover:bg-blue-400/10 transition-colors">
                <Download className="w-3 h-3" />
                Stage Update
              </button>
            )}
            {device.otaStatus === "update-failed" && (
              <button className="flex items-center gap-1.5 text-[10px] font-mono px-2 py-1 rounded border border-red-400/30 text-red-400 hover:bg-red-400/10 transition-colors">
                <RefreshCw className="w-3 h-3" />
                Retry OTA
              </button>
            )}
            {device.certStatus === "expiring-soon" && (
              <button className="flex items-center gap-1.5 text-[10px] font-mono px-2 py-1 rounded border border-yellow-400/30 text-yellow-400 hover:bg-yellow-400/10 transition-colors">
                <Key className="w-3 h-3" />
                Renew Cert
              </button>
            )}
            {device.state === "provisioned" && (
              <button className="flex items-center gap-1.5 text-[10px] font-mono px-2 py-1 rounded border border-primary/30 text-primary hover:bg-primary/10 transition-colors">
                <Shield className="w-3 h-3" />
                Enroll Device
              </button>
            )}
            <button className="flex items-center gap-1.5 text-[10px] font-mono px-2 py-1 rounded border border-border/40 text-foreground/40 hover:text-foreground/70 transition-colors ml-auto">
              <Server className="w-3 h-3" />
              Details
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

type FleetTab = "devices" | "ota" | "certs";

export function FleetApp() {
  const [tab, setTab] = useState<FleetTab>("devices");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState<DeviceState | "all">("all");

  const activeCount = DEVICES.filter((d) => d.state === "active").length;
  const updateCount = DEVICES.filter((d) => d.otaStatus === "update-available" || d.otaStatus === "update-failed").length;
  const certWarnCount = DEVICES.filter((d) => d.certStatus === "expiring-soon" || d.certStatus === "expired").length;
  const attestFailCount = DEVICES.filter((d) => !d.attestationOk).length;

  const filtered = DEVICES.filter((d) => {
    const matchSearch =
      search === "" ||
      d.hostname.includes(search) ||
      d.ip.includes(search) ||
      d.serial.toLowerCase().includes(search.toLowerCase());
    const matchState = stateFilter === "all" || d.state === stateFilter;
    return matchSearch && matchState;
  });

  return (
    <div className="flex h-full bg-background text-foreground overflow-hidden font-mono">
      {/* Sidebar */}
      <aside className="w-44 shrink-0 border-r border-border/40 bg-card/20 p-3 flex flex-col gap-4">
        <div>
          <div className="text-[9px] text-foreground/30 uppercase tracking-widest mb-1">LightOS</div>
          <div className="text-xs text-primary font-bold">Fleet Manager</div>
          <div className="text-[10px] text-foreground/30 mt-0.5">v1.0 · mTLS</div>
        </div>

        <div className="space-y-2">
          {[
            { label: "Total Devices", value: String(DEVICES.length), color: "" },
            { label: "Active", value: String(activeCount), color: "text-emerald-400" },
            { label: "Need Update", value: String(updateCount), color: updateCount > 0 ? "text-blue-400" : "" },
            { label: "Cert Warnings", value: String(certWarnCount), color: certWarnCount > 0 ? "text-yellow-400" : "" },
            { label: "Attest Failures", value: String(attestFailCount), color: attestFailCount > 0 ? "text-red-400" : "" },
          ].map(({ label, value, color }) => (
            <div key={label} className="flex justify-between items-baseline">
              <span className="text-[10px] text-foreground/40">{label}</span>
              <span className={`text-xs font-bold ${color}`}>{value}</span>
            </div>
          ))}
        </div>

        <div className="border-t border-border/30 pt-3 space-y-1">
          {(["devices", "ota", "certs"] as FleetTab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`w-full text-left px-2 py-1.5 rounded text-[11px] transition-colors ${
                tab === t ? "bg-primary/20 text-primary" : "text-foreground/40 hover:text-foreground/70"
              }`}
            >
              {t === "devices" ? "Device Inventory" : t === "ota" ? "OTA Policies" : "Certificates"}
            </button>
          ))}
        </div>

        <div className="mt-auto text-[9px] text-foreground/20 space-y-0.5">
          <div>Fleet CA: LightRail Root</div>
          <div className="flex items-center gap-1">
            <Circle className="w-1.5 h-1.5 text-emerald-400" style={{ fill: "currentColor" }} />
            <span>CA Online</span>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {tab === "devices" && (
          <>
            {/* Toolbar */}
            <div className="flex items-center gap-2 px-3 py-2 border-b border-border/40 bg-card/10 shrink-0">
              <div className="flex items-center gap-1.5 flex-1 rounded border border-border/40 bg-background/40 px-2 py-1">
                <Search className="w-3 h-3 text-foreground/30" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search devices..."
                  className="flex-1 bg-transparent text-xs outline-none text-foreground placeholder:text-foreground/30"
                />
              </div>
              <div className="flex items-center gap-1">
                <Filter className="w-3 h-3 text-foreground/30" />
                <select
                  value={stateFilter}
                  onChange={(e) => setStateFilter(e.target.value as DeviceState | "all")}
                  className="text-[10px] bg-transparent text-foreground/60 border-none outline-none"
                >
                  <option value="all">All States</option>
                  <option value="active">Active</option>
                  <option value="provisioned">Provisioned</option>
                  <option value="enrolled">Enrolled</option>
                  <option value="decommissioned">Decommissioned</option>
                </select>
              </div>
              <button className="text-[10px] font-mono px-2 py-1 rounded border border-primary/30 text-primary hover:bg-primary/10 transition-colors">
                + Provision
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {filtered.map((device) => (
                <DeviceRow
                  key={device.id}
                  device={device}
                  expanded={expandedId === device.id}
                  onToggle={() => setExpandedId(expandedId === device.id ? null : device.id)}
                />
              ))}
              {filtered.length === 0 && (
                <div className="text-center text-foreground/30 text-xs py-8">No devices match filter</div>
              )}
            </div>
          </>
        )}

        {tab === "ota" && (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="text-xs text-foreground/40 mb-2">
              OTA update policies control how image updates propagate across the fleet.
              Updates are atomic A/B slot flips — rollback is instantaneous.
            </div>
            {OTA_POLICIES.map((policy) => (
              <div key={policy.id} className="rounded-lg border border-border/40 bg-card/40 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="font-bold text-sm">{policy.name}</div>
                    <div className="text-[10px] text-foreground/40 mt-0.5">
                      {policy.channel.toUpperCase()} channel · {policy.strategy} rollout
                    </div>
                  </div>
                  <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${
                    policy.channel === "stable" ? "text-emerald-400 border-emerald-400/30 bg-emerald-400/10" :
                    policy.channel === "beta" ? "text-blue-400 border-blue-400/30 bg-blue-400/10" :
                    "text-yellow-400 border-yellow-400/30 bg-yellow-400/10"
                  }`}>{policy.channel.toUpperCase()}</span>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  {[
                    ["Strategy", policy.strategy],
                    ["Window", policy.maintenanceWindow],
                    ["Targets", String(policy.targetCount)],
                    ["Applied", `${policy.appliedCount} / ${policy.targetCount}`],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <div className="text-[9px] text-foreground/30 uppercase">{k}</div>
                      <div className="text-xs text-foreground/70">{v}</div>
                    </div>
                  ))}
                </div>
                <div className="h-1.5 rounded-full bg-foreground/10 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-500"
                    style={{ width: `${(policy.appliedCount / policy.targetCount) * 100}%` }}
                  />
                </div>
                <div className="flex gap-2 mt-3">
                  <button className="text-[10px] font-mono px-2 py-1 rounded border border-border/40 text-foreground/50 hover:text-primary hover:border-primary/40 transition-colors">
                    Edit Policy
                  </button>
                  <button className="text-[10px] font-mono px-2 py-1 rounded border border-border/40 text-foreground/50 hover:text-primary hover:border-primary/40 transition-colors">
                    Force Rollout
                  </button>
                  <button className="text-[10px] font-mono px-2 py-1 rounded border border-red-400/20 text-red-400/60 hover:text-red-400 hover:border-red-400/40 transition-colors ml-auto">
                    Freeze
                  </button>
                </div>
              </div>
            ))}
            <button className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-dashed border-primary/30 text-primary/60 hover:text-primary hover:border-primary/60 transition-colors text-xs">
              + New OTA Policy
            </button>
          </div>
        )}

        {tab === "certs" && (
          <div className="flex-1 overflow-y-auto p-4">
            <div className="text-xs text-foreground/40 mb-4">
              Device certificates are TPM-backed EC keys signed by the LightRail Fleet CA.
              mTLS is required on all fleet control-plane connections.
            </div>
            <div className="space-y-2">
              {DEVICES.map((d) => (
                <div key={d.id} className="rounded-lg border border-border/40 bg-card/40 px-3 py-2.5 flex items-center gap-3">
                  <CertBadge status={d.certStatus} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs truncate">{d.hostname}</span>
                      {d.certStatus === "expiring-soon" && (
                        <span className="text-[9px] font-mono px-1 rounded bg-yellow-400/10 text-yellow-400 border border-yellow-400/30">
                          EXPIRING
                        </span>
                      )}
                      {d.certStatus === "pending" && (
                        <span className="text-[9px] font-mono px-1 rounded bg-foreground/5 text-foreground/40 border border-foreground/20">
                          PENDING
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-foreground/30 mt-0.5">
                      Expiry: {d.certExpiry} · TPM: {d.tpmPresent ? "present" : "absent"}
                    </div>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    {d.certStatus === "expiring-soon" && (
                      <button className="text-[9px] font-mono px-2 py-1 rounded border border-yellow-400/30 text-yellow-400 hover:bg-yellow-400/10 transition-colors">
                        Renew
                      </button>
                    )}
                    {d.certStatus === "pending" && (
                      <button className="text-[9px] font-mono px-2 py-1 rounded border border-primary/30 text-primary hover:bg-primary/10 transition-colors">
                        Issue
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-lg border border-border/40 bg-card/20 p-3">
              <div className="text-[10px] text-foreground/30 uppercase mb-2">Certificate Hierarchy</div>
              <div className="font-mono text-[11px] text-foreground/50 space-y-1">
                <div>LightRail Root CA <span className="text-foreground/20">(offline HSM)</span></div>
                <div className="pl-4">└─ Fleet Intermediate CA <span className="text-emerald-400/60">[ONLINE]</span></div>
                <div className="pl-8">├─ Device Certificates <span className="text-foreground/20">({DEVICES.filter(d => d.certStatus !== "pending").length} issued)</span></div>
                <div className="pl-8">├─ Cluster Service Certs</div>
                <div className="pl-8">└─ OTA Signing Key <span className="text-foreground/20">(HSM-backed)</span></div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
