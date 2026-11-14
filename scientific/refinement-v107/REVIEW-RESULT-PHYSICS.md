# Independent V107 first-preflight physics review

Verdict: the retained 320 × 48, 0/1 µs preflight supports its bounded radial
comparison. Full qualification remains **PENDING**. No physical equation,
input fitting, threshold change, or erased historical failure was found.

## Evidence inspected

Read the actual candidate01 field archive, accepted-step history, producer
packet, case log, independent audit/summary, control log and historical replay.
Recomputed SHA-256 with trusted file utilities:

- Predictions: `4991334e3b566f49e56db3b6ed058f9878fb6f4480dcd778c43369c7ef0a952d`.
- Compressed fields: `08651e081b3335b4686e547af620a3658cfea445db9f292f4161c511e11e30db`.
- Decompressed fields: `9035b4f657d44d611e1a57e6240f394769bb36b649ced91cac030eb5950a4085`.
- Audit: `907f8bf06ca38f183ed2edcfea345723821910b4be1d522446ef755a296438b3`.

All agree with the receipts. The four frozen V107 source hashes also match.
The control log records 10/10 passing tests; the historical replay records
exact nested equality except the auditor hash, retaining all six failures.
This review used static source inspection and trusted JSON/hash utilities;
it did not rerun scientific code or reproduce the panel integrations.

## Actual state, clocks and balances

Both snapshots contain six conserved fields on the declared 48 × 320 cells.
The 2,839 strictly positive, ordered accepted steps sum to exactly 1 µs in
the inspected JSON reduction. Maximum clock-closure discrepancy is
1.06e-22 s; acoustic CFL exceeds 0.1 by at most 1.39e-17, roundoff scale.
Accepted dt spans 0.146–1.667 ns, below the unchanged 100 ns cap.

Independent nested JSON sums give final-minus-initial mass/species relative
drift about -4.94e-16. Electrical input is 0.009908343418631758 J; total
energy rises by 0.009908343418631338 J, leaving -4.20e-16 J discrepancy.
Angular momentum changes by 1.82806e-11 kg m²/s after nearly cancelling
external and wall impulses; their balance discrepancy is -1.41e-20 kg m²/s.
Different summation ordering explains differences from the saved NumPy ledger.

Saved-history maxima are 9.55e-16 relative energy defect, 2.03e-15 angular
defect and 3.94e-12 relative charge residual. Temperature and density remain
positive. Maximum recorded total Mach number is 0.750682. The independent
audit records 31,122 gates and zero failures, including primitive, clock,
torque, charge, positivity and conservation checks.

## Radial result and interpretation

At fixed 48 axial cells, the 160 → 320 comparison gives:

| Metric | Relative discrepancy |
|---|---:|
| Density | 0.006217% |
| Density increment | 2.381344% |
| Temperature | 0.228547% |
| Temperature increment | 0.317654% |
| Angular speed | 0.093374% |
| Radial velocity | 0.486684% |
| Axial velocity | 0.131063% |

All seven contract from the preceding pair and pass the original 5% limit;
panel-order discrepancies remain below 1e-10. Velocity denominators use the
finer combined meridional norm. Supplemental conservative restriction also
contracts, but uses a different representation and is not a replacement gate.

Initial states are not identical across meshes: maximum initial angular speed
changes from 218,384.58 to 219,087.51 rad/s, and initial energy from
0.56868842 to 0.56867449 J. Initial radial/axial velocities are exactly zero.
The independently recomputed steady torsion and profile sampling therefore
contribute to refinement differences; this is not a common-q0 operator test.

Peak temperature rises from 5,946.57 to 233,957.72 K. That localized heating
can coexist with the approximately 1.74% total-energy increase; conservation
does not establish validity of frozen conductivity, ionization or viscosity
at that temperature. The prescribed-current fluid closure remains conditional.

The observed run used 1,114.87 s and 660,612 KiB, below its declared 1 GiB
budget. It establishes neither other geometries' resource feasibility nor
axial, 2/4 µs, finest-grid temporal, experimental or live-playground accuracy.
All nine full-clock jobs remain required. The preflight audit's six-entry
`missingFullJobs` list excludes its three short radial records; it must not
be interpreted as six full jobs remaining. Overall pending/full-pass flags
are correct. REFINEMENT-V107.md accurately preserves these scientific limits.
