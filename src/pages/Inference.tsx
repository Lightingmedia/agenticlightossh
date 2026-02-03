import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Zap, Send, Clock } from "lucide-react";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import InferenceQueue from "@/components/dashboard/InferenceQueue";
import StatCard from "@/components/dashboard/StatCard";
import TelemetryChart from "@/components/dashboard/TelemetryChart";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const models = [
  { id: "llama-3.1-70b", name: "Llama 3.1 70B" },
  { id: "llama-3.1-8b", name: "Llama 3.1 8B" },
  { id: "mistral-7b", name: "Mistral 7B" },
  { id: "mixtral-8x7b", name: "Mixtral 8x7B" },
  { id: "codellama-34b", name: "CodeLlama 34B" },
];

const queueTasks = [
  { id: "inf-001", model: "llama-3.1-70b", status: "running" as const, progress: 78 },
  { id: "inf-002", model: "mistral-7b", status: "running" as const, progress: 45 },
  { id: "inf-003", model: "mixtral-8x7b", status: "queued" as const },
  { id: "inf-004", model: "llama-3.1-8b", status: "completed" as const, tokens: 1247, duration: "1.2s" },
  { id: "inf-005", model: "codellama-34b", status: "completed" as const, tokens: 892, duration: "0.8s" },
  { id: "inf-006", model: "llama-3.1-70b", status: "failed" as const },
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

  const handleSubmit = () => {
    console.log("Submitting inference:", { model: selectedModel, prompt });
    setPrompt("");
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
                disabled={!prompt.trim()}
                className="w-full font-mono bg-primary text-primary-foreground"
              >
                <Send className="w-4 h-4 mr-2" />
                Submit Task
              </Button>
            </div>
          </motion.div>

          {/* Queue */}
          <div className="lg:col-span-2">
            <InferenceQueue tasks={queueTasks} />
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
