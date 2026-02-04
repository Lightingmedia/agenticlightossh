import { useState } from "react";
import { motion } from "framer-motion";
import { 
  Globe, 
  Webhook, 
  Database, 
  Bell, 
  Terminal,
  Plus,
  Trash2,
  Play,
  GripVertical,
  Check,
  X,
  Clock,
  RefreshCw,
  Shield
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Action {
  id: string;
  name: string;
  type: "api" | "webhook" | "database" | "notification" | "script";
  status: "active" | "inactive";
  lastExecuted?: string;
  successRate?: number;
  config: Record<string, any>;
}

const ActionOrchestrator = () => {
  const [actions, setActions] = useState<Action[]>([
    {
      id: "1",
      name: "Increase Cooling",
      type: "api",
      status: "active",
      lastExecuted: "5 min ago",
      successRate: 99.8,
      config: { url: "https://crac.api/adjust", method: "POST" }
    },
    {
      id: "2",
      name: "Notify Ops Team",
      type: "notification",
      status: "active",
      lastExecuted: "2 hours ago",
      successRate: 100,
      config: { channel: "#datacenter-alerts" }
    },
    {
      id: "3",
      name: "Log Thermal Event",
      type: "database",
      status: "active",
      lastExecuted: "5 min ago",
      successRate: 100,
      config: { table: "thermal_events" }
    },
    {
      id: "4",
      name: "Rebalance Workload",
      type: "script",
      status: "inactive",
      config: { script: "rebalance.py" }
    }
  ]);

  const [actionHistory] = useState([
    { id: "1", action: "Increase Cooling", status: "success", timestamp: "5 min ago", duration: "234ms" },
    { id: "2", action: "Notify Ops Team", status: "success", timestamp: "2 hours ago", duration: "89ms" },
    { id: "3", action: "Log Thermal Event", status: "success", timestamp: "5 min ago", duration: "12ms" },
    { id: "4", action: "Rebalance Workload", status: "failed", timestamp: "1 day ago", duration: "5.2s", error: "Timeout" },
  ]);

  const getActionIcon = (type: Action["type"]) => {
    switch (type) {
      case "api": return Globe;
      case "webhook": return Webhook;
      case "database": return Database;
      case "notification": return Bell;
      case "script": return Terminal;
    }
  };

  const getActionColor = (type: Action["type"]) => {
    switch (type) {
      case "api": return "from-blue-500/20 to-cyan-500/20";
      case "webhook": return "from-purple-500/20 to-violet-500/20";
      case "database": return "from-green-500/20 to-emerald-500/20";
      case "notification": return "from-yellow-500/20 to-amber-500/20";
      case "script": return "from-red-500/20 to-orange-500/20";
    }
  };

  const deleteAction = (id: string) => {
    setActions(actions.filter(a => a.id !== id));
    toast.success("Action deleted");
  };

  const testAction = (action: Action) => {
    toast.success(`Testing "${action.name}"...`, {
      description: "Dry run completed successfully"
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-mono">Action Orchestrator</h1>
          <p className="text-muted-foreground">Define what your agent does when rules trigger</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="font-mono">
              <Plus className="w-4 h-4 mr-2" />
              Add Action
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="font-mono">Create New Action</DialogTitle>
            </DialogHeader>
            <ActionEditor />
          </DialogContent>
        </Dialog>
      </div>

      {/* Action Type Overview */}
      <div className="grid grid-cols-5 gap-4">
        {[
          { type: "api", label: "API Call", count: actions.filter(a => a.type === "api").length },
          { type: "webhook", label: "Webhook", count: actions.filter(a => a.type === "webhook").length },
          { type: "database", label: "Database", count: actions.filter(a => a.type === "database").length },
          { type: "notification", label: "Notification", count: actions.filter(a => a.type === "notification").length },
          { type: "script", label: "Script", count: actions.filter(a => a.type === "script").length },
        ].map((item) => {
          const Icon = getActionIcon(item.type as Action["type"]);
          return (
            <Card key={item.type} className="text-center">
              <CardContent className="pt-4">
                <div className={cn("w-10 h-10 rounded-lg mx-auto mb-2 flex items-center justify-center bg-gradient-to-br", getActionColor(item.type as Action["type"]))}>
                  <Icon className="w-5 h-5 text-foreground" />
                </div>
                <div className="font-mono text-lg font-bold">{item.count}</div>
                <div className="text-xs text-muted-foreground">{item.label}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Actions List */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h2 className="font-mono font-bold text-lg">Configured Actions</h2>
          {actions.map((action, index) => {
            const Icon = getActionIcon(action.type);
            return (
              <motion.div
                key={action.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className={cn(
                  "hover:border-primary/30 transition-all cursor-grab",
                  action.status === "inactive" && "opacity-60"
                )}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <GripVertical className="w-4 h-4 text-muted-foreground" />
                      <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center bg-gradient-to-br", getActionColor(action.type))}>
                        <Icon className="w-5 h-5 text-foreground" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-mono font-medium">{action.name}</h4>
                          <Badge variant={action.status === "active" ? "default" : "secondary"} className="text-xs">
                            {action.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground capitalize">{action.type}</p>
                      </div>
                      <div className="text-right text-xs text-muted-foreground">
                        {action.successRate && (
                          <div className="text-primary font-mono">{action.successRate}% success</div>
                        )}
                        {action.lastExecuted && (
                          <div>Last: {action.lastExecuted}</div>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => testAction(action)}>
                          <Play className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-red-400"
                          onClick={() => deleteAction(action.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Action History */}
        <div className="space-y-4">
          <h2 className="font-mono font-bold text-lg">Recent Executions</h2>
          <Card>
            <CardContent className="p-4 space-y-3">
              {actionHistory.map((item) => (
                <div 
                  key={item.id} 
                  className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50"
                >
                  {item.status === "success" ? (
                    <Check className="w-4 h-4 text-primary" />
                  ) : (
                    <X className="w-4 h-4 text-red-400" />
                  )}
                  <div className="flex-1">
                    <div className="font-mono text-sm">{item.action}</div>
                    <div className="text-xs text-muted-foreground">
                      {item.timestamp} • {item.duration}
                      {item.error && <span className="text-red-400"> • {item.error}</span>}
                    </div>
                  </div>
                  {item.status === "failed" && (
                    <Button variant="ghost" size="sm" className="text-xs">
                      <RefreshCw className="w-3 h-3 mr-1" />
                      Retry
                    </Button>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Safety Controls */}
          <Card>
            <CardHeader>
              <CardTitle className="font-mono text-lg flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                Safety Controls
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Test before executing</Label>
                  <p className="text-xs text-muted-foreground">Dry-run actions before real execution</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Require manual approval</Label>
                  <p className="text-xs text-muted-foreground">For critical actions</p>
                </div>
                <Switch />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Rate limiting</Label>
                  <p className="text-xs text-muted-foreground">Max 10 actions per minute</p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

const ActionEditor = () => {
  const [actionType, setActionType] = useState<string>("api");

  return (
    <div className="space-y-6 pt-4">
      <div className="space-y-2">
        <Label>Action Type</Label>
        <div className="grid grid-cols-5 gap-2">
          {[
            { type: "api", icon: Globe, label: "API" },
            { type: "webhook", icon: Webhook, label: "Webhook" },
            { type: "database", icon: Database, label: "Database" },
            { type: "notification", icon: Bell, label: "Notify" },
            { type: "script", icon: Terminal, label: "Script" },
          ].map((item) => (
            <Button
              key={item.type}
              variant={actionType === item.type ? "default" : "outline"}
              className="flex-col h-auto py-3"
              onClick={() => setActionType(item.type)}
            >
              <item.icon className="w-5 h-5 mb-1" />
              <span className="text-xs">{item.label}</span>
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Action Name</Label>
        <Input placeholder="e.g., Increase Cooling" className="font-mono" />
      </div>

      <Tabs value={actionType} className="space-y-4">
        <TabsContent value="api" className="space-y-4 mt-0">
          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Method</Label>
              <Select defaultValue="POST">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GET">GET</SelectItem>
                  <SelectItem value="POST">POST</SelectItem>
                  <SelectItem value="PUT">PUT</SelectItem>
                  <SelectItem value="DELETE">DELETE</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-3 space-y-2">
              <Label>URL</Label>
              <Input placeholder="https://api.example.com/action" className="font-mono" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Request Body (supports {'{{variables}}'})</Label>
            <Textarea 
              placeholder='{"temperature": {{current_value}}, "action": "increase_cooling"}'
              className="font-mono h-24"
            />
          </div>
        </TabsContent>

        <TabsContent value="webhook" className="space-y-4 mt-0">
          <div className="space-y-2">
            <Label>Webhook URL</Label>
            <Input placeholder="https://hooks.slack.com/..." className="font-mono" />
          </div>
          <div className="space-y-2">
            <Label>Message Template</Label>
            <Textarea 
              placeholder="🚨 Alert: {{metric_name}} is {{current_value}} (threshold: {{threshold}})"
              className="font-mono h-24"
            />
          </div>
        </TabsContent>

        <TabsContent value="notification" className="space-y-4 mt-0">
          <div className="space-y-2">
            <Label>Notification Type</Label>
            <Select defaultValue="slack">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="slack">Slack</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="pagerduty">PagerDuty</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Destination</Label>
            <Input placeholder="#datacenter-alerts" className="font-mono" />
          </div>
          <div className="space-y-2">
            <Label>Priority</Label>
            <Select defaultValue="high">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </TabsContent>

        <TabsContent value="database" className="space-y-4 mt-0">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Table</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select table" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="events">events</SelectItem>
                  <SelectItem value="alerts">alerts</SelectItem>
                  <SelectItem value="metrics">metrics</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Operation</Label>
              <Select defaultValue="insert">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="insert">Insert</SelectItem>
                  <SelectItem value="update">Update</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="script" className="space-y-4 mt-0">
          <div className="space-y-2">
            <Label>Script Type</Label>
            <Select defaultValue="python">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="python">Python</SelectItem>
                <SelectItem value="bash">Bash</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Script Code</Label>
            <Textarea 
              placeholder="# Your script here&#10;import os&#10;&#10;def main():&#10;    pass"
              className="font-mono h-32"
            />
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex gap-2 pt-4 border-t border-border">
        <Button variant="outline" className="flex-1 font-mono">
          <Play className="w-4 h-4 mr-2" />
          Test Action
        </Button>
        <Button className="flex-1 font-mono">Save Action</Button>
      </div>
    </div>
  );
};

export default ActionOrchestrator;
