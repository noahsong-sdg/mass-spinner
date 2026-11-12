# Retained comparator failure, attempt 02

All 26 flow and 64 optical groups completed. Final comparison stopped before
scoring: `canonical` compared the predictor's `{id,radiusM}` locations with
source records that additionally contain `extractionRadiusRangeM`.

This directory retains the failed log, execution receipts, prediction/index
seals, all optical packets and the exact producer source snapshot. Its 26
field packets are bitwise identical to `../attempt01/fields`, as certified by
`field-replay.json`; use that directory for the unchanged field bytes rather
than duplicating them here. The complete original guest export is also retained
locally at `/private/tmp/mass-spinner-meridional-v86-optics-export02`.

No experiment score was produced by this attempt. The correction normalizes
only the expected location metadata, still requiring exact predicted IDs/radii
and retaining the complete raw diagnostic-file hash. It changes no physics,
brightness, timestamp, optical estimator or measured-speed criterion.
