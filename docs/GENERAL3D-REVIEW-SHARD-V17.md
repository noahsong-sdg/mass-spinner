# Independent review execution shard

Eight original review cases completed in a separate Apple safe-dev VM using four single-thread workers. The numerical sources, input arrays, checkpoints, diagnostic orders, budgets and gates were unchanged. This was an execution split; the reviewer owns comparison and aggregation.

## Evidence and provenance

- Canonical packet: `scientific/general3d-review-shard-v17`.
- Exact export: `/tmp/general3d-review-shard-v17-closed`.
- Flat `closed-seal.json` SHA256: `2b81bc6260526a0dc7b690cd9e7f173fc07f14eb33c90b275ba8cbd34591d047`.
- 315 sealed members plus the self-excluded seal; exact exported and canonical membership and every file hash checked.
- Original source manifest: `815c73b0b0f4829790eb8e2a88bb98e0fc799c519f104f649e35c191e7397159`.
- Original review plan: `eebf8413d4fe32a6239ed317809ee4651a95ac2ae85fff6ae4a9a757f65a9ceb`.
- Original flat input manifest: `096b5774456ac3a9c48f953e5772de80561437c9769f9760867aba1b697a7999`.
- Prospective execution plan: `c41c409e7c3e2fa3836fb121a44ca5e37eba643bf301425dcc6dc5ccdb150d45`.
- Closure checks: `execution-results/final-checks.json`, SHA256 `7cd1c1e04ba6d18a154e29a414453c64cc92eb3de988dd5ed4621276f1f8f86b`.

The actual guest runtime was Python 3.11.2, NumPy 2.2.6, SciPy 1.15.3 and Matplotlib 3.10.3, with `OPENBLAS_NUM_THREADS=1` and `OMP_NUM_THREADS=1`. Original runtime stdout/stderr and full installed-package identities are retained. An unused `uv` installation preceded clarification of the aggregator's actual Python version; it was not used for any scientific execution.

Guest results were exported before refreshing the guest with the host closure validator. The validator checked all eight original case/process records, their source/plan/input identities, runtime, exact case membership and unchanged input hashes. It also checks warning-before-JSON and duplicate-runtime-record controls. No scientific computation was repeated during closure.

## Original case outcomes

All eight cases completed with exit code zero. All passed horizon, number, momentum, energy and independent equation replay; positive PDFs follow from positive Gaussian mixtures. Execution completion does not establish continuum physical fidelity.

| Case | Process wall seconds | Peak RSS KiB | Physical entropy / integration |
|---|---:|---:|---|
| common-n8-q5-a050 | 3414.891 | 313744 | PASS / PASS |
| common-n8-q5-a050-boost | 3417.045 | 313756 | PASS / PASS |
| combined-n8-q5-a015 | 3053.325 | 264144 | UNKNOWN / UNKNOWN |
| combined-n8-q5-a005 | 1199.910 | 263100 | UNKNOWN / UNKNOWN |
| combined-n6-q3-a010 | 539.709 | 131560 | UNKNOWN / UNKNOWN |
| drift-n6-q5-a010 | 519.087 | 131548 | UNKNOWN / UNKNOWN |
| anisotropy-n6-q5-a010 | 444.126 | 131688 | UNKNOWN / UNKNOWN |
| combined-n6-q9-a010-rotate | 425.948 | 131668 | UNKNOWN / UNKNOWN |

Both broad common-temperature cases also passed their original stationarity gate over 101 retained states through 500 microseconds. Their finite physical moment-rate and distribution qualification remain separate questions. The other six entropy results remain UNKNOWN because the prescribed integration ladder did not qualify them. No gates were relaxed and no per-state cache prototype was applied.

These wall times are the original scientific process records. The slightly larger times in driver progress include launcher overhead. The independent reviewer must verify the seal, source/input/case bindings and runtime before merging, then compare its independently reconstructed initial rates and run the original aggregate comparisons.
