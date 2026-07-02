import { useEffect, useMemo, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

type CudaProc = { pid: number; user: string; vram: string; util: number; cmd: string };

interface NCEProps {
  name: string;
  status: "online" | "offline";
  totalTiles: number;
  activeTiles: number;
  ngmUsed: number;
  ngmTotal: number;
  tempC: number;
  powerW: number;
  cudaEnabled: boolean;
  cudaVersion?: string;
  cudaProcs?: CudaProc[];
  split: { native: number; cuda: number; idle: number };
}

const CHART_BG = "#0A0E1A";
const GRID = "#1E2D4A";
const TEAL = "#00FF88";
const TEAL_DIM = "#3AA37A";
const AMBER = "#F5A524";

function StatBadge({ tone, children }: { tone: "green" | "amber" | "gray"; children: React.ReactNode }) {
  const map = {
    green: "text-[#00FF88] border-[#00FF88]/40 bg-[#00FF88]/10",
    amber: "text-[#F5A524] border-[#F5A524]/40 bg-[#F5A524]/10",
    gray: "text-foreground/60 border-border bg-card/40",
  } as const;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[11px] font-mono ${map[tone]}`}>
      {children}
    </span>
  );
}

function Metric({ label, value, tone = "default" as "default" | "amber" }) {
  const color = tone === "amber" ? "text-[#F5A524]" : "text-foreground";
  return (
    <div className="flex flex-col">
      <span className="text-[10px] uppercase tracking-wider text-foreground/50 font-mono">{label}</span>
      <span className={`font-mono text-sm ${color}`}>{value}</span>
    </div>
  );
}

function WorkloadBar({ split }: { split: NCEProps["split"] }) {
  const { native, cuda, idle } = split;
  return (
    <div>
      <div className="flex h-2.5 w-full rounded-full overflow-hidden border border-border/60">
        {native > 0 && <div style={{ width: `${native}%`, background: TEAL }} />}
        {cuda > 0 && <div style={{ width: `${cuda}%`, background: AMBER }} />}
        {idle > 0 && <div style={{ width: `${idle}%`, background: "#111827" }} />}
      </div>
      <div className="flex gap-3 mt-2 text-[10px] font-mono text-foreground/70">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm" style={{ background: TEAL }} />LRCA Native {native}%</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm" style={{ background: AMBER }} />CUDA Compat {cuda}%</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-[#111827] border border-border" />Idle {idle}%</span>
      </div>
    </div>
  );
}

function NCECard(p: NCEProps) {
  const memPct = (p.ngmUsed / p.ngmTotal) * 100;
  const memTone = memPct > 70 ? "amber" : "default";
  const tilesTone = (p.activeTiles / p.totalTiles) > 0.7 ? "amber" : "default";

  return (
    <div className="flex-1 min-w-0 rounded-xl border border-border bg-card/60 backdrop-blur-md p-4 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-mono text-base text-foreground">{p.name}</h3>
          <StatBadge tone={p.status === "online" ? "green" : "gray"}>
            <span className={`w-1.5 h-1.5 rounded-full ${p.status === "online" ? "bg-[#00FF88] shadow-[0_0_6px_#00FF88]" : "bg-foreground/40"}`} />
            {p.status === "online" ? "Online" : "Offline"}
          </StatBadge>
        </div>
        <span className="text-[10px] font-mono text-foreground/50">LightRail NCE</span>
      </div>

      <div className="grid grid-cols-5 gap-3 border-y border-border/60 py-3">
        <Metric label="Total Tiles" value={`${p.totalTiles}`} />
        <Metric label="Active" value={`${p.activeTiles}/${p.totalTiles}`} tone={tilesTone} />
        <Metric label="NGM" value={`${p.ngmUsed} / ${p.ngmTotal} GB`} tone={memTone} />
        <Metric label="Temp" value={`${p.tempC}°C`} />
        <Metric label="Power" value={`${p.powerW} W`} />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] uppercase tracking-wider text-foreground/50 font-mono">CUDA Compat</span>
          {p.cudaEnabled ? (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono border border-[#00FF88]/50 bg-[#00FF88]/10 text-[#00FF88]">
              libcuda_compat.so {p.cudaVersion}
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono border border-border bg-card/40 text-foreground/50">OFF</span>
          )}
        </div>

        {p.cudaEnabled && p.cudaProcs && p.cudaProcs.length > 0 && (
          <div className="rounded-md border border-border/60 bg-[#0A0E1A]/60 overflow-hidden">
            <div className="px-3 py-1.5 border-b border-border/60 text-[10px] font-mono text-foreground/50 uppercase tracking-wider">
              CUDA Processes ({p.cudaProcs.length})
            </div>
            <div className="divide-y divide-border/40">
              {p.cudaProcs.map((proc) => (
                <div key={proc.pid} className="px-3 py-1.5 grid grid-cols-[70px_90px_1fr_60px_1fr] gap-2 text-[11px] font-mono text-foreground/85">
                  <span className="text-foreground/60">PID {proc.pid}</span>
                  <span>{proc.user}</span>
                  <span className="text-[#F5A524]">{proc.vram} VRAM</span>
                  <span>{proc.util}%</span>
                  <span className="text-foreground/60 truncate">{proc.cmd}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <WorkloadBar split={p.split} />
    </div>
  );
}

function useTileUtilSeries() {
  const initial = useMemo(() => {
    const now = Date.now();
    return Array.from({ length: 30 }).map((_, i) => ({
      t: new Date(now - (29 - i) * 60_000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      nce0: Math.round(60 + Math.sin(i / 3) * 15 + Math.random() * 8),
      nce1: Math.round(50 + Math.cos(i / 4) * 12 + Math.random() * 8),
    }));
  }, []);
  const [data, setData] = useState(initial);
  useEffect(() => {
    const id = setInterval(() => {
      setData((prev) => {
        const next = prev.slice(1);
        const last = prev[prev.length - 1];
        next.push({
          t: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          nce0: Math.max(20, Math.min(100, last.nce0 + Math.round((Math.random() - 0.5) * 12))),
          nce1: Math.max(20, Math.min(100, last.nce1 + Math.round((Math.random() - 0.5) * 12))),
        });
        return next;
      });
    }, 3000);
    return () => clearInterval(id);
  }, []);
  return data;
}

export function NCEMonitorApp() {
  const series = useTileUtilSeries();

  return (
    <div className="h-full w-full overflow-auto bg-background/60 p-5">
      <div className="mb-5">
        <h2 className="font-mono text-xl text-foreground">NCE Monitor</h2>
        <p className="font-mono text-xs text-foreground/60 mt-0.5">X2 Node · 2 NCE Dies · 256 Tiles</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 mb-5">
        <NCECard
          name="NCE-0"
          status="online"
          totalTiles={128}
          activeTiles={91}
          ngmUsed={73}
          ngmTotal={96}
          tempC={294}
          powerW={287}
          cudaEnabled
          cudaVersion="v2.1"
          cudaProcs={[
            { pid: 4821, user: "researcher", vram: "18.2 GB", util: 34, cmd: "nvcc_vectoradd" },
            { pid: 5103, user: "mlops",      vram: "42.1 GB", util: 67, cmd: "training_run_v3" },
            { pid: 5244, user: "inference",  vram: "8.4 GB",  util: 12, cmd: "embed_server" },
          ]}
          split={{ native: 48, cuda: 41, idle: 11 }}
        />
        <NCECard
          name="NCE-1"
          status="online"
          totalTiles={128}
          activeTiles={88}
          ngmUsed={81}
          ngmTotal={96}
          tempC={276}
          powerW={271}
          cudaEnabled={false}
          split={{ native: 69, cuda: 0, idle: 31 }}
        />
      </div>

      <div className="rounded-xl border border-border p-4" style={{ background: CHART_BG }}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-mono text-sm text-foreground">Tile Utilization (30 min)</h3>
          <span className="text-[10px] font-mono text-foreground/50">% active tiles</span>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series} margin={{ top: 8, right: 16, left: -8, bottom: 0 }}>
              <CartesianGrid stroke={GRID} strokeDasharray="3 3" />
              <XAxis dataKey="t" stroke="#4B5B7A" tick={{ fill: "#7A8AAA", fontSize: 10, fontFamily: "monospace" }} minTickGap={30} />
              <YAxis domain={[0, 100]} stroke="#4B5B7A" tick={{ fill: "#7A8AAA", fontSize: 10, fontFamily: "monospace" }} />
              <Tooltip
                contentStyle={{ background: "#0A0E1A", border: `1px solid ${GRID}`, fontFamily: "monospace", fontSize: 11 }}
                labelStyle={{ color: "#9AB0D0" }}
              />
              <Legend wrapperStyle={{ fontFamily: "monospace", fontSize: 11, color: "#9AB0D0" }} />
              <Line type="monotone" dataKey="nce0" name="NCE-0" stroke={TEAL} strokeWidth={2} dot={false} isAnimationActive={false} />
              <Line type="monotone" dataKey="nce1" name="NCE-1" stroke={TEAL_DIM} strokeWidth={2} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
