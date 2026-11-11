# Existing simulation codes for Mass Spinner

**Follow-on execution:** the packages below have since been put to work. See
[executed v11 results](EXTERNAL-REFERENCE-RESULTS-V11.md) and
[scientific workflows](../scientific/README.md). The review-only status in the
original research pass below is historical; production browser dependencies
remain unchanged.

Research date: 6 November 2026 Pacific. Three independent research agents investigated particle codes, continuum collision codes, and supporting physics/neutral tools. This is a documentation/source review: none of the candidate packages was installed, executed, integrated or deployed in this pass. Rankings below are engineering assessments, not measured performance or validation results. Versioned documentation is preferred where available; moving release/development URLs must be pinned before implementation.

## What the application currently uses

Verified locally from `package.json`, `src/worker.ts`, `src/coulomb.ts`, `src/landau-reference.ts` and `src/fusion-reactor.ts`:

- Three.js is the sole runtime package dependency. Vite/TypeScript build the browser application; Blender creates hardware illustrations. These are not plasma solvers.
- The worker invokes our own TypeScript orbit, equilibrium, transport, geometry and double-well modules.
- Boris orbit stepping and Takizuka–Abe Coulomb scattering implement published algorithms locally. This is not execution of an established external plasma code.
- The offline isotropic Rosenbluth finite-volume reference is also our own implementation and remains an unaccepted reference candidate.
- The fusion teaching model cites the Bosch–Hale fit and ASCOT source; it does not execute ASCOT5.

The current convergence report still withholds continuum and experimental validation. An external code comparison must retain that distinction. See [current evidence](COLLISION-CONVERGENCE-V10.md).

## Ranked adoption recommendation

| Priority | Code | Proposed role | Verified constraint | Practical effort, not a measured estimate |
| --- | --- | --- | --- | --- |
| 1 | PlasmaPy | Independent offline units, collision-rate and regime checks | Formulary and diagnostic utilities; not a complete separator solver | Low: Python fixtures, with assumptions and normalization made explicit |
| 2 | WarpX | Established particle-code comparison for homogeneous collisions, then prescribed-field rotating transport | RZ Coulomb collisions require one azimuthal mode; finite collision-cell angular defects still need study | Medium: pinned CPU build, matched input decks and output adapter |
| 3 | PETSc DMPlexLandau | Deterministic finite-time collision-distribution reference, numerically different from random-pair scattering | Shipped setup assumes species zero is electrons; ion-only mixture needs audited adaptation | Medium/high: C driver/context and normalization audit before matched cases |
| Later | BOUT++ / Hermes-3 | Investigate self-consistent potential response, neutral coupling and fluid instabilities | Fluid/drift ordering is not a replacement for gyro-scale full-orbit losses | High: derive a separator-appropriate model and boundary closures |

Keep the interactive browser model and run these references offline. Publish provenance-bearing curves and comparison fixtures for the browser to display. A live remote solver service is a separate hosting/resource decision; no browser or Cloudflare integration of these packages was demonstrated here.

## PlasmaPy: immediate low-cost verification

[Stable collision formulary](https://docs.plasmapy.org/en/stable/formulary/collisions.html) supplies Coulomb logs, frequencies, mean free paths and coupling parameters. [MaxwellianCollisionFrequencies](https://docs.plasmapy.org/en/stable/api/plasmapy.formulary.collisions.frequencies.MaxwellianCollisionFrequencies.html) assumes slowly drifting Maxwellian populations. Match the precise quantity—momentum slowing, energy exchange and deflection frequencies are not interchangeable. [Coulomb-log conventions](https://docs.plasmapy.org/en/stable/api/plasmapy.formulary.collisions.coulomb.Coulomb_logarithm.html) also require care for unequal temperatures. The package is [BSD-3-Clause](https://github.com/PlasmaPy/PlasmaPy).

First fixtures: exact physical species masses/charges, thermal speeds, gyrofrequency, Debye length, Maxwellian relaxation rates and mean free paths across a declared parameter grid. Match fixed lnΛ for rate comparisons; separately investigate choices for calculating it. Formula agreement alone cannot validate a non-Maxwellian distribution or our spatial collision model.

## WarpX: first particle reference

[WarpX 26.10 parameters](https://warpx.readthedocs.io/en/26.10/usage/parameters.html) document multispecies pairwise Coulomb scattering, fixed Coulomb log, axisymmetric RZ operation, prescribed particle fields and particle loss boundaries. RZ collisions require `warpx.n_rz_azimuthal_modes=1`. Use the applied-to-particles analytic E/B expressions: the separate analytic grid-field parsers explicitly do not support RZ. Check unit conventions, collision pair lists and weight normalization in the pinned version. [Project/license](https://github.com/BLAST-WarpX/warpx): BSD-3-Clause-LBNL.

A [maintainer discussion](https://github.com/BLAST-WarpX/warpx/discussions/6835) describes rotating partner momenta into a common azimuth for axisymmetric collisions. This resembles our ring representation. Inference: adoption does not automatically eliminate finite-radial-separation angular momentum error. Measure raw physical canonical angular momentum and cell-width dependence. Its ordinary energy/momentum correction option does not promise canonical-angular-momentum conservation. Single-mode runs also exclude nonaxisymmetric instabilities.

Start with homogeneous collisions and collisionless quartic orbits; then closed rotating equilibrium and the same open 200 µs pulse. CPU/GPU capabilities do not establish runtime for our cases. Electron-resolved self-consistent PIC would introduce new scales and physics; investigate electrostatic/implicit/hybrid compatibility separately rather than enabling them during the baseline comparison.

## PETSc: strongest deterministic collision candidate

The [Landau module](https://petsc.org/main/manualpages/LANDAU/), [thermalization driver ex1](https://petsc.org/release/src/ts/utils/dmplexlandau/tutorials/ex1.c.html) and [method publication](https://arxiv.org/abs/2209.03228) provide a full multispecies finite-element Landau collision implementation with implicit integration. This gives a stronger numerical independence check than another random-pair implementation. PETSc is [BSD-2-Clause](https://petsc.org/release/install/license/); optional dependencies have separate licenses.

The [setup source](https://petsc.org/release/src/ts/utils/dmplexlandau/plexland.c.html) forces species zero to electron mass, accepts subsequent ion masses in proton-mass units and has electron-specific default Coulomb-log logic. Our masses are in atomic-mass units. A fixed `-dm_landau_ln_lambda` is available. Therefore entering `40,84` into the shipped example does not reproduce our ion-only benchmark. Audit an explicit ion-only adaptation; do not silently add physical electrons, assume dummy zero-density species work or rely on normalization paths marked not well verified.

Run the unchanged upstream example first. Then match our 40+/84+ homogeneous case in physical kilograms, densities, temperatures, lnΛ and duration. Refine velocity domain, mesh and timestep; inspect distributions, tails, positivity, density, momentum, energy and entropy diagnostics. A qualified homogeneous reference would not validate separator transport or experimental performance.

## Other candidates and reasons to defer

| Candidate | Useful capability | Why it is not first for the current collision convergence problem |
| --- | --- | --- |
| [Smilei](https://smileipic.github.io/Smilei/Understand/collisions.html) | Independent Nanbu/Pérez binary collision implementation and documented relaxation examples; CeCILL-B | [Release notes](https://smileipic.github.io/Smilei/Overview/releases.html) list single-mode AM collisions/prescribed fields under unreleased changes, while [namelist](https://smileipic.github.io/Smilei/Use/namelist.html) still warns AM collisions unsupported. Homogeneous Cartesian cases are the safer initial scope; cylindrical support needs a pinned commit and smoke test. |
| [Gkeyll](https://github.com/gkeyllorg/gkeyll) | Spatial Vlasov and gyrokinetic solvers; MIT | [Documented collision models](https://gkeyll.readthedocs.io/en/latest/dev/collision-models.html) are BGK/Dougherty. Conservative moment relaxation is useful, but does not establish full nonlinear Landau distribution agreement. Landau damping is not the Landau collision operator. |
| [PICLas](https://piclas.readthedocs.io/en/stable/index.html) | PIC/DSMC/MCC, Poisson fields, background gas and ionization; GPLv3 | Its [documented Fokker–Planck models](https://piclas.readthedocs.io/en/latest/userguide/features-and-models/Fokker-Planck.html) are single-species gas relaxation, not an established multispecies Coulomb reference. Consider it later for discharge/neutral studies. |
| [ASCOT5](https://ascot4fusion.github.io/ascot5/physics.html) | Full orbit/guiding-center tracing and collisions against prescribed background; LGPL | Test particles do not mutually interact or alter the background. Good for collisionless/trace orbit checks, not evolving mixed-ion pulse relaxation. [Atomic tutorial](https://ascot4fusion.github.io/ascot5/tutorials/atomic.html) also restricts background charge states. |
| [CQL3D](https://www.compxco.com/cql3d.html) | Multispecies Coulomb/RF Fokker–Planck in mirror/toroidal geometry; GPL-3.0-or-later in source | Bounce/orbit averaging needs time-scale ordering and does not directly reproduce transient full-orbit collector losses. |
| [COGENT](https://github.com/LLNL/COGENT) | Gyrokinetic/Rosenbluth work and continuing mirror studies | Specific unlike-species operator, applicable license and build/release configuration were not fully qualified. Defer pending that evidence. |

## Connection to the tutorial's missing physics

The tutorial's §V.C separates atomic physics, particle transport, plasma dynamics and technology. Its §III.G mentions BOUT++ and XGC for self-consistent plasma problems. This supports a staged multi-code strategy, not an assumption that one package covers a real separator. [Tutorial](https://stewartzweben.com/Papers/Zweben_PMF.pdf), DOI 10.1063/1.5042845.

- **Potential response and turbulence:** [BOUT++](https://bout.llnl.gov/) is a fluid-model framework; [Hermes-3](https://hermes3.readthedocs.io/en/latest/) adds multispecies/neutral components. Their equations and drift/fluid ordering need review for our strong-rotation regime. They are candidates for additional models, not direct full-orbit collision references.
- **XGC:** [Official description](https://xgc.pppl.gov/html/general_info.html) includes nonlinear Landau collisions, neutrals and turbulence. [Access](https://xgc.pppl.gov/html/getting_xgc.html) requires a collaborative agreement, and realistic runs need substantial resources. Lower practical priority for a shareable personal project.
- **Charge states and radiation:** [FLYCHK](https://nlte.nist.gov/FLY/) is directly relevant to the tutorial's population/radiation calculations. Access, low-charge-state accuracy, actual species and valid thermodynamic regime must be qualified before importing predictions.
- **Neutral collision data:** [LXCat](https://nl.lxcat.net/data/set_type.php) is a database rather than a solver. [Current terms](https://us.lxcat.net/instructions/how_reference.php) restrict third-party redistribution. Check dataset-specific permission before bundling tables into the public application. Actual elements/isotopes, neutral partners, charge states and energy ranges are required; arbitrary masses alone do not identify cross sections.

## Proposed acceptance sequence

1. Produce PlasmaPy formula/regime fixtures with documented assumptions and units.
2. Pin WarpX; run its published collision examples, then homogeneous common-temperature stationarity, 2/10 eV equilibration, relative-drift and anisotropy cases for our two ion masses. Compare complete distributions and moment histories across numerical refinements.
3. Run PETSc's upstream example; qualify the audited ion-only adaptation and an independent finite-time distribution reference. Preserve discrepancies rather than fitting our model to one reference curve.
4. Reproduce collisionless quartic-orbit H/Pθ invariants and exits; then closed equilibrium and the fixed physical open pulse in WarpX. Refine collision-cell width and local particle occupancy independently, with separate seed uncertainty. Preserve existing failed/unknown criteria.
5. Export versioned reference data with solver commit, exact input, normalization, source hash and numerical uncertainty. Keep computed points distinct from interpolation. Introduce self-consistent fields, atomic/neutral models and nonaxisymmetric dynamics as separately tested physics increments.

Evidence checked: local dependency/worker execution path, current convergence report, official code documentation, selected setup source and developer method publications. This docs-only research pass ran no build, typecheck or physics study and changed no simulator behavior.
