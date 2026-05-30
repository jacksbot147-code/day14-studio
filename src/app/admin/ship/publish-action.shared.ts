/**
 * Shared types + constants for /admin/ship publish flow.
 *
 * Lives in a sibling file (no `"use server"`) because Next.js Server Action
 * files (publish-action.ts) can only export async functions — no constants,
 * no types. Both publish-action.ts and page.tsx import from here.
 */

/** Phrase-removal threshold above which we hard-gate the publish. */
export const SLOP_GATE_THRESHOLD = 5;

export interface SlopPreviewSnapshot {
  id: string;
  ts: string;
  intent: "preview" | "publish";
  /** The original content the user pasted in. */
  original: string;
  /** The stripSlop-cleaned content. */
  cleaned: string;
  /** Per-phrase removal counts, sorted by count desc. */
  removed: { phrase: string; count: number }[];
  /** Total phrase-instances removed (sum of removed[].count). */
  totalRemoved: number;
  /** Whether the user ticked the "I've reviewed slop removals" override. */
  override: boolean;
  /**
   * Whether the gate blocked the publish. True when intent="publish" AND
   * totalRemoved > SLOP_GATE_THRESHOLD AND override is false.
   */
  blocked: boolean;
  /**
   * Absolute path of the queued publish card if the publish was accepted,
   * null otherwise. (Path is server-internal — for the work-log evidence
   * trail.)
   */
  publishedTo: string | null;
}
