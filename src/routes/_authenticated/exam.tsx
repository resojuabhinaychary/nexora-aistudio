import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { motion, AnimatePresence } from "framer-motion";
import { Toaster, toast } from "sonner";
import jsPDF from "jspdf";
import {
  ArrowLeft,
  ArrowRight,
  Award,
  BookOpenCheck,
  CheckCircle2,
  Clock,
  Download,
  Lightbulb,
  Loader2,
  Printer,
  RotateCcw,
  Sparkles,
  Target,
  Trophy,
  XCircle,
} from "lucide-react";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { Logo } from "@/components/Logo";
import { generateQuiz, type MCQ } from "@/lib/exam.functions";

export const Route = createFileRoute("/_authenticated/exam")({
  head: () => ({
    meta: [
      { title: "AI Exam Preparer — Nexora AI" },
      {
        name: "description",
        content:
          "Practice MCQs across every school subject with instant feedback, score tracking, and a downloadable performance report.",
      },
    ],
  }),
  component: ExamPage,
});

const SUBJECTS = [
  { id: "Mathematics", emoji: "➗" },
  { id: "Science", emoji: "🔬" },
  { id: "Physics", emoji: "⚛️" },
  { id: "Chemistry", emoji: "🧪" },
  { id: "Biology", emoji: "🧬" },
  { id: "English", emoji: "📖" },
  { id: "Social Studies", emoji: "🌍" },
  { id: "History", emoji: "🏛️" },
  { id: "Geography", emoji: "🗺️" },
  { id: "Computer Science", emoji: "💻" },
  { id: "General Knowledge", emoji: "🧠" },
] as const;

const DIFFICULTIES = [
  { id: "easy", label: "Easy", desc: "Warm-up · build confidence", color: "gradient-mint" },
  { id: "medium", label: "Medium", desc: "School-exam level", color: "gradient-sky" },
  { id: "hard", label: "Hard", desc: "Push yourself · olympiad style", color: "gradient-peach" },
] as const;

type Stage = "setup" | "quiz" | "result";
type Difficulty = (typeof DIFFICULTIES)[number]["id"];

function ExamPage() {
  const ask = useServerFn(generateQuiz);
  const [stage, setStage] = useState<Stage>("setup");

  // Setup
  const [studentName, setStudentName] = useState("");
  const [subject, setSubject] = useState<string>("Mathematics");
  const [topic, setTopic] = useState("");
  const [grade, setGrade] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [count, setCount] = useState(10);
  const [busy, setBusy] = useState(false);

  // Quiz
  const [questions, setQuestions] = useState<MCQ[]>([]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [revealed, setRevealed] = useState<boolean[]>([]);
  const [startedAt, setStartedAt] = useState<number>(0);
  const [elapsed, setElapsed] = useState(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (stage === "quiz") {
      tickRef.current = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000);
      return () => {
        if (tickRef.current) clearInterval(tickRef.current);
      };
    }
  }, [stage, startedAt]);

  const start = async () => {
    setBusy(true);
    try {
      const r = await ask({
        data: {
          subject,
          topic: topic.trim() || undefined,
          grade: grade.trim() || undefined,
          difficulty,
          count,
        },
      });
      setQuestions(r.questions);
      setAnswers(new Array(r.questions.length).fill(null));
      setRevealed(new Array(r.questions.length).fill(false));
      setIndex(0);
      setElapsed(0);
      setStartedAt(Date.now());
      setStage("quiz");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not start quiz");
    } finally {
      setBusy(false);
    }
  };

  const selectOption = (optIdx: number) => {
    if (revealed[index]) return;
    const a = [...answers];
    a[index] = optIdx;
    setAnswers(a);
    const r = [...revealed];
    r[index] = true;
    setRevealed(r);
  };

  const next = () => {
    if (index < questions.length - 1) setIndex((i) => i + 1);
    else finish();
  };
  const prev = () => setIndex((i) => Math.max(0, i - 1));

  const finish = () => {
    if (tickRef.current) clearInterval(tickRef.current);
    setStage("result");
  };

  const restart = () => {
    setStage("setup");
    setQuestions([]);
    setAnswers([]);
    setRevealed([]);
    setIndex(0);
    setElapsed(0);
  };

  return (
    <div className="relative min-h-screen pb-24">
      <AnimatedBackground />
      <Toaster position="top-center" richColors />

      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-4">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="grid h-9 w-9 place-items-center rounded-xl border border-border bg-white/80 backdrop-blur transition hover:border-primary/40"
          >
            <ArrowLeft className="h-4 w-4 text-ink" />
          </Link>
          <Logo />
        </div>
        {stage === "quiz" && (
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-white/80 px-3.5 py-2 text-xs font-bold text-ink backdrop-blur">
            <Clock className="h-3.5 w-3.5 text-primary" /> {formatTime(elapsed)}
          </div>
        )}
      </header>

      <main className="mx-auto w-full max-w-3xl px-5">
        {stage === "setup" && (
          <SetupView
            studentName={studentName}
            setStudentName={setStudentName}
            subject={subject}
            setSubject={setSubject}
            topic={topic}
            setTopic={setTopic}
            grade={grade}
            setGrade={setGrade}
            difficulty={difficulty}
            setDifficulty={setDifficulty}
            count={count}
            setCount={setCount}
            busy={busy}
            onStart={start}
          />
        )}
        {stage === "quiz" && questions.length > 0 && (
          <QuizView
            questions={questions}
            index={index}
            answers={answers}
            revealed={revealed}
            onSelect={selectOption}
            onPrev={prev}
            onNext={next}
          />
        )}
        {stage === "result" && (
          <ResultView
            studentName={studentName || "Student"}
            subject={subject}
            topic={topic}
            difficulty={difficulty}
            questions={questions}
            answers={answers}
            elapsed={elapsed}
            onRestart={restart}
          />
        )}
      </main>
    </div>
  );
}

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

/* ---------------- Setup ---------------- */
function SetupView(props: {
  studentName: string;
  setStudentName: (v: string) => void;
  subject: string;
  setSubject: (v: string) => void;
  topic: string;
  setTopic: (v: string) => void;
  grade: string;
  setGrade: (v: string) => void;
  difficulty: Difficulty;
  setDifficulty: (d: Difficulty) => void;
  count: number;
  setCount: (n: number) => void;
  busy: boolean;
  onStart: () => void;
}) {
  return (
    <div className="space-y-6">
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="overflow-hidden rounded-3xl border border-border gradient-aurora p-7 text-white shadow-card md:p-10"
      >
        <div className="text-5xl">🎯</div>
        <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight md:text-5xl">
          AI Exam Preparer
        </h1>
        <p className="mt-2 max-w-xl text-sm font-medium text-white/85 md:text-base">
          Practice unlimited MCQs across every school subject, get instant feedback with detailed
          explanations, and download a polished performance report.
        </p>
      </motion.section>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        className="space-y-5 rounded-3xl border border-border bg-white p-5 shadow-card md:p-7"
      >
        <Field label="Your name (for the report)">
          <input
            value={props.studentName}
            onChange={(e) => props.setStudentName(e.target.value)}
            placeholder="e.g. Abhinay Chary"
            className="w-full rounded-xl bg-secondary px-4 py-3 text-[15px] font-medium text-ink outline-none ring-1 ring-transparent focus:ring-primary/40"
          />
        </Field>

        <Field label="Subject">
          <div className="flex flex-wrap gap-2">
            {SUBJECTS.map((s) => (
              <button
                key={s.id}
                onClick={() => props.setSubject(s.id)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-bold transition ${
                  props.subject === s.id
                    ? "border-primary/40 gradient-aurora text-white shadow-glow"
                    : "border-border bg-white text-ink hover:border-primary/30"
                }`}
              >
                <span>{s.emoji}</span>
                {s.id}
              </button>
            ))}
          </div>
        </Field>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Topic (optional)">
            <input
              value={props.topic}
              onChange={(e) => props.setTopic(e.target.value)}
              placeholder="e.g. Trigonometry"
              className="w-full rounded-xl bg-secondary px-4 py-3 text-[15px] font-medium text-ink outline-none ring-1 ring-transparent focus:ring-primary/40"
            />
          </Field>
          <Field label="Class / Grade (optional)">
            <input
              value={props.grade}
              onChange={(e) => props.setGrade(e.target.value)}
              placeholder="e.g. Class 10"
              className="w-full rounded-xl bg-secondary px-4 py-3 text-[15px] font-medium text-ink outline-none ring-1 ring-transparent focus:ring-primary/40"
            />
          </Field>
        </div>

        <Field label="Difficulty">
          <div className="grid gap-3 md:grid-cols-3">
            {DIFFICULTIES.map((d) => (
              <button
                key={d.id}
                onClick={() => props.setDifficulty(d.id)}
                className={`rounded-2xl border p-4 text-left transition ${
                  props.difficulty === d.id
                    ? "border-primary/50 shadow-glow"
                    : "border-border hover:border-primary/30"
                } ${d.color}`}
              >
                <div className="text-sm font-extrabold text-ink">{d.label}</div>
                <div className="mt-1 text-xs font-medium text-ink/70">{d.desc}</div>
              </button>
            ))}
          </div>
        </Field>

        <Field label={`Number of questions: ${props.count}`}>
          <input
            type="range"
            min={5}
            max={20}
            value={props.count}
            onChange={(e) => props.setCount(Number(e.target.value))}
            className="w-full accent-primary"
          />
        </Field>

        <button
          onClick={props.onStart}
          disabled={props.busy}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full gradient-aurora px-5 py-3 text-sm font-bold text-white shadow-glow transition hover:scale-[1.01] disabled:opacity-50 disabled:hover:scale-100 md:w-auto"
        >
          {props.busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {props.busy ? "Generating your quiz…" : "Start quiz"}
        </button>
      </motion.div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </div>
      {children}
    </div>
  );
}

/* ---------------- Quiz ---------------- */
function QuizView(props: {
  questions: MCQ[];
  index: number;
  answers: (number | null)[];
  revealed: boolean[];
  onSelect: (i: number) => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const { questions, index, answers, revealed } = props;
  const q = questions[index];
  const selected = answers[index];
  const isRevealed = revealed[index];
  const progress = ((index + 1) / questions.length) * 100;
  const isLast = index === questions.length - 1;

  return (
    <div className="space-y-5">
      <div>
        <div className="mb-2 flex items-center justify-between text-xs font-bold text-muted-foreground">
          <span>
            Question {index + 1} of {questions.length}
          </span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
          <motion.div
            className="h-full gradient-aurora"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={index}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.25 }}
          className="rounded-3xl border border-border bg-white p-5 shadow-card md:p-7"
        >
          <div className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-primary">
            Q{index + 1}
          </div>
          <h2 className="mt-2 font-display text-xl font-extrabold leading-snug text-ink md:text-2xl">
            {q.question}
          </h2>

          <div className="mt-5 space-y-2.5">
            {q.options.map((opt, i) => {
              const isCorrect = i === q.correctIndex;
              const isSelected = selected === i;
              let cls =
                "flex w-full items-center gap-3 rounded-2xl border bg-white px-4 py-3 text-left text-[15px] font-medium text-ink transition hover:border-primary/40";
              if (isRevealed) {
                if (isCorrect)
                  cls =
                    "flex w-full items-center gap-3 rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-left text-[15px] font-semibold text-emerald-900";
                else if (isSelected)
                  cls =
                    "flex w-full items-center gap-3 rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3 text-left text-[15px] font-semibold text-rose-900";
                else cls += " opacity-70";
              } else if (isSelected) {
                cls =
                  "flex w-full items-center gap-3 rounded-2xl border border-primary/50 bg-primary/5 px-4 py-3 text-left text-[15px] font-semibold text-ink";
              } else {
                cls += " border-border";
              }
              return (
                <button key={i} onClick={() => props.onSelect(i)} disabled={isRevealed} className={cls}>
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-current text-xs font-extrabold">
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span className="flex-1">{opt}</span>
                  {isRevealed && isCorrect && <CheckCircle2 className="h-5 w-5 text-emerald-600" />}
                  {isRevealed && isSelected && !isCorrect && <XCircle className="h-5 w-5 text-rose-600" />}
                </button>
              );
            })}
          </div>

          {isRevealed && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-5 space-y-3"
            >
              <div
                className={`rounded-2xl border p-4 text-sm font-medium ${
                  selected === q.correctIndex
                    ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                    : "border-rose-200 bg-rose-50 text-rose-900"
                }`}
              >
                <div className="mb-1 flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-[0.18em]">
                  {selected === q.correctIndex ? (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5" /> Correct
                    </>
                  ) : (
                    <>
                      <XCircle className="h-3.5 w-3.5" /> Incorrect — Correct answer:{" "}
                      {String.fromCharCode(65 + q.correctIndex)}
                    </>
                  )}
                </div>
                <div>{q.explanation}</div>
              </div>
              {q.tip && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-900">
                  <div className="mb-1 flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-[0.18em]">
                    <Lightbulb className="h-3.5 w-3.5" /> Exam tip
                  </div>
                  {q.tip}
                </div>
              )}
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>

      <div className="flex items-center justify-between">
        <button
          disabled={index === 0}
          onClick={props.onPrev}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-4 py-2 text-xs font-bold text-ink shadow-soft transition hover:border-primary/40 disabled:opacity-40"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Previous
        </button>
        <button
          onClick={props.onNext}
          disabled={!isRevealed}
          className="inline-flex items-center gap-1.5 rounded-full gradient-aurora px-5 py-2.5 text-xs font-bold text-white shadow-glow transition hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100"
        >
          {isLast ? (
            <>
              Finish <Trophy className="h-3.5 w-3.5" />
            </>
          ) : (
            <>
              Next <ArrowRight className="h-3.5 w-3.5" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}

/* ---------------- Result ---------------- */
function ResultView(props: {
  studentName: string;
  subject: string;
  topic: string;
  difficulty: Difficulty;
  questions: MCQ[];
  answers: (number | null)[];
  elapsed: number;
  onRestart: () => void;
}) {
  const { questions, answers } = props;
  const total = questions.length;
  const correct = useMemo(
    () => answers.reduce<number>((acc, a, i) => acc + (a === questions[i].correctIndex ? 1 : 0), 0),
    [answers, questions],
  );
  const wrong = total - correct;
  const pct = Math.round((correct / total) * 100);
  const grade = gradeFor(pct);
  const summary = performanceSummary(pct);

  const handlePrint = () => window.print();
  const handleDownload = () =>
    exportReportPDF({
      studentName: props.studentName,
      subject: props.subject,
      topic: props.topic,
      difficulty: props.difficulty,
      questions,
      answers,
      elapsed: props.elapsed,
      correct,
      wrong,
      pct,
      grade,
      summary,
    }).catch((e) => toast.error(e instanceof Error ? e.message : "Could not export"));

  return (
    <div className="space-y-5" id="exam-report">
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="overflow-hidden rounded-3xl border border-border gradient-aurora p-7 text-white shadow-card md:p-10"
      >
        <div className="flex items-center gap-3">
          <Trophy className="h-8 w-8" />
          <div className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-white/90">
            Quiz complete
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-4 md:grid-cols-4">
          <Stat label="Score" value={`${correct}/${total}`} icon={<Award className="h-4 w-4" />} />
          <Stat label="Percentage" value={`${pct}%`} icon={<Target className="h-4 w-4" />} />
          <Stat label="Grade" value={grade} icon={<BookOpenCheck className="h-4 w-4" />} />
          <Stat label="Time" value={formatTime(props.elapsed)} icon={<Clock className="h-4 w-4" />} />
        </div>
        <p className="mt-4 max-w-2xl text-sm font-medium text-white/90">{summary}</p>
      </motion.section>

      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <button
          onClick={handleDownload}
          className="inline-flex items-center gap-2 rounded-full gradient-aurora px-4 py-2 text-xs font-bold text-white shadow-glow transition hover:scale-[1.02]"
        >
          <Download className="h-3.5 w-3.5" /> Download PDF report
        </button>
        <button
          onClick={handlePrint}
          className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-4 py-2 text-xs font-bold text-ink shadow-soft transition hover:border-primary/40"
        >
          <Printer className="h-3.5 w-3.5" /> Print
        </button>
        <button
          onClick={props.onRestart}
          className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-4 py-2 text-xs font-bold text-ink shadow-soft transition hover:border-primary/40"
        >
          <RotateCcw className="h-3.5 w-3.5" /> New quiz
        </button>
      </div>

      <div className="rounded-3xl border border-border bg-white p-5 shadow-card md:p-7">
        <h2 className="font-display text-xl font-extrabold text-ink md:text-2xl">Question review</h2>
        <p className="mt-1 text-xs font-medium text-muted-foreground">
          {props.studentName} · {props.subject}
          {props.topic ? ` · ${props.topic}` : ""} · {props.difficulty}
        </p>
        <div className="mt-5 space-y-4">
          {questions.map((q, i) => {
            const a = answers[i];
            const ok = a === q.correctIndex;
            return (
              <div
                key={i}
                className={`rounded-2xl border p-4 ${
                  ok ? "border-emerald-200 bg-emerald-50/40" : "border-rose-200 bg-rose-50/40"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-muted-foreground">
                    Q{i + 1} · {ok ? "Correct" : "Incorrect"}
                  </div>
                  {ok ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-rose-600" />
                  )}
                </div>
                <div className="mt-1 text-sm font-bold text-ink">{q.question}</div>
                <div className="mt-2 grid gap-1 text-xs text-ink/85">
                  <div>
                    Your answer:{" "}
                    <span className={ok ? "font-bold text-emerald-700" : "font-bold text-rose-700"}>
                      {a !== null ? `${String.fromCharCode(65 + a)}. ${q.options[a]}` : "Not answered"}
                    </span>
                  </div>
                  <div>
                    Correct:{" "}
                    <span className="font-bold text-emerald-700">
                      {String.fromCharCode(65 + q.correctIndex)}. {q.options[q.correctIndex]}
                    </span>
                  </div>
                </div>
                <div className="mt-2 text-xs font-medium text-ink/80">{q.explanation}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/30 bg-white/15 p-3 backdrop-blur">
      <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.18em] text-white/85">
        {icon}
        {label}
      </div>
      <div className="mt-1 font-display text-2xl font-extrabold">{value}</div>
    </div>
  );
}

function gradeFor(pct: number) {
  if (pct >= 90) return "A+";
  if (pct >= 80) return "A";
  if (pct >= 70) return "B";
  if (pct >= 60) return "C";
  if (pct >= 50) return "D";
  return "F";
}
function performanceSummary(pct: number) {
  if (pct >= 90) return "Outstanding! You've mastered this material — keep challenging yourself with harder topics.";
  if (pct >= 75) return "Great work. A small revision pass on the questions you missed will push you into the top tier.";
  if (pct >= 60) return "Solid effort. Focus on the explanations below and re-attempt similar questions to lock in the concepts.";
  if (pct >= 40) return "You're on the right track. Revisit the core ideas, study the explanations carefully, and try an easier round to build confidence.";
  return "Don't worry — every expert started here. Review the concept explanations, then try an easier difficulty and build up.";
}

/* ---------------- PDF report ---------------- */
async function exportReportPDF(d: {
  studentName: string;
  subject: string;
  topic: string;
  difficulty: Difficulty;
  questions: MCQ[];
  answers: (number | null)[];
  elapsed: number;
  correct: number;
  wrong: number;
  pct: number;
  grade: string;
  summary: string;
}) {
  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 48;
  const contentW = pageW - margin * 2;

  // Cover band
  for (let i = 0; i < 140; i++) {
    const t = i / 140;
    pdf.setFillColor(
      Math.round(80 + (130 - 80) * t),
      Math.round(110 + (90 - 110) * t),
      Math.round(230 + (220 - 230) * t),
    );
    pdf.rect(0, i, pageW, 1, "F");
  }
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(11);
  pdf.setTextColor(255, 255, 255);
  pdf.text("NEXORA AI · EXAM REPORT", margin, 38);
  pdf.setFontSize(28);
  pdf.text("Performance Report", margin, 90);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11);
  pdf.text(new Date().toLocaleString(), margin, 110);

  let y = 170;
  // Info card
  pdf.setFillColor(245, 248, 255);
  pdf.setDrawColor(220, 228, 245);
  pdf.roundedRect(margin, y, contentW, 90, 12, 12, "FD");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.setTextColor(70, 90, 200);
  pdf.text("STUDENT", margin + 16, y + 22);
  pdf.text("SUBJECT", margin + contentW / 2, y + 22);
  pdf.text("DIFFICULTY", margin + 16, y + 60);
  pdf.text("TIME TAKEN", margin + contentW / 2, y + 60);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(13);
  pdf.setTextColor(20, 25, 50);
  pdf.text(d.studentName, margin + 16, y + 40);
  pdf.text(`${d.subject}${d.topic ? " · " + d.topic : ""}`, margin + contentW / 2, y + 40);
  pdf.text(d.difficulty.toUpperCase(), margin + 16, y + 78);
  pdf.text(formatTime(d.elapsed), margin + contentW / 2, y + 78);
  y += 110;

  // Score boxes
  const boxes = [
    { label: "Score", value: `${d.correct}/${d.questions.length}`, color: [80, 110, 230] as [number, number, number] },
    { label: "Correct", value: `${d.correct}`, color: [40, 145, 110] },
    { label: "Wrong", value: `${d.wrong}`, color: [210, 70, 90] },
    { label: "Percentage", value: `${d.pct}%`, color: [200, 120, 40] },
    { label: "Grade", value: d.grade, color: [110, 80, 210] },
  ];
  const bw = (contentW - 16) / boxes.length;
  boxes.forEach((b, i) => {
    const x = margin + i * (bw + 4);
    pdf.setFillColor(b.color[0], b.color[1], b.color[2]);
    pdf.roundedRect(x, y, bw, 70, 10, 10, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.setTextColor(255, 255, 255);
    pdf.text(b.label.toUpperCase(), x + 10, y + 20);
    pdf.setFontSize(18);
    pdf.text(b.value, x + 10, y + 50);
  });
  y += 90;

  // Summary
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);
  pdf.setTextColor(20, 25, 50);
  pdf.text("Performance summary", margin, y);
  y += 6;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11);
  pdf.setTextColor(60, 70, 100);
  const sLines = pdf.splitTextToSize(d.summary, contentW);
  pdf.text(sLines, margin, y + 14);
  y += 14 + sLines.length * 14 + 14;

  // Question by question
  const ensure = (need: number) => {
    if (y + need > pageH - 50) {
      pdf.addPage();
      y = 60;
    }
  };

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(14);
  pdf.setTextColor(20, 25, 50);
  pdf.text("Question review", margin, y);
  y += 16;

  d.questions.forEach((q, i) => {
    const a = d.answers[i];
    const ok = a === q.correctIndex;
    const qLines = pdf.splitTextToSize(`Q${i + 1}. ${q.question}`, contentW - 24);
    const expLines = pdf.splitTextToSize(`Explanation: ${q.explanation}`, contentW - 24);
    const need = 20 + qLines.length * 14 + 4 + 4 * 14 + expLines.length * 13 + 16;
    ensure(need);

    const bg = ok ? [240, 252, 246] : [253, 240, 242];
    const br = ok ? [180, 220, 196] : [240, 200, 205];
    pdf.setFillColor(bg[0], bg[1], bg[2]);
    pdf.setDrawColor(br[0], br[1], br[2]);
    pdf.roundedRect(margin, y, contentW, need - 4, 10, 10, "FD");

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.setTextColor(ok ? 40 : 200, ok ? 130 : 60, ok ? 100 : 80);
    pdf.text(ok ? "CORRECT" : "INCORRECT", margin + 12, y + 16);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    pdf.setTextColor(20, 25, 50);
    pdf.text(qLines, margin + 12, y + 32);
    let yy = y + 32 + qLines.length * 14 + 4;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.setTextColor(60, 70, 100);
    q.options.forEach((opt, oi) => {
      const letter = String.fromCharCode(65 + oi);
      const isCorrect = oi === q.correctIndex;
      const isSelected = oi === a;
      let prefix = `   ${letter}. `;
      if (isCorrect) prefix = "✓ " + letter + ". ";
      else if (isSelected) prefix = "✗ " + letter + ". ";
      pdf.setTextColor(isCorrect ? 30 : isSelected ? 200 : 80, isCorrect ? 130 : isSelected ? 60 : 90, isCorrect ? 90 : isSelected ? 80 : 110);
      pdf.text(prefix + opt, margin + 16, yy);
      yy += 14;
    });
    pdf.setTextColor(60, 70, 100);
    pdf.text(expLines, margin + 12, yy + 4);
    y += need;
  });

  // Footer
  const total = pdf.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    pdf.setPage(p);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(150, 160, 180);
    pdf.text(`Nexora AI · Page ${p} of ${total}`, pageW / 2, pageH - 20, { align: "center" });
  }

  const safe = (d.studentName + "_" + d.subject).replace(/[^a-z0-9]+/gi, "_").slice(0, 40) || "nexora_exam";
  pdf.save(`${safe}_report.pdf`);
}