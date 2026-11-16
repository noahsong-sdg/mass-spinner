# Nested radial coupling

## Problem and root cause

The fixed-source study in [radial results](RADIAL-DENSITY-RESULTS.md) resolved
gas density only at 1,024–4,096 radial cells. The coupled kernel required the
electrical and gas radial counts to match. Consequently gas refinement also
expanded every repeated two-dimensional current solve. This is a resolution
and cost barrier, not evidence for changing physical transport coefficients.

## Smallest change

Keep the electrical operator, physical closures, accepted-state iteration and
existing convergence gates. Permit nested equal-volume gas/electrical shells.
For k gas children of an electrical cell C:

```
Omega_C = sum(Omega_child) / k
torque_child = torque_C / k
heat_child = heat_C / k
```

Torque and Joule heat are integrated quantities, first summed over z. This pair
preserves integrated sources and `sum(torque * Omega)` in exact arithmetic.
Inertia weighting is appropriate when comparing physical angular momentum,
but would violate this electrical work identity with equal source splitting.
Same-grid inputs retain the previous accumulation order; CI compares two
complete public trajectories against commit `d2ce072` exactly.

This mapping defines piecewise-constant electrical-cell rotation and source
density in q=r². It does not integrate fine rotation across individual coarse
half-cell electrical resistances. Independent electrical mesh refinement is
still necessary. Neither interpolation nor a modified physical coefficient
would remove this requirement. Separate gas refinement is the smaller change
than modifying the established electrical operator at the same time.

## Frozen study

`scripts/probe-fuel-nested-coupling.ts` evolves the actual coupled kernel:
species transport, local inertia and angular momentum, rotation-dependent
current, Joule/shear/centrifugal energy and temperature-dependent neutral
transport. The setup is the existing conceptual argon cell: R=1 cm, L=10 cm,
N=10¹⁹, initial T=1,000 K and zero rotation, 1 V, 0.5 T, D=0.001 m²/s,
sigma_perp=0.01 S/m, sigma_parallel=0.1 S/m. The grounded upper disk occupies
half the end area. The three-cell tungsten liner and 0.1 W/K wall film are fixed.

Predeclared nine cases: gas radial cells {1024,2048,4096} crossed with
timesteps {64,128,256} over 1 microsecond. Electrical resolution is fixed at
16 radial by 32 upper-graded axial cells; current relative tolerance is 10⁻¹⁵.
No fitting to currents, temperatures or velocities is performed.

Each spatial triple shares native clocks; each temporal triple is compared
at accepted common clocks with interval wall heat aggregated. The existing
12-observable assessment is reused unchanged: both adjacent errors must meet
2% spatial / 1% temporal limits and contract. Representation-sensitive tiny
responses remain unresolved rather than receiving artificial error floors.
All accepted rows, source hashes, operational failures and partial cases are
retained in compressed streams. Tests and studies run offline in a 1 GiB,
one-CPU CI container. No local safe-dev study is modified.

## Admission limits

A pass at this fixed electrical mesh qualifies neither its continuum source
nor the physical closures. Liner resolution, fine-only startup clocks,
experimental agreement, meridional flow, charged-species transport, rarefaction,
electron energy and the full slider envelope remain separate questions.
The public adapter, defaults and 3D renderer remain unchanged. Numerical
energy/angular receipts are reported independently of mesh-convergence gates;
conservation alone does not establish an accurate spatial solution.
