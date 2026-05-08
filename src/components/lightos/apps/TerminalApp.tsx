import { useEffect, useRef } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import "@xterm/xterm/css/xterm.css";
import { isDir, listDir, readFile, resolvePath } from "../vfs";

const PROMPT_USER = "root";
const PROMPT_HOST = "lightos-main";

export function TerminalApp() {
  const ref = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);

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
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.loadAddon(new WebLinksAddon());
    term.open(ref.current);
    termRef.current = term;

    let cwd = "/root";
    let buf = "";
    const history: string[] = [];
    let histIdx = -1;

    const C = {
      reset: "\x1b[0m",
      green: "\x1b[38;2;0;255;136m",
      cyan: "\x1b[36m",
      yellow: "\x1b[33m",
      red: "\x1b[31m",
      gray: "\x1b[90m",
      bold: "\x1b[1m",
    };

    const prompt = () =>
      `${C.green}${C.bold}${PROMPT_USER}@${PROMPT_HOST}${C.reset}:${C.cyan}${cwd}${C.reset}$ `;

    const writeLn = (s = "") => term.write(s + "\r\n");

    const banner = [
      "",
      `${C.green}  ╦  ┬┌─┐┬ ┬┌┬┐╔═╗╔═╗${C.reset}     LightOS 1.0 "Aurora"`,
      `${C.green}  ║  ││ ┬├─┤ │ ║ ║╚═╗${C.reset}     Ubuntu 24.04 LTS · Kernel 6.8-lightrail`,
      `${C.green}  ╩═╝┴└─┘┴ ┴ ┴ ╚═╝╚═╝${C.reset}     Photonic AI Fabric · NCE-700`,
      "",
      `${C.gray}Type ${C.reset}help${C.gray} for available commands.${C.reset}`,
      "",
    ];
    banner.forEach(writeLn);
    term.write(prompt());

    const commands: Record<string, (args: string[]) => void | Promise<void>> = {
      help: () => {
        writeLn("Available commands:");
        writeLn("  help, clear, echo, pwd, ls, cd, cat, whoami, date,");
        writeLn("  uname, hostname, neofetch, ps, top, gpu, fabric,");
        writeLn("  env, history, fetch <url>, lightctl, exit");
      },
      clear: () => term.clear(),
      echo: (a) => writeLn(a.join(" ")),
      pwd: () => writeLn(cwd),
      whoami: () => writeLn(PROMPT_USER),
      date: () => writeLn(new Date().toString()),
      hostname: () => writeLn(PROMPT_HOST),
      uname: (a) => {
        if (a.includes("-a"))
          writeLn(
            "Linux lightos-main 6.8.0-lightrail #1 SMP PREEMPT_DYNAMIC x86_64 LightOS",
          );
        else writeLn("Linux");
      },
      ls: (a) => {
        const target = a[0] ? resolvePath(cwd, a[0]) : cwd;
        if (!isDir(target)) {
          const f = readFile(target);
          if (f !== null) writeLn(target.split("/").pop() || "");
          else writeLn(`${C.red}ls: cannot access '${a[0]}': No such file or directory${C.reset}`);
          return;
        }
        const entries = listDir(target);
        writeLn(
          entries
            .map((e) =>
              e.type === "dir" ? `${C.cyan}${e.name}/${C.reset}` : `${e.name}`,
            )
            .join("  "),
        );
      },
      cd: (a) => {
        const target = resolvePath(cwd, a[0] || "/root");
        if (isDir(target)) cwd = target || "/";
        else writeLn(`${C.red}cd: ${a[0]}: not a directory${C.reset}`);
      },
      cat: (a) => {
        if (!a[0]) {
          writeLn(`${C.red}cat: missing operand${C.reset}`);
          return;
        }
        const c = readFile(resolvePath(cwd, a[0]));
        if (c === null) writeLn(`${C.red}cat: ${a[0]}: No such file${C.reset}`);
        else term.write(c.replace(/\n/g, "\r\n"));
      },
      env: () => {
        writeLn("USER=root");
        writeLn("HOME=/root");
        writeLn("SHELL=/bin/lsh");
        writeLn("LIGHTRAIL_FABRIC=photonic-mesh-20x64");
        writeLn("LIGHTOS_VERSION=1.0-aurora");
      },
      history: () => history.forEach((h, i) => writeLn(` ${i + 1}  ${h}`)),
      neofetch: () => {
        const lines = [
          `${C.green}      .:^!?JJJ?!^:.${C.reset}        ${C.bold}root@lightos-main${C.reset}`,
          `${C.green}    .^7?JJJJJJJJJJ?7^.${C.reset}      ${C.gray}-----------------${C.reset}`,
          `${C.green}   ~JJJJJJJJJJJJJJJJJJ~${C.reset}     OS: LightOS 1.0 Aurora`,
          `${C.green}  !JJJJJ${C.cyan}LIGHTRAIL${C.green}JJJJ!${C.reset}    Kernel: 6.8.0-lightrail`,
          `${C.green}  !JJJJJJJJJJJJJJJJJJJ!${C.reset}    CPU: Fabric Controller Gen 2`,
          `${C.green}   ~JJJJJJJJJJJJJJJJJJ~${C.reset}     GPU: LightRail NCE-700`,
          `${C.green}    .^7?JJJJJJJJJJ?7^.${C.reset}      Memory: 1.5 TB HBM3e`,
          `${C.green}      .:^!?JJJ?!^:.${C.reset}        Disk: 128 TB NVMe-oF`,
        ];
        lines.forEach(writeLn);
      },
      gpu: () => {
        writeLn(`${C.bold}LightRail NCE-700 — 8 accelerators${C.reset}`);
        for (let i = 0; i < 8; i++) {
          const u = (60 + Math.random() * 35).toFixed(0);
          const t = (55 + Math.random() * 20).toFixed(0);
          const m = (180 + Math.random() * 12).toFixed(0);
          writeLn(
            `  GPU ${i}  util ${C.green}${u.padStart(3)}%${C.reset}  temp ${C.yellow}${t}°C${C.reset}  mem ${m} GB`,
          );
        }
      },
      fabric: () => {
        writeLn(`${C.bold}Photonic Fabric Status${C.reset}`);
        writeLn(`  Topology       photonic-mesh-20x64`);
        writeLn(`  Optical links  ${C.green}64/64 up${C.reset}`);
        writeLn(`  WDM channels   16 @ 200 Gbps`);
        writeLn(`  Dispatch       3.2 ns`);
        writeLn(`  Bandwidth      12.8 Tbps aggregate`);
      },
      ps: () => {
        writeLn("  PID  USER   COMMAND");
        writeLn("    1  root   /sbin/init");
        writeLn("   42  root   lightrail-fabricd");
        writeLn("   78  root   nce-runtime --bind 0.0.0.0:7700");
        writeLn("  104  root   lightcompile-daemon");
        writeLn("  256  root   /bin/lsh");
      },
      top: () => commands.ps([]),
      lightctl: (a) => {
        if (!a[0]) {
          writeLn("usage: lightctl {status|fabric|deploy|logs}");
          return;
        }
        if (a[0] === "status") writeLn(`${C.green}● lightrail-fabricd active (running)${C.reset}`);
        else if (a[0] === "fabric") commands.fabric([]);
        else writeLn(`lightctl: unknown subcommand '${a[0]}'`);
      },
      exit: () => writeLn("logout (close window to exit)"),
      fetch: async (a) => {
        if (!a[0]) {
          writeLn(`${C.red}fetch: missing url${C.reset}`);
          return;
        }
        try {
          writeLn(`${C.gray}→ GET ${a[0]}${C.reset}`);
          const res = await fetch(a[0]);
          writeLn(`${C.green}${res.status} ${res.statusText}${C.reset}`);
          const text = (await res.text()).slice(0, 1500);
          term.write(text.replace(/\n/g, "\r\n"));
          if (text.length >= 1500) writeLn(`\n${C.gray}…truncated${C.reset}`);
        } catch (e: any) {
          writeLn(`${C.red}fetch failed: ${e.message}${C.reset}`);
        }
      },
    };
    commands.curl = commands.fetch;

    const run = async (line: string) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      history.push(trimmed);
      const [cmd, ...args] = trimmed.split(/\s+/);
      const fn = commands[cmd];
      if (!fn) writeLn(`${C.red}lsh: command not found: ${cmd}${C.reset}`);
      else await fn(args);
    };

    term.onData(async (data) => {
      for (const ch of data) {
        const code = ch.charCodeAt(0);
        if (ch === "\r") {
          term.write("\r\n");
          await run(buf);
          buf = "";
          histIdx = -1;
          term.write(prompt());
        } else if (code === 127) {
          if (buf.length > 0) {
            buf = buf.slice(0, -1);
            term.write("\b \b");
          }
        } else if (data === "\x1b[A") {
          if (history.length === 0) return;
          if (histIdx === -1) histIdx = history.length;
          histIdx = Math.max(0, histIdx - 1);
          term.write("\x1b[2K\r" + prompt() + history[histIdx]);
          buf = history[histIdx];
          return;
        } else if (data === "\x1b[B") {
          if (histIdx === -1) return;
          histIdx = Math.min(history.length, histIdx + 1);
          const v = history[histIdx] ?? "";
          term.write("\x1b[2K\r" + prompt() + v);
          buf = v;
          return;
        } else if (code === 12) {
          term.clear();
          term.write(prompt() + buf);
        } else if (code >= 32) {
          buf += ch;
          term.write(ch);
        }
      }
    });

    const ro = new ResizeObserver(() => {
      try {
        fit.fit();
      } catch {}
    });
    ro.observe(ref.current);
    requestAnimationFrame(() => {
      try {
        fit.fit();
      } catch {}
    });

    return () => {
      ro.disconnect();
      term.dispose();
    };
  }, []);

  return <div ref={ref} className="w-full h-full bg-[#0a0f0d] p-2" />;
}
