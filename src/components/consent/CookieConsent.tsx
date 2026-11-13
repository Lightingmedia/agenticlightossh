import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { needsAnswer, onConsentChange, readChoice, saveChoices, type Purpose } from "@/lib/consent";
import { loadGoogleAds } from "@/lib/google-ads";
import { loadKlaviyo } from "@/lib/klaviyo";

const PURPOSES: Purpose[] = ["analytics", "advertising"];
const OPEN_EVENT = "lightos:open-cookie-settings";

export function openCookieSettings() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

function gpcActive(): boolean {
  return (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true;
}

function loadPermittedTags() {
  void loadGoogleAds();
  void loadKlaviyo();
}

export function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [advertising, setAdvertising] = useState(false);
  const bannerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    void needsAnswer(PURPOSES).then((needed) => active && setShowBanner(needed));
    loadPermittedTags();
    const off = onConsentChange(loadPermittedTags);
    return () => {
      active = false;
      off();
    };
  }, []);

  useEffect(() => {
    if (showBanner) bannerRef.current?.focus();
  }, [showBanner]);

  const openSettings = useCallback(() => {
    setAnalytics(readChoice("analytics") === "granted");
    setAdvertising(readChoice("advertising") === "granted");
    setSettingsOpen(true);
  }, []);

  useEffect(() => {
    window.addEventListener(OPEN_EVENT, openSettings);
    return () => window.removeEventListener(OPEN_EVENT, openSettings);
  }, [openSettings]);

  const decideAll = (choice: "granted" | "denied") => {
    saveChoices({ analytics: choice, advertising: choice });
    setShowBanner(false);
  };

  const saveSettings = () => {
    saveChoices({ analytics: analytics ? "granted" : "denied", advertising: advertising ? "granted" : "denied" });
    setSettingsOpen(false);
    setShowBanner(false);
  };

  const gpc = gpcActive();

  return (
    <>
      {showBanner && (
        <div
          ref={bannerRef}
          tabIndex={-1}
          role="region"
          aria-label="Cookie choices"
          className="fixed bottom-4 left-4 right-4 z-[100] mx-auto max-w-2xl rounded-md border border-border bg-card p-4 shadow-lg outline-none"
        >
          <p className="font-mono text-sm font-semibold text-foreground mb-1">Your privacy choices</p>
          <p className="text-sm text-muted-foreground mb-3">
            We count visits without cookies. If you accept, we also measure clicks, and use cookies to see which ads bring
            sign-ups and to run our email sign-up forms.{" "}
            <Link to="/privacy" className="underline text-foreground">Privacy policy</Link>
          </p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" className="font-mono" onClick={() => decideAll("granted")}>Accept all</Button>
            <Button size="sm" className="font-mono" onClick={() => decideAll("denied")}>Reject all</Button>
            <Button size="sm" variant="ghost" className="font-mono" onClick={openSettings}>Cookie settings</Button>
          </div>
        </div>
      )}

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-mono">Cookie settings</DialogTitle>
            <DialogDescription>
              {gpc
                ? "Your browser's privacy signal (Global Privacy Control) applies, so optional tracking stays off."
                : "Choose which optional tracking you allow. You can change this any time from the footer."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-foreground">Necessary</p>
                <p className="text-xs text-muted-foreground">Keeps you signed in and the site working. Always on.</p>
              </div>
              <span className="text-xs font-mono text-muted-foreground">Always on</span>
            </div>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-foreground">Analytics, provided by Lovable</p>
                <p className="text-xs text-muted-foreground">Measures clicks on the site. Visits are counted without cookies either way.</p>
              </div>
              <Switch aria-label="Analytics" checked={!gpc && analytics} disabled={gpc} onCheckedChange={setAnalytics} />
            </div>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-foreground">Advertising and marketing, provided by Google and Klaviyo</p>
                <p className="text-xs text-muted-foreground">Measures which ads lead to sign-ups and runs our email sign-up forms. Uses cookies.</p>
              </div>
              <Switch aria-label="Advertising and marketing" checked={!gpc && advertising} disabled={gpc} onCheckedChange={setAdvertising} />
            </div>
          </div>
          <DialogFooter>
            <Button className="font-mono" onClick={saveSettings} disabled={gpc}>Save choices</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
