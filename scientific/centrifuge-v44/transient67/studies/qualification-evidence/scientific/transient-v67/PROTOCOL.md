# v67 prospective transient and spatial assessment

Frozen before scoring whole histories. Preserve v66 endpoint results unchanged.
No live promotion or experimental accuracy claim follows from these studies.

Use the same Li6/Li7 case as v66: R=0.01 m, L=0.1 m, N=1e19,
light fraction0.3, D=0.001 m²/s, neutral transport at local T, B=0.5 T,
sigmaP=0.01 S/m, sigmaParallel=0.1 S/m, full outer electrode0.01 V,
upper electrode0 V for q/R²<0.5, other faces insulating, common Omega(r),
initial Omega=2e5(1-q/R²), gas T=1000+100q/R² K, wall1200 K,
1 mm tungsten, film0.1 W/K, no external cooling. Duration1 ms.

Compare every shared accepted time, including the first interval; never
substitute interpolated time values. Initial T derives from actual species
inventories. Match electrode coverage in physical q and preserve R,L and all
constitutive inputs. Unequal liner grids require conservative fine-shell
energy/mass restriction followed by inversion of tungsten H(T), not temperature
interpolation. Raw K, W and J differences accompany dimensionless measures.

Required whole-history pair gates:

- Omega max absolute profile difference / initial reference peak:0.5% time,
  2% radial/axial/liner refinement.
- Gas and liner temperature max profile difference / their own whole-trajectory
  maximum temperature excursion:1% time,2% spatial. No arbitrary Kelvin floor.
- Species CDF max difference:0.005, for every axis.
- Constitutive endpoint gas-wall power difference / maximum absolute endpoint
  power across both histories:1% time,2% spatial.
- Interval-average power:coarse exchanged energy vs summed fine energies over
  the same interval, divided by interval duration, using that same natural
  maximum-power scale and1%/2% gate. This differs from endpoint power.
- Cumulative signed wall heat difference / maximum total variation of exchanged
  energy across the histories:1% time,2% spatial. Report total variation too.

If a signal scale is exactly zero, equality is required; no positive floor
creates a pass. Explicit storage/temperature ULP allowances are separate from
physical signal scales. Report per-cell causal temperature-excursion diagnostics
and zero/roundoff-dominated signals:global maximum-excursion gates do not prove
relative accuracy at every early time/location.

First score the existing v66 finest pairs:64 cells32→64 steps;32→64 cells at
64 steps, all with4 axial/8 liner cells. All unpaired coarse cases remain in
the packet as diagnostics. Planned next levels:128/256/512 timesteps;
8/16/32/64 axial cells;16/32/64/128 liner cells, with radial32/64 controls.
Refine one axis at a time before joint confirmation. Every failed level is
retained. A finer comparison passing does not erase an earlier failure.

Uniform BE time partitions are assessed first. If startup is under-resolved,
also assess nested quadratic knots t_k=T(k/N)²; this changes scheduling only,
keeps every conservative BE step and never labels interpolation as integration.

Electrical axial refinement is independently gated using the same frozen
common Omega/T state at sampled accepted times:charge and work identities1e-9;
2% finest changes in electrode/Joule/mechanical power normalized by physical
sum(abs(Pe),Q,abs(M));2% L1 radially projected torque and heat-profile changes
normalized by sum absolute torque and total Joule heat;2% terminal-current
differences normalized by total absolute electrode current. Conservatively sum
extensive radial cells if radial resolution differs. These gates remain
sensitive when the electrical terms barely affect neutral rotation.

The parent alone synchronizes and executes project code inside offline safe-dev.
Independent reviewers author/check owned files and inspect actual exported data.

Additional prospective physical-surface check, before scoring the wall sweep:
the first liner cell centre moves with refinement and is not the inner wall
surface. Reconstruct accepted endpoint surface temperature from that cell and
the actual accepted heat flux through its cylindrical half resistance:
`Tsurface=Tcell+Pgaswall*log(rcenter/R)/(2*pi*L*kappa_W(Tcell))`.
Require1% time/2% spatial maximum surface-temperature difference relative to
its own trajectory excursion, AND raw difference<=0.05 K. Retain causal
relative diagnostics and ULP-unresolved signals separately. These are separate
surface gates; do not retrofit them into v66 or the seven global v67 gates.

If wall startup is unresolved, evaluate nested inner-wall grading
`r_i=R+thickness*(i/Nwall)^2`, at32/64/128 cells, without changing physical
thickness, material, film or heat deposition. The existing createFuelLiner
supports explicit radial edges; only the scientific fixture changes. Assess
the graded wall together with quadratic time128/256 knots, retaining every
uniform-grid failure and all actual physical boundary locations.
