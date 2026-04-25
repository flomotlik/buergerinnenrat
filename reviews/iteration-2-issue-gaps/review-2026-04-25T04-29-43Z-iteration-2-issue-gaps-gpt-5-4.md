---
review_of: iteration-2-issue-gaps
review_type: topic
review_mode: topic
review_topic: Welche Issues fehlen für Iteration 2 hin zu belastbaren Vergleichsdaten und Pilot-Einsatz
reviewed_at: 2026-04-25T04-29-43Z
tool: codex
model: gpt-5.4
duration_seconds: 379
---

<review>

<focus_areas>
<area name="comparison_data_robustness">
  <gap severity="critical">Die aktuelle Vergleichsbasis ist statistisch zu dünn für belastbare Aussagen: der Bericht nutzt nur die Seeds 1 bis 5 auf zwei kleinen Pools und benennt das selbst als Limitation (`docs/quality-comparison-iteration-1.md:3-5,73-78`); `docs/iteration-1-findings.md` markiert P0-3 deshalb nur als partial (`docs/iteration-1-findings.md:20-33`); das Harness ist weiterhin faktisch ein Zwei-Wege-Lauf mit `SETUPS = ("engine-a", "reference-c")`, Default-Seeds 1 bis 5 und nur kleinen Default-Pools (`scripts/compare_runs.py:32-34,204-220`).</gap>
  <new_issue_proposal>26-benchmark-matrix-and-statistical-power — Vergleich auf 100/500/1000/2000-Pools und mit belastbarer Seed-Zahl ausbauen.</new_issue_proposal>
  <gap severity="critical">Cross-Runtime-Drift auf Personenebene ist weiterhin unbeantwortet: Engine B fehlt in Iteration 1 (`docs/quality-comparison-iteration-1.md:7-10`), Track 4 wurde nur aus Zeitgründen verschoben (`.issues/12-engine-b-pyodide-bootstrap/STATUS.md:7-20`), und Issue #19 vergleicht nur aggregierte Setup-Metriken statt Marginalen pro Person (`.issues/archived/19-three-way-comparison-harness/ISSUE.md:24-35`, `scripts/compare_runs.py:121-154`).</gap>
  <new_issue_proposal>27-cross-runtime-person-level-drift-harness — gleiche Seeds, gleiche Pools, Diff der Marginalen und Panel-Outputs über A/B/C.</new_issue_proposal>
</area>

<area name="pilot_readiness">
  <gap severity="critical">Der kommunale Compliance-Pfad ist offen und hat noch kein Umsetzungs-Issue: P1-1 steht ausdrücklich auf open (`docs/iteration-1-findings.md:47-48`), die vorhandene Accessibility-Abdeckung ist laut Testdatei nur ein Lightweight-Smoke-Check (`apps/web/tests/e2e/a11y.spec.ts:3-31`), und Issue #24 hat vollständige BITV-2.0-Konformität explizit aus dem Scope ausgeschlossen (`.issues/archived/24-static-deploy-and-a11y-audit/ISSUE.md:18-19,39-43`).</gap>
  <new_issue_proposal>29-dsfa-template-and-dataflow-diagram und 30-bitv-2-0-audit-and-remediation — beide vor erstem Pilot nötig.</new_issue_proposal>
  <gap severity="high">Der reale Importpfad für Kommunen fehlt weiterhin: P1-2 ist nur teilweise beantwortet (`docs/iteration-1-findings.md:50-53`), Issue #05 löst nur Parsing plus manuelles Mapping und schließt Herstelleradapter explizit aus (`.issues/archived/05-csv-import-and-mapping/ISSUE.md:16-18,36-41`), während `docs/synthetic-pools.md` selbst fehlende Missing-Value-, Adress- und EWO/MESO/VOIS-Abdeckung benennt (`docs/synthetic-pools.md:59-64`).</gap>
  <new_issue_proposal>31-real-municipal-csv-adapters-and-import-diagnostics — Pilotdaten werden sonst am Import scheitern, nicht am Solver.</new_issue_proposal>
  <gap severity="high">Methodenblatt und Sprachpfad fehlen: P1-4 und P1-5 sind open (`docs/iteration-1-findings.md:58-63`), die UI ist durchgehend deutsch und hart kodiert, z.B. in `App.tsx`, `CsvImport.tsx`, `QuotaEditor.tsx` und `RunPanel.tsx` (`apps/web/src/App.tsx:58-100`, `apps/web/src/csv/CsvImport.tsx:61-147`, `apps/web/src/quotas/QuotaEditor.tsx:90-206`, `apps/web/src/run/RunPanel.tsx:71-256`); ein Literal-Scan über die sechs Kernquellen unter `apps/web/src/` ergibt 247 String-Literale als Extraktions-Baseline.</gap>
  <new_issue_proposal>32-de-en-i18n-and-methodenblatt-pack — ohne verständliche DE/EN-Artefakte darf keine Kommune das Verfahren seriös pilotieren.</new_issue_proposal>
  <gap severity="critical">Die Audit-Schicht ist nicht pilottauglich: Issue #11 erklärte frische, nicht persistierte Keypairs als ausreichend und schloss Kommunen-Schlüssel bewusst aus (`.issues/archived/11-csv-json-export-with-audit/ISSUE.md:37-47`); `signAudit()` erzeugt pro Lauf ein neues Schlüsselpair (`apps/web/src/run/audit.ts:106-149`); zusätzlich bauen Browser und Python-Verifier `input_sha256` unterschiedlich, weil der Browser Pool und Quoten mit einem Unit-Separator verbindet (`apps/web/src/run/audit.ts:68-71`), der Verifier aber ohne Separator hasht (`scripts/verify_audit.py:113-115`). Eine direkte Reproduktion liefert unterschiedliche SHA-256-Werte. Das untergräbt P2-4 statt es zu schließen.</gap>
  <new_issue_proposal>33-audit-key-management-and-hash-parity — Schlüsselherkunft, Hash-Parität und Verifikationspfad sauber machen.</new_issue_proposal>
</area>

<area name="algorithmic_correctness">
  <gap severity="high">Eigenschaftstests bleiben zu dünn: #09 ist deferred und bestätigt selbst, dass nur sieben handgeschriebene Engine-Tests existieren (`.issues/09-engine-a-property-tests/STATUS.md:6-27`); `docs/iteration-1-autorun-2026-04-24.md` nennt 11 grüne Engine-A-Tests, davon sieben Engine und vier Panel-Ops (`docs/iteration-1-autorun-2026-04-24.md:38-46`); `packages/engine-a/src/panel-ops.ts` enthält aber zustandsbehaftete Replace/Extend-Logik mit `forceIn` und `forceOut`, die bisher nur über wenige Handfälle abgesichert ist (`packages/engine-a/src/panel-ops.ts:27-89`).</gap>
  <new_issue_proposal>34-panel-ops-property-tests — Replace/Extend-Invarianten auditfest machen.</new_issue_proposal>
</area>

<area name="architecture_debt">
  <gap severity="high">Die UI läuft entgegen der ursprünglichen Acceptance Criteria ohne echten Worker: Issue #08 verlangte explizit Worker-Ausführung, `postMessage`-Progress und terminierbaren Timeout (`.issues/archived/08-engine-a-highs-maximin/ISSUE.md:22-40`); tatsächlich instanziiert `runEngineA()` `new EngineA()` direkt im UI-Pfad und iteriert die Engine im Main-Thread (`apps/web/src/run/runEngine.ts:19-46`). Das ist kein kosmetischer Unterschied, sondern ein Pilot-Risiko bei größeren Pools und bei Abbruchverhalten.</gap>
  <new_issue_proposal>28-worker-isolation-and-true-cancellation — echte Worker-Isolation statt cooperative yielding.</new_issue_proposal>
</area>
</focus_areas>

<proposed_issues>
<issue id="26" slug="benchmark-matrix-and-statistical-power">
  <title>Benchmark-Matrix und statistische Tragfähigkeit für A-vs-C ausbauen</title>
  <track>5 Quality</track>
  <estimate_pt>2</estimate_pt>
  <deps>03, 04, 15, 18, 19, 20</deps>
  <rationale>Vor Pilot braucht ihr Vergleichsdaten, denen man trauen kann. Mit fünf Seeds und nur kleinen Pools bleibt jede Aussage zu Fairness-Verlust und Laufzeit unterbestimmt (`docs/quality-comparison-iteration-1.md:73-78`). Das vorhandene Harness deckt die im Backlog geforderte Größenordnung 100 bis 3000 nicht ab und defaultet selbst nur auf kleine Fixtures (`scripts/compare_runs.py:204-220`). Ich würde hier eine Mindestzahl von 30 Seeds pro Pool und Setup ansetzen; das ist eine statistische Arbeitsannahme für stabile Monte-Carlo-Schätzer, nicht eine aus dem Repo abgeleitete harte Naturkonstante.</rationale>
  <acceptance_criteria>
    <criterion>`scripts/compare_runs.py` kann standardmäßig eine Matrix aus öffentlichen Paper-Pools plus synthetischen 100-, 500-, 1000- und 2000-Pools laufen lassen; `example_large_200` ist explizit enthalten oder als Timeout-Fall explizit markiert.</criterion>
    <criterion>Die Standard-Seed-Zahl pro Pool und Setup ist mindestens 30 und wird im Artefakt-Bundle dokumentiert.</criterion>
    <criterion>`summary.json` enthält pro Pool und Setup Mittelwert, Median und 95-Prozent-Konfidenzintervall für `min_pi`, `gini` und Laufzeit.</criterion>
    <criterion>`comparison.md` zeigt Stichprobengröße und Unsicherheitsintervalle anstatt nur Punktschätzer.</criterion>
    <criterion>Große Läufe, die das Zeitbudget reißen, werden als `timeout` oder `not_completed` ausgewiesen und nicht stillschweigend ausgelassen.</criterion>
    <criterion>`docs/quality-comparison-iteration-1.md` oder ein Nachfolgedokument erklärt die neue Seed-Methodik und ihre Grenzen ausdrücklich.</criterion>
  </acceptance_criteria>
</issue>

<issue id="27" slug="cross-runtime-person-level-drift-harness">
  <title>Cross-Runtime-Person-Level-Drift über Engine A, Engine B und Reference C messen</title>
  <track>5 Quality</track>
  <estimate_pt>1.5</estimate_pt>
  <deps>15, 18, 19</deps>
  <rationale>Für ein gut vergleichbares System reicht Aggregatvergleich nicht. Die offene Kernfrage ist, ob bei identischem Pool und Seed dieselben oder hinreichend ähnliche Marginalen herauskommen. Das fehlt komplett (`docs/quality-comparison-iteration-1.md:7-10`, `scripts/compare_runs.py:121-154`). Diese Issue setzt praktisch voraus, dass die deferred Issues #12 bis #14 wieder aufgenommen werden; sie dupliziert sie nicht.</rationale>
  <acceptance_criteria>
    <criterion>Nach Wiederaufnahme von #12 bis #14 kann das Harness alle drei Setups `engine-a`, `engine-b` und `reference-c` ausführen.</criterion>
    <criterion>Für jeden Pool und Seed wird ein Drift-Artefakt mit Personen-Marginalen aller drei Setups erzeugt.</criterion>
    <criterion>Das Artefakt berechnet mindestens L1-, L-infinity- und Rangkorrelations-Differenzen für A-vs-B, B-vs-C und A-vs-C.</criterion>
    <criterion>Die Berichte weisen dieselben Seeds und dieselben Pools pro Setup aus; fehlende Runs werden explizit markiert.</criterion>
    <criterion>Für B-vs-C gibt es Schwellwerte für akzeptable Drift, damit der Browserpfad als Referenz-nah oder nicht referenz-nah bewertet werden kann.</criterion>
    <criterion>Zusätzlich zur Marginal-Drift wird die Übereinstimmung der konkret gezogenen Panels bei gleichem Seed dokumentiert.</criterion>
  </acceptance_criteria>
</issue>

<issue id="28" slug="worker-isolation-and-true-cancellation">
  <title>Engine-Läufe in echten Web Worker verschieben und Abbruch hart machen</title>
  <track>3 UI Wire-up</track>
  <estimate_pt>1</estimate_pt>
  <deps>08, 10</deps>
  <rationale>Issue #08 hatte Worker-Isolation ausdrücklich als Liefergegenstand (`.issues/archived/08-engine-a-highs-maximin/ISSUE.md:22-40`). Der aktuelle Code erfüllt das nicht (`apps/web/src/run/runEngine.ts:19-46`). Für Pilotpools im Hunderter- oder Tausenderbereich ist das ein Usability- und Korrektheitsrisiko, weil UI-Reaktionsfähigkeit und Cancel-Semantik gerade in kommunalen Bedienkontexten nicht optional sind.</rationale>
  <acceptance_criteria>
    <criterion>Engine A läuft in einem echten Web Worker und wird nicht mehr direkt aus dem Main-Thread instanziiert.</criterion>
    <criterion>Progress- und Log-Events werden über `postMessage` an die UI weitergereicht.</criterion>
    <criterion>`Abbrechen` terminiert den Worker tatsächlich und liefert einen klaren `aborted`-Status zurück.</criterion>
    <criterion>Ein Playwright-Test zeigt, dass die UI während eines längeren 500er- oder 1000er-Laufs weiter bedienbar bleibt.</criterion>
    <criterion>Die Worker-CSP und der Deploy-Guide bleiben konsistent mit der tatsächlichen Laufzeitarchitektur.</criterion>
  </acceptance_criteria>
</issue>

<issue id="29" slug="dsfa-template-and-dataflow-diagram">
  <title>DSFA-Template und Datenfluss-Dokumentation für Pilot-Kommune erstellen</title>
  <track>7 Compliance</track>
  <estimate_pt>1</estimate_pt>
  <deps>05, 10, 11, 24</deps>
  <rationale>P1-1 ist offen (`docs/iteration-1-findings.md:47-48`). Das Produktargument „kein Backend“ hilft nur, wenn es als Datenfluss, Rollenbild und TOM-Liste dokumentiert ist. Ohne diese Unterlagen kann eine Kommune die Nutzung nicht intern freigeben, selbst wenn die App technisch funktioniert.</rationale>
  <acceptance_criteria>
    <criterion>Es gibt ein ausfüllbares DSFA-Template für Kommunen mit Verantwortlichem, Zweck, Rechtsgrundlage, Risiken und Maßnahmen.</criterion>
    <criterion>Ein Datenflussdiagramm beschreibt Upload, In-Memory-Verarbeitung, Export, Signatur und Nicht-Persistenz entlang der realen Codepfade.</criterion>
    <criterion>Das Dokument nennt offen verbleibende Entscheidungen, die durch DPO oder Rechtsamt der Pilotkommune zu schließen sind.</criterion>
    <criterion>Retention- und Löschhinweise für CSV, Audit-Datei und lokale Arbeitskopien sind enthalten.</criterion>
    <criterion>Die TOM-Liste verweist auf konkrete technische Eigenschaften der App, etwa statisches Hosting, kein Backend und Audit-Export.</criterion>
    <criterion>Die Vorlage ist so geschnitten, dass sie eine Kommune mit ihren eigenen Kontaktdaten und Rechtsgrundlagen vervollständigen kann.</criterion>
  </acceptance_criteria>
</issue>

<issue id="30" slug="bitv-2-0-audit-and-remediation">
  <title>BITV-2.0-Prüfung und gezielte Remediation für den Kernflow</title>
  <track>7 Compliance</track>
  <estimate_pt>2</estimate_pt>
  <deps>10, 24</deps>
  <rationale>Der derzeitige Stand ist ausdrücklich nur Smoke (`apps/web/tests/e2e/a11y.spec.ts:3-31`, `.issues/archived/24-static-deploy-and-a11y-audit/ISSUE.md:18-19,39-43`). Kommunaler Einsatz verlangt aber prüfbare, dokumentierte Barrierefreiheit für Import, Quotenbearbeitung und Laufstart. Ohne dieses Issue bleibt der Pilot faktisch blockiert.</rationale>
  <acceptance_criteria>
    <criterion>Axe-Core oder äquivalente automatisierte Prüfungen laufen über den vollständigen Hauptflow und sind Teil des Testpakets.</criterion>
    <criterion>Keyboard-Navigation, sichtbarer Fokus, Fehlermeldungen und Formularbeschriftungen für Import-, Quoten- und Run-Ansicht werden manuell geprüft und dokumentiert.</criterion>
    <criterion>Kontrast- und Statuskommunikation in den Fehlermeldungen und Ergebnisbereichen werden geprüft und bei Bedarf angepasst.</criterion>
    <criterion>Das Repo enthält einen kurzen Prüfbericht mit behobenen, offenen und bewusst akzeptierten Punkten.</criterion>
    <criterion>Ein Entwurf für die Erklärung zur Barrierefreiheit wird mit den realen Restrisiken der App erzeugt.</criterion>
    <criterion>Blockierende Verstöße im Kernflow sind vor Abschluss behoben, nicht nur dokumentiert.</criterion>
  </acceptance_criteria>
</issue>

<issue id="31" slug="real-municipal-csv-adapters-and-import-diagnostics">
  <title>Reale Kommunal-CSV-Adapter und belastbare Import-Diagnostik ergänzen</title>
  <track>1 UI-Kern</track>
  <estimate_pt>2</estimate_pt>
  <deps>03, 05</deps>
  <rationale>Issue #05 war bewusst nur Parsing plus manuelles Mapping (`.issues/archived/05-csv-import-and-mapping/ISSUE.md:16-18,36-41`). Für einen ersten Pilot müsst ihr aber echte Exportformen aus Melderegister- oder Rücklaufsoftware robust abfangen. Sonst bleibt der schöne Browserflow ein Laborartefakt.</rationale>
  <acceptance_criteria>
    <criterion>Es gibt eine kleine, versionierte Fixture-Sammlung aus anonymisierten oder strukturgleichen Exporten typischer Kommunalsoftware.</criterion>
    <criterion>Bekannte Formate bekommen voreingestellte Mapping-Presets, damit die Kommune nicht alles manuell mappen muss.</criterion>
    <criterion>Der Import meldet strukturierte Diagnosen zu leeren IDs, Dubletten, unbekannten Spalten, Zeilenfehlern und problematischem Encoding.</criterion>
    <criterion>CP1252, leere Zeilen, zusätzliche Spalten und partielle Zeilenabbrüche sind durch Regressionstests abgesichert.</criterion>
    <criterion>Die Nutzeroberfläche trennt klar zwischen „Datei konnte gelesen werden“ und „Daten sind für einen Loslauf verwendbar“.</criterion>
    <criterion>Die Dokumentation nennt, welche Pilotformate schon unterstützt sind und welche nicht.</criterion>
  </acceptance_criteria>
</issue>

<issue id="32" slug="de-en-i18n-and-methodenblatt-pack">
  <title>DE/EN-i18n-Basis und Methodenblatt für Verwaltung und Teilnehmende liefern</title>
  <track>7 Compliance</track>
  <estimate_pt>2</estimate_pt>
  <deps>05, 06, 10, 24</deps>
  <rationale>P1-4 und P1-5 sind offen (`docs/iteration-1-findings.md:58-63`). Gleichzeitig ist die aktuelle UI vollständig deutsch und hart kodiert (`apps/web/src/App.tsx:58-100`, `apps/web/src/csv/CsvImport.tsx:61-147`, `apps/web/src/quotas/QuotaEditor.tsx:90-206`, `apps/web/src/run/RunPanel.tsx:71-256`). Für einen Pilot müsst ihr sowohl interne Verwaltung als auch externe Öffentlichkeit sprachlich sauber bedienen, und zwar ohne falsche Produktversprechen über Leximin oder über die Fairness-Lücke von Engine A.</rationale>
  <acceptance_criteria>
    <criterion>Alle user-facing Strings des Hauptflows werden aus `apps/web/src/` in ein i18n-System extrahiert; der aktuelle Hartkodierungsstand dient als Baseline.</criterion>
    <criterion>Deutsch bleibt Defaultsprache, Englisch ist für den kompletten Hauptflow verfügbar.</criterion>
    <criterion>Es gibt einen einfachen Sprachumschalter oder einen dokumentierten Locale-Parameter.</criterion>
    <criterion>Ein Methodenblatt erklärt Maximin, Quoten, Seed, Audit-Datei und den Unterschied zwischen heuristischer Engine A und referenznaher Engine B/C in Verwaltungssprache.</criterion>
    <criterion>Zusätzlich gibt es eine knappe, leichter verständliche Bürgerinnen-und-Bürger-Version mit denselben fachlichen Aussagen.</criterion>
    <criterion>Die Texte behaupten nirgends, dass Leximin oder vollständige Produktionsqualität schon in Iteration 1 vorliegt.</criterion>
  </acceptance_criteria>
</issue>

<issue id="33" slug="audit-key-management-and-hash-parity">
  <title>Audit-Key-Management, Hash-Parität und kommunalen Trust-Pfad herstellen</title>
  <track>7 Compliance</track>
  <estimate_pt>1</estimate_pt>
  <deps>11, 24</deps>
  <rationale>Die Audit-Schicht ist bisher eher ein Demo-Beweis als ein kommunal belastbarer Prüfpfad. Frische Ephemeral Keys waren in #11 bewusst ausreichend für Iteration 1 (`.issues/archived/11-csv-json-export-with-audit/ISSUE.md:37-47`), reichen aber nicht für Audit-Compliance. Der zusätzliche Hash-Mismatch zwischen TS und Python macht daraus nicht nur eine Governance-Lücke, sondern auch eine aktuelle Interop-Lücke (`apps/web/src/run/audit.ts:68-71`, `scripts/verify_audit.py:113-115`).</rationale>
  <acceptance_criteria>
    <criterion>TS und Python teilen sich dieselbe kanonische `input_sha256`-Spezifikation; mindestens ein Golden-Test prüft byte-identische Hashes.</criterion>
    <criterion>Der Verifier kann denselben Input-Typ prüfen, den der Browser tatsächlich signiert, ohne stillen Formatwechsel.</criterion>
    <criterion>Das Audit-Schema erhält Felder für Schlüsselherkunft oder `key_id`, sodass kommunale Schlüssel nachweisbar referenziert werden können.</criterion>
    <criterion>Für Pilotbetrieb gibt es einen dokumentierten Trust-Pfad mit importiertem oder extern verwaltetem Schlüssel; Ephemeral-only ist höchstens Fallback für Demo.</criterion>
    <criterion>Ein Ende-zu-Ende-Test exportiert ein Audit und verifiziert Signatur und `input_sha256` erfolgreich.</criterion>
    <criterion>Die Doku erklärt Ed25519/ECDSA-Fallback korrekt und benennt die Browserabhängigkeit ohne falsches Ed25519-only-Narrativ.</criterion>
  </acceptance_criteria>
</issue>

<issue id="34" slug="panel-ops-property-tests">
  <title>Property-Tests für Replace- und Extend-Operationen ergänzen</title>
  <track>2 Engine A</track>
  <estimate_pt>0.5</estimate_pt>
  <deps>08, 21, 22, 23</deps>
  <rationale>Die Nachrück- und Erweiterungslogik ist für reale Lose kein Bonus, sondern Betriebsrealität. Die bisherige Absicherung ist laut Autorun knapp (`docs/iteration-1-autorun-2026-04-24.md:30-32,38-46`) und #09 deckt in seinem Pickup nur Basisinvarianten der Engine ab (`.issues/09-engine-a-property-tests/STATUS.md:21-26`), nicht die `forceIn`- und `forceOut`-Semantik aus `panel-ops.ts` (`packages/engine-a/src/panel-ops.ts:27-89`).</rationale>
  <acceptance_criteria>
    <criterion>Es gibt eine `fast-check`-Suite für `replaceSinglePerson()` und `extendBy()` über zufällig generierte, aber feasible Pools und Quoten.</criterion>
    <criterion>Die Tests sichern Panelgröße, Quoten-Erfüllung, `forceIn`-Erhalt und `forceOut`-Ausschluss als Invarianten ab.</criterion>
    <criterion>Für identischen Seed bleiben die Resultate deterministisch.</criterion>
    <criterion>Unmögliche Fälle liefern saubere Fehler statt stiller Inkonsistenzen.</criterion>
    <criterion>Die neuen Tests laufen im normalen `packages/engine-a`-Testlauf mit.</criterion>
  </acceptance_criteria>
</issue>
</proposed_issues>

<not_proposed>
<item>
  <topic>Kein neues Issue für Engine B Bootstrap oder Engine Swap</topic>
  <reason>Die Themen existieren bereits als deferred #12 bis #14 (`.issues/12-engine-b-pyodide-bootstrap/STATUS.md:15-31`). Hier sollte man die bestehenden Issues wieder aufnehmen, nicht Duplikate erzeugen.</reason>
</item>
<item>
  <topic>Kein neues Basis-Issue für allgemeine Engine-A-Property-Tests</topic>
  <reason>Das Thema existiert bereits als deferred #09 (`.issues/09-engine-a-property-tests/STATUS.md:21-26`). Neu fehlt nur die Panel-Ops-Erweiterung, deshalb schlage ich dafür Issue 34 vor.</reason>
</item>
<item>
  <topic>Kein neues Leximin-Port-Issue</topic>
  <reason>Das Thema existiert als #16 und ist laut Findings sowie Status für Pilot nicht der kürzeste Pfad (`docs/iteration-1-findings.md:100-107`, `.issues/16-gurobi-free-leximin-reference/STATUS.md:21-29`).</reason>
</item>
<item>
  <topic>Kein iOS-Safari- oder WebKit-Track</topic>
  <reason>Die Iteration-1-Scope-Grenzen schließen WebKit/iOS explizit aus (`.issues/README.md:7-12`). Für den ersten Pilot bringt das weniger als belastbare Desktop-Chromium/Firefox-Vergleiche und Compliance-Artefakte.</reason>
</item>
<item>
  <topic>Kein separates Performance-Profiling-Issue für Engine A</topic>
  <reason>Phase-Level-Profiling wäre nützlich, aber vor Pilot nachrangig gegenüber Worker-Isolation, Engine-B-Vergleich und statistischer Vergleichsmatrix. Die aktuellen Artefakte messen ohnehin nur `total_ms` und `num_committees` (`packages/engine-a/src/engine.ts:252-270`). Profiling sollte bei Bedarf in Issue 26 oder 28 mitlaufen, nicht als eigener Track starten.</reason>
</item>
<item>
  <topic>Kein neues Pen-Test- oder CVE-Governance-Issue in diesem Schritt</topic>
  <reason>Das bleibt wichtig, ist aber laut ursprünglichem Backlog P2 und nicht der kürzeste Weg zu ersten vertrauenswürdigen Vergleichsdaten plus Pilotfreigabe (`sortition-tool/06-review-consolidation.md:127-134`).</reason>
</item>
</not_proposed>

<priority_order>
<step n="1">Deferred #12 bis #14 wieder aufnehmen, weil ohne Engine B weder Cross-Runtime-Drift noch volle Browser-Maximin-Qualität beantwortbar sind (`.issues/12-engine-b-pyodide-bootstrap/STATUS.md:15-20`).</step>
<step n="2">Issue 27 anlegen und mit den wiederaufgenommenen Engine-B-Issues koppeln, damit A/B/C erstmals auf Personenebene vergleichbar werden.</step>
<step n="3">Issue 26 anlegen, um dieselben Vergleiche über belastbare Poolgrößen und mit genügend Seeds zu verbreitern.</step>
<step n="4">Issue 33 anlegen, weil Audit-Dateien vor Pilot technisch und organisatorisch verifizierbar sein müssen.</step>
<step n="5">Issues 29 und 30 anlegen; DSFA und BITV sind die härtesten kommunalen Freigabeblocker.</step>
<step n="6">Issue 31 anlegen, damit der Pilot an realen Eingangsformaten statt an Labor-CSV vorbeikommt.</step>
<step n="7">Issue 32 anlegen, damit Verwaltung und Öffentlichkeit das Verfahren sprachlich und fachlich korrekt erklärt bekommen.</step>
<step n="8">Issue 28 anlegen, um UI-Blockaden und weiche Cancel-Semantik aus dem Hauptflow zu entfernen.</step>
<step n="9">Issue 34 anlegen, damit Replace und Extend vor realem Nachrückbetrieb robust abgesichert sind.</step>
</priority_order>

<verdict value="fail" critical="4" high="4" medium="0">
Der Issue-Bestand reicht noch nicht für belastbare Vergleichsdaten und nicht für einen zulässigen kommunalen Pilot. Kritisch fehlen ein statistisch tragfähiger Vergleichspfad, Person-Level-Drift über A/B/C, der formale DSFA- und BITV-Workstream sowie eine auditfähige Trust-Kette statt Ephemeral-Demo-Signaturen.
</verdict>
</review>

