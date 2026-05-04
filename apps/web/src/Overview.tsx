import type { Component } from 'solid-js';
import { TRUST_PRINCIPLES } from './stage1/TrustStrip';

/**
 * Overview landing route — `#/overview`. Linked from the sidebar
 * "Übersicht" group (NavLink in Sidebar.tsx). Default landing
 * intentionally STAYS `#/stage3` per CONTEXT.md L21; the catch-all in
 * App.tsx parseHash() does NOT route to overview.
 *
 * Three sections:
 *   1. Hero — wordmark + one-line value statement.
 *   2. Workflow — 2 cards (Stage 1 verfügbar, Stage 3 Konzept) + a
 *      banner explaining that Stage 2 (Outreach) and Stage 4 (Reserve)
 *      are intentionally OUT-OF-TOOL per CLAUDE.md L37-44.
 *   3. Principles — 3 columns sourced from TRUST_PRINCIPLES (the same
 *      array TrustStrip.tsx renders) so wording stays in sync.
 */
const Overview: Component = () => {
  return (
    <div class="space-y-8" data-testid="overview-page">
      <header class="overview-hero space-y-3">
        <h1 class="text-4xl font-serif font-semibold text-ink">Personenauswahl</h1>
        <p class="text-lg text-ink-2 max-w-prose">
          Browser-natives Werkzeug für stratifizierte Personenauswahl — z.B. für Bürgerinnenräte,
          Delegierten-Auswahl oder Vereinsgremien. Daten bleiben lokal, Audit-Protokolle sind
          Ed25519-signiert, jede Entscheidung ist nachvollziehbar.
        </p>
      </header>

      <section aria-label="Verfahrensschritte" class="space-y-4">
        <h2 class="text-2xl font-serif mb-1 text-ink">Was dieses Werkzeug abdeckt</h2>
        <div class="grid md:grid-cols-2 gap-4">
          <a
            href="#/stage1"
            class="card card-hover no-underline flex flex-col gap-2"
            data-testid="overview-card-stage1"
          >
            <div class="flex items-center justify-between gap-2">
              <span class="text-xs font-semibold uppercase tracking-wide text-ink-3">Stage 1</span>
              <span class="status-pill status-pill-ok">verfügbar</span>
            </div>
            <h3 class="text-lg font-serif font-semibold text-ink">Versand-Liste ziehen</h3>
            <p class="text-sm text-ink-2">
              Stratifizierte Zufallsauswahl aus dem Melderegister gemäß § 46 BMG. Bytegleich
              reproduzierbar mit der Python-Referenz.
            </p>
          </a>
          <a
            href="#/stage3"
            class="card card-hover no-underline flex flex-col gap-2"
            data-testid="overview-card-stage3"
          >
            <div class="flex items-center justify-between gap-2">
              <span class="text-xs font-semibold uppercase tracking-wide text-ink-3">Stage 3</span>
              <span class="status-pill status-pill-warn">Konzept</span>
            </div>
            <h3 class="text-lg font-serif font-semibold text-ink">Panel-Auswahl</h3>
            <p class="text-sm text-ink-2">
              Maximin-Heuristik aus den Antwortenden. Solver-Wahl S-2 ist offen — derzeit HiGHS via
              WASM, ohne Leximin.
            </p>
          </a>
        </div>
        <aside class="banner info" data-testid="overview-stages-2-4-note">
          <div>
            <strong>Stage 2 (Outreach + Selbstauskunft)</strong> und{' '}
            <strong>Stage 4 (Reserve / Nachholung)</strong> liegen außerhalb des aktuellen
            Funktionsumfangs. Sie werden manuell oder mit anderen Werkzeugen abgewickelt — der
            Versand der Einladungen, das Einsammeln der Selbstauskünfte sowie das Nachziehen bei
            Drop-outs sind organisatorische Aufgaben des Trägers.
          </div>
        </aside>
      </section>

      <section aria-label="Architektur-Prinzipien" class="space-y-4">
        <h2 class="text-2xl font-serif mb-1 text-ink">Architektur-Prinzipien</h2>
        <div class="grid md:grid-cols-3 gap-4" data-testid="overview-principles">
          {TRUST_PRINCIPLES.map((p) => (
            <a
              href={p.hash}
              class="card card-hover no-underline flex flex-col gap-3 items-start"
              data-testid={`overview-principle-${p.testid.replace('trust-card-', '')}`}
            >
              <span class={p.iconColor}>{p.icon}</span>
              <div class="space-y-1">
                <div class="font-serif font-semibold text-ink">{p.title}</div>
                <div class="text-sm text-ink-2">{p.sub}</div>
              </div>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Overview;
