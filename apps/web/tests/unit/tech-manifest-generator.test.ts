// @vitest-environment node
// The generator under test uses node:fs / node:path; the default jsdom env
// externalizes those for browser compat and breaks the import.
import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { buildManifest } from '../../../../scripts/build-tech-manifest';

// Vitest runs with cwd = apps/web (the workspace it was invoked in). Repo
// root is two levels up. Using process.cwd() avoids `import.meta.url`
// helpers that the jsdom environment does not expose.
const REPO_ROOT = resolve(process.cwd(), '../..');

describe('buildManifest()', () => {
  const manifest = buildManifest(REPO_ROOT);

  it('produces at least 5 entries', () => {
    expect(manifest.length).toBeGreaterThanOrEqual(5);
  });

  it('every entry has the required fields', () => {
    for (const entry of manifest) {
      expect(entry.name, `name on ${JSON.stringify(entry)}`).toBeTruthy();
      expect(entry.version, `version on ${entry.name}`).toBeTruthy();
      expect(entry.license, `license on ${entry.name}`).toBeTruthy();
      expect(['runtime', 'build', 'test']).toContain(entry.kind);
      expect(entry.purpose, `purpose on ${entry.name}`).toBeTruthy();
    }
  });

  it('includes solid-js, vite, papaparse, Web Crypto API, Mulberry32 PRNG', () => {
    const names = manifest.map((e) => e.name);
    expect(names).toContain('solid-js');
    expect(names).toContain('vite');
    expect(names).toContain('papaparse');
    expect(names).toContain('Web Crypto API');
    expect(names).toContain('Mulberry32 PRNG');
  });

  it('solid-js carries an MIT-flavoured license string', () => {
    const solid = manifest.find((e) => e.name === 'solid-js');
    expect(solid?.license).toMatch(/MIT/i);
  });
});
