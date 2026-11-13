# Bounded coupled-solver performance investigation

Static trace: `campaign99.evolve` computes acoustic CFL, SSPRK2 Euler,
charge/momentum backward Euler, then viscous momentum and heat backward Euler.
It reconstructs primitives and ledgers every step and materializes snapshots
only at requested clocks. The two source matrices have changing mass/inertia
and timestep diagonals. Their factorizations therefore cannot simply be reused.

Ranked hypotheses to test with the actual coupled path:

1. Sparse numerical factorization dominates the finest mesh. Test cumulative
   `spsolve`/SuperLU time separately from initialization. A static LU cache is
   invalid; preconditioner/factorization redesign requires an independent study.
2. Electrical heat accumulation spends substantial time in Python per-edge
   loops. Each face has two frozen series segments. Preindexed numeric segment
   arrays and `np.add.at` can implement the same ordered cell accumulation while
   replacing persistent nested Python tuples. Compare changing-density/dt
   states, all local heat/work receipts and fresh-worker RSS, not only totals.
3. The split viscous quadrature's interpolation allocates repeated derivative
   and strain arrays. Profile before changing it: keeping identical cylindrical
   `ur/r`, quadrature, local heat and stress work is more important than a
   small allocation saving. A different integration rule is a physics change.
4. Repeated sparse slicing adds avoidable allocations. A constant restricted
   viscous stiffness can be cached, while capacity/dt remains fresh. Thermal
   solve currently slices by the entire index range, which is algebraically
   unnecessary. Measure this separately rather than bundle optimizations.

`profile101.py SOURCE_ROOT NEW_OUTPUT [2|4] [END_S]` initializes the declared
apparatus outside cProfile and then executes the actual `campaign99.evolve`
with its accepted-step receipts and ledgers. The default 50 ns endpoint is a
short hot-path probe, not a scientific convergence or experimental test. It
retains final fields, source hashes, top cumulative calls and whole-worker peak
RSS. Peak RSS includes imports and initialization, so it does not isolate a
single operator's allocations. cProfile time is for diagnosis; final speed
claims require repeated unprofiled runs with alternating implementation order.

The coordinator's first short n2 profile reported 0.247 s evolution, including
0.174 s diffusion and 0.060 s electrical advance. Electrical advance's own
Python work was 0.0117 s, so optimizing that loop alone cannot explain a large
whole-solver improvement. This seven-step diagnostic is too short for a speed
claim. The retained profile, repeated timing and final-field comparisons remain
coordinator-owned evidence.

With coordinator authorization, replaced electrical `self.segments` with three
flat numeric arrays. `advance` duplicates each face current for its two halves
and uses `np.add.at` into the existing cell heat. This keeps the series-segment
terms and ports intact, and avoids retaining nested Python tuples. The official
[NumPy documentation](https://numpy.org/doc/stable/reference/generated/numpy.ufunc.at.html)
specifies unbuffered accumulation for repeated indices; ordinary indexed `+=`
would incorrectly lose duplicate-cell contributions. No factorization, mass,
timestep, force or evolved velocity is cached.

Added `test_electrical_scatter101.py`: independent original geometry-loop heat,
four signed B/Hall/current cases, changing density, timestep and radial velocity
sign, per-cell heat and charge/energy ledgers. The baseline is expected to pass
this equivalence regression too: the change is performance preservation, not a
replacement physical closure. This reviewer performed no scientific execution;
the following executed evidence was supplied by the coordinator.

Final snapshot `v101-final06`, transfer SHA256
`79dfaa2ac3c3e24f5b1db481ad61409ae2890b166dc3867be99a462b34b83212`,
passes all **90 scientific tests**. Three alternating, unprofiled 152-step n4
pairs give median evolution times **28.182131222 / 19.592604593 s** and worker
peak RSS **382756 / 284072 KiB**: **1.4384x speed and 25.7825% peak reduction**.
The maximum separately normalized conserved-component difference is
**6.406e-13**, below the unchanged **1e-10** equivalence screen. Fresh workers
run serially under the same 1G VM and one-thread BLAS settings. These timings
cover the bounded early transient, not the full refinement campaign. RSS is
the worker's peak, not host or total VM memory.

The final implementation also uses scalar heat interpolation, unchanged-rule
1,024-element stress assembly, and MMD_AT_PLUS_A diffusion ordering. Batching
initially broke full-quadrature viscosity arrays and callbacks whose values
depend on the full coordinate domain: evaluating them separately on each
batch changed their input shape/domain. Final06 evaluates viscosity on the
full scalar quadrature once, then supplies matching slices to each stress
batch and shares those same values with local heating. This preserves the
original coefficient contract without reducing quadrature or adding a
fallback. Both compatibility controls fail on04 and pass on the original and
final06 implementations.

The full spatial study remains identified with its actual04 producer snapshot.
Fresh-process strict04-to06 comparison passes bitwise for n1/n2/n4 nominal
constructor arrays, sparse operators, nonconstructor operator code, unchanged
dependencies, and the complete n2 0.3-us state/ledger history. This supports
applicability of that study to the unchanged constant-viscosity nominal case;
it does not relabel the study as a06 rerun or qualify evolving variable-
viscosity closure. Numerical convergence, experimental fidelity and deployed
browser behavior remain separate gates. Retained logs and hashes are the
execution evidence.
