import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Camera, ImagePlus, Mic, MicOff, Send, Sparkles, X, Loader2 } from "lucide-react";
import { FORMATS, type FormatKey } from "./FormatCards";

export type ComposerSubmit = {
  text: string;
  imageBase64?: string;
  format: FormatKey;
};

export function ChatComposer({
  onSubmit,
  busy,
  defaultFormat = "doubt",
  autoFocus = true,
}: {
  onSubmit: (s: ComposerSubmit) => void | Promise<void>;
  busy?: boolean;
  defaultFormat?: FormatKey;
  autoFocus?: boolean;
}) {
  const [text, setText] = useState("");
  const [format, setFormat] = useState<FormatKey>(defaultFormat);
  const [image, setImage] = useState<string | undefined>();
  const [listening, setListening] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const recogRef = useRef<any>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (autoFocus) taRef.current?.focus();
  }, [autoFocus]);

  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 200) + "px";
  }, [text]);

  const pickFile = (kind: "file" | "camera") => {
    (kind === "camera" ? cameraRef : fileRef).current?.click();
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      alert("Image too large (max 8MB)");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const toggleVoice = () => {
    const SR: any =
      (typeof window !== "undefined" && (window as any).SpeechRecognition) ||
      (typeof window !== "undefined" && (window as any).webkitSpeechRecognition);
    if (!SR) {
      alert("Voice input is not supported in this browser.");
      return;
    }
    if (listening) {
      recogRef.current?.stop();
      setListening(false);
      return;
    }
    const r = new SR();
    r.lang = "en-US";
    r.interimResults = true;
    r.continuous = false;
    r.onresult = (ev: any) => {
      let t = "";
      for (let i = 0; i < ev.results.length; i++) t += ev.results[i][0].transcript;
      setText((prev) => (prev ? prev + " " + t : t));
    };
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    recogRef.current = r;
    r.start();
    setListening(true);
  };

  const send = async () => {
    if (busy) return;
    const t = text.trim();
    if (!t && !image) return;
    await onSubmit({ text: t, imageBase64: image, format });
    setText("");
    setImage(undefined);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="rounded-3xl border border-border bg-white shadow-card"
    >
      <div className="border-b border-border p-3">
        <div className="flex items-center gap-2 px-1 pb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          Choose a mode
        </div>
        <div className="flex flex-wrap gap-2">
          {FORMATS.map((f) => {
            const active = f.key === format;
            const Icon = f.icon;
            return (
              <button
                key={f.key}
                onClick={() => setFormat(f.key)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition ${
                  active
                    ? "gradient-aurora text-white shadow-soft"
                    : "border border-border bg-white text-ink hover:border-primary/40"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {image && (
        <div className="border-b border-border p-3">
          <div className="relative inline-block">
            <img src={image} alt="upload" className="h-28 rounded-xl border border-border object-cover" />
            <button
              onClick={() => setImage(undefined)}
              className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-ink text-white shadow"
              aria-label="Remove image"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}

      <div className="flex items-end gap-2 p-3">
        <textarea
          ref={taRef}
          value={text}
          rows={1}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder={
            format === "doubt"
              ? "Ask any doubt, paste a question, or upload an image…"
              : `Describe what to generate (${format})…`
          }
          className="min-h-[44px] flex-1 resize-none rounded-2xl bg-secondary px-4 py-3 text-[15px] font-medium text-ink outline-none ring-1 ring-transparent transition placeholder:text-muted-foreground focus:ring-primary/40"
        />
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-border px-3 py-2">
        <div className="flex items-center gap-1">
          <IconBtn label="Camera" onClick={() => pickFile("camera")}>
            <Camera className="h-4 w-4" />
          </IconBtn>
          <IconBtn label="Upload image" onClick={() => pickFile("file")}>
            <ImagePlus className="h-4 w-4" />
          </IconBtn>
          <IconBtn label={listening ? "Stop voice" : "Voice"} onClick={toggleVoice} active={listening}>
            {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </IconBtn>
        </div>
        <button
          onClick={send}
          disabled={busy || (!text.trim() && !image)}
          className="inline-flex items-center gap-2 rounded-full gradient-aurora px-5 py-2.5 text-sm font-bold text-white shadow-glow transition hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {busy ? "Working…" : "Send"}
        </button>
      </div>

      <input ref={fileRef} type="file" accept="image/*" hidden onChange={onFile} />
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={onFile} />
    </motion.div>
  );
}

function IconBtn({
  children,
  label,
  onClick,
  active,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`grid h-9 w-9 place-items-center rounded-xl border transition ${
        active
          ? "border-primary/40 bg-primary/10 text-primary"
          : "border-transparent text-muted-foreground hover:bg-secondary hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}
