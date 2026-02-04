import { useMemo } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface DigitalTwinNode {
  id: string;
  x: number;
  y: number;
  active: boolean;
}

interface DigitalTwinProps {
  nodes?: DigitalTwinNode[];
  activeConnections?: Array<{ from: string; to: string }>;
  className?: string;
}

export function DigitalTwinPreview({ nodes: customNodes, activeConnections = [], className }: DigitalTwinProps) {
  // Generate default mesh grid if no nodes provided
  const nodes = useMemo(() => {
    if (customNodes) return customNodes;
    
    const defaultNodes: DigitalTwinNode[] = [];
    const gridSize = 4;
    const spacing = 40;
    const startX = 20;
    const startY = 20;
    
    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        defaultNodes.push({
          id: `node-${row}-${col}`,
          x: startX + col * spacing,
          y: startY + row * spacing,
          active: Math.random() > 0.3,
        });
      }
    }
    return defaultNodes;
  }, [customNodes]);

  // Generate connections for mesh topology
  const connections = useMemo(() => {
    if (activeConnections.length > 0) {
      return activeConnections.map((conn) => {
        const fromNode = nodes.find((n) => n.id === conn.from);
        const toNode = nodes.find((n) => n.id === conn.to);
        if (!fromNode || !toNode) return null;
        return { from: fromNode, to: toNode, active: true };
      }).filter(Boolean);
    }

    // Default mesh connections
    const gridSize = 4;
    const meshConns: Array<{ from: DigitalTwinNode; to: DigitalTwinNode; active: boolean }> = [];
    
    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        const current = nodes.find((n) => n.id === `node-${row}-${col}`);
        if (!current) continue;

        // Right connection
        if (col < gridSize - 1) {
          const right = nodes.find((n) => n.id === `node-${row}-${col + 1}`);
          if (right) {
            meshConns.push({ from: current, to: right, active: current.active && right.active });
          }
        }

        // Down connection
        if (row < gridSize - 1) {
          const down = nodes.find((n) => n.id === `node-${row + 1}-${col}`);
          if (down) {
            meshConns.push({ from: current, to: down, active: current.active && down.active });
          }
        }
      }
    }
    return meshConns;
  }, [nodes, activeConnections]);

  return (
    <div className={cn("relative bg-card border border-border rounded-lg overflow-hidden", className)}>
      <div className="px-3 py-2 border-b border-border bg-muted/30">
        <span className="text-xs font-medium">Digital Twin Preview</span>
      </div>
      
      <div className="p-2">
        <svg width="180" height="180" className="w-full h-auto">
          {/* Background grid pattern */}
          <defs>
            <pattern id="miniGrid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeOpacity="0.05" strokeWidth="0.5" />
            </pattern>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          
          <rect width="100%" height="100%" fill="url(#miniGrid)" />

          {/* Connections */}
          {connections.map((conn, i) => {
            if (!conn) return null;
            return (
              <motion.line
                key={`conn-${i}`}
                x1={conn.from.x}
                y1={conn.from.y}
                x2={conn.to.x}
                y2={conn.to.y}
                stroke={conn.active ? "hsl(var(--lightrail))" : "hsl(var(--muted-foreground))"}
                strokeWidth={conn.active ? 1.5 : 0.5}
                strokeOpacity={conn.active ? 0.8 : 0.2}
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.5, delay: i * 0.02 }}
              />
            );
          })}

          {/* Nodes */}
          {nodes.map((node, i) => (
            <motion.g key={node.id}>
              {node.active && (
                <motion.circle
                  cx={node.x}
                  cy={node.y}
                  r="6"
                  fill="hsl(var(--lightrail))"
                  fillOpacity="0.2"
                  initial={{ scale: 0 }}
                  animate={{ scale: [1, 1.5, 1] }}
                  transition={{
                    scale: { repeat: Infinity, duration: 2, delay: i * 0.1 },
                  }}
                />
              )}
              <motion.circle
                cx={node.x}
                cy={node.y}
                r="4"
                fill={node.active ? "hsl(var(--lightrail))" : "hsl(var(--muted-foreground))"}
                fillOpacity={node.active ? 1 : 0.3}
                filter={node.active ? "url(#glow)" : undefined}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.3, delay: i * 0.02 }}
              />
            </motion.g>
          ))}
        </svg>
      </div>

      <div className="px-3 py-2 border-t border-border text-xs text-muted-foreground">
        <div className="flex justify-between">
          <span>Active Nodes: {nodes.filter((n) => n.active).length}/{nodes.length}</span>
          <span className="text-lightrail">Simulation</span>
        </div>
      </div>
    </div>
  );
}
