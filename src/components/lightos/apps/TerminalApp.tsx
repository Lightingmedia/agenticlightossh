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

// --------------------------- builtins ---------------------------

const builtins: Record<string, Builtin> = {
  help: () => ({
    stdout:
      "Builtins: help clear echo pwd cd ls cat head tail wc grep chmod chown touch mkdir rm cp mv\n" +
      "          whoami date hostname uname neofetch env export history ps top gpu fabric lightctl\n" +
      "          fetch curl exit true false\n" +
      "Operators: |  >  >>  <  &&  ||  ;   ($? expands to last exit code)\n" +
      "Quoting:   'single' \"double\"   Tab completes. Ctrl+R searches history.\n" +
      "Vi mode:   Esc → normal (h j k l 0 $ w b x i a A I); i/a/A/I → insert.\n",
    code: 0,
  }),
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
    if (!a[0]) return { stdout: "usage: lightctl {status|fabric|deploy|logs}\n", code: 1 };
    if (a[0] === "status")
      return { stdout: `${C.green}● lightrail-fabricd active (running)${C.reset}\n`, code: 0 };
    if (a[0] === "fabric") return builtins.fabric([], "", { cwd: "/", env: {}, lastExit: 0, setCwd: () => {} }) as CmdResult;
    return { stdout: "", stderr: `lightctl: unknown subcommand '${a[0]}'\n`, code: 1 };
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
      `${C.gray}Type ${C.reset}help${C.gray} for commands. Tab completes. Ctrl+Shift+C/V (or Cmd+C/V) for copy/paste.${C.reset}`,
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
      mode === "normal" ? `${C.yellow}${C.bold}[N]${C.reset} ` : "";

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
    term.onData(async (data) => {
      if (busy) return;
      // Handle escape sequences first
      if (data === "\x1b[A") {
        if (history.length === 0) return;
        histIdx = Math.max(0, histIdx - 1);
        buf = history[histIdx] ?? "";
        cursor = buf.length;
        redrawLine();
        return;
      }
      if (data === "\x1b[B") {
        histIdx = Math.min(history.length, histIdx + 1);
        buf = history[histIdx] ?? "";
        cursor = buf.length;
        redrawLine();
        return;
      }
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
        term.write(`\x1b[${cursor}D`);
        cursor = 0;
        return;
      }
      if (data === "\x1b[F" || data === "\x05") {
        const d = buf.length - cursor;
        if (d > 0) term.write(`\x1b[${d}C`);
        cursor = buf.length;
        return;
      }
      // Per-char processing for plain input (paste arrives as multiple chars too)
      for (const ch of data) {
        const code = ch.charCodeAt(0);
        if (ch === "\r") {
          busy = true;
          await submitLine();
          busy = false;
        } else if (code === 127 || code === 8) {
          if (cursor > 0) {
            buf = buf.slice(0, cursor - 1) + buf.slice(cursor);
            cursor--;
            redrawLine();
          }
        } else if (ch === "\t") {
          doComplete();
        } else if (code === 12) {
          term.clear();
          term.write(promptStr() + buf);
          const back = buf.length - cursor;
          if (back > 0) term.write(`\x1b[${back}D`);
        } else if (code === 3) {
          // Ctrl+C — abort line
          term.write("^C\r\n");
          buf = "";
          cursor = 0;
          ctx.lastExit = 130;
          term.write(promptStr());
        } else if (code === 4) {
          // Ctrl+D — ignore (would close shell)
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
