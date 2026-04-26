# Plan: Stage 1 UX-Review-Followup — 11 konsolidierte Fixes

<objective>
Stage 1 (Versand-Liste-Sampler) shipfertig für Verwaltungs-Sitzungen machen, indem die 3 Code-Bugs (G/H/K) sowie 8 Konsens-UX-Verbesserungen (A/B/C/D/E/F/I/J) aus dem 3-LLM-UX-Review von 2026-04-26 (Verdikte 3x WARN) umgesetzt werden.

Warum: Die externe Review hat substanzielle, aber nicht-blockierende Probleme gefunden — falsche Underfill-Sortierung, stale Result-Anzeige nach Parameter-Aenderung, fehlende Label-Kopplung (a11y), Fach-Jargon statt Verwaltungs-Sprache, unsichtbarer Audit-Footer, schwacher Seed-Workflow, versteckter Run-Button, SVG ohne a11y/Print-Robustheit, Tab-Beschriftungen ohne Workflow-Kontext, fehlende CSV-Vorschau in Stage 1, namenlose Underfill-Vorschau. Nach Abschluss ist optional ein Smoke-UX-Re-Review moeglich.

Scope IN: alle 11 Acceptance Criteria aus ISSUE.md (G/H/K + A/B/C/D + E/F/I/J), neue Vitest- und Playwright-Tests, finaler Bundle-Delta-Nachweis.
Scope OUT (gemaess CONTEXT.md): Verfahrens-Name + Filename (M2), Drag-Drop-Konsolidierung (M3), Vorschau-Debounce (M8), Theoretische-vs-occupied-Strata (L6), Underfill-0/0-SRS-Zustand (L3), Tooltip-Komponente fuer Card-Labels (Klammer-Notation reicht laut CONTEXT.md A).
</objective>

<context>
Issue: @.issues/53-stage1-ux-review-followup/ISSUE.md
Decisions: @.issues/53-stage1-ux-review-followup/CONTEXT.md
Research: @.issues/53-stage1-ux-review-followup/RESEARCH.md

Branch: `worktree-agent-ac76adcb` (bereits aktiv, KEINE neue Worktree-Erzeugung — siehe CONTEXT.md). Alle Commits gehen in diese Branch.

<interfaces>
<!-- Executor: nutze diese Vertraege direkt. KEINE Codebase-Exploration fuer die folgenden Punkte. -->

Solid-Reactivity (bereits importiert in Stage1Panel.tsx):
import { createSignal, createMemo, createEffect, on, untrack, Show, For } from 'solid-js';

Stage1Panel.tsx — bestehende Signals (Quelle: RESEARCH.md):
- Zeile 36: parsed (Signal<ParsedCsv | null>)
- Zeile 38: seed (Signal<string>)
- Zeile 39: seedSource (Signal<'default' | 'user'>)
- Zeile 40: selectedAxes (Signal<string[]>)
- Zeile 41: targetN (Signal<number>)
- Zeile 42: output (Signal<Stage1Output | null>)
- Zeile 74-76: canRun() derived
- Zeile 101-107: underfills-Memo mit aktuell falscher Sort-Funktion
- Zeile 111, 148, 159: setOutput-Aufrufe
- Zeile 220-373: Form-Sektion (Inputs, Vorschau)
- Zeile 259-261: Stichprobengroesse-Input
- Zeile 273-275: Seed-Input
- Zeile 329-356: Vorschau-Warnungs-Block
- Zeile 361-371: Run-Button-Wrapper
- Zeile 375-578: Result-Sektion
- Zeile 399, 408, 411, 504-510: UI-Strings mit "Stratum"
- Zeile 436-440: Status-Quo-Footer (nur Laufzeit + Seed)

packages/core/src/stage1/reporting.ts:
- Zeile 233, 263, 270: Markdown-Headlines mit "Stratum-Abdeckung", "Stratum-Detail (Cross-Product-Tabelle)"
- StratumResult-Type (in packages/core/src/stage1/types.ts) hat n_h_target, n_h_actual, n_h_pool, key
- Audit-Doc-Struktur (Stage1AuditDoc) ist ueber `out().signedAudit.doc` erreichbar mit Feldern:
  input_csv_sha256, algorithm_version, prng, tie_break_rule, key_encoding, stratum_sort,
  timestamp_iso, public_key, signature, signature_algo

apps/web/src/stage1/AxisBreakdown.tsx:
- Zeile 43: Header "Achse: ..."
- Zeile 73-101: <rect>-Elemente fuer Soll/Ist-Bars
- marginals.axis (string) als eindeutiger ID-Suffix nutzbar

apps/web/src/csv/CsvImport.tsx:
- Zeile 85-121: bestehende Vorschau-Tabelle mit headers + rows. Vorlage fuer den Extrakt.

apps/web/src/App.tsx:
- Tab-Switcher mit data-testid="tab-stage1" und data-testid="tab-stage3"

PreviewRow (in packages/core/src/stage1/reporting.ts):
{ key: string; n_h_pool: number; n_h_target: number; wouldUnderfill: boolean }

Tests:
- Vitest-Pfad fuer core-Pakete: packages/core/src/stage1/*.test.ts (Beispiel: reporting.test.ts existiert bereits)
- Playwright-E2E: apps/web/tests/e2e/stage1.spec.ts
</interfaces>

Sprach-Glossar (locked in CONTEXT.md, MUSS eingehalten werden):
- Stratum -> "Bevoelkerungsgruppe" (lang) / "Gruppe" (kurz)
- Card-Label-Beispiele: "Gruppen-Abdeckung", Untertitel "Bevoelkerungsgruppen mit mind. 1 gezogener Person", Tabellen-Header "Bevoelkerungsgruppe (Stratum)"
- "Stratum-Detail" -> "Detail-Tabelle (Bevoelkerungsgruppen)"
- Markdown-Bericht-Headlines analog
- Englische Statistik-Terme bleiben als Klammerergaenzung (z. B. "Bevoelkerungsgruppe (Stratum)")

Wichtige Risiken (aus RESEARCH.md, MUSS in den Tasks bedacht werden):
1. `createEffect` fuer Stale-Reset (H) feuert in Solid beim Mount — daher zwingend `on([...sources], handler, { defer: true })` nutzen, sonst wird das Output beim Mount geloescht.
2. SVG-Pattern-ID-Kollision (E): mehrere AxisBreakdown-Instanzen gleichzeitig im DOM -> ID muss pro Achse eindeutig sein, z. B. `stripes-${marginals.axis}`.
3. CsvPreview-Refactor (I): wenn bestehende Stage-3-E2E-Tests die DOM-Struktur pruefen, brechen sie. CONTEXT.md erlaubt Stage 3 unveraendert zu lassen + Stage 1 inline-Komponente, falls Refactor Tests zerlegt.
4. Sticky-Footer (D): braucht Scroll-Container-Hierarchie. Negativ-Margin gegen Section-Padding. Print-CSS NICHT-sticky.
5. Bundle-Budget +10 KB raw / +3 KB gzip — Task 12 misst und rollt zurueck falls ueberschritten.

Key files:
@apps/web/src/stage1/Stage1Panel.tsx — Hauptdatei, 9 von 11 Akzeptanzkriterien
@apps/web/src/stage1/AxisBreakdown.tsx — SVG-a11y + Pattern (E), Sprach-Strings (A)
@apps/web/src/App.tsx — Tab-Subtitles (F)
@apps/web/src/csv/CsvImport.tsx — Quelle fuer CsvPreview-Extrakt (I)
@packages/core/src/stage1/reporting.ts — Pure-Function-Extrakt sortUnderfillsByGap (G), Markdown-Sprache (A)
@apps/web/tests/e2e/stage1.spec.ts — neue E2E-Tests (H, B, I, D)
</context>

<commit_format>
Format: conventional, OHNE issue-prefix (`commit.format: conventional`, kein `prefix:`-Eintrag in `.issues/config.yaml`).
Pattern: `{type}({scope}): {description}` — z. B. `fix(stage1): correct underfill sort, clear stale result, label associations`
Drei thematische Commits + ein Test-/Bundle-Sweep-Commit (gemaess CONTEXT.md, NICHT 11 Mikro-Commits):
- Commit 1 (nach Tasks 1-3): `fix(stage1): correct underfill sort, clear stale result, label associations`
- Commit 2 (nach Tasks 4-6): `feat(stage1): plain-language labels + visible audit footer + seed confirmation`
- Commit 3 (nach Tasks 7-11): `feat(stage1): sticky run, svg a11y/patterns, tab subtitles, csv preview, preview detail`
- Commit 4 (nach Task 12, bei Bundle-Delta-Bewegung oder Test-Anpassungen): `test(stage1): full sweep + bundle delta after ux-review-followup`

Jeder Commit enthaelt Code + Tests fuer die zugehoerigen Acceptance Criteria. Pre-commit-Hooks NICHT ueberspringen. Code-Kommentare englisch, sichtbare UI-Strings deutsch.
</commit_format>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Underfill-Sortierung als pure Funktion extrahieren (Acceptance Criterion G)</name>
  <files>packages/core/src/stage1/reporting.ts, packages/core/src/stage1/reporting.test.ts, apps/web/src/stage1/Stage1Panel.tsx</files>
  <action>
  Extrahiere die Underfill-Sortier-Logik aus dem `underfills`-Memo in Stage1Panel.tsx (aktuell Zeile 101-107) in eine neue, pure exportierte Funktion in packages/core/src/stage1/reporting.ts:

  Signature: `export function sortUnderfillsByGap(strata: StratumResult[]): StratumResult[]`

  Korrekte Sortier-Logik: absteigend nach `(n_h_target - n_h_actual)`, d. h. die groesste Luecke zuerst. Englischer Code-Kommentar an der Funktion erlaeutert, dass nur Strata mit positiver Luecke (target > actual) sinnvoll sind, aber die Funktion selbst nicht filtert (Filterung bleibt am Call-Site, falls dort schon vorhanden — sonst auch in die pure Funktion ziehen, je nachdem wie das bestehende Memo aufgebaut ist).

  RED: Schreibe in `packages/core/src/stage1/reporting.test.ts` (Datei existiert oder wird angelegt) einen neuen `describe('sortUnderfillsByGap')`-Block mit mindestens drei Cases:
  - Zwei Strata mit unterschiedlichen Luecken (z. B. target=10/actual=2 -> gap=8 vs target=5/actual=4 -> gap=1) -> Reihenfolge: gap=8 zuerst.
  - Drei Strata mit gleicher Luecke -> stabile Reihenfolge oder dokumentierte Tie-Break-Regel.
  - Leeres Array -> leeres Array zurueck, kein Throw.

  GREEN: Implementiere `sortUnderfillsByGap` so, dass alle drei Tests gruen sind.

  REFACTOR: Importiere die neue Funktion in `apps/web/src/stage1/Stage1Panel.tsx` (Zeile 101-107) und ersetze die Inline-Sort-Funktion durch den Aufruf. Inline-Filter (z. B. `filter(s => s.n_h_target > s.n_h_actual)`) bleibt im Memo.

  WICHTIG: Dieser Task ist Teil von Commit 1. NACH Tasks 1-3 wird ein einziger Commit `fix(stage1): correct underfill sort, clear stale result, label associations` erstellt. NICHT jetzt einzeln committen.
  </action>
  <verify>
  <automated>cd /root/workspace/.claude/worktrees/agent-ac76adcb && pnpm --filter @sortition/core test -- reporting</automated>
  </verify>
  <done>
  - `sortUnderfillsByGap` ist exportiert aus `packages/core/src/stage1/reporting.ts`
  - Mindestens drei Vitest-Cases in `reporting.test.ts` sind gruen
  - `Stage1Panel.tsx` importiert und nutzt die neue Funktion, kein Inline-Sort mehr im `underfills`-Memo
  - Bestehende Tests (Vitest 80, Playwright 12) bleiben gruen
  </done>
</task>

<task type="auto">
  <name>Task 2: Stale Result via createEffect mit defer-on clearen (Acceptance Criterion H)</name>
  <files>apps/web/src/stage1/Stage1Panel.tsx, apps/web/tests/e2e/stage1.spec.ts</files>
  <action>
  Fuege in `Stage1Panel.tsx` einen neuen `createEffect` hinzu, der die reaktiven Quellen `targetN`, `selectedAxes`, `seed`, `parsed` trackt und `setOutput(null)` ruft, wenn `output() !== null`:

  Pattern (kein Code-Snippet, nur Beschreibung): nutze `createEffect(on([targetN, selectedAxes, seed, parsed], handler, { defer: true }))`. Der `defer: true`-Flag verhindert Mount-Time-Feuern (siehe RESEARCH.md Risiko 1) — sonst wird das Output beim Mount sofort geloescht. Innerhalb des Handlers pruefen, ob `output() !== null` und nur dann `setOutput(null)` rufen, um unnoetige Re-Renders zu vermeiden.

  Englischer Code-Kommentar an dem Effect: "Clear stale result when any input parameter changes after a successful run. `defer: true` prevents mount-time fire which would wipe state on first render."

  Variante 2 ("veraltet"-Badge) wird NICHT umgesetzt (CONTEXT.md sagt: Variante 1 bevorzugt — klarer Reset, kein Verwirrungspotenzial).

  Neuer Playwright-Test in `apps/web/tests/e2e/stage1.spec.ts`: `test('Stale Result wird gecleart wenn N nach Run geaendert wird')`:
  - CSV upload -> Achsen + N setzen -> Run klicken -> warten bis `[data-testid="stage1-result"]` sichtbar.
  - N im Input aendern (z. B. von 60 auf 80) -> assert dass `[data-testid="stage1-result"]` NICHT mehr im DOM ist (oder unsichtbar).
  - `await expect(page.getByTestId('stage1-result')).toBeHidden()` oder `.not.toBeVisible()`.

  WICHTIG: Teil von Commit 1.
  </action>
  <verify>
  <automated>cd /root/workspace/.claude/worktrees/agent-ac76adcb && pnpm --filter web test:e2e -- stage1.spec.ts -g "Stale Result"</automated>
  </verify>
  <done>
  - `createEffect(on(..., handler, { defer: true }))` ist in `Stage1Panel.tsx` hinzugefuegt
  - Effect feuert NICHT beim Mount (verifiziert durch Test, der zuerst Output erzeugt und dann erst N aendert)
  - Neuer Playwright-Test gruen
  - Alle bestehenden Stage1-E2E-Tests gruen
  </done>
</task>

<task type="auto">
  <name>Task 3: label-for / input-id Kopplung fuer N und Seed (Acceptance Criterion K)</name>
  <files>apps/web/src/stage1/Stage1Panel.tsx, apps/web/tests/e2e/stage1.spec.ts</files>
  <action>
  In `Stage1Panel.tsx`:
  - Zeile 259-261 (Stichprobengroesse): `<input id="stage1-target-n" ...>` und `<label for="stage1-target-n">...</label>`. `data-testid` UNVERAENDERT lassen fuer Playwright-Backward-Compat.
  - Zeile 273-275 (Seed): `<input id="stage1-seed" ...>` und `<label for="stage1-seed">...</label>`. `data-testid` ebenfalls unveraendert.

  In `apps/web/tests/e2e/stage1.spec.ts`: erweitere mindestens einen bestehenden Test (oder fuege einen neuen hinzu) der mindestens fuer eines der beiden Felder `page.getByLabel('Stichprobengroesse')` ODER `page.getByLabel('Seed')` statt `getByTestId` nutzt — als Verifikation dass die Label-Assoziation funktioniert. Test-Namen-Vorschlag: `test('Stichprobengroesse-Input ist via Label erreichbar (a11y)')`.

  WICHTIG: Teil von Commit 1.

  NACH Abschluss von Tasks 1-3: erstelle EINEN Commit mit der Nachricht `fix(stage1): correct underfill sort, clear stale result, label associations` und allen geaenderten Dateien.
  </action>
  <verify>
  <automated>cd /root/workspace/.claude/worktrees/agent-ac76adcb && pnpm --filter web test:e2e -- stage1.spec.ts && pnpm --filter @sortition/core test</automated>
  </verify>
  <done>
  - Beide Inputs haben `id` und beide Labels haben `for`
  - Mindestens ein E2E-Test nutzt `getByLabel` und ist gruen
  - `data-testid`-Attribute unveraendert (keine alten Tests gebrochen)
  - Commit 1 (`fix(stage1): correct underfill sort, clear stale result, label associations`) erstellt mit Tasks 1+2+3 zusammen
  - `git log -1` zeigt den Commit, alle Vitest- und Playwright-Tests gruen
  </done>
</task>

<task type="auto">
  <name>Task 4: Sprache ueberall — UI-Strings + Markdown-Bericht (Acceptance Criterion A)</name>
  <files>apps/web/src/stage1/Stage1Panel.tsx, packages/core/src/stage1/reporting.ts, apps/web/src/stage1/AxisBreakdown.tsx, packages/core/src/stage1/reporting.test.ts</files>
  <action>
  Fuehre das Sprach-Glossar (CONTEXT.md) konsequent durch:

  In `apps/web/src/stage1/Stage1Panel.tsx` (Zeile 399, 408, 411, 504-510):
  - Card-Label "Stratum-Abdeckung" -> "Gruppen-Abdeckung"
  - Card-Untertitel: "Bevoelkerungsgruppen mit mind. 1 gezogener Person"
  - "Stratum-Detail (Kreuzkategorien-Tabelle, ...)" -> "Detail-Tabelle (Bevoelkerungsgruppen)"
  - Tabellen-Header "Stratum" -> "Bevoelkerungsgruppe (Stratum)" (Klammer fuer Auditor:innen-Begriff, gemaess CONTEXT.md)
  - "(gesamt)" bleibt unveraendert (nicht im Glossar)

  In `packages/core/src/stage1/reporting.ts` (Zeile 233, 263, 270):
  - Markdown-Headline "Stratum-Abdeckung" -> "Gruppen-Abdeckung"
  - "Stratum-Detail (Cross-Product-Tabelle)" -> "Detail-Tabelle (Bevoelkerungsgruppen, Cross-Product)"
  - Tabellen-Spalten-Headers analog: "Stratum" -> "Bevoelkerungsgruppe (Stratum)"

  In `apps/web/src/stage1/AxisBreakdown.tsx` (Zeile 43):
  - Header "Achse: ..." -> "Merkmal: ..." (Glossar: Achse -> Merkmal)

  Bestehende Tests anpassen, die explizit auf den deutschen "Stratum"-String pruefen — in `reporting.test.ts` und ggf. anderen — Strings auf die neuen Werte umstellen. KEINE Test-Logik aufweichen, NUR die erwarteten Strings.

  Englisches Code-Kommentar oben in `reporting.ts` ergaenzen: "// UI-facing strings use plain-language German per CONTEXT.md glossary; statistics terms appear in parentheses for auditors."

  WICHTIG: Teil von Commit 2. NICHT jetzt committen.
  </action>
  <verify>
  <automated>cd /root/workspace/.claude/worktrees/agent-ac76adcb && pnpm --filter @sortition/core test && pnpm --filter web test:e2e -- stage1.spec.ts</automated>
  </verify>
  <done>
  - Kein nicht-Klammer-"Stratum" mehr in UI-Strings (Stage1Panel.tsx, AxisBreakdown.tsx)
  - Markdown-Bericht-Headlines verwenden "Gruppen-Abdeckung" und "Detail-Tabelle (Bevoelkerungsgruppen, Cross-Product)"
  - "Achse" -> "Merkmal" in AxisBreakdown.tsx
  - Bestehende Vitest- und Playwright-Tests gruen (mit ggf. angepassten erwarteten Strings)
  - `grep -rn "Stratum-" apps/web/src packages/core/src | grep -v "(Stratum)"` liefert keine relevanten Treffer
  </done>
</task>

<task type="auto">
  <name>Task 5: AuditFooter-Komponente bauen + in Stage1Panel einbinden (Acceptance Criterion B)</name>
  <files>apps/web/src/stage1/AuditFooter.tsx, apps/web/src/stage1/Stage1Panel.tsx, apps/web/tests/e2e/stage1.spec.ts</files>
  <action>
  Neue Komponente `apps/web/src/stage1/AuditFooter.tsx` mit Solid-Komponenten-Signatur `function AuditFooter(props: { doc: Stage1AuditDoc; filename: string; size_bytes: number }) -> JSX.Element`. Wenn `Stage1AuditDoc` nicht direkt importierbar ist, dann `props.doc` als typsicherer Subset typen oder den Typ aus `packages/core/src/stage1/audit-builder.ts` exportieren falls noch nicht.

  Inhalt der Footer-Sektion (Reihenfolge gemaess CONTEXT.md "Audit-Footer-Felder (genau)"):
  - Section-Header: "Protokoll / Audit"
  - Eingangs-Datei: `{filename}` (`{size_bytes}` Bytes)
  - Eingangs-Datei-Hash (SHA-256): `{first 16}...{last 8}` als `<span title="{full hash}">...</span>` fuer Hover-Volltext
  - Algorithmus-Version: `{algorithm_version}` (PRNG `{prng}`)
  - Tie-Break-Regel: `{tie_break_rule}`
  - Stratum-Sortierung: `{stratum_sort}`
  - Zeitstempel (UTC): `{timestamp_iso}`
  - Signatur-Algorithmus: `{signature_algo}`
  - Public Key (gekuerzt): `{first 16}...`
  - Signatur (gekuerzt): `{first 16}...`
  - Hinweis-Text (klein, kursiv): "Vollstaendige Signatur und Hashes sind im Audit-JSON-Download enthalten. Die Signatur deckt die canonicalisierte Form des Audit-Dokuments inklusive der gezogenen Personen-Indizes ab."

  Wrapper-Element `<section data-testid="stage1-audit-footer" class="...">` — Tailwind-Klassen so dass die Sektion auch im Print sichtbar bleibt. Wichtig: die bestehenden Buttons sind in `print:hidden` — diese Sektion bekommt KEIN `print:hidden`.

  In `Stage1Panel.tsx`: `AuditFooter` importieren und im Result-View NACH der Detail-Tabelle und VOR den Export-Buttons einsetzen. Props aus `out().signedAudit.doc` und den vorhandenen Datei-Metadaten (Filename, Size) befuellen — wenn Filename/Size nicht direkt am Output haengen, aus `parsed()` oder dem CSV-Import-Signal lesen.

  Englischer Code-Kommentar im AuditFooter.tsx oben: "Visible audit/provenance footer per Issue #53 B. Print-CSS keeps this section visible (unlike export buttons)."

  Neuer Playwright-Test in `stage1.spec.ts`: `test('Audit-Footer ist im Result-View sichtbar mit Hash und Signatur')`:
  - Vollstaendigen Run durchfuehren.
  - assert: `page.getByTestId('stage1-audit-footer')` ist visible.
  - assert: enthaelt Text "SHA-256" und "Signatur-Algorithmus" und "Protokoll / Audit".

  WICHTIG: Teil von Commit 2.
  </action>
  <verify>
  <automated>cd /root/workspace/.claude/worktrees/agent-ac76adcb && pnpm --filter web test:e2e -- stage1.spec.ts -g "Audit-Footer"</automated>
  </verify>
  <done>
  - Datei `apps/web/src/stage1/AuditFooter.tsx` existiert mit allen 10 Footer-Feldern aus CONTEXT.md
  - Stage1Panel rendert die Footer NACH der Detail-Tabelle, VOR Export-Buttons
  - Footer hat KEIN `print:hidden`
  - Public Key und Signatur sind auf 16 Chars + "..." gekuerzt; voller Wert via `title=` als Tooltip
  - Neuer Playwright-Test gruen
  </done>
</task>

<task type="auto">
  <name>Task 6: Seed-Confirmation-Workflow (Acceptance Criterion C, Variante 1)</name>
  <files>apps/web/src/stage1/Stage1Panel.tsx, apps/web/tests/e2e/stage1.spec.ts</files>
  <action>
  Variante 1 gemaess CONTEXT.md: Default-Seed bleibt vorbefuellt (Unix-Sekunde), aber Run-Button ist disabled bis Confirm/Edit.

  In `Stage1Panel.tsx`:
  - Neues Signal `const [seedConfirmed, setSeedConfirmed] = createSignal(false)`.
  - `canRun()` (Zeile 74-76) erweitern um `&& seedConfirmed()` als zusaetzliche Bedingung.
  - `changeSeed`-Handler (ueberall wo der Nutzer den Seed-Input editiert): zusaetzlich `setSeedConfirmed(true)` und `setSeedSource('user')` rufen.
  - Neuer Button "Default-Seed uebernehmen" neben dem Seed-Input — onClick: `setSeedConfirmed(true)` (Wert bleibt unveraendert), Button verschwindet danach (via `<Show when={!seedConfirmed()}>`).
  - Status-Anzeige neben dem Seed-Input:
    - `!seedConfirmed()` -> Text "(Default — bitte gemeinsam vereinbaren oder bestaetigen)" mit visueller Auszeichnung (z. B. amber/orange Tailwind-Klasse).
    - `seedConfirmed() && seedSource() === 'user'` -> "(manuell)"
    - `seedConfirmed() && seedSource() === 'default'` -> "(bestaetigt)"

  Neuer Playwright-Test (oder bestehenden anpassen): `test('Run-Button bleibt disabled bis Seed bestaetigt oder editiert wurde')`:
  - Nach CSV-Upload + Achsen-Auswahl + N-Setzen: Run-Button ist disabled.
  - "Default-Seed uebernehmen" klicken -> Run-Button ist enabled.
  - Alternativ: Seed-Input editieren -> Run-Button ist enabled.

  WICHTIG: Teil von Commit 2. ALLE bestehenden Stage1-E2E-Tests, die einen Run starten, MUESSEN angepasst werden — sie muessen jetzt entweder den Seed bestaetigen oder editieren, sonst bleibt der Button disabled und die Tests timeouten.

  NACH Abschluss von Tasks 4-6: erstelle EINEN Commit mit der Nachricht `feat(stage1): plain-language labels + visible audit footer + seed confirmation`.
  </action>
  <verify>
  <automated>cd /root/workspace/.claude/worktrees/agent-ac76adcb && pnpm --filter web test:e2e -- stage1.spec.ts && pnpm --filter @sortition/core test</automated>
  </verify>
  <done>
  - `seedConfirmed`-Signal existiert, ist Teil von `canRun()`
  - "Default-Seed uebernehmen"-Button rendert nur wenn `!seedConfirmed()`
  - Status-Text zeigt 3 distinkten Zustaende korrekt
  - Run-Button ist initial disabled, wird enabled nach Confirm ODER Edit
  - Neuer Playwright-Test gruen, bestehende E2E-Tests gruen (alte Tests jetzt mit Seed-Bestaetigung)
  - Commit 2 (`feat(stage1): plain-language labels + visible audit footer + seed confirmation`) erstellt
  </done>
</task>

<task type="auto">
  <name>Task 7: Sticky Run-Button (Acceptance Criterion D, Variante 1)</name>
  <files>apps/web/src/stage1/Stage1Panel.tsx, apps/web/tests/e2e/stage1.spec.ts</files>
  <action>
  Run-Button-Wrapper (Zeile 361-371) auf sticky-Footer umstellen. Tailwind-Klassen-Vorschlag aus RESEARCH.md: `sticky bottom-0 bg-white border-t pt-2 -mx-4 px-4 z-10`.

  Negativ-Margin (`-mx-4 px-4`) gleicht das Section-Padding aus, damit der Footer randlos auf der Sektion-Breite sitzt. `z-10` damit er ueber sich ueberlappenden Elementen liegt.

  Print-CSS: sticky NICHT in print -> Tailwind `print:static print:border-0 print:p-0` zusaetzlich, sodass im Druck die Position normal-statisch ist.

  Achtung Risiko 4 aus RESEARCH.md: Scroll-Container muss korrekt sein. Der Wrapper bleibt im bestehenden `<div class="space-y-6">`. Wenn der Footer beim Scrollen NICHT klebt, dann steigt der Sticky-Container hoch (z. B. auf den `<div class="container py-6 max-w-3xl">` in App.tsx) — wenn das nicht reicht, dokumentiere im Code-Kommentar warum welcher Wrapper gewaehlt wurde.

  Neuer Playwright-Test: `test('Run-Button bleibt bei Scroll sichtbar (sticky)')`:
  - Vollstaendigen Run-State erreichen.
  - `await expect(page.getByTestId('stage1-run-button')).toHaveCSS('position', 'sticky')` ODER alternativ Bounding-Box-Check vor und nach Scroll.

  WICHTIG: Teil von Commit 3.
  </action>
  <verify>
  <automated>cd /root/workspace/.claude/worktrees/agent-ac76adcb && pnpm --filter web test:e2e -- stage1.spec.ts -g "sticky"</automated>
  </verify>
  <done>
  - Run-Button-Wrapper hat sticky-bottom Tailwind-Klassen
  - Print-CSS rendert Button statisch (nicht sticky)
  - Playwright-Test verifiziert `position: sticky`
  - Visuell im Browser bleibt der Button beim Scrollen unten sichtbar (manuell vom Executor waehrend Browser-DevTools verifiziert)
  </done>
</task>

<task type="auto">
  <name>Task 8: SVG a11y + Pattern fuer Soll-Balken (Acceptance Criterion E)</name>
  <files>apps/web/src/stage1/AxisBreakdown.tsx, apps/web/tests/e2e/stage1.spec.ts</files>
  <action>
  In `apps/web/src/stage1/AxisBreakdown.tsx` (Zeile 73-101):

  1. **Pattern definieren**: Innerhalb der SVG-Wurzel ein `<defs>` mit einem `<pattern>` fuer Diagonal-Striche. ID muss eindeutig pro Achse sein (Risiko 2 aus RESEARCH.md): `id={`stripes-${marginals.axis}`}`. Pattern-Inhalt: zwei diagonale Linien (z. B. `<path d="M0,6 L6,0" stroke="#94a3b8" stroke-width="1.5"/>`), `patternUnits="userSpaceOnUse"`, `width="6" height="6"`.

  2. **Soll-Balken**: Statt `fill="#94a3b8"` (oder welche Konstante aktuell) -> `fill={`url(#stripes-${marginals.axis})`}`. Ist-Balken (z. B. `fill="#0f766e"` o. ae.) bleibt einfarbig.

  3. **Per-Bar `<title>`**: Jeder `<rect>` bekommt ein `<title>`-Child mit Wert-Beschreibung. Beispiel: fuer Soll "Soll: 12 Personen (von Pool 87)", fuer Ist "Ist: 11 Personen (Soll: 12)". Englisches Code-Kommentar: "SVG <title> elements provide on-hover tooltips and screen-reader labels per WCAG."

  4. **SVG-Wurzel `<desc>`**: Direkt unter dem oeffnenden `<svg>` ein `<desc>`-Element mit kompakter Aggregat-Summary. Inhalt z. B.: `${marginals.axis}: ${marginals.values.length} Kategorien, Soll-Summe ${...}, Ist-Summe ${...}, Pool-Summe ${...}`.

  Neuer Playwright-Test: `test('SVG-Bars haben title-Children und Pattern-Defs (a11y)')`:
  - Vollstaendigen Run.
  - assert: `page.locator('#stripes-{axisName}')` existiert fuer mindestens eine Achse (z. B. die erste in `selectedAxes`).
  - assert: ein `<rect>` mit `fill="url(#stripes-...)"` existiert.
  - assert: ein `<rect> > title` enthaelt "Soll:" oder "Ist:".

  WICHTIG: Teil von Commit 3.
  </action>
  <verify>
  <automated>cd /root/workspace/.claude/worktrees/agent-ac76adcb && pnpm --filter web test:e2e -- stage1.spec.ts -g "a11y"</automated>
  </verify>
  <done>
  - `<defs><pattern id="stripes-{axis}">` ist im SVG vorhanden
  - Soll-Balken nutzt `fill="url(#stripes-...)"`
  - Jeder `<rect>` hat ein `<title>` mit menschlich-lesbarer Beschreibung
  - SVG-Wurzel hat `<desc>` mit Aggregat-Summary
  - Pattern-IDs sind eindeutig pro Achse (kein Konflikt bei mehreren AxisBreakdowns gleichzeitig)
  - Neuer Playwright-Test gruen
  </done>
</task>

<task type="auto">
  <name>Task 9: Tab-Subtitles + Schritt-Hinweis im Panel-Header (Acceptance Criterion F)</name>
  <files>apps/web/src/App.tsx, apps/web/src/stage1/Stage1Panel.tsx</files>
  <action>
  In `apps/web/src/App.tsx`: Tab-Switcher um zweizeiligen Inhalt erweitern.
  - Tab `data-testid="tab-stage1"`: Hauptlabel "Stage 1 / Versand-Liste", Untertitel "Aus Melderegister" (kleiner, z. B. `text-xs text-slate-500`).
  - Tab `data-testid="tab-stage3"`: Hauptlabel "Stage 3 / Panel ziehen", Untertitel "Aus Antwortenden".
  - Falls Stage 2 oder andere Tabs existieren: nicht anfassen.

  In `apps/web/src/stage1/Stage1Panel.tsx`: Panel-Header (oben in der Render-Funktion, suchen nach dem ersten `<h1>`/`<h2>` der Sektion) bekommt prefix "Schritt 1 von 3 — Versand-Liste ziehen". Falls noch kein Header existiert, einen hinzufuegen oben in der Sektion. Workflow-Erklaerer-Zeile NICHT global laut CONTEXT.md, NUR der Schritt-Prefix im Panel-Header.

  Stage 3 analog waere "Schritt 3 von 3 — Panel ziehen" — aber CONTEXT.md sagt das gehoert zu Stage 3 und ist aus Scope von #53. Falls Stage3-Panel existiert und der Symmetrie-Wegen ein Header dort einfach dazugefuegt werden kann, mache es; sonst NICHT, um Stage-3-Tests nicht zu brechen.

  Bestehende Tests pruefen: wenn sie auf den exakten Tab-Text matchen (z. B. `getByText('Stage 1')`), koennte der neue Untertitel die Selektoren brechen. In dem Fall: `getByTestId('tab-stage1')` bleibt stabil, aber `getByText`-Matches auf den alten Text muessen ggf. angepasst werden — bei Bedarf Tests upgraden.

  WICHTIG: Teil von Commit 3.
  </action>
  <verify>
  <automated>cd /root/workspace/.claude/worktrees/agent-ac76adcb && pnpm --filter web test:e2e</automated>
  </verify>
  <done>
  - `tab-stage1` Tab hat Hauptlabel + Untertitel "Aus Melderegister"
  - `tab-stage3` Tab hat Hauptlabel + Untertitel "Aus Antwortenden"
  - Stage1Panel-Header hat Prefix "Schritt 1 von 3 — Versand-Liste ziehen"
  - Bestehende E2E-Tests gruen (ggf. Test-Selektoren auf data-testid umgestellt)
  </done>
</task>

<task type="auto">
  <name>Task 10: CsvPreview-Komponente extrahieren + in Stage 1 einbauen (Acceptance Criterion I)</name>
  <files>apps/web/src/csv/CsvPreview.tsx, apps/web/src/stage1/Stage1Panel.tsx, apps/web/src/csv/CsvImport.tsx, apps/web/tests/e2e/stage1.spec.ts</files>
  <action>
  Neue Komponente `apps/web/src/csv/CsvPreview.tsx` mit Solid-Signatur `function CsvPreview(props: { headers: string[]; rows: Record<string,string>[]; maxRows?: number }) -> JSX.Element`. Default `maxRows = 5`.

  Inhalt: HTML-Tabelle mit Header-Reihe aus `props.headers` und bis zu `props.maxRows` Datenreihen aus `props.rows`. Leichte Zebra-Striping-Tailwind-Klassen, `<table data-testid="csv-preview-table">`. Englischer Code-Kommentar: "Shared CSV preview table — first N rows visible after upload. Used in Stage 1 (always) and optionally Stage 3 (refactor follow-up)."

  In `Stage1Panel.tsx`: nach dem Pool-Summary-Block (vor der Form-Sektion oder nach `parsed()`-Empfang) `<CsvPreview headers={parsed()!.headers} rows={parsed()!.rows} />` einbinden — wrapped in `<Show when={parsed()}>`.

  In `apps/web/src/csv/CsvImport.tsx` (Zeile 85-121): VERSUCH den bestehenden Vorschau-Block durch die neue Komponente zu ersetzen. PRE-CHECK: `grep -n "csv-preview\|getByRole.*table\|getByTestId.*preview" apps/web/tests/e2e/csv-import.spec.ts apps/web/tests/e2e/end-to-end.spec.ts` — falls Stage-3-Tests die exakte DOM-Struktur pruefen, REFACTOR ABBRECHEN und Stage 3 unveraendert lassen. CONTEXT.md erlaubt das explizit ("Refactor von Stage 3 NUR wenn keine bestehenden Tests brechen — sonst Stage 1 inline und Stage 3 unveraendert lassen, mit Note fuer spaeteren Refactor").

  Falls Refactor moeglich: in `CsvImport.tsx` die alte Tabelle entfernen und `<CsvPreview>` einsetzen. Falls nicht: Code-Kommentar in `CsvImport.tsx` "// TODO(#53-followup): refactor inline preview to use shared <CsvPreview> component once existing e2e tests are updated".

  Neuer Playwright-Test in `stage1.spec.ts`: `test('CSV-Vorschau-Tabelle erscheint nach Upload')`:
  - CSV upload.
  - assert: `page.getByTestId('csv-preview-table')` ist visible.
  - assert: enthaelt 5 Daten-Reihen + 1 Header-Reihe.

  WICHTIG: Teil von Commit 3.
  </action>
  <verify>
  <automated>cd /root/workspace/.claude/worktrees/agent-ac76adcb && pnpm --filter web test:e2e</automated>
  </verify>
  <done>
  - `apps/web/src/csv/CsvPreview.tsx` existiert mit headers/rows/maxRows props
  - Stage1Panel rendert die CsvPreview nach Upload
  - Stage 3 entweder refactored ODER inline gelassen mit TODO-Kommentar (je nach Test-Status)
  - Neuer Playwright-Test gruen, alle bestehenden Tests gruen
  </done>
</task>

<task type="auto">
  <name>Task 11: Vorschau-Strata-Liste mit Namen + "weitere X anzeigen" (Acceptance Criterion J)</name>
  <files>apps/web/src/stage1/Stage1Panel.tsx, apps/web/tests/e2e/stage1.spec.ts</files>
  <action>
  Im Vorschau-Warnungs-Block (Stage1Panel.tsx Zeile 329-356) erweitern:

  Wenn `zeroAllocationStrata > 0` ODER `underfillStrata > 0`:
  - Filter `preview().result.rows` zwei mal:
    - `zeroAllocRows = rows.filter(r => r.n_h_target === 0)` — Strata mit Soll = 0
    - `underfillRows = rows.filter(r => r.wouldUnderfill)` — Strata wo Pool < Soll
  - Fuer jede Kategorie: zeige bis zu 5 Eintraege als Liste mit `r.key` (Stratum-Name), `r.n_h_pool` (Pool), `r.n_h_target` (Soll). Beispiel-Format pro Zeile: `"Bezirk=Mitte, Alter=18-29: Pool 0, Soll 3"`.
  - Wenn mehr als 5: ein `<details><summary>weitere {n - 5} anzeigen</summary>...rest...</details>` Toggle, der die restlichen rendert.

  data-testid fuer die neue Liste: `stage1-preview-zero-list` und `stage1-preview-underfill-list`.

  Neuer Vitest-Test (in einer reporting/preview-test-Datei oder direkt in Stage1Panel-spezifischem Test): pruefe dass bei einem konstruierten preview-Result mit 7 zero-Strata genau 5 sichtbar sind und der Rest im Toggle. Da das eher Komponenten-Test als Pure-Function-Test ist, kann es alternativ Playwright sein:

  `test('Vorschau zeigt namentliche Strata-Liste mit Toggle bei mehr als 5')`:
  - CSV mit Setup wo > 5 Strata zero sind.
  - assert: 5 Eintraege initial sichtbar.
  - `<details>` zugeklappt -> 0 weitere sichtbar.
  - `<details>` aufklappen -> alle weiteren sichtbar.

  WICHTIG: Teil von Commit 3.

  NACH Abschluss von Tasks 7-11: erstelle EINEN Commit mit der Nachricht `feat(stage1): sticky run, svg a11y/patterns, tab subtitles, csv preview, preview detail`.
  </action>
  <verify>
  <automated>cd /root/workspace/.claude/worktrees/agent-ac76adcb && pnpm --filter web test:e2e -- stage1.spec.ts</automated>
  </verify>
  <done>
  - Vorschau-Block zeigt namentliche Strata-Liste mit key + Pool + Soll
  - Zwei Listen: zero-allocation und underfill, je mit eigener data-testid
  - Bei mehr als 5 Eintraegen wird ein `<details>`-Toggle gerendert
  - Neuer Test gruen
  - Commit 3 (`feat(stage1): sticky run, svg a11y/patterns, tab subtitles, csv preview, preview detail`) erstellt
  </done>
</task>

<task type="auto">
  <name>Task 12: Final-Validation — Build, Bundle-Delta, Cross-Validation, Test-Sweep</name>
  <files>docs/iteration-1-findings.md (optional, nur fuer Bundle-Delta-Notiz), evtl. weitere Test-Snapshot-Dateien</files>
  <action>
  Abschliessende Verifikation aller 11 Acceptance Criteria + ISSUE.md "Test + Build"-Sektion:

  1. **Vollstaendiger Test-Sweep**:
     - `pnpm --filter @sortition/core test` — Vitest, erwartet 80+ neue grun (alte 80 + Tests aus Tasks 1, 4)
     - `pnpm --filter web test` — Vitest fuer Web-Pakete, falls existent
     - `pnpm --filter web test:e2e` — Playwright, erwartet 12+ neue grun (alte 12 + Tests aus Tasks 2, 3, 5, 6, 7, 8, 10, 11)
     - Cross-Validation-Skript: pruefen welcher Befehl im Repo dafuer existiert (z. B. `pnpm cross-validate` oder `node scripts/cross-validate.js`). Erwartet: 21/21 weiterhin gruen.

  2. **Build + Bundle-Delta**:
     - `pnpm --filter @sortition/web build` ausfuehren
     - Bundle-Groesse vor und nach den Aenderungen vergleichen. Pre-Aenderung-Werte aus dem letzten Build im git-Verlauf (`git log --oneline | head` -> letzter relevanter Build-Commit) ODER per `git stash + build + git stash pop + build` Differenz nehmen.
     - Wenn Delta > +10 KB raw oder > +3 KB gzip: SCHRITT ZURUECK. Pruefe redundante Imports (z. B. doppeltes Tailwind), Inline-SVG-Strings minimieren, evtl. AuditFooter oder CsvPreview lazy-laden via dynamic import. Solange ueber Budget: nicht committen.
     - Wenn Delta innerhalb Budget: dokumentiere die exakten Werte (raw + gzip) in der Commit-Message des finalen Sweep-Commits.

  3. **Stati-Update**:
     - `.issues/53-stage1-ux-review-followup/ISSUE.md` Frontmatter `status: planned` -> `status: done` ODER `status: shipped` (je nach Repo-Konvention — `git log --grep "status:"` zeigt frueheres Pattern).
     - Optional: kurzer Eintrag in `docs/iteration-1-findings.md` zum Bundle-Delta-Resultat (1-2 Zeilen).

  4. **Final-Commit** (nur falls noetig):
     - Falls Bundle-Anpassungen oder Test-Snapshot-Updates anfielen: `test(stage1): full sweep + bundle delta after ux-review-followup` als 4. Commit.
     - Falls keine Aenderungen anfielen: kein extra Commit, nur Status-Update.

  WICHTIG: Falls Cross-Validation-Skript brichst: STOPP und manuell nachvollziehen. 21/21 ist die Garantie dass die Algorithmus-Logik unveraendert ist — UI-Aenderungen sollten das nicht beeinflussen.
  </action>
  <verify>
  <automated>cd /root/workspace/.claude/worktrees/agent-ac76adcb && pnpm --filter @sortition/core test && pnpm --filter web test:e2e && pnpm --filter @sortition/web build && du -sh apps/web/dist/assets/*.js | sort -h</automated>
  </verify>
  <done>
  - Vitest: alle alten + neuen Tests gruen (mind. 84 wenn 4 neue addiert)
  - Playwright: alle alten + neuen Tests gruen (mind. 18 wenn 6 neue addiert)
  - Cross-Validation: 21/21 weiterhin gruen
  - Build erfolgreich, Bundle-Delta dokumentiert in commit message (raw + gzip Bytes)
  - Bundle-Delta innerhalb +10 KB raw / +3 KB gzip Budget
  - ISSUE.md status auf 'done' oder 'shipped' gesetzt
  - Drei (oder vier) Commits in `git log` sichtbar mit klaren Botschaften
  </done>
</task>

</tasks>

<verification>
Nach allen Tasks final pruefen:
- `cd /root/workspace/.claude/worktrees/agent-ac76adcb && pnpm --filter @sortition/core test` — Vitest gruen
- `cd /root/workspace/.claude/worktrees/agent-ac76adcb && pnpm --filter web test:e2e` — Playwright gruen
- Cross-Validation-Skript (Repo-spezifischer Befehl) — 21/21 gruen
- `cd /root/workspace/.claude/worktrees/agent-ac76adcb && pnpm --filter @sortition/web build` — Build erfolgreich
- Bundle-Delta dokumentiert und innerhalb Budget (+10 KB raw / +3 KB gzip)
- `git log --oneline | head -5` zeigt 3 oder 4 thematische Commits
- ISSUE.md status auf abgeschlossen aktualisiert
</verification>

<success_criteria>
Mappt 1:1 auf ISSUE.md Acceptance Criteria:

- **G** Underfill-Sortierung: `sortUnderfillsByGap` als pure exportierte Funktion, Vitest-Cases gruen, Stage1Panel nutzt sie
- **H** Stale Result: `createEffect(on(..., { defer: true }))` cleart Output bei Param-Change, Playwright-Test verifiziert
- **K** Label-Kopplung: beide Inputs haben id, beide Labels haben for, mind. ein Test mit `getByLabel`
- **A** Sprache: alle UI-Strings folgen Sprach-Glossar, Klammer-Notation fuer Auditor:innen-Begriff
- **B** Audit-Footer: AuditFooter-Komponente sichtbar im DOM und im Print, alle 10 Felder aus CONTEXT.md
- **C** Seed-Workflow: Run-Button disabled bis Confirm/Edit, "Default uebernehmen"-Button, drei Status-Texte
- **D** Run-Button sticky: `position: sticky bottom-0` im normalen Layout, `static` im Print
- **E** SVG a11y: `<title>` pro `<rect>`, `<desc>` mit Summary, `<pattern>` mit per-axis-ID fuer Soll-Balken
- **F** Tab-Subtitles: zweizeilige Tabs fuer Stage 1 + Stage 3, Schritt-Prefix im Stage1Panel-Header
- **I** CSV-Vorschau: `<CsvPreview>`-Komponente in Stage 1 eingebaut, Stage 3 refactored ODER mit TODO-Kommentar markiert
- **J** Vorschau-Strata-Liste: namentliche Auflistung mit Pool/Soll, `<details>`-Toggle bei mehr als 5

- Alle bestehenden Tests bleiben gruen (Vitest 80, Playwright 12, Cross-Validation 21)
- Neue Vitest-Tests fuer G + ggf. J grun
- Neue Playwright-Tests fuer H, K (a11y), B, C, D, E, I + ggf. J gruen
- Bundle-Delta dokumentiert in commit-message, innerhalb +10 KB raw / +3 KB gzip
- Drei thematische Commits + optionaler 4. Sweep-Commit, alle in Branch `worktree-agent-ac76adcb`
</success_criteria>
