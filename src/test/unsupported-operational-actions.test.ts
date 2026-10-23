import { describe, expect, it, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: vi.fn(() => { throw new Error("Unexpected browser operational write"); }) } }));
import { registerAgent, updateAgentStatus, adjustThermal, submitInferenceTask } from "@/lib/api";

describe("unsupported operations never claim hardware execution", () => {
  it("manual registration cannot fabricate a running agent", async () => {
    await expect(registerAgent("my-node", "GPU worker")).rejects.toThrow("verified node");
  });
  it("agent status cannot be changed by a browser table write", async () => {
    await expect(updateAgentStatus("other-agent", { status: "online" })).rejects.toThrow("unavailable");
  });
  it("fan control cannot report success without a supported gateway operation", async () => {
    await expect(adjustThermal("zone-a", 100)).rejects.toThrow("unavailable");
  });
  it("inference records cannot substitute for an executed GPU task", async () => {
    await expect(submitInferenceTask("llama-3.1-8b")).rejects.toThrow("cannot execute");
  });
});