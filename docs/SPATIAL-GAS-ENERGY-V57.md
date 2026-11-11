# Spatial gas-energy transport reference

This implements a separate **nonrotating, pure monatomic, low-Mach radial
gas/solid reference**, not a replacement for the live rotor energy closure.
It resolves thermal expansion, pressure work, gas conduction and solid
enthalpy, using a published approximate accommodation boundary condition.
Numerical verification, necessary regime screens and device validation are
reported separately. No accommodation coefficient is calibrated to Marathon.

## Execution path and root cause

The production path is `simulateFuelOperation` in `src/fuel-operation.ts` →
`advanceFuelThermal` in `src/fuel-thermal.ts`. Gas is one fixed-number
`3NkB/2` reservoir; only the solid has a radial temperature field. Species
redistribution in `src/fuel-transport.ts` has no local thermal-energy flux.
The [v56 assessment](GAS-REGIME-V56.md) showed that converging the solid
cannot establish gas uniformity or justify an independently prescribed film.

Adding fixed-density `rho Cv dT/dt = div(k grad T)` cells would create
unresolved ideal-gas pressure gradients. Simply replacing Cv by Cp would
instead give the wrong total energy for a sealed vessel. In ordinary
terms: heating changes both temperature and the space occupied by each
parcel; the parcels do work on one another even though the vessel stays rigid.

The smallest coherent fix is a material-shell reference with fixed particle
numbers and evolving volumes, before coupling temperature back to moving
species and rotor angular momentum. The latter needs local enthalpy
carriage, pressure/work and mechanical-energy ownership throughout that
execution path. Production source, public defaults and deployment are unchanged.

## Model and discretization

For material shell i, Ni is fixed, Vi varies, and

```
p(t) = kB sum(Ni Ti) / Vtotal
Vi = Ni kB Ti / p
Ui = (3/2) Ni kB Ti
dUi/dt + p dVi/dt = Q_in − Q_out + source_i
```

The rigid, impermeable cylinder has symmetry at r=0 and insulated ends.
Shell edges follow cumulative Vi; radial velocities follow edge motion.
There is no rotation, gravity, convection driven by body forces, species
diffusion, ion/electron energy, ionization, chemistry, radiation, phase
change or acoustic-wave propagation. Thermally induced radial motion is
included; the gas is not permanently motionless.

This is the pressure-work content of the low-Mach enthalpy equation, whose
thermodynamic pressure is spatially uniform but may evolve in time;
[Nalu's derivation](https://nalu.readthedocs.io/en/stable/source/theory/lowMachNumberDerivation.html)
provides an existing-code theoretical reference. Nalu itself was not run.

Backward Euler uses the exact algebraic identity

```
Cv_i ΔTi + p_new ΔVi = Cp_i ΔTi − Vi_old Δp
```

and a tridiagonal conduction operator with one pressure rank-one term.
SciPy's LAPACK-backed banded solve plus a rank-one update solves increments,
avoiding subtraction of large absolute-temperature storage terms. Nonlinear
iteration updates transport, mesh, interface resistance and exact solid
enthalpy secants. Shared face heat is equal and opposite. Because
sum(ΔVi)=0, pressure work cancels globally without an invented heat source.

Gas representative radii are RMS shell radii, including the axis cell;
solid representatives are geometric centers. Exact cylindrical volumes
and logarithmic half-shell resistances are used. These are finite-volume
temperature approximations, not exact point temperatures. Uniform gas
heating has total Cv; mean-zero spatial modes relax with Cp in the
small-perturbation limit. Both behaviors are tested independently.

`pressurePa/referenceK` specify the **inventory reference state**. For
nonuniform or hotter initial temperatures, actual initial pressure is
computed from the stated Ni and temperatures and can differ. For example,
uniform800K with a1000Pa/500K inventory starts at1600Pa; the smooth
500–800K material profile starts at1200Pa. No pressure is silently reset.

## Accommodation boundary and data

The first-order Smoluchowski approximation, with the viscosity-based
mean-free-path convention, is

```
lambda_mu = mu/p * sqrt(pi kB T/(2m))
Pr = cp_mass mu/k
zeta = (2−alpha)/alpha * [2 gamma/(gamma+1)] * lambda_mu/Pr
gamma = 5/3; cp_mass = 5kB/(2m)
T_gas,outer − T_solid,surface = zeta * q_out/k
```

[Hadjiconstantinou2006, Eq8–11](https://web.mit.edu/ngh/www/PhysFluids_18_111301.pdf)
states this convention and distinguishes the outer hydrodynamic temperature
from the kinetic wall layer. The model is approximate even at alpha=1;
more accurate jump coefficients depend on intermolecular and surface
scattering models. Transient use requires evolution slow compared with
molecular relaxation. This is not a transitional/free-molecular solver.

The total interface resistance is gas half-shell + zeta/(A k_gas) + solid
half-shell. Properties are evaluated at adjacent cell states, an explicitly
discretized approximation, not a solved kinetic layer. Surface temperatures
are extrapolated using those half-shell drops. Alpha=0 insulates;
alpha=1 retains finite jump resistance. The same heat enters the solid
that leaves the gas. The external cooling film, if enabled, is separately
prescribed and includes its solid half-shell resistance.

The v56 single incident-Maxwellian reference is **not** a cap on this
continuum jump conductance: the incident distribution and the temperature
being related are different. In this convention the classical jump law
gives `h=4 kB Gamma alpha/(2−alpha)`, whereas the single-Maxwellian incidence
linearization gives `2 kB Gamma` at full accommodation. Confusing those
closures would introduce a factor-of-two error. Neither is a universal
device heat-transfer limit.

Data used:

- Pure4He viscosity and conductivity: [Hurly/Moldover2000 TableA1](https://nvlpubs.nist.gov/nistpubs/jres/105/5/j55hur.pdf),
  anchors300,500,1000,2000K. Sparse log interpolation is explicitly
  approximate; its error is unquantified. No extrapolation or mixture fill-in.
- Li sensitivity: [Bouledroua2006](https://www.jspf.or.jp/JPFRS/PDF/Vol7/jpfr2006_07-217.pdf)
  dilute monatomic fits over100–3000K;7u is an explicit mass proxy.
  No isotope-resolved validation, condensation or surface chemistry is modeled.
- Solid tungsten: existing NIST Shomate Cp/enthalpy and Tolias conductivity,
  fixed density19250kg/m³,300–1900K, as in the previous wall reference.
- Near-ambient He/304SS conditional scenario: alpha=.46 with .44/.48
  sensitivity, from machined untreated surfaces around298K in Trott2011
  [DOI10.1063/1.3571269](https://doi.org/10.1063/1.3571269), with the
  [Sandia measurement summary](https://www.osti.gov/servlets/purl/1706516).
  This does not describe a clean surface, tungsten, Li or hot hardware.
  Frozen nominal304SS properties rho7900kg/m³,Cp477J/kgK,k14.9W/mK come
  from [NASA TPSX](https://tpsx.arc.nasa.gov/Material?id=57); that database
  does not supply their uncertainty. The300–300.1K scenario is not an
  experimental reproduction or a variable-property steel calibration.

For hot helium/tungsten and Li/tungsten, alpha=.1,.5,1 are **unknown-parameter
sensitivity cases**, not inferred material coefficients.

## Independent verification and qualification boundaries

An independent [actual FiPy](https://pages.nist.gov/fipy/en/stable/USAGE.html)
4.0.3 reference assembles the linearized fixed-domain equation

```
n0 Cp dtheta/dt − dp'/dt = div(k0 grad theta)
p' = n0 kB volume_mean(theta)
```

with independent coefficients and the pressure response. It imports no
nonlinear solver or its matrices. A separate exact insulated cylindrical
J0 mode, using the first zero of J1, checks the Cp spatial decay rate.
The incorrect Cv rate is a negative control. Neither comparison claims
independent finite-amplitude CFD agreement.

The independent all-state auditor imports neither model nor FiPy. It
reconstructs Ni, ideal-gas geometry, cell first laws, pressure work,
source-attributed conductances, surface extrapolations and entropy:

```
ΔSgas = sum Ni kB [1.5 ln(Tnew/Told) + ln(Vnew/Vold)]
```

Solid entropy is integrated from Cp/T; coolant entropy and the reduced
source budget are included. Gas-row and solid-row roundoff/relative
budgets are separate, so massive solid storage cannot hide a bad gas row.
Four deliberately corrupted records test missing interface heat, shell
work geometry, negative particle numbers and fictitious Cp storage energy.

Regime diagnostics include radius-based Kn, physical thermal-gradient Kn
(including the wall heat-flux gradient), moving-face Mach, a viscosity
stress-time proxy times temperature rate, and radial acoustic time times
temperature rate. All states, including initial spatial gradients, are
screened. Initial temporal rates are unknown and represented as zero
because no previous interval exists; a discontinuous startup is not
physically resolved by that value. These sampled, heuristic necessary
screens are not proofs of continuum or low-Mach accuracy. Numerical cell
width is not used as a physical gradient length. All physical-qualification
flags remain false.

## Results and remaining work

The main campaign has 30 cases and 9,760 accepted steps, plus four controlled
refinement runs. All histories are retained, including initial states;
the independent auditor checks all accepted states, not sampled residuals.

### Verified numerical behavior

- Nonlinear→FiPy maximum temperature differences for initial perturbations
  .1,.01,.001K are2.8343e-6,2.8346e-8,2.8342e-10K. The quadratic
  contraction is consistent with the expected linearization error.
- Exact mean-zero cylindrical decay has maximum volume-weighted RMS error
  divided by the.001K initial mode coefficient of.07458%,.02463%,.009803%
  for16,32,64gas cells. Incorrect Cv diffusion gives6.67684% on the finest
  run. This is a specific discriminating test, not a full kinetic comparison.
- Uniform heating, zero accommodation, finite full-accommodation jump,
  fixed Ni, rigid volume, nonzero local/canceling global pressure work,
  material endpoints and external cooling/bath entropy pass regressions.
- The finest smooth run has maximum gas-row residual2.70e-14J, solid-row
  residual2.02e-11J and cumulative energy residual−1.37e-10J against9.51J
  cumulative interface exchange. Passive entropy passes its independently
  reconstructed roundoff budget. These are actual measured residuals;
  conservative audit tolerances are recorded separately.
- All four corrupted-record controls are rejected by the corrected auditor.

### Smooth finite-gradient case: bounded convergence success

The smooth material-coordinate initial profile is
`T(a)=500+300(1−a)^2`, where a is reference enclosed particle fraction;
shell-average values are initialized analytically. Its continuum wall
temperature is500K and its wall gradient is zero, matching the initially
uniform500K solid. This is a different initial-value problem from the
abrupt temperature step; it does not retroactively fix that case.

Uniform radial gas/wall meshes and backward Euler were jointly refined
from16/4cells,80steps to512/128cells,2560steps over80ms. The last joint
comparison still missed the1% heat-flux gate at1.128%. Controlled probes
located the maximum error at62.5microseconds:

- Halving dt at fixed256gas/64wall cells produced1.156% peak-normalized
  power difference; the next halving reduced it to.7742%.
- Doubling only the wall cells changed power by1.50e-7of peak, ruling out
  wall resolution as the dominant cause of this error.
- Initial finite gas-cell averages create a small nonzero wall-flux
  reconstruction even for the compatible smooth continuum profile;
  its residual is spatially refined and remains reported.

The final independently audited run uses512gas/128wall cells and5120steps
(dt15.625microseconds). At **every shared sample time, including t=0**:

| Comparison | Max reconstructed gas profile difference | Max extrapolated surface difference | Max power difference / fine-history peak | Max cumulative exchange difference / fine final exchange |
| --- | ---: | ---: | ---: | ---: |
| Spatial256/64→512/128cells, both5120steps | .18092K | .001865K | .60404% | .0002883% |
| Time2560→5120steps, both512/128cells | .031630K | .002465K | .79818% | .010870% |

The1% comparison gate normalizes temperature by the300K initial contrast,
power by the fine run's peak and integrated exchange by the fine final
exchange. Pressure also must agree within1%; observed maximum relative
pressure differences are4.27e-7(spatial) and1.77e-5(temporal).
Instantaneous relative power errors near the zero-flux initial condition
are ill-conditioned and retained separately; they are not claimed below1%.
Gas profiles use piecewise-linear interpolation through RMS cell
representatives at101fixed radii, with constant endpoint extension.
That reconstruction is not an exact continuum boundary temperature;
separate interface extrapolations are checked above.

The finest smooth run has sampled Mach2.58e-4, maximum thermal-gradient
Kn2.54e-4 and acoustic-time×temperature-rate.001419. These do not exclude
the chosen nonrotating low-Mach continuum reference under the necessary
screens; they do not calibrate its alpha, property interpolation or device.

### Retained failures and missing physics

The abrupt uniform800K gas/500K wall problem still **fails whole-transient
convergence** on the original tested grids. Joint32→64cell refinement has
55.0K maximum reconstructed-profile discrepancy and44.6% worst pointwise
relative power discrepancy; fixed64cell timestep160→320 refinement has
17.0K and26.5%, respectively. Endpoint80ms comparisons below1% do not
qualify its startup. Its gradient-Kn and acoustic-rate screens also fail.
Smaller dt does not repair a discontinuous physical forcing assumption.

At the10Pa inventory reference, helium radius Kn≈.03017 requires further
slip/jump or kinetic assessment. The Li sensitivity has unavailable
surface-specific accommodation, theoretical isotope-proxy properties and
an acoustic-rate screen failure. Neither is promoted to physically qualified.
The ambient300–300.1K He/304SS example passes necessary screens, but its
constant solid properties and approximate jump coefficient mean it is
still a conditional calculation, not an experimental validation.

Next integration requires multicomponent mass and enthalpy fluxes,
rotation-dependent pressure balance and consistent species/rotor work.
For abrupt forcing, an acoustic/compressible or kinetic startup reference
may be necessary before taking a post-acoustic low-Mach limit. The present
model is available for those future comparisons without changing the
current public simulator or claiming all its gases are supported.

## Corrections found during implementation

1. **Upper-temperature domain error.** A forward finite-difference Cp probe
   evaluated1900.00001K from a valid1900K tungsten state. Simply, the
   solver stepped outside its data just to measure a slope. Analytic NIST
   Cp at coincidence, retaining exact enthalpy secants elsewhere, fixes
   the real domain error. This uses the specified material derivative;
   extending the data range or excluding1900K would be unjustified.
   A failing1900K equilibrium regression was preserved before correction.
2. **FiPy coefficient rank error.** Passing a raw per-cell NumPy array to
   TransientTerm made FiPy interpret it as a tensor coefficient. Simply,
   spatial values were being mistaken for vector components. A mesh-bound
   scalar CellVariable supplies the intended spatial coefficient. This
   is the library's native representation, rather than modifying FiPy or
   substituting the nonlinear model's matrix. An actual-FiPy equilibrium
   regression failed first and passes after the correction.
3. **Geometry audit roundoff.** Differencing squared cumulative radii
   loses relative precision in thin outer cells. The original checker
   budget scaled only with local stored energy, omitting uncertainty in
   reconstructed volume. Simply, it demanded more precision than the
   stored cumulative radii can provide when differenced. A propagated volume bound
   `16 eps pi L (r_left²+r_right²)` is now carried through EOS, work and
   pressure-identity checks. A frozen actual512cell failure has original
   budget ratio1.40034; the corrected bound accepts representational
   roundoff while a one-part-per-million edge corruption still fails.
   This fixes the checker, not the gas solution; it avoids an arbitrary
   global tolerance relaxation. Original audit failure and new regressions
   are retained.
4. **Study reporting error.** A NumPy boolean in a convergence record was
   not JSON serializable. The scientific histories had completed and were
   preserved before serialization failed. The report now emits a native
   boolean. Explicit analyze-only replay requires all four matching
   configurations; it never silently substitutes a partial study. The final
   gate replays that exact reporting path, avoiding needless recomputation
   of unchanged physics.
5. **Campaign syntax error.** The first campaign reused `gas` for both
   initial temperature and gas identity, producing a repeated keyword.
   Initial temperature is now named `gasK`, leaving `gas` for the physical
   species. The complete campaign runs and final compilation checks cover
   this distinction; no production API was changed.

## Independent reviews and reproducibility

[Energy/thermodynamics review](reviews/v57-energy-physics.md),
[boundary/source review](reviews/v57-boundary-physics.md) and
[integration review](reviews/v57-integration.md) cover separate scopes.
Independent agents authored the thermodynamic and exact-mode auditors and
regressions. Actual code execution was parent-owned in Apple safe-dev;
there was no claim of a second independent VM campaign.

All project execution uses the existing safe-dev project
`/private/tmp/mass-spinner-marathon-v35-final`, copied source
`/work/home/fix-v43-source`, offline. The existing reference environment
`/work/home/thermal-v53-venv` supplies FiPy4.0.3, NumPy2.4.6,
SciPy1.17.1 and matplotlib3.11.2; no dependencies or environments were
modified. Each command explicitly transfers reviewed source changes and
verifies hashes before and after execution.

Durable results and final checks are linked from
[`scientific/centrifuge-v44/gas57/`](../scientific/centrifuge-v44/gas57/).
The original24case export is preserved separately from the final30case
campaign and four controlled refinements. Source snapshots differ as
auditors/reporting evolve; every receipt records its exact manifest.
The nonlinear model stayed unchanged after its analytic-Cp correction.

The final gate `python3 scripts/run-final-v44.py gas57` ran once through
the trusted host controller. Its manifest of 605 tested source files is
`b1aaf70edc67986d7209bf43926a7045488317682fdbcbd3cbd697f8dbe7d2d9`.
Two historical baseline scripts exist only in the guest and are disclosed
in every controller receipt. The host orchestration script is trusted
transfer/control code, not guest scientific code; its frozen copy is
identified separately in the export.

All 13 final commands exited zero:

| Check | Result |
| --- | --- |
| `npm test` | 1,139 passed; zero failed/skipped |
| `npm run typecheck` | passed |
| `npm run build` | passed |
| `npm run check:site` | passed |
| `npm run check:assets` | passed |
| `node --import tsx scientific/fixes-v43/verify-release-worker.mjs` | passed |
| `node --import tsx scripts/verify-fuel-release-v44.mjs` | passed |
| `python3 docs/reviews/v42-collision-data-probe.py` | passed |
| `/work/home/gas-regime-v56-venv/bin/python tests/test_gas_regime_v56.py` | 16 passed |
| `/work/home/thermal-v53-venv/bin/python tests/test_gas_energy_v57.py` | 15 passed |
| `/work/home/thermal-v53-venv/bin/python tests/test_gas_energy_geometry_v57.py` | 3 passed |
| `/work/home/thermal-v53-venv/bin/python -m compileall -q scientific/gas-energy-v57` | passed |
| `/work/home/thermal-v53-venv/bin/python scientific/gas-energy-v57/diagnose.py /work/home/gas-energy-v57-studies-5 resolved --analyze-only` | passed |

The release manifest of 151 files is unchanged from v56:
`64f89013eb53c7f9a08122f646707a812522fa7df3529fd0e11fcceba07caf7e`.
No deployment or browser verification was performed for this standalone
scientific addition. FiPy emits a NumPy-private-namespace deprecation
warning; its actual solver checks pass, and no dependency code was patched.

Main packet SHA256:
`d2d4fec86e7b45a1c4d6d88a325de191156251e4cc96faddd0dbdf858fbcda8a`.
Main results SHA256:
`91755ba914e0df83a0c7472fa59429a24785149b177a5d7c426137618c4326cb`.
Controlled refinement results SHA256:
`9a25a776d469bf4e2ae0cca4d23f0c013a619309371d1ae23ad9ee1f618aadd4`.
Corrected independent thermodynamic auditor SHA256:
`1b119e2984832baec76de1a35ce387f4db56be299af1b9a8fdc0f647b5cf1489`.

The [results figure](../scientific/centrifuge-v44/gas57/studies/findings.png)
and [SVG](../scientific/centrifuge-v44/gas57/studies/findings.svg) separate
smooth gas cooling from the explicitly unqualified abrupt-start sensitivity.
Full histories, audit outputs, failed-control inputs, frozen code and final
logs are retained. The earlier three-control diagnostic history remains
in the guest; all four later controlled histories are exported in full.

The final export contains 52 payload files, 220,202,423 bytes; every payload
hash was verified before writing and checked again afterward. Export
manifest SHA256:
`df70ba558f11b2ff698577d46230bdd5d68f6fabef94e48c5c1e81291b087b8d`.
Frozen scientific source matches current source; there is no drift in
the available files in the tested manifest. The PNG was reopened and visually
inspected after export. Documentation/review updates after the final gate
do not change the tested scientific or production code.
