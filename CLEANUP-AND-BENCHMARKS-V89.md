# Cleanup and benchmark replay

12 November 2026. The interactive physics and its qualification gates are unchanged.
This work removes redundant storage, reruns the current reference campaigns and
reviews additional tools. A successful replay does not establish experimental accuracy.

## Completed host cleanup

Historical publishing retained both an archive and its expanded release. Every
file in 34 expanded releases was independently checked against its original tar
before removing the expanded copy: 5,109 files, 2,898,436,096 allocated bytes.
The original archives, scientific results, failed gates and source seals remain.
[Admission inventory](scientific/cleanup-v89/generated-release-duplicates.json),
[execution receipt](scientific/cleanup-v89/cleanup-execution.json).

A second pass removed 18 obsolete roots: twelve previous builds, the old
`public/` tree and prototype, installers and three unused tool installations.
All 10,700 original files and their filesystem metadata were first preserved in
a verified content-addressed local archive. After retaining that archive, the
allocated-block reduction was 1,860,235,264 bytes. Combined with the duplicate
release removal, that is about **4.43 GiB** of allocated files; concurrent APFS
free-space changes are a separate measurement.
[Recovery and exact scope](scientific/cleanup-v89/SECONDARY-CLEANUP.md).

Simply, old builds and unused installations were occupying space alongside the
current ones. Verified deduplication preserves recovery and reproducibility;
blanket deletion of versioned scientific folders would lose distinct evidence.
Historical links now identify the retained archive rather than removed paths.
The active Blender renderer, current assets and benchmark environments remain.

The historical material VM was retired through native container tooling only
after two identical full inventories and independent recovery readback. Its
3,744 files (6,542,419,673 bytes), directories and links are preserved through
the existing raw backup plus a new 1,031,421,952-byte allocated backup. The
retired volume occupied 6,711,279,616 allocated bytes: an additional bounded
reduction of 5,679,857,664 bytes, bringing the cleanup total to **about 9.72 GiB**.
[Preservation review](scientific/cleanup-v89/MATERIAL-PRESERVATION-REVIEW.md),
[native retirement receipt](scientific/cleanup-v89/material-retirement/retirement-receipt.json).
The Data filesystem reported 4,296,847,360 free bytes immediately before native
deletion and 10,703,839,232 afterwards; concurrent APFS activity makes that delta
distinct from the allocated-block accounting.

One abandoned read-only export helper was stopped with its original owner's
release; its volume remains. No active scientific job was stopped. Other
historical volumes with incomplete recovery evidence remain protected;
[exact retention boundaries](scientific/cleanup-v89/MATERIAL-RETIREMENT-PLAN.md).

## Benchmark scope

[The execution plan](scientific/cleanup-v89/BENCHMARK-PLAN.md) enumerates actual
physical producers, software controls, unchanged numerical gates and native
runtime identities. Fresh output roots keep the original results immutable.
The current campaigns are V86 flow/optics, V87 active timestep refinement, and
the six [V88 expert-code references](EXPERT-TOOLS-V88.md). Historical alternative
models are retained as inputs and evidence; their entire back catalog is not
represented as newly rerun.

The [flow replay report](scientific/cleanup-v89/flow-rerun/RESULTS.md) records
26 completed V86 cases, 64 optical groups and three V87 trajectories. Both
prediction packets and all 29 authenticated raw field packets match the originals
exactly. All 117 scientific regression tests and 13 orchestration/transfer controls
passed. The original V86 auditors still return exit1: 85 field gates and 335
original quadrature gates fail; the panel supplement retains 85 field failures
while its quadrature passes. V87 passes its 28 active temporal gates and 112
quadrature checks, leaving the 64 spatial failures unresolved. The optical
comparison still has zero all-point matches among 576 alternatives at each of
four fixed times. These are previously viewed development observations.

All six [expert-code campaigns](scientific/cleanup-v89/expert-rerun/RESULTS.md)
were freshly executed and independently read back:

| Reference | Fresh scope | Result |
|---|---|---|
| OpenFOAM | 13 cases | 86/86 gates pass; exact replay |
| FESTIM | 36 cases | 94/94 manufactured gates pass; exact replay |
| LoKI-B++ | 44 bounded cases | Exact replay; four ionization and two refinement failures remain |
| WarpX | 13 cases | Exact replay; six angular-momentum and eleven strict-energy failures remain |
| Target/Radau | Nine browser trajectories; three reference cases at two tolerances | Same 8/9 browser completion and two failed reference cases; browser exact, Radau changes negligible on original scales |
| Snakemake/FiPy | Fresh fine solve and physical negative control | Exact replay; fine admitted, coarse correctly rejected |

The unchanged upstream LoKI 100-field example exits zero despite 3,000 NaN rows,
an energy-domain warning and nonconvergence. Process completion had been mistaken
for numerical success: the program finished with unusable values. A separate
hash-bound log auditor now marks it failed; five regression tests pass. This
retains the original example and distinguishes it from the finite 44-case campaign,
instead of changing its inputs to conceal the failure.

The [independent review](scientific/cleanup-v89/INDEPENDENT-REVIEW.md) checked all
six native bundles, 820 members and 204 source aliases. Reproducibility is strong;
spatial convergence and the measured current/velocity mismatch still prevent
experimental qualification. The final application gate is recorded separately.

## Post-cleanup application gate

Inside offline 2 GiB safe-dev, `npm test` passed all 1,238 tests; `npm run
typecheck`, `npm run build`, `npm run check:site` and `npm run check:assets` each
exited zero. Three source-overlay controls passed. All 2,666 curated source
files were authenticated before and after execution; tested tree SHA256:
`b066b4388152183e1714bbe5b4dedac2ca106adf0a57f43e960db893e9340b6e`.
[Exact commands and log hashes](scientific/cleanup-v89/app-final/execution.json),
[source inventory](scientific/cleanup-v89/app-final/expected-source.json).
These are build/structural checks, not live browser or GPU verification.

The target documentation also now distinguishes a result-packet hash from its
producer-source hash. The old label conflated two valid identities; explicit
labels preserve the correct bytes and failed status instead of rewriting evidence.
Native input/log whitespace and sealed helper bytes are retained as executed;
the full new-evidence whitespace check reports them rather than silently editing
authenticated files.

## Tool decisions

The two independent reviews recommend using the installed stack more deeply:

- Extend the existing OpenFOAM comparison to matched compressible momentum,
  stress work and energy operators before adding another general PDE framework.
- Pilot [LoKI-MC](https://github.com/LoKI-Suite/LoKI-MC) for magnetized electron
  transport after matching its unmagnetized limits. This is a proposed pilot,
  not an installed or qualified replacement for the discharge model.
- Use the existing SciPy sensitivity tools after defining defensible inputs and
  resolving numerical failures. Missing material coefficients, electrode
  boundaries and diagnostic calibration cannot be supplied by another solver.
- Keep CHERAB and additional atomic/material-data adapters conditional on known
  measurement geometry, relevant data coverage and redistribution permission.

[Plasma/fluid review](scientific/cleanup-v89/PLASMA-TOOLS.md),
[material/diagnostic/uncertainty review](scientific/cleanup-v89/MATERIAL-TOOLS.md).
Their proposed gates and resource budgets are distinguished from executed results.
