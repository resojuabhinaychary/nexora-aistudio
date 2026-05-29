import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Send, Sparkles, Wand2, FileType2, ScrollText, Palette } from "lucide-react";
import { explainConcept } from "@/lib/ai.functions";
import { toast } from "sonner";

type Theme = "light" | "violet" | "ink";

export function AIPanel({
  theme,
  onThemeChange,
  onBeautify,
  onRewrite,
  onSummarize,
}: {
  theme: Theme;
  onThemeChange: (t: Theme) => void;
  onBeautify: () => void;
  onRewrite: () => void;
  onSummarize: () => void;
}) {
  const [q, setQ] = useState("");
  const [answer, setAnswer] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const ask = useServerFn(explainConcept);

  const send = async () => {
    if (!q.trim()) return;
    setBusy(true);
    setAnswer("");
    try {
      const r = await ask({ data: { question: q } });
      setAnswer(r.answer);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <aside className="glass-strong hidden h-full w-80 shrink-0 flex-col overflow-y-auto p-4 scrollbar-thin xl:flex">
      <div className="mb-3 flex items-center gap-2">
        <div className="grid h-8 w-8 place-items-center rounded-lg gradient-aurora">
          <Sparkles className="h-4 w-4 text-white" />
        </div>
        <div>
          <div className="font-display text-sm font-semibold">AI Assistant</div>
          <div className="text-[10px] text-muted-foreground">Powered by Nexora</div>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-3 gap-2">
        <ToolBtn icon={Wand2} label="Beautify" onClick={onBeautify} />
        <ToolBtn icon={ScrollText} label="Rewrite" onClick={onRewrite} />
        <ToolBtn icon={FileType2} label="Summarize" onClick={onSummarize} />
      </div>

      <div className="mb-4">
        <div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-widest text-muted-foreground">
          <Palette className="h-3 w-3" /> Theme
        </div>
        <div className="grid grid-cols-3 gap-2">
          {(["light", "violet", "ink"] as Theme[]).map((t) => (
            <button
              key={t}
              onClick={() => onThemeChange(t)}
              className={`rounded-lg border p-2 text-xs capitalize transition ${
                theme === t ? "border-violet/60 bg-violet/15" : "border-white/10 hover:bg-white/5"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-2 text-[11px] uppercase tracking-widest text-muted-foreground">Ask a doubt</div>
      <div className="flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Ask anything…"
          className="flex-1 rounded-lg bg-black/30 px-3 py-2 text-sm outline-none ring-1 ring-white/10 focus:ring-violet/50"
        />
        <button
          onClick={send}
          disabled={busy}
          className="grid h-9 w-9 place-items-center rounded-lg gradient-aurora text-white disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </div>
      {answer && (
        <div className="mt-3 max-h-80 overflow-y-auto rounded-xl bg-black/30 p-3 text-xs leading-relaxed text-muted-foreground scrollbar-thin">
          <pre className="whitespace-pre-wrap font-sans text-foreground/90">{answer}</pre>
        </div>
      )}
    </aside>
  );
}

function ToolBtn({ icon: Icon, label, onClick }: { icon: any; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group flex flex-col items-center gap-1 rounded-xl border border-white/10 bg-white/5 p-2 text-[11px] transition hover:border-violet/50 hover:bg-violet/10"
    >
      <Icon className="h-4 w-4 text-violet" />
      {label}
    </button>
  );
}