// Engine A — TypeScript-only Maximin via highs-js.
//
// Strategy for iteration 1: a multi-start MIP heuristic with light column
// generation.
//
// 1. Generate K initial feasible committees by running the feasibility MIP
//    K times with random objective vectors. (This explores the polytope of
//    feasible committees without a dual price loop.)
// 2. Solve the maximin primal LP over the K committees → optimal mixing
//    weights π* and dual prices y_i.
// 3. *Optional* column generation: run the feasibility MIP again with the
//    dual prices y as objective. If the resulting committee improves z*,
//    add it and re-solve the primal. Cap iterations at MAX_CG_ITER.
// 4. Sample one committee from the optimal distribution using a seeded RNG.
// 5. Build the RunResult.
//
// We deliberately do *not* implement Pipage rounding for iteration 1 — for
// a single-draw output, sampling from the discrete distribution gives the
// correct marginals in expectation. Pipage is only relevant if we want to
// guarantee fixed integer counts per draw, which is not part of the
// iteration-1 acceptance criteria. (The marginals reported here are exact
// from the LP, not from sampling.)

import seedrandom from 'seedrandom';

import type {
  EngineEvent,
  Pool,
  Quotas,
  RunParams,
  RunResult,
  SortitionEngine,
} from '@sortition/engine-contract';
import { findFeasibleCommittee } from './feasible-committee';
import { solveMaximinPrimal } from './maximin-lp';

const ENGINE_VERSION = '0.1.0';
const SOLVER_ID = 'highs@1.8.0 (wasm)';

function uncoveredAfterCG(pool: { people: { person_id: string }[] }, committees: string[][]): number {
  const seen = new Set<string>();
  for (const c of committees) for (const id of c) seen.add(id);
  return pool.people.filter((p) => !seen.has(p.person_id)).length;
}

export interface EngineAOptions {
  // Number of initial feasible committees to generate. Higher = better
  // approximation, slower. Default 12 trades off well for n≤2000.
  initialCommittees?: number;
  // Cap on column-generation iterations. Set to 0 to skip CG entirely.
  maxColumnGenerationIters?: number;
  // EPS for "improving committee" detection. y'·committee > z* + EPS_IMPROVE.
  epsImprove?: number;
}

export class EngineA implements SortitionEngine {
  readonly meta = { engine_id: 'engine-a-highs' as const, engine_version: ENGINE_VERSION };
  readonly opts: Required<EngineAOptions>;

  constructor(opts: EngineAOptions = {}) {
    this.opts = {
      initialCommittees: opts.initialCommittees ?? 6,
      // Scaled to roughly cover (pool / panel × 1.5) at runtime via run()
      // when it sees the pool — but pre-set a sensible upper bound here.
      maxColumnGenerationIters: opts.maxColumnGenerationIters ?? 50,
      epsImprove: opts.epsImprove ?? 1e-6,
    };
  }

  async *run(args: { pool: Pool; quotas: Quotas; params: RunParams }): AsyncIterable<EngineEvent> {
    const t0 = performance.now();
    const { pool, quotas, params } = args;
    const rng = seedrandom(String(params.seed));

    yield { type: 'progress', phase: 'initial-committees', fraction: 0 };

    // 1. Initial committees with random objectives.
    const committees: string[][] = [];
    const seen = new Set<string>();
    let firstAttempt = true;
    let lastInfeasibleStatus: string | null = null;

    for (let k = 0; k < this.opts.initialCommittees; k++) {
      const obj: Record<string, number> = {};
      for (const p of pool.people) obj[p.person_id] = firstAttempt ? 1 : rng();
      const r = await findFeasibleCommittee({
        pool,
        quotas,
        objective: obj,
        seed: params.seed + k,
      });
      if (!r.ok) {
        if (committees.length === 0) {
          lastInfeasibleStatus = r.status;
          continue;
        }
        // After we've found at least one, infeasibles in later iterations
        // are spurious (numerical) — just stop generating new committees.
        break;
      }
      const key = [...r.members].sort().join('|');
      if (!seen.has(key)) {
        seen.add(key);
        committees.push(r.members);
      }
      firstAttempt = false;
      yield {
        type: 'progress',
        phase: 'initial-committees',
        fraction: (k + 1) / this.opts.initialCommittees,
      };
    }

    if (committees.length === 0) {
      yield {
        type: 'error',
        code: 'infeasible_quotas',
        message: lastInfeasibleStatus ?? 'No feasible committee found.',
      };
      return;
    }

    yield {
      type: 'log',
      level: 'info',
      message: `${committees.length} unique initial committees`,
    };

    // 2. Initial maximin solve.
    let solution = await solveMaximinPrimal(pool, committees);
    yield { type: 'progress', phase: 'maximin-lp', fraction: 0.5, message: `z = ${solution.z.toFixed(4)}` };

    // 3. Hybrid column generation:
    //    a) Coverage phase: while at least one agent has marginal == 0, run
    //       MIP with positive coefficients on a *bounded* set of uncovered
    //       agents (size ≈ panel_size × 2 to give the solver room) and
    //       strong negative coefficients on already-covered ones.
    //    b) Dual-price phase: once everyone is covered (z* > 0), use the
    //       primal LP's dual prices as MIP objective. If MIP optimum > z* +
    //       eps → improving committee found; add it.
    //
    //    A pure dual-price CG starting from z*=0 stalls because in the
    //    degenerate-LP corner the duals are 0/1 indicator of uncovered,
    //    which itself is the coverage heuristic. We just do (a) explicitly
    //    until we leave the degenerate corner, then switch to (b).
    // Track which agents have been seen in *any* committee so far. Distinct
    // from "marginal > 0", because the maximin LP can put zero weight on
    // committees while z*=0; an agent that's in some committee but receives
    // 0 LP weight still has marginal=0 and shouldn't trigger another
    // coverage iteration aimed at it.
    const everCovered = new Set<string>();
    for (const c of committees) for (const id of c) everCovered.add(id);

    let stalledIters = 0;
    for (let iter = 0; iter < this.opts.maxColumnGenerationIters; iter++) {
      const uncovered = pool.people.filter((p) => !everCovered.has(p.person_id));

      const obj: Record<string, number> = {};
      if (uncovered.length > 0) {
        const shuffled = [...uncovered].sort(() => rng() - 0.5);
        const target = new Set(shuffled.slice(0, quotas.panel_size * 2).map((a) => a.person_id));
        for (const p of pool.people) {
          if (target.has(p.person_id)) {
            obj[p.person_id] = 100 + rng() * 5;
          } else if (everCovered.has(p.person_id)) {
            obj[p.person_id] = -50 + rng() * 0.1;
          } else {
            obj[p.person_id] = 5 + rng() * 1;
          }
        }
      } else {
        for (const p of pool.people) obj[p.person_id] = solution.agent_duals[p.person_id] ?? 0;
      }

      const r = await findFeasibleCommittee({
        pool,
        quotas,
        objective: obj,
        seed: params.seed + 1000 + iter,
      });
      if (!r.ok) break;
      const key = [...r.members].sort().join('|');
      if (seen.has(key)) {
        stalledIters += 1;
        if (stalledIters > 3) break;
        continue;
      }
      stalledIters = 0;
      seen.add(key);
      committees.push(r.members);
      for (const id of r.members) everCovered.add(id);
      const wasCovered = uncovered.length === 0;
      // Skip the LP solve during the coverage phase — z stays at 0 until
      // every agent is in *some* committee, so the LP just confirms what
      // we already know. Solve only when we've just achieved coverage or
      // we're already in the dual-price phase.
      const justCovered = !wasCovered && uncovered.length - r.members.filter((id) => !everCovered.has(id) /* always false now */).length === 0;
      const newUncov = pool.people.filter((p) => !everCovered.has(p.person_id)).length;
      let improved = false;
      if (newUncov === 0 || iter % 5 === 0 || wasCovered) {
        const next = await solveMaximinPrimal(pool, committees);
        improved = next.z > solution.z + this.opts.epsImprove;
        solution = next;
      }
      yield {
        type: 'progress',
        phase: 'column-generation',
        fraction: 0.6 + (iter + 1) / (this.opts.maxColumnGenerationIters * 4),
        message: `iter ${iter + 1}: z = ${solution.z.toFixed(4)}, |C| = ${committees.length}, uncov=${newUncov}, improved=${improved}`,
      };
      // suppress unused-var warning while keeping the comment trail
      void justCovered;
      if (wasCovered && !improved) break;
    }

    // Final LP solve to ensure marginals reflect the full committee set.
    if (uncoveredAfterCG(pool, committees) === 0) {
      const final = await solveMaximinPrimal(pool, committees);
      if (final.z >= solution.z) solution = final;
    }

    // 4. Sample one committee from the distribution.
    const u = rng();
    let acc = 0;
    let chosenIdx = solution.probabilities.length - 1;
    for (let j = 0; j < solution.probabilities.length; j++) {
      acc += solution.probabilities[j]!;
      if (u <= acc) {
        chosenIdx = j;
        break;
      }
    }
    const selected = [...committees[chosenIdx]!].sort();

    // 5. Compute quota fulfillment for the *sampled* committee.
    const quotaFulfillment = quotas.categories.flatMap((cat) =>
      Object.entries(cat.bounds).map(([val, b]) => {
        const count = pool.people.filter(
          (p) => selected.includes(p.person_id) && p[cat.column] === val,
        ).length;
        return {
          column: cat.column,
          value: val,
          selected: count,
          bound_min: b.min,
          bound_max: b.max,
          ok: count >= b.min && count <= b.max,
        };
      }),
    );

    const t1 = performance.now();
    const result: RunResult = {
      selected,
      marginals: solution.marginals,
      quota_fulfillment: quotaFulfillment,
      timing: {
        total_ms: t1 - t0,
        num_committees: committees.length,
      },
      engine_meta: {
        engine_id: 'engine-a-highs',
        engine_version: ENGINE_VERSION,
        solver: SOLVER_ID,
        algorithm: 'maximin',
      },
      committees: committees.map((members, j) => ({
        members,
        probability: solution.probabilities[j] ?? 0,
      })),
    };

    yield { type: 'done', result };
  }
}
