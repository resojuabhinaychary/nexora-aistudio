export type DeckOutlineItem = { title: string; purpose: string };

export type DeckOutline = {
  title: string;
  subject: string;
  slides: DeckOutlineItem[];
};

export type DeckSlide = {
  id: string;
  title: string;
  subtitle?: string;
  bullets: string[];
  speakerNotes?: string;
  imagePrompt?: string;
  image?: string;
  layout?: "title" | "content" | "closing";
};

export type Deck = {
  topic: string;
  title: string;
  subject: string;
  grade: string;
  themeId: string;
  fontScale: number;
  fontFamily: string;
  slides: DeckSlide[];
};