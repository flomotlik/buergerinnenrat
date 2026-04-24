import { EngineA } from '@sortition/engine-a';
import type { EngineEvent, Pool, Quotas, RunResult } from '@sortition/engine-contract';

export interface RunArgs {
  pool: Pool;
  quotas: Quotas;
  seed: number;
  onProgress: (msg: string, fraction?: number) => void;
  onLog: (msg: string) => void;
}

export interface RunOutcome {
  ok: boolean;
  result?: RunResult;
  error?: { code: string; message: string };
  duration_ms: number;
}

export async function runEngineA(args: RunArgs, signal?: AbortSignal): Promise<RunOutcome> {
  const t0 = performance.now();
  const engine = new EngineA();
  let outcome: RunOutcome | null = null;
  const iter = engine.run({
    pool: args.pool,
    quotas: args.quotas,
    params: { seed: args.seed, algorithm: 'maximin' },
  });
  for await (const ev of iter as AsyncIterable<EngineEvent>) {
    if (signal?.aborted) {
      return { ok: false, error: { code: 'aborted', message: 'cancelled' }, duration_ms: performance.now() - t0 };
    }
    if (ev.type === 'progress') {
      args.onProgress(`${ev.phase}${ev.message ? ': ' + ev.message : ''}`, ev.fraction);
    } else if (ev.type === 'log') {
      args.onLog(`[${ev.level}] ${ev.message}`);
    } else if (ev.type === 'done') {
      outcome = { ok: true, result: ev.result, duration_ms: performance.now() - t0 };
    } else if (ev.type === 'error') {
      outcome = {
        ok: false,
        error: { code: ev.code, message: ev.message },
        duration_ms: performance.now() - t0,
      };
    }
  }
  return outcome ?? { ok: false, error: { code: 'no_result', message: 'engine produced no event' }, duration_ms: performance.now() - t0 };
}
