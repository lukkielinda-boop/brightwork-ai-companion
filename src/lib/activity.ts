// Recent Activity stored in browser localStorage (non-sensitive metadata only:
// tool name, a user-entered title, and a short output snippet — never full
// documents or secrets). SSR-safe: reads happen from effects, not render.
import type { ToolId } from "@/lib/ai/schemas";

export type ActivityEntry = {
  id: string;
  tool: ToolId;
  title: string;
  snippet: string;
  createdAt: number;
};

const STORAGE_KEY = "ai-productivity-activity";
const MAX_ENTRIES = 50;
const SNIPPET_LENGTH = 120;

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function recordActivity(tool: ToolId, title: string, snippet: string): void {
  if (!canUseStorage()) return;
  const entry: ActivityEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    tool,
    title: title.slice(0, 200).trim() || "Untitled",
    snippet: snippet.replace(/\s+/g, " ").trim().slice(0, SNIPPET_LENGTH),
    createdAt: Date.now(),
  };
  try {
    const existing = readRaw();
    const next = [entry, ...existing.filter((e) => e.tool !== tool || e.title !== entry.title)].slice(0, MAX_ENTRIES);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage full or unavailable — activity is a convenience feature, ignore.
  }
}

function readRaw(): ActivityEntry[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is ActivityEntry =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as ActivityEntry).id === "string" &&
        typeof (item as ActivityEntry).tool === "string",
    );
  } catch {
    return [];
  }
}

export function getActivity(): ActivityEntry[] {
  if (!canUseStorage()) return [];
  return readRaw().sort((a, b) => b.createdAt - a.createdAt);
}

export function activityCounts(): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const entry of getActivity()) {
    counts[entry.tool] = (counts[entry.tool] ?? 0) + 1;
  }
  return counts;
}

export function clearActivity(): void {
  if (!canUseStorage()) return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage failures.
  }
}
