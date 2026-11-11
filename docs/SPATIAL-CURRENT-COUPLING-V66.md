# Spatial current, mixture momentum and temperature-dependent transport

10 November 2026. Experimental backend; no live replacement or device-accuracy
claim. This extends the [v65 momentum kernel](SPATIAL-MOMENTUM-V65.md). Three
independent reviewers examined the electrical reference, transport data and
coupling identities. All project execution was performed by the parent inside
the offline safe-dev VM; the transport-source download used an explicit online
invocation.

## Traced limitation and implemented path

The live `simulateFuelOperation` path retains two global angular momenta and a
prescribed thermal conductivity. Conservation of total spin cannot determine a
local velocity profile, and the former prescribed radial current lacks its
return path. Simply animating different radial speeds would not supply either
missing equation.

The separate `advanceFuelSpatialOperation` path now couples:

1. `solveFuelCurrent`: axisymmetric r-z charge continuity with prescribed
   positive diagonal conductivity, electrode voltages and insulating walls.
2. `advanceFuelGasMass`: conservative Scharfetter–Gummel species transport using
   the accepted local angular-speed and temperature fields.
3. `advanceFuelAdvectedMomentum`: the signed sum of accepted species kg transfers
   carries common-fluid angular momentum; local inertia follows those inventories.
4. `advanceFuelMixtureThermal`: species enthalpy, physical Joule/shear heat,
   signed centrifugal work, temperature-dependent gas conduction and the
   existing temperature-dependent tungsten liner share endpoint temperatures.

The electrical equations and exact edge-work identity are

```
Jr = sigmaP (-dphi/dr + B r Omega),  Jz = -sigmaParallel dphi/dz
(1/r) d(r Jr)/dr + dJz/dz = 0
P_electrodes = Q_Joule + sum(torque_cell * Omega_cell)
```

Electrical insulation means zero *total* normal current, including motional
EMF. The regular axis has zero area and no electrode. A voltage reference is
required. The network integrates logarithmic cylindrical resistance; actual
NIST FiPy independently uses cylindrical face-area/centre-distance diffusion.
FiPy is executed, not merely cited or emulated.

For equal-volume q=r² cells, accepted outward mass transfer F carries
`F q_face Omega_upwind,new`. The exact backward-Euler kinetic identity is

```
Delta K = W_drive + W_wall - Q_shear - W_centrifugal - D_upwind - D_BE
W_centrifugal,face = F Delta q (Omega_left² + Omega_right²)/4
D_upwind,face = |F| q_face (Omega_right - Omega_left)²/2
D_BE = sum I_old (Omega_new - Omega_old)²/2
```

Numerical losses are retained separately and never deposited as gas heat.
This common-fluid closure has no independently evolved ion-neutral slip. Its
conductivity-frame Joule term represents unresolved collisional dissipation;
the legacy slip term cannot be added without a separate charged/neutral momentum
and energy closure identifying nonoverlapping losses. Physical shear heats the
gas; later gas-wall conduction transfers heat to the liner.

## Reproduced defects and chosen corrections

**Gauge-dependent electrical power.** Absolute electrode potentials polluted a
small physical voltage difference with an arbitrary large offset. In plain
terms, changing the voltage zero could change calculated power. The solver now
subtracts the first electrode reference before solving and calculating power;
it restores the offset only for displayed absolute potential. A 100 MV gauge
shift regression failed before and passed after. This removes the unphysical
offset instead of loosening the power tolerance.

**Axis-cell torque quadrature.** Arithmetic radial centres split a cell into
unequal q intervals. For smooth regular current `I(q)=a q`, the first-cell
torque coefficient became `-3 B I_outer h²/8` instead of the exact
`-B I_outer h²/4`: 50% excessive forcing per first-cell inertia. In plain terms,
the central gas received too much braking torque. The corrected electrical
points are `sqrt((r_inner²+r_outer²)/2)`, the q midpoint, rather than the
arithmetic-r midpoint. Each half-link coefficient is now `-B Delta q/4`, so
the full-cell torque integrates linear I(q) exactly. These same coefficients
define motional EMF, preserving the power adjoint. Changing torque alone would
break electrical/mechanical conservation; increasing resolution alone retained
a 4.72% rotation-refinement failure.

The manufactured axis regression checks all cells at 4 and 16 radial cells,
with zero and variable rotation, using independently supplied node potentials
and axial electrode currents. Its corrected fixture fails with the old source
and passes with the correction. An initial fixture had an extra Delta q in
its axial-supply voltage; that test-authoring error and its failed run are
retained, not counted as production-defect evidence.

Production and FiPy now use different physical radial sample locations. The
independent analyzer reconstructs each operator at its own locations and
interpolates FiPy potential in physical radius before comparison. Unmatched
index differences remain diagnostics. No acceptance threshold is relaxed.

**Regular-axis shear representation mismatch.** The fresh torque-corrected
study still differed by 4.719% in rotation between 32 and 64 cells. Thus the
electrical defect was real but was not the dominant cause in this case.
The existing v65 shear operator integrates a constant-torque point profile
exactly; the new coupled model supplied q-cell states instead. With constant
mu/rho and `Omega=A+B q`, the physical equation requires acceleration
`8 (mu/rho) B` in every cell. Applying the old operator to those cell values
instead gives `(1+sqrt(2)) (mu/rho) B` in the first row: only 30.2% of the
required response. In plain terms, the central gas shed its shear too slowly.
Conservation still passed because reciprocal torques alone do not guarantee
accurate local dynamics.

The coupled path now explicitly selects a volume-coordinate shear scheme:

```
rho q dOmega/dt = d/dq(4 mu q² dOmega/dq)
T_face = 4 pi L mu_face q_face² DeltaOmega/Deltaq_centres
R_half = |q_face-q_cell|/(4 pi L mu_cell q_face²)
```

The two half resistances add; exactly the same halves partition physical shear
heat. This positive reciprocal finite-volume operator gives the correct
all-cell polynomial acceleration, preserves local/global work and heat, and
uses the same coordinate as the coupled storage and species work. A moving-wall
analytic transient checks the direct and zero-mass-flux coupled updates;
actual FiPy independently assembles that transformed PDE. A permanent negative
control reproduces the old representation mismatch. The default standalone
integrated-resistance option remains unchanged, retaining its exact Couette
property. This isolates the coupling correction instead of replacing a
qualified method globally or fitting torque/viscosity to make the result pass.

## Constitutive evidence and limits

Neutral lithium uses the published non-isotope-resolved theoretical fits
`mu=3.14e-8 T^0.863 Pa s` and `kappa=1.398e-4 T^0.863 W/(m K)`, 100–3000 K.
[Bouledroua 2006](https://www.jspf.or.jp/JPFRS/PDF/Vol7/jpfr2006_07-217.pdf).

Neutral argon uses the pinned Mutation++ v1.0.5 Ar–Ar Q22 table, 300–20000 K,
with its explicit pi and square-angstrom conversion, linear interpolation and
39.948 u mass. The first Chapman–Enskog relations are
`mu=(5/16) sqrt(pi m kB T)/Q22`, `kappa=15 kB mu/(4m)`.
The raw table and library unit/interpolation sources are pinned and retained.
The independent checker parses the raw XML and compares the TypeScript
transcription and SI formulas. This is a data/formula adaptation; the full
Mutation++ transport library is **not executed**.
[Pinned source](https://github.com/mutationpp/Mutationpp/tree/v1.0.5).

The source's estimated 5% collision-integral accuracy is not a confidence
interval or plasma-model uncertainty. Neither fit solves isotope-mixture
transport, ionization or electron conductivity. The Li6/Li7 study applies one
non-isotope-resolved Li property law to both isotopes. Changing species masses
does not obtain new material data. Extrapolation is rejected. Property-domain
endpoints are not certified nonlinear-solver operating points: an out-of-domain
trial can reject a step even when a smaller timestep could remain admissible.

The coupled backend assumes a common Omega(r), extruded along z. It sums the
actual r-z cell torque and heat into radial gas cells using that same Omega;
this preserves work. Axial gas energy/momentum, separate ion/electron energies,
Hall radial force, self-consistent electrical conductivity, chemistry, acoustic
flow, full Maxwell–Stefan diffusion and outlet collection are absent.

## Acceptance evidence

The [accepted payload](../scientific/centrifuge-v44/current66/studies/final-accepted/)
contains 39 hashed files, including raw pinned source/licenses, electrical and
coupled arrays, independent audits, command logs and exact source receipts.
The tested 711-input guest snapshot is
`ad08c16e86729d6b94190e349de1c4117bf37844dca74540c32767569f1b517c`.
All 709 available host inputs match; the two explicitly recorded older gate
runners exist only in the retained guest. Guest inputs were verified before
and after execution. The prospective [protocol](../scientific/current-v66/PROTOCOL.md)
and all failed/coarse runs remain preserved under `studies/review-1/` and in
`scientific/fixes-v43/` receipts.

| Finest coupled endpoint comparison, at 1 ms | Difference | Unchanged gate |
|---|---:|---:|
| Radial rotation, 32 vs 64 cells / initial peak | 0.008131% | 2% |
| Radial gas temperature / accumulated temperature excursion | 0.01698% (0.01583 K) | 2% |
| Radial species CDF | 0.000004692 | 0.005 |
| Time rotation, 32 vs 64 steps / initial peak | 0.09772% | 0.5% |
| Time gas temperature / accumulated temperature excursion | 0.6193% | 1% |
| Time species CDF | 0.00003277 | 0.005 |

All six endpoint gates pass. The rotation spatial difference falls from 4.719%
to 0.008131% after the shear correction. These are finite-reference differences,
not absolute continuum-error bounds. The six gates compare the final 1 ms
state; they do **not** establish maximum error throughout the early transient.
The axial electrical grid remains at 4 cells and the liner at 8 cells.

The independent stdlib checker reconstructs **all 448 accepted steps across
12 runs**, with positive species/temperature, accepted species continuity,
local inertia, local/global angular momentum, centrifugal work, physical shear
heat, separate numerical losses, gas/solid energy and total ideal-gas/solid/
coolant entropy. All pass the declared natural-scale plus explicit storage-ULP
gates. All **nine deliberate corruptions are rejected**, including wrong
inertia, torque, invented heat, changed dynamic scales, the wrong shear scheme
and incomplete trajectories. The checker imports no production code.

The electrical study passes **362 gates across 16 cases** against actual FiPy.
Finest worst normalized potential difference is 0.00549%; finest worst work
difference is 0.00541%. Charge residual ratios are at most 3.37e-11 for the
kernel and 3.02e-14 for FiPy. These tests do not predict conductivity or validate
an experimental discharge. Six actual FiPy q-momentum manufactured transients
pass, with maximum absolute angular-speed error 1.71e-14 rad/s. All 29 neutral
transport comparisons pass; maximum relative formula difference is 1.12e-16.
In `transport-data.json`, the source `lines` metadata refers to the web-tool
rendering, not physical raw-file lines; the pinned raw XML Ar pair is at
lines 768–777. The SHA256 and independently parsed pair identify the source.

Exact final checks, all exit zero in the offline safe-dev guest:

- `npm test`: **1226 tests pass**, zero skipped or failed.
- `python -m unittest discover -s scientific/current-v66 -p test_analysis.py`:
  **5 tests pass**, including stale hashes, case identity and collocation.
- `run_study.py`: electrical FiPy/reconstruction and raw-data transport checks.
- `reference_q_momentum.py`: **6 manufactured FiPy cases pass**.
- `coupled.ts`, `check_coupled.py`, `coupled_convergence.py`: 12 complete
  histories, all-step independent audit and all six endpoint gates pass.
- `npm run typecheck`, `npm run build`, `npm run check:site`,
  `npm run check:assets`: all pass.

The exact controller command was

```
python3 scientific/fixes-v43/control.py --timeout 900 current66-final-volume -- \
  /work/home/thermal-v53-venv/bin/python scientific/current-v66/final_gate.py \
  /work/home/current66-final-volume
```

The final folder is write-once; use a new label/output directory when
reproducing. FiPy 4.0.3, SciPy 1.17.1 and NumPy 2.4.6 ran in the retained
safe-dev environment. The pinned XML must be present at the recorded guest
data path; its complete copy and checksum are in the accepted payload.

Independent final evidence reviews:
[coupling](reviews/v66-coupling-physics.md),
[electrical](reviews/v66-current-reference.md),
[transport](reviews/v66-transport-data.md).

This qualifies a conditional numerical foundation, not experimental first-order
accuracy. Full shared-time transient refinement, axial/liner refinement and
the historical v65 profile/pressure challenges remain unresolved. The public
simulator has not been switched to this backend, deployed or browser-verified
by this change. Promotion requires those observations and implementation gates;
passing conservation and endpoint refinement alone does not authorize a claim
of calibrated Marathon behavior.
