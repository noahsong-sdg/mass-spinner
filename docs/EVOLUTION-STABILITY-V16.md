# Entropy increment arithmetic: isolated v16 patch

This package isolates a demonstrated arithmetic defect in the full entropy-increment callsite. The original 14-study v16 package stays frozen with core `60574a6a12dc80cef214c680498bbe8e55c1199722004b96dbd902b85490ab2e`. The new core is `52df85de3d4ea8e24496873e0275f744b0846a7164109a9a02e1364b131c3249`; the JFNK solver, physical model, input data and timestep algorithm are unchanged.

## Problem and traced cause

`advance` uses `entropy_increment` to avoid subtracting two nearly equal entropy totals. The increment computes each Gaussian shell's density change from a log ratio. Although the earlier `logratio` formula stays finite for large moves, `factors .* expm1.(ratios)` can overflow before multiplication by a tiny component weight. Alternatively, the computed relative density change rounds to exactly −1 and the entropy remainder evaluates `0*log(0)`. Both yield NaN for a mathematically finite increment.

In simple terms, a shell can move into a velocity region where it was almost absent. Computing its enormous growth factor first loses the answer even though both endpoint densities are finite. This was demonstrated with the real full function, before editing: three single-shell moves at variance 0.00078125 and radial Gauss-Legendre order 2048 on [0,12] produced six failed finiteness/agreement assertions. The failed source and log are retained under `provenance/before-fix/`.

## Minimal fix and choice

The original operations remain in their original order whenever the relative change and resulting entropy term are finite and the relative change is greater than −1. The demonstrated unsafe branch alone uses a common old/new log-density scale. Each signed component difference uses an exponential bounded by one and `expm1` with a nonpositive argument. It therefore avoids forming an overflowing growth factor.

The scaled branch still distinguishes the relative change of the **total mixture**. For a small total change it retains the cancellation-resistant entropy remainder, even when an individual tiny component has an enormous ratio. For a well-separated total change it subtracts scaled endpoint contributions, treating a numerically underflowed density's entropy contribution as zero.

This choice addresses the actual overflow and `0 log 0` boundary while preserving the existing small-step solver calculations. Always subtracting complete endpoint entropies would lose tiny changes; clipping density, adding weight floors, projecting moments or fitting rates would change the physical calculation. No such changes were made. The supported model has positive fixed weights and positive variance; this patch is not a proof for arbitrary unbounded Float64 inputs.

## Frozen checks and reproduction

The tested source and prospective replay configuration are pinned in `execution-freeze.json` and `campaign-plan.json`. The latter was reviewed before replay and has SHA256 `b1dc26438cc79b5f1126b692036df832418a908d016b533ebececc6941b61c6e`.

All execution is in the owned Apple safe-dev project VM, offline except the pinned official Julia installer download. Julia 1.13.3 lives outside guest project source so explicit source synchronization does not replace it. The original code, all frozen inputs and valuable failed logs are copied data, not live mounts. The installer verifies archive SHA256 `9ceb053bee6dfb8189bd40afd6925de3a9b7ff8fac8d01a5fcdd84af171ddf03`.

Inside the guest project, the checks are:

```sh
/work/home/isotropic-runtime-v16/julia-1.13.3/bin/julia --startup-file=no test_stability.jl
/work/home/isotropic-runtime-v16/julia-1.13.3/bin/julia --startup-file=no test_core.jl
/work/home/isotropic-runtime-v16/julia-1.13.3/bin/julia --startup-file=no test_runner.jl
python3 test_all_histories.py
/work/home/isotropic-runtime-v16/julia-1.13.3/bin/julia --startup-file=no test_all_histories.jl
python3 campaign.py fine-stability-replay
python3 test_compare_replay.py
/work/home/isotropic-runtime-v16/julia-1.13.3/bin/julia --startup-file=no export_stress.jl
```

The all-history preparation intentionally refuses to overwrite its packed inputs. Replay intentionally refuses to overwrite a scientific history. To reproduce, use a fresh copied source package with result/packed directories omitted; never delete the preserved evidence package in place.

The focused regressions cover three large full-callsite moves, bitwise preservation of ordinary small steps, a full two-species mixture with weight 1e−20 and tiny total change against a 256-bit reference, and the scalar weight 1e−15 case where one ratio exceeds 1000 but the total mixture changes only slightly. `stress-cases.json` records the actual quadrature, model arrays, endpoint radii and measured increments for independent evaluation without importing the producer kernel.

## Observed results

All checks below completed in the owned offline VM on the pinned new core, run wrapper and vendor solver:

| Check | Observed result |
| --- | --- |
| Full-callsite stability regression | 14/14 passed |
| Existing core regression | 41/41 passed |
| Persisted scientific-record protection | 14/14 passed |
| Old/new accepted entropy increments | 480/480 bit identical across all 14 cases and 494 states |
| Actual finest 100 µs replay | 20 steps, 21 recorded states, exit 0 |
| Original/replay physical-state identity | Every time/radius value and all static model/quadrature metadata bit identical |

The actual replay used 391.78 s of solver wall time (394.32 s process wall time), peak process RSS 506,584 KiB, no limit termination. Running it concurrently with the all-history check took 395.22 s with aggregate peak RSS 842,828 KiB. Final species temperatures are 3.68031945376916 and 8.319680546210206 eV; stable entropy change is −0.6169518669375643. These are byte-identical physical states of the original finest dt5 case, rather than a new independent convergence campaign. Its independently computed diagnostics can therefore be transferred by state identity, once the independent reviewer verifies the identity evidence.

Reference history SHA256 is `dc6d5a427c09f03f815746c13715611983ea25e99d355d4c414eecf2d8f8883c`; replay history SHA256 is `3e81d864f595558873ea5bf4669e422aadfa0ea7b2155a475b52a0d7939126a9`. Whole-file hashes differ because step timings are measured anew; `fine-physical-identity.json` records the exact fields compared, source pins and zero differences. The original 14 histories remain labeled with their actual old source, rather than being relabeled as runs of the new source.

The stress export SHA256 is `d82cae7b21cc03a4e63fc66deae5cb913b32247ad0390b4739da1aed48b6a124`. Independent physics review of that export is tracked by the parent audit; passing implementation tests alone does not validate the entire transport simulator or establish arbitrary-distribution convergence. This patch remains within the existing homogeneous isotropic two-ion reduction.
