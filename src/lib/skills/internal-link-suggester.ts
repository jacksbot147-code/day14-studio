/**
 * internal-link-suggester — hand-coded impl.
 *
 * For a new blog draft, scans an existing posts directory and suggests
 * 1-3 prior posts to link FROM the new one + 1-2 prior posts to edit
 * to link TO the new one. Pure-Node keyword + vertical match scoring.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import type { SkillInvocationContext } from "../skill-runtime";
import type { SkillOutcome } from "../skill-runner";
import { auditLog } from "./audit-log-generator";

const HOME = homedir();

export interface InternalLinkInput {
  draft_text: string;
  draft_title: string;
  posts_dir?: string; // defaults to ~/Documents/studio/docs/blog-drafts
  tenant?: string;
  vertical?: string;
  max_outgoing?: number; // default 3
  max_incoming?: number; // default 2
}

export interface LinkSuggestion {
  slug: string;
  path: string;
  title: string;
  score: number;
  reason: string;
}

export interface InternalLinkResult {
  outgoing: LinkSuggestion[];
  incoming: LinkSuggestion[];
  scanned_count: number;
}

const STOPWORDS = new Set([
  "the","and","for","with","you","your","that","this","from","not","but","are","was","were","into","over","than","then","when","what","have","has","had","will","just","also","can","could","would","should","its","they","them","our","ours","one","two","three","about","like","very","more","most","many","much","each","other","any","all","some","such","into","because","while","during"
]);

function keywords(text: string): Set<string> {
  const matches = text.toLowerCase().match(/[a-z][a-z-]{3,}/g) || [];
  const counts = new Map<string, number>();
  for (const w of matches) {
    if (STOPWORDS.has(w)) continue;
    counts.set(w, (counts.get(w) ?? 0) + 1);
  }
  // top 30 by frequency
  return new Set([...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30).map(([w]) => w));
}

function parseFrontmatter(text: string): { title?: string; vertical?: string } {
  const m = text.match(/^---\n([\s\S]*?)\n---/);
  if (!m || !m[1]) return {};
  const fm: Record<string, string> = {};
  for (const line of m[1].split("\n")) {
    const kv = line.match(/^(\w+):\s*(.*)$/);
    if (kv && kv[1] && kv[2]) fm[kv[1]] = kv[2].trim();
  }
  return { title: fm.title, vertical: fm.vertical };
}

function slugOf(filePath: string): string {
  return path.basename(filePath, path.extname(filePath));
}

async function listPosts(dir: string): Promise<string[]> {
  if (!existsSync(dir)) return [];
  const entries = await fs.readdir(dir);
  return entries.filter((e) => e.endsWith(".md")).map((e) => path.join(dir, e));
}

export async function suggestInternalLinks(input: InternalLinkInput): Promise<InternalLinkResult> {
  const postsDir = input.posts_dir || path.join(HOME, "Documents/studio/docs/blog-drafts");
  const posts = await listPosts(postsDir);
  const draftKw = keywords(input.draft_text + " " + input.draft_title);

  const suggestions: LinkSuggestion[] = [];
  for (const p of posts) {
    try {
      const text = await fs.readFile(p, "utf8");
      const fm = parseFrontmatter(text);
      const postKw = keywords(text);
      let overlap = 0;
      for (const w of draftKw) if (postKw.has(w)) overlap += 1;
      if (overlap === 0) continue;
      const verticalBoost = input.vertical && fm.vertical === input.vertical ? 2 : 0;
      const score = overlap + verticalBoost;
      suggestions.push({
        slug: slugOf(p),
        path: p,
        title: fm.title || slugOf(p),
        score,
        reason: `${overlap} keyword overlaps${verticalBoost ? ", same vertical" : ""}`,
      });
    } catch {
      // skip unreadable files
    }
  }
  suggestions.sort((a, b) => b.score - a.score);
  const outgoing = suggestions.slice(0, input.max_outgoing ?? 3);
  const incoming = suggestions.slice(0, input.max_incoming ?? 2);
  return { outgoing, incoming, scanned_count: posts.length };
}

export async function invokeInternalLinkSuggester(
  input: InternalLinkInput
): Promise<InternalLinkResult> {
  const result = await suggestInternalLinks(input);
  await auditLog({
    action: "internal_links_suggested",
    actor: "automated:internal-link-suggester",
    details: { outgoing: result.outgoing.length, incoming: result.incoming.length, scanned: result.scanned_count },
    skill_invoked: "internal-link-suggester",
    actor_source: "skill-runner",
  });
  return result;
}

export async function run(ctx: SkillInvocationContext): Promise<SkillOutcome> {
  const input = ctx.inputs as Partial<InternalLinkInput> | undefined;
  if (!input?.draft_text || !input.draft_title) {
    return {
      ok: false,
      skill: "internal-link-suggester",
      path: "hand-coded",
      error: "missing required inputs: draft_text, draft_title",
    };
  }
  const result = await invokeInternalLinkSuggester(input as InternalLinkInput);
  return {
    ok: true,
    skill: "internal-link-suggester",
    path: "hand-coded",
    result,
  };
}
