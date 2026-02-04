import { useState } from "react";
import { motion } from "framer-motion";
import { 
  CheckCircle, 
  AlertCircle,
  Copy,
  Download,
  Play,
  Terminal,
  FileCode,
  Server,
  Eye,
  EyeOff,
  Rocket
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const DeployAgent = () => {
  const [deployMethod, setDeployMethod] = useState("docker");
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployProgress, setDeployProgress] = useState(0);

  const checklist = [
    { id: "name", label: "Agent name defined", status: "complete" },
    { id: "sources", label: "Data sources connected and tested", status: "complete" },
    { id: "rules", label: "Rules configured", status: "complete" },
    { id: "actions", label: "Actions defined and tested", status: "complete" },
    { id: "auth", label: "Authentication credentials saved", status: "complete" },
    { id: "review", label: "Configuration reviewed", status: "pending" },
  ];

  const envVars = [
    { key: "PROMETHEUS_URL", value: "http://prometheus:9090", required: true },
    { key: "IPMI_API_URL", value: "https://ipmi.datacenter.local/api", required: true },
    { key: "IPMI_AUTH_TOKEN", value: "sk_live_xxxxxxxxxxxxx", required: true, secret: true },
    { key: "SLACK_WEBHOOK_URL", value: "https://hooks.slack.com/...", required: false, secret: true },
    { key: "LIGHTOS_AGENT_ID", value: "thermal-agent-001", required: true },
  ];

  const dockerCompose = `version: "3.8"
services:
  thermal-agent:
    image: lightos-agent-thermal:latest
    container_name: thermal-agent
    environment:
      - PROMETHEUS_URL=\${PROMETHEUS_URL}
      - IPMI_API_URL=\${IPMI_API_URL}
      - IPMI_AUTH_TOKEN=\${IPMI_AUTH_TOKEN}
      - SLACK_WEBHOOK_URL=\${SLACK_WEBHOOK_URL}
      - LIGHTOS_AGENT_ID=\${LIGHTOS_AGENT_ID}
    restart: unless-stopped
    networks:
      - lightos-network

networks:
  lightos-network:
    driver: bridge`;

  const k8sManifest = `apiVersion: apps/v1
kind: Deployment
metadata:
  name: thermal-agent
  namespace: lightos-agents
spec:
  replicas: 1
  selector:
    matchLabels:
      app: thermal-agent
  template:
    metadata:
      labels:
        app: thermal-agent
    spec:
      containers:
      - name: thermal-agent
        image: lightos-agent-thermal:latest
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        envFrom:
        - secretRef:
            name: thermal-agent-secrets
---
apiVersion: v1
kind: Secret
metadata:
  name: thermal-agent-secrets
  namespace: lightos-agents
type: Opaque
stringData:
  PROMETHEUS_URL: "http://prometheus:9090"
  IPMI_API_URL: "https://ipmi.datacenter.local/api"
  IPMI_AUTH_TOKEN: "your-token-here"`;

  const pythonSetup = `# Install dependencies
pip install -r requirements.txt

# Set environment variables
export PROMETHEUS_URL="http://prometheus:9090"
export IPMI_API_URL="https://ipmi.datacenter.local/api"
export IPMI_AUTH_TOKEN="your-token-here"
export LIGHTOS_AGENT_ID="thermal-agent-001"

# Run the agent
python agent.py`;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const handleDeploy = () => {
    setIsDeploying(true);
    setDeployProgress(0);
    
    const interval = setInterval(() => {
      setDeployProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsDeploying(false);
          toast.success("Agent deployed successfully!", {
            description: "Your agent is now running and monitoring your infrastructure"
          });
          return 100;
        }
        return prev + 10;
      });
    }, 500);
  };

  const allChecksComplete = checklist.every(item => item.status === "complete");

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-mono">Deploy Agent</h1>
          <p className="text-muted-foreground">Generate code and deploy to your infrastructure</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Configuration Review */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="font-mono text-lg">Configuration Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Agent Name</span>
                <span className="font-mono font-bold">Thermal Monitor</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Type</span>
                <Badge>Thermal Management</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Data Sources</span>
                <span className="font-mono">3 connected</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Rules</span>
                <span className="font-mono">5 configured</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Actions</span>
                <span className="font-mono">8 defined</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Status</span>
                <Badge variant="outline" className="text-primary border-primary">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Ready
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Pre-deployment Checklist */}
          <Card>
            <CardHeader>
              <CardTitle className="font-mono text-lg">Pre-Deployment Checklist</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {checklist.map((item) => (
                <div key={item.id} className="flex items-center gap-3">
                  {item.status === "complete" ? (
                    <CheckCircle className="w-4 h-4 text-primary" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-yellow-500" />
                  )}
                  <span className={cn(
                    "text-sm",
                    item.status === "complete" ? "text-muted-foreground" : "text-foreground"
                  )}>
                    {item.label}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Environment Variables */}
          <Card>
            <CardHeader>
              <CardTitle className="font-mono text-lg">Environment Variables</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {envVars.map((env) => (
                <div key={env.key} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="font-mono text-xs">{env.key}</Label>
                    <div className="flex items-center gap-1">
                      {env.required && (
                        <Badge variant="outline" className="text-xs">Required</Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => copyToClipboard(env.value, env.key)}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      value={env.secret && !showSecrets[env.key] ? "••••••••••••" : env.value}
                      readOnly
                      className="font-mono text-xs h-8 bg-secondary/50"
                    />
                    {env.secret && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setShowSecrets({ ...showSecrets, [env.key]: !showSecrets[env.key] })}
                      >
                        {showSecrets[env.key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Deployment Options */}
        <div className="lg:col-span-2">
          <Tabs value={deployMethod} onValueChange={setDeployMethod} className="space-y-4">
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="docker" className="font-mono">
                <Server className="w-4 h-4 mr-2" />
                Docker
              </TabsTrigger>
              <TabsTrigger value="kubernetes" className="font-mono">
                <Server className="w-4 h-4 mr-2" />
                Kubernetes
              </TabsTrigger>
              <TabsTrigger value="python" className="font-mono">
                <Terminal className="w-4 h-4 mr-2" />
                Python
              </TabsTrigger>
            </TabsList>

            <TabsContent value="docker" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="font-mono text-lg flex items-center gap-2">
                    <Server className="w-5 h-5 text-primary" />
                    Deploy with Docker
                  </CardTitle>
                  <CardDescription>Run your agent in a Docker container</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Button variant="outline" className="font-mono" onClick={() => copyToClipboard(dockerCompose, "docker-compose.yml")}>
                      <Download className="w-4 h-4 mr-2" />
                      Download docker-compose.yml
                    </Button>
                    <Button variant="outline" className="font-mono">
                      <FileCode className="w-4 h-4 mr-2" />
                      View Setup Guide
                    </Button>
                  </div>

                  <div className="relative">
                    <pre className="p-4 rounded-lg bg-secondary/50 text-xs font-mono overflow-x-auto">
                      {dockerCompose}
                    </pre>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2"
                      onClick={() => copyToClipboard(dockerCompose, "docker-compose.yml")}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Run commands</Label>
                    <div className="p-4 rounded-lg bg-secondary/50 font-mono text-sm space-y-1">
                      <div className="text-primary">$ docker-compose up -d</div>
                      <div className="text-primary">$ docker-compose logs -f</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="kubernetes" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="font-mono text-lg flex items-center gap-2">
                    <Server className="w-5 h-5 text-primary" />
                    Deploy to Kubernetes
                  </CardTitle>
                  <CardDescription>Run your agent in a Kubernetes cluster</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Namespace</Label>
                      <Input defaultValue="lightos-agents" className="font-mono" />
                    </div>
                    <div className="space-y-2">
                      <Label>Replicas</Label>
                      <Input type="number" defaultValue="1" className="font-mono" />
                    </div>
                    <div className="space-y-2">
                      <Label>CPU Limit</Label>
                      <Input defaultValue="500m" className="font-mono" />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" className="font-mono" onClick={() => copyToClipboard(k8sManifest, "Kubernetes manifest")}>
                      <Download className="w-4 h-4 mr-2" />
                      Download Manifests
                    </Button>
                  </div>

                  <div className="relative">
                    <pre className="p-4 rounded-lg bg-secondary/50 text-xs font-mono overflow-x-auto max-h-64">
                      {k8sManifest}
                    </pre>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2"
                      onClick={() => copyToClipboard(k8sManifest, "Kubernetes manifest")}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Apply commands</Label>
                    <div className="p-4 rounded-lg bg-secondary/50 font-mono text-sm space-y-1">
                      <div className="text-primary">$ kubectl apply -f agent-deployment.yaml</div>
                      <div className="text-primary">$ kubectl get pods -n lightos-agents</div>
                      <div className="text-primary">$ kubectl logs -f deployment/thermal-agent</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="python" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="font-mono text-lg flex items-center gap-2">
                    <Terminal className="w-5 h-5 text-primary" />
                    Run with Python
                  </CardTitle>
                  <CardDescription>Install and run the agent directly</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Button variant="outline" className="font-mono">
                      <Download className="w-4 h-4 mr-2" />
                      Download agent.py
                    </Button>
                    <Button variant="outline" className="font-mono">
                      <Download className="w-4 h-4 mr-2" />
                      Download requirements.txt
                    </Button>
                  </div>

                  <div className="relative">
                    <pre className="p-4 rounded-lg bg-secondary/50 text-xs font-mono overflow-x-auto">
                      {pythonSetup}
                    </pre>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2"
                      onClick={() => copyToClipboard(pythonSetup, "Setup commands")}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Pre-deployment Test */}
          <Card className="mt-6">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Play className="w-5 h-5 text-primary" />
                  <div>
                    <h4 className="font-mono font-medium">Pre-Deployment Tests</h4>
                    <p className="text-xs text-muted-foreground">Test all connections before deploying</p>
                  </div>
                </div>
                <Button variant="outline" className="font-mono">
                  <Play className="w-4 h-4 mr-2" />
                  Test All Connections
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Deploy Button */}
          <Dialog>
            <DialogTrigger asChild>
              <Button 
                className="w-full mt-6 font-mono h-12 text-lg" 
                size="lg"
                disabled={!allChecksComplete}
              >
                <Rocket className="w-5 h-5 mr-2" />
                Deploy Agent
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="font-mono">Ready to deploy?</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="text-muted-foreground">Deployment method:</div>
                  <div className="font-mono capitalize">{deployMethod}</div>
                  <div className="text-muted-foreground">Agent name:</div>
                  <div className="font-mono">Thermal Monitor</div>
                  <div className="text-muted-foreground">Data sources:</div>
                  <div className="font-mono">3</div>
                  <div className="text-muted-foreground">Rules:</div>
                  <div className="font-mono">5</div>
                  <div className="text-muted-foreground">Actions:</div>
                  <div className="font-mono">8</div>
                </div>

                {isDeploying && (
                  <div className="space-y-2">
                    <Progress value={deployProgress} className="h-2" />
                    <p className="text-xs text-center text-muted-foreground">
                      Deploying... {deployProgress}%
                    </p>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" className="font-mono">Cancel</Button>
                <Button className="font-mono" onClick={handleDeploy} disabled={isDeploying}>
                  {isDeploying ? "Deploying..." : "Deploy"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
};

export default DeployAgent;
