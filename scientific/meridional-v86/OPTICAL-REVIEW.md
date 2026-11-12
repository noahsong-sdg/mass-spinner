# Optical extension and comparison audit

12 November 2026. Independent equation/optical reviewer. Source inspection and
edits only; no project or scientific code execution and no VM operation by
this agent. The parent reported an initial 25-test safe-dev pass; that is not
execution evidence for the later comparator fixes below. Fresh parent-owned
tests are required on the final synced source snapshot.

## Physical operator

The original frozen V80 operator is exact for constant angular velocity and
emission in the common refinement of their annuli: Doppler velocity is
`b Omega` along each annular chord segment. Radial motion adds
`+/- ur x/sqrt(x^2+b^2)` on its two sides. The new operator uses symmetric
Gauss-Legendre nodes in physical sightline distance x on every common segment.
It preserves exact segment photon weights and exact cancellation of the radial
centroid contribution. At zero ur, it returns the frozen components directly.

The sign assigned to the positive-x radial term has no spectral consequence
under the assumed axisymmetric, front/back symmetric emissivity: reversing ur
exchanges the two component sets. This does not make its broadening optional.
Asymmetrically obscured emission would invalidate the cancellation and is not
the retained optical model.

An independent analytic check follows without a numerical quadrature. For a
common annulus, let positive sightline endpoints be `lo,hi`, length `L=hi-lo`,
emission epsilon, radial speed U and swirl mean `m=b Omega`. The two-sided
weight is `W=2 epsilon L`; radial first moment is exactly zero; its extra
variance is `U^2 F`, where

`F=1-|b| [atan(hi/|b|)-atan(lo/|b|)]/L`, for b nonzero,

`F=1`, for b zero.

Thus the total centroid is `sum(W m)/sum(W)` and the full spectral variance is

`sum{W[(m-centroid)^2+U^2 F+kB Tproxy/mAr]}/sum(W)+sigmaInstrument^2`.

This derivation independently checks both the radial projection and the
factor-two path ownership. The authored pure-radial regression uses one
uniform-emission chord and this analytic integral at quadrature order 64.
It does not establish that order 8 suffices for every full-campaign field;
the separate 2/4/8 LOS refinement gate must remain in the actual records.

Gaussian bin probabilities use the same SciPy normal-CDF differences as V80.
Accumulation is blocked to bound memory, and the spectral mode is found only
after assembling the complete mixture. Testing each chunk's mode separately
would incorrectly reject a clipped minority component even when the whole
mixture's maximum is inside the window. A regression compares the blocked
result with the unchanged full V80 kernel for 601 distinct components.

All six temperature proxies, three instrument widths, two brightness-edge
closures and two estimators remain: 72 alternatives per scored physical state.
The thermal proxies retain the original common-annulus location convention.
Neither they nor brightness-conditioned emission evolve with the hot gas.
This is a fixed-diagnostic conditional comparison, not a self-consistent
prediction of radiation from the evolving discharge. In particular, a very
hot single-fluid release is not licensed to emit the old Ar-I profile with
unchanged ionization and line-width temperature. The explicit qualification
flags and physical scope must prevent that interpretation.

## Comparison defects corrected before full predictions

**Alternative pairing.** The first comparator paired fine and coarse rows by
list index. A valid reordering could silently compare different temperatures,
instruments or estimators. The fix maps the exact 72-option identity set and
rejects missing/duplicate alternatives. Pairing by physical identity is smaller
and more reliable than imposing an undocumented file ordering.

**Group/time inventory.** The first comparator could silently overwrite a
duplicate group and omit a missing one. Failed flow cases had only one entry
with no reporting time. The fix derives all 64 required groups from the fixed
four scenarios, two anode locations, two optical flow grids and four reporting
times. Every failed flow case creates four explicit unavailable records. Saved
snapshot times must exactly equal the frozen schedule. Expected/unavailable
counts and `comparisonComplete` distinguish missing evidence from a velocity
criterion failure; no missing case is assigned an invented prediction.

**Point ownership.** V80's scorer consumes spectral records in list order.
Unsorted spectra therefore could associate the wrong sightline with a measured
point. Before invoking the unchanged scorer, the new comparator verifies the
complete unique point/temperature/instrument set, exact frozen locations and
brightness, and canonicalizes point ordering. It also verifies the expected
centroid, spectral-bin and LOS refinement inventories. This preserves the old
20% score criterion while enforcing its actual input contract.

**Provenance.** Payload and flow/index hashes alone did not establish that
the code and brightness inputs remained those that produced them. The fix
checks flow producer sources, frozen V80 code against its archived verification
receipt, current optical source seals and both diagnostic seals before scoring.
It checks source stability after optical prediction and proves scoring leaves
sealed flow/index bytes unchanged. Checker changes are not silently accepted
as if they were the originally sealed producers.

**Frozen-module import.** Loading V80 `study.py` by file path does not itself
put its sibling imports on Python's path. The brightness fixture loader now
temporarily adds that exact verified V80 directory during import. This is an
import-path correction, not a patched operator, copied dependency or physics
fallback. Original V80 source files remain unchanged.

## Authored regression evidence and remaining audit limits

`test_optical86.py` contains seven controls: exact zero-ur legacy components;
signed-impact photon/centroid cancellation; analytic radial variance; ur sign
reversal of the full spectrum; blocked/full Gaussian agreement; invalid/stale
field rejection; and preservation of every alternative without reading a
measured velocity. The latter also inserts an arbitrary velocity annotation in
the coordinate records; prediction construction strips it.

`test_compare86.py` adds eight controls: complete groups/times; missing/duplicate
flow branches; explicit per-time failure retention; identity-based alternative
pairing; reordered point spectra with the real frozen scorer; missing/duplicate
or stale spectral points; stale/escaping payloads; and stale producer seals.

These controls are authored, not independently executed by this reviewer.
Final optical/refinement and score artifacts must still be checked after the
flow prediction seal. The comparison remains previously viewed development
data at fixed transient times, not held-out or stationary experimental
validation. Independent spectral-mode optimization and LP dual optimality
are not established by these tests.

## Sealed-replay source re-review

The parent subsequently reported 47 main controls, 24 independent controls and
84 actual-field direct-CDF/Fourier witnesses passing before the performance-only
flow replay. Those counts are parent-reported here; final exported receipts
and artifacts remain a separate evidence review.

Read the current `compare86.py`, `campaign86.py`, `run86.py`,
`summarize86.py` and the direct optical callback after Fourier integration.
No Python edits were made by this reviewer during sealed replay. The following
source properties hold:

- Flow creation reads the sealed V84 prediction and constitutive inputs, not
  measured velocities. Every prescribed release time remains 0/1/2/4 us.
- The original direct CDF spectrum is still the default callback. The explicit
  comparison caller chooses the separately tested Fourier kernel, whose file
  hash is included in the optical-source seal.
- Each physical state retains all 72 alternatives. The comparator requires
  all 64 optical groups or explicit failed records, and pairs the same option
  across the two spatial grids. No failed time is silently replaced by another.
- Target velocity data is first loaded in the scoring function after flow and
  optical packets exist. The scorer is the unchanged V80 implementation.
- Summary plots use the declared linear-edge/2900 K/zero-instrument centroid
  slice at every fixed time, displaying all eight scenario/anode combinations.
  This display slice does not select the best-scoring alternative or time.
- `experimentalQualification=false`, `steadyComparison=false` and the viewed
  development-data status remain explicit. Raw all-point matches and numerical
  optical failures are separate counts; they do not assert PDE qualification.

One provenance hardening gap remains in the display-only summary path:
`summarize86.py` verifies the prediction binding of its audit and comparison
summary but does not itself recheck the compressed comparison packet against
`comparison-summary.comparisonSHA256`, or its plotting target against the
comparison target hash. Freshly generated files are not evidence of a stale
artifact, but the final independent evidence review should verify those two
bindings explicitly. This observation does not license modifying already
sealed producer sources during the running replay.

The physical scope remains deliberately restrictive. Fixed source emissivity
and line-width alternatives do not become predictions of the evolving hot
adiabatic one-temperature material. Passing the Fourier/direct reference screen
establishes numerical agreement of that conditional diagnostic, not a valid
electron/heavy energy partition, plasma chemistry or experimental transient.

## Subsequent real-fixture integration failure

The actual scoring run exposed a contract error missed by this review's
minimal fixtures. `optical86.predict` intentionally persists only location ID
and numeric radius, excluding arbitrary annotations that might carry targets.
The original `canonical` checker compared that projection against complete
source records, which also contain `extractionRadiusRangeM`. Consequently the
real packet was rejected before scoring even though its IDs/radii and the
raw diagnostic-file seal were unchanged. This is a checker integration bug,
not an altered velocity prediction or a numerical/experimental score failure.

The proposed smallest fix is to project only the expected fixture to the same
declared `{id,radiusM}` output contract, then require exact equality with the
persisted records. It should not normalize away arbitrary extra predicted
fields. The full source locations file, including extraction ranges, remains
hash bound; numerical location/radius and brightness conditions remain strict.
The original optical scope already disclaims a coordinate-uncertainty guarantee.

The parent will preserve the failed attempt and add a real source-fixture plus
actual prediction regression, together with changed-ID/radius rejection cases.
These exercise the metadata present in production evidence, which the earlier
minimal fixture omitted. Independent source inspection confirms that the
proposed change does not alter the PDE, spectrum, optical thresholds or score
criterion. No Python edits or execution were performed by this reviewer for
this correction. Acceptance still requires parent-run fresh tests and final
exported source/artifact bindings; this note does not claim those are complete.

## Final exported evidence review

The final export supersedes the pending verification status above. This reviewer
inspected the corrected canonical contract and actual-source regression, the
execution receipts and logs, comparison summary, optical index, field-replay
receipt and actual-field Fourier witnesses. No project code was executed or
Python source changed by this reviewer. The main control log records **48
passing tests**, including the actual-fixture prediction and changed ID/radius/
extra-key rejection. The standalone log records **24 passing tests**. The final
receipt records comparison and summary exit 0, application tests 1,238/1,238,
and successful typecheck/build. It also preserves both scientific audits'
nonzero exits; successful software checks do not override those failures.

Trusted file hashes independently match the exported summary bindings:

| Artifact | SHA256 |
|---|---|
| Prediction manifest | `70e0923e8ac9a53a476e439a9df3e670fb52467ee9d3d6ab5aa62ad9eae5e5c7` |
| Compressed comparison | `ca9d4e1e067e4387869e1752ad074877165d66657fae8f6889580d2b5c31ef98` |
| Unchanged target file | `1e4f542dab2cdd777673f724ec3038e0223589797fa290765c0e1c8f047b4741` |
| Optical index | `b8508d27ad99ae26cca91785325ea98dcad767c92dd48ba825a9b775f33b2303` |

Current comparator, real-fixture test, direct optical operator and Fourier
source hashes also match the final execution receipt. These direct checks
close the observed final-publication provenance question; the display-only
renderer's general missing recheck remains a scope limit, not evidence of a
stale artifact in this export.

The index contains **64 completed groups**. The saved strict comparison reports
all **2,304 alternatives**, 576 at each fixed time 0/1/2/4 us, no unavailable
groups, zero numerical optical gate failures and **zero all-point experimental
matches at every time**. Source review confirms the full 72 alternatives per
physical case and fixed time, identity pairing across grids, unchanged scoring
criterion and no fitted current, velocity or reporting time. Target velocities
are read only in the scoring stage. The data were already viewed during
development; this is not a fresh holdout.

The separate saved direct-CDF/Fourier witness report records all **84
predeclared actual-field witnesses passing**. The field-replay report records
26 bitwise-identical saved state/history packets relative to attempt01. These
are inspected saved execution results, not fresh independent runs or an
independent reconstruction of every spectral mode/LP optimum in all 2,304
alternatives.

There is no optical publication blocker with these qualifications retained.
The coupled flow remains numerically unqualified: **85 field failures and
335 original quadrature failures** persist in the original audit; the separate
panel integration supplement removes its quadrature discrepancy but retains
85 field failures. The inactive timestep-cap contrast does not establish
temporal convergence. Extreme local heavy-gas heating, fixed emissivity and
line-width proxies, externally prescribed electrical coefficients and missing
matched cooling/injection/electron-energy closures still prevent an apparatus
validation. This conditional research backend does not qualify the live
playground or a Marathon device.
