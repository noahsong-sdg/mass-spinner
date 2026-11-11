# v70: temperature-conditioned field scaling

Freeze before execution. This corrects an experimental *hypothesis*, not the
live Li rotor. The old v64 hypothesis uses fixed drag rates and inventory
proportional to filling pressure / apparent central temperature, giving V∝BT.
Wijnakker & Granneman1980 §4.1 instead derives the steady viscous scaling
Vmax∝IB/μ. At fixed current and geometry compare the existing Mutation++ neutral
Ar μ(T) against both the old hypothesis and the constant-viscosity limit.

Input: unchanged corrected v64 reproduction markers. Use only the four fields
with both velocity and temperature markers: .13,.17,.21,.255T. Calibrate the
amplitude at .17T, hold out the other three. Do not select a different field,
alter markers, or tune a viscosity exponent after looking at results. Report
every held-out relative speed error and their maximum, not just RMS/peak.
The nominal target is ≤20% for every held-out speed, with increasing field trend.

Use apparent central line-integrated temperature as a **conditional scalar
proxy**, never a measured radial/mean gas temperature. Score common proxy
multipliers1 and1/.7 separately. The second is motivated by the original
paper's approximate30% central underestimate; it is a sensitivity experiment,
not a known correction or uncertainty bound. Do not extrapolate the Ar table
outside300–20000K. No heating prediction or emissivity fit is made.

Propagate every corner of the four matched markers' B, speed, temperature
extraction rectangles (2^12=4096 per scenario/candidate), preserving the one
calibration field. Separately show independent ±15% speed/temperature coordinate
corners (2^8=256), whose covariance is unknown. Neither set is a confidence
interval or a proof of continuous extrema. Unavailable property-domain corners
must prevent an all-corners pass, rather than being silently removed. A common
velocity calibration factor cancels in relative predictions; independent
reproducibility perturbations are a deliberately different sensitivity question.

Before final scoring, add a source-identified sensitivity: Mutation++ annotates
Ar–Ar Q22 accuracy="5". Enumerate independent ±5% collision-integral coordinates
(16 corners) for the neutral-viscosity candidate. Common multiplicative Q22
error cancels in ratios; independent errors need not. Unknown covariance and
confidence semantics prohibit treating this annotation as a Gaussian uncertainty.
The property domain applies only to candidates that use the property table.

Independent Python reconstruction must verify exact input/protocol hashes,
nominal predictions, μ, split and all sensitivity counts/extrema without importing
the TS implementation. Required negative controls reject stale hashes, leaked
holdouts, wrong viscosity and false complete/live-validation flags.

A passing conditioned field screen does not qualify first-order device accuracy.
Retain the v65 radial-profile and pressure failures, missing current topology,
radial temperature, diagnostic fit semantics, heating, separation and extraction.
Original1980 §3.1 reports approximately invariant velocity profile shape across
the sweep; this supports testing a common observation factor in ratios, not
assuming it is measured or exact. No production defaults or public build change.

Primary source: https://www.degruyterbrill.com/document/doi/10.1515/zna-1980-0815/pdf
Reproduction: https://arxiv.org/pdf/2607.28208v2, Fig11.
Neutral transport source: Mutation++v1.0.5 collisions.xml Ar–Ar Q22,
Wright2005 table, already implemented and qualified in v66.
