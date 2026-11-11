# Live collision convergence campaign v30

8 November 2026. This is a prospective numerical study of the live prescribed-field
double-well backend, not a qualification of a real separator or the offline full3V
research backend. The study preserves the existing v10 acceptance budgets.

## Frozen scope and evidence

The original plan was frozen before new-sampler results:
`scientific/live-collisions-v30/campaign/campaign-plan.json`, SHA-256
`7364a46cebfe11ea066c48b24eb55a0b75243754074584fcc54e8323611d8033`.
The separately predeclared axial-only annex has SHA-256
`3f034e3d6432ff2fbcbe40796b422bb32a0db8e2f062a98c9e950f410bb40383`.
Both use the same 1200-second combined runtime budget and 60-second per-run cap;
timeouts and unrun cases are retained, never converted into passes.

All physical runs retain the full 200 µs horizon. Six independent whole-run seeds
are 101, 202, 303, 404, 505 and 606. The core contains 12 levels (72 runs):

- Cartesian TA, 128 representatives/species, the unchanged legacy baseline.
- Source-fitted annular TA and Nanbu, 128/species, 3 radial and 9 axial cells.
- Nanbu timestep refinement at 100, 50 and 25 ns.
- Nanbu particle refinement at 128, 512 and 1024/species on the same mesh.
- Nanbu radial-only refinement: 3→6 cells at fixed 512/species, then 6→12 cells
  with 1024/species, all with 9 nominal axial cells. Source-interface faces are
  fixed, inserted independently of particle positions.
- Matched collision-off control at 128/species.
- Closed common-rotation, zero-beam equilibrium initial state with TA/Nanbu,
  256/species, 6 radial and 9 axial cells.

The axial annex adds six runs at 512/species and 6 radial cells, changing only
9→18 axial cells. It references the matching core level. This separates radial
torque control from axial occupancy changes; it is not alignment or orientation
coverage. The closed comparison alone is not a stationarity convergence study.

Unchanged gates:

| Observable | Budget |
| --- | --- |
| Outlet fractions and unconditional survivor CDF | 0.01 |
| Mean survivor radius / chamber radius | 0.01 |
| Survivor residual kinetic temperature | 0.1 eV |
| Impact time / run duration | 0.02 |
| Species angular transfer / initial positive Pθ scale | 0.001 |
| Maximum raw total Pθ balance residual | 0.001 |
| Sampled unresolved representative exposure | 0.01 |
| Minimum independent seeds | 6 |

Paired whole-run differences use the existing pointwise 95% Student-t equivalence
test. An interval must lie entirely inside its budget to pass. Identical discrete
outcomes with no resolved seed spread remain unknown. Missing, stale or duplicated
runs are not certified. No independent-ion confidence band is used.

## Execution and independent checks

Stage `/tmp/mass-spinner-collision30-campaign`; dedicated copied Apple VM
`safe-dev-7c1ab25a866044c4`. Dependencies were downloaded in that VM; subsequent
execution and reinstallations were offline. No host home, credentials, control
socket or SSH agent was mounted. Source was explicitly synchronized after changes,
and unique pilot output exported before replacement.

The baseline old-source pilot at seed 42 independently reproduces v29:
raw angular residual **0.017245994418545334**, energy residual
**1.253934497070333×10⁻⁶**, sampled unresolved exposure **0.4774495335956845**.
It completed in 0.829 seconds. One initial harness attempt tried writing into an
empty directory omitted by the copy mechanism; it was rerun to a valid path and
the campaign runner now explicitly creates output directories. This was not a
solver failure or a tolerance change.

Final campaign snapshot map SHA-256:
`6d901169d4e57a531fb79e1eab5d01cb016753e62cc545fa1e866b11ae4d5eaf`.
Executed Coulomb kernel SHA-256:
`276385adc07eecbf454973feea4490d7898392ec6bc797811b398d5c46c5de6e`.
All copied input digests are checked before and after the matrix. Results and
status are written after every whole run. Timeout handling kills the complete
child process group. All three plans passed the production plan validator before
launch.

An earlier candidate was stopped after independent validation exposed cancellation
in an extreme Nanbu inverse-CDF tail. Its 42 completed preliminary runs, exact
source, plan and logs are retained under `campaign/preliminary/`, excluded from
final acceptance. No preliminary run is reused. The final kernel passed the
separate independent dense/tail checks before this complete rerun. The campaign
conservatively charges 180 seconds against the original runtime budget, leaving
1020 seconds for final runs; numerical gates and the scientific plan are unchanged.

Independent standard-library checking reconstructs Pθ from saved species means
plus exit events at their actual times, audits particle partitions and collector
memberships, checks the physical endpoint, and integrates annular final density
back into survivor counts. This does not independently recover unsaved particle
states, a physical entropy integral or the full Landau distribution.

## Results

**All 78 final runs completed**, zero errors, timeouts or unrun cases, in
255.179 seconds of recorded process runtime. Together with the conservative
180-second preliminary charge, this remains below the original 1200-second cap.
The pulse, closed and axial summaries remain **FAIL** under the unchanged contract.
The finer ring configuration passes the raw angular gate, but neither physical
transport nor full numerical convergence is qualified.

Maxima below are over all six whole-run seeds, and over the solver's recorded
history samples. Unresolved exposure is a sampling-domain diagnostic, not a
measured percentage transport error. The raw Pθ threshold is 0.1%; unresolved
exposure budget is 1%.

| Level | Max raw Pθ (%) | Max unresolved exposure (%) | Raw Pθ gate |
| --- | --- | --- | --- |
| Cartesian TA, N128 | 1.73098 | 53.394 | FAIL |
| Ring TA, N128, nr3/nz9 | 0.51041 | 58.746 | FAIL |
| Ring Nanbu, N128, nr3/nz9 | 0.59909 | 58.879 | FAIL |
| Ring Nanbu, N128, 50 ns | 0.50278 | 57.843 | FAIL |
| Ring Nanbu, N128, 25 ns | 0.71978 | 58.080 | FAIL |
| Ring Nanbu, N512, nr3/nz9 | 0.36285 | 18.981 | FAIL |
| Ring Nanbu, N1024, nr3/nz9 | 0.36603 | 8.479 | FAIL |
| Ring Nanbu, N512, nr6/nz9 | 0.11366 | 31.696 | FAIL |
| Ring Nanbu, N1024, nr12/nz9 | **0.04237** | **26.870** | **PASS** |
| Matched collision-off N128 | 0.00011 | 61.201 | Control |
| Closed TA, N256, nr6/nz9 | 0.41165 | 28.463 | FAIL |
| Closed Nanbu, N256, nr6/nz9 | 0.39477 | 28.995 | FAIL |
| Axial annex: Nanbu N512, nr6/nz18 | 0.20936 | 50.754 | FAIL |

### Interpretation of the geometric improvement

The best tested raw residual is approximately forty times smaller than the
Cartesian legacy baseline, but that comparison changes geometry, marker count
and angular method together. It must not be credited to Nanbu alone. Indeed,
Nanbu at the same 128-marker ring mesh does **not** reduce the six-seed maximum
relative to TA: 0.59909% versus 0.51041%. The angular-law repair and geometric
torque are separate mechanisms.

At fixed N512 and nz9, radial refinement nr3→6 reduces the maximum raw residual
0.36285%→0.11366%, but at least one seed still misses 0.1%. Mean RMS radial pair
separation drops from 0.02018 m to 0.01145 m; the finest tested joint N1024/nr12
case reaches 0.00645 m and all six seeds meet the raw gate. This matches the
finite lever-arm mechanism `(ra−rb)Δpθ`, without projecting torque away.

Local population resolution remains a blocker: the fine ring case has up to
26.870% sampled unresolved exposure. It cannot be called a converged transport
solution. At fixed N512/nr6, axial refinement nz9→18 increases the unresolved
maximum from 31.696% to 50.754%, and the raw residual maximum from 0.11366% to
0.20936%. This is the real finite-marker tradeoff, not evidence that coarse
axial cells are physically correct. Markers and both spatial axes must converge
together. The closed common-rotation cases likewise still have excessive raw
torque; changing the angular law alone does not establish equilibrium fidelity.

### Observable convergence remains unknown

All nine paired method/refinement comparisons are **UNKNOWN**, not PASS. No
pointwise observable equivalence gate is conclusively FAIL in these comparisons;
most intervals are too wide, have undefined collector observables, or show no
resolved sampling spread. Lack of a decisive difference does not establish
equivalence. Their exact pass/fail/unknown counts are retained in `RESULTS.md`
and `campaign-summary.json`. The overall FAIL summaries arise from explicit raw
angular budget failures in tested levels; local-coverage and missing-sensitivity
checks remain separately UNKNOWN.

For example, the 100→50 ns comparison passes only 4 of 60 observable gates and
leaves 56 unknown; 50→25 ns passes 2 and leaves 58 unknown. Energy-ledger residuals
shrink from 1.319×10⁻⁶ at 100 ns to 3.437×10⁻⁷ at 50 ns and 7.909×10⁻⁸ at 25 ns,
but raw angular error does not monotonically vanish. This is consistent with
spatial stochastic torque persisting under time refinement. Conserved energy
cannot substitute for locality/particle statistics.

### Independent reconstruction and corruption controls

The independent standard-library audit passes all **78** complete raw artifacts.
Reconstructing Pθ from species means and timed exit flux differs from the
producer's normalized residual by at most **1.385×10⁻¹⁵**. Particle partitions,
collector-event membership, exact final time, species angular transfer and
annular survivor inventories also pass. Five actual-artifact checker tests pass:
a good trajectory is accepted, while independently corrupted momentum history,
exit momentum, persisted population partition and density profile are rejected.
This establishes artifact consistency, not continuum physics.

All 101 final input digests were checked again after export; the four executed
physics modules matched canonical bytes at handoff. Final source identity used
by every run and the convergence summarizer:
`9a03f3994d727a3f18cee94a79bbc827ed66a8ec845529960916573c99feb45f`.
This hashes the compact source-map object; the earlier map-file digest hashes
its pretty-printed bytes, so the two identifiers intentionally differ.

Reviewed final export: `/tmp/mass-spinner-collision30-campaign-final-export`.
Complete sources, configurations, 78 raw histories, per-run logs and status are
copied under `scientific/live-collisions-v30/campaign/final/`. Compact tables,
the raw audit and source maps also live at the campaign root. The standard-library
postprocessor is descriptive; it does not introduce new gates or modify producer
decisions. Execution used Node v22.23.4, Python 3.11.2, Linux aarch64.

Exact final commands inside the copied guest, prefixed by
`safe-dev -C /tmp/mass-spinner-collision30-campaign run --`:

```text
npm ci --offline --ignore-scripts
python3 run-campaign.py
./node_modules/.bin/tsx summarize.ts
python3 audit-raw.py
python3 test-raw-audit.py                    # 5 pass, 0 fail
python3 -c [read, retain and execute postprocess.py from stdin]
```

No frozen historical campaign or threshold was changed. No job remains running
in this owned stage. The parent owns final merged build/typecheck and publishing.
No browser, GPU or experimental device validation is claimed by this study.
