import type { Component } from 'solid-js';
import { For, Show } from 'solid-js';
import type { Stage1AuditDoc } from '@sortition/core';

// Visible audit/provenance footer per Issue #53 B + Issue #65 (visual rebind
// to Stage1AuditDoc schema 0.4). Every mandatory schema field is rendered with
// its schema name as the German label root so reviewers can match on-screen
// labels 1:1 against the Audit-JSON download.
//
// `selected_indices` is variable-length (up to ~target_n IDs) and lives inside
// a collapsed <details> so the footer stays scannable when N is large. Long
// opaque values (hash, public key, signature) are shortened in the visible
// chrome but the full value is always exposed via `title` for hover-verify.
//
// `tool_version` is UI-only and read from `import.meta.env.VITE_APP_VERSION`
// (defined in vite.config.ts from package.json). It is intentionally NOT a
// field of Stage1AuditDoc (schema 0.4 is unchanged).

interface Props {
  doc: Stage1AuditDoc;
}

/** German label for an outreach mode, used by the "Bemessung" footer row. */
function outreachLabel(mode: 'mail-only' | 'mail-plus-phone' | 'custom'): string {
  if (mode === 'mail-only') return 'Nur Briefe';
  if (mode === 'mail-plus-phone') return 'Briefe + Telefon-Nachfasser';
  return 'Eigene Rücklaufquote';
}

/** Format a 0..1 rate as a percent without unnecessary decimals. */
function rateToPercent(r: number): string {
  const v = r * 100;
  if (Math.abs(v - Math.round(v)) < 1e-9) return `${Math.round(v)} %`;
  return `${v.toFixed(1)} %`;
}

/** Abbreviate a long opaque token to `<first 16 chars>…<last 8 chars>`. */
function abbreviate(hex: string | undefined): string {
  if (!hex) return '–';
  if (hex.length <= 24) return hex;
  return `${hex.slice(0, 16)}…${hex.slice(-8)}`;
}

/** Format an integer byte count with a thousands separator (DE locale). */
function fmtBytes(n: number): string {
  return `${n.toLocaleString('de-DE')} Bytes`;
}

export const AuditFooter: Component<Props> = (props) => {
  return (
    <section data-testid="stage1-audit-footer" class="card">
      <div class="card-head">
        <span class="card-eyebrow">Schritt 6</span>
        <h2 class="card-title">Protokoll / Audit</h2>
      </div>
      <div class="audit">
        <dl>
          <dt>Schema-Version</dt>
          <dd>{props.doc.schema_version}</dd>

          <dt>Operation</dt>
          <dd>{props.doc.operation}</dd>

          <dt>Algorithmus-Version</dt>
          <dd>
            {props.doc.algorithm_version}{' '}
            <span class="text-ink-3">(PRNG {props.doc.prng})</span>
          </dd>

          <dt>Tool-Version</dt>
          <dd>v{(import.meta.env.VITE_APP_VERSION as string | undefined) ?? '?'}</dd>

          <dt>Tie-Break-Regel</dt>
          <dd>{props.doc.tie_break_rule}</dd>

          <dt>Schlüssel-Codierung</dt>
          <dd>{props.doc.key_encoding}</dd>

          <dt>Stratum-Sortierung</dt>
          <dd>{props.doc.stratum_sort}</dd>

          <dt>Seed</dt>
          <dd class="tabular-nums">{props.doc.seed}</dd>

          <dt>Seed-Quelle</dt>
          <dd>{props.doc.seed_source}</dd>

          <dt>Eingangs-Datei</dt>
          <dd>
            {props.doc.input_csv_filename}{' '}
            <span class="text-ink-3">({fmtBytes(props.doc.input_csv_size_bytes)})</span>
          </dd>

          <dt>SHA-256</dt>
          <dd title={props.doc.input_csv_sha256} data-testid="audit-footer-hash">
            {props.doc.input_csv_sha256}
          </dd>

          <dt>Pool-Größe</dt>
          <dd class="tabular-nums">{props.doc.pool_size}</dd>

          <dt>Ziel-Stichprobengröße</dt>
          <dd class="tabular-nums">{props.doc.target_n}</dd>

          <dt>Tatsächliche Stichprobengröße</dt>
          <dd class="tabular-nums">{props.doc.actual_n}</dd>

          <dt>Stratifikations-Achsen</dt>
          <dd>{props.doc.stratification_axes.join(', ')}</dd>

          <dt>Strata-Anzahl</dt>
          <dd class="tabular-nums">{props.doc.strata.length}</dd>

          <dt>Warnungen</dt>
          <dd class="tabular-nums">{props.doc.warnings.length}</dd>

          <dt>Dauer</dt>
          <dd class="tabular-nums">{props.doc.duration_ms} ms</dd>

          <dt>Zeitstempel (UTC)</dt>
          <dd>{props.doc.timestamp_iso}</dd>
        </dl>

        {/* selected_indices can be up to target_n (≤300) integers; render it
            inside a collapsed <details> so the visual footer stays compact.
            The full array is also in the audit-JSON download, but having it
            on-screen lets a reviewer cross-check without opening the file. */}
        <details class="mt-2">
          <summary>Ausgewählte Indizes ({props.doc.selected_indices.length})</summary>
          <pre class="font-mono text-xs whitespace-pre-wrap break-all mt-1">
            {JSON.stringify(props.doc.selected_indices)}
          </pre>
        </details>

        {/* Issue #62 — derived columns documentation. Truncates each
            description to keep the footer compact; the full string lives in
            the JSON download. */}
        <Show when={props.doc.derived_columns && Object.keys(props.doc.derived_columns).length > 0}>
          <dl data-testid="audit-footer-derived" class="mt-2">
            <dt>Berechnete Spalten</dt>
            <dd>
              <For each={Object.entries(props.doc.derived_columns ?? {})}>
                {([col, info]) => (
                  <div>
                    <span class="font-semibold">{col}</span> —{' '}
                    {info.description.length > 80
                      ? `${info.description.slice(0, 80)}…`
                      : info.description}
                  </div>
                )}
              </For>
            </dd>
          </dl>
        </Show>

        {/* Issue #62 — forced-zero strata summary. Stresses that the pool
            stays unchanged — non-trivial nuance for auditors. */}
        <Show when={(props.doc.forced_zero_strata?.length ?? 0) > 0}>
          <dl data-testid="audit-footer-forced-zero" class="mt-2">
            <dt>Erzwungene Null-Strata</dt>
            <dd>
              {props.doc.forced_zero_strata?.length ?? 0} (Pool wurde NICHT gefiltert — diese
              Personen bleiben Teil des Pools.)
            </dd>
          </dl>
        </Show>

        {/* Issue #64 — sample-size proposal summary. Renders only when the
            user used the SampleSizeCalculator. The doc.target_n carries the
            actually-drawn N — when it diverges from `recommended` we surface
            "manuell überschrieben" so reviewers see the deviation. */}
        <Show when={props.doc.sample_size_proposal}>
          {(p) => (
            <dl data-testid="audit-footer-sample-size" class="mt-2">
              <dt>Bemessungs-Vorschlag</dt>
              <dd>
                <div>
                  Panelgröße: {p().panel_size} — Outreach: {outreachLabel(p().outreach)} (
                  {rateToPercent(p().response_rate_min)}–{rateToPercent(p().response_rate_max)}{' '}
                  Rücklauf, Faktor {p().safety_factor})
                </div>
                <div>
                  <Show
                    when={p().manually_overridden}
                    fallback={<>Stichprobengröße: {props.doc.target_n} (Vorschlag übernommen)</>}
                  >
                    Stichprobengröße: {props.doc.target_n} (manuell überschrieben — Vorschlag war{' '}
                    {p().recommended})
                  </Show>
                </div>
              </dd>
            </dl>
          )}
        </Show>
      </div>

      {/* Signature triplet rendered as a chip-row below the dl. The grey
          "noch nicht signiert" pill is the unsigned-state fallback so
          stage1.spec.ts assertion (signature_algo testid must NOT contain
          "noch nicht signiert" once signed) works in both states. */}
      <div class="mt-3 flex flex-wrap items-center gap-2">
        <Show
          when={props.doc.signature_algo}
          fallback={
            <span class="sig-pill is-unsigned" data-testid="audit-footer-sig-algo">
              noch nicht signiert
            </span>
          }
        >
          <span class="sig-pill" data-testid="audit-footer-sig-algo">
            {props.doc.signature_algo}
          </span>
        </Show>
        <Show when={props.doc.public_key}>
          <span class="font-mono text-xs text-ink-3" title={props.doc.public_key}>
            PK: {abbreviate(props.doc.public_key)}
          </span>
        </Show>
        <Show when={props.doc.signature}>
          <span
            class="font-mono text-xs text-ink-3"
            title={props.doc.signature}
            data-testid="audit-footer-sig"
          >
            SIG: {abbreviate(props.doc.signature)}
          </span>
        </Show>
      </div>
      <p class="text-ink-3 italic mt-2 text-xs">
        Vollständige Signatur und Hashes sind im Audit-JSON-Download enthalten. Die Signatur deckt
        die canonicalisierte Form des Audit-Dokuments inklusive der gezogenen Personen-Indizes ab.
      </p>
    </section>
  );
};
