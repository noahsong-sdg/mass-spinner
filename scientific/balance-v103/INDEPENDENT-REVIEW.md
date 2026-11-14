# V103 independent force-balance review

Accepted for the bounded numerical correction. Full coupled spatial and
experimental qualification remain **false**. This reviewer inspected code,
parent-executed safe-dev artifacts and hashes; no project code was executed on
the host or independently rerun by this reviewer.

## Physical and numerical consistency

The original radial pressure reconstruction and cellwise centrifugal source
represented different profiles. Reflected boundary slopes also flattened the
pressure gradient needed by a rotating equilibrium. In simple terms, the code
gave two forces that should cancel slightly different numerical descriptions.

The cylindrical radial source is
`2π Δz ∫(p + ρ Ω² r²) dr`. A local isothermal equilibrium satisfies
`dp/dr = ρ Ω² r`, so its integrated source is exactly
`2π Δz [r p_eq]`. V103 reconstructs departures from that same equilibrium and
subtracts its edge pressures from the numerical momentum flux. Normalization
uses cylindrical cell averages, not centroid samples. Local reference values
do not impose global rigid rotation or suppress genuine pressure disturbances.

Static review checked source signs/areas, neighboring-average indices, the
axis, both rotation signs, unequal monatomic masses and the zero-spin limit.
The positivity limiter enforces positive reconstructed density/pressure
without an arbitrary physical floor. Shared fluxes still conserve closed mass,
angular momentum, total energy and species. No extra energy source is needed.
Historical fixture corrections retain direct radial HLLC angular-advection
coverage. No physical coefficient, measured current/velocity or existing
convergence threshold was changed.

## Executed evidence inspected

The 102 passing tests include 11 new controls, with a retained failing run
against the old operator. The same 24 V102 equilibrium cases were repeated.
At 0.1 microsecond on the finest smooth mesh, native-equilibrium radial RMS
speed changes from `0.1271500174` to `3.6905383e-13 m/s`; density drift is
`9.62e-16`. Exact conservative-moment projections remain distinct from the
native primitive representation: their smooth-mesh radial speeds contract
`0.0119597 → 0.00307740 → 0.000774677 m/s`, rather than becoming exactly zero.

The smooth pressure-disturbance control retains its coarse nonmonotonic error
(`2.2815%, 6.6722%, 2.0991%, 0.4950%`). The retained one-variable probe removes
only the residual-slope limiter and recovers monotonic contraction on the same
mesh/source. Uniform-mesh controls also contract. This supports an interaction
between limiting and coarse grading, not changing the production source to
force coarse monotonicity. The production limiter and all coarse points remain.

All five full coupled trajectories complete. The unchanged evaluator reports
six spatial failures: density-increment differences `20.978%, 22.466%, 23.613%`
and radial-velocity differences `7.313%, 9.434%, 9.739%`, each above 5%.
All reported comparisons contract; timestep and conservation gates pass.
The evaluator correctly exits 1, not a successful qualification. All 288 optical
alternatives still fail the 20% all-point screen; the best worst-point mismatch
is about 47.7%. The localized thermal hotspot also remains. These results do
not establish the source of the remaining full-study discrepancy.

## Provenance checked

Verified all 76 retained source/doc entries, 14 control/study log hashes, all
five compressed and five decompressed field seals, four support-source hashes,
two analysis-source hashes and both analysis-log hashes. Prediction, audit,
comparison, summary, equilibrium and before/after input seals match the reports.
All current executable, test and protocol inputs match the tested snapshot.
Four historical V100/V101 review/note documents in that snapshot predate later
host closeout notes; these documentation-only differences are preserved and
are not a claim that all 76 current host files are identical.

Tested snapshot: `/work/project/v103-candidate02`, transfer SHA256
`0b324d3c4aa737dfd81f308a5c8f9a6c91dff6f5467e9dcd0e3908a8526d3882`.
Reviewed flow SHA256:
`dcaf66d1d8506853b1b45468d7908adce967f88813a0b0a7426ad58be683a3f7`.
Coupled prediction SHA256:
`0c9bf385c0730dc2c0bfb371f20e3daa16c22f50e15a63d5379fa0b44a9adbc5`.

No blocking implementation issue remains within this scope. Native equilibrium
preservation is verified; complete spatial convergence, actual-apparatus
accuracy and adoption in the live browser model are separate, unresolved claims.
