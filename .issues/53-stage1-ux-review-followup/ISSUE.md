---
id: 53
slug: stage1-ux-review-followup
title: Stage 1 UX-Review-Followup — 11 konsolidierte Fixes (Bugs + Sprache + Audit-Sichtbarkeit)
track: Z
estimate_pt: 2.5
status: done
depends_on: [45, 52]
priority: high
priority_rationale: "External UX-Review (3/3 WARN) hat 3 Code-Bugs + 4 High-Priority-UX-Issues identifiziert, die vor Verwaltungs-Einsatz behoben werden müssen"
done_summary: "2026-04-25 — alle 11 Acceptance Criteria umgesetzt in 3 thematischen Commits (94b0140, 8e70ade, 6269913) + Sweep-Commit. 26 Playwright e2e + 69 Vitest core + 26 Vitest web alle grün. Cross-Validation 21/21 grün. Bundle-Delta +9.98 KB raw / +2.62 KB gzip (innerhalb Budget +10/+3). Stage 3 CsvImport bewusst nicht refactored (Test-Schutz)."
---

# Stage 1 UX-Review-Followup

## Kontext

Externer 3-LLM-UX-Review (Claude opus-4-7, Codex gpt-5.4, Gemini 3.1-pro-preview) auf die in #52 gebaute Reporting-UX hat 3 Code-Bugs + 8 UX-Themen mit Konsens-Verbesserungs-Vorschlägen ergeben. Verdict aller drei: **WARN** (keine Critical-Blocker, aber substanzielle Verbesserungen vor Realnutzung).

Volle Reviews: `.issues/stage-1-group-reporting-ux-review/reviews/`.

Die 11 Fixes sind nach Wichtigkeit gegliedert: Code-Bugs zuerst (G/H/K), dann sprachliche/Trust-Konsens-Themen (A/B/C/D), dann zweite UX-Polish-Welle (E/F/I/J).

## Ziel

Stage 1 UX shipfertig für Realnutzung in Verwaltungs-Sitzungen. Nach Abschluss: zweiter Smoke-UX-Review optional.

## Acceptance Criteria

### Code-Bugs (Sofort, alle 3 Reviewer einig sind das fehlerhaft)

- [ ] **G — Underfill-Sortierung mathematisch korrekt** (`apps/web/src/stage1/Stage1Panel.tsx:101-107`): Sort-Funktion auf `(b.n_h_target - b.n_h_actual) - (a.n_h_target - a.n_h_actual)` korrigieren, Vitest-Case mit zwei Strata mit unterschiedlichen Lücken zur Verifikation
- [ ] **H — Stale Result clearen bei Parameter-Änderung** (`Stage1Panel.tsx:142-165, 220-373, 375-578`): `createEffect` der `setOutput(null)` ruft sobald `targetN()`, `selectedAxes()`, `seed()` oder `parsed()` sich nach einem Lauf ändern. Alternativ: visuelles "veraltet"-Badge auf Result-Sektion. Variante 1 bevorzugt
- [ ] **K — `<label>` mit `for=` / `id=` koppeln** (`Stage1Panel.tsx:259-275`): Stichprobengröße-Input und Seed-Input bekommen explizite `id=` und Labels `for=`-Attribute. Ggf. Playwright-Test mit `getByLabel` statt `getByTestId` für eines davon

### Konsens-UX (3/3 oder 2/3 Reviewer einig)

- [ ] **A — Sprache: "Stratum" → "Bevölkerungsgruppe" oder "Gruppe"**: Card-Labels, Tabellen-Header, Markdown-Bericht-Headlines, Hilfetexte. "Stratum-Detail" wird "Detail-Tabelle (Bevölkerungsgruppen)". "Stratum-Abdeckung" wird "Gruppen mit mind. 1 gezogenen Person" oder "Gruppen-Abdeckung". Cardlabel ggf. mit `(?)`-Tooltip mit der technischen Definition
- [ ] **B — Sichtbarer Audit-/Signatur-Footer im Result-View**: Neue Sektion am Ende des Result-Bereichs (vor den Export-Buttons) mit Eingangs-Datei-Hash, Algorithmus-Version, Zeitstempel, Public Key (gekürzt), Signatur-Algorithmus + Signatur (gekürzt). Print-CSS lässt diese Sektion sichtbar (im Gegensatz zu Buttons)
- [ ] **C — Seed-Workflow konsistent**: ENTWEDER Default-Seed leer/null + Run-Button disabled bis Eingabe (Variante 1) ODER Hint umformulieren auf "Sie können den Default-Seed (aktuelle Unix-Sekunde) übernehmen oder einen gemeinsam vereinbarten Wert eingeben" (Variante 2). Variante 1 bevorzugt — Aktion-erfordernd ist konsistent mit "öffentlich vor Lauf wählen"
- [ ] **D — Run-Button nicht unter Vorschau verstecken**: Den "Versand-Liste ziehen"-Button entweder oberhalb der Vorschau (zwischen Seed-Input und Vorschau-Block) ODER als sticky-Footer (`position: sticky; bottom: 0`). Sticky-Footer bevorzugt — Vorschau bleibt scrollbar während Button immer sichtbar

### UX-Polish (zweite Welle, hauptsächlich Claude/Codex)

- [ ] **E — SVG-Bar-Chart a11y + Print-Robustheit**: SVG `<rect>`-Elemente bekommen `<title>`-Children mit Wert-Beschreibungen ("Soll: 12 Personen"). SVG-Wurzel bekommt `<desc>` mit kompakter Aggregat-Zusammenfassung. Soll-Balken bekommt zusätzlich ein SVG-`<pattern>` (z.B. diagonale Striche) damit Graustufen-Druck Soll/Ist unterscheiden kann
- [ ] **F — Tab-Subtitles + Workflow-Erklärer**: Stage-1-Tab bekommt Untertitel "Melderegister → Versand-Liste", Stage-3-Tab "Antwortende → Panel". Optional: einzeilige Erklärung über den Tabs "Verfahren in 3 Schritten: 1. Versand-Liste (hier) 2. Antworten extern sammeln 3. Panel ziehen"
- [ ] **I — CSV-Vorschau-Tabelle in Stage 1**: Nach Upload zeigt Stage 1 die ersten 5 Zeilen der CSV als Tabelle (analog `apps/web/src/csv/CsvImport.tsx:85-121`). Idealerweise als gemeinsame `<CsvPreview>`-Komponente extrahiert und in beide Stages eingebaut
- [ ] **J — Vorschau zeigt namentlich problematische Strata, nicht nur Counts**: Wenn `zeroAllocationStrata > 0` oder `underfillStrata > 0`, zeigt der Vorschau-Block die ersten 5 betroffenen Stratum-Schlüssel + ihre Pool/Soll-Zahlen, mit "weitere X anzeigen"-Toggle wenn mehr

### Test + Build

- [ ] Alle bestehenden Tests bleiben grün (Vitest 80, Playwright 12, Cross-Validation 21)
- [ ] Neue Vitest-Tests für: G (Underfill-Sort-Reihenfolge), H (Result wird gecleart bei Param-Change), B (Audit-Footer im DOM), J (Strata-Liste im Vorschau-Block)
- [ ] Bundle-Delta unter +10 KB raw / +3 KB gzip dokumentieren in commit-message

## Out of Scope

- Verfahrens-Name als Eingabefeld + Filename-Anpassung (Claude M2 — eigener Issue, weil Persistenz dafür gebraucht wird)
- Drag-and-Drop CSV-Upload-Konsolidierung (Claude M3 — größerer Refactor, eigener Issue)
- Performance-Debounce für Vorschau-Recompute (Claude M8 — wartet auf Real-User-Daten, ob >6000-Pools tatsächlich genutzt werden)
- Theoretische-vs-occupied-Strata-Warnung (Claude L6 — Edge-Case ohne Konsens-Bedarf)
- Underfill-Card "0 / 0"-Zustand bei SRS (Claude L3 — kosmetisch, nicht blocker)

## Verweise

- Review-Findings: `.issues/stage-1-group-reporting-ux-review/reviews/review-*.md`
- Vorgänger-Issues: #45 (Stage 1 Sampler), #52 (Reporting UX)
- Algorithmus-Doc: `docs/stage1-algorithm.md`
- Branch: alle Fixes auf `worktree-agent-ac76adcb` (gleiche Stage-1-Branch wie #45/#52)
