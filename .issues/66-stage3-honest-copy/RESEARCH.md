# RESEARCH — 66-stage3-honest-copy

**Type:** Copy-only fix in 3 files. Standard parallel-research overkill. Synthesized inline by `/issue:research`.

## User Constraints (from CONTEXT.md, verbatim)

- **Scope: design_handoff_buergerinnenrat/ only.** No app/source changes.
- **Commit the design_handoff folder to git as part of this issue.** Currently untracked at workspace root.
- **Wording standard:** `"Maximin (Phase 1)"` + canonical disclaimer reusable across files.
- **Solver-card visual:** green `sig-pill "Bereit"` → neutral grey "Konzept / Concept" pill. Animated step keeps but `"Leximin-Iterationen"` → `"Maximin-Iterationen"`.
- **No CI grep gate. No tests. No touching existing app surfaces.**

## Summary

The fix is a search-and-replace across 3 files in `design_handoff_buergerinnenrat/` plus committing the (currently-untracked) folder under the issue branch. All target strings are enumerated below. No external library, no Solid/Tailwind code, no tests. Single atomic commit.

The handoff folder lives at workspace root and is currently absent from the worktree (worktree was cut from main, which doesn't have the folder either). Execution must:
1. Copy `design_handoff_buergerinnenrat/` from workspace root → worktree
2. Apply the 7 string replacements + 1 visual swap
3. `git add design_handoff_buergerinnenrat/` + commit on `issue/66-stage3-honest-copy`

## Codebase Analysis

### Target file 1: `design_handoff_buergerinnenrat/reference/components/stage3.jsx`

<interfaces>
- `stage3.jsx:32-33` — page-lede claim "Maximin / Leximin nach Flanigan et al."
- `stage3.jsx:42-43` — Vorschau-banner: "Stage 3 wird in Iteration 3 implementiert (Solver: HiGHS via highs-js)"
- `stage3.jsx:71-77` — Solver-card with `<h2>HiGHS · Leximin</h2>` + green `sig-pill "Bereit / Ready"`
- `stage3.jsx:83` — animated step `04 · Leximin-Iterationen · 3 / 24`
</interfaces>

### Target file 2: `design_handoff_buergerinnenrat/reference/components/docs.jsx`

<interfaces>
- `docs.jsx:40-41` — Stage-3 overview-card body: "Maximin / Leximin nach Flanigan et al. (Nature 2021). Solver: HiGHS via highs-js, im Browser."
- `docs.jsx:139-140` — Docs.stage3 paragraph 1: "Maximin-/Leximin-MIP (Flanigan et al., Nature 2021)"
- `docs.jsx:142-143` — Docs.stage3 paragraph 2: "Solver im Browser: HiGHS via highs-js (MIT). Pyodide-Pfad … Leximin-Garantie aus."
</interfaces>

### Target file 3: `design_handoff_buergerinnenrat/README.md`

<interfaces>
- `README.md:4` — overview sentence: "**Stage 3** draws a maximin/leximin final panel from respondents."
</interfaces>

### In-app surfaces (verified clean — DO NOT TOUCH)

- `apps/web/src/generated/tech-manifest.ts:112` — `"purpose": "HiGHS-Solver für Stage 3 (Maximin) als WASM."` — already honest (says Maximin, not Leximin).
- `apps/web/src/run/RunPanel.tsx`, `apps/web/src/docs/Algorithmus.tsx`, `Limitationen.tsx`, `Verifikation.tsx`, `Beispiele.tsx`, `Bmg46.tsx`, `Glossar.tsx`, `Technik.tsx` — grep returned 0 hits for `Leximin|HiGHS|highs-js`.
- `apps/web/index.html`, `apps/web/public/` — grep returned 0 hits.

### `docs/` markdown surfaces (already honest, DO NOT TOUCH)

`docs/upstream-verification.md`, `docs/iteration-1-findings.md`, `docs/quality-comparison-iteration-1.md`, `docs/iteration-2-issue-synthesis.md`, `docs/leximin-cached.md`, `docs/iteration-1-autorun-2026-04-24.md`, `docs/paper-pools.md`, `README.md` — all consistently describe Leximin as "Gurobi-required, deferred to #16, not implemented in browser". `README.md:68-69` is itself a load-bearing reference for the canonical disclaimer text.

## Standard Stack

No libraries needed. Plain text edits. The handoff prototype uses inline `lang === "de" ? "..." : "..."` strings (no i18n library) — keep that pattern.

## Don't Hand-Roll

- Don't invent new Tailwind classes for the "Konzept"-pill — reuse existing handoff CSS variables `--ink-3` (text) and `--bg-sunken` (background) via inline style; the pill class structure is already in `styles.css:604-620`.
- Don't add new `sig-pill` variant. The single-use grey pill can be done inline in `stage3.jsx` with `style={{ background: "var(--bg-sunken)", color: "var(--ink-3)" }}`.

## Architecture Patterns

The handoff is a single-page prototype, not the production app. No architecture concerns.

## Common Pitfalls

1. **Dual-language strings:** Every JSX string in stage3.jsx and docs.jsx is duplicated `de`/`en`. Replace BOTH variants. (CONTEXT.md only requires DE, but the handoff bundle is bilingual; missing the `en` half would leave half-corrected text.)
2. **`maximin/leximin`-style slashes:** Don't replace mechanically — README.md L4 has lower-case `maximin/leximin` (one phrase), stage3.jsx L32 has `Maximin / Leximin` (two terms with spaces). Treat each occurrence as a sentence rewrite, not a regex substitution.
3. **`<p></p>` vs trailing `}` placement:** The JSX uses `lang === "de" ? "..." : "..."` with various closing patterns. Preserve exact JSX bracket structure — don't introduce syntax errors that would break Babel-in-browser.
4. **Folder-add commit risk:** `git add design_handoff_buergerinnenrat/` will add ~20 files (~70 KB total — see `wc -l` output below). If `.gitignore` somehow excludes them (it doesn't, verified by `git check-ignore`), the add silently no-ops. Verify via `git status --short` after staging.

## Environment Availability

- Node 22, pnpm, vitest, playwright present in container — but irrelevant; no tests for this issue.
- `git`, standard utils — available.
- The `design_handoff_buergerinnenrat/reference/index.html` can be opened directly in a browser via the dev container's port for visual smoke check (no build needed; React + Babel CDN at runtime).

## Project Constraints (from CLAUDE.md)

- L9: Track 4 (Engine B / Pyodide) NOT abgearbeitet → no in-browser Leximin path exists.
- L34-37: Phase-0-hypothesis falsified — Leximin is Gurobi-only upstream.
- S-2 open: algorithm scope decision unresolved.
- "Sprache der Dokumente: Deutsch" — DE wording in canonical disclaimer is primary; EN follows literal translation.
- "Keine positive Affirmation — Reviews fanden substanzielle Probleme" — the disclaimer sentence is intentionally factual, not aspirational.

## Canonical Replacement Text (locked from CONTEXT.md, fleshed out)

### DE-canonical disclaimer (used in stage3.jsx banner + docs.jsx Stage-3-Section)

> "Leximin-Garantie ist explizit **nicht** Phase-1-Scope. Upstream-Leximin (`sortitionfoundation/sortition-algorithms`) erfordert Gurobi (siehe `docs/upstream-verification.md`); ein Browser-Leximin-Pfad ist nicht implementiert. Solver-Wahl (HiGHS via `highs-js` MIT-Kandidat oder andere) ist Strategie-Entscheidung S-2 in `CLAUDE.md`."

### EN-canonical disclaimer

> "Leximin guarantee is explicitly **not** Phase-1 scope. Upstream Leximin (`sortitionfoundation/sortition-algorithms`) requires Gurobi (see `docs/upstream-verification.md`); no in-browser Leximin path is implemented. Solver choice (HiGHS via `highs-js` MIT candidate, or other) is strategic decision S-2 in `CLAUDE.md`."

### Per-file replacements (exact)

**`design_handoff_buergerinnenrat/README.md:4`**

OLD:
> ... — a browser-native sortition tool. **Stage 1** draws a stratified mailing list from a population-register CSV; **Stage 3** draws a maximin/leximin final panel from respondents. Sidebar nav, ...

NEW:
> ... — a browser-native sortition tool. **Stage 1** draws a stratified mailing list from a population-register CSV; **Stage 3** is the final-panel draw — Maximin (Phase 1); Leximin is out of Phase-1 scope (requires Gurobi upstream, see `docs/upstream-verification.md`). Sidebar nav, ...

**`stage3.jsx:32-33`** (page-lede)

OLD (DE): "... möglichst gleich hält (Maximin / Leximin nach Flanigan et al., Nature 2021)."
NEW (DE): "... möglichst gleich hält (Maximin (Phase 1) — Leximin-Variante nach Flanigan et al., Nature 2021, ist nicht Phase-1-Scope; Begründung siehe Doku)."

OLD (EN): "... as uniform as possible (Maximin / Leximin, Flanigan et al., Nature 2021)."
NEW (EN): "... as uniform as possible (Maximin (Phase 1) — the Leximin variant from Flanigan et al., Nature 2021, is out of Phase-1 scope; see docs)."

**`stage3.jsx:42-43`** (Vorschau-banner)

OLD (DE): "Stage 3 wird in Iteration 3 implementiert (Solver: HiGHS via highs-js). Die hier gezeigten Werte sind Beispieldaten."
NEW (DE): "Stage 3 ist in dieser Vorschau **Konzept** — noch nicht implementiert. **Solver-Wahl ist offen (S-2 in CLAUDE.md).** Eine Browser-Leximin-Garantie ist nicht zugesagt; Upstream-Leximin (sortition-algorithms) erfordert Gurobi. Die hier gezeigten Werte sind Beispieldaten."

OLD (EN): "Stage 3 ships in Iteration 3 (solver: HiGHS via highs-js). The values shown here are illustrative."
NEW (EN): "Stage 3 is **concept-only** in this preview — not implemented. **Solver choice is open (S-2 in CLAUDE.md).** No in-browser Leximin guarantee is promised; upstream Leximin (sortition-algorithms) requires Gurobi. The values shown here are illustrative."

**`stage3.jsx:72`** (Solver-card title)

OLD: `<h2 className="card-title">HiGHS · Leximin</h2>`
NEW: `<h2 className="card-title">{lang === "de" ? "Solver — Auswahl offen" : "Solver — to be decided"}</h2>`

**`stage3.jsx:73-77`** (sig-pill)

OLD: `<span className="sig-pill" style={{background:"var(--accent-soft)",color:"var(--accent-ink)"}}>... <span ... background:"var(--accent)"...> {lang === "de" ? "Bereit" : "Ready"}</span>`
NEW: `<span className="sig-pill" style={{background:"var(--bg-sunken)",color:"var(--ink-3)",border:"1px solid var(--line-strong)"}}><span style={{width:6,height:6,borderRadius:"50%",background:"var(--ink-4)",display:"inline-block"}}/>{lang === "de" ? "Konzept" : "Concept"}</span>`

**`stage3.jsx:83`** (animated step)

OLD: `<div className="solver-step is-active"><span className="dot"/> 04 · Leximin-{lang === "de" ? "Iterationen" : "iterations"} · 3 / 24</div>`
NEW: `<div className="solver-step is-active"><span className="dot"/> 04 · Maximin-{lang === "de" ? "Iterationen" : "iterations"} · 3 / 24</div>`

**`docs.jsx:40-41`** (overview-card body for Stage 3)

OLD (DE): "Maximin / Leximin nach Flanigan et al. (Nature 2021). Solver: HiGHS via highs-js, im Browser."
NEW (DE): "Maximin (Phase 1). Leximin-Variante (Flanigan et al., Nature 2021) ist nicht Phase-1-Scope. Solver-Wahl offen (CLAUDE.md S-2)."

OLD (EN): "Maximin / Leximin per Flanigan et al. (Nature 2021). Solver: HiGHS via highs-js, in-browser."
NEW (EN): "Maximin (Phase 1). The Leximin variant (Flanigan et al., Nature 2021) is out of Phase-1 scope. Solver choice is open (CLAUDE.md S-2)."

**`docs.jsx:139-140`** (Docs.stage3 paragraph 1)

OLD (DE): "Aus den Antwortenden wird der finale Pool über ein Maximin-/Leximin-MIP gezogen (Flanigan et al., Nature 2021). Das Ziel: alle Quoten erfüllen und gleichzeitig die kleinste individuelle Auswahlwahrscheinlichkeit so groß wie möglich machen."
NEW (DE): "Aus den Antwortenden wird der finale Pool über ein **Maximin-MIP** gezogen — die Phase-1-Wahl. Das Ziel: alle Quoten erfüllen und gleichzeitig die kleinste individuelle Auswahlwahrscheinlichkeit so groß wie möglich machen. Die im Flanigan-Paper (Nature 2021) zentrale **Leximin-Garantie** ist explizit nicht Phase-1-Scope."

OLD (EN): "The final panel is drawn from respondents via a Maximin/Leximin MIP (Flanigan et al., Nature 2021). The goal: meet every quota while making the smallest individual selection probability as large as possible."
NEW (EN): "The final panel is drawn from respondents via a **Maximin MIP** — the Phase-1 choice. The goal: meet every quota while making the smallest individual selection probability as large as possible. The **Leximin guarantee** from the Flanigan paper (Nature 2021) is explicitly out of Phase-1 scope."

**`docs.jsx:142-143`** (Docs.stage3 paragraph 2)

OLD (DE): "Solver im Browser: HiGHS via highs-js (MIT). Pyodide-Pfad mit upstream sortition-algorithms ist als Alternative verifiziert worden, scheidet aber wegen Gurobi-Pflicht für Leximin-Garantie aus."
NEW (DE): "Konkrete Solver-Wahl ist offen (Strategie-Entscheidung S-2 in `CLAUDE.md`). Kandidaten: HiGHS via `highs-js` (MIT, in Iteration 1 für Maximin verwendet) oder ein eigener Browser-Leximin-Port (Issue #16, deferred — siehe `docs/upstream-verification.md` zur Gurobi-Pflicht im Upstream)."

OLD (EN): "In-browser solver: HiGHS via highs-js (MIT). The Pyodide path with upstream sortition-algorithms was verified as an alternative but is ruled out by its Gurobi dependency for the Leximin guarantee."
NEW (EN): "Concrete solver choice is open (strategic decision S-2 in `CLAUDE.md`). Candidates: HiGHS via `highs-js` (MIT, used in Iteration 1 for Maximin) or a custom in-browser Leximin port (Issue #16, deferred — see `docs/upstream-verification.md` on the upstream Gurobi requirement)."

## Sources

- **HIGH** — `docs/upstream-verification.md` (empirical Leximin-Gurobi finding with file:line cites)
- **HIGH** — `CLAUDE.md` L9, L34-37, S-2
- **HIGH** — `.issues/design-handoff-buergerinnenrat-redesign-review/reviews/review-*-claude-opus-4-7.md` (finding C1)
- **HIGH** — `.issues/design-handoff-buergerinnenrat-redesign-review/reviews/review-*-gpt-5-4.md` (finding C2)
- **HIGH** — direct enumeration of target strings via `grep -nE 'Leximin|HiGHS|Bereit|Iteration 3|highs-?js' design_handoff_buergerinnenrat/reference/components/stage3.jsx design_handoff_buergerinnenrat/reference/components/docs.jsx design_handoff_buergerinnenrat/README.md`
- **MEDIUM** — wording style choice ("Maximin (Phase 1)" vs alternatives) — pattern matches `docs/iteration-2-issue-synthesis.md` and `sortition-tool/00-masterplan.md` Phase nomenclature
