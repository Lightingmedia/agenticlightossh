import { useState } from "react";
import { motion } from "framer-motion";
import { 
  Plus, 
  Trash2, 
  Copy, 
  Play, 
  ToggleLeft, 
  ToggleRight,
  ChevronDown,
  ChevronRight,
  Zap,
  AlertTriangle,
  Code,
  Eye
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
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Rule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  conditions: {
    metric: string;
    operator: string;
    value: string;
    logic?: "AND" | "OR";
  }[];
  actions: string[];
  lastTriggered?: string;
}

const RuleBuilder = () => {
  const [rules, setRules] = useState<Rule[]>([
    {
      id: "1",
      name: "Thermal Critical Alert",
      description: "Trigger when GPU temperature exceeds safe threshold",
      enabled: true,
      conditions: [
        { metric: "gpu_temperature", operator: ">", value: "80" },
        { metric: "trend", operator: "==", value: "rising", logic: "AND" }
      ],
      actions: ["increase_cooling", "notify_ops", "log_event"],
      lastTriggered: "2 hours ago"
    },
    {
      id: "2",
      name: "Power Spike Warning",
      description: "Alert on sudden power consumption increases",
      enabled: true,
      conditions: [
        { metric: "power_draw", operator: ">", value: "5000" }
      ],
      actions: ["notify_ops", "schedule_load_shift"],
      lastTriggered: "5 hours ago"
    },
    {
      id: "3",
      name: "Memory Pressure",
      description: "Trigger when memory usage is critically high",
      enabled: false,
      conditions: [
        { metric: "memory_usage", operator: ">", value: "90" }
      ],
      actions: ["scale_down_workloads"],
    }
  ]);

  const [editingRule, setEditingRule] = useState<Rule | null>(null);
  const [codeMode, setCodeMode] = useState(false);

  const metrics = [
    "gpu_temperature",
    "cpu_temperature",
    "power_draw",
    "memory_usage",
    "network_bandwidth",
    "fan_speed",
    "trend"
  ];

  const operators = [
    { value: ">", label: "Greater than" },
    { value: "<", label: "Less than" },
    { value: "==", label: "Equals" },
    { value: "!=", label: "Not equals" },
    { value: ">=", label: "Greater or equal" },
    { value: "<=", label: "Less or equal" },
    { value: "between", label: "Between" },
    { value: "rising", label: "Is rising" },
    { value: "falling", label: "Is falling" }
  ];

  const toggleRule = (id: string) => {
    setRules(rules.map(rule => 
      rule.id === id ? { ...rule, enabled: !rule.enabled } : rule
    ));
    toast.success("Rule updated");
  };

  const deleteRule = (id: string) => {
    setRules(rules.filter(rule => rule.id !== id));
    toast.success("Rule deleted");
  };

  const duplicateRule = (rule: Rule) => {
    const newRule = {
      ...rule,
      id: Date.now().toString(),
      name: `${rule.name} (Copy)`,
    };
    setRules([...rules, newRule]);
    toast.success("Rule duplicated");
  };

  const testRule = (rule: Rule) => {
    toast.success(`Testing rule "${rule.name}"...`, {
      description: "12 rows matched, would trigger 3 actions"
    });
  };

  const getConditionSummary = (rule: Rule) => {
    return rule.conditions.map((c, i) => {
      const prefix = i > 0 ? ` ${c.logic} ` : "";
      return `${prefix}${c.metric} ${c.operator} ${c.value}`;
    }).join("");
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-mono">Rule Builder</h1>
          <p className="text-muted-foreground">Define conditions and actions for your agent</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="font-mono">
              <Plus className="w-4 h-4 mr-2" />
              Add Rule
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="font-mono">Create New Rule</DialogTitle>
            </DialogHeader>
            <RuleEditor 
              metrics={metrics} 
              operators={operators}
              codeMode={codeMode}
              setCodeMode={setCodeMode}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Rules List */}
      <div className="space-y-4">
        {rules.map((rule, index) => (
          <motion.div
            key={rule.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card className={cn(
              "transition-all",
              !rule.enabled && "opacity-60"
            )}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-mono font-bold text-foreground">{rule.name}</h3>
                      <Badge variant={rule.enabled ? "default" : "secondary"} className="text-xs">
                        {rule.enabled ? "Active" : "Disabled"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">{rule.description}</p>
                    
                    {/* Condition Summary */}
                    <div className="flex items-center gap-2 mb-3">
                      <Badge variant="outline" className="font-mono text-xs">
                        IF: {getConditionSummary(rule)}
                      </Badge>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-muted-foreground">Actions:</span>
                      {rule.actions.map((action) => (
                        <Badge key={action} variant="secondary" className="text-xs font-mono">
                          <Zap className="w-3 h-3 mr-1" />
                          {action}
                        </Badge>
                      ))}
                    </div>

                    {rule.lastTriggered && (
                      <p className="text-xs text-muted-foreground mt-3">
                        Last triggered: {rule.lastTriggered}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleRule(rule.id)}
                    >
                      {rule.enabled ? (
                        <ToggleRight className="w-5 h-5 text-primary" />
                      ) : (
                        <ToggleLeft className="w-5 h-5 text-muted-foreground" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => testRule(rule)}
                    >
                      <Play className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => duplicateRule(rule)}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-400 hover:text-red-500"
                      onClick={() => deleteRule(rule.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {rules.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <AlertTriangle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-mono font-bold mb-2">No rules defined</h3>
            <p className="text-muted-foreground mb-4">Create your first rule to start monitoring</p>
            <Button className="font-mono">
              <Plus className="w-4 h-4 mr-2" />
              Add Rule
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

const RuleEditor = ({ 
  metrics, 
  operators, 
  codeMode, 
  setCodeMode 
}: { 
  metrics: string[]; 
  operators: { value: string; label: string }[];
  codeMode: boolean;
  setCodeMode: (v: boolean) => void;
}) => {
  const [conditions, setConditions] = useState([
    { metric: "", operator: "", value: "", logic: undefined as "AND" | "OR" | undefined }
  ]);

  const addCondition = () => {
    setConditions([...conditions, { metric: "", operator: "", value: "", logic: "AND" }]);
  };

  const removeCondition = (index: number) => {
    setConditions(conditions.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6 pt-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Rule Name</Label>
          <Input placeholder="e.g., Thermal Critical Alert" className="font-mono" />
        </div>
        <div className="space-y-2">
          <Label>Description</Label>
          <Input placeholder="Brief description" className="font-mono" />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h4 className="font-mono font-medium">Conditions (IF...)</h4>
        <div className="flex items-center gap-2">
          <Button
            variant={codeMode ? "ghost" : "secondary"}
            size="sm"
            onClick={() => setCodeMode(false)}
          >
            <Eye className="w-4 h-4 mr-1" />
            Visual
          </Button>
          <Button
            variant={codeMode ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setCodeMode(true)}
          >
            <Code className="w-4 h-4 mr-1" />
            Code
          </Button>
        </div>
      </div>

      {codeMode ? (
        <Textarea
          placeholder="# Python-like syntax&#10;temp > 75 and trend == 'rising'"
          className="font-mono h-32"
        />
      ) : (
        <div className="space-y-3">
          {conditions.map((condition, index) => (
            <div key={index} className="flex items-center gap-2">
              {index > 0 && (
                <Select 
                  value={condition.logic} 
                  onValueChange={(v) => {
                    const newConditions = [...conditions];
                    newConditions[index].logic = v as "AND" | "OR";
                    setConditions(newConditions);
                  }}
                >
                  <SelectTrigger className="w-20">
                    <SelectValue placeholder="AND" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AND">AND</SelectItem>
                    <SelectItem value="OR">OR</SelectItem>
                  </SelectContent>
                </Select>
              )}
              <Select>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select metric" />
                </SelectTrigger>
                <SelectContent>
                  {metrics.map(m => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Operator" />
                </SelectTrigger>
                <SelectContent>
                  {operators.map(o => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input placeholder="Value" className="w-24 font-mono" />
              {conditions.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-red-400"
                  onClick={() => removeCondition(index)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addCondition} className="font-mono">
            <Plus className="w-4 h-4 mr-2" />
            Add Condition
          </Button>
        </div>
      )}

      <div className="space-y-2">
        <Label>Actions (THEN...)</Label>
        <Select>
          <SelectTrigger>
            <SelectValue placeholder="Select actions to trigger" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="increase_cooling">Increase Cooling</SelectItem>
            <SelectItem value="notify_ops">Notify Operations</SelectItem>
            <SelectItem value="log_event">Log Event</SelectItem>
            <SelectItem value="rebalance_workload">Rebalance Workload</SelectItem>
            <SelectItem value="scale_down">Scale Down</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-4 pt-4 border-t border-border">
        <div className="flex items-center gap-2">
          <Switch id="enabled" defaultChecked />
          <Label htmlFor="enabled">Enable rule</Label>
        </div>
        <div className="flex-1" />
        <Button variant="outline" className="font-mono">
          <Play className="w-4 h-4 mr-2" />
          Test Rule
        </Button>
        <Button className="font-mono">Save Rule</Button>
      </div>
    </div>
  );
};

export default RuleBuilder;
