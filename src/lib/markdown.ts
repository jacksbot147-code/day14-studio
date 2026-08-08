/**
 * markdown.ts — a small, safe, dependency-free Markdown → HTML renderer.
 *
 * Written for /insights, whose article bodies are plain .md files under
 * public/data/insights/. The repo has no Markdown dependency (checked
 * package.json — no remark / marked / markdown-it / MDX), and this needs
 * to run on the server at build time only, so a ~200-line renderer beats
 * adding a dependency tree.
 *
 * SAFETY MODEL — the important part, since output is injected with
 * dangerouslySetInnerHTML:
 *   1. Every character of source text is HTML-escaped FIRST. No raw HTML
 *      in a source file can ever reach the DOM; `<script>` renders as
 *      literal text.
 *   2. Only this file emits tags, from a fixed allow-list: h1–h6, p, ul,
 *      ol, li, blockquote, pre, code, hr, strong, em, a.
 *   3. Link hrefs are allow-listed by scheme (http, https, mailto, and
 *      site-relative / fragment). Anything else — `javascript:`, `data:` —
 *      renders as inert literal text.
 *   4. Generated fragments are parked in placeholders using a control
 *      character that is stripped from the input up front, so source text
 *      can never forge one.
 *
 * Supported: ATX headings, paragraphs, bold, italic, links, inline code,
 * fenced code blocks, unordered + ordered lists, blockquotes, horizontal
 * rules. Deliberately unsupported: raw HTML, images, tables, footnotes,
 * reference links. Anything unsupported degrades to escaped plain text.
 *
 * The emitted tags line up 1:1 with the `.cin-prose` styles in
 * src/app/cinematic.css, so rendered articles inherit the cinematic skin
 * with no extra CSS.
 */

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeHtml(input: string): string {
  return input.replace(/[&<>"']/g, (c) => HTML_ESCAPES[c] ?? c);
}

/** Control chars are stripped from source so PLACEHOLDER can't be forged. */
const PLACEHOLDER = "\u0000";
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g;

/** Schemes allowed in a link href. Everything else renders as plain text. */
function isSafeHref(href: string): boolean {
  const h = href.trim();
  if (!h) return false;
  return /^(?:https?:\/\/|mailto:|tel:|\/|#|\.\/)/i.test(h);
}

/** Bold / italic. Runs after code + links are parked in placeholders. */
function emphasis(text: string): string {
  return text
    .replace(/\*\*(?=[^\s*])([\s\S]*?[^\s*])\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^\w_])__(?=[^\s_])([\s\S]*?[^\s_])__(?![\w_])/g, "$1<strong>$2</strong>")
    .replace(/(^|[^\w*])\*(?=[^\s*])([^*]*?[^\s*])\*(?!\*)/g, "$1<em>$2</em>")
    .replace(/(^|[^\w_])_(?=[^\s_])([^_]*?[^\s_])_(?![\w_])/g, "$1<em>$2</em>");
}

/**
 * Inline rendering. `raw` is unescaped source; it is escaped here, then
 * code spans and links are extracted into placeholders (so emphasis can't
 * corrupt a URL or a code sample) and restored at the end.
 */
function renderInline(raw: string): string {
  const parked: string[] = [];
  const park = (html: string): string => {
    parked.push(html);
    return `${PLACEHOLDER}${parked.length - 1}${PLACEHOLDER}`;
  };

  let out = escapeHtml(raw);

  // 1. Inline code — contents stay literal (already escaped).
  out = out.replace(/`([^`\n]+)`/g, (_m, code: string) => park(`<code>${code}</code>`));

  // 2. Links — href is already escaped, so it cannot break out of the
  //    attribute; scheme is allow-listed. Unsafe links fall back to the
  //    original literal text.
  out = out.replace(
    /\[([^\]\n]*)\]\(([^()\s]+)\)/g,
    (match: string, label: string, href: string) => {
      if (!isSafeHref(href)) return match;
      const external = /^https?:\/\//i.test(href.trim());
      const rel = external ? ' rel="noopener noreferrer"' : "";
      return park(`<a href="${href}"${rel}>${emphasis(label)}</a>`);
    },
  );

  // 3. Emphasis over what's left.
  out = emphasis(out);

  // 4. Restore parked fragments.
  return out.replace(
    new RegExp(`${PLACEHOLDER}(\\d+)${PLACEHOLDER}`, "g"),
    (_m, index: string) => parked[Number(index)] ?? "",
  );
}

const RE_FENCE = /^\s*(?:```|~~~)\s*[\w+-]*\s*$/;
const RE_FENCE_CLOSE = /^\s*(?:```|~~~)\s*$/;
const RE_HR = /^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/;
const RE_HEADING = /^(#{1,6})\s+(.*)$/;
const RE_QUOTE = /^\s*>\s?(.*)$/;
const RE_UL = /^\s*[-*+]\s+(.*)$/;
const RE_OL = /^\s*\d{1,9}[.)]\s+(.*)$/;

/** True when a line starts a block other than a paragraph continuation. */
function startsBlock(line: string): boolean {
  return (
    RE_FENCE.test(line) ||
    RE_HR.test(line) ||
    RE_HEADING.test(line.trim()) ||
    RE_QUOTE.test(line) ||
    RE_UL.test(line) ||
    RE_OL.test(line)
  );
}

/**
 * Render a Markdown document to an HTML string.
 *
 * The output is trusted-by-construction (see the safety model above) and is
 * intended for `dangerouslySetInnerHTML` inside a `.cin-prose` container.
 */
export function markdownToHtml(source: string): string {
  const lines = source
    .replace(/\r\n?/g, "\n")
    .replace(CONTROL_CHARS, "")
    .split("\n");

  const out: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i] ?? "";

    // Blank line — nothing to emit.
    if (!line.trim()) {
      i++;
      continue;
    }

    // Fenced code block.
    if (RE_FENCE.test(line)) {
      const body: string[] = [];
      i++;
      while (i < lines.length && !RE_FENCE_CLOSE.test(lines[i] ?? "")) {
        body.push(lines[i] ?? "");
        i++;
      }
      i++; // consume the closing fence (or run off the end)
      out.push(`<pre><code>${escapeHtml(body.join("\n"))}</code></pre>`);
      continue;
    }

    // Horizontal rule.
    if (RE_HR.test(line)) {
      out.push("<hr />");
      i++;
      continue;
    }

    // ATX heading. Levels render as written — article bodies should start
    // at ## so the page H1 stays unique.
    const heading = RE_HEADING.exec(line.trim());
    if (heading) {
      const level = (heading[1] ?? "#").length;
      out.push(`<h${level}>${renderInline((heading[2] ?? "").trim())}</h${level}>`);
      i++;
      continue;
    }

    // Blockquote — gather the run, strip markers, render recursively.
    if (RE_QUOTE.test(line)) {
      const body: string[] = [];
      while (i < lines.length && (lines[i] ?? "").trim()) {
        const quoted = RE_QUOTE.exec(lines[i] ?? "");
        body.push(quoted ? (quoted[1] ?? "") : (lines[i] ?? "").trim());
        i++;
      }
      out.push(`<blockquote>${markdownToHtml(body.join("\n"))}</blockquote>`);
      continue;
    }

    // Lists. A blank line ends the list; an unmarked non-blank line is a
    // lazy continuation of the current item (source is hard-wrapped).
    const ordered = RE_OL.test(line);
    if (ordered || RE_UL.test(line)) {
      const itemRe = ordered ? RE_OL : RE_UL;
      const items: string[] = [];
      while (i < lines.length && (lines[i] ?? "").trim()) {
        const current = lines[i] ?? "";
        const item = itemRe.exec(current);
        if (item) {
          items.push(item[1] ?? "");
        } else if (startsBlock(current)) {
          break;
        } else if (items.length > 0) {
          items[items.length - 1] = `${items[items.length - 1]} ${current.trim()}`;
        } else {
          break;
        }
        i++;
      }
      const tag = ordered ? "ol" : "ul";
      const rendered = items.map((t) => `<li>${renderInline(t)}</li>`).join("");
      out.push(`<${tag}>${rendered}</${tag}>`);
      continue;
    }

    // Paragraph — run to the next blank line or block start.
    const para: string[] = [line.trim()];
    i++;
    while (i < lines.length) {
      const next = lines[i] ?? "";
      if (!next.trim() || startsBlock(next)) break;
      para.push(next.trim());
      i++;
    }
    out.push(`<p>${renderInline(para.join("\n"))}</p>`);
  }

  return out.join("\n");
}

export default markdownToHtml;
