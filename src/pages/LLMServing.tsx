import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
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
  GitBranch,
  Eye,
  DollarSign,
  Timer,
  Radio,
  Search,
  ArrowRight,
  Gauge,
  ShieldCheck,
  Users,
  FlaskConical,
  Building2,
} from "lucide-react";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

type ServingMode = "wide-ep" | "disaggregated" | "standard";
type DeploymentStatus =
  | "pending"
  | "provisioning"
  | "running"
  | "degraded"
  | "failed"
  | "rolling-back"
  | "terminated";

interface ObservabilityConfig {
  prometheus_enabled: boolean;
  tracing_enabled: boolean;
  log_level: "debug" | "info" | "warn" | "error";
}

interface DeploymentConfig {
  model: string;
  serving_mode: ServingMode;
  gpu_count: number;
  data_parallel_size: number;
  expert_parallelism: boolean;
  fault_tolerance: boolean;
  observability: ObservabilityConfig;
}

interface Deployment {
  id: string;
  name: string;
  status: DeploymentStatus;
  config: DeploymentConfig;
  replicas: number;
  created_at: string;
  updated_at: string;
  revision: number;
  latency_p50_ms: number | null;
  latency_p99_ms: number | null;
  throughput_tok_s: number | null;
}

interface LogEntry {
  ts: string;
  level: "debug" | "info" | "warn" | "error";
  deployment_id: string | null;
  msg: string;
}

interface MetricSeries {
  name: string;
  value: number;
  unit: string;
  bar_pct: number | null;
}

interface MetricsResponse {
  deployment_id: string | null;
  snapshot_at: string;
  series: MetricSeries[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const availableModels = [
  { id: "llama-3.1-405b", name: "Llama 3.1 405B", params: "405B", recommended: true },
  { id: "llama-3.1-70b", name: "Llama 3.1 70B", params: "70B", recommended: false },
  { id: "mixtral-8x22b", name: "Mixtral 8x22B", params: "176B", recommended: false },
  { id: "deepseek-v2", name: "DeepSeek V2", params: "236B", recommended: false },
  { id: "qwen-72b", name: "Qwen 72B", params: "72B", recommended: false },
];

const statusConfig: Record<
  DeploymentStatus,
  { color: string; icon: React.ElementType; label: string }
> = {
  pending: { color: "bg-muted text-muted-foreground", icon: Clock, label: "Pending" },
  provisioning: {
    color: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    icon: Loader2,
    label: "Provisioning",
  },
  running: {
    color: "bg-primary/15 text-primary border-primary/30",
    icon: CheckCircle2,
    label: "Running",
  },
  degraded: {
    color: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
    icon: AlertTriangle,
    label: "Degraded",
  },
  failed: {
    color: "bg-destructive/15 text-destructive border-destructive/30",
    icon: XCircle,
    label: "Failed",
  },
  "rolling-back": {
    color: "bg-orange-500/15 text-orange-400 border-orange-500/30",
    icon: RotateCcw,
    label: "Rolling Back",
  },
  terminated: { color: "bg-muted text-muted-foreground", icon: XCircle, label: "Terminated" },
};

const servingModes: { id: ServingMode; label: string; description: string }[] = [
  {
    id: "wide-ep",
    label: "Wide-EP",
    description: "Expert parallelism across all GPUs for MoE models",
  },
  {
    id: "disaggregated",
    label: "Disaggregated Prefill/Decode",
    description: "Separate prefill and decode stages for optimal throughput",
  },
  {
    id: "standard",
    label: "Standard Serving",
    description: "Traditional tensor-parallel serving with auto-batching",
  },
];

const logLevelColor: Record<string, string> = {
  debug: "text-muted-foreground",
  info: "text-primary",
  warn: "text-yellow-400",
  error: "text-destructive",
};

// ─── Component ────────────────────────────────────────────────────────────────

const LLMServing = () => {
  // Deployment list
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [loadingDeployments, setLoadingDeployments] = useState(true);

  // Metrics
  const [metrics, setMetrics] = useState<MetricSeries[]>([]);
  const [loadingMetrics, setLoadingMetrics] = useState(true);

  // Logs
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);

  // Create deployment form
  const [deploymentName, setDeploymentName] = useState("");
  const [selectedModel, setSelectedModel] = useState("llama-3.1-405b");
  const [servingMode, setServingMode] = useState<ServingMode>("wide-ep");
  const [gpuCount, setGpuCount] = useState([8]);
  const [dpSize, setDpSize] = useState([2]);
  const [expertParallel, setExpertParallel] = useState(true);
  const [faultTolerance, setFaultTolerance] = useState(true);
  const [deploying, setDeploying] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  // Scale dialog
  const [scaleDialogOpen, setScaleDialogOpen] = useState(false);
  const [selectedDeployment, setSelectedDeployment] = useState<Deployment | null>(null);
  const [scaleReplicas, setScaleReplicas] = useState([2]);
  const [scaling, setScaling] = useState(false);

  // ─── Data fetchers ────────────────────────────────────────────────────────

  const fetchDeployments = useCallback(async () => {
    setLoadingDeployments(true);
    try {
      const { data, error } = await supabase
        .from("llm_deployments")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      // Map DB rows to Deployment shape
      setDeployments(
        (data ?? []).map((d) => ({
          id: d.id,
          name: d.name,
          status: d.status as DeploymentStatus,
          config: {
            model: d.model,
            serving_mode: d.serving_mode as ServingMode,
            gpu_count: d.gpu_count,
            data_parallel_size: d.data_parallel_size,
            expert_parallelism: d.expert_parallelism,
            fault_tolerance: d.fault_tolerance,
            observability: {
              prometheus_enabled: d.prometheus_enabled,
              tracing_enabled: d.tracing_enabled,
              log_level: d.log_level as "debug" | "info" | "warn" | "error",
            },
          },
          replicas: d.replicas,
          created_at: d.created_at,
          updated_at: d.updated_at,
          revision: d.revision,
          latency_p50_ms: d.latency_p50_ms ? Number(d.latency_p50_ms) : null,
          latency_p99_ms: d.latency_p99_ms ? Number(d.latency_p99_ms) : null,
          throughput_tok_s: d.throughput_tok_s ? Number(d.throughput_tok_s) : null,
        })),
      );
    } catch (err) {
      toast.error(`Failed to load deployments: ${(err as Error).message}`);
    } finally {
      setLoadingDeployments(false);
    }
  }, []);

  const fetchMetrics = useCallback(async () => {
    setLoadingMetrics(true);
    try {
      // Compute metrics from deployments
      const { data } = await supabase.from("llm_deployments").select("*").eq("status", "running");
      const running = data ?? [];
      const totalThroughput = running.reduce((a, d) => a + Number(d.throughput_tok_s ?? 0), 0);
      const avgP50 = running.length > 0
        ? Math.round(running.reduce((a, d) => a + Number(d.latency_p50_ms ?? 0), 0) / running.length)
        : 0;
      const avgP99 = running.length > 0
        ? Math.round(running.reduce((a, d) => a + Number(d.latency_p99_ms ?? 0), 0) / running.length)
        : 0;
      const totalGpus = running.reduce((a, d) => a + d.gpu_count * d.replicas, 0);
      const totalReplicas = running.reduce((a, d) => a + d.replicas, 0);

      setMetrics([
        { name: "Throughput", value: totalThroughput, unit: "tok/s", bar_pct: Math.min(totalThroughput / 100, 100) },
        { name: "Latency P50", value: avgP50, unit: "ms", bar_pct: Math.min(avgP50 / 2, 100) },
        { name: "Latency P99", value: avgP99, unit: "ms", bar_pct: Math.min(avgP99 / 3, 100) },
        { name: "Active GPUs", value: totalGpus, unit: "x H100", bar_pct: Math.min((totalGpus / 64) * 100, 100) },
        { name: "Active Replicas", value: totalReplicas, unit: "", bar_pct: Math.min((totalReplicas / 16) * 100, 100) },
      ]);
    } catch (err) {
      toast.error(`Failed to load metrics: ${(err as Error).message}`);
    } finally {
      setLoadingMetrics(false);
    }
  }, []);

  const fetchLogs = useCallback(async () => {
    setLoadingLogs(true);
    try {
      const { data, error } = await supabase
        .from("llm_deployment_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      setLogs(
        (data ?? []).map((l) => ({
          ts: new Date(l.created_at).toLocaleTimeString(),
          level: l.level as "debug" | "info" | "warn" | "error",
          deployment_id: l.deployment_id,
          msg: l.message,
        })),
      );
    } catch (err) {
      toast.error(`Failed to load logs: ${(err as Error).message}`);
    } finally {
      setLoadingLogs(false);
    }
  }, []);

  useEffect(() => {
    fetchDeployments();
    fetchMetrics();
    fetchLogs();

    // Realtime subscriptions
    const depChannel = supabase
      .channel("llm-deployments-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "llm_deployments" }, () => {
        fetchDeployments();
        fetchMetrics();
      })
      .subscribe();

    const logChannel = supabase
      .channel("llm-logs-rt")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "llm_deployment_logs" }, () => {
        fetchLogs();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(depChannel);
      supabase.removeChannel(logChannel);
    };
  }, [fetchDeployments, fetchMetrics, fetchLogs]);

  // ─── Actions ──────────────────────────────────────────────────────────────

  const handleDeploy = async () => {
    if (!deploymentName.trim()) {
      toast.error("Deployment name is required");
      return;
    }
    setDeploying(true);
    try {
      const { error } = await supabase.from("llm_deployments").insert({
        name: deploymentName.trim(),
        model: selectedModel,
        serving_mode: servingMode,
        gpu_count: gpuCount[0],
        data_parallel_size: dpSize[0],
        expert_parallelism: expertParallel,
        fault_tolerance: faultTolerance,
        status: "provisioning",
      });
      if (error) throw error;
      toast.success("Deployment submitted — provisioning GPUs");
      setCreateDialogOpen(false);
      setDeploymentName("");
    } catch (err) {
      toast.error(`Deploy failed: ${(err as Error).message}`);
    } finally {
      setDeploying(false);
    }
  };

  const handleScale = async () => {
    if (!selectedDeployment) return;
    setScaling(true);
    try {
      const { error } = await supabase
        .from("llm_deployments")
        .update({ replicas: scaleReplicas[0] })
        .eq("id", selectedDeployment.id);
      if (error) throw error;
      toast.success(`Scaled ${selectedDeployment.name} to ${scaleReplicas[0]} replicas`);
      setScaleDialogOpen(false);
    } catch (err) {
      toast.error(`Scale failed: ${(err as Error).message}`);
    } finally {
      setScaling(false);
    }
  };

  const handleRestart = async (dep: Deployment) => {
    try {
      const { error } = await supabase
        .from("llm_deployments")
        .update({ status: "provisioning", revision: dep.revision + 1 })
        .eq("id", dep.id);
      if (error) throw error;
      await supabase.from("llm_deployment_logs").insert({
        deployment_id: dep.id,
        level: "info",
        message: `Restart triggered — revision ${dep.revision + 1}`,
      });
      toast.success(`Restart triggered for ${dep.name}`);
    } catch (err) {
      toast.error(`Restart failed: ${(err as Error).message}`);
    }
  };

  const handleRollback = async (dep: Deployment) => {
    try {
      const { error } = await supabase
        .from("llm_deployments")
        .update({ status: "rolling-back" })
        .eq("id", dep.id);
      if (error) throw error;
      await supabase.from("llm_deployment_logs").insert({
        deployment_id: dep.id,
        level: "warn",
        message: `Rollback initiated from revision ${dep.revision}`,
      });
      toast.success(`Rollback initiated for ${dep.name}`);
    } catch (err) {
      toast.error(`Rollback failed: ${(err as Error).message}`);
    }
  };

  const handleRefresh = () => {
    fetchDeployments();
    fetchMetrics();
    fetchLogs();
    toast.info("Refreshing…");
  };

  // ─── Derived stats ────────────────────────────────────────────────────────

  const running = deployments.filter((d) => d.status === "running");
  const totalReplicas = deployments.reduce((a, d) => a + d.replicas, 0);
  const totalGpus = deployments.reduce((a, d) => a + d.config.gpu_count * d.replicas, 0);
  const avgP50 =
    running.length > 0
      ? Math.round(running.reduce((a, d) => a + (d.latency_p50_ms ?? 0), 0) / running.length)
      : 0;

  const overviewStats = [
    { label: "Active Deployments", value: running.length.toString(), icon: Server, accent: "text-primary" },
    { label: "Total Replicas", value: totalReplicas.toString(), icon: Layers, accent: "text-blue-400" },
    { label: "GPU Allocated", value: `${totalGpus}x H100`, icon: Cpu, accent: "text-purple-400" },
    { label: "Avg Latency (P50)", value: running.length > 0 ? `${avgP50}ms` : "—", icon: Zap, accent: "text-yellow-400" },
  ];

  // ─── Render ───────────────────────────────────────────────────────────────

  // ─── Landing content ────────────────────────────────────────────────────

  const landingFeatures = [
    {
      icon: GitBranch,
      title: "Intelligent Model Routing",
      description: "Route requests across models based on cost, latency, and capability. A/B test models in production with traffic splitting.",
    },
    {
      icon: Shield,
      title: "Automatic Fallback",
      description: "Define fallback chains so failed requests retry on backup models instantly. Zero downtime, zero dropped requests.",
    },
    {
      icon: Radio,
      title: "Streaming & Batching",
      description: "First-class SSE streaming with auto-batching. Maximize throughput without sacrificing time-to-first-token.",
    },
    {
      icon: Search,
      title: "End-to-End Tracing",
      description: "Trace every request from ingress to token output. Debug latency spikes and model errors with full observability.",
    },
    {
      icon: DollarSign,
      title: "Cost Attribution",
      description: "Track spend per model, team, and endpoint. Set budget alerts and enforce rate limits before costs spiral.",
    },
    {
      icon: Timer,
      title: "Latency Optimization",
      description: "P50/P99 latency dashboards with automatic replica scaling. Keep SLAs tight across traffic spikes.",
    },
  ];

  const howItWorks = [
    {
      step: "01",
      title: "Connect your models",
      description: "Point LightOS at your self-hosted models or cloud endpoints. Configure routing rules and fallback chains in YAML or the UI.",
    },
    {
      step: "02",
      title: "Deploy & observe",
      description: "Push a deployment with one click. Monitor throughput, latency, and cost in real time from the operator console below.",
    },
    {
      step: "03",
      title: "Scale & optimize",
      description: "Auto-scale replicas based on traffic. Run A/B tests, swap models, and roll back — all without downtime.",
    },
  ];

  const useCases = [
    {
      icon: Building2,
      title: "Enterprise AI platforms",
      description: "Centralized LLM gateway for multiple teams with cost controls, access policies, and usage analytics.",
    },
    {
      icon: FlaskConical,
      title: "ML & research teams",
      description: "Rapid model iteration with side-by-side evaluation, canary rollouts, and automated regression testing.",
    },
    {
      icon: Users,
      title: "Product engineering",
      description: "Ship AI features with confidence. Streaming responses, circuit breakers, and SLA-grade reliability built in.",
    },
    {
      icon: ShieldCheck,
      title: "Compliance-sensitive orgs",
      description: "On-prem deployment with full request logging, data residency controls, and zero third-party data sharing.",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* ─── Hero Section ─────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 grid-pattern opacity-10" />
        <div className="container mx-auto px-4 py-20 md:py-28 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl mx-auto text-center"
          >
            <div className="inline-flex items-center gap-2 mb-6 px-3 py-1 rounded-full border border-border bg-card/50">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              <span className="font-mono text-xs text-muted-foreground uppercase tracking-wider">
                Inference · Ray Serve
              </span>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold font-mono mb-6 text-foreground leading-tight">
              LLM Serving for{" "}
              <span className="text-gradient">production AI teams</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
              Route, observe, evaluate, and optimize LLM traffic from one unified control plane.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button size="lg" className="font-mono gap-2" onClick={() => {
                document.getElementById("llm-console")?.scrollIntoView({ behavior: "smooth" });
              }}>
                <Rocket className="w-4 h-4" />
                Get Started
              </Button>
              <Button size="lg" variant="outline" className="font-mono gap-2" onClick={() => {
                document.getElementById("llm-features")?.scrollIntoView({ behavior: "smooth" });
              }}>
                Learn More
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── Features Section ─────────────────────────────────────────────── */}
      <section id="llm-features" className="py-20 border-b border-border">
        <div className="container mx-auto px-4">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 mb-4 px-3 py-1 rounded-full border border-border bg-card/50">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              <span className="font-mono text-xs text-muted-foreground uppercase tracking-wider">
                Capabilities
              </span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold font-mono mb-3 text-foreground">
              Production-grade serving infrastructure
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Everything you need to run LLMs reliably at scale — routing, fallback, tracing, and cost control in one platform.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {landingFeatures.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="group p-6 rounded-xl border border-border bg-card/30 hover:border-primary/40 hover:bg-card/60 transition-all duration-300"
              >
                <div className="mb-4 flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
                    <f.icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-mono font-bold text-foreground">{f.title}</h3>
                </div>
                <p className="text-muted-foreground text-sm leading-relaxed">{f.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── How It Works ─────────────────────────────────────────────────── */}
      <section className="py-20 border-b border-border">
        <div className="container mx-auto px-4">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 mb-4 px-3 py-1 rounded-full border border-border bg-card/50">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              <span className="font-mono text-xs text-muted-foreground uppercase tracking-wider">
                How It Works
              </span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold font-mono mb-3 text-foreground">
              From zero to serving in three steps
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {howItWorks.map((step, i) => (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="text-center"
              >
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full border-2 border-primary/40 bg-primary/10 text-primary font-mono font-bold text-lg mb-5">
                  {step.step}
                </div>
                <h3 className="font-mono font-bold text-lg mb-2 text-foreground">{step.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{step.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Use Cases ────────────────────────────────────────────────────── */}
      <section className="py-20 border-b border-border">
        <div className="container mx-auto px-4">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 mb-4 px-3 py-1 rounded-full border border-border bg-card/50">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              <span className="font-mono text-xs text-muted-foreground uppercase tracking-wider">
                Use Cases
              </span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold font-mono mb-3 text-foreground">
              Built for production teams
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Whether you're shipping a chatbot or running an enterprise AI platform, LightOS LLM Serving fits your workflow.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-5 max-w-4xl mx-auto">
            {useCases.map((uc, i) => (
              <motion.div
                key={uc.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="flex gap-4 p-6 rounded-xl border border-border bg-card/30 hover:border-primary/40 transition-all duration-300"
              >
                <div className="p-2.5 rounded-lg bg-primary/10 text-primary h-fit">
                  <uc.icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-mono font-bold text-foreground mb-1">{uc.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{uc.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Final CTA ────────────────────────────────────────────────────── */}
      <section className="py-20 border-b border-border">
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-2xl mx-auto"
          >
            <h2 className="text-3xl md:text-4xl font-bold font-mono mb-4 text-foreground">
              Ready to serve LLMs at scale?
            </h2>
            <p className="text-muted-foreground mb-8">
              Deploy your first model in under 5 minutes. No infrastructure to manage — just connect, configure, and ship.
            </p>
            <Button size="lg" className="font-mono gap-2" onClick={() => {
              document.getElementById("llm-console")?.scrollIntoView({ behavior: "smooth" });
            }}>
              <Rocket className="w-4 h-4" />
              Get Started Now
            </Button>
          </motion.div>
        </div>
      </section>

      {/* ─── Operator Console ─────────────────────────────────────────────── */}
      <div id="llm-console">
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
                <DialogDescription>
                  Configure and deploy a new inference serving endpoint.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-5 py-4">
                {/* Deployment Name */}
                <div className="space-y-2">
                  <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                    Deployment Name
                  </Label>
                  <input
                    className="w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="e.g. prod-llama-70b"
                    value={deploymentName}
                    onChange={(e) => setDeploymentName(e.target.value)}
                  />
                </div>

                {/* Model Selection */}
                <div className="space-y-2">
                  <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                    Model
                  </Label>
                  <Select value={selectedModel} onValueChange={setSelectedModel}>
                    <SelectTrigger className="bg-secondary border-border font-mono">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableModels.map((m) => (
                        <SelectItem key={m.id} value={m.id} className="font-mono">
                          <div className="flex items-center gap-2">
                            <span>{m.name}</span>
                            <Badge variant="outline" className="text-[10px] px-1.5">
                              {m.params}
                            </Badge>
                            {m.recommended && (
                              <Badge className="text-[10px] px-1.5 bg-primary/15 text-primary border-primary/30">
                                Recommended
                              </Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Serving Mode */}
                <div className="space-y-2">
                  <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                    Serving Mode
                  </Label>
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
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleDeploy}
                  disabled={deploying || !deploymentName.trim()}
                  className="font-mono gap-2"
                >
                  {deploying ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Rocket className="w-4 h-4" />
                  )}
                  {deploying ? "Deploying…" : "Deploy"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button variant="outline" className="font-mono gap-2" onClick={handleRefresh}>
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {overviewStats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="bg-card/50 border-border">
                <CardContent className="p-4 flex items-center gap-4">
                  {loadingDeployments ? (
                    <Skeleton className="h-12 w-full" />
                  ) : (
                    <>
                      <div className={`p-2 rounded-lg bg-secondary ${stat.accent}`}>
                        <stat.icon className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground font-mono uppercase tracking-wider">
                          {stat.label}
                        </p>
                        <p className="text-xl font-bold font-mono text-foreground">{stat.value}</p>
                      </div>
                    </>
                  )}
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
                  {loadingDeployments ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <tr key={i} className="border-b border-border/50">
                        <td colSpan={9} className="p-4">
                          <Skeleton className="h-5 w-full" />
                        </td>
                      </tr>
                    ))
                  ) : deployments.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-muted-foreground font-mono text-sm">
                        No deployments yet — create one to get started.
                      </td>
                    </tr>
                  ) : (
                    deployments.map((dep) => {
                      const sc = statusConfig[dep.status];
                      const StatusIcon = sc.icon;
                      return (
                        <tr
                          key={dep.id}
                          className="border-b border-border/50 hover:bg-secondary/30 transition-colors"
                        >
                          <td className="p-4 font-mono font-medium text-foreground">{dep.name}</td>
                          <td className="p-4 text-muted-foreground">{dep.config.model}</td>
                          <td className="p-4">
                            <Badge variant="outline" className="font-mono text-[10px]">
                              {servingModes.find((m) => m.id === dep.config.serving_mode)?.label}
                            </Badge>
                          </td>
                          <td className="p-4">
                            <Badge className={`gap-1 font-mono text-[10px] border ${sc.color}`}>
                              <StatusIcon
                                className={`w-3 h-3 ${dep.status === "provisioning" ? "animate-spin" : ""}`}
                              />
                              {sc.label}
                            </Badge>
                          </td>
                          <td className="p-4 font-mono text-muted-foreground">{dep.config.gpu_count}</td>
                          <td className="p-4 font-mono text-muted-foreground">{dep.replicas}</td>
                          <td className="p-4 font-mono text-muted-foreground">
                            {dep.latency_p50_ms != null
                              ? `${dep.latency_p50_ms}ms / ${dep.latency_p99_ms}ms`
                              : "—"}
                          </td>
                          <td className="p-4 font-mono text-muted-foreground">
                            {dep.throughput_tok_s != null ? `${dep.throughput_tok_s} tok/s` : "—"}
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 font-mono text-xs"
                                title="Scale"
                                onClick={() => {
                                  setSelectedDeployment(dep);
                                  setScaleReplicas([dep.replicas]);
                                  setScaleDialogOpen(true);
                                }}
                              >
                                <ArrowLeftRight className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 font-mono text-xs"
                                title="Restart"
                                onClick={() => handleRestart(dep)}
                              >
                                <RefreshCw className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 font-mono text-xs"
                                title="Rollback"
                                onClick={() => handleRollback(dep)}
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
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
              <CardDescription className="font-mono text-xs">
                Real-time inference performance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loadingMetrics ? (
                Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-6 w-full" />)
              ) : (
                metrics.map((metric, i) => {
                  const barColors = [
                    "bg-primary",
                    "bg-blue-500",
                    "bg-primary",
                    "bg-yellow-500",
                    "bg-purple-500",
                    "bg-blue-400",
                  ];
                  return (
                    <div key={metric.name} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-mono text-muted-foreground">{metric.name}</span>
                        <span className="font-mono font-medium text-foreground">
                          {metric.value.toLocaleString()} {metric.unit}
                        </span>
                      </div>
                      {metric.bar_pct != null && (
                        <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${metric.bar_pct}%` }}
                            transition={{ duration: 1, ease: "easeOut" }}
                            className={`h-full rounded-full ${barColors[i % barColors.length]}`}
                          />
                        </div>
                      )}
                    </div>
                  );
                })
              )}
              <Button
                variant="outline"
                className="w-full mt-2 font-mono gap-2 text-xs"
                onClick={() => {
                  fetchMetrics();
                  toast.info("Metrics refreshed");
                }}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                Refresh Metrics
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
              <CardDescription className="font-mono text-xs">
                Live streaming from Ray Serve controller
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-background rounded-lg border border-border p-3 h-[280px] overflow-y-auto font-mono text-xs space-y-1">
                {loadingLogs ? (
                  Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-4 w-full" />)
                ) : logs.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No logs yet.</p>
                ) : (
                  logs.map((log, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: Math.min(i * 0.03, 0.4) }}
                      className="flex gap-2 leading-relaxed"
                    >
                      <span className="text-muted-foreground shrink-0">{log.ts}</span>
                      <span
                        className={`shrink-0 uppercase font-bold ${
                          logLevelColor[log.level] || "text-muted-foreground"
                        }`}
                      >
                        [{log.level}]
                      </span>
                      <span className="text-foreground/80">{log.msg}</span>
                    </motion.div>
                  ))
                )}
              </div>
              <Button
                variant="outline"
                className="w-full mt-3 font-mono gap-2 text-xs"
                onClick={() => {
                  fetchLogs();
                  toast.info("Logs refreshed");
                }}
              >
                <FileText className="w-3.5 h-3.5" />
                Refresh Logs
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
                Adjust replicas for{" "}
                <span className="font-mono text-foreground">{selectedDeployment?.name}</span>
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                  Target Replicas: {scaleReplicas[0]}
                </Label>
                <Slider
                  value={scaleReplicas}
                  onValueChange={setScaleReplicas}
                  min={0}
                  max={16}
                  step={1}
                />
              </div>
              <div className="p-3 rounded-lg border border-border bg-secondary/50 text-xs font-mono text-muted-foreground">
                <p>
                  Current: {selectedDeployment?.replicas} replicas ×{" "}
                  {selectedDeployment?.config.gpu_count} GPUs
                </p>
                <p>
                  Target: {scaleReplicas[0]} replicas ×{" "}
                  {selectedDeployment?.config.gpu_count} GPUs ={" "}
                  {scaleReplicas[0] * (selectedDeployment?.config.gpu_count || 0)} total GPUs
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setScaleDialogOpen(false)}>
                Cancel
              </Button>
              <Button className="font-mono gap-2" onClick={handleScale} disabled={scaling}>
                {scaling ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ArrowLeftRight className="w-4 h-4" />
                )}
                {scaling ? "Scaling…" : "Apply Scale"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>
      </div>
    </div>
  );
};

export default LLMServing;
