import { Component, createSignal, Show } from 'solid-js';
import { CsvImport } from './csv/CsvImport';
import { applyMapping } from './csv/parse';
import type { ColumnMapping, ParsedCsv } from './csv/parse';
import { QuotaEditor } from './quotas/QuotaEditor';
import type { QuotaConfig } from './quotas/model';

interface ImportedPool {
  parsed: ParsedCsv;
  mapping: ColumnMapping;
  rows: Record<string, string>[];
}

export const App: Component = () => {
  const [pool, setPool] = createSignal<ImportedPool | null>(null);
  const [quotas, setQuotas] = createSignal<QuotaConfig | null>(null);

  return (
    <main class="mx-auto max-w-5xl px-6 py-10 space-y-8">
      <header>
        <h1 class="text-3xl font-semibold tracking-tight">Sortition Iteration 1</h1>
        <p class="mt-2 text-sm text-slate-600">
          Browser-native Ziehung nach Maximin — statisch ausgeliefert, keine Backend-Abhängigkeit.
        </p>
      </header>

      <section>
        <h2 class="text-xl font-semibold mb-3">1. Pool importieren</h2>
        <CsvImport
          onLoaded={({ parsed, mapping }) => {
            setPool({ parsed, mapping, rows: applyMapping(parsed.rows, mapping) });
            setQuotas(null);
          }}
        />
      </section>

      <Show when={pool()}>
        {(p) => (
          <section>
            <h2 class="text-xl font-semibold mb-3">2. Quoten konfigurieren</h2>
            <p class="text-sm text-slate-600 mb-3" data-testid="pool-summary">
              {p().rows.length} Personen importiert.
            </p>
            <QuotaEditor
              rows={p().rows}
              candidateColumns={Object.keys(p().rows[0] ?? {}).filter((c) => c !== 'person_id')}
              onChange={(cfg) => setQuotas(cfg)}
            />
          </section>
        )}
      </Show>

      <Show when={quotas()}>
        {(q) => (
          <section>
            <h2 class="text-xl font-semibold mb-3">3. Lauf starten</h2>
            <p class="text-sm text-slate-500" data-testid="run-stub">
              Engine-Anbindung folgt mit Issue #08 / #10. Aktuell: Quota-Config bereit
              ({q().categories.length} Kategorien, Panel {q().panel_size}).
            </p>
          </section>
        )}
      </Show>
    </main>
  );
};
