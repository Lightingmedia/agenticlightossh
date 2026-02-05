import { Node, Edge } from "@xyflow/react";

export interface GeneratedAgent {
    nodes: Node[];
    edges: Edge[];
    name: string;
    description: string;
}

const BASE_X = 100;
const BASE_Y = 100;

export async function generateAgentFromRequirement(requirement: string): Promise<GeneratedAgent> {
    // Simulate AI logic processing time
    await new Promise(resolve => setTimeout(resolve, 2000));

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

    if (lowerReq.includes("cost") || lowerReq.includes("roi") || lowerReq.includes("financial")) {
        return {
            name: "Financial Optimizer",
            description: "Maximizes ROI by shifting workloads to low-cost photonic circuits during peak times.",
            nodes: [
                {
                    id: "gen-1",
                    type: "telemetry",
                    position: { x: BASE_X, y: BASE_Y },
                    data: { label: "Rate Monitor", type: "power" },
                },
                {
                    id: "gen-2",
                    type: "logic",
                    position: { x: BASE_X + 250, y: BASE_Y },
                    data: { label: "ROI Analyzer", type: "guardrail" },
                },
                {
                    id: "gen-3",
                    type: "actuator",
                    position: { x: BASE_X + 500, y: BASE_Y },
                    data: { label: "Circuit Provisioner", type: "circuit" },
                },
            ],
            edges: [
                { id: "e-gen-1-2", source: "gen-1", target: "gen-2", animated: true, style: { stroke: "hsl(142, 100%, 50%)" } },
                { id: "e-gen-2-3", source: "gen-2", target: "gen-3", animated: true, style: { stroke: "hsl(142, 100%, 50%)" } },
            ],
        };
    }

    if (lowerReq.includes("memory") || lowerReq.includes("bandwidth") || lowerReq.includes("hbm")) {
        return {
            name: "Memory Fabric Agent",
            description: "Manages High-Bandwidth Unified Memory access across the photonic fabric.",
            nodes: [
                {
                    id: "gen-1",
                    type: "telemetry",
                    position: { x: BASE_X, y: BASE_Y },
                    data: { label: "HBM Metrics", type: "gpu" },
                },
                {
                    id: "gen-2",
                    type: "logic",
                    position: { x: BASE_X + 250, y: BASE_Y },
                    data: { label: "Saturator Detect", type: "trigger", condition: "bandwidth > 90%" },
                },
                {
                    id: "gen-3",
                    type: "actuator",
                    position: { x: BASE_X + 500, y: BASE_Y },
                    data: { label: "Photonic Bypass", type: "bypass", target: "HBM Stack" },
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
