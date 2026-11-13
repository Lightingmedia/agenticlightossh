import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { openCookieSettings } from "@/components/consent/CookieConsent";

const Privacy = () => (
  <div className="min-h-screen bg-background text-foreground">
    <div className="container mx-auto max-w-3xl px-4 py-16 space-y-8">
      <div>
        <Link to="/" className="font-mono text-sm text-primary hover:underline">← LightOS</Link>
        <h1 className="font-mono text-3xl font-bold mt-4">Privacy policy</h1>
        <p className="text-sm text-muted-foreground mt-2">LightRail AI · LightOS · Last updated 13 November 2026</p>
      </div>

      <section className="space-y-2">
        <h2 className="font-mono text-xl font-semibold">What we collect</h2>
        <p className="text-sm text-muted-foreground">
          When you create an account we store your name, email address and sign-in details. When you connect a GPU host we
          store its connection details (tokens encrypted) and show readings it reports. Payments are handled by Stripe; we
          do not store card numbers.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-mono text-xl font-semibold">Site analytics</h2>
        <p className="text-sm text-muted-foreground">
          We count page visits, time on page, page speed and errors without cookies and without identifying you, using
          Lovable's analytics. If you accept analytics, we also measure clicks.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-mono text-xl font-semibold">Advertising and marketing</h2>
        <p className="text-sm text-muted-foreground">
          If you accept advertising and marketing, we load Google Ads and Klaviyo. Google Ads uses cookies to tell us
          whether a visit from one of our ads led to a Free plan sign-up, and that information helps Google optimise who
          sees our ads. When you sign up, we send Google your account identifier as a sign-up reference (not your email).
          Klaviyo runs our email sign-up forms and measures how visitors use them. Where consent is required (the EU/EEA,
          the UK, Switzerland and Canada), none of this loads until you accept. Elsewhere it loads by default and you can
          turn it off at any time. A browser Global Privacy Control signal always counts as a refusal.
        </p>
        <p className="text-sm text-muted-foreground">
          Learn how Google uses data at{" "}
          <a className="underline" href="https://business.safety.google/privacy/" target="_blank" rel="noopener noreferrer">
            business.safety.google/privacy
          </a>.
        </p>
        <Button variant="outline" size="sm" className="font-mono" onClick={openCookieSettings}>Cookie settings</Button>
      </section>

      <section className="space-y-2">
        <h2 className="font-mono text-xl font-semibold">Your choices</h2>
        <p className="text-sm text-muted-foreground">
          You can change or withdraw your cookie choices at any time from Cookie settings. To access or delete your account
          data, contact us from the email address on your account.
        </p>
      </section>
    </div>
  </div>
);

export default Privacy;
