import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { CATEGORY_LABELS, PROVIDERS } from "@/lib/providers/catalog";

// The Python backend (backend/providers) reads the provider catalog from a JSON export of this TypeScript catalog.
describe("backend provider catalog export", () => {
  it("backend/providers/catalog.json matches the TypeScript catalog", () => {
    // vitest runs from the project root (import.meta.url is not a file: URL in the jsdom environment)
    const committed = JSON.parse(readFileSync(resolve(process.cwd(), "backend/providers/catalog.json"), "utf8"));
    const current = JSON.parse(JSON.stringify({ providers: PROVIDERS, categoryLabels: CATEGORY_LABELS }));
    // On failure run: npm run export:provider-catalog
    expect(committed).toEqual(current);
  });
});
