// Regenerates backend/providers/catalog.json from the TypeScript provider catalog, which stays the single source
// of truth shared by the browser and the Supabase edge function. Run it after editing
// supabase/functions/_shared/provider-catalog.ts:
//
//   npm run export:provider-catalog
//
// Needs Node >= 22.18 (it imports the .ts file directly). `npm test` fails if the committed JSON is stale.
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { CATEGORY_LABELS, PROVIDERS } from "../supabase/functions/_shared/provider-catalog.ts";

const out = fileURLToPath(new URL("../backend/providers/catalog.json", import.meta.url));
writeFileSync(out, `${JSON.stringify({ providers: PROVIDERS, categoryLabels: CATEGORY_LABELS }, null, 2)}\n`);
console.log(`wrote ${out} (${PROVIDERS.length} providers)`);
