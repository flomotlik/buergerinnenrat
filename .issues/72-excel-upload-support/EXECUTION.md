# EXECUTION — 72-excel-upload-support

Started: 2026-05-04T16:10:00Z
Plan: 16 tasks across phases A-F

## Tasks

- [x] Task 1 (Phase A): Add SheetJS dependency via CDN-Tarball — commit 72e1543
- [x] Task 2 (Phase A): Define ParsedTable type additive — commit aec154a
- [x] Task 3 (Phase B): Implement parseXlsxFile (lazy SheetJS import) — commit f7f0edd
  - Note: Bundle-Chunk-Verifikation deferred — kein Consumer in Task 3, daher tree-shaked. Chunk wird mit Task 6 (CsvImport-Routing) erscheinen.
- [x] Task 4 (Phase B): Vitest unit tests for parseXlsxFile — commit d0305e3
  - Note: Test file at `apps/web/tests/unit/parse-xlsx.test.ts` (etablierte vitest-Konvention), nicht `src/csv/`. Auch parse-xlsx.ts nun mit `parseXlsxBuffer` als Buffer-Variante (analog zu parseCsvBuffer) für Testbarkeit ohne JSDOM-File-Polyfill.
  - Note: 9 Tests grün (Plan: "9-10"). Empty-workbook-Test (#7 im Plan) entfernt — defensiver Branch, nicht via public surface reproduzierbar.
- [x] Task 5 (Phase B): Konvertierungs-Script scripts/csv-to-xlsx.ts + Beispiel-XLSX — commit b9dbabb
- [x] Task 6 (Phase C): Erweitere CsvImport.tsx um Excel-Upload — commit db72caf
- [x] Task 7 (Phase C): Playwright e2e spec xlsx-import.spec.ts — commit 2b4887f
- [x] Task 8 (Phase D): Implement stage1ResultToXlsx in packages/core — commit 4d038be
  - Note: xlsx als dependency in `@sortition/core` ergänzt damit vitest in packages/core auflösen kann (sonst wäre `await import('xlsx')` an Test-Zeit unauflösbar). Build bleibt trotzdem lazy.
- [x] Task 9 (Phase D): Excel-Download-Button in Stage1Panel.tsx — commit 9c96700
- [x] Task 10 (Phase D): Excel-Download-Button in RunPanel.tsx — commit 995f86b
  - Note: Optionales `_audit-info` Sheet (Stretch in Plan) als Followup ausgelagert. Keep diff focused per Plan-Empfehlung.
- [x] Task 11 (Phase D): Round-Trip Test Excel-Export → parseXlsxFile — commit d2a15d7
  - Note: Test in `apps/web/tests/unit/parse-xlsx-roundtrip.test.ts` (vitest-Konvention, siehe Task 4 Note). Import via `@sortition/core` (das ist der etablierte Web-App-Pfad — `/stage1` Sub-Path nicht in Vite-Aliases definiert).
- [x] Task 12 (Phase E): Atomarer Verzeichnis-Rename csv/ → import/ — commit c825f74
  - 30 Dateien, 1 Commit, alle 7 Audit-greps clean
  - 174 playwright + 178 vitest + 122 core Tests gruen
- [x] Task 13 (Phase F): Update Beispiele.tsx mit Excel-Beispielen — commit de79844
- [x] Task 14 (Phase F): Update README.md + beispiele/README.md — commit 45f7704
- [x] Task 15 (Phase F): CI-Step csv-to-xlsx.ts --check in deploy.yml — commit 047b477
- [x] Task 16 (Phase F): BUNDLE_DELTA.md entry für Issue #72 — commit 8ec5596

## Deviations

- **Task 1 — Tech-Manifest update mitcommittet (R2 — Auto-add critical functionality):**
  Adding xlsx zur package.json triggert in jedem Build die `prebuild`-Hook, die
  `pnpm tech-manifest` ausführt und auf Drift prüft. Der Plan sagt explizit
  "KEIN Code-Diff, nur package.json + pnpm-lock.yaml" — aber ohne
  PURPOSE_MAP-Eintrag würde der Eintrag als "TODO" generiert und der nächste
  Build (Task 3) würde fehlschlagen. Daher xlsx-Eintrag in PURPOSE_MAP plus
  regenerierte tech-manifest.ts mit-commited.

- **Test-Verzeichnis: `apps/web/tests/unit/` statt `apps/web/src/csv/` (R3 — Auto-fix blockers):**
  Der Plan platziert Vitest-Tests bei `apps/web/src/csv/parse-xlsx.test.ts` etc.
  Die `vite.config.ts` `test.include` enthält jedoch ausschließlich
  `tests/unit/**/*.test.ts` (Zeile 78). Tests im src-Tree würden nicht
  ausgeführt. Etablierte Konvention: alle Vitest-Tests liegen in
  `apps/web/tests/unit/`, importieren aus `../../src/...`. Folge der Konvention
  statt Plan, dokumentiere hier. Betrifft Tasks 4 und 11 (parse-xlsx.test.ts,
  parse-xlsx-roundtrip.test.ts).

## Verification Results

Final-wrap (post-Task 16):

- `pnpm --filter @sortition/web typecheck` — clean
- `pnpm --filter @sortition/web test` — 178 passed (19 files)
- `pnpm --filter @sortition/core test` — 122 passed (9 files)
- `pnpm --filter @sortition/web exec playwright test` — 174 passed (2 skipped)
- `VITE_BASE_PATH=/ pnpm --filter @sortition/web build` — green; main `index-*.js` 142.17 KB raw / 46.36 KB gzip; xlsx async-Chunk 499.91 KB raw / 163.13 KB gzip
- `pnpm audit --prod` — clean
- `pnpm tsx scripts/csv-to-xlsx.ts --check` — alle 4 Beispiele synchron

## Discovered Issues

(none — alle 16 Tasks executed in sequence, keine Blocker)

## Self-Check

- [x] All files from plan exist (apps/web/src/import/, parse-xlsx.ts, packages/core/src/stage1/xlsx-export.ts, scripts/csv-to-xlsx.ts, etc.)
- [x] All commits exist on branch (08df604..8ec5596 = 17 issue commits + 1 final docs)
- [x] Full verification suite passes (typecheck + vitest + core + playwright + build + audit + xlsx-check)
- [x] No stubs/TODOs/placeholders introduced
- [x] No leftover debug code
- [x] Bundle-Delta innerhalb Hard-Constraint (+4.77 KB raw, Budget 5 KB)
- [x] xlsx als Lazy-Chunk separiert (kein Top-Level-Import in main bundle)
- [x] Alle 7 Audit-greps clean (Task 12 atomic-rename verification)
- **Result:** PASSED
