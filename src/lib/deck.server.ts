// Server-only helpers for the AI presentation generator.
import { routeText, routeImage } from "./aiRouter.server";

export function outlinePrompt(topic: string, grade: string, language: string, count: number) {
  return `Create the slide OUTLINE for an educational presentation.

Topic: "${topic}"
Audience / level: ${grade}
Language for the titles: ${language}
Number of slides: exactly ${count}

Rules:
- Slide 1 is the cover/title slide, slide 2 is an Agenda slide, the last slide is "Summary / Thank You".
- Middle slides follow a logical teaching order chosen for THIS topic (introduction, definition, history, key drivers, process, data, examples, challenges, importance).
- Titles are short (2-6 words), specific, never generic filler.
- Write the titles in ${language}.
- Depth and vocabulary must match ${grade} exactly.

Return JSON only:
{"title":string,"subject":string,"slides":[{"title":string,"purpose":string}]}`;
}

const AMOUNT_RULES: Record<string, string> = {
  minimal: "Keep it tight: 1 short paragraph (25-40 words) plus at most one other block.",
  balanced: "2 to 3 blocks total, roughly 60-90 words of content.",
  detailed: "3 to 4 blocks total, roughly 100-140 words of content.",
};

const STYLE_RULES: Record<string, string> = {
  simple: "Plain, friendly classroom language. Short sentences.",
  professional: "Precise, exam-ready academic tone with correct terminology.",
  modern: "Crisp, punchy, magazine-like phrasing with strong keywords.",
  creative: "Vivid storytelling tone with analogies students remember.",
};

const IMAGE_STYLE_RULES: Record<string, string> = {
  photo: "photorealistic photograph, natural lighting, real-world scene",
  illustration: "detailed educational illustration, clean vector-like shading",
  "3d": "3D rendered scene, soft studio lighting, subtle depth of field",
  flat: "flat modern vector illustration, bold shapes, limited palette",
  watercolor: "soft watercolor painting, textured paper, gentle washes",
};

export function slidePrompt(args: {
  topic: string;
  grade: string;
  language: string;
  deckTitle: string;
  subject: string;
  slideTitle: string;
  purpose: string;
  index: number;
  total: number;
  previousTitles: string[];
  style: string;
  textAmount: string;
  imageStyle: string;
}) {
  const isCover = args.index === 0;
  const isClosing = args.index === args.total - 1;
  return `You are writing slide ${args.index + 1} of ${args.total} for the educational presentation "${args.deckTitle}" (subject: ${args.subject}, level: ${args.grade}).

Overall topic: "${args.topic}"
This slide's title: "${args.slideTitle}"
This slide's purpose: ${args.purpose}
Slides already written: ${args.previousTitles.join(" | ") || "none"} — never repeat their content.

LANGUAGE: write EVERY word of title, subtitle, blocks and speakerNotes in ${args.language}. Use natural, correct ${args.language} (proper Unicode script, no transliteration, no mixed English sentences except for standard scientific terms).
TONE: ${STYLE_RULES[args.style] ?? STYLE_RULES.professional}
LENGTH: ${AMOUNT_RULES[args.textAmount] ?? AMOUNT_RULES.balanced}

CONTENT BLOCKS — never write a wall of bullets. Choose the block types that genuinely fit this slide:
{"kind":"paragraph","text":"flowing 25-55 word explanation"}
{"kind":"points","items":["complete factual statement", "..."]}            (3-5 items, 6-16 words each)
{"kind":"table","headers":["A","B"],"rows":[["..",".."]]}                   (only for real comparable data, max 4 rows)
{"kind":"timeline","items":[{"when":"1750","what":"short event"}]}          (only for history/sequence slides, 3-5 items)
{"kind":"comparison","left":{"title":"..","items":["..",".."]},"right":{"title":"..","items":["..",".."]}}
{"kind":"stats","items":[{"value":"1.4B","label":"short label"}]}          (2-4 real, accurate figures)
{"kind":"callout","variant":"did-you-know"|"fact"|"example"|"summary"|"note","title":"short","text":"1-2 sentences"}

Rules for blocks:
${isCover ? '- This is the COVER slide: one short paragraph block introducing the topic, plus optionally one stats block.' : ''}
${isClosing ? '- This is the CLOSING slide: one "summary" callout plus one points block of key takeaways.' : ''}
- Always start with either a paragraph or points block.
- Include at most ONE table, ONE timeline, ONE comparison and ONE stats block per slide.
- Use a "did-you-know" or "example" callout when it adds real value; never as filler.
- All facts must be accurate and appropriate for ${args.grade}.

IMAGE PROMPT rules — critical:
- "imagePrompt": a cinematic, highly specific ENGLISH prompt for an AI image model describing the actual subject of THIS slide.
- Depict the real thing (e.g. "a Victorian textile mill interior with steam engines, spinning machines and workers, smoke through skylights"; "a population pyramid chart of India with male and female age bands"; "an Indian farmer driving a tractor through irrigated paddy fields at sunrise").
- Style: ${IMAGE_STYLE_RULES[args.imageStyle] ?? IMAGE_STYLE_RULES.illustration}.
- Never reuse a previous slide's imagery. No generic offices, houses, handshakes or people posing.
- End with: "ultra detailed, high resolution, cinematic lighting, educational, no text, no watermark".

Also return "keywords": 3-5 English keywords describing what MUST be visible in the image.

Return JSON only:
{"title":string,"subtitle":string,"blocks":[...],"speakerNotes":string,"imagePrompt":string,"keywords":string[]}`;
}

export function parseJson<T>(text: string): T {
  const cleaned = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "");
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  const slice = start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned;
  return JSON.parse(slice) as T;
}

export async function askJson<T>(prompt: string, maxOutputTokens = 4096): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const text = await routeText([{ role: "user", parts: [{ text: prompt }] }], {
      system:
        "You are Nexora AI, an expert curriculum designer and presentation writer. You always return strictly valid JSON, never markdown fences, never commentary.",
      json: true,
      temperature: 0.75,
      maxOutputTokens,
    });
    try {
      return parseJson<T>(text);
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("The AI response could not be read. Try again.");
}

/**
 * Slide imagery is ALWAYS AI-generated. Every provider and key is tried before
 * the caller ever hears about a failure.
 */
export async function generateAiImage(
  prompt: string,
  attempt: number,
): Promise<{ dataUrl: string } | { error: string }> {
  const res = await routeImage(prompt, attempt);
  if (res) return { dataUrl: res.dataUrl };
  return { error: "image-unavailable" };
}
