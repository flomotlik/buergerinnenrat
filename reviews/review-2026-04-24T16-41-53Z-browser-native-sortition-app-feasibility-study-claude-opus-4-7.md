---
review_of: browser-native-sortition-app-feasibility-study
review_type: topic
review_mode: topic
review_topic: Browser-native Sortition-App feasibility study for Bürgerräte
reviewed_at: 2026-04-24T16-41-53Z
tool: claude
model: claude-opus-4-7
duration_seconds: 463
---

# Review der Machbarkeitsstudie „Browser-native Sortition-App"

Datum: 2026-04-24
Scope: Masterplan + 5 Fachreports im Ordner `/root/workspace/.issues/research/buergerrat/sortition-tool/`

<review>

<findings>

<finding severity="high" id="H1">
  <title>Konflikt-Auflösung zwischen Report 01 und Report 04 delegitimiert alle Report-04-Empfehlungen</title>
  <location>00-masterplan.md:21–27 (Konflikt 1); 04-frontend-architecture.md:11, 173–179</location>
  <description>
    Report 04 empfiehlt in Section 2.9 explizit „**LP-Solver: `glpk.js`** (MIT-kompatibel, ~500 kB WASM, bewaehrt)". Das ist ein **harter Sachfehler**: `glpk.js` bindet GLPK ein, das unter GPL-3.0 steht (siehe Report 01, Zeile 12, 28, 138, 208 sowie [npm: glpk.js](https://www.npmjs.com/package/glpk.js)), und ist daher *nicht* MIT-kompatibel. Der Masterplan tut dies als „älterer Wissensstand" ab und schlägt vor, „die Architektur-Vorschläge aus Report 04 übernehmen wir bis auf den Solver-Baustein".
    
    Das ist kein lokaler Solver-Fehler — es ist ein grundlegender Lizenz-Recherchefehler im Report, der die gesamte Produkt-Lizenz-Strategie (Apache-2.0) tangiert. Wer bei einer GPL-vs-MIT-Verwechslung falsch liegt, hat auch in anderen Entscheidungen (Kobalte-Lizenz, Tailwind-Lizenzierung, `pdf-lib`-Lizenz, `vite-plugin-pwa`-Lizenz, `audit-ci`-Abhängigkeitskette, `pnpm`-Lockfile-Sicherheit, Ed25519-Library-Auswahl, Screen-Workflow-Lösung) möglicherweise falsche Annahmen. Die Masterplan-Lösung „wir übernehmen den Rest" ist inkonsistent: entweder der Autor von Report 04 hat ein System-Verständnis-Problem (dann muss alles überprüft werden), oder das „ältere Wissensstand"-Argument stimmt (dann ist nicht klar, wo die Grenze ist).
    
    Zusätzlich enthält Report 03, Zeile 104 und Zeile 356, eine zweite falsche Lizenz-Angabe (`glpk.js` als „GPL-2.0"), die ebenfalls nicht korrigiert ist. Es liegen also zwei unabhängige Lizenz-Fehler in zwei Reports vor — das deutet nicht auf „älteren Wissensstand", sondern auf fehlende Querprüfung hin.
  </description>
  <fix>
    Reports 03 und 04 nach Korrektur des Solver-Punktes erneut kritisch prüfen. Konkret: (a) Alle Lizenz-Angaben zu Abhängigkeiten in Report 04 §2 und Anhang einzeln gegen [spdx.org/licenses](https://spdx.org/licenses) verifizieren. (b) Den Empfehlungs-Status von Report 04 von „Architektur übernehmen" auf „nur als Inspirationsquelle, jede Empfehlung einzeln prüfen" zurückstufen. (c) Im Masterplan offenlegen, welche Report-04-Entscheidungen unabhängig validiert wurden (Vite, SolidJS, Pyodide-Entscheidung) versus welche allein auf Report 04 basieren (Kobalte, Papaparse, `@noble/ed25519`, pdf-lib).
  </fix>
</finding>

<finding severity="high" id="H2">
  <title>Phase-0-Scope (2 Wochen) ist nicht mit den eigenen Aufwandsschätzungen der Reports kompatibel</title>
  <location>00-masterplan.md:95–103; 02-pyodide-feasibility.md:13, 259–267; 03-algorithm-port.md:207–216</location>
  <description>
    Der Masterplan definiert Phase 0 als 2 Wochen mit folgenden Deliverables: Pyodide + `sortition-algorithms` in Worker aufsetzen; Solver-Ersatz `mip → cvxpy/highspy` falls nötig; Benchmark auf 500 + 1000 + 2000-Personen-Pools; auf Safari/iOS testen; Bundle-Größe messen; Determinismus bei festem Seed verifizieren; Ladezeit, Laufzeit, Speicherverbrauch dokumentieren.
    
    Eigene Aufwandsschätzungen der Reports:
    - Report 03 (Pyodide-Ansatz-Tabelle, Zeile 207–216): **15–17 PT ≈ 3 Wochen** für Pyodide-Setup + Bootstrapping + Solver-Injection + Input/Output + Performance-Tuning + Regressionstests. Das ist *ohne* drei Browser × drei Pool-Größen.
    - Report 02 (Zeile 13): „2–5 Tage" *nur für den mip-→cvxpy-Patch*, ohne das Setup drumherum.
    - Report 02 (Zeile 259–267, „konkrete naechste Schritte Phase 0"): nennt selbst „2–3 Tage" — aber nur für einen Spielzeug-Durchlauf mit 100 Personen und 5 Features, nicht für die Masterplan-Matrix mit 500/1000/2000 Personen × mehrere Browser.
    
    Zusätzlich sagt Report 02 (Zeile 36, 214), dass iOS-Safari mit Pyodide 0.27.1+ strukturell **nicht funktioniert** (Issue #5428). Im Masterplan ist „iOS-Safari funktioniert" aber ein **grünes Ampelsignal** in der Go/No-Go-Matrix — das ist ein vorhersagbar rotes Ergebnis, das die 2-Wochen-Phase-0 verschwenden würde, um etwas zu bestätigen, was schon feststeht.
    
    Realistisch sind 4–6 Wochen für den im Masterplan beschriebenen Umfang, wenn gleichzeitig iOS-Safari-Verifikation ernsthaft gemacht wird. Ein Teilzeit-Consultant (Report 05, Zeile 401: „max. 2 Tage/Woche für Neben-Projekte") braucht dafür 2–3 Kalendermonate — nicht 2 Wochen.
  </description>
  <fix>
    (1) Phase 0 auf 4–6 Wochen verlängern und konkrete Wochenscheiben zuordnen (Week 1: Pyodide+sortition-algorithms Bootstrap; Week 2: Synthetic-Data-Benchmark 500-Pool; Week 3: Skalierung 1000/2000; Week 4: Browser-Matrix; Week 5: Puffer + Dokumentation). (2) iOS-Safari als Go/No-Go-Signal streichen — für Pyodide-Variante explizit als „Desktop-only, iOS Safari out-of-scope" festschreiben, nicht als Testparameter. iOS-Safari bleibt nur relevant, falls Phase 2 (TS-Port) kommt. (3) „Pluggable Solver in `sortition-algorithms`" aus der Go/No-Go-Matrix (Masterplan, Zeile 136) ebenfalls vor Beginn von Phase 0 durch kurze Code-Inspektion verifizieren — sonst verliert der Phase-0-Ansatz in Woche 1 seine Grundlage.
  </fix>
</finding>

<finding severity="high" id="H3">
  <title>Pluggable-Solver-Annahme für `sortition-algorithms` ist load-bearing, aber unverifiziert</title>
  <location>00-masterplan.md:39 (Phase-0-Tabelle); 00-masterplan.md:136 (Go/No-Go-Zeile); 02-pyodide-feasibility.md:95–112 (Option 3c)</location>
  <description>
    Der Masterplan setzt in Phase 0 direkt auf `sortitionfoundation/sortition-algorithms` mit austauschbarem Solver. Report 02 formuliert das aber selbst als Vermutung: „**Zu verifizieren** (nicht aus der Research eindeutig ableitbar): Welche Solver-Klassen akzeptiert die `SolverFactory` dort? Implementiert sie bereits einen CvxpyHighsSolver?" (Zeile 109–111). Der Hinweis im `pyproject.toml` („Note: mip is NOT included here - it causes tests to hang intermittently") ist ein schwacher Beleg für pluggable-solver — er kann genauso gut bedeuten, dass einfach keine Tests gegen `mip` laufen, weil hängt, nicht, dass andere Solver als Default existieren.
    
    Wenn Phase 0 beginnt und die Library stellt sich als mip-hart-verdrahtet heraus, steht das gesamte Pyodide-Argument auf Sand: dann sind wir zurück bei einem Fork mit Patch (Report 02 §3a, 1–2 Tage + Testschuld) — aber das war nie Teil von Phase 0. Der Masterplan schuldet hier einen **Vorab-Check**, bevor 2–6 Wochen gebucht werden. Das ist eine 1-stündige Code-Inspektion des Files `sortition_algorithms/solvers/` im Upstream-Repo, die direkt Go/No-Go-Klarheit liefert.
  </description>
  <fix>
    (1) Vor Phase 0 kurzer Trockenlauf (≤ 1 Tag): Upstream-Repo inspizieren, existierende `SolverFactory`-Klassen dokumentieren, und entweder „pluggable bestätigt" oder „erfordert Fork, +X PT" im Masterplan festschreiben. (2) Wenn nicht pluggable: entweder Fork-Patch als separates Phase-0a-Deliverable einplanen (zusätzliche 3–5 PT) oder auf direkten Fork von `stratification-app` mit Patch ausweichen. (3) Die Go/No-Go-Zeile „Pluggable Solver in `sortition-algorithms` | ja/teilweise/nein" ist zu spät — sie steht *nach* Phase 0, obwohl sie *vor* Phase 0 bekannt sein muss. Diese Zeile aus der Matrix entfernen und durch ein Pre-Phase-0-Entry-Kriterium ersetzen.
  </fix>
</finding>

<finding severity="high" id="H4">
  <title>Go/No-Go-Matrix ignoriert alle nicht-technischen Showstopper (DSFA, Accessibility, Rechtsgutachten)</title>
  <location>00-masterplan.md:128–141 (Go/No-Go-Matrix)</location>
  <description>
    Die Matrix listet 8 Kriterien: Bundle-Größe, Laufzeit 500-Pool, Laufzeit 1000-Pool, iOS-Safari, Pluggable Solver, Erst-Pilot, Prototype-Fund, Consulting-Kanal. **Keine rechtlichen oder regulatorischen Signale.**
    
    Fehlende Signale, die die Go-Entscheidung blockieren sollten:
    
    1. **DSFA-Pflicht nach DSGVO Art. 35**: Die Verarbeitung von Melderegister-Daten mit Kategorien wie Alter, Geschlecht, Migrationshintergrund, Bildung (siehe Screen 2 in Report 04, Zeilen 253–260) in einem automatisierten Selektions-Verfahren ist ein klarer Art. 35-Fall (Profilbildung, besondere Kategorien möglich). „Kein Backend" eliminiert das **nicht** — die Verarbeitung findet trotzdem statt, nur auf dem Gemeinde-PC statt in der Cloud. Die Kommune bleibt Verantwortliche und muss die DSFA durchführen. Der Masterplan behauptet an mehreren Stellen implizit, das Tool sei „DSGVO-trivial" (siehe 05, Zeile 252: „Radikale DSGVO-Vereinfachung"), was zu einem falschen Verkaufsargument führt und die Kommune in Rechtsbruch führen kann, wenn sie dem glaubt.
    
    2. **BITV 2.0 / BFSG**: Für Anwendungen öffentlicher Stellen gilt BITV 2.0 (de facto WCAG 2.1 AA). Für B2C-Software gilt seit 28.06.2025 zusätzlich das BFSG (Barrierefreiheitsstärkungsgesetz). Eine Sortition-App, die von kommunalen Verwaltungsmitarbeiter:innen genutzt wird, fällt mindestens unter BITV 2.0. Das ist in Report 04 auf „Niedrige Priorität" (Zeile 819) geparkt — aber BITV-Nichtkonformität blockiert die kommunale Beschaffung durch Rechtsämter. Muss Ampelsignal sein.
    
    3. **Rechtsgutachten vor Phase 1**: Report 05 (Zeile 439–441) sieht einen IT-Anwalts-Termin in Woche 1 vor (0,5 Tage + ~500–1000 EUR). Das ist ein konkretes Deliverable, das aber nicht in der Go/No-Go-Matrix auftaucht. Ohne positives Gutachten zu Clean-Room + Apache-2.0 + GPL-Runtime-Kombination via Pyodide ist keine Investition in Phase 1 vertretbar.
    
    4. **Penetration-Test der „connect-src 'none'"-Zusage**: Das ist das zentrale DSGVO-Verkaufsargument. Wenn ein Pen-Test zeigt, dass Tracking-Pixel, Performance-Observer-Metriken oder Cloudflare-Analytics doch Daten leaken, ist das gesamte Produkt-Narrativ beschädigt. Muss als Pre-Pilot-Gate eingebaut werden.
    
    5. **Patent-Freedom-to-Operate-Check**: Flanigan/Procaccia/Gölz haben mögliche Patent-Ansprüche auf Fair-Selection-Algorithmen. Keine Suche in USPTO/EPO/DPMA durchgeführt (Reports 01–05). Bei einem Patent, das in der EU erteilt ist, kann der Apache-2.0-Patent-Grant *der Originalautoren* nicht gelten, wenn die Implementation Clean-Room ist. Das ist explizit in Report 03 §5 zu adressieren, wird aber nicht diskutiert.
  </description>
  <fix>
    Matrix-Erweiterung um fünf Zeilen: „DSFA Template für Kommune erstellt & mit Erst-Pilot-DSB abgestimmt", „BITV 2.0 AA-Audit durchgeführt (intern oder Kobalte-compliance dokumentiert)", „IT-Recht-Gutachten positiv (Clean-Room, Pyodide-GPL-Runtime, Haftung)", „Pen-Test der Netzwerk-Isolation durchgeführt, 0 Requests verifiziert", „Patent-FTO-Check in DE/EP durchgeführt". Alle vor Phase-1-Start. Zusätzlich: in Report 05 und im Masterplan-Positioning den „DSGVO-trivial"-Claim abschwächen zu „DSGVO-vereinfacht im Vergleich zu Cloud-Lösungen — DSFA-Pflicht bleibt, Tool stellt Vorlage".
  </fix>
</finding>

<finding severity="high" id="H5">
  <title>Clean-Room-Reimplementierung in DE-Rechtslage nicht sauber analysiert</title>
  <location>03-algorithm-port.md:230–253; 05-product-and-licensing.md:104–134</location>
  <description>
    Die Clean-Room-Analyse stützt sich primär auf FSF-Position + „US/DE-Rechtsprechung zu Übersetzungen analog § 3 UrhG" (Report 03, Zeile 240). Das ist für Software **die falsche Norm**: Software-Schutz regelt § 69a ff. UrhG (Umsetzung der EU-Software-Richtlinie 2009/24/EG). Insbesondere:
    
    1. **§ 69c Nr. 2 UrhG** ordnet ausdrücklich die Übersetzung (auch in andere Programmiersprachen) dem Urheber zu („Übersetzung, Bearbeitung, das Arrangement und andere Umarbeitungen eines Computerprogramms sowie die Vervielfältigung der erzielten Ergebnisse"). Eine Port ist also explizit abhängiges Werk.
    
    2. **§ 69e UrhG (Dekompilierung)** erlaubt Reverse Engineering nur für Interoperabilitäts-Herstellung — nicht für das Erstellen einer Alternativ-Implementation. Ein reiner Clean-Room-Prozess umgeht das, weil er nicht auf Decompilation basiert, aber die Zeugenschaft der Quelltrennung wird in DE strenger gehandhabt als in US.
    
    3. **BGH-Rechtsprechung** (BGH I ZR 25/94 „Holzhandelsprogramm" 1995; BGH I ZR 29/96 „Spielbankaffaire" 1999 Revision): Clean-Room kann wirken, aber *nur* mit lückenloser Dokumentation der Wissens-Trennwand. Bei einem **Ein-Personen-Projekt** ist das nicht möglich — der Entwickler liest zwangsläufig auch das Paper, das den Code inspirierte, und die Referenzimplementation, über die er stolpert. Die Reports geben selbst zu: Report 03 Zeile 247 („organisatorisch schwer die Mauer zwischen A und B strikt durchzuhalten"), Report 05 Zeile 122 („Clean-Room ist **teurer** … und riskanter").
    
    4. **§ 69b UrhG (Arbeitgeber-Rechte)**: Falls der Consultant während des Prototype-Fund-Projekts mit einem OSS-Mitstreiter zusammenarbeitet, müssen beide expliziten Zessionen/Lizenzen abschließen. Das wird nirgends behandelt.
    
    5. **Die Test-Fixtures aus `stratification-app` als Regression-Test zu nutzen** (Report 03, Zeile 271) ist rechtlich zweideutig: Wenn die Fixtures unter dem GPL-Repo liegen, sind sie technisch GPL-lizenziert — Daten-vs-Code-Trennung ist in DE-Recht nicht so klar wie oft angenommen. Wer sich auf „sind Daten, kein Code" verlässt, braucht Anwalts-Bestätigung im Einzelfall.
    
    Konsequenz: Die „legal und empfohlen"-Aussage in Report 03 Zeile 15 und die „rechtlich nicht an die GPL-3.0 gebunden"-Aussage in Report 05 Zeile 108 sind für eine Single-Consultant-Umsetzung **überoptimistisch**. Die Wahrscheinlichkeit, dass eine Single-Person-Implementation später als abgeleitet qualifiziert wird, ist nicht trivial — und der Consultant/Die Kommune haftet.
  </description>
  <fix>
    (1) Explizite Aufnahme von § 69c UrhG und BGH „Holzhandelsprogramm" als Prüfrahmen in Report 03 und 05. (2) Das 0,5-Tages-Anwaltsgutachten (Report 05, Zeile 439) muss zwingend vor jeder Code-Zeile stattfinden, nicht parallel. (3) Als pragmatische Default-Option den **GPL-3.0-Pfad** ernsthaft planen statt Clean-Room: Report 05 §2.3 beschreibt das bereits korrekt, aber der Masterplan wählt trotzdem Apache-2.0 ohne dokumentierte Zwei-Personen-Clean-Room-Orga. Empfehlung: Masterplan auf GPL-3.0 umstellen, solange nicht nachgewiesen zwei Personen + strikte Wissens-Trennung durchgehalten werden. (4) Test-Fixtures eigenständig synthetisch generieren (z.B. mit bekannten Population-Verteilungen aus Destatis), nicht aus dem GPL-Repo übernehmen.
  </fix>
</finding>

<finding severity="high" id="H6">
  <title>Performance-Grenzwerte der Go/No-Go-Matrix widersprechen eigenen Projektionen der Reports</title>
  <location>00-masterplan.md:128–141; 01-wasm-solver-landscape.md:110–131; 02-pyodide-feasibility.md:125–135</location>
  <description>
    Die Matrix im Masterplan sagt: „Laufzeit 500er-Pool Leximin < 60 s grün, 60 s – 3 min gelb, > 3 min rot". Das steht im Widerspruch zu den eigenen Analysen:
    
    - **Report 01, Zeile 112–120**: 200/20-Pool Leximin nativ ca. 6,4 s mit Gurobi; mit WASM-Overhead 2×. Skalierung auf 500 erhöht die MIP-Lösungszeit mindestens *superlinear* (O(N log N) bis O(N²), Report 03 Zeile 59). 500/50-Pool Leximin: 40–200 s nativ mit HiGHS, 80–500 s im WASM. **Die Masterplan-„< 60 s grün"-Grenze wird also nur im Best Case erreicht.**
    
    - **Report 02, Zeile 131–133**: „Für 5000 Rückmelder × 100 Constraints rechne mit 5–30 Sekunden pro ILP-Aufruf" in WASM. Leximin iteriert typisch 20–50 Mal (Report 02 Zeile 132). Das ergibt **2 Minuten bis 25 Minuten** für einen 5000er-Pool — aber Report 02 skaliert das nicht explizit auf 500. Extrapoliert auf 500-Pool: ca. 1 ILP-Call 2–8 s × 20–50 Iterationen ≈ **40 s bis 7 min**, mit Median bei 2–3 Minuten → **gelb, nicht grün**.
    
    - **Report 01, Zeile 127**: Explizite Benchmark-Empfehlung: „Red Flag bei > 5×-WASM-Overhead oder > 3 min auf 500er-Pool". Das ist *exakt die Grenze*, die der Masterplan als grün markiert. Der Masterplan zieht die grüne Grenze 3× zu optimistisch.
    
    Die Grenzwerte sind also nicht datengetrieben gewählt, sondern so gesetzt, dass Phase 0 mit hoher Wahrscheinlichkeit grün passiert. Das ist Cherry-Picking und untergräbt den Phase-0-Spike als echtes Go/No-Go-Instrument.
    
    Dasselbe Problem in Zeile 134: „Laufzeit 1000er-Pool Leximin < 3 min grün". Bei superlinearer MIP-Skalierung auf 2× Pool-Größe kann die Laufzeit leicht 4–10× steigen (Report 03 Zeile 59 O(N²)), also realistisch 3–20 Minuten → die Grenze „< 3 min grün" ist für 1000er-Pool extrem optimistisch.
    
    Weiterhin fehlt ein **Speicher-Schwellwert**. Report 01, Zeile 19 und Zeile 154 nennt OOM-Risiko bei 350×388 MIP mit 248 Integer-Vars als dokumentierten Issue. Ein 2000-Pool-Lauf übersteigt das um den Faktor 10 in Variablen. „< 50 MB Bundle-Größe" steuert Disk-Download, aber nicht Heap-Speicher.
  </description>
  <fix>
    (1) Grenzwerte auf realistische Werte neu kalibrieren: 500-Pool Leximin „< 3 min grün, 3–10 min gelb, > 10 min rot"; 1000-Pool „< 10 min grün, 10–30 min gelb, > 30 min rot". (2) Quelle pro Grenzwert zitieren, statt freihändig zu setzen. (3) Eine Zeile „Peak-Heap-Speicher 2000-Pool Run < 1 GB grün / 1–2 GB gelb / > 2 GB rot" ergänzen — das ist das iOS-Safari-Limit (Report 02, Zeile 37) und Chromes Warngrenze. (4) Zusätzliche Zeile „MIP-Oracle-Stabilität: 3 identische Seed-Läufe = 3 identische Panels" — ist Kern der „juristisch relevanten Determinismus"-Forderung in Report 01 Zeile 159.
  </fix>
</finding>

<finding severity="high" id="H7">
  <title>Pyodide-bundled GPL-Library an Endnutzer: „separate work"-Annahme ist nicht belastbar</title>
  <location>02-pyodide-feasibility.md:215; 03-algorithm-port.md:255–257; 00-masterplan.md:75–76</location>
  <description>
    Der Masterplan wählt Apache-2.0 für die Web-App, bindet aber in Phase 0 und Phase 1 `sortition-algorithms` (GPL-3.0) via Pyodide ein (Masterplan Zeile 55). Report 03, Zeile 257, behauptet: „juristisch strittiger Fall, wird aber nach dominanter Meinung als ‚separate works' behandelt, solange die Library nicht modifiziert wird."
    
    Das ist zu dünn für eine Produkt-Grundlage:
    
    1. **GPL-3.0 § 5** definiert „combined work" explizit. Eine Webseite, die einen Python-Interpreter und eine GPL-Python-Library im selben HTTP-Response-Graphen, in demselben Browser-Worker-Kontext, unter demselben Origin lädt und als einheitliche App ausführt, erfüllt die § 5-Definition eher als nicht. Der Betreiber **distributiert** beide zusammen, auch wenn technisch getrennt in Dateien.
    
    2. **FSF-FAQ zu „Aggregation vs. Combination"** ([gnu.org/licenses/gpl-faq.html#MereAggregation](https://www.gnu.org/licenses/gpl-faq.html#MereAggregation)) stellt als Kriterium: „Where's the line between two separate programs, and one program with two parts?" Pyodide + `sortition-algorithms` + App-Glue sind als Produkt-Einheit beworben (Masterplan Zeile 7: „eine rein clientseitige Web-App") — das ist nahe am „one program with two parts". Dass das in JS-Sandbox-Kontext „separate" sei, ist eine US-Software-Community-Meinung, keine DE-Gerichts-Feststellung.
    
    3. **Praktisches Signal**: Wenn das Argument wirklich belastbar wäre, müsste ein Apache-2.0-signiertes ZIP, das `sortition-algorithms`-Python-Code bundle und via Pyodide auflädt, vom GPL-3.0-Autor (Sortition Foundation) als legitim akzeptiert sein. Genau dieser Test fehlt — keiner der Reports enthält einen Schriftverkehr oder eine Stellungnahme der Sortition Foundation.
    
    4. **AGPL-Ansteckung**: Einige GPL-Library-Autoren verwenden bewusst AGPL, um SaaS-Umgehungen zu verhindern. Falls `sortition-algorithms` später AGPL wird (liquid für einzelne Maintainer), müssen PWA-Betreiber plötzlich offenlegen.
    
    Das ist ein **Strukturrisiko**, weil die gesamte Phase-0- und Phase-1-Architektur darauf beruht.
  </description>
  <fix>
    (1) Vor Phase 0 schriftliche Stellungnahme der Sortition Foundation (Brett Hennig, Nick Gill) einholen, ob Pyodide-Runtime-Kombination als separate work akzeptiert wird. Ohne solche Bestätigung ist Apache-2.0 für die umgebende App ein Risiko. (2) Als sichere Default-Option den **gesamten** Phase-0/1-Output unter GPL-3.0 stellen. Das entspricht Report 05 Modell C und ist keine schlechte Wahl — White-Label-Verlust ist für einen Single-Consultant verschmerzbar (Report 05 explizit). (3) Falls Apache-2.0 beibehalten wird, die GPL-Kombinierung durch Pyodide-Worker-Isolation auf IPC-Grenzen heben (eigenständiger Origin, separate Process-Trennung) — das ist technisch aufwendig (iframe + COOP + postMessage) und zerstört die Single-Page-UX. Masterplan muss diesen Kompromiss explizit adressieren.
  </fix>
</finding>

<finding severity="medium" id="M1">
  <title>Pyodide iOS-Safari-Regression ist bekannt, wird aber als Testgegenstand gesetzt</title>
  <location>02-pyodide-feasibility.md:36–38, 214; 00-masterplan.md:100, 135</location>
  <description>
    Report 02 zitiert Pyodide Issue #5428: „Pyodide 0.27.1+ not working on iOS (Safari) — aktive, seit 2025 bestehende Regression". Der Masterplan listet iOS-Safari aber als Go/No-Go-Zeile mit grüner Ampel bei „funktioniert". Das kann nur rot werden — die Phase-0-Testung führt vorhersehbar zum Ausschluss eines Ziels, das nicht realistisch war.
    
    Das ist keine Katastrophe, aber ein Scope-Problem: Wenn iOS-Safari für die Zielgruppe (kommunale Backoffice-PCs) ohnehin nicht relevant ist (Report 02 Zeile 38: „fuer ein Sortition-Desktop-Tool am Buero-PC vermutlich irrelevant"), soll man es aus der Matrix streichen und explizit als „out of scope — Desktop only" deklarieren. Wenn es relevant ist (z.B. weil Bürgerrats-Moderatoren tatsächlich iPads nutzen), ist die gesamte Pyodide-Strategie für diese Zielgruppe tot und man muss auf TS-Port (Phase 2) vorziehen.
    
    Der Masterplan lässt diese Entscheidung offen — das ist symptomatisch für das Go/No-Go-Matrix-Design, das Fragen aufwirft, statt sie zu schließen.
  </description>
</finding>

<finding severity="medium" id="M2">
  <title>SCS/ECOS-Lücke im Pyodide-Weg blockiert Nash-Welfare-Feature</title>
  <location>02-pyodide-feasibility.md:55–56, 78, 207–208; 03-algorithm-port.md:177</location>
  <description>
    Report 02 zeigt: SCS und ECOS fehlen in Pyodide. Report 02 Zeile 78 sagt, der Nash-Welfare-Block müsse auf Clarabel oder scipy umgestellt werden. Report 03 Zeile 177 listet Nash-Port als „hart, > 15 PT, kein CVXPY-Äquivalent in JS". Masterplan Screen 5 aus Report 04 (Zeile 322–342) bietet Nash aber als erwählbare Algorithmus-Option — und der Masterplan nennt Nash nirgends als Dropdown-Kandidat.
    
    Inkonsistenz: Der Masterplan muss klarstellen, ob Nash für v1.0 im Scope ist (dann Clarabel-Fix vor Phase 1), oder ob Nash explizit herausgenommen wird (dann Screen 5 in Report 04 entsprechend abklemmen). Letzteres ist vermutlich die richtige Wahl — Maximin + Leximin reichen.
  </description>
</finding>

<finding severity="medium" id="M3">
  <title>Prototype-Fund-Zeitlinie ist inkonsistent mit Masterplan-Timing</title>
  <location>00-masterplan.md:83; 05-product-and-licensing.md:234, 241, 406</location>
  <description>
    Masterplan Zeile 83: „Bewerbungsfenster 1.10.–30.11.2025, Start Juni 2026 — **für diesen Rhythmus zu spät, nächster Slot 2026/27**. Alternativ BpB / BMI / EU-Förderung."
    
    Kurz danach (Zeile 82–85) wird der Prototype Fund als „Einnahmequelle 1" gelistet. Das ist widersprüchlich: entweder „zu spät" (dann darf es nicht Einnahmequelle 1 sein), oder es ist nicht zu spät (dann muss der Zeitplan es so abbilden). Report 05 (Zeile 241, 406) plant den Prototype-Fund-Antrag für den 2025-Slot — das passt zur Zeitrechnung, wenn heute 2026-04-24 ist: Der 2025-Slot ist abgelaufen, der nächste öffnet sich vermutlich Q4 2026.
    
    Konsequenz: Der Masterplan nimmt in der Einnahme-Planung eine Förderung an, die frühestens Juni 2027 beginnt. Phase 0 (2 Wochen) und Phase 1 (6–10 Wochen) müssen *vor* dieser Förderung selbstfinanziert werden — mit Consulting-Einnahmen oder Erspartem. Das ist nicht fatal, muss aber in der Finanz-Planung realistisch reflektiert werden.
  </description>
</finding>

<finding severity="medium" id="M4">
  <title>Datenquellen-Variabilität (Melderegister-CSV-Formate) wird nur oberflächlich adressiert</title>
  <location>04-frontend-architecture.md:251–272 (Screen 2)</location>
  <description>
    Report 04 Screen 2 bietet UI-Spalten-Mapping + Auto-Detection von Delimiter/Kodierung. Das ist korrekt, aber unterschätzt den Aufwand:
    
    1. **Deutsche Melderegister** haben je nach Landesgesetz (z.B. BW vs. Bayern) unterschiedliche Pflichtfelder, unterschiedliche Personen-Disambiguations-Regeln (Haushalts-ID, Familienstand, ID-Kennzeichnung). Die Tool-Annahme „CSV ist normalisiert" funktioniert nur, wenn eine Person vorher die Daten bereinigt hat — das ist aber ein Vendor-Lock-in zum Dienstleister.
    
    2. **Kategorien-Werte-Varianz**: „Weiblich/Männlich/Divers" vs. „w/m/d" vs. „female/male/other" vs. leere Zellen — Tool braucht Mapping-Heuristik, nicht nur Spalten-Mapping.
    
    3. **Alter vs. Geburtsjahr vs. Geburtsdatum**: Screen 2 zeigt dies, aber keine Berechnungsregel (Alter zum Stichtag der Losung? Zum Einladungs-Datum?).
    
    4. **Österreich/Schweiz**: ZMR (AT) und Einwohnerkontrollen (CH) haben andere Formate — Masterplan spricht von „DACH-Markt" (Report 05 Zeile 55), aber keine spezifische AT/CH-Testung.
    
    Das ist kein Go/No-Go-Problem, aber Phase-1-Scope-Risiko: die UI sieht einfach aus, der Datenbereinigungs-Teil ist aber vermutlich 30% der Entwicklungsarbeit.
  </description>
</finding>

<finding severity="medium" id="M5">
  <title>Maintenance/CVE-Lifecycle für Pyodide-Bundle nicht geregelt</title>
  <location>02-pyodide-feasibility.md:216–217; 00-masterplan.md:155–156</location>
  <description>
    Pyodide bundelt Python 3.12 + numpy + scipy + cvxpy + highspy + clarabel — sechs aktive Upstream-Projekte mit eigenen CVE-Pipelines. Der Single-Consultant-Maintainer ist für CVE-Response verantwortlich (Reports 00/05 planen keinen Wartungsvertrag für Kommunen). Beispiele:
    
    - NumPy CVE-2019-6446, CVE-2021-33430 (relevant bei fremden Pickle-Inputs — hier vielleicht nicht, aber exemplarisch).
    - Pyodide-Memory-Leaks (Discussion #4338, Report 02 Zeile 217).
    - Python-3.12-Security-Releases alle paar Monate.
    
    Wenn eine Kommune das Tool 2028 für einen Bürgerrat benutzt, muss der Consultant entweder eine aktualisierte Version ausgeliefert haben oder dokumentieren, dass das Tool „eingefroren bei dem-und-dem Commit" ist. Der Masterplan addressiert das unter „Risiken" nicht explizit; Report 05 Zeile 340 räumt „Single-Consultant-Maintainer ist fragil" zwar ein, aber ohne Prozess.
  </description>
</finding>

<finding severity="medium" id="M6">
  <title>Explainability zu Leximin gegenüber Laien fehlt komplett</title>
  <location>04-frontend-architecture.md:322–342 (Screen 5); alle Reports</location>
  <description>
    Kein Report diskutiert, wie man einem Bürgermeister, Rats- oder Kommissionsmitglied erklärt, *warum* eine Leximin-Auswahl fairer ist als Maximin oder einfaches Random-Sampling. Tooltip aus Screen 5: „Maximiert die minimale Auswahlwahrscheinlichkeit iterativ über alle Personen. Fairst verteilt." — das ist für eine Justiziariats-Plausibilitätsprüfung nicht ausreichend.
    
    Für die politische Legitimität des Verfahrens (Report 05 Zeile 324: „Wissenschaftliche Glaubwürdigkeit") und für die Verteidigung gegen rechtliche Anfechtungen (z.B. Nicht-Ausgewählter klagt) muss das Tool eine **laienverständliche Methoden-Dokumentation** mit konkreten Zahlenbeispielen liefern. Das ist kein Screen-Design-Problem, sondern ein Content-Problem, das Wochen Arbeit braucht — fehlt in der Roadmap.
  </description>
</finding>

<finding severity="medium" id="M7">
  <title>Patentrecherche (Flanigan/Procaccia/Panelot) nicht durchgeführt</title>
  <location>Alle Reports</location>
  <description>
    Report 05 Zeile 207 empfiehlt Apache-2.0 explizit wegen „Patent-Grant". Das schützt nur, wenn die *Algorithmusautoren selbst* Patentrechte einbringen. Es gibt keinen Such-Beleg, dass keine Drittpatente existieren. Procaccia hat mehrere CS-Theorie-Patente in den USA (ex: US 11,003,999 zu „automated allocation of resources" in verwandten Feldern — ob es in Sortition reicht, ist ohne FTO-Analyse nicht feststellbar). Für einen Export nach US/UK ist das relevant, für reinen DE-Einsatz möglicherweise irrelevant (DE-Softwarepatente sind enger).
    
    Ein Freedom-to-Operate-Check via Patentrecherche-Dienstleister (0,5 Tage, 500–1500 EUR) schließt dieses Risiko oder macht es sichtbar. Fehlt in Report 05 Woche-1-Checkliste.
  </description>
</finding>

<finding severity="medium" id="M8">
  <title>`highs-js`-Maintainer-Risiko (Single-Person-Projekt) nicht mitigiert</title>
  <location>01-wasm-solver-landscape.md:162</location>
  <description>
    Report 01 Zeile 162 vermerkt korrekt: „Maintenance-Risiko `highs-js`: Ein-Person-Projekt (lovasoa)". Das zieht sich durch: ein Single-Person-Solver-Port, der Kern-WASM-Engine des Tools ist. Der Backup-Plan „Eigen-Build via offizielles HiGHS-`build_webdemo.sh`" (Zeile 183) ist zu optimistisch — ein Emscripten-Build mit allen Post-Processing-Schritten zu reproduzieren ist für einen JS/TS-Consultant mehrere Wochen.
    
    Masterplan-Zeile 58 setzt `highs-js` als Architektur-Fixpunkt. Der Plan sollte explizit Risiko-Mitigation vorsehen: Fork-Policy, Dependency-Pinning, jährlicher Build-Test.
  </description>
</finding>

<finding severity="low" id="L1">
  <title>Lizenz-Widerspruch zwischen Reports 01, 03, 05 zu glpk.js</title>
  <location>01:12, 28, 138 vs. 03:104, 356 vs. 05:118–119</location>
  <description>
    Report 01 nennt konsistent GPL-3.0. Report 03 nennt GPL-2.0 (Zeile 104, 356). Report 05 nennt GPL-3.0 (Zeile 99). GLPK ist faktisch GPL-3.0 (siehe [gnu.org/software/glpk](https://www.gnu.org/software/glpk/)). Report 03 ist also faktisch falsch und sollte korrigiert werden. Für den Masterplan keine Konsequenz (wird nicht genutzt), aber symptomatisch für fehlende Fact-Check-Disziplin.
  </description>
</finding>

<finding severity="low" id="L2">
  <title>CSP-Empfehlung enthält unnötige Lockerung</title>
  <location>04-frontend-architecture.md:430–446</location>
  <description>
    CSP-Meta-Tag aus Report 04 erlaubt `style-src 'self' 'unsafe-inline'`. `'unsafe-inline'` ist ein echter Schwächer bei XSS-Angriffen. Für einen Tailwind-purged-Build ist das nicht nötig — alle Styles können extracted werden (Vite-Konfiguration `build.cssCodeSplit`). Wenn das Sicherheitsversprechen maximal sein soll (CSP connect-src 'none' ist der Kern), passt `'unsafe-inline'` nicht dazu.
  </description>
</finding>

<finding severity="low" id="L3">
  <title>npm-Paketname „highs-js" ist nicht der npm-Name</title>
  <location>01-wasm-solver-landscape.md:11, 42; 03-algorithm-port.md:103</location>
  <description>
    Das npm-Paket heißt `highs`, das GitHub-Repo heißt `highs-js`. Report 01 formuliert das meist sauber („`highs-js` / npm `highs`"), aber die weiteren Reports verwenden es inkonsistent. Kleiner Produkt-Fehler, aber bei Installationsanweisung („npm install highs-js") würde das scheitern. Bei Doku-Erstellung prüfen.
  </description>
</finding>

<finding severity="low" id="L4">
  <title>„panelot.org" ist laut Report 03 closed-source — Paul-Gölz-Outreach-Erwartung optimistisch</title>
  <location>03-algorithm-port.md:88–93; 05-product-and-licensing.md:222</location>
  <description>
    Report 05 Zeile 222 empfiehlt Paul Gölz als „wissenschaftlichen Berater in Credits". Report 03 Zeile 92 stellt fest, dass Gölz panelot.org closed-source hält und selbst keinen JS-Port veröffentlicht hat. Ein akademischer Consultant, der sein eigenes closed-source-Konkurrenzprodukt hat, wird nicht unbedingt als Advisor für ein Open-Source-Konkurrenzprodukt zur Verfügung stehen. Report 05 sollte realistischer sein — eher Nick Gill/Brett Hennig (Sortition Foundation) als plausiblere Kontakte.
  </description>
</finding>

</findings>

<strengths>
<strength>Zentrale Lizenz-Analyse zu GPL-3.0 von `glpk.js` und HiGHS in Report 01 ist sauber recherchiert, mit konkreten Quellenangaben und korrekter Abgrenzung zwischen Kopierlinks- und permissiven Lizenzen. Die Entscheidung `highs-js` > `glpk.js` ist solide begründet.</strength>
<strength>Die Existenzlücke eines JS/TS-Leximin-Ports (Report 03 §2.1) ist sauber nachgewiesen — keine bloße Behauptung, sondern dokumentierte Suche mit negativen Ergebnissen. Das rechtfertigt die Pyodide-Priorisierung nachvollziehbar.</strength>
<strength>Report 02 enthält eine ehrliche Paket-Kompatibilitäts-Matrix mit expliziten „NEIN" bei SCS, ECOS, cvxopt, osqp — das sind echte Showstopper, und das Benennen schützt Phase 0 vor Überraschungen.</strength>
<strength>Die Separation von Produkt-Schicht (Apache-2.0, OSS) von Einnahmequelle (Consulting + Prototype Fund) in Report 05 ist eine realistische Geschäfts-Struktur für einen Single-Consultant und vermeidet die SaaS-Markt-Falle korrekt.</strength>
<strength>Die Test-Strategie in Report 04 §9 (Vitest + fast-check property-based + Playwright + Reproducible-Build-Test mit SHA-256-Vergleich) ist angemessen streng für ein demokratie-kritisches Tool.</strength>
<strength>Masterplan Abschnitt „Konflikt 1" und „Konflikt 2" benennt Widersprüche zwischen Reports explizit — das ist in Synthese-Dokumenten selten und zeugt von Transparenz.</strength>
</strengths>

<traces>
<trace name="Querlesen aller sechs Dokumente">Masterplan und alle fünf Reports vollständig gelesen, Quer-Referenzen manuell nachverfolgt, vor allem zwischen Report 01 (Solver-Lizenz) vs. Report 04 (Solver-Empfehlung) vs. Masterplan (Konflikt-Auflösung).</trace>
<trace name="Lizenz-Fakten-Check">GLPK-Lizenz (GPL-3.0, siehe gnu.org/software/glpk) gegen die Reports gecheckt — Diskrepanz zwischen Report 01 (GPL-3.0, korrekt), Report 03 (GPL-2.0, falsch), Report 05 (GPL-3.0, korrekt) identifiziert. Report 04 nennt glpk.js als „MIT-kompatibel" — faktischer Fehler.</trace>
<trace name="Performance-Cross-Check">Masterplan-Go/No-Go-Grenzwerte gegen Reports 01 (WASM-Overhead 1,45–2,5×, nativer 200/20-Pool ~6,4 s) und 02 (5–30 s pro ILP-Call für 5000-Pool × 20–50 Iterationen) geprüft. Ergebnis: Masterplan-Grenze „< 60 s grün für 500-Pool Leximin" ist ~3× zu optimistisch, widerspricht der eigenen Report-01-Empfehlung von „> 3 min Red Flag auf 500er-Pool".</trace>
<trace name="Rechtsrahmen-Check DE">UrhG § 69a ff. (Software-spezifische Regelung, nicht das allgemeine § 3) gegen die Clean-Room-Analyse in Report 03 abgeglichen. Report 03 zitiert „§ 3 UrhG" — das ist die falsche Norm für Software. § 69c Nr. 2 (Übersetzung inkl. Portierung) und § 69e (Dekompilierungs-Schranke) sind die einschlägigen Vorschriften. BGH „Holzhandelsprogramm" als DE-Präzedenz für Clean-Room-Dokumentationspflicht eingebracht, weil die Reports primär FSF-/US-Position zitieren.</trace>
<trace name="Go/No-Go-Signal-Inventur">Matrix mit 8 Zeilen durchgegangen, nicht-technische Regulatoren (DSFA Art. 35, BITV 2.0, BFSG 2025, Pen-Test, Patent-FTO, Rechtsgutachten) geprüft. Ergebnis: keines davon in der Matrix vorhanden, obwohl mindestens DSFA und BITV 2.0 harte Blocker bei kommunaler Beschaffung sein können.</trace>
<trace name="Internaler Pyodide-iOS-Widerspruch">Report 02, Zeile 36–38 („Pyodide 0.27.1+ nicht funktioniert auf iOS") mit Masterplan Zeile 100 („Woche 2: auf Safari/iOS testen") und Matrix-Signal „iOS-Safari funktioniert / grün" abgeglichen. Ergebnis: vorhersagbar rotes Matrixfeld, das 2 Wochen Phase-0-Zeit für ein schon bekanntes Ergebnis verbraucht.</trace>
</traces>

<verdict value="warn" critical="0" high="7" medium="8">
  <blockers>
    <blocker>Phase-0-Scope in 2 Wochen ist mit den eigenen Aufwandsschätzungen der Reports nicht kompatibel — ohne Re-Scoping geht Phase 0 wahrscheinlich scope-seitig schief (H2).</blocker>
    <blocker>Go/No-Go-Matrix ignoriert nicht-technische Showstopper (DSFA, BITV 2.0, Rechtsgutachten, Pen-Test, Patent-FTO) — eine grüne technische Ampel kann von einem ungelösten rechtlichen Signal überstimmt werden (H4).</blocker>
    <blocker>Die Pyodide-GPL-Runtime-Kombination mit Apache-2.0-App ist nicht belastbar als „separate works" — entweder schriftliche Klärung mit Sortition Foundation oder Defaultwechsel auf GPL-3.0 (H7).</blocker>
    <blocker>Clean-Room-Reimplementation unter DE-UrhG § 69c ist für einen Single-Consultant organisatorisch schwer tragbar — ohne Zwei-Personen-Trennung ist das GPL-Contamination-Risiko real (H5).</blocker>
    <blocker>Performance-Grenzwerte der Go/No-Go-Matrix sind gegenüber den eigenen Report-Projektionen ~3× zu optimistisch — Phase 0 läuft mit hoher Wahrscheinlichkeit auf „künstlich grün" hinaus (H6).</blocker>
    <blocker>Konflikt-Auflösung zu Report 04 ist unsauber — andere Architekturentscheidungen aus Report 04 müssen einzeln revalidiert werden (H1).</blocker>
    <blocker>Pluggable-Solver in `sortition-algorithms` ist load-bearing aber unverifiziert — vor Phase 0 als Entry-Gate zu klären (H3).</blocker>
  </blockers>
</verdict>

Gesamtbewertung: Der Masterplan ist technisch gut recherchiert und benennt die zentralen Konflikte transparent, aber er kalibriert die Schwellwerte so, dass die vorgesehene Entscheidungs-Struktur (Phase 0 → Go/No-Go → Phase 1) ihre Filterfunktion kaum wahrnehmen kann. Die größten Schwachstellen sind nicht-technisch (Rechtsrahmen, DSFA, BITV, Pyodide-GPL-Kombination, Clean-Room-Machbarkeit für Solo-Consultant). Der Plan ist mit gezielten Revisionen (H1–H7) rettbar, sollte aber nicht in der aktuellen Form Phase 0 beginnen.

</review>

