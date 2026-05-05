import type { Component } from 'solid-js';

interface ExampleFile {
  filename: string;
  // slug used as test-id suffix and base for the visible label.
  slug: string;
  personen: number;
  stage: string;
  beschreibung: string;
}

const FILES: ExampleFile[] = [
  {
    filename: 'herzogenburg-melderegister-8000.csv',
    slug: 'herzogenburg-melderegister-8000',
    personen: 8000,
    stage: 'Stage 1',
    beschreibung: 'Vollbevölkerung einer kleineren NÖ-Gemeinde nach Vorbild Herzogenburg.',
  },
  {
    filename: 'herzogenburg-versand-300.csv',
    slug: 'herzogenburg-versand-300',
    personen: 300,
    stage: 'Stage 1 Output',
    beschreibung: 'Stratifizierte Versand-Stichprobe von 300 Personen aus der 8000er-Bevölkerung.',
  },
  {
    filename: 'herzogenburg-antwortende-60.csv',
    slug: 'herzogenburg-antwortende-60',
    personen: 60,
    stage: 'Stage 3 Input',
    beschreibung:
      'Antwortende mit zusätzlichen Selbstauskunfts-Feldern (Bildung, Migrationshintergrund).',
  },
  {
    filename: 'kleinstadt-3000.csv',
    slug: 'kleinstadt-3000',
    personen: 3000,
    stage: 'Stage 1',
    beschreibung: 'Kleineres Profil zum schnellen Testen (4 KGs, 3000 Personen).',
  },
];

/**
 * Vite injects BASE_URL based on `vite.config.ts` `base` (`/buergerinnenrat/`
 * in production GH-Pages builds, `/` in local preview / e2e). Always ends
 * with a slash, so `${BASE_URL}beispiele/file.csv` is the correct join.
 */
function downloadHref(filename: string): string {
  return `${import.meta.env.BASE_URL}beispiele/${filename}`;
}

const Beispiele: Component = () => {
  return (
    <div class="space-y-6" data-testid="docs-page-beispiele">
      <aside class="banner info" data-testid="beispiele-banner">
        <div>
          Diese Daten sind <strong>synthetisch erzeugt</strong>. Sie enthalten keine echten
          Personen. Sie dürfen frei verwendet werden, um den Workflow auszuprobieren.
        </div>
      </aside>

      <section class="space-y-3">
        <h2 class="text-xl font-serif font-semibold">Beispiel-Dateien zum Download</h2>
        <p class="text-sm">
          Vier vor-generierte Datensätze decken den vollen Stage-1- und Stage-3-Workflow ab. Jeder
          Datensatz steht als <strong>CSV</strong> und als <strong>Excel</strong> (
          <code>.xlsx</code>) zur Verfügung — anschließend in den entsprechenden Stage-Reiter
          hochladen.
        </p>
        <div class="sample-grid" data-testid="beispiele-table">
          {FILES.map((f) => {
            const xlsxFilename = f.filename.replace(/\.csv$/, '.xlsx');
            return (
              <div class="sample-card flex flex-col gap-2">
                <div class="flex items-center justify-between gap-2">
                  <span class="chip">{f.stage}</span>
                  <span class="text-xs tabular-nums text-ink-3">{f.personen} Personen</span>
                </div>
                <div class="font-mono text-xs text-ink break-all">{f.slug}</div>
                <div class="text-sm text-ink-2">{f.beschreibung}</div>
                <div class="mt-auto flex flex-wrap gap-2 text-xs font-semibold">
                  <a
                    class="inline-flex items-center gap-1 text-accent no-underline"
                    href={downloadHref(f.filename)}
                    download={f.filename}
                    data-testid={`download-${f.slug}`}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      class="h-4 w-4"
                      aria-hidden="true"
                    >
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" x2="12" y1="15" y2="3" />
                    </svg>
                    CSV
                  </a>
                  <a
                    class="inline-flex items-center gap-1 text-accent no-underline"
                    href={downloadHref(xlsxFilename)}
                    download={xlsxFilename}
                    data-testid={`download-${f.slug}-xlsx`}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      class="h-4 w-4"
                      aria-hidden="true"
                    >
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" x2="12" y1="15" y2="3" />
                    </svg>
                    Excel (.xlsx)
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section class="space-y-2">
        <h3 class="text-base font-serif font-semibold">Excel-Format-Anforderungen</h3>
        <p class="text-sm">
          Excel-Uploads (<code>.xlsx</code>) folgen dem gleichen Schema wie CSV —
          Spaltenüberschriften in <strong>Zeile 1</strong>, eine Daten-Zeile pro Person ab Zeile 2.
          Im Detail:
        </p>
        <ul class="list-disc pl-5 text-sm space-y-1">
          <li>
            Genau <strong>ein Worksheet</strong> wird importiert — bei mehreren Tabs verwendet die
            App den ersten und zeigt eine Warnung an.
          </li>
          <li>
            <strong>Keine verbundenen Zellen</strong> in der Header-Zeile.
          </li>
          <li>
            <strong>Keine Formeln</strong> in Daten-Zellen — vorab als Werte einfügen (Excel{' '}
            <em>„Inhalte einfügen → Werte“</em>). Falls Formeln gefunden werden, wird der zuletzt
            berechnete Wert verwendet und eine Warnung angezeigt.
          </li>
          <li>
            <strong>Datums-Felder</strong> werden zu ISO-8601 (<code>YYYY-MM-DD</code>)
            normalisiert,
            <strong>Zahlen</strong> zu Strings ohne <code>.0</code>-Suffix.
          </li>
          <li>
            <strong>Passwortgeschützte Dateien</strong> werden abgelehnt — vor dem Upload
            entschlüsseln.
          </li>
        </ul>
      </section>

      <section class="space-y-2">
        <h3 class="text-base font-serif font-semibold">Was steckt in den Spalten</h3>
        <p class="text-sm">Stage-1-Felder (in den Melderegister-/Versand-/Kleinstadt-Dateien):</p>
        <ul class="list-disc pl-5 text-sm space-y-1">
          <li>
            <code>person_id</code> — laufende ID mit Profil-Prefix (z.B. <code>hzbg-00001</code>)
          </li>
          <li>
            <code>vorname</code>, <code>nachname</code> — Namen aus 4 kulturellen Clustern
          </li>
          <li>
            <code>geburtsjahr</code> — vier-stellig, aus dem NÖ-Altersprofil
          </li>
          <li>
            <code>geschlecht</code> — <code>weiblich</code> | <code>maennlich</code> |{' '}
            <code>divers</code>
          </li>
          <li>
            <code>staatsbuergerschaft</code> — ISO-3166-1-α2 (z.B. <code>AT</code>, <code>DE</code>,{' '}
            <code>TR</code>)
          </li>
          <li>
            <code>sprengel</code> — Wahlsprengel-ID (wird vom Stage-1-Sampler automatisch als Achse
            erkannt)
          </li>
          <li>
            <code>katastralgemeinde</code> — KG-ID (kann manuell als zusätzliche Achse gewählt
            werden)
          </li>
          <li>
            <code>haushaltsnummer</code> — gemeinsame Haushalts-ID; Personen einer Familie haben
            dieselbe Nummer
          </li>
        </ul>
        <p class="text-sm pt-2">
          Stage-3-Zusatzfelder (in <code>herzogenburg-antwortende-60.csv</code>):
        </p>
        <ul class="list-disc pl-5 text-sm space-y-1">
          <li>
            <code>bildung</code> — <code>pflicht</code> | <code>lehre</code> | <code>matura</code> |{' '}
            <code>hochschul</code>
          </li>
          <li>
            <code>migrationshintergrund</code> — <code>keiner</code> | <code>erste-generation</code>{' '}
            | <code>zweite-generation</code>
          </li>
        </ul>
        <p class="text-sm">
          Diese Selbstauskunfts-Felder sind <strong>nicht im Melderegister</strong> — im realen
          Workflow füllen die Antwortenden sie auf einem Anmeldeformular aus.
        </p>
      </section>

      <section class="space-y-2">
        <h3 class="text-base font-serif font-semibold">Warum synthetisch</h3>
        <p class="text-sm">
          Die Cluster-Verteilung (~85 % deutsch-österreichisch, ~5 % türkisch, ~3 % ex-jugoslawisch,
          ~3 % osteuropäisch, ~4 % sonstige) ist eine statistisch motivierte Schätzung auf Basis von
          Statistik-Austria-Daten für Niederösterreich — <strong>nicht</strong>
          die realen Werte für Herzogenburg. Synthetische Daten vermeiden jedes PII-Risiko und
          erlauben uns, deterministische Test-Beispiele zu versionieren.
        </p>
        <p class="text-sm">
          Quellen der Namens-Listen: <code>scripts/synthetic-meldedaten/names/SOURCES.md</code> im
          Repo (Statistik Austria CC-BY 4.0 + Wikipedia CC-BY-SA 4.0). Generator-Code:{' '}
          <code>scripts/synthetic-meldedaten/</code>.
        </p>
      </section>
    </div>
  );
};

export default Beispiele;
