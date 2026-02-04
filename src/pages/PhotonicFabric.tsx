import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Network,
  Activity,
  Zap,
  Layers,
  Cpu,
  ThermometerSun,
  TrendingUp,
  TrendingDown,
  Play,
  Terminal,
  DollarSign,
  Cloud,
  Server,
} from "lucide-react";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

// 10-Layer Photonic Stack definition
const photonicLayers = [
  { id: 1, name: "Physical Fabric", status: "active", description: "Silicon photonic waveguides and optical interconnects" },
  { id: 2, name: "Optical Switching", status: "active", description: "Reconfigurable optical add-drop multiplexers" },
  { id: 3, name: "Logic Intercept", status: "active", description: "NCCL/NVLink primitive interception layer" },
  { id: 4, name: "Topology-Aware Routing", status: "active", description: "Dynamic path computation and circuit provisioning" },
  { id: 5, name: "Collective Optimization", status: "optimizing", description: "All-Reduce, All-to-All, Broadcast pattern detection" },
  { id: 6, name: "Thermal Management", status: "active", description: "Heat dissipation and cooling coordination" },
  { id: 7, name: "Power Orchestration", status: "active", description: "Energy distribution and load balancing" },
  { id: 8, name: "Workload Scheduler", status: "active", description: "Job placement and resource allocation" },
  { id: 9, name: "Telemetry Aggregation", status: "active", description: "Real-time metrics and observability" },
  { id: 10, name: "High-Bandwidth Unified Memory", status: "active", description: "Coherent memory fabric across nodes" },
];

// Mock agentic console logs
const initialConsoleLogs = [
  { time: "10:32:15.234", message: "Intercepting NVLink primitive... Rerouting to Photonic Layer 4", type: "info" },
  { time: "10:32:15.891", message: "Collective Optimization Engine: Detected All-to-All pattern (MoE)", type: "success" },
  { time: "10:32:16.003", message: "Provisioning optical circuit: GPU-0 → GPU-7 @ 400Gbps", type: "info" },
  { time: "10:32:16.127", message: "Thermal wall bypassed. Headroom increased to +42%", type: "success" },
  { time: "10:32:17.445", message: "Reconfigured topology for MoE All-to-All primitive in 3.7μs", type: "success" },
];

const PhotonicFabric = () => {
  const [shimEnabled, setShimEnabled] = useState(false);
  const [selectedCloud, setSelectedCloud] = useState<string | null>(null);
  const [consoleLogs, setConsoleLogs] = useState(initialConsoleLogs);
  const [utilization, setUtilization] = useState({ benchmark: 38, lightrail: 84 });
  const [powerDraw, setPowerDraw] = useState({ benchmark: 4200, lightrail: 2100 });

  // Simulate real-time log updates
  useEffect(() => {
    const interval = setInterval(() => {
      const newLogs = [
        "Monitoring cluster telemetry... Utilization at 84%",
        "Optical path optimized: Latency reduced by 47%",
        "Detecting training collective: Ring-AllReduce topology active",
        "Bandwidth density increased 100x via photonic mesh",
        "Thermal margin maintained at +42% above baseline",
      ];
      const randomLog = newLogs[Math.floor(Math.random() * newLogs.length)];
      const now = new Date();
      const timeStr = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}.${now.getMilliseconds().toString().padStart(3, "0")}`;
      
      setConsoleLogs((prev) => [
        ...prev.slice(-9),
        { time: timeStr, message: randomLog, type: Math.random() > 0.3 ? "info" : "success" },
      ]);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const cloudProviders = [
    { id: "aws", name: "AWS", icon: Cloud },
    { id: "gcp", name: "Google Cloud", icon: Cloud },
    { id: "azure", name: "Azure", icon: Cloud },
    { id: "intel", name: "Intel Cloud", icon: Server },
  ];

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader
        title="Photonic Fabric OS"
        subtitle="10-Layer Stack for Software-Defined Photonic Computing"
      />

      <div className="p-6 space-y-6">
        {/* Live indicator */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="w-2 h-2 rounded-full bg-lightrail animate-pulse" />
            <span className="font-mono">Photonic Fabric Active</span>
          </div>
          <Badge variant="outline" className="font-mono text-lightrail border-lightrail/30">
            Layer 4 Routing Enabled
          </Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: 10-Layer Stack Explorer */}
          <div className="lg:col-span-1">
            <Card className="bg-card/50 border-border">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg font-mono">
                  <Layers className="w-5 h-5 text-lightrail" />
                  10-Layer Stack
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Accordion type="single" collapsible className="w-full">
                  {photonicLayers.map((layer) => (
                    <AccordionItem key={layer.id} value={`layer-${layer.id}`} className="border-border">
                      <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-secondary/50">
                        <div className="flex items-center gap-3 text-left">
                          <span className="w-6 h-6 rounded bg-lightrail/20 text-lightrail text-xs font-mono flex items-center justify-center">
                            {layer.id}
                          </span>
                          <div className="flex-1">
                            <p className="text-sm font-medium">{layer.name}</p>
                          </div>
                          <span
                            className={`w-2 h-2 rounded-full ${
                              layer.status === "active"
                                ? "bg-lightrail"
                                : layer.status === "optimizing"
                                ? "bg-amber-400 animate-pulse"
                                : "bg-muted-foreground"
                            }`}
                          />
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-4 pb-3">
                        <p className="text-xs text-muted-foreground">{layer.description}</p>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          </div>

          {/* Middle Column: Photonic Mesh Visualizer + Energy Lab */}
          <div className="lg:col-span-2 space-y-6">
            {/* Photonic Mesh Visualizer */}
            <Card className="bg-card/50 border-border">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-lg font-mono">
                    <Network className="w-5 h-5 text-lightrail" />
                    Topology Fingerprint v1.0
                  </CardTitle>
                  <Badge className="bg-lightrail/10 text-lightrail border-lightrail/30">
                    Live: Layer 4 Routing
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="relative h-64 w-full bg-black/40 rounded-lg overflow-hidden border border-border">
                  {/* SVG Visualization of Photonic Mesh */}
                  <svg viewBox="0 0 400 200" className="w-full h-full">
                    {/* Grid pattern */}
                    <defs>
                      <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                        <path d="M 20 0 L 0 0 0 20" fill="none" stroke="hsl(220 15% 18%)" strokeWidth="0.5" />
                      </pattern>
                      <filter id="glow">
                        <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                        <feMerge>
                          <feMergeNode in="coloredBlur" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>
                    </defs>
                    <rect width="400" height="200" fill="url(#grid)" />

                    {/* Legacy Electrical Traces (Dashed/Dim) */}
                    <path d="M50 100 L350 100" stroke="hsl(220 15% 25%)" strokeDasharray="4" strokeWidth="1" />
                    <path d="M100 50 L100 150" stroke="hsl(220 15% 25%)" strokeDasharray="4" strokeWidth="1" />
                    <path d="M300 50 L300 150" stroke="hsl(220 15% 25%)" strokeDasharray="4" strokeWidth="1" />

                    {/* Photonic Waveguides (Glowing/Solid) */}
                    <motion.path
                      d="M50 100 Q 200 20, 350 100"
                      stroke="#00FF88"
                      fill="transparent"
                      strokeWidth="2"
                      filter="url(#glow)"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 2, repeat: Infinity, repeatType: "loop" }}
                    />
                    <motion.path
                      d="M100 50 Q 200 100, 300 50"
                      stroke="#00FF88"
                      fill="transparent"
                      strokeWidth="2"
                      filter="url(#glow)"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 2.5, delay: 0.5, repeat: Infinity, repeatType: "loop" }}
                    />
                    <motion.path
                      d="M100 150 Q 200 100, 300 150"
                      stroke="#06b6d4"
                      fill="transparent"
                      strokeWidth="2"
                      filter="url(#glow)"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 2, delay: 1, repeat: Infinity, repeatType: "loop" }}
                    />

                    {/* GPU Nodes */}
                    {[
                      { x: 50, y: 100 },
                      { x: 100, y: 50 },
                      { x: 100, y: 150 },
                      { x: 200, y: 100 },
                      { x: 300, y: 50 },
                      { x: 300, y: 150 },
                      { x: 350, y: 100 },
                    ].map((node, i) => (
                      <g key={i}>
                        <circle cx={node.x} cy={node.y} r="8" fill="#121212" stroke="#00FF88" strokeWidth="2" />
                        <circle cx={node.x} cy={node.y} r="3" fill="#00FF88" />
                      </g>
                    ))}

                    {/* Labels */}
                    <text x="50" y="120" fill="#666" fontSize="8" textAnchor="middle" fontFamily="monospace">
                      GPU-0
                    </text>
                    <text x="350" y="120" fill="#666" fontSize="8" textAnchor="middle" fontFamily="monospace">
                      GPU-7
                    </text>
                  </svg>
                </div>

                {/* Metrics Row */}
                <div className="grid grid-cols-3 gap-4 mt-4">
                  <div className="bg-secondary/50 p-3 rounded border border-border">
                    <p className="text-muted-foreground text-xs">Bandwidth Density</p>
                    <p className="text-lg font-bold font-mono text-lightrail">100x</p>
                  </div>
                  <div className="bg-secondary/50 p-3 rounded border border-border">
                    <p className="text-muted-foreground text-xs">Thermal Margin</p>
                    <p className="text-lg font-bold font-mono text-lightrail">+42%</p>
                  </div>
                  <div className="bg-lightrail/10 p-3 rounded border border-lightrail/40">
                    <p className="text-lightrail text-xs">Power Saving</p>
                    <p className="text-lg font-bold font-mono text-lightrail">Orders of Mag</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Energy Lab Dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Utilization Gauge */}
              <Card className="bg-card/50 border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm font-mono">
                    <Activity className="w-4 h-4 text-lightrail" />
                    GPU Utilization
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Benchmark (Copper)</span>
                      <span className="font-mono">{utilization.benchmark}%</span>
                    </div>
                    <Progress value={utilization.benchmark} className="h-2 bg-secondary" />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-lightrail">LightRail (Photonic)</span>
                      <span className="font-mono text-lightrail">{utilization.lightrail}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-secondary overflow-hidden">
                      <motion.div
                        className="h-full bg-lightrail"
                        initial={{ width: 0 }}
                        animate={{ width: `${utilization.lightrail}%` }}
                        transition={{ duration: 1 }}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-lightrail">
                    <TrendingUp className="w-3 h-3" />
                    <span>+{utilization.lightrail - utilization.benchmark}% improvement</span>
                  </div>
                </CardContent>
              </Card>

              {/* Power Draw */}
              <Card className="bg-card/50 border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm font-mono">
                    <Zap className="w-4 h-4 text-amber-400" />
                    Power Draw
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Benchmark</span>
                      <span className="font-mono">{powerDraw.benchmark}W</span>
                    </div>
                    <Progress value={100} className="h-2 bg-secondary" />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-lightrail">LightRail</span>
                      <span className="font-mono text-lightrail">{powerDraw.lightrail}W</span>
                    </div>
                    <div className="h-2 rounded-full bg-secondary overflow-hidden">
                      <motion.div
                        className="h-full bg-lightrail"
                        initial={{ width: 0 }}
                        animate={{ width: `${(powerDraw.lightrail / powerDraw.benchmark) * 100}%` }}
                        transition={{ duration: 1 }}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-lightrail">
                    <TrendingDown className="w-3 h-3" />
                    <span>-{Math.round(((powerDraw.benchmark - powerDraw.lightrail) / powerDraw.benchmark) * 100)}% power reduction</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Financial ROI Tracker */}
            <Card className="bg-card/50 border-border">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg font-mono">
                  <DollarSign className="w-5 h-5 text-lightrail" />
                  Financial ROI Tracker
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-secondary/50 border border-border">
                    <p className="text-xs text-muted-foreground mb-2">Benchmark Rate</p>
                    <p className="text-2xl font-bold font-mono text-muted-foreground">$1.37–$1.71</p>
                    <p className="text-xs text-muted-foreground">/hour compute</p>
                  </div>
                  <div className="p-4 rounded-lg bg-lightrail/10 border border-lightrail/40">
                    <p className="text-xs text-lightrail mb-2">LightRail Rate</p>
                    <p className="text-2xl font-bold font-mono text-lightrail">$0.68–$0.85</p>
                    <p className="text-xs text-lightrail">/hour compute</p>
                  </div>
                </div>
                <div className="mt-4 p-3 rounded bg-lightrail/10 border border-lightrail/30">
                  <p className="text-center text-sm font-mono text-lightrail">
                    ⚡ 50% cost reduction with higher utilization (30-50% → 80%+)
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Bottom Section: Console + Zero-CapEx Deployment */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Agentic Action Console */}
          <Card className="bg-card/50 border-border">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg font-mono">
                <Terminal className="w-5 h-5 text-lightrail" />
                Agentic Action Console
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-black/60 rounded-lg p-4 font-mono text-xs h-64 overflow-y-auto border border-border">
                {consoleLogs.map((log, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex gap-2 mb-2"
                  >
                    <span className="text-muted-foreground">[{log.time}]</span>
                    <span className={log.type === "success" ? "text-lightrail" : "text-foreground"}>
                      {log.message}
                    </span>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Zero-CapEx Deployment */}
          <Card className="bg-card/50 border-border">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg font-mono">
                <Cloud className="w-5 h-5 text-lightrail" />
                Zero-CapEx Deployment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border border-border">
                <div>
                  <p className="text-sm font-medium">Fabric OS Shim</p>
                  <p className="text-xs text-muted-foreground">Software-first deployment on existing infrastructure</p>
                </div>
                <Switch checked={shimEnabled} onCheckedChange={setShimEnabled} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {cloudProviders.map((provider) => (
                  <Button
                    key={provider.id}
                    variant={selectedCloud === provider.id ? "default" : "outline"}
                    className={`font-mono justify-start ${
                      selectedCloud === provider.id ? "bg-lightrail text-lightrail-foreground" : ""
                    }`}
                    onClick={() => setSelectedCloud(provider.id)}
                  >
                    <provider.icon className="w-4 h-4 mr-2" />
                    {provider.name}
                  </Button>
                ))}
              </div>

              {shimEnabled && selectedCloud && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 rounded-lg bg-lightrail/10 border border-lightrail/30"
                >
                  <p className="text-xs font-mono text-lightrail mb-2">
                    ✓ Shim ready to deploy on {cloudProviders.find((p) => p.id === selectedCloud)?.name}
                  </p>
                  <Button size="sm" className="w-full bg-lightrail text-lightrail-foreground hover:bg-lightrail/90 font-mono">
                    <Play className="w-4 h-4 mr-2" />
                    Deploy Fabric OS
                  </Button>
                </motion.div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PhotonicFabric;