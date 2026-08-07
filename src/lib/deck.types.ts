export type DeckOutlineItem = { title: string; purpose: string };

export type DeckOutline = {
  title: string;
  subject: string;
  slides: DeckOutlineItem[];
};

/** Gamma-style rich content blocks. A slide picks the ones that fit its content. */
export type SlideBlock =
  | { kind: "paragraph"; text: string }
  | { kind: "points"; items: string[] }
  | { kind: "table"; headers: string[]; rows: string[][] }
  | { kind: "timeline"; items: { when: string; what: string }[] }
  | { kind: "comparison"; left: { title: string; items: string[] }; right: { title: string; items: string[] } }
  | { kind: "stats"; items: { value: string; label: string }[] }
  | { kind: "callout"; variant: "did-you-know" | "fact" | "example" | "summary" | "note"; title?: string; text: string };

export type DeckSlide = {
  id: string;
  title: string;
  subtitle?: string;
  /** Legacy plain bullets — still used by simple/minimal text amount. */
  bullets: string[];
  blocks?: SlideBlock[];
  speakerNotes?: string;
  imagePrompt?: string;
  image?: string;
  layout?: "title" | "content" | "closing";
};

export type DeckStyle = "simple" | "professional" | "modern" | "creative";
export type TextAmount = "minimal" | "balanced" | "detailed";
export type ImageStyle = "photo" | "illustration" | "3d" | "flat" | "watercolor";

export type Deck = {
  topic: string;
  title: string;
  subject: string;
  grade: string;
  language: string;
  themeId: string;
  fontScale: number;
  fontFamily: string;
  slides: DeckSlide[];
};
