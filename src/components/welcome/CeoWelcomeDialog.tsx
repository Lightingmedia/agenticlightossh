import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import CeoLetter from "./CeoLetter";

/** Shows the CEO welcome letter once per account, until the user dismisses it. */
const CeoWelcomeDialog = () => {
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [firstName, setFirstName] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !active) return;
      const { data } = await supabase
        .from("profiles")
        .select("display_name, welcome_letter_seen_at")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!active) return;
      setUserId(user.id);
      setFirstName(data?.display_name?.split(/[\s@]/)[0] || null);
      if (!data?.welcome_letter_seen_at) setOpen(true);
    })();
    return () => { active = false; };
  }, []);

  const markSeen = async () => {
    setOpen(false);
    if (userId) {
      await supabase.from("profiles").update({ welcome_letter_seen_at: new Date().toISOString() }).eq("user_id", userId);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) markSeen(); }}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto border-primary/30">
        <DialogTitle className="sr-only">Welcome letter from our CEO</DialogTitle>
        <DialogDescription className="sr-only">A personal welcome to LightOS.</DialogDescription>
        <CeoLetter firstName={firstName} />
        <div className="flex flex-wrap justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={markSeen}>Close</Button>
          <Button onClick={async () => { await markSeen(); navigate("/dashboard/gateway-setup"); }}>
            Connect my first GPU
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CeoWelcomeDialog;
