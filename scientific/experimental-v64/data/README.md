# Experimental marker provenance

Use **markers-corrected.json**. Its SHA256 is
`0cfb21edd1debf57ce7d62351b11d4f628fac84f5e44cfc87f21d84f1554de33`.
It uses actual0/7500/15000K PDF tick positions and matches the accepted study.

`markers.json` is retained **only as superseded evidence of the temperature-axis
frame error**. Do not use it for new comparisons. The final runner command uses
the corrected guest artifact explicitly; it does not read this earlier file.
See `docs/EXPERIMENTAL-BENCHMARKS-V64.md` for the correction and regression tests.
