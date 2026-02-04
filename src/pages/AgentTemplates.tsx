import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { 
  Thermometer, 
  Zap, 
  Network, 
  Wrench, 
  DollarSign, 
  Shield,
  ArrowRight,
  Sparkles,
  Clock,
  Users
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const templates = [
  {
    id: "thermal",
    icon: Thermometer,
    name: "Thermal Management",
    description: "Real-time temperature monitoring and cooling optimization",
    benefits: [
      "Predict thermal hotspots",
      "Auto-adjust cooling systems",
      "Prevent thermal throttling"
    ],
    dataSources: ["Prometheus", "IPMI", "Webhooks"],
    color: "from-red-500/20 to-orange-500/20"
  },
  {
    id: "power",
    icon: Zap,
    name: "Power Consumption",
    description: "Track power draw and optimize energy efficiency",
    benefits: [
      "Track power by zone",
      "Predict peak demand",
      "Schedule workload shifts"
    ],
    dataSources: ["SNMP", "Job API", "Meters"],
    color: "from-yellow-500/20 to-amber-500/20"
  },
  {
    id: "network",
    icon: Network,
    name: "Network Bandwidth",
    description: "Monitor and optimize datacenter network traffic",
    benefits: [
      "Monitor interconnect traffic",
      "Manage congestion",
      "Route traffic optimally"
    ],
    dataSources: ["NetFlow", "SNMP", "DCI"],
    color: "from-blue-500/20 to-cyan-500/20"
  },
  {
    id: "equipment",
    icon: Wrench,
    name: "Equipment Health",
    description: "Predictive maintenance and failure detection",
    benefits: [
      "Monitor SMART status",
      "Predict failures early",
      "Schedule maintenance"
    ],
    dataSources: ["IPMI", "Logs", "S.M.A.R.T."],
    color: "from-green-500/20 to-emerald-500/20"
  },
  {
    id: "cost",
    icon: DollarSign,
    name: "Cost Optimization",
    description: "Track spending and recommend cost savings",
    benefits: [
      "Track cost drivers",
      "Forecast spending",
      "Recommend savings"
    ],
    dataSources: ["Billing", "Metrics", "Invoices"],
    color: "from-purple-500/20 to-violet-500/20"
  },
  {
    id: "compliance",
    icon: Shield,
    name: "Compliance & Audit",
    description: "Monitor security and compliance requirements",
    benefits: [
      "Monitor access logs",
      "Verify encryption",
      "Track data residency"
    ],
    dataSources: ["Logs", "IAM", "KMS"],
    color: "from-primary/20 to-glow-secondary/20"
  }
];

const AgentTemplates = () => {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-20 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-glow-secondary/5" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-glow-secondary/10 rounded-full blur-3xl" />
        
        <div className="container mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-3xl mx-auto"
          >
            <Badge variant="outline" className="mb-4 font-mono">
              <Sparkles className="w-3 h-3 mr-1" />
              Agent Builder
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold font-mono mb-6">
              Build Your{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-glow-secondary">
                Datacenter AI Agent
              </span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              Monitor thermal, power, compliance, and more. No coding required.
            </p>
            <div className="flex items-center justify-center gap-8 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                <span className="font-mono">100+ agents deployed</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                <span className="font-mono">&lt; 10 min to create</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Template Gallery */}
      <section className="py-16 px-4">
        <div className="container mx-auto">
          <motion.h2
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-2xl font-bold font-mono mb-8 text-center"
          >
            Choose a Template
          </motion.h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((template, index) => (
              <motion.div
                key={template.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index }}
              >
                <Card className="h-full hover:border-primary/50 transition-all duration-300 group">
                  <CardHeader>
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${template.color} flex items-center justify-center mb-3`}>
                      <template.icon className="w-6 h-6 text-foreground" />
                    </div>
                    <CardTitle className="font-mono text-lg">{template.name}</CardTitle>
                    <CardDescription>{template.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <ul className="space-y-2">
                      {template.benefits.map((benefit, i) => (
                        <li key={i} className="text-sm text-muted-foreground flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                          {benefit}
                        </li>
                      ))}
                    </ul>
                    <div className="flex flex-wrap gap-1.5">
                      {template.dataSources.map((source) => (
                        <Badge key={source} variant="secondary" className="text-xs font-mono">
                          {source}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Link to={`/dashboard/agent/new?template=${template.id}`} className="flex-1">
                        <Button className="w-full font-mono group-hover:bg-primary" size="sm">
                          Select Template
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Custom Agent */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="mt-12 text-center"
          >
            <Card className="max-w-lg mx-auto border-dashed">
              <CardContent className="py-8">
                <h3 className="text-lg font-mono font-bold mb-2">Or build your own</h3>
                <p className="text-muted-foreground mb-4">
                  Create a custom agent from scratch with full control
                </p>
                <Link to="/dashboard/agent/new">
                  <Button variant="outline" className="font-mono">
                    Create Custom Agent
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-4 bg-secondary/30">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-mono font-bold mb-2">Visual Builder</h3>
              <p className="text-sm text-muted-foreground">
                Design complex agent logic with our intuitive drag-and-drop interface
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Network className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-mono font-bold mb-2">Any Data Source</h3>
              <p className="text-sm text-muted-foreground">
                Connect Prometheus, APIs, databases, webhooks, and more
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Zap className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-mono font-bold mb-2">One-Click Deploy</h3>
              <p className="text-sm text-muted-foreground">
                Deploy to Docker, Kubernetes, or run directly with Python
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Getting Started */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold font-mono mb-8">Get started in 3 steps</h2>
          <div className="space-y-4">
            <div className="flex items-center gap-4 text-left">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-mono font-bold">
                1
              </div>
              <span className="text-muted-foreground">Select template or create custom</span>
            </div>
            <div className="flex items-center gap-4 text-left">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-mono font-bold">
                2
              </div>
              <span className="text-muted-foreground">Connect your data sources</span>
            </div>
            <div className="flex items-center gap-4 text-left">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-mono font-bold">
                3
              </div>
              <span className="text-muted-foreground">Deploy to your infrastructure</span>
            </div>
          </div>
          <Link to="/docs" className="text-primary hover:underline font-mono text-sm mt-6 inline-block">
            View full documentation →
          </Link>
        </div>
      </section>
    </div>
  );
};

export default AgentTemplates;
