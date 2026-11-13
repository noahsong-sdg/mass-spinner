# Executed Snakemake / FiPy workflow pilot

12 November 2026. Actual **Snakemake 9.27.1**, **FiPy 4.0.3**, NumPy 2.4.6
and SciPy 1.17.1, executed offline in Apple safe-dev VM
`safe-dev-233308a0e8df7ba1`. Complete environment: [lock](requirements-lock.txt).
This qualifies a small workflow/control, not the reactor or experimental model.

The [DAG](Snakefile) is actual FiPy conduction → independent analytic audit →
report → qualification → always-run cached-evidence admission. The insulated
cosine-mode problem and fixed gates are in [PROTOCOL.md](PROTOCOL.md).

| Verified result | Value |
|---|---:|
| Fine 32-cell / 100-step relative perturbation RMS error | 0.00160920234 |
| Relative conserved heat-inventory drift | 5.68434e-16 |
| Coarse 8-cell / 5-step error, unchanged .002 gate | 0.0290187505, **failed** |
| Coarse report | Retained; qualification exits 1 |
| Integration tests | **8 passed**, 18.812 s |

See [final test log](verification/tests-geometry-final.log),
[case data and receipts](results/595e2e2812a1dc964d85/),
[mutation/interruption receipts](verification/run-1794531689870011166/receipts.json)
and [cached admission log](verification/cache-repeat-geometry.log).

The former broad producer seal invalidated physics after checker-only edits.
Here physical code/configuration/lock bytes determine an immutable case path;
audit/report code determines separate descendant paths. Tests verify that a
checker edit retains physical bytes **and mtime**, while a physical-input edit
creates a new case and descendants. This fixes the dependency boundary without
dropping source seals or changing the physics.

A second trap was trusting cached output existence. An always-run final rule
checks exact-byte seals and parent links even when the solver is cached; a
same-mtime corruption of final qualification is rejected. Additional tests
reject corrupted field/audit/report data, preserve a scientific failure as
data, stop an execution exception, and genuinely SIGTERM the running workflow
after completed physics before resuming without rerunning that physics.

Independent review caught a geometry-admission bug: `zip(xM,expected)` checks
only paired entries, so a short coordinate array could pass. In plain terms,
missing cells escaped the coordinate check. The assessor now requires exactly
`cells` finite real entries in each coordinate/initial/final array before
geometry, error or inventory calculations. Eight resealed malformed fixtures
(truncations, nonfinite and non-real entries) must fail before an assessment
is produced. This enforces the physical cell geometry directly; content hashes
alone cannot establish shape validity. The updated default DAG reused the
unchanged physical packet and rebuilt only audit/report/qualification.

No blanket `|| true`, gate changes, fitted inputs or silently discarded failures.
`globalQualification` and `experimentalQualification` remain false everywhere.
SHA-256 seals identify bytes; they are not signatures against a malicious
writer replacing both artifact and seal. This pilot has no reactor closures,
external benchmark integration or distributed execution.

Run from a **copied safe-dev project root**, never the host:

```text
python -m pip install -r requirements-lock.txt
python -m unittest test_workflow -v
python -m snakemake --cores 1 --executor local --scheduler greedy --printshellcmds
```

Installation used an explicitly online guest invocation; every scientific
execution/test ran offline. The interpreter was
`/work/home/workflow-v88-venv/bin/python`. No credentials or host mounts.
[Final tested snapshot](verification/tested-snapshot-geometry.txt) records all
12 source/config/lock hashes. Exact tested export:
`/private/tmp/mass-spinner-workflow-v88-final-export02` (856 KiB including
Snakemake's local metadata); reviewed code/results/verification were copied
here without the scheduler's hidden work metadata. The earlier six-test
iteration and its [source snapshot](verification/attempt01-source/) are
retained, along with the [pre-geometry source](verification/pre-geometry-source/)
and seven-test receipts. Final eight-test evidence supersedes the smaller
test inventories.

Primary tooling references:
[Snakemake rule semantics](https://snakemake.readthedocs.io/en/v9.27.1/snakefiles/rules.html),
[FiPy](https://pages.nist.gov/fipy/).
