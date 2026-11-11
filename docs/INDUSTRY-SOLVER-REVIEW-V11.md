# Established solver review for Mass Spinner

Research date: 6 November 2026. This is a primary-source capability and applicability review, not a runtime benchmark or experimental validation. No candidate package was installed or executed in this review. Read-only source inspection used GitHub APIs, raw source and streamed text archives; archive contents were not executed or extracted to the filesystem.

## Decision

Retain the proposed Julia/SciML orbit reference, PlasmaPy formula checks, WarpX particle reference and PETSc Landau deterministic reference. No evidence checked establishes one turnkey industry standard for transient rotating separators with mutually evolving, non-Maxwellian ion populations. Language choice does not establish the collision operator, boundary model or numerical accuracy.

The immediate physical target is the existing prescribed-field, singly charged 40 u / 84 u mixture. Adding electrons, neutral gas, self-consistent fields or fluid closures changes that problem and needs a separately declared comparison. A second particle code gives implementation independence; a deterministic Landau reference additionally changes the numerical representation. Neither alone validates an apparatus.

## New application-specific evidence

**FEniCSx deserves a place in the later continuum-field shortlist.** A May 2025 MIT/Simula presentation explicitly labels a velocity/electrical-potential example as a plasma centrifuge model in collaboration with Marathon Fusion. This is actual company-associated application evidence. The slide does not disclose governing equations, a kinetic collision operator, source availability, agreement with measurements or Marathon's current architecture. FEniCSx remains a framework requiring a physical model, not a ready separator simulator. [Primary presentation, page 3](https://events.cels.anl.gov/event/610/contributions/1650/attachments/717/2386/openmc_fenicsx.pdf)

**WarpX has directly relevant published mirror applications.** A 2026 JPP study uses RZ and 3D WarpX to study finite-Larmor-radius charge separation, azimuthal structures and radial transport. This strengthens its relevance to later self-consistent studies. It does not demonstrate our mixture's runtime, our source/collector configuration, or our collision accuracy. Axisymmetric calculations do not test azimuthal instabilities. [Study](https://doi.org/10.1017/S0022377826102207)

**Cross-code benchmarks are a stronger acceptance criterion than a software label.** The 2026 Penning-discharge community benchmark compares 17 codes from 19 institutions using density, potential, temperature and spoke-rotation diagnostics. It is relevant to a future self-consistent ExB stage, not a substitute for the present homogeneous ion-collision comparison. [Author-hosted manuscript](https://plasma.szfki.kfki.hu/~zoli/pdfs/PSST_2026_Powis_Penning_benchmark.pdf)

Actual separator publications also use reduced custom models. The 2014 actinide/lanthanide study follows test-ion Lorentz trajectories with Langevin collisions against a rotating background. That supports this modeling hierarchy but does not validate mutually evolving species or establish a named turnkey standard. [Primary paper](https://w3.pppl.gov/~fisch/fischpapers/2014/Gueroult.psst.2014.pdf)

## PETSc adaptation boundary

The inspected release initialization forces species zero to electron mass and derives thermal speeds, Coulomb logs and time normalization from the configured species. An ion-only adaptation must occur before those dependent quantities are constructed. Overriding masses after context creation would leave inconsistent normalization; a zero-density dummy electron has not been qualified.

The implementation uses rounded physical constants, including proton mass `1.6720e-27` kg, charge `1.6022e-19` C and temperature conversion `1.1604525e7` K/keV. Cross-code comparisons must record actual initialized SI masses, charges and temperatures rather than assume current CODATA or confuse proton-mass units with atomic-mass units. The fixed Coulomb-log option is present. The source warns that nondefault normalization-grid use is insufficiently verified. These are source-level findings, not proof that an adaptation has run correctly. [Initialization source](https://petsc.org/release/src/ts/utils/dmplexlandau/plexland.c.html)

## Julia: Kinetic.jl source qualification

The Kinetic.jl homepage explicitly advertises the Fokker–Planck–Landau equation. It would be incorrect to dismiss the package solely because a documentation page emphasizes gas models. However, the inspected public revisions do not establish a usable Coulomb-Landau reference:

- KitBase.jl revision `37f503ae878cf4d346b8c324a6aa2c6af36c9560`: inspected the recursive tree and searched every archived `.jl`, `.md` and `.txt` file for `landau`, `fokker`, `coulomb`, `rosenbluth`, `takizuka` and `nanbu`, case-insensitively. No matches were found.
- Kinetic.jl revision `d7473ffa4d98a115957abe923dfb0f99e5ad1cba`: the same search found the advertised FPL support bullets and a Landau/Lifshitz bibliography entry, but no implementation or example.
- The actual homogeneous-distribution example invokes BGK, ES-BGK and Shakhov relaxation. Its symbol gamma is a gas thermodynamic parameter; it is not evidence for a Landau kernel exponent. [Pinned example](https://github.com/vavrines/Kinetic.jl/blob/d7473ffa4d98a115957abe923dfb0f99e5ad1cba/example/gas/homogeneous.jl)
- The two-species plasma Brio–Wu configuration selects BGK collisions. Two-species support elsewhere in the framework therefore does not establish multispecies Landau support. [Pinned configuration](https://github.com/vavrines/Kinetic.jl/blob/d7473ffa4d98a115957abe923dfb0f99e5ad1cba/example/plasma/briowu_1d.txt)
- KitBase's FFT collision implementation explicitly constructs a Boltzmann gain/loss operator with a hard-sphere-related kernel, and the inspected solver dispatch invokes that operator for `fsm`. Its adjustable kernel argument must not be relabeled a Coulomb Landau exponent without a derivation. [Pinned implementation](https://github.com/vavrines/KitBase.jl/blob/37f503ae878cf4d346b8c324a6aa2c6af36c9560/src/Theory/theory_fsm.jl), [dispatch](https://github.com/vavrines/KitBase.jl/blob/37f503ae878cf4d346b8c324a6aa2c6af36c9560/src/Solver/step_1f.jl)

Conclusion: **FPL support is advertised; a Coulomb gamma = -3 implementation, physical prefactor, unlike-species operator and working example were not verified at these revisions.** This is bounded negative evidence, not proof that no other branch, related package or author code exists. A maintainer-supplied pinned source/example could reopen this candidate. Kinetic.jl has real Boltzmann, mixture and plasma capabilities; this finding concerns the exact collision reference needed here. [Advertised scope](https://github.com/vavrines/Kinetic.jl)

## Commercial and alternative candidates

| Candidate | Verified useful capability | Why it does not displace the present reference order |
| --- | --- | --- |
| PPPL-LSP | Electrostatic/electromagnetic PIC, circuits, surface physics and actual Penning/ExB use | Commercial base plus substantial PPPL modifications; no publicly reproducible turnkey matched-ion workflow verified. [PPPL](https://pcrf.princeton.edu/capabilities/modeling-tools-and-computer-codes/lsp-code/) |
| COMSOL | Applied fields, CAD, space-charge coupling and background-gas collisions | Documented direct particle Coulomb forces do not establish an appropriate multispecies Landau relaxation algorithm. Direct macro-particle forces are not an automatic substitute. Custom equations remain possible. [Official documentation](https://doc.comsol.com/6.4/doc/com.comsol.help.particle/particle_introduction.02.02.html) |
| VSim | Discharge/PIC/MCC capabilities | The documented Reduced Collisions feature concerns background-gas elastic, excitation, ionization and charge/momentum exchange. It is not evidence for mutual Coulomb-Landau collisions. Other vendor capabilities were not ruled out. [Official scope](https://txcorp.com/Documentation/VSim/12.3.0/VSimReference/vsimref_composerReducedCollisions.html) |
| USim | Fluid, Hall-MHD and two-fluid models on unstructured meshes | Fluid closures do not directly reproduce full evolving velocity distributions and gyro-scale collector losses. [Vendor description](https://txcorp.com/wp-content/uploads/2022/06/HypersonicFlowModeling.pdf) |
| Gkeyll | Established continuum Vlasov/gyrokinetic framework | Exposed collision documentation describes BGK/Dougherty. A developer Rosenbluth note merits follow-up but does not qualify an accessible tested general multispecies Landau workflow. Do not claim all full-Landau development is absent. [Collision docs](https://gkeyll.readthedocs.io/en/latest/dev/collision-models.html), [developer note](https://ammar-hakim.org/sj/fpo-notes.html) |
| Recent structure-preserving Landau particle methods | Independent numerical methods with conservation/entropy analysis | Promising research references, not a verified maintained turnkey separator stack. Regularization and kernel assumptions need matching. An exact Maxwell-kernel test is not an exact Coulomb benchmark. [Multispecies method](https://doi.org/10.1007/s10440-024-00692-9) |

Commercial pricing and licenses for a runnable matched setup were not obtained. No purchase or external contact was made. Existing solver licenses and operational constraints remain separately documented in [the adoption review](EXISTING-SIMULATION-CODES.md).

## Gates before stronger claims

1. Match physical species, SI normalization, fixed Coulomb log, densities, initial distributions and physical duration.
2. Compare finite-time distributions and moment histories, including drift and anisotropy; refine timestep, velocity domain/mesh or particle count and collision-cell width independently.
3. Verify raw conservation and entropy diagnostics without fitting one code to another or silently enabling correction terms.
4. Only then compare prescribed-field geometry, closed rotating equilibrium and the open collector pulse.
5. Treat self-consistent potential, electrons, neutral/atomic processes, sheaths and nonaxisymmetric modes as additional physics with separate benchmarks and uncertainty.

Evidence checked: official package documentation, PETSc initialization source, pinned Julia source/examples, selected separator publications and an actual centrifuge collaboration presentation. These findings establish capability and limits, not agreement between implementations or apparatus validation.
