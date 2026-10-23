import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PlugZap, Loader2, Unplug, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function GpuConnectionForm() {
  const [url, setUrl] = useState("");
  const [token, setToken] = useState("");
  const [connected, setConnected] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    supabase.functions.invoke("runtime-connect", { body: { action: "status" } }).then(({ data }) => {
      if (data?.connected) { setConnected(true); setUrl(data.url); }
    });
  }, []);
  async function submit(action: "connect" | "disconnect") {
    setBusy(true); setMessage(""); setFailed(false);
    const { data, error } = await supabase.functions.invoke("runtime-connect", {
      body: action === "connect" ? { action, url, token } : { action },
    });
    // Clear entered credentials immediately; never persist in browser storage.
    setToken("");
    if (error) {
      let detail = "Connection failed. Check the address and token, then retry.";
      try { detail = (await (error as { context?: Response }).context?.json())?.error ?? detail; } catch { /* generic only */ }
      setMessage(detail); setFailed(true);
    } else {
      setConnected(!!data.connected);
      setMessage(action === "disconnect" ? "GPU host disconnected." : data.detected_devices > 0 ? "GPU host connected. Open the dashboard for live readings." : "Host connected, but no GPU is visible yet.");
      window.dispatchEvent(new Event("lightos:runtime-connection"));
    }
    setBusy(false);
  }
  return (
    <section className="space-y-4 border-b border-border pb-6" aria-label="Connect your GPU">
      <div>
        <h2 className="font-mono text-xl font-bold text-foreground">Connect your GPU</h2>
        <p className="mt-1 text-sm text-muted-foreground">Free · 1 GPU · monitoring only · no card required</p>
      </div>
      <form className="grid max-w-2xl gap-4" onSubmit={(e) => { e.preventDefault(); void submit("connect"); }}>
        <div className="space-y-2"><Label htmlFor="gpu-host-url">Brev gateway address</Label>
          <Input id="gpu-host-url" type="url" placeholder="https://your-tunnel.trycloudflare.com" value={url} onChange={(e) => setUrl(e.target.value)} required disabled={busy} /></div>
        <div className="space-y-2"><Label htmlFor="gpu-host-token">Gateway token</Label>
          <Input id="gpu-host-token" type="password" autoComplete="off" placeholder={connected ? "Enter token to update connection" : "Token from your GPU host"} value={token} onChange={(e) => setToken(e.target.value)} required disabled={busy} /></div>
        <div className="flex flex-wrap gap-3">
          <Button type="submit" disabled={busy || !url || !token}>{busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlugZap className="mr-2 h-4 w-4" />}{connected ? "Update connection" : "Connect GPU"}</Button>
          {connected && <><Button type="button" variant="outline" onClick={() => void submit("disconnect")} disabled={busy}><Unplug className="mr-2 h-4 w-4" />Disconnect</Button>
            <Button asChild variant="outline"><Link to="/dashboard">Open dashboard<ArrowRight className="ml-2 h-4 w-4" /></Link></Button></>}
        </div>
      </form>
      {message && <p role="status" className={`text-sm ${failed ? "text-destructive" : "text-primary"}`}>{message}</p>}
    </section>
  );
}