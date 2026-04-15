import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Search, Filter, RefreshCw } from "lucide-react";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import AgentCard from "@/components/dashboard/AgentCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useRealtimeAgents } from "@/hooks/use-realtime-telemetry";
import { registerAgent } from "@/lib/api";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

const Agents = () => {
  const { agents, loading } = useRealtimeAgents();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newAgentName, setNewAgentName] = useState("");
  const [newAgentType, setNewAgentType] = useState("");
  const [registering, setRegistering] = useState(false);

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

  const handleRegisterAgent = async () => {
    if (!newAgentName || !newAgentType) {
      toast.error("Please fill in all fields");
      return;
    }

    setRegistering(true);
    try {
      await registerAgent(newAgentName, newAgentType);
      toast.success(`Agent ${newAgentName} registered successfully`);
      setIsDialogOpen(false);
      setNewAgentName("");
      setNewAgentType("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to register agent");
    } finally {
      setRegistering(false);
    }
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
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="font-mono bg-primary text-primary-foreground">
                <Plus className="w-4 h-4 mr-2" />
                Register Agent
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader>
                <DialogTitle className="font-mono">Register New Agent</DialogTitle>
                <DialogDescription>
                  Add a new compute node or edge device to your cluster.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Agent Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g., node-gpu-new"
                    value={newAgentName}
                    onChange={(e) => setNewAgentName(e.target.value)}
                    className="bg-secondary border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Agent Type</Label>
                  <Input
                    id="type"
                    placeholder="e.g., GPU Worker (A100)"
                    value={newAgentType}
                    onChange={(e) => setNewAgentType(e.target.value)}
                    className="bg-secondary border-border"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleRegisterAgent} disabled={registering}>
                  {registering && <RefreshCw className="w-4 h-4 mr-2 animate-spin" />}
                  Register
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
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

        {/* Live indicator */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span>Real-time updates enabled</span>
        </div>

        {/* Agents Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-48 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredAgents.map((agent, index) => (
              <motion.div
                key={agent.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <AgentCard
                  id={agent.agent_id}
                  name={agent.name}
                  type={agent.type}
                  status={agent.status as "online" | "busy" | "idle" | "offline"}
                  cpu={Number(agent.cpu)}
                  memory={Number(agent.memory)}
                  tasks={agent.tasks}
                  uptime={agent.uptime}
                />
              </motion.div>
            ))}
          </div>
        )}

        {!loading && filteredAgents.length === 0 && (
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
