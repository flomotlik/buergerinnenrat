---
review_of: iteration-2-issue-gaps
review_type: topic
review_mode: topic
review_topic: Welche Issues fehlen für Iteration 2 hin zu belastbaren Vergleichsdaten und Pilot-Einsatz
reviewed_at: 2026-04-25T04-23-23Z
tool: claude
model: claude-opus-4-7
duration_seconds: 522
---

# Review — Iteration-2-Issue-Gaps

**Reviewer:** Claude Opus 4.7 — autonom, lokales Repo (`/root/workspace`), Stand `main` @ b61ece3 (2026-04-25).
**Auftrag:** Welche Issues fehlen, um Iteration 1 möglichst schnell zu (a) belastbaren Vergleichsdaten und (b) einem für eine echte Pilot-Kommune einsetzbaren System zu bringen?

## Executive Finding

Die Iteration-1-Build ist vollständig und durchläuft den Browser-End-to-End-Pfad. Der Sprung zur Pilot-Tauglichkeit ist **nicht durch Track 4 (Engine B) allein** erreichbar — er ist überwiegend durch **nicht-technische Compliance- und nicht-existente Issues** blockiert (DSFA, BITV-2.0, i18n, Pilot-LOI, Rechtsgutachten). Die existierenden Issues `12-14`, `16` decken das nicht ab; sie lösen nur die Fairness-Lücke.

Außerdem hat die Vergleichsdaten-Schicht trotz vorhandenem `#19`-Harness drei substanzielle Lücken: kein Person-Level-Drift, statistisch zu dünn (5 Seeds), ohne 1000/2000-Pool-Lauf. Die Aussage „Engine A liefert ~17% schlechteres min π" ruht auf zwei Pools mit jeweils 5 Seeds (`docs/quality-comparison-iteration-1.md` Limitationen-Abschnitt, Z. 75–78) — das ist keine wissenschaftlich tragfähige Grundlage für einen Audit.

Es gibt zusätzlich zwei **konkrete Code-Bugs**, die vor einem Pilot beseitigt sein müssen — und die in keinem Issue stehen:

1. `apps/web/src/run/audit.ts:158-167` (`selectedToCsv`) macht naives CSV ohne Quoting/Escaping. Ein Wert mit Komma, Anführungszeichen oder Newline (z.B. `"Müller, Anna"` als Name oder Adresse) zerlegt die Einladungs-CSV in falsche Spalten. Für die Kommune ist das die direkte Einladungs-Liste — silent corruption.
2. `apps/web/src/run/audit.ts:107` (`signWithEd25519`) generiert pro Lauf einen frischen Ephemerial-Keypair und exportiert den Public Key in das Audit-Doc. Es gibt **keine Schlüssel-Bindung** an die Kommune. Damit beweist das Audit-JSON nur, dass *jemand mit irgend einem Schlüssel* das Ergebnis signiert hat — nicht, dass es die berechtigte Stelle war. Das `signature_algo`-Feld ist da, aber das eigentliche Vertrauensmodell (wer ist Issuer? Wo ist der CA-Trust? Wie wird der Public Key publiziert?) fehlt vollständig.

Verdikt: **fail** (mehrere P1-Items haben gar kein Issue, plus zwei kritische Code-Bugs).

---

## Was bereits abgedeckt ist (kein neues Issue nötig)

| Item | Wo addressiert | Bewertung |
| --- | --- | --- |
| Engine A Maximin-Lücke schließen | `.issues/12-14` (Engine B) — deferred mit STATUS.md | **OK**, nur Priorität anheben |
| Leximin-Port | `.issues/16-gurobi-free-leximin-reference` STATUS.md mit 3-5 PT — deferred | **NICHT vor Pilot** — Forschung, nicht Pilot-Block |
| Drei-Wege-Vergleich | `archived/19-three-way-comparison-harness/ISSUE.md` — partial (B fehlt) | **Erweitern**, nicht neu anlegen — siehe Issue 27 |
| Engine A Property-Tests | `.issues/09-engine-a-property-tests/STATUS.md` mit 0.5 PT — deferred | **Aktivieren vor Pilot** — siehe Issue 32 |
| Encoding-Detection im CSV | `apps/web/src/csv/parse.ts:20-36` (UTF-8 / Win-1252) | **OK** — Iteration-1-Findings bestätigt |
| Audit-Signatur-Mechanik (Ed25519+ECDSA) | `apps/web/src/run/audit.ts:106-130`, `scripts/verify_audit.py` | **Mechanik OK, Vertrauensmodell fehlt** — siehe Issue 38 |

---

## Konkret-Befunde mit Datei:Zeile

### F1 — Engine A blockiert den UI-Thread
`apps/web/src/run/runEngine.ts:19-46` ruft `engine.run()` direkt im Hauptthread auf. `RunPanel.tsx:27-37` (`start()`) ist `async`, gibt zwar zwischendurch per `await`-Yield-Points die Kontrolle ab — aber die HiGHS-WASM-Aufrufe in `feasible-committee.ts` blockieren synchron in jedem `await`. Auf einem 500-Pool messen wir bereits ~770 ms (`docs/iteration-1-autorun-2026-04-24.md:63`); auf 1000+ wird die UI für Sekunden bis Minuten unresponsiv. Das verletzt die Akzeptanzkriterien aus #08, die "Web-Worker-Isolation" für #12 fordert (siehe `.issues/12-engine-b-pyodide-bootstrap/ISSUE.md:4`), aber für Engine A nicht expliziert, also durchgerutscht.

**Severity: high.** Issue **26**.

### F2 — Vergleichsdaten statistisch dünn
`docs/quality-comparison-iteration-1.md:75-78` listet die Limitationen explizit: 5 Seeds × 2 Pools (≤200 Respondenten); kein 1000/2000; keine sf_*-Pools (`STATUS.md` von `archived/04-pgoelz-reference-pool-loader/`). Die zentrale Quantitative-Aussage „Engine A liefert ~17% schlechteres min π" beruht auf 5×2=10 Lauf-Stichproben und ist **kein** belastbarer Bias-Schätzer. Ein t-Test auf der Differenz mit n=5 hat eine Effekt-Schwelle von ~0.5 σ — realistisch wäre ein Sweep mit ≥30 Seeds pro Pool.

`scripts/compare_runs.py:32` setzt explizit `SETUPS = ("engine-a", "reference-c")` mit Kommentar `# engine-b is pending #12-#14`. Engine B ist also nicht nur "noch nicht gemessen" sondern aus dem Harness ausgeschlossen.

**Severity: critical** (zentrale Aussage über Engine-A-Qualität ist nicht belastbar). Issues **27**, **28**, **29**.

### F3 — Cross-Runtime-Person-Level-Drift fehlt vollständig
`scripts/compare_runs.py:121-153` (`_aggregate`) summiert nur `min_pi`, `gini`, `var_pi`, `count_below_epsilon`, `wall_time` — aggregierte Skalare. Es gibt **keinen Person-Level-Diff** zwischen Engine A und C bei gleichem Seed. Die wissenschaftlich relevante Frage „liefern A und C bei identischem Input dieselben Marginale Pro Person?" wird nicht gemessen. `docs/quality-comparison-iteration-1.md` Frage 1 sagt explizit: nicht beantwortbar bis Engine B existiert — aber A vs C ist heute schon möglich und nicht implementiert.

**Severity: critical**. Issue **27**.

### F4 — Compliance-Workstream komplett ohne Issues
- **DSFA-Template (P1-1):** kein Issue, kein Doc, kein Datenflussdiagramm. `docs/iteration-1-findings.md:48` markiert „open"; ohne DSFA darf eine deutsche Kommune die App nicht für die Melderegister-Verarbeitung nutzen (DSGVO Art. 35 + § 67a BMG). Das ist der Hard-Block #1.
- **BITV 2.0 (P1-1):** `apps/web/tests/e2e/a11y.spec.ts` ist Smoke (h1-Unique, Button-Labels, Img-Alt) — `docs/iteration-1-findings.md:48` sagt explizit "das ist nicht BITV-2.0-Konformität — das ist Smoke". Issue `archived/24-static-deploy-and-a11y-audit/ISSUE.md:31-32` fordert axe-core-Critical-frei + Lighthouse ≥90, das ist erfüllt — aber das ist NICHT BITV-2.0. BITV-2.0 verlangt einen vollständigen WCAG-2.1-AA-Audit + Erklärung zur Barrierefreiheit nach BGG §12a.
- **i18n DE/EN (P1-5):** `Grep` über `apps/web/src/` findet **175 hartcodierte deutsche Strings** in 7 Dateien (Beleg: `apps/web/src/run/RunPanel.tsx:74` mit z.B. `Lauf starten`, `Neuer Seed`, `Audit-JSON exportieren (Ed25519)`). Es gibt keine i18n-Schicht. Beim Pilot-Kunden mit migrantischer Bürgerschaft ist DE-only ein Ausschlussgrund.
- **Methodenblatt für Bürger:innen (P1-4):** kein Issue, kein Doc.
- **Pilot-Kommunen-Vereinbarung (S-4):** kein Issue, blockiert aber laut `CLAUDE.md` Strategie-Tabelle alle Build-Entscheidungen darüber hinaus.
- **Rechtsgutachten zu §69c UrhG / GPL / Patent-FTO (S-1, P1-6):** kein Issue. Ohne dieses Gutachten ist Apache-2.0 nicht erreichbar und das Patent-Risiko ungeklärt.

**Severity: critical** (alle fünf P1-Items haben kein Issue, alle blocken Pilot). Issues **30, 31, 33, 34, 35, 36**.

### F5 — UI-Implementation für #21/#22/#23 fehlt
`docs/iteration-1-autorun-2026-04-24.md:30-32` markiert sie als "partial" mit "UI-Action fehlt". `apps/web/src/run/RunPanel.tsx` enthält keine Buttons für „Person ersetzen", „Panel erweitern", oder „Reroll mit Diff". Die Logik existiert in `packages/engine-a/src/panel-ops.ts` und `scripts/panel_ops_cli.ts` — aber im Browser ist sie nicht erreichbar. Für eine Kommune sind das zentrale Praxis-Operationen (Nachrücker bei Absage ist der häufigste Workflow-Fall — `archived/22-replace-single-person-nachruecker/ISSUE.md:14`).

Außerdem unerfüllt: `archived/22.../ISSUE.md:31` „Audit (#11) enthält den Ersetz-Vorgang als separate Event-Liste" — `apps/web/src/run/audit.ts` und `scripts/panel_ops_cli.ts:62-110` machen das nicht; jede Ersetzung produziert eine separate Output-Datei ohne Audit-Chain-Verbindung.

**Severity: high.** Issue **37**.

### F6 — CSV-Export-Bug (silent corruption)
`apps/web/src/run/audit.ts:158-167` (`selectedToCsv`):

```ts
for (const p of sel) {
  lines.push(headers.map((h) => String(p[h] ?? '')).join(','));
}
```

Kein Quoting, kein Escaping. Ein Wert wie `"Mustermann, Hans"` (Nachname mit Komma) oder `"Bahnhofstraße 12, 70173 Stuttgart"` wird unsichtbar in zwei Spalten zerlegt. Die exportierte Einladungs-CSV ist die direkte Operativ-Liste der Kommune — wenn das im Pilot durchschlägt, gehen Einladungen an die falschen Personen.

**Severity: critical.** Issue **39** (Teil davon).

### F7 — Audit-Signatur ohne Vertrauensanker
`apps/web/src/run/audit.ts:106-130`: pro Lauf wird ein neuer Ephemerial-Keypair generiert (`crypto.subtle.generateKey({ name: 'Ed25519' }, true, ...)`). Public Key landet im Audit-Doc. `scripts/verify_audit.py:50-62` verifiziert Signatur GEGEN den im Doc enthaltenen Public Key — d.h. jeder, der ein Audit-JSON manipuliert, kann dabei einfach einen neuen Keypair generieren und sowohl Signatur als auch Public Key ersetzen. Das Audit-Schema beweist „der Public Key im Doc hat dieses Doc signiert" — nicht „die Stadt München hat dieses Doc signiert".

`docs/iteration-1-findings.md:79` (P2-4) markiert das selbst als "partial". Für einen Audit, der vor einem Rechnungshof oder einem Bürger:innen-Einspruch standhalten soll, braucht es ein Issuer-Modell (kommunaler Schlüssel, lokal gespeichert, mit publishable Public Key auf der Kommunal-Domain).

**Severity: critical.** Issue **38**.

### F8 — Sortition-Algorithm-Lauf wird nicht persistiert
`scripts/compare_runs.py` produziert `.benchmarks/<timestamp>/`, aber im Repository (`main` checkout) gibt es kein `.benchmarks/`-Verzeichnis. Die Benchmark-Artefakte aus `20260424T230539` (referenziert in `docs/iteration-1-findings.md:24`) sind nicht eingecheckt — sie liegen nur in `.worktrees/19-comparison/.benchmarks/`. Ein Reviewer (oder eine Pilot-Kommune) kann die Quantitative-Aussage nicht selbst prüfen, ohne den Benchmark neu zu laufen. Reproducibility-Hash (`packages/metrics/`-Twin) existiert, aber die canonical Roh-Daten sind nicht im Audit-fähigen Pfad.

**Severity: medium.** Teil von Issue **27**.

---

## Output

```xml
<review>

<focus_areas>
<area name="comparison_data_robustness">
  <gap>5 Seeds × 2 Pools (≤200 Respondenten) ist statistisch zu dünn für die Aussage „Engine A weicht um 17% ab" (docs/quality-comparison-iteration-1.md:75-78). Kein Person-Level-Drift gemessen, nur aggregierte Metriken (scripts/compare_runs.py:121-153).</gap>
  <new_issue_proposal>26-engine-a-worker-isolation, 27-cross-runtime-person-level-drift, 28-statistical-seed-sweep, 29-engine-a-property-tests-activate, 30-native-large-pool-benchmark</new_issue_proposal>
</area>
<area name="pilot_readiness">
  <gap>DSFA-Template, BITV-2.0-Konformität, i18n DE/EN, Methodenblatt, Pilot-LOI, Rechtsgutachten — alle fünf P1/Strategie-Items haben gar kein Issue. 175 hartcodierte deutsche Strings in 7 Dateien. UI-Aktionen #21-#23 nur als CLI vorhanden.</gap>
  <new_issue_proposal>31-dsfa-template-und-datenflussdiagramm, 33-i18n-de-en-fundament, 34-methodenblatt-buergerinnen, 35-pilot-kommune-loi-avv, 36-rechtsgutachten-de-gpl-patent, 37-panel-ops-ui-completion</new_issue_proposal>
</area>
<area name="algorithmic_correctness">
  <gap>Property-Tests #09 deferred. Engine A nutzt eine Hybrid-Heuristik (packages/engine-a/src/engine.ts:6-22) deren Korrektheit über Property-Invarianten nicht abgesichert ist. NF-4 (Maximin-LP-Degeneration bei nicht-vollständiger Coverage) ist im Code per Coverage-Phase umgangen, aber nicht regression-testabgesichert.</gap>
  <new_issue_proposal>29-engine-a-property-tests-activate, 32-bitv-2-0-konformitaet-und-erklaerung</new_issue_proposal>
</area>
<area name="architecture_debt">
  <gap>F1: Engine-A im Main-Thread (apps/web/src/run/runEngine.ts:19-46) blockiert UI bei n>500. F6: CSV-Export ohne Quoting (apps/web/src/run/audit.ts:158-167) — silent corruption für Werte mit Komma/Newline. F7: Ephemeral-Keypair pro Lauf (audit.ts:107) — Audit-Signatur ohne Issuer-Trust-Modell. F8: Benchmark-Artefakte nicht in main/ gecheckt.</gap>
  <new_issue_proposal>26-engine-a-worker-isolation, 38-audit-issuer-trust-model, 39-csv-export-quoting-und-provenance</new_issue_proposal>
</area>
</focus_areas>

<proposed_issues>

<issue id="26" slug="engine-a-worker-isolation">
  <title>Engine A im Web Worker isolieren — UI darf nicht blockieren</title>
  <track>2</track>
  <estimate_pt>1.5</estimate_pt>
  <deps>archived/08, archived/10</deps>
  <rationale>apps/web/src/run/runEngine.ts:19-46 ruft engine.run() im Main-Thread auf. Bei n=500 ~770 ms blockiert (docs/iteration-1-autorun-2026-04-24.md:63), bei n=1000 mehrere Sekunden. Im realen Pilot (Pool 100-3000 nach OECD-Bürgerrats-Größenordnungen) friert die UI ein, Cancel-Button wird unbedienbar — auch wenn Logik intern AbortSignal kennt (runEngine.ts:29-31). Vor jedem Pilot Pflicht, weil bürgerräte-übliche Pool-Größen 500-2000 sind. Issue #12 für Engine B verlangt schon Worker, Engine A muss nachziehen.</rationale>
  <acceptance_criteria>
    <criterion>packages/engine-a-worker/ mit worker.ts + main-side wrapper</criterion>
    <criterion>runEngine.ts ruft Worker.postMessage statt direkt EngineA().run()</criterion>
    <criterion>EngineEvent-Stream wird über MessageChannel weitergereicht; Progress + Done + Error funktional</criterion>
    <criterion>Cancel-Button funktioniert: Worker.terminate() bricht laufenden Lauf ab innerhalb 100 ms</criterion>
    <criterion>Playwright-E2E: 1000-Personen-Pool laufen lassen und gleichzeitig Cancel-Button drücken; UI bleibt responsiv (Click auf anderen Button registriert)</criterion>
    <criterion>Bundle-Size-Doc (docs/bundle-size.md) aktualisiert: Worker-Chunk separat gemessen</criterion>
    <criterion>Vorhandene Engine-A-Tests (packages/engine-a/tests/) müssen weiter grün laufen — Engine-Klasse bleibt unverändert, nur die Aufruf-Schicht ändert sich</criterion>
  </acceptance_criteria>
</issue>

<issue id="27" slug="cross-runtime-person-level-drift">
  <title>Cross-Runtime-Drift Person-Level (A vs C, später + B) — Marginal-Diff-Harness</title>
  <track>5</track>
  <estimate_pt>2</estimate_pt>
  <deps>archived/19, archived/15</deps>
  <rationale>scripts/compare_runs.py:121-153 (_aggregate) summiert nur Skalare (min_pi, gini, ...). Die wissenschaftliche Frage „liefern Engine A und Reference C bei gleichem Pool+Quoten+Seed dieselben Marginale pro Person?" wird nicht gemessen. Aktuell sehen wir nur „min π weicht um 17% ab" — wir wissen nicht, ob das ein systematischer Bias gegen bestimmte Sub-Gruppen ist (z.B. immer dieselben Migrationshintergrund-Tupel werden untergewichtet). Vor einem Pilot, in dem die Kommune das Audit verteidigen muss, ist das die fundamentale Frage: „bekommen die Bürger:innen mit unserer schnelleren Engine substanziell andere Chancen?". Heute ohne Engine B möglich — A vs C reicht.</rationale>
  <acceptance_criteria>
    <criterion>scripts/cross_runtime_drift.py: liest Roh-RunResult-JSON aus zwei Setups (engine-a, reference-c), gleicher Seed, gleicher Pool</criterion>
    <criterion>Output: pro person_id ein Δπ = π_A − π_C; Histogramm + p50/p95/max-Δ</criterion>
    <criterion>Aggregat pro Quoten-Kategorie: avg-|Δπ| pro (column, value)-Tupel; identifiziert systematische Untergewichtung</criterion>
    <criterion>Reproducibility: nutzt reproducibility_hash aus packages/metrics/ + Python-Twin (scripts/quality_metrics.py:53-58) zur Sicherung der Kanonizität</criterion>
    <criterion>Markdown-Report .benchmarks/&lt;ts&gt;/cross-runtime-drift.md mit den drei Histogrammen pro Pool</criterion>
    <criterion>.benchmarks/&lt;ts&gt;/ wird per make compare-drift in den main-Branch eincheckbar (gitignored, aber Make-Target produziert reproduzierbares Artefakt)</criterion>
    <criterion>Test-Fixtures: kleinstadt-100, aussenbezirk-100, example_small_20, plus mind. 1 ≥500-Pool</criterion>
  </acceptance_criteria>
</issue>

<issue id="28" slug="statistical-seed-sweep">
  <title>Statistisch belastbare Seed-Stichprobe — 30+ Seeds pro Pool</title>
  <track>5</track>
  <estimate_pt>1</estimate_pt>
  <deps>archived/19, 27</deps>
  <rationale>docs/quality-comparison-iteration-1.md:75 sagt selbst: „Nur 5 Seeds pro Setup-Pool-Kombination; statistische Aussagekraft begrenzt". Mit n=5 Stichproben ist der Standardfehler einer Mittelwert-Schätzung ~σ/√5 ≈ 0.45σ — die zentrale Iteration-1-Aussage „17% schlechter" ist nicht von einem 1σ-Rauschfehler unterscheidbar. Vor einem Pilot, in dem diese Zahl zur Kommune kommuniziert wird, müssen wir ≥30 Seeds pro Pool messen (Standardfehler dann ~0.18σ). Aufwand klein, weil scripts/compare_runs.py:222 schon parametrisch ist.</rationale>
  <acceptance_criteria>
    <criterion>make compare-statistical: 30 Seeds × {kleinstadt-100, aussenbezirk-100, example_small_20, kleinstadt-500} × {engine-a, reference-c}</criterion>
    <criterion>summary.json enthält pro (pool, setup): mean, median, stddev, 95%-CI für min_pi, gini, var_pi</criterion>
    <criterion>Hypothesentest: paired-t-Test auf min_pi-Differenz A-C mit p-Value</criterion>
    <criterion>docs/quality-comparison-iteration-1.md ersetzt die n=5-Tabelle durch n=30-Tabelle mit CI</criterion>
    <criterion>Laufzeitziel: gesamte make compare-statistical &lt; 60 min im Container (engine-a ist 28× schneller als reference-c, also dominiert reference-c)</criterion>
    <criterion>Reproducibility-Block: Container-Hash, Tool-Versionen (highs@1.8.0, sortition-algorithms-Version), und summary-CSV checked in unter docs/benchmarks/</criterion>
  </acceptance_criteria>
</issue>

<issue id="29" slug="engine-a-property-tests-activate">
  <title>Engine A — Property-Based Tests aktivieren (war #09 deferred)</title>
  <track>2</track>
  <estimate_pt>0.5</estimate_pt>
  <deps>archived/08</deps>
  <rationale>.issues/09-engine-a-property-tests/STATUS.md hat das selbst als 0.5-PT-Pickup markiert. Die 7 Hand-Unit-Tests in packages/engine-a/tests/engine.test.ts decken nicht: degenerate-Coverage-Phase (NF-4 in Findings), feasibility-MIP-edge-cases, alle Pool-Topologien aus packages/core/. Vor einem Audit muss jemand sagen können „Engine A ist auf 100 zufällig generierten Pools robust" — das geht nur mit fast-check über synthetische Pools aus packages/core/.</rationale>
  <acceptance_criteria>
    <criterion>packages/engine-a/tests/properties.test.ts mit fast-check</criterion>
    <criterion>Properties 1-7 aus .issues/09-engine-a-property-tests/ISSUE.md:24-31 implementiert</criterion>
    <criterion>Spezial-Property: Coverage-Phase liefert z* > 0 für alle generierten Pools (regression gegen NF-4)</criterion>
    <criterion>Test-Pool-Generator nutzt packages/core/ deterministischen Mulberry32-Generator</criterion>
    <criterion>Laufzeit unter 30s lokal (fast-check defaults: 100 Runs, kleine Pools n∈{10,30,100})</criterion>
    <criterion>make test enthält den neuen Suite</criterion>
  </acceptance_criteria>
</issue>

<issue id="30" slug="native-large-pool-benchmark">
  <title>Native HiGHS-Referenz-Benchmark auf 500/1000/2000-Pools — Realitäts-Check für Go/No-Go</title>
  <track>5</track>
  <estimate_pt>1.5</estimate_pt>
  <deps>archived/15</deps>
  <rationale>docs/iteration-1-autorun-2026-04-24.md:63 zeigt: example_large_200 (2000 Respondenten) läuft Reference C >20 min und wurde abgebrochen. Engine A ist auf n=2000 nicht systematisch gemessen. P0-3 aus 06-review-consolidation.md verlangt explizit eine Go/No-Go-Matrix mit harten Datengrundlagen — die haben wir aktuell nur für n≤500. Bürgerräte historisch: 100-3000 (Klimaschutz-Bürgerrat: 160; Bundes-Bürgerrat Ernährung: 160; größere kommunal: 500-1000). Ohne 1000+-Daten wissen wir nicht, ob Engine A im Pilot benutzbar ist.</rationale>
  <acceptance_criteria>
    <criterion>Engine A: 30-Sekunden-Cap pro Lauf, gemessen auf {kleinstadt-1000, kleinstadt-2000, innenstadt-2000, example_large_200} × 5 Seeds</criterion>
    <criterion>Reference C: gleiche Pools, mit Timeout 30 min, fail-Status erfasst statt abbrechen</criterion>
    <criterion>Output: docs/large-pool-benchmark.md mit Pool × {wall_time p50/p95, ok/fail, min_pi avg} Tabelle</criterion>
    <criterion>Identifiziert die Pool-Größe, ab der Engine A &gt; 10s braucht (Hypothese: ~1500)</criterion>
    <criterion>Identifiziert Pool-Größe, ab der Reference C nicht mehr in Container-Toleranz (30 min) konvergiert</criterion>
    <criterion>Empfehlung im Doc: Welche Pool-Größen sind „grün", „gelb", „rot" für Engine A bzw. Reference C — als datenbasiertes Update der Phase-1-Go/No-Go-Schwellen</criterion>
  </acceptance_criteria>
</issue>

<issue id="31" slug="dsfa-template-und-datenflussdiagramm">
  <title>DSFA-Template + Datenflussdiagramm + Verarbeitungsverzeichnis-Bausteine</title>
  <track>7</track>
  <estimate_pt>3</estimate_pt>
  <deps>archived/24</deps>
  <rationale>P1-1 aus 06-review-consolidation.md, in iteration-1-findings.md:48 als „open" markiert. Eine deutsche Kommune darf die App nicht für Melderegister-Verarbeitung einsetzen, ohne DSFA nach DSGVO Art. 35. Die App hat das Glück „kein Backend, alles in-memory" — das eliminiert die Pflicht NICHT, aber macht das DSFA stark vereinfacht. Wir liefern ein Template, das die Kommune in ihrem konkreten Verfahren konkretisiert. Ohne dieses Template muss jede einzelne Pilot-Kommune das von Null aufsetzen — das ist der Friktions-Killer. Das ist nicht-technisch (Rechtsexpertise), aber das Issue muss da sein, damit jemand es bestellt.</rationale>
  <acceptance_criteria>
    <criterion>docs/dsfa/template.md: ausfüllbares Template mit klar markierten Kommune-spezifischen Slots</criterion>
    <criterion>docs/dsfa/datenfluss.md: Diagramm (mermaid) — Browser → kein-Backend, kein-Telemetrie, kein-Cookie. Belegt mit CSP aus docs/deploy.md und Network-Audit (Playwright-Spec, die assertet: keine externen Requests während eines Laufs)</criterion>
    <criterion>docs/dsfa/verarbeitungsverzeichnis-baustein.md: VVT-Eintrag-Vorlage nach DSGVO Art. 30</criterion>
    <criterion>docs/dsfa/risiko-bewertung.md: vorausgefüllt mit den 5 Standard-Risikofeldern (Identifizierbarkeit, Re-Identifizierung, Aggregation, etc.) — mit den Default-Mitigationen aus der App-Architektur</criterion>
    <criterion>docs/dsfa/checklist-fuer-kommunen.md: 1-seitige Anwendungs-Checkliste</criterion>
    <criterion>Externe Validierung: muss von einer DE-DSGVO-erfahrenen Person reviewed werden (im Issue dokumentiert wer und wann)</criterion>
    <criterion>Playwright-Network-Spec: assertet, dass während eines End-to-End-Laufs keine fetch()-Requests an externe Origins gehen</criterion>
  </acceptance_criteria>
</issue>

<issue id="32" slug="bitv-2-0-konformitaet-und-erklaerung">
  <title>BITV-2.0-Konformitäts-Audit + Erklärung zur Barrierefreiheit (BGG §12a)</title>
  <track>7</track>
  <estimate_pt>3</estimate_pt>
  <deps>archived/24</deps>
  <rationale>P1-1 aus 06-review-consolidation.md. archived/24-static-deploy-and-a11y-audit/ISSUE.md:31-32 fordert axe-core-Critical-frei — das ist erfüllt. Aber BITV 2.0 ≠ axe-Smoke. BITV 2.0 verlangt WCAG-2.1-AA + EN 301 549 + Erklärung zur Barrierefreiheit auf der Website. Für öffentliche Stellen Pflicht ab Tag 1 bei Beschaffung (Codex M3 in Reviews). Apps/web/src/quotas/QuotaEditor.tsx und apps/web/src/run/RunPanel.tsx haben aktuell Tabellen ohne Caption, Form-Inputs ohne aria-describedby für Validation-Errors, kein Skip-Link, keine Keyboard-Trap-Tests. Das alles ist Single-Pilot-Block.</rationale>
  <acceptance_criteria>
    <criterion>Vollständiger axe-core-Audit (alle Severities, nicht nur „critical") über alle drei App-Schritte; Bericht in docs/a11y/audit-2026-XX-XX.md</criterion>
    <criterion>Manueller Keyboard-Test: Tab durch alle Aktionen, Enter aktiviert, Escape schließt Dialoge — protokolliert</criterion>
    <criterion>Screenreader-Test mit NVDA oder VoiceOver: jeder Interaction-Step verbalisiert; Protokoll im Doc</criterion>
    <criterion>Tabellen mit caption + scope; Form-Errors über aria-describedby an Inputs gehängt; Live-Regions für Progress (apps/web/src/run/RunPanel.tsx:111-122)</criterion>
    <criterion>docs/erklaerung-zur-barrierefreiheit.md: Vorlage nach BGG §12a Abs. 1, ausfüllbar pro Kommune</criterion>
    <criterion>CI-Gate: GitHub Actions oder Make-Target make a11y-ci scheitert bei axe-violations Severity ≥ moderate</criterion>
    <criterion>Lighthouse-Score Accessibility ≥ 95 (nicht nur ≥ 90 wie in #24); Best-Practices ≥ 95</criterion>
  </acceptance_criteria>
</issue>

<issue id="33" slug="i18n-de-en-fundament">
  <title>i18n-Fundament + DE/EN-Übersetzung — alle hartcodierten Strings extrahieren</title>
  <track>7</track>
  <estimate_pt>2.5</estimate_pt>
  <deps>archived/05, archived/06, archived/10, archived/11</deps>
  <rationale>P1-5 aus 06-review-consolidation.md. Grep findet 175 hartcodierte deutsche Strings in 7 Dateien (apps/web/src/run/RunPanel.tsx:74 mit z.B. 'Lauf starten'; apps/web/src/quotas/QuotaEditor.tsx:38 mit 'Panel-Größe', 'Kategorie hinzufügen'; apps/web/src/csv/CsvImport.tsx:28 mit 'CSV hier hineinziehen'). Es gibt keine i18n-Schicht. Codex M5 + iteration-1-findings.md:62 markieren das als P1. Pilot-Kommunen mit migrantischer Bürgerschaft (Stuttgart, Berlin, Frankfurt) brauchen mind. EN, langfristig TR/AR/RU/UK — die Architektur muss das jetzt zulassen, sonst sind Refactor-Kosten doppelt.</rationale>
  <acceptance_criteria>
    <criterion>i18n-Library gewählt und begründet (z.B. @kobalte/i18n oder solid-i18next); im Doc warum</criterion>
    <criterion>Translation-Keys-Schema in apps/web/src/i18n/keys.ts mit type-safe Lookup</criterion>
    <criterion>locales/de.json + locales/en.json — alle 175 identifizierten Strings extrahiert</criterion>
    <criterion>Sprach-Switcher in der UI (header) mit persistenter Wahl in localStorage</criterion>
    <criterion>Fehler-Messages aus apps/web/src/run/runEngine.ts (infeasible_quotas etc.) ebenfalls übersetzt</criterion>
    <criterion>Bundle-Größen-Impact dokumentiert in docs/bundle-size.md (Erwartung: +15 KB für Library + Locales)</criterion>
    <criterion>Test: Playwright-E2E mit Lang-Switch DE→EN; alle data-testid bleiben gleich, sichtbarer Text wechselt</criterion>
    <criterion>Architektur dokumentiert: wie kommen weitere Sprachen rein (z.B. tr.json) ohne Code-Änderung</criterion>
  </acceptance_criteria>
</issue>

<issue id="34" slug="methodenblatt-buergerinnen">
  <title>Methodenblatt für Bürger:innen — Erklärung Maximin in Verwaltungs- + Leichter Sprache</title>
  <track>7</track>
  <estimate_pt>1.5</estimate_pt>
  <deps>—</deps>
  <rationale>P1-4 aus 06-review-consolidation.md. iteration-1-findings.md:62 markiert als „open". Eine ausgeloste Bürger:in fragt: „warum ich? wie wurde ich ausgewählt? wie fair ist das?". Wenn die Kommune das nicht klar beantworten kann, leidet die Legitimität des ganzen Bürgerrats. Der Output ist ein Doc, das die Kommune mit der Einladung verschickt — kein Code, aber blocker-würdig.</rationale>
  <acceptance_criteria>
    <criterion>docs/methodenblatt/maximin-verwaltungssprache.md (1-2 Seiten): erklärt für Verwaltung + Rat, was Maximin tut, wie die Quoten reinspielen, wie der Seed wirkt, was das Audit-JSON ist</criterion>
    <criterion>docs/methodenblatt/maximin-leichte-sprache.md (1 Seite): A1-Sprachniveau, „Sie wurden zufällig ausgewählt — so wie beim Würfeln, aber so dass die Gruppe Deutschland abbildet" — geprüft gegen Leichte-Sprache-Regeln</criterion>
    <criterion>docs/methodenblatt/faq.md: häufige Bürger:innen-Fragen + Antworten</criterion>
    <criterion>Vorlage für Einladungs-Anschreiben (docx + pdf), das das Methodenblatt zitiert</criterion>
    <criterion>Externer Review durch eine Person mit Bürgerrats-Praxis-Erfahrung (z.B. „Es geht LOS"-Team kontaktieren)</criterion>
  </acceptance_criteria>
</issue>

<issue id="35" slug="pilot-kommune-loi-avv">
  <title>Pilot-Kommune-Akquise + LOI/AVV-Template</title>
  <track>7</track>
  <estimate_pt>4</estimate_pt>
  <deps>31, 32, 34</deps>
  <rationale>S-4 aus CLAUDE.md ist offen. Ohne identifizierte Pilot-Kommune ist iteration-1-findings.md:103 explizit: „Vor weiterer Build-Investition. Marktvalidierung ist Iteration-2-Vorbedingung". Das ist nicht-technisch, aber bisher gibt es kein Issue dafür. Konsequenz: ohne Issue passiert nichts; mit Issue gibt es Owner + Deadline. Output ist ein konkreter Pilot-Vertrag.</rationale>
  <acceptance_criteria>
    <criterion>Liste von 5-10 deutsch-/österreichischen Kommunen mit existierender Bürgerrats-Praxis identifiziert (z.B. via Mehr Demokratie e.V., „Es geht LOS")</criterion>
    <criterion>Kontakt zu mind. 3 davon aufgenommen, in docs/pilot/contact-log.md protokolliert</criterion>
    <criterion>Pitch-Deck (PDF, 5-7 Slides): „Was bekommen Sie", „Was kostet es", „Welche Risiken"</criterion>
    <criterion>LOI-Template für gegenseitige Absichtserklärung (Kommune verpflichtet sich zu Test mit anonymisiertem Pool, wir zu Support während des Pilots)</criterion>
    <criterion>AVV-Template (Auftragsverarbeitungs-Vertrag) — in docs/pilot/avv-template.md, abgestimmt mit Issue 31 (DSFA)</criterion>
    <criterion>Mindestens 1 unterschriebener LOI vor Iteration 2 V2 (= Engine-B-Bau)</criterion>
    <criterion>Issue dokumentiert WHO ist Owner — Solo-Consultant oder externer Sales-Partner</criterion>
  </acceptance_criteria>
</issue>

<issue id="36" slug="rechtsgutachten-de-gpl-patent">
  <title>Rechtsgutachten DE — §69c UrhG, GPL/Pyodide-Kombination, Patent-FTO Procaccia/Flanigan</title>
  <track>7</track>
  <estimate_pt>2</estimate_pt>
  <deps>—</deps>
  <rationale>S-1, S-6 aus CLAUDE.md offen. P1-6 aus 06-review-consolidation.md. Ohne dieses Gutachten:
- bleibt S-1 (Lizenz-Pfad) blockiert — Apache-2.0-Endziel nicht erreichbar
- bleibt das Patent-Risiko (Procaccia/Flanigan) ungeklärt
- weiß die Kommune nicht, ob die GPL-Auslieferung sie selbst zur GPL-Distribution zwingt (relevant für Forks/Anpassungen)
Das Issue ist „bestelle ein Gutachten" — die Arbeit macht eine Anwaltskanzlei, aber ohne Issue passiert nichts.</rationale>
  <acceptance_criteria>
    <criterion>Identifikation von 2-3 deutschen IT-Recht-Kanzleien mit OSS-/Patent-Erfahrung (z.B. JBB Rechtsanwälte, Till Jaeger)</criterion>
    <criterion>Anfragepaket: Repo-Snapshot + sortition-tool/00-masterplan.md + 06-review-consolidation.md + spezifische Fragen-Liste</criterion>
    <criterion>Kostenindikation eingeholt; Budget-Entscheidung dokumentiert</criterion>
    <criterion>Auftrag erteilt, Gutachten erhalten und in docs/legal/rechtsgutachten-2026-XX.pdf abgelegt</criterion>
    <criterion>Folgeentscheidungen: docs/legal/folgerungen.md schließt S-1 und S-6 in CLAUDE.md</criterion>
    <criterion>Bei Patent-Risk: Mitigationsplan (z.B. Algorithm-Variant-Auswahl, vorbeugende Lizenzierung)</criterion>
  </acceptance_criteria>
</issue>

<issue id="37" slug="panel-ops-ui-completion">
  <title>UI-Aktionen für Reroll/Replace/Extend — #21/#22/#23 in den Browser bringen</title>
  <track>6</track>
  <estimate_pt>2</estimate_pt>
  <deps>archived/21, archived/22, archived/23, archived/11</deps>
  <rationale>docs/iteration-1-autorun-2026-04-24.md:30-32 markiert #21/22/23 als „partial — UI-Action fehlt". apps/web/src/run/RunPanel.tsx hat keine entsprechenden Buttons. Nachrücker bei Absage (#22) ist laut archived/22.../ISSUE.md:14 „eine der meistgefragten Praxis-Operationen". Im Pilot-Workflow läuft das so: Lose ziehen → Einladungen verschicken → 30% sagen ab → Nachrücker brauchen → Panel auf Wunsch erweitern. Ohne diese drei UI-Aktionen ist der Pilot unbrauchbar. Logik existiert in packages/engine-a/src/panel-ops.ts; nur die UI-Schicht fehlt.</rationale>
  <acceptance_criteria>
    <criterion>RunPanel.tsx erhält drei zusätzliche Aktionen pro Result: „Person ersetzen" (pro Zeile), „Panel erweitern" (global), „Neu losen mit Diff" (global)</criterion>
    <criterion>Replace-Dialog: Person aus Panel auswählen, Grund-Feld optional, Result zeigt Nachrücker + Quoten-Status vorher/nachher (gemäß archived/22.../ISSUE.md:30-31)</criterion>
    <criterion>Extend-Dialog: N zusätzliche Plätze, Quoten-Skalierung mit Default-Vorschlag + Override (gemäß archived/23.../ISSUE.md:27-28)</criterion>
    <criterion>Reroll-Diff-View: zwei Panels nebeneinander, Diff-Liste „in 1, in 2, in beiden" (gemäß archived/21.../ISSUE.md:25-27)</criterion>
    <criterion>Audit-Doc-Erweiterung: events[] mit {type, timestamp, person_id, reason, ...} pro Operation; Schema (docs/audit-schema.json) entsprechend erweitert; verify_audit.py adaptiert</criterion>
    <criterion>Playwright-E2E pro Operation: lege Panel an, führe Operation aus, exportiere Audit, verifiziere Audit-Schema enthält das Event</criterion>
    <criterion>Engine-A only — Engine B wird in Iteration 2 separat angebunden</criterion>
  </acceptance_criteria>
</issue>

<issue id="38" slug="audit-issuer-trust-model">
  <title>Audit-Signatur — Issuer-Trust-Modell (kommunal-vergebener Schlüssel)</title>
  <track>3</track>
  <estimate_pt>2</estimate_pt>
  <deps>archived/11</deps>
  <rationale>P2-4 aus 06-review-consolidation.md, in iteration-1-findings.md:79 als „partial" markiert. apps/web/src/run/audit.ts:107 generiert pro Lauf einen frischen Ephemerial-Keypair. Der Public Key landet im Audit-Doc. scripts/verify_audit.py:50-62 verifiziert die Signatur GEGEN diesen mitgelieferten Public Key — d.h. ein Angreifer kann das Audit-Doc komplett ersetzen (neuer Schlüssel, neue Signatur, neue Daten) und die Verify-Pipeline akzeptiert es. Ohne Issuer-Trust-Anker ist die Signatur kosmetisch. Vor jedem Pilot, bei dem das Audit zur Verteidigung gegen Anfechtungen dienen muss, kritisch.</rationale>
  <acceptance_criteria>
    <criterion>Konzept-Doc docs/audit/trust-model.md: Was ist die Vertrauensquelle? Optionen (a) kommunal-erzeugter Long-Lived-Key, lokal in IndexedDB persistiert; (b) Schlüssel pro Verfahren, im Audit-Vertrag als Public Key dokumentiert; (c) externe CA. Empfehlung mit Begründung.</criterion>
    <criterion>UI: „Schlüssel verwalten"-Sektion in apps/web/src/, mit Operationen Generieren / Importieren / Exportieren / Public-Key-Anzeigen</criterion>
    <criterion>Persistenz in IndexedDB; private Key bleibt im Browser, exportierbar als JWK für Backup</criterion>
    <criterion>Audit-Doc enthält Issuer-Identifier (organization_id, e.g. „de-stuttgart-buergerrat-2026") + KeyID — beides aus dem persistierten Schlüssel-Slot</criterion>
    <criterion>Public-Key-Publikation: Doku, wie die Kommune den Key auf ihrer Website veröffentlicht (z.B. /.well-known/sortition-pubkey.pem)</criterion>
    <criterion>verify_audit.py: zusätzlicher --trusted-pubkey &lt;path&gt; oder --trusted-pubkey-url &lt;url&gt; Mode, der den im Doc enthaltenen Key gegen die externe Quelle prüft; ohne diesen Modus warnt das Skript explizit</criterion>
    <criterion>Migration: alte Audit-Docs (Schema 0.1) bleiben verifizierbar; neue sind Schema 0.2</criterion>
  </acceptance_criteria>
</issue>

<issue id="39" slug="csv-export-quoting-und-provenance">
  <title>CSV-Export-Bug fix + Provenance-Felder in Einladungs-Liste</title>
  <track>3</track>
  <estimate_pt>1</estimate_pt>
  <deps>archived/11</deps>
  <rationale>apps/web/src/run/audit.ts:158-167 (selectedToCsv) macht naives CSV ohne Quoting/Escaping. Ein Wert mit Komma, Anführungszeichen oder Newline (Adressen, doppelte Nachnamen, manche Migrations-Hintergrund-Codes) zerlegt die exportierte Einladungs-CSV silent in falsche Spalten. Die Kommune nutzt diese Datei für die Einladungen — Korruption hier produziert falsche Empfänger-Listen. Das ist ein Hard-Block für Pilot. Außerdem fehlt Provenance: Lauf-ID, Seed, Timestamp, Audit-Hash sollten als Header-Comment oder als Zusatzspalten dabei sein.</rationale>
  <acceptance_criteria>
    <criterion>selectedToCsv nutzt Papaparse (bereits installiert, papaparse@5.5.3 aus iteration-1-autorun-2026-04-24.md:117) für RFC-4180-konformes Quoting</criterion>
    <criterion>Test: Pool mit synthetischen Werten enthaltend Komma, Doppelquote, Newline; selectedToCsv → Round-Trip-Parse ergibt identische Werte</criterion>
    <criterion>Optionale Header-Comment-Zeilen (RFC-4180-konform per # ist nicht Standard — alternativ: Begleit-JSON mit Provenance, in selber ZIP-Datei wenn Browser zip kann; sonst als zweite Datei „panel-{seed}-provenance.json")</criterion>
    <criterion>Provenance enthält: pool_id, pool_sha256, quotas_sha256, seed, run_timestamp, engine_id+version, audit_doc_sha256</criterion>
    <criterion>Vitest-Unit-Test in apps/web/tests/unit/ für selectedToCsv mit Edge-Cases</criterion>
    <criterion>Playwright-E2E-Test, der die Einladungs-CSV exportiert und Round-Trip prüft</criterion>
  </acceptance_criteria>
</issue>

</proposed_issues>

<not_proposed>

<item>
  <topic>Engine B Performance-Optimierung (Warm-Start, Snapshot-Caching)</topic>
  <reason>Nicht-Pilot-blockend. Engine B ist Iteration-2-V1, Optimierung Iteration-2-V2. Premature.</reason>
</item>

<item>
  <topic>Leximin-HiGHS-Port (#16 Aktivierung vor Pilot)</topic>
  <reason>STATUS.md sagt 3-5 PT, Forschungs-Charakter (Gurobi-Parameter-Äquivalenz nicht-trivial). Pilot kommt mit Maximin aus, weil Reference C (Maximin) als Quality-Anker reicht. Iteration-2-V2 frühestens.</reason>
</item>

<item>
  <topic>iOS/Safari-Support</topic>
  <reason>Explizit als out of scope deklariert (.issues/README.md:9, Pyodide #5428). Re-introducing wäre Scope-Creep ohne Pilot-Bedarf.</reason>
</item>

<item>
  <topic>sf_a..sf_d Roh-Daten Beschaffung</topic>
  <reason>archived/04-pgoelz-reference-pool-loader/STATUS.md erläutert: nicht öffentlich (DSGVO-Grund). Beschaffung wäre rechtlich-organisatorisch (Sortition Foundation kontaktieren), nicht technisch. Könnte als Sub-Bullet in Issue 35 mit aufgeführt werden, eigenes Issue lohnt nicht.</reason>
</item>

<item>
  <topic>„Best-of-N"-Auto-Reroll-Selection</topic>
  <reason>archived/21.../ISSUE.md:33 hat es selbst out-of-scope deklariert. Scope-Creep ohne Pilot-Begründung.</reason>
</item>

<item>
  <topic>Komplette UI-Redesign / Design-System-Switch</topic>
  <reason>Iteration-1-UI ist funktional und besteht den a11y-Smoke. Volle BITV-Konformität (Issue 32) verlangt punktuelle Fixes, nicht Re-Design. Vor Pilot nicht nötig.</reason>
</item>

<item>
  <topic>Hersteller-spezifische CSV-Adapter (EWO/MESO/VOIS)</topic>
  <reason>P1-2 ist relevant, aber pilot-spezifisch — der konkrete Hersteller hängt von der ersten Pilot-Kommune ab (Stuttgart EWO ≠ München KOMM ≠ Wien VRR). Ohne Pilot-Identität (Issue 35) ist der Adapter Spekulation. Sollte als Sub-Track unter Issue 35 hängen, sobald Pilot-Kommune bekannt.</reason>
</item>

<item>
  <topic>Multi-Tenant / SaaS-Hosting</topic>
  <reason>Architektur-Entscheidung S-3 in CLAUDE.md ist offen. Im Iteration-2-V1-Scope NICHT — die App bleibt statisch + Self-Hosted. SaaS-Entscheidung gehört in Masterplan v3.</reason>
</item>

<item>
  <topic>Wartungs-/CVE-Update-Modell (P2-1)</topic>
  <reason>Relevant, aber kein Pilot-Block. Kann in Issue 35 als Vertrags-Klausel adressiert werden („Wir liefern 12 Monate Security-Updates"). Eigenes Issue erst nach Pilot-Erfolg.</reason>
</item>

</not_proposed>

<priority_order>

<step n="1">Issue 31 (DSFA-Template) + Issue 36 (Rechtsgutachten) — parallel sofort, weil beide externe Wartezeit haben (Anwälte, DSGVO-Reviewer). Diese Wartezeit definiert die Pilot-Timeline. Ohne sie keine Kommune-Verhandlung.</step>

<step n="2">Issue 35 (Pilot-Kommune-Akquise) — startet sofort, ohne auf 31/36 zu warten, mit „in Vorbereitung"-Disclaimer. Die ersten Gespräche dauern Wochen.</step>

<step n="3">Issue 39 (CSV-Export-Bug) — kritisch, klein, schnell. Kann in 1 PT erledigt werden, sollte vor jedem weiteren Engineering-Issue passieren.</step>

<step n="4">Issue 28 (Statistical Seed Sweep, n=30) + Issue 30 (Native Large-Pool-Benchmark) — erweitert Vergleichsdaten-Belastbarkeit. Wenn Issue 30 zeigt, dass Engine A bei n=2000 unbenutzbar wird, ändert das die Engine-B-Priorität.</step>

<step n="5">Issue 27 (Cross-Runtime-Person-Level-Drift) — beantwortet die wissenschaftlich fundamentale Frage „bekommen Sub-Gruppen substanziell andere Chancen mit Engine A vs C?". Voraussetzung für Audit-Verteidigung.</step>

<step n="6">Issue 26 (Engine A Worker-Isolation) + Issue 29 (Property-Tests) — Architektur-Schulden + Korrektheit. Parallel zu (4)/(5).</step>

<step n="7">Issue 38 (Audit-Issuer-Trust-Modell) — mittlere Priorität: ohne Issuer-Trust ist das Audit kosmetisch, aber nicht silent corruption wie Issue 39. Sollte vor erstem signiertem Pilot-Lauf existieren.</step>

<step n="8">Issue 33 (i18n) — sobald Pilot-Kommune feststeht, klar ob EN nötig. Vorher: i18n-Architektur einbauen, Strings extrahieren, Übersetzungs-Lücken markieren.</step>

<step n="9">Issue 32 (BITV 2.0) — kommunal pflichtig, aber kein Hard-Block für ersten Pilot mit Klausel „Beta, nicht final BITV-konform". Spätestens vor zweitem Pilot oder produktivem Roll-out.</step>

<step n="10">Issue 34 (Methodenblatt) + Issue 37 (UI für Replace/Extend/Reroll) — beide nicht statistisch-blockend, aber Pilot-Operativ-blockend. Vor erstem real-Lauf.</step>

<step n="11">Erst danach Track 4 (Engine B, .issues/12-14) — schließt NF-1 (Fairness-Lücke), aber nur wenn Issues 27/28 zeigen, dass die Lücke statistisch signifikant ist UND Issue 30 zeigt, dass Engine A für die Pilot-Kommune-Pool-Größe nicht ausreicht.</step>

<step n="12">Erst danach Issue 16 (Leximin-Port) — Forschung, post-Pilot.</step>

</priority_order>

<verdict value="fail" critical="6" high="3" medium="2">
Mehrere P1-Items aus 06-review-consolidation.md (DSFA, BITV-2.0, i18n, Methodenblatt, Pilot-Kommune-Akquise, Rechtsgutachten) haben in der aktuellen `.issues/`-Struktur keine zugeordneten Issues. Zusätzlich sind im Code zwei kritische Bugs identifiziert: silent CSV-Korruption (audit.ts:158-167) und Audit-Signatur ohne Issuer-Trust-Modell (audit.ts:107). Die statistische Belastbarkeit der zentralen Iteration-1-Aussage „Engine A weicht um 17% ab" ist mit n=5 Seeds × 2 Pools nicht haltbar. Track 4 (Engine B, .issues/12-14) allein bringt das System NICHT zur Pilot-Tauglichkeit — die Engineering-Lücke ist die kleinere; die Compliance- und Trust-Lücke ist die größere. Die hier vorgeschlagenen 14 Issues (26-39) plus Aktivierung der bestehenden deferred Issues (12-14, 09) bringen das System plausibel zur ersten Pilot-Tauglichkeit, vorausgesetzt Issue 35 liefert eine konkrete Pilot-Kommune.
</verdict>

</review>
```

