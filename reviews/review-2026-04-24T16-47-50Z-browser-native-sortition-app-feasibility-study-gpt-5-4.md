---
review_of: browser-native-sortition-app-feasibility-study
review_type: topic
review_mode: topic
review_topic: Browser-native Sortition-App feasibility study for Bürgerräte
reviewed_at: 2026-04-24T16-47-50Z
tool: codex
model: gpt-5.4
duration_seconds: 357
---

<review>

<findings>

<finding severity="critical" id="C1">
  <title>Phase-0/Phase-1 bauen auf einer falschen Annahme zu `sortition-algorithms` auf</title>
  <location>00-masterplan.md:39-40,55-56,97-103,136; 02-pyodide-feasibility.md:95-111,236-240; upstream `sortition-algorithms` README:61-69, `core.py`:322-325, `committee_generation/leximin.py`:9-15,54-56</location>
  <description>Der Masterplan behauptet, Phase 0/1 könne mit „Pyodide + `sortition-algorithms`“ die vollen Nature-Algorithmen im Browser verfügbar machen. Das ist nach heutigem Upstream-Stand nicht belegt, sondern im Kern widerlegt: `sortition-algorithms` deklariert zwar `highspy` und `mip` als Abhängigkeiten, aber die offizielle README verlangt für `leximin` ausdrücklich `sortition-algorithms[gurobi]`. Im Code wird `leximin` ohne Gurobi nicht auf HiGHS umgebogen, sondern in `core.py` automatisch auf `maximin` zurückgeschaltet; `committee_generation/leximin.py` importiert `gurobipy` direkt und wirft ohne Gurobi einen Fehler. Dass Report 02 trotzdem aus `sortition-algorithms` eine „massive Abkürzung“ für Pyodide-Leximin ableitet, ist daher sachlich zu optimistisch. Damit fällt die zentrale Phase-0-Hypothese des Masterplans weg: Der vorgeschlagene Spike prüft nicht „Pyodide + vollständiges Leximin“, sondern allenfalls „Pyodide + maximin bzw. eigener Leximin-Umbau“.</description>
  <fix>Roadmap und Go/No-Go-Matrix auf den echten Upstream-Stand umstellen: Phase 0 muss explizit zwischen `maximin`-Browser-PoC und eigenem `leximin`-Umbau unterscheiden. Den Satz, dass `sortition-algorithms` bereits die volle Nature-Algorithmenfamilie browsertauglich mache, streichen. Vor jeder MVP-Planung einen konkreten technischen Spike definieren: 1. `maximin` in Pyodide, 2. Aufwand für Gurobi-freies `leximin`, 3. Entscheidung erst nach belastbaren Ergebnissen.</fix>
</finding>

<finding severity="critical" id="C2">
  <title>Die Lizenzstrategie ist zwischen Apache-Zielbild und GPL-Pyodide-MVP unaufgelöst</title>
  <location>00-masterplan.md:7,76,82-85; 02-pyodide-feasibility.md:213-216; 03-algorithm-port.md:240-257,271-272; 05-product-and-licensing.md:99-108,203-207; UrhG §69c Nr. 1-4; GNU GPL FAQ („linking ... combined work“, JavaScript-Ausnahme nur mit zusätzlicher Exception)</location>
  <description>Der Masterplan setzt zugleich auf ein Apache-2.0-Zielbild und auf eine produktionsreife Pyodide-Phase mit GPL-Code aus `stratification-app`/`sortition-algorithms`. Diese beiden Aussagen sind rechtlich gerade nicht „klar“, sondern offen. Report 02 behauptet sogar, die Auslieferung einer GPL-Library in Pyodide sei „automatisch GPL-compliant“, und Report 03 behandelt die Web-App-Shell bei Pyodide als tendenziell „separate works“. Dafür fehlt aber jede belastbare deutsche Primärrechtsanalyse. Nach §69c UrhG sind Laden, Speichern, Umarbeitung und öffentliche Zugänglichmachung zustimmungsbedürftige Handlungen; genau diese Handlungen passieren beim Bündeln und Ausliefern einer browserseitigen Pyodide-App. Die GNU-FSF-Linie ist ebenfalls nicht entlastend: Sie behandelt statisches oder dynamisches Linking als „combined work“; für JavaScript im Web verweist sie nur dort auf Trennung, wo der Rechteinhaber eine ausdrückliche Sonderausnahme erklärt. Eine solche Ausnahme liegt hier nicht vor. Besonders problematisch: Report 03 empfiehlt für den Clean-Room sogar die Nutzung der GPL-Fixtures als Regressionstests, obwohl derselbe Report strikte Trennung fordert. Solange dazu kein spezialisiertes Gutachten vorliegt, ist die Behauptung eines „klaren“ Apache-Pfads für einen Pyodide-MVP nicht tragfähig.</description>
  <fix>Lizenzpfade trennen statt vermischen. Entweder: Phase 0/1 ausdrücklich als GPL-Prototyp/MVP deklarieren und Apache erst nach vollständigem Clean-Room-Port zulassen. Oder: Pyodide aus dem Produktionspfad streichen und Apache nur für einen tatsächlich GPL-freien TS-Port beanspruchen. Zusätzlich vor jeder Umsetzung ein deutsches IT-/Urheberrechtsgutachten zu §69c UrhG, GPL-Kombination im Browser und Testdaten-/Fixture-Nutzung einholen.</fix>
</finding>

<finding severity="high" id="H1">
  <title>Die Go/No-Go-Laufzeitziele sind für Leximin im Browser nicht belastbar</title>
  <location>00-masterplan.md:95-103,128-141; 01-wasm-solver-landscape.md:112-125,178-180; `citizensassemblies-replication/reference_output/sf_e_110_statistics.txt`:2-22</location>
  <description>Der Masterplan setzt „grün“ bei &lt;60 s für einen 500er-Leximin-Pool und &lt;3 min für einen 1000er-Pool. Dafür fehlt eine belastbare Herleitung. Report 01 selbst sagt, die 2x-WASM-Schätzung stütze sich nur auf generische WASM-Studien und es gebe keine publizierten `highs-js`-gegen-nativ-Benchmarks auf passenden Instanzen. Die einzige harte Replikationsspur, die ich im Referenzrepo geprüft habe, zeigt für `sf_e` (Pool 1727, Panel 110, 7 Quotenkategorien) eine mediane Leximin-Laufzeit von 4011,6 s, also rund 67 Minuten, und zwar nativ mit Gurobi. Damit wirken die Ampelschwellen eher wie Wunschwerte als wie eine saubere Ableitung. Wenn schon die Referenzimplementierung mit kommerziellem Solver bei realer Größe im Stundenbereich landet, ist es nicht seriös, für einen Browserpfad mit Pyodide/HiGHS globale Grünschwellen auszugeben, ohne Algorithmus, Solver und Datensatzklasse separat auszuweisen.</description>
  <fix>Die Matrix nach Algorithmus (`maximin` vs. `leximin`), Solver (Gurobi/HiGHS) und Instanzklasse aufspalten. Für Leximin keine pauschalen Grünwerte mehr nennen, bevor ein reproduzierbarer Benchmarkkorpus vorliegt. Als Mindeststandard drei öffentliche Referenzinstanzen plus zwei kommunale CSVs definieren und die Ampeln erst aus diesen Messungen ableiten.</fix>
</finding>

<finding severity="high" id="H2">
  <title>Die Patentbewertung ist zu selbstsicher; Apache-2.0 löst kein Fremdpatentrisiko</title>
  <location>00-masterplan.md:76; 05-product-and-licensing.md:203-207; Apache License 2.0 §3</location>
  <description>Der Masterplan und Report 05 behandeln Apache-2.0 faktisch als Patent-Risikoreduktion. Das ist in dieser Form irreführend. Apache §3 gewährt nur eine Patentlizenz für Ansprüche, die „by such Contributor“ lizenzierbar sind und durch dessen Beitrag notwendig verletzt würden. Das schützt nicht gegen mögliche Rechte Dritter, die an der Clean-Room-Implementierung gar nicht mitgewirkt haben. Gerade weil die Studie selbst einen möglichen Patentbezug der Nature-/Procaccia-Linie als Review-Frage aufwirft, ist die Aussage „Apache-2.0 gibt zusätzliche Sicherheit“ ohne dokumentierte Freedom-to-Operate-Prüfung zu stark. Ich habe bei der Verifikation keine belegte Patentklärung in den Reports gefunden; es wird nur auf den Patent-Grant der Ziel-Lizenz verwiesen.</description>
  <fix>Patentthema als offenen Rechts-Track aufnehmen statt implizit durch Apache „abzuhaken“. Im Plan eine kurze FTO-/Prior-art-Prüfung oder anwaltliche Stellungnahme vorsehen. Im Dokument klarstellen: Apache-2.0 reduziert nur Contributor-Patentrisiken, nicht mögliche Drittpatente.</fix>
</finding>

<finding severity="high" id="H3">
  <title>Report 04 ist nicht nur „veraltet“, sondern in zentralen Architekturpunkten intern widersprüchlich</title>
  <location>04-frontend-architecture.md:5-12,173-180,425-445,519-523; 00-masterplan.md:21-27,31-34</location>
  <description>Der Masterplan behandelt Report 04 als weitgehend übernehmbar, „bis auf den Solver-Baustein“. Das ist zu großzügig. Report 04 empfiehlt nicht nur `glpk.js` trotz MIP-/Lizenzkonflikt, sondern baut seine Datenschutzarchitektur zugleich auf `connect-src 'none'` auf und schlägt wenige Seiten später eine `tenant.json` per `fetch('/tenant.json')` als Runtime-Konfiguration vor. Diese beiden Aussagen sind nicht gleichzeitig wahr; `connect-src` steuert gerade `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource` und `sendBeacon` (MDN). Außerdem beziffert Report 04 Pyodide pauschal mit „~10 MB“, obwohl Report 02 selbst 30-40 MB für den relevanten Scientific-Stack ansetzt. Das ist kein einzelner Ausrutscher, sondern zeigt, dass Report 04 in Sicherheits-, Solver- und Bundle-Fragen auf einem anderen Wissensstand steht. Wer ihn als tragfähige Architekturgrundlage nutzt, übernimmt mehr Ballast als der Masterplan offenlegt.</description>
  <fix>Report 04 nicht selektiv „mit Masterplan-Override“ weiterverwenden, sondern als historisch überholt markieren und durch ein neues Architekturpapier ersetzen. Dieses Ersatzpapier muss aus den finalen Annahmen abgeleitet werden: `highs-js` oder Pyodide, keine `fetch`-Abhängigkeit bei `connect-src 'none'`, klare ZIP-/Hosted-Abgrenzung, reale Bundle-Zahlen.</fix>
</finding>

<finding severity="high" id="H4">
  <title>Die Pyodide-Kompatibilitätsmatrix ist auf einem beweglichen `main`-Stand gebaut und nennt für 0.29.3 falsche Versionsstände</title>
  <location>02-pyodide-feasibility.md:3,42-64; Pyodide 0.29.3 package list: `cvxpy-base` 1.6.3, `highspy` 1.11.0, `clarabel` 0.11.0</location>
  <description>Report 02 behauptet zu Beginn einen Stable-Zielstand „Pyodide 0.29.3“, baut die Matrix dann aber ausdrücklich aus dem `pyodide-recipes`-Main-Branch. Das rächt sich sofort: Für die angeblich betrachtete Stable-Version nennt der Report `cvxpy-base 1.8.2`, `highspy 1.13.1` und `clarabel 0.11.1`. Die offizielle Pyodide-0.29.3-Paketliste zeigt jedoch `cvxpy-base 1.6.3`, `highspy 1.11.0` und `clarabel 0.11.0`. Die Grundrichtung bleibt zwar positiv, aber die Machbarkeitsaussage beruht damit nicht auf dem tatsächlich avisierten Release-Artefakt. Gerade in einem Projekt, das auf Solver- und Wheel-Kompatibilität steht oder fällt, ist das zu unpräzise.</description>
  <fix>Die Matrix auf genau eine Zielversion einfrieren und nur deren offizielle Paketliste verwenden. Wenn `latest` oder ein Dev-Stand benötigt wird, muss der Plan das offen sagen und die damit verbundene Release-/Wartungsunsicherheit separat bewerten.</fix>
</finding>

<finding severity="medium" id="M1">
  <title>Die 2-Wochen-Phase 0 ist für den beschriebenen Prüfauftrag zu knapp</title>
  <location>00-masterplan.md:95-103; 03-algorithm-port.md:206-216; 02-pyodide-feasibility.md:261-267</location>
  <description>Phase 0 soll in zwei Wochen Worker-Integration, Solver-/Library-Validierung, Benchmarks für 500/1000/2000 Pools, Bundle-Messung, Determinismus und Safari/iOS-Tests liefern. Selbst Report 03 schätzt den Pyodide-Ansatz auf 15-17 Personentage, also rund drei Wochen, und das ohne Marktgespräche und ohne saubere Browser-Matrix. Report 02 nennt zwar 2-3 Tage für einen Minimaltest, aber ausdrücklich nur für eine Spielzeug-Selection mit 100 Personen. Der Masterplan vermischt diese Minimalvalidierung mit einem belastbaren Go/No-Go-Paket. Das ist methodisch zu optimistisch.</description>
  <fix>Phase 0 in zwei Stufen zerlegen: 0a Minimal-Feasibility (Toy-Dataset, nur Desktop-Chromium, 2-3 Tage) und 0b Entscheidungsbenchmark (öffentliche Referenzinstanzen, Safari/WebKit, Bundle, Determinismus, 2-3 weitere Wochen).</fix>
</finding>

<finding severity="medium" id="M2">
  <title>DSFA/DPIA wird implizit wegdefiniert, obwohl der Controller-Risikomaßstab bleibt</title>
  <location>00-masterplan.md:69-72,159; 05-product-and-licensing.md:286-289; GDPR Art. 35(1), (3), (4)</location>
  <description>Die Studie argumentiert stark mit „kein Backend“ und „keine AVV“, behandelt aber die Datenschutz-Folgenabschätzung praktisch nicht. Das ist ein blinder Fleck. Art. 35 GDPR knüpft an „likely to result in a high risk“ an, nicht an die Existenz eines Servers; öffentliche Stellen müssen bei risikoreicher neuer Technologie eine DPIA prüfen bzw. durchführen. Report 05 verortet die Kommune korrekt als Verantwortliche, zieht daraus aber keine DSFA-Arbeitspakete. Für Melderegisterdaten, Quotenmerkmale und ein neues algorithmisches Auswahlwerkzeug ist die Aussage „no backend, therefore easy“ zu flach.</description>
  <fix>Im Masterplan einen eigenen Datenschutz-Workstream ergänzen: DSFA-Checkliste, Musterverzeichnis der Verarbeitungstätigkeiten, Rollenmodell Controller/Consultant, Löschkonzept, Rechtsgrundlagenmatrix für Melderegister- und Selbstauskunftsdaten.</fix>
</finding>

<finding severity="medium" id="M3">
  <title>Barrierefreiheit ist für den öffentlichen Einsatz kein „späteres Audit“, sondern Beschaffungs- und Designanforderung ab Tag 1</title>
  <location>04-frontend-architecture.md:819; 00-masterplan.md:107-113; BGG §12a Abs. 1-3; BITV 2.0 §§1-3,7</location>
  <description>Das Thema taucht nur randständig als spätere Zertifizierungsfrage auf. Für öffentliche Stellen des Bundes sind barrierefreie Websites, mobile Anwendungen und elektronische Verwaltungsabläufe aber gesetzlich verankert; §12a BGG verlangt Berücksichtigung bereits bei Planung, Entwicklung und Beschaffung, und BITV 2.0 konkretisiert Standards, Erklärung zur Barrierefreiheit und Bewertungsanforderungen. Selbst wenn kommunal landesrechtliche Details abweichen, ist „später auditieren“ als Default zu schwach. Für ein Bürgerrats-Tool mit Formularen, Tabellen, Quoteneditor und Exporten ist das ein Kernanforderungsblock.</description>
  <fix>WCAG/BITV-Compliance in die MVP-Definition aufnehmen: Tastaturbedienbarkeit, Screenreader-Flows, Kontrast, Erklärung zur Barrierefreiheit, Prüfung der Exportartefakte, Test mit assistiven Technologien. Nicht als Phase-2-Thema behandeln.</fix>
</finding>

<finding severity="medium" id="M4">
  <title>Die Variabilität kommunaler CSV-Exporte wird unterschätzt</title>
  <location>00-masterplan.md:57,107; 04-frontend-architecture.md:239-305</location>
  <description>Die Studie plant CSV-Upload, Spalten-Mapping und Quoteneditor, behandelt aber nicht ernsthaft die Heterogenität deutscher Melderegister- und Rücklaufdaten. In der Praxis sind Trennzeichen, Encodings, Mehrfachkennzeichen, Wohnadressen, Schreibweisen für Geschlecht/Bezirk/Bildung und Dublettenregeln zwischen Kommunen massiv uneinheitlich. Papaparse und ein Mapping-Screen lösen Parsing, aber nicht die Domänenharmonisierung. Ohne diese Arbeit droht der First-Pilot nicht am Solver, sondern an Datenbereinigung und manueller Vorverarbeitung zu scheitern.</description>
  <fix>Vor dem Bau mindestens 5-10 echte oder synthetisch realistische kommunale Exportformate sammeln und daraus ein Normalisierungsmodell ableiten. Im Plan einen eigenen Adapter-/Vorlagen-Track aufnehmen, inklusive Validierungsregeln und Import-Fehlerberichten.</fix>
</finding>

<finding severity="medium" id="M5">
  <title>Erklärbarkeit, Mehrsprachigkeit und Wartung werden für die Zielgruppe zu knapp behandelt</title>
  <location>00-masterplan.md:59,107-113,157-162; 04-frontend-architecture.md:322-342,467-489; 05-product-and-licensing.md:340-362</location>
  <description>Die Studie denkt technisch tief, aber operativ zu schmal. Für den Einsatz in Kommunen fehlen drei Dinge: erstens eine Laien-Erklärung von `leximin`/`maximin`, die Rechtsamt, Rat und Öffentlichkeit nachvollziehen können; zweitens eine Sprachstrategie jenseits DE/EN für migrantisch geprägte Verfahren; drittens ein klarer Maintenance-Owner für Pyodide-/WASM-/CVE-Updates. Report 05 erkennt zwar das Single-Maintainer-Risiko, übersetzt es aber nicht in ein verbindliches Betriebsmodell. Für ein selten genutztes, aber rechts- und reputationssensibles Tool ist diese Lücke relevant.</description>
  <fix>Im Masterplan drei Pflichtartefakte ergänzen: 1. Methodenblatt in Leichter Sprache und Verwaltungssprache, 2. i18n-Roadmap mit mindestens zusätzlicher Architektur für weitere Sprachen, 3. Wartungs- und Security-Modell mit Updatefenstern, Verantwortlichen und End-of-Life-Regeln.</fix>
</finding>

</findings>

<strengths>
<strength>Der Masterplan benennt die wichtigsten internen Widersprüche offen, insbesondere den Konflikt `highs-js` versus `glpk.js` und die Gefahr, 10+ Wochen in einen Port zu investieren, bevor Markt und Performance validiert sind (00-masterplan.md:19-44).</strength>
<strength>Die Studie ist stark, wo sie harte technische Unsicherheit als Unsicherheit markiert: Report 01 fordert zurecht Benchmarks vor Architektur-Freeze und macht das `highs-js`-OOM-Risiko transparent statt es wegzudiskutieren (01-wasm-solver-landscape.md:54-56,122-130,154-159).</strength>
<strength>Die Markt- und Geschäftsmodellanalyse ist nüchterner als viele Machbarkeitsstudien: Der Plan verkauft die Idee nicht als SaaS-Wachstumsmarkt, sondern als OSS-/Consulting-Baustein mit begrenztem Umsatzpotenzial (00-masterplan.md:16,80-85; 05-product-and-licensing.md:14-25,70-72).</strength>
</strengths>

<traces>
<trace name="main check">Alle sechs Pflichtdokumente vollständig gelesen, mit Zeilenreferenzen geprüft, plus den Parent-Report `05-sortition-algorithm.md` als Kontext gegengehalten.</trace>
<trace name="technical conclusions">Upstream-Repos `sortitionfoundation/sortition-algorithms`, `sortitionfoundation/stratification-app`, `lovasoa/highs-js` und `pgoelz/citizensassemblies-replication` geklont bzw. per Raw-Dateien geprüft. Verifiziert wurden insbesondere: `leximin`-Gurobi-Gating, Solver-Backends, `highs-js`-Issue #9 und die Referenzlaufzeiten 46,2 s (`sf_d`) bzw. 4011,6 s (`sf_e`).</trace>
<trace name="legal and GPL">Primärquellen geprüft: UrhG §69c, GNU GPL FAQ, Apache License 2.0 §3. Daraus folgt nicht, dass die Pyodide-Kombination sicher GPL-pflichtig ist, aber sehr wohl, dass der Bericht den Apache-Pfad zu sicher darstellt und deutsches Recht nicht sauber aufarbeitet.</trace>
<trace name="go-no-go realism">Go/No-Go-Schwellen mit den in Report 01 genannten Annahmen und den tatsächlichen Referenzdaten aus `citizensassemblies-replication` abgeglichen; die Ampelwerte sind für Leximin im Browser derzeit nicht belastbar.</trace>
<trace name="missing topics">Regulatorische und operative Lücken gegen Primärrecht und Behördenkontext gegengeprüft: GDPR Art. 35 für DPIA, BGG §12a und BITV 2.0 für Barrierefreiheit, BFSG für den differenzierten Verbraucherdienst-Kontext. Zusätzlich auf Dateningest, Erklärbarkeit, Mehrsprachigkeit und Wartung geprüft.</trace>
</traces>

<verdict value="fail" critical="2" high="4" medium="5">
  <blockers>
    <blocker>Die Phase-0-Kernannahme „Pyodide + sortition-algorithms liefert Leximin im Browser“ ist nach aktuellem Upstream-Stand falsch; ohne Gurobi fällt upstream auf Maximin zurück.</blocker>
    <blocker>Die Lizenzarchitektur ist zwischen Apache-Zielbild und GPL-Pyodide-MVP ungelöst; ohne spezialisiertes deutsches Rechtsgutachten ist der als „klar“ dargestellte Pfad nicht belastbar.</blocker>
  </blockers>
  Der Plan ist inhaltlich wertvoll, aber in seiner jetzigen Form nicht freigabefähig: Die technische Roadmap überschätzt den aktuellen Upstream-Stand, und die rechtliche Freigabe für einen Apache-lizenzierten Browser-MVP ist nicht sauber abgesichert.
</verdict>

</review>

