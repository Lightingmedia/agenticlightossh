import { Link } from "react-router-dom";
import InfoPage, { Section } from "@/components/landing/InfoPage";

const Terms = () => (
  <InfoPage eyebrow="Legal · Draft under legal review" title="Terms of service" intro="LightRail AI · LightOS · Last updated 14 November 2026. These terms are a plain-language draft and may change after legal review.">
    <Section title="Your account">
      <p>You need an account to use LightOS. Keep your sign-in details and any GPU gateway tokens private; you're responsible for activity under your account.</p>
    </Section>
    <Section title="Plans and billing">
      <p>The Free plan monitors one GPU and needs no card. Paid plans are billed monthly or yearly through Stripe; plan changes apply immediately with prorated charges, and cancelling keeps access until the end of the paid period. See <Link to="/pricing" className="text-primary hover:underline">Pricing</Link>.</p>
    </Section>
    <Section title="GPU compute">
      <p>Rented GPU compute is billed separately from prepaid credit by elapsed time. When your credit reaches zero, running machines are stopped and removed, and data on them may be lost.</p>
    </Section>
    <Section title="Your machines and data">
      <p>You keep ownership of your machines, workloads and data. LightOS only shows readings your machines report and does not run work on them without your approval.</p>
    </Section>
    <Section title="Acceptable use">
      <p>Don't use LightOS to break the law, attack other systems, or access machines you aren't authorized to use.</p>
    </Section>
    <Section title="Service as provided">
      <p>LightOS is in early access. Features may change, and the service is provided without guarantees of availability or results.</p>
    </Section>
    <Section title="Questions">
      <p>Read our <Link to="/privacy" className="text-primary hover:underline">Privacy policy</Link> or <Link to="/contact" className="text-primary hover:underline">contact us</Link>.</p>
    </Section>
  </InfoPage>
);

export default Terms;
