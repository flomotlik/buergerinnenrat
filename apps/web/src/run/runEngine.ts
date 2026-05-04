import { EngineA } from '@sortition/engine-a';
import type { EngineEvent, Pool, Quotas, RunResult } from '@sortition/engine-contract';
import {
  applyOverrideToQuotas,
  validateOverride,
  type SeatAllocationOverride,
} from '../quotas/seat-allocation';

export interface RunArgs {
  pool: Pool;
  quotas: Quotas;
  seed: number;
  onProgress: (msg: string, fraction?: number) => void;
  onLog: (msg: string) => void;
  /**
   * Optional 1-D seat-allocation override. When set, the runner runs a
   * pre-flight validation (axis exists, Σ matches panel_size, no negatives,
   * pool-capacity check, rationale ≥ 20 chars, ISO timestamp) BEFORE invoking
   * the LP solver. On invalid → returns code='override_invalid' WITHOUT
   * calling engine.run, so the user gets a precise message instead of a
   * generic infeasible_quotas LP error (Pitfall 2).
   *
   * On valid → applyOverrideToQuotas collapses the bounds of the chosen
   * axis to {min: n, max: n} and the engine sees the post-override LP.
   */
  override?: SeatAllocationOverride | null;
}

export interface RunOutcome {
  ok: boolean;
  result?: RunResult;
  error?: { code: string; message: string };
  duration_ms: number;
  /**
   * The quotas actually passed to engine.run after override composition.
   * When override is null/undefined, equals the input quotas. The caller
   * uses this to compute input_sha256 over the actual LP input (Pitfall 4).
   */
  effectiveQuotas?: Quotas;
}

export async function runEngineA(args: RunArgs, signal?: AbortSignal): Promise<RunOutcome> {
  const t0 = performance.now();

  // Pre-flight validation when an override is present. If it fails, return
  // before allocating an EngineA instance — the user sees the specific
  // override error, not a generic LP-infeasibility message.
  if (args.override) {
    const validation = validateOverride(args.pool.people, args.quotas.panel_size, args.override);
    if (!validation.ok) {
      return {
        ok: false,
        error: { code: 'override_invalid', message: validation.errors.join(' ') },
        duration_ms: performance.now() - t0,
      };
    }
  }

  const effectiveQuotas = applyOverrideToQuotas(args.quotas, args.override ?? null);

  const engine = new EngineA();
  let outcome: RunOutcome | null = null;
  const iter = engine.run({
    pool: args.pool,
    quotas: effectiveQuotas,
    params: { seed: args.seed, algorithm: 'maximin' },
  });
  for await (const ev of iter as AsyncIterable<EngineEvent>) {
    if (signal?.aborted) {
      return {
        ok: false,
        error: { code: 'aborted', message: 'cancelled' },
        duration_ms: performance.now() - t0,
        effectiveQuotas,
      };
    }
    if (ev.type === 'progress') {
      args.onProgress(`${ev.phase}${ev.message ? ': ' + ev.message : ''}`, ev.fraction);
    } else if (ev.type === 'log') {
      args.onLog(`[${ev.level}] ${ev.message}`);
    } else if (ev.type === 'done') {
      outcome = {
        ok: true,
        result: ev.result,
        duration_ms: performance.now() - t0,
        effectiveQuotas,
      };
    } else if (ev.type === 'error') {
      outcome = {
        ok: false,
        error: { code: ev.code, message: ev.message },
        duration_ms: performance.now() - t0,
        effectiveQuotas,
      };
    }
  }
  return (
    outcome ?? {
      ok: false,
      error: { code: 'no_result', message: 'engine produced no event' },
      duration_ms: performance.now() - t0,
      effectiveQuotas,
    }
  );
}
