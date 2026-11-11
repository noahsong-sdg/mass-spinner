# Section II inventory and physical-claim audit

Reviewed source: Zweben, Gueroult & Fisch, *Plasma mass separation*, Physics of Plasmas 25, 090901 (2018), DOI [10.1063/1.5042845](https://doi.org/10.1063/1.5042845). Evidence checked: the user-provided PDF, its local `assets/tutorial.txt` extraction (Section II and relevant Section III), plus the existing `src/physics.ts`, `src/centrifuge.ts` and `src/collisions.ts`. This review is a source/equation/coverage audit, not an execution test or experimental validation. Other agents/root own numerical execution and browser verification.

## Exact scope: 11 subsection headings, 18 directory entries

The paper has **11 Section II headings (A–K)**. It does not define a unique number of “separator types,” because several headings discuss multiple configurations or subsidiary mechanisms. The directory splits these into **18 educational entries** so named alternatives do not disappear inside a generic setting. These counts are an editorial classification, not a number quoted by the paper.

| Heading and printed paper page | Mechanisms/variants represented | Directory IDs |
|---|---|---|
| II A, Ion gyro-orbit separation, pp. 4–5 | Passive gyroradius interception; selective ICR heating with gyroradius-sensitive/biased collection | `gyro`, `icr` |
| II B, Ion drift orbit separation, pp. 5–6 | Curvature/gradient drift through a magnetic bend; selective heating is an optional enhancement | `curved` |
| II C, Plasma centrifuge (vacuum arc centrifuge), pp. 6–7 | Rotating radial force balance; vacuum-arc implementation combines source and rotation | `centrifuge` |
| II D, Rotating plasma separation (uniform magnetic field), p. 7 | Wall-versus-axial rotating filter/Archimedes geometry; shaped-potential double-well radial separation | `rotating`, `doublewell` |
| II E, Rotating plasmas (variable magnetic fields), pp. 7–8 | Centrifugal end plug; rotation-modified magnetic mirror and combined MCMF; brief separate rotating-magnetic-field proposal | `centrifugal`, `mirror`, `rotatingmagnetic` |
| II F, Alternative magnetic/electric field geometries, p. 8 | Strong-core plasma-optical mass separation (POMS); distinct central-conductor azimuthal-B/radial-E geometry | `poms`, `azimuthal` |
| II G, Radial advection, pp. 8–9 | Neutral-friction advection of rotating ions; collisionality-gradient advection with diamagnetic flow | `advection`, `collisionality` |
| II H, Radial diffusion, p. 9 | Magnetized collisional diffusion; unmagnetized limit and possible slower neutral/electron contributions discussed | `diffusion` |
| II I, Ion mobility, pp. 9–10 | Collisional electric mobility; capillary isotope enrichment with ion wind and competing explanations | `mobility`, `ionwind` |
| II J, Ionization energy, p. 10 | Differential atomic/molecular ionization followed by ion extraction | `ionization` |
| II K, Transit time separation, p. 10 | Pulsed near-fixed-energy flight with synchronized moving/segmented collection | `transit` |

**There is no magnetic-cusp separator in this Section II.** A proposed `cusp` entry would misidentify the Fig. 7 geometry. That geometry has azimuthal B decreasing as 1/r around a central conductor and an assumed logarithmic radial electric potential. It is distinct from POMS.

`mirror` groups the standalone rotation-modified mirror and the combined MCMF concept. `centrifugal` exposes the other end-plug component separately. The brief rotating-magnetic-field, collisionality-gradient and ion-wind entries are explicitly catalogued as unresolved standalone numerical models; merely listing them must not imply their physics has been implemented.

## Advantages and disadvantages: evidence versus inference

`src/methods.ts` supplies a mechanism description, advantages, disadvantages, fidelity boundary and relevant parameters for each entry. Benefits deduced rather than explicitly established by the tutorial carry an `[Inference]` label. Historical statements about experimental status are attributed to the **2018 tutorial**, not asserted as present-day literature conclusions.

The strongest distinctions to make visible in the app are:

- **Gyro-orbit/ICR:** comparatively simple geometry and spectral heating control, but thermal gyroradius overlap, scattering, RF coupling and heating cost limit resolution and throughput. Uniform imposed RF is a heating model, not an antenna/extraction apparatus.
- **Curved-field drift:** no externally imposed E is required in the ideal proposal, but self-generated charge-separation E can oppose the useful relative drift. Source slit acceptance matters.
- **Centrifuge:** can tolerate relatively high collisionality and a vacuum arc integrates the source, but instability-driven mixing, source compatibility and historical energy costs are serious constraints. The conducting-target limitation belongs to the illustrated vacuum-arc implementation, not every mathematical rotating equilibrium.
- **Uniform-B rotation:** externally adjustable and geometrically simple, but density/throughput, attainable plasma potential, neutral effects and fluctuations limit the ideal orbit advantage.
- **Variable-B/MCMF:** different end conditions can favor different masses. The needed collision window is narrow: enough pitch-angle scattering to refill a loss cone, little enough perpendicular transport to preserve separation.
- **POMS and azimuthal-B:** distinct field topologies. Historical reported POMS separation does not validate an arbitrary magnetic-core toy; proposed central-conductor separation does not establish current/electrode engineering performance.
- **Advection:** may occur spontaneously and compete with other methods, but neutral-friction mass dependence is weak and useful separation is poorly constrained experimentally in the tutorial.
- **Diffusion:** high-density/low-temperature transport is attractive, but the specific classical heavy-ion estimate in the paper gives **little or no heavy-mass separation**. The null result is a core lesson, not a reason to inject artificial mass dependence.
- **Mobility:** no B is required, but diffusion and shielding compete with directed drift. Commercial buffer-gas ion mobility spectrometry is not proof of equivalent performance in a quasineutral plasma.
- **Ionization:** elemental/molecular thresholds can help, but broad cross sections and thermal averaging limit sharpness. Mass is not an ionization-rate input.
- **Transit time:** arrival-time differences provide a direct coordinate and moving collectors can segregate products, but source energy spread, collisionlessness, slits, duty cycle and vacuum mechanics constrain throughput.

## Equation and units audit constraints

1. **Thermal radius convention (§II A, Eq. 1).** The paper uses a typical speed sqrt(kT/m). A simulation can instead specify a perpendicular kinetic energy and use sqrt(2E/m), but it must not call the two inputs identical temperatures. A 2D Maxwellian with component variance kT/m has mean perpendicular kinetic energy kT.
2. **Curvature drift (§II B, Eq. 2).** The half-torus estimate assumes comparable characteristic parallel/transverse speeds. General guiding-center drift depends on both components; equal energy inputs and equal velocity inputs have different mass scalings. Require gyroradius/curvature radius small. A mass-dependent drift in imposed fields omits ambipolar cancellation.
3. **Rotating cutoff (§II D).** The potential convention matters. For phi=V(1−r²/a²), m_c=qB²a²/(8V) is the cold infinite-device radial stability threshold. Actual finite-device collection is not a step function of this threshold. The exact marginal solution can grow, and finite axial transit can intercept before the wall.
4. **Variable-field barriers (§II E, Eqs. 5–6).** Centrifugal energy is mΩ²(r_start²−r_end²)/2 for inward motion at imposed rigid Ω; magnetic mirroring adds μΔB under adiabatic conditions. A complete MCMF has two different outlets and a loss-cone refilling problem. A barrier plot alone is not a complete separator or recovery prediction.
5. **Neutral-friction advection (§II G, Eq. 7).** The printed estimate uses E in V/cm, n0 in cm^-3 and B in gauss; the output is cm/s. Its sample values E=1, n0=3e13, relative polarizability≈11, masses 40/137 and B=1000 give about 5.2e3 cm/s, or 52 m/s. Reduced-mass dependence is weak. Do not omit unit conversion or substitute ion mass for reduced mass.
6. **Classical radial diffusion (§II H, Eq. 8; III F, Eq. 13).** This is a **minority heavy ion in a much denser light-ion background**, with common temperature and Z=1, in a magnetized regime. D≈1.2e−3 n_l[cm^-3] lnΛ sqrt(M_l) Ti[eV]^-1/2 / B[G]^2 cm²/s. Heavy-ion mass cancels between gyroradius squared and collision frequency. The example n_l=1e13, lnΛ=5, M_l=40, Ti=10, B=1000 gives about 1.2e5 cm²/s = 12 m²/s. This formula is not a symmetric 50/50 mixture closure. It also must not be extrapolated into ν≫Ω, where the paper says isotropic transport gives no spatial separation.
7. **Mobility (§II I, Eqs. 9–11).** μ=q/(mν) is conditional on a specified collision frequency. ν varies with species and regime; equal ν is not a universal gas law. Include compatible diffusion when claiming a spatial distribution, and flag field shielding. The capillary ion-wind observations even have the opposite enrichment direction to a naive mobility argument.
8. **Ionization (§II J).** Ionization fractions require rate coefficients obtained from species cross sections and the electron energy distribution, density, exposure time and recombination. The textbook threshold alone does not supply k_ion(T_e); a mass-based guessed rate is invalid. If rates are assumed controls, label the result a kinetics sensitivity study, not an elemental prediction.
9. **Transit time (§II K).** L sqrt(m/(2E)) is a fixed-kinetic-energy result. With electrostatic acceleration E=qV, charge also enters. Distribution width and pulse width must propagate to arrival-time or moving-collector width; otherwise the apparent resolution is artificial.

## Current reduced-model audit observations

The pre-expansion orbit kernel resolves imposed-field Lorentz trajectories, finite source distribution, ideal first-hit collection, optional elastic scattering and RF work. Its definitions and sign conventions are consistent with an Ohkawa-style ideal potential and circular-RF single-particle heating. This statement is from source inspection; independent numerical tests are owned by the execution audit.

The centrifuge source resolves a quasineutral isothermal rotating equilibrium using Boltzmann electrons and an effective potential. Its composition inputs are axis densities, not feed fractions or volume inventory. Its effective potential is not the laboratory electrostatic potential. Those distinctions must survive UI/export integration.

The cold-neutral collision source uses an isotropic elastic two-body collision with recoil and a stationary neutral bath. It is not the charge-exchange, Coulomb or empirical ion–neutral operator needed to reproduce the generic tutorial regime. At the illustrative n0≈1e14 cm^-3, tutorial §III D estimates a charge-exchange mean free path of order centimetres. A metre-scale collisionless device cannot represent those same gas conditions. “A collision slider exists” is not evidence that high-density plasma physics is represented.

The tutorial's §III G explicitly explains why bulk electric fields cannot normally be computed by copying electrode voltage into a fixed function: current closure, electron response, sheath physics, cross-field conductivity and full geometry are coupled. §III H explains why fluctuations can mix species and why a convenient Bohm coefficient is not a first-principles turbulence solution. These omissions bound every maximal-fidelity claim.

## Acceptance criteria for this expansion

- Every A–K heading and the named additional variants is visible, with a clear distinction among simulated modes, reduced diagnostics and directory-only proposals.
- Every method has advantages, drawbacks, relevant adjustable parameters and its governing approximation visible beside the output.
- Each quantitative curve identifies its observable and units. Equilibrium enrichment, RF absorption, diffusion spreading and product recovery must not share a fabricated common score.
- Live sliders recompute the model rather than move pre-authored traces. Invalid or out-of-regime parameters produce explicit applicability messages, not visually plausible silent fallbacks.
- Distinct modes have independent limiting-case benchmarks. Additive source/collision physics preserves inventory and the appropriate work/loss accounting; deterministic timestep tests are separate from stochastic ensemble convergence.
- No claim of experimental calibration, high-throughput engineering performance, comprehensive atomic data or full plasma self-consistency is made without that evidence.
- GPU appearance and deployed-control behavior require an actual permitted browser observation. Structural build tests cannot substitute for that verification.

This audit supplies coverage and model-boundary criteria. It does not approve future solver implementations, numerical checks or browser behavior that were not examined here.
