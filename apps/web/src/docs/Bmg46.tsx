import type { Component } from 'solid-js';

const ALLOWED_FIELDS: ReadonlyArray<string> = [
  'Familienname, Vornamen, Doktorgrad',
  'Tag und Ort der Geburt',
  'Geschlecht',
  'Anschrift (Straße, Hausnummer, Postleitzahl, Wohnort)',
  'Tag des Einzugs in die Wohnung',
  'Staatsangehörigkeit',
  'Auskunftssperren',
];

const Bmg46: Component = () => {
  return (
    <div class="space-y-6" data-testid="docs-page-bmg46">
      <section class="space-y-3">
        <h2 class="text-xl font-semibold">
          Warum kann ich nicht nach Bildung stratifizieren?
        </h2>
        <p>
          § 46 BMG (Bundesmeldegesetz) regelt abschließend, welche Felder
          Kommunen aus dem Melderegister für Sortition-Verfahren herausgeben
          dürfen. Es ist eine geschlossene Liste — Bildung,
          Migrationshintergrund, Beruf und Einkommen sind nicht enthalten und
          stehen daher in Stage 1 nicht zur Verfügung. Diese Merkmale können
          erst in Stage 2 (Selbstauskunft der Antwortenden) erhoben und in
          Stage 3 (Panel-Auswahl) als Quoten eingesetzt werden.
        </p>
        <p class="text-xs text-slate-600">
          Quelle:{' '}
          <a
            class="underline"
            href="https://www.gesetze-im-internet.de/bmg/__46.html"
            target="_blank"
            rel="noopener noreferrer"
          >
            § 46 BMG bei gesetze-im-internet.de
          </a>
          {' · '}
          Siehe auch <code>research/03-legal-framework-and-best-practices.md</code>{' '}
          im Repo.
        </p>
      </section>

      <section class="space-y-2">
        <h2 class="text-xl font-semibold">Zulässige Felder (Stage 1)</h2>
        <ul class="list-disc pl-5 space-y-1 text-sm">
          {ALLOWED_FIELDS.map((f) => (
            <li>{f}</li>
          ))}
        </ul>
        <p class="text-xs text-slate-600">
          Praktisch nutzbar für Stratifikation sind in der Regel: Bezirk
          (aus Anschrift abgeleitet), Geschlecht, und Altersgruppe (aus
          Geburtsdatum berechnet).
        </p>
      </section>

      <section class="space-y-3">
        <h2 class="text-xl font-semibold">
          Was nicht im Melderegister steht — und warum das wichtig ist
        </h2>
        <p>
          Bildung, Migrationshintergrund, Berufsstand, Einkommen, politische
          Präferenz, Religionszugehörigkeit (außer für die Kirchensteuer-
          Pflicht) — keines dieser Merkmale steht im Melderegister. Wer
          Diversität auf diesen Achsen will, braucht zwei Stufen: zuerst
          Stage 1 mit den BMG-§-46-Achsen für die Versand-Liste; dann eine
          Selbstauskunft aller Antwortenden, deren Daten in Stage 3 als
          Quoten in die Panel-Auswahl eingehen.
        </p>
        <p class="text-sm text-slate-600">
          Diese Trennung ist nicht nur rechtlich erzwungen — sie ist auch
          praktisch sinnvoll: viele dieser Merkmale (Bildung, Beruf) ändern
          sich häufiger, als das Melderegister abbilden würde.
        </p>
      </section>
    </div>
  );
};

export default Bmg46;
