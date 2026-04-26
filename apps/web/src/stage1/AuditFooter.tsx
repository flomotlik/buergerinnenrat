import { Component, Show } from 'solid-js';
import type { Stage1AuditDoc } from '@sortition/core';

// Visible audit/provenance footer per Issue #53 B. Print-CSS keeps this
// section visible (unlike export buttons), so the printed report carries
// the full provenance trail next to the per-stratum table.
//
// All long opaque values (hash, public key, signature) are abbreviated to
// 16 hex chars + ellipsis to stay readable in the DOM. The full value lives
// in the Audit-JSON download, and is also exposed via the `title` attribute
// on hover for quick verification without opening the JSON.

interface Props {
  doc: Stage1AuditDoc;
}

/** Abbreviate a hex string to `<first 16 chars>…<last 8 chars>` for display. */
function abbreviateHash(hex: string): string {
  if (hex.length <= 24) return hex;
  return `${hex.slice(0, 16)}…${hex.slice(-8)}`;
}

/** Abbreviate a long opaque token to `<first 16 chars>…` for display. */
function abbreviateToken(hex: string | undefined): string {
  if (!hex) return '–';
  if (hex.length <= 16) return hex;
  return `${hex.slice(0, 16)}…`;
}

export const AuditFooter: Component<Props> = (props) => {
  return (
    <section
      class="border rounded p-3 bg-slate-50 text-xs text-slate-700 space-y-1"
      data-testid="stage1-audit-footer"
    >
      <h3 class="text-sm font-semibold text-slate-800 mb-2">
        Protokoll / Audit
      </h3>
      <dl class="grid grid-cols-[max-content_1fr] gap-x-3 gap-y-0.5">
        <dt class="font-medium">Eingangs-Datei:</dt>
        <dd class="font-mono">
          {props.doc.input_csv_filename}{' '}
          <span class="text-slate-500">
            ({props.doc.input_csv_size_bytes} Bytes)
          </span>
        </dd>

        <dt class="font-medium">Eingangs-Datei-Hash (SHA-256):</dt>
        <dd
          class="font-mono"
          title={props.doc.input_csv_sha256}
          data-testid="audit-footer-hash"
        >
          {abbreviateHash(props.doc.input_csv_sha256)}
        </dd>

        <dt class="font-medium">Algorithmus-Version:</dt>
        <dd class="font-mono">
          {props.doc.algorithm_version}{' '}
          <span class="text-slate-500">(PRNG {props.doc.prng})</span>
        </dd>

        <dt class="font-medium">Tie-Break-Regel:</dt>
        <dd class="font-mono">{props.doc.tie_break_rule}</dd>

        <dt class="font-medium">Stratum-Sortierung:</dt>
        <dd class="font-mono">{props.doc.stratum_sort}</dd>

        <dt class="font-medium">Zeitstempel (UTC):</dt>
        <dd class="font-mono">{props.doc.timestamp_iso}</dd>

        <dt class="font-medium">Signatur-Algorithmus:</dt>
        <dd
          class="font-mono"
          data-testid="audit-footer-sig-algo"
        >
          <Show when={props.doc.signature_algo} fallback="(noch nicht signiert)">
            {props.doc.signature_algo}
          </Show>
        </dd>

        <dt class="font-medium">Public Key (gekürzt):</dt>
        <dd class="font-mono" title={props.doc.public_key ?? ''}>
          {abbreviateToken(props.doc.public_key)}
        </dd>

        <dt class="font-medium">Signatur (gekürzt):</dt>
        <dd
          class="font-mono"
          title={props.doc.signature ?? ''}
          data-testid="audit-footer-sig"
        >
          {abbreviateToken(props.doc.signature)}
        </dd>
      </dl>
      <p class="text-slate-600 italic mt-2">
        Vollständige Signatur und Hashes sind im Audit-JSON-Download
        enthalten. Die Signatur deckt die canonicalisierte Form des
        Audit-Dokuments inklusive der gezogenen Personen-Indizes ab.
      </p>
    </section>
  );
};
