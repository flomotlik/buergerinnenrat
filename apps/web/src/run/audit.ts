import type { Pool, Quotas, RunResult } from '@sortition/engine-contract';
import type { SeatAllocation, SeatAllocationOverride } from '../quotas/seat-allocation';

/**
 * Per-axis-value seat-allocation deviation (override - baseline).
 * Pre-computed in buildAudit so external verifiers don't have to redo
 * the subtraction. delta_percent is delta_seats / panel_size.
 */
export interface SeatAllocationAudit {
  baseline: Record<string, Record<string, number>>;
  override: SeatAllocationOverride | null;
  /** axis-value → {delta_seats, delta_percent}; null when no override active. */
  deviation: Record<string, { delta_seats: number; delta_percent: number }> | null;
}

export interface AuditDoc {
  schema_version: string;
  engine: { id: string; version: string };
  algorithm: 'maximin';
  seed: number;
  input_sha256: string;
  panel_size: number;
  pool_size: number;
  selected: string[];
  marginals: Record<string, number>;
  quota_fulfillment: RunResult['quota_fulfillment'];
  timing: { duration_ms: number; total_ms: number; num_committees?: number };
  /**
   * Optional seat-allocation block. Present in 0.2 manifests when the run
   * recorded baseline + (optional) override. Absent in 0.1 manifests and in
   * 0.2 manifests where the caller didn't supply seatAllocation.
   *
   * Backward-compat: external verifier (scripts/verify_audit.py) accepts
   * both schema versions because REQUIRED_FIELDS does not include this.
   */
  seat_allocation?: SeatAllocationAudit;
  // Filled in by signAudit().
  public_key?: string;
  signature?: string;
  signature_algo?: 'Ed25519' | 'ECDSA-P256-SHA256';
}

export const AUDIT_SCHEMA_VERSION = '0.2';

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function toBase64(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

function canonicalQuotas(q: Quotas): string {
  // Stable serialization: sort categories by column, sort bound keys, fixed
  // float precision. Without this, two semantically identical configs would
  // produce different hashes (cf. JSON key order differing across browsers).
  const cats = [...q.categories].sort((a, b) => a.column.localeCompare(b.column));
  const norm = {
    panel_size: q.panel_size,
    categories: cats.map((c) => {
      const keys = Object.keys(c.bounds).sort();
      const bounds: Record<string, { min: number; max: number }> = {};
      for (const k of keys) bounds[k] = { min: c.bounds[k]!.min, max: c.bounds[k]!.max };
      return { column: c.column, bounds };
    }),
  };
  return JSON.stringify(norm);
}

function canonicalPool(p: Pool): string {
  // Hash over: id + ordered persons + their attribute keys+values, sorted.
  const persons = [...p.people].sort((a, b) => a.person_id.localeCompare(b.person_id));
  const norm = {
    id: p.id,
    people: persons.map((person) => {
      const keys = Object.keys(person).sort();
      const out: Record<string, unknown> = {};
      for (const k of keys) out[k] = person[k];
      return out;
    }),
  };
  return JSON.stringify(norm);
}

export async function inputSha256(pool: Pool, quotas: Quotas): Promise<string> {
  const text = canonicalPool(pool) + '' + canonicalQuotas(quotas);
  return sha256Hex(new TextEncoder().encode(text));
}

export async function buildAudit(args: {
  pool: Pool;
  /**
   * The quotas actually fed to the LP (post-override). Hash is computed
   * over these so an external verifier with `pool + effectiveQuotas`
   * regenerates the same input_sha256 (RESEARCH.md Pitfall 4).
   */
  quotas: Quotas;
  seed: number;
  result: RunResult;
  duration_ms: number;
  /**
   * Optional seat-allocation context. When supplied, the audit records the
   * baseline and (optionally) the override + per-value deviation. Absent
   * → schema_version stays 0.2 but no seat_allocation block is emitted
   * (backward-compat with callers that don't track allocation).
   */
  seatAllocation?: SeatAllocation;
}): Promise<AuditDoc> {
  const inputHash = await inputSha256(args.pool, args.quotas);
  // Build the doc in a fixed property order. Stage-3 signing uses plain
  // JSON.stringify (NOT canonicalStage1Json), so insertion order IS the
  // serialization order — Pitfall 6 in RESEARCH.md. Never use Object spread
  // for AuditDoc fields; that would let property order drift.
  const doc: AuditDoc = {
    schema_version: AUDIT_SCHEMA_VERSION,
    engine: {
      id: args.result.engine_meta.engine_id,
      version: args.result.engine_meta.engine_version,
    },
    algorithm: 'maximin',
    seed: args.seed,
    input_sha256: inputHash,
    panel_size: args.quotas.panel_size,
    pool_size: args.pool.people.length,
    selected: [...args.result.selected].sort(),
    marginals: args.result.marginals,
    quota_fulfillment: args.result.quota_fulfillment,
    timing: {
      duration_ms: args.duration_ms,
      total_ms: args.result.timing.total_ms,
      ...(args.result.timing.num_committees !== undefined
        ? { num_committees: args.result.timing.num_committees }
        : {}),
    },
  };
  if (args.seatAllocation !== undefined) {
    doc.seat_allocation = computeSeatAllocationAudit(args.seatAllocation, args.quotas.panel_size);
  }
  return doc;
}

/**
 * Compute the seat_allocation audit block from a SeatAllocation. When no
 * override is set, deviation is null (caller still records baseline so a
 * verifier can compare a baseline-only run to an override run later).
 */
function computeSeatAllocationAudit(
  seatAllocation: SeatAllocation,
  panelSize: number,
): SeatAllocationAudit {
  if (!seatAllocation.override) {
    return {
      baseline: seatAllocation.baseline,
      override: null,
      deviation: null,
    };
  }
  const override = seatAllocation.override;
  const baseAxis = seatAllocation.baseline[override.axis] ?? {};
  const allValues = new Set<string>([...Object.keys(baseAxis), ...Object.keys(override.seats)]);
  const deviation: Record<string, { delta_seats: number; delta_percent: number }> = {};
  for (const v of allValues) {
    const b = baseAxis[v] ?? 0;
    const o = override.seats[v] ?? 0;
    const delta = o - b;
    deviation[v] = {
      delta_seats: delta,
      delta_percent: panelSize === 0 ? 0 : delta / panelSize,
    };
  }
  return {
    baseline: seatAllocation.baseline,
    override,
    deviation,
  };
}

export interface SignedAudit {
  doc: AuditDoc;
  bodyJson: string; // serialized doc *without* public_key/signature
}

async function signWithEd25519(
  bodyJson: string,
): Promise<{ pubB64: string; sigB64: string; algo: string }> {
  const keyPair = (await crypto.subtle.generateKey({ name: 'Ed25519' }, true, [
    'sign',
    'verify',
  ])) as CryptoKeyPair;
  const pub = await crypto.subtle.exportKey('raw', keyPair.publicKey);
  const sig = await crypto.subtle.sign(
    'Ed25519',
    keyPair.privateKey,
    new TextEncoder().encode(bodyJson),
  );
  return {
    pubB64: toBase64(new Uint8Array(pub)),
    sigB64: toBase64(new Uint8Array(sig)),
    algo: 'Ed25519',
  };
}

async function signWithEcdsa(
  bodyJson: string,
): Promise<{ pubB64: string; sigB64: string; algo: string }> {
  const keyPair = (await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, [
    'sign',
    'verify',
  ])) as CryptoKeyPair;
  const pub = await crypto.subtle.exportKey('spki', keyPair.publicKey);
  const sig = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    keyPair.privateKey,
    new TextEncoder().encode(bodyJson),
  );
  return {
    pubB64: toBase64(new Uint8Array(pub)),
    sigB64: toBase64(new Uint8Array(sig)),
    algo: 'ECDSA-P256-SHA256',
  };
}

export async function signAudit(doc: AuditDoc): Promise<SignedAudit> {
  // Try Ed25519 (Chromium 113+ / Firefox 130+). Fall back to ECDSA-P256
  // on older browsers — both are NIST-approved, the verify script supports
  // both via the `signature_algo` field.
  const bodyJson = JSON.stringify(stripSignature(doc));
  let signed: { pubB64: string; sigB64: string; algo: string };
  try {
    signed = await signWithEd25519(bodyJson);
  } catch (_e) {
    signed = await signWithEcdsa(bodyJson);
  }
  const result: AuditDoc = {
    ...doc,
    public_key: signed.pubB64,
    signature: signed.sigB64,
    signature_algo: signed.algo as 'Ed25519' | 'ECDSA-P256-SHA256',
  };
  return { doc: result, bodyJson };
}

function stripSignature(
  doc: AuditDoc,
): Omit<AuditDoc, 'public_key' | 'signature' | 'signature_algo'> {
  const { public_key: _pk, signature: _sig, signature_algo: _algo, ...rest } = doc;
  return rest;
}

// CSV of selected people with all attributes (for the invitation list).
export function selectedToCsv(pool: Pool, selectedIds: string[]): string {
  const sel = pool.people.filter((p) => selectedIds.includes(p.person_id));
  if (sel.length === 0) return '';
  const headers = Object.keys(sel[0]!);
  const lines = [headers.join(',')];
  for (const p of sel) {
    lines.push(headers.map((h) => String(p[h] ?? '')).join(','));
  }
  return lines.join('\n') + '\n';
}

// XLSX of selected people, mirrors selectedToCsv. Lazy import keeps SheetJS
// out of the main bundle — only triggered when the user clicks 'Excel
// exportieren' in RunPanel.
export async function selectedToXlsx(pool: Pool, selectedIds: string[]): Promise<ArrayBuffer> {
  const XLSX = await import('xlsx');
  const sel = pool.people.filter((p) => selectedIds.includes(p.person_id));
  // Build 2D array — header row + data rows. Even an empty selection emits a
  // valid one-sheet workbook; SheetJS's aoa_to_sheet handles [[]] OK.
  if (sel.length === 0) {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([[]]), 'Panel');
    return XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
  }
  const headers = Object.keys(sel[0]!);
  const aoa: string[][] = [headers];
  for (const p of sel) {
    aoa.push(headers.map((h) => String(p[h] ?? '')));
  }
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), 'Panel');
  return XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
}

export function downloadBlob(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// Binary variant of downloadBlob — wraps an ArrayBuffer/Uint8Array as a Blob
// for xlsx and other binary downloads. The Blob constructor accepts both
// directly without needing a copy.
export function downloadBinaryBlob(
  filename: string,
  content: ArrayBuffer | Uint8Array,
  mime: string,
): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
