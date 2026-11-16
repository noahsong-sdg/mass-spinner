# Finite-current footprint execution and independent review

16 November 2026. No author contact, new parameter fitting, relaxed historical
gate or change to the live simulation equations. The entry point is the
[frozen protocol](../PROTOCOL.md); the website report summarizes these results.

## Problem, cause and fix

The prior point-ring reference's electrode work grew from 2579 to 2873 to
3157 W with mesh refinement. A zero-area ring source has a singular contact
self-potential: the grid supplies a shrinking physical cutoff. Simply, the
model had no electrode width, so finer cells changed the implied contact.

Both new maintained finite-element implementations instead integrate prescribed
current over fixed finite supports with the physical `2*pi*r*ds` surface area.
Use the work-conjugate, flux-weighted contact voltage and the finite annular
second radius moment for torque. This fixes the demonstrated singular-source
cause without clipping heat, adding artificial damping, or selecting transport
from experimental residuals. Historical point-source files/receipts remain
unchanged; finite patches are separate declared hypotheses, not a silent new
interpretation of the experiment.

Uniform current patches are not equipotential metal electrodes. Inherited
conductivities 1070/107 S/m imply Hall parameter 3, historically inferred using
electrical observations. No new fitting does not make those inputs independent
experimental transport. The apparent middle-case voltage proximity cannot be
counted as experimental agreement. Peak heating at sharp patch edges, sheaths,
thermal evolution, meridional flow and the live model are not qualified here.

## Exact checks and environment

All solvers, tests and builds ran in isolated Apple Container guests, non-root
1000:1000, one CPU; scientific runs had no network, 2 GiB ceiling and one BLAS
thread. Source/dependencies used the temporary credential-free copy
`/tmp/mass-spinner-public-campaign-20261116`. Runtime/dependency versions and
image digests are the same as the [parent campaign](../../public-data-campaign/results/RUN.md).
No host scientific solver was executed. Runs are serial to bound memory.

Guest commands, with supplementary packages prepended to inherited PYTHONPATH:

```
python3 -m unittest discover -s scientific/finite-contact-reference -p 'test_*.py' -v
python3 -m unittest discover -s scientific/public-fenicsx-reference -p 'test_*.py' -v
python3 scientific/finite-contact-reference/campaign.py campaign-results/finite-contacts-final.json
```

All **seven new tests**, **five historical neighboring tests**, and all **nine
mesh-case screens** passed (each case assembled independently in both codes).
The official DOLFINx 0.9.0 image supplies UFL/Basix/PETSc; supplementary SciPy
1.14.1/scikit-fem 12.0.2 preserve its inherited NumPy ABI.

Application/report checks ran separately, offline, with a 1 GiB ceiling:

```
node --import tsx --test --test-concurrency=1 tests/qualification-page.test.ts
npm run typecheck
npm run build
npm run check:site
npm run check:assets
```

The HTML regression and all four required checks passed. The existing large
Vite main-chunk warning remains. This continuation did not rerun the full 1357
application tests; it changes only offline reference code, the evidence report,
its regression and the manual qualification workflow. The preceding full-suite
receipt remains separate. The updated workflow was not dispatched in GitHub CI.

## Retained results

| Paired footprint | Finest port V at prescribed 100 A | Fine angular change | Fine port change | Fine Joule change | Fine viscous-work change |
|---|---:|---:|---:|---:|---:|
| Narrow | 21.8612 | 0.4455% | 0.8647% | 1.0446% | 0.1045% |
| Middle | 18.1214 | 0.4002% | 0.2374% | 0.2833% | 0.0785% |
| Broad | 14.1143 | 0.2966% | 0.1197% | 0.1455% | 0.0500% |

All fine changes contract relative to coarse changes and fall below the declared
5% screen. Maximum cross-code field/integral difference is 1.324e-9 relative.
Maximum budget residual across both implementations is 2.203e-12, below 1e-8.
These are numerical convergence screens, not rigorous continuum-error bounds.

`campaign.json.gz` retains both codes' complete sampled angular/potential arrays,
integrals, currents, exact torque, every refinement difference, explicit model
inputs, runtime and all solver/protocol/test source hashes. Decompression matches
the final raw receipt exactly:

- Raw SHA256: `6b6be0e788f6b3447e3247ef472e6e8dfe127ad7495ccd7bf62aebf043d35c2f`.
- Gzip SHA256: `4131e5bfd6c1c0181e522cff169bed2b4bca5ed38c41514ca3023793b7e9c274`.

`campaign-initial.json.gz` preserves the earlier complete calculation before the
extra independent-field arrays/provenance metadata were retained. Its equations,
outputs and gates match the final run, but it has its own source identities.
All log compression is lossless; decompressed bytes were checked against raw.

## Failed first test and root-cause correction

`finite-contacts-tests-01.log.gz` preserves the first gauge-oracle failure. A
single Gaussian rule crossed multiple Q2 elements along the anode, producing
5.63e-6 relative quadrature error against a 1e-7 oracle tolerance. A globally
smooth polynomial rule is not exact for a piecewise polynomial across facets.
In simple terms, the test averaged across bends in the numerical function.

The test now integrates each physical facet independently with a four-point
Gaussian rule, exact for its Q2 trace and surface weight. The tolerance and
solver were unchanged. This corrects the oracle rather than hiding the error
with more global points or a weaker assertion. Final/earlier successful logs
are retained separately.

## Independent reviews

Two agents reviewed the boundary physics and implementation independently of
the author. One visually checked retained original apparatus page 673: 24 wall
rings, each 2 cm thick, two anodes, 4 mm hollow-cathode inner radius. No measured
emission width was recovered. Direct publisher retrieval failed; this source
claim uses the retained primary page and existing provenance review.

The implementation reviewer independently reconstructed every retained
refinement metric, both codes' angular and gauge-normalized potential
differences, integral differences, work/source/torque arithmetic and current
source hashes. Compressed/raw receipt equality was verified. No blocking
finding remained within the stated scope. The reviews required explicit
inherited-calibration disclosure and retention of both codes' fields; both are
included. Reviewers did not execute an additional independent solver run.

**Experimental and live-playground qualification remain false.** The next
physical step remains identifying current footprints/voltage mapping and
independently justified transport, followed by neutral/ion and energy closure.

## Publication receipt

Only the rebuilt HTML report changed in the deployed asset set. Cloudflare
version `99a3d8da-9b21-4cd5-a6c6-96903edadf32`, published using the existing
isolated guest session; no credentials copied, permission changes or new login.
`deployment.log.gz` retains the successful command output. The supported in-app
browser reopened the actual public report and showed the finite-contact results,
calibration provenance and retained limits. At its existing 373 px viewport,
document width was also 373 px; the new content was readable without horizontal
page overflow. Console warning/error inspection returned an empty list.
This continuation verified the changed report, not every playground control or
an experimental outcome. No browser access policy was changed.
