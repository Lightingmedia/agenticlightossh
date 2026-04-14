import { motion } from "framer-motion";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Cpu, Zap, Clock, BarChart3, TrendingUp, DollarSign, Timer, ArrowUpRight } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
  AreaChart,
  Area,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";

// ── Benchmark data ──────────────────────────────────────────────

const accelerators = [
  { name: "NVIDIA H100 (GPU)", short: "H100" },
  { name: "NVIDIA A100 (GPU)", short: "A100" },
  { name: "Google TPU v5e", short: "TPU v5e" },
  { name: "Intel Gaudi 3 (NPU)", short: "Gaudi 3" },
  { name: "AMD MI300X (GPU)", short: "MI300X" },
  { name: "LightRail NCE", short: "NCE" },
];

const colors = {
  H100: "hsl(0, 72%, 55%)",
  A100: "hsl(30, 90%, 55%)",
  "TPU v5e": "hsl(200, 80%, 55%)",
  "Gaudi 3": "hsl(280, 60%, 55%)",
  MI300X: "hsl(45, 90%, 50%)",
  NCE: "hsl(160, 84%, 45%)",
};

// MFU % – Model Flops Utilization
const mfuData = [
  { name: "H100", mfu: 62, fill: colors.H100 },
  { name: "A100", mfu: 48, fill: colors.A100 },
  { name: "TPU v5e", mfu: 55, fill: colors["TPU v5e"] },
  { name: "Gaudi 3", mfu: 44, fill: colors["Gaudi 3"] },
  { name: "MI300X", mfu: 58, fill: colors.MI300X },
  { name: "NCE", mfu: 94, fill: colors.NCE },
];

// Throughput – tokens/sec (Llama-3-70B, batch 64)
const throughputData = [
  { name: "H100", tps: 420000, fill: colors.H100 },
  { name: "A100", tps: 180000, fill: colors.A100 },
  { name: "TPU v5e", tps: 340000, fill: colors["TPU v5e"] },
  { name: "Gaudi 3", tps: 210000, fill: colors["Gaudi 3"] },
  { name: "MI300X", tps: 380000, fill: colors.MI300X },
  { name: "NCE", tps: 1500000, fill: colors.NCE },
];

// TTFT – Time to First Token (ms)
const ttftData = [
  { name: "H100", ttft: 42 },
  { name: "A100", ttft: 78 },
  { name: "TPU v5e", ttft: 55 },
  { name: "Gaudi 3", ttft: 68 },
  { name: "MI300X", ttft: 45 },
  { name: "NCE", ttft: 8 },
];

// Inter-Token Latency (ms)
const itlData = [
  { name: "H100", itl: 12 },
  { name: "A100", itl: 22 },
  { name: "TPU v5e", itl: 16 },
  { name: "Gaudi 3", itl: 19 },
  { name: "MI300X", itl: 13 },
  { name: "NCE", itl: 2.1 },
];

// Cost – $/M tokens
const costData = [
  { name: "H100", cost: 2.8, fill: colors.H100 },
  { name: "A100", cost: 4.2, fill: colors.A100 },
  { name: "TPU v5e", cost: 1.9, fill: colors["TPU v5e"] },
  { name: "Gaudi 3", cost: 3.1, fill: colors["Gaudi 3"] },
  { name: "MI300X", cost: 2.5, fill: colors.MI300X },
  { name: "NCE", cost: 0.4, fill: colors.NCE },
];

// Stranded MFU cost ($/hr) over time – simulated
const strandedCostTimeline = Array.from({ length: 60 }, (_, i) => ({
  time: i * 10,
  H100: 320 + Math.sin(i * 0.3) * 40,
  A100: 480 + Math.sin(i * 0.2) * 60,
  NCE: 45 + Math.sin(i * 0.4) * 10,
}));

// Radar comparison
const radarData = [
  { metric: "MFU", H100: 62, NCE: 94, "TPU v5e": 55 },
  { metric: "Throughput", H100: 28, NCE: 100, "TPU v5e": 23 },
  { metric: "TTFT", H100: 60, NCE: 98, "TPU v5e": 72 },
  { metric: "ITL", H100: 65, NCE: 97, "TPU v5e": 70 },
  { metric: "Cost Eff.", H100: 40, NCE: 95, "TPU v5e": 55 },
  { metric: "Power Eff.", H100: 45, NCE: 92, "TPU v5e": 50 },
];

// Edge agent anomaly score over time
const edgeAgentData = Array.from({ length: 60 }, (_, i) => ({
  time: i * 10,
  network: i > 30 && i < 40 ? 6 + Math.random() * 3 : 0.5 + Math.random() * 1.5,
  storage: i > 45 && i < 52 ? 5 + Math.random() * 4 : 0.3 + Math.random() * 1,
  threshold: 7,
}));

// ── Helpers ─────────────────────────────────────────────────────

const StatBox = ({
  label,
  value,
  sub,
  icon: Icon,
  accent = false,
  delay = 0,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: any;
  accent?: boolean;
  delay?: number;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className="p-4 rounded-xl border border-border bg-card/50"
  >
    <div className="flex items-center gap-2 mb-2">
      <Icon className={`w-4 h-4 ${accent ? "text-primary" : "text-muted-foreground"}`} />
      <span className="text-xs text-muted-foreground uppercase tracking-wider font-mono">{label}</span>
    </div>
    <div className={`text-2xl font-mono font-bold ${accent ? "text-primary" : "text-foreground"}`}>{value}</div>
    {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
  </motion.div>
);

const chartTooltipStyle = {
  contentStyle: {
    background: "hsl(var(--card))",
    border: "1px solid hsl(var(--border))",
    borderRadius: 8,
    fontSize: 12,
    fontFamily: "monospace",
  },
  labelStyle: { color: "hsl(var(--foreground))" },
};

// ── Page ────────────────────────────────────────────────────────

const LLMPerfBench = () => {
  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader
        title="llmperf-bench"
        subtitle="LLM performance benchmarks — GPU · TPU · NPU vs LightRail NCE"
      />

      <div className="p-6 space-y-6">
        {/* Config banner */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-wrap items-center gap-3 p-4 rounded-xl border border-primary/20 bg-primary/5"
        >
          <Badge variant="outline" className="border-primary/40 text-primary font-mono text-xs">
            Model: meta-llama/Meta-Llama-3-70B-Instruct
          </Badge>
          <Badge variant="outline" className="border-border font-mono text-xs">Batch: 64</Badge>
          <Badge variant="outline" className="border-border font-mono text-xs">Input: 750 tok</Badge>
          <Badge variant="outline" className="border-border font-mono text-xs">Output: 150 tok</Badge>
          <Badge variant="outline" className="border-border font-mono text-xs">Requests: 100</Badge>
          <span className="ml-auto text-xs text-muted-foreground font-mono flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            Based on llmperf-bench · MIT License
          </span>
        </motion.div>

        {/* Summary stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatBox icon={TrendingUp} label="NCE MFU" value="94%" sub="+52% vs H100" accent />
          <StatBox icon={Zap} label="NCE Throughput" value="1.5M tok/s" sub="3.6× faster than H100" delay={0.1} />
          <StatBox icon={Timer} label="NCE TTFT" value="8ms" sub="5.3× faster than H100" delay={0.2} />
          <StatBox icon={DollarSign} label="NCE Cost" value="$0.40/M" sub="7× cheaper than H100" accent delay={0.3} />
        </div>

        {/* Row 1: MFU + Throughput */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* MFU */}
          <Card className="p-5 border-border bg-card/50">
            <h3 className="font-mono font-bold text-foreground mb-1 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-primary" />
              System-Wide GPU Model Flops Utilization (MFU %)
            </h3>
            <p className="text-xs text-muted-foreground mb-4">Higher is better — max theoretical = 100%</p>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={mfuData} barSize={40}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11, fontFamily: "monospace" }} />
                <YAxis domain={[0, 100]} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                <Tooltip {...chartTooltipStyle} />
                <Bar dataKey="mfu" radius={[4, 4, 0, 0]}>
                  {mfuData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Throughput */}
          <Card className="p-5 border-border bg-card/50">
            <h3 className="font-mono font-bold text-foreground mb-1 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-amber-400" />
              AI Metric: Tokens per Second (Cluster Yield)
            </h3>
            <p className="text-xs text-muted-foreground mb-4">Llama-3-70B, batch 64, 8-way tensor parallel</p>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={throughputData} barSize={40}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11, fontFamily: "monospace" }} />
                <YAxis
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                />
                <Tooltip {...chartTooltipStyle} formatter={(v: number) => v.toLocaleString()} />
                <Bar dataKey="tps" radius={[4, 4, 0, 0]}>
                  {throughputData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Row 2: Latency metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* TTFT */}
          <Card className="p-5 border-border bg-card/50">
            <h3 className="font-mono font-bold text-foreground mb-1 flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-400" />
              Time to First Token (TTFT)
            </h3>
            <p className="text-xs text-muted-foreground mb-4">Lower is better (milliseconds)</p>
            <div className="space-y-3">
              {ttftData.map((d) => (
                <div key={d.name} className="flex items-center gap-3">
                  <span className="font-mono text-xs text-muted-foreground w-16">{d.name}</span>
                  <div className="flex-1 relative">
                    <Progress value={(d.ttft / 80) * 100} className="h-3" />
                  </div>
                  <span
                    className={`font-mono text-sm font-bold w-14 text-right ${
                      d.name === "NCE" ? "text-primary" : "text-foreground"
                    }`}
                  >
                    {d.ttft}ms
                  </span>
                </div>
              ))}
            </div>
          </Card>

          {/* ITL */}
          <Card className="p-5 border-border bg-card/50">
            <h3 className="font-mono font-bold text-foreground mb-1 flex items-center gap-2">
              <Timer className="w-4 h-4 text-purple-400" />
              Inter-Token Latency (ITL)
            </h3>
            <p className="text-xs text-muted-foreground mb-4">Lower is better (milliseconds)</p>
            <div className="space-y-3">
              {itlData.map((d) => (
                <div key={d.name} className="flex items-center gap-3">
                  <span className="font-mono text-xs text-muted-foreground w-16">{d.name}</span>
                  <div className="flex-1">
                    <Progress value={(d.itl / 25) * 100} className="h-3" />
                  </div>
                  <span
                    className={`font-mono text-sm font-bold w-14 text-right ${
                      d.name === "NCE" ? "text-primary" : "text-foreground"
                    }`}
                  >
                    {d.itl}ms
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Row 3: Edge Agents + Radar */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* PoL-TT Edge Agents */}
          <Card className="p-5 border-border bg-card/50">
            <h3 className="font-mono font-bold text-foreground mb-1">
              PoL-TT Mathematical Execution (Edge Agents)
            </h3>
            <div className="flex items-center gap-4 mb-4">
              <Badge variant="outline" className="text-primary border-primary/30 font-mono text-xs">
                Network Agent: IDLE
              </Badge>
              <Badge variant="outline" className="text-amber-400 border-amber-400/30 font-mono text-xs">
                Storage Agent: IDLE
              </Badge>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={edgeAgentData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="time" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} />
                <YAxis domain={[0, 20]} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} />
                <Tooltip {...chartTooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 10, fontFamily: "monospace" }} />
                <Line type="monotone" dataKey="threshold" stroke="hsl(0,70%,55%)" strokeDasharray="6 3" dot={false} name="Activation Threshold" />
                <Line type="monotone" dataKey="network" stroke="hsl(200,80%,55%)" dot={false} strokeWidth={1.5} name="Tomahawk Network Agent" />
                <Line type="monotone" dataKey="storage" stroke="hsl(280,60%,55%)" dot={false} strokeWidth={1.5} name="NVMe Storage Agent" />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          {/* Radar */}
          <Card className="p-5 border-border bg-card/50">
            <h3 className="font-mono font-bold text-foreground mb-1 flex items-center gap-2">
              <ArrowUpRight className="w-4 h-4 text-primary" />
              Normalized Performance Radar
            </h3>
            <p className="text-xs text-muted-foreground mb-4">NCE vs H100 vs TPU v5e (0–100 scale)</p>
            <ResponsiveContainer width="100%" height={260}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis dataKey="metric" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11, fontFamily: "monospace" }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} />
                <Radar name="NCE" dataKey="NCE" stroke={colors.NCE} fill={colors.NCE} fillOpacity={0.25} strokeWidth={2} />
                <Radar name="H100" dataKey="H100" stroke={colors.H100} fill={colors.H100} fillOpacity={0.1} strokeWidth={1.5} />
                <Radar name="TPU v5e" dataKey="TPU v5e" stroke={colors["TPU v5e"]} fill={colors["TPU v5e"]} fillOpacity={0.1} strokeWidth={1.5} />
                <Legend wrapperStyle={{ fontSize: 11, fontFamily: "monospace" }} />
                <Tooltip {...chartTooltipStyle} />
              </RadarChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Row 4: Stranded MFU Cost + Cost per M tokens */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Stranded Cost */}
          <Card className="p-5 border-border bg-card/50">
            <h3 className="font-mono font-bold text-foreground mb-1 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-amber-400" />
              Datacenter Economics: Stranded MFU Cost ($/hr)
            </h3>
            <div className="flex items-center gap-4 mb-4">
              <span className="text-xs text-primary font-mono font-bold">
                NCE Recovers: $1,412,938/hr vs H100
              </span>
              <span className="text-xs text-muted-foreground font-mono">
                NCE Recovers: $766,852/hr vs A100
              </span>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={strandedCostTimeline}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="time" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} />
                <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} tickFormatter={(v) => `$${v}`} />
                <Tooltip {...chartTooltipStyle} formatter={(v: number) => `$${v.toFixed(0)}`} />
                <Legend wrapperStyle={{ fontSize: 10, fontFamily: "monospace" }} />
                <Area type="monotone" dataKey="A100" stroke={colors.A100} fill={colors.A100} fillOpacity={0.15} />
                <Area type="monotone" dataKey="H100" stroke={colors.H100} fill={colors.H100} fillOpacity={0.15} />
                <Area type="monotone" dataKey="NCE" stroke={colors.NCE} fill={colors.NCE} fillOpacity={0.3} />
              </AreaChart>
            </ResponsiveContainer>
          </Card>

          {/* Cost per M tokens */}
          <Card className="p-5 border-border bg-card/50">
            <h3 className="font-mono font-bold text-foreground mb-1 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-primary" />
              Cost per Million Tokens ($/M)
            </h3>
            <p className="text-xs text-muted-foreground mb-4">Lower is better — includes compute + network + cooling</p>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={costData} barSize={40}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11, fontFamily: "monospace" }} />
                <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
                <Tooltip {...chartTooltipStyle} formatter={(v: number) => `$${v.toFixed(2)}`} />
                <Bar dataKey="cost" radius={[4, 4, 0, 0]}>
                  {costData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Detailed table */}
        <Card className="p-5 border-border bg-card/50 overflow-x-auto">
          <h3 className="font-mono font-bold text-foreground mb-4">Full Benchmark Results</h3>
          <table className="w-full text-sm font-mono">
            <thead>
              <tr className="border-b border-border text-muted-foreground text-left">
                <th className="pb-3 pr-4">Accelerator</th>
                <th className="pb-3 pr-4 text-right">MFU %</th>
                <th className="pb-3 pr-4 text-right">Throughput (tok/s)</th>
                <th className="pb-3 pr-4 text-right">TTFT (ms)</th>
                <th className="pb-3 pr-4 text-right">ITL (ms)</th>
                <th className="pb-3 text-right">$/M tokens</th>
              </tr>
            </thead>
            <tbody>
              {accelerators.map((acc) => {
                const mfu = mfuData.find((d) => d.name === acc.short);
                const tp = throughputData.find((d) => d.name === acc.short);
                const ttft = ttftData.find((d) => d.name === acc.short);
                const itl = itlData.find((d) => d.name === acc.short);
                const cost = costData.find((d) => d.name === acc.short);
                const isNCE = acc.short === "NCE";
                return (
                  <tr
                    key={acc.short}
                    className={`border-b border-border/50 ${isNCE ? "bg-primary/5" : ""}`}
                  >
                    <td className={`py-3 pr-4 font-bold ${isNCE ? "text-primary" : "text-foreground"}`}>
                      {acc.name}
                      {isNCE && <Badge className="ml-2 bg-primary/20 text-primary text-[10px]">BEST</Badge>}
                    </td>
                    <td className={`py-3 pr-4 text-right ${isNCE ? "text-primary font-bold" : ""}`}>{mfu?.mfu}%</td>
                    <td className={`py-3 pr-4 text-right ${isNCE ? "text-primary font-bold" : ""}`}>
                      {tp?.tps.toLocaleString()}
                    </td>
                    <td className={`py-3 pr-4 text-right ${isNCE ? "text-primary font-bold" : ""}`}>{ttft?.ttft}</td>
                    <td className={`py-3 pr-4 text-right ${isNCE ? "text-primary font-bold" : ""}`}>{itl?.itl}</td>
                    <td className={`py-3 text-right ${isNCE ? "text-primary font-bold" : ""}`}>
                      ${cost?.cost.toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
};

export default LLMPerfBench;
