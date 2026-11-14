# Independent coupled-path review

Read-only production review, 2026-11-14. This reviewer inspected the current
sources and existing narrative/results descriptions; it did not execute a PDE,
import project modules, launch a VM, or independently authenticate retained
numeric payloads. The parent owns the shared safe-dev invocation. No producer,
physical coefficient, mesh, source, acceptance limit, or memory was changed.

## Verified execution path

`campaign107` reuses `radial_next106 -> directional_cross106 -> campaign106 ->
campaign105 -> campaign103 -> campaign101 -> campaign100 -> campaign99`.
`campaign105` replaces the shared producer's `Flow` with `SourceFlow` plus the
stationary viscous-wall reconstruction; `campaign106` replaces `Diffusion` with
`FVDiffusion`. The accepted step remains:

1. Euler `advance_with_receipt`: two-stage SSPRK2, using the reconstructed HLLC
   face fluxes and corrected radial geometric source.
2. `Electro.advance`: simultaneous backward-Euler charge, radial momentum and
   angular momentum; cell total energy receives electromagnetic work and Joule
   heat. Mass, species and axial momentum are copied unchanged.
3. `FVDiffusion.advance -> Diffusion.advance`: Q1 stress updates all three
   momenta, then transfers kinetic change plus physical dissipation plus
   backward-Euler damping into total energy.
4. Overridden `FVDiffusion.conduct`: FiPy conduction using the incoming conserved
   cell mass/species heat capacity and the post-stress thermal energy.

Only step 1 changes cell mass. Its signed mass change is exactly the divergence
of shared area-weighted radial/axial face fluxes. `SourceFlow` changes only radial
momentum. Steps 2–4 can therefore change later density through velocity,
temperature/pressure and centrifugal balance; a nonzero D pressure response is
not itself a density source.

Evidence: `campaign99.py:54–104`, `campaign105.py:14–22`,
`campaign106.py:16–18`, `flow.py:189–266`, `force105.py:71–77`,
`electro86.py:96–147`, `diffusion86.py:184–226`, `heat106.py:45–64`.

## Mass, rotation and energy consistency

The HLLC energy is total gas energy, including swirl, evaluated at the same
face-specific radius used for angular momentum. Pressure work is included in
the energy flux. The angular/species rewrite uses the same mass flux and
upwind specific quantities; in each HLLC star region its mass-flux sign is the
contact-speed sign, so this rewrite is consistent with that star construction.
The cylindrical centrifugal source belongs in radial momentum, not as an
additional total-energy source. These checks do not expose a demonstrated
mass-flux/energy inconsistency.

The D update already deposits `viscous_heat + damping` into thermal energy:
`delta(E_total) = delta(K) + heat`. Adding the heat again would double-count it.
Keeping cell total energy fixed during stress would instead suppress local
stress-work transport. The actual FiPy capacity is energy/temperature/volume;
its lack of an old varying capacity is consistent with fixed mass within this
split. The inactive inherited FE conduction matrix is not the heat operator.

The production composition is first-order Lie splitting overall despite the
Euler substep's SSPRK2. This is a method property, not an established bug.
Passing the declared timestep gates bounds their reported comparisons; it
does not independently identify the accumulated splitting error at every mesh.

## What the current evidence does not establish

The reported 5.595688% density discrepancy is a failed acceptance test, not a
proof that an equation is wrong. A sharpening late ring, mesh-dependent initial
steady torsion, coarse/fine state sensitivity, and operator restriction
commutators remain compatible with ordinary spatial underresolution. Isolated
smooth stress and heat MMS results do not test their feedback through the actual
mass/pressure/swirl loop. Conversely, the shrinking-wall-row strong-force error
does not establish a defective finite-time Galerkin solution.

The finite-time stress test reports contraction and errors but currently asserts
only momentum/trace budgets (`test_evolution108.py:107–122`). Its numeric report
must be read to establish convergence; a green test alone does not establish it.
The heat MMS does assert contraction and finest error. Neither result constitutes
experimental or full coupled numerical qualification.

## Most discriminating bounded next probe

First use the remaining already-declared axial/joint checks rather than choose
new mesh cuts around the failing feature. They address whether radial-only
refinement is being interpreted as coupled spatial convergence.

For a cheaper independent mechanism test, declare a short common-input coupled
restart experiment before executing it. Use the sealed 2 us fine state and
restrict its extensive channels onto each of the existing 80/160/320 ×48 grids;
record the known kinetic-to-thermal collapse of that restriction. Evolve the
unchanged A→E→D composition for one fixed short physical interval, recording
the accepted intermediate states and receipts. Run the middle mesh at the
production timestep policy and its half, without changing any gate or claiming
this restart as the original trajectory. An interval such as 0.1 us is a probe
scope choice, not a fitted coefficient or an acceptance threshold; freeze it
and resource-preflight it first.

At every accepted Euler stage, accumulate the exact signed radial and axial
face-mass changes; at E/D record pressure, centrifugal force and thermal/work
changes. Check that their ledger reconstructs the final mass increment, and
compare the actual final density increment with the original exact-panel norm
as a diagnostic. This removes the separate mesh-dependent torsion initializer
and exposes whether a spatial difference grows through A, E or D feedback.
It retains restriction's subcell-moment limitations, so contraction or failure
does not uniquely validate or condemn an operator. A separately authored
analytic coupled MMS is still the stronger eventual consistency test.

No production correction is justified by this inspection. Changing conductivity,
viscous-heating partition, wall stiffness, reconstruction diffusivity, or closure
to cross 5% would currently risk fitting this one comparison. A demonstrated
coupled inconsistency should precede any such change; otherwise complete the
fixed matrix and preserve the failing result.
