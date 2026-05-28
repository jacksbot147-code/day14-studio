/**
 * lib/skills/claude-mem.mjs
 *
 * STUB bridge for the `claude-mem` Claude Code plugin (github.com/thedotmack/
 * claude-mem). This file exists so callers can `import { recall, remember,
 * forget } from "./claude-mem.mjs"` today without breaking when the
 * integration is wired up later.
 *
 * STATUS: NOT WIRED. Every export below returns
 *   { ok: false, reason: "not-wired", detail: "<context>" }
 * by design. Day14 T21 is research + stub only — Jack steers before any HTTP
 * call lands here. See ~/Documents/PLAN-CLAUDE-MEM.md for the full sketch:
 *   - target HTTP surface (worker on http://localhost:<port>/api/*)
 *   - storage model (~/.claude-mem/claude-mem.db, SQLite + FTS5)
 *   - privacy concerns (compression traffic, plaintext prompt storage,
 *     project leakage across the hot-flash / kennum exclusion list)
 *   - 3 open questions for Jack (writes on/off, project scoping, hard vs.
 *     soft degrade when the worker is down).
 *
 * Public surface (intentionally minimal — matches PLAN §6):
 *
 *   recall(query, k = 10, opts?) -> Promise<RecallResult>
 *   remember(event, tags?)       -> Promise<RememberResult>
 *   forget(id)                   -> Promise<ForgetResult>
 *
 *   isWired() -> false   (constant for this stub; flips to runtime check
 *                         once wired)
 *
 * When this file IS wired:
 *   - recall()   -> GET  http://localhost:<port>/api/search?...
 *   - remember() -> POST http://localhost:<port>/api/sessions/observations
 *                   (gated behind env CLAUDE_MEM_BRIDGE_WRITES=1)
 *   - forget()   -> NO upstream endpoint exists. Likely stays
 *                   { ok:false, reason:"not-supported" } until upstream PR.
 *
 * Design rules (carry forward into the wired version):
 *   - Never throw on expected failure. Return { ok:false, reason, detail? }.
 *   - Never start, restart, or health-poke the claude-mem worker process.
 *   - Always pass an explicit `project` filter on reads (default: "studio")
 *     so we don't leak observations from hot-flash-co / kennum-lawn-care.
 *   - Never open ~/.claude-mem/claude-mem.db directly. HTTP only.
 */

const SKILL_NAME = "claude-mem";
const NOT_WIRED_REASON = "not-wired";
const NOT_WIRED_DETAIL =
  "claude-mem bridge is stubbed (Day14 T21). See ~/Documents/PLAN-CLAUDE-MEM.md.";

/**
 * @typedef {Object} RecallOpts
 * @property {string} [project="studio"]   project filter; never omit
 * @property {"observations"|"sessions"|"prompts"} [type="observations"]
 * @property {string} [dateStart]          ISO timestamp
 * @property {string} [dateEnd]            ISO timestamp
 * @property {string[]} [files]            file-path filter (joined with ",")
 * @property {string[]} [concepts]         concept filter (joined with ",")
 * @property {"index"|"full"} [format="index"]
 */

/**
 * @typedef {{
 *   ok: true,
 *   items: Array<{
 *     id: number,
 *     title: string,
 *     summary: string,
 *     project: string,
 *     type: string,
 *     score?: number,
 *     created_at?: number
 *   }>,
 *   source: "claude-mem" | "empty"
 * } | {
 *   ok: false,
 *   reason: string,
 *   detail?: string
 * }} RecallResult
 */

/**
 * Search claude-mem for prior observations matching `query`.
 *
 * Stubbed: returns { ok:false, reason:"not-wired" }. When wired this will
 * hit `GET /api/search?query=…&format=index&limit=k&project=…&type=…`.
 *
 * @param {string} query                  natural-language query
 * @param {number} [k=10]                 result cap
 * @param {RecallOpts} [opts]
 * @returns {Promise<RecallResult>}
 */
export async function recall(query, k = 10, opts = {}) {
  void query;
  void k;
  void opts;
  return {
    ok: false,
    reason: NOT_WIRED_REASON,
    detail: NOT_WIRED_DETAIL,
  };
}

/**
 * @typedef {{
 *   title: string,
 *   summary: string,
 *   facts?: string[],
 *   concepts?: string[],
 *   files?: string[]
 * }} RememberEvent
 */

/**
 * @typedef {{
 *   ok: true,
 *   id?: number,
 *   queued: true
 * } | {
 *   ok: false,
 *   reason: string,
 *   detail?: string
 * }} RememberResult
 */

/**
 * Queue a synthetic observation in claude-mem from a Day14 daemon.
 *
 * Stubbed: returns { ok:false, reason:"not-wired" }. When wired this will
 * hit `POST /api/sessions/observations` with a synthesized
 * `claudeSessionId` (`day14-daemon-<uuid>`), but only when the env var
 * `CLAUDE_MEM_BRIDGE_WRITES=1` is set. Default behavior even after wiring
 * is to reject with `{ok:false, reason:"writes-disabled"}` — see PLAN §6
 * and open question #1.
 *
 * @param {RememberEvent} event
 * @param {string[]} [tags]
 * @returns {Promise<RememberResult>}
 */
export async function remember(event, tags = []) {
  void event;
  void tags;
  return {
    ok: false,
    reason: NOT_WIRED_REASON,
    detail: NOT_WIRED_DETAIL,
  };
}

/**
 * @typedef {{
 *   ok: true,
 *   deleted: true
 * } | {
 *   ok: false,
 *   reason: string,
 *   detail?: string
 * }} ForgetResult
 */

/**
 * Delete a claude-mem observation by id.
 *
 * Stubbed AND blocked upstream: claude-mem does not expose a public delete
 * endpoint as of v7.x (May 2026). Even after this bridge is wired, this
 * method is expected to remain `{ok:false, reason:"not-supported"}` until
 * either an upstream PR lands or we adopt a tombstone-observation
 * convention (see PLAN §6).
 *
 * @param {string|number} id
 * @returns {Promise<ForgetResult>}
 */
export async function forget(id) {
  void id;
  return {
    ok: false,
    reason: NOT_WIRED_REASON,
    detail: NOT_WIRED_DETAIL,
  };
}

/**
 * Compile-time gate so callers can branch without try/catch. Constant
 * `false` while the bridge is stubbed; flips to a runtime
 * `GET /api/health` check once wired.
 *
 * @returns {boolean}
 */
export function isWired() {
  return false;
}

const claudeMemBridge = {
  skill: SKILL_NAME,
  recall,
  remember,
  forget,
  isWired,
};

export default claudeMemBridge;
