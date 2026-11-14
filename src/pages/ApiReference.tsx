import { Link } from "react-router-dom";
import InfoPage, { Section, Code } from "@/components/landing/InfoPage";

const endpoints: [string, string, string][] = [
  ["GET", "/healthz", "Liveness check and visible GPU count (no token needed)"],
  ["GET", "/v1/fabric/capacity", "Measured devices, runtimes and free/allocated counts"],
  ["GET", "/v1/fabric/telemetry", "Per-GPU utilization, memory, temperature and power"],
  ["GET", "/v1/fabric/topology", "Nodes and devices the gateway can see"],
  ["GET", "/v1/fabric/events", "Recent gateway events"],
  ["POST", "/v1/intents/validate", "Check a workload request before planning"],
  ["POST", "/v1/deployments/plan", "Get a plan against measured capacity"],
  ["POST", "/v1/jobs", "Submit an inference request (needs a GPU and a configured model)"],
  ["GET", "/v1/jobs/{id}", "Job status and result"],
  ["DELETE", "/v1/jobs/{id}", "Cancel a job"],
  ["POST", "/v1/nodes/register", "Register a node report"],
  ["GET", "/v1/rdma/overview", "InfiniBand/RoCE port counters and rates"],
  ["GET / POST", "/v1/rdma/events", "Read or send RDMA tracer events"],
];

const ApiReference = () => (
  <InfoPage eyebrow="Developers" title="API reference" intro="The LightOS gateway runs on your GPU machine and answers these requests. Every request except /healthz needs your gateway token.">
    <Section title="Authentication">
      <p>Send the token you created during setup as a bearer token. Requests without it get a 401.</p>
      <Code>{`curl -H "Authorization: Bearer $GATEWAY_TOKEN" \\
  https://<your-tunnel>.trycloudflare.com/v1/fabric/capacity`}</Code>
    </Section>
    <Section title="Endpoints">
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-left text-xs">
          <thead className="bg-card/60 font-mono text-foreground">
            <tr><th className="px-3 py-2">Method</th><th className="px-3 py-2">Path</th><th className="px-3 py-2">What it returns</th></tr>
          </thead>
          <tbody>
            {endpoints.map(([m, p, d]) => (
              <tr key={m + p} className="border-t border-border">
                <td className="px-3 py-2 font-mono text-primary whitespace-nowrap">{m}</td>
                <td className="px-3 py-2 font-mono text-foreground whitespace-nowrap">{p}</td>
                <td className="px-3 py-2">{d}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
    <Section title="No data, no numbers">
      <p>When the gateway can't see a GPU, it returns <code className="font-mono text-foreground">"source": "unavailable"</code> and a <code className="font-mono text-foreground">reason</code> instead of readings — it never makes numbers up.</p>
    </Section>
    <Section title="Next steps">
      <p>Install the gateway with the <Link to="/guide" className="text-primary hover:underline">First-run guide</Link>, or see <Link to="/sdks" className="text-primary hover:underline">SDKs and tools</Link>.</p>
    </Section>
  </InfoPage>
);

export default ApiReference;
