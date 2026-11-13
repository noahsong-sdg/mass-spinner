# V94: graded-mesh analytic swirl diagnostic

Prospective diagnostic, registered before computing these predictions. V93's
coupled release, six failed gates, thresholds and qualification flags stay intact.
No physical backend or live playground change is proposed in this stage.

## Question and control

Does the existing viscous discretization reproduce the small swirl response on
the graded V93 geometry, without the strongly rotating compressible transport?
Use the existing OpenFOAM 14 incompressibleFluid module and scikit-fem V86
Diffusion operator, not a replacement diffusion implementation.

Same R=0.06 m, H=0.24 m, rho=0.001 kg/m³, mu=0.000114 Pa s,
nu=mu/rho, radial n cells, axial 2n cells and exponential axial grade 4.
Regular axis, lower midplane symmetry, stationary no-slip outer/upper walls.
The analytic Stokes mode is

    u_theta = A J1(chi r/R) cos(pi z/(2H)) exp(-lambda t)
    lambda = nu [(chi/R)^2 + (pi/(2H))^2], J1(chi)=0, chi>0 first root.

Use A=1e-4 nu/R (Re=1e-4), following the V88 small-amplitude control.
Native incompressible momentum retains nonlinear advection; half amplitude and
meridional-speed checks bound its importance. Custom evolution calls ONLY the
existing implicit viscous/heat operator at fixed mass, without Euler advection
or pressure. It consequently has no acoustic CFL requirement. This exemption
does not apply to the coupled release. Native temperature/energy are not evolved.

## Frozen campaign and comparisons

Six pairs: n16/32/64 at 256 steps; n64 at 128 and 512 steps;
n64 at 256 steps with half amplitude. End 20 microseconds, outputs at
0, 5, 10 and 20 microseconds. Wedge half angle 0.5 degrees.

Compare point swirl to the exact mode at each method's actual sample locations.
Verify the initial sample analytically. Exact response is initial sample times
expm1(-lambda t), avoiding subtraction in the reference. Report whole-field and
response-increment relative RMS, normalized by the analytic RMS. Use actual
graded cylindrical cell volumes, globally and in the fixed physical band
H-4 sqrt(nu t) < z < H with partial-cell overlap. Also report native recovery into
the integrated-angular-momentum convention, applying r_C mean(r)/mean(r²)
to both computed and analytic fields; this is a representation diagnostic only.

Frozen gates (strict inequalities): finest n64/s512 analytic errors <5%;
analytic error decreases on both n16→32→64 refinements at s256; finest
s256→512 temporal differences <2% and contract relative to s128→256,
for both fields, both regions, all positive saved clocks and both methods.
Half-amplitude normalized response difference <0.1%; native peak meridional
speed / A <1e-4. Custom mass drift <1e-8, total-energy drift <1e-6.
Incomplete campaigns, invalid metadata, clock/shape mismatch, nonfinite fields,
initial-sample mismatch, packet hash mismatch or source drift are rejected.

An analytic pass would isolate viscosity as adequate for this control, not prove
that nonlinear transport, initialization projection, angular momentum flux or
experimental prediction is correct. Any analytic failure is retained before
selecting the next discriminating study. No fitting to velocities or currents.

## Provenance

Freeze source hashes, native binaries/module sources, versions and inputs before
each solver run. Rehash after execution; export raw cases and complete inventory.
Preserve V93 as a separately sealed reference. Run new harness controls plus the
51 retained controls, and the application's final test/typecheck/build/site/asset
checks. No independent agent audit or deployed-browser verification is implied.
