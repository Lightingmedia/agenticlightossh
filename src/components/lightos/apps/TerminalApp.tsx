import { useEffect, useRef } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import "@xterm/xterm/css/xterm.css";
import {
  completePath,
  copy,
  isDir,
  listDir,
  mkdir,
  move,
  readFile,
  remove,
  resolvePath,
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
      "Builtins: help clear echo pwd cd ls cat touch mkdir rm cp mv whoami date hostname\n" +
      "          uname neofetch env export history ps top gpu fabric lightctl fetch curl exit true false\n" +
      "Operators: |  >  >>  <  &&  ||  ;   ($? expands to last exit code)\n" +
      "Quoting:   'single' \"double\"   Tab to complete commands and paths.\n",
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
      const lines = entries.map(
        (e) =>
          `${e.type === "dir" ? "d" : "-"}rwxr-xr-x  1 root root  ${
            e.type === "file" ? (readFile(`${target}/${e.name}`)?.length ?? 0) : 4096
          }  ${e.type === "dir" ? `${C.cyan}${e.name}/${C.reset}` : e.name}`,
      );
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
      `${C.gray}Type ${C.reset}help${C.gray} for commands. Tab completes. Ctrl+Shift+C/V for copy/paste.${C.reset}`,
      "",
    ];
    banner.forEach(writeLn);
    term.write(promptStr());

    const redrawLine = () => {
      // Clear current line + redraw
      term.write("\x1b[2K\r" + promptStr() + buf);
      // move cursor back to position
      const back = buf.length - cursor;
      if (back > 0) term.write(`\x1b[${back}D`);
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

    // Copy / paste keyboard shortcuts (Ctrl+Shift+C / Ctrl+Shift+V)
    term.attachCustomKeyEventHandler((e) => {
      if (e.type !== "keydown") return true;
      if (e.ctrlKey && e.shiftKey && e.key === "C") {
        const sel = term.getSelection();
        if (sel) navigator.clipboard.writeText(sel).catch(() => {});
        return false;
      }
      if (e.ctrlKey && e.shiftKey && e.key === "V") {
        navigator.clipboard.readText().then((t) => {
          // Insert as if typed
          for (const ch of t.replace(/\r\n?/g, "\n")) {
            if (ch === "\n") {
              // submit current line then continue
              submitLine();
            } else if (ch >= " ") {
              buf = buf.slice(0, cursor) + ch + buf.slice(cursor);
              cursor++;
              redrawLine();
            }
          }
        }).catch(() => {});
        return false;
      }
      return true;
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
