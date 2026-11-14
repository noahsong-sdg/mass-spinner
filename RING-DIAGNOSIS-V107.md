# Why the remaining density comparison fails

The saved-state probe supports **underresolution of an evolving compression
feature**, without identifying a faulty operator. The original 4 µs density
increment discrepancy remains **5.595688% > 5%**. No equations, coefficients,
states, meshes, initialization or convergence limits changed. This is research
diagnosis; the deployed playground is unchanged.

The problem was an attribution gap: global conservation and the comparison norm
showed a discrepancy but could not distinguish redistribution from boundary
leakage or identify its instantaneous transport. In simple terms, the total
amount of gas can stay correct while gas piles up in the wrong place.

The smallest justified addition evaluates the original reconstructed HLLC face
flux on sealed saved states. Reusing that path avoids introducing a second
flux implementation or changing the problem merely to obtain a passing gate.
Source tracing confirms only Euler face fluxes directly change cell mass;
electrical work and viscosity/heat affect later transport through momentum
and pressure. The corrected cylindrical body source changes radial momentum.

## Measured evidence

All cases have 48 axial cells and CFL0.1, with original clocks 0/1/2/4 µs.
At the common physical point r=17 mm, z=228 mm, t=4 µs:

| Radial cells | Density increment, kg/m³ | Radial density rate, kg/m³/s | Axial density rate, kg/m³/s |
|---|---:|---:|---:|
| 80 | 5.503842e-5 | 16.260687 | -0.391946 |
| 160 | 7.152297e-5 | 47.208289 | -0.406726 |
| 320 | 7.785528e-5 | 77.195358 | -0.326794 |

At z=228 mm, the sampled positive-increment peak rises
5.891488 → 7.495441 → 8.200571 × 10⁻⁵ kg/m³, while its half-height width
falls **3.993316 → 3.218902 → 2.868559 mm**. Widths use linear half-height
crossings on the fixed 0.25 mm diagnostic point grid; these are not continuum
widths or new acceptance metrics. Reconstructed relative pressure trace jumps
at the common point decrease in magnitude **8.712% → 2.510% → 0.536%**.
The late ring is sharpening, not approaching an initial roundoff floor.

![Common-point profiles at four microseconds](https://github.com/noahsong-sdg/mass-spinner/releases/download/v107-ring-diagnosis/ring-profiles.png)

Every boundary mass flux is exactly zero. Global directional cancellation
residuals are at most 2.16e-20 kg/s. The largest native and projected flux-sum
defects are 2.85e-14 and 8.53e-14 kg/m³/s. These check bookkeeping, not accuracy.

## What the split can establish

For each face, define a distance-weighted cell rho*u reference C and a mean
reconstructed rho*u reference R. The production flux H is recorded as
`H = C + (R−C) + (H−R)`, with actual face areas before divergence. Neither
reference is an exact physical flux. In particular, pressure imbalance drives
acoustic transport even with zero initial velocity, as in the
[Euler Riemann problem](https://www.clawpack.org/riemann_book/html/Euler.html).
Our pressure-jump control explicitly verifies this distinction.

At the fine common point, the radial terms are **77.172453 + 2.726259 −
2.703355 = 77.195358 kg/m³/s**. The latter terms largely cancel; significant
mesh dependence remains in the evolved cell reference itself. Calling the
entire H−R term artificial diffusion would give a false diagnosis. The signed
components and projection closure are retained; no squared-error allocation
is claimed without cross terms.

The fixed diagnostic point grid uses scalar Q1 centroid interpolation and
constant boundary padding. Gradient estimates differentiate cell-average
values at their centroids. Velocity-rate fields are Eulerian derivatives of
cell momentum/mass, not material acceleration. These conventions do not
replace the original cylindrical exact-panel convergence norm.

## Checks, reproducibility and next step

Inside offline 1 GiB safe-dev, six controls passed: analytic signed linear
flow/cancellation, stationary density contacts, pressure-driven acoustic
transport, signed projection, changing-mass velocity derivatives, and sealed
input corruption/stale-clock rejection. Exact command:
`/work/home/v90-venv/bin/python -m unittest discover -s /work/project/v107-ring01 -p test_ring_flux107.py -v`.
Three case diagnoses took 0.10/0.17/0.35 s; maximum recorded RSS was
223,536 KiB. All **13 payload hashes** and three decompressed seals were
independently checked. [Physics](scientific/refinement-v107/REVIEW-RING-PHYSICS.md)
and [metric/provenance](scientific/refinement-v107/REVIEW-RING-METRICS.md)
reviews disclose their authorship and independent scope; neither reran the PDE.

Typecheck, build, site and asset checks passed on unchanged 330-input snapshot
`47201c00b9770bd6daf5c11b3fafa39b68adcd046bb2d48c519de064aff5fc3e`.
All six app-check payloads and eight figure payloads were verified after export.
The generated figure was visually inspected. No live-browser check or deploy
was performed. Source/driver pins, commands, logs and raw diagnostic outputs
are in the [prerelease](https://github.com/noahsong-sdg/mass-spinner/releases/tag/v107-ring-diagnosis).
Replay also needs the sealed producer and canonical audit from the
[full radial study](https://github.com/noahsong-sdg/mass-spinner/releases/tag/v107-radial-study),
using the recorded isolated dependency environment and original guest paths.

No solver modification is justified yet. A cheap next probe is the frozen-state
electromagnetic and stress/heat response at a shared small timestep and its
half, including upstream/core regions. Those counterfactual responses cannot
recover accumulated history. A separately declared finer-grid control would
test spatial contraction; 640 radial cells might cost roughly eight hours
under naive quadratic scaling, requiring a resource preflight before any run.
Unique causal attribution would need accepted-stage history or a separate
common-initial-state control. Local late radial dominance does not rule out
earlier axial or thermal forcing. Full numerical and experimental qualification
remain incomplete; all original failures stay retained.
