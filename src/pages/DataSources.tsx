import { useState } from "react";
import { motion } from "framer-motion";
import { 
  Database, 
  Globe, 
  Webhook, 
  Activity,
  Plus,
  Check,
  X,
  RefreshCw,
  Edit,
  Trash2,
  Copy,
  Eye,
  EyeOff
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";

interface DataSource {
  id: string;
  name: string;
  url: string;
  status: "connected" | "error" | "pending";
  lastCheck: string;
  type: string;
}

const DataSources = () => {
  const [prometheusTargets, setPrometheusTargets] = useState<DataSource[]>([
    { id: "1", name: "GPU Metrics", url: "http://prometheus:9090", status: "connected", lastCheck: "2s ago", type: "prometheus" },
    { id: "2", name: "Node Exporter", url: "http://node-exporter:9100", status: "connected", lastCheck: "5s ago", type: "prometheus" },
  ]);

  const [apiEndpoints, setApiEndpoints] = useState<DataSource[]>([
    { id: "1", name: "IPMI Controller", url: "https://ipmi.datacenter.local/api", status: "connected", lastCheck: "10s ago", type: "api" },
  ]);

  const [databases, setDatabases] = useState<DataSource[]>([
    { id: "1", name: "Metrics DB", url: "postgresql://metrics-db:5432", status: "connected", lastCheck: "30s ago", type: "database" },
  ]);

  const [showToken, setShowToken] = useState(false);
  const webhookUrl = "https://lightos.api/webhook/abc123xyz";
  const webhookToken = "sk_live_xxxxxxxxxxxxxxxxxxxx";

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "connected":
        return <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />;
      case "error":
        return <span className="w-2 h-2 rounded-full bg-red-500" />;
      default:
        return <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />;
    }
  };

  const DataSourceCard = ({ source, onTest, onDelete }: { source: DataSource; onTest: () => void; onDelete: () => void }) => (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 rounded-lg border border-border bg-card/50 hover:border-primary/30 transition-all"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          {getStatusIcon(source.status)}
          <div>
            <h4 className="font-mono font-medium text-foreground">{source.name}</h4>
            <p className="text-xs text-muted-foreground font-mono truncate max-w-xs">{source.url}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onTest}>
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Edit className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-500" onClick={onDelete}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Check className="w-3 h-3 text-primary" />
          Last checked: {source.lastCheck}
        </span>
        <Badge variant="secondary" className="text-xs">{source.status}</Badge>
      </div>
    </motion.div>
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-mono">Data Sources</h1>
          <p className="text-muted-foreground">Configure where your agent gets its data</p>
        </div>
      </div>

      <Tabs defaultValue="prometheus" className="space-y-4">
        <TabsList className="bg-secondary/50">
          <TabsTrigger value="prometheus" className="font-mono">
            <Activity className="w-4 h-4 mr-2" />
            Prometheus
          </TabsTrigger>
          <TabsTrigger value="apis" className="font-mono">
            <Globe className="w-4 h-4 mr-2" />
            APIs
          </TabsTrigger>
          <TabsTrigger value="databases" className="font-mono">
            <Database className="w-4 h-4 mr-2" />
            Databases
          </TabsTrigger>
          <TabsTrigger value="webhooks" className="font-mono">
            <Webhook className="w-4 h-4 mr-2" />
            Webhooks
          </TabsTrigger>
        </TabsList>

        {/* Prometheus Tab */}
        <TabsContent value="prometheus" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="font-mono text-lg flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" />
                Prometheus Scrape Targets
              </CardTitle>
              <CardDescription>Add Prometheus endpoints to collect metrics</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {prometheusTargets.map((target) => (
                <DataSourceCard 
                  key={target.id} 
                  source={target}
                  onTest={() => toast.success("Connection test successful")}
                  onDelete={() => setPrometheusTargets(prev => prev.filter(t => t.id !== target.id))}
                />
              ))}
              
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full font-mono border-dashed">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Prometheus Target
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="font-mono">Add Prometheus Target</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label>Target URL</Label>
                      <Input placeholder="http://prometheus:9090" className="font-mono" />
                    </div>
                    <div className="space-y-2">
                      <Label>Labels (optional)</Label>
                      <Input placeholder="env=prod, dc=us-east1" className="font-mono" />
                    </div>
                    <div className="space-y-2">
                      <Label>Poll Interval</Label>
                      <Select defaultValue="30s">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="10s">10 seconds</SelectItem>
                          <SelectItem value="30s">30 seconds</SelectItem>
                          <SelectItem value="60s">60 seconds</SelectItem>
                          <SelectItem value="5m">5 minutes</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex gap-2 pt-4">
                      <Button variant="outline" className="flex-1 font-mono">
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Test Connection
                      </Button>
                      <Button className="flex-1 font-mono">Save</Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </TabsContent>

        {/* APIs Tab */}
        <TabsContent value="apis" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="font-mono text-lg flex items-center gap-2">
                <Globe className="w-5 h-5 text-primary" />
                API Endpoints
              </CardTitle>
              <CardDescription>Connect to REST APIs for data collection</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {apiEndpoints.map((endpoint) => (
                <DataSourceCard 
                  key={endpoint.id} 
                  source={endpoint}
                  onTest={() => toast.success("API connection successful")}
                  onDelete={() => setApiEndpoints(prev => prev.filter(e => e.id !== endpoint.id))}
                />
              ))}
              
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full font-mono border-dashed">
                    <Plus className="w-4 h-4 mr-2" />
                    Add API Endpoint
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="font-mono">Add API Endpoint</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label>API Name</Label>
                      <Input placeholder="IPMI Controller" className="font-mono" />
                    </div>
                    <div className="space-y-2">
                      <Label>URL</Label>
                      <Input placeholder="https://api.example.com/v1" className="font-mono" />
                    </div>
                    <div className="space-y-2">
                      <Label>HTTP Method</Label>
                      <Select defaultValue="GET">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="GET">GET</SelectItem>
                          <SelectItem value="POST">POST</SelectItem>
                          <SelectItem value="PUT">PUT</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Authentication</Label>
                      <Select defaultValue="bearer">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          <SelectItem value="bearer">Bearer Token</SelectItem>
                          <SelectItem value="apikey">API Key</SelectItem>
                          <SelectItem value="basic">Basic Auth</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex gap-2 pt-4">
                      <Button variant="outline" className="flex-1 font-mono">
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Test Connection
                      </Button>
                      <Button className="flex-1 font-mono">Save</Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Databases Tab */}
        <TabsContent value="databases" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="font-mono text-lg flex items-center gap-2">
                <Database className="w-5 h-5 text-primary" />
                Database Connections
              </CardTitle>
              <CardDescription>Connect to PostgreSQL, MySQL, and other databases</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {databases.map((db) => (
                <DataSourceCard 
                  key={db.id} 
                  source={db}
                  onTest={() => toast.success("Database connection successful")}
                  onDelete={() => setDatabases(prev => prev.filter(d => d.id !== db.id))}
                />
              ))}
              
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full font-mono border-dashed">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Database
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="font-mono">Add Database Connection</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label>Database Type</Label>
                      <Select defaultValue="postgresql">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="postgresql">PostgreSQL</SelectItem>
                          <SelectItem value="mysql">MySQL</SelectItem>
                          <SelectItem value="mongodb">MongoDB</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Host</Label>
                        <Input placeholder="localhost" className="font-mono" />
                      </div>
                      <div className="space-y-2">
                        <Label>Port</Label>
                        <Input placeholder="5432" className="font-mono" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Database Name</Label>
                      <Input placeholder="metrics" className="font-mono" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Username</Label>
                        <Input placeholder="postgres" className="font-mono" />
                      </div>
                      <div className="space-y-2">
                        <Label>Password</Label>
                        <Input type="password" className="font-mono" />
                      </div>
                    </div>
                    <div className="flex gap-2 pt-4">
                      <Button variant="outline" className="flex-1 font-mono">
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Test Connection
                      </Button>
                      <Button className="flex-1 font-mono">Save</Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Webhooks Tab */}
        <TabsContent value="webhooks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="font-mono text-lg flex items-center gap-2">
                <Webhook className="w-5 h-5 text-primary" />
                Webhook Endpoint
              </CardTitle>
              <CardDescription>Receive real-time data via webhooks</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label className="text-muted-foreground">Webhook URL</Label>
                <div className="flex gap-2">
                  <Input 
                    value={webhookUrl} 
                    readOnly 
                    className="font-mono text-sm bg-secondary/50" 
                  />
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => copyToClipboard(webhookUrl, "Webhook URL")}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground">Authorization Token</Label>
                <div className="flex gap-2">
                  <Input 
                    value={showToken ? webhookToken : "••••••••••••••••••••"} 
                    readOnly 
                    className="font-mono text-sm bg-secondary/50" 
                  />
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => setShowToken(!showToken)}
                  >
                    {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => copyToClipboard(webhookToken, "Token")}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-secondary/30 border border-border">
                <h4 className="font-mono font-medium mb-2">Example Payload</h4>
                <pre className="text-xs text-muted-foreground overflow-x-auto">
{`{
  "timestamp": "2026-02-04T12:00:00Z",
  "metric": "temperature",
  "value": 72.5,
  "unit": "celsius",
  "source": "gpu-node-01"
}`}
                </pre>
              </div>

              <Button variant="outline" className="w-full font-mono">
                <RefreshCw className="w-4 h-4 mr-2" />
                Send Test Payload
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DataSources;
