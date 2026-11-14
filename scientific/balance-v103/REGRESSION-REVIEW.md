# Independent V103 regression and evidence review

Accepted for the bounded radial-balance correction and its numerical controls.
**Not accepted as coupled spatial or experimental qualification.** This reviewer
authored the separate analytical regression file, reviewed the resulting method,
and inspected the coordinator's retained execution artifacts. No scientific
execution, VM operation or browser verification was performed by this reviewer.

## Evidence checked

The actual tested snapshot is `/work/project/v103-candidate02`, transfer SHA256
`0b324d3c4aa737dfd81f308a5c8f9a6c91dff6f5467e9dcd0e3908a8526d3882`.
All 76 retained manifest entries, 14 test/study log hashes, all five compressed
and decompressed field seals, four compressed optical seals, 18 optical source
hashes, nine analysis input seals, two analysis sources and two analysis log
hashes match. Source checks use the retained files rather than assuming the
present checkout is identical. Four historical review documents in that
snapshot are earlier drafts than the host copies; the other 72 files match,
including every executable, protocol, current regression and input file.

Logs record **102 passing regressions** and 18 expected old-method failures
across 11 new test methods, including native-equilibrium subtests. The original
auditor, evaluator and independent geometry implementation are byte-identical
to their pre-change versions. All five prescribed jobs and four reporting
clocks completed. The evaluator returns **exit 1**, consistently with the
remaining scientific failures, rather than turning that exit into a pass.

The first pressure-bump regression wrongly demanded monotone error from an
arbitrary coarse limited grid. Its retained failure led to a one-variable
probe: changing only the perturbation limiter removes the coarse reversal;
uniform-grid controls contract as well. The revised supplemental regression
retains n=1/2/4/8, requires the finest error to beat every coarser result and
checks both n=2/4/8 contractions. The production limiter, analytical pressure
function and all existing campaign gates remain unchanged. This is evidence
for a limiter/grid effect in that control, not proof of the source of every
coupled error. The failed candidate and probes remain available.

## Physical and numerical interpretation

Exact native equilibria cover both graded meshes, mixed/equal masses, different
temperatures and spin signs. Genuine pressure perturbations, nonrigid rotation,
nonisothermal quadratic pressure and two-dimensional transport still evolve.
The finest smooth native control changes from 0.127150 m/s to
3.69054e-13 m/s radial-speed RMS at 0.1 microsecond. This supports the intended
force-balance correction, without freezing legitimate radial motion.

Exact conservative-moment projections are not disguised as exact native
equilibria. Their derived rotation and temperature differ because the present
inertia map uses mass times volume-mean radius squared. Their smooth-grid
radial speeds remain finite and contract: 0.011960, 0.0030774 and
0.00077468 m/s. Those results and initial representation differences are retained.

All saved coupled fields have positive density and temperature, composition
0.5, and nonnegative heat receipts. Mass/species, energy, angular-momentum and
charge ledger checks pass; maximum reported defects are respectively
3.29e-16, 1.93e-13, 4.14e-14 and 4.70e-12. Conservation and native-equilibrium
preservation do not establish physical closure accuracy.

**Six spatial gates still fail.** Density-increment differences are
20.98%, 22.47% and 23.61%; radial-velocity differences are 7.31%, 9.43% and
9.74%, against the unchanged 5% bound. All existing contraction and 2%
timestep checks pass. Some density differences improve, but radial-velocity
differences slightly worsen; claiming general coupled convergence improvement
would be unsupported.

All 288 retrospective optical alternatives fail the all-point experimental
screen; the best worst-point discrepancy remains about 47.7%. The prescribed
current, frozen ionization/transport, short transient and localized high
temperatures remain limitations. No fitted currents, measured velocities or
relaxed physical gates were introduced. Numerical control success is separate
from matching the apparatus or adopting the method in the live playground.

No blocking implementation or retained-evidence inconsistency was found within
this review's scope. The separate application receipt records passing
typecheck, build, site and asset checks; its four log hashes and 330 current
input hashes also match. The existing large-chunk advisory remains. These
structural checks do not extend this scientific review to deployed browser/GPU
behavior or independently establish publication state.
