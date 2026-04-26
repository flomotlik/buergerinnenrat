// CSV writer for the synthetic Meldedaten output. RFC-4180 quoting rules
// applied conservatively (only fields containing comma, quote, or newline
// are wrapped); LF as line separator (matches the existing parseCsvFile()
// in apps/web which accepts both LF and CRLF).

import type { Person } from './types';

export const STAGE1_HEADERS = [
  'person_id',
  'vorname',
  'nachname',
  'geburtsjahr',
  'geschlecht',
  'staatsbuergerschaft',
  'sprengel',
  'katastralgemeinde',
  'haushaltsnummer',
] as const;

export const STAGE3_HEADERS = [
  ...STAGE1_HEADERS,
  'bildung',
  'migrationshintergrund',
] as const;

export type Stage1Header = (typeof STAGE1_HEADERS)[number];
export type Stage3Header = (typeof STAGE3_HEADERS)[number];

const NEEDS_QUOTING = /[",\n\r]/;
const UTF8_BOM = '﻿';

/** Conservative RFC-4180 quoting: wrap in "..." only if necessary. */
function quoteField(v: string): string {
  if (NEEDS_QUOTING.test(v)) {
    return '"' + v.replace(/"/g, '""') + '"';
  }
  return v;
}

export interface WriteCsvOptions {
  extraFields?: 'none' | 'self-report';
  bom?: boolean;
}

/**
 * Serialize Person[] as CSV. Stable sort: katastralgemeinde, sprengel,
 * haushaltsnummer, person_id (lexicographic — naturally orders zero-padded
 * IDs).
 */
export function writeCsv(
  persons: Person[],
  options: WriteCsvOptions = {},
): string {
  const headers =
    options.extraFields === 'self-report' ? STAGE3_HEADERS : STAGE1_HEADERS;

  // Stable sort: copy first, then sort.
  const sorted = persons.slice().sort((a, b) => {
    if (a.katastralgemeinde !== b.katastralgemeinde) {
      return a.katastralgemeinde < b.katastralgemeinde ? -1 : 1;
    }
    if (a.sprengel !== b.sprengel) {
      return a.sprengel < b.sprengel ? -1 : 1;
    }
    if (a.haushaltsnummer !== b.haushaltsnummer) {
      return a.haushaltsnummer < b.haushaltsnummer ? -1 : 1;
    }
    if (a.person_id !== b.person_id) {
      return a.person_id < b.person_id ? -1 : 1;
    }
    return 0;
  });

  const lines: string[] = [];
  lines.push(headers.join(','));
  for (const p of sorted) {
    const row: string[] = [];
    for (const h of headers) {
      const v = (p as unknown as Record<string, unknown>)[h];
      row.push(quoteField(v === undefined || v === null ? '' : String(v)));
    }
    lines.push(row.join(','));
  }
  const body = lines.join('\n') + '\n';
  return options.bom ? UTF8_BOM + body : body;
}
