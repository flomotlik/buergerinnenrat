---
review_of: iteration-2-issue-gaps
review_type: topic
review_mode: topic
review_topic: Welche Issues fehlen für Iteration 2 hin zu belastbaren Vergleichsdaten und Pilot-Einsatz
reviewed_at: 2026-04-25T04-31-59Z
tool: gemini
model: gemini-3.1-pro-preview
duration_seconds: 135
---

<review>

<focus_areas>
<area name="comparison_data_robustness">
  <gap>Die statistische Signifikanz ist bei nur 5 Seeds nicht gegeben (benötigt ≥30-50). Engine A wurde nicht systematisch auf praxisnahen Pool-Größen (1000-3000, analog zu historischen DE-Beispielen und `sf_e` mit 1727) validiert. Der Vergleichsharness misst nur aggregierte Metriken (min π), aber keinen Person-Level-Cross-Runtime-Drift. Property-Tests (aus Issue #09) für Edge-Cases (wie NF-4 degenerierte LPs) fehlen, was die Audit-Tauglichkeit untergräbt.</gap>
  <new_issue_proposal>26-01-engine-a-property-tests, 26-02-robust-comparison-harness</new_issue_proposal>
</area>
<area name="pilot_readiness">
  <gap>Zwingende Compliance-Pflichten fehlen: Ein DSFA-Template mit Datenflussdiagramm sowie ein Methodenblatt für Laien sind ungelöst. Die Barrierefreiheit ist nur per Smoke-Test geprüft (echtes BITV 2.0 Audit mit axe-core fehlt). Mehrsprachigkeit fehlt (ca. 49 hartkodierte Strings in `apps/web/src/`). Reale CSV-Export-Sonderformate (EWO, MESO) werden nicht unterstützt. Audit-Signaturen verwenden flüchtige statt kommunal-hinterlegter Schlüssel. Pilot-Vereinbarung und rechtliches GPL-Gutachten fehlen.</gap>
  <new_issue_proposal>26-03-dsfa-and-methods-paper, 26-04-bitv-and-i18n-foundation, 26-05-real-csv-adapters, 26-06-audit-commune-keypair, 26-07-pilot-and-license-legal</new_issue_proposal>
</area>
<area name="algorithmic_correctness">
  <gap>Wegen NF-1 (15-17% Fairness-Lücke in Engine A) ist Engine A allein für reale Lose unzureichend. Engine B (Tracks #12-#14) muss vor dem Pilot für die finale Ziehung im Browser (WASM) integriert werden, was auch die Messung des Engine-B-Cross-Runtime-Drifts erst ermöglicht. Property-Tests für Panel-Operationen (`replaceSinglePerson`, `extendBy` in `packages/engine-a/src/panel-ops.ts`) fehlen.</gap>
  <new_issue_proposal>26-08-engine-b-pyodide-track</new_issue_proposal>
</area>
<area name="architecture_debt">
  <gap>Mangelhafte Worker-Isolation: `apps/web/src/run/runEngine.ts` ruft `engine.run()` direkt im Main-Thread auf. Zwar werden UI-Freezes durch `await`-Yields etwas abgemildert, es handelt sich aber um keinen echten Web Worker (entgegen der Issue #08 Forderung), was bei großen Pools kritisch blockiert.</gap>
  <new_issue_proposal>26-09-web-worker-isolation</new_issue_proposal>
</area>
</focus_areas>

<proposed_issues>
<issue id="26-01" slug="engine-a-property-tests">
  <title>Engine A: Property Tests &amp; Panel-Ops (Pickup #09)</title>
  <track>2 Engine A</track>
  <estimate_pt>1</estimate_pt>
  <deps>08</deps>
  <rationale>Vor einem Pilot muss die algorithmische Korrektheit zwingend durch automatisierte Großzahl-Tests auf Invarianten (marginals >= 0, Determinismus) abgesichert werden. Ohne validierte Randfälle sind die Vergleichsdaten nicht audit-tauglich.</rationale>
  <acceptance_criteria>
    <criterion>packages/engine-a/tests/property.test.ts via fast-check implementiert</criterion>
    <criterion>Mind. 100 zufällige Kombinationen validieren selected.length === panel_size</criterion>
    <criterion>Determinismus bei gleichem Seed ist gesichert</criterion>
    <criterion>Property-Tests für `replaceSinglePerson` und `extendBy` ergänzt</criterion>
  </acceptance_criteria>
</issue>

<issue id="26-02" slug="robust-comparison-harness">
  <title>Vergleichsharness: Statistische Belastbarkeit &amp; Person-Level-Drift</title>
  <track>5 Referenz &amp; Quality</track>
  <estimate_pt>3</estimate_pt>
  <deps>19, 26-01</deps>
  <rationale>Nur 5 Seeds und N=200 sind statistisch dünn. Die Messung des Person-Level-Cross-Runtime-Diffs (Identität der Marginale) bei großen Pools bis N=3000 ist Pflicht, um einer Kommune die algorithmische Äquivalenz garantieren zu können.</rationale>
  <acceptance_criteria>
    <criterion>Harness führt mind. 50 Seeds pro Instanz aus</criterion>
    <criterion>Vergleich misst explizit den Person-Level-Drift (Abweichung der Auswahlwahrscheinlichkeit pro Individuum)</criterion>
    <criterion>Pool-Größen bis 3000 werden getestet und dokumentiert</criterion>
    <criterion>Bericht quantifiziert statistische Konfidenzintervalle für die Abweichung</criterion>
  </acceptance_criteria>
</issue>

<issue id="26-03" slug="dsfa-and-methods-paper">
  <title>DSFA-Template &amp; Methodenblatt</title>
  <track>7 Compliance</track>
  <estimate_pt>3</estimate_pt>
  <deps></deps>
  <rationale>Der Einsatz echter Daten erfordert nach DSGVO eine DSFA mit klaren Datenflüssen (in-memory Nachweis). Das Methodenblatt (Laien-Erklärung) ist Voraussetzung für die Beschlussfassung im Gemeinderat.</rationale>
  <acceptance_criteria>
    <criterion>DSFA-Template mit Datenflussdiagramm liegt vor</criterion>
    <criterion>Nachweis der backend-losen Verarbeitung dokumentiert</criterion>
    <criterion>Methodenblatt (Laien-Erklärung von Maximin) in Behördensprache &amp; Leichter Sprache verfasst</criterion>
  </acceptance_criteria>
</issue>

<issue id="26-04" slug="bitv-and-i18n-foundation">
  <title>BITV 2.0-Audit &amp; i18n-Framework</title>
  <track>1 UI-Kern</track>
  <estimate_pt>3</estimate_pt>
  <deps>24</deps>
  <rationale>Ohne echte Barrierefreiheit (BGG §12a) blockiert die kommunale Beschaffung. Die ca. 49 hartkodierten deutschen UI-Strings in apps/web/src müssen extrahiert werden, um Mehrsprachigkeit für Piloten zu erlauben.</rationale>
  <acceptance_criteria>
    <criterion>axe-core CI-Integration erreicht einen Score >= 90</criterion>
    <criterion>i18next o.ä. eingeführt</criterion>
    <criterion>Alle hartkodierten DE-Strings in eine Sprachdatei extrahiert</criterion>
    <criterion>Tastaturbedienung und ARIA-Labels für den Quoten-Editor umfassend geprüft</criterion>
  </acceptance_criteria>
</issue>

<issue id="26-05" slug="real-csv-adapters">
  <title>Reale kommunale CSV-Adapter (EWO/MESO)</title>
  <track>1 UI-Kern</track>
  <estimate_pt>3</estimate_pt>
  <deps>05</deps>
  <rationale>Synthetische CSVs ignorieren die Realität der Meldeämter (z.B. CP1252, geteilte Felder, fehlende Spalten). Ein Pilot droht andernfalls direkt am Datenimport zu scheitern.</rationale>
  <acceptance_criteria>
    <criterion>Adapter/Mapping-Logik für 2 realistische EWO/MESO-Strukturen implementiert</criterion>
    <criterion>UI erlaubt das flexible Mapping unstandardisierter Spalten</criterion>
    <criterion>Warn-UI für fehlerhafte/unvollständige Reihen integriert</criterion>
  </acceptance_criteria>
</issue>

<issue id="26-06" slug="audit-commune-keypair">
  <title>Importierbare Ed25519/ECDSA-Schlüssel für Audit</title>
  <track>7 Compliance</track>
  <estimate_pt>1</estimate_pt>
  <deps>11</deps>
  <rationale>Die aktuelle Signatur nutzt einen pro Lauf frischen Schlüssel. Für Audit-Compliance und rechtliche Nicht-Abstreitbarkeit muss ein kommunal-vergebener Schlüssel verwendet werden können.</rationale>
  <acceptance_criteria>
    <criterion>UI bietet den Import eines eigenen Private Keys (PEM/JWK) an</criterion>
    <criterion>Alternativ langlebiges Keypair im LocalStorage mit Export-Option des Public Keys für das Rechtsamt</criterion>
    <criterion>Audit-JSON nutzt diesen Schlüssel zur Signatur</criterion>
  </acceptance_criteria>
</issue>

<issue id="26-07" slug="pilot-and-license-legal">
  <title>Pilot-Vereinbarung &amp; Lizenz-Rechtsgutachten (S-1/S-4)</title>
  <track>7 Compliance</track>
  <estimate_pt>2</estimate_pt>
  <deps></deps>
  <rationale>Technischer Build ist nutzlos ohne rechtlich gesicherte Pilot-Kommune und eine klare gutachterliche Aussage, ob die GPL-Pyodide-Distribution für den Einsatzweg rechtlich haltbar ist.</rationale>
  <acceptance_criteria>
    <criterion>Deutsches Rechtsgutachten zur GPL-Pyodide-Kombination angefragt und ausgewertet</criterion>
    <criterion>Verbindliche Vereinbarung mit einer Pilot-Kommune geschlossen</criterion>
  </acceptance_criteria>
</issue>

<issue id="26-08" slug="engine-b-pyodide-track">
  <title>Engine B: Pyodide &amp; Native Maximin (Pickup #12-#14)</title>
  <track>4 Engine B</track>
  <estimate_pt>5.5</estimate_pt>
  <deps>07, 01, 26-07</deps>
  <rationale>NF-1 deckt eine 15-17% Fairness-Lücke der Engine A auf. Vor Pilot-Einsatz muss die volle Maximin-Referenz (via Pyodide im Browser) laufen, um reale Lose qualitativ nicht anzugreifen.</rationale>
  <acceptance_criteria>
    <criterion>Pyodide-Runtime im Browser integriert (lazy load)</criterion>
    <criterion>sortition-algorithms + highspy laden und führen `find_distribution_maximin` aus</criterion>
    <criterion>Engine B liefert volle Fairness (identisch zu Reference C)</criterion>
    <criterion>UI erlaubt Engine-Swap</criterion>
  </acceptance_criteria>
</issue>

<issue id="26-09" slug="web-worker-isolation">
  <title>Web Worker Isolation für TS-Engine</title>
  <track>3 UI Wire-up</track>
  <estimate_pt>2</estimate_pt>
  <deps>10</deps>
  <rationale>Der direkte Lauf von `engine.run()` in `apps/web/src/run/runEngine.ts` blockiert bei N>500 die UI, was Browser-Abstürze oder schlechte UX bei der kommunalen Live-Ziehung verursacht.</rationale>
  <acceptance_criteria>
    <criterion>runEngine.ts delegiert an echten Web Worker</criterion>
    <criterion>Kein UI-Blocking/Freeze bei Pool-Größen > 1000</criterion>
    <criterion>Progress-Events werden korrekt serialisiert empfangen</criterion>
  </acceptance_criteria>
</issue>
</proposed_issues>

<not_proposed>
<item>
  <topic>Leximin-Portierung via HiGHS (Pickup #16)</topic>
  <reason>Das Leximin-Problem erfordert komplexen Upstream-Port (3-5 PT) ohne Gurobi. Da Engine B via Maximin bereits vollwertig legitime Ergebnisse liefert, blockiert dies nicht den MVP/Pilot. Rein akademischer Wert für spätere Iterationen.</reason>
</item>
<item>
  <topic>Performance-Profiling für Engine A</topic>
  <reason>Die Latenz von Engine A ist nicht das Hauptproblem (sie ist 5-28x schneller als C). Die Fairness ist das Problem (NF-1). Da für das finale Los Engine B nötig wird, wäre Optimierung von A vor dem Pilot Ressourcenverschwendung.</reason>
</item>
</not_proposed>

<priority_order>
<step n="1">Issue 26-07 — Lizenzgutachten &amp; Pilot-Zusage (Non-Tech Blockers priorisieren).</step>
<step n="2">Issue 26-03 — DSFA &amp; Methodenblatt unblockieren den Genehmigungsprozess der Kommune.</step>
<step n="3">Issue 26-08 — Engine B schließt die 17% Fairness-Lücke (NF-1) für das echte Pilot-Los.</step>
<step n="4">Issue 26-01 — Property Tests sichern Engine A und die Panel-Ops funktional und mathematisch ab.</step>
<step n="5">Issue 26-02 — Erweitert den Harness um statistisch belastbare 50-Seed-Checks &amp; Person-Level-Drift.</step>
<step n="6">Issue 26-09 — Web Worker Isolation verhindert kritische UI-Ausfälle (Freezes) beim Pilot-Draw.</step>
<step n="7">Issue 26-05 — EWO/MESO-Adapter verhindern den Fallback auf fehleranfälliges manuelles CSV-Hacking.</step>
<step n="8">Issue 26-04 — BITV &amp; i18n lösen die rechtlichen UI-Vorgaben nach BGG §12a ein.</step>
<step n="9">Issue 26-06 — Kommunales Audit-Keypair sichert die Beweisfestigkeit des gezogenen Panels.</step>
</priority_order>

<verdict value="fail" critical="3" high="4" medium="2">
<blockers>
<blocker>Die Vergleichsdaten sind ohne Person-Level-Drift und mit nur 5 Seeds nicht robust genug für eine belastbare Aussage.</blocker>
<blocker>Entscheidende rechtliche Pflichten für den Pilot (DSFA, BITV-2.0-Score, Audit-Schlüssel, Methodenblatt) sind ungelöst.</blocker>
<blocker>Die fehlende Worker-Isolation verursacht UI-Freezes, und Engine A verfehlt die volle Fairness (NF-1), was Engine B zwingend erforderlich macht.</blocker>
</blockers>
</verdict>

</review>
