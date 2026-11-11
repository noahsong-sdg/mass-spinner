# Independent native finite-film audit

## Decision

**Accepted:** the recorded 16-case RustBCA incident-count partitions,
incident-projectile energy accounting, public translation, 64 pointwise Wilson
intervals, and eight frozen Monte Carlo sampling-consistency decisions.
The independent successful read-only pass processed **5,330,275,010 raw bytes**,
including **50,431,220 energy-transfer rows**, in **57.85 seconds**. All 128 raw
output-file hashes matched the producer readout, and the final source/data hashes
matched the canonical project files.

**Rejected as unsupported claims:** empirical LiT/Marathon calibration, a full
assembly/recoil/binding/thermal energy ledger, a qualified live retention kernel,
or universal/percent-level convergence from these sampling gates.

**Unknown in this pass:** independent reproducibility of the pinned native
binary build; long-time chemistry/thermal retention; deposition/erosion and
moving-interface coupling. Those are not inferred from endpoint classification.

No native simulation was rerun. This audit independently reduced actual retained
raw outputs rather than rerunning the producer's parser or accepting its flags.

## What was checked

The frozen campaign contains 100 keV, normally incident D in .1 or 2 µm assumed
LiT, with no backing or 10 µm of example W, counts 256/1024, seeds 3801/3802.

- **Identity:** native executable SHA, all 16 deck hashes, protocol/readout/status
  identities and all 128 output SHA-256 values. The complete status packet has
  16 COMPLETE entries. Per-case process-log hashes and final lines are retained
  in the independent receipt. Exit codes are those recorded by the completed
  producer run; this audit did not reproduce process execution.
- **Counts/geometry:** every deposited/escaped row has the expected D mass/charge
  fields and finite coordinates. Deposited endpoints lie in the assembly and
  are independently divided into film/backing. Escaped endpoints lie upstream
  or downstream. The four counts sum to the actual incident denominator for
  every case and exactly match the public partition. The raw format has no
  persistent incident IDs; the independent raw check establishes count closure,
  not an ID-level particle replay.
- **Energy:** nuclear/electronic transfers are finite, nonnegative and identified
  as incident-projectile records. The independent reducer streamed their
  **individual** values into `math.fsum`, rather than summing the producer's
  per-row combined values. Outgoing projectile energy was separately summed.
  It computed `incident - transferred - escaped` and checked the unchanged
  allowance `[-N*1e-5 eV, stoppedCount*1 eV + N*1e-5 eV]` in all 16 cases.
  Small differences from the producer's summation order stayed below the
  predeclared numerical comparison allowance; none changed a gate.
- **Public statistics:** all count/energy fields and provenance links match raw
  reductions. All 64 Wilson intervals were independently obtained by solving
  the score-test quadratic using the standard-normal .975 quantile. They are
  marginal 95% intervals, not 64 simultaneous confidence guarantees. Observing
  zero or all retained ions does not make the physical probability zero or one.
- **Sampling:** all eight coarse/fine film-retention differences and decisions
  were recomputed from raw count fractions. The unchanged familywise Hoeffding
  budget is **.18832909765353134**, or **18.83 percentage points**. The largest
  observed difference is **.0048828125**, or **.4883 percentage points**. This
  supports the declared sampling-consistency test; it does not establish a
  small universal interpolation error or percent-level numerical convergence.
  A union bound does not require independence between same-seed coarse/fine
  runs. No independence was assumed for those pairs.

## Recorded behavior and scientific interpretation

For the .1 µm free film, every sampled D exited downstream. For 2 µm films, every
sampled D stopped in the film, both with and without W. In the .1 µm film with
10 µm W, the four recorded `(film, backing, reflected, transmitted)` partitions
were `(0,248,8,0)`, `(2,248,6,0)`, `(3,990,31,0)`, `(3,980,41,0)` for the ordered
256/256/1024/1024 cases. These are observations of the declared uncalibrated
scenario, not a universal retention law.

The accounting distinction is material: nuclear transfer from the incident D
is energy passed to a recoil system, not proof that it becomes local heat.
Recoil transport, escaping recoils, surface/binding terms, chemistry and eventual
thermalization are not closed by this projectile-only sum. Successful native
endpoint classification therefore must not replace the live target's assumed
replacement/retention law without a separate qualified interface and evidence
for the desired domain.

## Execution and provenance

The parent and producer explicitly yielded exclusive read-only access to the
existing Apple safe-dev guest because raw outputs total 5.33 GB and host space
was constrained. Command shape:

```text
/Users/noahs/.local/bin/safe-dev -C /tmp/mass-spinner-material-v38-agent run -- python3 -c 'import sys; exec(compile(sys.argv[1], "<independent-v38>", "exec"))' '<exact independent_raw_audit.py source>'
```

Guest: `safe-dev-91df66bcebf94022`; raw root:
`/work/home/material-v38-raw/cases`; metadata root:
`/work/project/material-v38`. No source sync, dependency installation, raw copy,
archive operation, deletion or other guest write was performed. Guest ownership
was explicitly released after completion. Unique raw outputs still require
verified archival before this guest can be retired; this audit authorizes no
cleanup or claim that raw transport is complete.

The first pass completed every raw case and sampling assertion, then failed
while constructing its receipt because `export_reference.py` was not present in
the producer guest. This was a reviewer metadata-path assumption, not a physical
or parser gate failure. The reviewer removed only that optional source hash
from the guest receipt and repeated the full raw pass successfully. The public
translation remained independently checked in both passes; the translator's
host SHA is separately recorded below.

Durable evidence:

- `scientific/material-v38/independent_raw_audit.py` — independent stream reducer.
- `scientific/material-v38/independent-native-readout.json` — all per-case raw
  hashes/counts/energy totals, 64 interval checks, eight decisions and run scope.

Pinned SHA-256 values:

```text
877ddde3377395fc01a02192eac708673be2334f2926806c645276640614f686  independent_raw_audit.py, actual executed source
bde5bee030c3b6f2e626fa841553e35e9c697dd15427840a6c36d935da2883b8  finite_film.py
0faba77d6ae8c0cab4b8a7fcb5fb5b4c6b1791505f79c85a9d53119fed08c836  export_reference.py, host source-only
f15c8770a567f545f0b40c52ad28e5d2622393e49e8b00f989ff0ee731e6c536  protocol.json
30f95fd2e5f7d520af465b9c1a0241979a6713d5b9d2ee1a79525d400792e927  readout.json
1cc76cbe57b997bd90a1d66240e01c0dd67ec4416f86e54573db51e1bd9c602b  status.json
74dfbf4e330059322742125e4fd62c0ec8ed927c07db09af316d48dfe4b1998f  public finite-film-v38.json
33dd9018c6f3e8a5e150d65a4fca95a0b71a73674c1d677f23800018cd26ff5b  actual native executable
```

No browser, GPU, mobile or touch behavior was observed. This native follow-up
supersedes the *finite-film campaign unobserved* status of the earlier scalar
review, not its limits on material calibration or live coupled regeneration.
