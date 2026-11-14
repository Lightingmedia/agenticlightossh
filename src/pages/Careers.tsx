import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import InfoPage, { Section } from "@/components/landing/InfoPage";

const Careers = () => (
  <InfoPage
    eyebrow="Company"
    title="Careers"
    intro="We're a small team building LightOS. There are no open roles listed right now."
  >
    <Section title="Want to work with us?">
      <p>If you work on GPU infrastructure, CUDA, distributed training or agent tooling and want to help, send us a short note about yourself and what you'd like to build.</p>
    </Section>
    <Button asChild className="font-mono"><Link to="/contact?topic=careers">Introduce yourself</Link></Button>
  </InfoPage>
);

export default Careers;
