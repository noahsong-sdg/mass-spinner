# Material, nuclear, diagnostic and uncertainty tools after V88

12 November 2026. Documentation/source inspection and primary online sources only;
no installation, solver execution, new numerical result or experimental validation.
The rankings are engineering judgments, not newly qualified integrations.

**Acquire material and instrument data before adding another solver.** V88 already
executed the useful FESTIM and full coupled-target Radau pilots. The smallest new
software opportunity is sensitivity analysis through the existing SciPy stack;
the highest-value new evidence is apparatus-specific calibration and material data.

## Execution paths and remaining causes

Verified from the current files:

- `src/coupled-target.ts` assembles composition-dependent stopping and fusion,
  temperature-dependent diffusion/release, three species solves and film/backing
  conduction. [FESTIM](../expert-v88/festim/validated/README.md) verifies manufactured
  transport/trapping/constant-Cp limits, using synthetic coefficients. Its
  heat-to-hydrogen coupling is one-way; substituting it for a variable-Cp enthalpy
  model would need separate energy verification.
- [Full Radau](../expert-v88/target-radau/README.md) independently assembles the
  coupled equations but shares atomic/depth closures. Its continuous packing
  admission and beam-off cooling-ledger failures remain unresolved. Installing
  another stiff integrator does not address either demonstrated cause.
- [RustBCA/Geant4-kernel material references](../../docs/MARATHON-MATERIAL-V35.md)
  and [finite films](../../docs/FINITE-FILM-V38.md) cover prompt material response,
  not measured LiT chemistry, retention or lifetime. The Geant4 comparison checks
  adapted functions; it is not a full Geant4 transport calculation.
- [OpenMC/NJOY](../../docs/NEUTRON-DEPTH-V38.md) owns the evaluated free-H1 transport
  family. It is not an as-built LiT/W assembly or evaluated depletion chain.
- [Optical V80](../optical-v80/PROTOCOL.md) already uses PyAbel/HiGHS and a
  bin-integrated Gaussian spectrum. The velocity line identity, interferometer
  transfer function, aperture and reduction rule were not recovered. Brightness
  constrains emissivity but does not establish what estimator the instrument used.

Inference: several remaining uncertainties are **input/model deficiencies**.
Simply, more accurate software can accurately calculate the wrong material or
the wrong measurement. The smallest coherent remedy is a measured input deck
with uncertainty and holdouts, followed by reuse of existing expert tools.

## Ranked decisions and prospective gates

| Rank | Tool/data and capability | Missing inputs; smallest useful work | Resources, rights and measurable admission gate |
|---|---|---|---|
| **Adopt now: data specification** | Existing FESTIM + Radau + RustBCA, with a public measured reference material before any LiT claim. | Obtain specimen composition/phase, thickness/density, D/T loading, temperature history, diffusion/trap/surface parameters, heat capacity/conductivity/contact resistance and uncertainties. A tungsten control cannot qualify LiT. | Reuse isolated environments; no new solver build. Freeze one measured retention/desorption or thermal holdout before fitting; reproduce source, boundary and initial conditions. Pass mass/energy and mesh/time gates separately, then assess the holdout against its stated observation uncertainty. No measured deck was acquired in this audit. |
| **Adopt now: existing capability, pilot before claims** | [SciPy `stats.sobol_indices`](https://docs.scipy.org/doc/scipy-1.17.0/reference/generated/scipy.stats.sobol_indices.html): first/total sensitivity indices and bootstrap intervals. | Start on one numerically stable bounded response with defensible independent input distributions. Parameter bounds alone justify a sensitivity scenario, not a probabilistic device confidence band. Correlated Arrhenius prefactor/activation fits must not be treated as independent. | Already in the SciPy family recorded by V88; symbol availability in the pinned guest was not executed here. SciPy BSD license is recorded in V88. Cost is `n*(d+2)` evaluations; six inputs at `n=4096` cost 32,768 solves. First prove analytic additive/interaction controls, then double n and use independent scrambles until ranking and intervals meet a predeclared stability gate. Count failed physics runs; do not drop them to obtain finite samples. |
| **Adopt now: research lookup** | [NIST ASD](https://www.nist.gov/pml/atomic-spectra-database) for critically evaluated candidate wavelengths, levels and transition probabilities. | Obtain the actual diagnostic line and wavelength convention from apparatus/source records. ASD can check a proposed identity; a nearby listed line cannot establish which line the experiment measured. | Browser lookup, no solver/environment. Retain query, version, bibliographic references and uncertainty. [ASD help](https://physics.nist.gov/PhysRefData/ASD/Html/lineshelp.html) distinguishes wavelength and transition-strength uncertainties. Gate: line, air/vacuum convention and calibration agree before computing absolute Doppler shifts. Check database reuse terms before redistributing a table. |
| **Pilot only: measured stopping data** | [IAEA electronic-stopping database](https://www-nds.iaea.org/stopping/) for experimental ion/target data and source publications. | First establish whether relevant projectile/compound/energy coverage exists. Existing V35 guest ZIP/API attempts returned 403; this audit reopened the public landing page, not those payloads. No LiT coverage was verified. | Advertised compressed database is about 4 MB, much smaller than a new transport environment; retain dataset version/hashes and check IAEA terms. Gate: compare electronic stopping in matching units/energy-per-nucleon with independent measurements and stated errors. Nuclear stopping, straggling and retention require separate evidence. Unavailable access is missing coverage, not zero data; do not circumvent blocks. |
| **Pilot only: synthetic optics** | [CHERAB/Raysect](https://www.cherab.info/models/line_shapes/spectral_line_shapes.html) for finite optics, obscuration, 3D viewing and supported line-shape models. | First obtain line identity, optical geometry, instrument kernel/calibration, reduction algorithm and appropriate emitter populations. Maxwellian emitting species is a documented assumption. Keep current PyAbel/HiGHS bounds until those inputs exist. | New native/ray-tracing environment and Monte Carlo convergence budget; [CHERAB license](https://www.cherab.info/licence.html) and atomic-data permissions are separate. Gate: recover the existing analytic/annular/Gaussian limits, converge rays/bins, then predict a held-out calibration spectrum with the same estimator as the instrument. Require predictive improvement beyond calibration uncertainty before adoption. |
| **Pilot only: atomic emission coefficients** | [OPEN-ADAS ADF15](https://open.adas.ac.uk/) provides density/metastable-resolved photon-emissivity coefficients; ADF04 supplies resolved atomic rates. | Verify actual Ar transition coverage and density/temperature domain. Collisional-radiative coefficients do not supply missing metastable populations or justify using Maxwell-averaged coefficients with an arbitrary LoKI EEDF. | Data parsing is lighter than another PDE code, but [current terms](https://open.adas.ac.uk/terms-and-conditions) restrict commercial use, website inclusion and redistribution without prior written permission. Do not embed downloads in this public app without that permission. Gate: provenance/unit/interpolation checks and an independent line-ratio or absolute-brightness holdout. No file coverage or permission was established here. |
| **Not needed now** | SALib, Dakota, TMAP8, another thermal FEM stack, full Geant4/another neutron engine, or atomistic MD/DFT. | No demonstrated requirement beyond existing tools for this task. SALib becomes useful specifically for Morris/other methods absent from SciPy; [Dakota](https://www.sandia.gov/ccr/software/dakota/) becomes useful when expensive-code calibration/surrogate orchestration is a measured bottleneck. TMAP8 is conditional on enclosure/fuel-cycle requirements. | Avoid overlapping installations. Add each only for an explicit missing equation/observable/resource requirement with a matched benchmark. MD/DFT is a separate material-research project, not an inexpensive replacement for missing experimental coefficients. |

For nuclear extensions, specify actual geometry, isotopic material inventory and
source energy-angle distribution, then extend **existing OpenMC/NJOY** with the
required evaluated data and heating/depletion treatment. Monte Carlo tally
standard errors are distinct from nuclear-data, geometry and source uncertainty;
increasing histories reduces only the sampling component. No new nuclear package
is justified by the current H1-only scope.

## Evidence boundary and order

1. **Installation:** upstream import/build and retained environment identity.
   This review performs none; V88 receipts document the earlier installations.
2. **Numerical verification:** matched equations, conservation, analytic controls,
   spatial/time/statistical refinement and observable-specific errors. V88's
   failures remain failures; sensitivity analysis must not turn them into error bars.
3. **Experimental validation:** independent measured inputs and held-out observables
   of a matching material/apparatus, including the diagnostic response. Neither
   an upstream brand nor two-code agreement establishes this stage.

Immediate order: resolve existing numerical failures; recover instrument/source
records and a measured material deck; use SciPy for a bounded sensitivity pilot;
add IAEA/atomic-data or CHERAB adapters only if those records expose a specific
remaining need. No public model, result status or qualification changes here.

Checks: read the V88 summary, FESTIM/Radau reports, material/finite-film/neutron
reports, coupled-target source and V80 optical protocol/source; reopened the
linked primary sources. No project code, tests, builds or VM commands were run.
