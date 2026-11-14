# Stable-norm replay: evidence review

The root-run stable replay removes the two demonstrated near-null quadrature
failures while preserving every tested physical-admission gate and the six
legacy spatial failures. The combined preflight remains **PENDING**, with all
nine full-clock jobs still required.

## Review scope

This reviewer authored the norm implementation and its controls, independently
of the PDE producer. This is a source/provenance and recorded-results review,
not an independent implementation of the PDE or a second scientific execution.
Only trusted artifact reads, hashing and JSON comparisons were performed here.

All 120 payload hashes in
`retained/stable-evidence-20261113/export-inventory.json` match. Checked seals:

- 111-input transfer: `8a1e19b531b89709df3fa145144cf367c4cc79d01bc78a6032cb2ab0292b1362`.
- Stable implementation: `5b54757cb1fc08eeffd70a0b62167cafb149fe4b101057e5c5bd4b3f54c9708b`.
- Analysis driver: `759039097b2e827752925cbac3ccff12cd72b6beb14541493d9f1382cabe4be7`.
- Canonical stable audit: `1c9cc7034257079b264015bdaf0c70b5022d27bf164f3bd9e8b4436feeba4793`.
- Preserved raw failed audit: `19b36780162a19d8d7e52f4f8fd6902fc61ea0644797dfd6807384613495c845`.

The canonical result's `metricImplementationSHA256` matches the actual source.
Its separately recorded analysis-source hashes match the driver and controls.
The producing snapshot, saved-field prediction hash and producer inventory
are unchanged. The driver temporarily injects the new metrics only into
postprocessing and restores the prior function afterward.

## Direct comparisons checked

JSON comparisons of actual raw and stable artifacts establish:

- Both contain 41,138 gates with identical kind, context, order and limit.
- Every non-norm gate is exactly equal, including value and decision.
- The raw result retains its two initial axial panel failures. Their contexts,
  values and 1e-10 limits are also retained in `rawComparisonFailures`.
- The stable result has zero failures within this bounded preflight.
- The actual V106 legacy replay retains every gate context, limit and pass/fail
  decision, including all six original spatial failures. Its well-conditioned
  failed norms also pass the driver's strict relative-agreement check.

The stable initial axial error integrals are 1.69105902680123e-43 for density
and 3.27189643863906e-28 for temperature. They remain **positive**, not clipped
to zero. Their orders 2/3 agree within the unchanged 1e-10 panel limit and
match the separately recorded Decimal Q1-mass results to ordinary binary64
accuracy. The Decimal 40/60-digit results themselves agree within 2.1e-25
relative error; its analytic mass and Gaussian integrals agree independently.

The finite-time differences remain essentially unchanged: radial density
increment 2.381344%, radial velocity 0.486684%; axial density increment
3.009840%, radial velocity 0.994207%, axial velocity 1.405413% at 1 microsecond.
These are discrete differences under the existing finer-response norms,
not experimental errors.

## Receipts and reporting correction

The retained control log records **7/7 passing**. The actual legacy-plus-new
replay records 43.54 seconds and 396,132 KiB peak RSS. The execution receipts
are successful; this reviewer did not rerun those commands.

The old preflight metadata counted four short geometry/CFL keys toward the
full-job inventory and therefore listed only five missing keys. The canonical
stable result preserves that list as `rawMissingFullJobKeys`, explicitly lists
all nine full jobs as missing, and retains PENDING qualification. The driver
contains and passed an actual five-versus-nine reporting check. This corrects
metadata without treating any short preflight as a full-clock trajectory.

`results/audit.json` in the new packet is an intermediate replay output.
Use **`results/stable-audit.json`** as the canonical derived result: it carries
the metric hash, raw-failure linkage and corrected full-job metadata. Neither
file overwrites the separately retained raw failed audit.

No blocking discrepancy was found in this bounded arithmetic correction.
The original metric definition, physical inputs and numerical limits are
preserved; [METHOD-NORMS.md](METHOD-NORMS.md) explains the arithmetic change.
Full radial/axial/joint/time convergence, finest-grid temporal accuracy,
physical closure, experimental accuracy and deployed behavior remain outside
this result's approval scope.
