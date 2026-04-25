# 07 — Zwei-Stufen-Workflow-Analyse: Architektur-Lücke und Scope-Korrektur

> **Status:** Analyse, 2026-04-25.
> **Auslöser:** User-Frage nach Compute-Aufwand für 20.000-Wahlberechtigten-Pool. Klärung ergab: die App ist heute ein-stufig konzipiert, der reale Workflow ist zwei- bis vier-stufig. Iteration-2-Backlog adressiert die falsche Stage.
> **Konsequenz:** Iteration-2-Plan teilweise neu priorisieren, neue Issues für Stage 1 / Reserve-Liste hinzufügen.

---

## TL;DR

1. **Aktuelle App nimmt an:** Eingabe-CSV ist bereits der Antwortenden-Pool (Selbstauskunft inklusive Bildung/Migrationshintergrund). Engines A/B/C optimieren von dort direkt auf das finale Panel. Ein Schritt, eine CSV, ein Maximin-Lauf.
2. **Realer Workflow** für eine Gemeinde mit ~6.000 Wahlberechtigten und Zielpanel ~30:
   - **Stage 1:** Stratifizierte Zufallsstichprobe aus Melderegister → Versand-Liste (300–1.500 Personen, abhängig von Outreach-Modell).
   - **Stage 2:** Anschreiben + Telefon-Nachverfolgung → ~30–60 Antwortende.
   - **Stage 3:** Maximin-Auswahl auf den Antwortenden → finales 30er-Panel.
   - **Stage 4:** Reserveliste, Ersatz-Nachzieher bei mid-process Drop-out.
3. **Algorithmischer Schwerpunkt verschiebt sich.** Der bisher als "Kern" behandelte Maximin-MIP ist nur in Stage 3 relevant. Stage 1/2/4 sind O(N)-Operationen, die im Browser trivial sind und die heute komplett fehlen.
4. **Iteration-2-Wert sinkt nicht auf null**, aber das **Hauptrisiko** der App ist nicht "Engine A liefert 17 % schlechteres min π" — es ist "App kann den realen Workflow gar nicht abbilden".

---

## A. Was die App heute kann (Code-Stand 2026-04-25)

| Komponente | Annahme | Datei:Zeile |
| --- | --- | --- |
| CSV-Schema | 6 semantische Felder: `person_id, gender, age_band, education, migration_background, district`. Keine Trennung Register vs. Selbstauskunft. | `apps/web/src/csv/parse.ts:102-109` |
| Pool-Datentyp | `PoolRow` mit Demografie-Feldern. **Kein** `is_respondent`, `response_status`, `stratum_id`. | `packages/core/src/pool/generator.ts:41-48`, `packages/engine-contract/src/types.ts:24-29` |
| Quoten | `min`/`max` als **harte Constraints**. Infeasibility → Error. | `packages/engine-contract/src/types.ts:33-38`, `apps/web/src/quotas/model.ts:76-96` |
| Engine-Lauf | `engine.run({ pool, quotas, params })` — gesamter Pool ist Kandidaten-Menge. | `packages/engine-a/src/engine.ts:70-85` |
| UI-Workflow | CSV-Import → Mapping → Quoten → Run → Ergebnis. **Eine Stufe.** | `apps/web/src/App.tsx:17-46`, `apps/web/src/run/RunPanel.tsx:11-95` |
| Replace/Extend | `replaceSinglePerson` zieht beliebigen Pool-Kandidaten — **kein Stratum-Filter, keine Reserve-Liste**. | `packages/engine-a/src/panel-ops.ts:27-89` |

**Konsequenz:** Wer die App heute nutzt, müsste vor dem CSV-Import bereits "Versand → Antwort → Selbstauskunft" prozessual durchlaufen haben. Die App löst nur den letzten Schritt (Stage 3).

---

## B. Realer Workflow nach DACH-Praxis

### Quellen

- Bundestag Methodikblatt Zufallsauswahl (Bürgerrat Ernährung 2023): <https://www.bundestag.de/resource/blob/954136/c5fd9f3234397c6482e5519b6a4b17a0/zufallsauswahl_pdf-data.pdf>
- Bundestag Pressemitteilung 13.07.2023: 19.327 Einladungen → 2.220 Antwortende → 160 Panel (11,5 % Rücklauf). <https://www.bundestag.de/webarchiv/presse/pressemitteilungen/2023/pm-230713-buergerlotterie-958110>
- Sortition Foundation ECPS-Methodology: <https://www.sortitionfoundation.org/ecps_methodology>
- Sortition Foundation "How to run a Citizens' Assembly": <https://www.sortitionfoundation.org/how>
- Flanigan et al. (Nature 2021): <https://www.nature.com/articles/s41586-021-03788-6>
- BMG §46 + DSGVO (eigene Vorab-Recherche): `research/03-legal-framework-and-best-practices.md:200-280`

### Stage 1 — Bevölkerung → Versand-Liste

- **Eingabe:** Melderegister-Auszug nach BMG §46. **Rechtlich verfügbare Felder:** Familienname, Vornamen, Doktorgrad, Geburtsdatum, Geschlecht, Staatsangehörigkeit, Anschrift. **Nicht verfügbar:** Bildung, Beruf, Einkommen, Migrationshintergrund.
- **Algorithmus:** proportionale stratifizierte Zufallsstichprobe (Fisher-Yates pro Stratum). Stratifikation primär nach Stadtbezirk und ggf. Alter × Geschlecht.
- **Größenordnung Versandliste:**
  - **Reine Postwurfsendung** ohne Nachfasser: 5–10 % Rücklauf (Bundestags-Zahl 11,5 %). Für Zielpanel 30 → benötigt ~300 Antwortende → Versandliste **3.000–6.000** (= praktisch das gesamte Wählerverzeichnis bei n=6.000).
  - **Mit Telefon-Nachverfolgung** (User-Modell): Konversionsrate 30–50 %. Für Zielpanel 30 → ~60–100 Antwortende → Versandliste **200–400**. Das ist die User-Größenordnung "300".
  - **Konsequenz:** Die "300" ist nur sinnvoll mit aktivem Outreach. Reines Postversand-Modell skaliert nicht.
- **Komplexität:** O(N), Millisekunden, **kein Solver nötig**.
- **Library-Coverage:** `sortition-algorithms` exponiert das **nicht**. Es muss als ~50 LoC TypeScript-Modul neu gebaut werden.

### Stage 2 — Versand → Antwortende

- **Outreach:** Anschreiben mit Online-Formular oder Telefon-Hotline. Optional Phone-Nachfasser.
- **Antwortrate:** 5–15 % rein postalisch, 30–50 % mit Telefon-Nachfasser.
- **Selbstauskunft:** hier kommen Bildung, Migrationshintergrund, Beruf hinzu (DSGVO-Einwilligung pro Person).
- **Algorithmische Aufgabe:** keine. Workflow-Aufgabe (UI für Status-Erfassung "angeschrieben", "abgesagt", "zugesagt", "selbstauskunft eingegangen").

### Stage 3 — Antwortende → Panel

- **Eingabe:** ~30–300 Personen mit voller Selbstauskunft.
- **Algorithmus:** Maximin/Leximin (sortition-algorithms). **Hier — und nur hier — ist die MIP-Optimierung.**
- **Pool-Größen-Bandbreite kommunal:** 60–300. Bundesweit (Ausreißer): bis ~2.220 (Bürgerrat Ernährung).
- **Empirische Laufzeit (HiGHS, nativ Python, eigene Iteration-1-Messung):**

  | Pool / Panel | Reference C wall-time |
  |---|---|
  | 100 / 20 | 854 ms |
  | 200 / 20 | 7.7 s |
  | 300 / 45 (Upstream-Benchmark, HiGHS) | 30 s |
  | 500 / 75 | 148 s |

  → für die kommunal realistischen 60–150 Acceptors: **Sub-Sekunde nativ, ~2–5 s in Pyodide**. Nicht das Skalierungs-Problem, das Iteration-2 löst.

### Stage 4 — Mid-process Replacement

- **Standard-Praxis:** Reserveliste parallel zum Hauptpanel (Sortition Foundation: "extensive reserve list with carefully matched profile"). Ersatz wird **nicht durch Re-Run** des Sortition-Algorithmus gezogen, sondern aus der Reserve.
- **Komplexität:** O(reserve-size).
- **State-of-the-Art (2025):** *"Alternates, Assemble!"* (Caragiannis et al., arXiv 2506.15716) und *"Near-Optimal Dropout-Robust Sortition"* (arXiv 2511.16897) formalisieren ERM-Alts und MinMax-Pipage. **Keine Library-Implementierung.** Akademische Arbeit, in der Praxis nicht eingesetzt — Iteration 3+.

---

## C. Zentrale Lücke

Der Pool-Begriff im Code ist **doppeldeutig**. Er kann meinen:

| Bedeutung | Stage | Größe Gemeinde 6k | Selbstauskunft? | Solver nötig? |
|---|---|---|---|---|
| (a) Wählerverzeichnis-Auszug | Stage 1 Input | 6.000 | nein (BMG §46) | nein |
| (b) Versand-Liste | Stage 1 Output / Stage 2 Input | 300–1.500 | nein | nein |
| (c) Antwortenden-Pool | Stage 3 Input | 30–300 | **ja** | ja (Maximin) |
| (d) Akzeptor-Pool nach Selbstauskunft-Validierung | Stage 3 Input refined | 30–150 | ja | ja |

**Die heutige Engine arbeitet implizit auf (c)/(d).** Aber die UI und das CSV-Schema bieten keine Möglichkeit, von (a) nach (b) zu kommen — und das ist der erste Schritt, den eine Verwaltung machen muss.

**Beleg, dass Maximin tatsächlich nur auf (c)/(d) gehört:**
- `sortition-algorithms` Concept-Dokumentation: "the candidate pool contains all eligible individuals with their demographic data" — Selbstauskunft-Felder werden vorausgesetzt.
- `committee_generation/maximin.py:206-340` — Constraint-Generierung über Quoten-Korridore, die Bildung/Migrationshintergrund einschließen können. Das geht nur post-Selbstauskunft.
- Flanigan et al. 2021 Methods, Datasets `sf_a..sf_g`: alle Datensätze sind Antwortenden-Pools, nicht Wählerverzeichnisse.

---

## D. Vergleich mit aktuellem Iteration-2-Plan

### Was Iteration 2 heute löst

| Issue | Stage-Bezug | Wert nach Reframing |
|---|---|---|
| #26 Worker-Isolation | UI-Hygiene Stage 3 | **bleibt wertvoll** (UI bei MIP-Lauf nicht blocken) |
| #40 Engine A echte Column Generation | Stage 3, Pool-Größen 100–500 | **Wert sinkt**: bei n=60–150 ist Engine A ggf. schon adäquat. Lücke 17 % wurde auf n=200 gemessen — bei n=80 vermutlich kleiner. Erst durch Messung an realen Pool-Größen entscheidbar. |
| #42 Engine B (Pyodide + sortition-algorithms) | Stage 3, kanonische Implementation | **bleibt wertvoll** (Verifikations-Backbone, Audit-Schiene). Bundle-Size 30–40 MB akzeptabel, weil Stage 3 nur einmal pro Bürgerrat läuft. |
| #41 Pipage-Rounding | Stage 3 Determinismus | bleibt wertvoll (Audit-Reproduzierbarkeit) |
| #27 Cross-Runtime-Drift | Stage 3 Vergleichs-Robustheit | bleibt wertvoll (datengetrieben Engine-A vs B vs C) |
| #28 Statistical Seed Sweep | Stage 3 | bleibt wertvoll |
| #29 Property Tests | Stage 3 | bleibt wertvoll |
| #30 Native Large-Pool Benchmark (500/1000/2000) | Stage 3 | **Wert sinkt**: 1.000–2.000 ist nicht der reale Bürgerrat-Acceptor-Pool. Sinnvoller: Benchmark auf 30–300 mit hoher Seed-Auflösung. |
| #36 Hash-Parity Golden | Audit | bleibt wertvoll |
| #39 Panel-Ops UI (Reroll/Replace/Extend) | Stage 3/4 | **scope unklar**: Replace ist nur sinnvoll wenn Reserve-Liste existiert. Heute fehlt diese Datenstruktur. |
| #43 LP-Solver-Tuning | Stage 3 | bleibt wertvoll |
| #44 CI-Benchmark-Gate | Stage 3 | bleibt wertvoll, Baseline-Pool-Größen sollten kommunal-realistisch sein, nicht 2.000+ |

**Zusammenfassung:** 8 von 12 Issues sind unverändert wertvoll. 3 Issues (#30, #39, #40) brauchen Scope-Korrektur an realistische Pool-Größen. 0 Issues löschen.

### Was Iteration 2 heute NICHT löst — die echten Lücken

| Lücke | Geschätzter Aufwand | Typ |
|---|---|---|
| **Stage 1 Sampler** (Melderegister-CSV → Versand-Liste, BMG §46 Felder, proportionale Stratifikation) | 1–2 PT | **Neuer** Issue, P0 |
| **Datenmodell-Erweiterung** Person um `response_status`, `stratum_id`, optional `selbstauskunft_eingegangen_am` | 0.5 PT | Neuer Issue, P0 |
| **Reserve-Liste-Workflow** (parallel zum Hauptpanel ziehen, bei Drop-out Match aus Reserve) | 1.5 PT | Neuer Issue, P1 |
| **Stratum-Filter in `replaceSinglePerson`** | 0.5 PT | Anpassung Issue #39, oder eigener Issue |
| **Anschreiben-/Status-UI** (CSV-Export der Versand-Liste, CSV-Re-Import mit Antwort-Status) | 1.5 PT | Neuer Issue, P1 |
| **Soft-Constraints für Stage 1** (Zielwerte statt min/max, weil Versand keine harten Quoten erfordert) | 1 PT | Neuer Issue, P2 — optional, naive Stratifikation reicht |

**Gesamt-Lücke: ~5–7 PT zusätzlich.** Iteration 2 wächst dadurch von ~22.5 PT auf ~28–30 PT.

---

## E. Konkrete Ziele für Iteration 2 (überarbeitet)

### Track Z (NEU) — Workflow-Stages aktivieren

**Ergebnis:** App bildet Stage 1, 2, 3 ab. Eine Verwaltung kann Melderegister-CSV importieren und kommt mit dem Tool von Bevölkerung bis Panel.

| Issue (neu) | Slug | Est | Prio | Deps |
|---|---|---|---|---|
| 45 | stage-1-stratified-invitation-sampler | 2 PT | critical | — |
| 46 | data-model-response-status | 0.5 PT | critical | — |
| 47 | stage-2-status-tracking-ui-csv-roundtrip | 1.5 PT | high | 45, 46 |
| 48 | stage-4-reserve-list-workflow | 1.5 PT | high | 45, 46 |

### Track A überarbeitet — Algorithmus-Parität nur an realen Größen

| Issue | Anpassung |
|---|---|
| #40 | Akzeptanzkriterium: min-π-Lücke auf **n=60, n=100, n=150** (kommunal-realistisch) messen, nicht nur n=200. Ziel <2 % bleibt, aber Erfolgsschwelle "Lücke schon klein genug" ist explizit als Exit-Kriterium aufzunehmen. |
| #42 | unverändert (Engine B kanonisch wertvoll als Audit-Verifikation) |
| #41 | unverändert |
| #30 | Pool-Größen revidieren auf **60, 100, 150, 300, 500** (statt 500/1000/2000). 1000+ als optionaler Stretch markieren. |

### Track B / C — unverändert sinnvoll

#26, #27, #28, #29, #36, #39, #43, #44 bleiben wie geplant. #39 bekommt zusätzlichen Scope-Hinweis: "Replace zieht aus Reserve-Liste (#48), nicht aus Pool".

### Out-of-Scope nach wie vor

- ERM-Alts / MinMax-Pipage (Iteration 3+, nur arXiv-Preprints, keine Library)
- Echte Melderegister-Anbindung (Iteration 3+, braucht E-Government-API/AVV)
- Phone-Tracking-Integration (Iteration 3+, Telefon-System-Anbindung)

---

## F. Was das für die Compute-Frage des Users bedeutet

**Frage war:** "20.000-Personen-Pool, wie lang dauert das?"

**Antwort nach diesem Reframing:**

- 20.000 Personen sind **niemals der Maximin-Pool**. Das wäre Stage 1 (Versand-Auswahl, falls jemand wirklich 20.000 Briefe verschickt — bundesweit-Niveau).
- Stage 1 auf 20.000: stratifizierte Zufallsstichprobe ohne Solver, **<100 ms** in jeder Sprache, auch im Browser.
- Stage 3 (Maximin) bekommt dann 200–2.000 Antwortende. Bei 2.000 (oberster Bundes-Bürgerrat-Wert): in Browser-HiGHS realistisch nicht abschließbar (>17 min in Iteration-1-Native-Test). Bei 200: 7 s nativ, ca. 30 s Pyodide.
- Für eine **Gemeinde 6.000 → Panel 30** sind die realistischen Größen Stage 1 = 6.000 (trivial), Stage 3 = 60–150 Personen (Sub-Sekunde nativ, ~5 s Pyodide). **Volltauglich für Browser.**

Das ursprünglich kommunizierte Risiko "Browser kann das nicht in vertretbarer Zeit" war **falsch geframet**. Es kann es — aber nur wenn die App vorher die Zwei-Stufen-Logik abbildet, die der reale Workflow erfordert.

---

## G. Empfehlung

**Vor Iteration-2-Cloop-Start zwei Entscheidungen treffen:**

1. **Pivot auf Track Z (4 neue Issues, ~5.5 PT).** Andernfalls liefert Iteration 2 ein Tool, das technisch beeindruckend ist (3 Engines, Drei-Wege-Vergleich) aber im realen Verwaltungs-Workflow nicht einsetzbar.
2. **Scope-Korrektur an #30 und #40.** Pool-Größen auf 60–300 statt 500–2.000 fokussieren. Optionaler Stretch bleibt, aber Pflicht-Erfolgskriterien sind kommunal-realistisch.

**Falls Pivot zugesagt:**
- Ich erzeuge die 4 neuen Issues (#45–48) mit ISSUE.md-Stubs nach gleicher Konvention wie #26–44.
- Ich aktualisiere README.md-Reihenfolge: #45 → #46 → #26 → #40 → … (Stage-Logik vor Engine-Optimierung, weil Stage 1 sofort nutzbaren Wert liefert).
- Ich passe `06-review-consolidation.md` Backlog an.

**Falls kein Pivot:** Iteration 2 läuft wie geplant, aber im End-Report muss explizit dokumentiert werden, dass der Workflow noch nicht abgebildet ist und in Iteration 3 als P0 vorgezogen wird.

---

## H. Quellen-Nachweis

| Behauptung | Quelle |
|---|---|
| BMG §46 verfügbare Felder | research/03-legal-framework-and-best-practices.md:200-280 |
| 11,5 % Rücklauf Bürgerrat Ernährung | bundestag.de Pressemitteilung 13.07.2023 |
| 5–10 % typischer Rücklauf | sortitionfoundation.org/ecps_methodology |
| Maximin-Pool ist Acceptors, nicht Bevölkerung | sortitionfoundation.github.io/sortition-algorithms/concepts |
| Reserve-Liste-Praxis | sortitionfoundation.org/how |
| Empirische Maximin-Laufzeiten (eigene Messung) | docs/quality-comparison-iteration-1.md:24-32 |
| Upstream HiGHS-Benchmark 150–750 | sortition-algorithms/docs/benchmark_results.md (geprüft Januar 2025) |
| Engine A Pool-Begriff (alle Personen Antwortende) | apps/web/src/run/RunPanel.tsx:11-95, packages/engine-a/src/engine.ts:70-85 |
| Quoten als hart durchgesetzt | packages/engine-contract/src/types.ts:33-38 |
| Replace zieht beliebig aus Pool | packages/engine-a/src/panel-ops.ts:27-89 |
| ERM-Alts (akademisch, keine Library) | arxiv.org/html/2506.15716v1 |
| MinMax-Pipage (akademisch, keine Library) | arxiv.org/html/2511.16897 |

**Unbestätigt** (im Material nicht primär verifiziert, mit Quellen-Lücke kenntlich gemacht):
- Konkrete Nachrücker-Mechanik des Bundestag-Bürgerrats Ernährung (eigenes Verfahrensdokument nicht eingesehen)
- Telefon-Konversionsraten 30–50 % — Faustzahl aus Marktforschungs-Praxis, ohne primäre Quelle
- DGS-Tool / ifok als Sortition-Tool-Anbieter (nur als Beratungsdienstleister belegt)
