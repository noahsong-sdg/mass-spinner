# Prospective rotation-profile challenge

11 November 2026. Freeze before numerical execution or extraction of Fig. 9
markers. This is an electrically conditioned, single-fluid azimuthal-shear
prediction, not a full plasma discharge simulation or live qualification.

## Source and prior exposure

Wijnakker, Granneman & Kistemaker, Z. Naturforsch. A 34 (1979) 672–690,
DOI 10.1515/zna-1979-0602, diffuse argon case, Fig. 9 neutral velocities.
Publisher: https://www.degruyterbrill.com/document/doi/10.1515/zna-1979-0602/pdf?licenseType=open-access
Readable publisher-provided text: https://www.researchgate.net/publication/276453995_A_Study_of_a_Weakly_Ionized_Rotating_Plasma

The source, theory and reported maxima have already been inspected. Individual
Fig. 9 coordinates have not been extracted. This is a prospectively withheld
profile, not an experiment wholly unseen during model selection. The 1980
profile used in v64–v70 is development evidence and is excluded here.

## Fixed inputs and conditional assumptions

Use the same-condition apparatus: radius .06 m, cathodes .48 m apart,
anodes .14 m apart, .02 m ring width, hollow-cathode inner radius .004 m;
B=.13 T, 100 A per opposed circuit, argon fill 1 Torr behind cathodes.
Model the symmetric half, z=0 to .24 m, with one .06–.08 m anode patch.
The conducting end disk r<.004 m approximates the source's hollow cathode;
its current footprint is an assumption, not a measured cathode sheath.

Freeze μ=1.14e-4 Pa s, the source's neutral-Ar estimate at mean 2900 K.
Evaluate BOTH effective anisotropy cases β=3 and β=9 from §4.5; never choose
the closest after scoring. Set σP=σparallel/(1+β²). Calibrate only the positive
scalar σparallel to 100 A at the independently inferred bulk drop 18.5 V,
including motional feedback in every trial. Repeat at 16.5 and 20.5 V on the
finest grid. The conductivity bracket is 1–1e5 S/m; no root means unavailable.
Electrical conditioning is not independent prediction of conductivity.

Regular axis; symmetric midplane; stationary no-slip cylinder/end wall;
other electrical faces insulate TOTAL current. Solve charge continuity and
azimuthal viscous balance with Jr=σP(−φr+B r Ω), Jz=−σparallel φz,
and torque density −r B Jr. No radial/axial mass flow, pressure balance,
ion-neutral slip, energy/ionization equation or resolved temperature map.

Report local midplane velocity separately from an optically thin, uniform-local-
emissivity chord centroid. The source's Fabry–Perot estimator and actual local
emissivity remain unknown. Nearly uniform CHORD brightness does not establish
uniform local emission. Neither operator may be chosen after scoring.

## Prospective gates

- Refine fixed geometry by factors 1, 2, 4; radial cells 32/64/128 and axial
  cells 48/96/192, with every electrode edge conforming. Compare predicted
  chord velocity, electrical normalization and power; finest relative changes
  must be <5%. No timestep gate applies to this steady linear solve.
- Require normalized charge, angular torque and electrical/Joule/shear power
  residuals <1e-8. Verify zero B, B reversal, voltage reversal and linearity;
  enforce zero total insulating current by construction.
- Independently assemble a velocity-coordinate continuum discretization and
  compare refinement. Passing self-consistency alone does not validate the PDE.
- Predict on a frozen .005–.055 m chord grid before target admission. The
  prediction entry point takes only the manifest, never measured velocities.
  Mutation of held-out velocities must leave predictions byte-identical.
- Admit measured SYMBOLS only, with source graphic/hash and axis ticks checked
  independently; no theory curves or coordinates invented from prose peaks.
  Freeze masks based on instrument/extraction resolution, never residuals.
- Retain the existing prospective ≤20% error per resolved measured signal,
  correct peak/outer trend and extraction contribution <5% of signal. Show
  RMS/peak additionally, never as a substitute. Source ± ranges have unknown
  confidence semantics; do not manufacture Gaussian errors or coverage.

No qualification if source markers, optical mapping, independent property
bounds or numerical gates are unavailable. Missing data is NOT a zero error.
Preserve every failure; changing the model after looking at these targets
turns this case into development data and requires a new confirmation set.

## Source-recovery addendum, before target extraction

The authors' two-page conference paper, DOI 10.1051/jphyscol:19797236,
Fig. 2, reports the same diffuse neutral-Ar profile/condition and the same
μ/β input argument. Its complete PDF is parsed by the web tool at
https://www.researchgate.net/profile/Ernst-Granneman/publication/45703766_A_STUDY_OF_A_WEAKLY_IONIZED_ROTATING_PLASMA/links/00b7d530b34d0b4c69000000/A-STUDY-OF-A-WEAKLY-IONIZED-ROTATING-PLASMA.pdf
This is an eligible source alias, not an independent second experiment. Prefer
the full journal Fig. 9 if its graphic becomes recoverable. Do not score both
as independent measurements. The conference bulk drop is rounded to 18±2 V;
retain the frozen journal value 18.5±2 V rather than selecting a better match.
Neither source's profile markers have yet been extracted. Source text alone
cannot substitute for admitting an actual graphic and its extraction bounds.
