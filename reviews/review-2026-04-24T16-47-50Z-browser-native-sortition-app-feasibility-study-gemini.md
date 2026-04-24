<review>

<findings>

<finding severity="critical" id="C1">
  <title>CVXPY Performance in Column Generation Loop</title>
  <location>02-pyodide-feasibility.md (Section 3a) &amp; 03-algorithm-port.md (Section 1.3)</location>
  <description>The Pyodide report recommends replacing `mip` with `cvxpy` (2-5 days effort). However, the Leximin algorithm uses a Column Generation loop that solves MIP subproblems repeatedly (up to 200 times per iteration). CVXPY is not designed for dynamic column addition; modifying a problem requires a complete rebuild and re-parse of the model. This overhead inside a loop of thousands of iterations will cause catastrophic performance (hours of modeling time), far exceeding the 3-minute limit.</description>
  <fix>Drop the `cvxpy` rewrite path. Instead, rewrite the `mip` models to use the `highspy` library directly, which supports fast incremental model updates and is already available in Pyodide.</fix>
</finding>

<finding severity="critical" id="C2">
  <title>CSP `connect-src 'none'` Breaks Pyodide</title>
  <location>04-frontend-architecture.md (Section 4.3) &amp; 00-masterplan.md</location>
  <description>The architecture requires a Content Security Policy of `connect-src 'none'`. This strictly blocks all `fetch()` calls, even to the same origin (`'self'`). Pyodide relies heavily on `fetch()` during initialization to download its `pyodide.asm.wasm`, package locks, and wheels (`numpy`, `highspy`). Under `connect-src 'none'`, Pyodide will immediately crash.</description>
  <fix>Change the CSP to `connect-src 'self'`. This still prevents data exfiltration to third-party servers (fulfilling the GDPR promise) while allowing Pyodide to load its local assets.</fix>
</finding>

<finding severity="critical" id="C3">
  <title>GPL-3.0 License Contradiction in Phase 0/1</title>
  <location>00-masterplan.md (Section "Lizenz" &amp; "Roadmap") &amp; 05-product-and-licensing.md</location>
  <description>The masterplan claims the product will be Apache-2.0 licensed, while simultaneously planning to run the GPL-3.0 licensed `sortition-algorithms` in Pyodide during Phase 0 and 1. A JavaScript frontend tightly coupled to a GPL backend executing in the same browser memory space constitutes a combined work under the GPL. Distributing this app requires the entire codebase to be GPL-3.0.</description>
  <fix>Explicitly state that the Phase 1 (Pyodide MVP) MUST be GPL-3.0 (or AGPL-3.0) licensed. Only the optional Phase 2 (clean-room TypeScript port) can escape the copyleft and be licensed as Apache-2.0.</fix>
</finding>

<finding severity="high" id="H1">
  <title>BITV 2.0 / Accessibility Classified as Low Priority</title>
  <location>04-frontend-architecture.md (Section 10, Point 14)</location>
  <description>Accessibility (BITV 2.0 / WCAG 2.1 AA) is listed under "Niedrige Prioritaet / Spaeter". For a tool aimed at the German public sector (municipalities), BITV 2.0 compliance is a strict legal requirement from day one for digital applications. Treating it as an afterthought will block procurement.</description>
  <fix>Elevate Accessibility/BITV 2.0 compliance to a mandatory Go/No-Go requirement for Phase 1. Ensure the chosen UI framework enforces these standards immediately.</fix>
</finding>

<finding severity="high" id="H2">
  <title>Missing DSFA (Datenschutz-Folgenabschätzung) Obligation</title>
  <location>00-masterplan.md (Section "Offene Fragen", Point 3)</location>
  <description>The masterplan wonders if a client-side app has GDPR implications. Processing municipal population register data (Melderegister) for democratic lotteries is high-risk processing under GDPR Art. 35. Even without a backend, the municipality acts as the Data Controller and is legally required to conduct a DSFA before using the software.</description>
  <fix>Include the creation of a "DSFA Template" as a required deliverable in Phase 1, allowing municipal data protection officers to easily adopt the tool.</fix>
</finding>

<finding severity="medium" id="M1">
  <title>iOS Safari Feasibility Overestimated</title>
  <location>00-masterplan.md (Go/No-Go-Matrix)</location>
  <description>The Go/No-Go matrix targets "iOS-Safari: funktioniert". However, iOS Safari has a strict WebAssembly memory limit (often ~500MB practical). Running Pyodide, SciPy, and HiGHS, while solving an MIP, will likely cause OOM crashes on iPads/iPhones. Resolving this within a 2-week Phase 0 spike is unrealistic.</description>
  <fix>Remove iOS Safari from the critical Go/No-Go path. Target Desktop browsers for the MVP and handle mobile support as a known limitation.</fix>
</finding>

</findings>

<strengths>
<strength>The solver analysis correctly identifies the GPL limitations of `glpk.js` and positions `highs-js` as the only viable MIT-licensed MIP solver in WebAssembly (01-wasm-solver-landscape.md).</strength>
<strength>The dual-distribution strategy (Hosted PWA + Signed ZIP) elegantly addresses municipal privacy concerns while retaining user convenience (04-frontend-architecture.md).</strength>
<strength>The business model analysis accurately scopes the market limits (10-25 procedures/year DACH) and correctly positions the tool as a consulting enabler rather than a SaaS unicorn (05-product-and-licensing.md).</strength>
</strengths>

<traces>
<trace name="main check">Verified `highs-js` and `sortition-algorithms` on NPM/PyPI registries to confirm licenses and active development. Cross-referenced GPL v3 combination rules regarding Pyodide execution. Evaluated `cvxpy` architectural suitability for dynamic column generation loops against `highspy`/`mip`.</trace>
</traces>

<verdict value="fail" critical="3" high="2" medium="1">
  <blockers>
    <blocker>CVXPY performance overhead in the Column Generation loop will cause the solver to time out.</blocker>
    <blocker>CSP `connect-src 'none'` will permanently crash Pyodide on startup.</blocker>
    <blocker>GPL-3.0 license violation if Phase 1 app is distributed as Apache-2.0.</blocker>
  </blockers>
Overall, the masterplan contains fatal technical and legal flaws in Phase 0/1. The solver approach must be switched to `highspy`, the CSP must be relaxed to `'self'`, and the licensing strategy for the MVP must accept GPL-3.0.
</verdict>

</review>