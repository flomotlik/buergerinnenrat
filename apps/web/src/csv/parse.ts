// CSV parsing with permissive defaults: detect separator, decode common
// 8-bit codepages, strip BOM. We deliberately keep the surface tiny —
// we want to import test fixtures and reasonable real-world CSVs in
// iteration 1, not fight every legacy encoding.

import Papa from 'papaparse';

export type SupportedEncoding = 'utf-8' | 'windows-1252' | 'iso-8859-1';

export interface ParsedCsv {
  headers: string[];
  rows: Record<string, string>[];
  separator: ',' | ';' | '\t';
  encoding: SupportedEncoding;
  warnings: string[];
}

const BOM = 0xfeff;

function decodeBuffer(buf: ArrayBuffer): { text: string; encoding: SupportedEncoding } {
  const bytes = new Uint8Array(buf);
  // utf-8 BOM
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return { text: new TextDecoder('utf-8').decode(buf), encoding: 'utf-8' };
  }
  // try utf-8 strict; if it throws, fall back to windows-1252
  try {
    const text = new TextDecoder('utf-8', { fatal: true }).decode(buf);
    return { text, encoding: 'utf-8' };
  } catch {
    // Heuristic: windows-1252 is a strict superset of iso-8859-1 in the
    // 0x80-0x9f range, so try windows-1252 first.
    const text = new TextDecoder('windows-1252').decode(buf);
    return { text, encoding: 'windows-1252' };
  }
}

function stripBom(text: string): string {
  return text.charCodeAt(0) === BOM ? text.slice(1) : text;
}

function detectSeparator(headerLine: string): ',' | ';' | '\t' {
  const counts: Record<',' | ';' | '\t', number> = {
    ',': (headerLine.match(/,/g) ?? []).length,
    ';': (headerLine.match(/;/g) ?? []).length,
    '\t': (headerLine.match(/\t/g) ?? []).length,
  };
  // Pick whichever appears most. Tie → comma.
  let best: ',' | ';' | '\t' = ',';
  let bestCount = -1;
  for (const sep of [',', ';', '\t'] as const) {
    if (counts[sep] > bestCount) {
      best = sep;
      bestCount = counts[sep];
    }
  }
  return best;
}

export async function parseCsvFile(file: File): Promise<ParsedCsv> {
  const buf = await file.arrayBuffer();
  return parseCsvBuffer(buf);
}

export function parseCsvBuffer(buf: ArrayBuffer): ParsedCsv {
  const { text: rawText, encoding } = decodeBuffer(buf);
  const text = stripBom(rawText);

  const firstNewline = text.indexOf('\n');
  const headerLine = firstNewline < 0 ? text : text.slice(0, firstNewline);
  const separator = detectSeparator(headerLine);

  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: 'greedy',
    delimiter: separator,
    transformHeader: (h) => h.trim(),
  });

  const warnings: string[] = [];
  for (const err of result.errors) {
    warnings.push(`row ${err.row ?? '?'}: ${err.message}`);
  }

  const headers = (result.meta.fields ?? []).map((h) => h.trim()).filter(Boolean);
  const rows = result.data
    .map((row) => {
      const out: Record<string, string> = {};
      for (const h of headers) {
        const v = row[h];
        out[h] = typeof v === 'string' ? v.trim() : v == null ? '' : String(v);
      }
      return out;
    })
    .filter((r) => Object.values(r).some((v) => v.length > 0));

  return { headers, rows, separator, encoding, warnings };
}

// --- mapping ----------------------------------------------------------------

export const SEMANTIC_FIELDS = [
  'person_id',
  'gender',
  'age_band',
  'education',
  'migration_background',
  'district',
] as const;

export type SemanticField = (typeof SEMANTIC_FIELDS)[number];

export type ColumnMapping = Record<string, SemanticField | '__ignore__'>;

const DEFAULT_GUESS: Record<string, SemanticField> = {
  person_id: 'person_id',
  id: 'person_id',
  geschlecht: 'gender',
  gender: 'gender',
  age_band: 'age_band',
  alter: 'age_band',
  altersband: 'age_band',
  bildung: 'education',
  education: 'education',
  migration: 'migration_background',
  migration_background: 'migration_background',
  bezirk: 'district',
  district: 'district',
  sprengel: 'district',
};

export function autoGuessMapping(headers: readonly string[]): ColumnMapping {
  const out: ColumnMapping = {};
  for (const h of headers) {
    const key = h.trim().toLowerCase().replace(/\s+/g, '_');
    out[h] = DEFAULT_GUESS[key] ?? '__ignore__';
  }
  return out;
}

export interface MappingValidation {
  ok: boolean;
  errors: string[];
  duplicate_person_ids: string[];
}

export function validateMapping(rows: Record<string, string>[], mapping: ColumnMapping): MappingValidation {
  const errors: string[] = [];
  const personIdCol = Object.entries(mapping).find(([, v]) => v === 'person_id')?.[0];
  if (!personIdCol) errors.push('Spalte für `person_id` muss gemappt sein.');

  const duplicates: string[] = [];
  if (personIdCol) {
    const seen = new Map<string, number>();
    for (const r of rows) {
      const id = r[personIdCol] ?? '';
      if (!id) {
        errors.push('Mindestens eine Zeile hat eine leere `person_id`.');
        break;
      }
      seen.set(id, (seen.get(id) ?? 0) + 1);
    }
    for (const [id, count] of seen) {
      if (count > 1) duplicates.push(id);
    }
    if (duplicates.length) {
      errors.push(`${duplicates.length} doppelte person_id (z.B. ${duplicates.slice(0, 3).join(', ')}).`);
    }
  }
  return { ok: errors.length === 0, errors, duplicate_person_ids: duplicates };
}

export function applyMapping(rows: Record<string, string>[], mapping: ColumnMapping): Record<string, string>[] {
  return rows.map((row) => {
    const out: Record<string, string> = {};
    for (const [origCol, target] of Object.entries(mapping)) {
      if (target === '__ignore__') continue;
      const v = row[origCol];
      if (v !== undefined) out[target] = v;
    }
    return out;
  });
}
