# CONTEXT — 66-stage3-honest-copy

Decisions locked without interactive discussion (user: "take good defaults, no discussion necessary").

## Decisions (locked — research/planner must follow)

- **Scope: design_handoff_buergerinnenrat/ only.**
  Verified by grep over `apps/web/src/`, `apps/web/index.html`, `apps/web/public/`: the only in-app HiGHS/Leximin mention is `apps/web/src/generated/tech-manifest.ts:112` ("HiGHS-Solver für Stage 3 (Maximin) als WASM"), which is already honest. All other Leximin/HiGHS strings live in `docs/` (research/findings markdown — already correct, e.g. `docs/upstream-verification.md`, `docs/iteration-1-findings.md`). **No app/source changes in this issue.** Touch only `design_handoff_buergerinnenrat/reference/components/stage3.jsx`, `design_handoff_buergerinnenrat/reference/components/docs.jsx`, `design_handoff_buergerinnenrat/README.md`.

- **Commit the design_handoff folder to git as part of this issue.**
  The folder is currently untracked (per session-start `git status`). The corrected files become the canonical reference for #65 and #67. Single atomic commit on the issue branch: `66: docs(design): correct Stage-3 Leximin/HiGHS-'Bereit'-claim + commit handoff reference`.

- **Wording standard.**
  Use `"Maximin (Phase 1)"` (not "Maximin-Heuristik", not "Maximin Iteration 1"). Rationale: aligns with `CLAUDE.md` "Solver-Entscheidung (Stand v1)" + Phase-numbering used in `sortition-tool/00-masterplan.md`. For the unbuilt-Leximin disclaimer use one canonical sentence reusable across `stage3.jsx`, `docs.jsx`, and the README:
  > "Leximin-Garantie ist explizit **nicht** Phase-1-Scope. Upstream-Leximin (`sortitionfoundation/sortition-algorithms`) erfordert Gurobi (siehe `docs/upstream-verification.md`); ein Browser-Leximin-Pfad ist nicht implementiert. Solver-Wahl (HiGHS via highs-js MIT-Kandidat oder andere) ist Strategie-Entscheidung S-2 in `CLAUDE.md`."

- **Solver-card visual treatment.**
  Replace the green `sig-pill "Bereit"` with a neutral grey "Konzept / Concept"-pill (using existing `--ink-3` token, no new token needed). Keep the animated `solver-step is-active` element but rename the label `"Leximin-Iterationen"` → `"Maximin-Iterationen"` (issue body suggested "remove or rename"; rename keeps the visual richer than removal).

- **Stage-3 banner wording.**
  Replace current `"Stage 3 wird in Iteration 3 implementiert (Solver: HiGHS via highs-js)"` with the canonical disclaimer above. Keep banner as `warn` variant.

- **CI grep gate: NO.**
  Adding a forbidden-strings linter to CI is over-engineering for a 3-file issue. Out of scope. (If wishful claims regress later, #65 redesign work will catch them via the same review pattern.)

- **Test approach: visual smoke only.**
  This is a copy-only edit; no unit tests. After the edit, open `design_handoff_buergerinnenrat/reference/index.html` in the dev container and visually confirm Stage-3 screen renders the corrected text. No Playwright additions.

- **Do NOT touch existing app stage-3 surfaces.**
  `apps/web/src/run/RunPanel.tsx`, `apps/web/src/docs/Algorithmus.tsx`, `Limitationen.tsx`, `Verifikation.tsx` — verified clean. Leave alone.

## Claude's Discretion (research can refine)

- Exact German/English wording of the "Konzept"-pill label (DE: "Konzept" / EN: "Concept" — or "In Planung" / "Planned"). Consistent with handoff i18n style at `design_handoff_buergerinnenrat/reference/i18n.jsx:1-205`.
- Whether the docs.jsx "Stage 3" section gets a fully rewritten paragraph or a minimum-edit (preserve sentence structure, swap the load-bearing claims). Default: minimum-edit, surgical.
- Order of `reference/README.md` correction in the commit — could be a single line at the top noting the claim correction, or a search/replace through the file. Default: search-replace at line 4 only (the rest is layout/structure, not algorithm claims).

## Deferred (out of scope)

- Implementation of any Stage-3 solver (Issue #65 doesn't ship Stage 3; that's Iteration 2/3 territory).
- Engine B / Pyodide bootstrap (Issue #12-#14, deferred).
- Visual Stage-3 redesign (Issue #65 explicitly waits for this issue to merge).
- Adding "Konzept"/"Concept" pill class as a reusable design-system primitive (single-use here; promote in #65 if needed).
- A lint/CI gate for forbidden strings.

## References

- Reviews that flagged the false claim: `.issues/design-handoff-buergerinnenrat-redesign-review/reviews/` (Claude C1, Codex C2 — both blocking)
- `CLAUDE.md` L9 (Track 4 Engine B not built), L34-37 (Phase-0-hypothesis falsified), S-2 (algorithm scope decision open)
- `docs/upstream-verification.md` (empirical proof Leximin requires Gurobi)
- Sister issues: #65 (visual redesign — waits on this), #67 (future polish — tracking)
