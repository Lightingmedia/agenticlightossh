import { motion } from "framer-motion";
import { Search, Filter, Plus } from "lucide-react";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import ModelCard from "@/components/dashboard/ModelCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const models = [
  { name: "Llama 3.1 70B", provider: "Meta", parameters: "70B", quantization: "FP16", status: "deployed" as const, latency: "1.2s", requests: 4521 },
  { name: "Mistral 7B v0.3", provider: "Mistral AI", parameters: "7B", quantization: "INT8", status: "deployed" as const, latency: "180ms", requests: 12450 },
  { name: "Mixtral 8x7B", provider: "Mistral AI", parameters: "46.7B MoE", quantization: "INT4", status: "deployed" as const, latency: "890ms", requests: 3210 },
  { name: "CodeLlama 34B", provider: "Meta", parameters: "34B", quantization: "FP16", status: "downloading" as const },
  { name: "Llama 3.1 8B", provider: "Meta", parameters: "8B", quantization: "INT8", status: "deployed" as const, latency: "95ms", requests: 28900 },
  { name: "Qwen2 72B", provider: "Alibaba", parameters: "72B", quantization: "FP16", status: "available" as const },
  { name: "Phi-3 Medium", provider: "Microsoft", parameters: "14B", quantization: "INT8", status: "available" as const },
  { name: "Gemma 2 27B", provider: "Google", parameters: "27B", quantization: "FP16", status: "available" as const },
];

const Models = () => {
  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader
        title="LLM Models"
        subtitle="Deploy and manage large language models"
      />

      <div className="p-6 space-y-6">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="flex gap-3 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search models..."
                className="pl-10 bg-secondary border-border"
              />
            </div>
            <Button variant="outline" className="font-mono">
              <Filter className="w-4 h-4 mr-2" />
              Filter
            </Button>
          </div>
          <Button className="font-mono bg-primary text-primary-foreground">
            <Plus className="w-4 h-4 mr-2" />
            Add Model
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-xl border border-border bg-card/50"
          >
            <div className="text-2xl font-mono font-bold text-foreground">8</div>
            <div className="text-sm text-muted-foreground">Total Models</div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-4 rounded-xl border border-border bg-card/50"
          >
            <div className="text-2xl font-mono font-bold text-primary">5</div>
            <div className="text-sm text-muted-foreground">Deployed</div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="p-4 rounded-xl border border-border bg-card/50"
          >
            <div className="text-2xl font-mono font-bold text-amber-400">1</div>
            <div className="text-sm text-muted-foreground">Downloading</div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="p-4 rounded-xl border border-border bg-card/50"
          >
            <div className="text-2xl font-mono font-bold text-foreground">49.1K</div>
            <div className="text-sm text-muted-foreground">Total Requests/hr</div>
          </motion.div>
        </div>

        {/* Models Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {models.map((model, index) => (
            <motion.div
              key={model.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <ModelCard {...model} />
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Models;
