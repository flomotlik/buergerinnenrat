---
review_of: stage-1-stratified-sampling-algorithm-conceptual-fit
review_type: topic
review_mode: topic
review_topic: Stage 1 stratified sampling algorithm conceptual fit
reviewed_at: 2026-04-26T09-28-18Z
tool: gemini
model: gemini-3.1-pro-preview
duration_seconds: 193
---

<review>

<findings>

<finding severity="critical" id="C1">
  <title>32-bit PRNG state space limits sample support</title>
  <location>packages/core/src/pool/mulberry32.ts and docs/stage1-algorithm.md</location>
  <description>Mulberry32 has a 32-bit state space, which can only produce ~4.29 billion distinct sequences. Selecting 300 people from 6,000 has roughly 10^400 possible combinations. The Mulberry32 RNG restricts the possible outcomes so severely that the vast majority of mathematically valid representative samples have a 0% probability of ever being drawn. This violates the foundational definition of a random sample.</description>
  <fix>Switch to a PRNG with at least a 128-bit state space (e.g., PCG64, ChaCha20, or AES-CTR based RNG) seeded with a cryptographically secure 128-bit or 256-bit seed. (Reference: standard PRNG literature, e.g., Knuth, The Art of Computer Programming, Vol. 2 on Fisher-Yates state space requirements).</fix>
</finding>

<finding severity="high" id="H1">
  <title>Audit payload is unverifiable by the public due to GDPR</title>
  <location>docs/stage1-algorithm.md (Schritt 7 - Audit output)</location>
  <description>The audit JSON relies on verifying the SHA256 hash of the input CSV to guarantee reproducibility. However, the input CSV contains raw Melderegister data (names and addresses), which cannot be published under the GDPR. Consequently, the public can never obtain the source file to verify the hash or re-run the algorithm, rendering the audit JSON unverifiable.</description>
  <fix>Include an anonymized mapping in the audit JSON (e.g., an array of stratum keys for each row index) so the public can verify the stratification sizes and the drawn indices without needing the PII-laden CSV.</fix>
</finding>

<finding severity="medium" id="M1">
  <title>localeCompare introduces platform-dependent determinism failure</title>
  <location>packages/core/src/stage1/stratify.ts:117</location>
  <description>The TypeScript implementation sorts stratum keys using String.prototype.localeCompare, which is locale- and engine-dependent. This breaks the determinism contract between the TS and Python implementations for non-ASCII characters (e.g., German umlauts), which is acknowledged in the docs but left unfixed.</description>
  <fix>Replace a.localeCompare(b) with a strict Unicode code point comparison in TypeScript (e.g., a &lt; b ? -1 : a &gt; b ? 1 : 0) to guarantee byte-identical sorting with Python's sorted().</fix>
</finding>

</findings>

<question_answers>
<answer id="1" verdict="defensible">
  Proportional stratified random sampling is the correct and established method for Stage 1 (invitation) sampling. It ensures that the initial pool sent to Stage 2 reflects the demographic distribution of the population on available BMG §46 axes. More complex methods like balanced sampling are unnecessary here because the strata are sufficiently large and the constraints are strictly marginal/cross-product (Cochran, *Sampling Techniques*, Ch. 5).
</answer>
<answer id="2" verdict="defensible">
  Hamilton (Largest-Remainder) is defensible. While it is susceptible to the Alabama paradox, it guarantees that the sum of allocations exactly equals the target N. Since the target N is fixed per run for an invitation list, the paradox does not manifest in practice.
</answer>
<answer id="3" verdict="defensible">
  Neyman allocation minimizes variance for estimating a population mean by allocating more sample size to strata with higher variance. Citizen assemblies are deliberative bodies, not statistical surveys estimating a single scalar parameter. Proportional allocation is the correct methodological choice for ensuring a miniature of the population (Cochran, *Sampling Techniques*, Ch. 5.5).
</answer>
<answer id="4" verdict="wrong">
  Mulberry32 has a 32-bit state space, producing at most 2^32 distinct random sequences. For selecting 300 out of 6,000, there are roughly 10^400 possible samples. A 32-bit PRNG cannot cover this space, meaning the vast majority of valid samples have a 0% probability of being selected. A PRNG with a much larger state space (e.g., ChaCha20) must be used for large pool shuffles.
</answer>
<answer id="5" verdict="defensible">
  Not redistributing underfilled strata is methodologically sound for Stage 1. If a stratum is exhausted, giving its slot to another stratum would intentionally over-represent the other stratum in the mail-out phase. Missing a few invitations out of 300 does not materially harm the process, especially given low response rates.
</answer>
<answer id="6" verdict="questionable">
  Sharing a single RNG across all strata means that a change in the size of Stratum A alters the number of RNG calls and completely reshuffles all subsequent strata. A more robust design for stability against minor pool mutations would be to seed each stratum's PRNG independently using a hash of the master seed and the stratum key.
</answer>
<answer id="7" verdict="defensible">
  For Stage 1, single-stage cross-product strata are sufficient. The BMG §46 variables are limited (typically age, gender, district). Iterative Proportional Fitting (IPF) is necessary for Stage 3 where self-disclosed variables create too many sparse cross-product cells, but for Stage 1, marginal proportional allocation per cell is standard.
</answer>
<answer id="8" verdict="questionable">
  The statistical validation proves that the Fisher-Yates shuffle implementation is unbiased *conditional on the limited 32-bit state space*. However, testing with 2,000 trials cannot detect the state space exhaustion of a 32-bit PRNG. The claim "algorithm appears unbiased" overclaims because it ignores the structural impossibility of reaching most samples.
</answer>
<answer id="9" verdict="wrong">
  The audit design relies on the `input-CSV-SHA256`. Because the input CSV contains PII from the Melderegister, it cannot be published under the GDPR (as noted in the legal framework research). Therefore, the public can never obtain the source file to verify the hash or re-run the algorithm, rendering the audit unverifiable by anyone except the data controller.
</answer>
<answer id="10" verdict="defensible">
  For Stage 1, there is no single mandated open-source tool. Custom scripts or standard statistical packages (`R sampling::strata`) are common. The methodology aligns with general statistical practice for proportional stratified sampling. The Leximin algorithm (Sortition Foundation) is designed for Stage 3, not Stage 1.
</answer>
</question_answers>

<strengths>
<strength>The comprehensive deterministic testing across Python and TypeScript implementations ensures exact reproducibility given the same inputs.</strength>
<strength>The separation of concerns between Stage 1 (BMG §46 limited data) and Stage 3 (self-disclosed data via Leximin) correctly maps to DACH legal frameworks (BMG and DSGVO).</strength>
</strengths>

<external_sources_consulted>
<source>Cochran, W. G. (1977). Sampling Techniques (3rd ed.). Chapter 5: Stratified Random Sampling.</source>
<source>Knuth, D. E. The Art of Computer Programming, Vol. 2 (Fisher-Yates and PRNG state space requirements).</source>
</external_sources_consulted>

<verdict value="fail" critical="1" high="1" medium="1">
  <summary>While the conceptual choice of proportional stratified sampling is correct for Stage 1, the implementation contains a critical mathematical flaw (32-bit PRNG state space exhaustion) and a high-severity conceptual flaw regarding GDPR and auditability. The algorithm cannot be approved for public sector use until a cryptographic PRNG is used and the audit log is decoupled from PII.</summary>
  <blockers>
    <blocker>Mulberry32 PRNG limits the sample space to 2^32, failing to support the majority of possible valid samples for N=6000.</blocker>
    <blocker>Audit verification relies on a CSV hash that cannot be published due to GDPR, defeating the purpose of a public audit.</blocker>
  </blockers>
</verdict>

</review>

