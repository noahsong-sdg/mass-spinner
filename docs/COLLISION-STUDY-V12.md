# Expanded homogeneous collision study

7 November2026UTC. All41 declared WarpX executions and41 production-TA replay
comparisons completed. The primary moment-equivalence gates remain **UNKNOWN**.
No production scattering coefficient, angular law, cutoff, density or runtime
browser behavior changed.

## Prospective design and physical identity

The [frozen plan](../scientific/collision-study-v12/plan.json), SHA256
`f67c7ccf37dc2d9138f6f1bae0464abc86b29934ba0766fc10ca224024206881`, predates
the new results. It uses exact abstract40u/84u masses, elementary positive charges,
5e17/m3 per species, fixed lnLambda12 and isotropic nominal2/10eV populations.
One homogeneous cell, frozen spatial motion and exactly zero fields isolate
collisions. The new500microsecond horizon targets the transient discrepancy;
it does not replace the1000microsecond v11 evidence.

- N2048 per species, dt1/0.25/0.0625microseconds: eight new seeds1101–1108 per level.
- N8192, dt0.25microseconds: four seeds1101–1104 for marker sensitivity.
- Explicit NANBU at N2048, dt0.25/0.0625microseconds: four seeds per level.
- Four common5eV controls at the finest step and one disabled-collision control.

All main cases explicitly select WarpX's BOBYLEV angular law for unlike and both
self-species operators. Actual initial arrays/moments are bitwise identical
across timestep and angular-law changes at fixed N/seed. Different codes and
steps do not share identical collision noise. N refinements pair whole-run
seeds, not particle identities. Replaying TA against both WarpX laws duplicates
that deterministic TA realization; those duplicates are never pooled as
additional independent samples.

The primary quantity is40u raw second moment, m<|v|2>/(3e), at250/500microseconds.
The predeclared0.1eV engineering budget is5% of the cold species' initial2eV;
it is not a collector-purity tolerance or an experimentally calibrated accuracy.
The whole pointwise95% paired Student-t interval must fit inside +/-0.1eV for
PASS; it must lie wholly outside to establish a budget violation. Other cases
remain UNKNOWN. These are approximate pointwise intervals with7 or3 degrees of
freedom, not simultaneous confidence bands or a distribution-equivalence test.

## Results

Production TA minus explicit-BOBYLEV WarpX,40u raw second moment in eV:

| N per species | dt, microseconds |250microseconds: mean ±95% half width |500microseconds: mean ±95% half width |
| --- | --- | --- | --- |
|2048|1|-0.12388 ±0.05841|-0.04070 ±0.06589|
|2048|0.25|-0.08939 ±0.12669|-0.06160 ±0.06806|
|2048|0.0625|-0.04452 ±0.09449|-0.03752 ±0.08393|
|8192|0.25|-0.07995 ±0.07093|-0.08010 ±0.11048|

Every primary cross-code interval crosses an engineering-budget boundary, so
none establishes equivalence. Some intervals exclude zero, including the1us
N2048 case and0.25us N8192 case at250us. That is evidence of a pointwise
discrepancy; it is not automatically a simultaneous-significance claim or a
proven error greater than0.1eV. The fine2048 final interval is approximately
[-0.12145,+0.04641]eV: smaller uncertainty than the earlier three-seed1ms study,
but at a different horizon and still too broad for this equivalence budget.

For the per-code0.25us-minus0.0625us refinement:

- TA40u at250us: -0.01964 ±0.08593eV, UNKNOWN; at500us: -0.01255 ±0.04947eV, PASS.
- WarpX40u at250us: +0.02522 ±0.05608eV, PASS; at500us: +0.01153 ±0.08550eV, PASS.
- Marker refinement at500us remains UNKNOWN for both methods. The four high-N
  seeds do not establish the particle-number limit.

The NANBU subset does not resolve the disagreement or establish distribution
equivalence. At62.5ns, its final cross-code difference is-0.02484 ±0.08013eV
(four seeds), UNKNOWN. WarpX BOBYLEV-minus-NANBU itself is+0.08669 ±0.11449eV
at500us for these four seeds, also UNKNOWN. Exact-zero TA differences between
these two reference labels simply verify the identical replay; they are not
an independent physics success.

The production fraction of pair steps with angular variance above0.1 decreases
from5.74–5.96% at1us to1.53–1.60% at0.25us and0.394–0.413% at62.5ns for N2048.
These count **variance-threshold exceedances**, not observed large-angle events.
Rare maxima remain large and are not a transport-error bound. The additional
N8192 run samples a maximum variance about1.98e6; an extreme low-relative-speed
pair carries little relative energy, so maxima alone cannot quantify heating bias.

## Why matching constants does not make these the same collision model

Source review identifies two actual model differences, not an inferred constant
normalization error:

1. WarpX26.10 defaults to BOBYLEV cumulative scattering; production TA samples a
   Gaussian tangent-half-angle. At finite step their angular first moments differ.
   Mixed TA pairs also apply a larger variance to the subset of unlike pairs;
   this changes finite-step bias even when the infinitesimal normalization matches.
2. WarpX's Perez update limits its transport cross section using a density-based
   maximum even with a fixed Coulomb logarithm. The production Landau/TA rate
   has no such low-relative-speed cap. A timestep refinement alone cannot remove
   that operator difference. Arbitrarily installing the same cap in production
   merely to fit another code would change the model rather than validate it.

In simple terms, the codes were never asking exactly the same finite-step,
low-speed collision question. Statistical noise and finite-N effects remain as
additional explanations. The new data are consistent with a smaller transient
offset at finer steps, but do not uniquely assign the complete500us discrepancy
to a particular mechanism. Separately audited deterministic angular/cap controls
and the PETSc ideal-Landau comparison are needed for that attribution.

Pinned primary sources: [constructor and angular-law selection](https://github.com/BLAST-WarpX/warpx/blob/26.10/Source/Particles/Collision/BinaryCollision/Coulomb/PairWiseCoulombCollisionFunc.H),
[Perez momentum update](https://github.com/BLAST-WarpX/warpx/blob/26.10/Source/Particles/Collision/BinaryCollision/Coulomb/UpdateMomentumPerezElastic.H).
The independent operator audit records exact source paths and equations.

## Installed default qualification

A separate additional execution uses seed101/N2048/dt1us and explicit BOBYLEV.
It replays the original v11 omitted-model default through500us. The old deck has
max_step1000, the new deck500; actual checkpoint times, all six fields, species
IDs/weights, full velocity/proper-velocity arrays and derived moments are
**bitwise identical** at0/100/250/500us. Thus the installed pinned binary's
default behavior matches the explicit BOBYLEV setting for this real case.

This qualification is retained separately and never enters the41-run ensembles.
See [qualification/summary.json](../scientific/collision-study-v12/qualification/summary.json).

## Invariants, validation corrections and limits

The independent raw-array audit checks all41 WarpX files: constant inventory,
weights and particle IDs; density from actual macro weights; exactly zero fields;
proper-velocity conversion; independently recomputed temperatures; exact
collision-off velocity preservation. All checks pass. Maximum relative total
relativistic-energy defect is1.9622e-12; momentum defect against a positive
initial summed-magnitude scale is4.7698e-14.

Production sampled total-energy and momentum residuals are at most4.4891e-13 and
5.7880e-15. These conservation results establish implementation invariants,
not correct finite-time distribution dynamics or separator throughput.
Directional temperatures, bulk velocities, raw moments, speed-CDF distances and
variance-tail diagnostics remain available in every comparison history. Four
common-temperature seeds are not sufficient to certify ensemble stationarity.

Parent review caught a latent stale-data risk before runs: matching plan hash
and run count alone did not prove that the case manifest matched the plan.
The new boundary validator independently derives exact membership from the frozen
plan and checks absolute density/log/horizon/checkpoint identity before replay.
It rejects individually valid but stale whole campaigns, duplicates and replaced
levels/models/controls. In plain terms,41 valid files need not be the41 intended
experiments. Rejecting incompatible data before simulation/pooling is the smallest
fix; dropping cases or changing the confidence formula would not fix that cause.
Two TypeScript regression tests cover these paths.

An independent CDF/quantile audit refined the df7 critical value by5.83e-10.
The summary was recomputed with2.3646242515927844 and a regression against pinned
SciPy quantiles. Interval half widths change by about1e-11eV, with no verdict
changes. No physics parameter or acceptance budget changed.

## Reproduction and exact checks

Workflows and pinned artifacts: [scientific/collision-study-v12/](../scientific/collision-study-v12/README.md).
All installs and project execution ran inside Apple safe-dev VM
`safe-dev-fa0af76635bd6f32`, minimal root snapshot
`/tmp/mass-spinner-collision-v12.oETIkI`. No host runtime execution or sandbox
bypass was used. Downloads used online mode; tests and all scientific runs were
offline. Source was explicitly synced after edits and valuable generated data
exported before every replacement. Dependencies remained in the VM.

The82 installed WarpX package names/versions/builds/SHA256 identities match v11;
micromamba2.10.0 archive identity is separately checked. Exact actual runner,
input-deck, raw-reference, plan and production-source hashes are retained.
The execution prefixes are VM-local, not host paths.

- `python -m unittest -v test_study.py`: **5 tests pass**, including independent
  SciPy critical-quantile checks and angular-law/control-deck tests.
- `node --import tsx --test scientific/collision-study-v12/test_validation.test.ts`:
  **2 tests pass**, including stale physical campaigns and replaced membership.
- `python suite.py`: **41 declared WarpX runs complete**, exit0.
- `node --import tsx scientific/collision-study-v12/compare.ts`: **41 actual
  production comparisons complete**, exit0. Overall acceptance remains UNKNOWN.
- `python audit.py`: **41 raw-array invariant audits pass**, exit0.
- `python analyze.py`: statistics and engineering gates recomputed, exit0.
- `node_modules/.bin/tsc --noEmit --strict --target ES2022 --module NodeNext --moduleResolution NodeNext --lib ES2022,DOM --types node scientific/collision-study-v12/compare.ts scientific/collision-study-v12/validate.ts scientific/collision-study-v12/test_validation.test.ts`:
  **exit0**, using guest-only `@types/node@24.10.1`.
- `python qualify_default.py`: additional installed-binary replay **passes
  bitwise** at all four checkpoints, exit0; never pooled.

The final explicitly synced191-file snapshot is61259807bytes, source identity
`7b2a03c2c1c730911edf033ddc11ced2bd2fdfd95c882cb4c42063f5e4b03f63`.
Final export: `/tmp/mass-spinner-collision-v12-export-final`. Actual production
modules, adapter and source plan compare byte-for-byte with the reviewed host.
Documentation written afterward does not alter executed code.

Two bootstrap attempts failed before science execution: one used the wrong
working directory; another assumed a list where micromamba2.10.0 emits a JSON
object with a packages array. Correcting cwd and parsing that documented observed
shape resolved setup; the final complete installed inventory matches. No solver
downgrade, tolerance relaxation or physical fallback was introduced.

Final summary SHA256:
`ce0104122a7896d4b9557004744734c95e4085291937e5edfa181b1db884b28b`.
The150-entry [artifact manifest](../scientific/collision-study-v12/verified-v12.sha256)
checks executed sources, environments, all raw references/input decks,
comparisons, summaries and the separate qualification; all150 hashes pass.

An [independent campaign audit](COLLISION-CAMPAIGN-INDEPENDENT-V12.md) confirms
all41 raw cases, shared initial arrays, physical/source identity, invariants,
the four-checkpoint installed-default replay and all176 published intervals.
Its five independent regression tests pass. Tiny near-roundoff conservation
differences from different summation orders do not affect any gate. This audit
agrees that all primary cross-code gates remain UNKNOWN.

The root repository's build/typecheck gate is owned by the parent integration;
this subtask did not change or deploy the browser bundle.
