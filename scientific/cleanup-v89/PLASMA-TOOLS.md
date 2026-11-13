# Additional plasma and fluid tools: V89 decision

12 November 2026. Primary-source desk research and local evidence inspection;
no installation, scientific execution, VM changes or application changes.
Recommendations and proposed gates below are judgments, not executed results.

**Adopt no additional general PDE framework now.** The largest immediate return
comes from finishing comparisons with the already installed OpenFOAM and from
identifying the actual discharge boundaries. One additional specialist,
**LoKI-MC**, merits a bounded magnetic-electron-swarm pilot. It tests a specific
limitation of the existing electron tables; it is not a replacement discharge
solver or an experimental accuracy certificate.

## Evidence checked and root causes

Reopened `EXPERT-TOOLS-V88.md`, `MERIDIONAL-TRANSPORT-V86.md`,
`TIMESTEP-REFINEMENT-V87.md`, `TOOLING-REVIEW-V87.md`, and the V88 OpenFOAM,
electron and WarpX reference documentation. Also read the V86
`NEXT-ENERGY-CLOSURE.md`. These are retained repository reports, not independent
reruns of their underlying campaigns.

* V86 evolves conservative cylindrical mass, radial/axial momentum, angular
  momentum and total energy, with Newtonian stress/conduction and a coupled
  Hall-current source. Its 64 spatial field failures remain. V87 passes 28
  temporal gates for one fixed mesh/scenario; this does not clear spatial or
  apparatus qualification.
* V88 OpenFOAM checks constant-property conduction and low-Reynolds-number
  swirl decay. Those do not yet compare the actual V86 stress operator or
  compressible stress-work transport on identical inputs.
* V88 LoKI-B++ admits bulk quantities at eight exact unmagnetized Ar points.
  Its local two-term electron-neutral calculation supplies neither a qualified
  Hall tensor nor electron/ion/neutral energy balance. Ionization failures
  remain recorded.
* V88 WarpX has a useful spatial orbit/collision control, but most collision
  cases fail its canonical-angular screen. A joint particle/cell/time limit
  remains necessary before inferring transport.

The numerical problem is unresolved discretization/operator agreement. The
physical problem is incomplete energy and discharge closure: V86 puts all
Ohmic heat into one heavy temperature while microscopic conductivity and
ionization remain prescribed. Simply, resolving how the gas moves does not
tell us where the discharge puts its heat or loses it. A bigger framework
does not supply missing cathode, sheath, wall, radiation or injection data.

## Ranked decisions

| Rank | Tool/action | What it would establish | Cost and decision boundary |
|---|---|---|---|
| **Adopt now: existing tool** | Extend OpenFOAM Foundation 14 references | Independent neutral compressible momentum/energy/stress-work and wall-torque comparison | Existing installation; no new stack. Current V88 controls report maximum child RSS 185,928 KiB, which is not a forecast for the coupled case. |
| **Adopt now: existing tools** | Existing PETSc/FiPy/Julia and channel-resolved energy audit | Linear-system, conduction and conserved-source checks on identical equations | Keep their complementary scopes; adding a PDE framework is unnecessary for these checks. |
| **Pilot only: new specialist** | LoKI-MC v1.1.0 | Magnetic/anisotropic electron swarm response against the admitted B=0 LoKI-B++ baseline | CPU Monte Carlo, seed/sampling cost; no measured local runtime. First set a stop budget, then measure. |
| **Not needed now** | BOUT++/Hermes-3 | Drift-reduced magnetized multispecies plasma/neutral evolution | New framework, geometry and closure mapping; wrong default reduction for the unresolved inertial bulk-flow comparison. |
| **Not needed now** | Gkeyll | Continuum kinetic or multifluid reference if pressure anisotropy/nonlocal kinetics becomes the demonstrated limiting error | Phase-space resolution and new collision/boundary qualification; current WarpX controls should be finished first. |
| **Not needed now** | MOOSE/Zapdos | Electrostatic drift-diffusion-reaction/energy/Poisson system, useful for a separately specified discharge | New MOOSE/libMesh/PETSc application stack; no established drop-in match for V86 Hall/full-momentum equations. |
| **Conditional later** | PLASIMO or COMSOL Plasma Module | Integrated discharge/flow/thermal/sheath sensitivity with specified apparatus inputs | Commercial access/license and model mapping unestablished; no price or hardware estimate is claimed. |

### OpenFOAM: extend the adopted foundation

Foundation 14's `multicomponentFluid` is a compressible multicomponent solver
with PIMPLE coupling and optional source models. Its source is GPL-3.0-or-later.
This supplies established CFD infrastructure; the source description does not
establish a weakly ionized Hall/contact model.
[Tagged upstream class](https://github.com/OpenFOAM/OpenFOAM-14/blob/master/applications/modules/multicomponentFluid/multicomponentFluid.H).

Use existing neutral single-fluid machinery first, with identical
`rho, u_r, u_z, u_theta, T`, viscosity, conductivity, EOS, initial conditions,
stationary walls and reporting times. Check the compressible equations
`d_t rho + div(rho u)=0`,
`d_t(rho u)+div(rho uu+pI-tau)=f`, and
`d_t(rho E)+div[(rho E+p)u-tau.u-k grad(T)]=J.E`.
Keep swirl inertia, cylindrical axis regularity and stress-work flux. A
low-Re swirl eigenmode is not enough to check these terms.

Proposed admission sequence: run the existing V86 scalar/stress operators on
the V88 manufactured inputs; then a neutral compressible release; only then
add the same sealed electrical source. Freeze nested meshes, an active time
refinement, local/whole-state/increment norms, wall torque and total-energy
budgets before predictions. Require contraction and the existing relevant
physical gates, not merely low algebraic residuals. Inspect local peak heating
and electrode-adjacent gradients. Do not tune a turbulence model or artificial
transport to reproduce the optical measurements. This ordering isolates the
current demonstrated numerical gap with the smallest new implementation.

### LoKI-MC: the one distinct additional pilot

The current official README identifies **v1.1.0**, AC/DC electric fields, DC
magnetic fields, general anisotropic scattering, EEDF/velocity distributions,
swarm parameters, rates and collision-channel power. It requires prescribed
gas/state populations and cross sections. It runs a C++ threaded CPU executable.
The repository calls its license GNU GPL; the method paper specifies GPLv3.
Pin the exact source and inspect its license/manual before any future build.
[Upstream README](https://github.com/LoKI-Suite/LoKI-MC),
[method paper](https://www.sciencedirect.com/science/article/pii/S0010465522002739).

The original method paper describes a DC-electric-field release; magnetic
support must therefore be attributed to the current implementation and the
subsequent crossed-field work, rather than inferred from that old paper.
The magnetic study explicitly considers arbitrary electric/magnetic field
angles and benchmarks the solver.
[Authors' institutional publication record](https://researchportal.ulisboa.pt/en/publications/effect-of-the-magnetic-field-on-the-electron-kinetics-under-acdc-/).

The distinct question is whether a two-term, B=0 transport closure remains
adequate for the relevant `E/N, B/N, T_g` and collision regime. The general
local kinetic equation is
`d_t f - (e/m_e)(E+v cross B).grad_v f = C[f]`.
That equation explains why a magnetic Monte Carlo solver is useful; it does
not establish that every Coulomb/inelastic term required here is implemented.
Electron-ion/electron-electron collisions, growing ionization, excited-state
populations and frame conventions need explicit audit. Do not interpret an
electron-neutral swarm as the complete partially ionized Ar conductivity.

Pilot gates, prospective and unexecuted:

1. Match the already admitted LoKI-B++ Ar cross sections, populations,
   temperatures and exact field points at B=0. Keep cross-section version and
   angular/ionization scattering laws explicit. Compare mobility, diffusion,
   mean energy, rates and power; preserve a disagreement rather than forcing
   two physically different scattering models to agree.
2. Use an analytically solvable constant-collision-frequency crossed-field
   control. With signed electron charge, check the complete drift direction,
   Hall sign, `mu_perp/mu_parallel=1/(1+beta_e^2)`, the B=0 limit, and zero work
   from the magnetic force. This is a control equation, not a universal
   energy-dependent-cross-section conductivity formula.
3. Halve integration controls where applicable, increase sampling, use multiple
   independent seeds and report confidence intervals for each transport/rate
   observable. Rare ionization needs its own uncertainty bound. Propose a
   <=2% relative statistical uncertainty target for nonzero bulk coefficients;
   declare absolute scales separately for zero/rare channels before running.
4. Only then sample apparatus-relevant `E/N, B/N, angle, T_g`; verify kinetic
   relaxation lengths/times against flow/field gradients and the evolving
   microsecond clock. A homogeneous calculation cannot prove locality.

A proposed first resource cap is one safe-dev VM, at most four CPU threads,
two wall-clock hours and 1 GiB retained outputs, with an initial small-case
timing. This is a budget, not a promised runtime or upstream requirement.
If uncertainty cannot reach its gate within the cap, retain an inconclusive
pilot. LoKI-MC's purpose is to challenge the existing closure, not accumulate
another overlapping unmagnetized solver.

### Why the larger alternatives do not clear the present gates

**Hermes-3/BOUT++.** Hermes-3 evolves multispecies drift-reduced fluid models,
including collisions, friction, thermal exchange, reactions and sheath
components; it is GPLv3. Its main target is magnetized fusion edge transport.
[Project/paper](https://arxiv.org/abs/2303.12131),
[official documentation](https://hermes3.readthedocs.io/en/latest/).
Its equations documentation explicitly distinguishes neutral closures that
drop perpendicular inertia and provides limiter/regularization choices.
Those are model choices requiring justification, not harmless numerical
defaults. Our question includes radial inertial response and ion-neutral slip;
mapping these to a drift reduction requires ordering evidence first.
[Documented equations](https://hermes3.readthedocs.io/en/latest/equations.html).
Useful later as a bounded exchange/sheath reference after matching species,
geometry and rates; no immediate full migration.

**Gkeyll.** The official stack offers finite-volume multifluid moments,
continuum Vlasov-Maxwell/Poisson, and long-wavelength full-f gyrokinetics;
MPI/CUDA/NCCL are supported and the license is MIT.
[Capabilities/dependencies](https://gkeyll.readthedocs.io/en/latest/),
[license](https://gkeyll.readthedocs.io/en/latest/aboutAndLicense.html).
Its documented model collision operators do not by themselves supply an Ar
charge-exchange/ionization dataset.
[Collision models](https://gkeyll.readthedocs.io/en/latest/dev/collision-models.html).
A 2x3v continuum representation already multiplies every spatial cell by a
three-dimensional velocity grid and basis coefficients. That resource scaling
is arithmetic, not a benchmark runtime. Consider it only if an identified
non-Maxwellian/pressure-tensor error survives the existing particle tests;
gyrokinetic reduction additionally needs magnetization and scale ordering.

**MOOSE/Zapdos.** Zapdos documents log-density FEM plasma fluids with
drift-diffusion, electron energy and electrostatic potential, and its repo is
LGPL-2.1. MOOSE supplies parallel assembly and coupling infrastructure.
[Workshop](https://shannon-lab.github.io/zapdos/tutorial/index.html),
[upstream repository/license](https://github.com/shannon-lab/zapdos).
The generic drift-diffusion kernel is explicitly marked without a formalized
test on its own documentation page; framework reputation is not a per-kernel
verification result.
[Kernel documentation](https://shannon-lab.github.io/zapdos/source/kernels/DriftDiffusion.html).
Scalar `Gamma_s = +/- mu_s n_s E - D_s grad(n_s)` does not automatically
replace full inertial/Hall current coupling. Pilot only for a later, separately
specified sheath/discharge slice with tensor transport and matched boundaries.

**Commercial alternatives.** PLASIMO documents gas flow/temperature,
electron-energy/Poisson coupling, optional ion inertia, Boltzmann and hybrid
Monte Carlo models, radiation and wall processes. Its default DD premise is
a dominant background gas and user-supplied chemistry/rates.
[Vendor module description](https://plasma-matters.nl/modules/ddi/index.php).
COMSOL documents anisotropic electron/ion transport and local-energy/field
choices; its tensor option still requires zero-field mobility and B, and some
coefficients use Einstein relations.
[Transport inputs](https://doc.comsol.com/6.3/doc/com.comsol.help.plasma/plasma_ug_plasma.09.04.html),
[user guide](https://doc.comsol.com/6.3/doc/com.comsol.help.plasma/PlasmaModuleUsersGuide.pdf).
Neither is a data-free Hall-discharge oracle. Exact commercial license terms,
access, price and local resource cost were not established. Purchase or
migration is unjustified before the missing inputs are available.

## Actual missing inputs and release gates

Before apparatus claims, obtain independent evidence for:

* Cathode emitting footprint, current distribution and potential/sheath law;
  anode contact/sheath and external circuit/current/voltage histories. The
  source's hollow-cathode inner radius is not its emitting disk radius.
* Matched magnetic geometry, pressure/density, Ar charge/excited populations,
  electron/ion/neutral temperatures and relevant collision cross sections.
* Wall temperature/heat-transfer conditions, radiation loss and opacity,
  neutral feed/recycling/pumping and observation time history. Internal
  electron-heavy energy exchange does not remove external electrical power.
* Instrument response/emissivity tied to the modeled state, and fresh held-out
  observations if calibration/selection uses the existing velocity data.

The immediate physically justified diagnostic is the unchanged-solution
channel ledger `Q = |J|^2/sigma + s |J_perp|^2/sigma`: electron-collision
resistance and ion-slip friction, with zero scalar Hall dissipation. Check
it against the same discrete port work before evolving separate energies.
Then use conservative equal-and-opposite interspecies exchange and independently
specified chemistry. An arbitrary heavy-heating fraction or cooling coefficient
would hide the root cause. A passing solver comparison, a converged PDE and a
matched experiment remain three separate release decisions.

## Verification of this report

Only read-only local inspection, primary-source browsing and this Markdown
file edit were performed. No scientific or project checks were run and no
new numerical result is claimed. Versions are the local executed versions
where stated, or the specific upstream README/documentation inspected today;
no unverified latest-release claim is made.
