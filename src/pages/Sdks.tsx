import { Link } from "react-router-dom";
import InfoPage, { Section, Code } from "@/components/landing/InfoPage";

const Sdks = () => (
  <InfoPage eyebrow="Developers" title="SDKs and tools" intro="What you can install today to connect your GPUs and agents to LightOS.">
    <Section title="LightOS gateway">
      <p>A small service you run with Docker on your NVIDIA machine. It reports real GPU readings to your dashboard over a private tunnel.</p>
      <Code>{`curl -LO https://agentic.lightos.sh/downloads/lightos-gateway.tar.gz
curl -LO https://agentic.lightos.sh/downloads/lightos-gateway.tar.gz.sha256
sha256sum -c lightos-gateway.tar.gz.sha256`}</Code>
      <p>Full steps are in the <Link to="/guide" className="text-primary hover:underline">First-run guide</Link>.</p>
    </Section>
    <Section title="Baseline report (no root)">
      <p>A single Python script that records utilization, memory, power, temperature and throttle reasons, plus a fingerprint of your drivers and settings — measurement before any optimization.</p>
    </Section>
    <Section title="AI agents (MCP)">
      <p>Agents such as Claude can connect to LightOS through MCP after you sign in and approve access. They can read your measured capacity and telemetry and draft deployment plans.</p>
    </Section>
    <Section title="Plain HTTP">
      <p>Any language that can make HTTPS requests works with the gateway. See the <Link to="/api-reference" className="text-primary hover:underline">API reference</Link>.</p>
    </Section>
  </InfoPage>
);

export default Sdks;
