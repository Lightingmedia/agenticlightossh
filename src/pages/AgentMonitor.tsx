import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  Activity, 
  Zap, 
  CheckCircle, 
  XCircle,
  Clock,
  RefreshCw,
  Download,
  TrendingUp,
  AlertTriangle,
  Play,
  Pause
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const AgentMonitor = () => {
  const [selectedAgent, setSelectedAgent] = useState("thermal-agent-001");
  const [refreshInterval, setRefreshInterval] = useState("5s");
  const [isLive, setIsLive] = useState(true);

  const [decisions, setDecisions] = useState([
    {
      id: "1",
      timestamp: "10:32:15",
      rule: "Thermal Critical",
      severity: "high",
      actions: [
        { name: "Increase Cooling", status: "success", duration: "234ms" },
        { name: "Notify Team", status: "success", duration: "89ms" },
        { name: "Rebalance", status: "rate_limited", duration: "-" }
      ]
    },
    {
      id: "2",
      timestamp: "10:28:42",
      rule: "Power Warning",
      severity: "medium",
      actions: [
        { name: "Log Event", status: "success", duration: "12ms" },
        { name: "Notify Team", status: "success", duration: "95ms" }
      ]
    },
    {
      id: "3",
      timestamp: "10:15:03",
      rule: "Thermal Warning",
      severity: "low",
      actions: [
        { name: "Log Event", status: "success", duration: "8ms" }
      ]
    }
  ]);

  const chartData = [
    { hour: "00:00", decisions: 12, actions: 8 },
    { hour: "04:00", decisions: 8, actions: 5 },
    { hour: "08:00", decisions: 45, actions: 32 },
    { hour: "12:00", decisions: 67, actions: 45 },
    { hour: "16:00", decisions: 89, actions: 62 },
    { hour: "20:00", decisions: 34, actions: 24 },
    { hour: "24:00", decisions: 28, actions: 18 }
  ];

  const actionBreakdown = [
    { name: "API Calls", value: 45, color: "hsl(var(--primary))" },
    { name: "Notifications", value: 30, color: "hsl(var(--chart-2))" },
    { name: "Database", value: 15, color: "hsl(var(--chart-3))" },
    { name: "Scripts", value: 10, color: "hsl(var(--chart-4))" }
  ];

  const dataSources = [
    { name: "Prometheus", status: "connected", callsPerMin: 147, latency: "23ms", lastCheck: "2s ago" },
    { name: "IPMI API", status: "connected", callsPerMin: 45, latency: "145ms", lastCheck: "5s ago" },
    { name: "Metrics DB", status: "connected", callsPerMin: 23, latency: "34ms", lastCheck: "10s ago" }
  ];

  const getSeverityStyles = (severity: string) => {
    switch (severity) {
      case "high": return { badge: "bg-red-500/10 text-red-400 border-red-500/30", icon: "text-red-400" };
      case "medium": return { badge: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30", icon: "text-yellow-400" };
      case "low": return { badge: "bg-blue-500/10 text-blue-400 border-blue-500/30", icon: "text-blue-400" };
      default: return { badge: "bg-muted text-muted-foreground", icon: "text-muted-foreground" };
    }
  };

  const getActionStatusIcon = (status: string) => {
    switch (status) {
      case "success": return <CheckCircle className="w-3 h-3 text-primary" />;
      case "failed": return <XCircle className="w-3 h-3 text-red-400" />;
      case "rate_limited": return <AlertTriangle className="w-3 h-3 text-yellow-400" />;
      default: return <Clock className="w-3 h-3 text-muted-foreground" />;
    }
  };

  // Simulate live updates
  useEffect(() => {
    if (!isLive) return;
    
    const interval = setInterval(() => {
      // Add simulated new decision occasionally
      if (Math.random() > 0.7) {
        setDecisions(prev => [{
          id: Date.now().toString(),
          timestamp: new Date().toLocaleTimeString(),
          rule: "Thermal Check",
          severity: "low",
          actions: [{ name: "Log Event", status: "success", duration: "10ms" }]
        }, ...prev.slice(0, 9)]);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [isLive]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-mono">Agent Monitor</h1>
          <p className="text-muted-foreground">Real-time monitoring for deployed agents</p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={selectedAgent} onValueChange={setSelectedAgent}>
            <SelectTrigger className="w-48 font-mono">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="thermal-agent-001">thermal-agent-001</SelectItem>
              <SelectItem value="power-agent-001">power-agent-001</SelectItem>
            </SelectContent>
          </Select>
          <Select value={refreshInterval} onValueChange={setRefreshInterval}>
            <SelectTrigger className="w-24 font-mono">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5s">5s</SelectItem>
              <SelectItem value="10s">10s</SelectItem>
              <SelectItem value="30s">30s</SelectItem>
              <SelectItem value="1m">1m</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant={isLive ? "default" : "outline"}
            size="sm"
            onClick={() => setIsLive(!isLive)}
            className="font-mono"
          >
            {isLive ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
            {isLive ? "Live" : "Paused"}
          </Button>
          <Button variant="outline" size="sm" className="font-mono">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Status</span>
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            </div>
            <div className="text-2xl font-mono font-bold text-primary">Running</div>
            <div className="text-xs text-muted-foreground mt-1">Uptime: 15d 3h 22m</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Decisions (24h)</span>
              <TrendingUp className="w-4 h-4 text-primary" />
            </div>
            <div className="text-2xl font-mono font-bold">1,247</div>
            <div className="text-xs text-primary mt-1">↑ 12% from yesterday</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Actions Triggered</span>
              <Zap className="w-4 h-4 text-yellow-400" />
            </div>
            <div className="text-2xl font-mono font-bold">23</div>
            <div className="text-xs text-muted-foreground mt-1">Last 24 hours</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Success Rate</span>
              <CheckCircle className="w-4 h-4 text-primary" />
            </div>
            <div className="text-2xl font-mono font-bold text-primary">99.8%</div>
            <Progress value={99.8} className="h-1.5 mt-2" />
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Decision Log */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-mono font-bold text-lg flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              Decision Log
              {isLive && <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />}
            </h2>
          </div>
          
          <Card>
            <CardContent className="p-0">
              <div className="max-h-[400px] overflow-y-auto">
                {decisions.map((decision, index) => {
                  const styles = getSeverityStyles(decision.severity);
                  return (
                    <motion.div
                      key={decision.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="p-4 border-b border-border last:border-0 hover:bg-secondary/30 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-sm text-muted-foreground">{decision.timestamp}</span>
                          <Badge variant="outline" className={cn("font-mono text-xs", styles.badge)}>
                            {decision.rule}
                          </Badge>
                          <Badge variant="outline" className={cn("font-mono text-xs capitalize", styles.badge)}>
                            {decision.severity}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {decision.actions.map((action, i) => (
                          <div key={i} className="flex items-center gap-1 text-xs text-muted-foreground bg-secondary/50 px-2 py-1 rounded">
                            {getActionStatusIcon(action.status)}
                            <span>{action.name}</span>
                            {action.duration !== "-" && (
                              <span className="text-muted-foreground/60">({action.duration})</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Charts */}
          <Card>
            <CardHeader>
              <CardTitle className="font-mono text-lg">Activity (24h)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="hour" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--card))", 
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px"
                    }} 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="decisions" 
                    stroke="hsl(var(--primary))" 
                    fill="hsl(var(--primary))" 
                    fillOpacity={0.2}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="actions" 
                    stroke="hsl(var(--chart-2))" 
                    fill="hsl(var(--chart-2))" 
                    fillOpacity={0.2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-4">
          {/* Actions Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="font-mono text-lg">Actions Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={150}>
                <PieChart>
                  <Pie
                    data={actionBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={60}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {actionBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-2 mt-4">
                {actionBreakdown.map((item) => (
                  <div key={item.name} className="flex items-center gap-2 text-xs">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-muted-foreground">{item.name}</span>
                    <span className="font-mono ml-auto">{item.value}%</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Data Source Status */}
          <Card>
            <CardHeader>
              <CardTitle className="font-mono text-lg">Data Sources</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {dataSources.map((source) => (
                <div key={source.name} className="flex items-center justify-between p-2 rounded-lg bg-secondary/30">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-primary" />
                    <span className="font-mono text-sm">{source.name}</span>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <div>{source.callsPerMin}/min</div>
                    <div>{source.latency}</div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardContent className="p-4 space-y-2">
              <Button variant="outline" className="w-full font-mono justify-start">
                <RefreshCw className="w-4 h-4 mr-2" />
                Restart Agent
              </Button>
              <Button variant="outline" className="w-full font-mono justify-start">
                <Pause className="w-4 h-4 mr-2" />
                Pause Agent
              </Button>
              <Button variant="outline" className="w-full font-mono justify-start text-red-400 hover:text-red-500">
                <XCircle className="w-4 h-4 mr-2" />
                Stop Agent
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AgentMonitor;
