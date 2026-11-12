# Meridional flow after the prescribed-current comparison

12 November 2026. Independent literature/code investigation. No project code,
PDF parser, downloader or VM command was executed by this reviewer. The parent
owns the shared safe-dev stage. No current, velocity or contact parameter was fit.

## Evidence and decision

The [1979 primary article](https://doi.org/10.1515/zna-1979-0602), checked through
its [complete publisher-supplied OCR rehost](https://www.researchgate.net/publication/276453995_A_Study_of_a_Weakly_Ionized_Rotating_Plasma),
§3 p.675 gives a Hall radial force in its pressure equation. At p.677 it explains
that axial variation of the radial pressure requirement drives secondary flow,
outward near the midplane. Its central-plane measurements do not specify that
circulation's speed or its axial thermal/current structure. The controlled
reservoir pressure behind the hollow cathodes is not a spatial pressure map.

The [1980 follow-up](https://doi.org/10.1515/zna-1980-0815), checked through its
[complete primary-article OCR rehost](https://www.researchgate.net/publication/253120741_Limitations_on_Mass_Separation_by_the_Weakly_Ionized_Plasma_Centrifuge),
§2.2 describes a second discharge mode with stronger secondary-flow effects
and low midplane neutral rotation. Its energy discussion allows circulation to
cool hot gas at cooled walls, while disturbing separation. These observations
support investigating circulation; they do not establish that adding it must
raise the V84 underpredicted velocity.

The wider primary literature likewise makes circulation direction conditional
on axial swirl gradients: [Pothérat et al. (2013)](https://arxiv.org/abs/1304.5751)
find direct and inverse pumping in electrically driven vortices. This is a
mechanism check, not a quantitative transfer from electrolyte vortices to this
weakly ionized apparatus.

**Decision:** implement the Hall-inclusive pressure-compatibility assessment
for the frozen V84 states. Do not label its force residual as a circulation
velocity, or assert that the remaining optical mismatch is caused by circulation.

## Exact sign and conditional diagnostic

Source Eq.3c must be read together with its **signed** Hall conductivity in
Eq.6-7, not with the positive-magnitude API coefficient:

`p_r = rho r Omega^2 - sigma_H B Eprime_r`,
`Eprime_r = -phi_r + r Omega B`.

On the original printed p.675, Eq.7 explicitly defines
`sigma_H_source = -sigma beta_e / [(1+s)^2 + beta_e^2]`.
The code's `transport82.hallSM` is the **positive magnitude**
`h = -sigma_H_source`, while `pedersenSM=sigma_P` is positive. Therefore
`J_r = sigma_P Eprime_r`, `J_theta = -sigma_H_source Eprime_r = h Eprime_r`,
and the correct positive-API mapping is

`f_r = B J_theta = +B (h / sigma_P) J_r`.

The corresponding drive torque density is `-r B J_r`, consistent with V84.
No azimuthal-coordinate reversal is required. This agrees independently with
electron Drude response: an outward electric field at positive axial B produces
positive Hall current for the usual cylindrical basis. The earlier OCR-only
recommendation of `-B(h/sigma_P)J_r` was incorrect because it treated the
source's signed coefficient as a positive magnitude. It is retracted before
new predictions. The parent rendered original p.675 inside safe-dev; this
reviewer visually inspected `source-review/page-675.png` and confirmed both
Eq.3c and the explicit negative signs in Eq.6 and Eq.7. Preserve this correction
in provenance rather than silently changing the original equation's meaning.

The actual code trace supplies the needed conditional coefficients:
`boundary-v84/campaign84 -> electrical-v82/model82.properties ->
transport82.profile`. The last returns `hallSM`, `pedersenSM`, neutral density
and implied electron density, using the source electron/ion Hall parameters and
finite neutral mass fraction. Thus the source-derived cases identify a Hall
ratio independently of the experimentally inferred effective beta=3/9 cases.
The latter alone would not determine a microscopic Hall conductivity.

For the single-ionization Ar assumption already used there, take
`rho(r) = m_Ar [n_neutral(r) + n_e(r)]`, retaining its provenance as an
interpolated midplane profile extended axially. Define force per volume

`F_r(r,z) = rho(r) r Omega(r,z)^2 + B h(r) Eprime_r(r,z)`.

With strictly azimuthal velocity, uniform axial imposed B and no other axial
body force, the required equilibrium is `p_r=F_r`, `p_z=0`. A necessary
compatibility condition is therefore `partial_z F_r=0`. A derivative-free
pressure-loop residual is

`Delta_p_loop = integral_[ra,rb] [F_r(r,za)-F_r(r,zb)] dr`.

For the implemented fixed-domain diagnostic, `za=z_top=0.12 m` and
`zb=z_bottom=0.02 m`: the reported orientation is top minus bottom, matching
`diagnostics85.pressure_loop`. Reversing that loop would reverse its sign,
without changing whether pressure compatibility fails.

Report the force-density curl in N/m^4 and loop residual in Pa, with centrifugal
and Hall terms separately. Evaluate fixed off-contact physical regions; ideal
ring contact singularities cannot certify global derivative maxima. Test zero
field/rotation, z-independent force, exact cancellation, sign reversal and
physical units; retain joint refinement failures. Conservative face-current
reconstruction is preferable to differentiating a noisy potential twice.

This is stronger than V81's centrifugal-only acceleration curl but remains
conditional. At variable density, curling acceleration is not the same test:
`curl[(grad p)/rho] = grad(1/rho) cross grad p` can be nonzero. An acceleration
curl can be canceled by baroclinicity. Do not declare real circulation solely
from it, nor infer density or temperature corrections from measured velocities.

## What a circulation prediction would require

For `ell=r^2 Omega`, the angular momentum equation includes

`rho (u_r partial_r ell + u_z partial_z ell)`
`= (1/r) partial_r(mu r^3 partial_r Omega)`
`  + partial_z(mu r^2 partial_z Omega) - r B J_r`.

Closed-wall meridional advection redistributes angular momentum; it does not
create net torque. At fixed current and uniform B, the exact volume torque
remains determined by the boundary current's second radial moment. A circulation
model must therefore change wall stress and spatial distribution consistently,
not multiply the total drive to match the midplane.

A defensible coupled solver needs mass continuity; radial/axial momentum and
pressure; species/energy closure; Hall/Pedersen current response including
`Eprime_theta=-u_r B`; and independently specified injection/exhaust and wall
thermal conditions. Merely solving an incompressible Stokes response to the
frozen force would be a conditional linear-response diagnostic, not a measured
flow prediction. Its nonlinear/advection and density errors need an explicit
smallness check before it can alter the optical comparison.

No-slip torsional wall shear is already resolved in V84. Do not add an arbitrary
Ekman loss coefficient on top of it: first derive the missing circulation's
angular-momentum and energy partition. Likewise, ideal-ring contact Joule power
is cutoff dependent, so it cannot drive a calibrated thermal/circulation closure
without independently specified finite contact physics.

## Existing tools and reviewable next split

[Wilson and Schryer (1978)](https://doi.org/10.1017/S0022112078000750) provide
canonical stationary-disk/rotating-fluid solutions. The
[Bödewadt-Hartmann analysis](https://arxiv.org/abs/2006.05339) adds a uniform
normal magnetic field and demonstrates the competing rotational/magnetic wall
scales. These are appropriate verification targets for a future meridional
backend, not fitted plasma data or universal drag corrections.

[OpenFOAM's documented wedge boundary](https://doc.openfoam.com/2306/tools/processing/boundary-conditions/rtm/constraint/wedge/)
supports axisymmetric geometries; pressure/velocity coupling and cylindrical
swirl should use that established machinery where practicable. The anisotropic
weakly ionized electrical/thermal closure still requires a verified adaptation.
The documentation was checked; no installation or run is claimed.

The reviewable order is: signed Hall-inclusive compatibility diagnostic now;
independently supported axial-property sensitivities kept separate from a
prediction; then an established-code meridional verification problem; finally a
matched apparatus solve once mass/thermal/electrical boundary inputs are known.
No literature evidence recovered here licenses choosing a circulation amplitude,
axial cooling length or transport gain from the optical residuals.
