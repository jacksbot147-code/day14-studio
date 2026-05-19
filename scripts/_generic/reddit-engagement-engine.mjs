#!/usr/bin/env node
/**
 * reddit-engagement-engine.mjs <tenant-slug>
 *
 * For tenant's niche:
 *   1. Gemini-grounded discovery of 10-20 active subreddits where ICP hangs out
 *   2. For each top subreddit, fetches recent hot posts (via Reddit JSON API,
 *      no auth needed for public reads)
 *   3. For each interesting thread, drafts a value-adding comment (not promo)
 *   4. Optionally drafts an original post for the brand's strongest subreddit
 *   5. Saves drafts to ~/Documents/businesses/<tenant>/reddit-drafts/
 *   6. Jack-tap to send (no auto-posting — too much risk of shadowban)
 */

import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import {
  tenantSlug, loadEnv, loadTenant, audit, callGemini, parseJson, queueTelegram, BIZ, GEMINI_GROUNDED,
} from "./_lib.mjs";

const REDDIT_UA = "Day14OS/1.0 (by /u/day14ops)";

async function discoverSubreddits(ctx, env) {
  const prompt = `Find the BEST subreddits where the ideal customer for "${ctx.display_name}" (${ctx.niche}) actively hangs out.

ICP: ${ctx.identity?.icp?.description || ctx.niche}

Use Google Search to verify each subreddit:
- Has >5k members
- Is active (posts in the last week)
- Allows lurkers/learners (not strict "no self-promotion" lockdown)
- Is on-topic for our niche

Return STRICT JSON:
{
  "subreddits": [
    {
      "name": "r/realname",
      "subscriber_count_estimate": "10k|50k|100k|500k|1M+",
      "fit": "high|medium|low",
      "rules_summary": "1 sentence on what's allowed/banned",
      "best_post_types": ["story", "question", "ask_for_advice"]
    },
    ... 10-20 entries
  ]
}`;

  return parseJson(await callGemini(prompt, env, { temp: 0.4, useGrounding: true, model: GEMINI_GROUNDED, maxTokens: 4000 }));
}

async function fetchSubredditTop(subName, limit = 10) {
  // Reddit public JSON — no auth required
  const url = `https://www.reddit.com/${subName}/hot.json?limit=${limit}`;
  const res = await fetch(url, { headers: { "User-Agent": REDDIT_UA } });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.data?.children || []).map((c) => ({
    id: c.data.id,
    title: c.data.title,
    selftext: (c.data.selftext || "").slice(0, 600),
    score: c.data.score,
    num_comments: c.data.num_comments,
    permalink: `https://reddit.com${c.data.permalink}`,
    created_utc: c.data.created_utc,
  }));
}

async function draftComments(ctx, subreddit, threads, env) {
  if (threads.length === 0) return [];
  const prompt = `You're drafting Reddit comments for ${subreddit.name} as someone behind "${ctx.display_name}" (${ctx.niche}).

CONSTITUTION (voice):
${ctx.constitution?.slice(0, 2500) || "(none)"}

REDDIT RULES — strict:
- NEVER mention our brand by name unless asked directly
- NEVER drop links
- Add genuine value — share story, lived experience, useful info
- Talk like a real person, not a marketer
- One paragraph, max 150 words
- Respect the sub's culture

THREADS (pick the 3 you can add real value to):
${threads.map((t, i) => `${i + 1}. [${t.score}↑ ${t.num_comments}💬] ${t.title}\n   ${t.selftext.slice(0, 300)}\n   ${t.permalink}`).join("\n\n")}

Return STRICT JSON:
{
  "comments": [
    {
      "thread_permalink": "https://reddit.com/...",
      "thread_title": "the title",
      "comment_body": "150-word genuine comment",
      "value_added": "what this comment gives to the conversation"
    },
    ... up to 3 entries
  ]
}

If none of the threads are worth commenting on, return { "comments": [] }.`;

  const result = parseJson(await callGemini(prompt, env, { temp: 0.7, maxTokens: 3000 }));
  return result.comments || [];
}

async function draftOriginalPost(ctx, subreddit, env) {
  const prompt = `Draft an ORIGINAL post for ${subreddit.name} from someone behind "${ctx.display_name}" (${ctx.niche}).

CONSTITUTION:
${ctx.constitution?.slice(0, 2500) || "(none)"}

Rules:
- Add value first (story, observation, lived experience)
- NO direct brand promotion
- Title is Reddit-native: question, observation, story hook — not clickbait
- Body is 200-500 words
- Don't break ${subreddit.name}'s rules: ${subreddit.rules_summary}

Pick the post type that fits: ${subreddit.best_post_types?.join(", ") || "story"}.

Return STRICT JSON:
{
  "title": "Reddit-native title",
  "body": "200-500 word post body",
  "post_type": "story|question|advice|observation",
  "rationale": "why this works for ${subreddit.name}"
}`;

  return parseJson(await callGemini(prompt, env, { temp: 0.8, maxTokens: 2500 }));
}

async function main() {
  const slug = tenantSlug();
  const env = await loadEnv();
  const ctx = await loadTenant(slug);
  if (!ctx.constitution) throw new Error(`No CONSTITUTION.md for ${slug}`);

  console.log(`→ Reddit engagement engine for ${ctx.display_name}`);

  // 1. Discover subreddits
  console.log("→ Discovering subreddits...");
  const subreddits = (await discoverSubreddits(ctx, env)).subreddits || [];
  const highFit = subreddits.filter((s) => s.fit === "high").slice(0, 5);
  console.log(`  ${subreddits.length} found, ${highFit.length} high-fit`);

  // 2. For each, fetch threads + draft comments
  const date = new Date().toISOString().slice(0, 10);
  const outDir = path.join(BIZ, slug, "reddit-drafts", date);
  await fs.mkdir(outDir, { recursive: true });

  const allComments = [];
  const allPosts = [];
  for (const sub of highFit) {
    process.stdout.write(`  ${sub.name.padEnd(30)} `);
    try {
      const threads = await fetchSubredditTop(sub.name, 10);
      if (threads.length === 0) { console.log("(no public access)"); continue; }
      const comments = await draftComments(ctx, sub, threads, env);
      const post = await draftOriginalPost(ctx, sub, env);
      allComments.push(...comments.map((c) => ({ ...c, subreddit: sub.name })));
      allPosts.push({ ...post, subreddit: sub.name });
      console.log(`✓ ${comments.length} comments, 1 post`);
      await new Promise((r) => setTimeout(r, 1500));
    } catch (e) {
      console.log(`✗ ${e.message.slice(0, 60)}`);
    }
  }

  // Save
  await fs.writeFile(
    path.join(outDir, "subreddits.json"),
    JSON.stringify({ generated_at: new Date().toISOString(), subreddits }, null, 2)
  );
  await fs.writeFile(path.join(outDir, "comments.json"), JSON.stringify(allComments, null, 2));
  await fs.writeFile(path.join(outDir, "posts.json"), JSON.stringify(allPosts, null, 2));

  // Markdown overview
  const lines = [
    `# Reddit drafts — ${ctx.display_name} (${date})`,
    ``,
    `## Comments (${allComments.length})`,
    ``,
    ...allComments.map((c, i) => `### ${i + 1}. ${c.subreddit} — ${c.thread_title}\n\nThread: ${c.thread_permalink}\n\n${c.comment_body}\n\n*Adds: ${c.value_added}*`),
    ``,
    `## Original posts (${allPosts.length})`,
    ``,
    ...allPosts.map((p, i) => `### ${i + 1}. ${p.subreddit}\n\n**Title:** ${p.title}\n\n${p.body}\n\n*${p.rationale}*`),
  ];
  await fs.writeFile(path.join(outDir, "README.md"), lines.join("\n"));

  await queueTelegram(env, slug,
    `👽 *Reddit drafts ready — ${ctx.display_name}*\n\n${allComments.length} comments + ${allPosts.length} posts across ${highFit.length} subreddits.\n\nFolder: \`open ${outDir}\`\n\n*Manual posting only* — Reddit shadowbans auto-posters. Copy + paste with Jack judgment.`
  );

  await audit(slug, { actor: "reddit-engagement-engine", action: "drafts_generated", comments: allComments.length, posts: allPosts.length, subreddits: highFit.length });
  console.log(`\n✓ ${allComments.length} comments + ${allPosts.length} posts → ${outDir}`);
}

main().catch((err) => { console.error("FATAL:", err.message); process.exit(1); });
