import { Node, Edge } from "@xyflow/react";
import { GoogleGenerativeAI } from "@google/generative-ai";

export interface GeneratedAgent {
    nodes: Node[];
    edges: Edge[];
    name: string;
    description: string;
}

const BASE_X = 100;
const BASE_Y = 100;

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

export async function generateAgentFromRequirement(requirement: string): Promise<GeneratedAgent> {
    // If API key is missing, fallback to heuristic logic
    if (!import.meta.env.VITE_GEMINI_API_KEY) {
        console.warn("Gemini API key missing, using heuristic fallback.");
        return heuristicFallback(requirement);
    }

    const prompt = `
    You are an expert in Photonic Computing and Agentic AI. 
    Build a specialized agent loop for a Photonic Fabric OS based on this requirement: "${requirement}".
    
    The agent must consist of:
    1. Telemetry Nodes (Inputs: thermal, power, network, gpu)
    2. Logic Blocks (Processing: trigger, predictor, guardrail)
    3. Photonic Actuators (Actions: circuit, bypass, reconfigure, alert)
    
    Return ONLY a JSON object with this structure:
    {
      "name": "Short Name",
      "description": "One sentence description",
      "nodes": [
        { "id": "1", "type": "telemetry", "position": { "x": 100, "y": 100 }, "data": { "label": "Label", "type": "thermal|power|network|gpu" } },
        ...
      ],
      "edges": [
        { "id": "e1-2", "source": "1", "target": "2", "animated": true, "style": { "stroke": "hsl(142, 100%, 50%)" } },
        ...
      ]
    }
    
    Ensure nodes are logically connected and positioned correctly along the X axis (X: 100 -> 350 -> 600).
    Keep it to 3-5 nodes. Use unique numeric IDs for nodes.
  `;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Extract JSON from potential markdown blocks
        const jsonStr = text.match(/\{[\s\S]*\}/)?.[0] || text;
        return JSON.parse(jsonStr) as GeneratedAgent;
    } catch (error) {
        console.error("Gemini Generation Error:", error);
        return heuristicFallback(requirement);
    }
}

async function heuristicFallback(requirement: string): Promise<GeneratedAgent> {
    // Simulate AI logic processing time
    await new Promise(resolve => setTimeout(resolve, 1500));

    const lowerReq = requirement.toLowerCase();

    if (lowerReq.includes("inference") || lowerReq.includes("aws")) {
        return {
            name: "Inference Optimizer",
            description: "Optimizes inference workloads by bypassing electrical I/O congestion.",
            nodes: [
                {
                    id: "gen-1",
                    type: "telemetry",
                    position: { x: BASE_X, y: BASE_Y },
                    data: { label: "GPU Load Monitor", type: "gpu" },
                },
                {
                    id: "gen-2",
                    type: "logic",
                    position: { x: BASE_X + 250, y: BASE_Y },
                    data: { label: "I/O Wall Detector", type: "trigger", condition: "utilization > 85%" },
                },
                {
                    id: "gen-3",
                    type: "actuator",
                    position: { x: BASE_X + 500, y: BASE_Y },
                    data: { label: "Photonic Bypass", type: "bypass", target: "Inference Core" },
                },
            ],
            edges: [
                { id: "e-gen-1-2", source: "gen-1", target: "gen-2", animated: true, style: { stroke: "hsl(142, 100%, 50%)" } },
                { id: "e-gen-2-3", source: "gen-2", target: "gen-3", animated: true, style: { stroke: "hsl(142, 100%, 50%)" } },
            ],
        };
    }

    if (lowerReq.includes("power") || lowerReq.includes("energy") || lowerReq.includes("azure")) {
        return {
            name: "Power Saver Agent",
            description: "Actively manages power draw based on workload priorities.",
            nodes: [
                {
                    id: "gen-1",
                    type: "telemetry",
                    position: { x: BASE_X, y: BASE_Y },
                    data: { label: "Power Sensor", type: "power" },
                },
                {
                    id: "gen-2",
                    type: "logic",
                    position: { x: BASE_X + 250, y: BASE_Y },
                    data: { label: "Load Balancer", type: "predictor" },
                },
                {
                    id: "gen-3",
                    type: "actuator",
                    position: { x: BASE_X + 500, y: BASE_Y },
                    data: { label: "Alert Dispatcher", type: "alert", message: "Power threshold reached" },
                },
            ],
            edges: [
                { id: "e-gen-1-2", source: "gen-1", target: "gen-2", animated: true, style: { stroke: "hsl(142, 100%, 50%)" } },
                { id: "e-gen-2-3", source: "gen-2", target: "gen-3", animated: true, style: { stroke: "hsl(142, 100%, 50%)" } },
            ],
        };
    }

    // Default Thermal Guard Agent
    return {
        name: "Thermal Guard Agent",
        description: "Monitors cluster thermals and triggers cooling reconfigurations.",
        nodes: [
            {
                id: "gen-1",
                type: "telemetry",
                position: { x: BASE_X, y: BASE_Y },
                data: { label: "Thermal Monitor", type: "thermal" },
            },
            {
                id: "gen-2",
                type: "logic",
                position: { x: BASE_X + 250, y: BASE_Y },
                data: { label: "Temp Guard", type: "trigger", condition: "temp > 75C" },
            },
            {
                id: "gen-3",
                type: "actuator",
                position: { x: BASE_X + 500, y: BASE_Y },
                data: { label: "Topology Reconfig", type: "reconfigure" },
            },
        ],
        edges: [
            { id: "e-gen-1-2", source: "gen-1", target: "gen-2", animated: true, style: { stroke: "hsl(142, 100%, 50%)" } },
            { id: "e-gen-2-3", source: "gen-2", target: "gen-3", animated: true, style: { stroke: "hsl(142, 100%, 50%)" } },
        ],
    };
}
