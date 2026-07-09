import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

export default defineTool({
  name: "echo",
  title: "Echo",
  description: "Echo the input text back to the caller. Useful for verifying MCP connectivity.",
  inputSchema: { text: z.string().min(1).describe("Text to echo back.") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ text }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    return { content: [{ type: "text", text }] };
  },
});
