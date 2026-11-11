# Independent neutron reference audit, v35

## Prospective saved-data protocol

9 November 2026 UTC. This reviewer performs no physical Monte Carlo run.
Before computing outcomes, freeze the XML decks, multi-group HDF5 inputs,
statepoints and source ENDF bytes, and retain their SHA256 identities.
The producer's comparison programs and numerical summaries are excluded from
the first readout. Inherited coordination messages disclose approximate
outcomes; this is an independent implementation, not an outcome-blinded study.

1. Reconstruct tally mean and standard error directly from stored first and
   second batch sums and `n_realizations`; establish the actual number of
   source histories from XML and HDF5. Check estimator, scores, cell filter,
   source normalization, geometry units and total/absorption/scattering input.
   Reject incomplete batches, wrong counts or any nonfinite statistic.
2. Independently integrate first-flight absorption in the finite cylinder,
   including lateral escape, using projected entrance-radius quadrature.
   Refine Simpson 16384→32768 subdivisions before comparison. Relative change
   must be below `1e-8` plus `1e-12` absolute probability.
3. Retain the producer's prospective pure-absorption equivalence gate:
   `|MC−quadrature| <= 4 reported SE + 2e-6` absolute probability. Mixed and
   pure-scattering cases are model-discrepancy diagnostics, not equivalence
   gates. Absorption cannot exceed total analog collisions, and a declared
   zero-absorption material must have exact zero absorption scores.
4. Parse ENDF MF3 TAB1 records independently from fixed-width text. Preserve
   energies, cross sections, NBT and INT semantics, and independently compare
   the proposed native table and browser interpolation. Exact knots, every
   interval midpoint, interpolation-region boundaries and 100 keV–20 MeV
   domain rejection are covered. Units are eV, barn and number density/m³;
   the result must use `Σ = n σ 1e-28` in m⁻¹.
5. Export the first independent result before reading producer conclusions.
   Later comparisons preserve both outputs. Numerical agreement checks the
   declared synthetic benchmark and data adaptation; it does not validate
   LiT chemistry, detector calibration, complete shielding, damage or dose.

All arithmetic, parser execution, dependency installation and tests run in a
dedicated copied Apple safe-dev guest. Host operations are trusted edits,
reads, copies and hashing only. No home, credentials, signing keys, SSH agent
or container-control socket is mounted. Unique results are exported before
any replacement sync. Parent owns the merged build and publication checks.

## Observed results

The first complete independent readout was exported before opening producer
summaries or native reference rows. Its SHA256 is
`ebaa2ddad2658b19f161e79cf970d03fe226184a7a04ca0a05549b22667e44fd`.
The implementation SHA256 is
`fadc0f736b9a8260040bc0c3653916878c4afd02e4246d027b8b377952fa5c46`.
An initial metadata assertion incorrectly assumed all cases reused surface,
cell and tally IDs. Inspection of the raw XML showed OpenMC's incrementing
IDs. The reviewer changed only ID resolution to trace each actual XML
reference before producing the first complete result; no numerical outcome
or acceptance gate was changed.

Raw HDF5 attributes identify OpenMC **0.16.0**, with 50 completed active
batches, 10000 source histories/batch, 500000 total histories/case, seed71935,
and 50 tally realizations. The source is a unit-strength isotropic neutron
point at the origin at14.1MeV. Each analog target-cell tally scores absorption
and total collisions. There is no direct elastic tally or event-ancestry
record. `mean=sum/50`; `SE=sqrt((sumSquared/50−mean²)/49)` uses batch means,
not 500000 independent stored tally samples. These are sampling errors only.

The actual XML/HDF5 inputs agree with the published JSON: cylinder radius,
front distance and thickness are10cm each; exterior vacuum sphere radius100cm;
macro material density1; one broad energy group; isotropic Legendre-P0
scattering; total0.1cm⁻¹; absorption0.1,0.04,0cm⁻¹ respectively. Conversion
to browser units is10m⁻¹ total and10,4,0m⁻¹ absorption.

| Case | Absorption/source ± batchSE | Collisions/source ± batchSE |
|---|---:|---:|
| Pure absorption | 0.066352 ±0.000389622947 | 0.066352 ±0.000389622947 |
| Mixed | 0.035610 ±0.000317724692 | 0.089536 ±0.000566829780 |
| Pure scattering | 0 exactly | 0.117602 ±0.000824969956 |

The independent projected-radius quadrature is0.06638618319165401 at16384
subdivisions and0.06638618319165451 at32768. The pure-absorber difference
is0.00003418319165450, inside the prospective0.0015604917879352153
(`4SE+2e−6`) gate. Producer first-flight output differs from the independent
quadrature by8.47e−10, well below the numerical tolerance.

For the mixed material, independent first absorption is
0.026554473276661807. The all-collision OpenMC absorption exceeds this by
0.009055526723338196, or28.50 reported samplingSE. The difference is smaller
than the0.039831709914992706 first-scatter unresolved population. With
absorption fraction0.4, `absorption−0.4×collisions=−0.0002044`; this is within
four times the conservative bound `SEabs+0.4SEcollisions=0.000544456604`.
Pure scattering has exact zero absorption while its collision count exceeds
the first-collision probability.

These checks support **additional post-scatter interactions**, rather than a
source-normalization or material-input mismatch, as the reason the two
models differ. They do not supply an independent multiple-scattering solution
or prove individual event ancestry: scalar saved tallies lack per-history
records and cross-score covariance. A direct elastic-score uncertainty cannot
be inferred by treating absorption and total scores as independent.

## Native evaluated-data check

The independent fixed-width parser reads the unchanged NNDC H-1 ENDF bytes,
SHA256`3024d8f0db604b074e33ed8b05027eb9f5a738614041ba44c83f048e0d0bc1af`.
MF3MT1(total),MT2(elastic),MT102(radiative capture) each contain153 native
nodes. Every energy, barn value, interpolation law and breakpoint exactly
matches the published schema2 arrays. Total hasNBT[9,153]/INT[5,2]; elastic
NBT[153]/INT[2]; captureNBT[33,153]/INT[5,2]. For this H-1 reference,
MT102 supplies the absorption channel; this is not a general rule for other
nuclides. No seven-point summary is used for browser interpolation.

Independent tests check all97 fast-domain knots and96 interval midpoints
per channel, plus an explicit log-log→linear boundary fixture. NBT is
one-based: the interval ending at breakpointNBT uses that region's law;
the following interval uses the next law. They also verify MeV→eV,
`Σ[m⁻¹]=n[m⁻³]σ[barn]×1e−28`, exact0.1/20MeV endpoints, zero density,
nonfinite/negative input rejection, no extrapolation, and rejection of a
pre-migration schema1 summary.

The inspected browser helper isSHA256
`ab19df166543dbb6aa28c78c593f7ed209489f005f298024d68957904fff8652`;
native dataSHA256
`bac95d792b4b4c2db71791d15df68c7f324fbf238ad8715f501aac7dc9132f43`.
All five independent regression tests pass. The helper strict TypeScript
check passes. No production code change was required by this audit.

## Reproduction and limits

Evidence is in`scientific/marathon-v35/neutron-independent/`:
`PROTOCOL.md`, `raw-inputs.json`, `independent_first.py`,
`independent-first.json`, `verify_comparison.py`, `comparison.json`,
`test.log`, `typecheck.log`, pinned Python requirements and a dedicated
Node package lock. `comparison.json` records exact tested-input hashes and
commands. Tests live in`tests/neutron-data-independent-v35.test.ts`.

Execution used copied guest`safe-dev-bb33206bce0eda4a`, stage
`/tmp/mass-spinner-neutron-independent-v35`, Nodev22.23.4, npm10.9.9,
Python3.11.2, h5py3.14.0 and numpy2.2.6. Dependencies were downloaded only
in explicitly online runs; arithmetic/tests ran offline. Source copies were
synced after edits and results exported before replacement. First and final
exports are retained at`/tmp/mass-spinner-neutron-independent-v35-first-export`
and`/tmp/mass-spinner-neutron-independent-v35-final-export`.

To reproduce, stage the three original case directories under`raw/`, copy
the original ENDF file to`h1.endf`, retain the frozen protocol/raw-input map,
and run`independent_first.py` with the pinned Python requirements inside
safe-dev. The comparison stage additionally copies the exact helper, test,
public JSON and first result at the repository-relative paths, installs the
dedicated pinned Node dependencies, and runs`python3 verify_comparison.py`.
The parent owns the full repository build/typecheck and deployed checks.

This qualifies saved synthetic benchmark arithmetic and H-1 data adaptation.
It does not qualify evaluated-data multi-group/continuous-energy transport,
LiT compound stopping/chemistry, neutron energy redistribution, anisotropic
scattering, detector response, shielding performance, secondary photons,
dose, DPA, multiplication, experimental yields, or the complete Marathon
machine. Passing a synthetic first-absorption gate cannot establish those
claims.
