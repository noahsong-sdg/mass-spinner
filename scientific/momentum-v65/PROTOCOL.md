# v65 spatial momentum qualification

Freeze before campaign execution. Scope: fixed, prescribed density/viscosity,
axisymmetric neutral azimuthal momentum. No live coupled-backend replacement.

Implement integrated cell angular momentum and reciprocal shear torques with
exact half-cell cylindrical resistance. Include signed moving-wall work,
physical gas shear heat, separate backward-Euler numerical loss, and complete
angular-impulse accounting. The full-cylinder drive cutoff preserves core gas;
an annular solid inner wall is a distinct boundary/volume specification.

Use genuine NIST FiPy4.0.3 CylindricalGrid1D/TransientTerm/DiffusionTerm with
SciPy LU as an independently assembled reference. Its standard harmonic-face
viscosity discretization differs from the integrated-resistance kernel; exact
same-grid equality is not expected. Compare refinement, not code branding.

Gates fixed prospectively:

- Every accepted-step angular/energy balance and independent discrete-equation
  reconstruction within1e-9 relative natural impulse/energy scale.
- Constant-mu Couette velocity recovers Ar+B/r; full-cylinder regular core plus
  annular1/r body-force profile recovers its exact shear solution. Finest
  spatial max-error / exact maximum <=0.005 for each code independently.
- Finest matched FiPy/kernel max difference / physical peak <=0.005; retain
  all coarser differences and any failures. Discontinuous mu must be included.
- Transient Bessel mode and separate timestep refinements: finest max error
  / initial mode amplitude <=0.005; retain all errors and timestep differences.
- Rigid Ω chord projection is exact. Piecewise-constant Ω line-of-sight centroid
  agrees with independent QUADPACK integration; refined driven profile centroid
  differs from its analytic centroid by<=0.005 of the analytic profile peak.
- Independently check source units/range for dilute monatomic neutral Li fits.
  Fits do not supply a plasma/mixture uncertainty model.

Experimental challenge: same frozen8 Fig10A circle markers,3 inner calibration
and5 outer holdouts asv64. Choose uniform-mu radial-current/shear candidate
before scoring; fit one amplitude only. Preserve the20% heldout RMS/observed
peak target and all failures. Constant emissivity/centroid diagnostics and
1D radial current are explicit assumptions, not known electrode current maps.
The steady viscous pressure ratio at fixed mu/current/B is1; preserve its
comparison to the reported2/3 instead of fitting pressure-dependent losses.

Stages after this kernel: species-carried local angular momentum, reciprocal
ion-neutral torque, local shear heat and energy-work coupling; only then live
plots/3D from accepted local Ω. Updating density without angular advection is
not an acceptable shortcut. A 2D current/endwall model may still be necessary.

Prospective extension after the first17-case pass, before executing added cases:
also require the same0.005 finest cross-code gate on stretched Couette grids
(edge map x^1.7) and odd-cell viscosity-jump grids whose material step is not
face-aligned. Keep the existing17-case results and thresholds unchanged.
The odd-cell case samples viscosity as a cell field; it tests the discretization
with a shifted numerical interface, not an exact subcell-material reconstruction.

Before this extended run, add a conforming material-jump Couette family on
nonuniform grids: annulus1–2m, interface1.37m, μ=1/5Pa s, Ωwalls100/0rad/s.
Require both codes' finest analytical errors and all-time cross-code difference
<=0.005. For both variable-density transient families, normalize cross-code
differences by the frozen initial-state peak, independent of either computed
trajectory. This replaces the first run's trajectory-derived normalization
with a stricter independent scale; do not hide the original result.
