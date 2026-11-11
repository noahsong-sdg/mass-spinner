# Independent axial transport confirmation, v33

8 November 2026. This report covers the independently executed fine-axial
member of a prospectively frozen six-seed matrix. No production physics,
simulation defaults, sampling rule or convergence threshold is edited here.

## Prospective scope

The level is **N32768-r12-z9-h100**: 32,768 representatives per species,
12 radial base cells, 9 axial base cells, fixed source interfaces, Nanbu
scattering, 100 ns steps and the complete 200 µs horizon. Seeds are exactly
101, 202, 303, 404, 505 and 606. All remaining physical inputs are copied from
the earlier pilot before execution: two singly charged species of 40 and 84 u,
radius 0.2 m, length 0.6 m, B=0.06 T, 20 V, quadratic shape 1.2,
density 1e18 m^-3, ion/electron temperature 5 eV, Coulomb logarithm 10,
5 eV initial beam energy, source radius 0.08 m and source length 0.15 m.

The matched nz3 member belongs to another independent agent. This study alone
does not establish axial refinement equivalence. The unchanged budgets remain
1% fractions/CDF and normalized radius, 0.1 eV temperature, 2% normalized impact
time, 0.1% species angular transfer/raw angular residual, 1% sampled unresolved
exposure, and at least six independent whole-run seeds. Undefined observables,
no resolved seed spread and incomplete runs retain their existing UNKNOWN rules.

The research execution profile explicitly admits this 131.072-million-declared-
particle-step run under its separately raised 320-million work ceiling.
Interactive admission is unchanged. Its prospective wall-clock allocation is
**500 s per run / 3000 s combined**. A longer timeout, a shorter physical horizon
or a looser numerical threshold is not substituted after seeing results.

## Execution identity

The initial plan and full source map were frozen but **never simulated**.
They remain as `UNRUN-initial-plan.json` and
`UNRUN-initial-source-sha256.json`. Before any numerical run, a prospective
addendum adopted the parent matrix's shared production-source map. This lets
the aggregator check one execution source identity without conflating different
plan documents. Full execution inputs remain separately pinned.

- Executed plan SHA256:
  `66a4a6110b1ef555040509a6133544e50f83be539419e64cdf94dd754ed7f80a`.
- Shared source-map file SHA256:
  `5e965a159a712b48413b6bf9afbad6b1d9d2b17968a301163644c58397cf5a18`.
- Recorded run source identity:
  `ce9f7d1675841be920363278eaa306077e3ebdfb4af1ba41e08cdf6d7e0705b2`.
- Complete execution-input-map file SHA256:
  `398462fba244e4adc8419cf8bda3f703425c931e6e5ca6d8d4ade400d0c9a14a`.

Execution occurs in copied Apple guest **safe-dev-b8f19ca22edf5d87**, stage
`/tmp/mass-spinner-transport33-axial`. The only network-enabled action is
`npm ci --ignore-scripts`. Simulations and analysis are offline. No host home,
credentials, SSH agent or container socket is mounted. The initial guest was
exported before replacing it for the shared-map addendum.

Commands use `/Users/noahs/.local/bin/safe-dev -C` with that stage:

```
init
run --online -- npm ci --ignore-scripts
export /tmp/mass-spinner-transport33-axial-unrun-export
sync --replace-guest
run --online -- npm ci --ignore-scripts
run -- python3 run-confirmation.py
```

The wrapper verifies every complete-input hash before and after the batch.
The unchanged parent runner kills the entire child process group on timeout,
records every planned outcome and refuses to overwrite a result directory.
The per-run TypeScript entry point checks all shared-source hashes before and
after calling the uninstrumented production `executeSeed` and retains each
complete raw result compressed with gzip.

## Independent checks and limits

The separate Python standard-library checker imports neither simulator code
nor previous reviewers' helpers. Its source is pinned separately. It rebuilds
raw canonical angular momentum from saved active species means and collector
exits at their actual event times, without subtracting measured collision torque.
It separately integrates the saved active-population-weighted unresolved
exposure, reconstructs gated observables and survivor radial CDF inventory,
and checks collector/population partitions, physical horizon, configuration,
source identity and sampled domain flags.

These checks can confirm artifact consistency. They do not reconstruct unsaved
local cell populations or unsaved velocity distributions, certify states between
recording times, supply an experimental benchmark or establish a continuum-bias
bound. Alignment/orientation studies and the effect-versus-continuum-error gate
remain separate requirements. Parent owns the aggregate paired-seed intervals,
final application checks and any publication/deployment decision.

## Outcome

All six prospective runs completed, without errors, timeouts or unrun cases.
Their combined subprocess wall time was **2068.773 s**, below 3000 s; the
largest was **429.673 s**, below 500 s. A changed runtime during this concurrent
campaign does not establish its cause. No numerical budget was adjusted.

| Seed | Seconds | Raw angular maximum (%) | Unresolved exposure (%) | Outside snapshots |
| --- | ---: | ---: | ---: | ---: |
| 101 | 429.673 | 0.0285537 | 1.84148 | 0 |
| 202 | 426.558 | 0.0326597 | 1.66623 | 0 |
| 303 | 368.068 | 0.0355139 | 1.76349 | 1 |
| 404 | 276.022 | 0.0339908 | 1.69076 | 0 |
| 505 | 280.981 | 0.0290325 | 1.49155 | 0 |
| 606 | 287.471 | 0.0359226 | 1.88345 | 1 |

The raw angular gate passes all six runs. Every run exceeds the unchanged 1%
sampled unresolved-exposure budget. Under the production contract this alone
would remain coverage UNKNOWN. In addition, seeds 303 and 606 contain a sampled
state outside the supported collision domain, making this complete level's
sampled local-coverage gate **FAIL**. **Collision transport is not qualified.**

The two actual domain crossings are the configured encounter-magnetization
limit, not weak coupling, Debye population or estimated Coulomb logarithm:

- Seed 303 at 105.3 µs: maximum encounter magnetization **0.1170945**, versus
  limit 0.1. The reference estimate remains 0.0003292.
- Seed 606 at 169 µs: maximum encounter magnetization **0.1082537**, versus
  limit 0.1, with the same supported reference estimate.

These snapshots also have minimum sampled temperatures of 0.10096 and
0.08628 eV respectively. Their extrema may belong to different cells; the
saved aggregate records do not identify the cell responsible for the
magnetization crossing. They cannot separate physical cooling from finite-N
temperature-estimation error or establish a spatial location. The full saved
outside assessments are retained, including every reference and observed
diagnostic. Changing the guard or suppressing these cells is not justified.

Independent reconstruction passes all six artifacts, checking **294,402 timed
collector exits**. Maximum discrepancy in a raw angular history is
**1.03e-16** on its positive normalization scale. Every saved exposure integral,
population partition, horizon, source identity, declared configuration and
gated observable is consistent. Maximum observable/CDF reconstruction difference
is **5.56e-17**. The histogram integrates to the survivor fraction in both
species. These are artifact checks, not an independent continuum solution.

The numerical guest was exported before analysis refresh to
`/tmp/mass-spinner-transport33-axial-numerical-export`. The separate analysis
input-map SHA256 is
`005801e1428e3c9dd26bebfb18cb12402384da909ddb06ba40ee0b05d90e3a76`.
The offline command `python3 run-analysis.py` verifies this map before and
after executing the independent raw checker and retaining outside assessments;
it exited 0. Its complete log and outputs are preserved in
`/tmp/mass-spinner-transport33-axial-analysis-export` and the canonical evidence
directory. No further numerical simulation was performed for this analysis.

The separate paired-axial check has now executed against all available nz3
counterparts. The coarse agent's seeds 101 and 202 timed out under its frozen
400 s cap; seeds 303, 404, 505 and 606 completed. Those two missing counterparts
leave **all 60 gated axial-observable comparisons UNKNOWN**, each with four
defined pairs. No completed-subset interval qualifies the original six-seed
batch. Runtime differences do not prove the cause of either timeout.

The independent checker verifies that each available paired configuration
changes only the axial cell count (3 → 9), with identical seed, source hash and
research mode. It recomputes whole-run paired differences and Student-t
intervals using the existing table, withholding acceptance for missing pairs.
An independent analytic Student-t5 CDF inversion gives 2.570581835636312,
consistent with the production table's 2.570582. No representative or saved
timepoint is treated as an independent replicate.

The initially frozen paired-checker draft was never executed; a prospective
revision retained appropriate partial-batch intervals while keeping their
verdict UNKNOWN. After the first actual analysis run, its generic inference
label was corrected to avoid implying six observed pairs; all numerical
outputs and verdicts were unchanged. The earlier source, output and log are
retained in `paired/original`. The corrected checker was reexecuted with a new
complete input-map SHA256:
`db026f5b2a98c47eb5615e5816cb2d0709f2a370430c630346bf9d535446bf93`.

This second analysis used copied Apple guest **safe-dev-57a080228d7b76f1**,
stage `/tmp/mass-spinner-transport33-axial-paired`, with no dependency installation
or networking. `python3 run-paired.py` verified every input before and after
the check and exited 0. Exact final export:
`/tmp/mass-spinner-transport33-axial-paired-final-export`. Its tested source,
parent aggregate plan, raw inputs, statuses, result and log are preserved under
`paired/`; file paths in its input map are relative to that directory. The
raw-audit input map remains relative to this evidence directory's root. The
two source snapshots are kept distinct.

The leaf integrity list `SHA256SUMS-V33.json` covers every retained evidence
file except itself and `SEAL.txt`; the latter records the list's SHA256.
The report is copied into the sealed leaf as `REPORT.md`. Earlier v33 locality,
high-N, gate-review and physics leaves are unchanged by this study.
