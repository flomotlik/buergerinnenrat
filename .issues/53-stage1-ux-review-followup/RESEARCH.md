# Research — Issue #53 Stage 1 UX-Review-Followup

> Lightweight: alle Bug-Locations und UX-Punkte stammen aus dem 3-LLM-Review (`.issues/stage-1-group-reporting-ux-review/reviews/`). Diese Datei konsolidiert die Code-Verweise + Sprung-Hinweise für den Planner.

## User Constraints (verbatim aus CONTEXT.md)

- Branch: `worktree-agent-ac76adcb`, KEIN neuer Worktree
- Variante 1 für H (createEffect-Reset)
- Variante 1 für C (Default vorbefüllt + "bitte vereinbaren"-Status, Run blockiert bis Confirm/Edit)
- Variante 1 für D (sticky-Footer)
- Sprach-Glossar siehe CONTEXT.md
- Bundle-Budget +10 KB raw / +3 KB gzip

## Summary

Drei Klassen von Fixes:
1. **Code-Bugs (G/H/K):** mathematisch oder semantisch falsch im Status quo, müssen behoben werden
2. **Sprache + Trust (A/B/C):** Konsens-UX-Verbesserungen für Verwaltungs-Lesbarkeit und Audit-Sichtbarkeit
3. **Layout + Polish (D/E/F/I/J):** zweite Welle Verbesserungen aus 2-3 Reviewer-Stimmen

Empfehlung Plan: drei thematische Commits (Bugs, Sprache+Trust, Polish) statt 11 mikro-Commits, dann ein Test-Sweep-Commit am Ende.

## Codebase Analysis

### Underfill-Sortierung (G)
<interfaces>
- `apps/web/src/stage1/Stage1Panel.tsx:101-107` — aktueller `underfills`-Memo mit falscher Sort-Funktion
- Korrekt: `.sort((a, b) => (b.n_h_target - b.n_h_actual) - (a.n_h_target - a.n_h_actual))`
- Empfehlung: Sort-Logik in `packages/core/src/stage1/reporting.ts` als pure Funktion `sortUnderfillsByGap(strata: StratumResult[]): StratumResult[]` extrahieren, von Stage1Panel.tsx importieren. Macht G testbar im Vitest-Pure-Modus.
</interfaces>

### Stale Result (H)
<interfaces>
- `apps/web/src/stage1/Stage1Panel.tsx:42` — `output` Signal
- `apps/web/src/stage1/Stage1Panel.tsx:111, 148, 159` — die Stellen wo `setOutput` heute gerufen wird
- `apps/web/src/stage1/Stage1Panel.tsx:38, 39, 40, 41, 36` — `targetN, seed, seedSource, running, parsed, selectedAxes` als reaktive Sources
- Neuer `createEffect`: track `targetN(), selectedAxes(), seed(), parsed()` und ruf `setOutput(null)` falls `output() !== null`. Nicht beim Mount feuern (Solid `createEffect` feuert beim Mount — also `untrack` für ersten Lauf oder `on(..., handler, { defer: true })`).
</interfaces>

### Label-Kopplung (K)
<interfaces>
- `apps/web/src/stage1/Stage1Panel.tsx:259-261` — Stichprobengröße-Input (label hat kein for)
- `apps/web/src/stage1/Stage1Panel.tsx:273-275` — Seed-Input (label hat kein for)
- Fix: `<label for="stage1-target-n">...</label>` und `<input id="stage1-target-n" ...>`. data-testid bleibt unverändert für Playwright-Compat.
</interfaces>

### Sprache (A)
<interfaces>
- `apps/web/src/stage1/Stage1Panel.tsx:399, 408, 411, 504-510` — UI-Strings "Stratum-Abdeckung", "Stratum-Detail (Kreuzkategorien-Tabelle, ...)", "(gesamt)"
- `packages/core/src/stage1/reporting.ts:233, 263, 270` — Markdown-Bericht-Headlines "Stratum-Abdeckung", "Stratum-Detail (Cross-Product-Tabelle)"
- `apps/web/src/stage1/AxisBreakdown.tsx:43` — Header "Achse: ..."
- Sprach-Glossar siehe CONTEXT.md. UI-Strings in beiden Dateien (Stage1Panel + reporting.ts) konsistent halten.
</interfaces>

### Audit-Footer (B)
<interfaces>
- `apps/web/src/stage1/Stage1Panel.tsx:436-440` — Status-Quo: nur Laufzeit + Seed (kein Hash, keine Signatur)
- `out().signedAudit.doc` enthält: `input_csv_sha256, algorithm_version, prng, tie_break_rule, key_encoding, stratum_sort, timestamp_iso, public_key, signature, signature_algo`
- Neue Komponente: `apps/web/src/stage1/AuditFooter.tsx` mit `props.doc: Stage1AuditDoc`
- CSS: Footer NICHT in `print:hidden` aufnehmen (im Gegensatz zu den Buttons)
</interfaces>

### Seed-Workflow (C)
<interfaces>
- `apps/web/src/stage1/Stage1Panel.tsx:38-39` — `seed` und `seedSource` Signals
- `Stage1Panel.tsx:74-76` — `canRun()` derived
- Neue Logik: zusätzliches Signal `seedConfirmed: Signal<boolean>`. canRun() braucht `seedConfirmed() === true`. `changeSeed()` setzt `seedConfirmed(true)`. Neuer Button "Default-Seed übernehmen" setzt `seedConfirmed(true)` ohne Wert zu ändern.
- UI: Default-Wert ist sichtbar im Input, daneben Status "(Default — bitte gemeinsam vereinbaren oder bestätigen)" wenn !confirmed, sonst "(manuell)" oder "(bestätigt)".
</interfaces>

### Run-Button Sticky (D)
<interfaces>
- `apps/web/src/stage1/Stage1Panel.tsx:361-371` — Run-Button-Wrapper-Div
- Wrapper: `<div class="sticky bottom-0 bg-white border-t pt-2 -mx-4 px-4">` (Tailwind-Klassen + Negativ-Margin um die Section-Padding zu kompensieren)
- Print-CSS: sticky-Verhalten in print weglassen (statisch rendern)
</interfaces>

### SVG a11y + Pattern (E)
<interfaces>
- `apps/web/src/stage1/AxisBreakdown.tsx:73-101` — rect-Elemente
- Pattern definieren: `<defs><pattern id="stripes" patternUnits="userSpaceOnUse" width="6" height="6">...</pattern></defs>` ein einziges Mal pro AxisBreakdown
- Soll-Balken: `fill="url(#stripes)"` statt `fill="#94a3b8"` — Achtung: ID muss eindeutig pro Axis-Komponente sein, sonst kollidiert. Vorschlag: `id={`stripes-${marginals.axis}`}`
- `<rect><title>Soll: 12 Personen (von Pool 87)</title></rect>`
- SVG `<desc>` mit Aggregat-Summary
</interfaces>

### Tab-Subtitles (F)
<interfaces>
- `apps/web/src/App.tsx` (Tab-Switcher in `[data-testid="tab-stage1"]` und `[data-testid="tab-stage3"]`)
- Erweitern: 2-zeiliger Tab-Inhalt mit Hauptlabel + kleinem Untertitel ("Aus Melderegister" / "Aus Antwortenden")
- Stage 1 Panel-Header bekommt prefix "Schritt 1 von 3 — Versand-Liste ziehen"
- Stage 3 Panel-Header analog "Schritt 3 von 3 — Panel ziehen"
</interfaces>

### CSV-Vorschau (I)
<interfaces>
- `apps/web/src/csv/CsvImport.tsx:85-121` — bestehende Vorschau-Tabelle in Stage 3
- Neue Komponente: `apps/web/src/csv/CsvPreview.tsx` mit `props: { headers: string[]; rows: Record<string,string>[]; maxRows?: number }`
- Stage 1 Stage1Panel.tsx nach Pool-Summary einbauen
- Refactor von Stage 3: NUR wenn 0 e2e-Tests brechen — sonst Stage 1 inline mit Note
</interfaces>

### Vorschau-Strata-Liste (J)
<interfaces>
- `apps/web/src/stage1/Stage1Panel.tsx:329-356` — aktueller Vorschau-Warnungs-Block
- `preview().result.rows` enthält PreviewRow[] mit `{ key, n_h_pool, n_h_target, wouldUnderfill }`
- Filter: `rows.filter(r => r.n_h_target === 0)` und `rows.filter(r => r.wouldUnderfill)`
- Anzeige: bis zu 5 pro Kategorie mit den ersten Zeilen, dann `<details><summary>weitere X anzeigen</summary>...</details>`
</interfaces>

## Architektur-Empfehlung für die Tasks

**Commit-Strategie (3 Commits, nicht 11):**
1. `fix(stage1): correct underfill sort, clear stale result, label associations (G/H/K)` — Code-Bugs als kleinster, atomarster Commit
2. `feat(stage1): plain-language labels + visible audit footer + seed confirmation (A/B/C)` — Konsens-UX-Trust
3. `feat(stage1): sticky run, svg a11y/patterns, tab subtitles, csv preview, preview detail (D/E/F/I/J)` — Polish

Tests sollten im jeweils selben Commit sein wie der Code, gemäß CLAUDE.md / Kickoff-Prompt-Regel.

## Implementierungs-Risiken

1. **Solid `createEffect` Stale-Result-Reset (H):** muss `untrack` oder `on(..., { defer: true })` nutzen, sonst feuert es beim Mount und löscht das Output bevor irgendwas existiert. Saubere Lösung: `createEffect(on([targetN, selectedAxes, seed, parsed], () => { if (output() !== null) setOutput(null); }, { defer: true }))`.
2. **Pattern-ID-Kollision (E):** wenn 3 AxisBreakdown-Komponenten gleichzeitig im DOM sind und alle `id="stripes"` definieren, kollidieren die SVG-`<defs>`. Pro-Achsen-ID nutzen.
3. **CsvPreview-Refactor (I):** wenn Stage 3 Tests die exakte DOM-Struktur prüfen (z.B. mit `.first()` selectors), bricht Refactor. Vorab: `grep -n csv-preview apps/web/tests/` und schauen.
4. **Sticky-Footer mit existierendem Layout (D):** Stage1Panel ist in einem `<div class="space-y-6">` Wrapper. Sticky braucht eine Scroll-Container-Hierarchie. Vermutlich auf `<div class="container py-6 max-w-3xl">`-Niveau setzen, sonst scrollt der Footer mit der gesamten Page mit (was wir wollen).
5. **Bundle-Budget:** Pattern + Audit-Footer + CsvPreview-Komponente kosten Bundle-Bytes. Wenn >+10 KB raw: redundante Imports prüfen, Inline-SVG-Strings minimieren.
6. **Test-Sequencing (Playwright):** Stale-Result-Reset-Test muss N ändern NACH erfolgreichem Run und prüfen dass `stage1-result` weg ist. Vorsichtig mit `await` / Reactivity-Settling.

## Sources

- HIGH confidence: alle Datei:Zeile-Verweise stammen direkt aus den drei Reviews + meinem eigenen Lesen
- HIGH confidence: Solid-Reactivity-Patterns aus `apps/web/src/stage1/Stage1Panel.tsx` selbst (createSignal/createMemo bereits im Einsatz)
- MEDIUM confidence: Tailwind-Klassen für Sticky-Footer (würde im Worktree validiert)
- MEDIUM confidence: Bundle-Delta-Estimate (gemessen erst beim Build)
