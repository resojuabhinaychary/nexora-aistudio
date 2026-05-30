import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Send, Sparkles, Wand2, FileType2, ScrollText, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { explainConcept } from "@/lib/ai.functions";
import { toast } from "sonner";

export function AIPanel({
  open,
  onClose,
  onBeautify,
  onRewrite,
  onSummarize,
}: {
  open: boolean;
  onClose: () => void;
  onBeautify: () => void;
  onRewrite: () => void;
  onSummarize: () => void;
}) {
  const [q, setQ] = useState("");
  const [answer, setAnswer] = useState("");
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
    <AnimatePresence>
      {open && (
        <motion.aside
          initial={{ x: 360, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 360, opacity: 0 }}
          transition={{ type: "spring", damping: 26, stiffness: 240 }}
          className="fixed right-0 top-0 z-40 flex h-full w-[360px] max-w-[88vw] flex-col overflow-y-auto border-l border-border bg-white p-4 shadow-card scrollbar-thin"
        >
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="grid h-9 w-9 place-items-center rounded-xl gradient-aurora">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <div>
                <div className="font-display text-sm font-extrabold text-ink">AI Assistant</div>
                <div className="text-[10px] font-semibold text-muted-foreground">Powered by Nexora</div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-secondary"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mb-4 grid grid-cols-3 gap-2">
            <ToolBtn icon={Wand2} label="Beautify" onClick={onBeautify} />
            <ToolBtn icon={ScrollText} label="Rewrite" onClick={onRewrite} />
            <ToolBtn icon={FileType2} label="Summarize" onClick={onSummarize} />
          </div>

          <div className="mb-2 text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">Ask a doubt</div>
          <div className="flex gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Ask anything…"
              className="flex-1 rounded-xl bg-secondary px-3 py-2 text-sm font-medium text-ink outline-none ring-1 ring-transparent focus:ring-primary/40"
            />
            <button
              onClick={send}
              disabled={busy}
              className="grid h-9 w-9 place-items-center rounded-xl gradient-aurora text-white disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>
          {answer && (
            <div className="prose-chat mt-3 max-h-[55vh] overflow-y-auto rounded-2xl border border-border bg-secondary/50 p-3 text-[13px] text-ink scrollbar-thin">
              <ReactMarkdown>{answer}</ReactMarkdown>
            </div>
          )}
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

function ToolBtn({ icon: Icon, label, onClick }: { icon: any; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1 rounded-xl border border-border bg-white p-2.5 text-[11px] font-bold text-ink transition hover:border-primary/40"
    >
      <Icon className="h-4 w-4 text-primary" />
      {label}
    </button>
  );
}
