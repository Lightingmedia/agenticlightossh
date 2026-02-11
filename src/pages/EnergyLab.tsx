import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { fetchRunMetrics, fetchRuns } from "@/lib/lightos-api";
import type { RunMetrics, RunSummary } from "@/types/lightos";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, TrendingUp, Cpu, Network, AlertCircle } from "lucide-react";
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

export default function EnergyLab() {
    const { runId } = useParams<{ runId: string }>();
    const [metrics, setMetrics] = useState<RunMetrics | null>(null);
    const [run, setRun] = useState<RunSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!runId) return;

        setLoading(true);
        Promise.all([
            fetchRunMetrics(runId),
            fetchRuns().then((runs) => runs.find((r) => r.runId === runId) || null),
        ])
            .then(([metricsData, runData]) => {
                setMetrics(metricsData);
                setRun(runData);
            })
            .catch((e) => setError(e.message))
            .finally(() => setLoading(false));
    }, [runId]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <Activity className="h-8 w-8 animate-spin mx-auto mb-4" />
                    <p className="text-muted-foreground">Loading run metrics...</p>
                </div>
            </div>
        );
    }

    if (error || !metrics) {
        return (
            <div className="flex items-center justify-center h-96">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-destructive">
                            <AlertCircle className="h-5 w-5" />
                            Error Loading Metrics
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">
                            {error || "No metrics available for this run"}
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Prepare chart data
    const stepTimeData = metrics.stepTimeMs.map((time, index) => ({
        step: index,
        stepTime: time,
    }));

    const utilizationData = metrics.smUtilizationPct.map((util, index) => ({
        step: index,
        utilization: util,
    }));

    const commComputeData = metrics.stepTimeMs.map((_, index) => ({
        step: index,
        communication: metrics.commTimeMs[index],
        compute: metrics.computeTimeMs[index],
    }));

    const avgStepTime = metrics.stepTimeMs.reduce((a, b) => a + b, 0) / metrics.stepTimeMs.length;
    const avgUtilization = metrics.smUtilizationPct.reduce((a, b) => a + b, 0) / metrics.smUtilizationPct.length;
    const avgCommTime = metrics.commTimeMs.reduce((a, b) => a + b, 0) / metrics.commTimeMs.length;
    const avgComputeTime = metrics.computeTimeMs.reduce((a, b) => a + b, 0) / metrics.computeTimeMs.length;
    const commComputeRatio = avgCommTime / avgComputeTime;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Energy Lab</h1>
                <p className="text-muted-foreground">
                    Detailed analysis for run {runId}
                </p>
            </div>

            {/* Run Metadata */}
            {run && (
                <Card>
                    <CardHeader>
                        <CardTitle>Run Information</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                                <p className="text-sm text-muted-foreground">Cluster</p>
                                <p className="font-medium">{run.clusterId}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Model</p>
                                <p className="font-medium">{run.model}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Mode</p>
                                <Badge variant={run.mode === "optimized" ? "default" : "secondary"}>
                                    {run.mode}
                                </Badge>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Duration</p>
                                <p className="font-medium">{run.durationSeconds.toFixed(1)}s</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Key Metrics Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Avg Step Time</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{avgStepTime.toFixed(2)} ms</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Avg SM Utilization</CardTitle>
                        <Cpu className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{avgUtilization.toFixed(1)}%</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Avg Comm Time</CardTitle>
                        <Network className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{avgCommTime.toFixed(2)} ms</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Comm/Compute Ratio</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{commComputeRatio.toFixed(3)}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Step Time Chart */}
            <Card>
                <CardHeader>
                    <CardTitle>Step Time Over Training</CardTitle>
                    <CardDescription>Time taken per training step (ms)</CardDescription>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={stepTimeData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="step" label={{ value: 'Step', position: 'insideBottom', offset: -5 }} />
                            <YAxis label={{ value: 'Time (ms)', angle: -90, position: 'insideLeft' }} />
                            <Tooltip />
                            <Legend />
                            <Line type="monotone" dataKey="stepTime" stroke="#8884d8" name="Step Time" />
                        </LineChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {/* SM Utilization Chart */}
            <Card>
                <CardHeader>
                    <CardTitle>SM Utilization</CardTitle>
                    <CardDescription>GPU streaming multiprocessor utilization (%)</CardDescription>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                        <AreaChart data={utilizationData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="step" label={{ value: 'Step', position: 'insideBottom', offset: -5 }} />
                            <YAxis label={{ value: 'Utilization (%)', angle: -90, position: 'insideLeft' }} />
                            <Tooltip />
                            <Legend />
                            <Area type="monotone" dataKey="utilization" stroke="#82ca9d" fill="#82ca9d" name="SM Utilization" />
                        </AreaChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {/* Communication vs Compute Chart */}
            <Card>
                <CardHeader>
                    <CardTitle>Communication vs Compute Time</CardTitle>
                    <CardDescription>Breakdown of time spent in communication and computation (ms)</CardDescription>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                        <AreaChart data={commComputeData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="step" label={{ value: 'Step', position: 'insideBottom', offset: -5 }} />
                            <YAxis label={{ value: 'Time (ms)', angle: -90, position: 'insideLeft' }} />
                            <Tooltip />
                            <Legend />
                            <Area type="monotone" dataKey="communication" stackId="1" stroke="#ff7300" fill="#ff7300" name="Communication" />
                            <Area type="monotone" dataKey="compute" stackId="1" stroke="#387908" fill="#387908" name="Compute" />
                        </AreaChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </div>
    );
}
