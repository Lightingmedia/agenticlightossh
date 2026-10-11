// Direct provider adapters. Each adapter validates credentials with the
// cheapest read-only call the provider offers and lists GPU inventory in a
// normalized shape. Nothing here creates, modifies or deletes cloud resources:
// launches are executed by the Aurora runtime gateway (see AGENTS.md).
import { AwsClient } from "npm:aws4fetch@1.0.20";
import type { InventoryItem } from "../provider-catalog.ts";
import { assertPublicHttps, awsRegion, b64url, b64urlDecode, bearer, getJson, pemToPkcs8, ProviderError, request, xmlAll, xmlFirst } from "./http.ts";

export type Creds = Record<string, string>;
export type Validation = { identity: string; message?: string };
export type Adapter = {
  validate: (c: Creds) => Promise<Validation>;
  inventory: (c: Creds) => Promise<InventoryItem[]>;
};

// ───────────────────────── AWS ─────────────────────────

const AWS_GPU_FAMILIES: [RegExp, string][] = [
  [/^p6e?-gb200/, "GB200"], [/^p6-b200/, "B200"], [/^p6-b300/, "B300"], [/^p5en?\./, "H200"], [/^p5\./, "H100"],
  [/^p4de?\./, "A100"], [/^g6e\./, "L40S"], [/^g6\./, "L4"], [/^g5\./, "A10G"], [/^g4dn\./, "T4"],
  [/^trn2/, "Trainium2"], [/^trn1/, "Trainium"], [/^inf2/, "Inferentia2"],
];

async function awsClient(c: Creds): Promise<AwsClient> {
  const region = awsRegion(c.region);
  if (c.roleArn) {
    const platformKey = Deno.env.get("LIGHTRAIL_AWS_ACCESS_KEY_ID");
    const platformSecret = Deno.env.get("LIGHTRAIL_AWS_SECRET_ACCESS_KEY");
    if (!platformKey || !platformSecret) {
      throw new ProviderError("Role connections need the LightRail platform AWS principal (LIGHTRAIL_AWS_ACCESS_KEY_ID / LIGHTRAIL_AWS_SECRET_ACCESS_KEY) configured as edge function secrets");
    }
    const platform = new AwsClient({ accessKeyId: platformKey, secretAccessKey: platformSecret, service: "sts", region: "us-east-1" });
    const body = new URLSearchParams({
      Action: "AssumeRole", Version: "2011-06-15", RoleArn: c.roleArn,
      RoleSessionName: "lightos-control-plane", DurationSeconds: "900",
      ...(c.externalId ? { ExternalId: c.externalId } : {}),
    });
    const res = await platform.fetch("https://sts.amazonaws.com/", { method: "POST", body });
    const xml = await res.text();
    if (!res.ok) throw new ProviderError(`AssumeRole failed: ${xmlFirst(xml, "Message") ?? res.status}`);
    return new AwsClient({
      accessKeyId: xmlFirst(xml, "AccessKeyId")!,
      secretAccessKey: xmlFirst(xml, "SecretAccessKey")!,
      sessionToken: xmlFirst(xml, "SessionToken"),
      region,
    });
  }
  return new AwsClient({ accessKeyId: c.accessKeyId, secretAccessKey: c.secretAccessKey, region });
}

async function awsQuery(client: AwsClient, service: string, region: string, params: Record<string, string>) {
  const host = service === "sts" ? "sts.amazonaws.com" : `${service}.${region}.amazonaws.com`;
  const res = await client.fetch(`https://${host}/`, {
    method: "POST",
    body: new URLSearchParams(params),
    aws: { service, region: service === "sts" ? "us-east-1" : region },
  });
  const xml = await res.text();
  if (!res.ok) throw new ProviderError(`AWS ${service} returned ${res.status}: ${xmlFirst(xml, "Message") ?? ""}`.trim(), res.status);
  return xml;
}

const aws: Adapter = {
  async validate(c) {
    const xml = await awsQuery(await awsClient(c), "sts", "us-east-1", { Action: "GetCallerIdentity", Version: "2011-06-15" });
    return { identity: xmlFirst(xml, "Arn") ?? "AWS principal" };
  },
  async inventory(c) {
    const region = awsRegion(c.region);
    const xml = await awsQuery(await awsClient(c), "ec2", region, {
      Action: "DescribeInstances", Version: "2016-11-15", MaxResults: "1000",
      "Filter.1.Name": "instance-type",
      "Filter.1.Value.1": "p*", "Filter.1.Value.2": "g*", "Filter.1.Value.3": "trn*", "Filter.1.Value.4": "inf*",
      "Filter.2.Name": "instance-state-name",
      "Filter.2.Value.1": "pending", "Filter.2.Value.2": "running", "Filter.2.Value.3": "stopping", "Filter.2.Value.4": "stopped",
    });
    return xml.split("<instanceId>").slice(1).map((seg) => {
      const type = xmlFirst(seg, "instanceType") ?? "";
      return {
        kind: "instance" as const,
        id: seg.slice(0, seg.indexOf("<")),
        name: type,
        accelerator: AWS_GPU_FAMILIES.find(([re]) => re.test(type))?.[1],
        region: xmlFirst(seg, "availabilityZone") ?? region,
        status: xmlFirst(xmlFirst(seg, "instanceState") ?? "", "name"),
      };
    });
  },
};

// ───────────────────────── Google Cloud ─────────────────────────

async function gcpToken(c: Creds): Promise<{ token: string; email: string }> {
  let sa: { client_email: string; private_key: string; token_uri?: string };
  try { sa = JSON.parse(c.serviceAccountJson); } catch { throw new ProviderError("Service account key is not valid JSON"); }
  if (!sa.client_email || !sa.private_key) throw new ProviderError("Service account key is missing client_email or private_key");
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = b64url(JSON.stringify({
    iss: sa.client_email, aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 600,
    scope: "https://www.googleapis.com/auth/cloud-platform.read-only",
  }));
  const key = await crypto.subtle.importKey("pkcs8", pemToPkcs8(sa.private_key), { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(`${header}.${claims}`));
  const { json } = await request("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${header}.${claims}.${b64url(sig)}` }),
  });
  return { token: json.access_token, email: sa.client_email };
}

const gcp: Adapter = {
  async validate(c) {
    const { token, email } = await gcpToken(c);
    const p = await getJson(`https://compute.googleapis.com/compute/v1/projects/${encodeURIComponent(c.projectId)}`, bearer(token));
    return { identity: `${email} → ${p?.name ?? c.projectId}` };
  },
  async inventory(c) {
    const { token } = await gcpToken(c);
    const project = encodeURIComponent(c.projectId);
    const items: InventoryItem[] = [];
    const agg = await getJson(`https://compute.googleapis.com/compute/v1/projects/${project}/aggregated/instances?maxResults=500`, bearer(token));
    for (const [zoneKey, scoped] of Object.entries<any>(agg?.items ?? {})) {
      for (const vm of scoped?.instances ?? []) {
        const machine = String(vm.machineType ?? "").split("/").pop() ?? "";
        const acc = vm.guestAccelerators?.[0];
        const builtIn = /^a4/.test(machine) ? "B200" : /^a3-ultra/.test(machine) ? "H200" : /^a3/.test(machine) ? "H100" : /^a2/.test(machine) ? "A100" : /^g2/.test(machine) ? "L4" : undefined;
        if (!acc && !builtIn) continue;
        items.push({
          kind: "instance", id: String(vm.id), name: vm.name,
          accelerator: acc ? String(acc.acceleratorType).split("/").pop() : builtIn,
          acceleratorCount: acc?.acceleratorCount,
          region: zoneKey.replace("zones/", ""), status: vm.status,
        });
      }
    }
    try {
      const tpu = await getJson(`https://tpu.googleapis.com/v2/projects/${project}/locations/-/nodes`, bearer(token));
      for (const n of tpu?.nodes ?? []) {
        items.push({ kind: "node", id: n.name, name: String(n.name).split("/").pop()!, accelerator: n.acceleratorType, region: String(n.name).split("/")[3], status: n.state });
      }
    } catch { /* TPU API not enabled on this project */ }
    return items;
  },
};

// ───────────────────────── Azure ─────────────────────────

async function azureToken(c: Creds) {
  const { json } = await request(`https://login.microsoftonline.com/${encodeURIComponent(c.tenantId)}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "client_credentials", client_id: c.clientId, client_secret: c.clientSecret, scope: "https://management.azure.com/.default" }),
  });
  return json.access_token as string;
}

function azureAccelerator(size: string) {
  const s = size.toUpperCase();
  if (s.includes("GB200")) return "GB200";
  if (s.includes("H200")) return "H200";
  if (s.includes("H100")) return "H100";
  if (s.includes("MI300X")) return "MI300X";
  if (s.includes("A100")) return "A100";
  if (s.includes("A10")) return "A10";
  if (s.includes("T4")) return "T4";
  return "NVIDIA (N-series)";
}

const azure: Adapter = {
  async validate(c) {
    const token = await azureToken(c);
    const sub = await getJson(`https://management.azure.com/subscriptions/${encodeURIComponent(c.subscriptionId)}?api-version=2022-12-01`, bearer(token));
    return { identity: `${sub?.displayName ?? c.subscriptionId} (${sub?.state ?? "unknown state"})` };
  },
  async inventory(c) {
    const token = await azureToken(c);
    const out: InventoryItem[] = [];
    let url: string | undefined = `https://management.azure.com/subscriptions/${encodeURIComponent(c.subscriptionId)}/providers/Microsoft.Compute/virtualMachines?api-version=2024-07-01`;
    for (let page = 0; url && page < 10; page++) {
      const data = await getJson(url, bearer(token));
      for (const vm of data?.value ?? []) {
        const size = vm.properties?.hardwareProfile?.vmSize ?? "";
        if (!/^Standard_N/i.test(size)) continue;
        out.push({ kind: "instance", id: vm.id, name: vm.name, accelerator: azureAccelerator(size), region: vm.location, status: vm.properties?.provisioningState });
      }
      url = data?.nextLink;
    }
    return out;
  },
};

// ───────────────────────── Kubernetes (CoreWeave CKS + generic) ─────────────────────────

const k8s: Adapter = {
  async validate(c) {
    const base = await assertPublicHttps(c.apiServer);
    try {
      const { json } = await request(`${base}/apis/authentication.k8s.io/v1/selfsubjectreviews`, {
        method: "POST", redirect: "manual",
        headers: { ...bearer(c.token), "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ apiVersion: "authentication.k8s.io/v1", kind: "SelfSubjectReview" }),
      });
      return { identity: json?.status?.userInfo?.username ?? "authenticated" };
    } catch (e) {
      if (e instanceof ProviderError && e.status === 404) {
        await request(`${base}/api/v1/nodes?limit=1`, { headers: { ...bearer(c.token), Accept: "application/json" }, redirect: "manual" });
        return { identity: "token accepted (cluster < 1.28)" };
      }
      throw e;
    }
  },
  async inventory(c) {
    const base = await assertPublicHttps(c.apiServer);
    const { json: nodes } = await request(`${base}/api/v1/nodes`, { headers: { ...bearer(c.token), Accept: "application/json" }, redirect: "manual" });
    return (nodes?.items ?? []).flatMap((n: any): InventoryItem[] => {
      const cap = n.status?.capacity ?? {};
      const count = Number(cap["nvidia.com/gpu"] ?? cap["amd.com/gpu"] ?? cap["gpu.intel.com/xe"] ?? 0);
      if (!count) return [];
      const labels = n.metadata?.labels ?? {};
      const ready = (n.status?.conditions ?? []).find((x: any) => x.type === "Ready")?.status === "True";
      return [{
        kind: "node", id: n.metadata?.uid, name: n.metadata?.name,
        accelerator: labels["nvidia.com/gpu.product"] ?? labels["gpu.nvidia.com/class"] ?? labels["amd.com/gpu.product-name"] ?? Object.keys(cap).find((k) => k.endsWith("/gpu")),
        acceleratorCount: count,
        region: labels["topology.kubernetes.io/region"] ?? labels["topology.kubernetes.io/zone"],
        status: ready ? "Ready" : "NotReady",
      }];
    });
  },
};

// ───────────────────────── Lambda ─────────────────────────

const LAMBDA = "https://cloud.lambda.ai/api/v1";
const lambda: Adapter = {
  async validate(c) {
    const d = await getJson(`${LAMBDA}/instances`, bearer(c.apiKey));
    return { identity: `Lambda account (${d?.data?.length ?? 0} instances)` };
  },
  async inventory(c) {
    const [inst, types] = await Promise.all([
      getJson(`${LAMBDA}/instances`, bearer(c.apiKey)),
      getJson(`${LAMBDA}/instance-types`, bearer(c.apiKey)).catch(() => null),
    ]);
    const running: InventoryItem[] = (inst?.data ?? []).map((i: any) => ({
      kind: "instance", id: i.id, name: i.name ?? i.instance_type?.name, accelerator: i.instance_type?.description,
      acceleratorCount: i.instance_type?.specs?.gpus, region: i.region?.name, status: i.status,
    }));
    const offers: InventoryItem[] = Object.values<any>(types?.data ?? {})
      .filter((t) => (t.regions_with_capacity_available ?? []).length > 0)
      .map((t) => ({
        kind: "offer", id: t.instance_type?.name, name: t.instance_type?.name, accelerator: t.instance_type?.description,
        acceleratorCount: t.instance_type?.specs?.gpus,
        region: (t.regions_with_capacity_available ?? []).map((r: any) => r.name).join(", "),
        pricePerHourUsd: t.instance_type?.price_cents_per_hour != null ? t.instance_type.price_cents_per_hour / 100 : undefined,
      }));
    return [...running, ...offers];
  },
};

// ───────────────────────── RunPod (REST v2) ─────────────────────────

const RUNPOD = "https://api.runpod.io/v2";
const runpod: Adapter = {
  async validate(c) {
    const d = await getJson(`${RUNPOD}/pods`, bearer(c.apiKey));
    return { identity: `RunPod account (${(d?.pods ?? []).length} pods)` };
  },
  async inventory(c) {
    const [pods, gpus] = await Promise.all([
      getJson(`${RUNPOD}/pods`, bearer(c.apiKey)),
      getJson(`${RUNPOD}/catalog/gpus`, bearer(c.apiKey)).catch(() => null),
    ]);
    const list = Array.isArray(gpus) ? gpus : gpus?.gpus ?? gpus?.data ?? [];
    return [
      ...(pods?.pods ?? []).map((p: any): InventoryItem => ({
        kind: "instance", id: p.id, name: p.name ?? p.id, accelerator: p.gpu?.displayName ?? p.gpuTypeId ?? p.machine?.gpuTypeId,
        acceleratorCount: p.gpuCount ?? p.gpu?.count, region: p.dataCenterId ?? p.machine?.dataCenterId, status: p.desiredStatus ?? p.status,
        pricePerHourUsd: p.costPerHr ?? p.adjustedCostPerHr,
      })),
      ...list.slice(0, 200).map((g: any): InventoryItem => ({
        kind: "offer", id: g.id ?? g.gpuTypeId, name: g.displayName ?? g.id, accelerator: g.displayName ?? g.id,
        pricePerHourUsd: g.securePrice ?? g.communityPrice ?? g.price,
      })),
    ];
  },
};

// ───────────────────────── Vast.ai ─────────────────────────

const VAST = "https://console.vast.ai/api/v0";
const vast: Adapter = {
  async validate(c) {
    const u = await getJson(`${VAST}/users/current/`, bearer(c.apiKey));
    return { identity: u?.email ?? u?.username ?? `user ${u?.id ?? ""}`.trim() };
  },
  async inventory(c) {
    const d = await getJson(`${VAST}/instances/`, bearer(c.apiKey));
    return (d?.instances ?? []).map((i: any): InventoryItem => ({
      kind: "instance", id: String(i.id), name: i.label ?? `vast-${i.id}`, accelerator: i.gpu_name, acceleratorCount: i.num_gpus,
      region: i.geolocation, status: i.actual_status, pricePerHourUsd: i.dph_total,
    }));
  },
};

// ───────────────────────── DigitalOcean ─────────────────────────

const DO = "https://api.digitalocean.com/v2";
const digitalocean: Adapter = {
  async validate(c) {
    const a = await getJson(`${DO}/account`, bearer(c.token));
    return { identity: a?.account?.email ?? "DigitalOcean account" };
  },
  async inventory(c) {
    const d = await getJson(`${DO}/droplets?per_page=200`, bearer(c.token));
    return (d?.droplets ?? [])
      .filter((x: any) => String(x.size_slug).startsWith("gpu-"))
      .map((x: any): InventoryItem => ({
        kind: "instance", id: String(x.id), name: x.name, accelerator: x.gpu_info?.model ?? x.size_slug,
        acceleratorCount: x.gpu_info?.count, region: x.region?.slug, status: x.status,
        pricePerHourUsd: x.size?.price_hourly,
      }));
  },
};

// ───────────────────────── Crusoe (HMAC-signed) ─────────────────────────

const CRUSOE = "https://api.cloud.crusoe.ai";
async function crusoeGet(c: Creds, path: string, query: Record<string, string> = {}) {
  const ts = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  const qs = Object.keys(query).sort().map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(query[k])}`).join("&");
  const payload = `${path}\n${qs}\nGET\n${ts}\n`;
  const key = await crypto.subtle.importKey("raw", b64urlDecode(c.secretKey), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = b64url(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload)));
  return getJson(`${CRUSOE}${path}${qs ? `?${qs}` : ""}`, {
    "X-Crusoe-Timestamp": ts,
    Authorization: `Bearer 1.0:${c.accessKeyId}:${sig}`,
  });
}
const crusoe: Adapter = {
  async validate(c) {
    await crusoeGet(c, "/v1/capacities");
    return { identity: `Crusoe key …${c.accessKeyId.slice(-4)}` };
  },
  async inventory(c) {
    const d = await crusoeGet(c, "/v1/capacities");
    const rows = Array.isArray(d) ? d : d?.items ?? d?.capacities ?? [];
    return rows.map((r: any): InventoryItem => ({
      kind: "offer", id: `${r.type ?? r.product_name}@${r.location}`, name: r.type ?? r.product_name,
      accelerator: r.type ?? r.product_name, region: r.location, status: r.quantity != null ? `${r.quantity} available` : undefined,
    }));
  },
};

// ───────────────────────── OpenAI-compatible inference APIs ─────────────────────────

const OPENAI_BASES: Record<string, string> = {
  general_compute: "https://api.generalcompute.com/v1",
  nvidia_api_catalog: "https://integrate.api.nvidia.com/v1",
  cerebras: "https://api.cerebras.ai/v1",
  groq: "https://api.groq.com/openai/v1",
  sambanova: "https://api.sambanova.ai/v1",
  fireworks: "https://api.fireworks.ai/inference/v1",
  together_gpu_clusters: "https://api.together.xyz/v1",
};

function openAiAdapter(providerId: string): Adapter {
  const base = OPENAI_BASES[providerId];
  const models = async (c: Creds) => {
    const d = await getJson(`${base}/models`, bearer(c.apiKey));
    return (Array.isArray(d) ? d : d?.data ?? []) as any[];
  };
  return {
    async validate(c) {
      if (providerId === "nvidia_api_catalog") return { identity: await ngcCheckKey(c.apiKey) };
      const m = await models(c);
      if (providerId === "sambanova") return await sambanovaCheckKey(base, c.apiKey, m);
      return { identity: `${m.length} models available` };
    },
    async inventory(c) {
      return (await models(c)).slice(0, 500).map((m): InventoryItem => ({
        kind: "model", id: m.id, name: m.display_name ?? m.id, status: m.owned_by ?? m.type,
      }));
    },
  };
}

// NVIDIA's /v1/models is public and accepts any key, so verify with NGC's key service.
async function ngcCheckKey(key: string): Promise<string> {
  const { json } = await request("https://api.ngc.nvidia.com/v3/keys/get-caller-info", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ credentials: key }).toString(),
  });
  const who = json?.user?.name ?? json?.user?.email ?? json?.name ?? json?.email;
  return who ? `NGC account ${who}` : "NGC API key accepted";
}

// SambaNova's model list is public too: probe the key with a one-token completion.
async function sambanovaCheckKey(base: string, key: string, models: any[]): Promise<Validation> {
  const candidates = models.map((m) => m?.id).filter((id) => typeof id === "string" && !/embed|whisper|tts|rerank|guard|vision|ocr|image/i.test(id)).slice(0, 3);
  if (!candidates.length) throw new ProviderError("SambaNova returned no chat models to verify the key with");
  let last = "no usable model";
  for (const model of candidates) {
    try {
      await request(`${base}/chat/completions`, {
        method: "POST",
        headers: { ...bearer(key), "Content-Type": "application/json" },
        body: JSON.stringify({ model, messages: [{ role: "user", content: "ping" }], max_tokens: 1 }),
      });
      return { identity: `${models.length} models available` };
    } catch (e) {
      if (!(e instanceof ProviderError)) throw e;
      if (e.status === 401 || e.status === 403) throw e;
      if (e.status === 429) return { identity: `${models.length} models available`, message: "Key accepted (rate limited at the moment)." };
      last = e.message;
    }
  }
  throw new ProviderError(`Could not verify the SambaNova key: ${last}`);
}

export const ADAPTERS: Record<string, Adapter> = {
  aws, gcp, azure, coreweave: k8s, kubernetes: k8s, lambda, runpod, vast, digitalocean, crusoe,
  ...Object.fromEntries(Object.keys(OPENAI_BASES).map((id) => [id, openAiAdapter(id)])),
};
