# Finite-time radial transport

Historical v47 implementation. The rotor coupling described here is superseded by [Coupled separation and gas angular momentum](COUPLED-ROTOR-V48.md); the v47 evidence below is preserved unchanged.

## Scope and traced cause

The accepted `simulateFuelCentrifuge` supplies an exact two-lumped-rotor spin-up history and an **equilibrium reference at its final speed**. The previous motion adapter sampled that equilibrium separately from the uniform spin-up display. It did not solve a species continuity equation. A visual transition between those states therefore could not establish the rate of separation.

`src/fuel-transport.ts` adds a separate continuity calculation driven by the accepted neutral angular speed. It preserves the old equilibrium result and does not silently turn its pump/cascade reference laws into extraction boundary conditions.

This is **prescribed-rotation, isothermal, independent-species Smoluchowski transport with reflecting boundaries**. It is a useful conditional relaxation model, not a validated Marathon machine or fully coupled multicomponent fluid calculation. In particular:

- A fixed external bath supplies mobility and removes heat. Both species use the user-prescribed `radialDiffusivityM2S`; this is not a measured binary diffusion coefficient.
- Independent species fluxes do not enforce zero barycentric diffusive mass flux. Their sum need not obey a separately solved neutral momentum equation.
- The lumped rotor retains its uniform reference inertia: radial redistribution does not feed back onto angular momentum, drive, slip, pressure or temperature. Its speed is prescribed to this transport solver.
- No axial circulation, axial extraction, wall loss, pump depletion, cascade throughput, chemical state conversion or plasma transport is solved. An inventory cut is not a flow rate or a separation-work prediction.
- The application setting `pump` does not introduce an absorbing wall. The same closed-vessel transient is shown; existing steady pumping reference results remain separate.

## Equations and units

For species mass `m_s` (kg), fixed temperature `T` (K), radius `a` (m), common prescribed diffusion coefficient `D` (m²/s), and accepted neutral angular speed `Ω_n(t)` (rad/s):

```
J_s = -D [∂_r n_s - m_s Ω_n(t)² r n_s / (k_B T)]
∂_t n_s = -(1/r) ∂_r(r J_s)
J_s(0,t) = J_s(a,t) = 0
n_s(r,0) = volume-mean species density
```

The outward drift sign follows the centrifugal potential `U_s=-m_s Ω_n²r²/2` and Einstein mobility `D/(k_B T)`. Define `y=r²/a²`, normalized per-species volume density `q_s=n_s/mean(n_s)`, `κ=4D/a²` (s⁻¹), and `β_s=m_s Ω_n²a²/(2k_B T)`:

```
∂_t q_s = κ ∂_y [y (∂_y q_s - β_s(t) q_s)]
∫_0^1 q_s dy = 1
q_s,eq(y) = β_s exp[β_s(y-1)] / (1-exp[-β_s])
```

The nonrotating limit is `q=1`. The cylindrical volume Jacobian is contained exactly in `dy=2r dr/a²`. Each species has unit conditional inventory even when its actual mixture fraction is zero; actual mixture density/composition is weighted by the supplied bulk fraction `x`. Recovery of an absent light species is `null`.

## Existing numerical method, adapted to cylindrical volume

We use exponential Scharfetter–Gummel (SG) fluxes and backward Euler. This avoids central-flux negative densities at large cell Peclet number. It is a small implementation of the published method, not a new transport scheme or use of the FiPy runtime.

For `N` uniform-y cells, `h=1/N`, cell probabilities `P_i=∫cell q dy`, and face `y_f=(i+1)h`, let `B(z)=z/(exp(z)-1)` and `z=βh`. The outward/inward rates across that face are:

```
A_i = κ y_f B(-z)/h²
C_i = κ y_f B( z)/h²
dP_i/dt = A_(i-1) P_(i-1) + C_i P_(i+1)
           - [A_i + C_(i-1)] P_i
```

End-face rates are zero. Each interior flux leaves one cell and enters its neighbor, so inventory is conserved. Rates are nonnegative. The implicit matrix is an M-matrix, hence preserves positivity. A positive-remainder Thomas factorization avoids subtracting two nearly equal stiff diagonal contributions. Bernoulli evaluation uses its small-argument expansion and a large-positive-argument exponential form.

For fixed `β`, `A_i/C_i=exp(βh)`, so the discrete stationary masses have exactly the ratios of **integrated continuous exponential equilibrium masses** on this uniform-y grid. This is stronger than matching center values alone. It does not establish transient accuracy. Backward Euler is first order in time; coefficient evaluation at the step midpoint does not change that order.

No mass renormalization or negative-density clipping is performed. Raw balances are retained. Nonfinite states, a per-step relative inventory error above `2e-10`, or accumulated error above `2e-8` fail explicitly. Cell-count bounds 2–1024 and step-count bounds 1–32768 are resource limits, not a physical validity claim. Extreme concentration can be unresolved despite positivity and conservation; refinement is necessary.

Primary sources:

- [Chang & Cooper (1970), *A practical difference scheme for Fokker–Planck equations*](https://doi.org/10.1016/0021-9991(70)90001-X), J. Comput. Phys. 6, 1–16: the classical equilibrium-preserving drift/diffusion discretization principles.
- [Heida, Kantner & Stephan (2021), *Consistency and convergence for a family of finite volume discretizations of the Fokker–Planck operator*](https://www.numdam.org/articles/10.1051/m2an/2021078/), ESAIM M2AN 55, 3017–3042: SG as a finite-volume Fokker–Planck method and its consistency/convergence conditions.
- [Almeida, Bubba, Perthame & Pouchol (2019), *Energy and implicit discretization of the Fokker–Planck and Keller–Segel type equations*](https://www.aimsciences.org/article/doi/10.3934/nhm.2019002), Networks Heterog. Media 14, 23–41: exponential finite-volume methods with implicit time integration, mass, positivity, steady-state and energy structure.

These sources justify the numerical method. They do not validate the independent-species centrifugal-bath approximation for a particular centrifuge.

## Integration API

```ts
const transport = simulateFuelTransport(acceptedRotorResult, {cells:64,steps:512});
const state = sampleFuelTransport(transport, physicalTimeS);
```

`transport.snapshots` contains physical times between zero and `config.durationS`, not normalized animation frames. At most approximately 101 saved intervals are retained. Every snapshot exposes:

- `timeS`, `ionRadS`, `neutralRadS` from the accepted exact rotor response;
- `lightMass`, `heavyMass` (cell conditional inventories), `lightCDF`, `heavyCDF` (edge sums), with `transport.radiusEdgesM` locating the nonuniform-r edges;
- `profiles` with the existing 81-point `{radiusM, lightDensityRatio, heavyDensityRatio, lightFraction}` interface;
- `collection` for the current inventory cut, plus raw `balances` and zero `boundaryFlux`.

`neutralInertiaRatio` reports the inertia implied by the reconstructed species densities relative to the uniform-density inertia still prescribed in the rotor. With species neutral mass fractions `w_s`, it is `2 Σ_s w_s Σ_i P_s,i y_center,i`. It starts at one and is bounded above by two (the finite grid reaches `2-1/N`). It is an **omitted-feedback indicator**, not an evolved correction or permission to substitute an inconsistent speed: large departures from one expose the limitation of the prescribed-rotation closure.

Profiles are a piecewise-constant reconstruction in y, not an additional smoothed physical solution. The sample helper interpolates **cell inventories** with nonnegative convex weights, then recomputes CDFs, profiles and nonlinear purity ratios. This preserves inventory and positivity. Angular velocities are evaluated at the requested physical time, independently of the saved snapshot spacing. Times past the solved interval return its endpoint; physics is never extrapolated. The sampling interpolation adds temporal reconstruction error separate from the evolution timestep error.

The public pure step `advanceFuelRadialMass(mass,beta,4D/a²,dtS)` permits independent fixed-potential and nonuniform-initial-state qualification. `fuelTransportCDF(mass,radiusFraction)` integrates the cellwise volume density. Its exact radius-0/1 endpoint convention expresses a conditional CDF, while raw edge sums and balance diagnostics remain unmodified.

## Qualification gates and evidence status

The implementation tests in `tests/fuel-transport-v47.test.ts` exercise:

1. Exact integrated equilibrium fixed point at β=0 through 10⁵, inventory and positivity under stiff implicit steps.
2. Fixed-potential relative entropy `ΣP log(P/P_eq)` decreases. Raw Shannon entropy is not asserted to increase: centrifugal concentration can decrease it, and a time-varying imposed potential performs work.
3. A separate small-step explicit conservative flux oracle checks finite-time distribution values without the implicit solver.
4. Independent timestep and radial-grid refinements check distribution L1 errors, not only a cutoff scalar. First-order temporal and reducing spatial errors are required.
5. Accepted rotor-driven spin-up stays distinct from its instantaneous equilibrium; interpolation conserves species inventory and preserves positivity.
6. No-drive, zero-duration, cut endpoints and absent species preserve physical meaning and avoid ratios for empty products.

An independent auditor additionally derives a Neumann cylindrical diffusion eigenmode using the first root of J₁. This checks the geometric factor four and actual diffusion rate against a continuum analytic solution, rather than only comparing implementations of the same discrete operator.

**Verification status at writing:** source and tests prepared; delegated agents do not run host project code. Root must sync this exact host snapshot into the Apple safe-dev VM, run the narrow tests and final required checks, and record the actual outcomes. Passing these gates qualifies this bounded numerical closure, not fully coupled real-device transport.
