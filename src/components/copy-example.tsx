import { useState } from "react";

/** Copy-to-clipboard block for a tested, ready-to-run invocation example. */
export function CopyExample({ command }: { command: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // clipboard unavailable — the command stays selectable
    }
  };

  return (
    <div className="rounded-md border border-border/60 bg-muted/40">
      <div className="flex items-center justify-between border-b border-border/60 px-3 py-1.5">
        <span className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
          tested example call
        </span>
        <button
          type="button"
          onClick={copy}
          className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase hover:text-foreground"
        >
          {copied ? "copied" : "copy"}
        </button>
      </div>
      <pre className="overflow-x-auto px-3 py-2.5 font-mono text-[12px] leading-relaxed whitespace-pre-wrap break-all">
        {command}
      </pre>
    </div>
  );
}
