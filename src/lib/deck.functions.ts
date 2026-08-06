import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { askJson, outlinePrompt, slidePrompt, generateAiImage } from "./deck.server";
import type { DeckOutline } from "./deck.types";

export const generateDeckOutline = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        topic: z.string().min(2).max(500),
        grade: z.string().min(1).max(40),
        language: z.string().min(2).max(30).default("English"),
        slideCount: z.number().int().min(5).max(16).default(10),
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
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const slide = await askJson<{
      title: string;
      subtitle?: string;
      bullets: string[];
      speakerNotes?: string;
      imagePrompt: string;
    }>(slidePrompt(data), 2048);
    return {
      title: slide.title || data.slideTitle,
      subtitle: slide.subtitle || "",
      bullets: (slide.bullets || []).filter(Boolean).slice(0, 6),
      speakerNotes: slide.speakerNotes || "",
      imagePrompt: slide.imagePrompt || `${data.slideTitle} — ${data.topic}, ultra detailed, educational, no text`,
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
    if ("error" in result) return { ok: false as const, error: result.error };
    return { ok: true as const, dataUrl: result.dataUrl, model: result.model };
  });