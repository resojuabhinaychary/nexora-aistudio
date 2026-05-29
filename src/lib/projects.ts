import type { GeneratedDoc } from "./ai.functions";

export type Project = {
  id: string;
  title: string;
  format: string;
  topic: string;
  createdAt: number;
  updatedAt: number;
  doc: GeneratedDoc;
  favorite?: boolean;
};

const KEY = "nexora.projects.v1";

function read(): Project[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Project[]) : [];
  } catch {
    return [];
  }
}

function write(list: Project[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(list));
  window.dispatchEvent(new Event("nexora:projects"));
}

export function listProjects(): Project[] {
  return read().sort((a, b) => b.updatedAt - a.updatedAt);
}

export function getProject(id: string): Project | undefined {
  return read().find((p) => p.id === id);
}

export function saveProject(p: Project) {
  const list = read().filter((x) => x.id !== p.id);
  list.push({ ...p, updatedAt: Date.now() });
  write(list);
}

export function createProject(input: { topic: string; format: string; doc: GeneratedDoc }): Project {
  const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  const now = Date.now();
  const p: Project = {
    id,
    title: input.doc.title || input.topic,
    topic: input.topic,
    format: input.format,
    createdAt: now,
    updatedAt: now,
    doc: input.doc,
  };
  saveProject(p);
  return p;
}

export function deleteProject(id: string) {
  write(read().filter((p) => p.id !== id));
}

export function toggleFavorite(id: string) {
  const list = read();
  const idx = list.findIndex((p) => p.id === id);
  if (idx >= 0) {
    list[idx].favorite = !list[idx].favorite;
    write(list);
  }
}