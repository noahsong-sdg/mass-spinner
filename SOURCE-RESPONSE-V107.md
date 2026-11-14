# The compression ring: source-response diagnosis

The electromagnetic response is comparatively stable near the remaining density
feature. Stress and heat responses remain strongly sensitive to radial mesh.
This narrows the next investigation; it does **not** identify a corrected equation
or establish experimental accuracy. The existing density gate remains
**5.595688% > 5%**, and the full declared refinement matrix remains incomplete.

## Evidence

Applied E and D separately to the same sealed 80/160/320 × 48 states at
0/1/2/4 μs, with 1 ps and 0.5 ps probes. No trajectory was rerun or changed.
Initialization reproduces each archived q0 bitwise. Source, admission and field
seals were checked before and after execution. All 23 exported payload hashes
and three decompressed result hashes were independently checked.

At r=17 mm, z=228 mm, t=4 μs, h=0.5 ps, using the existing scalar-Q1 sampling:

| Radial cells | E pressure rate (Pa/s) | D pressure rate (Pa/s) | D radial acceleration (m/s²) |
|---:|---:|---:|---:|
| 80 | 3.658173e6 | 3.738216e7 | −9.281293e7 |
| 160 | 3.626243e6 | 1.340090e7 | −1.903533e8 |
| 320 | 3.621675e6 | −9.782328e6 | −2.819434e8 |

These are counterfactual split responses at evolved states, not material
accelerations or accumulated causal contributions. The local D pressure sign
changes because conduction cools the fine-grid point more than viscous heating
warms it. The surrounding 16–19 mm, z=225–237 mm ring still gains thermal energy.
Conduction redistributes heat; a point sign is not a regional energy budget.

At the fine mesh and final clock, focal-ring h-versus-h/2 relative RMS
differences are 2.71e−6 for D pressure and 9.66e−7 for D radial velocity response.
Those small timestep differences cannot explain the mesh spread. They are
diagnostics, not new convergence gates. At q0, E already supplies a nonzero
radial force: the prescribed steady current/swirl initialization is not full
radial or thermal equilibrium.

## Checks and limitations

Offline safe-dev, 1 GiB, science source transfer
`798e320639ff4e41caa660a343de2c2d27eb00c20fc09a4280e6e7f44f706871`:

`/work/home/v90-venv/bin/python -m unittest discover -s /work/project/v107-source-response02 -p test_source_response107.py -v`

Five controls passed: exact region intersections, E work/heat, uniform null D,
actual FiPy hot/cold conduction, and nonzero-flow stress/heat identities.
The first test receipt is retained: its far-hot-cell assertion was below
picosecond resolution; the corrected assertion checks the adjacent hot cell.
No production operator or acceptance tolerance changed. Probe runtime was
1.36/2.93/6.69 s, maximum RSS 708,504 KiB.

Mass and species are bitwise unchanged; E also preserves axial momentum.
Maximum cell thermal/total-energy/pressure identity residuals across all runs
were 6.15e−19 J, 1.09e−19 J and 5.37e−13 Pa. Thermal rates use the actual FiPy
receipt, avoiding inactive legacy FE conduction and large-energy subtraction.

## Matched-input follow-up

The second probe sums all six fine extensive channels into nested radial
children, then compares native coarse and restricted fine inputs. For the
source rate S and restriction R, the exact signed decomposition is

`Sc(qc) − R Sf(qf) = [Sc(qc) − Sc(Rqf)] + [Sc(Rqf) − R Sf(qf)]`.

The first bracket describes sensitivity to the differing archived inputs; the
second is a **restriction commutator**, including coarse geometry, coefficient
sampling and unresolved subcell moments. It is not pure operator error.
Collapsing momentum/inertia changes resolved kinetic and thermal energy even
while preserving conserved totals; the diagnostic explicitly measures these
changes and rejects invalid coarse primitives without repair.

At 4 μs, 0.5 ps, in the focal density ring, D radial-force-density RMS values are:

| Pair | Native difference (N/m³) | Input sensitivity (N/m³) | Commutator (N/m³) |
|---|---:|---:|---:|
| 80 / 160 | 9,915.384 | 5,457.854 | 4,944.782 |
| 160 / 320 | 12,781.895 | 8,720.886 | 4,486.092 |

**RMS values do not add**; only signed cell arrays obey the decomposition.
For these D terms and the corresponding energy terms, h-halving differences
are at most 6.55e−6 relative RMS. The mapping itself changes focal pressure by
2.19162 / 0.667112 Pa RMS. Thus neither evolved-input sensitivity nor the
defined commutator can be dismissed, and global signed cancellation cannot
establish locally negligible remapping. Native differences here are not the
original state convergence norm.

The fresh regional probe passed seven controls, including a globally canceling
field with nonzero local allocations and actual equal-level E/D operator
identity. Transfer seal:
`db194bc4888d4d1eeae6bee258a6e0b256df3269cb33f3614349aedb900f08d0`.

`/work/home/v90-venv/bin/python -m unittest discover -s /work/project/v107-source-commutator02 -p test_source_commutator107.py -v`

Both pair studies completed in 10.22 / 4.33 s, maximum RSS 703,128 KiB; all
30 exported payload hashes verified. The earlier whole-domain-only receipt is
retained. No new trajectory, physical coefficients or convergence gates changed.

Next useful isolation: split the stress mechanical redistribution and active
FiPy conduction commutators on the same declared inputs, with a sourced analytic
smooth-field control. A closure change or long 640-cell trajectory is not
justified by these response magnitudes alone.

[Protocol](scientific/refinement-v107/SOURCE-RESPONSE-PROTOCOL.md) ·
[Independent review](scientific/refinement-v107/REVIEW-SOURCE-RESPONSE.md) ·
[Matched-input protocol](scientific/refinement-v107/SOURCE-COMMUTATOR-PROTOCOL.md) ·
[Matched-input review](scientific/refinement-v107/REVIEW-SOURCE-COMMUTATOR.md) ·
[Prior Euler diagnosis](RING-DIAGNOSIS-V107.md)
