import type { Component } from 'solid-js';
import { createMemo, Show } from 'solid-js';

// Plain-language explainer for stratification, exposed as a collapsible
// `<details>` block above the AxisPicker. Two roles:
//   1. Teach: a 2–3-sentence definition + a numeric mini-example so a
//      non-statistician immediately sees what the axes do.
//   2. Reflect: live cell-count for the user's current axis selection so
//      they notice when "more axes = more empty groups" before the run.
//
// All UI strings German per CLAUDE.md.

export interface StratificationExplainerProps {
  selectedAxes: () => string[];
  rows: () => Record<string, string>[];
  open: () => boolean;
  onToggle: (next: boolean) => void;
}

interface AxisCount {
  axis: string;
  distinct: number;
}

export const StratificationExplainer: Component<StratificationExplainerProps> = (props) => {
  const counts = createMemo<AxisCount[]>(() => {
    const axes = props.selectedAxes();
    const rows = props.rows();
    return axes.map((a) => {
      const seen = new Set<string>();
      for (const r of rows) seen.add(r[a] ?? '');
      return { axis: a, distinct: seen.size };
    });
  });

  const product = createMemo(() => {
    const cs = counts();
    if (cs.length === 0) return 0;
    let p = 1;
    for (const c of cs) p *= Math.max(1, c.distinct);
    return p;
  });

  const breakdown = createMemo(() =>
    counts()
      .map((c) => `${c.axis}: ${c.distinct}`)
      .join(' × '),
  );

  return (
    <details
      open={props.open()}
      onToggle={(e) => props.onToggle((e.currentTarget as HTMLDetailsElement).open)}
      class="border rounded p-3 bg-slate-50"
      data-testid="stage1-stratification-explainer"
    >
      <summary class="cursor-pointer font-semibold text-sm select-none">
        Was bedeutet Stratifikation?
      </summary>
      <div class="mt-2 space-y-3 text-sm">
        <p>
          Stratifikation teilt die Bevölkerung in Gruppen nach den ausgewählten Merkmalen ein. Die
          Stichprobe wird so gezogen, dass jede Gruppe proportional zu ihrem Anteil in der
          Bevölkerung vertreten ist.
        </p>
        <div class="border-l-4 border-sky-300 bg-white p-2 font-mono text-xs leading-relaxed">
          <p class="font-sans text-sm font-semibold">Beispiel:</p>
          <p>
            Pool 1.000 Personen, davon 510 weiblich (51 %), 490 männlich (49 %). Bei
            Stichprobengröße 100: 51 Frauen + 49 Männer werden gezogen.
          </p>
          <p class="mt-1">
            Mit Achse Geschlecht × Altersgruppe entstehen Untergruppen wie 'weiblich/45-64' —
            jeweils proportional bedient.
          </p>
        </div>
        <div data-testid="stage1-explainer-live-count" class="text-sm">
          <Show
            when={counts().length > 0}
            fallback={
              <p class="text-amber-800">
                Keine Achsen gewählt — die Stichprobe wäre eine einfache Zufallsstichprobe ohne
                Strukturierung.
              </p>
            }
          >
            <p>
              Sie haben {counts().length} Achsen gewählt (
              {counts()
                .map((c) => c.axis)
                .join(', ')}
              ). Das ergibt <strong>{product()}</strong> Bevölkerungsgruppen ({breakdown()} ={' '}
              {product()}).
            </p>
          </Show>
        </div>
      </div>
    </details>
  );
};
