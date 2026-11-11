# Independent high-N locality follow-up, v33

8 November 2026. This is a separately frozen addendum. The original locality
report, five-run evidence and 96-file seal are unchanged. No production equation,
scattering law, density normalization or acceptance threshold was edited here.

## Result

Both full-200-µs, seed101 research-mode runs completed. The larger sample reduces
unresolved exposure but **neither level meets the existing 1% budget**. Under the
production contract this remains coverage UNKNOWN, not a transport certificate.

| N/species | Mesh | dt | Raw angular maximum | Unresolved exposure | Subprocess seconds |
| --- | --- | --- | ---: | ---: | ---: |
| 8192 | nr12/nz3, source-fitted | 100 ns | 0.0253764% | 2.31667% | 79.252 |
| 16384 | nr12/nz3, source-fitted | 100 ns | 0.0263960% | 1.38518% | 159.290 |

The angular maxima are below 0.1% for these individual seeds; one seed does not
meet the six-seed qualification requirement. All other physical inputs retain
DEFAULT_DOUBLEWELL values, including density 1e18 m^-3, ion/electron temperature
5 eV, B 0.06 T, source radius 0.08 m and pulse length 0.15 m. The selected angular
law is Nanbu. Increasing N changes statistical resolution and marker weight,
not the declared physical inventory or run horizon.

At N16384, genuinely sparse-species representatives contribute 0.046934% active
exposure; the other representatives sharing their unresolved cells contribute
1.338243%. Every N16384 cell is resolved initially. Its entire unresolved
exposure develops outside the initial r<0.08 m,z<0.15 m support:

- Outside only radial support: 0.360465%.
- Outside only axial support: 0.036520%.
- Outside both: 0.988192%.

These regions contain the expanded pulse and its tails. Their fixed-coordinate
classification is descriptive; no region is removed from collisions, diagnostic
denominators or gate evaluation. This corroborates insufficient evolved local
sample support as the cause, rather than an initial source-face volume error.

## Independent checks and limits

The copied diagnostic adapter adds actual-cell species occupancies to records;
it changes no timestep, RNG stream or dynamics. Its complete three-hunk diff is
retained. The explicit candidate API is simulateDoublewell(config,'research').
That mode raises particle admission to 65536 while preserving the existing orbit
resolution and 80-million-particle-step work bounds. Normal interactive admission
remains 4096. The original candidate dynamics and all other source hashes are
preserved before instrumenting; the checked source map is verified before and
after each simulation.

An independent standard-library analysis checks **14,895** saved occupied cells:
geometric annular volumes, density × volume against weighted counts, total and
per-species population against independent history records, complete collector
partitions, timed exit membership and exact final horizon. Maximum relative
density-inventory discrepancy is 4.63e-16. Count-based unresolved fractions and
integrated active exposure agree with the producer within 1e-14. These checks
validate recording and geometry, not continuum collision transport.

A second independent checker reconstructs raw angular momentum from saved
species means and all collector exits at their actual times, without importing
the production torque ledger or its helper functions. It checks 12,326 timed
exits at N8192 and 24,680 at N16384. The largest normalized history difference
is 6.65e-17; reconstructed maxima agree with the table above. No measured torque
is subtracted from the raw residual.

The previous N4096/r12/nz3 result was 3.83933% unresolved exposure. The new
N8192→N16384 comparison reduces this to 2.31667→1.38518%; there is no basis to
extrapolate a pass or assume linear 1/N error in this inhomogeneous two-species
population. In particular, rare-species presence can newly mark a previously
single-species cell unresolved as sampling increases. That diagnostic is held
fixed here.

Root's separate pilot uses nz9 and 200 ns, so those results are **not matched
timestep refinement** of these nz3/100-ns trajectories. These studies only
assess feasibility for a subsequent matched grid/N/dt/seed campaign. No paired
observable equivalence, six-seed spread, full velocity distribution or real-device
validation is asserted.

## Remaining execution boundary

At full 200 µs, N16384 with 100 ns uses 65.536 million declared particle-steps,
within the unchanged 80-million bound. N32768 with 100 ns would use 131.072 million
and is correctly rejected by that current resource contract, even in research
mode. It therefore cannot be substituted into a matched high-N refinement study
without a separately reviewed research work budget/executor. The 65536 particle
ceiling alone does not remove this second resource limit.

A future remedy can prospectively allocate a larger isolated research workload,
or use a faster existing backend while independently checking equivalent physics.
Shortening the horizon, accepting an unmatched coarser timestep, discarding the
unresolved expanded population or weakening 1% would not supply the missing
convergence evidence. Additional N and mesh refinements remain necessary under
the existing physical gates. This follow-up supplies no justification for changing
the collision law merely to reduce the reported diagnostic.

## Prospective plan and reproducibility

The original proposed 180 s combined/100 s per-run allocation was **never executed**.
Based on the earlier observed 31 s per N4096 case, root authorized a prospective
resource addendum of 270 s combined/160 s per run before either high-N run began.
Both the unexecuted proposal and revised allocation are recorded in plan.json;
no post-result timeout extension or changed scientific threshold occurred.

Both runs exited 0. Aggregate subprocess time 238.542 s is below 270 s. The N16384
run completed 159.290 s, below its 160 s cap. The launcher kills the whole process
group on timeout and the analyzer only admits exited-zero COMPLETE cases; no
partial or noncomplete artifact was used. There were no timeouts, errors or
excluded artifacts.

Distinct Apple guest safe-dev-4734191f95227535, copied stage
/tmp/mass-spinner-transport33-highn; final export
/tmp/mass-spinner-transport33-highn-ledger-export (the preceding full export is
also retained as mass-spinner-transport33-highn-final-export). Online execution was limited to
npm ci --ignore-scripts. Simulations and analysis ran offline, without host home,
credential, signing-key, control-socket or SSH-agent mounts.

Commands, with the absolute safe-dev launcher and -C stage prefix:

```
init
run --online -- npm ci --ignore-scripts
run -- python3 run.py
run -- python3 - < /tmp/mass-spinner-transport33-highn/analyze.py
run -- python3 - < /tmp/mass-spinner-transport33-highn/check-ledger.py
export /tmp/mass-spinner-transport33-highn-ledger-export
```

Frozen plan SHA256:
43218564cc568ca69fc3bd0f578d3c07d7bdf492fc5a2ae98c31261b54596a68.
Checked source-map file SHA256:
af64f7e94c5fb1c23a696431089aec6c51e6e3803ceee350e7559d336c7be777.
Original candidate dynamics SHA256:
abbd16b22f3b55089644b11fdb2f869db2d218453a66ff09d65376b4758fe04d.
Instrumented dynamics SHA256:
cfdb4c992ac47de406c8be016e42d6b58dfec731e32c0feac141d856999980d1.

All source, original dynamics, plan, driver, analysis, hard-timeout runner,
full raw results and per-run logs/status are retained beneath
scientific/transport-v33/locality/high-N/. Root owns final integration checks,
any further research budget design and all deployment claims.
