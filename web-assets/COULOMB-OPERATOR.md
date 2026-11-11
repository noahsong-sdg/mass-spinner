# Equal-weight Coulomb collision operator

Implemented for Mass Spinner's prescribed-field kinetic model. This is a local, random-batch approximation to the weak-coupling Landau ion–ion operator. It is not the cold-neutral operator, a thermostat, an electron response, or an experimentally calibrated plasma model.

## Governing coefficient and primary source

Wang, Lin, Caflisch, Cohen and Dimits, *Particle simulation of Coulomb collisions: Comparing the methods of Takizuka & Abe and Nanbu*, JCP 227 (2008), [DOI 10.1016/j.jcp.2007.12.027](https://doi.org/10.1016/j.jcp.2007.12.027), [author full text](https://www.math.ucla.edu/~caflisch/Pubs/Pubs2008/nanbuConvergenceJCP2008.pdf), was opened and read at equations 1–2 and the method/convergence sections. Its TA angular rule is a zero-mean Gaussian `delta=tan(theta/2)` with SI variance

```
sigma_delta² = q_a² q_b² n_partner lnLambda dt
               / (8 pi epsilon0² mu² |v_a-v_b|³)
mu = m_a m_b/(m_a+m_b).
```

Uniform azimuth completes the angular law; post-collision relative speed is preserved, and center-of-mass reconstruction preserves pair momentum and energy. The source discusses species-separated pairing, with its associated density bookkeeping. It reports finite-timestep and sampling errors, so using its angular law does not establish exact finite-step Landau evolution. The original 1977 article was not retrieved here.

## Mixed-cell normalization: separate derivation

This implementation shuffles **all** equal-weight ions in one cell, regardless of species, and pairs adjacent indices. It is a random-batch discretization with an explicitly derived finite-sample normalization, rather than a claim to copy the source's species-separated pairing schedule.

Let there be N representatives, total physical ion density n, each representative's density contribution n/N. The empirical infinitesimal collision generator for a tagged representative sums the contributions of every other representative. The identical-velocity self contribution is omitted.

- Even N: every tagged representative is paired and each other index has probability 1/(N−1) to be its partner. Use `n_partner=n(N−1)/N`, so the expected contribution of any other representative is n/N.
- Odd N: a uniformly random representative is unpaired. The unconditional probability to meet each other index is 1/N. Use `n_partner=n`, again giving n/N per other representative.

Therefore different species automatically contribute their own density times their charge/mass-dependent angular coefficient in the infinitesimal generator, including unequal populations. A caller must supply total **cell** density from equal physical weights and the actual cell volume. Using the full column density in every populated cell, unequal weights, or additional species-separated collisions would change this operator.

## Pair map, zero relative velocity and numerical limits

The relative vector is rotated in an orthonormal transverse basis with uniform azimuth. Its arbitrary basis orientation has no effect on the probability law. The transformed velocities are reconstructed from conserved center velocity and the mass fractions. Species identifiers and positions are unchanged.

Exactly identical velocities exchange no momentum or energy. This branch does not introduce a relative-speed floor. Positive but small speeds use the actual coefficient, without clipping. Nonfinite coefficients are rejected. The rational trigonometric formula remains finite for large finite angular variance, but that does **not** imply timestep accuracy. The kernel reports maximum/mean variance and counts variance >0.1 as a resolution diagnostic. The 0.1 boundary is a reporting convention, not a plasma validity threshold. No pair is silently discarded or given a capped rate.

`scatterCoulombPair` returns velocities and variance without mutating its arguments. `collideCoulombCell` updates each participating object's `velocity` property; it does not mutate velocity array entries in place. The cell summary includes attempted pairs, unpaired count and zero-relative-speed pairs. When density or dt is zero, no pairs are attempted.

An optional final `onPair(a,b,deltaMomentumA)` observer receives the exact impulse in kg m/s before the velocities are replaced. The caller can accumulate the signed and absolute **individual-pair** torque errors, preventing cancellation inside one cell from hiding nonlocal impulses.

## Independent normalization benchmark

The Rutherford small-deflection relation theta≈2b90/b, integrated over encounter annuli, gives

```
b90 = q_a q_b/(4 pi epsilon0 mu g²)
d<theta²>/dt = 8 pi n g b90² lnLambda.
D_sphere = (d<theta²>/dt)/4
<P_l(cos theta)> = exp[-l(l+1) D_sphere t].
```

In the cold, infinitely heavy target limit, these are analytic velocity-pitch-angle moments. Tests use a target/test mass ratio 10^9, four independent seeds and 4096 test particles per seed. They compare P1 and P2 at dt, dt/2 and dt/4 to that independently integrated Rutherford result, rather than deriving the expected answer by calling the production variance function. This checks physical seconds, charge powers, reduced mass, 8-pi coefficient and the angular sampling law in a controlled limit. It does not validate arbitrary nonlinear plasma states.

Additional one-step mixed-charge tests compare measured deflection rates with the independent sum of represented partner densities for N=2,3,4,5,9, covering both parity branches. An oblique-vector test compares mean directions and full second-moment tensors with rotated axis-aligned results. Separate homogeneous mixture tests check exact total momentum/energy, equal-temperature Maxwellian stationarity, temperature exchange, drift decay and anisotropy relaxation across timestep refinement and independent seeds.

## Spatial and physical boundaries

The kernel is homogeneous within its caller's cell. At different particle positions, equal-and-opposite impulses conserve total linear momentum and kinetic energy but can change mechanical angular momentum by `(x_a−x_b) cross Delta p_a`. The orbit solver must report this torque and demonstrate cell refinement; the collision kernel cannot prove total canonical angular-momentum conservation for a spatial grid. A uniformly heated single cell is not a double-well equilibrium benchmark.

The operator assumes weak coupling and screened Coulomb encounters with externally specified lnLambda. No magnetized collision correction, strong-coupling operator, screening evolution, charge exchange, collective fields, electron collisions, sources or sinks is included. Passing the homogeneous checks does not close cell/particle/timestep convergence of a finite separator or experimental validation.

## Executed checks

`./node_modules/.bin/tsx --test tests/coulomb.test.ts`: **7 passed, 0 failed**, about 20 seconds. The Lorentz benchmark's maximum absolute P1/P2 errors were 0.00877 / 0.00142 / 0.00175 for 15/30/60 steps. Sampling prevents a monotone error sequence; the finest moments differ from their independent analytic values by less than 0.002.

For the homogeneous 40u/84u mixture at n=10^18 m^-3, lnLambda=10 and elapsed 0.2 ms, four independent 1024-particle seeds gave temperature-gap ratios 0.584/0.597/0.548, drift-gap ratios 0.500/0.488/0.495 and anisotropy ratios 0.594/0.616/0.605 at 160/320/640 steps. These demonstrate the direction of relaxation and finite-sample consistency under refinement, **not a precise deterministic relaxation curve**; their nonmonotone spread is material. The independent audit adds a separate analytic Maxwellian initial-temperature-exchange coefficient test rather than interpreting this qualitative check as rate calibration. Maxwellian temperature and velocity-CDF stationarity, conservation and the observer impulse consistency also passed.

Standalone strict TypeScript check passed: `./node_modules/.bin/tsc --noEmit --target ES2022 --module NodeNext --strict --lib ES2022,DOM src/coulomb.ts`. All checks used the user's scoped host-execution exception; no security settings or credentials were changed. The parent owns the complete integrated snapshot, test/build gates and publication evidence.
