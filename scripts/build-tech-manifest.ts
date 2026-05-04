#!/usr/bin/env tsx
/*
 * build-tech-manifest.ts — generate apps/web/src/generated/tech-manifest.ts
 * from the workspace package.json files plus a curated map of human-readable
 * purposes. The generated file is checked in; CI runs this script as a
 * prebuild step and fails if `git diff` reports drift (see Task 9 of #54).
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

export interface TechEntry {
  name: string;
  version: string;
  license: string;
  kind: 'runtime' | 'build' | 'test';
  purpose: string;
  sourceUrl?: string;
}

interface PackageJson {
  name?: string;
  version?: string;
  license?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

/**
 * Curated metadata for direct dependencies. Keys are the package name as it
 * appears in package.json. `purpose` is plain-language German because it is
 * displayed in the user-facing Technik docs page; other fields are filled in
 * by reading node_modules/<pkg>/package.json.
 */
const PURPOSE_MAP: Record<
  string,
  { kind: TechEntry['kind']; purpose: string; sourceUrl?: string }
> = {
  'solid-js': {
    kind: 'runtime',
    purpose: 'Reaktives UI-Framework für die Single-Page-App.',
    sourceUrl: 'https://www.solidjs.com/',
  },
  vite: {
    kind: 'build',
    purpose: 'Build- und Dev-Server (Bundling, HMR, Asset-Pipeline).',
    sourceUrl: 'https://vitejs.dev/',
  },
  tailwindcss: {
    kind: 'build',
    purpose: 'Utility-CSS-Framework für das Layout.',
    sourceUrl: 'https://tailwindcss.com/',
  },
  '@tailwindcss/typography': {
    kind: 'build',
    purpose: 'Typography-Plugin für die Doku-Sub-Pages (prose-Stil).',
    sourceUrl: 'https://github.com/tailwindlabs/tailwindcss-typography',
  },
  '@tailwindcss/forms': {
    kind: 'build',
    purpose: 'Form-Style-Plugin (class-Strategy) für konsistente Eingabefelder.',
    sourceUrl: 'https://github.com/tailwindlabs/tailwindcss-forms',
  },
  papaparse: {
    kind: 'runtime',
    purpose: 'CSV-Parser im Browser (Melderegister-Import).',
    sourceUrl: 'https://www.papaparse.com/',
  },
  '@kobalte/core': {
    kind: 'runtime',
    purpose: 'A11y-Primitive-Bibliothek für Solid (Tabs, Dialogs etc.).',
    sourceUrl: 'https://kobalte.dev/',
  },
  highs: {
    kind: 'runtime',
    purpose: 'HiGHS-Solver für Stage 3 (Maximin) als WASM.',
    sourceUrl: 'https://highs.dev/',
  },
  xlsx: {
    kind: 'runtime',
    purpose:
      'Excel-Parser und -Writer (SheetJS Community Edition) für .xlsx-Upload und -Export. Lazy-geladen, nur bei Bedarf.',
    sourceUrl: 'https://sheetjs.com/',
  },
  vitest: {
    kind: 'test',
    purpose: 'Unit-Test-Runner.',
    sourceUrl: 'https://vitest.dev/',
  },
  '@playwright/test': {
    kind: 'test',
    purpose: 'End-to-End-Tests in echten Browsern.',
    sourceUrl: 'https://playwright.dev/',
  },
  '@axe-core/playwright': {
    kind: 'test',
    purpose: 'Automatisierte Barrierefreiheits-Prüfung (WCAG 2 A/AA) der gerenderten Seiten in Playwright-Specs.',
    sourceUrl: 'https://github.com/dequelabs/axe-core-npm/tree/develop/packages/playwright',
  },
  eslint: {
    kind: 'test',
    purpose: 'Linter für TypeScript.',
    sourceUrl: 'https://eslint.org/',
  },
  prettier: {
    kind: 'test',
    purpose: 'Code-Formatierer.',
    sourceUrl: 'https://prettier.io/',
  },
  typescript: {
    kind: 'build',
    purpose: 'Typed-JavaScript-Compiler.',
    sourceUrl: 'https://www.typescriptlang.org/',
  },
  tsx: {
    kind: 'build',
    purpose: 'TypeScript-Runner für Build-Skripte.',
    sourceUrl: 'https://github.com/privatenumber/tsx',
  },
  'vite-plugin-solid': {
    kind: 'build',
    purpose: 'Solid-Integration für Vite.',
    sourceUrl: 'https://github.com/solidjs/vite-plugin-solid',
  },
  '@types/node': {
    kind: 'build',
    purpose: 'TypeScript-Typen für Node-APIs (Build-Skripte).',
  },
  '@types/papaparse': {
    kind: 'build',
    purpose: 'TypeScript-Typen für papaparse.',
  },
  '@types/seedrandom': {
    kind: 'build',
    purpose: 'TypeScript-Typen für seedrandom (Cross-Validation in Tests).',
  },
  '@typescript-eslint/eslint-plugin': {
    kind: 'test',
    purpose: 'ESLint-Regeln für TypeScript.',
    sourceUrl: 'https://typescript-eslint.io/',
  },
  '@typescript-eslint/parser': {
    kind: 'test',
    purpose: 'ESLint-Parser für TypeScript.',
    sourceUrl: 'https://typescript-eslint.io/',
  },
  autoprefixer: {
    kind: 'build',
    purpose: 'CSS-Vendor-Präfixe für ältere Browser.',
    sourceUrl: 'https://github.com/postcss/autoprefixer',
  },
  'eslint-plugin-solid': {
    kind: 'test',
    purpose: 'ESLint-Regeln für Solid.',
    sourceUrl: 'https://github.com/solidjs-community/eslint-plugin-solid',
  },
  jsdom: {
    kind: 'test',
    purpose: 'DOM-Implementierung für Vitest (Browser-API-Stub im Test).',
    sourceUrl: 'https://github.com/jsdom/jsdom',
  },
  postcss: {
    kind: 'build',
    purpose: 'CSS-Toolchain (Tailwind- und Autoprefixer-Pipeline).',
    sourceUrl: 'https://postcss.org/',
  },
  seedrandom: {
    kind: 'test',
    purpose: 'Alternativer PRNG für Cross-Validation-Tests.',
    sourceUrl: 'https://github.com/davidbau/seedrandom',
  },
  zod: {
    kind: 'runtime',
    purpose: 'Schema-Validierung (z. B. Audit-JSON-Form).',
    sourceUrl: 'https://zod.dev/',
  },
  'zod-to-json-schema': {
    kind: 'build',
    purpose: 'JSON-Schema-Export aus Zod-Schemas.',
    sourceUrl: 'https://github.com/StefanTerdell/zod-to-json-schema',
  },
};

/** Manually-supplied entries that have no node_modules counterpart. */
const SPECIAL_ENTRIES: ReadonlyArray<TechEntry> = [
  {
    name: 'Web Crypto API',
    version: 'browser-standard',
    license: 'W3C Recommendation',
    kind: 'runtime',
    purpose: 'Ed25519/ECDSA-Signatur des Audit-JSON.',
    sourceUrl: 'https://www.w3.org/TR/WebCryptoAPI/',
  },
  {
    name: 'Mulberry32 PRNG',
    version: 'own-implementation (packages/core)',
    license: 'Public Domain',
    kind: 'runtime',
    purpose:
      'Deterministische Pseudo-Zufallszahlen für Fisher-Yates. KEIN Crypto-RNG — siehe Limitationen.',
    sourceUrl:
      'https://github.com/bryc/code/blob/master/jshash/PRNGs.md#mulberry32',
  },
  {
    name: 'Hamilton Apportionment',
    version: 'own-implementation (packages/core)',
    license: 'GPL-3.0-or-later (this repo)',
    kind: 'runtime',
    purpose:
      'Stratifizierte Quoten-Allokation (Largest-Remainder-Methode, 1792).',
    sourceUrl: 'https://en.wikipedia.org/wiki/Largest_remainders_method',
  },
  {
    name: 'Fisher-Yates Shuffle',
    version: 'own-implementation (packages/core)',
    license: 'Public Domain (algorithm)',
    kind: 'runtime',
    purpose:
      'Uniformer Shuffle in O(n) für die Auswahl innerhalb einer Stratum-Gruppe.',
    sourceUrl: 'https://en.wikipedia.org/wiki/Fisher%E2%80%93Yates_shuffle',
  },
];

function readJsonIfExists(path: string): PackageJson | null {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as PackageJson;
  } catch {
    return null;
  }
}

/** Extract a normalized license string from a package.json. */
function readLicense(pkg: PackageJson | null): string {
  if (!pkg) return 'unknown';
  const lic = pkg.license;
  if (typeof lic === 'string' && lic.length > 0) return lic;
  return 'unknown';
}

/**
 * Resolve a package's package.json by trying common pnpm layouts:
 *   1. <root>/node_modules/<name>/package.json (hoisted, npm-style)
 *   2. <root>/apps/web/node_modules/<name>/package.json (workspace symlink)
 *   3. <root>/node_modules/.pnpm/<name>@*\/node_modules/<name>/package.json
 *      (pnpm content-addressed store)
 *
 * The third lookup picks the highest version directory if multiple are
 * present; in practice pnpm dedupes so there is only one.
 */
function lookupInstalled(
  rootDir: string,
  name: string,
): { version: string; license: string } {
  const candidates: string[] = [
    resolve(rootDir, 'node_modules', name, 'package.json'),
    resolve(rootDir, 'apps/web/node_modules', name, 'package.json'),
  ];
  for (const path of candidates) {
    const pkg = readJsonIfExists(path);
    if (pkg) {
      return {
        version: pkg.version ?? 'unknown',
        license: readLicense(pkg),
      };
    }
  }
  // pnpm content-addressed store fallback. Read the directory and pick the
  // first matching `<name>@<version>` entry.
  const pnpmDir = resolve(rootDir, 'node_modules/.pnpm');
  if (existsSync(pnpmDir)) {
    try {
      // Lazy require keeps top-of-file import list stable for tests.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { readdirSync } = require('node:fs') as typeof import('node:fs');
      const escName = name.replace(/\//g, '+');
      const entries = readdirSync(pnpmDir).filter(
        (d) => d.startsWith(`${escName}@`) || d.startsWith(`${name}@`),
      );
      if (entries.length > 0) {
        const entry = entries[0]!;
        const pkgPath = resolve(
          pnpmDir,
          entry,
          'node_modules',
          name,
          'package.json',
        );
        const pkg = readJsonIfExists(pkgPath);
        if (pkg) {
          return {
            version: pkg.version ?? 'unknown',
            license: readLicense(pkg),
          };
        }
      }
    } catch {
      // ignore — fall through to "unknown"
    }
  }
  return { version: 'not-installed', license: 'unknown' };
}

/** Collect every direct dependency name across root + workspaces. */
function collectDirectDeps(rootDir: string): Set<string> {
  const out = new Set<string>();
  const inputs = [
    resolve(rootDir, 'package.json'),
    resolve(rootDir, 'apps/web/package.json'),
    resolve(rootDir, 'packages/core/package.json'),
    resolve(rootDir, 'packages/engine-a/package.json'),
    resolve(rootDir, 'packages/engine-contract/package.json'),
  ];
  for (const path of inputs) {
    const pkg = readJsonIfExists(path);
    if (!pkg) continue;
    for (const name of Object.keys(pkg.dependencies ?? {})) out.add(name);
    for (const name of Object.keys(pkg.devDependencies ?? {})) out.add(name);
  }
  // Workspace-internal packages (`@sortition/*`) are not third-party — skip.
  for (const name of Array.from(out)) {
    if (name.startsWith('@sortition/')) out.delete(name);
  }
  return out;
}

/**
 * Build the tech-manifest array. Pure function: takes a repo-root path,
 * returns the entries. The CLI wrapper at the bottom of the file invokes
 * this and writes the TS file; tests invoke this directly.
 */
export function buildManifest(rootDir: string): TechEntry[] {
  const entries: TechEntry[] = [];
  const deps = collectDirectDeps(rootDir);
  // Stable order: alphabetical by package name. Re-running the generator on
  // identical inputs must produce a byte-identical file (Drift-Check, Task 9).
  const sortedNames = Array.from(deps).sort();
  for (const name of sortedNames) {
    const meta = PURPOSE_MAP[name];
    if (!meta) {
      // Unknown dep — surface in the manifest with a TODO purpose so a
      // human notices and either adds it to PURPOSE_MAP or removes the
      // dependency from package.json.
      const installed = lookupInstalled(rootDir, name);
      entries.push({
        name,
        version: installed.version,
        license: installed.license,
        kind: 'runtime',
        purpose: 'TODO — add description to scripts/build-tech-manifest.ts.',
      });
      continue;
    }
    const installed = lookupInstalled(rootDir, name);
    entries.push({
      name,
      version: installed.version,
      license: installed.license,
      kind: meta.kind,
      purpose: meta.purpose,
      ...(meta.sourceUrl ? { sourceUrl: meta.sourceUrl } : {}),
    });
  }
  // Append the curated own-implementation entries last; they read as a
  // distinct "Algorithmen" section in the docs page.
  entries.push(...SPECIAL_ENTRIES);
  return entries;
}

/** Render the manifest array as a TypeScript module. */
function renderModule(entries: TechEntry[]): string {
  const header = `// AUTO-GENERATED by scripts/build-tech-manifest.ts. Do not edit by hand.
// Regenerate via: pnpm tech-manifest

export interface TechEntry {
  name: string;
  version: string;
  license: string;
  kind: 'runtime' | 'build' | 'test';
  purpose: string;
  sourceUrl?: string;
}

export const TECH_MANIFEST: TechEntry[] = ${JSON.stringify(entries, null, 2)};
`;
  return header;
}

function main() {
  // process.argv[1] is the path to this script when invoked via `tsx`.
  // Walk up one directory to reach the repo root (scripts/ → repo).
  const scriptPath = process.argv[1] ?? '';
  const here = dirname(scriptPath);
  const rootDir = resolve(here, '..');
  const outPath = resolve(rootDir, 'apps/web/src/generated/tech-manifest.ts');
  const outDir = dirname(outPath);
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
  const entries = buildManifest(rootDir);
  writeFileSync(outPath, renderModule(entries), 'utf8');
  // eslint-disable-next-line no-console
  console.log(
    `[tech-manifest] wrote ${entries.length} entries to ${outPath}`,
  );
}

// Run only when executed directly via tsx, not when imported as a module.
// `process.argv[1]` is the entry script path; matching against the basename
// keeps this test-friendly (the unit test imports this module from vitest,
// where argv[1] points at vitest's binary, not this file).
const argvEntry = (typeof process !== 'undefined' && process.argv[1]) || '';
if (argvEntry.endsWith('build-tech-manifest.ts')) {
  main();
}
