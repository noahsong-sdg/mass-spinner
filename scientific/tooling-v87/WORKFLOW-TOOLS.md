# Workflow and evidence tooling audit

12 November 2026. Sources/receipts inspected read-only; no scientific code,
tests, installation or VM commands executed by this reviewer. A standalone
admission checker and regression tests were subsequently added below; they
await parent-run safe-dev verification. Other recommendations are proposals.
Historical V86 evidence remains unchanged.

**Decision:** fix stage dependency boundaries and report admission first. Pilot
Snakemake inside the existing safe-dev VM for the next small campaign. Keep
the SHA-256 evidence contracts. Do not adopt every library in this review.
Workflow tooling can reduce wasted runs and stale reporting; it cannot repair
the fluid closure or establish experimental accuracy.

## Evidence actually inspected

- [V86 producer](../meridional-v86/campaign86.py),
  [stage runner](../meridional-v86/run86.py),
  [optics/comparison](../meridional-v86/compare86.py),
  [summary](../meridional-v86/summarize86.py),
  [frozen protocol](../meridional-v86/PROTOCOL.md),
  `results/execution-final.json`, `results/environment-lock.txt`, and
  [retained comparator failure](../meridional-v86/results/failure02/README.md).
- Representative older workflows: V85 `run85.py`; V75 `run.py`, including
  `hashes`, `requests`, `admit_checkpoint` and trajectory checkpoints; V55
  `campaign-run.py`; V86 independent `performance86.py`.
- Repository text search found existing h5py usage in neutron validation and
  xarray in formulary lockfiles. That is evidence of dependencies, not proof
  that this flow campaign uses either. No workflow-engine use was found in
  the inspected Python/config/requirements search; this is not an exhaustive
  audit of every file or installed environment.

Numerical results quoted in other V86 reports were not recomputed in this audit.

## 1. Producer dependencies include unrelated analysis code — fix now

**Problem.** A comparator metadata correction required replaying unchanged
physics. The retained `failure02/README.md` identifies the exact correction:
compare predicted `{id,radiusM}` against the same projection of source records,
whose extra `extractionRadiusRangeM` is not predictor output. It records 26
unchanged field packets and the original attempt mapping.

**Technical cause.** `campaign86.sources():25–29` fingerprints every local
`*.py`, including comparator, plotter, tests and runner. `compare86.check_flow`
compares that entire mapping to the current tree before accepting fields.
`optical_sources():41–42` similarly includes its combined predictor/scorer
module and all V80 Python files. Source integrity is checked, but the declared
dependency graph is larger than the numerical dependency graph. Changing
downstream code invalidates upstream states. A scheduler cannot infer the
right boundaries from these overbroad declarations.

**Plain cause.** Fixing the ruler makes us rebuild the machine that was measured.

**Fix.** For a new campaign, explicitly enumerate the producer closure:
campaign driver; `flow.py`; `diffusion86.py`; `electro86.py`; `transport82.py`;
its dynamically loaded V81 transport code and viscosity source; frozen
physical configuration/baseline packet and protocol. Keep a separate full
workspace/review receipt, rather than using it as the flow cache key. Give
optical prediction, numerical audit, scoring and reporting their own code and
input fingerprints. Split a combined optics/scoring module when it otherwise
makes their source closures inseparable. Test/scorer changes must invalidate
their own evidence, including final qualification, even when fields are reused.

**Why this fix.** It retains actual physics/data dependencies while eliminating
the demonstrated waste. Dropping hashes, hashing only the entry script, or
marking outputs up to date would weaken provenance. Keeping broad receipts
as provenance is useful; treating them as every stage's dependency is not.
Do not retroactively change V86's sealed definition or erase either attempt.

## 2. Final plots do not admit every consumed artifact — fix now

**Problem.** The final report can combine current inputs with a stale derived
comparison if files are replaced after comparison. This is a verified missing
check in the path, **not evidence that current published results are stale**.

**Technical cause.** `summarize86.py:16–18` checks audit and optical-summary
`predictionSHA256`; `:37–38` checks the panel prediction. But `:62–63` then
decompresses `comparison.json.gz` and reads the current V79 target directly.
It does not verify the comparison bytes against the summary's
`comparisonSHA256`, nor the target against the comparison's `targetFileSHA256`.
The comparator already emits both seals. Field packets receive stronger
admission through `compare86.load`: path containment plus packed/raw hashes.

**Plain cause.** The chart checks which run its cover sheet describes, but does
not check that the pages underneath still belong to that cover sheet.

**Fix.** At report entry, verify the exact bytes of every consumed artifact
against its upstream receipt, including comparison, target, optics index,
audit, panel supplement and thermal-reference evidence. Verify the parent
links and expected inventory before computing or plotting. A report receipt
should record those admitted input hashes and its own report-source/runtime
fingerprint. Bind stage execution receipts to the same manifest; retain the
already saved environment lock rather than assuming a package name records
the complete numerical environment.

**Why this fix.** It uses hashes already produced by this path and extends the
existing fail-closed contract. A new database, signing service or generic
provenance framework is unnecessary for a local trusted research pipeline.
Hashing proves identity, not scientific validity; both must remain separate.

**Scoped implementation.**
[check_report87.py](check_report87.py)
adds a standalone `validate_inputs(results,target)` function and stdout-only
CLI. It reads the actual V86 schemas and checks prediction bindings on optics
index, comparison/summary, audit and panel; packed comparison/target/index
hashes; the panel's original-audit hash; and exact summary metadata agreement.
Its receipt always states `globalQualification=false` and
`experimentalQualification=false`. It checks comparison scope but does not
claim that boolean declarations prove absence of fitting. It does not replace
the independent numerical/source/field-packet audits, bind thermal-reference
evidence, or alter the frozen V86 summary. New report callers must use it;
writing the helper alone does not guard existing report entry points.

[test_check_report87.py](test_check_report87.py)
uses temporary fixtures for valid read-only admission, stale comparison,
byte-changed target, stale prediction links/audit/index, old missing seals,
inconsistent summaries, fitted-scope rejection and missing files. Parent
verification commands, inside the synchronized safe-dev snapshot, are:

```text
python -m unittest discover -s scientific/tooling-v87 -p test_check_report87.py -v
python scientific/tooling-v87/check_report87.py
```

No checker/test execution result is asserted here. The independent helper is
the smallest coherent fix that avoids changing V86's broad producer seal.

## 3. Manual phase orchestration repeats workflow machinery — pilot next

**Problem.** `run86.py:15–30` and `run85.py` maintain nearly parallel command
lists, log plumbing, continuation exceptions and receipts. V86 `campaign86`
runs the complete case list serially and rewrites one campaign index after
each case. Unlike V75's explicit `--resume`/checkpoint admission, V86 has no
admitted per-case resume path. An interrupted campaign therefore lacks a
supported skip-completed mechanism.

**Technical cause.** A hand-written ordered loop expresses phases rather than
file dependencies. It cannot automatically select only stale descendants or
show a dry-run dependency plan. Receipt and cache correctness are separately
hand-maintained.

**Plain cause.** We repeatedly tell the computer the order of work instead of
declaring which result each task needs.

**Fix.** A small Snakemake local-executor pilot inside safe-dev, with explicit
source/config inputs and one immutable result per physical case. Suggested
graph:

```text
frozen configuration + physical source closure + runtime receipt
  -> case fields -> flow inventory seal
       -> independent numerical assessment
       -> optical prediction seal -> development-data comparison
  -> report, receiving every assessment and admitted seal
  -> qualification (fails if any required gate fails or evidence is missing)
```

The measured velocity fixture belongs only to the comparison/report branch.
Flow and optical producers must not read it. Brightness/diagnostic inputs
remain separately identified physical measurement inputs, not velocity-fitting
parameters. Seal predictions before scoring; preserve all declared scenarios,
times and alternatives. Re-scoring already viewed development data remains
development comparison, even if the workflow is perfectly reproducible.

Retain two statuses: successful execution of an assessment and the scientific
outcome it reports. A completed assessment may validly emit `gate_fail`; an
exception, missing case or corrupt packet is `execution_error`. Scientific
failure must remain an input to the report and make final qualification fail.
Do not hide failures with `|| true`, unconditional success files or a changed
threshold. Snakemake `--keep-going` alone continues independent jobs, not
descendants of a failed job, so it does not implement this distinction.
Its documented rerun triggers cover code, input, parameters, timestamps and
software environment; imported numerical files must still be declared.
([Snakemake CLI](https://snakemake.readthedocs.io/en/v9.27.1/executing/cli.html),
[rules](https://snakemake.readthedocs.io/en/v9.27.1/snakefiles/rules.html))

**Why this choice.** Python/file-based rules fit existing scripts and local
parameter sweeps. Start with a pinned stable release, not the documentation's
10.0 alpha. Keep execution inside the existing VM; no host Docker socket,
credentials or source mounts. This replaces the runner's generic duties,
not the solver or scientific assertions. A dependency fix should land before
the engine pilot; neither requires rewriting historical campaigns.

## Other expert tools: where they help, and where they do not

| Tool | Concrete use here | Decision |
|---|---|---|
| **DVC** | Content-addressed artifact storage/run cache and Git-linked data manifests could reduce duplicated evidence archives. Explicit dependencies also solve stage invalidation. | Later, if storage/distribution becomes a measured bottleneck. Do not layer two engines now. DVC's default pre-stage output deletion needs deliberate handling for unique failures; its cache identity is not a replacement for our SHA-256 admission. [Pipelines](https://doc.dvc.org/user-guide/pipelines/running-pipelines), [guide](https://doc.dvc.org/user-guide). |
| **Nextflow** | Resumable task directories and execution across heterogeneous resources. | Not the minimum solution for this single-VM Python study. Task metadata and work directories both need retention; default input caching includes file path, mtime and size, which does not replace content seals across guest copies. Useful if execution actually moves to a cluster. [Cache/resume](https://docs.seqera.io/nextflow/cache-and-resume/). |
| **xarray** | Named `time,z,r,component` axes could make field analysis safer than positional `q[4]` and array indexing. | Small postprocessing adapter only after admission. Different refinement grids must remain separate or be mapped through the fixed physical quadrature. Require exact coordinate agreement when combining equal-grid cases; automatic alignment must not silently change the sample set. Not a replacement for conservative cell geometry or units. [Dimensions/indexing](https://docs.xarray.dev/en/stable/user-guide/indexing.html). |
| **HDF5/h5py** | Typed, chunked arrays and partial reads if JSON decompression becomes costly; already used for external neutron results. | Benchmark one new packet format before changing storage. Keep old JSON/gzip immutable and verify numeric round-trip/axis metadata. Prefer one file per case locally; multiwriter machinery is unwarranted. [Chunked datasets](https://docs.h5py.org/en/stable/high/dataset.html). |
| **Zarr** | Chunk access for object storage and parallel readers/writers. | Defer until actual remote chunk access or large arrays require it. The present JSON packet path is simple, deterministic and independently hashed. More chunks also require more inventory/sealing work. [Arrays](https://zarr.readthedocs.io/en/stable/user-guide/arrays/). |
| **pytest** | Run existing unittest controls with richer selection/output; use parameterized tests for source-closure mutations and corrupt/stale receipts. | Good incremental test runner, not a wholesale test rewrite. Existing unittest discovery is legitimate. Parametrization requires pytest-style test functions rather than decorating TestCase methods. [unittest compatibility](https://docs.pytest.org/en/stable/how-to/unittest.html). |
| **ASV** | Repeat fixed optical/direct-versus-Fourier timing and memory benchmarks over revisions. V86 `performance86.py` currently times one kernel call. | Later, for a demonstrated performance task. Use existing guest environment and fixed inputs; no root/system tuning. Keep accuracy gates independent: faster is not more physical. [Benchmarks](https://asv.readthedocs.io/en/stable/benchmarks.html), [existing environment](https://asv.readthedocs.io/en/stable/commands.html). |
| **Pint** | Check units when ingesting experimental measurements/configuration or deriving transport coefficients. | Useful at new input boundaries; convert to documented SI floats before sparse/hydro kernels. No demonstrated unit bug justifies wrapping all arrays. Treat eV-as-energy and K-as-temperature through explicit Boltzmann conversion. [Tutorial](https://pint.readthedocs.io/en/stable/getting/tutorial.html). |
| **SALib** | Predeclared Morris/Sobol screening could identify which externally supported uncertainties dominate observables. | Only after a numerically resolved admissible domain exists. Freeze parameter bounds from independent data, preserve failed cases and report estimator convergence. Categorical closure alternatives are model alternatives, not automatically random draws; arbitrary uniform bounds do not yield a measured confidence interval. [Supported methods](https://salib.readthedocs.io/en/stable/index.html), [decoupled workflow](https://github.com/SALib/SALib/blob/main/docs/user_guide/basics.rst). |
| **ArviZ** | Diagnostics and posterior predictive checks for a declared Bayesian measurement/calibration model. | Not currently applicable to a deterministic no-fitting comparison. No posterior/prior/likelihood is defined here. Adding Bayesian plots would not make closure uncertainty probabilistic or create held-out evidence. [Purpose](https://python.arviz.org/en/stable/). |

## Small, falsifiable adoption pilot

Keep this separate from the running V87 numerical study. Use a new small
campaign and the same safe-dev isolation, with a frozen tiny case fixture:

1. Specify exact producer, audit, optics, scorer and report dependencies. Run
   one case and compare raw field arrays/hashes against the current direct
   entry point on the exact same guest snapshot. No physical changes.
2. Change only a scoring test/comment or plotting code. Producer fields must
   be reused; affected checks/report must rerun and have new evidence seals.
3. Change an actual imported numerical coefficient source or physical input.
   The flow and every descendant must invalidate. Include the dynamically
   loaded V81 transport source and its JSON data in this mutation test.
4. Corrupt a field packet, index, comparison packet or target after sealing.
   Admission must reject each stale artifact. Verify a copied pre-pilot
   packet lacking the new receipt is not silently promoted.
5. Interrupt after one case. A fresh invocation must reuse only completed,
   correctly sealed cases and rerun incomplete work. No incomplete campaign
   index can satisfy the full expected case inventory.
6. Supply a correctly completed but scientifically failing assessment. Its
   report must be generated, failure preserved and qualification rejected.
   Separately inject an execution exception: mark the campaign incomplete
   and forbid qualification. Retain all original logs/failed attempts.
7. Record source/data/runtime seals, exact guest snapshot and commands; run
   the required project tests, typecheck and build once at the final gate.

Success is selective rerun **with unchanged evidence admission and unchanged
physical output**, not a faster run that skips a required check. Do not call
this migration complete until those mutation/interruption tests execute in
safe-dev. None were executed for this audit.
