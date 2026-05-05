import type { Component } from 'solid-js';

/**
 * In-app explanation of the seat-allocation override (#71). Plain-language
 * intro about when to use it, when not to, what shows up in the audit, and
 * the mechanics of the 1-D axis override on top of Engine A.
 */
const Override: Component = () => {
  return (
    <div class="space-y-8" data-testid="docs-page-override">
      <section class="space-y-3">
        <p>
          Stage 3 verteilt die Sitze normalerweise <strong>proportional zur Pool-Verteilung</strong>{' '}
          — wenn der Pool 40 % unter 50 enthält, bekommt das Panel auch ungefähr 40 % unter 50.
          Manchmal soll das Panel davon abweichen: politische Vorgabe, gesetzliche Quote,
          inhaltliche Schwerpunktsetzung. Dafür gibt es das <strong>Override</strong>.
        </p>
        <p>
          Ein Override ist ein generisches Tool-Primitive — es funktioniert für Bürger:innenräte
          ebenso wie für Landeskonferenzen, Parteitag-Delegierte oder Gremien-Besetzungen. Es ist
          kein Bürger:innenrat-spezifisches Feature.
        </p>
      </section>

      <section class="space-y-3">
        <h2 class="text-xl font-semibold">Wann Override sinnvoll ist</h2>
        <ul class="list-disc list-inside space-y-2 text-sm">
          <li>
            <strong>Politische Vorgabe</strong>: „mindestens 50 % unter 50", obwohl die
            Bevölkerungsverteilung nur 40 % unter 50 liefert.
          </li>
          <li>
            <strong>Geschlechter-Parität</strong>: 50/50 m/f auch wenn der Pool 60/40 ist.
          </li>
          <li>
            <strong>Geografische Repräsentation</strong>: jeder Stadtteil mindestens 2 Sitze, auch
            wenn ein Stadtteil bevölkerungsmäßig nur 1 Sitz „verdienen" würde.
          </li>
          <li>
            <strong>Sprach-Gruppen</strong> oder andere kleine Minderheiten, die proportional auf 0
            Sitze kämen.
          </li>
        </ul>
      </section>

      <section class="space-y-3">
        <h2 class="text-xl font-semibold">Wann Override problematisch ist</h2>
        <p class="text-sm">
          <strong>Jeder Override verzerrt die Repräsentativität.</strong> Der Punkt von
          stratifizierter Zufallsauswahl ist gerade die proportionale Pool-Treue — wer das Panel
          gezielt umverteilt, baut eine politische Entscheidung in das ansonsten neutrale Verfahren
          ein. Das ist nicht per se falsch, muss aber bewusst und begründet geschehen.
        </p>
        <p class="text-sm">
          Faustregel: <strong>Override-Drift möglichst gering halten</strong>. Wenn ein Override
          mehr als ~15 % der Sitze umschichtet, ist meistens entweder das Panel zu klein, der Pool
          zu unausgewogen oder die Vorgabe zu radikal — alle drei Probleme gehören diskutiert, nicht
          durch ein größeres Override „weggebogen".
        </p>
      </section>

      <section class="space-y-3">
        <h2 class="text-xl font-semibold">Wie das Override im Audit erscheint</h2>
        <p class="text-sm">
          Schema 0.2 des Audit-Manifests enthält das Feld{' '}
          <code class="font-mono">seat_allocation</code> mit drei Blöcken:
        </p>
        <ul class="list-disc list-inside space-y-1 text-sm">
          <li>
            <code class="font-mono">baseline</code>: die proportionale Verteilung pro Achse pro Wert
            (Hamilton/Largest-Remainder).
          </li>
          <li>
            <code class="font-mono">override</code>: die manuell gesetzte Verteilung mit Achse,
            Sitzen pro Wert, <strong>Begründung</strong> und ISO-Zeitstempel. Begründung mindestens
            20 Zeichen non-whitespace, Pflicht.
          </li>
          <li>
            <code class="font-mono">deviation</code>: pro Wert die Differenz Override − Baseline (in
            Sitzen und in Prozent vom Panel).
          </li>
        </ul>
        <p class="text-sm">
          Das gesamte Manifest ist mit Ed25519/ECDSA signiert. Wer am Override (oder der Begründung,
          oder der Baseline) nachträglich etwas ändert, ohne neu zu signieren, fällt beim externen
          Verifier durch. Der Verifier (<code class="font-mono">scripts/verify_audit.py</code>)
          akzeptiert sowohl 0.1 (kein Override-Feld, ältere Manifeste) als auch 0.2 (mit oder ohne
          Override).
        </p>
      </section>

      <section class="space-y-3">
        <h2 class="text-xl font-semibold">Mechanik</h2>
        <p class="text-sm">
          Override ist <strong>1-D auf einer Achse gleichzeitig</strong>: pro Lauf wird genau eine
          CSV-Spalte (z. B. <code class="font-mono">altersgruppe</code>) übersteuert; alle anderen
          Achsen bleiben proportional und werden vom Solver auto-verteilt. Wer N-D Cell-Override
          braucht (z. B. „mindestens 3 Frauen unter 30 aus Bezirk Mitte"), muss das gegenwärtig per
          nachträglicher manueller Vorab-Filterung des Pools lösen — das ist bewusst nicht im Tool.
        </p>
        <p class="text-sm">
          Pro Wert ersetzt das Override die Min/Max-Bounds:{' '}
          <code class="font-mono">min == max == override_value</code>. Der LP sieht das wie eine
          harte Constraint und nimmt entweder genau diese Verteilung oder meldet Infeasibility.
          Falls Infeasibility eintritt (z. B. Override und andere Achsen-Bounds widersprechen sich),
          zeigt die App einen Hinweis im Result-Bereich; das Override muss dann angepasst oder die
          anderen Bounds gelockert werden.
        </p>
        <p class="text-sm">
          <strong>Pre-Flight-Validierung</strong>: bevor der Solver gerufen wird, prüft die App die
          Override-Werte (Σ == panel_size, alle ≥ 0, jeder Wert hat genug Pool-Capacity, Begründung
          lang genug, Zeitstempel valide ISO-8601). Das verhindert dass der User eine unspezifische
          LP-Infeasibility-Meldung sieht, wenn das Problem schon am Eingabewert liegt.
        </p>
      </section>

      <section class="space-y-3">
        <h2 class="text-xl font-semibold">Use-Case-Hub</h2>
        <p class="text-sm">
          Konkrete Anwendungsbeispiele und vorgefertigte Konfigurationen für unterschiedliche
          Use-Cases stehen im Use-Case-Hub. Übersichtsseite:{' '}
          <a class="underline" href="#/overview">
            #/overview
          </a>
          .
        </p>
      </section>
    </div>
  );
};

export default Override;
