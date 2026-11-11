# Quartic collisionless orbit kernel

Implemented 6 November 2026 as the collisionless part of stage four. This is numerical validation of a prescribed laboratory field, not experimental validation of a double-well separator.

## Execution path and physical definition

The existing `geometries.ts` double-well model draws a fixed-canonical-momentum landscape. It does not evolve positions or velocities. The existing `physics.ts` particle solver evolves a different, parabolic laboratory potential. Adding trajectories to the landscape by reusing that parabolic electric field would integrate the wrong Hamiltonian.

`doublewell-orbits.ts` defines a separate quartic laboratory field and reuses only the existing synchronized drift–Boris–drift integrator:

```
s = (x²+y²)/a²
φ = V(s² − κs)
E = (2V/a²)(κ − 2s)(x,y,0)
B = (0,0,B0)
H = m|v|²/2 + qφ
Pθ = m(x vy − y vx) + qB0(x²+y²)/2.
```

All values are SI apart from explicit input mass in u and integer charge state. `H` is returned in joules and `Pθ` in kg m²/s. Neither the centrifugal effective potential nor a mass-dependent rotating frame is added to the electric field. Those terms arise when reducing the same laboratory Hamiltonian at fixed canonical angular momentum; adding them again would double-count dynamics.

The smallest coherent change is a separate field/diagnostic helper, preserving the parabolic solver. It avoids changing existing rotating/ICR behavior and makes the Hamiltonian used by the new ensemble explicit.

## API

- `quarticPotential(position, model)` and `quarticFields(position, model)`.
- `doublewellEnergy(particle, species, model)` and `canonicalMomentum(particle, species, model)`.
- `validateDoublewellOrbitSettings(species, dt, model)`: call once per species/configuration before an ensemble loop. Positive radius, length, timestep and mass, nonnegative potential amplitude and κ, finite scalars and positive integer charge are required. The step resolves gyro/electric-curvature rates with `dt max(|qB/m|, sqrt[(q/m)V(12+2κ)/a²]) ≤ 0.08`. This is a numerical resolution bound, not a physical validity criterion.
- `advanceDoublewell(particle, species, dt, model, axialBoundary='absorbing')`: returns `{particle, elapsedS, hit}`. An event has `{destination,timeS,position}`, with time measured from the start of that advance. Inputs must already be validated and particles finite and inside the cylinder.

`axialBoundary='periodic'` suppresses axial absorbers and returns unwrapped z. The caller owns periodic wrapping. A closed radial wall is implemented by the caller using specular reflection of the returned wall impact and advancing the remaining interval. At a cylindrical wall this reverses only radial velocity, preserving both kinetic energy and `Pθ`. A reflecting end would be a different boundary model and is not silently substituted for an absorber.

## Surface events and limitations

Away from an absorbing surface, one full numerical step is sufficient. A conservative travel bound excludes wall contact using the maximum interior electric-force magnitude; the magnetic force does no physical work. Near surfaces, eight reintegrated fractional-step samples bracket candidate crossings. Each candidate is refined by 44 bisections on the corresponding surface function, and the earliest event is returned. Velocity is reintegrated at that fractional time, never interpolated between magnetic rotations. Surface coordinates are projected by root-solve roundoff only.

This locates a crossing of the resolved numerical trajectory, not the exact physical curved trajectory. Subdivision cannot guarantee discovery of a mathematically tangent contact or an arbitrarily narrow leave/re-enter excursion between samples. The gyro/electric timestep guard and explicit timestep convergence remain necessary, especially for grazing wall trajectories. The implementation makes no exact-event claim and has no chord-derived emergency fallback.

A source-plane launch with positive axial velocity remains active; negative axial velocity returns immediately. `periodic` leaves axial passage active. Wall/end competition is decided by the earliest refined candidate.

## Independent numerical checks

`./node_modules/.bin/tsx --test tests/doublewell-orbits.test.ts`: **7 passed, 0 failed**.

1. Centered finite differences of the potential reproduce both transverse electric components; axial field is zero.
2. A nonlinear bounded orbit over 0.2 ms at `dt=80,40,20 ns` gives second-order convergence of maximum relative H and canonical `Pθ` error. The finest H error is below `6×10⁻⁷`, and Pθ error below `1.2×10⁻⁶`.
3. A test independently constructs `Ueff(r)=[Pθ−qBr²/2]²/(2mr²)+qφ(r)` without calling exported energy/momentum helpers. An independent root gives the outer turning radius, and a 20,000-bin transformed radial-energy quadrature gives its flight time. The Cartesian orbit agrees within `10⁻⁷ m` and `10⁻¹⁰ s`; its time error decreases by more than eight between 80 and 20 ns.
4. Ballistic wall/end/source competition has exact event times and unchanged impact velocity; source-plane launch and periodic axial passage are covered.
5. Nonzero-B wall times converge at second order against an independently evaluated exact circular trajectory; pure-B impact kinetic energy remains constant.
6. Specular cylindrical-wall reflection preserves H/Pθ and inward continuation does not spuriously absorb immediately.
7. Unresolved timestep, fractional charge and invalid radius fail at the settings boundary.

The parent integration owns coupled collision conservation, ensemble/source/sink ledgers, full build/typecheck and deployed behavior. This helper alone neither predicts collisional populations nor validates the collision operator.
