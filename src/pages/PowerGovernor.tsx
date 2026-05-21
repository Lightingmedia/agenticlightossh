import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BatteryCharging,
  Zap,
  Sliders,
  Cpu,
  Thermometer,
  Activity,
  HardDrive,
  RefreshCw,
  AlertCircle,
  ArrowUpRight,
  ShieldAlert,
  Gauge,
  HelpCircle,
  Power,
  Leaf,
  Info,
  TrendingDown,
  Server,
  Layers,
  ChevronRight,
  CheckCircle,
} from "lucide-react";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";

// System Logs Interface
interface EventLog {
  time: string;
  module: string;
  message: string;
  type: "info" | "warning" | "success";
}

export default function PowerGovernor() {
  // --- STATE ---
  const [wattCap, setWattCap] = useState<number>(350);
  const [ecoMode, setEcoMode] = useState<boolean>(false);
  const [dvfsEnabled, setDvfsEnabled] = useState<boolean>(true);
  const [selectedPrecision, setSelectedPrecision] = useState<string>("mixed");
  const [activeCores, setActiveCores] = useState<number>(10);
  const [spikeSimulation, setSpikeSimulation] = useState<boolean>(false);
  const [pinnedTensorsCount, setPinnedTensorsCount] = useState<number>(82);
  const [simulatedLoad, setSimulatedLoad] = useState<number>(45);
  const [savingsTotal, setSavingsTotal] = useState<number>(1482.4);
  const [logs, setLogs] = useState<EventLog[]>([
    { time: "22:04:12", module: "Inference Gov", message: "Successfully hot-swapped Gemma 27B deployment to INT8 ceiling.", type: "success" },
    { time: "22:02:45", module: "Power Budget", message: "System Watt Cap set to 350W. Active DVFS scale adjusted to 1.8 GHz.", type: "info" },
    { time: "22:00:18", module: "Idle State", message: "Parked 6 idle compute threads in accelerator group B.", type: "success" },
    { time: "21:58:32", module: "Memory Min", message: "Pinned frequently used Llama-3 attention maps in Photonic SRAM.", type: "info" },
  ]);

  // --- DERIVED METRICS ---
  // System metrics adjust dynamically based on Watt Cap and Eco Mode!
  const isEco = ecoMode || wattCap <= 250;
  
  // Calculate dynamic active draw
  const maxCapacityPower = isEco ? 280 : 540;
  const currentDraw = Math.round(
    (simulatedLoad / 100) * maxCapacityPower * (selectedPrecision === "fp32" ? 1.2 : selectedPrecision === "fp16" ? 1.0 : selectedPrecision === "int8" ? 0.75 : 0.6)
  );

  const finalDraw = Math.min(wattCap, currentDraw);
  const efficiencyJoules = (isEco ? 0.92 : 1.45) * (selectedPrecision === "int8" ? 0.7 : selectedPrecision === "int4" ? 0.55 : 1.0);
  const thermalHeadroom = Math.round(85 - (finalDraw / wattCap) * 20 - (spikeSimulation ? 15 : 0));
  
  // DVFS Core frequency based on Cap & load
  const dvfsClock = dvfsEnabled
    ? ((finalDraw / maxCapacityPower) * 2.2 + 0.8).toFixed(1)
    : "3.2"; // Turbo/Fixed clock if DVFS is off

  // --- DYNAMIC ACCURACY VS SAVINGS ---
  const precisionMetricsMap: Record<string, { accuracyLoss: string; savings: number; color: string }> = {
    fp32: { accuracyLoss: "0.00% (Baseline)", savings: 0, color: "text-red-400" },
    fp16: { accuracyLoss: "0.02% (Negligible)", savings: 35, color: "text-amber-400" },
    mixed: { accuracyLoss: "0.08% (Negligible)", savings: 58, color: "text-primary" },
    int8: { accuracyLoss: "0.34% (Ultra Low)", savings: 74, color: "text-primary" },
    int4: { accuracyLoss: "1.42% (Low Impact)", savings: 89, color: "text-green-400" },
  };

  const currentPrecisionMetric = precisionMetricsMap[selectedPrecision] || precisionMetricsMap.mixed;

  // --- REAL-TIME TICKER ---
  useEffect(() => {
    const interval = setInterval(() => {
      // Dynamic load fluctuation
      setSimulatedLoad((prev) => {
        const target = spikeSimulation ? 85 : 45;
        const change = (Math.random() - 0.5) * 6;
        const next = prev + (target - prev) * 0.15 + change;
        return Math.max(15, Math.min(98, Math.round(next)));
      });

      // Increase energy savings counter
      setSavingsTotal((prev) => prev + Number((currentPrecisionMetric.savings * 0.0003 + (isEco ? 0.02 : 0.01)).toFixed(5)));
    }, 2000);

    return () => clearInterval(interval);
  }, [spikeSimulation, isEco, currentPrecisionMetric.savings]);

  // --- SIMULATION HANDLERS ---
  const triggerEcoMode = (checked: boolean) => {
    setEcoMode(checked);
    if (checked) {
      setWattCap(200);
      setSelectedPrecision("int8");
      addLog("Power Budget", "Eco Mode activated. Power Cap restricted to 200W, quantizing workloads to INT8.", "warning");
      toast.success("Eco Mode enabled: Power restricted to 200W");
    } else {
      setWattCap(380);
      setSelectedPrecision("mixed");
      addLog("Power Budget", "Eco Mode deactivated. Restored power cap to 380W.", "info");
      toast.info("Eco Mode disabled: Cap restored to 380W");
    }
  };

  const triggerSpikeSimulation = () => {
    setSpikeSimulation(true);
    addLog("Inference Gov", "Inbound request spike detected (P95 queue burst). Activating scheduler throttle.", "warning");
    toast.warning("Simulating high-throughput workload spike!");
    
    setTimeout(() => {
      addLog("Thermal Gov", "Temperature zone node-2 reached 74°C. Aggressively scheduling cool-down window.", "warning");
    }, 3000);

    setTimeout(() => {
      setSpikeSimulation(false);
      addLog("Inference Gov", "Workload queue stabilized. Re-parking 6 idle core compute units.", "success");
      toast.success("Spike simulation complete. Cores returned to dynamic idle.");
    }, 12000);
  };

  const parkCoreManual = (coreId: number) => {
    if (activeCores <= 4) {
      toast.error("OS Guardrail: Cannot park more cores. Minimum 4 computing units required.");
      return;
    }
    setActiveCores((prev) => prev - 1);
    addLog("Idle State", `Aggressively parked compute core #${coreId} to reduce leakage current.`, "success");
    toast.success(`Core #${coreId} successfully parked.`);
  };

  const wakeCoresAll = () => {
    setActiveCores(16);
    addLog("Idle State", "Woke all parked accelerators to satisfy peak processing demands.", "info");
    toast.info("All 16 computing cores online.");
  };

  const handleApplyRightSize = (agentName: string, suggestedModel: string, baselineModel: string) => {
    addLog("Model Right-Sizer", `Hot-swapped ${agentName} model pipeline from ${baselineModel} to ${suggestedModel}.`, "success");
    toast.success(`Right-Sizer: Swapped ${agentName} to ${suggestedModel}!`, {
      description: "Perceived accuracy preserved. Power footprint cut by 68%.",
    });
  };

  const addLog = (module: string, message: string, type: "info" | "warning" | "success") => {
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`;
    setLogs((prev) => [{ time: timeStr, module, message, type }, ...prev.slice(0, 10)]);
  };

  // --- MOCK CHART DATA ---
  const baselineComparisonData = [
    { time: "18:00", baseline: 650, optimized: 280, savings: 370 },
    { time: "19:00", baseline: 680, optimized: 295, savings: 385 },
    { time: "20:00", baseline: 740, optimized: 310, savings: 430 },
    { time: "21:00", baseline: 810, optimized: 325, savings: 485 },
    { time: "22:00", baseline: 850, optimized: 350, savings: 500 },
    { time: "23:00", baseline: 620, optimized: 210, savings: 410 },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/30">
      <DashboardHeader
        title="Power Governor"
        subtitle="Agentic workload power budgets, precision scaling, and accelerator idle optimization"
      />

      <div className="p-6 space-y-6">
        
        {/* --- TOP METRICS GRID (ENERGY TELEMETRY CONSOLE) --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <Card className="glass-card-premium cyber-corners border-primary/15 hover:border-primary/25 transition-all relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-all" />
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-mono font-medium text-muted-foreground">Active Watt Draw</CardTitle>
                <BatteryCharging className="w-4 h-4 text-primary animate-pulse" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold font-mono text-foreground flex items-baseline gap-1">
                  {finalDraw}W
                  <span className="text-xs text-muted-foreground font-sans font-normal">/ {wattCap}W Cap</span>
                </div>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <Progress value={(finalDraw / wattCap) * 100} className="h-1.5 bg-secondary flex-1" />
                  <span className="text-xs font-mono text-muted-foreground">{Math.round((finalDraw / wattCap) * 100)}%</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="glass-card-premium cyber-corners border-cyan-500/15 hover:border-cyan-500/25 transition-all relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-2xl group-hover:bg-cyan-500/10 transition-all" />
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-mono font-medium text-muted-foreground">Energy / Inference</CardTitle>
                <Zap className="w-4 h-4 text-cyan-400" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold font-mono text-cyan-400">
                  {efficiencyJoules.toFixed(2)} J
                  <span className="text-xs text-muted-foreground font-sans font-normal"> / kToken</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2 font-sans flex items-center gap-1">
                  <span className="text-green-400 font-bold font-mono flex items-center">
                    <TrendingDown className="w-3 h-3 mr-0.5 inline" />
                    -{isEco ? "63%" : "38%"}
                  </span> 
                  savings against cluster baseline hardware
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <Card className="glass-card-premium cyber-corners border-amber-500/15 hover:border-amber-500/25 transition-all relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full blur-2xl group-hover:bg-red-500/10 transition-all" />
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-mono font-medium text-muted-foreground">Thermal Headroom</CardTitle>
                <Thermometer className="w-4 h-4 text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold font-mono text-amber-400">
                  +{thermalHeadroom}°C
                  <span className="text-xs text-muted-foreground font-sans font-normal"> to throttle</span>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Governor State:</span>
                  <Badge variant={thermalHeadroom > 20 ? "default" : "secondary"} className="font-mono py-0 text-[10px]">
                    {thermalHeadroom > 20 ? "Optimized Cool" : "Thermal Alert"}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="glass-card-premium cyber-corners border-green-500/15 hover:border-green-500/25 transition-all relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 rounded-full blur-2xl group-hover:bg-green-500/10 transition-all" />
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-mono font-medium text-muted-foreground">Total Energy Saved</CardTitle>
                <Leaf className="w-4 h-4 text-green-400" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold font-mono text-green-400">
                  {savingsTotal.toFixed(2)}
                  <span className="text-xs text-muted-foreground font-sans font-normal"> kWh</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2 font-sans flex items-center gap-1">
                  Equivalent to 
                  <span className="text-green-400 font-mono font-medium">
                    {Math.round(savingsTotal * 0.43)} kg
                  </span> 
                  CO₂ offset
                </p>
              </CardContent>
            </Card>
          </motion.div>

        </div>

        {/* --- MAIN PAGE LAYOUT --- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* LEFT AREA: Power control & routing (lg:col-span-2) */}
          <div className="lg:col-span-2 space-y-6">

            {/* 1. POWER BUDGET ENGINE */}
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="p-5 rounded-xl glass-card-premium cyber-corners terminal-scanlines border border-primary/15">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h3 className="font-mono font-bold text-foreground flex items-center gap-2 text-lg">
                    <Sliders className="w-5 h-5 text-primary" />
                    Power Budget Engine
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Enforces silicon watt caps, triggers DVFS frequency adjustments, and throttles queues.
                  </p>
                </div>
                
                {/* ECO MODE TOGGLE */}
                <div className="flex items-center gap-2 p-2 rounded-lg bg-secondary/30 border border-border">
                  <div className="text-left">
                    <div className="text-xs font-mono font-bold text-green-400 flex items-center gap-1">
                      <Leaf className="w-3 h-3" />
                      ECO MODE
                    </div>
                    <div className="text-[10px] text-muted-foreground">Aggressive power saving</div>
                  </div>
                  <Switch checked={ecoMode} onCheckedChange={triggerEcoMode} className="data-[state=checked]:bg-green-500" />
                </div>
              </div>

              {/* Slider for System Cap */}
              <div className="space-y-4 p-4 rounded-lg bg-secondary/20 border border-border/50">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-mono text-muted-foreground">Operating System Power Cap</span>
                  <span className="text-xl font-bold font-mono text-primary">{wattCap}W</span>
                </div>
                <Slider
                  value={[wattCap]}
                  min={120}
                  max={600}
                  step={10}
                  onValueChange={(val) => {
                    setWattCap(val[0]);
                    if (val[0] > 250 && ecoMode) {
                      setEcoMode(false);
                    }
                  }}
                  disabled={ecoMode}
                  className="flex-1"
                />
                <div className="flex justify-between text-[10px] font-mono text-muted-foreground">
                  <span>120W (Ultra Edge Peak)</span>
                  <span>350W (Standard GPU TDP)</span>
                  <span>600W (Max Rack Density)</span>
                </div>
              </div>

              {/* Governor Policies and Autopilot indicators */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                
                <div className="p-3 rounded-lg bg-secondary/30 flex items-center justify-between border border-border/30">
                  <div>
                    <div className="text-xs font-mono text-muted-foreground">DVFS Freq Scaling</div>
                    <div className="text-sm font-mono font-bold text-foreground mt-1">
                      {dvfsEnabled ? `${dvfsClock} GHz` : "Locked (3.2 GHz)"}
                    </div>
                  </div>
                  <Switch checked={dvfsEnabled} onCheckedChange={(val) => {
                    setDvfsEnabled(val);
                    addLog("Power Budget", `Dynamic Voltage and Frequency Scaling (DVFS) ${val ? "enabled" : "disabled"}.`, val ? "info" : "warning");
                  }} />
                </div>

                <div className="p-3 rounded-lg bg-secondary/30 border border-border/30">
                  <div className="text-xs font-mono text-muted-foreground">Dynamic Active Batch</div>
                  <div className="text-sm font-mono font-bold text-foreground mt-1">
                    {isEco ? "16 requests" : "64 (Full Buffer)"}
                  </div>
                  <div className="text-[10px] text-muted-foreground font-sans mt-0.5">Auto-adjusted based on Watt Cap</div>
                </div>

                <div className="p-3 rounded-lg bg-secondary/30 border border-border/30">
                  <div className="text-xs font-mono text-muted-foreground">Dynamic Precision Ceiling</div>
                  <div className="text-sm font-mono font-bold text-foreground mt-1 uppercase">
                    {isEco ? "INT8 / INT4 mixed" : `${selectedPrecision}`}
                  </div>
                  <div className="text-[10px] text-muted-foreground font-sans mt-0.5">Assures latency guarantees</div>
                </div>

              </div>
            </motion.div>

            {/* 2. INFERENCE GOVERNOR & SILICON ROUTER */}
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="p-5 rounded-xl glass-card-premium cyber-corners terminal-scanlines border border-cyan-500/15">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-mono font-bold text-foreground flex items-center gap-2 text-lg">
                    <Activity className="w-5 h-5 text-cyan-400" />
                    Inference Governor Silicon Router
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Routes active inferences to the most energy-efficient silicon domain that satisfies SLA guidelines.
                  </p>
                </div>
                <Badge className="bg-primary/20 text-primary border-primary/30">Autopilot Active</Badge>
              </div>

              {/* Silicon Visualizer Nodes */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 my-6 p-4 rounded-xl bg-secondary/20 border border-border/40 relative">
                
                {/* Photonic Accelerator */}
                <div className="p-3 rounded-lg bg-primary/8 border border-primary/25 text-center relative group" style={{ boxShadow: "0 0 12px rgba(16,185,129,0.1), inset 0 0 12px rgba(16,185,129,0.04)" }}>
                  <div className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary led-glow-green" />
                  <Layers className="w-5 h-5 text-primary mx-auto mb-2 drop-shadow-[0_0_4px_rgba(16,185,129,0.6)]" />
                  <span className="text-[10px] font-mono font-bold text-foreground block tracking-wide">Photonic WDM</span>
                  <span className="text-[9px] text-primary font-mono block mt-1 tracking-widest">Active Core (0.1W)</span>
                </div>

                {/* NPU Edge Core */}
                <div className={`p-3 rounded-lg text-center relative group border transition-all duration-300 ${isEco ? "border-cyan-500/30" : "border-border/20"}`} style={isEco ? { background: "rgba(56,189,248,0.08)", boxShadow: "0 0 10px rgba(56,189,248,0.1)" } : { background: "rgba(30,40,55,0.3)" }}>
                  {isEco && <div className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-cyan-400 led-glow-blue" />}
                  <HardDrive className={`w-5 h-5 mx-auto mb-2 ${isEco ? "text-cyan-400 drop-shadow-[0_0_4px_rgba(56,189,248,0.6)]" : "text-muted-foreground/40"}`} />
                  <span className="text-[10px] font-mono font-bold text-foreground block tracking-wide">Hetero NPU</span>
                  <span className={`text-[9px] font-mono block mt-1 tracking-widest ${isEco ? "text-cyan-400" : "text-muted-foreground/50"}`}>
                    {isEco ? "Heavy Duty (8W)" : "Standby (1.2W)"}
                  </span>
                </div>

                {/* High Density GPU */}
                <div className={`p-3 rounded-lg text-center relative group border transition-all duration-300 ${!isEco ? "border-amber-500/30" : "border-border/20"}`} style={!isEco ? { background: "rgba(245,158,11,0.08)", boxShadow: "0 0 10px rgba(245,158,11,0.1)" } : { background: "rgba(30,40,55,0.3)" }}>
                  {!isEco && <div className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-400 led-glow-amber" />}
                  <Cpu className={`w-5 h-5 mx-auto mb-2 ${!isEco ? "text-amber-400 drop-shadow-[0_0_4px_rgba(245,158,11,0.6)]" : "text-muted-foreground/40"}`} />
                  <span className="text-[10px] font-mono font-bold text-foreground block tracking-wide">NVIDIA GPU H100</span>
                  <span className={`text-[9px] font-mono block mt-1 tracking-widest ${!isEco ? "text-amber-400" : "text-muted-foreground/50"}`}>
                    {!isEco ? "Active Load (320W)" : "Parked State (12W)"}
                  </span>
                </div>

                {/* Host CPU */}
                <div className="p-3 rounded-lg text-center relative group border border-border/20" style={{ background: "rgba(30,40,55,0.3)" }}>
                  <Server className="w-5 h-5 text-muted-foreground/50 mx-auto mb-2" />
                  <span className="text-[10px] font-mono font-bold text-foreground block tracking-wide">Host Xeon CPU</span>
                  <span className="text-[9px] text-muted-foreground/50 font-mono block mt-1 tracking-widest">Cache Mgmt</span>
                </div>

              </div>

              {/* Silicon queue table */}
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Target Workload</TableHead>
                      <TableHead>Route Decision</TableHead>
                      <TableHead>Active SLA Latency</TableHead>
                      <TableHead>Path Metric</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-mono text-xs font-bold">Llama-3-70B (Agent UI)</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={isEco ? "border-cyan-500 text-cyan-400" : "border-amber-500 text-amber-400"}>
                          {isEco ? "NPU + Mixed Cache" : "Dedicated GPU Core"}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{isEco ? "1.4s (SLA Met)" : "0.32s (Boost)"}</TableCell>
                      <TableCell className="font-mono text-xs text-green-400">-{isEco ? "82%" : "22%"} Joules</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-mono text-xs font-bold">Mistral-7B (Search API)</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-primary text-primary">
                          Photonic WDM Native
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">88ms (P95)</TableCell>
                      <TableCell className="font-mono text-xs text-green-400">-94% Joules</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-mono text-xs font-bold">Gemma-27B (Analytics)</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-secondary text-muted-foreground">
                          {isEco ? "Standby Queue" : "GPU INT8 Stream"}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{isEco ? "Paused (Idle-State)" : "420ms (SLA Met)"}</TableCell>
                      <TableCell className="font-mono text-xs text-green-400">-100% (Parked)</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </motion.div>

            {/* 3. PRECISION SCALING CONTROLS */}
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="p-5 rounded-xl glass-card-premium cyber-corners border border-primary/15">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-mono font-bold text-foreground flex items-center gap-2 text-lg">
                    <Sliders className="w-5 h-5 text-primary" />
                    Precision Scaling Room
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Dynamically clamp precision limits based on energy availability or accuracy threshold.
                  </p>
                </div>
                <Info className="w-4 h-4 text-muted-foreground cursor-pointer" />
              </div>

              {/* Selector buttons for forcing quantization */}
              <div className="grid grid-cols-5 gap-2 p-2 rounded-xl bg-secondary/20 border border-border">
                {Object.keys(precisionMetricsMap).map((prec) => (
                  <button
                    key={prec}
                    onClick={() => {
                      setSelectedPrecision(prec);
                      addLog("Inference Gov", `Quantization ceiling adjusted manually to ${prec.toUpperCase()}.`, "info");
                      toast.info(`Workloads adjusted to ${prec.toUpperCase()} ceiling.`);
                    }}
                    className={`py-2 px-1 text-center font-mono text-xs rounded-lg transition-all ${
                      selectedPrecision === prec
                        ? "bg-primary text-primary-foreground font-bold shadow-md shadow-primary/20"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    }`}
                  >
                    {prec.toUpperCase()}
                  </button>
                ))}
              </div>

              {/* Interactive Accuracy vs Energy trade-off estimation */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 p-4 rounded-xl bg-secondary/10 border border-border/30">
                <div>
                  <span className="text-xs text-muted-foreground font-mono block">Accuracy Impact</span>
                  <span className="text-sm font-mono font-bold text-foreground mt-1 block">
                    {currentPrecisionMetric.accuracyLoss}
                  </span>
                  <div className="mt-3 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                    SLA Guarantees successfully preserved.
                  </div>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground font-mono block">Simulated Power Reduction</span>
                  <span className="text-lg font-mono font-bold text-green-400 mt-1 block">
                    +{currentPrecisionMetric.savings}% Saved
                  </span>
                  <Progress value={currentPrecisionMetric.savings} className="h-1.5 bg-secondary mt-3" />
                </div>
              </div>
            </motion.div>

          </div>

          {/* RIGHT AREA: Right-Sizer, Core Parking & Logs (lg:col-span-1) */}
          <div className="lg:col-span-1 space-y-6">

            {/* 1. MODEL RIGHT-SIZER PANEL */}
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="p-5 rounded-xl glass-card-premium cyber-corners border border-green-500/12">
              <h3 className="font-mono font-bold text-foreground flex items-center gap-2 text-md mb-2">
                <TrendingDown className="w-4 h-4 text-green-400" />
                Model Right-Sizer Recommendations
              </h3>
              <p className="text-[11px] text-muted-foreground mb-4">
                Detects waste. Suggests model substitution when tasks do not require maximum parameter depth.
              </p>

              <div className="space-y-3">
                
                {/* Rec 1 */}
                <div className="p-3 rounded-lg bg-secondary/30 border border-border/40 hover:border-primary/20 transition-colors">
                  <div className="flex justify-between items-start">
                    <div>
                      <Badge className="bg-red-400/10 text-red-400 border-red-400/20 text-[9px] py-0">Low Load</Badge>
                      <h4 className="font-mono text-xs font-bold mt-1.5 text-foreground">Support Assistant Agent</h4>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Currently: Llama-3-70B FP16</p>
                    </div>
                    <span className="text-xs font-mono font-bold text-green-400">-84% W</span>
                  </div>
                  <div className="mt-3 pt-3 border-t border-border/30 flex items-center justify-between gap-2">
                    <span className="text-[10px] text-muted-foreground">Suggest: Mistral 7B (INT8)</span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 font-mono text-[9px] py-0 px-2 border-primary/40 hover:bg-primary/10"
                      onClick={() => handleApplyRightSize("Support Assistant", "Mistral 7B (INT8)", "Llama-3-70B FP16")}
                    >
                      Apply Optimize
                    </Button>
                  </div>
                </div>

                {/* Rec 2 */}
                <div className="p-3 rounded-lg bg-secondary/30 border border-border/40 hover:border-primary/20 transition-colors">
                  <div className="flex justify-between items-start">
                    <div>
                      <Badge className="bg-amber-400/10 text-amber-400 border-amber-400/20 text-[9px] py-0">Repetitive Task</Badge>
                      <h4 className="font-mono text-xs font-bold mt-1.5 text-foreground">Data Extractor Agent</h4>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Currently: GPT-4-175B (API)</p>
                    </div>
                    <span className="text-xs font-mono font-bold text-green-400">-92% W</span>
                  </div>
                  <div className="mt-3 pt-3 border-t border-border/30 flex items-center justify-between gap-2">
                    <span className="text-[10px] text-muted-foreground">Suggest: Llama-3-8B (INT4)</span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 font-mono text-[9px] py-0 px-2 border-primary/40 hover:bg-primary/10"
                      onClick={() => handleApplyRightSize("Data Extractor", "Llama-3-8B (INT4)", "GPT-4-175B API")}
                    >
                      Apply Optimize
                    </Button>
                  </div>
                </div>

              </div>
            </motion.div>

            {/* 2. CORE PARKING (IDLE-STATE ORCHESTRATOR) */}
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="p-5 rounded-xl glass-card-premium cyber-corners terminal-scanlines border border-primary/15">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-mono font-bold text-foreground flex items-center gap-2 text-md">
                  <Power className="w-4 h-4 text-primary" />
                  Idle Core Orchestration
                </h3>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger><Info className="w-3.5 h-3.5 text-muted-foreground" /></TooltipTrigger>
                    <TooltipContent className="bg-card text-foreground border-border text-xs max-w-xs">
                      Parks unneeded accelerators to minimize leakage power. Re-wakes instantly when queue depth builds.
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <p className="text-[11px] text-muted-foreground mb-4">
                Aggressively suspends unused TPU/GPU cores. Click blocks to manually simulate node parking.
              </p>

              {/* Grid of cores */}
              <div className="grid grid-cols-4 gap-2 mb-4 p-3 rounded-lg bg-secondary/20 border border-border/40">
                {Array.from({ length: 16 }).map((_, i) => {
                  const coreId = i + 1;
                  const isActive = coreId <= activeCores;
                  return (
                    <button
                      key={coreId}
                      onClick={() => {
                        if (isActive) {
                          parkCoreManual(coreId);
                        } else {
                          setActiveCores((prev) => Math.min(16, prev + 1));
                          addLog("Idle State", `Unparked core #${coreId} manually.`, "info");
                        }
                      }}
                      className={`h-9 font-mono text-[9px] rounded flex flex-col justify-center items-center font-bold border transition-all duration-200 ${
                        isActive
                          ? "bg-primary/15 text-primary border-primary/35 hover:bg-primary/25 shadow-[0_0_8px_rgba(16,185,129,0.15)]"
                          : "bg-secondary/30 text-muted-foreground/30 border-border/30 hover:bg-secondary/60 hover:text-muted-foreground/50"
                      }`}
                    >
                      <span>C{coreId}</span>
                      <span className="text-[8px] font-sans font-normal">{isActive ? "ON" : "PARK"}</span>
                    </button>
                  );
                })}
              </div>

              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">
                  Active cores: <strong className="text-foreground">{activeCores} / 16</strong>
                </span>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" className="h-7 text-[10px] px-2 font-mono" onClick={wakeCoresAll}>
                    Wake All
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-[10px] px-2 font-mono" onClick={triggerSpikeSimulation} disabled={spikeSimulation}>
                    Simulate Spike
                  </Button>
                </div>
              </div>
            </motion.div>

            {/* 3. MEMORY BANDWIDTH (MEMORY MOVEMENT MINIMIZER) */}
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }} className="p-5 rounded-xl glass-card-premium cyber-corners border border-cyan-500/12">
              <h3 className="font-mono font-bold text-foreground flex items-center gap-2 text-md mb-2">
                <HardDrive className="w-4 h-4 text-cyan-400" />
                Memory Movement Minimizer
              </h3>
              <p className="text-[11px] text-muted-foreground mb-4">
                Reduces HBM/DRAM activation transfers by locking active tensors directly in Photonic SRAM cache.
              </p>

              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs font-mono mb-1">
                    <span>Pinned Attention Maps</span>
                    <span className="text-cyan-400 font-bold">{pinnedTensorsCount}%</span>
                  </div>
                  <Progress value={pinnedTensorsCount} className="h-1.5 bg-secondary" />
                </div>
                
                <div>
                  <div className="flex justify-between text-xs font-mono mb-1">
                    <span>PCIe Bandwidth Mitigation</span>
                    <span className="text-green-400 font-bold">-68% Saved</span>
                  </div>
                  <Progress value={68} className="h-1.5 bg-secondary" />
                </div>

                <div className="pt-2 border-t border-border/30 flex justify-between items-center text-[10px] font-mono text-muted-foreground">
                  <span>SRAM Cache Hits: <strong>94.2%</strong></span>
                  <span>NVLink Active: <strong>32 GB/s (Eco)</strong></span>
                </div>
              </div>
            </motion.div>

          </div>

        </div>

        {/* --- BOTTOM ROW: TELEMETRY SAVINGS & LOGS --- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Cumulative Savings Chart (lg:col-span-2) */}
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="lg:col-span-2 p-5 rounded-xl glass-card-premium cyber-corners border border-green-500/12">
            <h3 className="font-mono font-bold text-foreground flex items-center justify-between mb-4">
              <span>Historical Accumulated Savings (kWH)</span>
              <Badge className="bg-green-400/20 text-green-400 border-green-400/30">Active Tracking</Badge>
            </h3>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={baselineComparisonData}>
                  <defs>
                    <linearGradient id="colorSavings" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(160, 84%, 45%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(160, 84%, 45%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                  <XAxis dataKey="time" stroke="#666" fontStyle="mono" fontSize={10} />
                  <YAxis stroke="#666" fontStyle="mono" fontSize={10} />
                  <RechartsTooltip contentStyle={{ backgroundColor: "#1e1e1e", borderColor: "#333", color: "#eee" }} />
                  <Area
                    type="monotone"
                    dataKey="savings"
                    stroke="hsl(160, 84%, 45%)"
                    fillOpacity={1}
                    fill="url(#colorSavings)"
                    name="Energy Savings (kW)"
                  />
                  <Line type="monotone" dataKey="optimized" stroke="hsl(200, 80%, 50%)" name="LightOS Active" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Dynamic OS Event Stream Logs (lg:col-span-1) */}
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="lg:col-span-1 p-5 rounded-xl glass-card-premium cyber-corners terminal-scanlines border border-primary/15 flex flex-col">
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
              <h3 className="font-mono font-bold text-foreground flex items-center gap-2 text-md">
                <Server className="w-4 h-4 text-primary animate-pulse" />
                Governor Event Stream
              </h3>
              <span className="text-[10px] text-muted-foreground font-mono">Live Logs</span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 max-h-72 font-mono text-xs pr-1">
              <AnimatePresence initial={false}>
                {logs.map((log, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    className="p-2.5 rounded bg-secondary/20 border border-border/30 hover:bg-secondary/40 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] text-muted-foreground">{log.time}</span>
                      <span className={`text-[8px] font-mono font-bold uppercase px-1.5 py-0.5 rounded tracking-widest ${
                        log.type === "success" ? "badge-neon-green" :
                        log.type === "warning" ? "badge-neon-amber" :
                        "badge-neon-blue"
                      }`}>
                        {log.module}
                      </span>
                    </div>
                    <p className="text-foreground/90 mt-1 text-[11px] leading-relaxed">
                      {log.message}
                    </p>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.div>

        </div>

      </div>
    </div>
  );
}
