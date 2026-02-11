import { useEffect, useState } from "react";
import { fetchClusters } from "@/lib/lightos-api";
import type { Cluster } from "@/types/lightos";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Server, Activity, CheckCircle2, XCircle } from "lucide-react";

export default function Clusters() {
    const [clusters, setClusters] = useState<Cluster[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchClusters()
            .then(setClusters)
            .catch((e) => setError(e.message))
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <Activity className="h-8 w-8 animate-spin mx-auto mb-4" />
                    <p className="text-muted-foreground">Loading clusters...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-96">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-destructive">
                            <XCircle className="h-5 w-5" />
                            Error Loading Clusters
                        </CardTitle>
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
                <h1 className="text-3xl font-bold tracking-tight">Clusters</h1>
                <p className="text-muted-foreground">
                    Manage and monitor your GPU clusters running LightOS/Fabric OS
                </p>
            </div>

            {clusters.length === 0 ? (
                <Card>
                    <CardHeader>
                        <CardTitle>No Clusters Found</CardTitle>
                        <CardDescription>
                            No clusters are currently registered. Add cluster data to Firestore to see them here.
                        </CardDescription>
                    </CardHeader>
                </Card>
            ) : (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Server className="h-5 w-5" />
                            Cluster Overview
                        </CardTitle>
                        <CardDescription>
                            {clusters.length} cluster{clusters.length !== 1 ? 's' : ''} registered
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead className="text-center">Nodes</TableHead>
                                    <TableHead className="text-center">GPUs</TableHead>
                                    <TableHead className="text-center">Agent Health</TableHead>
                                    <TableHead>Topology</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {clusters.map((cluster) => {
                                    const healthPercent = cluster.nodes > 0
                                        ? Math.round((cluster.agentHealthy / cluster.nodes) * 100)
                                        : 0;
                                    const isHealthy = healthPercent >= 80;

                                    return (
                                        <TableRow key={cluster.id}>
                                            <TableCell className="font-medium">{cluster.name}</TableCell>
                                            <TableCell className="text-center">{cluster.nodes}</TableCell>
                                            <TableCell className="text-center">{cluster.gpus}</TableCell>
                                            <TableCell className="text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    {isHealthy ? (
                                                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                                                    ) : (
                                                        <XCircle className="h-4 w-4 text-yellow-500" />
                                                    )}
                                                    <span className="text-sm">
                                                        {cluster.agentHealthy}/{cluster.nodes}
                                                    </span>
                                                    <Badge variant={isHealthy ? "default" : "secondary"}>
                                                        {healthPercent}%
                                                    </Badge>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline">
                                                    {cluster.topology || "default"}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
