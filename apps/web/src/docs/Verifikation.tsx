import { createSignal, For } from 'solid-js';
import type { Component } from 'solid-js';
import Term from './Term';

interface Snippet {
  id: string;
  title: string;
  code: string;
}

const SNIPPETS: ReadonlyArray<Snippet> = [
  {
    id: 'reference-run',
    title: 'Native Python-Referenz laufen lassen',
    code: `python3 scripts/stage1_reference.py \\
  --input pool.csv \\
  --axes "district,age_band,gender" \\
  --target-n 50 \\
  --seed 1735012345 \\
  --output-json reproduced.json`,
  },
  {
    id: 'compare-indices',
    title: 'Selected-Indices byte-vergleichen',
    code: `# Sortieren beider JSONs auf die selected_indices
jq -r '.selected_indices | sort | .[]' versand-audit-1735012345.json > a.txt
jq -r '.selected_indices | sort | .[]' reproduced.json > b.txt

if diff -q a.txt b.txt > /dev/null; then
  echo "BYTE-IDENTISCH"
else
  echo "ABWEICHUNG — Details:"
  diff a.txt b.txt
fi`,
  },
  {
    id: 'verify-signature',
    title: 'Signatur prüfen',
    code: `# Python-Helper im Repo
python3 scripts/verify_audit.py versand-audit-1735012345.json

# Erwartete Ausgabe: "OK — Signatur valide" oder Fehlermeldung mit Details.`,
  },
];

const Verifikation: Component = () => {
  const [copiedId, setCopiedId] = createSignal<string | null>(null);

  function copy(snippet: Snippet) {
    void navigator.clipboard.writeText(snippet.code).then(() => {
      setCopiedId(snippet.id);
      // Reset the "kopiert" hint after a short window so the next click on
      // the same button feels responsive instead of stuck.
      window.setTimeout(() => {
        setCopiedId((cur) => (cur === snippet.id ? null : cur));
      }, 1500);
    });
  }

  return (
    <div class="space-y-8" data-testid="docs-page-verifikation">
      <section class="space-y-3">
        <p>
          Jeder Stage-1-Lauf produziert ein signiertes{' '}
          <Term slug="audit-json">Audit-JSON</Term>. Mit der nativen
          Python-Referenz lässt sich der Lauf byte-exakt nachrechnen — das
          ist der Auditor:innen-Pfad: was im Browser passiert, kann auf
          einem unabhängigen Rechner ohne diese App reproduziert werden.
        </p>
      </section>

      <section class="space-y-4">
        <h2 class="text-xl font-semibold">3-Schritt-Anleitung</h2>
        <ol class="list-decimal pl-5 space-y-3">
          <li>
            <strong>Audit-JSON herunterladen</strong>
            <p class="text-sm mt-1">
              Im Stage-1-Ergebnis-Bereich auf{' '}
              <em>„Audit-JSON herunterladen"</em> klicken. Das JSON enthält
              den <Term slug="seed">Seed</Term>, die Achsen, die gezogenen
              Personen-Indizes und die Signatur.
            </p>
          </li>
          <li>
            <strong>Eingangs-CSV bereithalten</strong>
            <p class="text-sm mt-1">
              Die Original-Melderegister-CSV, die im Stage-1-Lauf hochgeladen
              wurde. Im Audit-JSON steht <code>input_csv_sha256</code> — die
              CSV muss diesem SHA-256-Hash entsprechen. Wenn jemand die CSV
              zwischendurch ändert, schlägt dieser Hash fehl und die
              Verifikation ist sinnlos.
            </p>
          </li>
          <li>
            <strong>Python-Referenz laufen lassen</strong>
            <p class="text-sm mt-1">
              Die Parameter (Achsen, Seed, Target-N) aus dem Audit-JSON
              extrahieren und an{' '}
              <code>scripts/stage1_reference.py</code> übergeben. Anschließend{' '}
              <code>selected_indices</code> aus beiden JSONs sortieren und
              vergleichen — sie müssen{' '}
              <Term slug="byte-identisch">byte-identisch</Term> sein.
            </p>
          </li>
        </ol>
      </section>

      <section class="space-y-3">
        <h2 class="text-xl font-semibold">Code-Snippets</h2>
        <For each={SNIPPETS}>
          {(snippet, idx) => (
            <div class="space-y-1">
              <div class="flex items-baseline justify-between">
                <h3 class="text-sm font-semibold">{snippet.title}</h3>
                <button
                  type="button"
                  class="text-xs underline text-slate-600 print:hidden"
                  onClick={() => copy(snippet)}
                  data-testid={`copy-snippet-${idx() + 1}`}
                >
                  {copiedId() === snippet.id ? 'Kopiert ✓' : 'Kopieren'}
                </button>
              </div>
              <pre class="bg-slate-100 p-3 rounded text-xs font-mono overflow-x-auto whitespace-pre">
                {snippet.code}
              </pre>
            </div>
          )}
        </For>
      </section>

      <section class="space-y-3">
        <h2 class="text-xl font-semibold">Was kann ich noch prüfen?</h2>
        <ul class="list-disc pl-5 space-y-1 text-sm">
          <li>
            <strong>Signatur prüfen</strong> — der Helper{' '}
            <code class="font-mono">scripts/verify_audit.py</code> verifiziert
            die Ed25519/ECDSA-Signatur gegen den Public Key im Audit-JSON.
            Schlägt fehl, sobald auch nur ein Byte des Dokuments verändert
            wurde.
          </li>
          <li>
            <strong>Cross-Validation</strong> — der Skript-Lauf{' '}
            <code class="font-mono">scripts/stage1_cross_validate.sh</code>{' '}
            führt den TypeScript-Lauf und die Python-Referenz parallel aus
            und vergleicht alle <code>selected_indices</code>. Genutzt im CI
            für Regressions-Schutz.
          </li>
          <li>
            <strong>Eigene Tools</strong> — solange das Verfahren (Hamilton +
            Fisher-Yates + Mulberry32) und die Tie-Break-Regel
            (alphabetische Sortierung) dokumentiert sind, kann jede:r das
            Verfahren in beliebiger Sprache (R, Julia, C, Excel-Macros)
            nachimplementieren und gegen unsere Outputs vergleichen.
          </li>
        </ul>
      </section>

      <section class="space-y-2">
        <h2 class="text-xl font-semibold">Quellen im Repo</h2>
        <ul class="list-disc pl-5 space-y-1 text-sm font-mono text-slate-700">
          <li>scripts/stage1_reference.py — native Python-Referenz</li>
          <li>scripts/stage1_cross_validate.sh — Cross-Validation-Lauf</li>
          <li>scripts/verify_audit.py — Signatur-Prüfung</li>
        </ul>
        <p class="text-xs text-slate-600">
          Die Pfade sind relativ zur Repo-Wurzel. Sobald die App ein
          öffentliches Code-Hosting hat (z. B. GitHub-Pages für die App,
          Repo daneben), werden die Pfade hier zu klickbaren Links.
        </p>
      </section>
    </div>
  );
};

export default Verifikation;
