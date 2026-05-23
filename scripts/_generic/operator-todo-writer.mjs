/**
 * operator-todo-writer.mjs — the writer every Day14 agent uses to file a
 * human task on the operator to-do list.
 *
 * THIS IS THE AGENT THAT KEEPS THE EMPIRE TO-DO LIST CURRENT. Whenever any
 * agent hits a wall only the human can clear (creating an account, entering
 * payment info, publishing a Printify draft, pointing a domain, dropping a
 * data file on the Mac), it calls `addOperatorTask(...)`. The task then lands
 * on the day14.us/admin empire homescreen FULLY INSTRUCTED — with numbered
 * steps, real links, and copy-paste terminal code — via the structured
 * `instructions` field on the todo schema.
 *
 * The point: a caller passes the MINIMUM it knows (what + why) and still gets
 * a complete, actionable task, because category TEMPLATES fill in the rest.
 *
 * Usage:
 *   import { addOperatorTask } from "./_generic/operator-todo-writer.mjs";
 *   await addOperatorTask({
 *     tenant: "day14",
 *     title: "Get a Foo API key",
 *     why: "The Foo integration stays inert until this key is set.",
 *     category: "credentials",
 *     envVar: "FOO_API_KEY",
 *     site: { label: "foo.com → Settings → API", url: "https://foo.com/settings" },
 *   });
 */

import { addTodo } from "./operator-todos.mjs";

/**
 * Category instruction TEMPLATES. Each takes the caller's input and returns
 * { steps, links, code } — any of which may be empty. Callers can always
 * override by passing explicit `steps` / `links` / `code` to addOperatorTask.
 *
 * `credentials` deliberately tells the human to PASTE THE KEY TO CLAUDE — the
 * key must never be typed into a file by hand; Claude wires it into
 * .env.local + Vercel safely.
 */
const TEMPLATES = {
  credentials: ({ envVar, site, title }) => {
    const key = envVar || "the API key";
    const steps = [
      site
        ? `Open ${site.label || site.url} and sign in (create a free account if you don't have one).`
        : `Open the provider's website and sign in (create a free account if needed).`,
      `Generate / copy the API key. You may need to enable API access or billing first.`,
      `Paste the key straight to Claude in chat — do NOT type it into any file yourself.`,
      `Claude adds it as ${key} in .env.local + Vercel and re-runs whatever was blocked.`,
    ];
    return {
      steps,
      links: site ? [site] : [],
      code: "",
    };
  },

  publish: ({ site, title }) => ({
    steps: [
      site
        ? `Open ${site.label || site.url} and sign in.`
        : `Open the publishing dashboard (e.g. Printify) and sign in.`,
      `Find the drafts the agents prepared for this task.`,
      `Review each draft, then publish it so it goes live on the store.`,
      `Reply "done <N>" to the Telegram bot once everything is published.`,
    ],
    links: site ? [site] : [],
    code: "",
  }),

  deploy: ({ command, site }) => ({
    steps: [
      `Run the deploy command below in Terminal from the studio repo.`,
      `Wait for the build to finish and confirm there are no errors.`,
      site ? `Verify the change is live at ${site.label || site.url}.` : `Verify the change is live.`,
    ],
    links: site ? [site] : [],
    code: command || "cd ~/Documents/studio && npx vercel --prod",
  }),

  dns: ({ domain, registrar, records }) => ({
    steps: [
      registrar
        ? `Log in to your domain registrar (${registrar}).`
        : `Log in to the domain registrar that holds ${domain || "the domain"}.`,
      `Open the DNS settings for ${domain || "the domain"}.`,
      records
        ? `Add / update these records: ${records}.`
        : `Add the DNS records Claude specified (usually an A record and/or CNAME).`,
      `Save. DNS can take up to a few hours to propagate; then reply "done <N>".`,
    ],
    links: registrar && registrar.startsWith("http") ? [{ label: registrar, url: registrar }] : [],
    code: "",
  }),

  data: ({ source, dropPath, fileName }) => ({
    steps: [
      source
        ? `Get the data export from ${source}.`
        : `Locate and download the data export this task needs.`,
      `Save it as a CSV file${fileName ? ` named "${fileName}"` : ""}.`,
      `Move the CSV into ${dropPath || "the tenant's intake/ folder"} on the Mac.`,
      `The intake agent ingests and evaluates it automatically on the next run.`,
    ],
    links: source && source.startsWith("http") ? [{ label: source, url: source }] : [],
    code: dropPath ? `open "${dropPath}"` : "",
  }),
};

/** Build a concise one-paragraph `detail` from why + the assembled steps. */
function buildDetail(why, instructions) {
  const parts = [];
  if (why) parts.push(String(why).trim());
  if (instructions.steps && instructions.steps.length) {
    parts.push(`Steps: ${instructions.steps.join(" → ")}`);
  }
  return parts.join(" ").slice(0, 700);
}

/**
 * File a human task on the operator to-do list — fully instructed.
 *
 * @param {object}   o
 * @param {string}   o.tenant     Tenant slug (default "day14").
 * @param {string}   o.title      Short imperative title (required).
 * @param {string}   o.why        One line: why this matters / what it unblocks.
 * @param {string}   o.category   One of: credentials | publish | deploy | dns | data | general.
 * @param {string}   o.priority   high | medium | low (default "medium").
 * @param {string[]} o.steps      Optional explicit steps — override the template.
 * @param {Array}    o.links      Optional [{label,url}] — appended to template links.
 * @param {string}   o.code       Optional terminal command(s) — override the template.
 * @param {string}   o.source     Caller id for provenance (default "agent").
 *
 * Category-specific shorthands (consumed by TEMPLATES):
 *   credentials: envVar, site:{label,url}
 *   publish:     site:{label,url}
 *   deploy:      command, site:{label,url}
 *   dns:         domain, registrar, records
 *   data:        source, dropPath, fileName
 *
 * @returns the created (or de-duped existing) todo object.
 */
export async function addOperatorTask({
  tenant = "day14",
  title,
  why = "",
  category = "general",
  priority = "medium",
  steps,
  links,
  code,
  source = "agent",
  // category shorthands
  envVar,
  site,
  command,
  domain,
  registrar,
  records,
  dataSource,
  dropPath,
  fileName,
} = {}) {
  if (!title) throw new Error("addOperatorTask: title is required");

  // Run the category template (if any) to get baseline steps/links/code.
  const tmpl = TEMPLATES[category];
  const base = tmpl
    ? tmpl({
        title,
        envVar,
        site,
        command,
        domain,
        registrar,
        records,
        source: dataSource,
        dropPath,
        fileName,
      })
    : { steps: [], links: [], code: "" };

  // Caller-provided values override / merge with the template.
  const instructions = {
    steps: Array.isArray(steps) && steps.length ? steps : base.steps,
    links: [
      ...(base.links || []),
      ...(Array.isArray(links) ? links : []),
    ].filter((l) => l && l.url),
    code: code != null && String(code).trim() ? String(code) : base.code,
  };

  const detail = buildDetail(why, instructions);

  return addTodo({
    tenant,
    title,
    detail,
    category,
    priority,
    source,
    instructions,
  });
}

// CLI smoke test: `node operator-todo-writer.mjs`
if (import.meta.url === `file://${process.argv[1]}`) {
  const t = await addOperatorTask({
    title: process.argv[2] || "Test operator task from writer",
    why: "Verifying the writer assembles instructions end to end.",
    category: process.argv[3] || "general",
    source: "cli",
  });
  console.log(`Filed #${t.seq}: ${t.title}`);
  console.log(JSON.stringify(t.instructions, null, 2));
}
