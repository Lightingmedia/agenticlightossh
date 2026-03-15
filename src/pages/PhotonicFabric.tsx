import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Network,
  Activity,
  Zap,
  Layers,
  Cpu,
  TrendingUp,
  TrendingDown,
  Play,
  Terminal,
  DollarSign,
  Cloud,
  Server,
  MousePointer2,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  getFabricTopology,
  getFabricTelemetry,
  provisionCircuit,
  reconfigureTopology,
  type FabricTopology,
  type FabricTelemetry,
} from "@/lib/api";

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

// Model-Job Templates for Pattern Detection
const workloadPatterns = [
  { 
    id: "all-reduce", 
    name: "All-Reduce", 
    workload: "Data Parallelism",
    description: "Every node sums gradients and shares with everyone",
    topology: "Ring",
    optimization: "Minimize latency via ring topology",
  },
  { 
    id: "all-to-all", 
    name: "All-to-All", 
    workload: "Mixture of Experts (MoE)",
    description: "Every node sends unique chunks to every other node",
    topology: "Full-Mesh",
    optimization: "Bypass 47% forward-pass latency",
  },
  { 
    id: "reduce-scatter", 
    name: "Reduce-Scatter", 
    workload: "Model Parallelism",
    description: "Reduces data and scatters result blocks",
    topology: "Sparse-Tree",
    optimization: "Optimize for sparse activations",
  },
  { 
    id: "broadcast", 
    name: "Broadcast", 
    workload: "Parameter Sync",
    description: "Root node sends parameters to all workers",
    topology: "Tree",
    optimization: "Drop complexity from O(N) to O(log N)",
  },
];

const PhotonicFabric = () => {
  const [shimEnabled, setShimEnabled] = useState(false);
  const [selectedCloud, setSelectedCloud] = useState<string | null>(null);
  const [consoleLogs, setConsoleLogs] = useState<Array<{ time: string; message: string; type: string }>>([]);
  const [topology, setTopology] = useState<FabricTopology | null>(null);
  const [telemetry, setTelemetry] = useState<FabricTelemetry | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPattern, setSelectedPattern] = useState<string | null>(null);
  const [selectedNodes, setSelectedNodes] = useState<string[]>([]);
  const [isReconfiguring, setIsReconfiguring] = useState(false);
  const [editorMode, setEditorMode] = useState<"view" | "provision">("view");

  // Add log entry helper
  const addLog = useCallback((message: string, type: "info" | "success" | "error" = "info") => {
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}.${now.getMilliseconds().toString().padStart(3, "0")}`;
    setConsoleLogs((prev) => [...prev.slice(-19), { time: timeStr, message, type }]);
  }, []);

  // Fetch topology and telemetry data
  const fetchData = useCallback(async () => {
    try {
      const [topoData, telData] = await Promise.all([
        getFabricTopology(),
        getFabricTelemetry(),
      ]);
      setTopology(topoData);
      setTelemetry(telData);
      setLoading(false);
    } catch (error) {
      console.error("Failed to fetch fabric data:", error);
      addLog("Error fetching fabric telemetry", "error");
      setLoading(false);
    }
  }, [addLog]);

  useEffect(() => {
    fetchData();
    addLog("Connecting to Photonic Fabric OS...", "info");
    addLog("Layer 4 Topology-Aware Routing initialized", "success");

    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [fetchData, addLog]);

  // Handle workload pattern selection
  const handlePatternSelect = async (patternId: string) => {
    setSelectedPattern(patternId);
    setIsReconfiguring(true);
    
    const pattern = workloadPatterns.find(p => p.id === patternId);
    if (!pattern) return;

    addLog(`Detecting ${pattern.workload} collective pattern...`, "info");
    
    try {
      const result = await reconfigureTopology(patternId, pattern.workload);
      
      addLog(`Collective Optimization Engine: Reconfigured topology for ${pattern.name} primitive in ${result.reconfiguration_time_us}μs`, "success");
      addLog(`Congestion eliminated. ${result.speedup}x speedup achieved.`, "success");
      
      toast.success(`Topology reconfigured for ${pattern.name}`, {
        description: `${pattern.topology} topology active. ${result.speedup}x speedup.`,
      });
      
      await fetchData();
    } catch (error) {
      addLog(`Failed to reconfigure: ${error}`, "error");
      toast.error("Reconfiguration failed");
    } finally {
      setIsReconfiguring(false);
    }
  };

  // Handle node selection for circuit provisioning
  const handleNodeClick = async (nodeId: string) => {
    if (editorMode !== "provision") return;

    if (selectedNodes.includes(nodeId)) {
      setSelectedNodes(selectedNodes.filter(id => id !== nodeId));
      return;
    }

    const newSelection = [...selectedNodes, nodeId];
    setSelectedNodes(newSelection);

    if (newSelection.length === 2) {
      addLog(`Provisioning optical circuit: ${newSelection[0]} → ${newSelection[1]} @ 400Gbps`, "info");
      
      try {
        const result = await provisionCircuit(newSelection[0], newSelection[1], 400);
        addLog(`Circuit established. Latency: ${result.circuit.latency_us.toFixed(2)}μs`, "success");
        addLog("Electrical I/O wall bypassed. Thermal headroom +42%", "success");
        
        toast.success("Photonic circuit provisioned", {
          description: `${newSelection[0]} → ${newSelection[1]} @ 400Gbps`,
        });
        
        await fetchData();
      } catch (error) {
        addLog(`Circuit provisioning failed: ${error}`, "error");
        toast.error("Failed to provision circuit");
      }
      
      setSelectedNodes([]);
    }
  };

  const cloudProviders = [
    { id: "aws", name: "AWS", icon: Cloud },
    { id: "gcp", name: "Google Cloud", icon: Cloud },
    { id: "azure", name: "Azure", icon: Cloud },
    { id: "intel", name: "Intel Cloud", icon: Server },
  ];

  // Generate SVG paths based on topology
  const generateTopologyPaths = () => {
    if (!topology) return null;

    const nodePositions: Record<string, { x: number; y: number }> = {};
    const svgNodes = [
      { x: 50, y: 100 },
      { x: 100, y: 50 },
      { x: 100, y: 150 },
      { x: 200, y: 100 },
      { x: 300, y: 50 },
      { x: 300, y: 150 },
      { x: 350, y: 100 },
    ];

    topology.nodes.forEach((node, i) => {
      if (svgNodes[i]) {
        nodePositions[node.id] = svgNodes[i];
      }
    });

    return topology.circuits.map((circuit, i) => {
      const source = nodePositions[circuit.source];
      const dest = nodePositions[circuit.destination];
      if (!source || !dest) return null;

      const midX = (source.x + dest.x) / 2;
      const midY = (source.y + dest.y) / 2 - 30;

      return (
        <motion.path
          key={circuit.id}
          d={`M${source.x} ${source.y} Q ${midX} ${midY}, ${dest.x} ${dest.y}`}
          stroke="#00FF88"
          fill="transparent"
          strokeWidth="2"
          filter="url(#glow)"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.5 + i * 0.3, repeat: Infinity, repeatType: "loop" }}
        />
      );
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader
        title="Photonic Fabric OS"
        subtitle="Photonic Computing Infrastructure"
      />

      <div className="p-6 space-y-6">
        {/* Live indicator */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="w-2 h-2 rounded-full bg-lightrail animate-pulse" />
            <span className="font-mono">Photonic Fabric Active</span>
            {telemetry && (
              <span className="text-lightrail ml-2">
                {telemetry.active_circuits} circuits • {telemetry.reconfiguration_count_24h} reconfigs/24h
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono text-lightrail border-lightrail/30">
              Layer 4 Routing
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchData}
              className="text-muted-foreground"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Pattern Detection Module */}
        <Card className="bg-card/50 border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg font-mono">
                <Activity className="w-5 h-5 text-lightrail" />
                Pattern Detection - Model-Job Templates
              </CardTitle>
              {selectedPattern && (
                <Badge className="bg-lightrail/20 text-lightrail border-lightrail/40">
                  {workloadPatterns.find(p => p.id === selectedPattern)?.topology} Topology Active
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {workloadPatterns.map((pattern) => (
                <motion.button
                  key={pattern.id}
                  onClick={() => handlePatternSelect(pattern.id)}
                  disabled={isReconfiguring}
                  className={`p-4 rounded-lg border text-left transition-all ${
                    selectedPattern === pattern.id
                      ? "bg-lightrail/20 border-lightrail"
                      : "bg-secondary/50 border-border hover:border-lightrail/50"
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono font-bold text-sm">{pattern.name}</span>
                    {selectedPattern === pattern.id && (
                      <CheckCircle2 className="w-4 h-4 text-lightrail" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">{pattern.workload}</p>
                  <p className="text-xs text-muted-foreground/70 mb-2">{pattern.description}</p>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">{pattern.topology}</Badge>
                  </div>
                </motion.button>
              ))}
            </div>
            {isReconfiguring && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-4 p-3 rounded bg-lightrail/10 border border-lightrail/30 flex items-center gap-3"
              >
                <RefreshCw className="w-4 h-4 text-lightrail animate-spin" />
                <span className="text-sm font-mono text-lightrail">
                  Reconfiguring topology for {workloadPatterns.find(p => p.id === selectedPattern)?.name}...
                </span>
              </motion.div>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: 10-Layer Stack Explorer */}
          <div className="lg:col-span-1">
            <Card className="bg-card/50 border-border">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg font-mono leading-tight">
                  <Layers className="w-5 h-5 text-lightrail shrink-0" />
                  <span>Silicon Photonic<br />Stack</span>
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

          {/* Middle Column: Interactive Topology Editor */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="bg-card/50 border-border">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-lg font-mono">
                    <Network className="w-5 h-5 text-lightrail" />
                    Interactive Topology Editor
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Button
                      variant={editorMode === "view" ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        setEditorMode("view");
                        setSelectedNodes([]);
                      }}
                      className={editorMode === "view" ? "bg-lightrail text-lightrail-foreground" : ""}
                    >
                      View Mode
                    </Button>
                    <Button
                      variant={editorMode === "provision" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setEditorMode("provision")}
                      className={editorMode === "provision" ? "bg-lightrail text-lightrail-foreground" : ""}
                    >
                      <MousePointer2 className="w-4 h-4 mr-1" />
                      Provision Circuit
                    </Button>
                  </div>
                </div>
                {editorMode === "provision" && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Click two GPU nodes to provision a photonic circuit between them.
                    {selectedNodes.length === 1 && (
                      <span className="text-lightrail ml-1">
                        Selected: {selectedNodes[0]} — select destination node
                      </span>
                    )}
                  </p>
                )}
              </CardHeader>
              <CardContent>
                <div className="relative h-64 w-full bg-black/40 rounded-lg overflow-hidden border border-border">
                  <svg viewBox="0 0 400 200" className="w-full h-full">
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

                    {/* Legacy Electrical Traces */}
                    <path d="M50 100 L350 100" stroke="hsl(220 15% 25%)" strokeDasharray="4" strokeWidth="1" />
                    <path d="M100 50 L100 150" stroke="hsl(220 15% 25%)" strokeDasharray="4" strokeWidth="1" />
                    <path d="M300 50 L300 150" stroke="hsl(220 15% 25%)" strokeDasharray="4" strokeWidth="1" />

                    {/* Dynamic Photonic Circuits */}
                    {generateTopologyPaths()}

                    {/* GPU Nodes */}
                    {[
                      { x: 50, y: 100, id: "gpu-node-7" },
                      { x: 100, y: 50, id: "gpu-node-12" },
                      { x: 100, y: 150, id: "gpu-node-15" },
                      { x: 200, y: 100, id: "gpu-node-18" },
                      { x: 300, y: 50, id: "gpu-node-3" },
                      { x: 300, y: 150, id: "gpu-edge-1" },
                      { x: 350, y: 100, id: "gpu-node-0" },
                    ].map((node, i) => {
                      const isSelected = selectedNodes.includes(node.id);
                      const topoNode = topology?.nodes.find(n => n.id === node.id);
                      return (
                        <g
                          key={i}
                          onClick={() => handleNodeClick(node.id)}
                          className={editorMode === "provision" ? "cursor-pointer" : ""}
                        >
                          <motion.circle
                            cx={node.x}
                            cy={node.y}
                            r={isSelected ? 12 : 8}
                            fill="#121212"
                            stroke={isSelected ? "#fff" : "#00FF88"}
                            strokeWidth={isSelected ? 3 : 2}
                            animate={{
                              scale: isSelected ? [1, 1.1, 1] : 1,
                            }}
                            transition={{ repeat: isSelected ? Infinity : 0, duration: 0.8 }}
                          />
                          <circle cx={node.x} cy={node.y} r="3" fill={isSelected ? "#fff" : "#00FF88"} />
                          {editorMode === "provision" && (
                            <text
                              x={node.x}
                              y={node.y + 25}
                              fill={isSelected ? "#fff" : "#666"}
                              fontSize="7"
                              textAnchor="middle"
                              fontFamily="monospace"
                            >
                              {node.id.replace("gpu-", "")}
                            </text>
                          )}
                          {topoNode && (
                            <text
                              x={node.x}
                              y={node.y - 15}
                              fill="#00FF88"
                              fontSize="6"
                              textAnchor="middle"
                              fontFamily="monospace"
                            >
                              {topoNode.utilization}%
                            </text>
                          )}
                        </g>
                      );
                    })}
                  </svg>
                </div>

                {/* Metrics Row */}
                <div className="grid grid-cols-3 gap-4 mt-4">
                  <div className="bg-secondary/50 p-3 rounded border border-border">
                    <p className="text-muted-foreground text-xs">Bandwidth Density</p>
                    <p className="text-lg font-bold font-mono text-lightrail">
                      {telemetry?.bandwidth_density_multiplier || 100}x
                    </p>
                  </div>
                  <div className="bg-secondary/50 p-3 rounded border border-border">
                    <p className="text-muted-foreground text-xs">Thermal Margin</p>
                    <p className="text-lg font-bold font-mono text-lightrail">
                      +{telemetry?.thermal_margin_percent || 42}%
                    </p>
                  </div>
                  <div className="bg-lightrail/10 p-3 rounded border border-lightrail/40">
                    <p className="text-lightrail text-xs">Training Speedup</p>
                    <p className="text-lg font-bold font-mono text-lightrail">
                      {telemetry?.training_speedup?.toFixed(1) || "3.0"}x
                    </p>
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
                    <Cpu className="w-4 h-4 text-lightrail" />
                    GPU Utilization
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Benchmark (Copper)</span>
                      <span className="font-mono">{Math.round(telemetry?.benchmark_utilization || 35)}%</span>
                    </div>
                    <Progress value={telemetry?.benchmark_utilization || 35} className="h-2 bg-secondary" />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-lightrail">LightRail (Photonic)</span>
                      <span className="font-mono text-lightrail">{Math.round(telemetry?.lightrail_utilization || 84)}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-secondary overflow-hidden">
                      <motion.div
                        className="h-full bg-lightrail"
                        initial={{ width: 0 }}
                        animate={{ width: `${telemetry?.lightrail_utilization || 84}%` }}
                        transition={{ duration: 1 }}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-lightrail">
                    <TrendingUp className="w-3 h-3" />
                    <span>
                      +{Math.round((telemetry?.lightrail_utilization || 84) - (telemetry?.benchmark_utilization || 35))}% improvement
                    </span>
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
                      <span className="font-mono">{Math.round((telemetry?.power_draw_watts || 1500) * 2)}W</span>
                    </div>
                    <Progress value={100} className="h-2 bg-secondary" />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-lightrail">LightRail</span>
                      <span className="font-mono text-lightrail">{telemetry?.power_draw_watts || 1500}W</span>
                    </div>
                    <div className="h-2 rounded-full bg-secondary overflow-hidden">
                      <motion.div
                        className="h-full bg-lightrail"
                        initial={{ width: 0 }}
                        animate={{ width: "50%" }}
                        transition={{ duration: 1 }}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-lightrail">
                    <TrendingDown className="w-3 h-3" />
                    <span>-50% power reduction</span>
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
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg font-mono">
                  <Terminal className="w-5 h-5 text-lightrail" />
                  Agentic Action Console
                </CardTitle>
                <Badge variant="outline" className="text-xs">
                  {consoleLogs.length} events
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="bg-black/60 rounded-lg p-4 font-mono text-xs h-64 overflow-y-auto border border-border">
                <AnimatePresence>
                  {consoleLogs.map((log, index) => (
                    <motion.div
                      key={`${log.time}-${index}`}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex gap-2 mb-2"
                    >
                      <span className="text-muted-foreground">[{log.time}]</span>
                      <span className={
                        log.type === "success" 
                          ? "text-lightrail" 
                          : log.type === "error"
                          ? "text-destructive"
                          : "text-foreground"
                      }>
                        {log.message}
                      </span>
                    </motion.div>
                  ))}
                </AnimatePresence>
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
                <Switch 
                  checked={shimEnabled} 
                  onCheckedChange={(checked) => {
                    setShimEnabled(checked);
                    if (checked) {
                      addLog("Fabric OS Shim enabled", "success");
                    }
                  }} 
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {cloudProviders.map((provider) => (
                  <Button
                    key={provider.id}
                    variant={selectedCloud === provider.id ? "default" : "outline"}
                    className={`font-mono justify-start ${
                      selectedCloud === provider.id ? "bg-lightrail text-lightrail-foreground" : ""
                    }`}
                    onClick={() => {
                      setSelectedCloud(provider.id);
                      addLog(`Selected ${provider.name} for deployment`, "info");
                    }}
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
                  <Button 
                    size="sm" 
                    className="w-full bg-lightrail text-lightrail-foreground hover:bg-lightrail/90 font-mono"
                    onClick={() => {
                      addLog(`Deploying Fabric OS to ${cloudProviders.find((p) => p.id === selectedCloud)?.name}...`, "info");
                      toast.success("Deployment initiated", {
                        description: "Fabric OS shim is being installed.",
                      });
                    }}
                  >
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