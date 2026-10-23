import { Link } from "react-router-dom";
import { ArrowRight, PlugZap } from "lucide-react";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import GatewayLivePanel from "@/components/dashboard/GatewayLivePanel";
import { Button } from "@/components/ui/button";

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader title="Overview" subtitle="Your connected GPU host" />
      <div className="p-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-5">
          <div>
            <h1 className="font-mono text-2xl font-bold text-foreground">GPU workspace</h1>
            <p className="mt-1 text-sm text-muted-foreground">Free includes monitoring for one GPU. Your provider bills compute separately.</p>
          </div>
          <Button asChild variant="outline"><Link to="/dashboard/gateway-setup"><PlugZap className="mr-2 h-4 w-4" />Manage connection<ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
        </div>
        <GatewayLivePanel />
      </div>
    </div>
  );
}