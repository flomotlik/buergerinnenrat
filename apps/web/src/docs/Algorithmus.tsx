import type { Component } from 'solid-js';
import HamiltonSvg from './HamiltonSvg';
import Term from './Term';

/**
 * In-app explanation of the Stage 1 sortition algorithm. Plain-language
 * intro, the toy walkthrough as native SVG, then a collapsible 5-step
 * detail section and external sources. Term-tooltips are filled in by
 * Task 16 in this issue (see TODOs).
 */
const Algorithmus: Component = () => {
  return (
    <div class="space-y-8" data-testid="docs-page-algorithmus">
      <section class="space-y-3">
        <p>
          Stage 1 zieht aus einem Pool (z. B. dem Melderegister) eine
          Versand-Liste, die <strong>proportional</strong> zu den
          Bevölkerungsgruppen ist — definiert über die ausgewählten Merkmale
          (Bezirk, Geschlecht, Altersgruppe ...).
        </p>
        <p>
          Das Verfahren nutzt zwei klassische Bausteine: die{' '}
          <Term slug="hamilton">
            <strong>Hamilton-Methode</strong>
          </Term>{' '}
          (Largest-Remainder, 1792) für die Quoten-Verteilung und den{' '}
          <Term slug="fisher-yates">
            <strong>Fisher-Yates-Shuffle</strong>
          </Term>{' '}
          für die Auswahl innerhalb jeder Gruppe. Beide sind über 100 Jahre
          alt, transparent und in jedem Statistik-Lehrbuch dokumentiert.
        </p>
      </section>

      <section class="space-y-3">
        <h2 class="text-xl font-semibold">Toy-Beispiel: 100 Personen, 10 ziehen</h2>
        <p>
          Zur Veranschaulichung ein konstruiertes Beispiel: 100 Personen,
          aufgeteilt in 3 Bezirke × 2 Geschlechter = 6 Bevölkerungsgruppen.
          Ziel: 10 Personen ziehen.
        </p>
        <HamiltonSvg />
        <p class="text-xs text-slate-600">
          Pro Gruppe (<Term slug="stratum">Stratum</Term>) berechnet das
          Verfahren die Soll-Zahl (Pool/Gesamt × Ziel), nimmt den
          Ganzzahl-Anteil (<Term slug="floor">Floor</Term>) und verteilt die
          übrigen Sitze nach den größten Brüchen (
          <Term slug="remainder">Remainder</Term>). Bonus-Boxen sind amber
          markiert.
        </p>
      </section>

      <section class="space-y-3">
        <h2 class="text-xl font-semibold">Realistisches Beispiel</h2>
        <p>
          Im echten Verfahren sind Pool und Ziel deutlich größer. Beispiel: 6.000
          Personen aus dem Melderegister einer Mittelstadt, 300 Versand-Briefe,
          stratifiziert nach Bezirk × Geschlecht × Altersgruppe. Stage 1 läuft
          in unter 100 ms im Browser.
        </p>
        <p>
          <a
            href="#/stage1"
            class="underline text-slate-700"
            data-testid="algorithm-try-stage1"
          >
            → Selbst ausprobieren in „Stage 1 / Versand-Liste"
          </a>
        </p>
      </section>

      <section class="space-y-3">
        <details class="border rounded p-3 bg-slate-50">
          <summary class="cursor-pointer font-semibold text-sm">
            5-Schritt-Erklärung im Detail
          </summary>
          <ol class="list-decimal pl-5 mt-3 space-y-2 text-sm">
            <li>
              <strong>Bucketize</strong> — Personen werden nach
              Stratum-Schlüssel (Kombination der Merkmals-Werte) gruppiert.
            </li>
            <li>
              <strong>Hamilton-Apportionment</strong> — Für jedes Stratum:
              Soll = Pool/Gesamt × Ziel; Floor wird vergeben; übrige Sitze gehen
              an die größten Remainder (siehe Toy-Beispiel oben).
            </li>
            <li>
              <strong>Lex-Order</strong> — Strata werden alphabetisch nach
              Schlüssel sortiert. Diese Reihenfolge ist deterministisch und
              seed-unabhängig — sie entscheidet nur, in welcher Reihenfolge die
              Strata in der Detail-Tabelle erscheinen.
            </li>
            <li>
              <strong>Fisher-Yates-Shuffle</strong> — Pro Stratum werden n
              Personen aus dem Pool gezogen. Der Shuffle ist deterministisch
              gesteuert über <Term slug="mulberry32">Mulberry32</Term> mit
              dem in der Sitzung vereinbarten <Term slug="seed">Seed</Term>.
            </li>
            <li>
              <strong>Output</strong> — Versand-Liste als CSV plus signiertes
              Audit-JSON (Ed25519 oder ECDSA). Audit enthält Seed, Hash der
              Eingangs-CSV, gezogene Personen-Indizes und Tie-Break-Regel.
            </li>
          </ol>
        </details>
      </section>

      <section class="space-y-2">
        <h2 class="text-xl font-semibold">Quellen und Verweise</h2>
        <ul class="list-disc pl-5 space-y-1 text-sm">
          <li>Cochran, <em>Sampling Techniques</em> 3rd ed., Kapitel 5 (Buchverweis).</li>
          <li>
            Hamilton-Methode / Largest-Remainder:{' '}
            <a
              class="underline"
              href="https://en.wikipedia.org/wiki/Largest_remainders_method"
              target="_blank"
              rel="noopener noreferrer"
            >
              Wikipedia: Largest remainders method
            </a>
            .
          </li>
          <li>
            Sortition Foundation, Methodik:{' '}
            <a
              class="underline"
              href="https://www.sortitionfoundation.org/how"
              target="_blank"
              rel="noopener noreferrer"
            >
              sortitionfoundation.org/how
            </a>
            .
          </li>
          <li>
            Flanigan et al. 2021, <em>Nature</em>:{' '}
            <a
              class="underline"
              href="https://www.nature.com/articles/s41586-021-03788-6"
              target="_blank"
              rel="noopener noreferrer"
            >
              Fair algorithms for selecting citizens' assemblies
            </a>
            .
          </li>
          <li>
            Fisher-Yates: Knuth, <em>TAOCP</em> Vol. 2 §3.4.2 (Buchverweis).
          </li>
          <li>
            Mulberry32 PRNG:{' '}
            <a
              class="underline"
              href="https://github.com/bryc/code/blob/master/jshash/PRNGs.md#mulberry32"
              target="_blank"
              rel="noopener noreferrer"
            >
              bryc/code: Mulberry32
            </a>
            .
          </li>
        </ul>
      </section>
    </div>
  );
};

export default Algorithmus;
