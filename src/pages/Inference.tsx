import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Zap, Send, Clock, RefreshCw } from "lucide-react";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import InferenceQueue from "@/components/dashboard/InferenceQueue";
import StatCard from "@/components/dashboard/StatCard";
import TelemetryChart from "@/components/dashboard/TelemetryChart";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useRealtimeInferenceTasks } from "@/hooks/use-realtime-telemetry";
import { submitInferenceTask } from "@/lib/api";
import { toast } from "sonner";

const models = [
  { id: "llama-3.1-70b", name: "Llama 3.1 70B" },
  { id: "llama-3.1-8b", name: "Llama 3.1 8B" },
  { id: "mistral-7b", name: "Mistral 7B" },
  { id: "mixtral-8x7b", name: "Mixtral 8x7B" },
  { id: "codellama-34b", name: "CodeLlama 34B" },
];

const stats = [
  { title: "Requests Today", value: "12,456", change: "+2,341", changeType: "positive" as const, icon: Zap },
  { title: "Avg Response Time", value: "1.2s", change: "↓ 0.3s", changeType: "positive" as const, icon: Clock, iconColor: "text-blue-400" },
];

const latencyData = Array.from({ length: 24 }, (_, i) => ({
  time: `${i}:00`,
  value: 800 + Math.random() * 600,
}));

const Inference = () => {
  const [prompt, setPrompt] = useState("");
  const [selectedModel, setSelectedModel] = useState("llama-3.1-70b");
  const [submitting, setSubmitting] = useState(false);
  const { tasks, loading } = useRealtimeInferenceTasks();

  // Transform tasks for the queue component
  const queueTasks = tasks.map((task) => ({
    id: task.task_id,
    model: task.model,
    status: task.status as "queued" | "running" | "completed" | "failed",
    progress: task.progress ?? undefined,
    tokens: task.tokens ?? undefined,
    duration: task.duration ?? undefined,
  }));

  const handleSubmit = async () => {
    if (!prompt.trim()) return;

    setSubmitting(true);
    try {
      await submitInferenceTask(selectedModel);
      toast.success("Inference task submitted successfully");
      setPrompt("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to submit task");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader
        title="Inference"
        subtitle="Submit and monitor inference tasks"
      />

      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <StatCard {...stat} />
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Task Submission */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-1 p-5 rounded-xl border border-border bg-card/50"
          >
            <h3 className="font-mono font-bold text-foreground mb-4 flex items-center gap-2">
              <Plus className="w-4 h-4" />
              New Inference Task
            </h3>

            <div className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Model</label>
                <Select value={selectedModel} onValueChange={setSelectedModel}>
                  <SelectTrigger className="bg-secondary border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {models.map((model) => (
                      <SelectItem key={model.id} value={model.id}>
                        {model.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Prompt</label>
                <Textarea
                  placeholder="Enter your prompt..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="bg-secondary border-border min-h-[120px] font-mono text-sm"
                />
              </div>

              <Button
                onClick={handleSubmit}
                disabled={!prompt.trim() || submitting}
                className="w-full font-mono bg-primary text-primary-foreground"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Submit Task
                  </>
                )}
              </Button>
            </div>
          </motion.div>

          {/* Queue */}
          <div className="lg:col-span-2">
            {loading ? (
              <div className="p-5 rounded-xl border border-border bg-card/50 space-y-3">
                <Skeleton className="h-6 w-32" />
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                  <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  <span>Real-time updates enabled</span>
                </div>
                <InferenceQueue tasks={queueTasks} />
              </>
            )}
          </div>
        </div>

        {/* Response Time Chart */}
        <TelemetryChart
          title="Response Time Distribution (24h)"
          data={latencyData}
          color="hsl(160, 84%, 45%)"
          unit="ms"
        />
      </div>
    </div>
  );
};

export default Inference;
