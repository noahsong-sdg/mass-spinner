# v75 flow-author failure triage

Source and artifact inspection only. This reviewer authored `flow.py` and the
Euler analytical controls, so this is not independent validation of those
implementations. Read `convergence-01.json`, current flow/coupling/analysis
source, the prospective manifest/protocol and equation review. No project code
was executed by this reviewer; the parent owns all safe-dev execution.
Frozen scientific sources and numerical artifacts were not edited.

## Verified artifact findings

The convergence report is unqualified, with no producer failures or missing
requested trajectories. Timestep refinement, the halved-reference timestep,
and separate/combined tighter solver tolerances pass. In the 48-cell smaller-dt
comparison, the worst RMS profile difference is 0.01566% and worst observable
difference is 0.006747%. Passing those controls does not qualify spatial error.

The 48-to-96 spatial reference fails. At 10 microseconds:

- Upper/lower endwall torque differs by 22.953%/22.090%.
- Density-change RMS differs by 2.134%, with 16.116% local error.
- Composition-change RMS differs by 2.005%, with 5.653% local error.
- Gas temperature has 8.459% response-normalized local error, increasing to
  13.775% at 20 microseconds.

The absolute early density-change error is small compared with the background:
maximum 6.9851e-7 kg/m³ against approximately 0.001 kg/m³. It is nevertheless
16.116% of the actual reference density response, 4.3342e-6 kg/m³. The change
gates correctly prevent a small background-relative error from concealing a
poorly resolved evolution. Likewise the composition-change maximum error is
8.7871e-6 against a reference change of 1.5545e-4.

The spatial signature separates two main errors. The 24r-by-48z comparison
has endwall-torque differences below 0.255% over all scheduled outputs, while
48r-by-24z differs by up to 55.552%. Conversely radial refinement fails gas
local-temperature gates whereas axial-only refinement passes those profile
gates. Bulk 48-to-96 current, Joule heating and shear heating differ by only
approximately 0.0701%, 0.0897% and 0.0181% at 10 microseconds.

## Root-cause assessment: inference, not a new runtime result

This pattern, the independent local-row audits reported by the parent, and
the stable timestep/tolerance repeats point to spatial truncation and boundary
resolution as the leading causes. They do not prove that every implementation
choice is correct.

For sourced argon near 350 K, `nu` is approximately 0.025 m²/s. Thus the
viscous length `sqrt(nu*t)` is approximately 0.5–1.0 mm at 10–40 microseconds.
Uniform axial cells are 2.917 mm at 48 cells and 1.458 mm at 96 cells. Even
the finer reference has fewer than one cell per early endwall layer. The
initial quadratic-in-distance rotation at a stationary endwall also has zero
continuum wall gradient, whereas its one-cell wall difference has an order-h
gradient. Tightening the endpoint solve cannot repair that missing resolution.

First-order Rusanov mass/total-energy diffusion has an indicative smooth-field
numerical diffusivity `c*h/2`: about 0.22 to 0.11 m²/s for radial 48-to-96
refinement at c≈350 m/s. This is not an exact error estimate, but it is not
small compared with the approximately 0.03–0.04 m²/s physical self-diffusion
scale here. Species use the consistent mass flux rather than an independent
Rusanov species-diffusion term; artificial barycentric mass motion can still
alter their transport. Radial thermal/pressure layers require separate
inspection before assigning the local-temperature error to a single operator.

## Nonnested comparison artifact

Joint 36-to-48 angular-speed RMS errors are 0.223148%, 0.223294%, 0.223893%
at the three times. Composition RMS errors are 0.318447%, 0.318115%, 0.317344%.
Their near constancy, and the smaller nested 24-to-48 errors, suggest static
restriction aliasing rather than growing coupling instability.

For a linear axial field and a 4:3 coarse/fine width ratio, restricting a
piecewise-constant fine reconstruction yields a periodic centroid offset
`+h_f/12, 0, -h_f/12`. A nested 2:1 restriction has no such linear-field
offset. This can add an order-h fine-reference error to the nonnested
comparison. Confirm with the same analyzer applied to saved initial states;
no integration is required. This diagnostic has not been run by this author.
The existing failed monotonicity gate must remain failed. A later prospective
study can use fully nested levels or a separately verified higher-order
conservative reference reconstruction.

Point-sampled initial primitive profiles introduce order-h² cell-average errors.
Change-specific comparisons subtract each trajectory's own initial field, so
the direct offset cancels; its influence on later spatial derivatives remains.
Exact conserved-variable initialization would improve the study but cannot
remove leading first-order hydrodynamic diffusion or unresolved wall gradients.

## Next evidence needed

Retain this failed study. First apply and test the separate composite gas-domain
admission repair, then seal fresh sources. Diagnose initial-state restriction,
the isolated quadratic endwall diffusion problem, and radial temperature-error
locations. A new spatial study should resolve wall layers and reduce leading
hydrodynamic truncation error, using the unchanged response and observable
gates. Passing the current ledgers is not experimental, live-playground or
first-order device-accuracy qualification.
