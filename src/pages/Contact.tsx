import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CheckCircle2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import InfoPage, { Section } from "@/components/landing/InfoPage";

const Contact = () => {
  const [params] = useSearchParams();
  const topic = params.get("topic");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState(topic === "careers" ? "Careers: " : "");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => { if (data.user?.email) setEmail((e) => e || data.user!.email!); });
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setError(null);
    const { error } = await supabase.functions.invoke("support-chat", {
      body: { action: "handoff", email: email.trim(), name: name.trim() || undefined, message: message.trim(), transcript: [], page: "/contact" },
    });
    setBusy(false);
    if (error) { setError("We couldn't send your message. Check your email address and try again."); return; }
    setSent(true);
  };

  return (
    <InfoPage eyebrow="Company" title="Contact us" intro="Questions about plans, setup, billing, partnerships or careers — a person on our team will reply by email.">
      <Section title="Send a message">
        {sent ? (
          <div className="flex items-center gap-3 rounded-lg border border-primary/40 bg-primary/5 p-4 text-foreground">
            <CheckCircle2 className="h-5 w-5 text-primary" /> Thanks — we've got your message and will reply to {email}.
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input placeholder="Your name (optional)" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} aria-label="Name" />
              <Input type="email" required placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={255} aria-label="Email" />
            </div>
            <Textarea required minLength={5} maxLength={2000} rows={6} placeholder="How can we help?" value={message} onChange={(e) => setMessage(e.target.value)} aria-label="Message" />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={busy} className="font-mono">
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Send message
            </Button>
          </form>
        )}
      </Section>
      <Section title="Quick answers">
        <p>For fast answers about plans or connecting a GPU, use the help chat in the bottom-right corner of any page.</p>
      </Section>
    </InfoPage>
  );
};

export default Contact;
