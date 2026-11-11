# Rotating-mixture spatial energy, v58

The historical hot-wall timestep limitation below is addressed by
[v59](HOT-WALL-TIMESTEP-V59.md), with denser independent analytic controls,
event-relative substeps and refinement through 8,192 nominal intervals. Original
v58 measurements remain unchanged in this report.

This adds an opt-in live **experimental overdamped pressure-relaxation model**.
It is not a validated multicomponent centrifuge fluid calculation. The prior
isothermal, lumped-gas and spatial-solid options retain their semantics.

## Execution path and reason for the change

`fuel-centrifuge-ui.js` → `worker.ts` → `simulateFuelOperation` →
`advanceFuelCoupledStep` + `advanceFuelMixtureThermal` → accepted checkpoints →
`sampleFuelTransport` → plots, species tracers and diagnostic surfaces.

Previously, accepted species distributions changed neutral inertia, but every
gas cell used one scalar temperature. The v57 standalone reference used moving
material shells with uniform pressure. That pressure assumption cannot be
transferred to a rotating gas, which requires centrifugal pressure gradients.
Simply attaching its temperature array would also omit the energy carried by
species moving between cells.

In plain terms, moving particles carry heat and change the gas's rotational
energy. A single gas temperature erased where those transfers occurred.

The bounded fix retains fixed equal-volume radial cells, evolves their conserved
internal energies, and uses the same accepted species transfers in their energy
and rotational-work equations. This keeps live rendering and continuation tied
to the solver's actual state without introducing a separate visual trajectory.

## Model and discrete invariants

For species s, local common temperature T, prescribed D and rigid angular speed Ω:

```
J_s = −D [∇n_s + n_s∇ln T − n_s m_s Ω²r/(kB T)]
U_i = (3/2) kB (N_light,i + N_heavy,i) T_i
p_i = kB (N_light,i + N_heavy,i) T_i / V_i
```

This is **pressure relaxation**, including net radial mass flow under an assumed
effective radial damping. D is not identified with a measured binary diffusion
coefficient. There is no barycentric radial momentum equation.

The positive SG solve operates on n_s T. Its face potential uses trapezoidal
reciprocal temperature. Signed face transfers are reconstructed from cell
continuity, rather than subtracting large opposing near-equilibrium rates.
Both species inventories are conserved with reflecting axis and outer wall.

Species carry enthalpy, not internal energy alone:

```
Q_species,face = (5/2) kB T* Σ_s ΔN_s,face
T* = TL TR ln(TR/TL)/(TR − TL)
T* Δ(1/T) = −Δln T
```

The equal-temperature limit is evaluated stably. With ideal monatomic entropy,
this enthalpy temperature matches the SG force and gives nonnegative face
entropy production. Backward-Euler concavity gives a finite-step entropy bound
for the reduced model. The independent audit checks that bound directly from
conserved U and N, including an arithmetic-mean negative control.

On the equal-volume coordinate y=r²/R², Fourier transport uses
`G_face = 4π L κ × face_index`. The outer gas half-cell resistance is
`1/(8π L κ n)`. Solid tungsten retains its cylindrical logarithmic resistance
and temperature-dependent enthalpy and conductivity. The gas and liner share
one equal-and-opposite interface heat; a prescribed film resistance remains in
series. This is not a mixture accommodation coefficient inferred from pure gas.

For signed outward species transfers and Δr²=R²/n:

```
ΔI_neutral = Σ_s,face m_s ΔN_s,face Δr²
W_face = (1/2) Ω_endpoint² Σ_s m_s ΔN_s,face Δr²
Σ W_face = W_redistribution
```

Half of each face's signed work goes into each adjacent gas cell. This work is
not added a second time as the old scalar redistribution deposit. Inward
redistribution can draw energy from the gas; a regression exercises that sign.
Slip and Ohmic heat are distributed by endpoint particle number, an assumed
deposition profile. Drag heats the innermost liner cell.

The two rotors evolve angular momenta with reciprocal friction, drive torque
and neutral drag. Their discrete identity is

```
ω1 ΔL = Δ(L²/(2I)) + (1/2)ω1² ΔI + (1/2)I0(ω1−ω0)²
```

The last term is numerical backward-Euler loss, retained in its own ledger and
excluded from physical heating. The extended global energy invariant is

```
K_ion + K_neutral + ΣU_gas + ΣH_liner + numerical_loss
 = initial_energy + drive_work + Ohmic_heat − coolant_heat
```

The nonlinear solve reevaluates species transport, rotor mechanics and heat
sources at the proposed endpoint temperature field. A quasi-Newton tridiagonal
solve with residual line search accepts only converged positive gas states and
solid states within the existing 300–1900 K tungsten property domain. Invalid
proposals reject; no temperature clipping, inventory renormalization, or silent
fallback to another physical model is used.

## Problems caught and why these fixes were chosen

| Problem | Technical cause / simple explanation | Fix and choice |
|---|---|---|
| Uniform-pressure reference incompatible with rotation | v57's material geometry enforces uniform pressure / spinning gas needs radial pressure variation | Separate fixed-volume pressure-relaxation closure; avoids falsely reusing a different model's qualification |
| Species motion lacked local energy ownership | Scalar gas state cannot represent enthalpy crossing a face / particles move heat between rings | Canonical cell U with species enthalpy and the same continuity transfers; avoids unverified visual temperatures |
| Rotor work could be counted twice | The old scalar redistribution deposit already equals centrifugal face work | Replace that deposit with its spatial allocation once; preserve the existing angular-momentum and mechanical ledger |
| Tiny heat could be accepted too early | Residual tolerance scaled with large background solid enthalpy / a small heat transfer disappeared under a large stored-energy tolerance | Resolve energy changes and fluxes, plus a propagated floating-point storage floor; avoids arbitrary absolute tolerances |
| Early spin-up was unresolved | Uniform time knots under-sampled the fast mechanical transient | Quadratic startup knots for this new option; conservation remains exact and time-refinement gates stay unchanged |
| Near-axis Fourier flux was inaccurate | Logarithmic resistance between RMS centers fits a log profile but underestimates quadratic radial-profile flux at the first face by about 9% | Use the finite-volume y-coordinate operator, exact for linear T(y); fixes the cause at practical live resolution instead of requiring hundreds of extra cells |
| Nonuniform-temperature free-energy diagnostic was misleading | Old diagnostic uses one isothermal reference T | Emit `freeEnergyJ: null` for spatial gas; retain legacy behavior elsewhere |
| Thermal plot and 3D state could disagree | Reference motion mode stayed selected after locating an accepted thermal plot | “Show in 3D” selects paused transport at the plotted time; temperature slice clicks open the thermal profile |

## State compatibility and interface

`thermal.gas = {conductivityWMK}` enables the new closure and requires an enabled
radial tungsten liner and an atomic pair. Molecular D₂ is rejected because its
internal modes are not modeled. Existing shared links default to lumped gas.

Accepted state stores cell internal energy and species inventories. Temperature,
pressure and per-species internal energies are derived from them under the common
temperature assumption. Separate species temperatures are not evolved.

Off-knot playback interpolates U, inventories, momenta and ledgers first, then
reconstructs temperature and pressure. Continuation rejects missing stale spatial
states, changed particle geometry, and tampered derived fields. Comparisons use
a common temperature color domain; local surface probes read accepted cells.

UI route: Marathon → Controls → Thermal model → enable temperature evolution →
Radial tungsten liner → Spatial mixture · experimental. Plots include gas/solid
temperature, species cell energy and local pressure. “Show in 3D” connects these
to the temperature field. Sliders recompute accepted physics through the worker.

## Independent validation and evidence

Four independent agents reviewed thermodynamics, rotor work, live state/UI,
and numerical validation. Source inspection is distinguished from executed
checks. All project/science execution used offline safe-dev; authenticated
deployment uses the existing separate VM with guest-owned credentials.

The audit suite includes:

- Direct reconstruction of species inventory, EOS, species energy, angular
  impulse, total energy and signed redistribution work at every accepted knot.
- Reduced-model entropy production and concavity bounds, including finite-step
  isolated gas, nonuniform-temperature transport and inward redistribution.
- Analytic nonisothermal centrifugal hydrostatics.
- A separately implemented direct-flux RK4 method-of-lines oracle with its own
  refinement; no production step, thermal or rotor helpers in that oracle.
- Whole-history spatial and time comparisons, including early spin-up and
  current interventions, rather than endpoint-only agreement.
- Actual FiPy Fourier-limit calculations plus an independent SciPy Bessel
  continuum mode. FiPy uses explicitly metric-corrected face coefficients to
  match the selected finite-volume operator; code agreement alone is not used
  as evidence of continuum accuracy or rotating-mixture physics.
- Legacy links, atomic batch scenario validation, off-knot restart, corrupted
  canonical state, temperature surface/probe/plot routing, and emitted-worker
  source identity.

Final executed evidence:

| Check | Result |
|---|---|
| `npm test` | **1,166 passed**, zero failed/skipped |
| `npm run typecheck`, `npm run build` | Passed |
| `npm run check:site`, `npm run check:assets` | Passed |
| Actual emitted-worker checks | 144 base transport cases, 20 operation cases, four spatial-solid cases, ten spatial-mixture cases, off-knot continuation and 49 map cells passed |
| Independent species/energy/entropy/work audit | 131 accepted knots; minimum entropy step 1.62047e−8 J/K; minimum face production −4.13e−31 J/K, within propagated roundoff |
| Independent nonisothermal hydrostatics | L1 errors 3.03318e−5 → 7.59873e−6 → 1.90205e−6 |
| Independent direct-flux RK4 | Production differences 1.592% → 0.822% → 0.418%; oracle self-refinement 9.95e−13 |
| Actual FiPy 4.0.3 and SciPy 1.17.1 | All six unchanged Fourier-limit gates passed; maximum cross-code difference 3.82e−11 K; 64-cell/1,024-step continuum difference 0.000459 K |

The coupled 0.2 s drive/cut/restart campaign compares 64 common times and radial
samples against 64 cells / 1,024 steps. Refining 8 → 16 → 32 cells reduced maximum
local temperature differences 1.006 → 0.432 → 0.144 K, pressure differences
0.557% → 0.245% → 0.0827%, and species-CDF differences
2.30e−4 → 5.37e−5 → 7.80e−6. Refining 256 → 512 timesteps reduced neutral-rotor
differences 2.451% → 0.821% and local temperature differences 0.352 → 0.119 K.
These are measured differences to a finite reference, not continuum error bounds.
The separate independent tests enforce the refinement gates.

For the Fourier limit, successive spatial differences were
0.00200270 → 0.000518905 K; successive temporal differences were
0.00240500 → 0.00120424 → 0.000602555 K. The analytic continuum error itself is
not monotone between 32 and 64 cells because spatial/time errors partly cancel;
separate grid and timestep differences, rather than that cancellation, establish
the observed orders. Maximum relative energy residual was 2.60e−14.

**Remaining interactive-resolution limit:** the distinct 1 s hot-wall UI default
(500 K gas, 1,000 K liner, κ=0.1 W/(m K)) is not qualified to a blanket 3% rotor
criterion. Across 64 common quadratic-time samples, 512 versus 2,048 steps differs
by 3.224% in ion speed, 1.915% in neutral speed and 1.923 K locally. At 1,024 steps
those differences fall to 1.109%, 0.659% and 0.645 K. These are refinement
differences, not established absolute errors. The solver remains available for
interactive exploration, explicitly experimental, rather than certified across
all settings.

The final command was:

```
python3 scientific/fixes-v43/control.py v44-final-mixture58 -- python3 scripts/run-final-v44.py mixture58
```

All **11 commands** exited zero. The exact tested snapshot has **614 inputs**,
SHA-256 `922333feac96383b933c4a451dcb7ac679b8e9589db0a2bf62194d8fed5c666e`.
Each command verified input hashes before and after. Two historical guest-only
baseline scripts remain explicitly accounted for; the host has the other 612.
The checked release has **151 files**, aggregate SHA-256
`02e4fbeac6f8320e21392d7df265ce03026f1b5ffc9cb2d640a8ba9921dae273`.
Worker `worker-19xXBGnN.js` has SHA-256
`40d3d8720448f92e6c40ae38c9e7fa6c7fcde21925404b4afea9556a1b63adab`.

Evidence is in `scientific/centrifuge-v44/mixture58/final/` and
`scientific/fixes-v43/v44-final-mixture58.*`. Raw final and earlier failed science
histories, plus FiPy inputs/results, were exported to
`scientific/centrifuge-v44/mixture58/studies/`; large JSON histories are gzip
compressed, with uncompressed sizes and hashes in `manifest.json`.
Earlier failures remain preserved, including uniform-startup errors and the
old near-axis Fourier result; they are not relabeled as qualified cases.

## Deployment and live browser verification

Cloudflare version **38868f6c-c6ea-4401-8a59-51460e98f16e** is serving at
[Mass Spinner](https://fieldwork-plasma-lab.fieldwork-plasma-lab.workers.dev/?level=2).
Provider status independently confirms 100% rollout to that version. The actual
deployed page loads `/assets/index-CvOXkJv-.js`, matching the checked release.

The supported in-app browser worked; no browser security policy was bypassed.
Live checks covered 1,440×960, 1,280×900, 390×844 and 320×740 viewports:

- Enabled the new mixture option and changed conductivity through real controls.
  At 10 ms, κ=0.1 → 0.001 changed mean gas temperature 790.1 → 625.1 K and
  ion/neutral speeds 52.93/26.35 → 53.49/26.93 m/s.
- Cut power at 10 ms and continued the accepted state. Final ion and neutral
  speed was 3.763 m/s; the angular-momentum plot reported maximum relative
  ledger error 4.368e−16.
- Inspected populated temperature, species-energy and pressure plots; keyboard
  sample inspection worked at 320 px. Mobile controls accepted κ=0.002.
  No document horizontal overflow was observed at either mobile width.
- Verified thermal “Show in 3D” from reference mode switches to paused accepted
  transport time, with the temperature field selected. Orbit, zoom, axial and
  cutaway camera controls visibly changed the actual 3D apparatus.
- Pinned A/B experiments showed four gas/liner curves at the same 10 ms time,
  including core temperatures 507.8 versus 780.1 K. Shared SI camera/color
  semantics were displayed; clearing the comparison restored a single view.
- Inspected the tungsten liner component's material and model scope. Shell
  occlusion depends on viewing direction; axial and orbit views were inspected.
  Numerical point-probe values are regression-tested; a pointer-picked surface
  probe was not independently exercised in this browser pass.
- Opened the copied scenario link and verified restored spatial-gas selection
  and κ=0.001. Links serialize inputs; they do not preserve intervention history
  or pinned runs. Export preserves the actual accepted run instead.
- Downloaded the actual live coast-run JSON. All **39 embedded physics-source
  digests** matched reviewed source. No console errors/warnings were returned
  in the inspected browser log.

Screenshots, DOM evidence, exported coast run, shared scenario and coverage record
are in `scientific/centrifuge-v44/mixture58/browser/`. Temporary viewport overrides
were reset afterward. The immutable test receipt correctly retains
`browserVerified:false` because it predates deployment; the separate browser
record supplies the later observed evidence. A supplementary isolated-VM HTTP
asset-byte verification received HTTP 403; no all-asset HTTP hash match is claimed.
The provider, deployed entry identity and actual worker-export source identity
are the verified deployment evidence.

## Limits and source basis

No radial inertia, acoustic response, local azimuthal momentum, axial flow,
extraction, Maxwell–Stefan transport, calibrated Soret/Dufour terms, chemistry,
ionization, distinct species temperatures, or optical emission is solved.
Rigid rotation and rapid local thermal equilibration remain assumptions.
Transport coefficients, effective radial damping and the wall film remain
prescribed. The earlier pure-gas v57 accommodation/property studies do not
calibrate a rotating mixture interface. Passing conservation and entropy gates
does not validate Marathon hardware or every slider configuration.

The reduced entropy law is an internal consistency check, not complete physical
kinetic entropy production: overdamped limits can omit entropy associated with
finite inertia in temperature gradients.

Primary references checked:

- [Cantera governing equations](https://www.cantera.org/stable/reference/onedim/governing-equations.html): species enthalpy transport and the mass-flux correction used in ordinary mixture formulations. This model deliberately differs from that barycentric formulation.
- [Lopez and Marconi, nonuniform-temperature Smoluchowski limit](https://arxiv.org/abs/cond-mat/0610069): background for overdamped pressure drift; not device validation.
- [Celani et al., anomalous thermodynamics](https://arxiv.org/abs/1206.1742): why reduced entropy consistency does not establish complete kinetic entropy.
- [NIST FiPy exponential convection example](https://pages.nist.gov/fipy/en/stable/generated/examples.convection.exponential1D.mesh1D.html): existing exponential-fitting numerical framework.
- [NIST tungsten heat capacity](https://webbook.nist.gov/cgi/cbook.cgi?ID=C7440337&Mask=2) and [Tolias tungsten properties](https://arxiv.org/abs/1703.06302): existing solid constitutive sources retained from v53.
