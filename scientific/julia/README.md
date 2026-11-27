# Julia collisionless orbit reference

Independent continuous-time Lorentz orbits for Mass Spinner's prescribed quartic potential, using SciML's high-order adaptive integrator. This reference does not implement collisions, self-consistent plasma fields or experimental separator validation.

## Executed reference

Executed in the dedicated Apple safe-dev aarch64 Linux VM on 7 November 2026 UTC. Julia 1.13.3, OrdinaryDiffEqVerner 2.4.2, SciMLBase 3.58.0 and JSON 1.13.4; all transitive packages are pinned by `Manifest.toml`. The official Julia archive was checked against SHA-256 `9ceb053bee6dfb8189bd40afd6925de3a9b7ff8fac8d01a5fcdd84af171ddf03` before extraction. Runtime/dependency caches stayed in the VM. No host scientific execution was used.

`orbit-reference.json` records four quartic interior trajectories (40/84 atomic-mass units, zero initial canonical angular momentum and a radial perturbation) plus uniform-B trajectories with both field signs. Each has 201 checkpoints from 0 to 200 µs and tolerance levels 1e-9, 1e-11 and 1e-13. States are `[x,y,z,vx,vy,vz]` in SI units. Configurations and initial states are explicit. No trajectory reaches an absorbing boundary in the tested cases; this does not test event location.

The final tolerance refinement changes checkpoint positions by at most **1.072e-13 m** and velocities by **1.551e-8 m/s** across these cases. Finest sampled normalized energy and canonical angular-momentum residuals are at most **5.563e-16** and **2.459e-16**. The artifact records the positive SI normalization scales. These are observed numerical diagnostics, not certified global error bounds or experimental accuracy.

## Verification and provenance

`julia --project=. runtests.jl` passed **2,448 assertions**: 2,412 signed-B/zero-B analytic gyro checkpoint assertions over six configurations, and 36 refinement/invariant/interior checks over six reference cases. These assertion counts are not independent plasma realizations.

`run_reference.jl` completed offline and produced the JSON reference. Its six recorded source hashes match the reviewed host `Project.toml`, `Manifest.toml`, orbit module, runner, tests and runtime installer. Host JSON adds a final newline to the exported data; numerical content is unchanged. The executed guest snapshot was exported to `.cache/verified-v1` before host changes were applied. Generated caches and review exports are excluded from version control.

## Reproduce

From this directory, initialize a new guest. If the guest already contains valuable work, export it to a new directory before replacing its source snapshot. `sync --replace-guest` also deletes guest dependencies; do not use it while a study is running.

```sh
safe-dev init
# After reviewing/exporting any older guest work, use this when refreshing:
safe-dev sync --replace-guest
safe-dev run --online -- python3 install_julia.py
safe-dev run --online -- env JULIA_DEPOT_PATH=/work/project/.cache/julia-depot JULIA_NUM_THREADS=2 JULIA_NUM_PRECOMPILE_TASKS=1 .cache/julia-1.13.3/bin/julia --project=. -e 'using Pkg; Pkg.instantiate(); Pkg.precompile()'
safe-dev run -- env JULIA_DEPOT_PATH=/work/project/.cache/julia-depot JULIA_NUM_THREADS=2 .cache/julia-1.13.3/bin/julia --project=. runtests.jl
safe-dev run -- env JULIA_DEPOT_PATH=/work/project/.cache/julia-depot JULIA_NUM_THREADS=2 .cache/julia-1.13.3/bin/julia --project=. run_reference.jl orbit-reference.json
safe-dev export /absolute/path/to/a/new/review-directory
```

Downloads occur only in the two online steps. Scientific tests and reference generation run offline. Review exported files before copying them to the host; do not copy runtime/dependency caches. See [tool selection and candidate limitations](TOOL-CHOICE.md).
