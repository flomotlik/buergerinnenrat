import { Component, createMemo, createSignal, Show } from 'solid-js';
import { CsvImport } from './csv/CsvImport';
import { applyMapping } from './csv/parse';
import type { ColumnMapping, ParsedCsv } from './csv/parse';
import { QuotaEditor } from './quotas/QuotaEditor';
import type { CategoryQuota, QuotaConfig } from './quotas/model';
import { validateQuotas } from './quotas/model';
import { RunPanel } from './run/RunPanel';
import type { Pool, Quotas as EngineQuotas } from '@sortition/engine-contract';

interface ImportedPool {
  parsed: ParsedCsv;
  mapping: ColumnMapping;
  rows: Record<string, string>[];
}

function toEnginePool(rows: Record<string, string>[]): Pool {
  return {
    id: 'imported',
    people: rows.map((r) => ({ ...r, person_id: r['person_id'] ?? '' })),
  };
}

function toEngineQuotas(cfg: QuotaConfig): EngineQuotas {
  return {
    panel_size: cfg.panel_size,
    categories: cfg.categories.map((c: CategoryQuota) => ({
      column: c.column,
      bounds: c.bounds,
    })),
  };
}

export const App: Component = () => {
  const [pool, setPool] = createSignal<ImportedPool | null>(null);
  const [quotas, setQuotas] = createSignal<QuotaConfig | null>(null);

  const enginePool = createMemo(() => {
    const p = pool();
    return p ? toEnginePool(p.rows) : null;
  });

  const engineQuotas = createMemo(() => {
    const q = quotas();
    return q ? toEngineQuotas(q) : null;
  });

  const quotaValid = createMemo(() => {
    const p = pool();
    const q = quotas();
    if (!p || !q) return false;
    return validateQuotas(p.rows, q).ok;
  });

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

      <Show when={quotaValid() && enginePool() && engineQuotas()}>
        <section>
          <h2 class="text-xl font-semibold mb-3">3. Lauf starten</h2>
          <RunPanel pool={enginePool()!} quotas={engineQuotas()!} />
        </section>
      </Show>

      <Show when={pool() && quotas() && !quotaValid()}>
        <section>
          <p class="text-sm text-slate-500" data-testid="run-stub">
            Quoten-Konfiguration noch nicht gültig — bitte Eingaben prüfen.
          </p>
        </section>
      </Show>
    </main>
  );
};
