import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { 
  Book, 
  Code, 
  Zap, 
  Shield, 
  Server, 
  Bot,
  ArrowRight,
  ExternalLink,
  Search
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import Header from "@/components/landing/Header";
import Footer from "@/components/landing/Footer";

const docSections = [
  {
    icon: Book,
    title: "Getting Started",
    description: "Learn the basics of LightOS and create your first agent",
    links: [
      { title: "Quick Start Guide", href: "#" },
      { title: "Installation", href: "#" },
      { title: "First Agent Tutorial", href: "#" },
      { title: "Core Concepts", href: "#" }
    ]
  },
  {
    icon: Bot,
    title: "Agent Templates",
    description: "Pre-built templates for common datacenter use cases",
    links: [
      { title: "Thermal Management", href: "#" },
      { title: "Power Optimization", href: "#" },
      { title: "Network Monitoring", href: "#" },
      { title: "Equipment Health", href: "#" }
    ]
  },
  {
    icon: Code,
    title: "Data Sources",
    description: "Connect to various data sources for your agents",
    links: [
      { title: "Prometheus Integration", href: "#" },
      { title: "REST API Connections", href: "#" },
      { title: "Database Connections", href: "#" },
      { title: "Webhooks", href: "#" }
    ]
  },
  {
    icon: Zap,
    title: "Rules & Actions",
    description: "Define logic and actions for your agents",
    links: [
      { title: "Rule Builder Guide", href: "#" },
      { title: "Action Types", href: "#" },
      { title: "Condition Operators", href: "#" },
      { title: "Variables & Templates", href: "#" }
    ]
  },
  {
    icon: Server,
    title: "Deployment",
    description: "Deploy agents to your infrastructure",
    links: [
      { title: "Docker Deployment", href: "#" },
      { title: "Kubernetes Deployment", href: "#" },
      { title: "Direct Python Run", href: "#" },
      { title: "Environment Variables", href: "#" }
    ]
  },
  {
    icon: Shield,
    title: "Security",
    description: "Security best practices and configuration",
    links: [
      { title: "Authentication", href: "#" },
      { title: "API Key Management", href: "#" },
      { title: "Rate Limiting", href: "#" },
      { title: "Audit Logs", href: "#" }
    ]
  }
];

const Docs = () => {
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
              Documentation
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Everything you need to build, deploy, and manage datacenter AI agents
            </p>
            <div className="max-w-xl mx-auto relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input 
                placeholder="Search documentation..." 
                className="pl-12 h-12 text-lg font-mono"
              />
            </div>
          </motion.div>
        </section>

        {/* Quick Links */}
        <section className="container mx-auto px-4 mb-16">
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/dashboard/templates">
              <Button variant="outline" className="font-mono">
                <Bot className="w-4 h-4 mr-2" />
                Agent Templates
              </Button>
            </Link>
            <Button variant="outline" className="font-mono">
              <ExternalLink className="w-4 h-4 mr-2" />
              API Reference
            </Button>
            <Button variant="outline" className="font-mono">
              <Code className="w-4 h-4 mr-2" />
              Examples
            </Button>
          </div>
        </section>

        {/* Documentation Sections */}
        <section className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {docSections.map((section, index) => (
              <motion.div
                key={section.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="h-full hover:border-primary/50 transition-colors">
                  <CardHeader>
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                      <section.icon className="w-5 h-5 text-primary" />
                    </div>
                    <CardTitle className="font-mono">{section.title}</CardTitle>
                    <CardDescription>{section.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {section.links.map((link) => (
                        <li key={link.title}>
                          <a 
                            href={link.href}
                            className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-2 group"
                          >
                            <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                            {link.title}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Help Section */}
        <section className="container mx-auto px-4 mt-16">
          <Card className="bg-secondary/30 border-dashed">
            <CardContent className="py-8 text-center">
              <h3 className="text-xl font-mono font-bold mb-2">Need help?</h3>
              <p className="text-muted-foreground mb-4">
                Join our community or reach out to support
              </p>
              <div className="flex justify-center gap-4">
                <Button variant="outline" className="font-mono">
                  Join Discord
                </Button>
                <Button variant="outline" className="font-mono">
                  GitHub Issues
                </Button>
                <Button className="font-mono">
                  Contact Support
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Docs;
