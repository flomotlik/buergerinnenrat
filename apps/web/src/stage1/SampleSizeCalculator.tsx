import type { Component } from 'solid-js';
import { createMemo, createSignal, Show } from 'solid-js';
import {
  suggestSampleSize,
  OUTREACH_DEFAULTS,
  DEFAULT_SAFETY_FACTOR,
  type OutreachMode,
  type SampleSizeProposal,
} from '@sortition/core';

// Sample-size calculator (Issue #64).
//
// Translates "Wieviele Personen sollen im Panel sitzen?" + outreach method
// into a recommended Versand-N. The component is OPTIONAL — Stage1Panel
// keeps the manual N input. Existing e2e tests that fill `stage1-target-n`
// directly are unaffected.
//
// State model:
//   - panelSize / outreach / customMin / customMax live as internal signals.
//   - `proposal` is a createMemo derived from those plus suggestSampleSize().
//   - The "Vorschlag übernehmen" button calls onAccept(recommended, proposal).
//   - The parent decides what to do with that (typically setTargetN + flag a
//     sample_size_proposal for the audit doc).
//
// The component does NOT auto-write to the parent's targetN signal — the
// user must explicitly click "Vorschlag übernehmen". This keeps the manual
// override path simple and avoids a "magic value flipping while I type"
// surprise.

export interface SampleSizeCalculatorProps {
  /** Pool size from the parsed CSV — used for the "pool too small" warning. */
  poolSize: () => number | null;
  /** Called when the user clicks "Vorschlag übernehmen". */
  onAccept: (recommended: number, proposal: SampleSizeProposal) => void;
}

/** Format a percent value 0..1 as e.g. "30 %" or "7 %" (one decimal max). */
function formatPercent(p: number): string {
  const v = p * 100;
  // Drop the decimal when the value is integer-clean (saves "30.0 %" noise).
  if (Math.abs(v - Math.round(v)) < 1e-9) return `${Math.round(v)} %`;
  return `${v.toFixed(1)} %`;
}

/** Convert a percent input (e.g. "15") back to a 0..1 rate. NaN-safe. */
function percentToRate(p: string): number {
  const v = Number(p);
  if (!Number.isFinite(v)) return Number.NaN;
  return v / 100;
}

export const SampleSizeCalculator: Component<SampleSizeCalculatorProps> = (props) => {
  const [panelSize, setPanelSize] = createSignal<number>(30);
  const [outreach, setOutreach] = createSignal<OutreachMode>('mail-plus-phone');
  // Custom rates as percent strings so the input is a faithful echo of what
  // the user typed (e.g. "15.5"). Converted to 0..1 only inside the memo.
  const [customMinPct, setCustomMinPct] = createSignal<string>('15');
  const [customMaxPct, setCustomMaxPct] = createSignal<string>('25');
  const safetyFactor = DEFAULT_SAFETY_FACTOR;

  const proposal = createMemo<SampleSizeProposal | null>(() => {
    const n = panelSize();
    const m = outreach();
    if (m === 'custom') {
      const minR = percentToRate(customMinPct());
      const maxR = percentToRate(customMaxPct());
      return suggestSampleSize(n, m, { min: minR, max: maxR }, safetyFactor);
    }
    return suggestSampleSize(n, m, undefined, safetyFactor);
  });

  const poolTooSmall = createMemo(() => {
    const p = proposal();
    const pool = props.poolSize();
    if (!p || pool === null) return false;
    return p.recommended > pool;
  });

  function handleAccept() {
    const p = proposal();
    if (!p || p.recommended <= 0) return;
    props.onAccept(p.recommended, p);
  }

  return (
    <section
      class="space-y-3"
      data-testid="stage1-sample-size-section"
      aria-label="Bemessung der Stichprobe"
    >
      <p class="text-sm text-ink-3">
        Wieviele Personen sollen am Ende im Panel sitzen, und über welchen Weg werden sie
        eingeladen? Daraus schlagen wir eine Versand-Stichprobe vor.
      </p>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label class="input-label" for="stage1-panel-size">
            Ziel-Panelgröße
          </label>
          <input
            id="stage1-panel-size"
            type="number"
            min="1"
            class="input-base tabular-nums"
            data-testid="stage1-panel-size"
            value={panelSize()}
            onInput={(e) => {
              const v = Number(e.currentTarget.value);
              if (Number.isFinite(v) && v >= 0) setPanelSize(Math.floor(v));
            }}
          />
          <p class="text-xs text-slate-500 mt-1">
            Z.B. 30 für einen Gemeinde-Bürgerrat, 160 für einen Bundes-Bürgerrat.
          </p>
        </div>

        <div>
          <span class="input-label">Outreach-Methode</span>
          <fieldset
            class="space-y-1 mt-1"
            data-testid="stage1-outreach-mode"
            role="radiogroup"
            aria-label="Outreach-Methode"
          >
            <label class="flex items-start gap-2 text-sm">
              <input
                type="radio"
                name="stage1-outreach"
                value="mail-plus-phone"
                checked={outreach() === 'mail-plus-phone'}
                onChange={() => setOutreach('mail-plus-phone')}
                data-testid="stage1-outreach-mail-plus-phone"
                class="mt-0.5"
              />
              <span>
                <strong>{OUTREACH_DEFAULTS['mail-plus-phone'].label}</strong>{' '}
                <span class="text-slate-500">
                  ({formatPercent(OUTREACH_DEFAULTS['mail-plus-phone'].rateMin)}–
                  {formatPercent(OUTREACH_DEFAULTS['mail-plus-phone'].rateMax)} Rücklauf)
                </span>
              </span>
            </label>
            <label class="flex items-start gap-2 text-sm">
              <input
                type="radio"
                name="stage1-outreach"
                value="mail-only"
                checked={outreach() === 'mail-only'}
                onChange={() => setOutreach('mail-only')}
                data-testid="stage1-outreach-mail-only"
                class="mt-0.5"
              />
              <span>
                <strong>{OUTREACH_DEFAULTS['mail-only'].label}</strong>{' '}
                <span class="text-slate-500">
                  ({formatPercent(OUTREACH_DEFAULTS['mail-only'].rateMin)}–
                  {formatPercent(OUTREACH_DEFAULTS['mail-only'].rateMax)} Rücklauf)
                </span>
              </span>
            </label>
            <label class="flex items-start gap-2 text-sm">
              <input
                type="radio"
                name="stage1-outreach"
                value="custom"
                checked={outreach() === 'custom'}
                onChange={() => setOutreach('custom')}
                data-testid="stage1-outreach-custom"
                class="mt-0.5"
              />
              <span>
                <strong>Eigene Rücklaufquote</strong>{' '}
                <span class="text-slate-500">(min/max in % selbst angeben)</span>
              </span>
            </label>
          </fieldset>
        </div>
      </div>

      <Show when={outreach() === 'custom'}>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 border-l-4 border-slate-300 pl-3">
          <div>
            <label class="input-label" for="stage1-custom-rate-min">
              Rücklauf min (%)
            </label>
            <input
              id="stage1-custom-rate-min"
              type="number"
              min="0.1"
              max="100"
              step="0.1"
              class="input-base tabular-nums"
              data-testid="stage1-custom-rate-min"
              value={customMinPct()}
              onInput={(e) => setCustomMinPct(e.currentTarget.value)}
            />
          </div>
          <div>
            <label class="input-label" for="stage1-custom-rate-max">
              Rücklauf max (%)
            </label>
            <input
              id="stage1-custom-rate-max"
              type="number"
              min="0.1"
              max="100"
              step="0.1"
              class="input-base tabular-nums"
              data-testid="stage1-custom-rate-max"
              value={customMaxPct()}
              onInput={(e) => setCustomMaxPct(e.currentTarget.value)}
            />
          </div>
        </div>
      </Show>

      <Show
        when={proposal()}
        fallback={
          <div class="banner warn" data-testid="stage1-sample-suggestion">
            Vorschlag nicht berechenbar — bitte Eingaben prüfen (z.B. min ≤ max, Werte zwischen 0
            und 100 %).
          </div>
        }
      >
        {(p) => (
          <div
            class="rounded p-3 bg-bg-sunken border border-line space-y-2"
            data-testid="stage1-sample-suggestion"
          >
            <div class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span class="text-sm text-ink-3">Empfohlen:</span>
              <span class="text-2xl font-semibold tabular-nums text-accent">
                ~{p().recommended}
              </span>
              <span class="text-sm text-ink-3">Briefe</span>
              <span class="text-sm text-ink-3">
                — Range {p().range[0]}–{p().range[1]}
              </span>
            </div>
            <details class="text-xs text-ink-3">
              <summary class="cursor-pointer underline">Wie wird das berechnet?</summary>
              <div class="mt-2 space-y-1 font-mono">
                <p>
                  Panelgröße: <strong>{p().panelSize}</strong>
                </p>
                <p>
                  Rücklauf-Annahme: {formatPercent(p().rateUsed.min)}–
                  {formatPercent(p().rateUsed.max)} (Mittel {formatPercent(p().rateUsed.avg)})
                </p>
                <p>Sicherheitspuffer: × {p().safetyFactor}</p>
                <p class="text-ink-2">
                  Empfohlen = round(Panel ÷ Mittel × Faktor / 10) × 10 = {p().recommended}
                </p>
                <p class="text-ink-2">Range_min = ⌈Panel ÷ max⌉ = {p().range[0]}</p>
                <p class="text-ink-2">Range_max = ⌈Panel ÷ min × Faktor⌉ = {p().range[1]}</p>
              </div>
            </details>
            <Show when={poolTooSmall()}>
              <p class="banner warn text-xs" data-testid="stage1-pool-too-small-warning">
                <strong>Hinweis:</strong> Pool hat nur {props.poolSize()} Personen, der Vorschlag
                wäre {p().recommended}. Empfohlen: kleinere Panelgröße, bessere Outreach-Methode
                oder größerer Pool.
              </p>
            </Show>
            <button
              type="button"
              class="btn-secondary"
              data-testid="stage1-accept-suggestion"
              onClick={handleAccept}
              disabled={p().recommended <= 0}
            >
              Vorschlag übernehmen
            </button>
          </div>
        )}
      </Show>
    </section>
  );
};
