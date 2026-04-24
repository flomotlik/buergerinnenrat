import { PoolSchema, QuotasSchema, RunResultSchema, type Pool, type Quotas, type RunResult } from './types';

export function validatePool(value: unknown): Pool {
  return PoolSchema.parse(value);
}

export function validateQuotas(value: unknown): Quotas {
  return QuotasSchema.parse(value);
}

export function validateRunResult(value: unknown): RunResult {
  return RunResultSchema.parse(value);
}
