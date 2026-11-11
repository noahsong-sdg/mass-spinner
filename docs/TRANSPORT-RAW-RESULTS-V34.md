# Independent terminal raw audit results, v34

All 30 prospective Philox runs passed exact admission and independent raw-ledger reconstruction. Raw angular-momentum budgets passed at all five levels. Sampled model-domain coverage failed at all five levels: 109 of 4650 sampled frames, across 24 of 30 runs, crossed the existing local encounter-magnetization limit. This is analysis completion, not transport qualification.

## Inputs and unchanged method

The analyzer and protocol were frozen before receiving outcomes; preparation seal `04535fea33c1f6408cb04b24fa0138e7073d172e8fb89d53fce75edb309f4292` remains unchanged. Analyzer SHA-256 is `494ae39dbcef187659c5b01a5859c0c3afb77a3642cf41177e2f6656b660c8fd`. No analyzer changes or physical reruns occurred after ingestion.

Provider terminal catalog SHA-256: `2bbdcd6c9a5ef014a1fc1d00e092d8302aa8cf3758844827221df45ede9af35f`.

Provider status SHA-256: `bb8321a94154ed90ef0b0d76893bd73cffef2de4edf47e2659fd3ea9619202e3`.

Plan SHA-256: `5d73f77d31f9052097c1a9097468e545a31791b5896b344556696bb64abec8d9`; executed source identity: `4ace5d1e542015ecb4a2be87e1a946a514612f95cd4543a0ca32611445ddd6e6`.

A retained metadata-only adapter checked provider catalog/status equality and each of the 30 request/log/artifact pins. All 30 configs, seeds, Philox headers/selectors, research modes, source identities, complete raw statuses and case uniqueness matched. There were no catalog, admission or raw-reconstruction issues. The offline runner verified 97 input hashes before and after; its input-map SHA-256 is `8eb97489bb86b6013b2c8682f0176851a518b639bf372626e92ceaab4fb1fdbb`.

## Reconstructed gates and ranges

Each row includes all six declared seeds. Angular values are maximum absolute sampled raw canonical-momentum residuals including exit flux and without torque correction. The unchanged angular budget is 0.001. Unresolved exposure is the active-representative time-weighted trapezoid estimate; its unchanged budget is 1%. Exceeding exposure alone means UNKNOWN. Any outside-domain sampled frame makes the existing coverage gate FAIL.

| Level | Raw angular maximum range | Unresolved exposure range | Outside frames / 930 | Runs outside / 6 | Angular / coverage |
| --- | ---: | ---: | ---: | ---: | --- |
| N16384, r12, z3, 100 ns | 0.000220741–0.000340339 | 1.31671–1.81680% | 6 | 3 | PASS / FAIL |
| N32768, r12, z3, 100 ns | 0.000220874–0.000304270 | 0.85065–1.17618% | 26 | 5 | PASS / FAIL |
| N32768, r12, z3, 50 ns | 0.000250128–0.000309641 | 0.87811–1.18958% | 28 | 6 | PASS / FAIL |
| N32768, r12, z9, 100 ns | 0.000288983–0.000363463 | 1.56541–1.88462% | 11 | 4 | PASS / FAIL |
| N32768, r6, z3, 100 ns | 0.000759238–0.000871611 | 0.57808–0.86199% | 38 | 6 | PASS / FAIL |

The maximum difference between independently reconstructed and producer angular maxima was `3.361026734705064e-17`; for unresolved exposure it was `3.122502256758253e-17`. Both are below the established 2e-13 diagnostic-reconstruction agreement check. Population/exit destination counts, exit-time inclusion, history/regime alignment and horizon, positive normalization, final exit ledger, pair/unpaired accounting and declared particle-work diagnostics all passed.

The only outside-domain reason was **sampled local encounter magnetization reaching 0.1**. Its numeric flag count exactly matched the 109 outside frames. There were no reference-state violations, no coupling/screening/logarithm threshold violations, and no unclassified reason types. Sparse-cell reasons appeared in 4120 sampled frames (891, 849, 853, 913 and 614 by table row). Reason counts overlap statuses; sparse sampling can coexist with an outside flag and must not be mistaken for an additional independent failure count.

The separate descriptive readout retains every case's observed-diagnostic ranges, first/last outside time, exact reason and numeric flag counts, and active-time frame proxies. The largest outside-frame proxy is 5.98204% of a run's active-representative time. That proxy weights all active representatives in a flagged snapshot. It is **not** a measured fraction of ions in offending cells: retained extrema and reason strings cannot localize the offending cells. No gate is assigned to these descriptive proxies.

## Execution and interpretation

Independent stage `/tmp/mass-spinner-transport34-raw-terminal`, guest `safe-dev-debd70a563fae1f1`, offline commands:

- `python3 adapter.py`: exit 0, 0.038 seconds.
- `python3 audit-raw.py --plan confirmation-plan.json --catalog terminal-catalog.json --output audit-result.json`: exit 0, 1.851 seconds.
- `python3 describe-raw.py`: exit 0; descriptive readout only, no additional thresholds.

The first two ran under `python3 run-terminal.py`, with a 180-second per-command ceiling. No production code, physical simulation, statistical comparison suite, typecheck or build ran in this audit. Original output was exported to `/tmp/mass-spinner-transport34-raw-terminal-final-export` before the guest was synchronized for the separate descriptive readout. The latter was exported to `/tmp/mass-spinner-transport34-raw-terminal-descriptive-export`.

Frozen analyzer result SHA-256: `687ce38de94333d16c6eb795813e1aa1f31433d39134f24ba1b7fdc38abd351e`. This independently establishes that analysis was completed before the later passive diagnostic witness was released. It provides no qualification approval. The reason for encounter flags still requires examination; these counts alone do not establish either genuine magnetized encounters or a sampling artifact. The existing domain limits remain enforced. Missing alignment/orientation coverage and a justified continuum-bias bound remain separate blockers; the statistical reviewer owns the paired observable convergence assessment.
