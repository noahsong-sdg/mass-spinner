# Spatial gas regime assessment

Status: complete for the bounded Li diagnostic study below. This is a physical
assumption assessment after v61 numerical convergence, not a new solver or
calibrated Marathon performance result. Production laws and defaults stay unchanged.

## Root cause and bounded continuation

The [v61 study](ADAPTIVE-HOT-WALL-V61.md) resolves the tested prescribed PDE
more accurately, but its continuum/local-equilibrium assumptions remain separate.
The older `scientific/gas-regime-v56/assessment.py` deliberately uses one gas
temperature in every cell. Applying it unchanged to spatial gas would erase
the very thermal layer being assessed. In simple terms, its pressure, mean free
path and wall-arrival estimates would all see the average temperature.

The new VM-only path streams the already audited browser download and constructs
each local state from the accepted species probabilities and gas internal energy.
It reuses the existing attributed v56 transport adapter at local temperature and
composition. Keeping a separate assessor preserves the meaning and reproducibility
of the uniform-temperature study; changing that older study or adding a numerical
diffusivity/temperature floor would obscure the actual physical question.

For fixed initial inventory `N=p0 V/(kB T0)` and equal-volume gas cells,
`Ns,i=N xs probability_s,i`, `Ti=Ui/(1.5 kB sum_s Ns,i)` and
`pi=kB Ti sum_s Ns,i/(V/M)`. Both exported temperature and pressure must agree
with those independent reconstructions. The Li fit is only a theoretical
isotope-mixture proxy, not isotope-resolved measurement or a calibrated property.

## Prospective diagnostic contract

The assessment visits every accepted checkpoint and cell of the actual 256-cell
1 s refined browser run. It consumes JSON through EOF and asserts the retained
count, duration and exact input-file digest. A quarter-decade observation series
selects the first accepted knot at or after each requested physical time, retaining
both requested and actual times. No observation is silently interpolated. Global
extrema also retain their full current and preceding checkpoints as witnesses.

The independent auditor checks selected witnesses, not a separate all-history
scan. It imports neither the assessor nor transport implementation; SciPy Gaussian
quadratures independently check monatomic Maxwell wall moments. Both scopes must
remain explicit in results and the final report.

Separate diagnostics are:

- `lambda_mu=(mu/p_i) sqrt(pi kB Ti/(2 mmean_i))` and `mu/p_i` as a stress-relaxation
  proxy under the [Sharipov/Seleznev convention](https://srd.nist.gov/jpcrdreprint/1.556019.pdf).
  Neither is a measured binary collision distance/frequency for this isotope mixture.
- Physical cell-center log secants for temperature, pressure and each present
  species number density, multiplied by the larger adjacent local mean-free-path
  proxy. Absent species or undefined log gradients remain unavailable. `lambda/dr`
  alone is not a physical gradient criterion.
- Adjacent-state Eulerian `mu/p_i * abs(delta log Ti)/delta t`. Initial rates are
  unavailable. The physical field change is essential: numerical timestep alone
  is never called forcing time, and this is not a material derivative.
- A continuity-inferred radial mass-flow Mach number from cumulative species
  inventory change, physical face area and current neighboring density/sound speed.
  It is a diagnostic inference, not a solved radial velocity or momentum equation.
- Prescribed conductivity divided by the local attributed conductivity. A transport
  proxy cannot silently replace the constant conductivity used to produce the run.

For the wall, reconstruct the production resistance chain
`Rtotal=1/Gfilm+Rsolid-half+Rgas-half`, with
`Rgas-half=1/(8 pi L kappa_live M)` and cylindrical tungsten half-cell resistance.
Outward heat is `(Tgas-last-Tsolid-first)/Rtotal`. The wall Fourier-gradient screen
uses `lambda_last abs(Qout)/(A kappa_live Tgas-last)`. The film's temperature jump
is not divided by numerical cell width and treated as a gas gradient. Zero
conductivity leaves the surface reconstruction/gradient unavailable; zero film
gives zero exchange without inventing a physical equilibration time.

The local-cell incident-Maxwellian reference is
`Gmax=2 kB A sum_s[n_s sqrt(kB Tlast/(2 pi m_s))]`.
`Gfilm/Gmax` is a film-to-single-Maxwellian-reference ratio under those assumptions,
not an inferred accommodation coefficient. It uses outer gas-cell means, not an established
kinetic boundary distribution. Compare nominal film, not the combined cell-to-cell
conductance. No extra tangential-drift heat is added to the existing drag heating.

## Interpretation boundaries

No aggregate physical pass/fail or new universal threshold is introduced. A small
gradient diagnostic is insufficient to establish a local Maxwellian, the kinetic
wall layer, accommodation, source distribution, chemistry or radial momentum closure.
In particular, an isothermal rotating Maxwellian can have substantial centrifugal
density and pressure gradients at exact equilibrium. Those gradients alone do not
prove continuum failure; tangential rigid rotation is not radial Mach or viscous strain.
Early Eulerian rates and sharp boundary forcing also need mesh sensitivity before
being interpreted as continuum temporal limits.

The [Li fit source](https://www.jspf.or.jp/JPFRS/PDF/Vol7/jpfr2006_07-217.pdf)
supports the existing 100–3000 K screening law. Missing local transport data are
rejected for this fixed Li packet rather than replaced with another gas. This does
not extend qualification to molecular feed, other isotope compositions or reactive walls.

Prospective controls include equal mean/nonuniform temperature, fixed species
inventory and local pressure, absent species, unsupported data, zero film/zero
conductivity, mesh width versus physical gradient, unchanged fields over nonzero
time, rotating isothermal density gradients, and corrupt local/gradient/wall/rate
outputs. Source snapshots and all execution receipts are parent-owned in safe-dev.

## Observed results

The actual browser file, SHA256
`449703e8ff16c13881f5428a97a39ec5dee24d5c1092adebc1b6677613f8cb20`,
was assessed through EOF: **31,791 checkpoints, 256 gas cells and 8,138,496
cell states**. It is the 1 s natural-Li proxy case at initial 10 Pa/500 K,
radius 0.12 m, length 0.8 m, initial 1000 K tungsten, nominal film 0.1 W/K
and imposed gas conductivity 0.1 W/(m K). These findings are about that case.

| Quantity | Observed maximum or range | Time of maximum |
|---|---:|---:|
| Mean-free-path proxy / vessel radius | 0.00889312 | 1 s |
| Interior temperature-gradient Kn proxy | 0.00103581 | 13.9103 microseconds |
| Wall Fourier-gradient Kn proxy | 0.00107742 | initial state |
| Pressure-gradient Kn proxy | 0.00541728 | 1 s |
| Eulerian thermal rate × stress-time proxy | 0.0157838 | first retained half-step |
| Continuity-inferred radial Mach | 0.0000273096 | 6.36279 microseconds |
| Imposed conductivity / local Li-fit proxy | 1.84255–3.35183 | range over all cells/states |
| Nominal film / local Maxwellian reference | at most 0.0134151 | initial state |

These small spatial temperature indicators do not prove continuum validity.
The peak thermal-rate diagnostic occurs at the first retained half-step,
1.3724983069415716e-11 s. Its initial value and maximum are mesh-sensitive
cell-average quantities; this new diagnostic has not undergone independent
spatial refinement. It is a conditional rate-scale warning, not an established
kinetic failure, measured collision time or precise physical startup timescale.
Neither the small inferred Mach nor centrifugal pressure gradients qualify the
missing radial momentum equation or phenomenological diffusion law.

The clearest constitutive issue exposed is the 1.84–3.35 conductivity ratio.
The current constant coefficient differs materially from the attributed
temperature-dependent transport proxy throughout the run. This is a demonstrated
constitutive discrepancy, not a measured effect on simulation outputs or proof
that the Li fit predicts real isotope transport.
Likewise, the small film ratio establishes no actual Li/W accommodation value.
The simulation still lacks the required kinetic/surface/chemical data.

The all-state calculation completed in 86.19 s. A separately authored auditor
independently reconstructed **49 selected witness states**, including each reported
global peak state, in the 1.99 s audit/plot gate. It also integrates Gaussian
half-space moments with SciPy rather than importing the wall-reference formula.
It does not independently rescan the whole history or validate the global peak
selection algorithm. Both outputs explicitly retain `qualified=false`.

## Fixes and verification

The source review exposed a second concrete diagnostic bug: `np.allclose` would
broadcast a singleton stored temperature/pressure vector over the whole mesh.
In simple terms, one value could impersonate every cell. The regression reproduced
both acceptance failures before the fix. Exact `(cell_count,)` shape and finite
checks now enforce the actual canonical-field invariant before numerical comparison.
This is preferable to accepting a broadcast or trying to repair corrupt data.
The frozen input was already covered by v61's full-array audit, so this standalone
assessor defect did not invalidate its source history.

The initial eight tests passed. The singleton regression then produced two
expected failures; the corrected nine-test suite passed. The final suite adds
constant-pressure/nonuniform-temperature and pressure-scaling invariants:
**11/11 new tests, 16/16 existing v56 regime tests and 10/10 v61 oracle tests pass**.
Seven final commands also include `npm run typecheck`, `npm run build`,
`npm run check:site` and `npm run check:assets`; all exit zero. These commands
do not claim a new browser test. All 151 regenerated application files are
byte-identical to the previously browser-verified Final D release, SHA256
`889256c3ef8ae80b934786f1dec45f4b5f1d9a06f39dd787d0245df11390a56d`.
No new app deployment was needed for this assessment-only change.

Execution uses the existing offline safe-dev source copy
`/work/home/fix-v43-source`; only pinned `ijson==3.4.0.post0` was added to the
existing v56 environment during an explicit online installation. Cantera 3.1.0,
NumPy 2.4.6, SciPy 1.17.1 and matplotlib 3.11.2 are unchanged. Li property calls
use the existing adapter; Cantera supplies no new Li measurement or closure.

Actual commands and exact tested snapshots are preserved in
`scientific/fixes-v43/spatial62-*.{receipt.json,inputs.json,log}`:

- `spatial62-actual-history`: 651 inputs, SHA256
  `90527fe160916e8c1b378c298917273add632a9c02ccd155f0024f95d50ee6b1`.
  Runs `campaign.py /work/home/adaptive61d-browser-export.json.gz /work/home/spatial-regime-v62-study`.
- `spatial62-independent-witnesses`: the same snapshot; runs
  `audit-independent.py` on its witness packet, then `plot.py`.
- `spatial62-final`: 652 inputs, SHA256
  `c513634e7e841bb48873528d4afdb57a22e95648c4b79c5addd2c5866b24244e`;
  runs `final.py` with the seven commands and release-identity comparison.
  The later additions are final-gate orchestration and two tests, not assessor arithmetic.

The host transfer contains five artifacts, 8,687,304 raw bytes, with a per-file
SHA256 manifest in `scientific/centrifuge-v44/spatial62/studies/manifest.json`.
Witness JSON SHA256 is
`be60085654fb541d32480d7bc96e22845e3303ef58a11719996a473b5a172e54`;
the independent audit receipt records that same digest. The exported PNG was
reopened and visually inspected; it distinguishes actual selected observations
from the all-state extrema table. No kinetic-reference run is claimed.

The independent [physics review](reviews/v62-gas-regime-physics.md) and
[diagnostic audit](reviews/v62-gas-regime-audit.md) cover source, interpretation
and actual execution evidence. Reviewers did not run a second VM campaign;
the separately authored auditor was executed by the parent in safe-dev.

The next model increment should be an explicit temperature-dependent neutral
conductivity option with source/uncertainty disclosure and new independent
heat-flow convergence studies. A kinetic wall reference is needed before
turning the current prescribed film or earliest transient into a physical claim.
