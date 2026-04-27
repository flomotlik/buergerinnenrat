// Quota model and validators. Pure functions; the editor component layers
// reactive state on top.

export interface QuotaBound {
  min: number;
  max: number;
}

export interface CategoryQuota {
  column: string;
  bounds: Record<string, QuotaBound>;
}

export interface QuotaConfig {
  panel_size: number;
  categories: CategoryQuota[];
}

export interface CategoryValidation {
  column: string;
  ok: boolean;
  errors: string[];
  warnings: string[];
}

export interface QuotaValidation {
  ok: boolean;
  panel_errors: string[];
  per_category: CategoryValidation[];
}

export function uniqueValues(rows: Record<string, string>[], column: string): string[] {
  const set = new Set<string>();
  for (const r of rows) {
    const v = r[column];
    if (v !== undefined && v !== '') set.add(v);
  }
  return Array.from(set).sort();
}

export function emptyCategory(
  column: string,
  values: readonly string[],
  panelSize: number,
): CategoryQuota {
  const bounds: Record<string, QuotaBound> = {};
  for (const v of values) bounds[v] = { min: 0, max: panelSize };
  return { column, bounds };
}

export function valueCounts(
  rows: Record<string, string>[],
  column: string,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of rows) {
    const v = r[column];
    if (!v) continue;
    out[v] = (out[v] ?? 0) + 1;
  }
  return out;
}

export function validateQuotas(
  rows: Record<string, string>[],
  config: QuotaConfig,
): QuotaValidation {
  const panel_errors: string[] = [];
  if (!Number.isFinite(config.panel_size) || config.panel_size < 10) {
    panel_errors.push('Panel-Größe muss ≥ 10 sein.');
  }
  if (config.panel_size > rows.length) {
    panel_errors.push(`Panel-Größe (${config.panel_size}) > Pool-Größe (${rows.length}).`);
  }

  const per_category: CategoryValidation[] = config.categories.map((cat) => {
    const errors: string[] = [];
    const warnings: string[] = [];
    let sumMin = 0;
    let sumMax = 0;
    const counts = valueCounts(rows, cat.column);
    for (const [val, b] of Object.entries(cat.bounds)) {
      if (b.min < 0 || b.max < 0) errors.push(`${cat.column}=${val}: min/max müssen ≥ 0 sein.`);
      if (b.max < b.min) errors.push(`${cat.column}=${val}: max < min.`);
      sumMin += b.min;
      sumMax += b.max;
      const inPool = counts[val] ?? 0;
      if (b.min > inPool) {
        warnings.push(
          `${cat.column}=${val}: min=${b.min} > nur ${inPool} Personen im Pool — wahrscheinlich infeasible.`,
        );
      }
    }
    if (sumMin > config.panel_size) {
      errors.push(`${cat.column}: Summe der min (${sumMin}) > Panel-Größe (${config.panel_size}).`);
    }
    if (sumMax < config.panel_size) {
      errors.push(`${cat.column}: Summe der max (${sumMax}) < Panel-Größe (${config.panel_size}).`);
    }
    return { column: cat.column, ok: errors.length === 0, errors, warnings };
  });

  const ok = panel_errors.length === 0 && per_category.every((c) => c.ok);
  return { ok, panel_errors, per_category };
}

export function quotaConfigToJson(config: QuotaConfig): string {
  return JSON.stringify(config, null, 2);
}

export function quotaConfigFromJson(text: string): QuotaConfig {
  const parsed: unknown = JSON.parse(text);
  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    typeof (parsed as { panel_size?: unknown }).panel_size !== 'number' ||
    !Array.isArray((parsed as { categories?: unknown }).categories)
  ) {
    throw new Error('JSON ist keine gültige QuotaConfig.');
  }
  return parsed as QuotaConfig;
}
