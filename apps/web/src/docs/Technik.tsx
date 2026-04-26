import { For, Show } from 'solid-js';
import type { Component } from 'solid-js';
import { TECH_MANIFEST } from '../generated/tech-manifest';
import type { TechEntry } from '../generated/tech-manifest';
import Term from './Term';

const SPECIAL_NAMES = new Set([
  'Hamilton Apportionment',
  'Fisher-Yates Shuffle',
  'Mulberry32 PRNG',
  'Web Crypto API',
]);

function pickKind(kinds: ReadonlyArray<TechEntry['kind']>): TechEntry[] {
  return TECH_MANIFEST.filter(
    (e) => kinds.includes(e.kind) && !SPECIAL_NAMES.has(e.name),
  );
}

function findSpecial(name: string): TechEntry | undefined {
  return TECH_MANIFEST.find((e) => e.name === name);
}

const TechRow: Component<{ entry: TechEntry }> = (props) => (
  <tr class="border-t">
    <td class="p-1 font-mono text-xs">{props.entry.name}</td>
    <td class="p-1 font-mono text-xs tabular-nums">{props.entry.version}</td>
    <td class="p-1 text-xs">{props.entry.license}</td>
    <td class="p-1 text-xs">{props.entry.kind}</td>
    <td class="p-1 text-xs">{props.entry.purpose}</td>
    <td class="p-1 text-xs">
      <Show when={props.entry.sourceUrl}>
        <a
          class="underline"
          href={props.entry.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          Quelle
        </a>
      </Show>
    </td>
  </tr>
);

/**
 * Tech-stack docs page. Tables are populated from the generated
 * tech-manifest.ts (see scripts/build-tech-manifest.ts) so versions and
 * licenses are always pinned to the current build.
 */
const Technik: Component = () => {
  const libs = pickKind(['runtime', 'build']);
  const tests = pickKind(['test']);
  const hamilton = findSpecial('Hamilton Apportionment');
  const fisherYates = findSpecial('Fisher-Yates Shuffle');
  const mulberry = findSpecial('Mulberry32 PRNG');
  const webcrypto = findSpecial('Web Crypto API');

  return (
    <div class="space-y-8" data-testid="docs-page-technik">
      <section class="space-y-3">
        <p>
          Die App ist eine statische Single-Page-App ohne Backend. Alle
          Berechnungen laufen im Browser. Diese Seite zeigt — direkt aus dem
          aktuellen Build generiert — welche Bibliotheken in welcher Version
          mit welcher Lizenz eingesetzt sind. Die Liste wird via{' '}
          <code class="font-mono">scripts/build-tech-manifest.ts</code>{' '}
          erzeugt und bei jedem Build gegen Drift geprüft.
        </p>
      </section>

      <section class="space-y-3">
        <h2 class="text-xl font-semibold">Bibliotheken (direkte Dependencies)</h2>
        <div class="overflow-x-auto border rounded">
          <table
            class="w-full text-left"
            data-testid="tech-table-libs"
          >
            <thead class="bg-slate-100">
              <tr>
                <th class="p-1 text-xs">Name</th>
                <th class="p-1 text-xs">Version</th>
                <th class="p-1 text-xs">Lizenz</th>
                <th class="p-1 text-xs">Kind</th>
                <th class="p-1 text-xs">Zweck</th>
                <th class="p-1 text-xs">Quelle</th>
              </tr>
            </thead>
            <tbody>
              <For each={libs}>{(e) => <TechRow entry={e} />}</For>
            </tbody>
          </table>
        </div>
      </section>

      <section class="space-y-3">
        <h2 class="text-xl font-semibold">Test- und Dev-Tools</h2>
        <div class="overflow-x-auto border rounded">
          <table class="w-full text-left" data-testid="tech-table-tests">
            <thead class="bg-slate-100">
              <tr>
                <th class="p-1 text-xs">Name</th>
                <th class="p-1 text-xs">Version</th>
                <th class="p-1 text-xs">Lizenz</th>
                <th class="p-1 text-xs">Kind</th>
                <th class="p-1 text-xs">Zweck</th>
                <th class="p-1 text-xs">Quelle</th>
              </tr>
            </thead>
            <tbody>
              <For each={tests}>{(e) => <TechRow entry={e} />}</For>
            </tbody>
          </table>
        </div>
      </section>

      <section class="space-y-3">
        <h2 class="text-xl font-semibold">Algorithmen (own-implementation)</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Show when={hamilton}>
            {(e) => (
              <div class="border rounded p-3 bg-white space-y-1">
                <div class="font-semibold">Hamilton-Apportionment</div>
                <p class="text-xs">
                  Quelle:{' '}
                  <a
                    class="underline"
                    href={e().sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Largest-Remainder-Methode
                  </a>{' '}
                  (Wikipedia).
                </p>
                <p class="text-xs">
                  <strong>Warum hier:</strong> deterministische
                  Quoten-Allokation für stratifizierte Auswahl. Lehrbuch-Stoff,
                  in jeder Demokratie-Geschichte erklärt.
                </p>
              </div>
            )}
          </Show>
          <Show when={fisherYates}>
            {(e) => (
              <div class="border rounded p-3 bg-white space-y-1">
                <div class="font-semibold">Fisher-Yates-Shuffle</div>
                <p class="text-xs">
                  Quelle: Knuth <em>TAOCP</em> Vol. 2 §3.4.2 (Buchverweis);
                  Übersicht{' '}
                  <a
                    class="underline"
                    href={e().sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Wikipedia
                  </a>
                  .
                </p>
                <p class="text-xs">
                  <strong>Warum hier:</strong> uniformer Shuffle in O(n) ohne
                  Bias — die einzig richtige Wahl, wenn jede Person aus dem
                  Pool die gleiche Chance haben soll.
                </p>
              </div>
            )}
          </Show>
          <Show when={mulberry}>
            {(e) => (
              <div class="border rounded p-3 bg-white space-y-1">
                <div class="font-semibold">Mulberry32 PRNG</div>
                <p class="text-xs">
                  Quelle:{' '}
                  <a
                    class="underline"
                    href={e().sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    bryc/code: Mulberry32
                  </a>
                  .
                </p>
                <p class="text-xs">
                  <strong>Warum hier:</strong> deterministisch, reproduzierbar
                  aus dem Seed; klein genug, um in jedem Audit-Schreiben
                  zitiert zu werden. <strong>Achtung:</strong>{' '}
                  <Term slug="mulberry32">Mulberry32</Term> ist <em>kein</em>{' '}
                  crypto-grade RNG — siehe Limitationen-Seite. Mitigation:
                  Seed gemeinsam vor dem Lauf vereinbaren.
                </p>
              </div>
            )}
          </Show>
          <Show when={webcrypto}>
            {(e) => (
              <div class="border rounded p-3 bg-white space-y-1">
                <div class="font-semibold">
                  <Term slug="signatur">Ed25519/ECDSA-Signatur</Term> via Web
                  Crypto API
                </div>
                <p class="text-xs">
                  Quelle:{' '}
                  <a
                    class="underline"
                    href={e().sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    W3C WebCryptoAPI
                  </a>
                  .
                </p>
                <p class="text-xs">
                  <strong>Warum hier:</strong>{' '}
                  <Term slug="audit-json">Audit-Protokoll</Term>-Integrität
                  ohne Custom-Krypto. Browser-API, kein zusätzlicher Code im
                  Bundle. Wird auf den{' '}
                  <Term slug="fisher-yates">Fisher-Yates</Term>-Output
                  angewendet.
                </p>
              </div>
            )}
          </Show>
        </div>
      </section>

      <section class="space-y-3">
        <h2 class="text-xl font-semibold">Build-Reproduzierbarkeit</h2>
        <p>
          Diese Doku gehört zu Build{' '}
          <code class="font-mono">{__GIT_SHA__}</code> vom{' '}
          <code class="font-mono">{__BUILD_DATE__}</code>.
        </p>
        <p>
          <strong>Build-Reproduktion:</strong> Repo auf SHA{' '}
          <code class="font-mono">{__GIT_SHA__}</code> auschecken,{' '}
          <code class="font-mono">pnpm install --frozen-lockfile</code>,{' '}
          <code class="font-mono">pnpm build</code>. Alle Versionen sind in
          der Lockfile festgenagelt.
        </p>
        <p class="text-xs text-slate-600">
          Lockfile-Hash wird zur Runtime nicht berechnet (kein
          Filesystem-Zugriff im Browser). Der Commit-SHA reicht als
          deterministische Build-Koordinate — er bestimmt sowohl Quellcode als
          auch Lockfile.
        </p>
      </section>
    </div>
  );
};

export default Technik;
