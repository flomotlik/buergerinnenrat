---
review_of: stage-1-stratified-sampling-algorithm-conceptual-fit
review_type: topic
review_mode: topic
review_topic: Stage 1 stratified sampling algorithm conceptual fit
reviewed_at: 2026-04-26T09-19-55Z
tool: claude
model: claude-opus-4-7
duration_seconds: 450
---

# Stage 1 — Conceptual / Methodological Algorithm Review

Scope: is the chosen algorithm (proportional stratified random sampling +
Hamilton allocation + Mulberry32-driven Fisher-Yates + lex stratum order +
no-redistribution-on-underfill + signed JSON audit) the right method for
selecting a Versand-Liste for German/Austrian Bürgerräte? This is **not** a
bug review.

<review>

<findings>

<finding severity="high" id="H1">
  <title>Seed-grinding attack is unaddressed; PRNG choice is the wrong layer to fix it</title>
  <location>packages/core/src/stage1/stratify.ts:144-145; packages/core/src/stage1/types.ts:51-52,60</location>
  <description>
The seed is supplied by the user (or `unix-time-default`), and the entire
output is a deterministic function of `(rows, axes, targetN, seed)` per
`docs/stage1-algorithm.md:14-100`. With a deterministic PRNG and a user-chosen
seed, an actor with the input CSV can enumerate seeds offline, score each
draw against any private preference (e.g. "how many of my preferred persons
are in the Versand-Liste"), and publish the most favorable seed in the audit
JSON. The audit's `seed_source: 'user' | 'unix-time-default'` (types.ts:51)
records that the seed was operator-chosen but does not exclude this attack —
the audit only proves the published draw is reproducible, not that the seed
was unmanipulated. Mulberry32's 32-bit state (`packages/core/src/pool/mulberry32.ts:8-19`)
makes brute search trivial (~minutes on a laptop for 4·10⁹ seeds against
a 6.000-row pool), but the issue persists with any PRNG when the seed is
chosen by an interested party. This is the dominant integrity risk in
sortition; Procaccia/Flanigan-aligned practice and Sortition Foundation's
public draws use witnessed dice or public-randomness beacons precisely to
prevent this (Sortition Foundation "How": <https://www.sortitionfoundation.org/how>;
NIST Randomness Beacon: <https://csrc.nist.gov/projects/interoperable-randomness-beacons>;
drand: <https://drand.love/>). The current spec offers no mitigation.
  </description>
  <fix>
Mandate (or at minimum support) a public, post-hoc-uncontrollable seed
source. Concrete options, in increasing order of operational complexity:
(a) Bind the seed to a future public randomness beacon round (drand round
ID + beacon value, NIST Beacon pulse ID + output). (b) Bind the seed to a
public Bitcoin or Ethereum block hash from a block whose height is fixed
in advance — same idea as the original `panelot` lottery design. (c)
Multi-party commit-reveal (operator and at least one independent witness
each commit a 32-byte value beforehand, the seed is `H(values)`).
The audit JSON should be extended with `seed_source: 'beacon' | 'block-hash'
| 'commit-reveal' | 'user' | 'unix-time-default'` and the beacon-round /
block-hash / commit identifiers, and the verification UI should refuse
`'user'` for any draw declared as legally binding. Reference for citizen
assembly practice using public randomness: Flanigan, Gölz, Gupta, Hennig,
Procaccia (Nature 2021), Methods §"Public lottery"
<https://www.nature.com/articles/s41586-021-03788-6>.
  </fix>
</finding>

<finding severity="high" id="H2">
  <title>Locale-sensitive `localeCompare` for stratum-key ordering and tie-breaking is a latent cross-runtime drift on real Melderegister data</title>
  <location>packages/core/src/stage1/stratify.ts:83 (Hamilton tie-break) and :138 (main stratum sort); contrast with scripts/stage1_reference.py:104,143 which use Python codepoint sort</location>
  <description>
Both the +1 bonus tie-break in `largestRemainderAllocation` and the master
stratum-key sort use TypeScript `String.prototype.localeCompare(b)` with no
explicit locale. The default locale of `localeCompare` is the host
environment's locale (`Intl.Collator` default), which differs between
browsers, Node runtimes, and OSes. The Python reference uses `sorted()`
which is Unicode-codepoint order. For ASCII-only axis values the two
agree, which is why the 20-setup byte-identity test passes
(`docs/stage1-validation-report.md:13-30`). However, real BMG §46 inputs
will contain Bezirksnamen with `ä`, `ö`, `ü`, `ß` ("Mödling", "Pößneck",
"Hörnle"). On those inputs (a) two browsers will disagree about stratum
order, hence about the +1 bonus assignment in Hamilton tie-breaks, hence
about the entire downstream RNG trajectory; (b) the TS draw will not match
the Python reference; (c) the audit will not be reproducible across
browsers / OS locales. The algorithm doc itself flags this as "Bekannte
Limitation" (`docs/stage1-algorithm.md:39, 137`), but the spec is shipped
without a fix, and the Validation report explicitly excludes it from the
audit guarantees (`stage1-validation-report.md:53,60`). For a tool
positioned for kommunale Verwaltung use with German address data, this is
a high-likelihood, audit-breaking defect.
  </description>
  <fix>
Replace both `localeCompare` calls with codepoint-order string comparison
(e.g. `a < b ? -1 : a > b ? 1 : 0`) so TS and Python agree
byte-for-byte on any UTF-8 input, then add a fixture that exercises
`ä/ö/ü/ß/é` in a Bezirk axis to the cross-validate harness
(`scripts/stage1_cross_validate.sh`). Document the canonical ordering as
"UTF-8 codepoint order on the canonical JSON encoding of the
`[[axis, value], ...]` pairs" in the audit schema. Codepoint order is
deterministic and language-independent; locale-aware order is
neither.
  </fix>
</finding>

<finding severity="high" id="H3">
  <title>"Cross-validation" between TS and Python is transcription, not independent verification</title>
  <location>scripts/stage1_reference.py:1-15 (header comment), 42-115 (mirrors stratify.ts line-for-line); docs/stage1-validation-report.md:24-30</location>
  <description>
The Python reference's docstring states explicitly that it "Mirrors the
TypeScript implementation in `packages/core/src/stage1/stratify.ts`
bit-for-bit" and the Python code is a direct transliteration: same
function names, same loop direction (`for i in range(len-1, 0, -1)`),
same Mulberry32 (imported from `generate_pool.py`), same JSON-stringify
key shape with the same separators, same Hamilton tie-break tuple. The
20-setup byte-identity test therefore demonstrates only that the two
artifacts of the same design are consistent — it does **not** demonstrate
that the design itself implements proportional stratified sampling
correctly. The validation report acknowledges this in §"Was die Tests
**nicht** ausschließen" (`stage1-validation-report.md:56-58`): an
algorithm-design defect shared by both implementations is invisible to
this harness. This is fine as a regression guard but should not be sold
as evidence of correctness; the README/findings describe it as
"unbiased, validated" (`docs/stage1-algorithm.md:122-126`,
`stage1-validation-report.md:7-10`) which overstates the evidential
weight. A genuinely independent cross-check would compare against a
third-party implementation: R `sampling::strata` (per-stratum SRS without
replacement, <https://cran.r-project.org/web/packages/sampling/sampling.pdf>),
SciPy / NumPy `default_rng().choice(replace=False)` per group, or
`pandas.DataFrame.groupby(axes, sort=True).sample(...)`. The validation
report flags these as "Nächste Validierungs-Schritte" but does not
include them as run today.
  </description>
  <fix>
Add a third validation harness against a non-derivative reference. The
cheapest credible option: a NumPy script that for the same `(rows, axes,
targetN)` (a) computes Hamilton allocation independently using
`numpy`-only arithmetic, (b) draws each stratum with
`numpy.random.default_rng(seed_h).choice(indices, size=n_h, replace=False)`
where `seed_h = H(master_seed, stratum_key)`, then verifies that the
**stratum-level inclusion frequencies** (not individual indices, since
the RNGs differ) match the implementation under test within Bonferroni-
corrected χ² bounds over many trials. This rules out shared design
defects in the Hamilton allocation and in the per-stratum uniform-without-
replacement step without requiring byte-identity. Reword the validation
report to distinguish "consistency check (TS↔Python)" from "correctness
check (independent reference)".
  </fix>
</finding>

<finding severity="medium" id="M1">
  <title>Single shared RNG across strata creates input-sensitivity ripple; per-stratum keyed PRNG would be strictly better</title>
  <location>packages/core/src/stage1/stratify.ts:144-171</location>
  <description>
Lex iteration with a single `Mulberry32(seed)` instance means the RNG
state at stratum k depends on the cumulative draw history of strata 0..k-1.
If a single row in stratum 0 changes (e.g. one extra rural Bezirk member,
one row corrected after a CSV reupload), the entire downstream draw
re-rolls. This is the documented behavior — the algorithm doc calls it a
"determinism contract" (`stage1-algorithm.md:99-100`) — but it is the
*weaker* form of determinism. The stronger form, used in many
audit-grade sampling tools, is per-stratum independence:
`rng_h = Mulberry32(H(master_seed || stratum_key))`. Properties this
gains: (a) "what-if" analysis is local — a Bezirk fixing a typo only
re-rolls that one Bezirk, not the whole panel; (b) the RNG trajectory is
not implicitly tied to the iteration order of empty/non-empty strata,
which removes a class of subtle audit reproducibility traps; (c) parallel
draw across strata becomes trivially possible (irrelevant at 6.000 rows,
but defensive). The current design is defensible (Sortition Foundation's
legacy `find_random_sample_legacy` also uses one shared RNG), but it is a
weaker choice and worth a one-paragraph justification in the doc.
  </description>
  <fix>
Either (a) document explicitly why ripple-on-input is acceptable for
Stage 1 (e.g. "we treat the input CSV as immutable per draw; corrected
inputs require a fresh seed and a new audit, by policy"), or (b) switch
to per-stratum keyed PRNG using `H(master_seed_bytes || stratum_key_utf8)`
truncated to 32 bits as the Mulberry32 seed. Option (b) is a few lines of
code and removes a class of foot-guns at no cost.
  </fix>
</finding>

<finding severity="medium" id="M2">
  <title>Mulberry32's 32-bit seed space is too small for the audit story</title>
  <location>packages/core/src/pool/mulberry32.ts:7-25; packages/core/src/stage1/types.ts:20</location>
  <description>
`Mulberry32` has 2³² ≈ 4.29·10⁹ possible states. `StratifyOpts.seed` is
typed as a generic JS `number` (types.ts:20) but is normalized to uint32
on entry to the PRNG (`mulberry32.ts:11` `seed >>> 0`). Two consequences:
(a) the *effective* seed space, regardless of what the user types or what
the audit field shows, is 32 bits — anyone can enumerate it; (b) different
JS numbers map to the same effective seed (`seed=1` and `seed=4294967297`
produce identical draws), which is a confusing audit property. For a
non-adversarial reproducibility story, 32 bits is fine. For sortition,
where the audit is the legitimacy artifact, the small seed space combines
poorly with H1 (user-chosen seed): even a half-motivated operator can
grind 2³² seeds in minutes. Note that this concern is largely subsumed by
H1 (public randomness fixes both); but if the team chooses not to adopt a
public-randomness solution, at minimum upgrade to a wider PRNG and
seed-space.
  </description>
  <fix>
If H1 is addressed (public randomness beacon), this becomes irrelevant —
keep Mulberry32 for its determinism and small footprint. If H1 is not
addressed, replace Mulberry32 with a 128- or 256-bit PRNG (PCG-XSL-RR-128,
xoshiro256**, or `crypto.subtle`-derived stream-cipher PRNG) and widen the
seed type so brute search becomes infeasible. Document precisely how a
string seed is canonicalized to bytes (UTF-8? padded? hashed?) — the
audit must round-trip the seed as displayed.
  </fix>
</finding>

<finding severity="medium" id="M3">
  <title>The 2000-trial uniformity test interprets max |z|=3.72 informally; with 946 hypotheses the multiplicity correction should be stated</title>
  <location>scripts/stage1_statistical_test.py:96-132; docs/stage1-validation-report.md:38-45</location>
  <description>
The test computes one z-score per person (n=946 with p>0) and reports
max |z|=3.72 against a hard 4-sigma envelope. Under H₀ (uniform
inclusion) and approximate independence, P(|Z|>3.72) ≈ 2.0·10⁻⁴ for a
single test. The expected number of |z|>3.72 violations across 946
roughly-independent tests is ≈ 0.19, and P(any |z|>3.72) ≈ 0.17 (from
1 − (1 − 2·10⁻⁴)⁹⁴⁶). So observing exactly one z=3.72 is *consistent
with H₀*, but it is *not* "very strong evidence of unbiasedness" — at
this sample size and multiplicity, the test would fail to detect biases
of order 1–3 percentage points per person. The validation report's
framing ("Kein Hinweis auf systematischen Bias",
`stage1-validation-report.md:45`) is correct in the absence-of-evidence
sense but should be paired with the *power* of the test (what bias
magnitude this 2000-trial run would detect with 80 % power). Also, the
"theoretical p" for each person is computed from a single Hamilton
allocation on the same pool (test_test.py:69-83), so the test is
exclusively testing the within-stratum draw uniformity, not the
allocation. That is fine, but should be said explicitly. Additionally,
the test runs on a *single* pool (kleinstadt-bezirkshauptort, seed=42,
size=1000, tightness=0.7); biases conditioned on extreme pool shapes
(e.g. very tight Hamilton fractional remainders, or very small minimum
strata) would not be exercised.
  </description>
  <fix>
Extend the test in three small ways: (a) state the detectable-bias bound
for the chosen N_TRIALS, e.g. "with 2000 trials and p≈0.10, |bias| ≥ 0.027
is detected at 80 % power" — this transforms a "no-evidence" claim into a
"bias bound" claim; (b) sweep at least 3-5 pool shapes (uniform strata,
extreme imbalance with one stratum holding 50 % of the population, all
strata size ≤ 5, etc.) and report max |z| per shape; (c) clarify in the
validation report that the test verifies *within-stratum* uniformity given
Hamilton allocation, not Hamilton allocation itself.
  </fix>
</finding>

<finding severity="medium" id="M4">
  <title>Audit JSON does not include algorithm version or canonical-ordering / tie-break rules; future replays could silently diverge</title>
  <location>packages/core/src/stage1/types.ts:53-86</location>
  <description>
`Stage1AuditDoc` has `schema_version: '0.1'` (types.ts:55) but no
`algorithm_version`, no record of the Hamilton tie-break order used, no
record of the stratum-key encoding format (canonical JSON of `[axis,
value]` pairs), and no record of the canonical sort order (codepoint
vs. localeCompare; see H2). A verifier in 2028 with a checked-in
`schema_version=0.1` will not know whether to use the original
tie-break-order ("larger remainder, then larger N_h, then lex-smaller
key" per `stratify.ts:75-83`) or some replacement. If the algorithm is
revised (e.g. switch to per-stratum keyed RNG per M1), the schema bump
must be coordinated — but today there's no field for that
coordination. The audit also stores `axes` as the array of column names
but does not record which axis values were observed in the input or the
stratum-key strings themselves; a verifier rebuilds these from `strata[].key`,
which works, but the canonical ordering invariant is not asserted in the
JSON.
  </description>
  <fix>
Add to the audit doc, at minimum: `algorithm_version: 'stage1@1.0.0'`,
`prng: 'mulberry32'` (or whatever, if M2 is taken),
`key_encoding: 'json-compact-pairs'`, `key_sort: 'utf8-codepoint'`,
`allocation_method: 'largest-remainder-hamilton'`,
`tie_break: 'remainder-desc, n_h-desc, key-asc'`. With these fields, a
schema-aware verifier can refuse audits whose method labels do not match
the verifier's known set, instead of silently producing a different
answer. The fields can be enums to keep the audit small.
  </fix>
</finding>

<finding severity="low" id="L1">
  <title>"Hamilton standard in DACH amtliche Statistik" is unsourced</title>
  <location>docs/stage1-algorithm.md:77</location>
  <description>
The doc justifies Hamilton over Sainte-Laguë by saying it is the "DACH-
Standard-Praxis in der amtlichen Statistik". This is plausibly true for
electoral / parliamentary apportionment (Hamilton was used in BRD
Bundestag pre-2008), but for sample-allocation across strata in stratified
sampling, the relevant authority is Cochran, *Sampling Techniques* §5.5,
which presents proportional allocation with floor + largest-remainder as
the textbook method without singling out Hamilton by name (Cochran 3rd ed.,
1977, §5.5). Sainte-Laguë is rarely discussed in the sampling literature
at all — that debate is electoral. The current justification cites neither
a sampling textbook nor a Statistisches Bundesamt / Statistik Austria
methodology document. For a project that will be reviewed publicly, the
unsourced claim invites pushback that the spec doesn't deserve.
  </description>
  <fix>
Replace the line with: "Largest-remainder allocation is the standard
proportional-allocation method for stratified sampling (Cochran,
*Sampling Techniques* 3rd ed. §5.5; Lohr, *Sampling: Design and Analysis*
3rd ed. §3.3). Sainte-Laguë and d'Hondt are divisor methods designed for
seat apportionment, where their bias toward larger or smaller parties is
the deliberate design goal; they are not standard for proportional
sample allocation." This is a one-line documentation fix; the choice
itself is correct.
  </fix>
</finding>

<finding severity="low" id="L2">
  <title>Empty-stratum-does-not-advance-RNG rule is brittle relative to a "shuffle whole pool" alternative</title>
  <location>packages/core/src/stage1/stratify.ts:165-171</location>
  <description>
The current convention — only call `shuffleInPlace` when `nh_actual > 0` —
ties the RNG trajectory to which strata are non-empty. This is fine and
documented, but makes the RNG trajectory implicitly depend on Hamilton
having allocated zero to that stratum, which itself depends on the
target_n / pool fractions. A subtle consequence: if Hamilton ever
upgrades from "floor + largest remainder" to a method that assigns a
non-zero allocation to every non-empty stratum (e.g. minimum guarantee
of 1 per stratum), the RNG trajectory across all subsequent strata
shifts, even though the upstream change is logically unrelated. With
per-stratum keyed RNG (M1), this brittleness disappears.
  </description>
</finding>

<finding severity="low" id="L3">
  <title>Algorithm accepts any axis names; no enforcement that axes are within BMG §46-allowed set</title>
  <location>packages/core/src/stage1/stratify.ts:13-18, packages/core/src/stage1/types.ts:14-21</location>
  <description>
`StratifyOpts.axes` is `string[]` and the algorithm happily stratifies on
whatever column names it gets, including `migration_background` or
`education` which are explicitly not BMG §46-permissible at Stage 1
(`research/03-legal-framework-and-best-practices.md:59`,
`sortition-tool/07-two-stage-workflow-analysis.md:50`). This is a
UI/legal-layer concern, not strictly an algorithm-correctness one — but
the audit document also records the axes verbatim without flagging
out-of-§46 fields. A reviewer who checks the audit retrospectively will
have to know the §46 catalog by heart. Suggest a soft validation /
warning at the audit-build layer that lists each axis with a flag
"BMG §46 katalog: ja/nein/unbekannt".
  </description>
</finding>

</findings>

<question_answers>

<answer id="1" verdict="defensible">
Proportional stratified random sampling on 1–3 BMG §46 axes is the
correct method for this use case. Stage 1 is *invitation drawing*, not
parameter estimation; the goal is descriptive demographic representation
across the small number of legally available axes (Bezirk, Alter,
Geschlecht, Staatsangehörigkeit; `research/03-legal-framework-and-best-practices.md:59`).
Cluster sampling (sampling whole districts) would *destroy* district
representativeness — wrong for the use case. Multi-stage sampling
(e.g. PSU = Bezirk, SSU = households) is unnecessary at the population
sizes involved (6.000–20.000 voters; cf. `sortition-tool/08-product-redesign.md:24-25`)
and adds complexity without representativeness benefit. Systematic
sampling within strata would change nothing observable for this audience
(neither persons nor sample frame are ordered along anything that
matters). Cube-method balanced sampling (Deville & Tillé 2004,
<https://academic.oup.com/biomet/article-abstract/91/4/893/259054>) is
designed for survey-estimate efficiency on continuous auxiliary
variables — it is overkill for invitation drawing on 2–4 categorical
axes and would add a non-trivial dependency without solving any user-
visible problem. Sortition Foundation's Stage-1 ("first stage")
methodology is plain stratified random sampling, see
<https://www.sortitionfoundation.org/how>. The OECD playbook
*Innovative Citizen Participation and New Democratic Institutions*
(2020) Chapter 4 names stratified random sampling as the standard.
Choice is right.
</answer>

<answer id="2" verdict="defensible">
Hamilton (largest-remainder) is correct for sample allocation. The
common objection — Alabama paradox / population paradox — applies when
seats can be added or removed and a stratum's allocation can decrease
despite its share growing. In our setting, target_N is fixed per draw
and Hamilton is run once, so the paradoxes don't manifest. Sainte-Laguë
and d'Hondt are *electoral* divisor methods chosen for their bias
properties (Sainte-Laguë: roughly unbiased seat-share; d'Hondt: small
bias toward larger lists; Adams: bias toward smaller). For
*sample* allocation those biases are not features. Cochran §5.5
presents proportional allocation as quota = N · N_h/N_total with
ad-hoc rounding; "largest remainder" is the canonical rounder
(Lohr, *Sampling*, 3rd ed. §3.3). For a tiny stratum of 12 in a 6.000-
person pool drawing 300, the quota is ≈ 0.6, so it gets 0 or 1 by
Hamilton — at most ±1 either way under any method. Stratum underfill
(stratum has 12, Hamilton allocates 1, draw 1) is not a
method-choice issue. **Defensible.** Wording in the doc that calls
this "DACH-Standard-Praxis in der amtlichen Statistik" is unsourced —
see L1.
</answer>

<answer id="3" verdict="defensible">
Neyman allocation minimizes variance of an estimator
$\bar{Y}_{st} = \sum (N_h/N) \bar{y}_h$ when stratum-level standard
deviations of the estimator-target variable Y are known (Cochran §5.5;
Lohr §3.4). Citizen-assembly invitation has no estimator; the goal is a
representative *sample composition*. Neyman would over-allocate to
strata with high within-stratum demographic variance, producing a
list whose marginal distribution by stratum *deviates* from the
population — the opposite of what the user wants. For *post-Stage-1*
inference (e.g. a survey on respondents), Neyman would matter. For
the invitation draw itself it does not. **Defensible to reject.**
</answer>

<answer id="4" verdict="questionable">
The PRNG choice (Mulberry32) is *adequate* for determinism but is
not the right place to ask the legitimacy question. Two layered
issues:
(i) **Seed source.** A user-chosen seed plus any deterministic PRNG
admits seed-grinding (try N seeds offline, publish the favored
one). With Mulberry32's 2³² seed space this attack is trivially
fast; with a 256-bit CSPRNG it is infeasible by brute force, but
*still trivial* if the operator wants to grind ~10⁶ seeds for a small
preference. The fix is a public, post-hoc-uncontrollable seed source
(public-randomness beacon round, blockchain block hash, multi-party
commit-reveal). This is finding **H1**.
(ii) **PRNG state size.** Mulberry32's 32-bit state caps reachable
draws at 2³² distinct outputs across the whole pipeline. For a 6.000-
row Stage-1 draw this is fine *numerically* (we need ≪ 2³² random
numbers), but the small seed space amplifies (i). See **M2**.
"The seed is in the audit, anyone can reproduce" addresses
*reproducibility*, not *legitimacy*. Sortition Foundation public draws
use witnessed dice; Flanigan/Gölz/Procaccia 2021 use public lotteries
in deployments. The current spec offers neither. **Questionable** —
not because Mulberry32 is wrong, but because the seed-source policy is
absent.
</answer>

<answer id="5" verdict="defensible">
For Stage 1 (Versand-Liste / invitation drawing), no-redistribution-on-
underfill is the correct policy. Reasoning:
(i) The product context (`sortition-tool/08-product-redesign.md:20-25`)
is "draw N invitation addresses". Underfill in a tiny rural stratum
means we send slightly fewer than N invitations, which is visible to
the user and fixable manually (widen strata, draw additional). Silent
redistribution would *hide* the demographic-shortage signal that the
operator most needs to act on.
(ii) Redistribution would silently violate proportionality: the
"replacement" person comes from a stratum that already has its full
quota, so that stratum becomes over-represented. For Stage 3 panel
drawing where every slot is binding, Sortition Foundation
(`stratification-app`) applies redistribution because the panel
must be exactly the requested size — that is a different setting.
(iii) Stage 2 self-disclosure response will further dilute Stage 1
proportions anyway (the 11.5 % response rate of Bürgerrat Ernährung,
`research/03-legal-framework-and-best-practices.md` & Bundestag
methodology). Redistributing a tiny underfill at Stage 1 is
statistical noise relative to Stage-2 attrition.
**Defensible — and arguably superior to redistribute in this context.**
The warning string format
(`stratify.ts:160-162`) is appropriately loud.
</answer>

<answer id="6" verdict="defensible">
Lex stratum order with a single shared RNG is *defensible* but is the
weaker of the two reasonable designs. Both forms are deterministic;
both produce uniform draws within strata. Lex + shared RNG is the
status quo in many existing tools (Sortition Foundation legacy
sampler). The alternative — per-stratum RNG seeded by `H(master_seed,
stratum_key)` — has strictly better properties for input-sensitivity
and parallelizability (see **M1** and **L2**). Empty strata not
advancing the RNG is a sensible interpretation of "skip" but ties
the RNG trajectory to Hamilton-zero outcomes (L2). Neither convention
is *wrong*. The shared-RNG choice is acceptable for a tool of this
scope; the per-stratum design is what I would recommend on a fresh
write.
</answer>

<answer id="7" verdict="defensible">
For German Bürgerrat practice with 1–3 BMG §46 axes (typically Bezirk,
Alter, Geschlecht), single-stage cross-product proportional allocation
is sufficient. IPF / raking is needed when *multiple separately-
defined marginals must simultaneously match population values* and the
joint distribution is not directly observable in the frame. In Stage 1
the joint distribution **is** observable (it's the Melderegister
itself), so cross-product proportional allocation already achieves
exact marginal proportionality on every axis combination simultaneously.
IPF would matter at Stage 2/3 if quota corridors are defined on
marginals (e.g. 50 % female, 30 % education-low) and the Stage-3 input
pool is small enough that exact marginal hits become difficult; that
is the Maximin/Leximin job and is out of Stage-1 scope. The doc's
"Iteration-2-out-of-scope" framing
(`stage1-algorithm.md:139`) is correct. **Defensible.**
</answer>

<answer id="8" verdict="questionable">
The validation has three components; let me grade each.
(a) **20-setup byte-identity TS↔Python**: this is a regression /
consistency check between two artifacts of the same design. It is
*not* an independent reference. The Python file's header explicitly
states it mirrors the TS bit-for-bit (`stage1_reference.py:1-15`).
Any algorithm-design defect shared by both is invisible. The
validation report admits this (`stage1-validation-report.md:56-58`).
Marketing this as "validated" overstates what it shows. See **H3**.
(b) **2000-trial uniformity test**: methodologically sound — runs
2000 independent seeds, computes per-person inclusion frequency, z-
scores against Binomial(N_TRIALS, p). The "p" is computed from the
same Hamilton allocation that drove the draws — *that's not
circular*; Hamilton is deterministic per pool, so this just normalizes
per-person p to "given allocation, is the draw uniform-without-
replacement?". The test correctly isolates Fisher-Yates uniformity.
The interpretation of max |z|=3.72 over 946 hypotheses is informally
stated (`stage1-validation-report.md:45`) — under H₀ that's not
surprising (P(any > 3.72) ≈ 0.17), but the report should also state
what *bias magnitude* this run can detect with 80 % power. See **M3**.
(c) **Pool diversity**: only one pool (kleinstadt-bezirkshauptort,
size 1000, tightness 0.7). Bias modes triggered by extreme pool
shape (very small minimum strata, near-half fractional remainders)
are not exercised.
**Overall verdict: defensible methodology in (b), overstated framing
in (a), incomplete pool coverage in (c). The "unbiased" claim is
locally true for this pool but does not generalize without (M3) fixes.**
</answer>

<answer id="9" verdict="questionable">
The audit captures most of what's needed for *re-execution* — seed,
input CSV hash, axes, pool size, target N, per-stratum table,
warnings, signature (`packages/core/src/stage1/types.ts:53-86`). But
several items required for *durable* verification are missing:
(i) **Algorithm version**. No `algorithm_version` field. A verifier
running a different code revision can produce a different output for
the same audit and have no way to know they should have used the
historical version. See **M4**.
(ii) **Canonical ordering specification**. The audit does not assert
"stratum keys are sorted in UTF-8 codepoint order on the canonical
JSON encoding `[[axis, value], ...]`". It is the convention in the
code, but the schema doesn't enforce it; cf. **H2** (the code today
uses locale-sensitive `localeCompare`, which is *worse* than codepoint
order for cross-runtime reproducibility).
(iii) **Tie-break rule for Hamilton**. Not in the audit. If the team
ever changes "remainder-desc → N_h-desc → key-asc", old audits become
ambiguous.
(iv) **PRNG identifier**. Not in the audit. `prng: "mulberry32-v1"`
should be a field.
(v) **Per-stratum row-index lists**. Today only `selected[]` (sorted
by stratum then row) is present. A verifier wanting to confirm each
person's stratum membership must rebuild it from the input CSV. That's
fine, but the audit should record which axes were read from which CSV
columns.
(vi) **Seed-source provenance** (per **H1**). `seed_source: 'user' |
'unix-time-default'` is present but doesn't suffice for legitimacy —
extend with beacon / commit-reveal references.
**Sufficient for casual reproduction; insufficient for durable legal
audit.** See **M4** for the concrete fix.
</answer>

<answer id="10" verdict="defensible">
There is **no** widely-cited canonical Stage-1 reference implementation
specifically for citizen-assembly invitation drawing. Stage 1 is
sufficiently simple that established sampling stacks each provide it
in 2–5 lines:
- R `sampling::strata` (Tillé & Matei): `strata(data, stratanames,
  size, method="srswor")` —
  <https://cran.r-project.org/web/packages/sampling/sampling.pdf>
- Python `pandas.DataFrame.groupby(axes, sort=True).sample(n=...,
  random_state=...)` per stratum
- SciPy `scipy.stats.qmc` is for *quasi*-Monte-Carlo, which has no
  benefit for categorical-axis stratified sampling
- NumPy `numpy.random.default_rng(seed).choice(idx, size, replace=False)`
The Sortition Foundation `stratification-app`
(`research/05-sortition-algorithm.md`, GPL-3.0) focuses on Stage-3
panel selection (Maximin/Leximin); its Stage-1 logic is not exposed
as a separate module. The OECD *Innovative Citizen Participation*
playbook (2020) specifies *what* (stratified random sampling) but not
*how*. So there is no "you should be conforming to library X" — the
team's TS implementation is appropriate for the browser-only,
cross-language, deterministic-seeded constraints. The right reference
to *cite* is Cochran §5.5 (textbook authority). The right
*independent verification* is a parallel implementation in R
`sampling::strata` or NumPy as a third-party check (see **H3**).
**Defensible** to roll your own at this scope, with the caveat that an
independent third-party re-implementation should be added to the
validation harness.
</answer>

</question_answers>

<strengths>
<strength>The 5-step algorithm specification (`docs/stage1-algorithm.md:13-117`) is precise, includes pseudocode, edge cases, and rationale. It is the kind of spec a third party could re-implement without ambiguity *if* H2 (locale-sort) were fixed.</strength>
<strength>The bucketize → sort → allocate → shuffle pipeline (`packages/core/src/stage1/stratify.ts:119-194`) is small, linear, and easy to audit by reading. Single-file, ≈ 200 LoC.</strength>
<strength>Edge-case discipline is strong: `targetN > rows.length` throws, `targetN = 0` is handled, `axes = []` degenerates to SRS, underfill is warned not silenced. These are all the right calls (`stage1-algorithm.md:118-131`).</strength>
<strength>The no-redistribution-on-underfill policy is conceptually correct for Stage 1 invitation drawing and is the *opposite* of the wrong call I'd expect from a team that defaulted to copying Sortition Foundation's Stage-3 conventions. Documented reasoning at `stage1-algorithm.md:135-138`.</strength>
<strength>Hamilton allocation is the right method for sample allocation, with documented and reproducible tie-break order (`stratify.ts:75-90`). The choice is correct, even if the documentation rationale (L1) is unsourced.</strength>
<strength>Cross-language (TS/Python) byte-identity is a valuable *consistency* check even though it's not an *independence* check (H3) — it eliminates the most common drift-class (PRNG implementation, JSON canonicalization, sort key ordering for ASCII).</strength>
<strength>The validation report (`docs/stage1-validation-report.md`) is unusually honest about what the tests do and don't prove (`§"Was die Tests **nicht** ausschließen"`). That's how a serious team writes a validation document.</strength>
<strength>The audit JSON includes input-CSV-SHA256 (types.ts:60), which is the single most important integrity field. Many real-world sortition tools omit it.</strength>
</strengths>

<external_sources_consulted>
<source>Sortition Foundation, "How to run a Citizens' Assembly" — <https://www.sortitionfoundation.org/how> — for Stage 1 vs Stage 3 method comparison and for public-randomness practice</source>
<source>Flanigan, Gölz, Gupta, Hennig, Procaccia (Nature 2021) "Fair algorithms for selecting citizens' assemblies" — <https://www.nature.com/articles/s41586-021-03788-6> — for confirmation that Stage-3 is the Maximin/Leximin scope and that public lotteries are the canonical legitimacy mechanism</source>
<source>Cochran, *Sampling Techniques* 3rd ed. (1977) §5.5 (proportional allocation), §5.6 (Neyman allocation) — for textbook authority on allocation methods</source>
<source>Lohr, *Sampling: Design and Analysis* 3rd ed. (2019) §3.3, §3.4 — modern restatement of the same</source>
<source>NIST Randomness Beacon — <https://csrc.nist.gov/projects/interoperable-randomness-beacons> — for one option to address the seed-grinding finding (H1)</source>
<source>drand — <https://drand.love/> — for a second option (distributed randomness beacon)</source>
<source>R `sampling` package documentation — <https://cran.r-project.org/web/packages/sampling/sampling.pdf> — to confirm the canonical interface for stratified SRS without replacement and as a candidate independent reference (H3 fix)</source>
<source>Bundestag Methodikblatt Zufallsauswahl Bürgerrat Ernährung 2023 — <https://www.bundestag.de/resource/blob/954136/c5fd9f3234397c6482e5519b6a4b17a0/zufallsauswahl_pdf-data.pdf> — for German citizen-assembly Stage-1 practice and 11.5 % response rate</source>
<source>Bryc, "Mulberry32" — <https://github.com/bryc/code/blob/master/jshash/PRNGs.md#mulberry32> — for confirmation that Mulberry32 is a 32-bit-state non-cryptographic PRNG</source>
</external_sources_consulted>

<verdict value="warn" critical="0" high="3" medium="4" low="3">
  <summary>
The high-level algorithm choice (proportional stratified random sampling
with Hamilton allocation, Fisher-Yates per stratum, no-redistribution-on-
underfill, signed JSON audit) is the right method for German/Austrian
Bürgerrat invitation drawing on 1–3 BMG §46 axes. There is no critical
conceptual blocker — the team picked the textbook method (Cochran §5.5)
and applied it correctly. However, three high-severity concerns prevent
a clean pass: (H1) user-chosen seed without public-randomness mechanism
admits seed-grinding attacks, which is the dominant integrity risk in
sortition and is not addressed by any audit field today; (H2) the
cross-runtime sort uses TS `localeCompare` against Python codepoint
sort, which silently breaks on real Melderegister data containing ä/ö/ü/ß
and the spec ships with a "Bekannte Limitation" rather than a fix; (H3)
the cross-validation between TS and Python is bit-for-bit transcription
and proves consistency, not correctness — the team should add an
independent third-party reference (R `sampling::strata` or NumPy
`groupby + choice`) to the harness. Medium concerns center on PRNG seed
space (M2), test power and pool diversity (M3), single-shared-RNG
ripple (M1), and missing audit-versioning fields (M4). With those
addressed, this becomes a clean pass.
  </summary>
  <blockers>
    <blocker>H1: Seed-grinding is unmitigated; spec needs a public-randomness or commit-reveal seed-source option before any draw is treated as legally binding.</blocker>
    <blocker>H2: localeCompare-vs-codepoint disagreement on non-ASCII Bezirksnamen breaks audit reproducibility on realistic German municipal data; ASCII-only test fixtures hide the failure.</blocker>
    <blocker>H3: Validation harness is consistency-only; an independent reference implementation must be added before "validated unbiased" is a defensible claim.</blocker>
  </blockers>
</verdict>

</review>

<verdict value="warn" critical="0" high="3" medium="4">
The chosen Stage-1 algorithm is the right textbook method for the use case (proportional stratified SRS + Hamilton allocation), with no critical conceptual flaws. Three high-severity concerns prevent a clean pass: user-chosen seed admits seed-grinding without public-randomness backing; locale-sensitive `localeCompare` will break audit reproducibility on real German Melderegister data with umlauts; and the cross-validation harness is TS↔Python transcription, not independent verification — an independent reference (R `sampling::strata` or NumPy) should be added.
</verdict>

