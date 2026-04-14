import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, TrendingUp } from "lucide-react";

interface IndustryCount { industry: string; count: number }
interface LevelCount { level: string; count: number }

const AdminAnalytics = () => {
  const [industries, setIndustries] = useState<IndustryCount[]>([]);
  const [levels, setLevels] = useState<LevelCount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data: testers } = await supabase
        .from("testers")
        .select("company_industry, management_level");

      if (testers) {
        const indMap: Record<string, number> = {};
        const lvlMap: Record<string, number> = {};
        testers.forEach(t => {
          const ind = t.company_industry || "Unknown";
          const lvl = t.management_level || "Unknown";
          indMap[ind] = (indMap[ind] || 0) + 1;
          lvlMap[lvl] = (lvlMap[lvl] || 0) + 1;
        });
        setIndustries(Object.entries(indMap).map(([industry, count]) => ({ industry, count })).sort((a, b) => b.count - a.count));
        setLevels(Object.entries(lvlMap).map(([level, count]) => ({ level, count })).sort((a, b) => b.count - a.count));
      }
      setLoading(false);
    };
    fetch();
  }, []);

  const maxInd = Math.max(...industries.map(i => i.count), 1);
  const maxLvl = Math.max(...levels.map(l => l.count), 1);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-mono text-foreground">Analytics</h1>
        <p className="text-muted-foreground mt-1">Tester demographics & platform insights</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-card/50 border-border">
          <CardHeader>
            <CardTitle className="font-mono text-lg flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" /> By Industry
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? <p className="text-muted-foreground">Loading...</p> : industries.slice(0, 12).map(i => (
              <div key={i.industry} className="space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-foreground truncate max-w-[250px]">{i.industry}</span>
                  <span className="text-muted-foreground">{i.count}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(i.count / maxInd) * 100}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border">
          <CardHeader>
            <CardTitle className="font-mono text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-cyan-400" /> By Management Level
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? <p className="text-muted-foreground">Loading...</p> : levels.map(l => (
              <div key={l.level} className="space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-foreground">{l.level}</span>
                  <span className="text-muted-foreground">{l.count}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-cyan-400 rounded-full transition-all" style={{ width: `${(l.count / maxLvl) * 100}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminAnalytics;
