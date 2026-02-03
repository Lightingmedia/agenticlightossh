import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const tools = [
  {
    id: "console",
    name: "Console",
    description: "Monitor agents, track inference metrics, and manage your fleet from a unified dashboard.",
  },
  {
    id: "cli",
    name: "CLI",
    description: "Deploy models, submit tasks, and orchestrate agents directly from your terminal.",
  },
  {
    id: "sdk",
    name: "SDK",
    description: "Python and TypeScript SDKs for seamless integration with your existing workflows.",
  },
];

const ToolingSection = () => {
  const [activeTool, setActiveTool] = useState("console");

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
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse-glow" />
            <span className="font-mono text-sm text-muted-foreground uppercase tracking-wider">
              Interface
            </span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold font-mono mb-4">
            <span className="text-foreground">EXPERIENCE </span>
            <span className="text-gradient">MODERN TOOLING</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            LightOS brings a modern, intuitive experience to AI infrastructure management.
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
          <div className="terminal-window overflow-hidden">
            {/* Window Controls */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                <div className="w-3 h-3 rounded-full bg-green-500/80" />
              </div>
              <span className="ml-4 font-mono text-xs text-muted-foreground">
                lightos-console
              </span>
            </div>

            {/* Content Area */}
            <div className="p-6 min-h-[400px] bg-gradient-to-br from-background to-card">
              <AnimatePresence mode="wait">
                {activeTool === "console" && (
                  <motion.div
                    key="console"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-6"
                  >
                    {/* Stats Row */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {[
                        { label: "Active Agents", value: "24", trend: "+3" },
                        { label: "Tasks/min", value: "1,847", trend: "+12%" },
                        { label: "Avg Latency", value: "47ms", trend: "-8ms" },
                        { label: "GPU Util", value: "78%", trend: "" },
                      ].map((stat) => (
                        <div
                          key={stat.label}
                          className="p-4 rounded-lg border border-border bg-card"
                        >
                          <div className="text-xs text-muted-foreground font-mono mb-1">
                            {stat.label}
                          </div>
                          <div className="text-2xl font-bold font-mono text-foreground">
                            {stat.value}
                            {stat.trend && (
                              <span className="text-primary text-sm ml-2">
                                {stat.trend}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Activity Log */}
                    <div className="p-4 rounded-lg border border-border bg-card">
                      <div className="text-xs text-muted-foreground font-mono mb-3">
                        LIVE ACTIVITY
                      </div>
                      <div className="space-y-2 font-mono text-sm">
                        {[
                          { time: "12:45:23", event: "Agent agent-gpu-12 completed inference batch", status: "success" },
                          { time: "12:45:21", event: "New task submitted: embedding-job-847", status: "pending" },
                          { time: "12:45:19", event: "Model llama-70b loaded on cluster-west", status: "success" },
                          { time: "12:45:15", event: "Failover triggered for agent-cpu-03", status: "warning" },
                        ].map((log, i) => (
                          <div key={i} className="flex items-center gap-3">
                            <span className="text-muted-foreground">{log.time}</span>
                            <span
                              className={`w-2 h-2 rounded-full ${
                                log.status === "success"
                                  ? "bg-primary"
                                  : log.status === "warning"
                                  ? "bg-yellow-500"
                                  : "bg-muted-foreground"
                              }`}
                            />
                            <span className="text-foreground/80">{log.event}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeTool === "cli" && (
                  <motion.div
                    key="cli"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="font-mono text-sm space-y-1"
                  >
                    <div className="text-muted-foreground">$ lightos agents list</div>
                    <div className="text-foreground pl-4">
                      <div className="text-primary">● agent-gpu-12</div>
                      <div className="pl-4 text-muted-foreground">status: active | gpu: A100 | tasks: 847</div>
                      <div className="text-primary mt-2">● agent-gpu-15</div>
                      <div className="pl-4 text-muted-foreground">status: active | gpu: H100 | tasks: 1,203</div>
                      <div className="text-yellow-500 mt-2">○ agent-cpu-03</div>
                      <div className="pl-4 text-muted-foreground">status: recovering | cpu: 32-core | tasks: 0</div>
                    </div>
                    <div className="mt-4 text-muted-foreground">$ lightos submit --model llama-70b --task "Summarize document"</div>
                    <div className="text-primary">Task submitted: task-9f8e7d6c</div>
                    <div className="text-muted-foreground">Routing to agent-gpu-15 (lowest latency)</div>
                    <div className="text-foreground mt-2">Response streaming...</div>
                  </motion.div>
                )}

                {activeTool === "sdk" && (
                  <motion.div
                    key="sdk"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="font-mono text-sm"
                  >
                    <pre className="text-foreground">
{`import { LightOS } from 'lightos';

const client = new LightOS({ apiKey: process.env.LIGHTOS_KEY });

// Submit inference task
const result = await client.inference.create({
  model: 'llama-70b',
  messages: [
    { role: 'user', content: 'Explain quantum computing' }
  ],
  stream: true
});

// Stream response
for await (const chunk of result) {
  process.stdout.write(chunk.content);
}`}
                    </pre>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Tool Selector */}
          <div className="flex justify-center gap-4 mt-6">
            {tools.map((tool) => (
              <button
                key={tool.id}
                onClick={() => setActiveTool(tool.id)}
                className={`px-6 py-3 rounded-lg font-mono text-sm transition-all ${
                  activeTool === tool.id
                    ? "bg-primary text-primary-foreground glow-primary"
                    : "bg-secondary text-secondary-foreground hover:bg-muted"
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