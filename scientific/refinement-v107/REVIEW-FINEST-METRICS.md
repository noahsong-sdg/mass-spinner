# Finest preflight: metrics and provenance review

The finest **0/1-microsecond resource preflight** and its recorded numerical
checks pass. The full nine-job 0/1/2/4-microsecond qualification remains
**PENDING**. No experimental or live-playground approval follows.

## Evidence checked

This reviewer authored the stable norm and its controls, independently of the
PDE producer. This review inspected sources, sealed artifacts, execution
receipts and JSON comparisons; it did not execute project code or rerun the
simulation. It is not an independent PDE implementation.

All 257 exported payload hashes match
`retained/finest-evidence-20261113/export-inventory.json`. Checked seals include:

- Unchanged producing 107-input snapshot: `31d24d7550a869e830e561c5276270b8daedeb8b948da30c54107cb801997cef`.
- Unchanged checker 113-input snapshot: `993dc1e78b42aefa79c8261f6b335115ad4476ed06a5f8304a0a214e6a4e6836`.
- Finest prediction: `f84e8380ef3d8ccbb6e1d695fb2d165ef8cdb4557cc445f42b2e3aecce363a85`.
- Canonical audit: `f98a4b0d9bb41de3363412706db63693af97cf0c38c1732402afc6c4d00f66b5`.
- Exact replay driver: `73b969bde196e9caa929e6e167318a78093b2d98b7dd1cac97d9bc86bc86d70a`.

The prediction's complete source inventory matches current files. The
canonical audit explicitly identifies the unchanged stable metric and entry
point; their hashes match the actual sources. Input seals, no-fitting flags,
conditional scope and the prior r16-z2 resource receipt remain intact.

The new compressed field passes gzip integrity and its packed/raw SHA-256
checks (`bf4785d0...cffdcaf` / `55b2aac2...a0cdb4a`). It contains two conserved
states of shape 6 by 96 by 320 at exactly 0 and 1 microsecond, plus 2,997
accepted-step ledger records. No full-clock trajectory is present.

## Clock, resource and gate checks

The completed case declares CFL 0.1, the original 100 ns cap, and the
predeclared 2 GiB profile. The first recorded step is 1.5752 ns, equal to
0.1 times its acoustic bound; the last is reporting-clock limited and ends
exactly at 1 microsecond. The unchanged auditor checks the complete accepted
clock sequence, reconstructed primitives, positivity, torque and conservation.
Accepted-clock checks do not establish timestep-refinement accuracy.

The case receipt records **3,869.50 seconds**, **1,221,720 KiB peak RSS**, a
successful worker exit and completion below its 2,097,152 KiB budget. The outer
invocation took 3,871.37 seconds; these are different timing scopes. Peak
temperature is 234,263.28 K, preserving the physical-closure limitation.

The combined audit has **59,170 gates, zero failures**. Its limits remain
5% for spatial differences, 1e-10 for panel quadrature and the original
ledger/contraction limits. The existing 2% timestep-refinement limit is not
exercised by this short preflight. The replay took **57.60 seconds** and
**329,292 KiB peak RSS**, consistent with the separate successful execution
receipt's 57.93-second outer timing.

Direct artifact comparisons establish that all **41,138 earlier gates are
present and exactly equal**, including values, limits and decisions. Earlier
radial/axial comparison records and all six original V106 failures are also
exactly equal. The extra gates admit the new trajectory and its two-level
axial pair; they do not replace earlier failures or constitute independent
experimental validations.

## Finest axial comparison and limits

At fixed 320 radial cells, 48-to-96 axial-row discrepancies at 1 microsecond
are:

| Observable | Difference |
| --- | ---: |
| Density increment | 3.020112% |
| Radial velocity | 0.999464% |
| Axial velocity | 1.406756% |
| Temperature increment | 0.630975% |
| Angular speed | 0.303059% |

These values match the report and pass the existing 5% pair limit. Density
uses its finer response increment; both velocity components use the finer
combined meridional-velocity norm. Neither norm nor threshold was replaced.

Only the radial three-level layout and two-level axial pairs have been scored
in this packet. Axial/joint contraction and independent timestep refinement
remain untested. The canonical result correctly lists **all nine full jobs**
as missing and keeps every full/experimental/live qualification flag false.

No blocking metrics, provenance or report discrepancy was found in this
bounded result. The demonstrated resource feasibility and small pair changes
are not continuum-error bounds, finest-grid temporal qualification or a
validation of the prescribed hot-gas transport model.
