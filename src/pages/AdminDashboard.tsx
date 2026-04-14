import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Cpu, Activity, BarChart3, Bot, Thermometer } from "lucide-react";

interface Counts {
  testers: number;
  agents: number;
  gpus: number;
  inferenceTasks: number;
  telemetryPoints: number;
  thermalZones: number;
}

const AdminDashboard = () => {
  const [counts, setCounts] = useState<Counts>({ testers: 0, agents: 0, gpus: 0, inferenceTasks: 0, telemetryPoints: 0, thermalZones: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCounts = async () => {
      const [t, a, g, i, tel, th] = await Promise.all([
        supabase.from("testers").select("*", { count: "exact", head: true }),
        supabase.from("agents").select("*", { count: "exact", head: true }),
        supabase.from("gpu_metrics").select("*", { count: "exact", head: true }),
        supabase.from("inference_tasks").select("*", { count: "exact", head: true }),
        supabase.from("telemetry_data").select("*", { count: "exact", head: true }),
        supabase.from("thermal_zones").select("*", { count: "exact", head: true }),
      ]);
      setCounts({
        testers: t.count ?? 0, agents: a.count ?? 0, gpus: g.count ?? 0,
        inferenceTasks: i.count ?? 0, telemetryPoints: tel.count ?? 0, thermalZones: th.count ?? 0,
      });
      setLoading(false);
    };
    fetchCounts();
  }, []);

  const stats = [
    { label: "Registered Testers", value: counts.testers, icon: Users, color: "text-cyan-400" },
    { label: "Active Agents", value: counts.agents, icon: Bot, color: "text-primary" },
    { label: "GPU Nodes", value: counts.gpus, icon: Cpu, color: "text-green-400" },
    { label: "Inference Tasks", value: counts.inferenceTasks, icon: Activity, color: "text-yellow-400" },
    { label: "Telemetry Points", value: counts.telemetryPoints, icon: BarChart3, color: "text-purple-400" },
    { label: "Thermal Zones", value: counts.thermalZones, icon: Thermometer, color: "text-red-400" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-mono text-foreground">Investor Overview</h1>
        <p className="text-muted-foreground mt-1">Platform metrics and traction data</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {stats.map(s => (
          <Card key={s.label} className="bg-card/50 border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-mono text-muted-foreground">{s.label}</CardTitle>
              <s.icon className={`w-5 h-5 ${s.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold font-mono text-foreground">
                {loading ? "—" : s.value.toLocaleString()}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-card/50 border-border">
        <CardHeader>
          <CardTitle className="font-mono text-lg">Platform Highlights</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground font-mono">
          <div className="flex justify-between"><span>Photonic-Native Architecture</span><span className="text-primary">Active</span></div>
          <div className="flex justify-between"><span>64-Channel WDM Scheduling</span><span className="text-primary">Enabled</span></div>
          <div className="flex justify-between"><span>Framework Support</span><span className="text-foreground">PyTorch, JAX</span></div>
          <div className="flex justify-between"><span>NCE Benchmark MFU</span><span className="text-green-400">68%</span></div>
          <div className="flex justify-between"><span>Cost Reduction vs GPU</span><span className="text-green-400">−71%</span></div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;
