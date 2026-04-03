import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Rocket,
  Server,
  Cpu,
  Activity,
  RefreshCw,
  ArrowLeftRight,
  FileText,
  BarChart3,
  Play,
  RotateCcw,
  ChevronDown,
  Copy,
  Check,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Shield,
  Layers,
  Zap,
} from "lucide-react";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";

// --- Types ---
type ServingMode = "wide-ep" | "disaggregated" | "standard";
type DeploymentStatus = "pending" | "provisioning" | "running" | "degraded" | "failed" | "rolling-back" | "terminated";

interface Deployment {
  id: string;
  name: string;
  model: string;
  servingMode: ServingMode;
  status: DeploymentStatus;
  gpuCount: number;
  dpSize: number;
  expertParallel: boolean;
  faultTolerance: boolean;
  replicas: number;
  createdAt: string;
  latencyP50: number;
  latencyP99: number;
  throughput: number;
}

// --- Mock data ---
const availableModels = [
  { id: "llama-3.1-405b", name: "Llama 3.1 405B", params: "405B", recommended: true },
  { id: "llama-3.1-70b", name: "Llama 3.1 70B", params: "70B", recommended: false },
  { id: "mixtral-8x22b", name: "Mixtral 8x22B", params: "176B", recommended: false },
  { id: "deepseek-v2", name: "DeepSeek V2", params: "236B", recommended: false },
  { id: "qwen-72b", name: "Qwen 72B", params: "72B", recommended: false },
];

const mockDeployments: Deployment[] = [
  {
    id: "dep-001",
    name: "prod-llama-405b",
    model: "Llama 3.1 405B",
    servingMode: "wide-ep",
    status: "running",
    gpuCount: 8,
    dpSize: 2,
    expertParallel: true,
    faultTolerance: true,
    replicas: 4,
    createdAt: "2024-12-15T09:30:00Z",
    latencyP50: 42,
    latencyP99: 128,
    throughput: 1240,
  },
  {
    id: "dep-002",
    name: "staging-mixtral",
    model: "Mixtral 8x22B",
    servingMode: "disaggregated",
    status: "degraded",
    gpuCount: 4,
    dpSize: 1,
    expertParallel: true,
    faultTolerance: false,
    replicas: 2,
    createdAt: "2024-12-14T14:20:00Z",
    latencyP50: 67,
    latencyP99: 245,
    throughput: 680,
  },
  {
    id: "dep-003",
    name: "canary-deepseek",
    model: "DeepSeek V2",
    servingMode: "standard",
    status: "provisioning",
    gpuCount: 2,
    dpSize: 1,
    expertParallel: false,
    faultTolerance: false,
    replicas: 1,
    createdAt: "2024-12-16T08:00:00Z",
    latencyP50: 0,
    latencyP99: 0,
    throughput: 0,
  },
];

const mockLogs = [
  { ts: "12:45:03.221", level: "info", msg: "Deployment dep-001 health check passed (4/4 replicas healthy)" },
  { ts: "12:44:58.109", level: "warn", msg: "Deployment dep-002 replica-1 memory pressure detected (89.2% utilization)" },
  { ts: "12:44:51.887", level: "info", msg: "Auto-scaler evaluated dep-001: no scaling action needed (load 62%)" },
  { ts: "12:44:47.332", level: "error", msg: "Deployment dep-002 replica-0 NCCL timeout on rank 3 — retrying collective" },
  { ts: "12:44:42.001", level: "info", msg: "Provisioning dep-003: requesting 2x H100 from cluster pool-west-2" },
  { ts: "12:44:38.554", level: "info", msg: "KV cache warmed for dep-001: 12.4 GB allocated across 8 GPUs" },
  { ts: "12:44:30.112", level: "warn", msg: "dep-002 prefill queue depth exceeding threshold (128 pending)" },
  { ts: "12:44:22.009", level: "info", msg: "Ray Serve controller healthy — 3 active deployments, 7 replicas total" },
];

// --- Helpers ---
const statusConfig: Record<DeploymentStatus, { color: string; icon: React.ElementType; label: string }> = {
  pending: { color: "bg-muted text-muted-foreground", icon: Clock, label: "Pending" },
  provisioning: { color: "bg-blue-500/15 text-blue-400 border-blue-500/30", icon: Loader2, label: "Provisioning" },
  running: { color: "bg-primary/15 text-primary border-primary/30", icon: CheckCircle2, label: "Running" },
  degraded: { color: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30", icon: AlertTriangle, label: "Degraded" },
  failed: { color: "bg-destructive/15 text-destructive border-destructive/30", icon: XCircle, label: "Failed" },
  "rolling-back": { color: "bg-orange-500/15 text-orange-400 border-orange-500/30", icon: RotateCcw, label: "Rolling Back" },
  terminated: { color: "bg-muted text-muted-foreground", icon: XCircle, label: "Terminated" },
};

const servingModes: { id: ServingMode; label: string; description: string }[] = [
  { id: "wide-ep", label: "Wide-EP", description: "Expert parallelism across all GPUs for MoE models" },
  { id: "disaggregated", label: "Disaggregated Prefill/Decode", description: "Separate prefill and decode stages for optimal throughput" },
  { id: "standard", label: "Standard Serving", description: "Traditional tensor-parallel serving with auto-batching" },
];

const logLevelColor: Record<string, string> = {
  info: "text-primary",
  warn: "text-yellow-400",
  error: "text-destructive",
};

// --- Component ---
const LLMServing = () => {
  const [deployments] = useState<Deployment[]>(mockDeployments);
  const [selectedModel, setSelectedModel] = useState("llama-3.1-405b");
  const [servingMode, setServingMode] = useState<ServingMode>("wide-ep");
  const [gpuCount, setGpuCount] = useState([8]);
  const [dpSize, setDpSize] = useState([2]);
  const [expertParallel, setExpertParallel] = useState(true);
  const [faultTolerance, setFaultTolerance] = useState(true);
  const [deploying, setDeploying] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [scaleDialogOpen, setScaleDialogOpen] = useState(false);
  const [selectedDeployment, setSelectedDeployment] = useState<Deployment | null>(null);

  const handleDeploy = () => {
    setDeploying(true);
    setTimeout(() => {
      setDeploying(false);
      setCreateDialogOpen(false);
      toast.success("Deployment submitted — provisioning GPUs");
    }, 1500);
  };

  const handleAction = (action: string, dep: Deployment) => {
    toast.success(`${action} triggered for ${dep.name}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader
        title="LLM Serving"
        subtitle="Deploy and manage Ray Serve inference workloads"
      />

      <div className="p-6 space-y-6">
        {/* Action Bar */}
        <div className="flex flex-wrap items-center gap-3">
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="font-mono gap-2">
                <Rocket className="w-4 h-4" />
                Create Deployment
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-xl">
              <DialogHeader>
                <DialogTitle className="font-mono">New LLM Deployment</DialogTitle>
                <DialogDescription>Configure and deploy a new inference serving endpoint.</DialogDescription>
              </DialogHeader>

              <div className="space-y-5 py-4">
                {/* Model Selection */}
                <div className="space-y-2">
                  <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Model</Label>
                  <Select value={selectedModel} onValueChange={setSelectedModel}>
                    <SelectTrigger className="bg-secondary border-border font-mono">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableModels.map((m) => (
                        <SelectItem key={m.id} value={m.id} className="font-mono">
                          <div className="flex items-center gap-2">
                            <span>{m.name}</span>
                            <Badge variant="outline" className="text-[10px] px-1.5">{m.params}</Badge>
                            {m.recommended && <Badge className="text-[10px] px-1.5 bg-primary/15 text-primary border-primary/30">Recommended</Badge>}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Serving Mode */}
                <div className="space-y-2">
                  <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Serving Mode</Label>
                  <div className="grid grid-cols-1 gap-2">
                    {servingModes.map((mode) => (
                      <button
                        key={mode.id}
                        onClick={() => setServingMode(mode.id)}
                        className={`text-left p-3 rounded-lg border transition-all ${
                          servingMode === mode.id
                            ? "border-primary bg-primary/10 text-foreground"
                            : "border-border bg-secondary/50 text-muted-foreground hover:border-muted-foreground"
                        }`}
                      >
                        <div className="font-mono text-sm font-medium">{mode.label}</div>
                        <div className="text-xs mt-0.5 opacity-80">{mode.description}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* GPU & Parallelism */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                      GPU Count: {gpuCount[0]}
                    </Label>
                    <Slider value={gpuCount} onValueChange={setGpuCount} min={1} max={16} step={1} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                      Data Parallel Size: {dpSize[0]}
                    </Label>
                    <Slider value={dpSize} onValueChange={setDpSize} min={1} max={8} step={1} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-secondary/50">
                    <div>
                      <Label className="text-sm font-mono">Expert Parallel</Label>
                      <p className="text-xs text-muted-foreground">MoE expert sharding</p>
                    </div>
                    <Switch checked={expertParallel} onCheckedChange={setExpertParallel} />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-secondary/50">
                    <div>
                      <Label className="text-sm font-mono">Fault Tolerance</Label>
                      <p className="text-xs text-muted-foreground">Auto-recovery on failure</p>
                    </div>
                    <Switch checked={faultTolerance} onCheckedChange={setFaultTolerance} />
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleDeploy} disabled={deploying} className="font-mono gap-2">
                  {deploying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
                  {deploying ? "Deploying..." : "Deploy"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button variant="outline" className="font-mono gap-2" onClick={() => toast.info("Refreshing deployments...")}>
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        </div>

        {/* Deployment Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { label: "Active Deployments", value: deployments.filter((d) => d.status === "running").length.toString(), icon: Server, accent: "text-primary" },
            { label: "Total Replicas", value: deployments.reduce((a, d) => a + d.replicas, 0).toString(), icon: Layers, accent: "text-blue-400" },
            { label: "GPU Allocated", value: `${deployments.reduce((a, d) => a + d.gpuCount * d.replicas, 0)}x H100`, icon: Cpu, accent: "text-purple-400" },
            { label: "Avg Latency (P50)", value: `${Math.round(deployments.filter((d) => d.latencyP50 > 0).reduce((a, d) => a + d.latencyP50, 0) / Math.max(deployments.filter((d) => d.latencyP50 > 0).length, 1))}ms`, icon: Zap, accent: "text-yellow-400" },
          ].map((stat, i) => (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="bg-card/50 border-border">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className={`p-2 rounded-lg bg-secondary ${stat.accent}`}>
                    <stat.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-mono uppercase tracking-wider">{stat.label}</p>
                    <p className="text-xl font-bold font-mono text-foreground">{stat.value}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Deployments Table */}
        <Card className="bg-card/50 border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-mono flex items-center gap-2">
              <Server className="w-4 h-4 text-primary" />
              Deployments
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-xs font-mono text-muted-foreground uppercase tracking-wider">
                    <th className="text-left p-4">Name</th>
                    <th className="text-left p-4">Model</th>
                    <th className="text-left p-4">Mode</th>
                    <th className="text-left p-4">Status</th>
                    <th className="text-left p-4">GPUs</th>
                    <th className="text-left p-4">Replicas</th>
                    <th className="text-left p-4">P50 / P99</th>
                    <th className="text-left p-4">Throughput</th>
                    <th className="text-right p-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {deployments.map((dep) => {
                    const sc = statusConfig[dep.status];
                    const StatusIcon = sc.icon;
                    return (
                      <tr key={dep.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                        <td className="p-4 font-mono font-medium text-foreground">{dep.name}</td>
                        <td className="p-4 text-muted-foreground">{dep.model}</td>
                        <td className="p-4">
                          <Badge variant="outline" className="font-mono text-[10px]">
                            {servingModes.find((m) => m.id === dep.servingMode)?.label}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <Badge className={`gap-1 font-mono text-[10px] border ${sc.color}`}>
                            <StatusIcon className={`w-3 h-3 ${dep.status === "provisioning" ? "animate-spin" : ""}`} />
                            {sc.label}
                          </Badge>
                        </td>
                        <td className="p-4 font-mono text-muted-foreground">{dep.gpuCount}</td>
                        <td className="p-4 font-mono text-muted-foreground">{dep.replicas}</td>
                        <td className="p-4 font-mono text-muted-foreground">
                          {dep.latencyP50 > 0 ? `${dep.latencyP50}ms / ${dep.latencyP99}ms` : "—"}
                        </td>
                        <td className="p-4 font-mono text-muted-foreground">
                          {dep.throughput > 0 ? `${dep.throughput} tok/s` : "—"}
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 font-mono text-xs"
                              onClick={() => { setSelectedDeployment(dep); setScaleDialogOpen(true); }}
                            >
                              <ArrowLeftRight className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 font-mono text-xs"
                              onClick={() => handleAction("Restart", dep)}
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 font-mono text-xs"
                              onClick={() => handleAction("Rollback", dep)}
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Metrics + Logs */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Metrics Panel */}
          <Card className="bg-card/50 border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-mono flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />
                Serving Metrics
              </CardTitle>
              <CardDescription className="font-mono text-xs">Real-time inference performance</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { label: "Throughput", value: "1,240 tok/s", bar: 78, color: "bg-primary" },
                { label: "Queue Depth", value: "12 requests", bar: 15, color: "bg-blue-500" },
                { label: "KV Cache Hit Rate", value: "94.2%", bar: 94, color: "bg-primary" },
                { label: "GPU Memory", value: "72.8 GB / 80 GB", bar: 91, color: "bg-yellow-500" },
                { label: "Batch Utilization", value: "86%", bar: 86, color: "bg-purple-500" },
              ].map((metric) => (
                <div key={metric.label} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono text-muted-foreground">{metric.label}</span>
                    <span className="font-mono font-medium text-foreground">{metric.value}</span>
                  </div>
                  <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${metric.bar}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className={`h-full rounded-full ${metric.color}`}
                    />
                  </div>
                </div>
              ))}
              <Button variant="outline" className="w-full mt-2 font-mono gap-2 text-xs" onClick={() => toast.info("Opening metrics dashboard...")}>
                <BarChart3 className="w-3.5 h-3.5" />
                Open Metrics Dashboard
              </Button>
            </CardContent>
          </Card>

          {/* Logs Panel */}
          <Card className="bg-card/50 border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-mono flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                Deployment Logs
              </CardTitle>
              <CardDescription className="font-mono text-xs">Live streaming from Ray Serve controller</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-background rounded-lg border border-border p-3 h-[280px] overflow-y-auto font-mono text-xs space-y-1">
                {mockLogs.map((log, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex gap-2 leading-relaxed"
                  >
                    <span className="text-muted-foreground shrink-0">{log.ts}</span>
                    <span className={`shrink-0 uppercase font-bold ${logLevelColor[log.level] || "text-muted-foreground"}`}>
                      [{log.level}]
                    </span>
                    <span className="text-foreground/80">{log.msg}</span>
                  </motion.div>
                ))}
              </div>
              <Button variant="outline" className="w-full mt-3 font-mono gap-2 text-xs" onClick={() => toast.info("Opening full log viewer...")}>
                <FileText className="w-3.5 h-3.5" />
                View Full Logs
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Scale Dialog */}
        <Dialog open={scaleDialogOpen} onOpenChange={setScaleDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="font-mono">Scale Deployment</DialogTitle>
              <DialogDescription>
                Adjust replicas for <span className="font-mono text-foreground">{selectedDeployment?.name}</span>
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                  Target Replicas: {dpSize[0]}
                </Label>
                <Slider value={dpSize} onValueChange={setDpSize} min={1} max={16} step={1} />
              </div>
              <div className="p-3 rounded-lg border border-border bg-secondary/50 text-xs font-mono text-muted-foreground">
                <p>Current: {selectedDeployment?.replicas} replicas × {selectedDeployment?.gpuCount} GPUs</p>
                <p>Target: {dpSize[0]} replicas × {selectedDeployment?.gpuCount} GPUs = {dpSize[0] * (selectedDeployment?.gpuCount || 0)} total GPUs</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setScaleDialogOpen(false)}>Cancel</Button>
              <Button className="font-mono gap-2" onClick={() => { setScaleDialogOpen(false); toast.success(`Scaling ${selectedDeployment?.name} to ${dpSize[0]} replicas`); }}>
                <ArrowLeftRight className="w-4 h-4" />
                Apply Scale
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default LLMServing;
