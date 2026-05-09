// Tiny in-memory virtual filesystem shared by Files & Terminal.
type FileNode = { type: "file"; content: string };
type DirNode = { type: "dir"; children: Record<string, Node> };
type Node = FileNode | DirNode;

function dir(children: Record<string, Node> = {}): DirNode {
  return { type: "dir", children };
}
function file(content: string): FileNode {
  return { type: "file", content };
}

export const VFS: DirNode = dir({
  root: dir({
    "README.md": file(
      "# LightOS\n\nLightRail Photonic AI Infrastructure.\nWelcome to your appliance.\n",
    ),
    "deploy.yaml": file(
      "apiVersion: lightrail/v1\nkind: FabricDeployment\nmetadata:\n  name: aurora-pro\nspec:\n  replicas: 8\n  topology: photonic-mesh-20x64\n",
    ),
    notes: dir({
      "todo.txt": file("- tune NCCL\n- profile GPU 3 thermals\n- ship LightCompiler v0.4\n"),
    }),
  }),
  etc: dir({
    "lightos.conf": file(
      "[fabric]\ncontroller = LightRail Gen 2\nlinks = 64\nwdm_channels = 16\n\n[ai]\naccelerator = NCE-700\nmemory = 1536GB HBM3e\n",
    ),
    hostname: file("lightos-main\n"),
    "os-release": file(
      'NAME="LightOS"\nVERSION="1.0 (Aurora)"\nID=lightos\nID_LIKE=ubuntu\nPRETTY_NAME="LightOS 1.0 — AI Appliance"\n',
    ),
  }),
  var: dir({
    log: dir({
      "fabric.log": file(
        "[10:24:01] fabric controller online\n[10:24:02] 64 optical links up\n[10:24:03] WDM negotiated 16ch @ 200G\n[10:24:11] NCE-700 firmware 1.4.2 loaded\n",
      ),
      "kernel.log": file(
        "[ 0.000000] Linux version 6.8.0-lightrail\n[ 0.214] PCIe Gen5 link up x16\n[ 0.512] iommu: enabled\n[ 1.012] hugepages: 1024 x 2M\n",
      ),
    }),
  }),
  proc: dir({
    cpuinfo: file("model name : LightRail Fabric Controller Gen 2\ncores : 64\n"),
    meminfo: file("MemTotal: 1572864000 kB\nHugePages_Total: 1024\n"),
  }),
  usr: dir({
    bin: dir({
      lightctl: file("#!/bin/sh\n# LightRail control CLI\n"),
      lightcompile: file("#!/bin/sh\n# Photonic kernel compiler\n"),
    }),
  }),
  tmp: dir({}),
});

export function resolvePath(cwd: string, input: string): string {
  let p = input.startsWith("/") ? input : `${cwd}/${input}`;
  const parts: string[] = [];
  for (const seg of p.split("/")) {
    if (!seg || seg === ".") continue;
    if (seg === "..") parts.pop();
    else parts.push(seg);
  }
  return "/" + parts.join("/");
}

function getNode(path: string): Node | null {
  if (path === "/" || path === "") return VFS;
  const parts = path.split("/").filter(Boolean);
  let cur: Node = VFS;
  for (const p of parts) {
    if (cur.type !== "dir") return null;
    const next = cur.children[p];
    if (!next) return null;
    cur = next;
  }
  return cur;
}

export function listDir(path: string): { name: string; type: "file" | "dir" }[] {
  const n = getNode(path);
  if (!n || n.type !== "dir") return [];
  return Object.entries(n.children)
    .map(([name, node]) => ({ name, type: node.type }))
    .sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === "dir" ? -1 : 1));
}

export function readFile(path: string): string | null {
  const n = getNode(path);
  if (!n || n.type !== "file") return null;
  return n.content;
}

export function isDir(path: string): boolean {
  const n = getNode(path);
  return !!n && n.type === "dir";
}

export function exists(path: string): boolean {
  return getNode(path) !== null;
}

/** Write a file (creates parent if it exists). Returns true on success. */
export function writeFile(path: string, content: string, append = false): boolean {
  const parts = path.split("/").filter(Boolean);
  if (parts.length === 0) return false;
  const name = parts.pop() as string;
  let cur: Node = VFS;
  for (const p of parts) {
    if (cur.type !== "dir") return false;
    const next = cur.children[p];
    if (!next) return false;
    cur = next;
  }
  if (cur.type !== "dir") return false;
  const existing = cur.children[name];
  if (existing && existing.type === "dir") return false;
  const prev = append && existing && existing.type === "file" ? existing.content : "";
  cur.children[name] = { type: "file", content: prev + content };
  return true;
}

function getParent(path: string): { parent: DirNode | null; name: string } {
  const parts = path.split("/").filter(Boolean);
  if (parts.length === 0) return { parent: null, name: "" };
  const name = parts.pop() as string;
  let cur: Node = VFS;
  for (const p of parts) {
    if (cur.type !== "dir") return { parent: null, name };
    const next = cur.children[p];
    if (!next) return { parent: null, name };
    cur = next;
  }
  return { parent: cur.type === "dir" ? cur : null, name };
}

/** Create a directory. With recursive=true, creates parents as needed. */
export function mkdir(path: string, recursive = false): { ok: boolean; error?: string } {
  if (path === "/" || path === "") return { ok: false, error: "cannot create '/'" };
  if (recursive) {
    const parts = path.split("/").filter(Boolean);
    let cur: DirNode = VFS;
    for (const p of parts) {
      const next = cur.children[p];
      if (!next) {
        const nd: DirNode = { type: "dir", children: {} };
        cur.children[p] = nd;
        cur = nd;
      } else if (next.type === "dir") {
        cur = next;
      } else {
        return { ok: false, error: `'${p}' exists and is not a directory` };
      }
    }
    return { ok: true };
  }
  const { parent, name } = getParent(path);
  if (!parent) return { ok: false, error: "no such parent directory" };
  if (parent.children[name]) return { ok: false, error: "file exists" };
  parent.children[name] = { type: "dir", children: {} };
  return { ok: true };
}

/** Remove a file or directory. */
export function remove(path: string, recursive = false): { ok: boolean; error?: string } {
  if (path === "/" || path === "") return { ok: false, error: "refusing to remove '/'" };
  const { parent, name } = getParent(path);
  if (!parent || !parent.children[name]) return { ok: false, error: "no such file or directory" };
  const node = parent.children[name];
  if (node.type === "dir" && Object.keys(node.children).length > 0 && !recursive) {
    return { ok: false, error: "directory not empty" };
  }
  delete parent.children[name];
  return { ok: true };
}

function cloneNode(n: Node): Node {
  if (n.type === "file") return { type: "file", content: n.content };
  const children: Record<string, Node> = {};
  for (const [k, v] of Object.entries(n.children)) children[k] = cloneNode(v);
  return { type: "dir", children };
}

/** Copy src → dest. Recursive for directories. */
export function copy(src: string, dest: string, recursive = false): { ok: boolean; error?: string } {
  const node = getNode(src);
  if (!node) return { ok: false, error: `no such file or directory: ${src}` };
  if (node.type === "dir" && !recursive) return { ok: false, error: "omitting directory (use -r)" };
  // If dest is an existing directory, copy into it as basename(src)
  let targetPath = dest;
  const destNode = getNode(dest);
  if (destNode && destNode.type === "dir") {
    const base = src.split("/").filter(Boolean).pop() || "";
    targetPath = (dest === "/" ? "" : dest) + "/" + base;
  }
  const { parent, name } = getParent(targetPath);
  if (!parent) return { ok: false, error: "no such parent directory" };
  parent.children[name] = cloneNode(node);
  return { ok: true };
}

/** Move/rename src → dest. */
export function move(src: string, dest: string): { ok: boolean; error?: string } {
  const node = getNode(src);
  if (!node) return { ok: false, error: `no such file or directory: ${src}` };
  let targetPath = dest;
  const destNode = getNode(dest);
  if (destNode && destNode.type === "dir") {
    const base = src.split("/").filter(Boolean).pop() || "";
    targetPath = (dest === "/" ? "" : dest) + "/" + base;
  }
  const { parent: dParent, name: dName } = getParent(targetPath);
  if (!dParent) return { ok: false, error: "no such parent directory" };
  const { parent: sParent, name: sName } = getParent(src);
  if (!sParent) return { ok: false, error: "no such parent directory" };
  dParent.children[dName] = node;
  if (!(sParent === dParent && sName === dName)) delete sParent.children[sName];
  return { ok: true };
}

// --------- file metadata (mode / owner / group) ---------
type Meta = { mode: string; owner: string; group: string };
const META = new Map<string, Meta>();
export function getMeta(path: string): Meta {
  return META.get(path) ?? { mode: "rwxr-xr-x", owner: "root", group: "root" };
}
export function setMode(path: string, mode: string): boolean {
  if (!exists(path)) return false;
  const m = getMeta(path);
  META.set(path, { ...m, mode });
  return true;
}
export function setOwner(path: string, owner: string, group?: string): boolean {
  if (!exists(path)) return false;
  const m = getMeta(path);
  META.set(path, { ...m, owner, group: group ?? m.group });
  return true;
}

/** Convert a numeric mode like "755" to "rwxr-xr-x". */
export function modeFromOctal(s: string): string | null {
  if (!/^[0-7]{3,4}$/.test(s)) return null;
  const digits = s.slice(-3);
  const map = ["---", "--x", "-w-", "-wx", "r--", "r-x", "rw-", "rwx"];
  return digits.split("").map((d) => map[parseInt(d, 8)]).join("");
}

/** Tab-completion candidates for a path prefix. */
export function completePath(cwd: string, input: string): string[] {
  const lastSlash = input.lastIndexOf("/");
  const dirPart = lastSlash === -1 ? "" : input.slice(0, lastSlash + 1);
  const basePart = lastSlash === -1 ? input : input.slice(lastSlash + 1);
  const baseDir = resolvePath(cwd, dirPart || ".");
  const entries = listDir(baseDir);
  return entries
    .filter((e) => e.name.startsWith(basePart))
    .map((e) => `${dirPart}${e.name}${e.type === "dir" ? "/" : ""}`);
}
