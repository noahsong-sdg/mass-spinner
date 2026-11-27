# Persistent liner heat

Status: persistent liner-energy storage passes its independent 24-case study.
The full nine-case coupled refinement completes with **66 passing, zero failing
and six unresolved checks** under the unchanged gates. All six unresolved checks
concern the liner-temperature response. No experimental or live-default
qualification is claimed.

## Problem and cause

The coupled solver calculated small wall-energy increments correctly, but
stored only `Unew = Uold + ΔU`. If ΔU is below the spacing between representable
values of Uold, every step rounds back to Uold. Repeating those steps never
accumulates their heat. In plain terms, the balance resolves a small deposit,
but the account discards it when updating its much larger balance.

The actual regression accepts 64 physical gas–wall exchanges totalling
**5.475419685808852e-14 J**, yet stores zero wall-energy change. It also passes
the state through JSON between steps, exercising the continuation boundary.
The failure is recorded in
[43922180579](https://github.com/noahsong-sdg/mass-spinner/actions/runs/43922180579)
at `e154291`.

## Fix and tradeoffs

The coupled spatial research state now retains a high word H and a low word L
per liner cell. The low word carries the rounded-off part of the energy into
the next step. TwoSum computes the rounding error of each addition; a second
TwoSum renormalizes the high word plus its accumulated remainder. This uses
the established error-free transform in
[Ogita, Rump and Oishi (2005)](https://ogilab.w.waseda.jp/ogita/math/doc/2005_OgRuOi.pdf).
The three-term update still has rounding in the low-word addition; the exact
reference measures that error rather than claiming unlimited precision.

This addresses the demonstrated storage boundary without introducing arbitrary
precision into every transport solve. It needs only one extra number per solid
cell. Changing heat capacities, adding an energy floor or relaxing convergence
would not recover discarded deposits. The equations, material properties and
scientific gates remain unchanged.

Energy ledgers use per-cell differences
`Σ[(Hnew − Hold) + (Lnew − Lold)]`. Adding absolute totals before subtracting
would lose the small change again. Snapshots retain both parts. The existing
high-only storage diagnostic remains available; the compensated diagnostic and
independent paired step/prefix accounting are separate.

Missing corrections in older states mean zero. Explicit corrections must be
finite, normalized (`H + L === H` in binary64) and inside the established solid
enthalpy domain. Zero time preserves both words exactly. The mixture kernel
uses compensation only when explicitly requested by the coupled spatial
backend; the separate legacy live-operation caller retains its prior behavior.

An adjacent checkpoint bug treated an explicit `null` correction as absence;
array iteration could also skip sparse holes. The malformed-state regression
fails in [43926805293](https://github.com/noahsong-sdg/mass-spinner/actions/runs/43926805293).
The subsequent domain-only fix distinguishes `undefined` from supplied invalid
data and checks every array index. It preserves valid-state arithmetic and
the old missing-field migration, while rejecting silent resets. The numerical
refinement producer remains pinned separately at `64b19f2`.
The corrected validation at `94d9530` passes 35 targeted tests and both auditor
selftest suites in
[43927174321](https://github.com/noahsong-sdg/mass-spinner/actions/runs/43927174321).
Its 24 valid trajectories (3,072 stored steps and physical exchange receipts)
match the earlier storage candidate exactly, excluding source-identity metadata.
The final repository gate at the same commit passes **1,343 TypeScript and
20 Python tests**, typecheck, build, structural site and asset checks in
[43927174552](https://github.com/noahsong-sdg/mass-spinner/actions/runs/43927174552).

## Evidence

- Candidate `4f8cc78` passes 34 focused TypeScript tests, four exact-reference
  selftests and five independent accounting selftests in
  [43923824504](https://github.com/noahsong-sdg/mass-spinner/actions/runs/43923824504).
- The same source passes **1,339 TypeScript and 20 Python tests**,
  `npm run typecheck`, `npm run build`, `npm run check:site` and
  `npm run check:assets` in
  [43923824732](https://github.com/noahsong-sdg/mass-spinner/actions/runs/43923824732).
  Site/asset checks are structural, not live browser/GPU verification.
- The bounded capture/merge code at `64b19f2` also passes the final repository
  gate in [43924833480](https://github.com/noahsong-sdg/mass-spinner/actions/runs/43924833480),
  with 1,342 TypeScript and 20 Python tests passing,
  including the new complete/stale/failed/short/tampered cohort regressions,
  typecheck, build, site and asset checks.
- The real coupled backend completes **24 cases / 3,072 steps**, covering
  400/1000/1700 K backgrounds, 4/8 gas cells, signed heating/cooling, two step
  sizes eight orders apart, legacy states and nonzero initial low words.
- An independent Fraction oracle lifts captured binary64 numbers exactly and
  checks every stored prefix against the initial pair plus all energy
  increments. All pass a strict 2% storage gate without a background-energy
  floor. Worst defect relative to accumulated absolute increments is below
  **3.14e-14**. Exact-zero controls are checked separately.
- All scientific execution is offline, under one CPU and a 1 GiB container
  limit. Three serial grid captures preserve the same nine cases; joining
  requires complete cases, matching frozen producer metadata and native stream
  hashes before assessment. This removes the whole-matrix timeout without
  changing the physical problem or increasing per-process resources.

The compact 24-case receipt is
`scientific/spatial-argon-20261116/liner-storage-4f8cc78.tar.gz`, SHA256
`2c7ad389d90c71c1fc85a402678aa17feec2464831e544d6a7618132a19fce72`.
It contains original inputs, all exact prefix assessments and producer run
metadata. All 85 captured source identities are authenticated at their producing
commit; later state-validation code is identified separately.
The validation-fix receipt is `liner-storage-94d9530.tar.gz` in the same folder,
SHA256 `905101fb5c18d3d855897bc781b845854dbb5e0bd04fae1e62ec76331c96d153`.

## Coupled refinement result

[Run 43924833948](https://github.com/noahsong-sdg/mass-spinner/actions/runs/43924833948)
produced all nine native trajectories at **`64b19f2`**: 1024/2048/4096 gas cells
crossed with 64/128/256 timesteps over 1 µs. The electrical mesh remains 16 × 32
and the liner remains three cells. All 1,344 accepted steps and 1,353 retained
rows complete without a solver failure. The independent streaming audit checks
every native stream hash; the producer and assessment maps match all 87 and
89 recorded source files at the producing commit. The later malformed-state
fix is separately identified above and does not relabel this producer.

The original **2% spatial / 1% temporal** gates and strict contraction remain
unchanged: **66 pass, zero fail, six unresolved**. Density response has a fine
spatial discrepancy of at most **0.374%** and a fine temporal discrepancy of
at most **0.124%**. Wall-power differences contract on both axes. The six
liner-temperature responses remain zero at the reported precision and below
the representation screen; equality is not counted as convergence.

Independent accounting distinguishes persistent paired storage from a diagnostic
that deliberately ignores the low words:

| Maximum over the nine trajectories | Paired state | High words only |
| --- | ---: | ---: |
| Whole-system step energy defect | 1.346e-18 J | 5.304e-15 J |
| Whole-system cumulative-prefix defect | 1.206e-16 J | 1.731e-13 J |

The paired liner-only storage defects are at most **1.342e-29 J per step** and
**2.020e-28 J per cumulative prefix**. Gas-energy storage remains uncompensated;
these receipts do not isolate every remaining whole-system defect's cause.
The largest work-relative step/prefix
ratios are **2.263e-7 / 2.143e-7**, respectively. These are diagnostics, not a
new energy acceptance gate or evidence of continuum/experimental accuracy.
The postprocessor reports 559,024 KiB peak RSS; native capture peak RSS was
not measured, so that value must not be presented as whole-study memory use.

The compact receipt is
`scientific/spatial-argon-20261116/liner-refinement-64b19f2.tar.gz`, SHA256
`d4e4e2a253ce4b603bde944251c39a96052cd2f5972cfa73f018faf0b1e8cbb3`.
It retains the index, assessment, independent audit, run/artifact metadata and
capture/assessment logs. Native streams remain in the producing run's
[1024-cell](https://github.com/noahsong-sdg/mass-spinner/actions/runs/43924833948/artifacts/14257324075),
[2048-cell](https://github.com/noahsong-sdg/mass-spinner/actions/runs/43924833948/artifacts/14256254545) and
[4096-cell](https://github.com/noahsong-sdg/mass-spinner/actions/runs/43924833948/artifacts/14257535940)
artifacts, subject to GitHub retention; the compact archive is not a raw-data
backup. Assessment SHA256 is
`ac3243d04e7881eeca0d98e22d0f513f4f3c1d44fccbf1755dd6917ad4b060a8`.

An independent follow-up review checked the compact receipts, archived bytes and
frozen source identities, finding no scoped blocker. That review did not
re-download or independently re-hash the native streams; the offline streaming
audit in the producing run performed those checks.

## Remaining limits

Persistent energy storage is different from resolving its temperature signal.
The enthalpy inversion and reported absolute temperatures remain binary64;
tiny temperature responses can still be unresolved. Gas energies have no low
word. This does not establish solid spatial convergence, general near-equilibrium
SG accuracy, longer-transient convergence or agreement with an experiment.
The six unresolved liner-temperature checks require a temperature-increment
representation or an independently justified resolvable transient, with their
representation screen and convergence gates preserved. This storage fix alone
does not qualify the live playground or the experimental argon comparison.
