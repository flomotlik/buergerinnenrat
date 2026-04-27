import type { Component } from 'solid-js';
import Term from './Term';

const Limitationen: Component = () => {
  return (
    <div class="space-y-6" data-testid="docs-page-limitationen">
      <section class="space-y-3">
        <h2 class="text-xl font-semibold">Was dieses Tool bewusst nicht tut</h2>
        <p>
          Ehrlichkeit über den Funktionsumfang ist Teil des Vertrauens-Pakets. Im Folgenden steht,
          was Stage 1 absichtlich außen vor lässt — mit Begründung und, wo möglich, mit
          Mitigations-Hinweis.
        </p>
      </section>

      <section class="space-y-2">
        <h3 class="text-base font-semibold">Kein IPF (Iterative Proportional Fitting)</h3>
        <p class="text-sm">
          <strong>Was:</strong> IPF balanciert Marginal-Verteilungen iterativ, ohne den vollen
          Cross-Product zu betrachten. Wir machen klassische Hamilton-Allokation auf dem vollen
          Cross-Product.
        </p>
        <p class="text-sm">
          <strong>Warum:</strong> Hamilton ist transparenter und in einem 2-Stunden-Sitzungs-Setting
          erklärbar; IPF lohnt erst, wenn die Cross-Product-Matrix sehr dünn besetzt ist (sehr viele
          Achsen mit vielen Werten).
        </p>
      </section>

      <section class="space-y-2">
        <h3 class="text-base font-semibold">Keine Soft-Constraints</h3>
        <p class="text-sm">
          <strong>Was:</strong> Kein „möglichst nahe an X, aber nicht zwingend"-Ziel. Die Quoten
          sind hart — entweder sie werden erfüllt, oder die Gruppe ist{' '}
          <Term slug="unterbesetzt">unterbesetzt</Term>.
        </p>
        <p class="text-sm">
          <strong>Warum:</strong> ohne Solver kein Trade-off. Stage 3 (Maximin in Engine A) macht
          das, Stage 1 nicht.
        </p>
      </section>

      <section class="space-y-2">
        <h3 class="text-base font-semibold">Kein Cross-Stratum-Minimum</h3>
        <p class="text-sm">
          <strong>Was:</strong> Wenn ein Stratum 1 Person braucht und 2 verfügbar sind, kann Stage 1
          nicht garantieren, dass diese 1 Person zusätzlich noch ein Mindest-Alter, eine
          Mindest-Wohndauer oder ähnliches erfüllt — wir ziehen rein zufällig im Stratum.
        </p>
        <p class="text-sm">
          <strong>Warum:</strong> das ist Stage-3-Territorium (Maximin); Stage 1 ist absichtlich
          einfach, weil es im Sekunden-Bereich auf großen Pools laufen muss.
        </p>
      </section>

      <section class="space-y-2">
        <h3 class="text-base font-semibold">Mulberry32 ist KEIN crypto-grade RNG</h3>
        <p class="text-sm">
          <strong>Was:</strong> <Term slug="mulberry32">Mulberry32</Term> ist deterministisch und
          uniform, aber kein CSPRNG. Theoretisch könnte jemand bei bekanntem Seed alle Outputs
          vorhersagen.
        </p>
        <p class="text-sm">
          <strong>Mitigation:</strong> Der <Term slug="seed">Seed</Term> wird vor dem Lauf
          öffentlich vereinbart (siehe Seed-Hinweis im Stage1-Panel: „gemeinsam in der
          Verfahrens-Sitzung wählen — Lottozahlen, Datum, Würfelwurf"). Damit hat niemand einen
          Informations-Vorsprung. Das Audit-Protokoll macht den Seed nachträglich öffentlich.
        </p>
      </section>

      <section class="space-y-2">
        <h3 class="text-base font-semibold">Pool-Größen-Skalierung</h3>
        <p class="text-sm">
          <strong>Was:</strong> getestet bis 100.000 Personen mit einer Laufzeit unter 100 ms. Bei 1
          Million+ Pool-Personen wird der Browser-Memory-Verbrauch eng, weil der gesamte Pool in
          einem Array liegt.
        </p>
        <p class="text-sm">
          <strong>Mitigation:</strong> für wirklich große Pools (z. B. bundeslandweite Stichprobe)
          wäre Server-seitiges Pre-Sampling sinnvoll — out of scope für Iteration 1. Die typische
          kommunale Pool-Größe (5.000–50.000) liegt komfortabel im getesteten Bereich.
        </p>
      </section>
    </div>
  );
};

export default Limitationen;
