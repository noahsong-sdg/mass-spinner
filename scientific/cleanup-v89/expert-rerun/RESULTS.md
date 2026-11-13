# Fresh expert-code benchmark results

Executed 13 November 2026 UTC inside the existing isolated safe-dev tool guests.
All six physical producers were rerun in fresh output locations. Original V88
source/protocol seals and baseline Git bytes were checked before native work.
No physics, input fit, original numerical gate or live application code changed.

| Campaign | Fresh execution | Observed result |
|---|---|---|
| [OpenFOAM](openfoam/coverage.json) | 13 native cases; 4 tests; 86 gates | All pass; 93,521 selected physical scalars exactly replay |
| [LoKI-B++](electrons/coverage.json) | 24 original + 20 extension cases; 8 adapter/admission tests; 3 upstream test executables | All bounded cases complete; original four ionization and extension two contraction failures persist; same eight bulk points admitted; 1,040 selected scalars exactly replay |
| [FESTIM](festim/coverage.json) | 36 native cases; 9 tests; 94 gates | All pass within manufactured scope; 566,637 selected scalars exactly replay |
| [WarpX](warpx/coverage.json) | 12 original cases + matched warm-off; 9 tests | Same six canonical-angular and eleven strict-energy failures; 5,561 selected scalars exactly replay |
| [Target/Radau](target-radau/coverage.json) | Nine requested browser trajectories; three reference cases at two Radau tolerances; 9 controls plus 4 zero-rate controls | Same 8/9 browser completion; pulsed case passes; continuous packing and beam-off ledger gates fail |
| [Snakemake/FiPy](workflow/coverage.json) | Fresh fine solve; 8 integration tests with physical negative controls; cached admission rerun | Pass; fine field SHA and all 203 selected physical scalars exactly replay; coarse physical failure correctly rejected |

Five new orchestration controls pass in each of the six environments: four
comparison controls and a nested native-failure receipt preservation control.
All physical result comparisons explicitly check array inventories and preserve
the original gates; exact replay demonstrates reproducibility, not experimental
accuracy. Per-campaign `execution.json`, `frozen-preflight.json`,
`replay-comparison.json`, `launch.json` and `TRANSFER.json` contain exact commands,
sources, native identities, statuses and exported artifact hashes.

## Native example failure caught by independent review

The unchanged LoKI upstream 100-field example exits zero but is **not a passing
physical control**. Its retained log contains 3,000 NaN rows, an energy-domain
warning (1020.66 eV grid beyond the 1000 eV lookup table), and three temporal
nonconvergence warnings. The separate [health admission](electrons/upstream-example-admission/result.json)
binds that exact log to the native execution receipt, records `numericalPass=false`
and exits one. Five supplemental tests pass, including exit-zero/nonfinite and
stale-log controls. Original native inputs, output, logs and receipts are unchanged.

The reporting error was treating successful process completion as reliable
numerics. In plain terms, the program finished while producing unusable values.
A separate sealed log admission corrects that interpretation while retaining
the upstream failure; changing the frozen example settings would conceal the
failure rather than qualify it. This does not alter the 44 finite bounded cases
or expand their unmagnetized domain.

## Radau replay differences

The browser packet is byte-identical to the original (`63e73efb…`). The fresh
Radau results have 1,175 changed numeric scalars out of 9,145 compared values.
The [unchanged-scale diagnostic](target-radau/radau-replay-diagnostic.json) finds
maximum population, temperature and energy-ledger changes of 1.11e-15,
6.82e-13 K and 3.49e-10 J/m² respectively. The largest change over the original coordinate scales
is 5.09e-11 in the beam-off 1 J/m² ledger coordinate. All three integrator-stat
records and qualification flags are unchanged. These small differences are
consistent with floating-point execution variation; its precise cause was not
isolated. Near-zero residual ratios are not a useful scale for state agreement.

The continuous finest browser trajectory still stops on its original packing
boundary. The beam-off cooling ledger still fails its original normalization.
The exact-zero supplement still admits all 45 zero-current samples. None of
those failures or normalizations was changed to obtain a green replay.

## Recovery and limits

Complete source/results/log bundles are hash-verified twice and retained under
`/Users/noahs/.codex/archives/mass-spinner-v89-expert-20261113`. Expanded transfer
duplicates were removed only after verification. OpenFOAM raw ZIPs remain
local-only, explicitly listed by size/hash in its transfer receipt. LoKI upstream
cross-section input data is not redistributed.

Public compact packets keep new outputs and source recovery maps. Frozen source
aliases name original Git commit/blob identities where available; new V89 helpers
name their own canonical paths and SHA values plus immutable bundle recovery.
No mutable-source hardlinks replace frozen evidence.

These are offline numerical references. Current V86 spatial failures and the
experimental current/optical mismatch remain unresolved; live and experimental
qualification are not established by these reruns. Final application build and
typecheck belong to the root coordinator's separate final gate.
