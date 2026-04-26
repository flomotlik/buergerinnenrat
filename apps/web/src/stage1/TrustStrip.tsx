import type { Component } from 'solid-js';

interface CardDef {
  testid: string;
  title: string;
  sub: string;
  hash: string;
}

const CARDS: ReadonlyArray<CardDef> = [
  {
    testid: 'trust-card-algorithmus',
    title: 'Algorithmus seit 1792',
    sub: 'Hamilton-Methode (Largest-Remainder)',
    hash: '#/docs/algorithmus',
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
  },
  {
    testid: 'trust-card-audit',
    title: 'Signiertes Audit-Protokoll',
    sub: 'Vollständig nachprüfbar (Ed25519/ECDSA)',
    hash: '#/docs/verifikation',
  },
];

/**
 * Three trust-signal cards directly under the Stage-1 step header. They are
 * deliberately styled differently from the Werkbank (sky tint) so they read
 * as "context" rather than "tools". Each card writes a hash that the App
 * router picks up and switches to the corresponding docs page.
 */
const TrustStrip: Component = () => {
  function open(hash: string) {
    window.location.hash = hash;
  }

  return (
    <div
      class="grid grid-cols-1 md:grid-cols-3 gap-3"
      data-testid="stage1-trust-strip"
    >
      {CARDS.map((card) => (
        <button
          type="button"
          class="border rounded p-3 bg-sky-50 border-sky-200 hover:bg-sky-100 text-left space-y-1"
          onClick={() => open(card.hash)}
          data-testid={card.testid}
        >
          <div class="font-semibold text-sky-900 text-sm">{card.title}</div>
          <div class="text-xs text-sky-800">{card.sub}</div>
        </button>
      ))}
    </div>
  );
};

export default TrustStrip;
