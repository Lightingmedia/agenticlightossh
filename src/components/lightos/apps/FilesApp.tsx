import { useState } from "react";
import { Folder, FileText, ChevronRight, Home } from "lucide-react";
import { listDir, readFile } from "../vfs";

export function FilesApp() {
  const [path, setPath] = useState<string>("/root");
  const [selected, setSelected] = useState<string | null>(null);

  const entries = listDir(path);
  const fileContent = selected ? readFile(`${path === "/" ? "" : path}/${selected}`) : null;

  const segments = path.split("/").filter(Boolean);

  return (
    <div className="flex h-full bg-background text-foreground font-mono text-sm">
      <aside className="w-48 bg-card/40 border-r border-border/40 p-2 space-y-1">
        {["/root", "/etc", "/var/log", "/proc", "/usr/bin"].map((p) => (
          <button
            key={p}
            onClick={() => {
              setPath(p);
              setSelected(null);
            }}
            className={`w-full text-left px-2 py-1.5 rounded text-xs ${
              path === p ? "bg-primary/20 text-primary" : "hover:bg-foreground/5"
            }`}
          >
            <Home className="w-3 h-3 inline mr-1.5" />
            {p}
          </button>
        ))}
      </aside>
      <main className="flex-1 flex flex-col min-w-0">
        <div className="border-b border-border/40 px-3 py-2 text-xs flex items-center gap-1 text-muted-foreground">
          /
          {segments.map((s, i) => (
            <span key={i} className="flex items-center gap-1">
              <span className="text-foreground">{s}</span>
              {i < segments.length - 1 && <ChevronRight className="w-3 h-3" />}
            </span>
          ))}
        </div>
        <div className="flex flex-1 min-h-0">
          <ul className="w-1/2 border-r border-border/40 overflow-auto p-2 space-y-0.5">
            {entries.map((e) => (
              <li key={e.name}>
                <button
                  onClick={() =>
                    e.type === "dir"
                      ? setPath(`${path === "/" ? "" : path}/${e.name}`)
                      : setSelected(e.name)
                  }
                  className={`w-full text-left px-2 py-1 rounded flex items-center gap-2 text-xs ${
                    selected === e.name ? "bg-primary/20" : "hover:bg-foreground/5"
                  }`}
                >
                  {e.type === "dir" ? (
                    <Folder className="w-4 h-4 text-primary" />
                  ) : (
                    <FileText className="w-4 h-4 text-muted-foreground" />
                  )}
                  {e.name}
                </button>
              </li>
            ))}
          </ul>
          <pre className="w-1/2 overflow-auto p-3 text-xs text-foreground/80 whitespace-pre-wrap">
            {fileContent ?? <span className="text-muted-foreground">Select a file to preview</span>}
          </pre>
        </div>
      </main>
    </div>
  );
}
