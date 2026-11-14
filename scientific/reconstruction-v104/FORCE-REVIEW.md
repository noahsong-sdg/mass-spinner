# Independent force review

2026-11-13. Actual evidence supports **rejecting candidate adoption**.
Reviewed `pressure104.py` SHA256
`1c520bf4bf4c32afe69f5a8587477017018c54b396b01e17c74d38a5484d8b3c`,
parent `Flow`, campaign/evaluator paths and frozen protocol. Static review
found a coherent numerical experiment, not a guaranteed coupled improvement.

With initially zero meridional velocity,
continuity requires zero instantaneous density derivative even when a real
pressure imbalance subsequently accelerates the gas. Pressure-trace disagreement
can introduce artificial initial mass flux. Radial-only refinement and the
unlimited pressure probe justified testing this cause; they do not establish
the cause of every evolved coupled failure.

I independently checked neighboring equilibrium averages/indices, cylindrical
moments and the zero-volume-mean quadratic fit. Clipping and curvature caps
match [Mignone (2014), equations 45–48](https://arxiv.org/html/1404.0537v1#S3.SS3)
for the departure, not a monotonicity theorem for the full pressure/Euler
system. Smooth departure extrema flatten; boundary accuracy remains unchanged.

For width `h`, midpoint `m`, volume centroid `c` and variance `v`, let
`δp=b*(r-c)+C*((r-c)^2-v)`. Direct integration gives
`integral(δp dr)=-b*h^3/(12*m)+C*h^5/(72*m^2)`.
The implementation multiplies this by `2*pi*dz` and uses the same final
limited coefficients in the pressure traces. No energy/angular source is added.
Whole-cell positivity follows from the exponential's inner-edge lower bound
and the quadratic departure's edge/vertex minimum. Scaling preserves its mean.
Wall departures remain zero; two radial cells require no interior fit.

Checked retained `evidence-20261113`: all 82 snapshot hashes, 14 regression/study
log hashes, seven support-source seals, six analysis-source seals, and packed
and raw hashes for five study, four causal-probe and four optical packets match.
Current executable/test/protocol files match. Five current documents differ:
the first understanding guide and four historical V100/V101 notes/reviews;
their retained tested copies are preserved. The supplemental analysis was
added later and explicitly binds its own source. I ran no scientific code.

Actual logs show 13 new plus 102 historical methods pass with candidate
injection before historical imports; two analytical controls fail the old
method. The five-case producer exits 0; evaluator correctly exits 1. Manifest,
scenario, clocks, mesh/case inputs and shared producer-source hashes equal
V103. All 56 refinement-gate definitions and all gate kinds/limits are unchanged.
Of 119,650 checks, only these six fail the original 5% spatial limit:

| Time | Density-increment difference | Radial-flow difference |
|---|---:|---:|
| 1 µs | 19.1423% | 7.8549% |
| 2 µs | 21.4406% | 9.3401% |
| 4 µs | 23.3888% | 9.7718% |

Contraction, timestep and inventory/work checks pass. Supplemental arrays retain
both bump signs, n=1/2/4/8 coarse nonmonotonicity, smooth-extremum error and
byte-identical initial states. Fine initial density-rate RMS improves only
0.05356→0.04838 kg/m³/s; coarse RMS worsens 0.19360→0.19845. Regional restriction
errors overlap and cannot prove kink dominance. No particular next method is
qualified by these results. Optical matches remain 0/288; peak local temperature
617,403 K leaves thermal closure unresolved. Shared Flow stays V103; live equations are unchanged.
The candidate is mixed order, unfitted and numerically unqualified; no
experimental, lithium-separation, browser/GPU or deployment approval is implied.
