# Prescribed spatial transport and meridional consistency

12 November 2026. Freeze before prediction runs. V79/V80 measured velocities are
already known: this is development-data diagnosis, not new held-out validation.
Never fit velocity, choose a temperature profile from residuals, change masks or
relax the existing 20% criterion. Preserve V79/V80 input and prediction bytes.

## Supported implementation

Use Sotiriadou et al. (2025), DOI 10.1007/s10765-025-03603-8, Eq. 2/Table 3,
for dilute neutral-Ar viscosity, valid 84–10000 K. Its pure-gas property uncertainty
does not describe uncertainty in this nonequilibrium plasma's temperature map.
Use positive cellwise transport with cylindrical series half-cell electrical and
viscous resistances, retaining power-adjoint motional EMF and torque.

Retain V79 geometry, disk-cathode approximation, uniform effective beta=3 AND 9,
and electrical-only conductivity conditioning to 100 A per branch. Nominal bulk
voltage18.5 V; retain16.5/20.5 V sensitivities at the finest grid for every profile.
No measured electron-temperature/density map supports a unique spatial
conductivity/Hall closure: retain these uniform in the physical campaign, but
verify the variable-field operator with manufactured positive 2D fields.

Thermal/viscosity variants, all retained:

- Legacy constant viscosity1.14e-4 Pa s (V79 reproduction).
- NIST dilute-Ar viscosity at uniform2900 K.
- Nominal core5950 K / near-wall1800 K, and all four corners of
  core[4650,7250] K × near-wall[1400,2200] K.
- For each endpoint pair, BOTH linear-in-radius and axis-regular quadratic-in-
  radius interpolation to r=.05 m, then constant to R=.06 m. These shapes and
  extension through z are assumptions, not measured local neutral temperatures.
  The core value is from apparent ion-line width; no fitting is permitted.

Refine32×48,64×96,128×192 geometry-conforming meshes. Retain original5% final
velocity/current-normalization/power refinement gate, conservation residuals<1e-8,
an independently assembled velocity-coordinate reference at identicalsigma,
and signed B/voltage, property-scale and layered-series analytical controls.
If new local/axial diagnostics need refinement, report them separately without
using integral convergence to qualify unresolved derivatives or endwall layers.

## Meridional scope

Compute centrifugal acceleration r*Omega(r,z)^2 and its axial variation from
the predicted field. This is a conditional no-secondary-flow compatibility
assessment, not a secondary-velocity prediction. Pressure/density gradients,
baroclinicity and unknown Hall radial forces can also enter meridional balance.
Do not prescribe an unmeasured circulation, neutral density map, drag coefficient,
Hall conductivity or electrode width to improve agreement.

Source theory's delta-ring Neumann cathode differs from V79's conducting disk.
Its zero-width electrode potential can have a spreading singularity; without a
finite current footprint and a matching voltage-averaging definition, do not
electrically condition that alternative using an invented width or power/I proxy.
Document this remaining apparatus uncertainty rather than silently changing it.

## Optical comparison

Use the unchanged independently digitized V80 brightness and both edge closures.
Retain exact annular Doppler centroids and all frozen temperature/instrument/mode
sensitivities. Optical meshes64/128/256 and spectral bins10/5/2.5 m/s retain V80
numerical gates. Generate predictions without loading velocity targets; only a
separate scorer admits the unchanged V79 points/masks. All variants and failures
must remain visible. Freeze predicted packet before scoring, and test target
mutation independence. Experimental qualification remains false unless measured
conditions, unknown optical mapping and numerical gates are resolved.
