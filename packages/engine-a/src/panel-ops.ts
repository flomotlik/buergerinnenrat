// High-level panel operations on top of the feasibility MIP:
// - reroll: just rerun engine with a new seed (handled by the caller — no
//   special engine support needed; included here for symmetry).
// - replaceSinglePerson (issue 22): keep panel - {removed}, find one new
//   person such that the resulting panel still satisfies all quotas.
// - extendBy (issue 23): keep current panel, add N more people such that
//   the (panel ∪ new) satisfies new quotas (typically scaled).

import type { Pool, Quotas } from '@sortition/engine-contract';
import { findFeasibleCommittee } from './feasible-committee';

export interface ReplaceArgs {
  pool: Pool;
  panel: string[];
  removed: string; // person_id of someone declining the invitation
  quotas: Quotas; // original quotas
  seed: number;
}

export interface ReplaceResult {
  ok: boolean;
  replacement?: string;
  newPanel?: string[];
  error?: string;
}

export async function replaceSinglePerson(args: ReplaceArgs): Promise<ReplaceResult> {
  const remaining = args.panel.filter((id) => id !== args.removed);
  if (remaining.length === args.panel.length) {
    return { ok: false, error: `${args.removed} is not in the panel` };
  }
  // Build a feasibility MIP that:
  //  - forces all `remaining` in
  //  - forces `removed` out
  //  - applies original quotas (panel size unchanged)
  // Objective: random (no preference among feasible replacements).
  const obj: Record<string, number> = {};
  for (const p of args.pool.people) obj[p.person_id] = 0;

  const r = await findFeasibleCommittee({
    pool: args.pool,
    quotas: args.quotas,
    objective: obj,
    seed: args.seed,
    forceIn: remaining,
    forceOut: [args.removed],
  });

  if (!r.ok) return { ok: false, error: r.status };
  const newPanel = [...r.members].sort();
  const replacement = newPanel.find((id) => !remaining.includes(id));
  return { ok: true, replacement: replacement ?? '', newPanel };
}

export interface ExtendArgs {
  pool: Pool;
  panel: string[];
  newQuotas: Quotas; // panel_size of newQuotas should be > panel.length
  seed: number;
}

export interface ExtendResult {
  ok: boolean;
  added?: string[];
  newPanel?: string[];
  error?: string;
}

export async function extendBy(args: ExtendArgs): Promise<ExtendResult> {
  if (args.newQuotas.panel_size <= args.panel.length) {
    return { ok: false, error: 'newQuotas.panel_size must be > current panel size' };
  }

  const obj: Record<string, number> = {};
  for (const p of args.pool.people) obj[p.person_id] = 0;

  const r = await findFeasibleCommittee({
    pool: args.pool,
    quotas: args.newQuotas,
    objective: obj,
    seed: args.seed,
    forceIn: args.panel,
  });

  if (!r.ok) return { ok: false, error: r.status };
  const newPanel = [...r.members].sort();
  const added = newPanel.filter((id) => !args.panel.includes(id));
  return { ok: true, added, newPanel };
}
