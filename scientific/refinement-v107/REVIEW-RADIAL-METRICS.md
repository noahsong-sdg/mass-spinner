# V107 full-clock radial and timestep review

The actual radial triple contracts, but **does not pass** the unchanged matrix:
the 4 μs density-increment difference is `0.055956883027349226`, exceeding
the **0.05** spatial limit. It must remain a failure. All tested timestep
comparisons continue to pass; this does not establish full qualification.

## Evidence and method

Reviewed `retained/radial-evidence-20261114/` with trusted hash, gzip, JSON and
arithmetic readers only, loading large audits serially. No project modules,
scripts, tests, PDE or VM was executed; only trusted standalone artifact/hash/
arithmetic readers. I authored the stable norm and
parts of the adapter, and statically reviewed the controllers: this is a
provenance/predicate review, not an independent PDE or norm implementation.

All **314** payload hashes match the export inventory (331,536,547 bytes).
All five actual prediction seals match the canonical case receipts. Checked
canonical audit SHA256:
`f63ed0efb04ad2a632ffddc4b2074755d5424b5d2d5490ad6f00ea9a3661cbd5`.
The new r16z2 prediction is
`786b52edf45d1436665bab421b8131f60b932accdb240ad475b9acbbfb8e9a61`;
its compressed/raw field seals match. All five packets have identical producer
source inventories, physical manifests and scenarios. Frozen stable norm SHA256
remains `5b54757cb1fc08eeffd70a0b62167cafb149fe4b101057e5c5bd4b3f54c9708b`.

The new full r16z2 case records 320 × 48 cells, CFL 0.1, clocks 0/1/2/4 μs,
18,757 steps, exit 0, 7,450.807530838 s, and 695,216 KiB peak RSS within its
1,048,576 KiB budget. Its same-source resource preflight seal is retained.

## Actual results and unchanged checks

The audit has exactly **5 cases, 2 layouts, 56 comparisons, 224 panel checks,
2 distinct-clock checks and 354,880 gates**. All stored gate predicates and
contraction decisions agree with independent JSON arithmetic. Exactly one gate
fails; `caseAdmissionPass=true`. Maximum panel-quadrature spread is
`1.4466413247448796e-14`, below the unchanged **1e-10** limit.

Fine r8z2 → r16z2 relative changes (fractions):

| Time | Density increment | Radial velocity |
| --- | ---: | ---: |
| 1 μs | `0.02381344392327056` | `0.004866844727443142` |
| 2 μs | `0.031661394560786156` | `0.00977785394475116` |
| 4 μs | **`0.055956883027349226` FAIL** | `0.018151583545961525` |

The 4 μs density increment contracts from `0.1344405076726748` to the failing
fine value. Contraction and the separate 5% magnitude requirement are distinct.
Every old four-case gate object is unchanged from the published timestep audit
(canonical subset hash `1faa63e48fedc02cbaa304d365ee0e14599c78d73d80c27f45be41ec429601bf`).
All 28 old timestep comparisons are likewise exactly unchanged. Spatial/time
limits remain **5%/2%**; ledger and inventory limits are unchanged.

## Localization and scope

The supplemental allocation reuses the same squared density-increment norm.
Its two canonical integral reproduction spreads are exactly zero; panel-sum
relative defects are **0** and **`9.149675473058065e-16`**. Positive error and
reference integrals reproduce both reported relative changes. Reported top-panel
fractions are finite and nonnegative. These are union Q1 interpolation panels,
not original finite-volume cells; localization alone does not identify a cause.

Canonical status is **FAIL**, qualification **PENDING**, with
`fullDeclaredMatrixPass=false` and four full jobs missing: r4z1, r8z1, r8z4,
and r16z4 at CFL 0.1. Axial/joint convergence remains unqualified. The original
six V106 failures are exactly retained, and the separate two-failure initial
axial diagnostic remains unchanged at SHA256
`7bd41151c8d843acd238af9c64f92652c0b6696612409d0ff11fa967e93e773d`.
No producer fields, gates, or failure decisions were changed; no experimental
or live-model approval is warranted. All short-lived readers have exited.
