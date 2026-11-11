# v65 independent momentum-literature review

Checked 10 November 2026. Read-only source/literature review; no project code,
VM, tests or dependencies executed by this reviewer. Parent owns execution.

The most defensible immediate increment is a conservative radial angular-
momentum solver with neutral viscosity, explicit drive profile and defensible
wall conditions. This addresses a demonstrated structural limitation, but it
does not by itself qualify first-order device accuracy or uniquely explain the
historical pressure trend.

## What was traced

`fuel-transport.ts` evolves two global angular momenta, computes one neutral
Omega from its evolving radial second moment, and applies neutral loss
`dragHz*Lneutral`. `fuel-gas.ts` advances separate species probabilities with
common prescribed D and centrifugal potential from that single Omega. The
species face transfers are not constrained to zero total barycentric mass
flux. Neither path solves local azimuthal momentum or wall shear. Numerical
energy/angular ledgers close for that prescribed model, not for a resolved
multifluid discharge.

The v64 pressure challenge is deliberately conditional: filling pressure is
used as an inventory proxy, uniform temperature/rates are prescribed, and peak
Doppler velocity is normalized to the model rotor speed. Its disagreement does
not uniquely identify drag. Inventory, profile shape, diagnostics, temperature,
ionization and current paths are confounded.

## Primary literature checked

1. [Wijnakker, Granneman & Kistemaker (1979), DOI10.1515/zna-1979-0602](https://www.degruyterbrill.com/document/doi/10.1515/zna-1979-0602/pdf?licenseType=open-access),
   indexed primary PDF p675. The theory couples an anisotropic electric-potential
   equation, azimuthal viscous momentum including axial derivatives, and radial
   pressure balance. Its homogeneous coefficients are themselves a restricted
   approximation. The opposed electrode apparatus is not automatically a 1D
   coaxial radial-current annulus.
2. [Wijnakker & Granneman (1980), DOI10.1515/zna-1980-0815](https://www.degruyterbrill.com/document/doi/10.1515/zna-1980-0815/pdf),
   pp888–889 §4.1. Neutral viscosity dominates their weakly ionized discharge;
   they compare an `I B / mu` velocity scaling using measured temperatures.
   Their normalization at one Ar condition is calibration. Residual pressure/
   field dependence remains; this is not proof of an exact universal scaling.
3. [Hood-McFadden, Kotla & Underwood (2026v2), arXiv2607.28208](https://arxiv.org/pdf/2607.28208),
   §2, preprint. The annular, steady, continuum two-temperature model includes
   radial current, no-slip walls, neutral-dominated viscosity and separate heavy/
   electron energy. Co-rotation requires small charged-neutral drift. Its Saha
   closure is explicitly an approximate upper limit, not established LTE.
   Simulated isotope enrichment is not an experiment. These authors are not
   Marathon Fusion.
4. [Bouledroua (2006), Second Virial Coefficients and Viscosity Property of Monatomic Alkali-Metal Gases](https://www.jspf.or.jp/JPFRS/PDF/Vol7/jpfr2006_07-217.pdf),
   pp217–219, supplies a direct dilute monatomic Li viscosity fit and its units.
   This supports a neutral constitutive option, not a validated plasma mixture.
5. [Bogovalov et al. (2013), Computers & Fluids86,177–184, DOI10.1016/j.compfluid.2013.07.002](https://www.sciencedirect.com/science/article/abs/pii/S0045793013002739),
   accessible publisher introduction and abstract. Strong centrifugal gradients
   make interpolation and numerical viscosity unusually consequential; the
   authors give a centrifuge-specific semi-analytical verification problem.
   Choosing a familiar CFD package cannot replace equilibrium-preservation and
   centrifuge-specific checks.

Additional relevant papers were located but not fully inspected: Wong et al.
(2024), DOI10.1063/5.0168396, and Muir et al. (2025), DOI10.1063/5.0285228.
Publisher full text was inaccessible through the web tool. Do not attribute
unread closures or successful validation to them. Alpha Ring lists both, but
its publications page is a locator, not technical verification.

## Recommended equations and radial factors

The following conservative forms are this reviewer's derivation from the
Newtonian axisymmetric balance, not newly measured laws. Let `u_theta=r Omega`,
`f_theta` be azimuthal force per volume, `rho` mass density and `mu` dynamic
viscosity. With no axial variation:

```
tau_rtheta = mu (du_theta/dr - u_theta/r) = mu r dOmega/dr

d(rho r^2 Omega)/dt + (1/r) d(r rho u_r r^2 Omega)/dr
    = (1/r) d(mu r^3 dOmega/dr)/dr + r f_theta
```

For fixed density and zero radial velocity:
`rho r^2 dOmega/dt = (1/r) d(mu r^3 Omega')/dr + r f_theta`.
Applying a scalar cylindrical Laplacian directly to Omega is wrong: it loses
two powers of r in the shear flux.

For axial length `Lz`, evolve cell-integrated angular momentum using:

```
Lcell = integral_cell 2 pi Lz rho r^3 Omega dr
Tface = 2 pi Lz mu_face r_face^3 (dOmega/dr)_face
Sdrive,cell = integral_cell 2 pi Lz r^2 f_theta dr
```

Internal face torques must be equal and opposite. Use exact geometric cell
inertias for piecewise constant density, rather than volume times an arbitrary
point radius squared. For constant density these are
`Icell=(pi Lz rho/2)(r_out^4-r_in^4)`.

For truly radial annular current, charge continuity gives
`Jr=I/(2 pi Lz r)`. The drive torque magnitude in a cell is therefore
`I B (r_out^2-r_in^2)/2`. Outward Jr and positive Bz give **negative theta**;
define the positive rotation convention explicitly. A cutoff drive annulus
inside a full gas cylinder is a prescribed source approximation requiring
axial/return currents; it does not create a solid central electrode.

Full cylinder: finite Omega and zero torque at the axis, stationary outer wall
with no-slip where continuum assumptions permit. Solid annular apparatus:
both physical inner and outer wall velocities need boundary conditions.
Finite Knudsen number requires a sourced slip/accommodation boundary model;
no-slip is not justified everywhere merely because a code supports it.

## Conservation and energy coupling

- Local ion-neutral friction must be reciprocal. For cell torque coefficient
  `Gamma>=0`, ion torque is `-Gamma*(Omega_i-Omega_n)` and neutral torque is
  its opposite. Mechanical loss is `Gamma*(Omega_i-Omega_n)^2>=0`. A global
  collision frequency is still a prescribed closure until matched cross sections
  and thermodynamic populations justify it.
- A viscous face conductance `Kface>=0` exchanges torque proportional to the
  angular-speed difference. Total kinetic-energy loss is
  `Kface*(Omega_R-Omega_L)^2`; continuum heat density is
  `mu*(r Omega')^2`. A stationary wall removes angular momentum; a moving wall
  also does mechanical work. Do not confuse work, gas heating and coolant loss.
- Existing species transfers must carry angular momentum when local Omega is
  introduced. A face transfer contributes
  `r_face^2*Omega_adv*sum_s(m_s*DeltaN_s)`, equal/opposite between cells.
  Updating local inertia and leaving cell angular momentum otherwise untouched
  is not resolved angular-momentum advection. The radial momentum/overdamped
  limitation must remain explicit.
- Do not count `J dot E` and both Lorentz work and Joule heat independently.
  In a common fluid frame, `J dot E = u dot(J cross B) + J dot E_star`.
  The present circuit's prescribed conductivity does not become a two-temperature
  discharge closure by adding neutral viscosity.
- Non-rigid equilibrium separation uses the spatial integral
  `ln(alpha)=integral Delta_m*u_theta(r)^2/[kB*T(r)*r] dr`, with exact sampling
  definitions. Neither peak speed nor global mean Omega substitutes generally.

## Sourced Li viscosity

Bouledroua's fit is:

`mu_Li(T)=3.14e-8*T^0.863 Pa s`, for100–3000K, dilute monatomic neutral Li.

The printed coefficient is0.314 with eta in micropoise, equivalently units of
`1e-7 Pa s`. Do not confuse micropoise with micropascal-second. The companion
conductivity is `kappa=1.398e-4*T^0.863 W/(m K)`. Their kinetic relation is
`kappa=(15 kB/(4m_atom))*mu` (monatomic first Chapman–Enskog order).
The paper's comparison percentages against other calculations are not measured
uncertainty bars. Do not extrapolate to hot Ar experiments or unsupported gases.

## Minimal reviewable implementation and gates

Start with fixed-density, prescribed-temperature radial momentum as a scientific
solver, and an independently assembled FiPy/SciPy reference. A finite-volume
code must explicitly implement the angular-momentum geometry above; an existing
generic diffusion operator is not the physics. Couple evolving species/energy
only after transport and work ledgers are correct. Keep rigid reference behavior
available and avoid silently changing the meaning of existing presets.

Required numerical gates:

1. No drive/initial rest remains at rest. Constant Omega with matching rotating
   boundaries has zero viscous torque/heating. Closed stress-free boundaries
   conserve total angular momentum.
2. Annular Couette solution `u_theta=A r+B/r` has radius-independent viscous
   torque. Check exact sign, r cubed factor, boundaries and refinement.
3. Manufactured force `f_theta=F r` in a full stationary cylinder gives
   `Omega=F*(R^2-r^2)/(8mu)` at steady state. This is a numerical forcing test,
   not a physically charge-conserving radial discharge prescription.
4. For an annular1/r current source, test the logarithmic analytic steady
   solution with the appropriate actual domain. A full-cylinder source cutoff
   needs a separate piecewise analytic solution, not an annular inner no-slip
   condition.
5. Verify drive-minus-boundary impulse, positive viscous/friction dissipation,
   kinetic-plus-heat work closure, space/time refinement, changing density and
   species-carried angular momentum. Verify rigid rotating-gas pressure balance
   before extending to full compressible CFD.

Only then repeat held-out Doppler comparisons using an emissivity-weighted
line-of-sight operator. The historical outer-shifted peak can require axial
current paths/end effects even after radial viscosity is resolved. Re-fitting
one drag value per condition cannot establish that mechanism or provide a
genuinely held-out prediction.

## Actual v65 results and next defensible work

Follow-up review checked `src/fuel-momentum.ts`,
`scientific/momentum-v65/{analyze,diagnostic_reference}.py`, and the recorded
`scientific/centrifuge-v44/momentum65/studies/first/{analysis,diagnostic}.json`.
This reviewer inspected artifacts and source; did not execute the studies.
The diagnostic packet links production SHA256
`e82410b79facf632c968ca751d4abfa67fb4e49043332ab7decf40fffe5913fc`
and corrected marker SHA256
`0cfb21edd1debf57ce7d62351b11d4f628fac84f5e44cfc87f21d84f1554de33`.

**Verified numerical result.** All recorded numerical gates pass for the
standalone, prescribed-density/prescribed-viscosity kernel. Its exact inertia,
integrated radial shear resistance, reciprocal torques and separate backward-
Euler dissipation agree with the intended equation. Finest recorded variable-
coefficient cross-code difference is 0.3311%; finest analytical Doppler error
is 0.01489%. Independent reconstructed equation, angular-momentum and energy
residuals are near floating-point roundoff. These checks qualify this numerical
building block within its tested scope; they do not qualify the live coupled
species/thermal backend. `liveBackendChanged` and `experimentalValidation` are
both explicitly false in the analysis.

**Verified physical challenge failure.** With one amplitude fitted to three
inner markers, the constant-viscosity, full-cylinder cutoff-drive candidate
has held-out RMS 355.68 m/s, or 39.98% of the observed 889.63 m/s peak. All five
outer predictions are low, by 29.6–62.6% pointwise. The 65,536 frozen extraction
corner combinations span 38.30–41.67% RMS/peak; none passes the 20% screen.
This improves the conditional score over the rigid reference 59.55%, but the
spatial shape remains wrong. The corner study is not a confidence interval
and excludes reproduced-figure, diagnostic and geometry uncertainty.

The steady pressure challenge predicts a speed ratio 1 rather than the reported
approximately 2/3, a 50% relative ratio error. This is a structural consequence
of this prescribed model, not evidence of failed diffusion numerics: at steady
state density disappears from the momentum equation, and fixed current profile,
geometry, viscosity and wall conditions contain no pressure dependence.
Changing density alone can change spin-up time, not this steady solution.

### What the failure identifies, and what it cannot identify

The data reject this complete assumption set under its diagnostic operator.
They do **not** uniquely identify a missing drag coefficient or prove that an
axial term, current redistribution, temperature change, or optical bias is
dominant. These effects can change the same measured speed. A per-pressure
fitted drag or emissivity would add enough freedom to absorb the residual
without testing its cause.

The 1980 source, §§2–4, reports approximately preserved measured profile shape
and nearly radius-independent observed line intensity in its diffuse mode;
these constrain, rather than license, arbitrary optical adjustments. Observed
chord intensity is not a measured local emissivity field. Its central measured
temperature is not a complete `T(r,z)` map. The source argues axial derivatives
are small near its midplane; treating end effects as the established cause
would contradict the strength of the available evidence. They remain a
testable geometry-dependent hypothesis. The 2026 preprint §4.1.1 independently
acknowledges that its analogous outer-skewed profile discrepancy can involve
unresolved boundaries and current paths; that attribution is an interpretation,
not an experimental isolation of the mechanism.

### Prioritized reviewable roadmap

1. **Fix comparability before adding fit freedom.** Preserve the frozen
   inner/outer split and pressure holdout. Recover electrode/current geometry,
   actual diagnostic line and spectral estimator, optical aperture, and any
   raw line-intensity/temperature profiles. Forward-model the measured Doppler
   quantity, including sourced emissivity and broadening where supported.
   Until local emissivity is constrained, show a separate sensitivity envelope;
   do not reinterpret a constant-emissivity centroid as local bulk velocity.
   This is the cheapest way to distinguish model error from observation error.
2. **Resolve current closure and finite geometry as one coherent problem.**
   A prescribed radial source can be retained as a verification case, but an
   opposed-electrode device needs axisymmetric charge continuity
   `(1/r)*d(r*Jr)/dr + dJz/dz = 0`, a sourced magnetized conductivity closure,
   potential/electrode boundary conditions, and the actual `J cross B` torque.
   The conservative momentum equation adds axial advection and
   `d(mu*r^2*dOmega/dz)/dz` to the radial balance derived above. Start with
   prescribed measured/conditional conductivity and temperature fields to
   isolate geometry; validate net electrode current, torque and mechanical
   work, then refine in both r and z. This is preferable to selecting a new
   empirical radial forcing shape to fit the same five holdout markers.
3. **Predict the pressure response through thermodynamics/discharge inputs.**
   Source Ar viscosity for this Ar benchmark; the Li fit is inapplicable.
   First make a conditional comparison with available measured temperature
   constraints and `mu(T)`. Then add separate electron/heavy energy, sourced
   collision/ionization transport and electrical power closure if needed to
   predict conductivity and `mu(r,z,p)` rather than prescribe them. Do not use
   Saha as an established non-LTE population law. A pressure prediction must
   account for wall filling pressure, heating/expansion and actual inventory.
   Neither central-temperature invariance nor fixed total 100 A establishes
   invariance of the full temperature or current-density fields.
4. **Only then couple this kernel to evolving mixture transport.** Evolve
   cell angular momentum with species-carried angular-momentum flux, local
   inertia, reciprocal ion-neutral exchange, positive shear/friction heating
   and the electrical/mechanical energy identity. Feed local rotation into
   the centrifugal potential and spatial isotope-odds integral. Require
   conservative closed-boundary tests and joint space/time convergence before
   a live-backend replacement. This prevents a numerically correct neutral
   shear solver being embedded in an inconsistent species/energy update.
5. **Qualify operating boundaries and useful output.** Check continuum/slip,
   neutral-dominated viscosity, co-rotation, laminar flow and discharge mode
   for every claimed range. Throughflow, axial circulation, collection and
   finite-time mixture data are necessary before calling radial equilibrium
   enrichment a predicted extracted purity or separative throughput.

For each phase, use independent FiPy/SciPy or an appropriate plasma/CFD code as
an implementation reference, while keeping matched experimental acceptance
separate. Tool pedigree does not supply missing boundary conditions or make an
unidentifiable closure identifiable. The present result supports retaining the
new kernel as a qualified research component and presenting the historical
comparison as a failed, useful challenge; it does not support claiming a
validated replacement, Marathon-specific calibration, or first-order device
accuracy yet.
