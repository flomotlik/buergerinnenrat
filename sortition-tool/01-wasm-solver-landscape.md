# WASM/JS LP/MIP-Solver für browser-native Sortition

**Datum:** 2026-04-24
**Autor:** Recherche im Auftrag der Machbarkeitsstudie „Browser-natives Sortitions-Tool"
**Scope:** Evaluierung client-seitiger LP/MIP-Solver für die Umsetzung des Flanigan-et-al.-Leximin-Algorithmus (Nature 2021) in einer rein statischen, backend-losen Web-App (DSGVO-Anforderung: Melderegister-Daten dürfen das Endgerät nicht verlassen).

---

## TL;DR

- **HiGHS via `highs-js` (npm `highs`) ist der klare Produktions-Kandidat**: MIT-Lizenz (kompatibel mit jedem Geschäftsmodell), offizieller Emscripten-WASM-Build, embedded HiGHS 1.8.0 (Stand Release v1.8.0, November 2024), TypeScript-Typen vorhanden, aktiver Autor (lovasoa). Das Setup der Sortition Foundation ist im Upstream (python-mip 1.17+) mittlerweile ebenfalls auf HiGHS als gleichwertigen Backend umgestellt - damit ist die Algorithmus-Familie WASM-kompatibel.
- **`glpk.js` (jvail) ist die zweitbeste Option**, aber die **GPL-3.0-Lizenz ist ein harter Blocker für ein proprietäres Produkt**. Bundle 2,67 MB, gute LP/MILP-Performance, solide TypeScript-Typen. Nur akzeptabel, wenn das gesamte Frontend ebenfalls GPL-3.0 sein kann.
- **Reine JS-Solver (YALPS, jsLPSolver) skalieren nicht ausreichend**: Designgrenze ist laut eigener Dokumentation „a few thousand or less" Variablen und „a few hundred" Integer-Variablen. Unser Problem (~5000 Binärvariablen bei einem 5000er-Pool) liegt am oder jenseits dieser Grenze; dokumentierte Einfrier- und OOM-Berichte unter 500 Constraints × 5000 Variablen bestätigen das.
- **CBC, lp_solve, Gurobi, CPLEX im Browser: faktisch nicht nutzbar**. Es gibt keine gepflegten WASM-Builds von CBC; lp_solve existiert nur als Experimental-Gist; Gurobi/CPLEX sind geschlossene Server-Systeme und im Browser ausgeschlossen (Lizenzmodell bindet an Host-Authentifizierung).
- **WASM-Performance-Einbuße: typisch 1,45× - 2,5× gegenüber nativ** (USENIX-Jangda-Studie). Für unser Problem bedeutet das: ein Leximin-Run, der nativ ca. 6-10 s braucht (CMU-Replikationsdaten: 6,4 s für 200er-Pool), wird im Browser bei größerem Pool realistisch in die 30-120-s-Region wandern. Akzeptabel mit „Progress Bar", **aber nur solange pro Panel-Bestimmung gerechnet und nicht 600 Multiplicative-Weights-Runden durchlaufen werden**.
- **Bundle-Größe HiGHS-WASM: ca. 3-5 MB** (Emscripten-typisch). Für ein dediziertes Fachtool akzeptabel, sollte jedoch lazy-loaded werden.
- **SharedArrayBuffer/Threading ist NICHT erforderlich**, solange `highs-js` ohne `-pthread` gebaut wird (aktuelle Build-Variante läuft single-threaded). Damit entfallen COOP/COEP-Header - **kritisch, weil statisches Hosting (GitHub Pages / S3 / Netlify Free) das ohne Service-Worker-Tricks nicht liefert**.
- **Determinismus ist lösbar**: HiGHS hat den Option-Parameter `random_seed` (Integer, Default 0). Bei fester Seed plus identischer Problem-Formulierung ist der Solver reproduzierbar. Die Multiplicative-Weights-Ebene (Flanigan-Algorithmus) benötigt einen separaten JS-RNG mit Seed (z. B. `seedrandom`); **das kombinierte System ist seed-kontrollierbar**.
- **Hauptrisiko (nicht zu unterschätzen):** `highs-js` hat dokumentierte OOM-Berichte bei 350×388-MIPs mit 248 Integer-Vars. Ein Leximin-Lauf über einen 5000-Personen-Pool kann das sprengen. **Ein Prototyp-Benchmark auf realistischer Problemgröße ist MUST-HAVE vor jeder Architekturentscheidung.**

---

## 1. Marktübersicht (Tabelle)

| Solver | Repo / Paket | Lizenz | Letzte Version | Klassen | Bundle (ca.) | Realistische Performance für 5000-Var-MIP | Produktionsreif? |
|---|---|---|---|---|---|---|---|
| **HiGHS** (`highs-js`) | [lovasoa/highs-js](https://github.com/lovasoa/highs-js), npm `highs` | **MIT** | v1.8.0 (Nov 2024); Issues aktiv 2025/2026 | LP, QP, MIP | ~3-5 MB WASM | Gut für LP; MIP 1×-1 Größenordnung langsamer als Gurobi (nativ); im WASM zusätzlich 1,5×-2,5× | **Ja** (mit Benchmark-Validierung) |
| **GLPK** (`glpk.js`) | [jvail/glpk.js](https://github.com/jvail/glpk.js) | **GPL-3.0** | v4.0.2 (2,67 MB unpacked); 131 Stars; Issues zuletzt 2023-2024 | LP, MILP | 2,67 MB | Solide; im YALPS-Benchmark 2-4× langsamer als YALPS auf kleinen Problemen, deutlich SCHNELLER als YALPS bei Integer-Problemen (Vendor Selection: 61 ms vs. 296 ms) | Ja, **aber Lizenz blockt proprietär** |
| **`glpk-ts`** | [npm `glpk-ts`](https://www.npmjs.com/package/glpk-ts) | MIT (Wrapper), GPL-3.0 (GLPK-Core) | v0.0.11 (2023, > 2 Jahre alt) | LP, MILP | ähnlich wie glpk.js | unklar, kaum gepflegt | **Nein** - stale |
| **YALPS** | [IanManske/YALPS](https://github.com/IanManske/YALPS), npm `yalps` | MIT | v0.6.4 (Dez 2025); „maintained, no new features" | LP, MIP (dense) | sehr klein (ESM) | Nur bis „a few thousand" Vars und „a few hundred" Ints (Doku); dense matrix | **Nein** für 5000-Var-MIP |
| **jsLPSolver** | [JWally/jsLPSolver](https://github.com/JWally/jsLPSolver), npm `javascript-lp-solver` | Unlicense (PD) | v1.0.3 (Jan 2026) - aktiv | LP, MIP (simplex + B&C) | klein | Dokumentierte Einfrier-Probleme bei 500 Constraints × 5000 Vars (Issue #43); 2-6× langsamer als YALPS/glpk.js | **Nein** - Stabilität bei unserer Größe nicht gegeben |
| **lp_solve** | Gist/Proof-of-Concept ([fhk/0aba10a...](https://gist.github.com/fhk/0aba10a289a5e6b253fb2abf268469ac)) | LGPL-2.1 | experimental; kein npm-Paket | LP, MIP | n/a | unbekannt, nicht evaluiert | **Nein** - kein gepflegter Port |
| **CBC (COIN-OR)** | kein seriöser WASM-Build | EPL-2.0 | — | LP, MIP | — | — | **Nein** |
| **Gurobi** | proprietär, kein Browser | kommerziell | — | LP, MIP, QP | — | — | **Ausgeschlossen** (Server-only, gebundene Lizenz) |
| **CPLEX** | proprietär, kein Browser | kommerziell | — | LP, MIP, QP | — | — | **Ausgeschlossen** |
| **Z3** (Satisfiability) | [z3.wasm](https://github.com/cpitclaudel/z3.wasm) | MIT | — | SMT, nicht dediziert LP/MIP | groß | für unseren Use Case ungeeignet (SMT ≠ Leximin-Optimierung) | Nein |

---

## 2. Detailanalyse pro Kandidat

### 2.1 HiGHS (`highs-js`, npm `highs`) - primärer Kandidat

**Repo:** https://github.com/lovasoa/highs-js · **npm:** `highs` · **Demo:** https://lovasoa.github.io/highs-js/

- **Lizenz:** MIT (für Wrapper *und* eingebetteten HiGHS-Core). Upstream HiGHS (ERGO-Code) ist ebenfalls MIT. Keine Copyleft-Bindung.
- **Build:** C++ HiGHS → Emscripten → WASM. Der offizielle HiGHS-Repo selbst enthält ein `build_webdemo.sh`, ist also WASM-aware, wird aber nicht selbst als npm-Paket publiziert - dafür existiert `highs-js` als etablierter Community-Port.
- **Letzte Version:** v1.8.0 (npm, 5. Nov 2024) bindet HiGHS 1.8.0 ein. 25 Releases insgesamt, 122 Commits, 76 Stars. Issues wurden noch im April 2026 neu geöffnet → aktiv beobachtet.
- **Problemklassen:** LP, QP, MIP. Eingabe via JS-Objekt oder CPLEX-LP-Format-String.
- **TypeScript:** `types.d.ts` im Paket enthalten.
- **Seed / Determinismus:** HiGHS-Option `random_seed` (Int 0..2147483647, Default 0) ist über die JS-API als Option durchreichbar. Zusammen mit stabilem Input-Marshalling reproduzierbar.
- **Threading:** Keine Doku zu SharedArrayBuffer. Der Emscripten-Build läuft standardmäßig single-threaded → kein COOP/COEP nötig → **statisches Hosting ohne Spezialheader möglich**.
- **Bundle-Größe:** WASM-Datei ist in `node_modules/highs/build/highs.wasm`. Keine offizielle Größenangabe in der Doku, basierend auf Emscripten-Builds vergleichbarer C++-Solver ist **3-5 MB unkomprimiert, ~1,5-2 MB gzip** realistisch. Sollte lazy über `locateFile`-Callback nachgeladen werden.
- **Bekannte Schwachstellen (aus Issues):**
  - [Issue #9](https://github.com/lovasoa/highs-js/issues/9): OOM-Fehler bei 350 Rows × 388 Cols × 1330 Non-Zeros mit 248 Integer-Vars, obwohl CLI denselben Fall in 2,67 s löst - **das ist unsere Problem-Größenordnung und muss im Prototyp verifiziert werden**.
  - [Issue #3](https://github.com/lovasoa/highs-js/issues/3): Historischer Bug ab 32 Vars (2021); Status in späteren Releases unklar, aber nicht mehr als offenes Hindernis sichtbar. Bei v1.8.0 sollte das gefixt sein.
  - [Issue #13](https://github.com/lovasoa/highs-js/issues/13): QP ohne positiv-semidefinite Hessian liefert Non-Error-Output (für uns irrelevant, wir brauchen kein QP).
- **Produktions-Einsatz im Web:** Keine namhaften Referenzen in der offiziellen Doku, aber 4300 npm-Downloads/Woche deuten auf diverse professionelle Integrationen hin (Optimierungs-Dashboards, Planungs-Tools).

### 2.2 GLPK (`glpk.js`) - zweitbeste, blockiert durch Lizenz

**Repo:** https://github.com/jvail/glpk.js · **npm:** `glpk.js` · **Demo:** http://jvail.github.io/glpk.js/

- **Lizenz:** **GPL-3.0** (über das eingebettete GLPK). **Zentrale Konsequenz:** Jede Web-App, die `glpk.js` in ihr Frontend-Bundle einbindet und das Bundle an Endnutzer ausliefert, verbreitet GLPK - und muss damit den kompletten Source-Code unter einer GPL-kompatiblen Lizenz bereitstellen. Für ein kommerzielles SaaS-Produkt meist ein Ausschlussgrund; für ein Open-Source-Tool (z. B. von einer NGO gehosteter „Sortition-Planner") ist es dagegen völlig unproblematisch - kann sogar Vorteil sein.
- **Letzte Aktivität:** 94 Commits auf master, 131 Stars. Die großen Design-Issues (v4 API, GLPK-5-Update) sind von 2021-2023, aktive Pflege wirkt nachgelassen, aber das Paket ist stabil und die GLPK-Bibliothek selbst wird vom GNU-Projekt gepflegt.
- **Problemklassen:** LP, MILP. Kein QP.
- **TypeScript:** Volle Typdefinitionen (separate Dateien für Shared Types, Browser-Async-API und Node-Sync-API).
- **API:** Bietet *sowohl* synchrone Node-API *als auch* asynchrone Browser-API (letztere mit Web-Worker-Integration für non-blocking UI).
- **Bundle-Größe:** 2,67 MB unpacked (npm).
- **Performance (aus YALPS-Benchmarks):**
  - Monster 2 (888 Constraints, 924 Vars, 112 Ints): 116 ms - schneller als jsLPSolver, 2,15× langsamer als YALPS.
  - Vendor Selection (1641 Constraints, 1640 Vars, 40 Ints): **61 ms** - schneller als alle Alternativen.
  - GLPK ist bei integer-lastigen Problemen deutlich schneller als die reinen JS-Solver.
- **Seed/Determinismus:** Keine explizite Seed-Option in der JS-Doku sichtbar; GLPK ist deterministisch bei identischem Input und identischen Options, aber Ties können nicht-deterministisch aufgelöst werden.

### 2.3 YALPS - reiner JS, für unser Problem zu klein

**Repo:** https://github.com/IanManske/YALPS · **npm:** `yalps`

- **Lizenz:** MIT. Pflegezustand: „bug fixes and security updates", keine neuen Features geplant. Letzte Version v0.6.4 (Dez 2025).
- **Problemklassen:** LP, Integer LP, MIP.
- **Expliziter Scope-Hinweis in der README:** „still geared towards small problems [...] a few thousand or less [Constraints und Vars], a few hundred integer variables at the most" - **unser Problem überschreitet das klar**.
- **Dense-Matrix-Representation:** Speicher wächst O(n·m); für 5000×5000 bereits 25 Mio. Zellen × 8 Bytes = 200 MB - im Browser heikel.
- **TypeScript:** Nativ in TS geschrieben, hervorragende Typen.
- **Einsatzempfehlung der YALPS-Autoren selbst: „für sehr große oder stark integer-lastige Probleme glpk.js verwenden"** - das ist genau unser Fall.

### 2.4 jsLPSolver / javascript-lp-solver - ausgeschlossen

- **Lizenz:** Unlicense (unproblematisch).
- **Aktiv:** v1.0.3 (Jan 2026).
- **Dokumentierte Fehler bei unserer Größenordnung:**
  - [Issue #43 „Solver Freezes?"](https://github.com/JWally/jsLPSolver/issues/43): 500 Constraints × 5000 Vars lässt die Seite einfrieren.
- **Performance:** 3-6× langsamer als YALPS/glpk.js in den veröffentlichten Benchmarks.
- **Fazit:** Für Spielzeug-LPs ok, für Produktiv-Leximin mit 5000 Binärvariablen nicht geeignet.

### 2.5 lp_solve, CBC, Gurobi, CPLEX - nicht verfügbar

- **lp_solve in WASM:** Es existiert ein öffentliches Gist ([fhk/0aba10a...](https://gist.github.com/fhk/0aba10a289a5e6b253fb2abf268469ac)), das das Kompilieren dokumentiert - **aber kein gepflegtes npm-Paket, keine Community**, keine Version. Experimentell; für ein Produkt nicht verantwortbar.
- **CBC (COIN-OR):** Es gibt keinen ernsthaften WASM-Build. CBC ist außerdem auf Mittelmann-Benchmarks mittlerweile deutlich schlechter als HiGHS (siehe [Quelle 5]) - kein Grund, den Aufwand eines Eigen-Ports zu rechtfertigen.
- **Gurobi/CPLEX:** Kommerzielle closed-source Server-Systeme mit Node-/Python-Bindungen, Lizenzen sind an Host-ID/Netzwerk gebunden. Im Browser strukturell nicht lieferbar. Auch wenn sie es wären: Lizenzkosten pro Endgerät-Deployment unrealistisch.

### 2.6 Z3 (SMT, nicht LP)

- [z3.wasm](https://github.com/cpitclaudel/z3.wasm) existiert und ist MIT-lizenziert, aber Z3 ist ein SMT-Solver, kein LP/MIP-Solver. Leximin mit Wahrscheinlichkeits-Verteilungen und kontinuierlichen Variablen ist in SMT modellierbar, aber enorm langsamer als ein LP-Solver. **Kein sinnvoller Kandidat.**

---

## 3. Performance-Bewertung für unseren Use Case

**Problemstellung (Flanigan-Leximin, aus `pgoelz/citizensassemblies-replication`):**
- Pool von 200 bis ~2000+ Kandidaten, Panel-Größe 20-200.
- Die Flanigan-Autor:innen berichten: ein 200er-Pool/20-Panel braucht nativ mit Gurobi ~6,4 s pro Leximin-Lauf; 2000-Pool/200-Panel „ca. eine Stunde bei Erstausführung" - **das ist die obere Grenze des dokumentierten nativen Aufwands**.
- Multiplicative-Weights-Phase läuft bis zu 600 Runden, jede Runde ein LP/MIP-Solve.
- Der leximin-äußere Loop braucht zusätzlich *k* weitere LP-Solves, wobei *k* = Anzahl distinkter Wahrscheinlichkeitsniveaus (empirisch durchschnittlich < 3).

**Übersetzung auf Browser-HiGHS-WASM:**
- WASM-Overhead: typisch **1,45-2,5× langsamer als native C++** (USENIX Jangda et al.).
- Damit Projektion für 200/20-Fall: 6,4 s × 2× ≈ **12-15 s im Browser**. Akzeptabel.
- Für 2000/200-Fall: „1 h nativ" × 2× = **2+ h im Browser** - **nicht akzeptabel** für eine UX ohne Fortschrittsanzeige und ohne Web-Worker.
- **Für Buergerrat-typische Größen (ein typischer Bürgerrat in Österreich: 200-1000 Pool, 20-50 Panel) erwartbar: 10-60 s Gesamtlaufzeit** - **tragfähig**, aber pflichtgemäß mit Fortschrittsanzeige und Web-Worker-Isolation.

**Speicher:**
- WASM32-Heap-Limit: **4 GB** (in Chrome/Firefox seit ~2020), in Praxis oft auf 2 GB limitiert bei älteren Browsern. Für ein Leximin-Problem mit ~5000 Binärvariablen × ~200 Constraints sollte das reichen, **aber wir haben einen dokumentierten OOM-Bericht bei nur 350 Rows × 388 Cols × 248 Ints in `highs-js`** - das ist ernstzunehmen. Ursache wahrscheinlich ein Leak im Marshalling-Layer, nicht HiGHS selbst.

**Empirische Benchmark-Lücke:** Ich habe **keine publizierten Benchmarks `highs-js` vs. natives HiGHS** auf MIPLIB-artigen Instanzen gefunden. Die obige 2×-Schätzung stützt sich auf generische WASM-Studien (Jangda USENIX 2019). Ein spezifischer Sortition-Benchmark ist nötig.

**Benchmark-Empfehlung (unumgänglich vor Feature-Freeze):**
1. Drei Real-Datensätze aus `pgoelz/citizensassemblies-replication`: small (200), mid (500), large (2000) Pool.
2. Je einmal nativ (Python + HiGHS) und einmal in Node + `highs-js` (gleicher WASM wie Browser).
3. Ziel-Metrik: Verhältnis. Red Flag bei > 5×, dann architektonisch umdenken (z. B. Problem-Größe beschränken, Quoten vereinfachen, oder Alpha-Feature mit Server-Fallback).

---

## 4. Lizenz-Implikationen (entscheidend)

| Solver | Lizenz | Auswirkung auf unser Produkt |
|---|---|---|
| **HiGHS / `highs-js`** | MIT | **Unproblematisch**. Frei kombinierbar mit jeder Lizenz, proprietär oder offen. Attribution im About-Dialog reicht. |
| **GLPK / `glpk.js`** | **GPL-3.0** | **Blocker für proprietäres SaaS**. Beim Ausliefern des Frontend-Bundles an Endnutzer wird GLPK verbreitet → das komplette kombinierte Werk muss GPL-3.0-kompatibel sein → Sourcen, auch des Frontends, müssen offengelegt werden. Für ein Open-Source-Tool kein Problem. |
| **YALPS** | MIT | Unproblematisch, aber zu klein für unsere Skala. |
| **jsLPSolver** | Unlicense | Unproblematisch, aber instabil. |
| **lp_solve** | LGPL-2.1 | LGPL ist bei statisch gelinktem WASM in einer SPA mehrdeutig (es gibt kein dynamisches Linking in WASM). Risiko-Zone. |
| **CBC** | EPL-2.0 | EPL-Verbreitung verträgt sich gut mit Kommerz, aber kein gepflegter WASM-Build → irrelevant. |
| **Gurobi/CPLEX** | kommerziell | Kein Browser-Einsatz. |

**Klare Empfehlung:** HiGHS/MIT als einzige mit proprietären Business-Modellen vollständig kompatible Option.

---

## 5. Risiken / Showstopper

| Risiko | Schweregrad | Mitigation |
|---|---|---|
| **OOM bei unserer realistischen Problemgröße in `highs-js`** (dokumentiert bei 350×388 MIP) | **HOCH** | Benchmark auf realen Bürgerrat-Daten noch vor Architektur-Commit. Evtl. Upstream-PR zur Memory-Effizienz. Fallback: Problem kleiner zerlegen, Quoten-Relaxation. |
| **Gesamt-Laufzeit für 2000er-Pool potenziell zu hoch** (Projektion: Stunden) | MITTEL | UI-Design: Web-Worker + Fortschrittsanzeige + Abbruch-Button. Ggf. Cap auf 1000 Personen im Pool (Großteil der Bürgerräte in AT passt). |
| **Bundle-Größe 3-5 MB WASM plus JS-Glue** | NIEDRIG | Lazy-Load via `locateFile`; Service-Worker-Cache. Einmal-Download ist bei einem Fachtool zumutbar. |
| **Startup-Zeit WASM-Initialisierung** (100-500 ms typisch) | NIEDRIG | Preload beim App-Start, nicht erst bei Klick auf „Auswählen". |
| **SharedArrayBuffer / COOP / COEP** | **NIEDRIG** (wenn single-threaded Build) | `highs-js` default single-threaded → KEIN COOP/COEP nötig → statisches Hosting (GitHub Pages, Netlify, S3+CloudFront) reicht. Falls später Threading gewünscht: COOP/COEP via Service-Worker möglich (siehe Tomayac Blog), aber iOS-Safari zickig. |
| **Determinismus der Losung (juristisch relevant bei Bürgerrat!)** | **HOCH** (fachlich) | HiGHS-`random_seed` setzen; für Multiplicative-Weights-Phase separaten seedbaren RNG (z. B. `seedrandom`). Test: identischer Seed + identischer Input → identisches Panel. Dieses End-to-End-Determinismus-Verhalten muss im Prototyp explizit verifiziert werden (Floating-Point-Unterschiede zwischen Browsern sind bei WASM IEEE-754 minimal, aber nicht null). |
| **Lizenz-Falle GLPK** | HOCH, aber vermeidbar | GLPK nicht einbinden. Ausschließlich MIT-lizenzierten HiGHS verwenden. |
| **Browser-Kompatibilität (Safari iOS, ältere Android)** | MITTEL | WASM ist seit 2017 universell, aber WASM32-Heap bei mobilem Safari historisch stark limitiert (<1 GB). Da Sortition ein Desktop-Workflow für Kommunen ist, akzeptables Risiko. Browser-Matrix explizit dokumentieren. |
| **Maintenance-Risiko `highs-js`**: Ein-Person-Projekt (lovasoa) | MITTEL | Upstream HiGHS ist gut gepflegt (ERGO-Code, Edinburgh). Falls `highs-js` stalled: Eigen-Build via offizielles HiGHS-`build_webdemo.sh` ist dokumentierte Option. |

---

## 6. Empfehlung für den Prototyp

**Primärer Solver:** `highs-js` / npm `highs` (Version 1.8.0 oder neuer, sobald v2 kommt).

**Architektur-Skizze:**
1. **Web-Worker** hosted `highs-js`, damit UI responsiv bleibt.
2. **Leximin-Runner in reinem TS**: portiert die Multiplicative-Weights-Schleife aus `pgoelz/citizensassemblies-replication` (Python) nach TypeScript; ruft in jeder Iteration `highs-js.solve(lp)` auf.
3. **Seed-Kontrolle**: eine einzige User-setzbare Seed (UUID oder Integer), die sowohl an HiGHS (`random_seed`) als auch an den JS-RNG (`seedrandom(seed)`) weitergegeben wird. UI zeigt Seed zur Reproduktion an.
4. **Größenlimit im Frontend**: Cap auf 1500-2000 Pool-Personen für Phase 1. Darüber: Warnung, dass Laufzeit exponentiell steigt und Ergebnis unter Vorbehalt steht.
5. **Fortschrittsanzeige**: HiGHS-Callbacks werden aktuell von `highs-js` nicht voll exponiert - als Workaround Zwischenmeldungen aus der Multiplicative-Weights-Schleife (Runde X von 600).
6. **Service-Worker-Cache** für die WASM-Datei → Single-Download.

**Pflicht-Benchmark vor Freeze (Phase 0):**
- Repro 3 Instanzen aus Flanigan-Replication-Repo in Node + `highs-js`, vergleichen mit nativ Python + HiGHS.
- Abbruchkriterien definieren: „Wenn Faktor > 5× oder > 3 min Wall-Clock auf 500er-Pool, Re-Design."

**Backup-Plan:**
- Falls `highs-js` im Benchmark durchfällt: eigener HiGHS-Build via offiziellem `build_webdemo.sh` (direkt aus `ERGO-Code/HiGHS`-Repo), ggf. mit `-O3` und Memory-Tuning.
- Falls auch das nicht reicht: **zentraler Showstopper für rein browserseitige Architektur**. Dann ist die Ausgangsannahme der Machbarkeitsstudie zu revidieren: Alternative Architektur mit temporärem lokalem Rust/WASI-Worker via Tauri oder lokaler Solver-Binary (weiterhin ohne Cloud-Backend, aber Installationszwang statt pure Web-App).

**Nicht empfohlen:**
- YALPS / jsLPSolver → zu klein.
- `glpk.js` → Lizenzkonflikt, falls proprietäres Business-Modell geplant.
- CBC/lp_solve/Gurobi/CPLEX → im Browser schlicht nicht verfügbar.

**Offene Fragen, die die Recherche NICHT abschließend beantworten kann:**
- Wie viele echte Leximin-Iterationen treten für österreichische Melderegister-Stratifizierung mit realistischen Quoten-Sets (Alter × Geschlecht × Bundesland × Bildung) wirklich auf?
- Gibt es einen gepflegten „multiplicative-weights-leximin"-Kern als TS-Library, oder muss die Python-Referenz aus `citizensassemblies-replication` vollständig portiert werden? (Nach aktueller Kenntnis: **muss portiert werden** - kein TS/JS-Leximin-Port bekannt.)
- Verhält sich `highs-js` deterministisch zwischen Chrome/Firefox/Safari bei identischem Seed? Muss empirisch validiert werden.

---

## Quellen

1. [GitHub: lovasoa/highs-js](https://github.com/lovasoa/highs-js) - Haupt-Repo, MIT, v1.8.0 Nov 2024.
2. [npm: highs](https://www.npmjs.com/package/highs) - 4.300 Downloads/Woche.
3. [GitHub: lovasoa/highs-js Issue #9 (OOM bei 350×388 MIP)](https://github.com/lovasoa/highs-js/issues/9).
4. [GitHub: lovasoa/highs-js Issue #3 (historischer 32-Var-Bug)](https://github.com/lovasoa/highs-js/issues/3).
5. [GitHub: ERGO-Code/HiGHS](https://github.com/ERGO-Code/HiGHS) - Upstream HiGHS, MIT, v1.14.0 April 2026.
6. [HiGHS Options-Dokumentation](https://ergo-code.github.io/HiGHS/dev/options/definitions/) - `random_seed` Option.
7. [HiGHS Newsletter Mai 2025 (PDF)](https://highs.dev/assets/HiGHS_Newsletter_25_0.pdf) - Mittelmann-Benchmarks.
8. [Mittelmann-Benchmarks Visualisierung](https://mattmilten.github.io/mittelmann-plots/) - HiGHS vs. Gurobi MIP-Factor ~10×.
9. [GitHub: jvail/glpk.js](https://github.com/jvail/glpk.js) - GPL-3.0, 131 Stars.
10. [npm: glpk.js](https://www.npmjs.com/package/glpk.js/v/4.0.1) - 2,67 MB unpacked.
11. [GitHub: IanManske/YALPS](https://github.com/IanManske/YALPS) - MIT, explizite Scope-Hinweise.
12. [npm: yalps](https://www.npmjs.com/package/yalps) - v0.6.4 Dez 2025.
13. [GitHub: JWally/jsLPSolver](https://github.com/JWally/jsLPSolver) - Unlicense, v1.0.3 Jan 2026.
14. [GitHub: jsLPSolver Issue #43 (Freeze bei 500×5000)](https://github.com/JWally/jsLPSolver/issues/43).
15. [GitHub: DominikPeters/lp-model](https://github.com/DominikPeters/lp-model) - JS-Modellierungs-Schicht.
16. [Gist: lp_solve → WASM (experimentell)](https://gist.github.com/fhk/0aba10a289a5e6b253fb2abf268469ac).
17. [GitHub: cpitclaudel/z3.wasm](https://github.com/cpitclaudel/z3.wasm) - Z3 SMT WASM (für uns irrelevant, Referenz).
18. [Flanigan et al. Nature 2021 - Fair algorithms for selecting citizens' assemblies](https://www.nature.com/articles/s41586-021-03788-6).
19. [GitHub: pgoelz/citizensassemblies-replication](https://github.com/pgoelz/citizensassemblies-replication) - Referenz-Leximin-Code, Runtime-Daten (6,4 s small / 1 h large).
20. [GitHub: sortitionfoundation/stratification-app](https://github.com/sortitionfoundation/stratification-app) - Produktions-GUI der Sortition Foundation.
21. [sortitionfoundation.github.io/sortition-algorithms](https://sortitionfoundation.github.io/sortition-algorithms/concepts/) - neue Python-Library.
22. [Python-MIP Doku](https://python-mip.readthedocs.io/en/latest/intro.html) - HiGHS als First-Class Backend seit 1.17.
23. [panelot.org](https://www.peoplepowered.org/resources-content/panelot-random-selection-algorithm) - Online-Tool (server-seitig).
24. [USENIX ATC '19: Jangda et al. „Not So Fast: Analyzing the Performance of WebAssembly vs. Native Code"](https://www.usenix.org/conference/atc19/presentation/jangda) - WASM-Overhead-Studie.
25. [V8-Blog: Up to 4 GB Memory in WebAssembly](https://v8.dev/blog/4gb-wasm-memory) - WASM32-Heap-Limit.
26. [MDN: SharedArrayBuffer](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/SharedArrayBuffer) - COOP/COEP-Anforderung.
27. [Tomayac: COOP/COEP auf Static Hosting via Service Worker](https://blog.tomayac.com/2025/03/08/setting-coop-coep-headers-on-static-hosting-like-github-pages/).
28. [web.dev: Cross-Origin Isolation (COOP/COEP)](https://web.dev/articles/coop-coep).
29. [Emscripten Pthreads-Doku](https://emscripten.org/docs/porting/pthreads.html) - Threading erfordert SharedArrayBuffer.
30. [Lexicographic max-min optimization (Wikipedia)](https://en.wikipedia.org/wiki/Lexicographic_max-min_optimization) - Leximin-Iterationsbegriff.
31. [Kurokawa/Procaccia/Shah: Leximin Allocations in the Real World](https://www.cs.cmu.edu/~dkurokaw/publications/leximin.pdf).
32. [HiGHS Discussion #1683: Open-source MIP vs. commercial](https://github.com/ERGO-Code/HiGHS/discussions/1683) - Performance-Gap-Diskussion.
