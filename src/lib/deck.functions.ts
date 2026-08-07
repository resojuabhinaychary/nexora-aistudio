import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { askJson, outlinePrompt, slidePrompt, generateAiImage } from "./deck.server";
import type { DeckOutline, SlideBlock } from "./deck.types";

const blockSchema = z.union([
  z.object({ kind: z.literal("paragraph"), text: z.string().min(1) }),
  z.object({ kind: z.literal("points"), items: z.array(z.string().min(1)).min(1).max(6) }),
  z.object({
    kind: z.literal("table"),
    headers: z.array(z.string()).min(2).max(4),
    rows: z.array(z.array(z.string())).min(1).max(5),
  }),
  z.object({
    kind: z.literal("timeline"),
    items: z.array(z.object({ when: z.string(), what: z.string() })).min(2).max(6),
  }),
  z.object({
    kind: z.literal("comparison"),
    left: z.object({ title: z.string(), items: z.array(z.string()).min(1).max(4) }),
    right: z.object({ title: z.string(), items: z.array(z.string()).min(1).max(4) }),
  }),
  z.object({
    kind: z.literal("stats"),
    items: z.array(z.object({ value: z.string(), label: z.string() })).min(1).max(4),
  }),
  z.object({
    kind: z.literal("callout"),
    variant: z.enum(["did-you-know", "fact", "example", "summary", "note"]).catch("note"),
    title: z.string().optional(),
    text: z.string().min(1),
  }),
]);

export const generateDeckOutline = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        topic: z.string().min(2).max(500),
        grade: z.string().min(1).max(40),
        language: z.string().min(2).max(30).default("English"),
        slideCount: z.number().int().min(5).max(20).default(10),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const outline = await askJson<DeckOutline>(
      outlinePrompt(data.topic, data.grade, data.language, data.slideCount),
      3072,
    );
    const slides = (outline.slides || []).filter((s) => s?.title).slice(0, data.slideCount);
    if (slides.length === 0) throw new Error("Could not build an outline for that topic. Try rephrasing it.");
    return { title: outline.title || data.topic, subject: outline.subject || "General", slides };
  });

export const generateDeckSlide = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        topic: z.string().min(2).max(500),
        grade: z.string().min(1).max(40),
        language: z.string().min(2).max(30).default("English"),
        deckTitle: z.string().max(300),
        subject: z.string().max(120),
        slideTitle: z.string().max(300),
        purpose: z.string().max(500).default(""),
        index: z.number().int().min(0),
        total: z.number().int().min(1),
        previousTitles: z.array(z.string()).default([]),
        style: z.string().max(30).default("professional"),
        textAmount: z.string().max(30).default("balanced"),
        imageStyle: z.string().max(30).default("illustration"),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const slide = await askJson<{
      title: string;
      subtitle?: string;
      blocks?: unknown[];
      bullets?: string[];
      speakerNotes?: string;
      imagePrompt: string;
      keywords?: string[];
    }>(slidePrompt(data), 3072);

    const blocks: SlideBlock[] = [];
    for (const raw of slide.blocks || []) {
      const parsed = blockSchema.safeParse(raw);
      if (parsed.success) blocks.push(parsed.data as SlideBlock);
    }
    if (blocks.length === 0) {
      const items = (slide.bullets || []).filter(Boolean).slice(0, 5);
      if (items.length) blocks.push({ kind: "points", items });
    }

    const keywords = (slide.keywords || []).filter(Boolean).slice(0, 5);
    const basePrompt =
      slide.imagePrompt || `${data.slideTitle} — ${data.topic}, ultra detailed, educational, no text`;

    return {
      title: slide.title || data.slideTitle,
      subtitle: slide.subtitle || "",
      blocks,
      speakerNotes: slide.speakerNotes || "",
      imagePrompt: keywords.length ? `${basePrompt}. Must clearly show: ${keywords.join(", ")}.` : basePrompt,
    };
  });

export const generateDeckImage = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        prompt: z.string().min(6).max(2000),
        attempt: z.number().int().min(0).max(4).default(0),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const result = await generateAiImage(data.prompt, data.attempt);
    if ("error" in result) return { ok: false as const };
    return { ok: true as const, dataUrl: result.dataUrl };
  });
