// Maximin primal LP: given a fixed set of feasible committees, find a
// distribution π over committees that maximizes the minimum agent
// selection probability.
//
//   max z
//   s.t.  z ≤ Σ_{C ∋ i} π_C    ∀ agent i
//         Σ_C π_C = 1
//         π_C ≥ 0,  z free

import type { Pool } from '@sortition/engine-contract';
import { buildLp, type Constraint, type LinearTerm, type LpProblem } from './lp-format';
import { loadHighs } from './highs-loader';

export interface MaximinSolution {
  probabilities: number[]; // same order as committees
  marginals: Record<string, number>; // person_id -> probability of selection
  z: number;
  agent_duals: Record<string, number>; // dual prices for column generation
}

export async function solveMaximinPrimal(
  pool: Pool,
  committees: string[][], // each is a list of person_ids
): Promise<MaximinSolution> {
  if (committees.length === 0) throw new Error('no committees');

  const piVars = committees.map((_, j) => `pi${j}`);
  const Z = 'z';

  // For each agent i: define agent constraint a_i: Σ π_C (for C ∋ i) - z >= 0
  // Equivalent: z <= Σ π_C for C ∋ i, i.e. z - Σ π_C <= 0
  const agentNames = pool.people.map((p, i) => ({ id: p.person_id, row: `a${i}` }));
  const constraints: Constraint[] = [];
  for (let i = 0; i < pool.people.length; i++) {
    const id = pool.people[i]!.person_id;
    const terms: LinearTerm[] = [];
    for (let j = 0; j < committees.length; j++) {
      if (committees[j]!.includes(id)) {
        terms.push({ coef: 1, var: piVars[j]! });
      }
    }
    terms.push({ coef: -1, var: Z });
    constraints.push({
      name: agentNames[i]!.row,
      terms,
      op: '>=',
      rhs: 0,
    });
  }

  // Σ π_C = 1
  constraints.push({
    name: 'sum_pi',
    terms: piVars.map((v) => ({ coef: 1, var: v })),
    op: '=',
    rhs: 1,
  });

  const problem: LpProblem = {
    sense: 'Maximize',
    objectiveTerms: [{ coef: 1, var: Z }],
    constraints,
    bounds: [
      { var: Z, lb: -1, ub: 1 },
      ...piVars.map((v) => ({ var: v, lb: 0, ub: 1 })),
    ],
    binary: [],
    general: [],
  };

  const lp = buildLp(problem);
  const highs = await loadHighs();
  const sol = highs.solve(lp);

  if (sol.Status !== 'Optimal') {
    throw new Error(`maximin LP non-optimal: ${sol.Status}`);
  }

  const probs: number[] = piVars.map((v) => Math.max(0, sol.Columns[v]?.Primal ?? 0));
  const sumP = probs.reduce((a, b) => a + b, 0) || 1;
  const normalized = probs.map((p) => p / sumP);

  const marginals: Record<string, number> = {};
  for (const p of pool.people) marginals[p.person_id] = 0;
  for (let j = 0; j < committees.length; j++) {
    const w = normalized[j]!;
    for (const id of committees[j]!) marginals[id] = (marginals[id] ?? 0) + w;
  }

  // Extract dual prices on agent rows for potential column generation.
  // Highs returns Rows in the order they appear in the LP.
  const agent_duals: Record<string, number> = {};
  for (let i = 0; i < pool.people.length; i++) {
    const row = sol.Rows[i];
    if (row) agent_duals[agentNames[i]!.id] = row.Dual ?? 0;
  }

  const z = sol.Columns[Z]?.Primal ?? 0;
  return { probabilities: normalized, marginals, z, agent_duals };
}
