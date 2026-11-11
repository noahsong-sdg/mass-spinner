# Independent physics audit — 2026-11-06

## Scope and verdict

Reviewed the tutorial's Section II and relevant Section III, `src/physics.ts`, `src/collisions.ts`, `src/centrifuge.ts`, their tests, and the new `src/geometries.ts` and `src/transport.ts` implementations. Traced configuration → force/equilibrium/closure → numerical step → collection → diagnostics. No browser interaction or experimental data was available to this reviewer.

The core signs, units and reduced-model equations are internally consistent. The audit found and corrected two concrete numerical defects, documented below. Independent analytic tests support limited claims about these equations; they do not validate every separator as an engineered plasma device. Do not describe the collection of reduced diagnostics as maximal physical fidelity or as reconstruction of every apparatus in Section II. A catalogue can cover all named concepts while the implementation status remains mixed.

## Corrected finding 1: absorbing steps bypassed collision resolution

**Severity:** medium for public API; high if dense/coarse runs were interpreted physically.

The old boundary branch returned before evaluating the optical-depth guard. A finite-step chord could cross the end plane and record perfect transmission even when the particle would almost certainly collide before reaching that end. Reproduction: B=V=0, dt=duration=0.0006 s, one particle per species, n=1e25 m^-3 and sigma=1e-19 m². Both species were accepted at the end with zero collisions even though n sigma L ≈ 2.8e6.

**Fix:** the optical-depth resolution invariant now runs on every proposed step before boundary routing (`src/physics.ts:208–213`). The speed estimate uses the larger initial/final speed; collision sampling otherwise retains the documented final-speed, operator-split approximation. This is a narrow domain-boundary correction, not an invented dense-plasma fallback. The regression requires the unresolved case to fail explicitly.

**Remaining limitation:** at most one collision is sampled after a full orbit step. The last fractional flight before absorption does not sample collisions. With per-step optical depth <=0.02 this is a controlled small-step approximation, not an exact event-driven Monte Carlo method. Timestep and ensemble convergence remain necessary.

## Corrected finding 2: impact energy was not validated by endpoint energy residual

**Severity:** medium for impact-energy diagnostics; the orbit's full-step energy check itself was not wrong.

The old code linearly interpolated velocities between synchronized step endpoints. Interpolating two rotated vectors shortens their length, so it spuriously removed kinetic energy even in a uniform magnetic field. Meanwhile the energy residual inspected only the full, unabsorbed step. A half-step end interception with an exact kinetic energy of 40 eV produced 39.9955309488 eV while reporting an energy residual of zero.

**Fix:** reintegrate the fractional interval with Boris and evaluate RF at that interval's temporal midpoint (`src/physics.ts:223–238`). RF work is recomputed over the same fractional numerical displacement. Added `maxRelativeImpactEnergyError`, which compares impact velocity plus the recorded boundary position against energy/work/loss accounting separately from the full-step diagnostic. This fixes the interpolation's root cause while retaining the existing crossing approximation and explicit diagnostics.

**Tests:** exact uniform-B kinetic energy at several fractional impacts; resonant RF energy gain and fractional RF-work consistency against an independent analytic solution; second-order RF timestep refinement. All three new audit regressions passed.

**Remaining limitation:** first crossings still use a straight chord and impact time derives from its fraction. Recomputed fractional-step positions need not exactly coincide with that chord point in electric/curved motion; the separate impact residual reveals this. A dense trajectory root solve would be a broader future event-location change. No claim of exact mesh or curved-orbit interception is justified.

## Existing orbit and centrifuge models

- `fields()` has E=-grad(phi) outward for phi=V(1-r²/a²). Positive-ion rotation sign and circular RF polarization are consistent with v×B. The cold cutoff is an infinite-device radial stability threshold, not a collection efficiency.
- Maxwellian source velocities recover specified component variances and drift. The source is a pulse at the plane, not a steady reservoir flux distribution; negative axial velocities immediately return to the source. Equal m/q is degenerate only for equal velocity distributions, not automatically for equal fixed energies.
- Elastic scattering conserves both-body momentum/energy with recoil and isotropic outgoing relative velocity. The model assumes a cold stationary bath, a constant cross section and no neutral heating feedback. It has no measured cross-section calibration, charge exchange or Coulomb dynamics.
- The centrifuge's effective potential psi=phi−Omega B r²/2 is consistent with radial force balance for imposed rigid rotation. Quasineutral closure and Boltzmann electron pressure are solved, including unequal ion charges. Central fractions are not the feed/inventory composition. No relaxation time or throughput is calculated.
- Near-zero numerical energy residual is necessary for some benchmarks but insufficient to validate the prescribed fields, electron response, collision rates or an actual separator. Energy conservation can hold in a physically inapplicable model.

## New geometry diagnostics

Reviewed exact gyro curves, ideal toroidal curvature/grad-B deflection, the quartic radial Hamiltonian at Ptheta=0, and the adiabatic centrifugal/mirror barrier algebra. These are consistent as reduced benchmarks with their stated input conventions.

Important qualifications that must remain visible in the UI:

- Curved guiding-center drift requires rho/R << 1 and many gyroperiods during the bend. At fixed kinetic energies the drift speed is mass-independent for equal charges; differing transit speeds create the mass-dependent net displacement. Self-generated electric fields can remove the separation (tutorial §II B).
- The double-well model chooses an illustrative quartic potential; it does not reconstruct the referenced apparatus or solve collisional redistribution.
- The mirror diagnostic accepts B and radius endpoint ratios independently. It does not reconstruct a divergence-consistent full mirror field or demonstrate the topology/current closure needed for a real MCMF.
- Azimuthal-B/radial-E trajectories use the ideal Btheta∝1/r and logarithmic potential law in an annulus. No conductor, sheath, source or calibrated collector response is solved.
- POMS is explicitly a magnetic-core surrogate, not a reconstruction of the POMS azimuthator. A divergence-free authored field is not sufficient evidence that it reproduces the experiment or proposal. This mode must not be labeled a validated POMS device simulation.
- The rotating-magnetic-field proposal and other named subvariants in the metadata do not acquire a valid solver merely by being catalogued.

## New transport/atomic diagnostics

Independent algebra review found the Drude mobility and Einstein diffusion coefficients, Maxwellian step-cross-section ionization average, and bounded-energy time-of-flight CDF/pulse convolution internally consistent.

The tutorial's Eq.8 uses D≈(1/2)rho²nu with a typical rho²=kTi/(m Omega²). This is half the full Drude/Einstein coefficient when the same numerical nu is inserted. It is an approximate random-walk/collision-frequency convention difference, not evidence of a paper error. After this cross-check, the transport author implemented the tutorial Eq.8 coefficient directly for the Coulomb-diffusion option, kept Drude for the fixed momentum-transfer option, and rejected reuse of the Coulomb convention in drag/mobility. I reviewed those final equations (`src/transport.ts:52–58,111–117,134–139`); the convention difference is now explicit. This is still not quantitative Coulomb transport calibration. The tutorial's leading heavy-mass cancellation is robust to this factor of two and should be demonstrated rather than implying that all classical diffusion sharply separates mass.

Diffusion curves describe long-time guiding-center diffusive spread; at nu=0 a zero diffusion coefficient does not mean finite-temperature ion gyro-orbits have zero spatial extent. Drude startup inertia, boundaries, sheaths and turbulent transport are absent. The density input means electron density in ionization and light-background density in the Coulomb closure; those meanings must be labeled per mode.

The ionization model needs empirical atomic rates before element-specific predictive claims. A thresholded constant cross section is a useful teaching assumption, not measured cross-section physics. Ballistic TOF uses a bounded energy packet and source pulse; extraction optics, rotating collector acceptance, space charge and collisions remain unresolved.

## Evidence executed

Under the project's scoped host-execution authorization, with no sandbox/profile/credential changes:

- `node --import tsx --test tests/audit-regressions.test.ts`: 3 passed.
- `node --import tsx --test tests/physics.test.ts tests/realism.test.ts tests/collisions.test.ts tests/centrifuge.test.ts tests/audit-regressions.test.ts`: 35 passed.
- `npm run typecheck`: passed after the physics corrections.
- `node --import tsx --test tests/transport.test.ts tests/geometries.test.ts`: 17 passed after reviewing the final geometry/transport formulas, including the explicit Eq.8 coefficient convention.
- Independent before/after reproduction of the boundary collision bypass and uniform-B impact interpolation.
- Representative default thermal orbit runs at 20 ns and 10 ns, 96 particles/species. Ar 96 end and Kr 96 wall at both steps. Maximum Kr full-step residual fell from 3.8988e-7 to 9.7470e-8; impact residual from 3.7135e-7 to 9.3229e-8. These are numerical convergence observations, not real-device purity evidence.

Parent must run the final integrated suite/build/publication checks after merging all concurrently authored modules and UI. This review does not approve GPU appearance, live controls, atomic calibration or engineering prediction.
