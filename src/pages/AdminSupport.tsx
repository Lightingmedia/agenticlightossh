import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mail, MessageCircle, CheckCircle2, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

type Msg = { role: "user" | "assistant"; content: string };
interface Request {
  id: string;
  created_at: string;
  name: string | null;
  email: string;
  message: string;
  transcript: Msg[];
  page: string | null;
  status: "open" | "resolved";
  user_id: string | null;
}

const AdminSupport = () => {
  const [rows, setRows] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"open" | "resolved" | "all">("open");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("support_requests")
      .select("id, created_at, name, email, message, transcript, page, status, user_id")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) setError(error.message);
    else setRows((data ?? []) as unknown as Request[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const visible = useMemo(() => (filter === "all" ? rows : rows.filter((r) => r.status === filter)), [rows, filter]);
  const selected = rows.find((r) => r.id === selectedId) ?? visible[0] ?? null;
  const openCount = rows.filter((r) => r.status === "open").length;

  const setStatus = async (r: Request, status: Request["status"]) => {
    const { error } = await supabase
      .from("support_requests")
      .update({ status, resolved_at: status === "resolved" ? new Date().toISOString() : null })
      .eq("id", r.id);
    if (error) { setError(error.message); return; }
    setRows((all) => all.map((x) => (x.id === r.id ? { ...x, status } : x)));
  };

  const replyLink = (r: Request) =>
    `mailto:${encodeURIComponent(r.email)}?subject=${encodeURIComponent("Re: your LightOS question")}&body=${encodeURIComponent(`Hi ${r.name ?? "there"},\n\n\n\n> ${r.message.split("\n").join("\n> ")}`)}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-mono text-2xl font-bold flex items-center gap-2"><MessageCircle className="h-6 w-6 text-primary" /> Support inbox</h1>
          <p className="text-sm text-muted-foreground">Messages visitors sent with “Talk to a person” in the help chat.</p>
        </div>
        <div className="flex gap-2">
          {(["open", "resolved", "all"] as const).map((f) => (
            <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => { setFilter(f); setSelectedId(null); }} className="font-mono text-xs capitalize">
              {f}{f === "open" ? ` (${openCount})` : ""}
            </Button>
          ))}
        </div>
      </div>

      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,340px)_1fr]">
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <p className="p-4 text-sm text-muted-foreground">Loading…</p>
            ) : visible.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">No {filter === "all" ? "" : filter} messages yet.</p>
            ) : (
              <ul className="divide-y divide-border">
                {visible.map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(r.id)}
                      className={cn("w-full px-4 py-3 text-left hover:bg-muted/40", selected?.id === r.id && "bg-muted/60")}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate font-mono text-sm">{r.name || r.email}</span>
                        <Badge variant={r.status === "open" ? "default" : "secondary"} className="text-[10px]">{r.status}</Badge>
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{r.message}</p>
                      <p className="mt-1 text-[10px] text-muted-foreground">{new Date(r.created_at).toLocaleString()}</p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {selected && (
          <Card>
            <CardHeader className="space-y-1">
              <CardTitle className="font-mono text-base">{selected.name || selected.email}</CardTitle>
              <p className="text-xs text-muted-foreground">
                {selected.email} · {new Date(selected.created_at).toLocaleString()}
                {selected.page ? ` · from ${selected.page}` : ""}
                {selected.user_id ? " · signed-in account" : " · visitor"}
              </p>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-sm whitespace-pre-wrap">{selected.message}</div>
              <div className="flex flex-wrap gap-2">
                <Button asChild size="sm" className="font-mono text-xs">
                  <a href={replyLink(selected)}><Mail className="mr-2 h-3.5 w-3.5" /> Reply by email</a>
                </Button>
                {selected.status === "open" ? (
                  <Button size="sm" variant="outline" onClick={() => setStatus(selected, "resolved")} className="font-mono text-xs">
                    <CheckCircle2 className="mr-2 h-3.5 w-3.5" /> Mark resolved
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => setStatus(selected, "open")} className="font-mono text-xs">
                    <RotateCcw className="mr-2 h-3.5 w-3.5" /> Reopen
                  </Button>
                )}
              </div>
              {selected.transcript?.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-mono text-xs uppercase tracking-wide text-muted-foreground">Chat before hand-off</h3>
                  <div className="space-y-2 rounded-md border border-border p-3">
                    {selected.transcript.map((m, i) => (
                      <div key={i} className="text-sm">
                        <span className={cn("font-mono text-xs", m.role === "user" ? "text-primary" : "text-muted-foreground")}>
                          {m.role === "user" ? "Visitor" : "Assistant"}:
                        </span>{" "}
                        <span className="whitespace-pre-wrap">{m.content}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default AdminSupport;
