// RFC-4180 CSV writer for Stage 1.
//
// We deliberately ship our own writer instead of reusing `rowsToCsv` from
// the pool generator (no quoting) or `selectedToCsv` from the web layer
// (filters to known fields only). Stage 1 must preserve every original
// header in the original order and round-trip cleanly through `parseCsvBuffer`.

/**
 * Quote a single CSV field per RFC-4180.
 *
 * Wraps the value in `"..."` and escapes internal `"` as `""` if it contains
 * any of: `,`, `;`, `"`, `\n`, `\r`. Otherwise returns the raw value.
 *
 * Note: we treat `;` as needing-quote even though our output uses `,` as the
 * separator, because some downstream tools (e.g. Excel-de) reparse with `;`.
 */
export function rfc4180Quote(value: string): string {
  if (/[",;\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export interface Stage1CsvOptions {
  /** Append a `gezogen` (true/false) column. Defaults to false. */
  includeGezogenColumn?: boolean;
}

export interface Stage1CsvResult {
  /** Full CSV text (UTF-8, `,`-separator, `\r\n` line endings, RFC-4180 quoting). */
  csv: string;
  /** Warnings, e.g. column-name collisions when `includeGezogenColumn` is set. */
  warnings: string[];
}

/**
 * Serialize a Stage 1 result to a CSV string.
 *
 * - Preserves all `headers` in original order.
 * - Emits one row per index in `selected[]`, in `selected[]` order.
 * - Always uses `,` separator (UTF-8 / RFC-4180 standard).
 * - Optional `gezogen` column appended at the end. On column-name conflict
 *   the new column is renamed to `gezogen_2` and a warning is pushed.
 */
export function stage1ResultToCsv(
  headers: string[],
  rows: Record<string, string>[],
  selected: number[],
  opts?: Stage1CsvOptions,
): Stage1CsvResult {
  const includeGezogen = opts?.includeGezogenColumn === true;
  const warnings: string[] = [];

  let outHeaders = [...headers];
  let gezogenHeader: string | null = null;

  if (includeGezogen) {
    gezogenHeader = 'gezogen';
    if (headers.includes('gezogen')) {
      gezogenHeader = 'gezogen_2';
      warnings.push(
        "Spalte 'gezogen' existiert bereits, neue Spalte als 'gezogen_2' angehängt.",
      );
    }
    outHeaders = [...headers, gezogenHeader];
  }

  const lines: string[] = [];
  lines.push(outHeaders.map(rfc4180Quote).join(','));

  // Set of selected indices for O(1) membership tests when the gezogen column is on.
  // Currently we only emit selected rows, so the column is always 'true'. The
  // mechanism is in place if a future option emits all rows with true/false.
  for (const idx of selected) {
    const row = rows[idx];
    if (row === undefined) continue;
    const cells = headers.map((h) => rfc4180Quote(row[h] ?? ''));
    if (includeGezogen) cells.push('true');
    lines.push(cells.join(','));
  }

  return { csv: lines.join('\r\n') + '\r\n', warnings };
}
