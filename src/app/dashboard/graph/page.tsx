/**
 * /dashboard/graph — the skill graph explorer.
 *
 * Shows hubs, orphans, and click-through neighbor exploration.
 * Pulled from skill-graph.generated.ts (regenerate with `npm run graph:generate`).
 */

import {
  NODES,
  EDGES,
  NODE_COUNT,
  EDGE_COUNT,
  HUBS,
  ORPHANS,
} from "@/lib/skill-graph.generated";
import { SKILLS } from "@/lib/skill-registry.generated";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: { skill?: string };
}

export default function GraphPage({ searchParams }: PageProps) {
  const focused = searchParams.skill;
  const focusedSkill = focused ? SKILLS.find((s) => s.name === focused) : null;
  const focusedNode = focused ? NODES.find((n) => n.id === focused) : null;

  // Neighbors of focused skill
  const incoming = focused
    ? EDGES.filter((e) => e.target === focused).map((e) => e.source)
    : [];
  const outgoing = focused
    ? EDGES.filter((e) => e.source === focused).map((e) => e.target)
    : [];

  const avgEdges = (EDGE_COUNT / NODE_COUNT).toFixed(1);

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6 md:p-10">
      <header className="mb-8 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Skill graph</h1>
          <p className="text-sm text-zinc-400 mt-1">
            {NODE_COUNT} skills · {EDGE_COUNT} edges · avg {avgEdges} edges/skill
          </p>
        </div>
        <Link
          href="/dashboard"
          className="text-sm text-zinc-400 hover:text-zinc-200"
        >
          ← back to dashboard
        </Link>
      </header>

      {focused && focusedSkill ? (
        <FocusedView
          name={focused}
          description={focusedSkill.description}
          incoming={incoming}
          outgoing={outgoing}
          inDegree={focusedNode?.inDegree ?? 0}
          outDegree={focusedNode?.outDegree ?? 0}
        />
      ) : (
        <OverviewGrid />
      )}
    </main>
  );
}

function OverviewGrid() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Top hubs */}
      <Card title="Top hubs (most connected)">
        <ul className="space-y-1.5">
          {HUBS.map((h, i) => (
            <li key={h.id} className="text-sm flex items-center gap-2">
              <span className="text-zinc-500 text-xs w-6 text-right">
                {i + 1}.
              </span>
              <Link
                href={`/dashboard/graph?skill=${h.id}`}
                className="font-mono text-zinc-300 hover:text-emerald-300"
              >
                {h.id}
              </Link>
              <span className="text-zinc-500 text-xs ml-auto">
                {h.total} edges (in {h.inDegree} · out {h.outDegree})
              </span>
            </li>
          ))}
        </ul>
      </Card>

      {/* Orphans */}
      <Card title="Orphan skills (no references)">
        {ORPHANS.length === 0 ? (
          <p className="text-zinc-500 text-sm">No orphans. Empire is fully connected.</p>
        ) : (
          <ul className="space-y-1.5">
            {ORPHANS.map((id) => (
              <li key={id} className="text-sm">
                <Link
                  href={`/dashboard/graph?skill=${id}`}
                  className="font-mono text-zinc-300 hover:text-yellow-300"
                >
                  {id}
                </Link>
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-zinc-500 mt-3">
          Orphans aren&apos;t bad — these are standalone guideline skills (anti-patterns, conventions).
        </p>
      </Card>

      {/* Connectivity stats */}
      <Card title="Connectivity">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-zinc-400">Total nodes</span>
            <span className="font-mono">{NODE_COUNT}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-400">Total edges</span>
            <span className="font-mono">{EDGE_COUNT}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-400">Avg degree</span>
            <span className="font-mono">
              {((2 * EDGE_COUNT) / NODE_COUNT).toFixed(1)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-400">Hub coverage (top 20)</span>
            <span className="font-mono">
              {Math.round(
                (HUBS.reduce((s, h) => s + h.total, 0) / (EDGE_COUNT * 2)) *
                  100
              )}
              %
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-400">Orphan ratio</span>
            <span className="font-mono">
              {((ORPHANS.length / NODE_COUNT) * 100).toFixed(1)}%
            </span>
          </div>
        </div>
        <p className="text-xs text-zinc-500 mt-4">
          A healthy empire has ~2-5 avg edges/skill, hubs covering 30-50% of edges,
          and &lt;5% orphans. Day14 OS is currently in healthy range.
        </p>
      </Card>

      {/* Browse all */}
      <Card title="Browse all skills">
        <p className="text-xs text-zinc-500 mb-3">Click any skill to see its neighbors</p>
        <div className="max-h-96 overflow-y-auto">
          <ul className="space-y-0.5">
            {NODES.map((n) => (
              <li key={n.id} className="text-xs">
                <Link
                  href={`/dashboard/graph?skill=${n.id}`}
                  className="font-mono text-zinc-400 hover:text-emerald-300"
                >
                  {n.id}
                </Link>
                <span className="text-zinc-600 ml-2">
                  ({n.inDegree + n.outDegree})
                </span>
              </li>
            ))}
          </ul>
        </div>
      </Card>
    </div>
  );
}

function FocusedView({
  name,
  description,
  incoming,
  outgoing,
  inDegree,
  outDegree,
}: {
  name: string;
  description: string;
  incoming: string[];
  outgoing: string[];
  inDegree: number;
  outDegree: number;
}) {
  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-6">
        <h2 className="text-2xl font-bold font-mono mb-2">{name}</h2>
        <p className="text-sm text-zinc-300 mb-4">{description}</p>
        <div className="text-xs text-zinc-500 flex gap-4">
          <span>{inDegree} skills reference this</span>
          <span>·</span>
          <span>this references {outDegree} skills</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card title={`← Referenced BY (${incoming.length})`}>
          {incoming.length === 0 ? (
            <p className="text-zinc-500 text-sm">No skills reference this one.</p>
          ) : (
            <ul className="space-y-1">
              {incoming.map((id) => (
                <li key={id} className="text-sm">
                  <Link
                    href={`/dashboard/graph?skill=${id}`}
                    className="font-mono text-zinc-300 hover:text-emerald-300"
                  >
                    {id}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title={`→ References (${outgoing.length})`}>
          {outgoing.length === 0 ? (
            <p className="text-zinc-500 text-sm">No outgoing references.</p>
          ) : (
            <ul className="space-y-1">
              {outgoing.map((id) => (
                <li key={id} className="text-sm">
                  <Link
                    href={`/dashboard/graph?skill=${id}`}
                    className="font-mono text-zinc-300 hover:text-emerald-300"
                  >
                    {id}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Link
        href="/dashboard/graph"
        className="inline-block text-sm text-zinc-400 hover:text-zinc-200"
      >
        ← back to graph overview
      </Link>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-5">
      <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-3">
        {title}
      </h3>
      {children}
    </div>
  );
}
