import { useEffect, useRef } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import "@xterm/xterm/css/xterm.css";
import {
  completePath,
  copy,
  getMeta,
  isDir,
  listDir,
  mkdir,
  modeFromOctal,
  move,
  readFile,
  remove,
  resolvePath,
  setMode,
  setOwner,
  writeFile,
} from "../vfs";

const PROMPT_USER = "root";
const PROMPT_HOST = "lightos-main";
const HISTORY_KEY = "lightos:terminal:history";
const CWD_KEY = "lightos:terminal:cwd";
const HISTORY_MAX = 500;

const C = {
  reset: "\x1b[0m",
  green: "\x1b[38;2;0;255;136m",
  cyan: "\x1b[36m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  gray: "\x1b[90m",
  bold: "\x1b[1m",
};

interface CmdResult {
  stdout: string;
  stderr?: string;
  code: number;
}

interface ShellCtx {
  cwd: string;
  env: Record<string, string>;
  lastExit: number;
  /** Update cwd from a builtin. */
  setCwd: (p: string) => void;
}

type Builtin = (args: string[], stdin: string, ctx: ShellCtx) => CmdResult | Promise<CmdResult>;

// --------------------------- OS action bridge ---------------------------
// Populated by TerminalApp on mount so builtins can drive the window manager.
type AppKey =
  | "settings" | "files" | "terminal" | "control" | "fleet" | "cluster"
  | "browser" | "about" | "agentic" | "mlops" | "datacenter" | "tokenfactory"
  | "inference" | "cloud";

interface OSActions {
  openApp: (id: AppKey) => void;
  shutdown: () => void;
  closeAll: () => void;
}

let osActions: OSActions | null = null;
export function setOSActions(a: OSActions | null) {
  osActions = a;
}

const APP_ALIASES: Record<string, AppKey> = {
  settings: "settings", prefs: "settings",
  files: "files", finder: "files",
  terminal: "terminal", term: "terminal", shell: "terminal",
  control: "control", "control-center": "control", cc: "control",
  fleet: "fleet",
  cluster: "cluster", k8s: "cluster",
  browser: "browser", web: "browser",
  about: "about",
  agentic: "agentic", agents: "agentic", "agentic-ai": "agentic", ai: "agentic",
  mlops: "mlops", ml: "mlops",
  datacenter: "datacenter", dc: "datacenter",
  tokenfactory: "tokenfactory", "token-factory": "tokenfactory", tokens: "tokenfactory",
  inference: "inference", inf: "inference",
  cloud: "cloud", compute: "cloud",
};

// MLOps + Agentic command effects (lightweight in-memory broadcast for live apps to listen to).
function emitOSEvent(name: string, detail: unknown = {}) {
  try { window.dispatchEvent(new CustomEvent(`lightos:${name}`, { detail })); } catch { /* noop */ }
}

// --------------------------- builtins ---------------------------

const builtins: Record<string, Builtin> = {
  help: () => ({
    stdout:
      "Builtins: help clear echo pwd cd ls cat head tail wc grep chmod chown touch mkdir rm cp mv\n" +
      "          whoami date hostname uname neofetch env export history ps top gpu fabric lightctl\n" +
      "          fetch curl exit true false\n" +
      "Network:  ifconfig ip ping netstat ss route dig nslookup traceroute host arp\n" +
      "Operators: |  >  >>  <  &&  ||  ;   ($? expands to last exit code)\n" +
      "Quoting:   'single' \"double\"   Tab completes. Ctrl+R searches history.\n" +
      "Vi mode:   Esc → normal (h j k l 0 $ w b x i a A I); i/a/A/I → insert.\n",
    code: 0,
  }),
  ifconfig: () => ({
    stdout:
      "lo0: flags=8049<UP,LOOPBACK,RUNNING,MULTICAST>  mtu 16384\n" +
      "        inet 127.0.0.1  netmask 0xff000000\n" +
      "        inet6 ::1  prefixlen 128\n" +
      "\n" +
      "eth0: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 9000\n" +
      "        inet 10.42.0.11  netmask 255.255.255.0  broadcast 10.42.0.255\n" +
      "        inet6 fe80::1ff:fe23:4567:890a  prefixlen 64  scopeid 0x20<link>\n" +
      "        ether 02:42:0a:2a:00:0b  txqueuelen 1000  (Ethernet)\n" +
      "        RX packets 1842301  bytes 9824513021 (9.1 GiB)\n" +
      "        TX packets 1502998  bytes 6112049823 (5.6 GiB)\n" +
      "\n" +
      "lr0: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 9000\n" +
      "        inet 10.200.0.11  netmask 255.255.0.0  broadcast 10.200.255.255\n" +
      "        photonic-fabric  link-rate 1.6Tb/s  lambda-channels 64\n" +
      "        RX photons 9.21e15  TX photons 7.84e15  ber 1e-15\n",
    code: 0,
  }),
  ip: (a) => {
    const sub = a[0] ?? "";
    if (sub === "a" || sub === "addr" || sub === "address" || sub === "") {
      return {
        stdout:
          "1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536\n" +
          "    inet 127.0.0.1/8 scope host lo\n" +
          "2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 9000\n" +
          "    link/ether 02:42:0a:2a:00:0b\n" +
          "    inet 10.42.0.11/24 brd 10.42.0.255 scope global eth0\n" +
          "3: lr0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 9000\n" +
          "    link/photonic 1.6Tb/s lambda 64\n" +
          "    inet 10.200.0.11/16 brd 10.200.255.255 scope global lr0\n",
        code: 0,
      };
    }
    if (sub === "r" || sub === "route") {
      return {
        stdout:
          "default via 10.42.0.1 dev eth0\n" +
          "10.42.0.0/24 dev eth0 proto kernel scope link src 10.42.0.11\n" +
          "10.200.0.0/16 dev lr0 proto kernel scope link src 10.200.0.11\n",
        code: 0,
      };
    }
    if (sub === "l" || sub === "link") {
      return {
        stdout: "1: lo\n2: eth0\n3: lr0 (photonic)\n",
        code: 0,
      };
    }
    return { stdout: "", stderr: `ip: unknown subcommand: ${sub}\n`, code: 1 };
  },
  ping: (a) => {
    const host = a.find((x) => !x.startsWith("-")) ?? "127.0.0.1";
    const count = (() => {
      const i = a.indexOf("-c");
      return i >= 0 ? Math.min(8, parseInt(a[i + 1] || "4", 10) || 4) : 4;
    })();
    const lines: string[] = [`PING ${host} (10.42.0.1): 56 data bytes`];
    let sum = 0;
    for (let i = 0; i < count; i++) {
      const t = +(0.18 + Math.random() * 0.4).toFixed(3);
      sum += t;
      lines.push(`64 bytes from ${host}: icmp_seq=${i} ttl=64 time=${t} ms`);
    }
    lines.push("");
    lines.push(`--- ${host} ping statistics ---`);
    lines.push(`${count} packets transmitted, ${count} received, 0% packet loss`);
    lines.push(`round-trip min/avg/max = 0.18/${(sum / count).toFixed(3)}/0.58 ms`);
    return { stdout: lines.join("\n") + "\n", code: 0 };
  },
  netstat: () => ({
    stdout:
      "Active Internet connections\n" +
      "Proto Recv-Q Send-Q Local Address          Foreign Address        State\n" +
      "tcp        0      0 10.42.0.11:22          10.42.0.4:51822        ESTABLISHED\n" +
      "tcp        0      0 10.42.0.11:443         10.42.0.7:39204        ESTABLISHED\n" +
      "tcp        0      0 10.200.0.11:9100       10.200.0.1:54021       ESTABLISHED\n" +
      "tcp        0      0 0.0.0.0:8080           0.0.0.0:*              LISTEN\n" +
      "tcp        0      0 0.0.0.0:9090           0.0.0.0:*              LISTEN\n",
    code: 0,
  }),
  ss: (a) => builtins.netstat(a, "", { cwd: "/", env: {}, lastExit: 0, setCwd: () => {} }),
  route: () => ({
    stdout:
      "Kernel IP routing table\n" +
      "Destination     Gateway         Genmask         Flags  Iface\n" +
      "default         10.42.0.1       0.0.0.0         UG     eth0\n" +
      "10.42.0.0       0.0.0.0         255.255.255.0   U      eth0\n" +
      "10.200.0.0      0.0.0.0         255.255.0.0     U      lr0\n",
    code: 0,
  }),
  arp: () => ({
    stdout:
      "Address          HWtype  HWaddress           Iface\n" +
      "10.42.0.1        ether   02:42:0a:2a:00:01   eth0\n" +
      "10.42.0.4        ether   02:42:0a:2a:00:04   eth0\n" +
      "10.200.0.1       photon  --:--:--:--:--:--   lr0\n",
    code: 0,
  }),
  dig: (a) => {
    const host = a[0] ?? "lightos.sh";
    return {
      stdout:
        `; <<>> DiG 9.18 <<>> ${host}\n` +
        `;; ANSWER SECTION:\n` +
        `${host}.\t300\tIN\tA\t10.42.0.${20 + Math.floor(Math.random() * 30)}\n` +
        `\n;; Query time: 2 msec\n;; SERVER: 10.42.0.1#53\n`,
      code: 0,
    };
  },
  nslookup: (a) => {
    const host = a[0] ?? "lightos.sh";
    return {
      stdout:
        `Server:\t\t10.42.0.1\nAddress:\t10.42.0.1#53\n\n` +
        `Name:\t${host}\nAddress: 10.42.0.${20 + Math.floor(Math.random() * 30)}\n`,
      code: 0,
    };
  },
  host: (a) => {
    const h = a[0] ?? "lightos.sh";
    return { stdout: `${h} has address 10.42.0.${20 + Math.floor(Math.random() * 30)}\n`, code: 0 };
  },
  traceroute: (a) => {
    const host = a[0] ?? "lightos.sh";
    const hops = [
      "10.42.0.1     0.412 ms",
      "10.200.0.1    0.821 ms  [photonic-fabric]",
      "10.200.255.1  1.204 ms",
      `${host}       1.518 ms`,
    ];
    return {
      stdout:
        `traceroute to ${host}, 30 hops max, 60 byte packets\n` +
        hops.map((l, i) => ` ${i + 1}  ${l}`).join("\n") +
        "\n",
      code: 0,
    };
  },
  true: () => ({ stdout: "", code: 0 }),
  false: () => ({ stdout: "", code: 1 }),
  echo: (a) => ({ stdout: a.join(" ") + "\n", code: 0 }),
  pwd: (_, __, ctx) => ({ stdout: ctx.cwd + "\n", code: 0 }),
  whoami: () => ({ stdout: PROMPT_USER + "\n", code: 0 }),
  date: () => ({ stdout: new Date().toString() + "\n", code: 0 }),
  hostname: () => ({ stdout: PROMPT_HOST + "\n", code: 0 }),
  uname: (a) => ({
    stdout: a.includes("-a")
      ? "Linux lightos-main 6.8.0-lightrail #1 SMP PREEMPT_DYNAMIC x86_64 LightOS\n"
      : "Linux\n",
    code: 0,
  }),
  cd: (a, _, ctx) => {
    const target = resolvePath(ctx.cwd, a[0] || "/root");
    if (!isDir(target)) return { stdout: "", stderr: `cd: ${a[0]}: not a directory\n`, code: 1 };
    ctx.setCwd(target || "/");
    return { stdout: "", code: 0 };
  },
  ls: (a, _, ctx) => {
    const long = a.includes("-l") || a.includes("-la") || a.includes("-al");
    const showAll = a.includes("-a") || a.includes("-la") || a.includes("-al");
    const targets = a.filter((x) => !x.startsWith("-"));
    const target = targets[0] ? resolvePath(ctx.cwd, targets[0]) : ctx.cwd;
    if (!isDir(target)) {
      const f = readFile(target);
      if (f !== null) return { stdout: target.split("/").pop() + "\n", code: 0 };
      return { stdout: "", stderr: `ls: cannot access '${targets[0]}': No such file or directory\n`, code: 2 };
    }
    const entries = listDir(target);
    if (!showAll && false) void entries; // placeholder, no hidden entries in VFS
    if (long) {
      const lines = entries.map((e) => {
        const full = `${target === "/" ? "" : target}/${e.name}`;
        const m = getMeta(full);
        const size = e.type === "file" ? (readFile(full)?.length ?? 0) : 4096;
        const name = e.type === "dir" ? `${C.cyan}${e.name}/${C.reset}` : e.name;
        return `${e.type === "dir" ? "d" : "-"}${m.mode}  1 ${m.owner} ${m.group}  ${String(size).padStart(6)}  ${name}`;
      });
      return { stdout: lines.join("\n") + "\n", code: 0 };
    }
    return {
      stdout:
        entries
          .map((e) => (e.type === "dir" ? `${C.cyan}${e.name}/${C.reset}` : e.name))
          .join("  ") + "\n",
      code: 0,
    };
  },
  cat: (a, stdin, ctx) => {
    if (a.length === 0) return { stdout: stdin, code: 0 };
    let out = "";
    for (const path of a) {
      const c = readFile(resolvePath(ctx.cwd, path));
      if (c === null) return { stdout: out, stderr: `cat: ${path}: No such file\n`, code: 1 };
      out += c;
    }
    return { stdout: out, code: 0 };
  },
  head: (a, stdin, ctx) => {
    let n = 10;
    const args: string[] = [];
    for (let i = 0; i < a.length; i++) {
      if (a[i] === "-n" && a[i + 1]) {
        n = parseInt(a[++i], 10) || 10;
      } else if (/^-\d+$/.test(a[i])) {
        n = parseInt(a[i].slice(1), 10);
      } else args.push(a[i]);
    }
    const take = (s: string) => s.split("\n").slice(0, n).join("\n");
    if (args.length === 0) return { stdout: take(stdin) + "\n", code: 0 };
    let out = "";
    for (const p of args) {
      const c = readFile(resolvePath(ctx.cwd, p));
      if (c === null) return { stdout: out, stderr: `head: ${p}: No such file\n`, code: 1 };
      out += take(c) + "\n";
    }
    return { stdout: out, code: 0 };
  },
  tail: (a, stdin, ctx) => {
    let n = 10;
    const args: string[] = [];
    for (let i = 0; i < a.length; i++) {
      if (a[i] === "-n" && a[i + 1]) n = parseInt(a[++i], 10) || 10;
      else if (/^-\d+$/.test(a[i])) n = parseInt(a[i].slice(1), 10);
      else args.push(a[i]);
    }
    const take = (s: string) => {
      const lines = s.split("\n");
      return lines.slice(Math.max(0, lines.length - n)).join("\n");
    };
    if (args.length === 0) return { stdout: take(stdin) + "\n", code: 0 };
    let out = "";
    for (const p of args) {
      const c = readFile(resolvePath(ctx.cwd, p));
      if (c === null) return { stdout: out, stderr: `tail: ${p}: No such file\n`, code: 1 };
      out += take(c) + "\n";
    }
    return { stdout: out, code: 0 };
  },
  wc: (a, stdin, ctx) => {
    const flags = a.filter((x) => x.startsWith("-"));
    const args = a.filter((x) => !x.startsWith("-"));
    const showL = flags.includes("-l") || flags.length === 0;
    const showW = flags.includes("-w") || flags.length === 0;
    const showC = flags.includes("-c") || flags.length === 0;
    const count = (s: string, name = "") => {
      const lines = s ? s.split("\n").length - (s.endsWith("\n") ? 1 : 0) : 0;
      const words = s.trim() ? s.trim().split(/\s+/).length : 0;
      const chars = s.length;
      const parts: string[] = [];
      if (showL) parts.push(String(lines).padStart(4));
      if (showW) parts.push(String(words).padStart(4));
      if (showC) parts.push(String(chars).padStart(4));
      return parts.join(" ") + (name ? ` ${name}` : "") + "\n";
    };
    if (args.length === 0) return { stdout: count(stdin), code: 0 };
    let out = "";
    for (const p of args) {
      const c = readFile(resolvePath(ctx.cwd, p));
      if (c === null) return { stdout: out, stderr: `wc: ${p}: No such file\n`, code: 1 };
      out += count(c, p);
    }
    return { stdout: out, code: 0 };
  },
  grep: (a, stdin, ctx) => {
    const flags = a.filter((x) => x.startsWith("-") && x !== "-");
    const args = a.filter((x) => !x.startsWith("-") || x === "-");
    if (args.length === 0) return { stdout: "", stderr: "grep: missing pattern\n", code: 2 };
    const ignoreCase = flags.some((f) => f.includes("i"));
    const invert = flags.some((f) => f.includes("v"));
    const showNum = flags.some((f) => f.includes("n"));
    const countOnly = flags.some((f) => f.includes("c"));
    const pattern = args[0];
    const sources = args.slice(1);
    let re: RegExp;
    try {
      re = new RegExp(pattern, ignoreCase ? "i" : "");
    } catch (e) {
      return { stdout: "", stderr: `grep: invalid pattern: ${(e as Error).message}\n`, code: 2 };
    }
    const showName = sources.length > 1;
    const scan = (text: string, name?: string) => {
      const lines = text.split("\n");
      const matches: string[] = [];
      let cnt = 0;
      lines.forEach((ln, i) => {
        const hit = re.test(ln);
        if (hit !== invert && ln.length > 0) {
          cnt++;
          if (!countOnly) {
            const prefix =
              (showName && name ? `${C.cyan}${name}${C.reset}:` : "") +
              (showNum ? `${C.green}${i + 1}${C.reset}:` : "");
            matches.push(prefix + ln);
          }
        }
      });
      if (countOnly) return (showName && name ? `${name}:` : "") + cnt + "\n";
      return matches.length ? matches.join("\n") + "\n" : "";
    };
    let out = "";
    let matched = false;
    if (sources.length === 0) {
      out = scan(stdin);
      matched = out.length > 0;
    } else {
      for (const p of sources) {
        const c = readFile(resolvePath(ctx.cwd, p));
        if (c === null) {
          return { stdout: out, stderr: `grep: ${p}: No such file\n`, code: 2 };
        }
        const r = scan(c, p);
        if (r) matched = true;
        out += r;
      }
    }
    return { stdout: out, code: matched ? 0 : 1 };
  },
  chmod: (a, _, ctx) => {
    if (a.length < 2) return { stdout: "", stderr: "chmod: usage: chmod MODE FILE...\n", code: 1 };
    const [mode, ...files] = a;
    let modeStr = mode;
    if (/^[0-7]+$/.test(mode)) {
      const m = modeFromOctal(mode);
      if (!m) return { stdout: "", stderr: `chmod: invalid mode: ${mode}\n`, code: 1 };
      modeStr = m;
    } else if (mode.length !== 9 || !/^[rwx-]{9}$/.test(mode)) {
      return { stdout: "", stderr: `chmod: invalid mode: ${mode}\n`, code: 1 };
    }
    let stderr = "";
    let code = 0;
    for (const f of files) {
      if (!setMode(resolvePath(ctx.cwd, f), modeStr)) {
        stderr += `chmod: cannot access '${f}': No such file\n`;
        code = 1;
      }
    }
    return { stdout: "", stderr, code };
  },
  chown: (a, _, ctx) => {
    if (a.length < 2) return { stdout: "", stderr: "chown: usage: chown OWNER[:GROUP] FILE...\n", code: 1 };
    const [spec, ...files] = a;
    const [owner, group] = spec.split(":");
    let stderr = "";
    let code = 0;
    for (const f of files) {
      if (!setOwner(resolvePath(ctx.cwd, f), owner, group)) {
        stderr += `chown: cannot access '${f}': No such file\n`;
        code = 1;
      }
    }
    return { stdout: "", stderr, code };
  },
  touch: (a, _, ctx) => {
    if (!a[0]) return { stdout: "", stderr: "touch: missing operand\n", code: 1 };
    const ok = writeFile(resolvePath(ctx.cwd, a[0]), "", true);
    return ok
      ? { stdout: "", code: 0 }
      : { stdout: "", stderr: `touch: cannot touch '${a[0]}': No such directory\n`, code: 1 };
  },
  mkdir: (a, _, ctx) => {
    const recursive = a.includes("-p");
    const targets = a.filter((x) => !x.startsWith("-"));
    if (targets.length === 0) return { stdout: "", stderr: "mkdir: missing operand\n", code: 1 };
    let stderr = "";
    let code = 0;
    for (const t of targets) {
      const r = mkdir(resolvePath(ctx.cwd, t), recursive);
      if (!r.ok) {
        stderr += `mkdir: cannot create '${t}': ${r.error}\n`;
        code = 1;
      }
    }
    return { stdout: "", stderr, code };
  },
  rm: (a, _, ctx) => {
    const recursive = a.includes("-r") || a.includes("-rf") || a.includes("-R");
    const force = a.includes("-f") || a.includes("-rf");
    const targets = a.filter((x) => !x.startsWith("-"));
    if (targets.length === 0) return { stdout: "", stderr: "rm: missing operand\n", code: 1 };
    let stderr = "";
    let code = 0;
    for (const t of targets) {
      const r = remove(resolvePath(ctx.cwd, t), recursive);
      if (!r.ok && !force) {
        stderr += `rm: cannot remove '${t}': ${r.error}\n`;
        code = 1;
      }
    }
    return { stdout: "", stderr, code };
  },
  cp: (a, _, ctx) => {
    const recursive = a.includes("-r") || a.includes("-R");
    const args = a.filter((x) => !x.startsWith("-"));
    if (args.length < 2) return { stdout: "", stderr: "cp: missing file operand\n", code: 1 };
    const dest = resolvePath(ctx.cwd, args[args.length - 1]);
    const sources = args.slice(0, -1);
    if (sources.length > 1 && !isDir(dest)) {
      return { stdout: "", stderr: `cp: target '${args[args.length - 1]}' is not a directory\n`, code: 1 };
    }
    let stderr = "";
    let code = 0;
    for (const s of sources) {
      const r = copy(resolvePath(ctx.cwd, s), dest, recursive);
      if (!r.ok) {
        stderr += `cp: ${r.error}\n`;
        code = 1;
      }
    }
    return { stdout: "", stderr, code };
  },
  mv: (a, _, ctx) => {
    const args = a.filter((x) => !x.startsWith("-"));
    if (args.length < 2) return { stdout: "", stderr: "mv: missing file operand\n", code: 1 };
    const dest = resolvePath(ctx.cwd, args[args.length - 1]);
    const sources = args.slice(0, -1);
    if (sources.length > 1 && !isDir(dest)) {
      return { stdout: "", stderr: `mv: target '${args[args.length - 1]}' is not a directory\n`, code: 1 };
    }
    let stderr = "";
    let code = 0;
    for (const s of sources) {
      const r = move(resolvePath(ctx.cwd, s), dest);
      if (!r.ok) {
        stderr += `mv: ${r.error}\n`;
        code = 1;
      }
    }
    return { stdout: "", stderr, code };
  },
  env: (_, __, ctx) => ({
    stdout: Object.entries(ctx.env).map(([k, v]) => `${k}=${v}`).join("\n") + "\n",
    code: 0,
  }),
  export: (a, _, ctx) => {
    for (const tok of a) {
      const i = tok.indexOf("=");
      if (i > 0) ctx.env[tok.slice(0, i)] = tok.slice(i + 1);
    }
    return { stdout: "", code: 0 };
  },
  history: () => ({
    stdout:
      loadHistory()
        .map((h, i) => ` ${String(i + 1).padStart(4)}  ${h}`)
        .join("\n") + "\n",
    code: 0,
  }),
  clear: () => ({ stdout: "\x1b[2J\x1b[H", code: 0 }),
  neofetch: () => ({
    stdout:
      [
        `${C.green}      .:^!?JJJ?!^:.${C.reset}        ${C.bold}root@lightos-main${C.reset}`,
        `${C.green}    .^7?JJJJJJJJJJ?7^.${C.reset}      ${C.gray}-----------------${C.reset}`,
        `${C.green}   ~JJJJJJJJJJJJJJJJJJ~${C.reset}     OS: LightOS 1.0 Aurora`,
        `${C.green}  !JJJJJ${C.cyan}LIGHTRAIL${C.green}JJJJ!${C.reset}    Kernel: 6.8.0-lightrail`,
        `${C.green}  !JJJJJJJJJJJJJJJJJJJ!${C.reset}    CPU: Fabric Controller Gen 2`,
        `${C.green}   ~JJJJJJJJJJJJJJJJJJ~${C.reset}     GPU: LightRail NCE-700 x8`,
        `${C.green}    .^7?JJJJJJJJJJ?7^.${C.reset}      Memory: 1.5 TB HBM3e`,
        `${C.green}      .:^!?JJJ?!^:.${C.reset}        Disk: 128 TB NVMe-oF`,
      ].join("\n") + "\n",
    code: 0,
  }),
  gpu: () => {
    let out = `${C.bold}LightRail NCE-700 — 8 accelerators${C.reset}\n`;
    for (let i = 0; i < 8; i++) {
      const u = (60 + Math.random() * 35).toFixed(0);
      const t = (55 + Math.random() * 20).toFixed(0);
      const m = (180 + Math.random() * 12).toFixed(0);
      out += `  GPU ${i}  util ${C.green}${u.padStart(3)}%${C.reset}  temp ${C.yellow}${t}°C${C.reset}  mem ${m} GB\n`;
    }
    return { stdout: out, code: 0 };
  },
  fabric: () => ({
    stdout:
      `${C.bold}Photonic Fabric Status${C.reset}\n` +
      `  Topology       photonic-mesh-20x64\n` +
      `  Optical links  ${C.green}64/64 up${C.reset}\n` +
      `  WDM channels   16 @ 200 Gbps\n` +
      `  Dispatch       3.2 ns\n` +
      `  Bandwidth      12.8 Tbps aggregate\n`,
    code: 0,
  }),
  ps: () => ({
    stdout:
      `  PID  USER   COMMAND\n` +
      `    1  root   /sbin/init\n` +
      `   42  root   lightrail-fabricd\n` +
      `   78  root   nce-runtime --bind 0.0.0.0:7700\n` +
      `  104  root   lightcompile-daemon\n` +
      `  256  root   /bin/lsh\n`,
    code: 0,
  }),
  top: (a, s, c) => builtins.ps(a, s, c) as CmdResult,
  lightctl: (a) => {
    const sub = a[0];
    if (!sub)
      return {
        stdout:
          "usage: lightctl <command>\n" +
          "  status                          show fabric daemon status\n" +
          "  fabric                          show photonic fabric details\n" +
          "  open <app>                      open an app (alias of: os open)\n" +
          "  mlops start|stop <pipeline>     start/stop an MLOps pipeline\n" +
          "  mlops train [name]              trigger a new training run\n" +
          "  mlops canary [name]             roll out a canary deployment\n" +
          "  agentic run <agent> [goal]      kick off an agent run\n" +
          "  agentic stop <runId>            stop a running agent\n",
        code: 1,
      };
    if (sub === "status")
      return { stdout: `${C.green}● lightrail-fabricd active (running)${C.reset}\n`, code: 0 };
    if (sub === "fabric")
      return builtins.fabric([], "", { cwd: "/", env: {}, lastExit: 0, setCwd: () => {} }) as CmdResult;
    if (sub === "open") {
      return builtins.os(["open", ...a.slice(1)], "", { cwd: "/", env: {}, lastExit: 0, setCwd: () => {} }) as CmdResult;
    }
    if (sub === "mlops") {
      const verb = a[1];
      if (!verb)
        return { stdout: "", stderr: "lightctl mlops: usage start|stop <pipeline> | train [name] | canary [name]\n", code: 1 };
      if (!osActions) return { stdout: "", stderr: "lightctl: OS bridge not ready\n", code: 1 };
      osActions.openApp("mlops");
      if (verb === "start" || verb === "stop") {
        const name = a[2];
        if (!name) return { stdout: "", stderr: `lightctl mlops ${verb}: missing pipeline name\n`, code: 1 };
        emitOSEvent("mlops:toggle", { name, action: verb });
        return { stdout: `${C.green}✓${C.reset} ${verb === "start" ? "Starting" : "Stopping"} pipeline ${C.cyan}${name}${C.reset}\n`, code: 0 };
      }
      if (verb === "train") {
        const name = a[2] || `finetune-${Math.random().toString(36).slice(2, 6)}`;
        emitOSEvent("mlops:train", { name });
        return { stdout: `${C.green}✓${C.reset} Training run ${C.cyan}${name}${C.reset} queued\n`, code: 0 };
      }
      if (verb === "canary") {
        const name = a[2] || `canary-${Math.random().toString(36).slice(2, 6)}`;
        emitOSEvent("mlops:canary", { name });
        return { stdout: `${C.green}✓${C.reset} Canary ${C.cyan}${name}${C.reset} rolling out 1% → 25%\n`, code: 0 };
      }
      return { stdout: "", stderr: `lightctl mlops: unknown verb '${verb}'\n`, code: 1 };
    }
    if (sub === "agentic") {
      const verb = a[1];
      if (!osActions) return { stdout: "", stderr: "lightctl: OS bridge not ready\n", code: 1 };
      osActions.openApp("agentic");
      if (verb === "run") {
        const agent = a[2];
        if (!agent) return { stdout: "", stderr: "lightctl agentic run: missing agent name\n", code: 1 };
        const goal = a.slice(3).join(" ") || "Ad-hoc operator run";
        emitOSEvent("agentic:run", { agent, goal });
        return { stdout: `${C.green}✓${C.reset} Agent ${C.cyan}${agent}${C.reset} launched — ${C.gray}${goal}${C.reset}\n`, code: 0 };
      }
      if (verb === "stop") {
        const id = a[2];
        if (!id) return { stdout: "", stderr: "lightctl agentic stop: missing run id\n", code: 1 };
        emitOSEvent("agentic:stop", { id });
        return { stdout: `${C.yellow}■${C.reset} Stopped run ${id}\n`, code: 0 };
      }
      return { stdout: "", stderr: `lightctl agentic: unknown verb '${verb}'\n`, code: 1 };
    }
    return { stdout: "", stderr: `lightctl: unknown subcommand '${sub}'\n`, code: 1 };
  },
  os: (a) => {
    const sub = a[0];
    if (!sub)
      return {
        stdout:
          "usage: os <command>\n" +
          "  open <app>     launch an app window (settings, files, terminal,\n" +
          "                 control, fleet, cluster, browser, about, agentic,\n" +
          "                 mlops, datacenter, tokenfactory, inference, cloud)\n" +
          "  list           list available apps\n" +
          "  close-all      close every open window\n" +
          "  shutdown       power off LightOS and return to the main app\n",
        code: 1,
      };
    if (!osActions) return { stdout: "", stderr: "os: bridge not ready\n", code: 1 };
    if (sub === "list") {
      const names = Array.from(new Set(Object.values(APP_ALIASES))).sort();
      return { stdout: names.join("  ") + "\n", code: 0 };
    }
    if (sub === "open") {
      const key = (a[1] || "").toLowerCase();
      const id = APP_ALIASES[key];
      if (!id) return { stdout: "", stderr: `os: unknown app '${a[1]}'. try: os list\n`, code: 1 };
      osActions.openApp(id);
      return { stdout: `${C.green}→${C.reset} opened ${C.cyan}${id}${C.reset}\n`, code: 0 };
    }
    if (sub === "close-all") {
      osActions.closeAll();
      return { stdout: "all windows closed\n", code: 0 };
    }
    if (sub === "shutdown" || sub === "poweroff" || sub === "halt") {
      osActions.shutdown();
      return { stdout: `${C.yellow}● shutting down LightOS…${C.reset}\n`, code: 0 };
    }
    return { stdout: "", stderr: `os: unknown subcommand '${sub}'\n`, code: 1 };
  },
  exit: () => ({ stdout: "logout (close window to exit)\n", code: 0 }),
  fetch: async (a) => {
    if (!a[0]) return { stdout: "", stderr: "fetch: missing url\n", code: 1 };
    try {
      const res = await fetch(a[0]);
      const body = (await res.text()).slice(0, 4000);
      return {
        stdout: `${C.gray}→ GET ${a[0]}${C.reset}\n${C.green}${res.status} ${res.statusText}${C.reset}\n${body}\n`,
        code: res.ok ? 0 : 1,
      };
    } catch (e) {
      return { stdout: "", stderr: `fetch failed: ${(e as Error).message}\n`, code: 1 };
    }
  },
};
builtins.curl = builtins.fetch;

// --------------------------- history ---------------------------

function loadHistory(): string[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function saveHistory(h: string[]) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(h.slice(-HISTORY_MAX)));
  } catch {
    /* ignore */
  }
}

// --------------------------- parser ---------------------------

function tokenize(src: string): string[] {
  const tokens: string[] = [];
  let cur = "";
  let i = 0;
  let quote: '"' | "'" | null = null;
  const flush = () => {
    if (cur.length > 0) {
      tokens.push(cur);
      cur = "";
    }
  };
  while (i < src.length) {
    const ch = src[i];
    if (quote) {
      if (ch === quote) {
        quote = null;
      } else {
        cur += ch;
      }
      i++;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      i++;
      continue;
    }
    if (ch === "\\" && i + 1 < src.length) {
      cur += src[i + 1];
      i += 2;
      continue;
    }
    // operators
    if (ch === "|" || ch === "&" || ch === ";" || ch === ">" || ch === "<") {
      flush();
      // 2-char operators
      const next = src[i + 1];
      if ((ch === "&" && next === "&") || (ch === "|" && next === "|") || (ch === ">" && next === ">")) {
        tokens.push(ch + next);
        i += 2;
      } else {
        tokens.push(ch);
        i++;
      }
      continue;
    }
    if (/\s/.test(ch)) {
      flush();
      i++;
      continue;
    }
    cur += ch;
    i++;
  }
  flush();
  return tokens;
}

interface SimpleCmd {
  argv: string[];
  redirOut?: { path: string; append: boolean };
  redirIn?: string;
}
interface Pipeline {
  cmds: SimpleCmd[];
}
interface ListItem {
  pipeline: Pipeline;
  /** operator separating from previous: undefined for first, ";", "&&", "||" */
  op?: ";" | "&&" | "||";
}

function parse(src: string): ListItem[] {
  const toks = tokenize(src);
  const items: ListItem[] = [];
  let curPipe: Pipeline = { cmds: [] };
  let curCmd: SimpleCmd = { argv: [] };
  let curOp: ListItem["op"] = undefined;

  const pushCmd = () => {
    if (curCmd.argv.length || curCmd.redirIn || curCmd.redirOut) curPipe.cmds.push(curCmd);
    curCmd = { argv: [] };
  };
  const pushPipe = () => {
    pushCmd();
    if (curPipe.cmds.length) {
      items.push({ pipeline: curPipe, op: curOp });
    }
    curPipe = { cmds: [] };
  };

  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];
    if (t === "|") {
      pushCmd();
    } else if (t === "&&" || t === "||" || t === ";") {
      pushPipe();
      curOp = t as ListItem["op"];
    } else if (t === ">" || t === ">>") {
      const target = toks[++i];
      if (!target) throw new Error("syntax error: expected file after " + t);
      curCmd.redirOut = { path: target, append: t === ">>" };
    } else if (t === "<") {
      const target = toks[++i];
      if (!target) throw new Error("syntax error: expected file after <");
      curCmd.redirIn = target;
    } else {
      curCmd.argv.push(t);
    }
  }
  pushPipe();
  return items;
}

function expand(tok: string, ctx: ShellCtx): string {
  // $? and $VAR
  return tok.replace(/\$\?/g, String(ctx.lastExit)).replace(/\$([A-Za-z_][A-Za-z0-9_]*)/g, (_, n) =>
    ctx.env[n] ?? "",
  );
}

async function runPipeline(p: Pipeline, ctx: ShellCtx): Promise<CmdResult> {
  let stdin = "";
  let lastResult: CmdResult = { stdout: "", code: 0 };
  for (const cmd of p.cmds) {
    const argv = cmd.argv.map((t) => expand(t, ctx));
    if (argv.length === 0) continue;
    const name = argv[0];
    const args = argv.slice(1);

    // stdin redirection
    if (cmd.redirIn) {
      const c = readFile(resolvePath(ctx.cwd, cmd.redirIn));
      if (c === null) {
        lastResult = { stdout: "", stderr: `${name}: ${cmd.redirIn}: No such file\n`, code: 1 };
        stdin = "";
        continue;
      }
      stdin = c;
    }

    const fn = builtins[name];
    let res: CmdResult;
    if (!fn) {
      res = { stdout: "", stderr: `lsh: command not found: ${name}\n`, code: 127 };
    } else {
      try {
        res = await fn(args, stdin, ctx);
      } catch (e) {
        res = { stdout: "", stderr: `${name}: ${(e as Error).message}\n`, code: 1 };
      }
    }

    // stdout redirection
    if (cmd.redirOut) {
      const ok = writeFile(
        resolvePath(ctx.cwd, cmd.redirOut.path),
        res.stdout,
        cmd.redirOut.append,
      );
      if (!ok) res = { ...res, stderr: (res.stderr ?? "") + `${name}: ${cmd.redirOut.path}: cannot write\n`, code: res.code || 1 };
      stdin = "";
    } else {
      stdin = res.stdout;
    }
    lastResult = res;
  }
  return lastResult;
}

async function runScript(src: string, ctx: ShellCtx, write: (s: string) => void): Promise<void> {
  let items: ListItem[];
  try {
    items = parse(src);
  } catch (e) {
    write(`${C.red}lsh: ${(e as Error).message}${C.reset}\r\n`);
    ctx.lastExit = 2;
    return;
  }
  let prevCode = ctx.lastExit;
  for (const item of items) {
    if (item.op === "&&" && prevCode !== 0) continue;
    if (item.op === "||" && prevCode === 0) continue;
    const res = await runPipeline(item.pipeline, ctx);
    if (res.stdout) write(res.stdout.replace(/\n/g, "\r\n"));
    if (res.stderr) write(`${C.red}${res.stderr}${C.reset}`.replace(/\n/g, "\r\n"));
    ctx.lastExit = res.code;
    prevCode = res.code;
  }
}

// --------------------------- component ---------------------------

export function TerminalApp() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;

    const term = new Terminal({
      cursorBlink: true,
      fontFamily: "JetBrains Mono, ui-monospace, monospace",
      fontSize: 13,
      theme: {
        background: "#0a0f0d",
        foreground: "#d4f4e2",
        cursor: "#00ff88",
        green: "#00ff88",
        brightGreen: "#5cffb1",
        cyan: "#5ce1ff",
        yellow: "#ffd166",
        red: "#ff5577",
        blue: "#5c9bff",
      },
      allowProposedApi: true,
      convertEol: true,
      scrollback: 5000,
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.loadAddon(new WebLinksAddon());
    term.open(ref.current);

    const initialCwd = (() => {
      try {
        const saved = localStorage.getItem(CWD_KEY);
        if (saved && isDir(saved)) return saved;
      } catch {
        /* ignore */
      }
      return "/root";
    })();

    const ctx: ShellCtx = {
      cwd: initialCwd,
      env: {
        USER: "root",
        HOME: "/root",
        SHELL: "/bin/lsh",
        LIGHTRAIL_FABRIC: "photonic-mesh-20x64",
        LIGHTOS_VERSION: "1.0-aurora",
      },
      lastExit: 0,
      setCwd: (p) => {
        ctx.cwd = p;
        try {
          localStorage.setItem(CWD_KEY, p);
        } catch {
          /* ignore */
        }
      },
    };

    const history: string[] = loadHistory();
    let histIdx = history.length;
    let buf = "";
    let cursor = 0;

    const promptStr = () =>
      `${C.green}${C.bold}${PROMPT_USER}@${PROMPT_HOST}${C.reset}:${C.cyan}${ctx.cwd}${C.reset}$ `;
    const writeLn = (s = "") => term.write(s + "\r\n");

    const banner = [
      "",
      `${C.green}  ╦  ┬┌─┐┬ ┬┌┬┐╔═╗╔═╗${C.reset}     LightOS 1.0 "Aurora"`,
      `${C.green}  ║  ││ ┬├─┤ │ ║ ║╚═╗${C.reset}     Ubuntu 24.04 LTS · Kernel 6.8-lightrail`,
      `${C.green}  ╩═╝┴└─┘┴ ┴ ┴ ╚═╝╚═╝${C.reset}     Photonic AI Fabric · NCE-700`,
      "",
      `${C.gray}Type ${C.reset}help${C.gray} · Tab completes · Ctrl+R history search · Esc → vi-normal (hjkl, w/b, 0/$, x, i/a/A/I).${C.reset}`,
      "",
    ];
    banner.forEach(writeLn);
    term.write(promptStr());

    type Mode = "insert" | "normal";
    const state = { mode: "insert" as Mode };
    let searching = false;
    let searchQuery = "";
    let searchIdx = -1; // index into history of current match

    const modeTag = () =>
      state.mode === "normal" ? `${C.yellow}${C.bold}[N]${C.reset} ` : "";

    const redrawLine = () => {
      if (searching) {
        renderSearch();
        return;
      }
      // Clear current line + redraw
      term.write("\x1b[2K\r" + modeTag() + promptStr() + buf);
      // move cursor back to position
      const back = buf.length - cursor;
      if (back > 0) term.write(`\x1b[${back}D`);
    };

    const renderSearch = () => {
      const match = searchIdx >= 0 ? history[searchIdx] : "";
      term.write(
        `\x1b[2K\r${C.gray}(reverse-i-search)\`${C.reset}${searchQuery}${C.gray}': ${C.reset}${match}`,
      );
    };

    const findBackward = (from: number, q: string): number => {
      if (!q) return -1;
      for (let i = Math.min(from, history.length - 1); i >= 0; i--) {
        if (history[i].includes(q)) return i;
      }
      return -1;
    };

    const exitSearch = (accept: boolean) => {
      const matched = searchIdx >= 0 ? history[searchIdx] : "";
      searching = false;
      if (accept && matched) {
        buf = matched;
        cursor = buf.length;
      }
      searchQuery = "";
      searchIdx = -1;
      redrawLine();
    };

    // Vim-normal-mode word boundaries
    const wordForward = () => {
      let i = cursor;
      while (i < buf.length && /\S/.test(buf[i])) i++;
      while (i < buf.length && /\s/.test(buf[i])) i++;
      cursor = i;
    };
    const wordBack = () => {
      let i = cursor;
      if (i > 0) i--;
      while (i > 0 && /\s/.test(buf[i])) i--;
      while (i > 0 && /\S/.test(buf[i - 1])) i--;
      cursor = i;
    };


    const doComplete = () => {
      // Find start of last token (handles spaces)
      const left = buf.slice(0, cursor);
      const m = left.match(/(\S*)$/);
      const partial = m ? m[1] : "";
      const isFirst = left.trimStart() === partial;
      let candidates: string[];
      if (isFirst && !partial.includes("/")) {
        candidates = Object.keys(builtins).filter((n) => n.startsWith(partial));
      } else {
        candidates = completePath(ctx.cwd, partial);
      }
      if (candidates.length === 0) return;
      if (candidates.length === 1) {
        const insertion = candidates[0].slice(partial.length);
        buf = buf.slice(0, cursor) + insertion + buf.slice(cursor);
        cursor += insertion.length;
        redrawLine();
        return;
      }
      // Common prefix
      let prefix = candidates[0];
      for (const c of candidates) {
        let i = 0;
        while (i < prefix.length && i < c.length && prefix[i] === c[i]) i++;
        prefix = prefix.slice(0, i);
      }
      if (prefix.length > partial.length) {
        const insertion = prefix.slice(partial.length);
        buf = buf.slice(0, cursor) + insertion + buf.slice(cursor);
        cursor += insertion.length;
        redrawLine();
        return;
      }
      term.write("\r\n" + candidates.join("  ") + "\r\n");
      term.write(promptStr() + buf);
      const back = buf.length - cursor;
      if (back > 0) term.write(`\x1b[${back}D`);
    };



    const insertText = (text: string) => {
      // Strip control chars except \n, normalize CRLF
      const clean = text.replace(/\r\n?/g, "\n");
      for (const ch of clean) {
        if (ch === "\n") {
          // Defer line submit to event loop (handler may be async)
          void submitLine();
        } else if (ch >= " ") {
          buf = buf.slice(0, cursor) + ch + buf.slice(cursor);
          cursor++;
        }
      }
      redrawLine();
    };

    const doCopy = () => {
      const sel = term.getSelection();
      if (!sel) return false;
      navigator.clipboard.writeText(sel).catch(() => {
        // Fallback for non-secure contexts
        try {
          const ta = document.createElement("textarea");
          ta.value = sel;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand("copy");
          document.body.removeChild(ta);
        } catch {
          /* ignore */
        }
      });
      return true;
    };

    const doPaste = () => {
      navigator.clipboard
        .readText()
        .then((t) => insertText(t))
        .catch(() => {
          /* clipboard blocked — user can use Ctrl+Shift+V via browser */
        });
    };

    // Copy / paste shortcuts:
    //   Ctrl+Shift+C / Cmd+C  → copy selection
    //   Ctrl+Shift+V / Cmd+V  → paste
    //   Ctrl+Insert / Shift+Insert → copy / paste
    //   Ctrl+C with selection → copy then clear selection (so a second Ctrl+C aborts)
    term.attachCustomKeyEventHandler((e) => {
      if (e.type !== "keydown") return true;
      const mac = navigator.platform.toLowerCase().includes("mac");
      const meta = mac ? e.metaKey : false;

      if ((e.ctrlKey && e.shiftKey && e.key === "C") || (meta && e.key === "c")) {
        if (doCopy()) return false;
      }
      if ((e.ctrlKey && e.shiftKey && e.key === "V") || (meta && e.key === "v")) {
        doPaste();
        return false;
      }
      if (e.ctrlKey && e.key === "Insert") {
        if (doCopy()) return false;
      }
      if (e.shiftKey && e.key === "Insert") {
        doPaste();
        return false;
      }
      // Ctrl+C with active selection → copy; otherwise let it through to abort line
      if (e.ctrlKey && !e.shiftKey && e.key === "c" && term.hasSelection()) {
        doCopy();
        term.clearSelection();
        return false;
      }
      return true;
    });

    // Right-click paste (mirrors common terminal behavior)
    ref.current.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      doPaste();
    });

    const submitLine = async () => {
      term.write("\r\n");
      const line = buf;
      buf = "";
      cursor = 0;
      if (line.trim().length > 0) {
        if (history[history.length - 1] !== line) {
          history.push(line);
          saveHistory(history);
        }
        await runScript(line, ctx, (s) => term.write(s));
      }
      histIdx = history.length;
      term.write(promptStr());
    };

    let busy = false;

    const histPrev = () => {
      if (history.length === 0) return;
      histIdx = Math.max(0, histIdx - 1);
      buf = history[histIdx] ?? "";
      cursor = buf.length;
      redrawLine();
    };
    const histNext = () => {
      histIdx = Math.min(history.length, histIdx + 1);
      buf = history[histIdx] ?? "";
      cursor = buf.length;
      redrawLine();
    };

    const handleNormalChar = (ch: string) => {
      switch (ch) {
        case "h":
          if (cursor > 0) cursor--;
          break;
        case "l":
          if (cursor < buf.length) cursor++;
          break;
        case "k":
          histPrev();
          return;
        case "j":
          histNext();
          return;
        case "0":
        case "^":
          cursor = 0;
          break;
        case "$":
          cursor = buf.length;
          break;
        case "w":
          wordForward();
          break;
        case "b":
          wordBack();
          break;
        case "x":
          if (cursor < buf.length) {
            buf = buf.slice(0, cursor) + buf.slice(cursor + 1);
            if (cursor > buf.length) cursor = buf.length;
          }
          break;
        case "i":
          state.mode = "insert";
          break;
        case "a":
          if (cursor < buf.length) cursor++;
          state.mode = "insert";
          break;
        case "I":
          cursor = 0;
          state.mode = "insert";
          break;
        case "A":
          cursor = buf.length;
          state.mode = "insert";
          break;
        case "D":
          buf = buf.slice(0, cursor);
          break;
        case "d": // simple "dd" — just clear line
          buf = "";
          cursor = 0;
          break;
        default:
          return;
      }
      redrawLine();
    };

    term.onData(async (data) => {
      if (busy) return;

      // ---- reverse-i-search mode ----
      if (searching) {
        for (const ch of data) {
          const code = ch.charCodeAt(0);
          if (ch === "\r") {
            exitSearch(true);
          } else if (ch === "\x1b") {
            exitSearch(false);
          } else if (code === 127 || code === 8) {
            searchQuery = searchQuery.slice(0, -1);
            searchIdx = findBackward(history.length - 1, searchQuery);
            renderSearch();
          } else if (code === 18) {
            // Ctrl+R again → next older match
            const start = searchIdx > 0 ? searchIdx - 1 : history.length - 1;
            searchIdx = findBackward(start, searchQuery);
            renderSearch();
          } else if (code === 3) {
            exitSearch(false);
          } else if (code >= 32) {
            searchQuery += ch;
            searchIdx = findBackward(history.length - 1, searchQuery);
            renderSearch();
          }
        }
        return;
      }

      // Arrow keys & nav (work in both modes)
      if (data === "\x1b[A") return histPrev();
      if (data === "\x1b[B") return histNext();
      if (data === "\x1b[D") {
        if (cursor > 0) {
          cursor--;
          term.write("\x1b[D");
        }
        return;
      }
      if (data === "\x1b[C") {
        if (cursor < buf.length) {
          cursor++;
          term.write("\x1b[C");
        }
        return;
      }
      if (data === "\x1b[H" || data === "\x01") {
        cursor = 0;
        redrawLine();
        return;
      }
      if (data === "\x1b[F" || data === "\x05") {
        cursor = buf.length;
        redrawLine();
        return;
      }

      // Lone Esc → switch to normal mode
      if (data === "\x1b") {
        state.mode = "normal";
        redrawLine();
        return;
      }

      for (const ch of data) {
        const code = ch.charCodeAt(0);

        if (ch === "\r") {
          state.mode = "insert";
          busy = true;
          await submitLine();
          busy = false;
          continue;
        }

        if (code === 18) {
          // Ctrl+R → enter reverse search
          searching = true;
          searchQuery = "";
          searchIdx = -1;
          renderSearch();
          continue;
        }

        if (code === 3) {
          term.write("^C\r\n");
          buf = "";
          cursor = 0;
          state.mode = "insert";
          ctx.lastExit = 130;
          term.write(promptStr());
          continue;
        }

        if (code === 4) continue; // Ctrl+D ignored

        if (state.mode === "normal") {
          handleNormalChar(ch);
          continue;
        }

        // ---- insert mode ----
        if (code === 127 || code === 8) {
          if (cursor > 0) {
            buf = buf.slice(0, cursor - 1) + buf.slice(cursor);
            cursor--;
            redrawLine();
          }
        } else if (ch === "\t") {
          doComplete();
        } else if (code === 12) {
          term.clear();
          redrawLine();
        } else if (code >= 32) {
          buf = buf.slice(0, cursor) + ch + buf.slice(cursor);
          cursor++;
          if (cursor === buf.length) term.write(ch);
          else redrawLine();
        }
      }
    });

    const ro = new ResizeObserver(() => {
      try {
        fit.fit();
      } catch {
        /* ignore */
      }
    });
    ro.observe(ref.current);
    requestAnimationFrame(() => {
      try {
        fit.fit();
      } catch {
        /* ignore */
      }
    });

    return () => {
      ro.disconnect();
      term.dispose();
    };
  }, []);

  return <div ref={ref} className="w-full h-full bg-[#0a0f0d] p-2" />;
}
