import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Cpu, KeyRound, ShieldCheck } from "lucide-react";

export default function FirstRunGuide() {
  return (
    <section id="quickstart" className="scroll-mt-40 border-y border-border py-10 mb-12">
      <div className="container mx-auto px-4 max-w-4xl space-y-6">
        <p className="font-mono text-xs uppercase text-primary">Early access · first run</p>
        <h2 className="text-2xl font-mono font-bold">Connect the compute you already have</h2>
        <p className="text-muted-foreground">LightOS is Aurora Fabric OS's agent workspace, not a GPU rental service or a replacement for Ubuntu. Start with monitoring and planning; approved execution is a pilot milestone.</p>
        <ol className="space-y-6">
          <li className="flex gap-4"><KeyRound className="w-5 h-5 shrink-0 text-primary mt-1" /><div><h3 className="font-mono font-bold mb-1">1. Sign in and connect an account</h3><p className="text-sm text-muted-foreground">Select your provider and authentication method in Compute Providers. Use the minimum required permissions. Enter credentials only in the connection form, never in chat.</p></div></li>
          <li className="flex gap-4"><ShieldCheck className="w-5 h-5 shrink-0 text-primary mt-1" /><div><h3 className="font-mono font-bold mb-1">2. Validate and inspect inventory</h3><p className="text-sm text-muted-foreground">Test the connection, then open Inventory. Rejected credentials and “awaiting gateway” are not success. An empty account or a model catalog does not prove a GPU is connected.</p></div></li>
          <li className="flex gap-4"><Cpu className="w-5 h-5 shrink-0 text-primary mt-1" /><div><h3 className="font-mono font-bold mb-1">3. Connect a host for real GPU readings</h3><p className="text-sm text-muted-foreground">Your deployment operator needs an accessible NVIDIA host, driver, Docker Compose, and GPU container support. Gateway Setup provides host commands; its HTTPS address and token belong in secure server settings. Current gateway configuration is deployment-wide, not a private gateway per customer.</p></div></li>
        </ol>
        <p className="text-sm text-muted-foreground">Free: one GPU, monitoring only, no card required. GPU rental is billed by your provider. Multiuser isolation, server-side limits, and real execution verification are launch gates; demo output is not a connected machine.</p>
        <div className="flex flex-wrap gap-3"><Button asChild><Link to="/dashboard/providers">Compute Providers <ArrowRight className="ml-2 w-4 h-4" /></Link></Button><Button asChild variant="outline"><Link to="/dashboard/gateway-setup">Gateway Setup</Link></Button><Button asChild variant="ghost"><Link to="/auth?next=/dashboard/providers">Sign in</Link></Button></div>
        <p className="text-xs text-muted-foreground">Installer: reviewed source only for now. Do not pipe a downloaded page into a shell. A versioned package and independently published checksums are pending. Browser photonic steps are simulations; only gateway-accepted CUDA reports represent real node checks.</p>
      </div>
    </section>
  );
}