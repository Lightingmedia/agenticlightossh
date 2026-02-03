import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Search, Filter } from "lucide-react";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import AgentCard from "@/components/dashboard/AgentCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Mock agent data
const agents = [
  { id: "agent-001-xyz", name: "node-gpu-7", type: "GPU Worker (A100)", status: "online" as const, cpu: 45, memory: 78, tasks: 142, uptime: "7d 12h" },
  { id: "agent-002-abc", name: "node-gpu-12", type: "GPU Worker (H100)", status: "busy" as const, cpu: 92, memory: 85, tasks: 89, uptime: "3d 8h" },
  { id: "agent-003-def", name: "node-cpu-3", type: "CPU Worker", status: "online" as const, cpu: 34, memory: 45, tasks: 234, uptime: "14d 2h" },
  { id: "agent-004-ghi", name: "edge-laptop-1", type: "Edge Device (RTX 4090)", status: "idle" as const, cpu: 5, memory: 23, tasks: 12, uptime: "1d 4h" },
  { id: "agent-005-jkl", name: "node-gpu-15", type: "GPU Worker (A100)", status: "offline" as const, cpu: 0, memory: 0, tasks: 0, uptime: "—" },
  { id: "agent-006-mno", name: "worker-east-12", type: "GPU Worker (H100)", status: "online" as const, cpu: 67, memory: 72, tasks: 78, uptime: "2d 18h" },
  { id: "agent-007-pqr", name: "node-inference-1", type: "Inference Node", status: "busy" as const, cpu: 88, memory: 91, tasks: 456, uptime: "21d 6h" },
  { id: "agent-008-stu", name: "edge-workstation-2", type: "Edge Device (RTX 3090)", status: "online" as const, cpu: 28, memory: 35, tasks: 45, uptime: "5d 14h" },
];

const Agents = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filteredAgents = agents.filter((agent) => {
    const matchesSearch =
      agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.type.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || agent.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusCounts = {
    all: agents.length,
    online: agents.filter((a) => a.status === "online").length,
    busy: agents.filter((a) => a.status === "busy").length,
    idle: agents.filter((a) => a.status === "idle").length,
    offline: agents.filter((a) => a.status === "offline").length,
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader
        title="Agents"
        subtitle="Manage connected compute nodes and edge devices"
      />

      <div className="p-6 space-y-6">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="flex gap-3 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search agents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
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
            Register Agent
          </Button>
        </div>

        {/* Status Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {Object.entries(statusCounts).map(([status, count]) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 rounded-lg font-mono text-sm whitespace-nowrap transition-colors ${
                statusFilter === status
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)} ({count})
            </button>
          ))}
        </div>

        {/* Agents Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredAgents.map((agent, index) => (
            <motion.div
              key={agent.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <AgentCard {...agent} />
            </motion.div>
          ))}
        </div>

        {filteredAgents.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <p className="text-muted-foreground">No agents found matching your criteria.</p>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Agents;
