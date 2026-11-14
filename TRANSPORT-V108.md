# Stress and heat isolation — V108

The remaining density-increment gate is still **5.595688% > 5%**. No production
coefficient, solver equation, mesh cut or acceptance gate has changed. These
are frozen-state diagnostics, not another qualified trajectory.

## What the split establishes

The actual execution path is `FVDiffusion.advance` → `Diffusion.advance`:
Q1 Newtonian stress, viscous/backward-Euler heat and mechanical redistribution,
then the overridden FiPy finite-volume conduction. The inherited FE heat matrix
is inactive. Adding viscous heat again to stress redistribution would double-count it.

The diagnostic reconstructs that actual intermediate state from native receipts.
It also applies native FiPy conduction to the original temperature, retaining the
finite-step ordering interaction. Every probe preserves the incoming state and
native mass/species invariants. Same sealed V107 states, clocks 0/1/2/4 µs,
radial pairs 80/160 and160/320 at 48 axial cells, steps 1 ps and 0.5 ps.

At 4 µs and 0.5 ps, volume-weighted RMS restriction commutators in the fixed
r=16–19 mm, z=225–237 mm focal region are:

| Contribution |80 / 160|160 / 320|Units|
|---|---:|---:|---|
| Radial stress force |4,944.782|4,486.092|N/m³|
| Viscous heating |8,213,033.735|5,112,947.686|W/m³|
| Ordered conduction |12,860,669.998|9,511,391.784|W/m³|
| Conduction ordering interaction |9.185|19.864|W/m³|
| Combined pressure rate |8,341,436.214|7,461,353.634|Pa/s|

Only signed cell arrays add; these RMS magnitudes do not. The commutator includes
coarse geometry and unresolved fine-cell moments, not only operator error.
Both stress heating and conduction matter. The tiny-step ordering interaction
is small; that does not certify the accumulated production splitting error.
Archived-input sensitivity also grows with refinement: radial stress-force RMS
5,457.854→8,720.886 N/m³. No single bad coefficient has been established.

## Corrections and evidence

Three isolated decomposition controls passed: actual energy reconstruction and
invariants, quiescent heat-only null stress, and equal-level/stale-cache behavior.
Both pair studies completed in13.04s total, peak 696,236 KiB, offline 1 GiB safe-dev.
Transfer seal `7f10cb98a7d8c3b210ce4468bbabbfbe6780e2c65628555ef24b73e0fe28edb6`.
All 17 exported payload hashes were checked independently.

A separately authored manufactured-stress test first imposed zero on natural
boundary traces that production actually solves freely. Technically it tested
the wrong boundary operator; simply, it pinned values the solver does not pin.
That original table is retained but cannot establish a production boundary bug.
The revised test statically condenses the real massless natural traces and adds
an actual-small-step momentum comparison. All four revised controls passed;
this matches the execution path without changing production to satisfy a test.
Interior radial/axial/torque errors at 32×128 are 0.0232% / 0.0319% / 0.0522%.
Whole-domain rate errors contract, but the last-endwall-row radial error
decreases only 28.1→26.6→25.8% while axial/torque errors grow over these levels. A Galerkin weak
load is not a cell-average strong force; this does not prove a nonconvergent
finite-time solution or the cause of the V107 density failure.

The thermal-moment diagnostic also completed and passed all three controls.
At 4 µs and 0.5 ps, the full heat difference / restriction-thermalization part /
thermal-preserving remainder RMS are 12.860667 / 3.104866 / 14.180204 MW/m³ for
80/160, and 9.511399 / 2.265208 / 9.214130 MW/m³ for 160/320. Signed components can
cancel. Conservative moment collapse therefore does not explain most of the
heat mismatch. The companion is intentionally nonconservative and will never
replace the production state. Geometry, fine thermal structure and density-
weighted capacity remain in the remainder; it is not pure operator error.

Stage05 passed all 10 split/stress/moment controls, then both native FiPy heat
pair probes, in offline 1 GiB safe-dev. The pair probes used 4.85/2.17 s and
540,444 KiB maximum RSS; transfer seal
`3098bf486512d70a0bb22e73a1b410c4720c5086390058ec228ef9b49abfec8d`.
All 66 payload hashes in the combined export, both moment result seals and
executed-source bindings were independently verified. No trajectory evolved.
## Finite-time component checks

Analytic forced stress evolution through 4 µs now contracts on 8×32, 16×64 and
32×128 meshes. Whole-domain radial-velocity error decreases 0.533→0.289→0.105%;
finest axial/angular errors are 0.0194% / 0.0496%. The fixed physical endwall
region contracts too. Final velocity error alone understates wall-stress error:
wall-torque impulse error decreases 15.65→7.12→2.50%. Trace/body/hoop momentum
budgets close to roundoff. Spatial contraction is established by the retained
reported values, not by the budget assertions alone. Inherited FE heat is
passive in this constant-density stress test; it does not certify FiPy heat.

A separate actual-FiPy test uses exact analytic density-weighted thermal energy
and face heat flux on the same graded mesh family, 20×24/40×48/80×96. With
strongly varying capacity, temperature-increment error decreases
0.618→0.237→0.0616%; the uniform-density finest error is 0.0141%. Heat-source
energy residual is at most 2.49e−16 of initial energy. The first heat fixture
called a full-trajectory whitelist with its small component grids, so it was
correctly rejected. The one-line correction calls the original generic mesh
generator; cuts, counts, physics and gates are unchanged. The failed receipt
is preserved. Weakening trajectory admission would have been the wrong fix.

The independent coupled-path audit also found no demonstrated missing force,
double-counted work or density-source bug. Only Euler flux divergence changes
mass. The complete split is first-order Lie splitting despite its SSPRK2 Euler
stage. Smooth component agreement does not establish resolution of the sharp
evolving compression ring or separate mesh-dependent initial torsion from
later pressure/current/flow feedback. A justified next experiment is a
predeclared common-input short coupled restart with signed accepted-stage
budgets, alongside the remaining declared axial/joint studies. No blind
wall/viscosity correction or new continuum-error claim follows from these tests.

## Final execution gate

Fresh stage `v108-transport09` passed all 14 controls plus both frozen pair
studies for each diagnostic, offline 1 GiB safe-dev. Same input transfer as 08:
`8e34b9b372f611c0125faa892e84513664bf4a649232674f7fc38e1486445018`.
The final controller is `scientific/transport-v108/run108.py`. Commands:

```text
/work/home/v90-venv/bin/python -m unittest discover -s /work/project/v108-transport09 -p test_transport108.py -v
/work/home/v90-venv/bin/python -m unittest discover -s /work/project/v108-transport09 -p test_independent108.py -v
/work/home/v90-venv/bin/python -m unittest discover -s /work/project/v108-transport09 -p test_moment108.py -v
/work/home/v90-venv/bin/python -m unittest discover -s /work/project/v108-transport09 -p test_evolution108.py -v
/work/home/v90-venv/bin/python -m unittest discover -s /work/project/v108-transport09 -p test_capacity_heat108.py -v
/work/home/v90-venv/bin/python /work/project/v108-transport09/driver.py
/work/home/v90-venv/bin/python /work/project/v108-transport09/moment_driver108.py
```

Recorded Python 3.11.2, NumPy 2.4.6, SciPy 1.17.1, scikit-fem 12.0.2, FiPy 4.0.3.
Frozen pair peak RSS 697,320 KiB; source, input and output seals remain retained.
App source is unchanged by these diagnostics. The separately changed Laurelin
caption passed typecheck/build/site/assets and live verification; see
[its status](LAURELIN-STATUS.md).

## Execution boundary

A second safe-dev run passed the three decomposition controls, then the launcher
cancelled it on host memory pressure. Subsequent attempts were refused before VM
creation; the macOS kernel pressure level was 2 and `container list` was empty.
No isolation or memory protection was bypassed. Normal admission later returned
and all controls/probes above completed. This interruption is
retained as evidence, not discarded as a successful run. A production candidate
and full failing-case rerun remain outstanding. The frozen producer and
original failing audit are preserved.

[Protocol](scientific/transport-v108/PROTOCOL.md) ·
[Independent review](scientific/transport-v108/REVIEW-INDEPENDENT.md) ·
[Coupled-path audit](scientific/transport-v108/REVIEW-COUPLED.md) ·
[Previous diagnosis](SOURCE-RESPONSE-V107.md)
