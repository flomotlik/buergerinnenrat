// Engine-contract: shared types between Engine A (TS+highs-js), Engine B
// (Pyodide+sortition-algorithms), and Reference C (native Python). The JSON
// shapes here are the *only* coupling between engines and the rest of the app —
// downstream UI, exports, and comparison harnesses depend on these.
//
// Iteration 1 only supports algorithm: "maximin". Leximin is gurobi-gated
// upstream (see docs/upstream-verification.md) and not browser-portable.

import { z } from 'zod';

// --- Person + Pool ----------------------------------------------------------

// Attribute values are typed as string. Numeric attributes (e.g. age) are
// represented as their string form for canonical CSV-round-tripping; engines
// may parse them on demand.
export const PersonSchema = z
  .object({
    person_id: z.string().min(1),
  })
  .catchall(z.string());

export type Person = z.infer<typeof PersonSchema>;

export const PoolSchema = z.object({
  id: z.string().min(1),
  people: z.array(PersonSchema).min(1),
});

export type Pool = z.infer<typeof PoolSchema>;

// --- Quotas ----------------------------------------------------------------

export const QuotaBoundSchema = z
  .object({
    min: z.number().int().nonnegative(),
    max: z.number().int().nonnegative(),
  })
  .refine((b) => b.max >= b.min, { message: 'max must be >= min' });

export type QuotaBound = z.infer<typeof QuotaBoundSchema>;

export const CategoryQuotaSchema = z.object({
  column: z.string().min(1),
  bounds: z.record(z.string(), QuotaBoundSchema),
});

export type CategoryQuota = z.infer<typeof CategoryQuotaSchema>;

export const QuotasSchema = z.object({
  panel_size: z.number().int().positive(),
  categories: z.array(CategoryQuotaSchema).min(1),
});

export type Quotas = z.infer<typeof QuotasSchema>;

// --- Run parameters --------------------------------------------------------

export const RunParamsSchema = z.object({
  seed: z.number().int(),
  algorithm: z.literal('maximin'),
  timeout_ms: z.number().int().positive().optional(),
});

export type RunParams = z.infer<typeof RunParamsSchema>;

// --- Run result ------------------------------------------------------------

export const QuotaFulfillmentSchema = z.object({
  column: z.string(),
  value: z.string(),
  selected: z.number().int().nonnegative(),
  bound_min: z.number().int().nonnegative(),
  bound_max: z.number().int().nonnegative(),
  ok: z.boolean(),
});

export type QuotaFulfillment = z.infer<typeof QuotaFulfillmentSchema>;

export const TimingSchema = z.object({
  total_ms: z.number().nonnegative(),
  initial_committees_ms: z.number().nonnegative().optional(),
  lp_solve_ms: z.number().nonnegative().optional(),
  num_committees: z.number().int().nonnegative().optional(),
});

export type Timing = z.infer<typeof TimingSchema>;

export const EngineMetaSchema = z.object({
  engine_id: z.enum(['engine-a-highs', 'engine-b-pyodide', 'reference-c-native']),
  engine_version: z.string(),
  solver: z.string(),
  algorithm: z.literal('maximin'),
});

export type EngineMeta = z.infer<typeof EngineMetaSchema>;

export const RunResultSchema = z.object({
  selected: z.array(z.string()).min(1),
  marginals: z.record(z.string(), z.number().min(0).max(1)),
  quota_fulfillment: z.array(QuotaFulfillmentSchema),
  timing: TimingSchema,
  engine_meta: EngineMetaSchema,
  // Optional probability distribution over committees, when the engine surfaces it.
  // The marginals must equal Σ committee_probs[i] · 1{person ∈ committee_i}.
  committees: z
    .array(
      z.object({
        members: z.array(z.string()).min(1),
        probability: z.number().min(0).max(1),
      }),
    )
    .optional(),
});

export type RunResult = z.infer<typeof RunResultSchema>;

// --- Engine events (streamed back to UI) -----------------------------------

export const EngineEventSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('progress'),
    phase: z.string(),
    fraction: z.number().min(0).max(1).optional(),
    message: z.string().optional(),
  }),
  z.object({
    type: z.literal('log'),
    level: z.enum(['debug', 'info', 'warn', 'error']),
    message: z.string(),
  }),
  z.object({
    type: z.literal('done'),
    result: RunResultSchema,
  }),
  z.object({
    type: z.literal('error'),
    code: z.string(),
    message: z.string(),
    detail: z.unknown().optional(),
  }),
]);

export type EngineEvent = z.infer<typeof EngineEventSchema>;

// --- Engine interface -------------------------------------------------------

export interface SortitionEngine {
  readonly meta: Pick<EngineMeta, 'engine_id' | 'engine_version'>;
  run(args: { pool: Pool; quotas: Quotas; params: RunParams }): AsyncIterable<EngineEvent>;
}
