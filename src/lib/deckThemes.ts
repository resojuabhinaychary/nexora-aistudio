export type DeckTheme = {
  id: string;
  name: string;
  /** CSS background for the slide surface. */
  surface: string;
  title: string;
  body: string;
  muted: string;
  card: string;
  border: string;
  accent: string;
  /** PPTX / PDF colours (hex without #). */
  pptx: { bg: string; title: string; body: string; accent: string; card: string };
};

export const DECK_THEMES: DeckTheme[] = [
  {
    id: "minimal",
    name: "Minimal",
    surface: "linear-gradient(180deg,#ffffff 0%,#f7f8fb 100%)",
    title: "#101828",
    body: "#344054",
    muted: "#667085",
    card: "rgba(255,255,255,0.85)",
    border: "rgba(16,24,40,0.08)",
    accent: "#101828",
    pptx: { bg: "FFFFFF", title: "101828", body: "344054", accent: "101828", card: "F5F6F8" },
  },
  {
    id: "education",
    name: "Education",
    surface: "linear-gradient(135deg,#fffdf6 0%,#eefaf3 55%,#eaf3ff 100%)",
    title: "#14532d",
    body: "#1f3d2b",
    muted: "#4b6b57",
    card: "rgba(255,255,255,0.82)",
    border: "rgba(20,83,45,0.12)",
    accent: "#16a34a",
    pptx: { bg: "FBFEF9", title: "14532D", body: "1F3D2B", accent: "16A34A", card: "E9F7EF" },
  },
  {
    id: "dark",
    name: "Dark",
    surface: "linear-gradient(140deg,#0b1020 0%,#131a30 60%,#0d1426 100%)",
    title: "#f8fafc",
    body: "#cbd5e1",
    muted: "#94a3b8",
    card: "rgba(255,255,255,0.06)",
    border: "rgba(255,255,255,0.12)",
    accent: "#818cf8",
    pptx: { bg: "0B1020", title: "F8FAFC", body: "CBD5E1", accent: "818CF8", card: "16203A" },
  },
  {
    id: "blue",
    name: "Blue",
    surface: "linear-gradient(135deg,#eff6ff 0%,#dbeafe 60%,#e0f2fe 100%)",
    title: "#0c4a6e",
    body: "#134e6f",
    muted: "#3b6d8c",
    card: "rgba(255,255,255,0.85)",
    border: "rgba(12,74,110,0.12)",
    accent: "#0284c7",
    pptx: { bg: "F2F8FF", title: "0C4A6E", body: "134E6F", accent: "0284C7", card: "E1EFFE" },
  },
  {
    id: "corporate",
    name: "Corporate",
    surface: "linear-gradient(180deg,#fafafa 0%,#f1f2f4 100%)",
    title: "#1f2937",
    body: "#374151",
    muted: "#6b7280",
    card: "rgba(255,255,255,0.94)",
    border: "rgba(31,41,55,0.12)",
    accent: "#b45309",
    pptx: { bg: "FAFAFA", title: "1F2937", body: "374151", accent: "B45309", card: "EFEFF1" },
  },
  {
    id: "gradient",
    name: "Gradient",
    surface: "linear-gradient(135deg,#fdf2f8 0%,#ede9fe 45%,#e0f2fe 100%)",
    title: "#4c1d95",
    body: "#4338ca",
    muted: "#6d5bb5",
    card: "rgba(255,255,255,0.78)",
    border: "rgba(76,29,149,0.12)",
    accent: "#a855f7",
    pptx: { bg: "F8F2FF", title: "4C1D95", body: "4338CA", accent: "A855F7", card: "EDE9FE" },
  },
  {
    id: "modern",
    name: "Modern",
    surface: "linear-gradient(135deg,#0f172a 0%,#1e293b 40%,#0f766e 130%)",
    title: "#ecfeff",
    body: "#cbd5e1",
    muted: "#94a3b8",
    card: "rgba(255,255,255,0.08)",
    border: "rgba(255,255,255,0.14)",
    accent: "#2dd4bf",
    pptx: { bg: "0F172A", title: "ECFEFF", body: "CBD5E1", accent: "2DD4BF", card: "17253C" },
  },
];

export const getTheme = (id: string) => DECK_THEMES.find((t) => t.id === id) ?? DECK_THEMES[0];

export const DECK_FONTS = [
  { id: "'Plus Jakarta Sans', system-ui, sans-serif", label: "Jakarta", pptx: "Segoe UI" },
  { id: "Georgia, 'Times New Roman', serif", label: "Serif", pptx: "Georgia" },
  { id: "'Trebuchet MS', system-ui, sans-serif", label: "Trebuchet", pptx: "Trebuchet MS" },
  { id: "'Courier New', monospace", label: "Mono", pptx: "Consolas" },
];