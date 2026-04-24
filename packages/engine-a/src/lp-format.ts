// Helpers for building LP-format strings that the `highs` npm package expects.
//
// LP format reference: https://lpsolve.sourceforge.net/5.5/lp_format.htm
// We use a strict subset: Maximize/Minimize, Subject To, Bounds, General/Binary, End.

export type Sense = 'Maximize' | 'Minimize';

export interface LinearTerm {
  coef: number;
  var: string;
}

export interface Constraint {
  name: string;
  terms: LinearTerm[];
  op: '<=' | '>=' | '=';
  rhs: number;
}

export interface Bound {
  var: string;
  lb?: number;
  ub?: number;
}

export interface LpProblem {
  sense: Sense;
  objectiveTerms: LinearTerm[];
  constraints: Constraint[];
  bounds: Bound[];
  binary: string[];
  general: string[]; // integer
}

function fmtTerm(t: LinearTerm, leading: boolean): string {
  const sign = t.coef >= 0 ? (leading ? '' : ' + ') : leading ? '-' : ' - ';
  const abs = Math.abs(t.coef);
  const num = abs === 1 ? '' : `${abs} `;
  return `${sign}${num}${t.var}`;
}

function fmtTerms(terms: LinearTerm[]): string {
  if (terms.length === 0) return '0';
  return terms
    .map((t, i) => fmtTerm(t, i === 0))
    .join('');
}

export function buildLp(p: LpProblem): string {
  const lines: string[] = [];
  lines.push(p.sense);
  lines.push(`  obj: ${fmtTerms(p.objectiveTerms)}`);
  lines.push('Subject To');
  for (const c of p.constraints) {
    lines.push(`  ${c.name}: ${fmtTerms(c.terms)} ${c.op} ${c.rhs}`);
  }
  if (p.bounds.length) {
    lines.push('Bounds');
    for (const b of p.bounds) {
      const lb = b.lb === undefined ? '-inf' : b.lb;
      const ub = b.ub === undefined ? '+inf' : b.ub;
      lines.push(`  ${lb} <= ${b.var} <= ${ub}`);
    }
  }
  if (p.binary.length) {
    lines.push('Binary');
    lines.push(`  ${p.binary.join(' ')}`);
  }
  if (p.general.length) {
    lines.push('General');
    lines.push(`  ${p.general.join(' ')}`);
  }
  lines.push('End');
  return lines.join('\n');
}
