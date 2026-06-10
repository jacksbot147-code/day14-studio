/**
 * registry-loader — lazy access to the generated skill registry + graph.
 *
 * skill-registry.generated.ts and skill-graph.generated.ts are large
 * (~3,600 LOC each). Statically importing them from every lib module
 * forces them into each consumer's bundle/startup path. This module
 * dynamic-imports them once, caches the module promise, and exposes
 * async accessors.
 *
 * Types are re-exported statically — type-only imports are free.
 *
 * Dashboard pages keep their static imports (they render the full
 * registry anyway); lib-side consumers go through this loader.
 */

import type { SkillEntry } from "./skill-registry.generated";
import type { GraphNode, GraphEdge } from "./skill-graph.generated";

export type { SkillEntry, GraphNode, GraphEdge };

type RegistryModule = typeof import("./skill-registry.generated");
type GraphModule = typeof import("./skill-graph.generated");

let registryPromise: Promise<RegistryModule> | null = null;
let graphPromise: Promise<GraphModule> | null = null;

/** Lazy-load the generated skill registry (cached promise). */
export function getRegistry(): Promise<RegistryModule> {
  if (!registryPromise) {
    registryPromise = import("./skill-registry.generated");
  }
  return registryPromise;
}

/** Lazy-load the generated skill graph (cached promise). */
export function getGraph(): Promise<GraphModule> {
  if (!graphPromise) {
    graphPromise = import("./skill-graph.generated");
  }
  return graphPromise;
}

// ---- async convenience wrappers over the registry ----

export async function findSkill(name: string): Promise<SkillEntry | undefined> {
  const reg = await getRegistry();
  return reg.findSkill(name);
}

export async function findSkillsByTrigger(input: string): Promise<SkillEntry[]> {
  const reg = await getRegistry();
  return reg.findSkillsByTrigger(input);
}

export async function getSkills(): Promise<readonly SkillEntry[]> {
  const reg = await getRegistry();
  return reg.SKILLS;
}

export async function getSkillNames(): Promise<readonly string[]> {
  const reg = await getRegistry();
  return reg.SKILL_NAMES;
}
