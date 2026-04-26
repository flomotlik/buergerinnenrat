---
review_of: stage-1-group-reporting-ux-review
review_type: topic
review_mode: topic
review_topic: Stage 1 group reporting UX review
reviewed_at: 2026-04-26T11-25-42Z
tool: codex
model: gpt-5.4
duration_seconds: 177
---

<review>

<findings>

<finding severity="high" id="H1">
  <title>Default seed path contradicts the "choose publicly in the meeting" control goal</title>
  <location>apps/web/src/stage1/Stage1Panel.tsx:22, apps/web/src/stage1/Stage1Panel.tsx:50-51, apps/web/src/stage1/Stage1Panel.tsx:279-309</location>
  <description>The easiest path is to accept a prefilled Unix-time seed marked as "Default", even though the adjacent amber hint says the group should choose the seed publicly before the run. In a municipal meeting this creates a legitimacy problem: the chair can click through with a value nobody discussed, while the UI still implies the anti-tampering ritual happened.</description>
  <fix>Do not treat the auto-seed as a normal ready-to-run state. Start with an empty or blocked seed field plus an explicit "Seed gemeinsam festlegen" action, or require the user to confirm "öffentlich festgelegt" before enabling the run button.</fix>
</finding>

<finding severity="high" id="H2">
  <title>Printed result is not a self-contained protocol because audit identity and signature are absent from the on-screen report</title>
  <location>apps/web/src/stage1/Stage1Panel.tsx:436-440, apps/web/src/stage1/Stage1Panel.tsx:543-575, apps/web/src/index.css:12-20, packages/core/src/stage1/reporting.ts:218-230, packages/core/src/stage1/reporting.ts:281-289</location>
  <description>The result screen only shows runtime and seed before the export buttons, while the printable view hides controls and hints but does not add the audit fields that make the record traceable. The markdown report includes filename, SHA-256, parameters, and signature footer, but the printable in-app protocol does not. A group leaving the room with only the printout cannot later tie the paper to a specific input CSV and signed audit.</description>
  <fix>Add a dedicated "Protokoll / Audit" section to the result view with input filename, input hash, axes, target N, actual N, timestamp, signature algorithm, public key fingerprint, and signature snippet or verification instructions, and keep that section visible in print.</fix>
</finding>

<finding severity="high" id="H3">
  <title>Pre-run warnings summarize risk counts but hide which strata are affected before the group commits</title>
  <location>apps/web/src/stage1/Stage1Panel.tsx:315-350, apps/web/src/stage1/Stage1Panel.tsx:442-467</location>
  <description>The preview warning box tells the group only that some strata get zero allocation or will underfill, but it does not name those strata until after the draw. That is the wrong moment for a deliberative meeting: the whole point of the preview is to decide whether the chosen axes are too fine before clicking.</description>
  <fix>In the preview, list at least the first affected strata and their pool/target values, or add a collapsible preview detail table so the group can inspect the problematic combinations before running.</fix>
</finding>

<finding severity="medium" id="M1">
  <title>Stage 1 vs Stage 3 is not self-explanatory for first-time municipal users</title>
  <location>apps/web/src/App.tsx:73-98, apps/web/src/stage1/Stage1Panel.tsx:221-243, sortition-tool/08-product-redesign.md:20-32, sortition-tool/07-two-stage-workflow-analysis.md:13-18</location>
  <description>The two tabs are labeled with actions, but the UI never explains the overall sequence "Melderegister -> Versand -> Antworten extern -> Panel". The BMG hint explains legal field limits, not when Stage 1 should be used versus Stage 3. A clerk seeing the app cold could easily wonder whether "Panel ziehen" is the primary flow and whether Stage 1 is optional.</description>
  <fix>Add a one-line workflow explainer above the tabs or directly under the header, and give each tab a short subtitle that names its input: "Melderegister" for Stage 1 and "Antwortenden-Pool" for Stage 3.</fix>
</finding>

<finding severity="medium" id="M2">
  <title>Result hierarchy introduces statistical jargon before plain-language status</title>
  <location>apps/web/src/stage1/Stage1Panel.tsx:381-433, packages/core/src/stage1/reporting.ts:233-240</location>
  <description>"Stratum-Abdeckung" is technically accurate but not everyday administrative language, and the card explains it only in smaller text after the number. In a group setting, participants will understand "gezogen" and "unterbesetzt" immediately, but "covered strata" requires interpretation and competes visually with the more operational headline numbers.</description>
  <fix>Rename the card to a plain-language phrase such as "Gruppen mit mindestens 1 gezogener Person" or "Abgedeckte Gruppen", and consider moving it after the underfill card or turning it into secondary explanatory text below the main outcome cards.</fix>
</finding>

<finding severity="medium" id="M3">
  <title>Axis charts are readable for short labels but fragile for long municipal values and weak for assistive tech</title>
  <location>apps/web/src/stage1/AxisBreakdown.tsx:50-56, apps/web/src/stage1/AxisBreakdown.tsx:65-101, apps/web/src/stage1/AxisBreakdown.tsx:108-116</location>
  <description>The SVG exposes only a generic aria-label, so screen readers do not get the bucket values or Soll/Ist counts. Visually, the layout reserves a fixed 120-unit label column and prints value text to the right of the longer bar, which is likely to collide or wrap poorly with longer district names or coded administrative labels. The meaning of grey versus blue is also color-dependent, and the legend disappears on print.</description>
  <fix>Add SVG title/desc content or an adjacent textual summary list, give the bars patterns or explicit in-bar/row labels that survive grayscale print, and make the label column adaptive or wrap long labels outside the SVG.</fix>
</finding>

<finding severity="medium" id="M4">
  <title>Several error and validation states are technically handled but not operationally guided</title>
  <location>apps/web/src/stage1/Stage1Panel.tsx:109-121, apps/web/src/stage1/Stage1Panel.tsx:139-165, apps/web/src/stage1/Stage1Panel.tsx:310-313, apps/web/src/stage1/AxisPicker.tsx:26-46, packages/core/src/stage1/stratify.ts:129-136, apps/web/src/csv/parse.ts:80-97</location>
  <description>The UI catches parse and run errors, but it does not explain the likely remedy. Uploaded CSV warnings are never shown. If no familiar columns are recognized, the user just sees a long checkbox list with no guidance. If all axes are unchecked, the run silently becomes a simple random sample. If N exceeds pool size, a red error appears, but the run button stays enabled and the screen offers no corrective suggestion. In a shared meeting this invites confusion and repeated trial-and-error.</description>
  <fix>Surface parse warnings under the upload summary, show a clear empty-recommendation state when no standard axes were detected, explicitly label the zero-axis mode as "einfache Zufallsstichprobe", and disable the run button when preview validation already knows the run will fail.</fix>
</finding>

</findings>

<question_answers>
<answer id="1" verdict="awkward">The end-to-end sequence is broadly linear and skimmable because Stage 1 is organized into numbered sections and only reveals later steps after upload, which matches the intended meeting flow in the product docs (`apps/web/src/stage1/Stage1Panel.tsx:193-372`, `sortition-tool/08-product-redesign.md:20-25`). It becomes awkward at the decision points: the seed control invites a click-through default instead of a visibly group-chosen value (`apps/web/src/stage1/Stage1Panel.tsx:279-309`), and the preview warns about problematic strata without naming them before the run (`apps/web/src/stage1/Stage1Panel.tsx:315-350`).</answer>
<answer id="2" verdict="awkward">The preview is useful because it appears at the right moment and shows per-axis Soll totals before the draw (`apps/web/src/stage1/Stage1Panel.tsx:315-359`). The warning copy is not sufficient for a meeting decision, though, because it reports only counts of zero-allocation and underfilled strata, not the affected combinations (`apps/web/src/stage1/Stage1Panel.tsx:335-349`). That means the group learns "something is off" but not whether it is a harmless edge case or a politically sensitive subgroup.</answer>
<answer id="3" verdict="awkward">The post-run hierarchy starts well with a clear result heading and a leftmost "Gezogen" card (`apps/web/src/stage1/Stage1Panel.tsx:377-392`), and the underfill alert below the cards gives concrete remediation context (`apps/web/src/stage1/Stage1Panel.tsx:442-467`). The weak point is the second card: "Stratum-Abdeckung" is jargon-heavy and visually promoted to top-line status before the user has a plain-language explanation (`apps/web/src/stage1/Stage1Panel.tsx:393-413`). Reordering or demoting that metric would make the result easier to explain to non-statisticians.</answer>
<answer id="4" verdict="awkward">For short labels, the charts are understandable: each bucket gets a labeled row and explicit "Soll X · Ist Y (Pool Z)" text, so the numbers are not purely graphical (`apps/web/src/stage1/AxisBreakdown.tsx:57-101`). The implementation is still fragile for real-world use because the label area is fixed, the meaning of the two bars is color-led, the printed legend is suppressed, and the SVG accessibility text does not expose bucket-level values (`apps/web/src/stage1/AxisBreakdown.tsx:50-56`, `apps/web/src/stage1/AxisBreakdown.tsx:76-90`, `apps/web/src/stage1/AxisBreakdown.tsx:108-116`).</answer>
<answer id="5" verdict="usable">The duplication is mostly helpful rather than annoying. The top card gives a fast count of whether underfill exists (`apps/web/src/stage1/Stage1Panel.tsx:416-433`), while the amber section explains what underfill means operationally and lists the exact strata (`apps/web/src/stage1/Stage1Panel.tsx:442-467`). That split works for a meeting because one element is summary and the other is evidence.</answer>
<answer id="6" verdict="usable">The export set is sensible for the stated workflow: CSV for operations, Audit-JSON for machine-verifiable traceability, Markdown for narrative reporting, and print for paper protocol (`apps/web/src/stage1/Stage1Panel.tsx:543-575`, `sortition-tool/08-product-redesign.md:24-25`). The filenames are also serviceable and consistent with the e2e journey (`apps/web/src/stage1/Stage1Panel.tsx:167-188`, `apps/web/tests/e2e/stage1.spec.ts:69-88`). The main gap is not the export set itself but that the printable in-app report omits key audit metadata that the markdown report already includes (`packages/core/src/stage1/reporting.ts:218-230`, `packages/core/src/stage1/reporting.ts:281-289`).</answer>
<answer id="7" verdict="confusing">The print stylesheet does the basics correctly by removing chrome, hiding action controls, and forcing the strata details open (`apps/web/src/index.css:12-38`). But the printed result is not a complete protocol because the on-screen report never exposes the input filename, hash, axes, target N, timestamp, or signature details that appear in the markdown report (`apps/web/src/stage1/Stage1Panel.tsx:436-440`, `packages/core/src/stage1/reporting.ts:218-230`, `packages/core/src/stage1/reporting.ts:281-289`). A municipal group can print it, but the paper alone is not strong enough as an audit artifact.</answer>
<answer id="8" verdict="awkward">The seed hint contains the right governance idea, especially the reason that public pre-run choice prevents unnoticed seed-shopping (`apps/web/src/stage1/Stage1Panel.tsx:303-308`). It still reads more like procedural justification than an action instruction because the field above it is already populated and marked "Default" (`apps/web/src/stage1/Stage1Panel.tsx:279-297`). The copy and the control are pulling in opposite directions.</answer>
<answer id="9" verdict="awkward">The UI has a solid native-HTML baseline, but the most likely issues are concrete and easy to foresee: the file input has no explicit label wrapper beyond the section heading (`apps/web/src/stage1/Stage1Panel.tsx:194-203`), the N/Seed labels are not programmatically associated with their inputs (`apps/web/src/stage1/Stage1Panel.tsx:262-285`), the tab switcher is button-styled navigation without tab semantics (`apps/web/src/App.tsx:73-98`), and the SVG charts expose only a generic aria-label (`apps/web/src/stage1/AxisBreakdown.tsx:50-56`). Keyboard operation is probably workable, but screen-reader clarity is not yet at review-ready quality.</answer>
<answer id="10" verdict="awkward">If N exceeds pool size, both preview and run can surface a clear low-level error string from the core sampler (`apps/web/src/stage1/Stage1Panel.tsx:60-69`, `packages/core/src/stage1/stratify.ts:132-135`), so the failure is not silent. The surrounding UX is weaker: CSV parse warnings are collected but never displayed (`apps/web/src/csv/parse.ts:80-97`, `apps/web/src/stage1/Stage1Panel.tsx:204-217`), no-recognized-columns falls back to an unexplained checkbox list with no suggested axes (`apps/web/src/stage1/Stage1Panel.tsx:114-118`, `apps/web/src/stage1/AxisPicker.tsx:26-46`), and unselecting all axes silently becomes a one-stratum random sample because the core intentionally treats `axes=[]` that way (`packages/core/src/stage1/stratify.ts:116-122`, `packages/core/src/stage1/stratify.ts:138-145`).</answer>
<answer id="11" verdict="confusing">A first-time user would not fully understand Stage 1 versus Stage 3 from the UI alone. The tab labels are understandable as verbs, but they do not explain the underlying inputs or sequence (`apps/web/src/App.tsx:73-98`). The BMG hint is legally useful once Stage 1 is already open, yet it explains only field constraints in the Melderegister, not the broader three-step workflow described in the product docs (`apps/web/src/stage1/Stage1Panel.tsx:221-243`, `sortition-tool/08-product-redesign.md:18-32`).</answer>
<answer id="12" verdict="usable">The overall styling is coherent enough that switching tabs does not feel like jumping into a different product: both use numbered steps, restrained Tailwind utility styling, simple tables, and similar export buttons (`apps/web/src/App.tsx:107-147`, `apps/web/src/stage1/Stage1Panel.tsx:247-372`, `apps/web/src/run/RunPanel.tsx:68-108`, `apps/web/src/run/RunPanel.tsx:243-258`). Stage 1 does add some new patterns such as the SVG breakdown cards and print-focused report section, but these read as an extension of the current language rather than obvious visual debt (`apps/web/src/stage1/AxisBreakdown.tsx:35-47`, `apps/web/src/index.css:12-51`).</answer>
</question_answers>

<strengths>
<strength>The numbered reveal structure keeps the meeting on rails: upload first, then axis selection, then N/seed, then run, then result, with later sections gated on prior state (`apps/web/src/stage1/Stage1Panel.tsx:193-372`).</strength>
<strength>The underfill explanation translates a statistical condition into an operational sentence about "alle verfügbaren Personen angeschrieben", which is exactly the kind of real-world phrasing municipal participants need (`apps/web/src/stage1/Stage1Panel.tsx:450-455`).</strength>
<strength>The markdown report builder already contains the right audit backbone for traceability, including file identity, parameters, marginals, full strata table, and signature footer (`packages/core/src/stage1/reporting.ts:216-289`).</strength>
<strength>Stage 1 stays visually consistent with Stage 3 by reusing the same low-ornament UI vocabulary: compact headings, borders, tables, and export controls (`apps/web/src/App.tsx:107-147`, `apps/web/src/run/RunPanel.tsx:152-258`).</strength>
</strengths>

<verdict value="warn" critical="0" high="3" medium="4">
  <summary>The Stage 1 flow is close to shippable for an accompanied group meeting: the step structure is sensible, the core results are visible, and the workflow can be completed. It should not ship unchanged to real municipal sessions, though, because three issues cut directly against trust and explainability in that setting: the default-seed path weakens the public-draw ritual, the preview hides which strata are risky until after commitment, and the printable report is not a self-contained audit protocol.</summary>
  <blockers>
    <blocker>Seed selection should require an explicit group action instead of silently accepting a prefilled default (`apps/web/src/stage1/Stage1Panel.tsx:279-309`).</blocker>
    <blocker>Preview warnings should identify the affected strata before the draw, not only after it (`apps/web/src/stage1/Stage1Panel.tsx:315-350`, `apps/web/src/stage1/Stage1Panel.tsx:442-467`).</blocker>
    <blocker>Printed output should include audit identity and signature metadata so the paper protocol stands on its own (`apps/web/src/stage1/Stage1Panel.tsx:436-440`, `packages/core/src/stage1/reporting.ts:218-230`, `packages/core/src/stage1/reporting.ts:281-289`).</blocker>
  </blockers>
</verdict>

</review>
<verdict value="warn" critical="0" high="3" medium="4">
Brief overall assessment
</verdict>

