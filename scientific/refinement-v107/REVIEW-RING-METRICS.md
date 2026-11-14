# Saved-state ring diagnostic review

The diagnostic's provenance and signed flux bookkeeping check out. It describes
instantaneous saved-state transport; it does **not** resolve the existing
convergence failure, identify its physical cause, or qualify the simulation.

## Evidence and review scope

Reviewed `retained/ring-evidence-20261114/` using trusted standalone file,
hash, gzip and JSON/arithmetic readers only. No project modules, scripts, tests,
PDE or VM were executed by this reviewer; producer raw archives were not loaded.
I proposed the three-term split and reviewed its controls before execution, and
authored the earlier stable norm. Root authored and executed this diagnostic.
This is not an independent PDE implementation or independent flux rerun.

All **13** exported payload hashes match the inventory (4,755,446 bytes).
All three decompressed diagnostic hashes match the summary receipts. Key seals:

| Artifact | SHA256 |
| --- | --- |
| Source transfer | `3f762336161778047b808a6a5b828a44a097df989ec2f7435b7022c05b85e455` |
| Diagnostic source | `1cc47c7cfbb26b7a98cd2cdb04d2c69f2bdca1a7ffa04a38e8fb3eb787a8691c` |
| Test source | `a21405e59d31d4957eccdb4fd57ae927e5873df49a25ee8cc10e55f98b0e8724` |
| Isolated controller | `d6cc401617968de5d74e772202fcb87fe7453b205a6bcf7c82645100540cb59f` |

The controller pins frozen producer transfer `31d24d75…997cef` and verifies
its source inventory before and after both executed stages. Import-origin
checks bind `force105` and `flow` to that producer. The diagnostic constructs
`SourceFlow` on each archived geometry with `noSlipWalls=True` and the same
argon masses. Explicit PYTHONPATH makes standalone test discovery independent
of prior imports. Diagnostic sources are also checked after each stage.

The analysis binds the already-reviewed canonical audit SHA256
`f63ed0efb04ad2a632ffddc4b2074755d5424b5d2d5490ad6f00ea9a3661cbd5`,
its matching admission summary, and exact r4z2/r8z2/r16z2 prediction pins.
The reader checks producer-source, packed-field and raw-field seals; prediction
and compressed field seals are checked again after each case. This relies on
the existing admission, rather than performing a new convergence audit.

## Actual controls and closure

Receipts/logs record **6 tests passing**, exit 0, followed by diagnostic
analysis exit 0. The controls now directly verify the centered-reference rates,
both signs and radial/axial cancellation, discontinuous constant-pressure
contacts in both directions, acoustic transport at rest, closed boundaries,
unchanged input state, changing-mass velocity derivatives, signed projection,
and corrupt/stale input rejection. Source derivatives are correctly described
as Eulerian cell-velocity rates, not material acceleration.

All three outputs contain clocks **0/1/2/4 μs**, on identical **37 × 49**
physical sample grids spanning r=12–24 mm and z=220–238 mm. Every sample
array has that shape. I independently recomputed the six-term signed sum at
every exported point for all twelve case/clock combinations; all resulting
maximum projection defects exactly match their receipts. The largest is
`8.526512829121202e-14 kg m^-3 s^-1`. Native closure receipts have maximum
`2.842170943040401e-14 kg m^-3 s^-1`. All boundary mass fluxes are zero;
largest absolute directional integrated mass-rate residual is
`2.159934015498466e-20 kg s^-1`. These are diagnostic residuals, not new gates.

## Limits

Centered and reconstructed-mean fluxes are declared references, not exact
physical fluxes. Their differences are not uniquely numerical diffusion.
Scalar Q1 point sampling is not the original convergence norm; no component
squared norms are added to claim an allocation of total error. Saved-state
rates do not recover accepted SSPRK2-stage history or accumulated causality.
The canonical 4 μs density-increment failure remains **5.5956883027349226% >
5%**; no producer states, constitutive models, thresholds or original failed
decisions were changed. No experimental, live or full-matrix approval follows.
All short-lived readers have exited; no persistent artifact allocation remains.
