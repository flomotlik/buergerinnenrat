# Context — locked decisions for Issue #53

> Aus dem 3-LLM-UX-Review von 2026-04-26 (claude opus-4-7, codex gpt-5.4, gemini 3.1-pro-preview), Verdikte: **3× WARN**.
> Volle Reviews unter `.issues/stage-1-group-reporting-ux-review/reviews/`.

## Bearbeitung im bestehenden Worktree

- Feature-Branch ist `worktree-agent-ac76adcb` (im `.claude/worktrees/agent-ac76adcb/`).
- Keine neue Worktree-Erzeugung — die Fixes bauen direkt auf #45/#52 auf, alle Commits gehen in diese Branch.
- Executor-Agent arbeitet OHNE `isolation: worktree`, mit explizitem `cwd` auf den existierenden Worktree-Pfad.

## Variantenwahl pro Acceptance Criterion (locked)

- **C — Seed-Workflow:** Variante 1 gewählt: Default-Seed-Eingabefeld bleibt VORBEFÜLLT mit Unix-Sekunde, aber zusätzlich neuer Pflicht-Workflow:
  - Beim Mount: Seed ist zwar gesetzt, aber Status zeigt "(Default — bitte gemeinsam vereinbaren)" mit visueller Auszeichnung
  - Run-Button bleibt **disabled** bis der Nutzer entweder "Default übernehmen" explizit klickt oder einen anderen Wert eintippt (was `seedSource` automatisch auf 'user' setzt)
  - Begründung: zwingt zum bewussten Akt ohne den User zu nerven mit Pflicht-Eingabe von vorn
- **D — Run-Button:** Sticky-Footer-Variante. Position bleibt unten rechts, immer sichtbar. CSS `position: sticky; bottom: 0`.
- **H — Stale Result:** `createEffect`-Variante (clearen, nicht "veraltet"-Badge). Klarer Reset, kein Verwirrungspotenzial.
- **A — Sprache:** Card-Label "Gruppen-Abdeckung", Card-Untertitel "Bevölkerungsgruppen mit mind. 1 gezogener Person", Tabellen-Header "Bevölkerungsgruppe (Stratum)" — Begriff in Klammern für Auditor:innen, primär die plain-language-Version. Markdown-Bericht-Headlines analog. Tooltip mit `(?)`-Icon nicht erforderlich, klammer reicht.
- **B — Audit-Footer im Result-View:** Eigene Sektion "Protokoll / Audit", nicht in den Tabellenkasten gemischt. Print-CSS lässt sie sichtbar. Pubkey + Signatur abgekürzt (erste 16 Hex-Chars + "..."), volle Werte sind im JSON-Export.
- **F — Tab-Subtitles:** kurz, deutsch. "Stage 1 / Versand-Liste" (Untertitel "Aus Melderegister") vs "Stage 3 / Panel ziehen" (Untertitel "Aus Antwortenden"). Workflow-Erklärer-Zeile NICHT global, nur als Kurz-Hinweis im Stage-1-Panel ("Schritt 1 von 3: Versand-Liste ziehen") und Stage-3-Panel ("Schritt 3 von 3: Panel aus Antwortenden ziehen").
- **I — CSV-Vorschau:** Eigene gemeinsame `<CsvPreview>`-Komponente in `apps/web/src/csv/CsvPreview.tsx`. Stage 1 und Stage 3 nutzen dieselbe Komponente. Refactor von Stage 3 NUR wenn keine bestehenden Tests brechen — sonst Stage 1 inline und Stage 3 unverändert lassen, mit Note für späteren Refactor.

## Sprach-Glossar (Konsistenz)

| Statistik-Term | UI-Term (deutsch) |
|---|---|
| Stratum | Bevölkerungsgruppe (Lang) / Gruppe (Short) |
| Strata | Bevölkerungsgruppen / Gruppen |
| Stratifikation | Aufteilung nach Merkmalen |
| Stratifikations-Achse | Merkmal (z.B. "Bezirk", "Alter") |
| Cross-Product | Merkmals-Kombination |
| Allocation | Sollwert / Soll-Personen |
| n_h_target | Soll |
| n_h_actual | Ist |
| n_h_pool | Pool |
| Underfill / unterbesetzt | unterbesetzt (bleibt — ist gut verständlich) |
| Coverage | Abdeckung |

Tabellen-Header und Card-Labels nutzen die deutschen Begriffe. Die englischen Statistik-Terme bleiben erhalten als Klammerergänzung wenn das hilft (z.B. "Bevölkerungsgruppe (Stratum)") oder im Audit-JSON / Code-Kommentar.

## Audit-Footer-Felder (genau)

Im DOM und auf Print sichtbar:
- Eingangs-Datei: `{filename}` (`{size_bytes}` Bytes)
- Eingangs-Datei-Hash (SHA-256): `{first 16 chars}…{last 8 chars}` mit Tooltip oder Hover-Title für vollen Hash
- Algorithmus-Version: `{algorithm_version}` (PRNG `{prng}`)
- Tie-Break-Regel: `{tie_break_rule}` (klein, in Footer)
- Stratum-Sortierung: `{stratum_sort}`
- Zeitstempel (UTC): `{timestamp_iso}`
- Signatur-Algorithmus: `{signature_algo}`
- Public Key (gekürzt): `{first 16 chars}…`
- Signatur (gekürzt): `{first 16 chars}…`
- Hinweis-Text: "Vollständige Signatur und Hashes sind im Audit-JSON-Download enthalten. Die Signatur deckt die canonicalisierte Form des Audit-Dokuments inklusive der gezogenen Personen-Indizes ab."

## Test-Strategie

- Bestehende Tests bleiben unverändert grün (Regressions-Schutz)
- Neue Vitest-Tests:
  - `stage1-reporting.test.ts` (oder eigene `stage1-panel-logic.test.ts`): pure-function-Tests für die korrigierte Underfill-Sort-Reihenfolge in einem ausgelagerten Helper. Vorschlag: Sort-Funktion aus dem `createMemo` extrahieren in `packages/core/src/stage1/reporting.ts` als `sortUnderfillsByGap(strata)`.
  - `stage1-audit.test.ts`: kein neuer Test nötig — die Audit-Provenance-Felder sind bereits dort getestet.
- Neue Playwright-Tests in `apps/web/tests/e2e/stage1.spec.ts`:
  - Audit-Footer ist im DOM sichtbar mit Hash und Signatur-Algo
  - Stale Result wird gecleart wenn N geändert wird nach einem Lauf
  - CSV-Vorschau-Tabelle erscheint nach Upload
  - Run-Button ist sticky (kann via Scroll-Test verifiziert werden, oder einfach `position: sticky` in computed style asserten)

## Out of Scope (explizit, NICHT bearbeiten)

- Claude M2 (Verfahrens-Name + Filename) — wartet auf Verfahren-State-File (#46)
- Claude M3 (Drag-Drop-Konsolidierung) — größerer Refactor, eigenes Issue
- Claude M8 (Vorschau-Debounce) — Performance-Optimierung ohne Real-Daten
- Claude L1/L4/L5/L6 — kosmetisch, kein Konsens

## Bundle-Budget

Maximaler Delta für diese Issue: **+10 KB raw / +3 KB gzip**. Wenn die Audit-Footer + CsvPreview-Komponente das überschreitet, weiteren Refactor zur Reduktion vor Commit machen.
