import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const tools = [
  {
    id: "dashboard",
    name: "Dashboard",
    description: "Visual control center for your entire AI infrastructure.",
  },
  {
    id: "terminal",
    name: "Terminal",
    description: "Power-user CLI for rapid deployment and debugging.",
  },
  {
    id: "api",
    name: "API",
    description: "RESTful and WebSocket APIs for seamless integration.",
  },
];

const ToolingSection = () => {
  const [activeTool, setActiveTool] = useState("dashboard");

  return (
    <section className="py-24 border-t border-border">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 mb-4 px-3 py-1 rounded-full border border-border bg-card/50">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            <span className="font-mono text-xs text-muted-foreground uppercase tracking-wider">
              Developer Experience
            </span>
          </div>
          <h2 className="text-3xl md:text-5xl font-bold font-mono mb-4">
            <span className="text-foreground">Built for </span>
            <span className="text-gradient">Speed & Clarity</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Whether you prefer a visual interface or live in the terminal, LightOS meets you where you work.
          </p>
        </motion.div>

        {/* Tool Preview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative"
        >
          {/* Terminal Window */}
          <div className="terminal-window overflow-hidden max-w-5xl mx-auto">
            {/* Window Controls */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-card/50">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/70" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
                <div className="w-3 h-3 rounded-full bg-green-500/70" />
              </div>
              <span className="ml-4 font-mono text-xs text-muted-foreground">
                lightos — {activeTool}
              </span>
            </div>

            {/* Content Area */}
            <div className="p-6 min-h-[420px] bg-gradient-to-br from-background via-card/50 to-background">
              <AnimatePresence mode="wait">
                {activeTool === "dashboard" && (
                  <motion.div
                    key="dashboard"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-6"
                  >
                    {/* Stats Row */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {[
                        { label: "Connected Nodes", value: "18", change: "+2 today" },
                        { label: "Requests/sec", value: "2,341", change: "↑ 15%" },
                        { label: "P95 Latency", value: "34ms", change: "↓ 12ms" },
                        { label: "Active Models", value: "7", change: "" },
                      ].map((stat) => (
                        <div
                          key={stat.label}
                          className="p-4 rounded-lg border border-border bg-card/40"
                        >
                          <div className="text-xs text-muted-foreground font-mono mb-1">
                            {stat.label}
                          </div>
                          <div className="text-2xl font-bold font-mono text-foreground">
                            {stat.value}
                          </div>
                          {stat.change && (
                            <div className="text-xs text-primary mt-1">{stat.change}</div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Recent Activity */}
                    <div className="p-4 rounded-lg border border-border bg-card/40">
                      <div className="text-xs text-muted-foreground font-mono mb-3 uppercase tracking-wider">
                        Recent Activity
                      </div>
                      <div className="space-y-3 font-mono text-sm">
                        {[
                          { time: "2s ago", event: "Inference completed on node-gpu-7", type: "success" },
                          { time: "8s ago", event: "New agent registered: worker-east-12", type: "info" },
                          { time: "15s ago", event: "Model mistral-7b deployed to cluster", type: "success" },
                          { time: "1m ago", event: "Auto-scaling triggered for high load", type: "warning" },
                        ].map((log, i) => (
                          <div key={i} className="flex items-center gap-3">
                            <span className="text-muted-foreground text-xs w-16">{log.time}</span>
                            <span
                              className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                log.type === "success"
                                  ? "bg-primary"
                                  : log.type === "warning"
                                  ? "bg-amber-500"
                                  : "bg-blue-500"
                              }`}
                            />
                            <span className="text-foreground/80 truncate">{log.event}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeTool === "terminal" && (
                  <motion.div
                    key="terminal"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="font-mono text-sm space-y-2"
                  >
                    <div><span className="text-muted-foreground">$</span> <span className="text-foreground">lightos nodes ls</span></div>
                    <div className="pl-4 text-muted-foreground">
                      <div className="grid grid-cols-4 gap-4 text-xs uppercase mb-2 border-b border-border pb-2">
                        <span>Name</span><span>Status</span><span>GPU</span><span>Tasks</span>
                      </div>
                      <div className="grid grid-cols-4 gap-4"><span className="text-primary">node-gpu-7</span><span className="text-green-400">● online</span><span>A100 80GB</span><span>142</span></div>
                      <div className="grid grid-cols-4 gap-4"><span className="text-primary">node-gpu-12</span><span className="text-green-400">● online</span><span>H100</span><span>89</span></div>
                      <div className="grid grid-cols-4 gap-4"><span className="text-primary">node-cpu-3</span><span className="text-amber-400">● busy</span><span>—</span><span>234</span></div>
                    </div>
                    <div className="pt-4"><span className="text-muted-foreground">$</span> <span className="text-foreground">lightos deploy --model llama-3.1-70b</span></div>
                    <div className="text-primary pl-4">✓ Model queued for deployment</div>
                    <div className="text-muted-foreground pl-4">Routing to node-gpu-7 (best match)</div>
                    <div className="text-foreground pl-4 pt-2">Deployment complete in 3.2s</div>
                  </motion.div>
                )}

                {activeTool === "api" && (
                  <motion.div
                    key="api"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="font-mono text-sm"
                  >
                    <pre className="text-foreground overflow-x-auto">
{`import LightOS from '@lightos/sdk';

const client = new LightOS({
  apiKey: process.env.LIGHTOS_API_KEY
});

// Create an inference request
const response = await client.inference.create({
  model: 'llama-3.1-70b',
  messages: [
    { role: 'user', content: 'Explain distributed systems' }
  ],
  temperature: 0.7,
  stream: true
});

// Handle streaming response
for await (const chunk of response) {
  console.log(chunk.delta.content);
}`}
                    </pre>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Tool Selector */}
          <div className="flex justify-center gap-3 mt-6">
            {tools.map((tool) => (
              <button
                key={tool.id}
                onClick={() => setActiveTool(tool.id)}
                className={`px-5 py-2.5 rounded-lg font-mono text-sm transition-all ${
                  activeTool === tool.id
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                    : "bg-card border border-border text-muted-foreground hover:text-foreground hover:border-primary/40"
                }`}
              >
                {tool.name}
              </button>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default ToolingSection;