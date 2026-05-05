import type { Component } from 'solid-js';

/**
 * Use-cases hub — three Anwendungsbeispiele as accordion sections.
 *
 * Each section uses <details open> so all three are visible by default
 * (readers can compare without clicking), but collapsible if a reader
 * wants to focus on one. <h2> per section is auto-extracted by
 * DocsLayout into the sticky TOC, giving readers a 3-anchor index.
 *
 * Architecture decision (CONTEXT.md L51 / RESEARCH.md §"Architektur
 * Patterns"): single sub-route with three accordion sections, NOT three
 * separate sub-routes. ~150-300 words per use case is below the
 * threshold where individual URLs add value, and a single page lets
 * readers compare workflows side by side.
 */
const UseCases: Component = () => {
  return (
    <div class="space-y-6" data-testid="docs-page-use-cases">
      <section class="space-y-3">
        <h2 class="text-xl font-semibold">Drei Verfahren, ein Werkzeug</h2>
        <p>
          Personenauswahl ist eine Toolbox aus drei zusammensetzbaren Primitiven:{' '}
          <strong>stratifizierte Auswahl</strong>, <strong>Quoten-Override</strong> und{' '}
          <strong>Nachwahl</strong>. Verschiedene Verfahren-Typen — vom Bürgerinnenrat über die
          Landeskonferenz bis zum Vereinsgremium — sind dieselbe Komposition mit anderen Pool-Größen
          und Workflow-Reihenfolgen. Was sich unterscheidet, ist organisatorisch, nicht
          algorithmisch.
        </p>
        <p>
          Anschreiben und Antwort-Tracking liegen außerhalb des Tools — der/die
          Verfahrens-Begleiter:in pflegt das per Excel, Mail-Merge oder Telefon-Liste. Das Tool
          sieht davon nichts.
        </p>
      </section>

      <section class="space-y-2">
        <h2 class="text-xl font-semibold">Bürgerinnenrat</h2>
        <details open>
          <summary class="cursor-pointer text-sm font-semibold text-ink-2">
            Herzogenburg-Daten, zweistufige Auswahl aus dem Melderegister
          </summary>
          <div class="space-y-3 mt-3">
            <p class="text-sm">
              <strong>Was ist das?</strong> Geloster, deliberativ arbeitender Bürger:innenrat auf
              Gemeinde- oder Bundes-Ebene (Vorbild: österreichische/deutsche Praxis). Kommunen geben
              aus dem Melderegister einen erlaubten Feldsatz heraus (in Deutschland geregelt durch
              §46 BMG, in Österreich durch das Meldegesetz 1991 — der Träger klärt den Datenzugang
              vorab mit der Behörde); die Auswahl erfolgt zweistufig (Versand-Liste +
              Antwortenden-Panel).
            </p>
            <h3 class="text-base font-semibold">Workflow (Tool-Primitive)</h3>
            <ol class="list-decimal pl-5 space-y-1 text-sm">
              <li>
                <strong>Stage 1 / Auswahl</strong> — Pool: Vollbevölkerung 18+ aus Melderegister;
                Stichprobe ~300–1500 Personen mittels stratifizierter Zufallsziehung.
              </li>
              <li>Anschreiben extern (Brief, Mail, Telefon-Outreach).</li>
              <li>
                <strong>Stage 3 / Auswahl</strong> — Pool: ~30–60 Antwortende mit Selbstauskunft;
                Maximin-Heuristik wählt das Panel (15–50 Personen) mit
                Bildung/Migrationshintergrund-Quoten.
              </li>
              <li>
                <strong>Quoten-Override</strong> bei Bedarf, z.B. wenn ein Quoten-Bound zu hart ist
                (Issue #71).
              </li>
              <li>
                <strong>Nachwahl</strong> (Stage 4, geplant) bei Drop-out aus optionaler Reserve.
              </li>
            </ol>
            <p class="text-sm">
              <strong>Beispiel-Daten:</strong>{' '}
              <a href="#/docs/beispiele" class="underline">
                Herzogenburg-Melderegister + Antwortende
              </a>
              .
            </p>
            <p class="text-sm">
              <strong>Audit-Trail:</strong> Stage 1 produziert{' '}
              <code>versand-audit-&lt;seed&gt;.json</code> mit Stichprobe, Stratifikations-Achsen,
              Soll/Ist pro Stratum, Ed25519-Signatur. Stage 3 ergänzt das Panel-Manifest mit
              Quoten-Verteilung.
            </p>
          </div>
        </details>
      </section>

      <section class="space-y-2">
        <h2 class="text-xl font-semibold">Landeskonferenz / Parteitag-Delegation</h2>
        <details open>
          <summary class="cursor-pointer text-sm font-semibold text-ink-2">
            50–100 Delegierte, einstufige Auswahl, „min 50 % unter 50"
          </summary>
          <div class="space-y-3 mt-3">
            <p class="text-sm">
              <strong>Was ist das?</strong> Auswahl von 50–100 Delegierten aus einer Mitgliederliste
              (regionaler Verband, Landesgruppe, Parteiorganisation). Ziel: faire Repräsentation
              nach Gemeinde, Bezirk, Altersband, Geschlecht, evtl. Funktion. Beispiel: „100
              Delegierte aus 87 Gemeinden, mindestens 50 % unter 50 Jahre, mindestens 40 %
              weiblich."
            </p>
            <h3 class="text-base font-semibold">Workflow (Tool-Primitive)</h3>
            <ol class="list-decimal pl-5 space-y-1 text-sm">
              <li>
                <strong>Auswahl</strong> — Pool: Mitgliederliste (CSV/Excel-Upload, Issue #72).
                Direkt einstufig: stratifizierte Stichprobe auf
                Gemeinde/Bezirk/Altersband/Geschlecht.
              </li>
              <li>
                <strong>Quoten-Override</strong> — Verfahrens-Begleiter setzt z.B. die untere Bound
                für <em>geschlecht=weiblich</em> von 35 auf 40 (Issue #71).
              </li>
              <li>Anschreiben extern (Mail-Merge oder Brief).</li>
              <li>
                <strong>Nachwahl</strong> bei Absagen — kleinere Auswahl (5–10 Personen) aus dem
                Pool, mit denselben Quoten und einem neuen Seed.
              </li>
            </ol>
            <p class="text-sm">
              <strong>Beispiel-Daten:</strong> Generische Mitgliederliste — User generiert sich
              selbst eine (ähnliches Schema wie <code>kleinstadt-3000.csv</code>, ergänzt um
              Gemeindespalte).
            </p>
            <p class="text-sm">
              <strong>Audit-Trail:</strong> Identisches JSON-Format wie Stage 1 (
              <code>versand-audit-&lt;seed&gt;.json</code>) — die Struktur ist generisch genug, dass
              „Versand-Liste" hier „Delegierten-Liste" entspricht.
            </p>
          </div>
        </details>
      </section>

      <section class="space-y-2">
        <h2 class="text-xl font-semibold">Internes Auswahl-Verfahren / Vereinsgremium</h2>
        <details open>
          <summary class="cursor-pointer text-sm font-semibold text-ink-2">
            Niedrigschwelliger Use Case, kleine Pool-Größen
          </summary>
          <div class="space-y-3 mt-3">
            <p class="text-sm">
              <strong>Was ist das?</strong> Ein Verein, eine NGO oder eine Schule will ein
              5–15-köpfiges Gremium aus 50–500 Personen losen — mit einfachen Quoten (z.B. „drei
              Sitze für jede Altersgruppe"). Kein juristischer Kontext, keine
              Melderegister-Komplexität.
            </p>
            <h3 class="text-base font-semibold">Workflow (Tool-Primitive)</h3>
            <ol class="list-decimal pl-5 space-y-1 text-sm">
              <li>
                <strong>Auswahl</strong> — Pool: Vereins-Mitgliederliste (Excel-Upload, Issue #72).
                Stratifikation auf 1–2 Achsen (Altersgruppe, evtl. Funktion).
              </li>
              <li>
                <strong>Quoten-Override</strong> — selten nötig bei kleinen Pools, aber verfügbar.
              </li>
              <li>Anschreiben extern (Mail).</li>
              <li>
                <strong>Nachwahl</strong> bei Absage — 1–2 Personen.
              </li>
            </ol>
            <p class="text-sm">
              <strong>Beispiel-Daten:</strong> Hand-erzeugtes Beispiel mit ~80 Personen reicht. Kann
              der User selbst aus Kontoliste/CSV-Export bauen.
            </p>
            <p class="text-sm">
              <strong>Audit-Trail:</strong> Reines <code>versand-audit-&lt;seed&gt;.json</code> —
              die Signatur dient hier eher der internen Transparenz („alle Mitglieder können den
              Lauf nachvollziehen") als der juristischen Anforderung.
            </p>
          </div>
        </details>
      </section>
    </div>
  );
};

export default UseCases;
