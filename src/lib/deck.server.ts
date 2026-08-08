````typescript
// Server-only helpers for the AI presentation generator.
import { routeText, routeImage } from "./aiRouter.server";

export function outlinePrompt(
  topic: string,
  grade: string,
  language: string,
  count: number,
) {
  return `Create ONLY the slide OUTLINE for an educational presentation.

Topic: "${topic}"
Audience / level: ${grade}
Language for the titles: ${language}
Number of slides: exactly ${count}

Rules:
- Slide 1 is the cover/title slide.
- Slide 2 is an Agenda slide.
- The last slide is Summary / Thank You.
- Middle slides follow a logical teaching order chosen for THIS topic.
- Titles are short, specific and never generic filler.
- Write titles in ${language}.
- Depth and vocabulary must match ${grade}.

Return ONLY valid JSON:
{"title":"string","subject":"string","slides":[{"title":"string","purpose":"string"}]}`;
}

const AMOUNT_RULES: Record<string, string> = {
  minimal:
    "Keep it tight: 1 short paragraph (25-40 words) plus at most one other block.",
  balanced:
    "Use 2 to 3 blocks total, roughly 60-90 words of content.",
  detailed:
    "Use 3 to 4 blocks total, roughly 100-140 words of content.",
};

const STYLE_RULES: Record<string, string> = {
  simple: "Plain, friendly classroom language. Short sentences.",
  professional:
    "Precise, exam-ready academic tone with correct terminology.",
  modern:
    "Crisp, punchy, magazine-like phrasing with strong keywords.",
  creative:
    "Vivid storytelling tone with analogies students remember.",
};

const IMAGE_STYLE_RULES: Record<string, string> = {
  photo: "photorealistic photograph, natural lighting, real-world scene",
  illustration:
    "detailed educational illustration, clean vector-like shading",
  "3d": "3D rendered scene, soft studio lighting, subtle depth of field",
  flat: "flat modern vector illustration, bold shapes, limited palette",
  watercolor:
    "soft watercolor painting, textured paper, gentle washes",
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

  return `You are writing slide ${args.index + 1} of ${
    args.total
  } for the educational presentation "${args.deckTitle}".

Subject: ${args.subject}
Level: ${args.grade}
Overall topic: "${args.topic}"
Current slide title: "${args.slideTitle}"
Current slide purpose: ${args.purpose}

Slides already written:
${args.previousTitles.join(" | ") || "none"}

Never repeat their content.

LANGUAGE:
Write EVERY visible word of the title, subtitle, blocks and speaker notes in ${args.language}.

Use natural, correct ${args.language}.
Use proper Unicode script.
Do not transliterate Telugu, Hindi or other Indian languages.
Standard scientific terms may remain in their commonly accepted form when necessary.

TONE:
${STYLE_RULES[args.style] ?? STYLE_RULES.professional}

LENGTH:
${AMOUNT_RULES[args.textAmount] ?? AMOUNT_RULES.balanced}

CONTENT BLOCKS:

Choose the block types that genuinely fit this slide.

Allowed blocks:

{"kind":"paragraph","text":"flowing 25-55 word explanation"}

{"kind":"points","items":["complete factual statement","..."]}

{"kind":"table","headers":["A","B"],"rows":[["...","..."]]}

{"kind":"timeline","items":[{"when":"1750","what":"short event"}]}

{"kind":"comparison","left":{"title":"...","items":["..."]},"right":{"title":"...","items":["..."]}}

{"kind":"stats","items":[{"value":"1.4B","label":"short label"}]}

{"kind":"callout","variant":"did-you-know","title":"short","text":"1-2 sentences"}

Rules:
- Never make every slide a bullet list.
- Do not create a wall of text.
- Use paragraphs when explanation is more natural.
- Use points only when they improve readability.
- Use a table only when comparison/data genuinely benefits from one.
- Use a timeline only for chronology or sequence.
- Use statistics only when the figures are accurate.
- Do not invent statistics.
- Do not force a flowchart.
- Do not repeat the same visual structure unnecessarily.
- All facts must be accurate and appropriate for ${args.grade}.

${isCover ? "- This is the COVER slide. Keep the content minimal and visually strong." : ""}

${isClosing ? "- This is the CLOSING slide. Include a concise summary and key takeaways." : ""}

IMAGE PROMPT:

Create ONE detailed ENGLISH image prompt for an AI image model.

The image must represent the EXACT subject of THIS slide.

Do NOT generate generic or unrelated images.

Examples:

Industrial Revolution:
A Victorian textile mill interior with steam engines, spinning machines, workers and historical industrial architecture.

Population Pyramid:
An accurate educational population pyramid showing male and female age bands.

Agriculture:
Indian agricultural farmland with crops, irrigation and farming activity.

The image must be appropriate for the selected class and educational context.

Image style:
${IMAGE_STYLE_RULES[args.imageStyle] ?? IMAGE_STYLE_RULES.illustration}

Never reuse a previous slide's imagery.

Do not request text inside the image.

Do not request watermarks.

End the image prompt with:
"ultra detailed, high resolution, cinematic lighting, educational, no text, no watermark"

Also return 3-5 English keywords describing what MUST be visible in the image.

Return ONLY valid JSON.

Schema:
{
  "title": "string",
  "subtitle": "string",
  "blocks": [],
  "speakerNotes": "string",
  "imagePrompt": "string",
  "keywords": ["keyword1", "keyword2", "keyword3"]
}`;
}

/**
 * Safely extracts a JSON object from an AI response.
 *
 * Handles:
 * - normal JSON
 * - JSON wrapped in markdown fences
 * - small amounts of text surrounding the JSON
 */
export function parseJson<T>(text: string): T {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();

  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");

  if (start < 0 || end <= start) {
    throw new Error("AI returned incomplete JSON.");
  }

  const jsonText = cleaned.slice(start, end + 1);

  return JSON.parse(jsonText) as T;
}

/**
 * Generates a SMALL structured JSON response.
 *
 * IMPORTANT:
 * The presentation is generated slide-by-slide rather than as one
 * enormous JSON response. This greatly reduces JSON/output-limit problems.
 */
export async function askJson<T>(
  prompt: string,
  maxOutputTokens = 2048,
): Promise<T> {
  let lastError: unknown;

  // Only retry the structured request once.
  // routeText() itself handles provider/key fallback.
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const text = await routeText(
        [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
        {
          system:
            "You are Nexora AI, an expert curriculum designer and presentation writer. Return ONLY compact valid JSON. Never use markdown fences. Never add commentary. Keep the response concise enough to fit the requested output limit.",
          json: true,
          temperature: 0.55,
          maxOutputTokens,
        },
      );

      return parseJson<T>(text);
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("The AI response could not be read. Try again.");
}

/**
 * Slide imagery is AI-generated.
 *
 * Provider and API-key fallback is handled by routeImage().
 */
export async function generateAiImage(
  prompt: string,
  attempt: number,
): Promise<{ dataUrl: string } | { error: string }> {
  const res = await routeImage(prompt, attempt);

  if (res) {
    return { dataUrl: res.dataUrl };
  }

  return { error: "image-unavailable" };
}
````
