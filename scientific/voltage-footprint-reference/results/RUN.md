# Current footprint and voltage mapping — execution record

16 November 2026. [Frozen protocol](../PROTOCOL.md). No author contact, new
parameter fitting, gate relaxation or change to the live playground equations.

## What was missing and what changed

The earlier finite reference imposes a uniform current distribution. It cannot
predict spreading on an equipotential contact. Also, its integrated electrical
work divided by branch current is not automatically a terminal, corrected-arc
or probe voltage. In simple terms, the contact assumption and measurement were
being asked different questions; there is no demonstrated polarity/units fix.

The new separate reference solves the same charge/angular weak equations with
ideal finite equipotential plasma contacts. Native DOLFINx/PETSc Dirichlet
lifting and independent scikit-fem/SciPy sparse assembly determine the current
distribution. Cathode/anode potentials already fix gauge; no extra axis pin is
applied. Unconstrained operator reactions supply electrode currents and work.
Both potential relative to its gauge and rotation scale to the prescribed
100 A: this retains motional EMF exactly for the fixed-property linear model.

This tests a real boundary-model distinction without inventing an emission or
sheath law, tuning widths or reusing a uniform-source torque incorrectly.
Current-weighted second radius moments now follow the solved weak loads.
Nodal reaction weights are not pointwise current density or peak heating.
The historical prescribed-current reference remains byte-for-byte unchanged.

## Primary-source findings and voltage ledger

A new targeted full-thesis text search and visual inspection of relevant pages
recovered no finite tantalum emission width or raw voltage/current correction
series. This is bounded coverage, not proof no such data exist.
Thesis SHA256: `99e21f93355a518b06e02a68901b4598a7c31a2c43f6a7e932021b8d5fb7127c`;
[public source](https://inis.iaea.org/records/ymfdn-qv182/files/12582976.pdf).

- PDF22/printed17: 4 mm hollow-cathode inner radius; wall rings 2 cm thick,
  with two anodes and other rings floating. Emission width remains unidentified.
- PDF23/printed18: doubly shielded floating Langmuir probe, 1 mm by 0.2 mm tip.
  The source labels its result plasma potential; its circuit/bias/conversion
  is not specified sufficiently to assert that the plotted output is raw Vf.
- PDF40/printed35: corrected 18.5±2 V inferred from a fixed-field arc V–I plot;
  effective Hall parameters 3/9 then inferred from electrical observations.
- PDF41–42/printed36–37, Fig11: near-wall potential profiles aligned 1 cm from
  the wall, hence r=.05 m. This supports a reference radius, not a probe/sheath
  conversion. No new potential markers or experimental score were admitted.

The source reviewer and root inspected the Fig11 render, SHA256
`48a9ba5a2c2f715949959ac9fe65102b0a0b218141042a8d86f77837ff4f0a5e`.
Scan tilt, outermost-marker placement and undefined error-bar semantics prevent
casual digitization. The inspected pages and targeted text pass are not a full
visual thesis audit. Existing [footprint](../../boundary-v84/FOOTPRINT-SOURCES.md)
and [voltage](../../boundary-v84/VOLTAGE-SOURCES.md) reviews retain earlier coverage.

The executable ledger authenticates the existing observation inventory and
keeps terminal 58±.5 V, corrected 18.5±2 V, modeled port, and radial proxy
`phi(r,0)-phi(.05,0)` distinct. Terminal-minus-corrected endpoints give 37–42 V;
this is arithmetic on reported ranges, not a confidence interval or fitted
transferable electrode fall. Spatial probe offsets need not cancel under the
radial reference subtraction. No voltage operator is marked established.

## Runs and verification

All scientific execution used the existing official DOLFINx 0.9.0 guest, offline,
non-root 1000:1000, one CPU/2 GiB and single-thread BLAS. Supplemental SciPy 1.14.1
and scikit-fem 12.0.2 preserve inherited NumPy 2.0.2/PETSc 3.22 ABI. Exact image
digests are in the [parent environment record](../../public-data-campaign/results/RUN.md).
Temporary copy: `/tmp/mass-spinner-public-campaign-20261116`. No host solver run.

```
python3 -m unittest discover -s scientific/voltage-footprint-reference -p 'test_*.py' -v
python3 -m unittest discover -s scientific/finite-contact-reference -p 'test_*.py' -v
python3 -m unittest discover -s scientific/public-fenicsx-reference -p 'test_*.py' -v
python3 scientific/voltage-footprint-reference/voltage_campaign.py campaign-results/voltage-footprint-final.json
```

**10 new, seven neighboring and five historical tests passed.** All nine
mesh cases (three footprints × three meshes, two independent codes) passed
the original conservation/refinement gates. Controls include genuine gauge
re-solves, voltage/current inverse consistency, signed-current/field reversals,
B=0, integrated work/torque, the original failed n4 case, and corrupted/earlier
uniform-reference receipts. The preserved uniform control is byte-authenticated
before its variational minimum-work comparison; source hashes are checked too.

| Paired footprint | Equipotential port V | Uniform-current port V | Fine angular change | Fine port change | Fine Joule change | Fine current-moment change |
|---|---:|---:|---:|---:|---:|---:|
| Narrow | 21.1031 | 21.8612 | .4749% | 1.5659% | 1.9043% | .7694% |
| Middle | 17.4663 | 18.1214 | .4729% | .8681% | 1.0702% | .8624% |
| Broad | 13.4576 | 14.1143 | .8227% | .7061% | .8754% | 1.2259% |

Every fine change contracts and is below 5%; all nine equipotential work values
are below the matching uniform-current values, as the reciprocal variational
principle requires. Maximum cross-code difference 6.04e-11; reported budget
residual 2.29e-11 against 1e-8. These are numerical screens, not rigorous error bounds.

`campaign.json.gz` retains both codes' full sampled angular/potential arrays,
contact coordinates/weak reaction weights, radius moments, all integral budgets,
refinement metrics, radial probe proxies, voltage ledger and source/runtime
identities. No preferred width or matching voltage was selected.

- Final raw JSON SHA256: `6114daadf80a4ebbd88606becc4324bd47bba48c64db629b554678db2cc05e42`.
- Final gzip SHA256: `c62f2c5f17db1798266cb0c6b2e016ce1b55015421634f005d9a943a0a26ec66`.

Application checks ran in a separate offline one-CPU/1 GiB safe-dev guest:

```
node --import tsx --test --test-concurrency=1 tests/qualification-page.test.ts
npm run typecheck
npm run build
npm run check:site
npm run check:assets
```

The report regression and all four application gates passed; the existing
large-main-chunk warning remains. The full 1357-test application suite was not
rerun for this offline-reference/documentation-only continuation. Its earlier
receipt stays separate. The manual GitHub workflow was extended but not dispatched.

## Retained first failures and root-cause fixes

The first test launch imported the older module named `campaign` after adding
its directory to the shared import path. It failed before tests/solves ran.
Using the distinct new name `voltage_campaign` fixes the actual name collision,
without changing old modules or adding an import fallback.

Run02 passed eight controls and n1/n2, then native unscaled LU failed at narrow
n4. The separate diagnosis confirmed PETSc KSP reason -11 (preconditioner
failure). Coupled electrical/angular blocks have very different scales;
native symmetric diagonal equilibration restores this solve, consistent with
an algebraic conditioning problem. The exact pivot reason was not separately
instrumented. PETSc's [native scaling options](https://petsc.gitlab.io/petsc/release/src/ksp/ksp/interface/itfunc.c.html)
`ksp_diagonal_scale`/`ksp_diagonal_scale_fix` implement this
without modifying physical equations, coefficients, boundary conditions or
gates. The newly added n4 regression passes; the independently scaled scikit
assembly agrees. This is preferable to physical damping or relaxed tolerances.

The first failed launch, partial campaign, LU diagnosis, first complete run and
final run are retained separately. All gzip bytes decompress identically to
their raw originals; final source hashes match. Failures are not counted as passes.

## Independent review and limits

Separate agents reviewed primary apparatus/diagnostic sources and the actual
boundary implementation/retained results. The implementation reviewer independently
recomputed both field-array differences, all refinement/integral differences,
signed currents, weak-source moments, work and variational inequalities. No
blocking finding remained. This review is independent arithmetic/source checking,
not an additional reviewer-executed solver run.

**Experimental and live qualification remain false.** The inherited Hall3
conductivity calibration, unmeasured emission footprint, absent sheath law and
unmodeled floating-metal-wall redistribution remain. The paired supports are
illustrative hypotheses, not measured uncertainty bounds. No thermal/meridional
or pointwise peak-current/heating qualification follows from this study.

## Publication

Cloudflare version `f05708da-d20a-4758-90d4-e7e0fefc7751`; only the rebuilt
qualification HTML changed in the deployed asset set. Existing guest login,
same permissions, no host credentials or browser-policy changes. The deployment
log is retained losslessly. The supported in-app browser reopened the actual
report and confirmed the study link, new voltage values and floating-wall/
measurement limits. Viewport/document widths were 373/373 px; warning/error
inspection returned an empty list. This verifies the changed report, not new
playground physics or every control. Live simulation code remains unchanged.
