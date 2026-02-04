import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { 
  Thermometer, 
  Zap, 
  Network, 
  Wrench,
  ExternalLink,
  Github,
  Play,
  Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Header from "@/components/landing/Header";
import Footer from "@/components/landing/Footer";

const examples = [
  {
    id: "thermal-basic",
    title: "Basic Thermal Monitor",
    description: "Monitor GPU temperatures and trigger cooling adjustments when thresholds are exceeded",
    difficulty: "Beginner",
    time: "10 min",
    icon: Thermometer,
    tags: ["Prometheus", "Webhooks"],
    color: "from-red-500/20 to-orange-500/20"
  },
  {
    id: "thermal-predictive",
    title: "Predictive Thermal Management",
    description: "Use ML to predict thermal hotspots 15 minutes in advance and proactively adjust cooling",
    difficulty: "Advanced",
    time: "30 min",
    icon: Thermometer,
    tags: ["Prometheus", "ML", "Webhooks"],
    color: "from-red-500/20 to-orange-500/20"
  },
  {
    id: "power-basic",
    title: "Power Consumption Tracker",
    description: "Track power draw by zone and alert when approaching capacity limits",
    difficulty: "Beginner",
    time: "15 min",
    icon: Zap,
    tags: ["SNMP", "Database"],
    color: "from-yellow-500/20 to-amber-500/20"
  },
  {
    id: "power-optimizer",
    title: "Workload Power Optimizer",
    description: "Automatically schedule workloads to minimize power costs during peak hours",
    difficulty: "Intermediate",
    time: "25 min",
    icon: Zap,
    tags: ["SNMP", "Job API", "Scheduler"],
    color: "from-yellow-500/20 to-amber-500/20"
  },
  {
    id: "network-monitor",
    title: "Network Bandwidth Monitor",
    description: "Monitor datacenter interconnect traffic and manage congestion automatically",
    difficulty: "Intermediate",
    time: "20 min",
    icon: Network,
    tags: ["NetFlow", "SNMP"],
    color: "from-blue-500/20 to-cyan-500/20"
  },
  {
    id: "equipment-health",
    title: "Predictive Maintenance",
    description: "Monitor SMART status and predict disk failures before they happen",
    difficulty: "Intermediate",
    time: "20 min",
    icon: Wrench,
    tags: ["IPMI", "S.M.A.R.T."],
    color: "from-green-500/20 to-emerald-500/20"
  }
];

const getDifficultyColor = (difficulty: string) => {
  switch (difficulty) {
    case "Beginner": return "bg-green-500/10 text-green-400 border-green-500/30";
    case "Intermediate": return "bg-yellow-500/10 text-yellow-400 border-yellow-500/30";
    case "Advanced": return "bg-red-500/10 text-red-400 border-red-500/30";
    default: return "bg-muted text-muted-foreground";
  }
};

const Examples = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-32 pb-20">
        {/* Hero */}
        <section className="container mx-auto px-4 text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-4xl md:text-5xl font-bold font-mono mb-4">
              Example Agents
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Learn from real-world examples and get started quickly
            </p>
            <div className="flex justify-center gap-4">
              <Button variant="outline" className="font-mono">
                <Github className="w-4 h-4 mr-2" />
                View on GitHub
              </Button>
              <Link to="/dashboard/templates">
                <Button className="font-mono">
                  Browse Templates
                </Button>
              </Link>
            </div>
          </motion.div>
        </section>

        {/* Examples Grid */}
        <section className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {examples.map((example, index) => (
              <motion.div
                key={example.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="h-full hover:border-primary/50 transition-colors group">
                  <CardHeader>
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${example.color} flex items-center justify-center mb-3`}>
                      <example.icon className="w-6 h-6 text-foreground" />
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className={getDifficultyColor(example.difficulty)}>
                        {example.difficulty}
                      </Badge>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {example.time}
                      </span>
                    </div>
                    <CardTitle className="font-mono text-lg">{example.title}</CardTitle>
                    <CardDescription>{example.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-wrap gap-1.5">
                      {example.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs font-mono">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" className="flex-1 font-mono" size="sm">
                        <ExternalLink className="w-4 h-4 mr-2" />
                        View Code
                      </Button>
                      <Link to={`/dashboard/agent/new?example=${example.id}`} className="flex-1">
                        <Button className="w-full font-mono" size="sm">
                          <Play className="w-4 h-4 mr-2" />
                          Try It
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Submit Example CTA */}
        <section className="container mx-auto px-4 mt-16">
          <Card className="bg-secondary/30 border-dashed">
            <CardContent className="py-8 text-center">
              <h3 className="text-xl font-mono font-bold mb-2">Have an example to share?</h3>
              <p className="text-muted-foreground mb-4">
                Contribute your agent configurations to help the community
              </p>
              <Button variant="outline" className="font-mono">
                <Github className="w-4 h-4 mr-2" />
                Submit an Example
              </Button>
            </CardContent>
          </Card>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Examples;
