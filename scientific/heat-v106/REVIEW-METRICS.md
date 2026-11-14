# Independent evidence and metrics review

V106 fixes a demonstrated heat-operator defect. It does **not** pass the
coupled spatial-convergence gates or establish experimental accuracy.

## Scope and evidence checked

This reviewer inspected the production path, independent controls, protocols,
source inventories, exported summaries and execution logs. The reviewer did
not execute the scientific code; the execution evidence comes from the
root-operated isolated VM. All 1,011 exported payload files matched the
SHA-256 inventory in `retained/evidence-20261113/export-inventory.json`.

The checked snapshots and prediction are:

- V105 candidate04 transfer: `3f171bf091ea8a29fb228fe149090140b58716ca0ad3fdb1b9e1d9e087440291`.
- V106 candidate02 transfer: `89fa06a1c1b5f25a4790e8708f0d21caaa2a97f3942ac7d73a127ea03db0dece`.
- V106 prediction: `96098e86f874d1d5f65317a882a5f14df75685afc06ecc8a98cbd7a76e48a7b4`.
- Directional cross01 transfer: `25e3d700a5ad72100680d1f66fd1cf7557de7fd1ef053270af41313bea22b324`.
- Corrected test review01 transfer: `63338c5808650ffce62f71b6698c48e6b213e3ec8233c91ceca22cd3b366c134`.

## Root cause and bounded fix

The old hybrid conduction used a Q1 stiffness with cell heat capacities only
at centroid nodes and zero capacities at boundary nodes. For a nonharmonic
radial temperature mode, the endcap stiffness rows still require radial
redistribution. Their zero capacity prevents an axially uniform transient
from satisfying those rows. In simple terms, the heat operator and the
locations that store heat did not describe the same thermal system.

The FiPy replacement places both temperature and heat capacity on the actual
cylindrical finite volumes, with native insulated boundaries and backward
Euler stepping. Static inspection confirms volume/order checks, refreshed
incoming mixture capacity and energy, and unchanged mechanical operators.
Holding capacity fixed during this heat-only split is consistent with its
fixed mass. The implementation admits constant positive scalar conductivity;
it does not qualify variable-property plasma transport. This bounded
replacement addresses the demonstrated incompatibility without changing
mechanics, apparatus inputs or scoring. The extracted legacy hook produced
byte-identical states and all receipts over three saved control steps.

The same isolated radial-mode test gives old axial spreads of 0.654/1.996 K
on uniform/graded axial grids and new spreads below 2.3e-12 K. All four heat
controls pass. Spatial increment errors decrease 1.898%, 0.480%, 0.124%,
0.0343%; temporal errors decrease 6.616%, 3.475%, 1.790%, 0.915%, consistent
with the intended spatial and backward-Euler temporal orders in that test.
These are analytic heat controls, not coupled-device validation.

The review also corrected a test-admission bug: the wall test imported an
unpublished probe whose baseline alias depended on campaign import order.
It now imports the immutable published `flow.Flow` directly and defines its
local flag-enabled candidate. Baseline/candidate flag assertions protect the
distinction. Review01 records isolated wall 4/4 and combined source 26/26
passing; this correction changes no scientific producer.

## Original qualification outcome

The `audit99.py` bytes match across V105, V106 and the directional study
(`67a906824e4e5767efee01b7ac06daece2f094205d85e46dece960696316895d`).
The original exact-panel metric remains authoritative; cylindrical overlap
restriction remains supplemental. Original clocks, five jobs, 5% spatial
and 2% temporal limits are retained. The recorded initial conserved states
are byte-identical between V105 and V106 for all five jobs.

| Time | Density-increment discrepancy | Radial-flow discrepancy | Limit |
| --- | ---: | ---: | ---: |
| 1 microsecond | 20.7323% | 7.06468% | 5% |
| 2 microseconds | 22.1807% | 9.20974% | 5% |
| 4 microseconds | 23.4212% | 9.63812% | 5% |

All six spatial gates fail. The evaluator correctly returns failure;
`allRequiredNumericalPass` and `experimentalQualification` remain false.
Other recorded numerical gates pass, including temporal refinement and
conservation ledgers. Good conservation does not bound local solution error.
The optical comparison has zero all-point matches among 288 alternatives.

## What the directional study establishes

The five admission controls pass. At one microsecond, radial-only refinement
gives 20.27% density-increment and 6.95% radial-flow differences; axial-only
refinement gives 2.95% and 0.94%. Holding either axial grid fixed leaves the
same strong radial sensitivity. Reused full-refinement metrics match the
original values exactly. No original failure or gate is replaced.

This localizes the dominant tested sensitivity to radial resolution. It does
not identify a unique defective operator: the declared steady-torsion initial
solution also depends on mesh. Regional differences and diffusion-length
indicators are diagnostic quantities, not continuum error bounds. The heat
fix changes the full spatial discrepancies only modestly, so the corrected
thermal artifact was not their dominant cause at these resolutions.

No blocking correctness issue was found in this bounded heat replacement.
There is **no approval of coupled convergence, experimental fidelity, live
playground qualification or deployed behavior**. Further radial refinement
and causal controls must retain the original inputs and gates.

## Supplemental radial refinement

The later `retained/radial-evidence-20261113/v106-radial01` packet has transfer
SHA-256 `8e4a5b3ab30e6b53f615dd3ff89e575b7885a8f389aeded3289b6140458aaced`.
All 119 exported payload hashes match its inventory. Static inspection of
`radial_next106.py` confirms pinned original prediction and directional
summary hashes, matching source/physical-input inventories, checked field
hashes and clocks, and source seals before and after the worker. It retains
the existing map, extends only radial refinement to 8, and reproduces the
reused 2-to-4 pair exactly. Its five admission controls pass.

At one microsecond with axial refinement fixed at 2, radial refinement
4-to-8 reduces the density-increment discrepancy to **7.45152%** and the
radial-flow discrepancy to **2.10373%**, versus 20.27058% and 6.94871% for
2-to-4. This supports radial underresolution as a material contributor.
It does not prove a unique faulty operator or an asymptotic error bound;
the initial steady torsion remains mesh-dependent. The original six failures
are explicitly retained. This short mixed-grid diagnostic neither scores
replacement qualification gates nor qualifies the full 1/2/4-microsecond
campaign. Density still exceeds the original 5% reference threshold.

Both final combined-test attempts are retained. Generic discovery selected
the intentionally old `test_heat106.Method` default and reproduced the two
known axial-separability failures. Explicitly binding `Method=FVDiffusion`,
as in the original candidate green run, gives **18/18 passing** in the same
103-input snapshot. The binding selects the tested backend; assertions and
limits were not changed. A plain discovery command therefore must not be
reported as an all-green candidate check. These receipts were inspected,
not rerun by this reviewer; no convergence or experimental approval follows.
