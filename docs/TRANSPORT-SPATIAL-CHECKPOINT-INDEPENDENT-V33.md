# Independent spatial recovery checkpoint v33

Reviewer: transport33_physics. This is a separate intermediate readout, not an
amendment of the original campaign. No production or physics changes.

## Result

The frozen independent analyzer accepts all **24 clean saved runs** for identity
and accounting and reconstructs **180 passing paired decisions**: 60 particle,
60 axial and 60 radial. The 60 timestep decisions remain UNKNOWN because this
checkpoint deliberately retains the six original non-completions at h50.
**Overall qualification remains FAIL**: sampled domain flags occur in all four
populated levels, and unresolved exposure exceeds its unchanged 1% budget in
multiple runs. Alignment, orientation and physical-effect-versus-continuum-bias
evidence are also still absent.

The distinction matters: the original available-data intervals were UNKNOWN
because they had too few pairs. Five clean resource retries fill those missing
spatial/particle pairs. They do not repair collision physics or erase any original
timeout. No statistical or physical threshold changed.

## Independence and exact inputs

The first execution excluded the production summary and was exported before the
parent provided the reference. It used the unchanged stdlib analyzer, protocol
and launcher:

- analyzer `8bd1a935ee7de542b2fcebc24d254d65b92a806fa03df1720dcfd5c3e877ec07`
- protocol `3f5ccd4185a881be44d16847f5ed94c88f4cef1e9e87806b5ebddbc1f72c4b2c`
- plan `a384961e2acab2c1ba09a14da879884219dde2d8ee8e62233c1099f02a4aec18`
- source map `5e965a159a712b48413b6bf9afbad6b1d9d2b17968a301163644c58397cf5a18`
- executed source identity `ce9f7d1675841be920363278eaa306077e3ebdfb4af1ba41e08cdf6d7e0705b2`
- checkpoint catalog `0f1632381fc7123ffacf12e7225fb49caab7cdaee1f9bbc5ba32fedecab9873e`
- independent-first report `5e63dac162804d7977dc8f8f2018316996e9a1c5f7cab252d2996648250e729e`

All 45 mapped source files were checked. The additional checkpoint input verifier
checks all 24 artifact SHA pins, unique 30 level/seed identities, clean exit-zero
records and all status-record matches. Every new request exactly matches the
frozen level/config, seed and research execution mode; its log has the frozen
source identity. Each recovered row retains an `originalAttempt` exactly equal
to the original terminal catalog. Other 25 rows remain exactly original. The
five retries replace missing results, not seeds, and are not new independent
replicas. The status counts are 24 complete, one timeout, one interrupted and
four unrun. All six non-completions belong to the original timestep level.

## Independent numerical reconstruction

| Comparison | Paired seeds | PASS | FAIL | UNKNOWN |
|---|---:|---:|---:|---:|
| N16384 → N32768, r12/z3/h100 | 6 | 60 | 0 | 0 |
| h100 → h50, N32768/r12/z3 | 0 | 0 | 0 | 60 |
| z3 → z9, N32768/r12/h100 | 6 | 60 | 0 | 0 |
| r6 → r12, N32768/z3/h100 | 6 | 60 | 0 | 0 |

Each interval retains the frozen paired Student-t rule and six-seed minimum;
these are pointwise intervals, not simultaneous confidence bands. The tightest
passing bound is axial A.angularTransfer: (|mean| + half-width)/tolerance =
0.9877694356. Passing this comparison has only about 1.22% interval headroom.
There is no evidence here of a failed filled paired-observable gate.

The analyzer independently reconstructs the canonical-angular ledger, exiting
populations, raw angular maximum, unresolved exposure, all gated observables and
descriptive impact Hamiltonians. Across all 24 runs, maximum angular-ledger
disagreement is 1.0281e−16 and maximum observable disagreement is 1.5987e−13,
within the frozen accounting roundoff budget. That verifies saved-record
consistency, not unsaved distributions or every between-snapshot local state.

## Remaining coverage and domain failures

Percentages below are fractions multiplied by 100; the angular budget is 0.1%
and the unresolved-exposure budget is 1%.

| Level | Largest raw angular defect | Unresolved exposure range | Outside snapshots |
|---|---:|---:|---:|
| N16384/r12/z3/h100 | 0.030568% | 1.29604–1.57743% | 1 |
| N32768/r12/z3/h100 | 0.032817% | 0.89227–1.17367% | 34 |
| N32768/r12/z9/h100 | 0.035923% | 1.49155–1.88345% | 2 |
| N32768/r6/z3/h100 | 0.090661% | 0.49617–1.13699% | 53 |

All 24 raw-angular budgets pass. Raw conservation remains a separate test from
observable refinement and from the previously demonstrated systematic finite-cell
spin damping. The coarser radial mesh reduces unresolved exposure but has larger
angular defects; it does not solve all requirements simultaneously. In the
N32768/r12/z3 level five of six exposure values exceed 1%; in z9 all six do; in
r6 seed202 does. N16384 exceeds the exposure gate in every seed.

The five newly audited results are:

| Recovered level/seed | Raw angular defect | Unresolved exposure | Outside snapshots |
|---|---:|---:|---:|
| N32768/r12/z3/h100, 101 | 0.024455% | 1.09138% | 9 |
| N32768/r12/z3/h100, 202 | 0.027383% | 1.17367% | 8 |
| N32768/r6/z3/h100, 101 | 0.070634% | 0.49617% | 10 |
| N32768/r6/z3/h100, 202 | 0.089520% | 1.13699% | 3 |
| N32768/r6/z3/h100, 303 | 0.090661% | 0.67273% | 9 |

All 90 outside snapshot records across the 24 runs contain the sampled local
encounter-magnetization-limit reason (configured limit 0.1). Of those, 78 also
list cells lacking four representatives in a present species. The five recovered
runs contribute 39 outside records, 34 also with the unresolved-cell reason.
These counts are independently extracted from raw saved regime histories.

**Verified:** the saved sampled proxy trips the existing gate. **Not verified:**
that physical encounters actually became magnetized. The moments are estimated
from finite, sometimes very small, local populations; the flag is not an
independent microscopic encounter measurement. Parent's separate domain witness
is not used as an acceptance input here. A better estimator would require a
prospective uncertainty study and separate validation, not recoding these flags
as passes after seeing the output.

## Production comparison after the first export

Only after preserving the first independent export was the production reference
provided and ingested, SHA
`510a2af9d3075c4d787fb2f1a2523c0e58e722cd9e0c8e0b8cd557afa95af2ae`.
All **240 statuses, sample counts and tolerances agree exactly**. All mean,
standard-error and half-width comparisons pass the frozen 2e−13 scaled
roundoff criterion; no mismatches. Of 540 finite numerical statistics, 470 are
bitwise equal; the maximum absolute difference is 3.47e−18. The 180 missing-time
statistical entries are null on both sides. Thus the codes' readouts agree; the
remaining failures are not explained by different interval arithmetic.

## Execution and preserved artifacts

All Python ran offline inside the distinct Apple safe-dev guest
`safe-dev-2c6b4192de915868`, project copy
`/tmp/mass-spinner-confirmation-spatial-independent-v33`. No dependency install,
physical simulation, production import, source change, build or test was needed.
The existing frozen analyzer independently reimplements the readout in stdlib.

Exact checks:

1. `safe-dev ... run -- python3 verify-spatial-inputs.py`: exit0, provenance checks
   pass; unchanged analyzer exit0 in 4.276s, fixed 180s cap.
2. First export preserved before sync/reference ingestion, report hash above.
3. Explicit guest sync after adding reference; provenance hashes checked before
   and after `python3 run.py`; exit0, unchanged analyzer exit0 in 4.312s, 180s cap.
4. Unchanged original descriptive-extraction script run on the checkpoint:
   exit0; it reads raw regime records without importing production.
5. Additional descriptive comparison of already-computed statistics: maximum
   difference and interval-headroom extraction above; no acceptance change.

Canonical evidence snapshots are
`scientific/transport-v33/confirmation-independent-spatial-first/` and
`scientific/transport-v33/confirmation-independent-spatial-reference/`.
The latter's `original-descriptive-summary.json` and
`original-outside-frames.json` names are inherited from the unchanged extraction
script; their contents describe this checkpoint catalog. The original campaign
and physics reports/seals remain separate and unchanged. The new checkpoint seal
is `scientific/transport-v33/confirmation-independent-spatial-SHA256SUMS`.

Do not promote this checkpoint into a transport qualification: timestep recovery
is still pending, sampled coverage gates fail, and the remaining declared
sensitivity/continuum-bias evidence has not been supplied.
