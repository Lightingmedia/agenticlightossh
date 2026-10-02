// Ubuntu-style command set for the LightOS terminal.
// Runs entirely in the browser against the virtual filesystem — no real host shell is exposed.
import { getMeta, isDir, listDir, readFile, remove, resolvePath, writeFile, exists } from "../vfs";

export interface UCmdResult { stdout: string; stderr?: string; code: number }
export interface UShellCtx {
  cwd: string;
  env: Record<string, string>;
  lastExit: number;
  signal?: AbortSignal;
  write?: (s: string) => void;
  setCwd: (p: string) => void;
}
export type UBuiltin = (args: string[], stdin: string, ctx: UShellCtx) => UCmdResult | Promise<UCmdResult>;

const ok = (stdout = ""): UCmdResult => ({ stdout, code: 0 });
const fail = (stderr: string, code = 1): UCmdResult => ({ stdout: "", stderr, code });
const wait = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((r) => {
    if (signal?.aborted) return r();
    const t = window.setTimeout(r, ms);
    signal?.addEventListener("abort", () => { window.clearTimeout(t); r(); }, { once: true });
  });

const installed = new Set<string>(["coreutils", "bash", "python3", "curl", "wget", "git", "vim", "nano", "htop", "docker.io", "kubectl", "nvidia-driver-550", "datacenter-gpu-manager"]);
const BOOT = Date.now();
const aliases: Record<string, string> = { ll: "ls -la", la: "ls -a", l: "ls" };

function readInputs(a: string[], stdin: string, ctx: UShellCtx): { text: string; err?: string } {
  const files = a.filter((x) => !x.startsWith("-"));
  if (!files.length) return { text: stdin };
  let text = "";
  for (const f of files) {
    const c = readFile(resolvePath(ctx.cwd, f));
    if (c === null) return { text, err: `${f}: No such file or directory\n` };
    text += c;
  }
  return { text };
}
const lines = (s: string) => s.replace(/\n$/, "").split("\n");

function walk(path: string, out: string[]) {
  out.push(path);
  if (!isDir(path)) return;
  for (const e of listDir(path)) walk(`${path === "/" ? "" : path}/${e.name}`, out);
}

async function sha(algo: "SHA-256" | "SHA-1", s: string) {
  const buf = await crypto.subtle.digest(algo, new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function ubuntuBuiltins(base: Record<string, UBuiltin>): Record<string, UBuiltin> {
  const run = async (argv: string[], stdin: string, ctx: UShellCtx): Promise<UCmdResult> => {
    const [name, ...rest] = argv;
    if (!name) return ok();
    if (aliases[name]) return run([...aliases[name].split(" "), ...rest], stdin, ctx);
    const fn = base[name];
    if (!fn) return fail(notFound(name), 127);
    return fn(rest, stdin, ctx);
  };

  const cmds: Record<string, UBuiltin> = {
    sudo: (a, s, c) => (a[0] === "-i" || a[0] === "su" ? ok("") : run(a.filter((x) => x !== "-E"), s, c)),
    su: () => ok(""),
    doas: (a, s, c) => run(a, s, c),
    which: (a) => {
      const out = a.map((n) => (base[n] ? `/usr/bin/${n}` : "")).filter(Boolean);
      return out.length ? ok(out.join("\n") + "\n") : { stdout: "", code: 1 };
    },
    type: (a) => ok(a.map((n) => (aliases[n] ? `${n} is aliased to '${aliases[n]}'` : base[n] ? `${n} is /usr/bin/${n}` : `bash: type: ${n}: not found`)).join("\n") + "\n"),
    command: (a, s, c) => (a[0] === "-v" ? cmds.which(a.slice(1), s, c) : run(a, s, c)),
    alias: (a) => {
      if (!a.length) return ok(Object.entries(aliases).map(([k, v]) => `alias ${k}='${v}'`).join("\n") + "\n");
      for (const def of a) { const [k, ...v] = def.split("="); if (v.length) aliases[k] = v.join("=").replace(/^['"]|['"]$/g, ""); }
      return ok();
    },
    unalias: (a) => { a.forEach((k) => delete aliases[k]); return ok(); },
    man: (a) => (a[0] ? ok(`${a[0].toUpperCase()}(1)            User Commands\n\nNAME\n       ${a[0]} - ${base[a[0]] ? "available in LightOS shell" : "no manual entry"}\n\nTry '${a[0]} --help'.\n`) : fail("What manual page do you want?\n")),
    apt: async (a, _s, ctx) => {
      const sub = a[0];
      const pkgs = a.slice(1).filter((x) => !x.startsWith("-"));
      const w = ctx.write ?? (() => {});
      if (sub === "update") {
        for (const r of ["noble", "noble-updates", "noble-security", "lightos-aurora"]) {
          w(`Hit:1 http://archive.ubuntu.com/ubuntu ${r} InRelease\r\n`); await wait(180, ctx.signal);
        }
        return ok("Reading package lists... Done\nAll packages are up to date.\n");
      }
      if (sub === "install" || sub === "reinstall") {
        if (!pkgs.length) return fail("E: No packages specified\n", 100);
        w("Reading package lists... Done\r\nBuilding dependency tree... Done\r\n");
        for (const p of pkgs) {
          await wait(250, ctx.signal);
          w(`Setting up ${p} ...\r\n`);
          installed.add(p);
        }
        return ok(`${pkgs.length} newly installed, 0 to remove.\n`);
      }
      if (sub === "remove" || sub === "purge") { pkgs.forEach((p) => installed.delete(p)); return ok(`Removing ${pkgs.join(" ")} ...\n`); }
      if (sub === "list") return ok([...installed].sort().map((p) => `${p}/noble,now amd64 [installed]`).join("\n") + "\n");
      if (sub === "search") return ok(pkgs.map((p) => `${p}/noble amd64\n  ${p} package`).join("\n") + "\n");
      if (sub === "upgrade" || sub === "full-upgrade" || sub === "autoremove") return ok("0 upgraded, 0 newly installed, 0 to remove and 0 not upgraded.\n");
      return ok("apt 2.7.14 (amd64)\nUsage: apt [options] command\n  update install remove purge list search upgrade autoremove\n");
    },
    dpkg: (a) => (a[0] === "-l" ? ok([...installed].sort().map((p) => `ii  ${p.padEnd(28)} amd64`).join("\n") + "\n") : ok("dpkg 1.22.6\n")),
    snap: (a) => ok(a[0] === "list" ? "Name  Version  Rev  Tracking  Publisher  Notes\ncore  16       1    stable    canonical  core\n" : "snap 2.63\n"),
    lsb_release: () => ok("Distributor ID:\tUbuntu\nDescription:\tUbuntu 24.04 LTS (LightOS Aurora)\nRelease:\t24.04\nCodename:\tnoble\n"),
    uptime: () => {
      const m = Math.floor((Date.now() - BOOT) / 60000);
      return ok(` ${new Date().toTimeString().slice(0, 8)} up ${m} min,  1 user,  load average: 0.42, 0.38, 0.35\n`);
    },
    free: (a) => {
      const h = a.includes("-h");
      return ok(h
        ? "               total        used        free      shared  buff/cache   available\nMem:           2.0Ti       812Gi       1.1Ti       4.0Gi        96Gi       1.2Ti\nSwap:           64Gi          0B        64Gi\n"
        : "               total        used        free\nMem:      2147483648   851443712  1296039936\nSwap:       67108864           0    67108864\n");
    },
    df: () => ok("Filesystem      Size  Used Avail Use% Mounted on\n/dev/nvme0n1p2  7.0T  2.1T  4.9T  30% /\ntmpfs           1.0T  4.0M  1.0T   1% /dev/shm\n/dev/nvme1n1    15T   9.8T  5.2T  66% /data\n"),
    du: (a, _s, ctx) => {
      const t = resolvePath(ctx.cwd, a.filter((x) => !x.startsWith("-"))[0] ?? ".");
      const all: string[] = []; walk(t, all);
      const size = all.reduce((n, p) => n + (readFile(p)?.length ?? 0), 0);
      return ok(`${Math.max(4, Math.ceil(size / 1024))}K\t${t}\n`);
    },
    nproc: () => ok("256\n"),
    arch: () => ok("x86_64\n"),
    lscpu: () => ok("Architecture:        x86_64\nCPU(s):              256\nModel name:          AMD EPYC 9754 128-Core Processor\nThread(s) per core:  2\nSocket(s):           1\n"),
    lsblk: () => ok("NAME        SIZE TYPE MOUNTPOINT\nnvme0n1     7.0T disk\n└─nvme0n1p2  7.0T part /\nnvme1n1      15T disk /data\n"),
    lspci: () => ok("00:00.0 Host bridge: AMD Device 14a4\n41:00.0 3D controller: NVIDIA Corporation GH100 [H100 SXM5 80GB]\nc1:00.0 Ethernet controller: Mellanox ConnectX-7\n"),
    lsusb: () => ok("Bus 001 Device 001: ID 1d6b:0002 Linux Foundation 2.0 root hub\n"),
    lsmod: () => ok("Module                  Size  Used by\nnvidia_uvm           1966080  0\nnvidia              8466432  1 nvidia_uvm\nmlx5_core           2600960  0\n"),
    dmesg: () => ok("[    0.000000] Linux version 6.8.0-lightrail\n[    2.114022] nvidia: loading out-of-tree module\n[    3.002113] mlx5_core: link up 400Gbps\n"),
    "nvidia-smi": () => ok("+-----------------------------------------------------------------------------+\n| NVIDIA-SMI 550.90.07   Driver Version: 550.90.07   CUDA Version: 12.4        |\n|-------------------------------+----------------------+----------------------+\n| GPU  Name        | Memory-Usage         | GPU-Util                          |\n|   0  H100 SXM5   |  71200MiB / 81559MiB |     88%                           |\n+-----------------------------------------------------------------------------+\nNote: simulated view. Live GPU data appears on the dashboard once the runtime gateway is connected.\n"),
    id: () => ok("uid=0(root) gid=0(root) groups=0(root),27(sudo),999(docker)\n"),
    groups: () => ok("root sudo docker\n"),
    who: () => ok(`root     pts/0        ${new Date().toISOString().slice(0, 16).replace("T", " ")}\n`),
    w: () => ok(" USER     TTY      FROM   LOGIN@   IDLE  WHAT\n root     pts/0    -      now      0.00s w\n"),
    users: () => ok("root\n"),
    last: () => ok("root     pts/0        browser          still logged in\n"),
    cal: () => {
      const d = new Date(); const y = d.getFullYear(); const m = d.getMonth();
      const first = new Date(y, m, 1).getDay(); const days = new Date(y, m + 1, 0).getDate();
      let out = `   ${d.toLocaleString("en", { month: "long" })} ${y}\nSu Mo Tu We Th Fr Sa\n` + "   ".repeat(first);
      for (let i = 1; i <= days; i++) { out += String(i).padStart(2) + ((first + i) % 7 === 0 ? "\n" : " "); }
      return ok(out.trimEnd() + "\n");
    },
    sleep: async (a, _s, ctx) => { await wait(Math.min(60, parseFloat(a[0] ?? "0")) * 1000, ctx.signal); return ok(); },
    seq: (a) => {
      const n = a.map(Number); const [s, st, e] = n.length === 1 ? [1, 1, n[0]] : n.length === 2 ? [n[0], 1, n[1]] : [n[0], n[1], n[2]];
      const out: number[] = []; for (let i = s; st > 0 ? i <= e : i >= e; i += st) { out.push(i); if (out.length > 10000) break; }
      return ok(out.join("\n") + "\n");
    },
    yes: (a) => ok(Array(50).fill(a.join(" ") || "y").join("\n") + "\n"),
    printf: (a) => {
      let [fmt, ...vals] = a; fmt = (fmt ?? "").replace(/\\n/g, "\n").replace(/\\t/g, "\t");
      return ok(fmt.replace(/%[sd]/g, () => vals.shift() ?? ""));
    },
    basename: (a) => ok((a[0] ?? "").replace(/\/$/, "").split("/").pop()!.replace(a[1] ?? "\u0000", "") + "\n"),
    dirname: (a) => { const p = (a[0] ?? "").replace(/\/$/, "").split("/"); p.pop(); return ok((p.join("/") || (a[0]?.startsWith("/") ? "/" : ".")) + "\n"); },
    realpath: (a, _s, c) => ok(a.map((p) => resolvePath(c.cwd, p)).join("\n") + "\n"),
    readlink: (a, _s, c) => ok(resolvePath(c.cwd, a.filter((x) => !x.startsWith("-"))[0] ?? ".") + "\n"),
    sort: (a, s, c) => {
      const { text, err } = readInputs(a, s, c); if (err) return fail("sort: " + err);
      let l = lines(text);
      l = a.includes("-n") ? l.sort((x, y) => parseFloat(x) - parseFloat(y)) : l.sort();
      if (a.includes("-r")) l.reverse();
      if (a.includes("-u")) l = [...new Set(l)];
      return ok(l.join("\n") + "\n");
    },
    uniq: (a, s, c) => {
      const { text } = readInputs(a, s, c); const out: [string, number][] = [];
      for (const l of lines(text)) { const last = out[out.length - 1]; if (last && last[0] === l) last[1]++; else out.push([l, 1]); }
      return ok(out.map(([l, n]) => (a.includes("-c") ? `${String(n).padStart(7)} ${l}` : l)).join("\n") + "\n");
    },
    cut: (a, s, c) => {
      const di = a.indexOf("-d"); const fi = a.findIndex((x) => x.startsWith("-f"));
      const d = di >= 0 ? a[di + 1] : "\t";
      const fspec = fi >= 0 ? (a[fi] === "-f" ? a[fi + 1] : a[fi].slice(2)) : "1";
      const fields = fspec.split(",").map(Number);
      const files = a.filter((x, i) => !x.startsWith("-") && i !== di + 1 && !(a[fi] === "-f" && i === fi + 1));
      const { text } = readInputs(files, s, c);
      return ok(lines(text).map((l) => fields.map((f) => l.split(d)[f - 1] ?? "").join(d)).join("\n") + "\n");
    },
    tr: (a, s) => {
      const del = a[0] === "-d"; const [x, y] = del ? [a[1], ""] : [a[0], a[1]];
      const expand = (z = "") => z.replace(/(\w)-(\w)/g, (_, p, q) => { let r = ""; for (let i = p.charCodeAt(0); i <= q.charCodeAt(0); i++) r += String.fromCharCode(i); return r; });
      const X = expand(x), Y = expand(y);
      return ok([...s].map((ch) => { const i = X.indexOf(ch); return i < 0 ? ch : del ? "" : Y[Math.min(i, Y.length - 1)] ?? ""; }).join(""));
    },
    rev: (a, s, c) => ok(lines(readInputs(a, s, c).text).map((l) => [...l].reverse().join("")).join("\n") + "\n"),
    tac: (a, s, c) => ok(lines(readInputs(a, s, c).text).reverse().join("\n") + "\n"),
    nl: (a, s, c) => ok(lines(readInputs(a, s, c).text).map((l, i) => `${String(i + 1).padStart(6)}\t${l}`).join("\n") + "\n"),
    tee: (a, s, c) => { const app = a.includes("-a"); a.filter((x) => !x.startsWith("-")).forEach((f) => writeFile(resolvePath(c.cwd, f), s, app)); return ok(s); },
    sed: (a, s, c) => {
      const expr = a.find((x) => !x.startsWith("-")) ?? "";
      const m = expr.match(/^s(.)(.*?)\1(.*?)\1(g?)$/);
      if (!m) return fail("sed: only s/old/new/[g] expressions are supported\n");
      const files = a.filter((x) => !x.startsWith("-") && x !== expr);
      const { text, err } = readInputs(files, s, c); if (err) return fail("sed: " + err);
      const out = text.replace(new RegExp(m[2], m[4] ? "g" : ""), m[3]);
      if (a.includes("-i")) { files.forEach((f) => writeFile(resolvePath(c.cwd, f), out)); return ok(); }
      return ok(out);
    },
    awk: (a, s, c) => {
      const fi = a.indexOf("-F"); const sep = fi >= 0 ? a[fi + 1] : null;
      const prog = a.find((x, i) => !x.startsWith("-") && i !== fi + 1) ?? "";
      const m = prog.match(/\{\s*print\s*(.*?)\s*\}/);
      if (!m) return fail("awk: only '{print $N, ...}' programs are supported\n");
      const files = a.filter((x, i) => !x.startsWith("-") && i !== fi + 1 && x !== prog);
      const { text } = readInputs(files, s, c);
      return ok(lines(text).map((l) => {
        const f = sep ? l.split(sep) : l.trim().split(/\s+/);
        return (m[1] || "$0").split(/\s*,\s*/).map((t) => t === "$0" ? l : t.startsWith("$") ? (t === "$NF" ? f[f.length - 1] : f[Number(t.slice(1)) - 1] ?? "") : t.replace(/"/g, "")).join(" ");
      }).join("\n") + "\n");
    },
    find: (a, _s, c) => {
      const start = resolvePath(c.cwd, a[0] && !a[0].startsWith("-") ? a[0] : ".");
      const ni = a.indexOf("-name"); const ti = a.indexOf("-type");
      const pat = ni >= 0 ? new RegExp("^" + a[ni + 1].replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".") + "$") : null;
      const all: string[] = []; walk(start, all);
      return ok(all.filter((p) => (!pat || pat.test(p.split("/").pop() ?? "")) && (ti < 0 || (a[ti + 1] === "d" ? isDir(p) : !isDir(p)))).join("\n") + "\n");
    },
    tree: (a, _s, c) => {
      const root = resolvePath(c.cwd, a[0] ?? ".");
      const out: string[] = [root];
      const rec = (p: string, pre: string) => listDir(p).forEach((e, i, arr) => {
        const last = i === arr.length - 1; out.push(`${pre}${last ? "└── " : "├── "}${e.name}`);
        if (e.type === "dir") rec(`${p === "/" ? "" : p}/${e.name}`, pre + (last ? "    " : "│   "));
      });
      rec(root, "");
      return ok(out.join("\n") + "\n");
    },
    stat: (a, _s, c) => {
      const p = resolvePath(c.cwd, a[0] ?? ".");
      if (!exists(p)) return fail(`stat: cannot statx '${a[0]}': No such file or directory\n`);
      const m = getMeta(p);
      return ok(`  File: ${p}\n  Size: ${readFile(p)?.length ?? 4096}\t${isDir(p) ? "directory" : "regular file"}\nAccess: (${m.mode})  Uid: (${m.owner})  Gid: (${m.group})\n`);
    },
    file: (a, _s, c) => ok(a.map((f) => { const p = resolvePath(c.cwd, f); return `${f}: ${isDir(p) ? "directory" : exists(p) ? (f.endsWith(".yaml") ? "YAML document, ASCII text" : "ASCII text") : "cannot open"}`; }).join("\n") + "\n"),
    rmdir: (a, _s, c) => { for (const d of a) { const p = resolvePath(c.cwd, d); if (listDir(p).length) return fail(`rmdir: failed to remove '${d}': Directory not empty\n`); remove(p, true); } return ok(); },
    ln: (a, _s, c) => { const [src, dst] = a.filter((x) => !x.startsWith("-")); const t = readFile(resolvePath(c.cwd, src ?? "")); if (t === null) return fail(`ln: ${src}: No such file\n`); writeFile(resolvePath(c.cwd, dst ?? ""), t); return ok(); },
    diff: (a, _s, c) => {
      const [x, y] = a.filter((v) => !v.startsWith("-")).map((f) => readFile(resolvePath(c.cwd, f)));
      if (x == null || y == null) return fail("diff: missing file\n", 2);
      if (x === y) return ok();
      const A = lines(x), B = lines(y); const out: string[] = [];
      for (let i = 0; i < Math.max(A.length, B.length); i++) if (A[i] !== B[i]) { if (A[i] !== undefined) out.push(`< ${A[i]}`); if (B[i] !== undefined) out.push(`> ${B[i]}`); }
      return { stdout: out.join("\n") + "\n", code: 1 };
    },
    less: (a, s, c) => (base.cat ? base.cat(a, s, c) : ok(s)),
    more: (a, s, c) => (base.cat ? base.cat(a, s, c) : ok(s)),
    nano: (a) => ok(`GNU nano 7.2 — editing '${a[0] ?? "New Buffer"}' is not available in the browser terminal.\nUse: echo "text" > ${a[0] ?? "file"}  or  cat >> file\n`),
    vim: (a) => cmds.nano(a, "", {} as UShellCtx),
    vi: (a) => cmds.nano(a, "", {} as UShellCtx),
    base64: (a, s, c) => {
      const { text } = readInputs(a.filter((x) => x !== "-d"), s, c);
      try { return ok(a.includes("-d") ? atob(text.trim()) : btoa(unescape(encodeURIComponent(text))) + "\n"); } catch { return fail("base64: invalid input\n"); }
    },
    sha256sum: async (a, s, c) => ok(`${await sha("SHA-256", readInputs(a, s, c).text)}  ${a[0] ?? "-"}\n`),
    sha1sum: async (a, s, c) => ok(`${await sha("SHA-1", readInputs(a, s, c).text)}  ${a[0] ?? "-"}\n`),
    xargs: async (a, s, c) => run([...(a.length ? a : ["echo"]), ...s.split(/\s+/).filter(Boolean)], "", c),
    time: async (a, s, c) => { const t = performance.now(); const r = await run(a, s, c); const e = ((performance.now() - t) / 1000).toFixed(3); return { ...r, stderr: (r.stderr ?? "") + `\nreal\t0m${e}s\nuser\t0m0.000s\nsys\t0m0.000s\n` }; },
    watch: async (a, s, c) => {
      const ni = a.indexOf("-n"); const n = ni >= 0 ? Number(a[ni + 1]) : 2; const cmd = a.filter((_, i) => i !== ni && i !== ni + 1);
      for (let i = 0; i < 30 && !c.signal?.aborted; i++) { const r = await run(cmd, s, c); c.write?.(`\x1b[2J\x1b[HEvery ${n}s: ${cmd.join(" ")}\r\n\r\n${r.stdout.replace(/\n/g, "\r\n")}`); await wait(n * 1000, c.signal); }
      return ok();
    },
    htop: (a, s, c) => (base.top ? base.top(a, s, c) : ok()),
    kill: (a) => (a.length ? ok() : fail("kill: usage: kill [-s sigspec] pid\n", 2)),
    killall: () => ok(),
    pkill: () => ok(),
    pgrep: () => ok("1\n"),
    systemctl: (a) => {
      const [sub, unit = ""] = a;
      if (sub === "status") return ok(`● ${unit || "lightos"}.service\n     Loaded: loaded\n     Active: ${C_G}active (running)${C_R}\n`);
      if (["start", "stop", "restart", "enable", "disable", "reload"].includes(sub)) return ok();
      return ok("UNIT                    LOAD   ACTIVE SUB\naurora-fabric.service   loaded active running\ndcgm.service            loaded active running\nnvidia-persistenced     loaded active running\n");
    },
    service: (a) => ok(`${a[0] ?? "service"}: ${a[1] ?? "status"} ok\n`),
    journalctl: () => ok("-- Logs begin --\naurora-fabric[812]: fabric reconciled (256 tiles)\ndcgm[640]: health watch OK\n"),
    docker: (a) => ok(a[0] === "ps" ? "CONTAINER ID   IMAGE                       STATUS\n3f1a9c2b7d10   nvcr.io/nim/llama-3.1-8b    Up 2 hours\n" : a[0] === "images" ? "REPOSITORY                 TAG     SIZE\nnvcr.io/nim/llama-3.1-8b   1.2     14.2GB\n" : "Docker version 27.0.3\n"),
    kubectl: (a) => ok(a[0] === "get" ? "NAME                       READY   STATUS    AGE\naurora-scheduler-7f9c      1/1     Running   3d\nnim-llama-8b-0             1/1     Running   2h\n" : "Client Version: v1.31.0\n"),
    git: (a) => ok(a[0] === "status" ? "On branch main\nnothing to commit, working tree clean\n" : a[0] === "--version" ? "git version 2.43.0\n" : `git: '${a[0] ?? ""}' runs in read-only mode in the browser terminal\n`),
    ssh: (a) => fail(`ssh: connect to host ${a[a.length - 1] ?? ""}: outbound SSH is not available from the browser terminal\n`, 255),
    scp: () => fail("scp: not available from the browser terminal\n", 1),
    wget: async (a, s, c) => (base.fetch ? base.fetch(a.filter((x) => !x.startsWith("-")), s, c) : fail("wget: unavailable\n")),
    python3: (a) => ok(a[0] === "--version" || a[0] === "-V" ? "Python 3.12.3\n" : "Python 3.12.3 — interactive interpreter is not available in the browser terminal.\n"),
    python: (a) => cmds.python3(a, "", {} as UShellCtx),
    node: () => ok("v20.12.2\n"),
    pip: () => ok("pip 24.0 from /usr/lib/python3/dist-packages/pip (python 3.12)\n"),
    tar: (a) => ok(a.some((x) => x.includes("t")) ? "" : ""),
    zip: () => ok(),
    unzip: () => ok(),
    gzip: () => ok(),
    locale: () => ok("LANG=en_US.UTF-8\nLC_ALL=\n"),
    timedatectl: () => ok(`               Local time: ${new Date().toString()}\n           Time zone: UTC\n`),
    hostnamectl: () => ok(" Static hostname: lightos-main\nOperating System: Ubuntu 24.04 LTS (LightOS Aurora)\n          Kernel: Linux 6.8.0-lightrail\n    Architecture: x86-64\n"),
    reboot: () => ok("Reboot is managed by the LightOS desktop. Use: os shutdown\n"),
    shutdown: () => ok("Use the Power button or: os shutdown\n"),
    passwd: () => ok("passwd: password updated successfully\n"),
    useradd: () => ok(),
    chgrp: () => ok(),
    umask: () => ok("0022\n"),
    source: () => ok(),
    ".": () => ok(),
    set: (_a, _s, c) => ok(Object.entries(c.env).map(([k, v]) => `${k}=${v}`).join("\n") + "\n"),
    unset: (a, _s, c) => { a.forEach((k) => delete c.env[k]); return ok(); },
    printenv: (a, _s, c) => ok(a.length ? a.map((k) => c.env[k] ?? "").join("\n") + "\n" : Object.entries(c.env).map(([k, v]) => `${k}=${v}`).join("\n") + "\n"),
    test: () => ok(),
    bc: (_a, s) => { try { if (!/^[\d\s+\-*/().%^]+$/.test(s.trim())) throw 0; return ok(String(Function(`return (${s.replace(/\^/g, "**")})`)()) + "\n"); } catch { return fail("(standard_in) 1: syntax error\n"); } },
    expr: (a) => { try { const e = a.join(" "); if (!/^[\d\s+\-*/()%]+$/.test(e)) throw 0; return ok(String(Math.trunc(Function(`return (${e})`)())) + "\n"); } catch { return fail("expr: syntax error\n", 2); } },
  };
  return cmds;
}

const C_G = "\x1b[38;2;0;255;136m";
const C_R = "\x1b[0m";

export function notFound(name: string): string {
  return `Command '${name}' not found, but can be installed with:\nsudo apt install ${name}\n`;
}
