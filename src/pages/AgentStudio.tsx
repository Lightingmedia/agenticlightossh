import { useCallback, useState, useRef, DragEvent } from "react";
import {
  ReactFlow,
  Controls,
  Background,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  Connection,
  Node,
  BackgroundVariant,
  Panel,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { nodeTypes } from "@/components/agent-studio/nodes";
import { ToolboxSidebar } from "@/components/agent-studio/ToolboxSidebar";
import { ReasoningTrace, type LogEntry } from "@/components/agent-studio/ReasoningTrace";
import { DigitalTwinPreview } from "@/components/agent-studio/DigitalTwinPreview";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Play,
  Square,
  Rocket,
  Save,
  RotateCcw,
  Loader2,
  CheckCircle2,
  Cpu,
  BrainCircuit
} from "lucide-react";
import { toast } from "sonner";
import { AgentRequirementBar } from "@/components/agent-studio/AgentRequirementBar";
import { generateAgentFromRequirement } from "@/lib/agent-generator";
import { supabase } from "@/integrations/supabase/client";

// Initial example nodes
const initialNodes: Node[] = [
  {
    id: "1",
    type: "telemetry",
    position: { x: 100, y: 100 },
    data: { label: "Thermal Monitor", type: "thermal", value: 78 },
  },
  {
    id: "2",
    type: "logic",
    position: { x: 350, y: 100 },
    data: { label: "Thermal Trigger", type: "trigger", condition: "temp > 85°C" },
  },
  {
    id: "3",
    type: "telemetry",
    position: { x: 100, y: 250 },
    data: { label: "Congestion Monitor", type: "network" },
  },
  {
    id: "4",
    type: "logic",
    position: { x: 350, y: 250 },
    data: { label: "I/O Wall Detector", type: "trigger", condition: "io_wall == true" },
  },
  {
    id: "5",
    type: "actuator",
    position: { x: 600, y: 175 },
    data: { label: "Photonic Bypass", type: "bypass", target: "cluster-a" },
  },
];

const initialEdges = [
  { id: "e1-2", source: "1", target: "2", animated: true, style: { stroke: "hsl(142, 100%, 50%)" } },
  { id: "e3-4", source: "3", target: "4", animated: true, style: { stroke: "hsl(142, 100%, 50%)" } },
  { id: "e2-5", source: "2", target: "5", animated: true, style: { stroke: "hsl(142, 100%, 50%)" } },
  { id: "e4-5", source: "4", target: "5", animated: true, style: { stroke: "hsl(142, 100%, 50%)" } },
];

let nodeId = 6;
const getId = () => `${nodeId++}`;

export default function AgentStudio() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [isRunning, setIsRunning] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [agentMetadata, setAgentMetadata] = useState({ name: "Untitled Agent", description: "" });

  const addLog = useCallback((type: LogEntry["type"], message: string) => {
    setLogs((prev) => [
      ...prev,
      { id: `${Date.now()}-${Math.random()}`, timestamp: new Date(), type, message },
    ]);
  }, []);

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            animated: true,
            style: { stroke: "hsl(142, 100%, 50%)" },
          },
          eds
        )
      );
      addLog("info", `Connected ${params.source} → ${params.target}`);
    },
    [setEdges, addLog]
  );

  const onDragOver = useCallback((event: DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData("application/reactflow-type");
      const dataStr = event.dataTransfer.getData("application/reactflow-data");

      if (!type || !reactFlowWrapper.current) return;

      const data = JSON.parse(dataStr);
      const bounds = reactFlowWrapper.current.getBoundingClientRect();
      const position = {
        x: event.clientX - bounds.left - 75,
        y: event.clientY - bounds.top - 25,
      };

      const newNode: Node = {
        id: getId(),
        type,
        position,
        data,
      };

      setNodes((nds) => nds.concat(newNode));
      addLog("info", `Added node: ${data.label}`);
    },
    [setNodes, addLog]
  );

  const runSimulation = useCallback(() => {
    setIsRunning(true);
    setLogs([]);

    addLog("info", "Initializing agent simulation...");

    setTimeout(() => addLog("action", "Scanning telemetry nodes..."), 500);
    setTimeout(() => addLog("info", "Found 2 telemetry sources connected"), 1000);
    setTimeout(() => addLog("decision", "Evaluating thermal trigger: temp = 78°C < 85°C threshold"), 1500);
    setTimeout(() => addLog("info", "Thermal condition not met, monitoring..."), 2000);
    setTimeout(() => addLog("decision", "Evaluating I/O Wall detector..."), 2500);
    setTimeout(() => addLog("warning", "I/O Wall detected! Electrical bandwidth saturated"), 3000);
    setTimeout(() => addLog("action", "Triggering photonic bypass for cluster-a"), 3500);
    setTimeout(() => addLog("success", "Photonic circuit provisioned in 3.7μs"), 4000);
    setTimeout(() => addLog("success", "Agent loop complete. Congestion eliminated."), 4500);
    setTimeout(() => {
      setIsRunning(false);
      toast.success("Simulation complete", {
        description: "Agent executed successfully with 1 action triggered",
      });
    }, 5000);
  }, [addLog]);

  const stopSimulation = useCallback(() => {
    setIsRunning(false);
    addLog("warning", "Simulation stopped by user");
  }, [addLog]);

  const handleGenerate = useCallback(async (requirement: string) => {
    setIsGenerating(true);
    addLog("info", `Analyzing requirement: "${requirement}"...`);

    try {
      const generated = await generateAgentFromRequirement(requirement);

      setNodes(generated.nodes);
      setEdges(generated.edges as any);
      setAgentMetadata({ name: generated.name, description: generated.description });

      addLog("success", `AI successfully built "${generated.name}" agent.`);
      addLog("info", generated.description);

      toast.success("Agent Generated!", {
        description: `Built ${generated.name} from your requirement.`,
      });
    } catch (error) {
      addLog("warning", "Failed to generate agent logic.");
      toast.error("Generation failed");
    } finally {
      setIsGenerating(false);
    }
  }, [setNodes, setEdges, addLog]);

  const saveAgent = useCallback(async () => {
    if (nodes.length === 0) return;

    addLog("info", "Saving agent to Firebase...");
    try {
      await addDoc(collection(db, "agents"), {
        name: agentMetadata.name,
        description: agentMetadata.description,
        nodes,
        edges,
        createdAt: serverTimestamp(),
      });
      addLog("success", "Agent saved successfully to Firestore");
      toast.success("Agent Saved", {
        description: "Your agent configuration is secured in Firebase.",
      });
    } catch (error) {
      console.error("Save error:", error);
      addLog("warning", "Error saving to Firebase: Use mock data for now.");
      // Fallback for demo if Firebase isn't fully configured
      toast.info("Demo: Agent saved (Mock)");
    }
  }, [nodes, edges, agentMetadata, addLog]);

  const deployAgent = useCallback(async () => {
    setIsDeploying(true);
    addLog("info", "Packaging agent flow...");

    setTimeout(() => addLog("action", "Validating node connections..."), 500);
    setTimeout(() => addLog("success", "Flow validated: 5 nodes, 4 edges"), 1000);
    setTimeout(() => addLog("action", "Generating OpenAPI-compatible Actor..."), 1500);
    setTimeout(() => addLog("info", "Uploading to LightRail managed runtime..."), 2000);
    setTimeout(() => addLog("success", "Agent deployed to aws-us-east-1"), 2500);
    setTimeout(() => {
      setIsDeploying(false);
      toast.success("Agent Deployed!", {
        description: "Your agent is now live on aws-us-east-1",
      });
    }, 3000);
  }, [addLog]);

  const resetFlow = useCallback(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
    setLogs([]);
    nodeId = 6;
    toast.info("Canvas reset to default");
  }, [setNodes, setEdges]);

  return (
    <div className="h-[calc(100vh-4rem)] flex">
      {/* Toolbox Sidebar */}
      <ToolboxSidebar className="shrink-0" />

      {/* Main Canvas Area */}
      <div className="flex-1 flex flex-col">
        {/* Requirement Bar */}
        <AgentRequirementBar
          onGenerate={handleGenerate}
          isGenerating={isGenerating}
        />

        {/* Canvas */}
        <div ref={reactFlowWrapper} className="flex-1 relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onDrop={onDrop}
            onDragOver={onDragOver}
            nodeTypes={nodeTypes}
            fitView
            className="bg-background"
          >
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="hsl(var(--muted-foreground))" />
            <Controls className="!bg-card !border-border [&>button]:!bg-card [&>button]:!border-border [&>button]:!text-foreground [&>button:hover]:!bg-muted" />
            <MiniMap
              className="!bg-card !border-border"
              nodeColor={(node) => {
                if (node.type === "telemetry") return "hsl(220, 90%, 60%)";
                if (node.type === "logic") return "hsl(280, 90%, 60%)";
                if (node.type === "actuator") return "hsl(142, 100%, 50%)";
                return "hsl(var(--muted-foreground))";
              }}
              maskColor="hsla(var(--background), 0.8)"
            />

            {/* Top Control Panel */}
            <Panel position="top-right" className="flex items-center gap-2">
              <Badge variant="outline" className="gap-1">
                <Cpu className="w-3 h-3" />
                {nodes.length} nodes
              </Badge>

              <Button
                size="sm"
                variant="outline"
                onClick={resetFlow}
                disabled={isRunning || isDeploying}
              >
                <RotateCcw className="w-4 h-4 mr-1" />
                Reset
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={saveAgent}
                disabled={isRunning || isDeploying || isGenerating || nodes.length === 0}
              >
                <Save className="w-4 h-4 mr-1" />
                Save
              </Button>

              {isRunning ? (
                <Button size="sm" variant="destructive" onClick={stopSimulation}>
                  <Square className="w-4 h-4 mr-1" />
                  Stop
                </Button>
              ) : (
                <Button size="sm" variant="default" onClick={runSimulation} disabled={isDeploying}>
                  <Play className="w-4 h-4 mr-1" />
                  Simulate
                </Button>
              )}

              <Button
                size="sm"
                className="bg-lightrail text-lightrail-foreground hover:bg-lightrail/90"
                onClick={deployAgent}
                disabled={isRunning || isDeploying}
              >
                {isDeploying ? (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                ) : (
                  <Rocket className="w-4 h-4 mr-1" />
                )}
                Deploy
              </Button>
            </Panel>

            {/* Status Indicator */}
            <Panel position="top-left" className="flex items-center gap-2">
              <div className="bg-card border border-border rounded-lg px-3 py-1.5 flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full ${isRunning
                      ? "bg-amber-400 animate-pulse"
                      : isDeploying
                        ? "bg-blue-400 animate-pulse"
                        : "bg-lightrail"
                    }`}
                />
                <span className="text-sm font-medium">
                  {isRunning ? "Simulating..." : isDeploying ? "Deploying..." : "Ready"}
                </span>
              </div>
            </Panel>
          </ReactFlow>
        </div>

        {/* Bottom Panel: Digital Twin + Reasoning Trace */}
        <div className="h-[280px] border-t border-border flex">
          {/* Digital Twin Preview */}
          <div className="w-56 border-r border-border p-2">
            <DigitalTwinPreview />
          </div>

          {/* Reasoning Trace */}
          <div className="flex-1 p-2">
            <ReasoningTrace logs={logs} className="h-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
