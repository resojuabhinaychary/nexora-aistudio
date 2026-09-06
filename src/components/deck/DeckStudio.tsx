import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { motion, AnimatePresence } from "framer-motion";
import { Toaster, toast } from "sonner";
import {
  Sparkles, Wand2, Presentation, FileDown, ImageDown, Plus, Copy, Trash2,
  ChevronLeft, ChevronRight, Loader2, Check, GripVertical, Home,
} from "lucide-react";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { Logo } from "@/components/Logo";
import { SlideView } from "@/components/deck/SlideView";
import { DECK_THEMES, DECK_FONTS, fontsForLanguage } from "@/lib/deckThemes";
import { generateDeckOutline, generateDeckSlide, generateDeckImage } from "@/lib/deck.functions";
import { exportDeckToPptx, exportDeckToPdf, exportDeckImages, exportSpeakerNotes } from "@/lib/deckExport";
import type { Deck, DeckSlide, DeckOutlineItem } from "@/lib/deck.types";

const GRADES = ["Class 6", "Class 7", "Class 8", "Class 9", "Class 10", "Class 11", "Class 12", "Intermediate", "Degree"];
const LANGUAGES = ["English", "Hindi", "Telugu", "Tamil", "Kannada", "Marathi", "Bengali"];
const CACHE_KEY = "nexora.deck.imagecache.v1";
const CONTENT_CONCURRENCY = 3;
const IMAGE_CONCURRENCY = 2;

const uid = () => Math.random().toString(36).slice(2, 10);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function loadCache(): Record<string, string> {
  try {
    return JSON.parse(sessionStorage.getItem(CACHE_KEY) || "{}");
  } catch {
    return {};
  }
}
function saveCache(cache: Record<string, string>) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    /* quota — cache is best-effort */
  }
}

/** Reveals text word by word, exactly like a live AI stream. */
function useTypewriter() {
  const [text, setText] = useState("");
  const cancel = useRef(false);
  const stream = useCallback(async (full: string, msPerWord = 45) => {
    cancel.current = false;
    const words = full.split(/\s+/);
    let acc = "";
    for (const w of words) {
      if (cancel.current) break;
      acc = acc ? `${acc} ${w}` : w;
      setText(acc);
      await sleep(msPerWord);
    }
    setText(full);
  }, []);
  const reset = useCallback(() => {
    cancel.current = true;
    setText("");
  }, []);
  return { text, stream, reset };
}

type Phase = { label: string; detail: string; percent: number } | null;

export function DeckStudio() {
  const [topic, setTopic] = useState("");
  const [grade, setGrade] = useState("Class 10");
  const [language, setLanguage] = useState("English");
  const [slideCount, setSlideCount] = useState(10);
  const [themeId, setThemeId] = useState("education");
  const [fontFamily, setFontFamily] = useState(DECK_FONTS[0].id);
  const [fontScale, setFontScale] = useState(1);
  const [style, setStyle] = useState("professional");
  const [textAmount, setTextAmount] = useState("balanced");
  const [imageStyle, setImageStyle] = useState("illustration");

  const [outline, setOutline] = useState<DeckOutlineItem[] | null>(null);
  const [deck, setDeck] = useState<Deck | null>(null);
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState<Phase>(null);
  const [active, setActive] = useState(0);
  const [busyImages, setBusyImages] = useState<Set<number>>(new Set());
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const typing = useTypewriter();
  const abort = useRef(false);

  const makeOutline = useServerFn(generateDeckOutline);
  const makeSlide = useServerFn(generateDeckSlide);
  const makeImage = useServerFn(generateDeckImage);

  useEffect(() => () => { abort.current = true; }, []);

  const patchSlide = useCallback((index: number, patch: Partial<DeckSlide>) => {
    setDeck((d) =>
      d ? { ...d, slides: d.slides.map((s, i) => (i === index ? { ...s, ...patch } : s)) } : d,
    );
  }, []);

  async function generate() {
    if (topic.trim().length < 3) {
      toast.error("Enter a topic, e.g. “Industrial Revolution Class 10”");
      return;
    }
    abort.current = false;
    setRunning(true);
    setDeck(null);
    setOutline(null);
    setActive(0);
    const cache = loadCache();

    try {
      setPhase({ label: "Thinking", detail: "Planning the slide outline…", percent: 3 });
      const plan = await makeOutline({ data: { topic: topic.trim(), grade, language, slideCount } });
      if (abort.current) return;
      setOutline(plan.slides);
      const total = plan.slides.length;

      const base: Deck = {
        topic: topic.trim(),
        title: plan.title,
        subject: plan.subject,
        grade,
        language,
        themeId,
        fontScale,
        fontFamily,
        slides: [],
      };
      // Show the editable deck shell immediately while independent requests run.
      const workingSlides: DeckSlide[] = plan.slides.map((item, i) => ({
        id: uid(),
        title: item.title,
        subtitle: "",
        bullets: [],
        blocks: [],
        speakerNotes: "",
        imagePrompt: "",
        layout: i === 0 ? "title" : i === total - 1 ? "closing" : "content",
      }));
      setDeck({ ...base, slides: [...workingSlides] });

      let nextContent = 0;
      let completedContent = 0;
      const updateProgress = (label: string, detail: string, completed: number) => {
        setPhase({
          label,
          detail,
          percent: Math.min(99, 4 + Math.round((completed / (total * 2)) * 94)),
        });
      };

      const contentWorker = async () => {
        while (!abort.current) {
          const i = nextContent;
          nextContent += 1;
          if (i >= total) return;
          const item = plan.slides[i];
          const content = await makeSlide({
            data: {
              topic: topic.trim(),
              grade,
              language,
              deckTitle: plan.title,
              subject: plan.subject,
              slideTitle: item.title,
              purpose: item.purpose || "",
              index: i,
              total,
              previousTitles: plan.slides.slice(0, i).map((slide) => slide.title),
              style,
              textAmount,
              imageStyle,
            },
          });
          if (abort.current) return;
          workingSlides[i] = {
            ...workingSlides[i],
            title: content.title,
            subtitle: content.subtitle,
            blocks: content.blocks as DeckSlide["blocks"],
            speakerNotes: content.speakerNotes,
            imagePrompt: content.imagePrompt,
          };
          setDeck({ ...base, slides: [...workingSlides] });
          completedContent += 1;
          updateProgress(`Writing slides · ${completedContent} of ${total}`, item.title, completedContent);
        }
      };

      await Promise.all(
        Array.from({ length: Math.min(CONTENT_CONCURRENCY, total) }, () => contentWorker()),
      );
      if (abort.current) return;

      let nextImage = 0;
      let completedImages = 0;
      const imageWorker = async () => {
        while (!abort.current) {
          const i = nextImage;
          nextImage += 1;
          if (i >= total) return;
          const prompt = workingSlides[i].imagePrompt;
          setBusyImages((current) => new Set(current).add(i));
          try {
            const cached = cache[prompt];
            if (cached) {
              workingSlides[i] = { ...workingSlides[i], image: cached };
            } else {
              for (let attempt = 0; attempt < 3; attempt += 1) {
                if (abort.current) return;
                updateProgress(
                  `Generating images · ${completedImages} of ${total}`,
                  `Rendering image for slide ${i + 1}`,
                  total + completedImages,
                );
                const res = await makeImage({ data: { prompt, attempt } });
                if (res.ok && res.dataUrl) {
                  cache[prompt] = res.dataUrl;
                  saveCache(cache);
                  workingSlides[i] = { ...workingSlides[i], image: res.dataUrl };
                  break;
                }
              }
            }
            setDeck({ ...base, slides: [...workingSlides] });
            completedImages += 1;
            updateProgress(`Generating images · ${completedImages} of ${total}`, `Slide ${i + 1} image ready`, total + completedImages);
          } finally {
            setBusyImages((current) => {
              const next = new Set(current);
              next.delete(i);
              return next;
            });
          }
        }
      };

      await Promise.all(
        Array.from({ length: Math.min(IMAGE_CONCURRENCY, total) }, () => imageWorker()),
      );

      setPhase(null);
      toast.success("Presentation ready — edit, theme it, then export.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Generation failed. Please try again.");
      setPhase(null);
    } finally {
      setBusyImages(new Set());
      setRunning(false);
      typing.reset();
    }
  }

  async function regenerateImage(index: number) {
    if (!deck) return;
    const slide = deck.slides[index];
    if (!slide.imagePrompt) return;
    setBusyImages((current) => new Set(current).add(index));
    try {
      for (let attempt = 0; attempt < 3; attempt += 1) {
        const res = await makeImage({ data: { prompt: slide.imagePrompt, attempt } });
        if (res.ok && res.dataUrl) {
          patchSlide(index, { image: res.dataUrl });
          return;
        }
      }
      toast.error("Image generation is busy right now — try again in a moment.");
    } finally {
      setBusyImages((current) => {
        const next = new Set(current);
        next.delete(index);
        return next;
      });
    }
  }

  const slides = deck?.slides ?? [];
  const current = slides[Math.min(active, Math.max(slides.length - 1, 0))];
  const liveDeck = useMemo(
    () => (deck ? { ...deck, themeId, fontFamily, fontScale } : null),
    [deck, themeId, fontFamily, fontScale],
  );

  const reorder = (from: number, to: number) => {
    setDeck((d) => {
      if (!d) return d;
      const next = [...d.slides];
      const [m] = next.splice(from, 1);
      next.splice(to, 0, m);
      return { ...d, slides: next };
    });
    setActive(to);
  };

  const addSlide = () =>
    setDeck((d) =>
      d
        ? { ...d, slides: [...d.slides, { id: uid(), title: "New Slide", bullets: ["Click to edit this point."] }] }
        : d,
    );
  const duplicateSlide = (i: number) =>
    setDeck((d) => {
      if (!d) return d;
      const next = [...d.slides];
      next.splice(i + 1, 0, { ...next[i], id: uid() });
      return { ...d, slides: next };
    });
  const deleteSlide = (i: number) =>
    setDeck((d) => {
      if (!d || d.slides.length <= 1) return d;
      const next = d.slides.filter((_, x) => x !== i);
      setActive(Math.max(0, Math.min(i, next.length - 1)));
      return { ...d, slides: next };
    });

  return (
    <div className="relative min-h-screen">
      <AnimatedBackground />
      <Toaster position="top-center" richColors />

      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-4">
        <Logo />
        <Link to="/" className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white/80 px-3.5 py-2 text-xs font-bold text-ink backdrop-blur">
          <Home className="h-3.5 w-3.5" /> Home
        </Link>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 pb-24 md:px-6">
        {/* ---------------- Prompt bar ---------------- */}
        <section className="rounded-3xl border border-border bg-white/85 p-5 shadow-card backdrop-blur md:p-7">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-white px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
            <Sparkles className="h-3.5 w-3.5" /> AI Presentation Generator
          </div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink md:text-4xl">
            Describe your topic — watch the deck build itself
          </h1>
          <p className="mt-2 max-w-2xl text-sm font-medium text-muted-foreground">
            Outline first, then each slide is written word by word and given its own AI-generated image. No stock photos, no placeholders.
          </p>

          <div className="mt-5 flex flex-col gap-3 lg:flex-row">
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !running && generate()}
              placeholder="e.g. Industrial Revolution Class 10"
              className="flex-1 rounded-2xl border border-border bg-white px-4 py-3.5 text-sm font-semibold text-ink outline-none transition focus:border-primary/50"
            />
            <button
              onClick={generate}
              disabled={running}
              className="inline-flex items-center justify-center gap-2 rounded-2xl gradient-aurora px-6 py-3.5 text-sm font-bold text-white shadow-glow transition hover:scale-[1.02] disabled:opacity-60"
            >
              {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
              {running ? "Generating…" : "Generate presentation"}
            </button>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Class level">
              <select value={grade} onChange={(e) => setGrade(e.target.value)} className="select-base">
                {GRADES.map((g) => <option key={g}>{g}</option>)}
              </select>
            </Field>
            <Field label="Language">
              <select value={language} onChange={(e) => setLanguage(e.target.value)} className="select-base">
                {LANGUAGES.map((l) => <option key={l}>{l}</option>)}
              </select>
            </Field>
            <Field label="Slides">
              <select value={slideCount} onChange={(e) => setSlideCount(Number(e.target.value))} className="select-base">
                {[6, 8, 10, 12, 14, 16].map((n) => <option key={n} value={n}>{n} slides</option>)}
              </select>
            </Field>
            <Field label="Theme">
              <select value={themeId} onChange={(e) => setThemeId(e.target.value)} className="select-base">
                {DECK_THEMES.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </Field>
            <Field label="Style">
              <select value={style} onChange={(e) => setStyle(e.target.value)} className="select-base">
                {["simple", "professional", "modern", "creative"].map((v) => <option key={v} value={v}>{v[0].toUpperCase() + v.slice(1)}</option>)}
              </select>
            </Field>
            <Field label="Text amount">
              <select value={textAmount} onChange={(e) => setTextAmount(e.target.value)} className="select-base">
                {["minimal", "balanced", "detailed"].map((v) => <option key={v} value={v}>{v[0].toUpperCase() + v.slice(1)}</option>)}
              </select>
            </Field>
            <Field label="Image style">
              <select value={imageStyle} onChange={(e) => setImageStyle(e.target.value)} className="select-base">
                {["photo", "illustration", "3d", "flat", "watercolor"].map((v) => <option key={v} value={v}>{v[0].toUpperCase() + v.slice(1)}</option>)}
              </select>
            </Field>
          </div>
        </section>

        {/* ---------------- Live progress ---------------- */}
        <AnimatePresence>
          {phase && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mt-5 rounded-2xl border border-border bg-white/90 p-4 shadow-soft backdrop-blur"
            >
              <div className="flex items-center justify-between text-xs font-bold text-ink">
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" /> {phase.label}
                </span>
                <span className="text-muted-foreground">{phase.percent}%</span>
              </div>
              <p className="mt-1 text-[11px] font-medium text-muted-foreground">{phase.detail}</p>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary">
                <motion.div
                  className="h-full rounded-full gradient-aurora"
                  animate={{ width: `${phase.percent}%` }}
                  transition={{ ease: "easeOut", duration: 0.4 }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ---------------- Outline ---------------- */}
        {outline && (
          <section className="mt-5 rounded-3xl border border-border bg-white/85 p-5 shadow-soft backdrop-blur">
            <h2 className="font-display text-lg font-extrabold text-ink">Slide outline</h2>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {outline.map((o, i) => {
                const built = i < slides.length;
                return (
                  <motion.div
                    key={`${o.title}-${i}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold ${built ? "border-primary/30 bg-primary/5 text-ink" : "border-border bg-white text-muted-foreground"}`}
                  >
                    {built ? <Check className="h-3.5 w-3.5 text-primary" /> : <span className="text-[10px]">{i + 1}</span>}
                    <span className="truncate">{o.title}</span>
                  </motion.div>
                );
              })}
            </div>
          </section>
        )}

        {/* ---------------- Deck ---------------- */}
        {liveDeck && current && (
          <section className="mt-6 grid gap-5 lg:grid-cols-[240px_1fr]">
            {/* Slide rail with drag & drop */}
            <aside className="order-2 max-h-[70vh] space-y-2 overflow-y-auto scrollbar-thin rounded-2xl border border-border bg-white/80 p-3 backdrop-blur lg:order-1">
              {slides.map((s, i) => (
                <div
                  key={s.id}
                  draggable
                  onDragStart={() => setDragIndex(i)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => { if (dragIndex !== null && dragIndex !== i) reorder(dragIndex, i); setDragIndex(null); }}
                  onClick={() => setActive(i)}
                  className={`group flex cursor-pointer items-center gap-2 rounded-xl border px-2.5 py-2 text-[11px] font-bold transition ${i === active ? "border-primary/40 bg-primary/5 text-ink" : "border-border bg-white text-muted-foreground hover:border-primary/25"}`}
                >
                  <GripVertical className="h-3.5 w-3.5 shrink-0 opacity-40" />
                  <span className="w-4 shrink-0">{i + 1}</span>
                  <span className="truncate">{s.title}</span>
                </div>
              ))}
              {!running && (
                <button onClick={addSlide} className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-border py-2 text-[11px] font-bold text-muted-foreground hover:border-primary/40 hover:text-ink">
                  <Plus className="h-3.5 w-3.5" /> Add slide
                </button>
              )}
            </aside>

            <div className="order-1 lg:order-2">
              <SlideView
                slide={current}
                index={active}
                total={slides.length}
                themeId={themeId}
                fontFamily={fontsForLanguage(language, fontFamily)}
                fontScale={fontScale}
                imageLoading={busyImages.has(active)}
                editable={!running}
                onChange={(next) => patchSlide(active, next)}
              />

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button onClick={() => setActive((i) => Math.max(0, i - 1))} className="chip"><ChevronLeft className="h-3.5 w-3.5" /> Prev</button>
                <button onClick={() => setActive((i) => Math.min(slides.length - 1, i + 1))} className="chip">Next <ChevronRight className="h-3.5 w-3.5" /></button>
                {!running && (
                  <>
                    <button onClick={() => regenerateImage(active)} className="chip" disabled={busyImages.size > 0}>
                      {busyImages.has(active) ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />} Regenerate image
                    </button>
                    <button onClick={() => duplicateSlide(active)} className="chip"><Copy className="h-3.5 w-3.5" /> Duplicate</button>
                    <button onClick={() => deleteSlide(active)} className="chip"><Trash2 className="h-3.5 w-3.5" /> Delete</button>
                  </>
                )}
              </div>

              {/* Design + export controls */}
              {!running && (
                <div className="mt-4 grid gap-3 rounded-2xl border border-border bg-white/85 p-4 backdrop-blur md:grid-cols-3">
                  <Field label="Theme">
                    <select value={themeId} onChange={(e) => setThemeId(e.target.value)} className="select-base">
                      {DECK_THEMES.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </Field>
                  <Field label="Font family">
                    <select value={fontFamily} onChange={(e) => setFontFamily(e.target.value)} className="select-base">
                      {DECK_FONTS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
                    </select>
                  </Field>
                  <Field label={`Font size · ${Math.round(fontScale * 100)}%`}>
                    <input type="range" min={0.8} max={1.3} step={0.05} value={fontScale} onChange={(e) => setFontScale(Number(e.target.value))} className="w-full accent-primary" />
                  </Field>
                  <div className="md:col-span-3 flex flex-wrap gap-2 pt-1">
                    <button onClick={() => exportDeckToPptx(liveDeck)} className="inline-flex items-center gap-2 rounded-xl gradient-aurora px-4 py-2.5 text-xs font-bold text-white shadow-glow">
                      <Presentation className="h-4 w-4" /> Download .PPTX (editable)
                    </button>
                    <button onClick={() => exportDeckToPdf(liveDeck)} className="chip"><FileDown className="h-3.5 w-3.5" /> Download PDF</button>
                    <button onClick={() => exportDeckImages(liveDeck)} className="chip"><ImageDown className="h-3.5 w-3.5" /> Download images</button>
                    <button onClick={() => exportSpeakerNotes(liveDeck)} className="chip"><FileDown className="h-3.5 w-3.5" /> Speaker notes</button>
                  </div>
                </div>
              )}

              {current.speakerNotes && (
                <div className="mt-4 rounded-2xl border border-border bg-white/80 p-4 text-xs font-medium leading-relaxed text-muted-foreground backdrop-blur">
                  <span className="font-bold text-ink">Speaker notes · </span>
                  {current.speakerNotes}
                </div>
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}