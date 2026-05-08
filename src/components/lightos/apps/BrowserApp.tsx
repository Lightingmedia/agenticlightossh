import { useState } from "react";
import { ArrowLeft, ArrowRight, RotateCw } from "lucide-react";

export function BrowserApp() {
  const [url, setUrl] = useState("/");
  const [input, setInput] = useState("/");

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="flex items-center gap-2 p-2 border-b border-border/40 bg-card/40">
        <button className="w-7 h-7 grid place-items-center rounded hover:bg-foreground/10">
          <ArrowLeft className="w-3.5 h-3.5" />
        </button>
        <button className="w-7 h-7 grid place-items-center rounded hover:bg-foreground/10">
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => setUrl(input)}
          className="w-7 h-7 grid place-items-center rounded hover:bg-foreground/10"
        >
          <RotateCw className="w-3.5 h-3.5" />
        </button>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setUrl(input);
          }}
          className="flex-1"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="w-full px-3 py-1 rounded bg-background border border-border/60 text-xs font-mono focus:outline-none focus:border-primary"
          />
        </form>
      </div>
      <iframe src={url} title="browser" className="flex-1 w-full border-0 bg-background" />
    </div>
  );
}
