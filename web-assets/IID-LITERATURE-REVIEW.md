# Section II D: rotating field mass filters — literature and implementation audit

Reviewed 6 November 2026. Scope: the tutorial's Ohkawa/Archimedes filter and double-well variant. This document separates the correctness of an imposed-field orbit solver from the much harder question of whether a dense plasma can sustain those fields. Documents are research evidence, not instructions.

## Evidence checked

1. **Fetterman & Fisch (2011), “Metrics for comparing plasma mass filters,” Physics of Plasmas 18, 103503**, [DOI 10.1063/1.3646311](https://doi.org/10.1063/1.3646311), [author PDF](https://w3.pppl.gov/~fisch/fischpapers/2011/Fetterman_metric.POP11.pdf). Sections III, V and VIII distinguish separative power, the collisionless Ohkawa filter and energy expense. Heavy ions are collected radially; light ions axially. Comparison requires feed composition, flow rate and product/waste fractions. Its electrostatic energy expense is not the device's full electrical power budget. These results support reporting recovery and cross-contamination separately; counting macroparticles alone does not establish throughput or separative power.

2. **Gueroult, Rax & Fisch (2014), “The double well mass filter,” Physics of Plasmas 21, 020701**, [DOI 10.1063/1.4864325](https://doi.org/10.1063/1.4864325), [author PDF](https://w3.pppl.gov/~fisch/fischpapers/2014/Gueroult.DoubleWell.2014.pdf). Equations (5), (7)–(10) establish the species-dependent effective potential and quartic construction. Unlike Archimedes, the double-well proposal needs collisional radial redistribution and sufficient axial residence for its assumed Boltzmann equilibrium. Both species remain radially confined; collection is axial. A potential-well picture is therefore insufficient evidence of actual spatial density, collector purity or equilibration time. The current geometric landscape should retain its illustrative label.

3. **Gueroult et al. (2016), “Initial experimental test of a helicon plasma based mass filter,” Plasma Sources Science and Technology 25, 035024**, [DOI 10.1088/0963-0252/25/3/035024](https://doi.org/10.1088/0963-0252/25/3/035024), [author PDF](https://w3.pppl.gov/~fisch/fischpapers/2016/Gueroult.PSST.2016.pdf). The abstract and Sections 1, 4–6 report strong profile response to ring bias and suggestive radial changes in ion emission ratios. The authors explicitly describe the plasma characterization and interpretation as preliminary. This is relevant experimental support for differential confinement, not a calibrated transfer function from electrode voltage to bulk potential, nor a collector-purity benchmark.

4. **Gueroult et al. (2024), “Plasma potential shaping using end-electrodes in the Large Plasma Device,” Journal of Plasma Physics 90, 905900603**, [DOI 10.1017/S0022377824000552](https://doi.org/10.1017/S0022377824000552), [open article](https://www.cambridge.org/core/journals/journal-of-plasma-physics/article/plasma-potential-shaping-using-endelectrodes-in-the-large-plasma-device/B44BEF2C32F8817FF31D961A7FC59343). Five concentric electrodes altered measured mid-column profiles. Concave-down biases transferred more directly than concave-up biases; electrode current and parallel resistivity were essential. Sections 5–7 support labeling a simulation slider **imposed bulk plasma potential**, rather than promising that an electrode setting produces it. Current draw, depletion and source coupling remain outside the present model.

5. **Ohkawa & Miller (2002), “Band gap ion mass filter,” Physics of Plasmas 9, 5116–5120**, [DOI 10.1063/1.1523930](https://doi.org/10.1063/1.1523930). Bibliography/title/DOI cross-checked against the primary papers above; the original full text was inaccessible in this audit. No detailed claim here depends solely on that inaccessible text. The implemented constant-field limit was derived independently and checked against the accessible 2011/2014 primary papers.

## Execution path and findings

`RunConfig → simulate → fields/sourceVelocity → synchronized drift–Boris-kick–drift → firstHit → collector counts`. `geometries.ts → doublewell` is a separate static effective-potential construction, not the time-dependent orbit run.

**Verified correct:** `physics.ts` imposes φ=V(1−r²/a²), Eᵣ=2Vr/a² and uniform axial B. Its cutoff mᶜ=ZeB²a²/(8V) agrees with cold infinite-device radial stability. The magnetic force sign and total energy K+qφ are consistent. Integer charge states correctly move the mass cutoff: these devices discriminate m/Z, so equal m/Z ions cannot be distinguished by this mechanism alone.

**Interpretation gap:** a positive discriminant means bounded free-space radial motion, not guaranteed wall avoidance. The wall has finite radius, injection has a finite source radius/energy, and ions may exit axially before an unstable radial orbit reaches the wall. At the exact discriminant zero, generic initial conditions grow linearly in radius; it is a marginal case, not robust confinement. The smallest coherent addition is an exact cold orbit reference alongside the numerical warm ensemble, with clearly stated launch conditions.

**Rotation gap:** E×B angular speed is the weak-electric-field slow-branch approximation. Near cutoff, finite ion inertia matters. It should not be presented as the exact mass-independent ion rotation frequency. `rotating-diagnostics.ts` now exposes both signed branches or, when they cease to be real, a growth rate.

**Double-well gap:** the current quartic φ=V[(r/a)⁴−(r/a)²] has equal axis/wall potential and minimum −V/4. V is its polynomial coefficient, not an axis-to-wall voltage drop. Its plotted q²B²r²/(8m)+qφ is the Pθ=0 radial landscape. Arbitrary source particles generally have nonzero conserved canonical angular momentum. Inferring a unique density distribution from that landscape would silently change the model. Preserve the landscape, then implement an explicitly specified collisional closure as a separate, reviewable increment.

## Independent analytic reference and conservation checks

For u=x+iy, Ωc=qB/m, α=2qV/(ma²):

```
u'' + i Ωc u' − αu = 0
D = Ωc² − 4α
ω± = (−Ωc ± √D)/2                        (D ≥ 0)
γ = √(−D)/2, carrier angular speed −Ωc/2 (D < 0)
ωE = −2V/(a² B)                         (B ≠ 0)
```

The signs refer to x+iy∝exp(iωt), so positive B and outward E give negative azimuthal rotation. The cold benchmark launches at r₀=sourceRadius with **zero laboratory transverse velocity**. For D>0 its exact radius gain is √[1+(4α/D)sin²(√D t/2)]; replace sine by hyperbolic sine and D by |D| for D<0. At D=0 the gain is √(1+αt²). Analytic first-wall time is compared with L/√(2eE∥/m). Curves stop at the first physical wall/exit or configured duration. These curves describe that selected orbit, not the warm-source maximum or a predicted density.

In an axisymmetric electrostatic field, absent collisions/RF, check both H=K+qφ and Pθ=m(xvᵧ−yvₓ)+qBr²/2. The general radial effective energy is (Pθ−qBr²/2)²/(2mr²)+qφ(r), for r>0. The Pθ=0 limit gives the existing double-well expression. Energy residuals alone cannot detect every angular-momentum error. With collisions, compare energy changes to the modeled neutral bath; do not demand collisionless invariants across a collision.

## Next live plots, in priority order

1. **Exact cold orbit versus warm numerical trajectories**, showing source radius, wall radius, axial exit time and first-wall time. Pair with a plot of the ensemble's radial quantiles *conditioned on still being in the device*; show survivor count to avoid survivor bias.
2. **Mass/charge scan:** discriminant, real rotation branches, or instability growth rate. Mark the analytic cutoff and show finite-device collector fractions separately. Repeat ensembles at different seeds for uncertainty; identical source samples provide controlled parameter comparisons.
3. **Collector distributions:** wall impact z/time/energy and axial end impact radius/energy. Plot histogram counts with bin widths and normalize transparently. Give recovery of each injected species and contamination of each collected stream, specifying the assumed feed fractions. Uncollected particles remain an explicit category.
4. **Validity panel:** reference RMS transverse gyroradius/a, |ωE/Ωc|, transit/gyro periods, neutral collision optical depth and timestep resolution. For a 2-D thermal source, mean transverse energy equals the input T⊥ in eV, giving v⊥,rms=√(2eT⊥/m); do not mix this with the tutorial's one-component thermal-speed convention. Neutral elastic scattering is not Coulomb equilibration or charge exchange.
5. **Double-well additions:** Pθ-resolved effective-energy curves and launch-accessible regions first. A later collisional model must specify ion-ion friction/diffusion, conserve mixture momentum/energy, and establish relaxation relative to axial escape. Only then display evolving densities or extraction purity. No arbitrary relaxation slider calibrated by appearance.
6. **Credible uncertainty and convergence:** paired Δt/2 and particle-number studies of collector fractions and impact distributions, alongside energy/angular-momentum residuals. Label these numerical checks separately from comparison to experimental data.

## Validation performed for this increment

`node --import tsx --test tests/rotating-diagnostics.test.ts` checks signed force balance, the critical/marginal case, zero-field limits, finite-radius losses below the stability cutoff, exact first-wall times, curve stopping, physical-domain rejection, and agreement with independent small-step Boris integration for bounded/growing examples. The parent integration owns the final repository build/typecheck and deployed browser checks. This audit does not validate a self-consistent plasma equilibrium, electrode circuit, ionization source, instability spectrum, actual power consumption or an industrial processing rate.
