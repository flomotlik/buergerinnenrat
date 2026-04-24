# Review-Konsolidierung: Masterplan v1

> Stand: 2026-04-24 | Konsolidiert die drei externen Reviews aus `/root/workspace/.issues/browser-native-sortition-app-feasibility-study/reviews/` | Referenziert `00-masterplan.md` v1 und die Fach-Reports 01–05

## Executive Summary

Drei externe LLM-Reviewer (Claude Opus 4.7, OpenAI Codex gpt-5.4, Google Gemini 3 Pro Preview) haben den Masterplan + die fünf Fach-Reports unabhängig geprüft. Zwei von drei geben Verdikt **FAIL**, der dritte **WARN**. Kein Reviewer hält den Plan für freigabefähig in der aktuellen Form. Die Kernkritik ist in drei unabhängigen Blind Spots konsistent:

1. **Die zentrale Phase-0-Hypothese ist faktisch falsch.** Upstream-Prüfung zeigt: `sortition-algorithms` liefert Leximin nur mit Gurobi, ohne Gurobi wird auf Maximin zurückgeschaltet — der vorgeschlagene Pyodide-Spike kann also gar nicht das leisten, wofür er geplant ist.
2. **Die Lizenz-Einordnung ist zu sicher dargestellt.** Apache-2.0-Zielbild und GPL-Pyodide-MVP sind nicht kompatibel. Mindestens der MVP-Pfad müsste GPL-3.0 sein, bis ein vollständiger Clean-Room-Port steht.
3. **Die Go/No-Go-Laufzeitschwellen haben keine Datengrundlage.** Die einzige harte Referenzmessung (citizensassemblies-replication, `sf_e`) zeigt **nativ mit Gurobi 67 Minuten** für einen Pool ähnlicher Größenordnung — Browser + HiGHS wird das vermutlich nicht unterbieten. Die Ampelwerte im Masterplan wirken gesetzt, nicht hergeleitet.

Darüber hinaus: mehrere rechtliche und operative Pflichten (DSFA, BITV 2.0, CSV-Heterogenität, Maintenance-Ownership) sind im Plan entweder gar nicht oder als "später" adressiert — für einen kommunalen Einsatz sind sie MVP-kritisch.

## Verdikt-Matrix

| Reviewer | Modell | Verdikt | Critical | High | Medium | Review-Datei |
| --- | --- | --- | ---: | ---: | ---: | --- |
| OpenAI Codex | gpt-5.4 | **FAIL** | 2 | 4 | 5 | [review-...gpt-5-4.md](../../browser-native-sortition-app-feasibility-study/reviews/review-2026-04-24T16-47-50Z-browser-native-sortition-app-feasibility-study-gpt-5-4.md) |
| Google Gemini | gemini-3-pro-preview | **FAIL** | 3 | 2 | 1 | [review-...gemini.md](../../browser-native-sortition-app-feasibility-study/reviews/review-2026-04-24T16-47-50Z-browser-native-sortition-app-feasibility-study-gemini.md) |
| Anthropic Claude | opus-4-7 | **WARN** | 0 | 7 | 8 | [review-...claude-opus-4-7.md](../../browser-native-sortition-app-feasibility-study/reviews/review-2026-04-24T16-41-53Z-browser-native-sortition-app-feasibility-study-claude-opus-4-7.md) |

Gemini timeout nach 600 s — das Review wurde trotzdem geschrieben (6 Findings) und ist inhaltlich verwertbar.

## Teil A — Konvergente Kritik (mehrere Reviewer einig)

### A1 — Phase 0 prüft nicht, was der Masterplan behauptet (Codex C1, Claude H3)

**Kern:** `sortitionfoundation/sortition-algorithms` implementiert **Leximin nur mit Gurobi**. In `committee_generation/leximin.py` wird `gurobipy` direkt importiert; ohne Gurobi fällt `core.py` automatisch auf Maximin zurück. Die README verlangt explizit `sortition-algorithms[gurobi]`. Der Masterplan (Zeile 39, 97–103, 136) und Report 02 (Abschnitt 3) behandeln aber die Pyodide-Integration, als wäre damit die volle Nature-Algorithmenfamilie im Browser verfügbar.

**Konsequenz:** Phase 0 kann in der geplanten Form nur **Maximin** validieren, nicht Leximin. Die zentrale Masterplan-Aussage "Pyodide-Weg: 3 Tage – 2 Wochen vs. 2–4 Monate JS-Port" (Abschnitt "Konflikt 2") ist nur für Maximin richtig.

**Quelle:** Codex C1 zitiert `core.py:322-325` und `committee_generation/leximin.py:9-15,54-56` wörtlich. Claude H3 bestätigt aus Report 02 selbst: "Zu verifizieren (nicht aus der Research eindeutig ableitbar): Welche Solver-Klassen akzeptiert die SolverFactory dort?"

### A2 — Apache-2.0 + Pyodide-MVP ist nicht "klar" (Codex C2, Gemini C3, Claude H7)

**Kern:** Pyodide + `sortition-algorithms` (GPL-3.0) in einem ausgelieferten Browser-Bundle ist mit hoher Wahrscheinlichkeit ein "combined work" unter GPL §5/§6. Der Masterplan (Abschnitt "Lizenz") und Report 05 behandeln das als geklärt zugunsten Apache-2.0 — das ist nicht belegt. Codex zitiert UrhG §69c und die FSF-GPL-FAQ; eine Sonderausnahme für JavaScript-Pyodide-Komposition gibt es nicht.

**Besonders kritisch:** Report 03 empfiehlt für einen Clean-Room-TS-Port sogar die Nutzung der **GPL-Fixtures aus dem Referenz-Repo als Regressionstests** (widerspricht der Clean-Room-Forderung im selben Report).

**Konsequenz:**
- Phase 0/1 MVP mit Pyodide kann realistisch nicht unter Apache-2.0 ausgeliefert werden.
- Entweder: Phase 1 offiziell als **GPL-3.0** deklarieren.
- Oder: Pyodide aus dem Produktionspfad streichen und Apache-2.0 erst ab vollständigem Clean-Room-Port.

### A3 — Go/No-Go-Ampeln ohne Datengrundlage (Codex H1, Claude H6)

**Kern:** Der Masterplan setzt grün bei <60 s für 500er-Leximin-Pool und <3 min für 1000er-Pool. Codex hat im `pgoelz/citizensassemblies-replication`-Repo die einzigen harten Referenzdaten geprüft:

- Instanz `sf_d`: nativ Gurobi, mediane Leximin-Laufzeit 46,2 s
- Instanz `sf_e` (Pool 1727, Panel 110, 7 Quotenkategorien): **4011,6 s ≈ 67 Minuten**, nativ mit Gurobi

Die 2×-WASM-Overhead-Schätzung aus Report 01 basiert auf generischen WASM-Studien, nicht auf `highs-js`-spezifischen Benchmarks. Wenn schon die native Gurobi-Referenz im Stundenbereich landet, sind Browser-Ampeln <3 min nicht seriös, ohne Instanzklasse, Solver und Algorithmus separat auszuweisen.

### A4 — Phase 0 in 2 Wochen unrealistisch (Codex M1, Claude H2)

**Kern:** Report 03 schätzt den Pyodide-Ansatz selbst auf **15–17 PT (3 Wochen)** nur für Setup + Solver-Injection + Tests. Report 02 nennt zwar 2–3 Tage, aber explizit nur für einen Toy-Test mit 100 Personen. Der Masterplan mischt diese Minimalvalidierung mit einem belastbaren Benchmark-Paket (500/1000/2000 Personen × mehrere Browser + Safari/iOS + Bundle-Messung + Determinismus).

Zusätzlich: Report 02 markiert iOS-Safari mit Pyodide 0.27.1+ als strukturell nicht funktionierend (Pyodide Issue #5428) — das wäre vorhersehbar rote Ampel in der Go/No-Go-Matrix.

**Realistisch:** 4–6 Wochen Vollzeit, oder 2–3 Kalendermonate bei Teilzeit-Consultant-Einsatz.

### A5 — Rechtliche MVP-Pflichten nicht adressiert (Codex M2+M3, Gemini H1+H2, Claude teilweise)

- **DSFA nach DSGVO Art. 35** (Codex M2, Gemini H2): "Kein Backend" eliminiert die Pflicht nicht — die Kommune bleibt Verantwortliche, Melderegister-Verarbeitung für algorithmische Auswahl erfüllt den Hochrisiko-Tatbestand. DSFA-Template muss Pflicht-Deliverable von Phase 1 sein.
- **BITV 2.0 / BGG §12a** (Codex M3, Gemini H1): Für öffentliche Stellen Pflicht ab Tag 1 bei Planung, Entwicklung und Beschaffung. Report 04 listet Accessibility unter "Niedrige Priorität / Später" — das würde einen kommunalen Beschaffungs-Check direkt blockieren.

### A6 — Report 04 nicht "veraltet", sondern in Kernpunkten widersprüchlich (Codex H3, Claude H1)

Der Masterplan (Abschnitt "Konflikt 1") tut Report 04 als "älteren Wissensstand" ab und will "Architektur übernehmen bis auf Solver". Beide Reviewer widersprechen:

- Report 04 empfiehlt `glpk.js` mit der Behauptung "MIT-kompatibel" — das ist falsch (GLPK ist GPL-3.0). Dieselbe Fehleinschätzung ist auch in Report 03.
- Report 04 fordert `connect-src 'none'` als CSP und empfiehlt wenige Seiten später eine `fetch('/tenant.json')`-Runtime-Konfiguration — `connect-src` steuert genau `fetch`, beide Aussagen sind nicht gleichzeitig wahr.
- Report 04 beziffert das Pyodide-Bundle mit "~10 MB", Report 02 mit 30–40 MB (realistisch).

Das sind drei unabhängige Sachfehler in Lizenz-, Sicherheits- und Bundle-Fragen. **Report 04 ist als tragfähige Architekturgrundlage zurückzuweisen**, nicht selektiv zu patchen.

## Teil B — Eigenständige Findings pro Reviewer

Nur die kritischen/hohen Findings, die nicht schon unter Teil A konvergent sind.

### Codex (gpt-5.4)

- **C2 (bereits in A2) + H2 (Patent):** Patentbewertung zu selbstsicher. Apache §3 schützt nur Contributor-Patente, nicht mögliche Drittrechte aus der Procaccia/Flanigan-Linie. Freedom-to-Operate-Prüfung nicht dokumentiert.
- **H4 (Pyodide-Versionen):** Report 02 mischt "Pyodide 0.29.3"-Zielstand mit Daten aus dem bewegten `pyodide-recipes`-Main-Branch. Report nennt `cvxpy-base 1.8.2`, `highspy 1.13.1`, `clarabel 0.11.1`; offizielle 0.29.3-Liste hat `cvxpy-base 1.6.3`, `highspy 1.11.0`, `clarabel 0.11.0`. Die Grundrichtung bleibt positiv, aber die Matrix ist auf einer instabilen Grundlage gebaut.
- **M4 (CSV-Heterogenität):** Deutsche Melderegister- und Rücklaufdaten variieren massiv (Trennzeichen, Encoding, Schreibweisen, Dubletten-Regeln). Papaparse + ein Mapping-Screen löst Parsing, nicht Domänenharmonisierung. Der Erst-Pilot droht an Datenbereinigung zu scheitern, nicht am Solver.
- **M5 (Erklärbarkeit, Mehrsprachigkeit, Wartung):** Drei operative Lücken: Laien-Erklärung von Leximin/Maximin für Rechtsamt + Rat + Öffentlichkeit; i18n über DE/EN hinaus für migrantisch geprägte Verfahren; verbindlicher Maintenance-Owner für Pyodide-/WASM-/CVE-Updates.

### Gemini (gemini-3-pro-preview)

- **C1 (CVXPY-Performance in Column Generation):** CVXPY ist nicht für dynamische Column-Addition gebaut — Modell-Rebuild pro Iteration, katastrophale Laufzeit. Empfehlung: direkt `highspy` ohne CVXPY-Layer verwenden. (Hinweis: Codex C1 relativiert das — wenn Leximin eh Gurobi-gegated ist, trifft das Problem im Pyodide-Pfad nur Maximin, was weniger Iterationen braucht.)
- **C2 (CSP blockt Pyodide-Init):** `connect-src 'none'` blockt `fetch()`, auch zum eigenen Origin. Pyodide lädt `pyodide.asm.wasm` + Wheels per fetch — crasht sofort. Korrektur auf `connect-src 'self'` mit strenger `default-src`-Whitelist.
- **M1 (iOS-Safari):** WASM-Memory-Limit ~500 MB praktisch auf iPad/iPhone, Pyodide + SciPy + HiGHS + MIP wird vermutlich OOM. Aus Go/No-Go streichen, nicht in 2 Wochen lösbar.

### Claude (opus-4-7) — zusätzliche Findings

- **H4 (Non-Tech-Blocker in Matrix fehlen):** Die Go/No-Go-Matrix hat nur technische Signale. Rechtsgutachten-Ergebnis, DSFA-Template-Akzeptanz, BITV-Audit-Vorergebnis, Pen-Test-Resultat — eine grüne technische Ampel kann von einem roten rechtlichen Signal überstimmt werden, das in der Matrix nicht vorkommt.
- **H5 (Clean-Room für Single-Consultant):** Saubere Clean-Room-Reimplementation verlangt nach deutscher Doktrin eine Zwei-Personen-Trennung (einer spezifiziert aus Paper, ein anderer implementiert ohne Kontakt zum GPL-Code). Für einen einzelnen Consultant praktisch schwer herzustellen — GPL-Kontamination ist reales Risiko.
- Plus 8 Medium-Findings zu Scope-Detailfragen (dokumentiert im Review).

## Teil C — Änderungs-Backlog für Masterplan v2

Sortiert nach Priorität. IDs beziehen sich auf die Herkunftsreviews.

### P0 — Muss vor v2-Freigabe geklärt sein

| # | Änderung | Herkunft |
| --- | --- | --- |
| P0-1 | Phase-0-Roadmap umschreiben: **Maximin-PoC** als Ziel, nicht Leximin. Leximin-Pfad als separater Track mit eigener Aufwandsschätzung (eigener HiGHS-Leximin-Umbau oder Gurobi-Integration). | A1 / Codex C1 |
| P0-2 | Lizenz-Entscheidung fixieren: Phase 1 Pyodide-MVP **GPL-3.0** deklarieren. Apache-2.0-Zielbild explizit an vollständigen Clean-Room-Port binden. Aussage "Lizenz-Weg ist klar" im Masterplan streichen. | A2 / Codex C2 / Gemini C3 |
| P0-3 | Go/No-Go-Matrix neu aufbauen: aufgespalten nach Algorithmus × Solver × Instanzklasse. Mindestens 3 öffentliche Referenzinstanzen (z.B. `sf_d`, `sf_e`, mittleres Bundestag-Pool) + 2 synthetische kommunale CSVs als Benchmark-Grundlage. iOS-Safari aus grüner Ampel entfernen. | A3, A4 / Codex H1 / Claude H6 |
| P0-4 | Phase 0 auf 4–6 Wochen verlängern. In 0a (Toy-Feasibility, Desktop-Chromium, 2–3 Tage) + 0b (Entscheidungs-Benchmark mit Browser-Matrix, 2–3 Wochen) aufteilen. | A4 / Codex M1 / Claude H2 |
| P0-5 | CSP `connect-src 'none'` auf `connect-src 'self'` korrigieren. Separates Data-Exfiltration-Audit (Playwright-Netzwerk-Assert, PenTest) als eigene Architekturklausel. | Gemini C2 / Codex H3 |
| P0-6 | Report 04 als obsolet markieren. Neues Architekturpapier aus finalen Stack-Entscheidungen + korrigierten Lizenzen ableiten. | A6 / Codex H3 / Claude H1 |

### P1 — Vor Phase-1-MVP verpflichtend

| # | Änderung | Herkunft |
| --- | --- | --- |
| P1-1 | Compliance-Workstream einziehen: DSFA-Template-Deliverable, BITV 2.0-Konformität als MVP-Pflicht, Erklärung zur Barrierefreiheit nach BGG §12a. | A5 / Gemini H1+H2 / Codex M2+M3 |
| P1-2 | CSV-Adapter-Track: Sammlung von 5–10 echten/realistischen kommunalen Exportformaten (EWO, MESO, VOIS, Melde+, VISS etc.), Normalisierungsmodell, Import-Fehlerberichte. | Codex M4 |
| P1-3 | Pluggable-Solver-Annahme in `sortition-algorithms` **vor** Phase-0-Start per Code-Inspektion verifizieren oder verwerfen. | Claude H3 |
| P1-4 | Laien-Erklärung von Leximin/Maximin als Pflicht-Artefakt (Methodenblatt in Leichter Sprache + Verwaltungssprache). | Codex M5 |
| P1-5 | i18n-Roadmap beschließen: DE + EN als MVP, architektonisch für TR, AR, RU, UK offen halten. Keine hart kodierten Strings. | Codex M5 |
| P1-6 | Patentthema als eigener Rechts-Track: FTO-/Prior-Art-Prüfung für die Procaccia/Flanigan-Linie. Apache §3-Klarstellung im Plan (schützt nur Contributor-Patente). | Codex H2 |

### P2 — Vor Produktiveinsatz

| # | Änderung | Herkunft |
| --- | --- | --- |
| P2-1 | Wartungs-/Security-Modell dokumentieren: Pyodide-/WASM-/Dependency-CVE-Updatefenster, benannter Owner, End-of-Life-Regel. | Codex M5 / Claude |
| P2-2 | Pyodide-Versionierung fixieren. Eine Zielversion (z.B. 0.29.3) einfrieren, nur deren offizielle Paketliste verwenden, Dev-Stände als Risiko kennzeichnen. | Codex H4 |
| P2-3 | Clean-Room-Pfad prozessual absichern: Zwei-Personen-Trennung (Paper-Leser + Implementierer), dokumentierter Ablauf, anwaltliche Stellungnahme zu §69c UrhG. | Claude H5 |
| P2-4 | Haftungs-/Disclaimer-Modell: "no warranty"-Klausel im UI, Audit-Signatur, dokumentierte Test-Coverage, Fehler-Reporting-Kanal. | Report 05 (unkritisch von allen Reviewern bestätigt) |

## Teil D — Meta-Erkenntnisse über die Qualität der Reports

Die Reviews machen auch sichtbar, welche der Fach-Reports belastbar sind und welche nachgearbeitet werden müssen:

| Report | Einschätzung nach Review |
| --- | --- |
| **01 WASM-Solver** | Weitgehend tragfähig. Solver-Kernaussage (HiGHS via `highs-js`) bestätigt. Kritik nur an Performance-Extrapolation ohne belastbare Benchmarks. |
| **02 Pyodide** | Grundrichtung korrekt, aber **zwei Sachfehler**: (a) pluggable-solver-Annahme für `sortition-algorithms` ist nicht belegt — Leximin braucht Gurobi; (b) Pyodide-Versions-/Paket-Matrix gemischt aus Release und Main-Branch. Nachzubessern. |
| **03 Algorithmus-Port** | Aufwandsschätzungen plausibel. Zwei Schwächen: (a) GPL-Test-Fixtures als Regressionstests für Clean-Room empfohlen — widersprüchlich; (b) `glpk.js`-Lizenz falsch als GPL-2.0 angegeben. |
| **04 Frontend-Architektur** | **Als tragfähige Grundlage verworfen.** Drei unabhängige Sachfehler (Solver-Lizenz, CSP vs. tenant.json, Pyodide-Bundle-Größe). Neu schreiben. |
| **05 Produkt + Lizenz** | Marktanalyse solide. Lizenzkapitel zu kurz — deutsche UrhG-Sicht fehlt, Patent-Thema zu optimistisch behandelt. |
| **00 Masterplan** | Integration der fünf Reports gelingt strukturell, aber die beiden "aufgelösten Konflikte" sind nicht wirklich aufgelöst — Konflikt 1 (Solver) patcht nur punktuell, Konflikt 2 (Pyodide vs. TS-Port) übernimmt die falsche pluggable-solver-Annahme. |

## Teil E — Nächste konkrete Schritte

1. **Upstream-Verifikation `sortition-algorithms` (1 Tag).** Code-Inspektion von `core.py`, `committee_generation/`, SolverFactory. Liefert Grundlage für P0-1 und P1-3. Kein Code schreiben, nur lesen.
2. **Deutsches IT-Rechtsgutachten anfragen.** Spezifische Fragen: §69c UrhG bei Pyodide-Kombination, GPL-Kombinationsrisiko für Browser-Distributions, Patent-FTO für Procaccia/Flanigan-Algorithmen. Kostenindikation einholen. Liefert Grundlage für P0-2, P1-6, P2-3.
3. **Masterplan v2 auf Basis dieses Backlogs schreiben.** Alternativ: v1 im Ordner belassen, v2 als separates Dokument `00-masterplan-v2.md`. Empfohlen: v2-Separation, damit die Review-Historie nachvollziehbar bleibt.
4. **Native Referenz-Benchmark aufsetzen.** `pgoelz/citizensassemblies-replication` lokal laufen lassen, `sf_d` und `sf_e` mit HiGHS (statt Gurobi) messen — liefert realistische Grundlage für die neue Go/No-Go-Matrix (P0-3), bevor überhaupt Browser-Benchmarks sinnvoll sind.
5. **Marktvalidierung parallel.** Wie in Masterplan v1 schon vorgesehen — ohne konkrete Pilot-Kommune keine Build-Entscheidung. Die Reviews machen den Bedarf dringlicher: ein großer Teil der P1-Punkte (Compliance-Workstream, CSV-Heterogenität, Laien-Erklärung) wird nur am konkreten Kunden validierbar.

## Anhang: Review-Artefakte

- `/root/workspace/.issues/browser-native-sortition-app-feasibility-study/reviews/review-...-claude-opus-4-7.md` (Claude, 4322 Wörter)
- `/root/workspace/.issues/browser-native-sortition-app-feasibility-study/reviews/review-...-gpt-5-4.md` (Codex, 1980 Wörter)
- `/root/workspace/.issues/browser-native-sortition-app-feasibility-study/reviews/review-...-gemini.md` (Gemini, 747 Wörter)
- Prompt: `/tmp/review-prompt-browser-native-sortition-app-feasibility-study.md` (vergänglich; bei Bedarf regenerieren)
