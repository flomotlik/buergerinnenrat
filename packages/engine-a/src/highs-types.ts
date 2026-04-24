// Re-export the public shape of the `highs` package types for our internal use.
// This is just a re-declaration so we have exportable type names.

export interface HighsSolutionColumn {
  Primal: number;
  Dual?: number;
  Type?: 'Integer' | 'Continuous';
  Name: string;
}

export interface HighsSolutionRow {
  Primal: number;
  Dual?: number;
  Name: string;
}

export interface HighsResult {
  Status: string;
  ObjectiveValue: number;
  Columns: Record<string, HighsSolutionColumn>;
  Rows: HighsSolutionRow[];
}

export interface HighsOptions {
  random_seed?: number;
  time_limit?: number;
  output_flag?: boolean;
  presolve?: 'on' | 'off' | 'choose';
  parallel?: 'on' | 'off' | 'choose';
}

export interface Highs {
  solve(problem: string, options?: HighsOptions): HighsResult;
}
