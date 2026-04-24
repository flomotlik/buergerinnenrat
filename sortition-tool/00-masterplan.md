# Masterplan: Browser-native Sortition-App für Bürgerräte

> Stand: 2026-04-24 | Synthese der Reports 01–05 in diesem Ordner | Sprache: Deutsch

## Zielbild in einem Absatz

Eine **rein clientseitige Web-App** (statisches HTML/JS/WASM), in die Nutzerinnen Melderegister-/Rückmelder-CSVs laden und aus denen stratifizierte Zufallsauswahlen für Bürgerräte gezogen werden — ohne dass je Daten das Gerät verlassen. Wissenschaftlich fundiert (Nature-2021-Algorithmus), transparent auditierbar, mehrfach nutzbar für verschiedene Kommunen, mit Apache-2.0-Lizenz, finanziert primär über einen Prototype-Fund-Antrag und eingesetzt als Consulting-Portfolio-Element (nicht als eigenständiges SaaS-Produkt).

## Zentrale Erkenntnisse aus den fünf Reports

### Was alle fünf Reports übereinstimmend sagen

1. **Technisch machbar, aber nicht trivial.** Weder ein Open-Source-Vorbild noch eine Plug-and-Play-Library existiert. Bestehende Tools (Sortition Foundation Python-Desktop, panelot.org mit Backend, Es-geht-LOS auf AWS) setzen alle auf Server- oder lokale Python-Installation.
2. **Der Algorithmus aus dem Nature-2021-Paper ist MIP-pflichtig.** Reine LP-Solver reichen nicht (Column Generation braucht ein MIP-Oracle). HiGHS ist der einzige produktionstaugliche WASM-Solver mit MIP-Unterstützung und einer non-copyleft-Lizenz (MIT).
3. **Ein Performance-/Skalierungsrisiko ist real.** `highs-js` Issue #9 (OOM bei 350×388 MIP mit 248 Ints) und die Native-Replication-Daten (~1 h für 2000er-Pool) bedeuten: **ohne einen Benchmark auf echten Kommunaldaten keine Architekturentscheidung.** 1000–1500 Rückmelder ist eine realistische Obergrenze für den Browser.
4. **Der Markt ist klein, aber valide.** 10–25 Bürgerrats-Verfahren/Jahr in DACH, 20–60 k EUR theoretisch adressierbarer Tool-Umsatz — **kein Produktmarkt**, aber sehr gut als Consulting-Portfolio-Baustein.
5. **Lizenz-Weg ist klar.** Direkter Port der GPL-3.0-Referenz (`sortitionfoundation/stratification-app`) ist abgeleitetes Werk → zwingend GPL. Clean-Room-Reimplementierung aus dem CC-BY-Paper → freie Lizenzwahl (Apache-2.0 empfohlen). Das ist **nicht verhandelbar**, wenn Freiheit in Kooperationen/Subunternehmer-Deals gewünscht ist.

### Worin sich die Reports widersprechen — und wie der Masterplan das auflöst

#### Konflikt 1 — Solver-Wahl: `highs-js` vs. `glpk.js`

- Report 01 (WASM-Solver): **HiGHS via `highs-js` (MIT)**, `glpk.js` ist **GPL-3.0-Copyleft** und blockiert jedes Business-Modell, das nicht selbst GPL sein will.
- Report 04 (Frontend-Architektur): empfiehlt **`glpk.js`**.
- Report 03 (Algorithmus-Port): MIP ist zwingend nötig → `highs-js` ist die einzige MIP-taugliche, nicht-copyleft-Option.

**Auflösung:** HiGHS via `highs-js` ist der Solver. Report 04 irrt in diesem Punkt (wahrscheinlich älterer Wissensstand) — die Architektur-Vorschläge aus Report 04 übernehmen wir bis auf den Solver-Baustein.

#### Konflikt 2 — Pyodide vs. TypeScript-Port

- Report 02 (Pyodide): Pyodide ist **Größenordnungen billiger** (3 Tage–2 Wochen) als ein TS-Port, vor allem wenn der Nachfolger `sortitionfoundation/sortition-algorithms` pluggable-Solver-fähig ist. Bundle ~30 MB komprimiert, Cold-Start 8–13 s.
- Report 03 (Port): Ohne existierenden JS/TS-Leximin-Port ist ein eigener Port 7–14 Wochen. **Maximin-only-Port** in 3–5 Wochen als pragmatischer Mittelweg.
- Report 04 (Frontend): verwirft Pyodide wegen „10 MB zu schwer" (ungenau — Report 02 rechnet korrekter mit ~30 MB).

**Auflösung — gestufter Ansatz:**

| Phase | Lösung | Zweck |
| --- | --- | --- |
| **Phase 0 (Prototyp, 2 Wochen)** | Pyodide + `sortition-algorithms` (falls pluggable Solver) | Schneller Proof of Concept, volle Nature-Algorithmen verfügbar, Benchmark auf echten Daten |
| **Phase 1 (MVP, 6–10 Wochen)** | Wenn Pyodide-Bundle und Performance akzeptabel → Produktions-Reife mit Pyodide | Risiko-Abbau, geringer Port-Aufwand |
| **Phase 2 (optional)** | Clean-Room-TS-Port von **Maximin** zusätzlich als leichtgewichtige Alternative | Bundle-Reduktion auf ~1–2 MB für Einsätze, wo die 30 MB Pyodide Showstopper sind |
| **Phase 3 (Premium)** | Leximin TS-Port nur falls echte Nachfrage | Nur wenn Phase 0/1/2 den Markt validiert haben |

Diese Staffelung macht den kritischsten Fehler vermeidbar: **10+ Wochen Port-Arbeit zu investieren, bevor der Markt validiert ist.**

## Empfehlung

### Technik-Stack

| Baustein | Wahl | Begründung |
| --- | --- | --- |
| **Build-Tool** | Vite | Bewährt, WASM-Support, statische Builds |
| **UI-Framework** | SolidJS (oder Svelte) | Kleine Bundle-Größe, reaktiv, gute TS-Integration |
| **Sprache** | TypeScript (strict) | Wissenschaftlicher Code, Korrektheit wichtig |
| **Sortition-Engine** | Pyodide + `sortition-algorithms` (Phase 0/1), später ggf. Clean-Room-TS-Port (Phase 2) | Siehe Auflösung Konflikt 2 |
| **Solver** | HiGHS via `highspy` (in Pyodide) bzw. `highs-js` (im späteren TS-Port) | MIT, MIP-fähig, statisches Hosting |
| **CSV-Parsing** | `papaparse` | Bewährt, streaming-fähig |
| **UI-Komponenten** | Kobalte (Solid) oder Radix (React) + Tailwind | Accessible, headless |
| **Internationalisierung** | `@solid-primitives/i18n` / `i18next` | DE primär, EN sekundär |
| **Worker** | Web Worker für Pyodide/Solver | UI bleibt responsiv |
| **Persistenz** | In-Memory default; opt-in Web Crypto + IndexedDB | DSGVO-konservativ |
| **Audit-Signatur** | Ed25519 via Web Crypto | Nachvollziehbarkeit der Losungen |
| **Tests** | Vitest + fast-check (property-based) + Playwright | Korrektheit + Browser-E2E |

### Deployment

Dual-Strategie:

1. **Hosted PWA** auf Cloudflare Pages oder Netlify — Default, kundenfreundlich, automatisches Update, `connect-src 'none'` im CSP → nachweislich keine Datenübertragung.
2. **Signiertes ZIP** zum lokalen Entpacken — für Datenschutz-puristische Kommunen und als Fallback wenn Hosting aus Compliance-Gründen nicht akzeptiert wird.

Keine Electron/Tauri-Wrapper, keine eigene Backend-Infrastruktur. Wenn Benchmark in Phase 0 zeigt, dass Browser-Performance nicht reicht: **statt Tauri/Electron** die Obergrenze auf 1000–1500 Personen pro Pool festschreiben und grössere Jobs ausschließlich per CLI-Variante desselben Codes unterstützen.

### Lizenz

**Apache-2.0** (nicht MIT): behält Patent-Grant, kompatibel mit allen wichtigen Use-Cases, Industrie-Standard. Clean-Room-Reimplementierung auf Basis des Nature-CC-BY-Papers — **keine Code-Zeile** aus dem GPL-3.0-Referenz-Repo übernehmen. Algorithmus-Verifikation durch Golden-Master-Tests gegen die Python-Referenz mit synthetischen Daten ist erlaubt und empfohlen.

### Geschäftsmodell

Wie in Report 05 empfohlen:

- **Produkt-Schicht Apache-2.0 Open Source.** Keine Closed-Source-Features, kein SaaS-Vertrieb, kein Open-Core.
- **Einnahmequelle 1: Prototype Fund** (Bewerbungsfenster 1.10.–30.11.2025, Start Juni 2026 — **für diesen Rhythmus zu spät, nächster Slot 2026/27**). Alternativ BpB / BMI / EU-Förderung.
- **Einnahmequelle 2: Consulting** (Setup, Schulung, Audit, Moderations-Begleitung) — als Subunternehmer-Kanal via nexus, ifok, IPG, Mehr Demokratie.
- **Einnahmequelle 3: Co-Finanzierung Erst-Pilot** — eine Kommune finanziert die Fertigstellung für einen konkreten Bürgerrat.

### Kooperation

- **Liquid Democracy e.V.** als OSS-Partner. adhocracy+ bleibt für die Deliberation, das Sortition-Tool fügt sich daneben in eine mögliche "Bürgerrat-Suite" ein. Fokus: gemeinsame Referenzkunden, gegenseitige Links, keine Code-Vermischung.
- **Demokratie Innovation e.V. / "Es geht LOS"** — ambivalent, teils Kunde/Inspiration, teils Konkurrenz. Erst-Kontakt trotzdem empfehlenswert (Technikstack-Klärung, mögliche Interop-Punkte).
- **Sortition Foundation** — primär Algorithmus-Austausch, möglicher Nachnutzer der TS-Variante, keine direkte Geschäfts-Kollision (DE-Markt vs. UK-Markt).

## Roadmap

### Phase 0 — Feasibility Spike (2 Wochen, Go/No-Go-Entscheidung)

Ziel: **Beantworten, ob Pyodide + `sortition-algorithms` im Browser funktioniert, und wie die Performance auf realen Datenmengen aussieht.**

- **Woche 1:** Pyodide im Web Worker aufsetzen, `sortition-algorithms` laden (ggf. mit Solver-Ersatz `python-mip` → `cvxpy/highspy`), Test mit synthetischen 500/1000/2000-Personen-Datensätzen.
- **Woche 2:** Benchmark dokumentieren (Ladezeit, Laufzeit, Speicherverbrauch, Determinismus bei festem Seed), Bundle-Größe messen, auf Safari/iOS testen.
- **Deliverable:** `PHASE0-REPORT.md` mit harten Zahlen, plus Go/No-Go-Entscheidung.

**Abbruchkriterium:** Wenn Bundle > 50 MB komprimiert oder Laufzeit > 3 min für 500er-Pool oder iOS-Safari-Crash → Phase 0 verlängern um Maximin-TS-Spike, oder Projekt abbrechen.

### Phase 1 — MVP (6–10 Wochen nach grünem Phase 0)

- Web-UI (SolidJS + Vite): CSV-Upload, Spalten-Mapping, Quoten-Editor, Algorithmus-Wahl, Run, Ergebnis-Anzeige, CSV-Export, JSON-Audit-Export mit Ed25519-Signatur
- Pyodide-Integration im Web Worker, Progress-Reporting
- `@sortition/core` als eigenes Package (auch als CLI verwendbar)
- DSGVO-Architektur: `connect-src 'none'` CSP, in-memory default, opt-in verschlüsselte Persistenz
- Tests: Unit (vitest), property-based (fast-check), Golden-Master gegen Python-Referenz, E2E (Playwright) mit Netzwerk-Assert
- Dokumentation: User-Handbuch, Methoden-Dokumentation mit Paper-Zitaten, Audit-Protokoll-Beispiel
- Erst-Pilot-Deployment bei konkretem Kommunen-Partner

### Phase 2 — Clean-Room-Maximin-Port (optional, 4–6 Wochen)

Nur wenn Phase 1 erfolgreich und echte Nachfrage nach einer leichtgewichtigen Variante besteht.

- TypeScript-Port des Maximin-Algorithmus (ohne Pyodide-Abhängigkeit)
- Bundle-Ziel: < 2 MB inkl. `highs-js`
- Golden-Master-Tests gegen Pyodide-Variante
- UI bleibt identisch, nur Engine-Swap per Config

### Phase 3 — Leximin-TS-Port (sehr optional)

Nur wenn Markt klar validiert und explizit mehrere Kommunen Leximin ohne Pyodide fordern. Sonst nicht.

## Go/No-Go-Matrix (für nach Phase 0)

| Signal | Grüne Ampel | Gelbe Ampel | Rote Ampel |
| --- | --- | --- | --- |
| Bundle-Größe (gezippt) | < 35 MB | 35–50 MB | > 50 MB |
| Laufzeit 500er-Pool Leximin | < 60 s | 60 s – 3 min | > 3 min |
| Laufzeit 1000er-Pool Leximin | < 3 min | 3–10 min | > 10 min |
| iOS-Safari | funktioniert | Workaround möglich | nicht nutzbar |
| Pluggable Solver in `sortition-algorithms` | ja | teilweise | nein → TS-Port nötig |
| Erst-Pilot-Kommune zugesagt | ja | in Verhandlung | keine Leads |
| Prototype-Fund / Förderung in Reichweite | ja | möglich | nicht absehbar |
| Consulting-Kanal (nexus/ifok/IPG) offen | ja | erstes Gespräch positiv | unklar |

**Go-Kriterium**: mindestens 5 grün + mindestens 1 Pilot oder Förderung in Verhandlung. Wenn das nach Phase 0 nicht erreicht ist: Projekt auf Eis, Ergebnisse als Blogpost / Conference-Talk kapitalisieren.

## Risiken und Mitigation

| Risiko | Wahrscheinlichkeit | Impact | Mitigation |
| --- | --- | --- | --- |
| MIP-Solver crasht im Browser bei realen Datengrößen | mittel | hoch | Phase-0-Benchmark Pflicht, Obergrenze 1000–1500 Personen als Produkt-Entscheidung |
| iOS-Safari-WASM-Bugs | mittel | mittel | Testen in Phase 0, falls Showstopper: Desktop-First-Positionierung |
| Clean-Room-Port verstößt unabsichtlich gegen GPL | niedrig | hoch | Keine Zeile aus Referenz-Repo anfassen, nur Paper lesen, Dokumentieren des Designprozesses |
| Markt zu klein für wirtschaftliche Tragfähigkeit | hoch | mittel | Nicht als Firma aufziehen, als Consulting-Portfolio-Element halten, Open Source mit minimaler Wartungslast |
| Haftungsrisiko bei fehlerhafter Losung | niedrig | hoch | Apache-2.0-Disclaimer, dokumentierte Test-Coverage, Audit-Signatur, explizite „no warranty"-Klausel im UI |
| Bundle-Größe vertreibt Kunden | mittel | mittel | Phase-2-Maximin-TS-Port als Fallback |
| Kooperation mit „Es geht LOS" scheitert | hoch | niedrig | Parallel-Positionierung statt Konkurrenz, DACH-Markt ist groß genug |

## Offene Fragen (für das Review)

1. **Pyodide-Bundle-Realität**: sind die ~30 MB wirklich akzeptabel für Kommunen mit schlechten Leitungen (ländliche Regionen)? Service-Worker-Caching hilft nur ab der zweiten Nutzung.
2. **Wirklich keine Anonymitätsnachweis-Anforderung?** — könnte ein Kommunen-Kunde einen kryptografischen Nachweis verlangen, dass unser Code nicht doch Daten exfiltriert? Wie weit reicht CSP + Open-Source-Code + externer Audit?
3. **Rechtliche Sicht**: Gibt es DSGVO- oder BMG-Argumente, die eine clientseitige App gegenüber einer Server-Lösung verpflichtend oder problematisch machen? Auftragsverarbeitung wäre mit null Backend trivial, aber Rechenschaftspflicht bleibt.
4. **Finanzierung**: ist der Prototype Fund wirklich der beste Weg, oder gibt es schnellere kommunale Innovations-Töpfe (KommunalDigital-Initiativen, Länder-Förderung)?
5. **Alternative zum Eigenbau**: lohnt sich — anstatt zu bauen — eine **Beratungsdienstleistung auf Basis der Desktop-App der Sortition Foundation**? Zeit-zu-Markt ≈ 0, aber Differenzierung schwach.
6. **Konkreter Erst-Pilot**: wer sind realistische Partner-Kommunen? Welche Ausschreibungs-/Einkaufs-Prozesse gelten?

## Nächste drei konkrete Schritte

1. **Phase-0-Spike starten** (diese Woche): Repo `buergerrat-sortition` anlegen (zunächst weiter im adhocracy-plus-Workspace unter `.issues/research/buergerrat/sortition-tool/`, später in eigenes Repo umziehen), Pyodide-PoC mit synthetischen Daten, Benchmark dokumentieren.
2. **Multi-LLM-Review** dieses Masterplans mit `/issue:review` (Claude + Codex + Gemini) einholen — insbesondere Blind Spots bei Lizenz, DSGVO und Algorithmus-Korrektheit.
3. **Parallele Marktvalidierung**: Erst-Gespräche mit 2–3 potenziellen Pilot-Kommunen + Liquid Democracy e.V. + Demokratie Innovation e.V. Ohne Pilot keinen Build über Phase 0 hinaus.

## Index der Reports

- [01-wasm-solver-landscape.md](01-wasm-solver-landscape.md) — WASM-Solver (231 Zeilen)
- [02-pyodide-feasibility.md](02-pyodide-feasibility.md) — Pyodide-Machbarkeit (302 Zeilen)
- [03-algorithm-port.md](03-algorithm-port.md) — Port-Analyse (362 Zeilen)
- [04-frontend-architecture.md](04-frontend-architecture.md) — Frontend-Architektur (847 Zeilen)
- [05-product-and-licensing.md](05-product-and-licensing.md) — Produkt & Lizenz (496 Zeilen)
