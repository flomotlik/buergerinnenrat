---
review_of: stage-1-group-reporting-ux-review
review_type: topic
review_mode: topic
review_topic: Stage 1 group reporting UX review
reviewed_at: 2026-04-26T11-27-47Z
tool: gemini
model: gemini-3.1-pro-preview
duration_seconds: 125
---

<review>

<findings>

<finding severity="high" id="H1">
  <title>Missing form label associations</title>
  <location>apps/web/src/stage1/Stage1Panel.tsx:259-261, 273-275</location>
  <description>The labels for "Stichprobengröße N" and "Seed" are `<label>` elements without a `for` attribute, and they do not wrap their respective `<input>` elements. Screen readers will not announce the input names when the inputs receive focus, severely degrading accessibility for visually impaired users.</description>
  <fix>Add `id="stage1-target-n"` to the size input and `for="stage1-target-n"` to its label. Do the same for the Seed input.</fix>
</finding>

<finding severity="medium" id="M1">
  <title>Run button pushed out of view by preview</title>
  <location>apps/web/src/stage1/Stage1Panel.tsx:313-356</location>
  <description>The "Versand-Liste ziehen" button is rendered below the `preview` block. If the user selects many axes, the preview will grow vertically, potentially pushing the primary action button below the fold. This disrupts the linear 1-2-3-4 step flow and makes the UI feel disjointed.</description>
  <fix>Move the "Versand-Liste ziehen" button up, perhaps aligning it with the "Stichprobengröße N" or "Seed" row, ensuring the primary action is always visible regardless of preview size. (This would also make it more consistent with `RunPanel.tsx` in Stage 3).</fix>
</finding>

<finding severity="medium" id="M2">
  <title>Missing physical signature lines in print protocol</title>
  <location>apps/web/src/stage1/Stage1Panel.tsx:506 / apps/web/src/index.css:10</location>
  <description>The print stylesheet optimizes the page for paper (removing buttons and nav), but the printed page lacks a physical signature block. In a municipal setting ("Verfahrens-Sitzung"), the generated paper protocol typically requires physical signatures from the Mayor and/or Clerk to be filed as an official record. The digital signature in the Markdown report does not cover this physical requirement.</description>
  <fix>Add a print-only section (`hidden print:block`) at the bottom of the result view with lines for "Unterschrift" (e.g., Bürgermeister:in, Protokollführung, Datum/Ort).</fix>
</finding>

<finding severity="low" id="L1">
  <title>Academic jargon in top-level summary cards</title>
  <location>apps/web/src/stage1/Stage1Panel.tsx:389</location>
  <description>The top-line result card uses the term "Stratum-Abdeckung" (and the table says "Stratum-Detail"). While technically accurate, a Verwaltungs-Mitarbeiter:in or Bürgermeister:in without statistical training might stumble over "Stratum".</description>
  <fix>Consider replacing "Stratum" with a more accessible German term like "Gruppe" or "Merkmalskombination" in the primary UI facing the users (e.g. "Gruppen-Abdeckung").</fix>
</finding>

</findings>

<question_answers>
<answer id="1" verdict="usable">
  The flow is clearly structured in numbered steps (1. Upload, 2. Axes, 3. Size/Seed, 4. Result). The only awkwardness is that the "Ziehen" button (`Stage1Panel.tsx:348`) is positioned below the pre-run preview (`Stage1Panel.tsx:313`), which could push it off-screen on smaller monitors or if many axes are selected. Otherwise, it is highly explainable.
</answer>
<answer id="2" verdict="usable">
  The preview (`Stage1Panel.tsx:316-335`) surfaces exactly what is needed: the total target, zero-allocation warnings, and underfill warnings in plain language. The warning "Sind das Strata, die bewusst leer bleiben sollen, oder zu viele/zu feine Achsen?" is particularly helpful for prompting discussion before running.
</answer>
<answer id="3" verdict="awkward">
  The hierarchy is good (summary -> warnings -> breakdowns -> detail table). However, the terminology "Stratum-Abdeckung" in the summary card (`Stage1Panel.tsx:389`) is academic jargon that might confuse non-statisticians. Changing it to "Gruppen-Abdeckung" would be clearer.
</answer>
<answer id="4" verdict="usable">
  The SVG bar charts in `AxisBreakdown.tsx` (lines 50-84) are very understandable. Side-by-side proportional scaling is an excellent choice for Soll vs Ist. The text labels explicitly spell out the numbers, avoiding the need for a complex legend or hover tooltips. Color contrast (grey/blue) is safe.
</answer>
<answer id="5" verdict="usable">
  The redundancy is helpful. The top card (`Stage1Panel.tsx:406`) gives a quick at-a-glance metric, while the detailed list (`Stage1Panel.tsx:434`) explains the *why* and the *actionable consequence* ("wurden alle verfügbaren Personen angeschrieben"). This directly helps the group understand the impact of underfills.
</answer>
<answer id="6" verdict="usable">
  The exports are well thought out (`Stage1Panel.tsx:525-555`). The filenames are sensible and include the seed for traceability. The Markdown report (`packages/core/src/stage1/reporting.ts:150`) is comprehensive and includes all parameters, marginals, and digital signatures while correctly omitting PII.
</answer>
<answer id="7" verdict="awkward">
  The print stylesheet (`index.css:10-38`) successfully strips the interactive elements and forces the strata table open, which is great. However, it fails to add a physical signature block (e.g., lines for Mayor/Clerk to sign), which is usually a hard requirement for official municipal paper protocols.
</answer>
<answer id="8" verdict="usable">
  The seed hint (`Stage1Panel.tsx:294-302`) is excellently phrased. It avoids legalese and gives practical examples ("Lottozahlen, Datum, Würfelwurf") while explaining the anti-manipulation rationale in a way that city clerks will immediately understand and appreciate.
</answer>
<answer id="9" verdict="blocking">
  There is a major accessibility blocker regarding form inputs. The labels for "Stichprobengröße N" and "Seed" (`Stage1Panel.tsx:259, 273`) lack a `for` attribute and do not wrap the inputs. Screen readers will not announce what these inputs are for, blocking visually impaired users from interacting with step 3.
</answer>
<answer id="10" verdict="usable">
  Error paths are well handled. Uploading a bad CSV surfaces an error below the upload (`Stage1Panel.tsx:219`). Setting N larger than the pool throws a clear error caught by the preview memo and displayed inline (`Stage1Panel.tsx:307`), disabling the run button.
</answer>
<answer id="11" verdict="usable">
  The BMG §46 hint (`Stage1Panel.tsx:226`) provides excellent, context-specific self-explanation. It explicitly clarifies *why* only certain fields are available in Stage 1 (Melderegister) vs Stage 3 (Selbstauskunft), bridging the conceptual gap perfectly without needing external docs.
</answer>
<answer id="12" verdict="usable">
  The visual patterns are highly consistent. Both `Stage1Panel.tsx` and `RunPanel.tsx` use the same Tailwind utility classes for cards, borders, and tables (`bg-slate-50`, tabular nums, etc.). Moving from Stage 3 to Stage 1 feels coherent and native to the same application.
</answer>
</question_answers>

<strengths>
<strength>The "Soll vs Ist" side-by-side SVG bar charts (`AxisBreakdown.tsx`) are an elegant, lightweight, and highly readable way to present the marginals without relying on heavy chart libraries, ensuring fast render times and perfect printability.</strength>
<strength>The contextual BMG §46 hint (`Stage1Panel.tsx:226`) perfectly anticipates user confusion about missing demographic columns (like education) and provides the exact legal rationale.</strength>
<strength>The Seed Hint (`Stage1Panel.tsx:294`) explains the mathematical concept of determinism in entirely practical, process-oriented language ("gemeinsam in der Verfahrens-Sitzung ... Würfelwurf").</strength>
</strengths>

<verdict value="warn" critical="0" high="1" medium="2">
  <summary>The UX is largely excellent and well-tailored to the municipal group-meeting context. The side-by-side previews, practical hints, and clear export options make the process transparent. However, the missing form labels present a significant accessibility issue, and the lack of a physical signature line on the print protocol might cause friction in official settings. With those fixed, this is ready to ship.</summary>
</verdict>

</review>
