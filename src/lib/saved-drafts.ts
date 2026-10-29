// Saved drafts (email, writing, report) stored in browser localStorage.
// Metadata is non-sensitive: user-entered content the user chose to keep.
// SSR-safe: reads happen from effects, never during render.
import type { EmailOutput, ReportOutput, WritingOutput } from "@/lib/ai/schemas";

export type SavedDraftKind = "email" | "writing" | "report";

export type SavedDraft =
  | { id: string; kind: "email"; title: string; updatedAt: number; data: EmailOutput }
  | { id: string; kind: "writing"; title: string; updatedAt: number; data: WritingOutput }
  | { id: string; kind: "report"; title: string; updatedAt: number; data: ReportOutput };

const STORAGE_KEY = "ai-productivity-saved-drafts";
const MAX_DRAFTS = 60;

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readAll(): SavedDraft[] {
  if (!canUseStorage()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is SavedDraft =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as SavedDraft).id === "string" &&
        ((item as SavedDraft).kind === "email" ||
          (item as SavedDraft).kind === "writing" ||
          (item as SavedDraft).kind === "report"),
    );
  } catch {
    return [];
  }
}

function writeAll(drafts: SavedDraft[]): void {
  if (!canUseStorage()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts.slice(0, MAX_DRAFTS)));
  } catch {
    // Storage unavailable or full — saving is a convenience feature.
  }
}

export function listSavedDrafts(kind?: SavedDraftKind): SavedDraft[] {
  const drafts = readAll().sort((a, b) => b.updatedAt - a.updatedAt);
  return kind ? drafts.filter((d) => d.kind === kind) : drafts;
}

export function saveDraft(kind: SavedDraftKind, title: string, data: SavedDraft["data"]): SavedDraft | null {
  const trimmedTitle = title.trim().slice(0, 200) || "Untitled draft";
  const existing = readAll();
  const match = existing.find(
    (d) => d.kind === kind && d.title === trimmedTitle,
  );
  let draft: SavedDraft;
  if (match) {
    draft = { ...match, data, updatedAt: Date.now() } as SavedDraft;
    writeAll([draft, ...existing.filter((d) => d.id !== match.id)]);
  } else {
    draft = {
      id: `${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      kind,
      title: trimmedTitle,
      updatedAt: Date.now(),
      data,
    } as SavedDraft;
    writeAll([draft, ...existing].slice(0, MAX_DRAFTS));
  }
  return draft;
}

export function updateSavedDraft(id: string, data: SavedDraft["data"], title?: string): void {
  const drafts = readAll();
  const next = drafts.map((d) => {
    if (d.id !== id) return d;
    const updated = { ...d, data, updatedAt: Date.now() } as SavedDraft;
    if (title?.trim()) updated.title = title.trim().slice(0, 200);
    return updated;
  });
  writeAll(next);
}

export function deleteSavedDraft(id: string): void {
  writeAll(readAll().filter((d) => d.id !== id));
}

export function clearSavedDrafts(kind?: SavedDraftKind): void {
  if (!kind) {
    if (canUseStorage()) {
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch {
        // Ignore storage failures.
      }
    }
    return;
  }
  writeAll(readAll().filter((d) => d.kind !== kind));
}
