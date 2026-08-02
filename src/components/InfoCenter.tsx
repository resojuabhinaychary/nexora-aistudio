import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Info,
  X,
  Search,
  Sparkles,
  ShieldCheck,
  ScrollText,
  Lock,
  Phone,
  Mail,
  Bug,
  HelpCircle,
  Copy,
  Check,
  MessageCircle,
  ChevronDown,
  Clock,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

const EMAIL = "resojuabhinaychary@gmail.com";
const PHONE = "+91 8639361186";
const WHATSAPP = "918639361186";

type TabKey = "about" | "privacy" | "terms" | "security" | "contact" | "report" | "faq";

const TABS: { key: TabKey; label: string; icon: any }[] = [
  { key: "about", label: "About", icon: Sparkles },
  { key: "privacy", label: "Privacy Policy", icon: ShieldCheck },
  { key: "terms", label: "Terms & Conditions", icon: ScrollText },
  { key: "security", label: "Security", icon: Lock },
  { key: "contact", label: "Contact Us", icon: Phone },
  { key: "report", label: "Report an Issue", icon: Bug },
  { key: "faq", label: "FAQ", icon: HelpCircle },
];

const FAQS = [
  { q: "Is Nexora AI Studio free?", a: "Yes — all core study tools (Doubt Solver, Smart Notes, Presentations, PDF Booklets and Exam Preparer) are free to use." },
  { q: "Can AI make mistakes?", a: "Yes. AI-generated content may occasionally contain errors. Always verify important educational information before using it in examinations." },
  { q: "Can I generate PDFs?", a: "Absolutely. The PDF Booklet builder creates printable A4 study booklets with 5–6 relevant educational illustrations, colored content boxes, glossary and practice questions." },
  { q: "Can I create presentations?", a: "Yes. The Presentation generator builds a full slide deck with an agenda, section slides and speaker notes, ready to present or export." },
  { q: "Can I upload images?", a: "Yes. In the Doubt Solver you can upload or capture a photo of a question and get a clear step-by-step solution." },
  { q: "Can I prepare for exams?", a: "Yes. The Exam Preparer generates unlimited MCQs by subject and class, with timers, instant feedback and a downloadable performance report." },
  { q: "How do I contact support?", a: `Email ${EMAIL} or message ${PHONE} on WhatsApp, Monday–Saturday, 9:00 AM – 8:00 PM IST.` },
];

const SECTION_TEXT: Record<TabKey, string> = {
  about: "about nexora ai studio mission features doubt solver smart notes pdf booklets presentation generator exam preparer study assistant",
  privacy: "privacy policy data collection name email uploaded files questions images analytics we do not sell your personal information",
  terms: "terms and conditions educational purposes harmful illegal content copyright ai mistakes verify examinations",
  security: "security secure connections files processed passwords otp bank details sensitive information",
  contact: `contact us email ${EMAIL} mobile ${PHONE} whatsapp support time monday saturday`,
  report: "report an issue bug form name email subject description screenshot submit",
  faq: FAQS.map((f) => `${f.q} ${f.a}`).join(" "),
};

export function InfoCenterButton({ className = "" }: { className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-1.5 rounded-full border border-border bg-white/80 px-3.5 py-2 text-xs font-bold text-ink backdrop-blur transition hover:border-primary/40 ${className}`}
      >
        <Info className="h-3.5 w-3.5 text-primary" /> Information
      </button>
      <InfoCenterModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}

export function InfoCenterModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [tab, setTab] = useState<TabKey>("about");
  const [query, setQuery] = useState("");

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    return TABS.filter((t) => `${t.label} ${SECTION_TEXT[t.key]}`.toLowerCase().includes(q)).map((t) => t.key);
  }, [query]);

  const visibleTabs = matches ? TABS.filter((t) => matches.includes(t.key)) : TABS;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-end justify-center bg-ink/40 p-0 backdrop-blur-sm md:items-center md:p-6"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 40, scale: 0.97, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 30, scale: 0.98, opacity: 0 }}
            transition={{ type: "spring", damping: 26, stiffness: 260 }}
            onClick={(e) => e.stopPropagation()}
            className="flex h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-t-3xl border border-border bg-white/90 shadow-card backdrop-blur-xl md:h-[86vh] md:rounded-3xl"
          >
            {/* Header */}
            <div className="relative shrink-0 border-b border-border gradient-aurora px-5 py-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white/25 backdrop-blur">
                    <Info className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <div className="font-display text-base font-extrabold text-white">Information Center</div>
                    <div className="text-[11px] font-semibold text-white/80">Help · Legal · Support · Contact</div>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  aria-label="Close"
                  className="grid h-9 w-9 place-items-center rounded-xl bg-white/20 text-white transition hover:bg-white/35"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-3 flex items-center gap-2 rounded-xl bg-white/25 px-3 py-2 backdrop-blur">
                <Search className="h-4 w-4 text-white/90" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search FAQs, policies, contact…"
                  className="w-full bg-transparent text-sm font-medium text-white outline-none placeholder:text-white/70"
                />
              </div>
            </div>

            <div className="flex min-h-0 flex-1 flex-col md:flex-row">
              {/* Tabs */}
              <nav className="flex shrink-0 gap-1.5 overflow-x-auto border-b border-border p-3 scrollbar-thin md:w-56 md:flex-col md:overflow-y-auto md:border-b-0 md:border-r">
                {visibleTabs.map((t) => {
                  const Icon = t.icon;
                  const active = tab === t.key;
                  return (
                    <button
                      key={t.key}
                      onClick={() => setTab(t.key)}
                      className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition md:w-full ${
                        active
                          ? "gradient-aurora text-white shadow-soft"
                          : "text-ink hover:bg-secondary"
                      }`}
                    >
                      <Icon className={`h-4 w-4 ${active ? "text-white" : "text-primary"}`} />
                      {t.label}
                    </button>
                  );
                })}
                {visibleTabs.length === 0 && (
                  <p className="px-2 py-1 text-xs font-semibold text-muted-foreground">No matches found.</p>
                )}
              </nav>

              {/* Content */}
              <div className="min-h-0 flex-1 overflow-y-auto p-5 scrollbar-thin md:p-7">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={tab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                  >
                    {tab === "about" && <About />}
                    {tab === "privacy" && <Privacy />}
                    {tab === "terms" && <Terms />}
                    {tab === "security" && <Security />}
                    {tab === "contact" && <Contact />}
                    {tab === "report" && <ReportForm />}
                    {tab === "faq" && <Faq />}
                  </motion.div>
                </AnimatePresence>

                <footer className="mt-8 border-t border-border pt-4 text-center">
                  <p className="text-[11px] font-semibold text-muted-foreground">
                    © 2026 Nexora AI Studio. All Rights Reserved.
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[11px] font-bold text-ink">
                    {(["privacy", "terms", "security", "contact"] as TabKey[]).map((k, i) => (
                      <span key={k} className="inline-flex items-center gap-2">
                        {i > 0 && <span className="text-muted-foreground">•</span>}
                        <button onClick={() => setTab(k)} className="transition hover:text-primary">
                          {TABS.find((t) => t.key === k)?.label}
                        </button>
                      </span>
                    ))}
                  </div>
                </footer>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ---------------------------------------------------------------- sections */

function H({ children }: { children: React.ReactNode }) {
  return <h3 className="font-display text-xl font-extrabold tracking-tight text-ink md:text-2xl">{children}</h3>;
}
function P({ children }: { children: React.ReactNode }) {
  return <p className="mt-2 text-sm font-medium leading-relaxed text-muted-foreground">{children}</p>;
}
function Sub({ children }: { children: React.ReactNode }) {
  return <h4 className="mt-6 text-[11px] font-extrabold uppercase tracking-[0.18em] text-primary">{children}</h4>;
}
function List({ items }: { items: string[] }) {
  return (
    <ul className="mt-2 space-y-1.5">
      {items.map((i) => (
        <li key={i} className="flex gap-2 text-sm font-medium text-ink/80">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
          {i}
        </li>
      ))}
    </ul>
  );
}

function About() {
  const features = [
    { e: "🧠", t: "AI Doubt Solver" },
    { e: "📓", t: "Smart Notes" },
    { e: "📘", t: "AI PDF Booklets" },
    { e: "🎞️", t: "Presentation Generator" },
    { e: "🎯", t: "Exam Preparer" },
    { e: "✨", t: "Study Assistant" },
  ];
  return (
    <div>
      <H>Welcome to Nexora AI Studio</H>
      <P>
        Nexora AI Studio is an AI-powered educational platform designed to help students learn smarter,
        solve doubts, prepare for exams, generate smart notes, create presentations, and download
        beautifully illustrated PDF booklets.
      </P>
      <Sub>Our Mission</Sub>
      <P>To make quality education accessible, interactive, and AI-powered for every student.</P>
      <Sub>Features</Sub>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f) => (
          <div key={f.t} className="rounded-2xl border border-border bg-white/70 p-4 shadow-soft backdrop-blur transition hover:border-primary/40">
            <div className="text-2xl">{f.e}</div>
            <div className="mt-2 text-sm font-extrabold text-ink">{f.t}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Privacy() {
  return (
    <div>
      <H>Privacy Policy</H>
      <P>We respect your privacy.</P>
      <Sub>We may collect</Sub>
      <List items={["Name (if provided)", "Email address", "Uploaded files", "Questions submitted", "Images uploaded for doubt solving", "Basic usage analytics"]} />
      <P>Your information is used only to provide educational services and improve your experience.</P>
      <div className="mt-4 rounded-2xl border border-primary/25 bg-primary/5 p-4 text-sm font-bold text-ink">
        We do not sell your personal information.
      </div>
    </div>
  );
}

function Terms() {
  return (
    <div>
      <H>Terms &amp; Conditions</H>
      <P>By using Nexora AI Studio, you agree to:</P>
      <List
        items={[
          "Use the platform only for educational purposes.",
          "Do not upload harmful or illegal content.",
          "Respect copyright laws.",
          "AI-generated content may occasionally contain mistakes.",
          "Verify important educational information before using it in examinations.",
        ]}
      />
    </div>
  );
}

function Security() {
  return (
    <div>
      <H>Security</H>
      <P>Your security is important to us.</P>
      <List
        items={[
          "Secure connections are used whenever possible.",
          "Files are processed only for the requested task.",
          "We continuously improve platform reliability and security.",
        ]}
      />
      <div className="mt-4 rounded-2xl border border-destructive/25 bg-destructive/5 p-4 text-sm font-bold text-ink">
        Never share passwords, OTPs, bank details, or other sensitive personal information in chats.
      </div>
    </div>
  );
}

function CopyBtn({ value, label }: { value: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setDone(true);
          toast.success(`${label} copied`);
          setTimeout(() => setDone(false), 1600);
        } catch {
          toast.error("Could not copy");
        }
      }}
      className="inline-flex items-center gap-1 rounded-lg border border-border bg-white/80 px-2 py-1 text-[11px] font-bold text-ink transition hover:border-primary/40"
    >
      {done ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5 text-primary" />}
      {done ? "Copied" : "Copy"}
    </button>
  );
}

function Contact() {
  return (
    <div>
      <H>Contact Us</H>
      <P>We’re here to help — reach out any time during support hours.</P>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-white/70 p-4 shadow-soft backdrop-blur">
          <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-primary">
            <Mail className="h-4 w-4" /> Email
          </div>
          <div className="mt-2 break-all text-sm font-bold text-ink">{EMAIL}</div>
          <div className="mt-3 flex items-center gap-2">
            <a
              href={`mailto:${EMAIL}`}
              className="inline-flex items-center gap-1 rounded-lg gradient-aurora px-2.5 py-1 text-[11px] font-bold text-white"
            >
              <Mail className="h-3.5 w-3.5" /> Email us
            </a>
            <CopyBtn value={EMAIL} label="Email" />
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-white/70 p-4 shadow-soft backdrop-blur">
          <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-primary">
            <Phone className="h-4 w-4" /> Mobile
          </div>
          <div className="mt-2 text-sm font-bold text-ink">{PHONE}</div>
          <div className="mt-3 flex items-center gap-2">
            <a
              href={`https://wa.me/${WHATSAPP}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-lg gradient-mint px-2.5 py-1 text-[11px] font-bold text-ink"
            >
              <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
            </a>
            <CopyBtn value={PHONE} label="Phone number" />
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-white/70 p-4 shadow-soft backdrop-blur sm:col-span-2">
          <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-primary">
            <Clock className="h-4 w-4" /> Support Time
          </div>
          <div className="mt-2 text-sm font-bold text-ink">Monday – Saturday</div>
          <div className="text-sm font-medium text-muted-foreground">9:00 AM – 8:00 PM (IST)</div>
        </div>
      </div>
    </div>
  );
}

function ReportForm() {
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", subject: "", description: "" });
  const [file, setFile] = useState<File | null>(null);

  const field = "mt-1 w-full rounded-xl border border-border bg-white/80 px-3 py-2 text-sm font-medium text-ink outline-none ring-1 ring-transparent transition focus:ring-primary/40";

  if (sent) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="rounded-3xl border border-primary/25 bg-primary/5 p-8 text-center">
        <div className="text-4xl">✅</div>
        <H>Report submitted</H>
        <P>Thank you! Your issue has been submitted successfully. We&apos;ll review it as soon as possible.</P>
        <button
          onClick={() => {
            setSent(false);
            setForm({ name: "", email: "", subject: "", description: "" });
            setFile(null);
          }}
          className="mt-4 rounded-xl border border-border bg-white/80 px-4 py-2 text-xs font-bold text-ink transition hover:border-primary/40"
        >
          Report another issue
        </button>
      </motion.div>
    );
  }

  return (
    <div>
      <H>Report an Issue</H>
      <P>Found a bug or something inaccurate? Tell us and we&apos;ll fix it.</P>
      <form
        className="mt-4 space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (!form.name.trim() || !form.email.trim() || !form.subject.trim() || !form.description.trim()) {
            toast.error("Please fill in all required fields");
            return;
          }
          setBusy(true);
          setTimeout(() => {
            try {
              const key = "nexora.reports";
              const prev = JSON.parse(localStorage.getItem(key) || "[]");
              prev.push({ ...form, screenshot: file?.name || null, at: new Date().toISOString() });
              localStorage.setItem(key, JSON.stringify(prev.slice(-30)));
            } catch { /* ignore */ }
            setBusy(false);
            setSent(true);
          }, 700);
        }}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-xs font-extrabold uppercase tracking-widest text-muted-foreground">
            Name
            <input className={field} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Your name" />
          </label>
          <label className="block text-xs font-extrabold uppercase tracking-widest text-muted-foreground">
            Email
            <input type="email" className={field} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" />
          </label>
        </div>
        <label className="block text-xs font-extrabold uppercase tracking-widest text-muted-foreground">
          Subject
          <input className={field} value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="Short summary" />
        </label>
        <label className="block text-xs font-extrabold uppercase tracking-widest text-muted-foreground">
          Description
          <textarea rows={5} className={field} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What happened? Steps to reproduce…" />
        </label>
        <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-border bg-white/60 px-3 py-3 text-xs font-bold text-ink transition hover:border-primary/40">
          <Upload className="h-4 w-4 text-primary" />
          {file ? file.name : "Upload screenshot (optional)"}
          <input type="file" accept="image/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl gradient-aurora px-5 py-3 text-sm font-bold text-white shadow-glow transition hover:scale-[1.01] disabled:opacity-60"
        >
          <Bug className="h-4 w-4" /> {busy ? "Submitting…" : "Submit Report"}
        </button>
      </form>
    </div>
  );
}

function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div>
      <H>Frequently Asked Questions</H>
      <div className="mt-4 space-y-2.5">
        {FAQS.map((f, i) => {
          const isOpen = open === i;
          return (
            <div key={f.q} className="overflow-hidden rounded-2xl border border-border bg-white/70 shadow-soft backdrop-blur">
              <button
                onClick={() => setOpen(isOpen ? null : i)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-bold text-ink"
              >
                {f.q}
                <ChevronDown className={`h-4 w-4 shrink-0 text-primary transition-transform ${isOpen ? "rotate-180" : ""}`} />
              </button>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.22 }}
                  >
                    <p className="px-4 pb-3 text-sm font-medium leading-relaxed text-muted-foreground">{f.a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}
