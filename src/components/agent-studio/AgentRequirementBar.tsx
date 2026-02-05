import { useState } from "react";
import { Sparkles, Loader2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface AgentRequirementBarProps {
    onGenerate: (requirement: string) => Promise<void>;
    isGenerating: boolean;
    className?: string;
}

export function AgentRequirementBar({ onGenerate, isGenerating, className }: AgentRequirementBarProps) {
    const [requirement, setRequirement] = useState("");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (requirement.trim() && !isGenerating) {
            onGenerate(requirement);
        }
    };

    const suggestions = [
        "AWS Inference Optimizer",
        "Azure Data Center Power Saver",
        "Predictive GPU Thermal Guard",
        "High-Bandwidth Circuit Provisioner"
    ];

    return (
        <div className={cn("w-full bg-card border-b border-border p-4 space-y-3", className)}>
            <form onSubmit={handleSubmit} className="flex gap-2 max-w-4xl mx-auto">
                <div className="relative flex-1">
                    <Input
                        value={requirement}
                        onChange={(e) => setRequirement(e.target.value)}
                        placeholder="Define your agent requirement (e.g., 'Build an inference optimizer for my AWS cluster')"
                        className="pl-10 h-11 border-lightrail/20 focus-visible:ring-lightrail"
                        disabled={isGenerating}
                    />
                    <Sparkles className="absolute left-3 top-3.5 w-4 h-4 text-lightrail animate-pulse" />
                </div>
                <Button
                    type="submit"
                    disabled={!requirement.trim() || isGenerating}
                    className="h-11 bg-lightrail text-lightrail-foreground hover:bg-lightrail/90 px-6 font-mono"
                >
                    {isGenerating ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Generating...
                        </>
                    ) : (
                        <>
                            Build AI Agent
                            <ArrowRight className="ml-2 h-4 w-4" />
                        </>
                    )}
                </Button>
            </form>

            <div className="flex items-center justify-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                <span className="text-xs text-muted-foreground mr-2">Suggestions:</span>
                {suggestions.map((suggestion) => (
                    <button
                        key={suggestion}
                        type="button"
                        onClick={() => setRequirement(suggestion)}
                        className="flex-shrink-0"
                        disabled={isGenerating}
                    >
                        <Badge
                            variant="outline"
                            className="hover:bg-lightrail/10 hover:border-lightrail/50 cursor-pointer transition-colors font-normal py-1"
                        >
                            {suggestion}
                        </Badge>
                    </button>
                ))}
            </div>
        </div>
    );
}
