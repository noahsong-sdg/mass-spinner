# Independent V88 review

12 November 2026. Read-only physics/path review plus independently executed
checks. This is review of bounded numerical controls, not experimental or live
playground qualification. Project execution used only explicitly handed-over
safe-dev guests; no host scientific execution, installation or source changes.

## Findings fixed before closeout

- **Workflow geometry admission:** a truncated coordinate array could pass a
  `zip` comparison. In simple terms, missing coordinates went unchecked. The
  assessor now requires exact finite array lengths; resealed malformed-array
  tests exercise the admission path. This enforces the actual field geometry
  rather than adding a recovery/default geometry.
- **WarpX output admission:** raw phase-space bytes and resolved case settings
  were not bound when consumed. The adapter now seals the raw archive and
  checks its hash, case and merged frozen configuration. A changed archive is
  rejected. This closes the dependency boundary without rerunning unchanged
  physical cases or weakening gates.
- **Target reaction sensitivity:** a unit-population error scale could hide an
  entirely wrong small fusion yield. Before predictions, the protocol added
  input-scaled cumulative-yield and instantaneous-rate gates, Radau absolute
  tolerances and contraction checks. The independent oracle also reconstructs
  pulse events rather than trusting exported beam-on flags. Separate physical
  scales preserve sensitivity without a fitted numerical floor.
- **Electron admission dependencies:** the supplemental exporter read native
  power files without checking their retained hashes, and trusted table rows
  without matching the sealed receipt. It now checks both, reconstructs bulk
  refinement gates from original cases, and rejects power/row mutations. The
  original physical outputs and failed gates remain unchanged.
- **Zero-current reaction admission:** the original comparator's zero-flux
  conversion substituted zero before inspecting the exported rate, potentially
  hiding a false nonzero output. A separate supplemental auditor now requires
  every zero-current rate to be finite, numeric and exactly zero; negative,
  nonfinite, boolean and missing-data controls reject. This checks the physical
  boundary directly while preserving the original sealed comparison and its
  failed gates.

## Independently observed checks

**Workflow:** in `/private/tmp/mass-spinner-workflow-v88-20261112`,
`safe-dev run -- /work/home/workflow-v88-venv/bin/python -m unittest -v test_workflow`
passed **8/8 in 19.872 s**. This includes actual Snakemake/FiPy execution,
checker/input mutation, scientific rejection with retained report, real
interruption/resume, execution errors, stale bytes and resealed invalid arrays.
[Independent receipts](workflow/independent-receipts.json) include the exact
12 source/configuration/lock hashes. Export:
`/private/tmp/mass-spinner-workflow-v88-independent-export01`.

**FESTIM:** in `/private/tmp/mass-spinner-festim-v88-retry-20261112`,
`safe-dev run -- sh -c 'OPENBLAS_NUM_THREADS=1 OMP_NUM_THREADS=1 .cache/bootstrap/bin/micromamba run -p /work/project/.venv python -m unittest test_campaign -v'`
passed **9/9 in 0.358 s**. This rechecks the existing 36-run trajectories,
native FE integrals, installed native runtime, snapshots and injected failed
controls; it is not a second 36-run campaign.
[Independent log](festim/independent-test.log), SHA256
`d5a60196e94b5cf631612a7ae04437e29f925b1ae5ba02cef92c05237ee17f4a`.
Export: `/private/tmp/mass-spinner-festim-v88-independent-export01`.
Tested result SHA256:
`d3632537de35c25cde6adb4d7fed27478ee1dd72fb2c9bb4c645a3e37c06f773`;
campaign/oracle/test SHA256 respectively:
`6596ac9b4cd5322a78e3786237054ea5a01ab4c042331cfa5610ca5260da9013`,
`c510a9ccc6a347cfccdfeb88c34bf03bd5373721434ff6c830f735e94ac6bdce`,
`b49c58091616cdd92052533c77ac0e16a70388a20a199a72d9f14d4f3ff82569`.
Canonical exported files match all four hashes.

**OpenFOAM:** in `/private/tmp/mass-spinner-openfoam-v87-20261112`,
`safe-dev run -- sh -c 'cd v88-openfoam && ../.venv/bin/python -m unittest -v test_reference88 && ../.venv/bin/python audit88.py'`
passed **4/4 helper tests in 0.001 s and 86/86 raw-output audit gates**.
The producer restored and verified the actual final 13 native ZIPs before
exclusive handoff. This is independent audit execution, not another solver
campaign. [Observed execution receipt](openfoam-execution.json) records source,
prediction and audit hashes. Public compact evidence is distinct from the
recoverable local-only raw archives; see the adapter README.

**LoKI:** in `/private/tmp/mass-spinner-electrons-v88-20261112`,
`safe-dev run -- python3 -m unittest -v test_adapter test_admission`
passed **8/8 in 0.009 s**. This independently exercises the hardened v2
admission, native power reconstruction, source-row/native-power mutations,
legacy data, B=0 and exact executed-grid restrictions. It is not another
44-case Boltzmann campaign. Source hashes match the producer's final snapshot;
the [observed execution receipt](electrons-execution.json) records those
identities and the unchanged bulk table hash.

**WarpX:** independent execution in
`/private/tmp/mass-spinner-warpx-v88-20261112` passed **9/9 tests in 0.027 s**;
rerunning the analyzer preserved the original summary hash exactly.
[Execution receipt](warpx-execution.json) records commands and source/output
identities. Failed angular/strict-energy gates remain failed.

The [centering witness](warpx_centering_probe.py) also ran the actual pinned
native binary with default synchronization and with synchronization disabled.
Default returned velocities match the position time: species errors
5.74e-6/4.54e-7 versus approximately .00603/.00215 under a half-step shift.
Disabling synchronization leaves positions unchanged but velocities now match
t−dt/2: errors 6.46e-6/1.51e-6 versus .00604/.00215 at t. Native profiler
momentum-push counts changed from four to two, consistent with the extra
endpoint half-push. [Default](warpx/default/result.json) and
[disabled](warpx/off/result.json) results and native inputs are retained.
The probe inherited five native OpenMP threads; it measures per-particle
centering without collisions, not campaign performance or stochastic agreement.

This agrees with [tagged Evolve logic](https://github.com/BLAST-WarpX/warpx/blob/26.10/Source/Evolve/WarpXEvolve.cpp):
the endpoint of each requested Evolve call triggers velocity synchronization
when enabled, including intermediate calls in Python. The
[default is enabled](https://github.com/BLAST-WarpX/warpx/blob/26.10/Source/WarpX.H).
The operational witness establishes returned-state centering for this binary;
it does not recover its unknown source commit. Strict 1e-10 homogeneous
energy conservation is separately reported and cannot be interpreted as a
pure collision-error gate for evolving prescribed-field or reflected orbits.

The matched warm collision-off supplement has energy defect 7.73e-6 and
canonical defect 1.87e-4, so pusher/boundary errors are demonstrably nonzero.
Larger colliding defects support a collision contribution but do not justify
assigning their entire value to scattering. A free-space analytic trajectory
is inapplicable to particles that reach the reflecting wall. The producer's
subsequent [eligibility witness](../warpx/supplemental-warm-off/eligibility.json)
verifies all 16 initial arrays match the colliding baseline and the only
configuration change is the collision law. It finds 55 heavy-species free
final positions outside the .06 m cylinder, reaching .08059 m; actual particles
remain inside. The supplemental no-wall orbit errors are correctly retained
but unscored. This resolves the diagnostic-applicability finding.

**Coupled target / Radau:** reviewed the completed source, original execution,
explicit continuation, diagnostic state and final result packet read-only.
The nine controls and numerical campaign are producer-observed; the reviewer
did not rerun this campaign or use the public VM during the parent final gate.
The original browser exit 1 and final comparator exit 1 are retained. Eight
browser trajectories completed, while all three cases have full Radau paths
at both tolerances. Only the pulsed four-cell case passes every frozen gate.

The continuous case's positive populations sum to .9999999999999715 after
511 accepted steps: defect 2.853273173286652e-14 exceeds the static admission
bound 2.842170943040401e-14. Adding the three discrete species equations
algebraically preserves packing; independent rounded solves can accumulate
roundoff. The exact failure is therefore a numerical admission barrier,
not a measured physical discrepancy. It must remain failed until a structural
fix and regression evidence exist.

For beam-off cooling, the finest ledger difference is 4.55032 J/m² and the
temperature difference .014252 K. The frozen energy-coordinate scale is
1 J/m² with a .01 normalized acceptance gate, so this is a failed gate
despite contracting error. A scale is not itself the allowed error. Retaining
that prospective norm avoids retrospectively declaring success. All saved
internal budgets pass; that does not establish cross-solver agreement.
Browser/reference SHA256 respectively:
`63e73efb9bcebbe4364da335c8635179d0fe75383516fb7cc482dd4c989838b4` and
`8612bcfbd3ef0395ad48bf23bbc50d497b81e00d6b67079786c145df32b55418`.

**Supplemental zero-current gate:** read-only review verified the
[auditor](../target-radau/audit_zero_beam.py),
[four negative/control tests](../target-radau/test_audit_zero_beam.py),
[executed test log](application/attempt02/zero-beam-tests.log), and
[admission receipt](../target-radau/results/zero-beam-admission.json).
The producer-executed tests pass **4/4**. All **45 zero-current samples across
three trajectories** are exactly zero. The admission stdout and saved receipt
match byte for byte, SHA256
`6b6278db24b41d0f703df0ad21081ec1e9ad1a882760c26a208627d76aca81fc`.
Its helper hash
`67c73a8ae279aae71549aada6eec3f3c1400af6ca78f380a3e1478ea827ee63e`
matches the reviewed source, and its browser hash matches the unchanged
original above. The original reference hash also remains unchanged.
`numericalControlPass` and `experimentalQualification` remain false. This
closes the admission edge without promoting failed physics comparisons;
the reviewer did not independently rerun these four supplemental tests.

## Physics reviewed and limits

OpenFOAM's cylindrical J0 heat and J1 swirl modes, Cv-based internal-energy
diffusivity, continuous angular/kinetic integrals and native torque timestamps
are consistent with the stated smooth constant-property controls. The swirl
solution is linearized; finite-amplitude response is separately reported.
It has no evolved heating and does not establish compressible Hall coupling.

LoKI's `mu=(mu*N)/N`, `D=(D*N)/N`, drift, EEDF integration and electron-temperature
conventions match the actual native output. The first global power block is
used once, with signed energy coefficients; growth dilution is not wall heat.
Bulk-only admission does not erase original or extension refinement failures.
B=0 local two-term results cannot supply the apparatus's Hall tensor.

FESTIM's conserved two-species diffusion, shared finite trap vacancies, heat
eigenmode and evolving uniform-temperature Arrhenius diffusion match their
independent analytic/SciPy references. D/T coefficients are manufactured and
identical. The coupling is one-way heat-to-diffusion with constant heat capacity;
it does not qualify LiT data, reaction-heat feedback or variable-Cp enthalpy.

WarpX correctly distinguishes mechanical angular momentum from canonical
`Ptheta=Lz+q*B*r^2/2`, and kinetic energy from `K+q*phi`. Its prescribed-field,
closed-boundary cases do not qualify self-consistent plasma, absorbing
collectors, a joint particle/cell limit or measured transport.

The Radau oracle independently assembles simultaneous time evolution while
deliberately sharing atomic stopping and depth quadrature. Agreement cannot
validate those shared closures, spatial convergence or experimental accuracy.
