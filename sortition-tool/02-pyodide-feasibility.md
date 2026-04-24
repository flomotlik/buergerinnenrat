# Pyodide-Machbarkeit fuer browser-native stratification-app

Recherchestand: 24. April 2026. Pyodide 0.29.3 (Stable), in Entwicklung 0.30.x / 314.0.0.dev0.

---

## TL;DR

**Pyodide ist technisch machbar, aber der Weg ueber `stratification-app` ist nicht "unveraendert" moeglich.** Die harte Blockade ist `python-mip`: Das Paket selbst ist pure-Python und liesse sich via `micropip` laden, aber sein C/C++-Backend **CBC hat keinen WebAssembly-Build** und ist unter den Sortition-Foundation-Dev-Gruppen selbst als "causes tests to hang intermittently" markiert [10][11]. Ohne CBC kein `mip.Model.optimize()`, und damit faellt **genau der Leximin-/Maximin-ILP-Kern** aus, der das Herz der App ist.

Der machbare Weg ist: **Pyodide + cvxpy (1.8.2 bereits im Pyodide-Inventar) + HiGHS-Backend** (via `highspy` 1.13.1, ebenfalls im Inventar [13]) + **Port der `mip`-Modelle auf cvxpy-MILP**. Alternativ: Nachfolger-Library `sortitionfoundation/sortition-algorithms` verwenden, die bereits `cvxpy>=1.6.5`, `highspy>=1.7.0` und `mip>=1.17.0` als Deps listet [14] — wobei auch dort `mip` das browser-kritische Teil bleibt.

Geschaetzter Portierungs-Aufwand **2–5 Tage** fuer die Umstellung der zwei `mip.Model`-Bloecke (Leximin-Rundung + Feasibility-Check) auf `cvxpy` mit HiGHS-MILP-Solver. **Das ist um Groessenordnungen weniger** als eine vollstaendige JS/TS-Portierung der gesamten Optimierungslogik (Leximin + Nash + Maximin + Pipage-Rounding + Duality-Handling) — und man erbt gratis die 15 Jahre CVXPY-Testing und -Numerik-Stabilitaet.

**Empfehlung: Pyodide + Minimal-Patch (`mip` -> `cvxpy(solver=HIGHS)`).** Ein JS-Port ist sauberer bei Bundle-Groesse und iOS-Risiko, aber der Aufwand fuer numerisch korrekte LP/ILP-Solver plus Leximin-Algorithmus in JS ist sehr hoch — fuer ein Tool, das am Ende 5–50 Mal pro Jahr laeuft, nicht rechtfertigbar.

---

## 1. Pyodide im Kurzueberblick

| Metric | Wert | Quelle |
|---|---|---|
| Stable-Version (April 2026) | 0.29.3 | [1] |
| Dev-Version | 0.30.0.dev0 / 314.0.0.dev0 | [5] |
| Python-Version | 3.12 | [1] |
| Core-Download (ohne Pakete) | ~6.4 MB | [20] |
| Cold-Start (Typisches Laptop) | 3–5 s Initialisierung + Download | [20][17] |
| Warm-Cache (IndexedDB) | ~400 ms | [17] |
| Optimierter Warm-Start mit Snapshot | 40–60 ms (Node, Browser langsamer) | [20] |
| Browser-Support | Chrome, Firefox, Edge stabil; Safari/iOS problematisch | [15] |

**Web-Worker-Betrieb ist zwingend** fuer ein Analyse-Tool, das die UI nicht einfrieren darf. Pyodide hat dafuer offiziellen Support [16]. Einschraenkung: Pyodide-Interpreter kann **nicht** zwischen Worker und Main-Thread geteilt werden, Daten werden ueber `postMessage` (structured clone) transferiert. Python-Objekte muessen ueber die `pyodide.ffi`-Schicht in JS-Primitives konvertiert werden (`toJs()`), bevor sie ueber den Thread-Boundary gehen.

### Safari / iOS-Warnung

- Issue #5428: "Pyodide 0.27.1+ not working on iOS (Safari)" — aktive, seit 2025 bestehende Regression [15].
- iOS-Safari hat hartes 2 GB WebAssembly-Memory-Limit; Pyodide mit Scipy + Cvxpy + Clarabel + Numpy liegt nach `load` typisch bei 200–400 MB RSS, d.h. grundsaetzlich im Budget, aber **mehrfaches Neuladen der Seite kann zu OOM-Crashes fuehren** (WebKit Bug 255103).
- **Konsequenz:** Wenn die Zielgruppe iPads/iPhones nutzt, muss das im Akzeptanzkriterium stehen oder ausgeschlossen werden. Fuer ein Sortition-Desktop-Tool (typischerweise am Buero-PC) vermutlich irrelevant — aber muss explizit entschieden werden.

---

## 2. Paket-Kompatibilitaets-Matrix

Grundlage: Direkter Abruf des `pyodide-recipes`-GitHub-Inventars (Main-Branch) via GitHub-API (April 2026), plus `meta.yaml`-Abruf pro Paket [13]. Die eigentliche Stable-Liste fuer 0.29.3 kann marginal abweichen, der Trend ist aber identisch.

| Paket | In Pyodide? | Version in Pyodide | Status / Kommentar |
|---|---|---|---|
| **numpy** | ja | 2.4.3 | Core-Paket, bundled |
| **scipy** | ja | 1.17.0 | Enthaelt `scipy.optimize.milp` mit HiGHS im Core [6]. Verfuegbar im Browser. |
| **cvxpy-base** | ja | 1.8.2 | Distributed als `cvxpy-base`, nicht `cvxpy`. Identische Python-API. Deps: numpy, scipy, clarabel [13]. |
| **clarabel** | ja | 0.11.1 | Rust-basiert; aktueller Default-Solver fuer SOCP/QP in CVXPY seit 1.5 [2][3]. |
| **highspy** | ja | 1.13.1 | Direkte Python-Bindings an HiGHS. Verfuegbar als MILP-Backend in cvxpy 1.8+ [5][13]. |
| **osqp** | NEIN (disabled) | 1.0.0 (`_disabled: true`) | `meta.yaml` sagt "update to 2026_0" — zeitlich in Arbeit, aber Stand jetzt NICHT gebaut [13]. |
| **ecos** | NEIN | — | Nicht in `pyodide-recipes`. CVXPY plant ohnehin Deprecation (siehe [2]). |
| **scs** | NEIN | — | Nicht im Inventar. `stratification.py` nutzt SCS als Default fuer Nash-Objective [Strat. l. 2257]. |
| **python-mip / mip** | NEIN | — | C-Backend CBC nicht WASM-faehig. Seit 4+ Jahren offene Issues ohne Loesung [10][11]. |
| **CBC (nativ)** | NEIN | — | Kein WASM-Port existiert (Stand 2026). |
| **swiglpk / libglpk** | ja | 5.0.13 | GLPK ist als SWIG-Binding verfuegbar, aber **nicht** das `cvxopt`-Paket, das CVXPY fuer `GLPK_MI` braucht. Daher nicht direkt als CVXPY-MILP-Backend nutzbar. |
| **cvxopt** | NEIN | — | Nicht im Inventar. Damit kein `GLPK_MI`-Pfad in cvxpy. |
| **toml** | NEIN (deprecated upstream) | — | Aber: `tomli` 2.4.1 und `tomli-w` verfuegbar [13]. Trivialer 10-Zeilen-Patch, da `toml.load` == `tomli.load(f, "rb")`. |
| **pandas** | ja | aktuell | Optional, wird nur in sortition-algorithms `diversimax`-Extra genutzt. |
| **eel / gspread / oauth2client / pyinstaller** | irrelevant | — | Sind GUI-/Google-Sheets-spezifisch und fallen im Browser weg. |

**Kernaussage:** Von den fuenf numerisch relevanten Solver-Paketen (`cvxpy`, `mip`, `scipy`, `scs`, `ecos`) sind **cvxpy und scipy vorhanden und modern**, **mip/ecos/scs nicht**. HiGHS als MILP-Backend ist verfuegbar — das ist der entscheidende Rettungsanker.

---

## 3. Alternative Wege, wenn `python-mip` fehlt

Da `mip` der eigentliche Blocker ist, gibt es drei konstruktive Pfade:

### 3a. `mip` durch `cvxpy` mit HiGHS-Backend ersetzen (empfohlen)

CVXPY 1.8 hat **HiGHS als Default-MILP-Solver** etabliert [5][19]. HiGHS ist in Pyodide via `highspy` 1.13.1 verfuegbar. Konkret in `stratification.py`:

- Zeilen 1527–1608: `_ilp_results_to_committee` baut ein `mip.Model(sense=MINIMIZE)` mit `add_var(var_type=INTEGER)` + `add_var(var_type=BINARY)`, `add_constr`, `xsum`. Das ist **1:1 abbildbar** auf `cvxpy.Variable(integer=True)` / `cvxpy.Variable(boolean=True)` + `cvxpy.Problem(cp.Minimize(obj), constraints)` + `problem.solve(solver=cp.HIGHS)`.
- Zeilen 1637–1700: Analoges Feasibility-Modell. Ebenfalls direkt portierbar.
- Zeilen 2244–2262: Nash-Welfare-Block nutzt schon `cvxpy` mit SCS/ECOS. **Hier ist der Problem-Fall:** SCS und ECOS fehlen in Pyodide. Fuer die Nash-Log-Objective koennen wir `CLARABEL` (Kegelsolver, handhabt `cp.log`) oder direkte `scipy.optimize.minimize` verwenden. CLARABEL ist der Sauberkeits-Pfad.

**Aufwand:** Die beiden `mip`-Bloecke sind jeweils ca. 80 Zeilen Code. Ein erfahrener Python-Optimization-Dev portiert das in 1–2 Tagen inkl. Tests gegen die bestehenden 291 Test-Cases.

### 3b. `scipy.optimize.milp` direkt nutzen (noch leichter, aber low-level)

`scipy.optimize.milp` ist seit SciPy 1.9 im Core, nutzt HiGHS intern, und ist in Pyodide vorhanden (scipy 1.17.0) [6]. API ist niedriger als cvxpy:

```python
from scipy.optimize import milp, LinearConstraint, Bounds
res = milp(c, constraints=..., integrality=..., bounds=...)
```

Vorteil: keine weitere Dependency, kleines Delta zum Pyodide-Base. Nachteil: Man muss die Constraints selbst in Matrix-Form bringen (CVXPY automatisiert das). Fuer die beiden `mip`-Modelle in stratification.py machbar, aber fuer die Leximin-Leader-Iteration (Maximin + sukzessives Fixieren) eher unuebersichtlich — da ist CVXPY lesbarer.

**Empfehlung:** 3a, nicht 3b. CVXPY ist den 15 MB Bundle-Overhead wert.

### 3c. Gleich `sortition-algorithms` statt `stratification-app` nehmen

`sortitionfoundation/sortition-algorithms` 0.10.1 (2025–2026) ist der offizielle Nachfolger von `stratification-app` [14]. Deps:

```
cvxpy>=1.6.5
highspy>=1.7.0
mip>=1.17.0     <-- weiterhin drin!
numpy>=2.3.4
```

Interessant: Im `pyproject.toml` [14] steht **explizit als Kommentar**:
> "Note: mip is NOT included here - it causes tests to hang intermittently. MipSolver tests are automatically skipped when mip is not installed."

Das deutet auf **pluggable Solver-Architektur** hin, bei der `mip` bereits optional ist. Wenn man `sortition-algorithms` ohne `mip` installiert, laeuft die Library mit cvxpy+highspy als Default-Solver. Das ist eine **massive Abkuerzung** — die Portierungsarbeit ist bereits upstream erledigt.

**Zu verifizieren** (nicht aus der Research eindeutig ableitbar): Welche Solver-Klassen akzeptiert die `SolverFactory` dort? Implementiert sie bereits einen CvxpyHighsSolver? Falls ja: Pyodide-Integration reduziert sich auf "installieren, CSV reinreichen, Ergebnis zurueck". Das sollte Phase 0 der Entwicklung sein — **vor** jedem eigenen Port.

---

## 4. Performance & UX

### Startup-Zeit realistisch

- **Cold-Cache:** Pyodide-Core (6.4 MB) + numpy (4 MB) + scipy (~11 MB komprimiert, ~25 MB entpackt) + cvxpy-base (~3 MB) + clarabel (~2 MB) + highspy (~4 MB) + pandas (falls noetig, ~10 MB) = realistisch **25–35 MB komprimiert** ueber die Leitung beim ersten Aufruf. Bei 50 MBit/s sind das 5–8 Sekunden reine Uebertragung, plus 3–5 Sekunden WASM-Compile + Pythoneinitialisierung = **8–13 Sekunden total cold**. [17][20][21]
- **Warm-Cache (HTTP-Cache-Hit):** 3–5 Sekunden, primaer WASM-Compile.
- **Snapshot-basiert (Experimentell, Pyodide 0.28+):** unter 1 Sekunde, aber noch nicht produktionsreif im Browser.

**UX-Bewertung fuer ein Sortition-Analyse-Tool:** Das Tool wird pro Auswahl vielleicht 5 Minuten genutzt; 10 Sekunden Ladezeit beim ersten Besuch ist **akzeptabel**, sofern ein klarer Lade-Indikator ("Lade Optimierungs-Engine, das kann 10 Sekunden dauern") gezeigt wird. Der Zweitbesuch in derselben Sitzung ist sub-second.

### Rechenleistung

- Pyodide ist typisch **3–10x langsamer als natives CPython** fuer numerische Tasks (BLAS im Pyodide ist Netlib-Reference, nicht OpenBLAS) [18].
- HiGHS-MILP selbst ist primaer C++-Code in WASM, Overhead gegenueber nativ ist **<2x** (WASM-vs-native-Faktor fuer optimierten C++).
- Fuer **5000 Rueckmelder x 100 Quoten-Constraints** (Groessenordnung, die du nennst):
  - Das sind 5000 Binaer-Variablen + ~200 Constraints. HiGHS-Branch-and-Cut loest das nativ in 1–10 Sekunden.
  - In WASM rechne mit **5–30 Sekunden** pro ILP-Aufruf.
  - Leximin iteriert typisch 20–50 Mal (pro Feature-Value eine Runde). **Gesamtzeit pro Selektion: 3–15 Minuten Worst-Case im Browser, 1–5 Minuten realistisch.**
- Das ist **an der oberen Grenze des zumutbaren**, aber fuer ein Backoffice-Tool akzeptabel. User muss erwarten, dass eine Selektion "ein paar Minuten rechnet" — das ist bei nativen Sortition-Tools (auch Gurobi-based) aehnlich.

**Risiko:** Bei Panels >8000 Personen oder >200 Constraints wird die Laufzeit unangenehm lang. Benchmarks mit echten Daten sind Pflicht vor Go-Live.

---

## 5. Datenfluss JS <-> Python in Pyodide

Kanonisches Pattern fuer einen CSV-Upload-Workflow [16][22]:

```javascript
// Main thread
const fileInput = document.getElementById("csv");
const file = fileInput.files[0];
const buf = await file.arrayBuffer();
worker.postMessage({cmd: "run", csvBuffer: buf}, [buf]); // transferable

// Worker (pyodide.js loaded)
self.onmessage = async (ev) => {
    const bytes = new Uint8Array(ev.data.csvBuffer);
    self.pyodide.globals.set("csv_bytes", bytes);
    const result = await self.pyodide.runPythonAsync(`
        import io, csv
        from sortition_algorithms import run_selection
        text = bytes(csv_bytes).decode('utf-8')
        reader = csv.DictReader(io.StringIO(text))
        ...
        result.to_py()  # serialisierbares Dict
    `);
    self.postMessage({result: result.toJs({dict_converter: Object.fromEntries})});
};
```

- CSV-Bytes wandern als `Uint8Array` per **transferable buffer** in den Worker (keine Kopie).
- In Python via `io.StringIO` parsen; Ergebnis als Dict/List in JS zurueck via `.toJs()`.
- **Kein** Filesystem-Mount noetig, das vereinfacht die Permissions-Story.
- Meldereg-Daten bleiben im Worker-Memory und werden nie ueber `fetch` gesendet.
- DSGVO-Argument: Screenshot/Netzwerk-Tab kann zeigen, dass keine Uploads passieren. Security-Header (`Content-Security-Policy: connect-src 'self'`) macht das technisch nachweisbar.

**Pattern fuer Progress-Updates:** Python ruft periodisch `from js import postMessage; postMessage({progress: 0.42})`, Worker reicht das an Main weiter. Wichtig fuer 1–5-Minuten-Rechnungen, damit der User nicht denkt, die Seite sei gehaengt.

---

## 6. Bundle-Groesse und Caching-Strategie

| Komponente | Komprimiert (ueber Netz) | Entpackt (Memory) |
|---|---|---|
| Pyodide-Core | 6.4 MB | ~20 MB |
| numpy | 4 MB | 15 MB |
| scipy | 11 MB | 45 MB |
| cvxpy-base | 3 MB | 8 MB |
| clarabel | 2 MB | 6 MB |
| highspy | 4 MB | 15 MB |
| pandas (optional) | 10 MB | 30 MB |
| **Summe (ohne pandas)** | **~30 MB** | **~110 MB RAM** |
| Summe mit pandas | ~40 MB | ~140 MB RAM |

**Caching-Strategie:**

1. **Service-Worker mit `cache-first`** fuer alle `*.whl` und `pyodide.asm.wasm`-Dateien. Pyodide hat dafuer offizielle Docs [24].
2. **Self-Hosting** der Pyodide-Assets vom eigenen Server, NICHT vom jsDelivr-CDN — wegen DSGVO (kein Cloudflare-Fingerprinting).
3. `Cache-Control: immutable, max-age=31536000` auf die versionierten Pyodide-Pfade.
4. **Progressive Web App** mit Offline-Manifest. Nach dem ersten Besuch laeuft das Tool offline — zusaetzliches Vertrauen fuer Datenschutz-sensible User.

**Pyodide-pack** [23] kann optional helfen, nicht benoetigte Module aus scipy rauszustrippen (30 MB -> evtl. 18 MB), ist aber experimentell. Nicht fuer den ersten Release noetig.

Fazit: **30–40 MB Bundle ist fuer ein Fachtool vertretbar**, solange Service-Worker-Cache sauber eingerichtet ist und der Nutzer vor dem ersten Download eine klare Erwartung gesetzt bekommt ("Einmaliger Download von 30 MB, danach offline verfuegbar").

---

## 7. Risiken und Showstopper

### Harte Showstopper (blockierend)

1. **`mip`/CBC nicht in WASM, und es gibt keinen Plan, das je zu bauen.** [10][11] — **Muss** durch cvxpy-HIGHS-Port umgangen werden.
2. **SCS und ECOS fehlen in Pyodide.** [13] `stratification.py` nutzt SCS als Nash-Default-Solver. Loesung: Nash-Block auf Clarabel oder scipy-basiert umstellen.
3. **osqp ist in pyodide-recipes disabled** (`_disabled: true` in meta.yaml). Wenn ein CVXPY-Solve auf QP faellt, das nur OSQP kann, crasht es. Muss im Testing abgeklopft werden.

### Weiche Risiken (mitigierbar)

4. **Pyodide-Version haengt hinter PyPI her.** cvxpy-base in Pyodide ist 1.8.2 (Ende 2025), aktuelle PyPI-Version koennte 1.9+ sein. **Irrelevant**, solange 1.8+ den HIGHS-Support hat (ja, hat er).
5. **iOS Safari instabil** [15]. Falls iOS-Support gefordert, muss separat verifiziert werden. Desktop-only kann man auch explizit im Scope fixieren.
6. **GPL-3.0-Kette.** `stratification-app` ist GPL-3.0. In Pyodide ausgeliefert = Source-Code sichtbar im Browser = **automatisch GPL-compliant**. Aber: Wenn ihr das Tool als SaaS verteilt und es auf GPL-Code basiert, muesst ihr den Source-Code anbieten. Das ist bei Browser-Auslieferung trivial erfuellt — Browser laedt ohnehin Source. Keine kommerzielle Einschraenkung, solange ihr nicht closed-source-Forks vertreibt.
7. **HiGHS-MILP ist numerisch neuer als CBC.** In seltenen Edge-Cases (degenerate LPs) andere Antworten. Akademisch unkritisch, aber die 291 Tests der Original-Library werden teilweise neu justiert werden muessen (Toleranzen). Kein Blocker, nur Aufwand.
8. **Pyodide-Memory-Leaks** bei sehr vielen Solve-Iterationen (Discussion #4338). Bei 50 Leximin-Iterationen in einer Session unkritisch; bei 500+ Iterationen in einem Langlauf evtl. Worker-Restart einplanen.
9. **Keine Multiprocessing/Threading** in Pyodide. Der Flanigan-Algorithmus ist single-threaded im Kern, also unkritisch — aber falls ihr parallele Warmstarts testen wollt, geht das nicht. Workaround: Mehrere Web-Worker, jeder eigene Pyodide-Instanz (teuer).

---

## 8. Existierende Praezedenzfaelle

- **JupyterLite** ist der groesste produktive Pyodide-Nutzer. Laedt routinemaessig SciPy und numpy in 100.000en Schuelersessions weltweit. Beweis, dass der "30 MB Bundle ist zu gross"-Einwand in der Praxis beherrschbar ist [21].
- **DuckDB-in-Pyodide (DuckDB Blog, Okt 2024)**: Zeigt funktionierendes analytisches Tool mit WASM-Backend + Pyodide-Frontend-Glue. Gleiche Klasse Anwendung wie unsere [21].
- **healpy via Pyodide (Zonca, 2024)**: Astro-Compute-Library mit scientific stack im Browser. Praezedenz fuer "Library mit C-Extensions unveraendert via Pyodide" [21].
- **Microsoft Python Dev Blog Pyodide-Feasibility-Artikel (2024/2025)**: Diskutiert genau die hier relevanten Trade-offs [18].
- **Pyodide Service-Worker-Docs** [24] enthalten ein NumPy-tabular-data-Beispiel, das fast 1:1 unser Pattern ist.

**Kein** gefundener direkter Praezedenzfall fuer ILP/MILP-Solver in Pyodide **in Produktion**. Das ist der Innovations-Teil des Vorhabens. HiGHS ist aber ein etabliertes, vielfach getestetes WASM-Target (via Emscripten), und `highspy` ist als Pyodide-Paket seit 2025 verfuegbar — also kein unerprobtes Territorium auf Infrastruktur-Ebene, nur auf Anwendungs-Ebene fuer Sortition.

---

## 9. Empfehlung: Pyodide ja/nein?

**Ja, Pyodide. Aber mit drei Bedingungen:**

1. **Nicht `stratification-app` direkt** — sondern **`sortition-algorithms` 0.10.x**. Das Nachfolge-Paket hat bereits HiGHS/cvxpy-Deps vorgesehen und explizit `mip` als optional markiert. Phase-0-Task: Verifizieren, dass `sortition-algorithms` ohne `mip` in Pyodide laeuft, inkl. allen drei Algorithmen (leximin, maximin, nash). Falls ja: 80% der Arbeit ist geschenkt.
2. **Nash-Block muss von SCS/ECOS auf Clarabel umgestellt werden.** Eigener Pull-Request upstream oder Fork. 1 Tag Arbeit.
3. **iOS Safari wird explizit aus dem Support-Scope genommen** (oder spaeter separat evaluiert). Chrome/Firefox/Edge auf Desktop ist ausreichend.

### Warum nicht JS/TS-Port?

Ein JS/TS-Port bedeutet:
- Leximin-Algorithmus (Flanigan et al., Nature 2021) inkl. Pipage-Rounding und Duality-Handling in JS neu schreiben. **Wochen bis Monate.**
- Einen produktionsreifen MILP-Solver in JS finden oder ueber WASM einbinden (HiGHS hat WASM-Build, ist aber nicht die klassische JS-Distribution). Der Solver-Anbindungs-Aufwand ist aehnlich zu Pyodide, **ohne** dass man von den 15 Jahren CVXPY-Formulierungen profitiert.
- Die bestehenden 291 Python-Tests werden wertlos.

Realistischer Aufwand-Vergleich:

| Option | Arbeitsaufwand Erstimplementation | Risiko Leximin-Bugs | Upstream-Fixes weiter nutzbar |
|---|---|---|---|
| **Pyodide + Minimal-Patch (`mip`->cvxpy)** | 1–2 Wochen | gering (Library bleibt Referenz-Impl) | ja |
| **Pyodide + sortition-algorithms (falls Phase-0 ok)** | 3–5 Tage | sehr gering | ja, direkt |
| Komplett-Port JS/TS | 2–4 Monate | hoch | nein, manueller Sync |

**Pyodide ist hier der richtige Hebel.** Die einzige Situation, in der JS/TS sauberer waere, ist wenn das Tool auf Low-End-Geraeten (Schulchromebooks, aeltere iPads) laufen muesste — was laut Zielgruppenprofil (Buergerrat-Organisatoren in Verwaltungen) nicht gefordert ist.

### Konkrete naechste Schritte (Phase 0, 2–3 Tage)

1. Pyodide 0.29.3 lokal via `npm install pyodide` installieren, Minimal-HTML mit Web-Worker.
2. `await micropip.install("sortition-algorithms")` probieren. Ohne `mip`-Dependency erzwingen (evtl. per `deps=False` und manuelles Nachinstallieren der kompatiblen Deps).
3. Eine Spielzeug-Selection (100 Personen, 5 Features) laufen lassen. Laufzeit messen.
4. **Falls das geht:** 95% der Pyodide-Frage ist beantwortet, geht weiter in Produkt-Design.
5. **Falls nicht:** Fork von `sortition-algorithms`, `mip`-Pfad durch `cvxpy + HIGHS`-Pfad ersetzen (~2 Tage). Oder — falls `sortition-algorithms` strukturell inkompatibel ist — zurueck zu `stratification-app`-Fork und dort denselben Patch.

Das ist die schnellste Validierungs-Schleife, und sie entscheidet die gesamte Architektur fuer sehr wenig investiertes Kapital.

---

## Quellen

1. Pyodide Homepage / Version Check — https://pyodide.org/
2. CVXPY Changelog (ECOS → Clarabel, HiGHS als MILP-Default) — https://www.cvxpy.org/updates/
3. CVXPY Transitioning from ECOS to Clarabel — https://github.com/cvxpy/cvxpy/discussions/2178
4. CVXPY Solver Features Doc — https://www.cvxpy.org/tutorial/solvers/index.html
5. CVXPY 1.6/1.8 HiGHS MILP — https://www.cvxpy.org/version/1.6/updates/index.html
6. SciPy milp-Referenz (HiGHS-Backend) — https://docs.scipy.org/doc/scipy/reference/generated/scipy.optimize.milp.html
7. Pyodide Packages Page 0.29.3 — https://pyodide.org/en/stable/usage/packages-in-pyodide.html
8. Pyodide Packages Page latest (dev 314.0.0) — https://pyodide.org/en/latest/usage/packages-in-pyodide.html
9. Pyodide 0.28 Release Blog — https://blog.pyodide.org/posts/0.28-release/
10. python-mip Issue #249 (Pyodide support) — https://github.com/coin-or/python-mip/issues/249
11. CBC Issue #484 (WebAssembly port) — https://github.com/coin-or/Cbc/issues/484
12. pyodide-recipes Repository — https://github.com/pyodide/pyodide-recipes
13. pyodide-recipes packages/\*\*/meta.yaml (direkt abgerufen April 2026) — https://raw.githubusercontent.com/pyodide/pyodide-recipes/main/packages/
14. sortition-algorithms pyproject.toml — https://raw.githubusercontent.com/sortitionfoundation/sortition-algorithms/main/pyproject.toml
15. Pyodide iOS Safari Issues — https://github.com/pyodide/pyodide/issues/5428
16. Pyodide Web Worker Guide — https://pyodide.org/en/stable/usage/webworker.html
17. Microsoft Dev Blog Pyodide Feasibility — https://devblogs.microsoft.com/python/feasibility-use-cases-and-limitations-of-pyodide/
18. Pyodide Performance Benchmarks — https://pyodide.com/is-pyodide-slower-than-native-python/
19. CVXPY Install Guide (HIGHS als MILP-Default) — https://www.cvxpy.org/install/
20. Pyodide Startup Time Diskussion #3940 — https://github.com/pyodide/pyodide/issues/3940
21. JupyterLite / DuckDB-in-Pyodide / Adafruit Pyodide Blog — https://duckdb.org/2024/10/02/pyodide + https://blog.adafruit.com/2025/12/31/run-python-in-browsers-with-pyodide-and-webassembly/
22. Pyodide FAQ File-Upload-Pattern — https://pyodide.org/en/stable/usage/faq.html
23. pyodide-pack (Bundle-Minimizer) — https://pypi.org/project/pyodide-pack/
24. Pyodide Service Worker Docs — https://pyodide.org/en/stable/usage/service-worker.html
25. sortition-algorithms Concepts — https://sortitionfoundation.github.io/sortition-algorithms/concepts/
26. Flanigan et al., Fair algorithms for selecting citizens' assemblies (Nature 2021) — https://www.nature.com/articles/s41586-021-03788-6
27. cvxpy-leximin auf PyPI — https://pypi.org/project/cvxpy-leximin/
28. Running Python in the Browser WebAssembly (TestDriven.io) — https://testdriven.io/blog/python-webassembly/
29. Cloudflare Python Workers via Pyodide — https://blog.cloudflare.com/python-workers/
30. healpy-in-Pyodide (Zonca 2024) — https://www.zonca.dev/posts/2024-07-17-run-healpy-browser-pyodide.html
