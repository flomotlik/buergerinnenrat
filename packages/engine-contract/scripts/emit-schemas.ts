import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { zodToJsonSchema } from 'zod-to-json-schema';
import {
  PoolSchema,
  QuotasSchema,
  RunParamsSchema,
  RunResultSchema,
  EngineEventSchema,
} from '../src/types';

const here = dirname(fileURLToPath(import.meta.url));
const out = resolve(here, '..', 'schemas');
mkdirSync(out, { recursive: true });

const items = [
  ['pool.json', PoolSchema, 'Pool'],
  ['quotas.json', QuotasSchema, 'Quotas'],
  ['run-params.json', RunParamsSchema, 'RunParams'],
  ['run-result.json', RunResultSchema, 'RunResult'],
  ['engine-event.json', EngineEventSchema, 'EngineEvent'],
] as const;

for (const [file, schema, name] of items) {
  const json = zodToJsonSchema(schema, { name, target: 'jsonSchema7' });
  writeFileSync(resolve(out, file), JSON.stringify(json, null, 2) + '\n');
  console.log('wrote', file);
}
