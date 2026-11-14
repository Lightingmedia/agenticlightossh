import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import InfoPage, { Section } from "@/components/landing/InfoPage";

const About = () => (
  <InfoPage
    eyebrow="Company"
    title="About LightRail AI"
    intro="LightRail AI builds LightOS, an agent-first control plane for the GPU infrastructure teams already own or rent."
  >
    <Section title="Our mission">
      <p>Make AI infrastructure simple to run by turning GPU operations into a conversation: an agent that reads real capacity, checks your policies and budgets, proposes a plan and waits for your approval.</p>
    </Section>
    <Section title="Who it's for">
      <p>Independent AI developers and small AI teams running NVIDIA GPUs today, with larger cluster and enterprise deployments as the longer-term goal.</p>
    </Section>
    <Section title="How we work">
      <p>We measure before we optimize. LightOS shows only readings your own machines report, labels anything illustrative, and does not claim savings or speed-ups we have not measured.</p>
    </Section>
    <div className="flex flex-wrap gap-3">
      <Button asChild className="font-mono"><Link to="/auth?mode=signup">Start free</Link></Button>
      <Button asChild variant="outline" className="font-mono"><Link to="/contact">Contact us</Link></Button>
    </div>
  </InfoPage>
);

export default About;
