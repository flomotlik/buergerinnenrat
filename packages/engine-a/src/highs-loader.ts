// Lazy loader for the `highs` WASM module so the bundle stays small until
// the user actually starts a sortition run. The `highs` npm package is a
// CommonJS module — we use createRequire under Node and dynamic import in
// the browser.

import type { Highs as HighsType } from './highs-types';

let cached: HighsType | null = null;

export interface LoadHighsOptions {
  // For test environments where we want full control of WASM loading.
  // The default is good enough for both Node and browser via Vite.
  locateFile?: (file: string) => string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type HighsFactory = (opts?: any) => Promise<HighsType>;

export async function loadHighs(opts: LoadHighsOptions = {}): Promise<HighsType> {
  if (cached) return cached;
  const mod = (await import('highs')) as unknown as
    | { default: HighsFactory }
    | HighsFactory;
  const factory: HighsFactory =
    typeof (mod as { default?: unknown }).default === 'function'
      ? (mod as { default: HighsFactory }).default
      : (mod as HighsFactory);
  cached = await factory(opts);
  return cached;
}
