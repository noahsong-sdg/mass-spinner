# Independent partial full-clock physics review

**Three trajectories completed; full qualification is not evaluated here.**
The separate axial q0 diagnostic has two real recorded strict-contraction
failures at primitive roundtrip scale. Neither those failures nor the earlier
six V106 spatial failures are superseded. No gates or producer code changed.

## Evidence checked

Read actual packets, compressed fields, all accepted-step histories and q0
diagnostic/source under `retained/full-partial-evidence-20261113`. Independently
recomputed prediction, compressed and decompressed field hashes; they match
their receipts. The three prediction seals are:

- r4-z2-CFL0.1: `2bf3bb52b5667feab7d02e51f98665446b9f185c4cf09ba3dd2a3a61963f2ff9`.
- r8-z2-CFL0.2: `b8d100aea8a700e542d357daf3cf43a67591b21e85f08d0945f6c7b94559134d`.
- r8-z2-CFL0.1: `05b1dd693327557767ae4bc8f14211d874323acc53dac343e254849626ac476f`.

All three have identical producer-source/input/manifest/scenario maps, phase
`full`, and clocks 0/1/2/4 µs. The q0 diagnostic hash independently matches
`7bd41151c8d843acd238af9c64f92652c0b6696612409d0ff11fa967e93e773d`;
its separate source and generated-state hashes also match. It explicitly
performs no evolution and reports qualification `NOT_EVALUATED`.

## Completed trajectories: bounded checks pass

| Case | Steps | Runtime | Peak KiB | Peak temperature |
|---|---:|---:|---:|---:|
| r4-z2-CFL0.1 | 5,541 | 430.66 s | 256,848 | 622,848 K |
| r8-z2-CFL0.2 | 4,968 | 909.47 s | 399,612 | 619,330 K |
| r8-z2-CFL0.1 | 9,937 | 1,863.31 s | 405,496 | 619,354 K |

All are below their declared 1 GiB budgets. Independent JSON reductions find
positive timesteps summing to 4 µs and matching saved clocks. Maximum closure
discrepancy is 4.24e-22 s; CFL excess is at most 2.78e-17. All saved snapshot
densities are positive; minimum history temperature exceeds 1,798.69 K.

Across all three histories, maxima are 3.30e-16 mass/species relative drift,
5.45e-14 energy defect, 1.81e-13 angular defect and 2.51e-12 charge residual:
all below the original respective ledger limits. Independently summing each
snapshot's conserved fields gives energy-minus-electrical-work discrepancies
no larger than 3.04e-14 J and angular-minus-external-minus-wall discrepancies
no larger than 1.77e-18 kg m²/s. Different summation ordering changes the last
few digits; these checks do not replace the frozen auditor's complete admission.

The two r8-z2 CFLs have **identical entire q0 snapshots**, not just similar
norms: canonical JSON SHA-256 is
`27ffd23f94a5e3727dd486ef9708833802dca8ad36c01f4802ba5f9075371dab`.
This confirms the static path: CFL first enters timestep selection after
initialization. Finite-time CFL differences cannot be blamed on different q0.

## Axial q0: two failed contraction predicates, identified roundtrip cause

The diagnostic has 42 checks: 40 pass and two strict-contraction checks fail.
For 24→48→96 axial cells at fixed 160 radial cells, density discrepancies
increase from 3.1657282913e-17 to 3.2017901568e-17; temperature discrepancies
increase from 1.1685076934e-16 to 1.1776439379e-16. All refinement and Gaussian
panel checks pass. Stable subtraction preserves these nonzero errors.

An independent binary64 arithmetic witness explains their scale. At radial
cell 159, the common input density is 0.0002998540693396928 kg/m³. Rows 7 and
27 have volumes 2.1658686880083318e-7 and 3.885040279642612e-7 m³. In both,
stored mass minus input-density times volume is exactly zero. Dividing those
masses by their volumes nevertheless yields 0.00029985406933969274 and
0.00029985406933969285 kg/m³, exactly their saved primitive values.

At radial cell 52, the prescribed radial temperature is 4641.445696288799 K.
Reconstructing temperature from stored total energy minus swirl kinetic energy
and particle count gives rows 14/36 values 4641.445696288797/4641.445696288801 K,
exactly the saved values: deviations ±1.8189894e-12 K. In simple terms, storing
the same profile as extensive conserved amounts and recovering it loses a few
last bits, differently in cells of different volume and swirl energy.

This identifies roundtrip scatter, not unresolved heat transport, for these
q0 scalar discrepancies. It does **not** make the frozen strict-contraction
predicate pass or authorize clipping, floors or changed inputs. Initial
rotation also changes genuinely with axial resolution through the two-dimensional
current and endwall-stress solve; its discrepancy contracts from 1.333934% to
0.321075%. It must not be forced axially uniform with the scalar profiles.

## Not yet tested or established

The CFL0.05 trajectory is unrun, so the declared three-level temporal gate
cannot yet be scored. Six of nine full trajectories remain unrun; full radial,
axial and joint layouts are incomplete. The separate q0 result predicts a
specific contraction obstacle but is not a completed full-matrix audit.

Localized temperatures now exceed 619,000 K. Passing conservation and positive
states do not justify fixed heavy-particle viscosity/conductivity, prescribed
electrical transport or omitted evolving ionization/electron-energy physics
there. No experimental, lithium, Marathon-apparatus or live-model qualification
follows. Complete the declared temporal study before additional costly spatial
runs; preserve all recorded failures and distinguish arithmetic evidence from
finite-time convergence and physical closure validity.

This reviewer used trusted static reads, gzip/hash tools and JSON arithmetic
only. All scientific execution was performed by the root agent in safe-dev.
