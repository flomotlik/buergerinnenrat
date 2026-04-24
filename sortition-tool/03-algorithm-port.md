# Algorithmus-Port: Leximin-Sortition nach JS/TS

> Stand: 2026-04-24
> Teil-Report zur Produkt-Machbarkeitsstudie "browser-basierte Sortition-Web-App" für Bürgerräte
> Bezieht sich auf: `sortitionfoundation/stratification-app` (Python, GPL-3.0) und Flanigan et al., *Nature* 2021

---

## TL;DR

- **Leximin in pure JS/TS neu zu schreiben ist machbar, aber teuer.** Realistisch **3–5 Personenwochen** bis belastbar, plus 1–2 Wochen Regressionstests gegen Python-Referenz. Der Algorithmus braucht **MIP** (nicht nur LP) — das schränkt Solver-Auswahl ein auf **`highs-js`** oder **`glpk.js`**.
- **Es gibt keine öffentliche JS/TS-Leximin-Implementation.** Weder Paul Gölz (panelot.org ist closed-source mit Python-Backend), noch OECD/Democracy R&D, noch die Sortition Foundation haben eine veröffentlicht. Die gesamte Forschungs-Community arbeitet in Python mit Gurobi/CBC.
- **Das Python-Original benötigt für Leximin zwingend Gurobi** (kommerziell, akademische Lizenz kostenlos). Gurobi gibt es **nicht** als WebAssembly-Build. Der Python-Port in JS muss also auf HiGHS (MIP-fähig, open source) ausweichen — damit reproduziert man die Referenz-Semantik, nicht die Referenz-Zahlen bit-exakt.
- **Empfehlung: NICHT portieren.** Stattdessen **Pyodide** mit dem originalen Python-Code im Browser laden. Das ist nicht ohne Haken (CBC-Wheel-Problem, ~10 MB Download, Gurobi-Alternative HiGHS nötig), aber *garantiert* Paper-Treue und spart 4–6 Wochen Port-Arbeit plus die ewige Validierungsschuld. Zweitbeste Variante: **Maximin statt Leximin** — eine einzige LP-Runde, keine Column-Generation-Schleife, ausreichend für ~95% aller Panels, mit reinem `highs-js` in ~1–2 Wochen machbar. Leximin nur dann, wenn als Fairness-Gold-Standard öffentlich verlangt.
- **Lizenz:** GPL-3.0 der `stratification-app` bindet bei wörtlicher Übersetzung. Das Paper selbst ist frei zitier- und nachbaubar; eine saubere Room-Reimplementation nur auf Basis des Nature-Papers + Supplementary + Formeln ist **legal und empfohlen**, wenn Port sein muss.

---

## 1. Algorithmus-Überblick

### 1.1 Leximin

Flanigan et al. formulieren Leximin als **iteratives LP-Optimierungsproblem über Verteilungen auf Komitees**:

1. **Kernvariable**: `π_i` = Wahrscheinlichkeit, dass Person *i* in das gewählte Panel aufgenommen wird. Ziel: maximiere `min_i π_i`, bei Ties den zweitkleinsten Wert etc., unter **Quoten-Constraints**.
2. **Dualität**: Das primale LP hat exponentiell viele Variablen (eine pro gültiges Komitee — alle Teilmengen der Größe *k* aus *N*, die die Quoten erfüllen). Gelöst wird das **duale LP** mit **Column Generation**.
3. **Separation Oracle**: Die Generierung neuer Komitees (= neue Variablen/Spalten) erfolgt durch **Lösen eines ILP/MIP** — also echte Mixed Integer Programmierung, nicht nur LP. Dieses MIP ist das eigentliche Rechen-Bottleneck.
4. **Lexikografisches Fortschalten**: Wenn die minimale Wahrscheinlichkeit gefunden ist, werden alle Personen mit diesem Wert „eingefroren" und die nächste Runde maximiert das Minimum über den restlichen Personen. Das wiederholt sich, bis alle `π_i` fixiert sind.

**Code-Referenz** (`stratification.py`, Zeilen grob):

| Funktion | Zeile | Zweck | Solver |
|---|---|---|---|
| `find_distribution_leximin` | ~1560 | Outer-Loop, ruft Stages | Gurobi (zwingend) |
| `_dual_leximin_stage` | ~1735 | Eine Leximin-Iteration | Gurobi (LP) |
| `_generate_initial_committees` | ~1635 | Multiplicative-Weights-Seeding, `3 * N` Runden | `python-mip` (MIP) |
| `_setup_committee_generation` | ~2050 | ILP-Oracle für Column Generation | `python-mip` (MIP) |
| `pipage_rounding` | ~1090 | Marginals → konkretes Panel | keiner (reine Arithmetik + PRNG) |
| `_relax_infeasible_quotas` | ~2113 | Relaxation bei Infeasibility | `python-mip` (MIP) |

### 1.2 Rounding

- **Pipage-Rounding** (Ageev/Sviridenko 2004): konvertiert fraktionale Marginals `π_i` ∈ [0,1] in ein konkretes 0/1-Panel, mit Erwartung **= Marginals** und Quoten-Erhaltung (bei linearen Quoten nachweisbar). Im Code ~40 Zeilen, keine externe Library, nur `random.random()` und Arithmetik. **Trivial nach TS portierbar** (< 1 Tag inklusive Tests).
- **Beck-Fiala-Rounding**: wird im aktuellen `stratification-app` **nicht verwendet** — nur Pipage. Beck-Fiala ist ein theoretisches Fairness-Bound-Argument im Paper, keine Produktionskomponente.
- **Lottery-Rounding** (`lottery_rounding`, ~1155): alternative Methode, wandelt eine Verteilung über Komitees in wiederholte Auswahlen um. Ebenfalls rein kombinatorisch, portierbar.

### 1.3 Komplexität

**Empirisch** (aus Paper + Code):

- **LP-Iterationen (Outer Loop Leximin)**: bis zu `N` Iterationen (eine pro gefreezter Person), typisch 10–50 für N ≈ 500–2000 Rückmelder. Keine theoretische polynomiale Schranke.
- **Column Generation Inner Loop**: unbeschränkt, konvergiert per Epsilon-Toleranz (`EPS = 0.0005` im Code). Typisch 20–200 MIP-Calls pro Outer-Iteration.
- **Jeder MIP-Call**: löst ein ILP über `N` binäre Variablen (eine pro Person) mit `K` Quoten-Constraints (K = Summe aller Kategorien-Limits, typisch 20–50). NP-hart im Worst Case, praktisch in Sekunden bis Minuten mit Gurobi/CBC.
- **Seeding-Phase**: `3 * N` Multiplicative-Weights-Runden, jede mit einem MIP-Call.

**Gesamt-Größenordnung**: Für N=1000, K=30, Panel-Größe 50 rechnet die Python-Referenz mit CBC-Default-Setup ca. **30 Sek bis 5 Min**. Mit Gurobi 10–100× schneller. Die Performance hängt stark vom MIP-Solver ab.

**Skalierung**:
- N (Rückmelder): MIP-Lösungszeit wächst superlinear, in praktischen Bereichen ~ O(N · log N) bis O(N²) je MIP.
- K (Quoten-Dimensionen): linear im LP, aber MIP-Schwierigkeit steigt bei vielen überlappenden Constraints.
- Panel-Größe *k*: konstanter Einfluss, 50 vs. 200 macht wenig Unterschied.

**Numerische Stabilität**:
- EPS-Toleranz `0.0005` für Termination — unterhalb davon kann die Duale nicht zuverlässig aufgelöst werden.
- Pipage-Rounding mit weitere Toleranz `EPS2` für Boundary-Fälle (`prob > 1 - EPS2` → deterministisch wählen).
- LP-Duale sind numerisch sensibel — Gurobi's presolve ist hier besser als HiGHS'. Bei Übersetzung nach `highs-js` ist eine höhere Toleranz (z.B. EPS = 0.001) zu erwarten und die Regressionstests müssen das zulassen.
- CVXPY wird nur für Nash (log-konkaves Programm) verwendet, nicht für Leximin/Maximin.

---

## 2. Existierende Portierungen / Libraries

### 2.1 Gezielte Suche nach JS/TS-Ports

| Suchbegriff | Ergebnis |
|---|---|
| GitHub `leximin sortition typescript` | keine Treffer |
| GitHub `citizens assembly selection javascript` | keine relevanten Treffer |
| GitHub `stratified sampling browser` | nur naive Samplers (kein Leximin) |
| Paul Gölz Public Repos | nur [pgoelz/citizensassemblies-replication](https://github.com/pgoelz/citizensassemblies-replication), Python + Gurobi |
| Sortition Foundation Org | 10 Repos, **9× Python, 1× JS** (`sveltia-cms-auth` — unrelated Auth-Wrapper) |
| OECD / Democracy R&D | kein offizieller Algorithmus-Standard, empfehlen `stratification-app` |

**Fazit: Es existiert aktuell keine öffentliche JS/TS-Implementation von Leximin-Sortition.** Weder Academic (Gölz/Flanigan/Procaccia), noch Industry (Sortition Foundation, panelot.org), noch Civic-Tech (Democracy R&D, OECD, mySociety). Das gesamte Feld ist Python + Gurobi/CBC.

### 2.2 panelot.org — Reverse Engineering

- panelot.org wurde von Flanigan/Gölz/Gupta/Procaccia/Rusak 2020 gebaut (Quelle: Nature-Paper Anhang).
- **Closed Source**, kein Repo auffindbar, keine API.
- Frontend-Inspektion (über Web): Upload-Formulare, Server-Side Python — der Rechenkern läuft auf Gölz' Infrastruktur, **nicht im Browser**.
- Gleiches Algorithm-Ökosystem wie `stratification-app` (gemeinsamer Co-Autor Gölz).

**Kein JS-Port zu ernten.**

### 2.3 Swister-Projekt: `sortitionfoundation/sortition-algorithms`

Dies ist ein seit 2025 aktives **neues Python-Package** (extrahiert aus `stratification.py`), das die Algorithmen als saubere Library verpackt. Dokumentiert unter <https://sortitionfoundation.github.io/sortition-algorithms/concepts/>. Auch Python, GPL-3.0. Wenn man portiert: **diese Library, nicht die alte `stratification.py`**, als Referenz nehmen — bereinigter und besser strukturiert.

### 2.4 LP/MIP-Libraries in JS/TS

| Library | Solver-Kern | MIP? | WASM? | Reife |
|---|---|---|---|---|
| [`highs-js`](https://github.com/lovasoa/highs-js) | HiGHS (Edinburgh) | ja | ja | gut, MIT, aktiv |
| [`glpk.js`](https://github.com/jvail/glpk.js) | GLPK | ja | ja | reif, GPL-2.0 |
| [`javascript-lp-solver`](https://www.npmjs.com/package/javascript-lp-solver) | pure JS Simplex | teilweise (Branch & Bound) | nein (pure JS) | einfach, für Toys |
| [`jsLPSolver`](https://github.com/JWally/jsLPSolver) | pure JS | teilweise | nein | Hobby |

**Empfehlung: `highs-js`.**
- MIT-Lizenz (kompatibel mit proprietärer Produkt-Entwicklung, falls relevant).
- HiGHS ist state-of-the-art Open-Source-Solver, Performance nahe Gurobi auf vielen Benchmarks.
- Unterstützt MIP (zwingend für Leximin-Column-Generation).
- API: LP-File-Format-String → Solve. Gut für Unit-Tests mit Fixture-Strings.
- Nachteil: Solver ist nicht 100% deterministisch (MIP-Branching kann je nach Presolve variieren). Für Reproduzierbarkeit muss `seed` gesetzt werden.

`glpk.js` wäre zweite Wahl (GPL-2.0 ist dann ein Lizenz-Thema für den App-Code insgesamt).

### 2.5 Reine JS-Libraries für stratifiziertes Sampling

Die Pakete `stratified-sample`, `proportional-allocation` etc. machen **naives proportionales Sampling** — sie lösen das Problem der ungleichen Auswahlwahrscheinlichkeiten aus dem Nature-Paper **nicht**. Also unbrauchbar, wenn man "fair" nach Stand der Wissenschaft sein will.

---

## 3. Vereinfachte Varianten

| Variante | Fairness-Niveau | Rechen-Aufwand | JS/TS-Machbarkeit |
|---|---|---|---|
| **Leximin** | Gold-Standard (Nature 2021) | Outer-Loop: N Iterationen × Column Generation × MIP | hart: ~3–5 Wochen |
| **Maximin** | Sehr gut (nur 1. Moment) | 1 LP (mit Column Generation) + 1 Extraktion | medium: ~1–2 Wochen |
| **Nash Welfare** | Gut, anderes Fairness-Kriterium | Konvex-LP via log, 1 Solve | hart: braucht convex-LP (CVXPY-Äquivalent in JS existiert quasi nicht) |
| **Quoten-Rejection-Sampling** | Niedrig — verletzt Paper-Garantien | trivial | trivial: < 1 Tag |
| **Legacy-Quoten** (stratification-app) | Nicht nachweisbar fair | mittel | medium: ~1 Woche |

### 3.1 Maximin — der pragmatische Sweet Spot

**Maximin** löst das Hauptproblem (verhindert Personen mit ~0% Auswahlchance) durch Maximierung des Minimums — **ohne** das lexikografische Fortschalten über alle Ranks. Ergebnis: alle π_i haben mindestens den gefundenen Min-Wert; darüber gibt es mehr Varianz als bei Leximin.

- **Warum praktisch ausreichend**: Für typische deutsche Kommunen (3–5 Stratifizierungs-Dimensionen, N ≈ 300–1500, k ≈ 30–100) sind die beiden Algorithmen empirisch sehr nah beieinander. Das Paper (Fig. 2) zeigt maximin-Outputs als bereits deutlich besser als Legacy und nur marginal schlechter als Leximin.
- **Technisch einfacher**: 1 LP statt N Iterationen. Column Generation bleibt (MIP-Oracle), aber kein Outer-Loop mit Freeze-Logik.
- **Im Code**: `find_distribution_maximin` ~1800, nutzt `python-mip`, kein Gurobi-Zwang. Entspricht einem echten "Lite"-Pfad.

### 3.2 Rejection Sampling — was "Es geht LOS" möglicherweise macht

Die App von "Es geht LOS" ist nicht öffentlich dokumentiert (Report 02). Plausibel ist ein **Rejection-Sampling-Ansatz**:
1. Ziehe zufällig *k* Leute aus dem Rücklauf.
2. Prüfe alle Quoten.
3. Wenn verletzt → verwerfen, goto 1. Wenn erfüllt → übernehmen.

**Vorteile**: trivial zu verstehen, trivial zu portieren, deterministisch mit Seed reproduzierbar.
**Nachteile**:
- Kann bei engen Quotenkorridoren **exponentiell viele Versuche** brauchen (Infeasibility verschleppt).
- Wahrscheinlichkeits-Verteilung über Personen ist nicht maximin — Personen in seltenen Kategorien werden systematisch überproportional häufig gezogen, in häufigen Kategorien unter.
- **Nicht Nature-Paper-konform**, aber transparent und in DE juristisch nicht angreifbar, solange Quoten erfüllt werden.

### 3.3 Bewertung: Leximin vs. Maximin vs. Rejection für dt. Kommunen

- **Verbindliche Bundes-Bürgerräte (z.B. BR Ernährung)**: faktisch Leximin via Sortition Foundation. Hier also Referenz-Standard.
- **Kommunale Bürgerräte (Stadt-Ebene)**: keine rechtliche Anforderung an den Algorithmus. Maximin oder auch Rejection-Sampling mit Audit-Log sind ausreichend für politische Legitimität, solange die Quoten-Einhaltung überprüfbar protokolliert wird.
- **Wissenschaftliche Akzeptanz / OECD-konform**: Maximin ist Teil derselben Paper-Familie und genauso zitierbar wie Leximin. Rejection-Sampling dagegen würde bei fachlicher Prüfung (z.B. durch Democracy R&D Network) als "nicht state of the art" eingestuft.

**Empfehlung für das Produkt**: Maximin als Default, Leximin als optionale Premium-Option (wenn Gemeinde explizit "Nature-Paper-Standard" fordert) mit Pyodide-Fallback.

---

## 4. Port-Aufwand-Schätzung

### 4.1 Modul-Aufschlüsselung `stratification.py` (2398 Zeilen, ~107 KB)

Approximative Verteilung aus Code-Inspektion:

| Bereich | LOC | Port-Aufwand TS | Anmerkungen |
|---|---|---|---|
| IO (CSV, Google Sheets, Settings-TOML) | ~700 | 2–3 PT | CSV trivial, Google Sheets skippable, TOML → JSON |
| Daten-Modelle (People, Categories, Households) | ~400 | 3–5 PT | klar übertragbar |
| **`pipage_rounding` + `lottery_rounding`** | ~100 | 1 PT | reine Arithmetik, Seeded PRNG nötig |
| **`find_distribution_maximin` + `_find_maximin_primal`** | ~250 | **5–8 PT** | Column Generation Loop, MIP-Oracle via `highs-js` |
| **`find_distribution_leximin` + `_dual_leximin_stage`** | ~400 | **10–15 PT** | Outer Loop + Dual-Primal-Recovery, Gurobi-Semantik auf HiGHS abbilden |
| `find_distribution_nash` (cvxpy-basiert) | ~150 | **hart, >15 PT** | kein CVXPY-Äquivalent in JS — log-konkav manuell linearisieren oder Nash weglassen |
| `_generate_initial_committees` (Multiplicative Weights) | ~100 | 3 PT | straightforward |
| `_setup_committee_generation` (ILP-Oracle) | ~150 | 5–7 PT | Kern des MIP-Aufrufs |
| Infeasibility-Relaxation (`_relax_infeasible_quotas`) | ~200 | 5 PT | weiteres LP, diagnostic Logik |
| Legacy-Quoten-Pfad | ~300 | skip | GUI-only, nicht für Web-App relevant |
| GUI/Eel-spezifisch | ~200 | skip | entfällt |
| Tests + Fixtures | - | separat | siehe §6 |

**Summen-Schätzung (reine TS-Übersetzung, ein erfahrener Entwickler):**

| Variante | Arbeitstage | Kalenderzeit realistisch |
|---|---|---|
| **Nur Maximin + Pipage (ohne Nash/Leximin)** | 18–28 PT | **3–5 Wochen** |
| **Maximin + Leximin** | 35–50 PT | **7–10 Wochen** |
| **Volles Feature-Set (inkl. Nash, Infeas-Relax, Audit-Log)** | 50–70 PT | **10–14 Wochen** |

Darin nicht enthalten: Regressionstests gegen Python-Referenz (siehe §6, +10–15 PT), Solver-Robustheit (Edge Cases bei degenerierten LPs, +5–10 PT), UX drumherum.

### 4.2 Alternative: Pyodide-Ansatz

**Idee**: Python-Code ungelesen via Pyodide im Browser laden, WebAssembly-Build des MIP-Solvers nutzen.

**Machbarkeit**:
- Pyodide selbst läuft stabil; NumPy/Pandas/SciPy sind fertig gepackt.
- `python-mip` ist als pure-Python importierbar, **aber** der gebündelte CBC-Solver ist ein OS-spezifischer Native-Binary (Linux .so, Windows .dll, Mac .dylib). **Es gibt kein offizielles CBC-WebAssembly-Build** ([GitHub Issue coin-or/Cbc#484](https://github.com/coin-or/Cbc/issues/484) — Stand 2022 unbeantwortet).
- Workaround: `python-mip` kann externe Solver nutzen. `highspy` (Python-Wrapper für HiGHS) ist via PyPI verfügbar und **hat Pyodide-Wheels** (HiGHS ist als WebAssembly compilierbar, daher ist das realistisch).
- Gurobi: **nicht portierbar**, kommerzielle Binary-Only-Distribution. Also auch in Pyodide Leximin-Fallback auf Maximin, wie im Originalcode.
- Download-Größe: Pyodide-Kern ~10 MB + HiGHS ~5 MB + Abhängigkeiten ~5 MB ≈ **20 MB initialer Browser-Download**. Für einen kommunalen Sortition-Tool-Nutzer einmalig vertretbar, mit Caching.

**Aufwand**:

| Arbeitsschritt | PT |
|---|---|
| Pyodide-Setup im Frontend, Bootstrapping | 2 |
| `stratification.py` laden, Minimal-Wrapper schreiben | 2 |
| HiGHS-Backend für `python-mip` einbinden (ggf. Fork mit Solver-Injection) | 3–5 |
| Input-CSV aus JS übergeben, Output parsen | 2 |
| Performance-Tuning (Web Worker, OPFS-Cache) | 3 |
| Regressionstests (Parität mit lokaler Python-Installation) | 3 |
| **Total** | **15–17 PT** = ~3 Wochen |

**Vorteile**:
- Garantiert Paper-Treue. Kein Bug durch Algorithmus-Übersetzung.
- Updates: `pip install -U sortition-algorithms` reicht, kein Re-Port bei Paper-Update.
- GPL-3.0 bleibt nur auf den importierten Python-Code beschränkt (siehe §5).

**Nachteile**:
- 20 MB Download.
- Solver-Austausch (CBC → HiGHS) erfordert ggf. kleinen Fork von `python-mip` oder explizite Solver-Selektion. Je nach Status der neuen `sortition-algorithms`-Library (dort angeblich HiGHS-Support via `highspy` in Arbeit) entfällt das.
- Performance: Pyodide ist ~3–5× langsamer als natives Python. Für N=500 Rückmelder mit HiGHS-WASM erwartbar: 30 Sek bis 2 Min pro Lauf. Für Tools die einmal pro Bürgerrat laufen: akzeptabel.

---

## 5. Lizenz- und Urheberrechts-Fragen

### 5.1 Ausgangslage

- `sortitionfoundation/stratification-app` und `sortitionfoundation/sortition-algorithms`: beide **GPL-3.0**.
- Nature-Paper: **CC-BY 4.0 Open Access**, Autoren haben der Algorithmik nach Paper-Konvention keinen Urheberrechts-Schutz (Algorithmen sind in DE/US nicht schützbar, nur konkreter Code-Ausdruck).
- `pgoelz/citizensassemblies-replication`: GPL-3.0, Research-Code.

### 5.2 Rechtliche Einordnung

Eine **Übersetzung** von GPL-3.0-Python nach TypeScript **ist eine abgeleitete Arbeit** (so die herrschende FSF-Meinung + US/DE-Rechtsprechung zu Übersetzungen analog § 3 UrhG). Konsequenz: das TS-Ergebnis wäre **GPL-3.0** und muss als solches lizenziert und verbreitet werden. Bei einer rein browser-basierten Web-App ist das oft unproblematisch (der Code liegt als JS sowieso offen im Browser), bei kommerzieller Bundle-Distribution mit proprietären Teilen nicht trivial.

**Saubere Alternative: Clean-Room-Reimplementation.**

- Teammitglied A liest **ausschließlich** das Nature-Paper + Supplementary + ggf. das Procaccia-Follow-up-PDF und schreibt eine Spezifikation (Pseudocode, Formeln, Datenstrukturen) auf Deutsch/Englisch.
- Teammitglied B implementiert in TS **nur auf Basis dieser Spezifikation**, ohne jemals den Python-Quellcode anzusehen.
- Vorteil: Ergebnis ist **kein abgeleitetes Werk** der GPL-Codebasis, kann unter MIT, Apache-2.0 oder proprietär lizenziert werden.
- Nachteil: ~30–50% Aufwands-Overhead gegenüber Direkt-Portierung (weil man Edge-Cases selbst durchdenken muss, die im Paper nicht explizit stehen, aber im Original-Code behandelt werden). Zudem ist in einer kleinen Firma organisatorisch schwer, die Mauer zwischen A und B strikt durchzuhalten.

**Praktikabler Mittelweg**:
- Nutze das **Nature-Paper** als primäre Referenz.
- Nutze **Test-Fixtures** aus `stratification-app` (`fixtures/*.csv`, keine Code-Übernahme), die öffentlich sind, als Regressionstests.
- Beobachte, wo das Paper unvollständig ist (Pipage-Edge-Cases, Infeasibility-Relaxation-Heuristiken) — dort **aus Code-Kommentaren** (nicht Code selbst) die Idee entnehmen und auf Paper rückprojizieren.
- Dokumentiere den Design-Prozess, damit bei rechtlichem Streit die Trennung nachweisbar ist.

### 5.3 GPL bei Pyodide-Variante

Wenn man `sortition-algorithms` via Pyodide importiert **ohne zu verändern**, ist der Python-Code GPL-3.0 geblieben und läuft im Browser. Die **Web-App-Shell** drumherum (TS-Code, UI) ist nur dann GPL-3.0, wenn sie **linked** (im GPL-Sinne) mit der Library ist. Bei Pyodide-Import wird Code in einer WebAssembly-Sandbox ausgeführt — juristisch strittiger Fall, wird aber nach dominanter Meinung als "separate works" behandelt, solange die Library nicht modifiziert wird. **Sichere Auslegung**: eigenen TS-Code unter AGPL-3.0 oder GPL-3.0 lizenzieren, um jedem Risiko aus dem Weg zu gehen. Für ein Open-Source-Civic-Tool ist das sowieso natürlich.

---

## 6. Fairness-Zertifizierung (Test-Strategie)

Ziel: **nachweisen, dass der Port (oder Pyodide-Wrapper) statistisch identische Ergebnisse wie das Python-Original liefert.**

### 6.1 Testfälle aus `stratification-app`

- Fixtures: `fixtures/respondents.csv`, `fixtures/categories.csv` (kleine Demo-Sets, < 200 Personen).
- Unit Tests: `test_stratification.py` (20 KB) — Single-Function-Tests für jede Algorithmus-Komponente. Diese sind zu Paper-Konzepten annotiert und geben einen guten Port-Check.
- End-to-End: `test_end_to_end.py` (3 KB) — komplette Pipeline auf Fixture-Daten.

Diese Tests und Fixtures sind **Daten** (nicht GPL-Code) und können ohne Lizenzkonflikt als Regression-Suite genutzt werden (auch bei Clean-Room-Port).

### 6.2 Regression-Protokoll

1. **Deterministik-Basis**: Python-Referenz mit fixiertem Seed (`random.seed(42)`, NumPy-Seed, Solver-Seed) laufen lassen; Output ist `(selected_ids, distribution_over_committees)`.
2. **JS-Port** mit äquivalentem Seed: exakt gleiche `distribution_over_committees` ist **unrealistisch** (Solver-Unterschiede), aber die **Leximin-Vektoren** (sortierte π_i) sollten sich nur im EPS-Rahmen unterscheiden.
3. **Monte-Carlo-Test**: 1000 Läufe mit verschiedenen Seeds, vergleiche die **empirische Marginalverteilung** pro Person zwischen Python und JS. Kolmogorov-Smirnov oder einfach Chi² auf der Auswahl-Häufigkeit. Soll-Abweichung: < 2% bei N=500.
4. **Quoten-Test**: jede Ausgabe muss für jede Kategorie `min ≤ count ≤ max` erfüllen. Trivialer Constraint-Check.
5. **Infeasibility-Test**: künstlich widersprüchliche Quoten setzen und prüfen, dass die gleichen Relaxation-Empfehlungen ausgegeben werden.

### 6.3 Paper-Replikation

Für Audit-Zertifizierung:
- Eine Referenz-Instanz aus dem Nature-Paper (Supplementary Tables S1–S5 haben echte Anonymized-Panels) auf beiden Implementationen laufen lassen.
- Die publizierten π_min sollten innerhalb EPS = 0.01 reproduzierbar sein.

### 6.4 Continuous Verification

- CI-Pipeline, die bei jedem Commit die Regression-Suite auf einem kleinen Fixture-Set (20s Laufzeit) fährt.
- Nightly: vollständige Fixture-Suite (10 Min).
- Jährliches Audit durch externen Sachverständigen (Sortition Foundation oder Universität), wenn das Tool kommunal produktiv eingesetzt wird.

---

## 7. Empfehlung

### 7.1 Entscheidungsbaum

```
Kernfrage: Muss das Tool 100% im Browser laufen, ohne Backend?
│
├── Ja (Entwurfs-Annahme)
│   │
│   ├── Ist "Nature-Paper-Standard (Leximin)" vertraglich/politisch zwingend?
│   │   │
│   │   ├── Ja → Pyodide-Ansatz (15–20 PT, 20 MB Download, Paper-treu)
│   │   │
│   │   └── Nein → Maximin-Port via highs-js (18–28 PT, klein, schnell)
│   │
│   └── Ist Performance für große Rückmelder-Pools (N > 2000) kritisch?
│       │
│       ├── Ja → Pyodide ist hier langsamer als natives Python, dann Backend-Hybrid erwägen
│       │
│       └── Nein → beide Ansätze okay
│
└── Nein (mit leichtem Backend okay)
    │
    └── Python-Backend + sortition-algorithms, kein Port nötig, 1–2 PT Setup
```

### 7.2 Empfehlung für dieses Produkt

**Primär: Maximin-Port in TS via `highs-js`**, ca. 3–5 Wochen Aufwand. Gründe:
- Wissenschaftlich genügend für kommunale Bürgerräte.
- Komplett browser-lokal, ohne 20 MB Pyodide-Ballast.
- MIT-lizenzierbar bei Clean-Room-Approach (Paper als Quelle).
- Einfacher zu testen und zu warten als voller Leximin-Port.
- Upgrade-Pfad zu Leximin später möglich (Outer-Loop + Freeze-Logik auf bestehenden Maximin-Kern).

**Sekundär, falls Gemeinden ausdrücklich "Nature-Paper-Leximin" fordern**: als Premium-Feature Pyodide-Einbindung, ~3 Wochen. Beide Varianten parallel anbieten: 80% der Nutzer rennen Maximin (schnell, klein), 20% Leximin (Paper-treu, langsamer Boot).

**Nicht empfohlen**: vollständige Leximin-Neu-Implementation in TS. 10+ Wochen Aufwand, laufende Validierungs-Schuld, kein messbarer Nutzen gegenüber Pyodide.

### 7.3 Klarstellung "LP only" reicht nicht

**Wichtige Klarstellung**: Das Nature-Paper-Verfahren ist **nicht** rein mit LP-Iterationen machbar. Die Column Generation braucht zwingend ein **MIP-Oracle** (um neue zulässige Komitees als Variablen hinzuzufügen). Das ist struktureller Teil des Algorithmus und nicht optional. Der Port braucht also einen MIP-fähigen Solver im Browser — und den gibt es zum Glück mit `highs-js`. „LP only" ist falsch; „MIP via highs-js" ist korrekt und machbar.

### 7.4 Persönliche ehrliche Einschätzung

- **Volle Leximin-Portierung: nicht lohnend.** Der Aufwand (3 Monate Team-Zeit + Validierungsschuld) ist für ein seltenes Edge-Case-Feature zu groß. Pyodide ist genau da die bessere Antwort.
- **Maximin-Port: lohnend**, wenn man die Pyodide-Download-Last vermeiden will und "good enough" akzeptabel ist.
- **Pyodide-Ansatz: unterschätzt.** Drei Wochen für einen garantiert Paper-treuen, wartungsarmen, upgrade-fähigen Kern ist ein sehr gutes ROI. Die 20 MB Download sind für ein Tool, das pro Bürgerrat einmal genutzt wird, kein Blocker.

---

## Quellen

1. <https://www.nature.com/articles/s41586-021-03788-6> — Flanigan et al., "Fair algorithms for selecting citizens' assemblies", Nature 2021 (Open Access)
2. <https://procaccia.info/wp-content/uploads/2022/06/repfair.pdf> — Procaccia et al. Follow-up-Papier
3. <https://github.com/sortitionfoundation/stratification-app> — Original-Referenzimplementation, Python, GPL-3.0
4. <https://github.com/sortitionfoundation/sortition-algorithms> — neue Library-Variante (2025), saubere API
5. <https://sortitionfoundation.github.io/sortition-algorithms/concepts/> — offizielle Konzept-Dokumentation
6. <https://github.com/pgoelz/citizensassemblies-replication> — Paul Gölz' Research-Code zum Paper
7. <https://panelot.org/> — Web-UI (closed source, nicht ports-bar)
8. <https://github.com/lovasoa/highs-js> — HiGHS-Solver als WebAssembly, MIT
9. <https://github.com/jvail/glpk.js> — GLPK als WebAssembly, GPL-2.0
10. <https://github.com/pyodide/pyodide> — Python-Runtime im Browser
11. <https://github.com/coin-or/Cbc/issues/484> — offener Issue zu CBC-WebAssembly (ungelöst)
12. <https://pmc.ncbi.nlm.nih.gov/articles/PMC8387237/> — Paper auf PubMed mit Supplementary-Links
13. <https://www.cs.toronto.edu/tss/files/papers/Ageev-Sviridenko2004_Article_PipageRoundingANewMethodOfCons.pdf> — Pipage-Rounding-Ursprungsarbeit
14. <https://highs.dev/> — HiGHS-Projekt-Website mit Benchmarks
15. Report 05 in diesem Ordner — Script-Nutzung des Python-Originals für Vergleich
