# Current scope — II A through II D

The workbench focuses on seven models: gyro-orbit and ICR (§A), curvature/grad-B drift (§B), rigid-rotation equilibrium (§C), uniform-field rotating/Ohkawa filter, double-well radial Hamiltonian and exploratory collisional double-well dynamics (§D). Parallel comparison uses these seven independent observables. The remaining §E–K concepts and named variants have illustrated reference cards with sources, pros/cons and missing closures; they are not selectable numerical simulators. [Current coverage and unresolved physics](/CORE-COVERAGE.md).

Deeper primary-literature checks are published in IIC-LITERATURE-REVIEW.md, IID-LITERATURE-REVIEW.md and CD-INDEPENDENT-REVIEW.md. Important distinctions are explicit in the UI: central composition vs volume inventory; bounded common-corotation benchmark vs current-carrying vacuum-arc density; infinite cold orbit stability vs finite warm collection; potential wells vs collisionally populated equilibrium. REFERENCE-ATLAS.md describes the original diagrams and their provenance.

The historical broader-model inventory below documents retained source modules and previous scope; it does not describe the current selector.

---

# Section II coverage — version 4

Reference: Zweben, Gueroult & Fisch (2018), https://doi.org/10.1063/1.5042845.

Every A–K subsection is represented in the application. The 18-entry directory also includes named variants, with method-specific advantages, disadvantages and limits. Directory coverage is not equivalent to a calibrated numerical simulator for every variant.

| Section | Numerical model / diagnostic | Material fidelity boundary |
|---|---|---|
| II A gyro-orbits / ICR | Exact fixed-energy gyro-orbits; prescribed circular RF full orbits | No antenna/plasma wave coupling or realistic extraction |
| II B drift orbits | Curvature + grad-B guiding-centre deflection | Small gyroradius, many gyroperiods; no self-generated E/slit acceptance |
| II C centrifuge | Isothermal quasineutral rotating equilibrium | Imposed rotation, no relaxation/collection/power prediction |
| II D uniform-B / double well | Rotating full orbits; quartic effective-potential landscape | Double-well shape is illustrative, not calibrated collisional redistribution |
| II E variable B | Centrifugal and mirror endpoint barriers | Invariants/endpoints, not complete divergence-consistent MCMF/transport |
| II F POMS / azimuthal fields | Magnetic-core surrogate; full orbits in Btheta~1/r and logarithmic potential | POMS field/electron response not reconstructible from tutorial alone |
| II G radial advection | Established Drude neutral-drag cross-field drift | Constant prescribed collision frequency, no self-consistent fields |
| II H radial diffusion | Fixed-frequency Drude/Einstein or explicit tutorial Eq.8 benchmark | Trace heavy ions, common temperature, magnetization and long-time assumptions |
| II I mobility | Unmagnetized steady qE/(m nu) with diffusive width | Bulk E accessibility, source/wall/sheath physics unresolved |
| II J differential ionization | Maxwellian average of assumed step cross sections, irreversible kinetics | Teaching cross sections, no measured atomic data or recombination |
| II K transit time | Exact finite-pulse bounded-energy arrival CDF | No scattering, space charge, slit loss or rotating-collector mechanics |

Overview-only named variants: rotating-magnetic-field proposal (II E), collisionality-gradient/diamagnetic advection (II G), and capillary ion wind (II I). Section II cites them without enough equations or operating data for a defensible reconstruction. They are not silently replaced by unrelated solvers. Section II does not describe a cusp separator.

Critical null result: Eq.8 heavy-ion classical diffusion has leading heavy-mass cancellation; the Coulomb option reproduces that rather than inventing separation. The tutorial random-walk collision-frequency convention is distinct from Drude momentum relaxation. Fixed-nu and Coulomb closures are labeled separately.

See VALIDATION.md and AUDIT-REPORT.md for independent tests, reproduced defects/fixes, and remaining scientific and live-browser verification gaps. Highest-priority fidelity work is measured cross-section/charge-exchange data, self-consistent plasma fields, source/collector geometry and validation against experiments; additional sliders do not supply those missing equations or data.
