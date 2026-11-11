# v65 independent validation design

Prepared 10 November2026. This reviewer read the v64 report, corrected markers,
source reviews and the current coupled transport execution path. This is a
prospective protocol and an independent reference implementation, not a claim
of an executed study. Parent alone owns safe-dev execution and sync.

## What the public experiments can establish

The strongest immediately executable observational test is still the fixed
v64 neutral Doppler profile: three inner symbols calibrate one amplitude; five
outer symbols remain held out. This can falsify a shape assumption. Missing
current distribution, temperature profile, mean inventory and diagnostic details
prevent a complete current-to-performance prediction. An expert PDE package
does not remove those missing experimental inputs.

The original [Wijnakker & Granneman1980 experiment](https://doi.org/10.1515/zna-1980-0815)
reports lateral Fabry–Perot spectroscopy without Abel inversion. It describes
approximately uniform diffuse-mode spectral intensity. The later
[2026 preprint](https://arxiv.org/pdf/2607.28208) reproduces these measurements;
its theory curves and fitted reconstructions are not new experimental points.
The source's effective14cm discharge length is an approximation, not an exact
measured radial-current topology.

The source's center-temperature and maximum-velocity diagnostics are not
coincident local measurements. Neither filling pressure nor Tmax specifies
the actual mass-density field. Those proxies must not silently become new
spatial solver boundary/initial conditions.

## Correct Doppler observation operator

For optically thin emission with axisymmetric emissivity epsilon(r), chord
position x, line coordinate z and r=sqrt(x^2+z^2), the velocity centroid is

```
v_app(x) = integral epsilon(r) * [x/r] * v_theta(r) dz
           / integral epsilon(r) dz
         = x * integral epsilon(r)*Omega(r) dz / integral epsilon(r) dz.
```

An annular gas region excludes any nonemitting hole from both integrals.
Opaque inner hardware can require additional visibility clipping. At a tangent
x=R there is no finite emitting path; a mathematical limit is not a measured
centroid. For a rigid rotor v_app=Omega*x independent of emissivity. A non-rigid
local velocity must not be compared directly with an apparent chord velocity.

Uniform local emissivity is a conditional diagnostic assumption, not an
experimental determination. The [1979 source's Fig. 6](https://doi.org/10.1515/zna-1979-0602)
also reports intensity curves without Abel inversion. Its nearly flat lateral
brightness does not imply uniform local emissivity: the Abel projection is
`I(x)=2*integral_x^R epsilon(r)*r/sqrt(r^2-x^2) dr`, and uniform epsilon would
give `I(x)=2*epsilon*sqrt(R^2-x^2)`. Original fitted spectral
line centers may differ from literal first-moment centroids for strongly
asymmetric integrated profiles. Raw spectra, spectral fitting, aperture,
instrument response, opacity and extra chord-dependent flows remain unavailable.
If a new flow model fails under this operator, that mismatch cannot uniquely
identify viscosity or current topology as its cause. Do not fit emissivity
separately at every experimental radius to make it pass.

## Exact momentum and projection references

For stationary radial density, no radial/axial advection and Newtonian dynamic
viscosity mu, the azimuthal angular-speed equation is

```
rho*r^2*dOmega/dt = (1/r)*d[mu*r^3*dOmega/dr]/dr + r*f_theta.
```

This is not a scalar Laplacian acting on v_theta. On NIST FiPy's
`CylindricalGrid1D`, it maps to `TransientTerm(rho*r^2) ==
DiffusionTerm(mu*r^2) + r*f_theta`; on Cartesian `Grid1D`, multiply by r and
use coefficients rho*r^3, mu*r^3 and source r^2*f_theta. See the official
[cylindrical example](https://pages.nist.gov/fipy/en/stable/generated/examples.convection.exponential1D.cylindricalMesh1D.html)
and [transient coefficient definition](https://pages.nist.gov/fipy/en/latest/generated/fipy.terms.transientTerm.html).
The mesh metric must appear once, not twice or zero times.

For the full-cylinder gas domain, drive only a<=r<=R with
`f_theta=I*B/(2*pi*L*r)` and leave the inner core unforced. Impose regular
zero shear at the axis and a stationary no-slip outer wall. Constant mu gives

```
K = I*B/(4*pi*L*mu) = torque/[2*pi*L*mu*(R^2-a^2)]
Omega(r>=a) = K*[ln(R/r) + (a^2/2)*(1/R^2-1/r^2)]
Omega(r<a) = Omega(a).
```

Here I is positive inward radial current, since inward current crossed with
positive axial B produces positive azimuthal force. If `currentA` is instead
positive outward in the implementation, use I=-currentA. The independent
reference derives signed K from the actual summed cell torques to avoid
silently changing this convention.

Angular speed and shear are continuous at a. Total Lorentz torque is
`I*B*(R^2-a^2)/2`. The familiar r*ln(R/r) velocity with a=0 has divergent
angular speed and singular forcing at the axis; it is not a regular complete
replacement for this core geometry. A solid inner no-slip cylindrical electrode
defines a different annular gas domain and a different exact solution.

For uniform emissivity and x>=a the exact projected velocity is

```
l = sqrt(R^2-x^2)
v_app = K*{x*[1+a^2/(2*R^2)] - [(x^2+a^2/2)/l]*atan(l/x)}.
```

For x<a, split the chord into the constant-Omega core and the driven shell.
The independent reference uses SciPy's
[QUADPACK integration](https://docs.scipy.org/doc/scipy/reference/generated/scipy.integrate.quad.html)
to check this analytical projection. It also reconstructs the production
piecewise-constant Omega centroid by quadrature with cell-crossing breakpoints,
rather than copying the production closed-form cell path-weight formula.

## Numerical gates before experimental interpretation

1. Exact constant-mu steady profile versus production under the same regular
   core, drive annulus, wall and total torque. Refine64/128/256/512cells; preserve
   finite-time error separately from mesh error. Report elapsed time divided by
   rho*R^2/mu and refine time/length as needed.
2. Export the actual production diagnostic at the eight source chord positions.
   Independently reconstruct it with QUADPACK. Compare both discrete results
   against the exact projected continuum profile. Numerical agreement should
   be well below the prospective20% experimental signal screen, preferably1%
   of exact peak or better for this oracle.
3. Check the exact rigid projection identity, near-tangent behavior, regular
   core and torque normalization. An unchanged total torque with an incorrectly
   weighted radial source is not enough.
4. Integrate angular-momentum and kinetic-energy budgets independently. For
   stationary walls, internal viscous exchanges cancel in total angular
   momentum, while boundary stress accounts for its loss. Continuous viscous
   heat is `2*pi*L*integral mu*r^3*(Omega')^2 dr >= 0`.
5. A stationary no-slip wall has zero mechanical boundary power even when it
   absorbs angular momentum. Viscous heat is generated spatially in the fluid.
   The old global drag power must not be silently deposited as wall heat after
   changing the momentum model. Backward-Euler numerical dissipation stays
   separate from physical heat.

## Frozen experimental shape challenge

Use corrected `scientific/experimental-v64/data/markers-corrected.json` only;
the retained `markers.json` has a known superseded temperature-axis error.
Geometry in this shape challenge is a=.0075m, R=.06m, as in the reproduced
geometry approximation. Freeze the constant-mu radial-current candidate above
before scoring. This is not inferred to be the actual source current profile.

At each measured nominal chord x_i compute the unit-K projected basis g_i.
Fit only `K_fit=sum_train(g_i*v_i)/sum_train(g_i^2)` on the three nominal
positions <=3cm. Nominal membership remains fixed during extraction sensitivity:
the boundary symbol is2.993409cm with a coordinate range crossing3cm.
The reference enumerates all65,536 combinations of the eight extraction
rectangles' four corners, recalibrating only the same three nominal training
points each time. It reports a corner sensitivity range rather than a
statistical confidence interval or guaranteed extrema over the continuous
rectangles. Unknown reproduced-figure and physical-input errors are excluded.
All five outer symbols stay held out. Preserve the v64 metric
held-out RMS/observed peak, and additionally retain each relative residual and
the largest held-out relative error so peak normalization cannot hide a weak
outer signal. The source's reported15% reproducibility is not a Gaussian
standard deviation, and a common calibration rescale does not justify treating
every radial symbol as independent noise.

The constant-mu candidate is expected to have a different apparent peak
position from the measured outer-skewed profile; any retained failure is useful.
An improvement over rigid rotation alone is not a20% first-order qualification.
No new per-point viscosity, forcing or emissivity parameters may be fitted.

## Pressure and wider qualification remain open

Constant-mu prescribed-force steady flow is independent of density because
rho drops out of its steady equation. At fixed I,B,mu and geometry it predicts
the9Torr/3Torr speed ratio1, not the reported approximate2/3. That is still50%
relative end-ratio error, opposite in sign to the old inverse-pressure result.
Adding viscosity is physically better founded but does not by itself explain
this experimental pressure trend. A pressure-dependent current topology,
radial temperature/viscosity, axial transport or diagnostic shape may matter;
the data recovered so far cannot uniquely select one cause.

The strongest subsequent conditional experiment would use independently measured
radial temperature and current information, then test a fixed mu(T) model and
the same velocity holdouts. The1979 one-Torr table has temperature anchors, but
those cannot silently stand in for the distinct three-Torr case. New solver
accuracy, measured-temperature-conditioned flow agreement, solved thermal
accuracy and isotope separation accuracy must retain separate gates.

## Authored independent reference and execution status

`scientific/momentum-v65/diagnostic_reference.py` contains the analytical field,
projection, QUADPACK self-checks, per-case production reconstruction, fixed
experimental split and retained pressure failure. It imports no production
code. Parent executes it offline via safe-dev and preserves output/receipts.
No project code, tests, installs or VM operations have been executed by this
reviewer. No final experimental result or approval is claimed here before
the parent's actual artifacts are checked.

## Independent review of the executed first campaign

After the parent executed the safe-dev campaign, this reviewer read
`scientific/centrifuge-v44/momentum65/studies/first/diagnostic.json`,
`analysis.json`, `manifest.json` and the frozen fixture definitions, and viewed
the historical-profile and convergence plots. Host `shasum -a 256` checks of
the corrected marker artifact, diagnostic, analysis and cases matched the
reported hashes. No project code or VM execution was performed by this
reviewer; numerical results below are the inspected parent-run artifacts.

The analytical projection and independent QUADPACK integration agree to
6.94e-18m/s at unit drive; rigid projection identity error is2.78e-17. Exported
production cell-field projections agree with independent QUADPACK
reconstructions at all five driven resolutions. Continuum projected max error
over sampled analytical peak decreases from0.8251% at32cells to0.01489% at512.
The last result passes the frozen0.5% numerical projection gate. The kernel
angular-speed error falls from0.6495% to0.003165%, supporting actual spatial
convergence rather than a coincidental diagnostic cancellation. Each case is
evolved for2rho*R^2/mu, and the finite-time caveat remains recorded.

The broader analysis reports all16 numerical gates passing. Its finest
core-annulus FiPy/kernel all-shared-times difference is0.004470% of physical
peak. The discontinuous-property difference decreases with refinement to
0.3311%, below0.5% but much closer to the gate; it should remain a dedicated
regression fixture. The Bessel error and consecutive timestep differences
roughly halve with timestep, consistent with the backward-Euler temporal
method. These establish the stated fixed-density, fixed-viscosity kernel
scope; they do not qualify later density/species/thermal coupling.

The conditional historical profile **fails**. The one inner-region amplitude
fit gives K=56358.48/s. Five held-out residuals are all negative, ranging
from29.61% to62.61% of each measured speed. Held-out RMS is355.68m/s, or
39.98% of the observed889.63m/s peak, against the unchanged20% target. The
65,536 extraction-corner combinations range from38.30% to41.67%; no tested
corner passes. This improves upon the v64 rigid candidate's59.55% metric but
does not establish first-order experimental agreement. The apparent peak is
too far inward, visible in the saved profile plot. Extraction precision cannot
explain this large discrepancy within the tested corner sensitivity set.

The pressure challenge also **fails**: constant-mu, prescribed-drive steady
flow predicts a9Torr/3Torr ratio of1 rather than the reported approximate2/3,
retaining50% relative ratio error. Numerical projection error is orders of
magnitude smaller than either discrepancy. Inference: further numerical
refinement of this same constant-mu/current/emissivity candidate is unlikely
to repair the observational mismatch. Its missing physical or diagnostic
structure must be investigated instead. Unknown local emissivity, radial
current, temperature-dependent viscosity and axial/endwall transport remain
distinct possibilities; this dataset cannot uniquely distinguish them.

Recommendation: accept the standalone numerical kernel gates within their
declared scope, retain both experimental failures, and do not replace the
live coupled backend until local mass-carried angular momentum, reciprocal
ion-neutral torque and spatial viscous heating pass their own coupled gates.
Any new observational candidate must be frozen before scoring and preserve
the same holdouts; the present failures must remain visible.
