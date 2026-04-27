import type { Component, JSX } from 'solid-js';

interface CardDef {
  testid: string;
  title: string;
  sub: string;
  hash: string;
  // Inline-SVG icon, rendered ~28×28 above the title. Stroke uses currentColor
  // so the per-card text class drives both icon and label colour.
  icon: JSX.Element;
  // Per-card foreground tint — algorithm/audit use the brand-accent green
  // (positive civic-tech connotation), verification uses a subtle slate so
  // the three cards together read as a unit, not a rainbow.
  iconColor: string;
}

const ICON_SIZE = 'h-7 w-7';

const CARDS: ReadonlyArray<CardDef> = [
  {
    testid: 'trust-card-algorithmus',
    title: 'Algorithmus seit 1792',
    sub: 'Hamilton-Methode (Largest-Remainder)',
    hash: '#/docs/algorithmus',
    iconColor: 'text-brand-accent',
    // Open book icon: signals "public/documented method".
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        class={ICON_SIZE}
        aria-hidden="true"
      >
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
      </svg>
    ),
  },
  {
    testid: 'trust-card-verifikation',
    title: 'Cross-validiert',
    // 21/21 byte-identical comes from docs/stage1-validation-report.md.
    // Hardcoded with a comment so a docs reviewer notices when the
    // cross-validation matrix changes; see RESEARCH.md Risk #7. TODO: read
    // from a stats.json once the CI run produces one.
    sub: '21/21 byte-identisch mit Python-Referenz',
    hash: '#/docs/verifikation',
    iconColor: 'text-brand-accent',
    // Check-circle icon: signals "verified/passing".
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        class={ICON_SIZE}
        aria-hidden="true"
      >
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    ),
  },
  {
    testid: 'trust-card-audit',
    title: 'Signiertes Audit-Protokoll',
    sub: 'Vollständig nachprüfbar (Ed25519/ECDSA)',
    hash: '#/docs/verifikation',
    iconColor: 'text-brand-accent',
    // Shield icon: signals "tamper-evident / cryptographically protected".
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        class={ICON_SIZE}
        aria-hidden="true"
      >
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    ),
  },
];

/**
 * Three trust-signal cards directly under the Stage-1 step header. Each card
 * has an inline-SVG icon (~28px), title, and one-line subtitle. Card uses the
 * shared `card card-hover` classes for a subtle border + hover-lift; subtle
 * brand-muted background tint keeps the strip cohesive without competing
 * with the rest of the page. Each card writes a hash that the App router
 * picks up and switches to the corresponding docs page.
 */
const TrustStrip: Component = () => {
  function open(hash: string) {
    window.location.hash = hash;
  }

  return (
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4" data-testid="stage1-trust-strip">
      {CARDS.map((card) => (
        <button
          type="button"
          class="card card-hover bg-brand-muted/40 text-left flex flex-col gap-3 items-start"
          onClick={() => open(card.hash)}
          data-testid={card.testid}
        >
          <span class={card.iconColor}>{card.icon}</span>
          <div class="space-y-1">
            <div class="font-semibold text-slate-900 text-sm">{card.title}</div>
            <div class="text-xs text-slate-600">{card.sub}</div>
          </div>
        </button>
      ))}
    </div>
  );
};

export default TrustStrip;
