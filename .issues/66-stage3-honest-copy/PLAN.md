# PLAN — 66-stage3-honest-copy

## Objective

Remove false "Leximin · HiGHS · Bereit"-style claims from the design handoff (`design_handoff_buergerinnenrat/`) and commit the corrected handoff folder to git on this issue branch. Pure copy edits in 3 files; no app/source changes.

## Skills

<skills>
  <!-- No workspace skills tagged — this is a hand-edit copy fix. -->
</skills>

## Interfaces (from RESEARCH.md, verbatim)

<interfaces>
  <file path="design_handoff_buergerinnenrat/reference/components/stage3.jsx">
    <line range="32-33">page-lede claim "Maximin / Leximin nach Flanigan et al."</line>
    <line range="42-43">Vorschau-banner: "Stage 3 wird in Iteration 3 implementiert (Solver: HiGHS via highs-js)"</line>
    <line range="72">Solver-card title `<h2>HiGHS · Leximin</h2>`</line>
    <line range="73-77">green sig-pill "Bereit / Ready"</line>
    <line range="83">animated step `04 · Leximin-Iterationen · 3 / 24`</line>
  </file>
  <file path="design_handoff_buergerinnenrat/reference/components/docs.jsx">
    <line range="40-41">Stage-3 overview-card body: "Maximin / Leximin nach Flanigan et al. (Nature 2021). Solver: HiGHS via highs-js, im Browser."</line>
    <line range="139-140">Docs.stage3 paragraph 1: "Maximin-/Leximin-MIP (Flanigan et al., Nature 2021)"</line>
    <line range="142-143">Docs.stage3 paragraph 2: "Solver im Browser: HiGHS via highs-js (MIT). … Leximin-Garantie aus."</line>
  </file>
  <file path="design_handoff_buergerinnenrat/README.md">
    <line range="4">overview sentence: "**Stage 3** draws a maximin/leximin final panel from respondents."</line>
  </file>
</interfaces>

## Tasks

<task id="1">
  <title>Copy untracked design_handoff_buergerinnenrat/ folder from workspace root into the worktree</title>
  <action>
    The folder lives at `/root/workspace/design_handoff_buergerinnenrat/` (untracked). It is absent from the worktree at `/root/workspace/.worktrees/66-stage3-honest-copy/` because the worktree was cut from main, which doesn't have the folder either.

    Run from the worktree root:
    ```
    cp -R /root/workspace/design_handoff_buergerinnenrat .
    ```

    Do NOT use `git mv` — the source is untracked. Plain `cp -R` preserves the directory structure (README.md + reference/ subtree).

    Do NOT modify the workspace-root copy. After execution, the workspace-root copy and the worktree copy will briefly diverge (worktree has corrections, workspace root doesn't); when this branch merges to main, the corrected version becomes canonical and the workspace-root copy can be removed.
  </action>
  <verify>
    ```
    test -f design_handoff_buergerinnenrat/README.md && \
    test -f design_handoff_buergerinnenrat/reference/components/stage3.jsx && \
    test -f design_handoff_buergerinnenrat/reference/components/docs.jsx && \
    diff -r /root/workspace/design_handoff_buergerinnenrat ./design_handoff_buergerinnenrat
    ```
    `diff -r` should produce no output (folders identical pre-edit).
  </verify>
  <done>
    Folder exists in worktree, contents byte-identical to workspace root, all 3 target files present.
  </done>
</task>

<task id="2">
  <title>Apply 8 string/JSX replacements per RESEARCH.md "Per-file replacements (exact)"</title>
  <action>
    Use the **Edit** tool (NOT bash sed) for each replacement. RESEARCH.md "Per-file replacements (exact)" contains the OLD/NEW pairs verbatim.

    Apply in this order (so each Edit's old_string is unique):

    1. `design_handoff_buergerinnenrat/README.md` line 4 — single-sentence rewrite
    2. `design_handoff_buergerinnenrat/reference/components/stage3.jsx` line 32-33 — page-lede DE+EN
    3. `design_handoff_buergerinnenrat/reference/components/stage3.jsx` line 42-43 — Vorschau-banner DE+EN
    4. `design_handoff_buergerinnenrat/reference/components/stage3.jsx` line 72 — solver-card `<h2>` title (becomes a `lang === "de" ? ... : ...` ternary)
    5. `design_handoff_buergerinnenrat/reference/components/stage3.jsx` lines 73-77 — sig-pill style + label (background → `--bg-sunken`, color → `--ink-3`, border added; dot color → `--ink-4`; label "Bereit/Ready" → "Konzept/Concept")
    6. `design_handoff_buergerinnenrat/reference/components/stage3.jsx` line 83 — `Leximin-` → `Maximin-` in animated step
    7. `design_handoff_buergerinnenrat/reference/components/docs.jsx` lines 40-41 — Stage-3 overview-card body DE+EN
    8. `design_handoff_buergerinnenrat/reference/components/docs.jsx` lines 139-143 — Docs.stage3 paragraphs 1+2 DE+EN

    For each Edit: copy `old_string` from the current file (use Read first), copy `new_string` from RESEARCH.md "Per-file replacements (exact)". Preserve EXACT JSX bracket structure. Do NOT touch surrounding lines.
  </action>
  <verify>
    ```
    # No false claims left:
    grep -nE 'HiGHS\s*·\s*Leximin|Leximin-Iterationen|Maximin\s*/\s*Leximin|maximin/leximin|Maximin-/Leximin-MIP|Maximin/Leximin' design_handoff_buergerinnenrat/reference/components/stage3.jsx design_handoff_buergerinnenrat/reference/components/docs.jsx design_handoff_buergerinnenrat/README.md
    # Expected: zero output (no matches).

    # Replacements landed:
    grep -nE 'Maximin \(Phase 1\)|Konzept|Concept|Maximin-Iterationen|Maximin-MIP|Maximin MIP|S-2 in' design_handoff_buergerinnenrat/reference/components/stage3.jsx design_handoff_buergerinnenrat/reference/components/docs.jsx design_handoff_buergerinnenrat/README.md
    # Expected: at least 8 matches (one per replacement, more if a single replacement contains multiple flagged strings).

    # JSX still parses (no syntax error introduced):
    node -e "require('@babel/standalone').transform(require('fs').readFileSync('design_handoff_buergerinnenrat/reference/components/stage3.jsx', 'utf8'), { presets: ['react'] })" && \
    node -e "require('@babel/standalone').transform(require('fs').readFileSync('design_handoff_buergerinnenrat/reference/components/docs.jsx', 'utf8'), { presets: ['react'] })"
    ```
    First grep returns empty. Second grep returns ≥8 lines. Babel transforms succeed.

    Fallback if `@babel/standalone` not in node_modules: `node --check` does not parse JSX, but a plain syntax-balance check is OK: `python3 -c "import re,sys; s=open('design_handoff_buergerinnenrat/reference/components/stage3.jsx').read(); assert s.count('<') == s.count('>')+sum(1 for _ in re.finditer(r'<[^>]+/>', s))*0, 'tag balance'"` — or just open the file in a browser and confirm no React error overlay.
  </verify>
  <done>
    All 8 OLD strings replaced by their NEW counterparts per RESEARCH.md. JSX parses. No false claim remains.
  </done>
</task>

<task id="3">
  <title>Visual smoke check (manual): open the prototype and verify Stage-3 renders the corrected text</title>
  <action>
    Optional. From the worktree root, you can serve the file via Python:
    ```
    python3 -m http.server 8088 --directory design_handoff_buergerinnenrat/reference &
    ```
    Then open `http://localhost:8088/index.html` in a browser, click the "Stage 3" sidebar item via the Tweaks panel (or set `screen: "stage3"` in `index.html` `__BR_TWEAKS`), and confirm:
    - Solver card title shows "Solver — Auswahl offen" (DE) or "Solver — to be decided" (EN)
    - Pill is grey, says "Konzept" / "Concept"
    - Banner mentions "S-2 in CLAUDE.md" + "kein in-browser Leximin-Pfad"
    - Animated step says "Maximin-Iterationen", not "Leximin-"
    - Docs > Stage 3 paragraphs use new wording

    Kill the http.server when done.

    **If a visual smoke is impractical in this environment, the grep+JSX-parse from task 2 is sufficient.** This task is informational, not blocking.
  </action>
  <verify>
    Manual visual confirmation — no automated check.
  </verify>
  <done>
    Either visual confirmation OR explicit acknowledgement that the grep+parse from task 2 is the only verification (record in EXECUTION.md).
  </done>
</task>

<task id="4">
  <title>Stage and commit the corrected handoff folder on issue/66-stage3-honest-copy branch</title>
  <action>
    From the worktree root:
    ```
    git add design_handoff_buergerinnenrat/
    git status --short    # confirm: only design_handoff_* files staged, ~20 files
    git commit -m "$(cat <<'EOF'
    66: docs(design): correct Stage-3 Leximin/HiGHS-'Bereit'-claim + commit handoff reference

    The design handoff bundled by Claude Design (untracked at workspace root)
    repeatedly stated "HiGHS · Leximin · Bereit" and "Stage 3 ships in
    Iteration 3 (solver: HiGHS via highs-js)" as if the in-browser Leximin
    path existed. Per CLAUDE.md L34-37 + docs/upstream-verification.md,
    upstream Leximin requires Gurobi; no in-browser Leximin implementation
    exists; Engine B/Pyodide track is deferred (Issues #12-#14 unarchived);
    solver-stack decision S-2 is open.

    This commit:

    1. Imports the design_handoff_buergerinnenrat/ folder into git history on
       this branch (was untracked).
    2. Rewords every "Leximin · HiGHS · Bereit"-style claim across:
       - design_handoff_buergerinnenrat/README.md (line 4)
       - design_handoff_buergerinnenrat/reference/components/stage3.jsx
         (page-lede, Vorschau-banner, solver-card title, sig-pill,
         animated step label)
       - design_handoff_buergerinnenrat/reference/components/docs.jsx
         (Stage-3 overview-card body, Docs.stage3 paragraphs 1+2)

    Canonical wording: "Maximin (Phase 1)"; the solver-card pill becomes a
    grey "Konzept"/"Concept" badge instead of green "Bereit"/"Ready"; the
    animated step renames "Leximin-Iterationen" -> "Maximin-Iterationen".

    Out of scope:
    - Implementing any Stage-3 solver
    - Engine B / Pyodide
    - Visual Stage-3 redesign (Issue #65 waits on this fix)
    - Touching apps/web/* (verified clean — only HiGHS mention is
      tech-manifest.ts:112 and it is already honest)

    Refs: Issue #65, Issue #67; reviews under
    .issues/design-handoff-buergerinnenrat-redesign-review/reviews/
    (Claude C1, Codex C2 — both blocking).
    EOF
    )"
    ```
  </action>
  <verify>
    ```
    # Commit lands on the issue branch:
    git log --oneline -1 | grep -E '^[0-9a-f]+ 66: docs\(design\): correct Stage-3'

    # All 3 target files are now tracked:
    git ls-files design_handoff_buergerinnenrat/README.md design_handoff_buergerinnenrat/reference/components/stage3.jsx design_handoff_buergerinnenrat/reference/components/docs.jsx | wc -l
    # Expected: 3

    # Working tree clean:
    test -z "$(git status --porcelain | grep -v '^[?]')"
    # Allowed: ?? entries for non-handoff files (e.g. .issues/<other>/) are fine.
    ```
  </verify>
  <done>
    Single commit on issue/66-stage3-honest-copy with subject prefix "66: docs(design): correct Stage-3 ...". Working tree clean for tracked changes.
  </done>
</task>

## Verification Strategy (overall)

- **No unit tests added.** This is copy-only.
- **No Playwright additions.** The handoff prototype isn't part of the production app's test surface.
- **Grep is the test:** `grep -nE 'HiGHS\s*·\s*Leximin|Leximin-Iterationen|Maximin\s*/\s*Leximin|maximin/leximin|Maximin-/Leximin-MIP|Maximin/Leximin'` returning zero across all touched files is the success signal.
- **JSX-parse check:** Babel transform of stage3.jsx + docs.jsx must not throw.
- **Existing test suite:** `pnpm test` (Vitest) and Playwright are not run for this issue — no app/source changes.

## Out of Scope (preserved from CONTEXT.md)

- Touching `apps/web/src/`, `docs/`, or `README.md` at workspace root
- Adding a CI lint gate for forbidden strings
- Implementing any solver
- Adding a reusable "Konzept"-pill class to a design system
- Visual Stage-3 redesign (Issue #65)

## Rollback

Single commit. To revert: `git revert HEAD` on the branch, or close the PR without merging. The (still-untracked) workspace-root copy of the handoff is unchanged and remains the fallback reference until merge.

## Estimated Scope

**Small** — 8 Edits + 1 cp + 1 commit. Should complete in <15 minutes by the executor. No external dependencies.
