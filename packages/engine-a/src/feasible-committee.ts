// Build and solve the MIP that finds *one* feasible committee.
// Uses an objective vector (caller-supplied) so we can cheaply enumerate
// diverse committees by varying the weights.

import type { Pool, Quotas } from '@sortition/engine-contract';
import { buildLp, type Constraint, type LinearTerm, type LpProblem } from './lp-format';
import { loadHighs } from './highs-loader';
import type { HighsResult } from './highs-types';

export interface FeasibleCommitteeArgs {
  pool: Pool;
  quotas: Quotas;
  objective: Record<string, number>; // person_id -> coefficient (we maximize Σ obj × x)
  seed?: number;
  timeLimitSec?: number;
  // Iteration 1 panel ops (issues 22, 23): pin certain people in or out of
  // the committee. forceIn → x_i = 1, forceOut → x_i = 0.
  forceIn?: Iterable<string>;
  forceOut?: Iterable<string>;
}

export interface FeasibleCommitteeOk {
  ok: true;
  members: string[];
  objective: number;
}

export interface FeasibleCommitteeInfeasible {
  ok: false;
  status: string;
}

export type FeasibleCommitteeResult = FeasibleCommitteeOk | FeasibleCommitteeInfeasible;

function safeName(s: string): string {
  // LP names allow letters, digits, ._-. Keep it strict to avoid solver quirks.
  return s.replace(/[^A-Za-z0-9_]/g, '_');
}

export async function findFeasibleCommittee(
  args: FeasibleCommitteeArgs,
): Promise<FeasibleCommitteeResult> {
  const { pool, quotas, objective } = args;

  const varNames = pool.people.map((p, i) => ({ id: p.person_id, var: `x${i}` }));
  const idToVar = new Map(varNames.map((v) => [v.id, v.var]));

  const objectiveTerms: LinearTerm[] = varNames.map(({ id, var: v }) => ({
    coef: objective[id] ?? 0,
    var: v,
  }));

  const constraints: Constraint[] = [];

  // Panel-size constraint
  constraints.push({
    name: 'panel_size',
    terms: varNames.map(({ var: v }) => ({ coef: 1, var: v })),
    op: '=',
    rhs: quotas.panel_size,
  });

  // Optional pinning (issues 22 + 23).
  if (args.forceIn) {
    let i = 0;
    for (const id of args.forceIn) {
      const v = idToVar.get(id);
      if (v) {
        constraints.push({ name: `force_in_${i++}`, terms: [{ coef: 1, var: v }], op: '=', rhs: 1 });
      }
    }
  }
  if (args.forceOut) {
    let i = 0;
    for (const id of args.forceOut) {
      const v = idToVar.get(id);
      if (v) {
        constraints.push({ name: `force_out_${i++}`, terms: [{ coef: 1, var: v }], op: '=', rhs: 0 });
      }
    }
  }

  // For each (column, value) bound: Σ x_i ∈ [min, max]
  for (const cat of quotas.categories) {
    for (const [val, b] of Object.entries(cat.bounds)) {
      const inGroup: LinearTerm[] = [];
      for (const p of pool.people) {
        if (p[cat.column] === val) {
          inGroup.push({ coef: 1, var: idToVar.get(p.person_id)! });
        }
      }
      if (inGroup.length === 0 && (b.min > 0 || b.max < quotas.panel_size)) {
        // Empty group with non-trivial bound. min > 0 → infeasible upfront.
        if (b.min > 0) return { ok: false, status: `Empty group ${cat.column}=${val} with min=${b.min}` };
      }
      const safeCol = safeName(cat.column);
      const safeVal = safeName(val);
      constraints.push({
        name: `${safeCol}_${safeVal}_min`,
        terms: inGroup,
        op: '>=',
        rhs: b.min,
      });
      constraints.push({
        name: `${safeCol}_${safeVal}_max`,
        terms: inGroup,
        op: '<=',
        rhs: b.max,
      });
    }
  }

  const problem: LpProblem = {
    sense: 'Maximize',
    objectiveTerms,
    constraints,
    bounds: [],
    binary: varNames.map((v) => v.var),
    general: [],
  };

  const lp = buildLp(problem);
  if (process.env['ENGINE_A_DEBUG']) {
    console.error('--- LP ---');
    console.error(lp);
    console.error('--- /LP ---');
  }
  const highs = await loadHighs();
  // highs npm package parses stdout for the solution — `output_flag: false`
  // would silence the output and break the parser, so we leave it on.
  const opts: { random_seed?: number; time_limit?: number } = {};
  if (args.seed !== undefined) opts.random_seed = args.seed;
  if (args.timeLimitSec !== undefined) opts.time_limit = args.timeLimitSec;
  const sol: HighsResult = highs.solve(lp, opts);

  if (sol.Status !== 'Optimal') {
    return { ok: false, status: sol.Status };
  }

  const members: string[] = [];
  for (const { id, var: v } of varNames) {
    const col = sol.Columns[v];
    if (col && col.Primal > 0.5) members.push(id);
  }
  return { ok: true, members, objective: sol.ObjectiveValue };
}
