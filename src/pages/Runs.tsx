import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchRuns, fetchClusters } from "@/lib/lightos-api";
import type { RunSummary, Cluster } from "@/types/lightos";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Activity, ExternalLink, Filter } from "lucide-react";

export default function Runs() {
    const [runs, setRuns] = useState<RunSummary[]>([]);
    const [clusters, setClusters] = useState<Cluster[]>([]);
    const [clusterFilter, setClusterFilter] = useState<string>("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        Promise.all([fetchClusters(), fetchRuns()])
            .then(([clustersData, runsData]) => {
                setClusters(clustersData);
                setRuns(runsData);
            })
            .catch((e) => setError(e.message))
            .finally(() => setLoading(false));
    }, []);

    const filteredRuns = clusterFilter
        ? runs.filter((r) => r.clusterId === clusterFilter)
        : runs;

    const getModeColor = (mode: string) => {
        switch (mode) {
            case "baseline":
                return "secondary";
            case "telemetry":
                return "outline";
            case "optimized":
                return "default";
            default:
                return "secondary";
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <Activity className="h-8 w-8 animate-spin mx-auto mb-4" />
                    <p className="text-muted-foreground">Loading runs...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-96">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle className="text-destructive">Error Loading Runs</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">{error}</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Training Runs</h1>
                <p className="text-muted-foreground">
                    View and compare training runs across your clusters
                </p>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Run History</CardTitle>
                            <CardDescription>
                                {filteredRuns.length} run{filteredRuns.length !== 1 ? 's' : ''} found
                            </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                            <Filter className="h-4 w-4 text-muted-foreground" />
                            <Select value={clusterFilter} onValueChange={setClusterFilter}>
                                <SelectTrigger className="w-[200px]">
                                    <SelectValue placeholder="All Clusters" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="">All Clusters</SelectItem>
                                    {clusters.map((cluster) => (
                                        <SelectItem key={cluster.id} value={cluster.id}>
                                            {cluster.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {filteredRuns.length === 0 ? (
                        <div className="text-center py-12">
                            <p className="text-muted-foreground">
                                No runs found. Add run data to Firestore to see them here.
                            </p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Run ID</TableHead>
                                    <TableHead>Cluster</TableHead>
                                    <TableHead>Model</TableHead>
                                    <TableHead>Mode</TableHead>
                                    <TableHead>Started</TableHead>
                                    <TableHead className="text-right">Duration</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredRuns.map((run) => (
                                    <TableRow key={run.runId}>
                                        <TableCell className="font-mono text-sm">{run.runId}</TableCell>
                                        <TableCell>
                                            {clusters.find(c => c.id === run.clusterId)?.name || run.clusterId}
                                        </TableCell>
                                        <TableCell className="font-medium">{run.model}</TableCell>
                                        <TableCell>
                                            <Badge variant={getModeColor(run.mode)}>
                                                {run.mode}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-sm">
                                            {new Date(run.startedAt).toLocaleString()}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {run.durationSeconds.toFixed(1)}s
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button asChild variant="ghost" size="sm">
                                                <Link to={`/dashboard/runs/${run.runId}`}>
                                                    <ExternalLink className="h-4 w-4 mr-2" />
                                                    View Details
                                                </Link>
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
