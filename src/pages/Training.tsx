import { motion } from "framer-motion";
import { Plus, Search } from "lucide-react";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import TrainingJobCard from "@/components/dashboard/TrainingJobCard";
import TelemetryChart from "@/components/dashboard/TelemetryChart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const trainingJobs = [
  { id: "train-001", name: "Customer Support Fine-tune", model: "llama-3.1-8b", status: "running" as const, progress: 67, epoch: 3, totalEpochs: 5, loss: 0.0234, eta: "2h 15m", gpu: "A100 x2" },
  { id: "train-002", name: "Code Assistant v2", model: "codellama-34b", status: "running" as const, progress: 23, epoch: 1, totalEpochs: 3, loss: 0.1456, eta: "8h 45m", gpu: "H100 x4" },
  { id: "train-003", name: "Sentiment Analysis", model: "mistral-7b", status: "paused" as const, progress: 45, epoch: 2, totalEpochs: 4, loss: 0.0567, eta: "—", gpu: "A100 x1" },
  { id: "train-004", name: "Document Summarizer", model: "llama-3.1-70b", status: "queued" as const, progress: 0, epoch: 0, totalEpochs: 2, loss: 0, eta: "Queued", gpu: "H100 x8" },
  { id: "train-005", name: "Translation Model", model: "mixtral-8x7b", status: "completed" as const, progress: 100, epoch: 5, totalEpochs: 5, loss: 0.0089, eta: "Done", gpu: "A100 x4" },
];

const lossData = Array.from({ length: 100 }, (_, i) => ({
  time: `${i}`,
  value: 0.5 * Math.exp(-i / 30) + 0.02 + Math.random() * 0.02,
}));

const gpuUtilData = Array.from({ length: 60 }, (_, i) => ({
  time: `${i}m`,
  value: 85 + Math.random() * 15,
  value2: 70 + Math.random() * 20,
}));

const Training = () => {
  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader
        title="Training"
        subtitle="Fine-tuning jobs and training pipelines"
      />

      <div className="p-6 space-y-6">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search training jobs..."
              className="pl-10 bg-secondary border-border"
            />
          </div>
          <Button className="font-mono bg-primary text-primary-foreground">
            <Plus className="w-4 h-4 mr-2" />
            New Training Job
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-xl border border-border bg-card/50"
          >
            <div className="text-2xl font-mono font-bold text-foreground">5</div>
            <div className="text-sm text-muted-foreground">Total Jobs</div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-4 rounded-xl border border-border bg-card/50"
          >
            <div className="text-2xl font-mono font-bold text-primary">2</div>
            <div className="text-sm text-muted-foreground">Running</div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="p-4 rounded-xl border border-border bg-card/50"
          >
            <div className="text-2xl font-mono font-bold text-amber-400">14</div>
            <div className="text-sm text-muted-foreground">GPUs Active</div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="p-4 rounded-xl border border-border bg-card/50"
          >
            <div className="text-2xl font-mono font-bold text-foreground">127h</div>
            <div className="text-sm text-muted-foreground">Total GPU Hours</div>
          </motion.div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TelemetryChart
            title="Training Loss (Latest Job)"
            data={lossData}
            color="hsl(0, 84%, 60%)"
            type="line"
          />
          <TelemetryChart
            title="GPU Utilization During Training"
            data={gpuUtilData}
            showSecondary
            unit="%"
          />
        </div>

        {/* Training Jobs */}
        <div>
          <h3 className="font-mono font-bold text-foreground mb-4">Training Jobs</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {trainingJobs.map((job, index) => (
              <motion.div
                key={job.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <TrainingJobCard {...job} />
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Training;
