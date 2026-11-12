# Meridional flow: justified scope

12 November 2026. Source research and equation audit; no velocity fitting or
scientific execution was performed by this reviewer.

## What is established

The [1979 paper](https://doi.org/10.1515/zna-1979-0602), §3, p.677, explicitly
identifies the inconsistency of a globally azimuthal flow: centrifugal pressure
varies along the cylinder while stationary endwalls remove rotation. It expects
secondary circulation, outward at the midplane, to limit pressure buildup.
This supports investigating circulation; it supplies neither its measured speed
nor a calibrated correction to the rotation profile. Most measurements are at
the midplane. Reservoir pressure is controlled behind the hollow cathodes, not
everywhere in the plasma volume. Full spatial temperature, mass flux and Hall
conductivity are not identified by the recovered data.

## Governing equations for a future coupled solve

Let \(u_r,u_z,u_\theta=r\Omega\) be mixture velocities, \(\ell=r^2\Omega\),
\(D=\partial_t+u_r\partial_r+u_z\partial_z\), and externally imposed
\(\mathbf B=B\hat z\). Neglecting self-generated magnetic fields, the
axisymmetric single-fluid equations are

\[
\partial_t\rho+\frac1r\partial_r(r\rho u_r)+\partial_z(\rho u_z)=0,
\]
\[
\rho(Du_r-r\Omega^2)=-p_r+\partial_r\tau_{rr}
+\frac{\tau_{rr}-\tau_{\theta\theta}}r+\partial_z\tau_{rz}+J_\theta B,
\]
\[
\rho Du_z=-p_z+\frac1r\partial_r(r\tau_{rz})+\partial_z\tau_{zz},
\]
\[
\rho D\ell=\frac1r\partial_r(\mu r^3\Omega_r)
+\partial_z(\mu r^2\Omega_z)-rBJ_r.
\]

Use the full Newtonian stress divergence with variable viscosity inside the
derivatives. Close density, pressure and temperature consistently; a prescribed
radial temperature with large density changes does not establish a globally
constant-density meridional-flow approximation. Species slip and separate
electron/heavy-particle energy equations require further closure if retained.

The rest-frame electric field is
\(\mathbf E'=-\nabla\phi+\mathbf u\times\mathbf B\), hence
\(E'_r=-\phi_r+r\Omega B\), \(E'_\theta=-u_rB\), \(E'_z=-\phi_z\).
Define signed Hall conductivity by
\(\mathbf J_\perp=\sigma_P\mathbf E'_\perp+
\sigma_H\hat z\times\mathbf E'_\perp\), with
\(J_z=\sigma_\parallel E'_z\) and \(\nabla\cdot\mathbf J=0\).
Then Hall current contributes radial force; radial fluid motion changes current
and torque. The existing effective \(\beta\) fixes the ratio
\(\sigma_P/\sigma_\parallel\), but does **not** identify \(\sigma_H\) when
ion slip contributes. A full meridional model cannot infer that force by treating
the effective parameter as an electron-only Hall parameter.

At solid stationary walls impose no penetration/no slip for the resolved fluid.
At the symmetric midplane use \(u_z=0\) and even parity of \(u_r,\Omega,p,T\);
at the axis use regularity, \(u_r=0\), \(u_\theta=O(r)\).
Hollow-cathode injection/exhaust conditions need independent mass/thermal inputs.
Resolve endwall viscous transport directly; adding an Ekman drag on top of it
would count the same loss twice. No-slip boundary layers and angular-momentum
advection must be refined jointly. Circulation has no guaranteed sign of effect
on a particular observed centroid.

## Implementable consistency diagnostic

For \(u_r=u_z=0\), meridional viscous stresses vanish in this Newtonian model.
The pressure requirements are \(p_r=\rho r\Omega^2+f_r\), \(p_z=f_z\).
Their exact integrability condition is

\[
\partial_z(\rho r\Omega^2+f_r)-\partial_r f_z=0.
\]

For constant density, or a barotropic acceleration formulation, pressure can
balance the remaining acceleration only if
\[
\partial_z(r\Omega^2+f_r/\rho)-\partial_r(f_z/\rho)=0.
\]
Compute **centrifugal-only** \(C_\theta=\partial_z(r\Omega^2)\), in s\(^{-2}\),
from predicted fields without looking at measured velocities. Nonzero values
quantify an additional pressure/force compatibility requirement under the
stated density assumptions, not the magnitude of actual circulation. Unknown
Hall forces and baroclinicity may alter the balance. A rectangular-loop integral
of the centrifugal acceleration offers a derivative-free companion check:
\(\int_{r_a}^{r_b}r[\Omega^2(r,z_a)-\Omega^2(r,z_b)]\,dr\).
For piecewise-constant annular \(\Omega\), integrate each cell using
\((r_+^2-r_-^2)/2\). Report spatial refinement, physical units and zero-flow
controls; do not turn the diagnostic into a fitted drag coefficient.

## Electrode-footprint distinction

Source Eq.(11)/Appendix A imposes a zero-width **Neumann ring** current at
\(r=R_1\) on the endwall and at \(z=\pm c_0\) on the cylinder, with zero
normal current elsewhere. This is the paper's mathematical idealization, not
a measured hollow-cathode current footprint. V79's finite conducting end disk
is a different explicit assumption. Conservative ring-current deposition can
be a labelled source-theory sensitivity, with current fixed independently.
It must not silently substitute a grid-cell width for a physical footprint.

Locally, a zero-width axisymmetric ring is a line source in a two-dimensional
cross-section: electrode potential and spreading resistance can have logarithmic
singularities as its numerical width vanishes. This is a mathematical inference,
not a measured property of the apparatus. Mesh-dependent contact power must not
be calibrated to the measured bulk voltage without a justified finite footprint
or voltage averaging operator. The reported 18.5±2 V excludes electrode sheath
falls; its identification with a singular electrode sample or power/current is
not supplied by the source.

An independent uniform-field identity bounds this effect on total drive torque:
\(\tau_z=-B\int rJ_r\,dV=-(B/2)\oint r^2\mathbf J\cdot\mathbf n\,dA\).
For outward cathode current \(+I\) and anode current \(-I\), thin rings give
\(\tau_z=(BI/2)(R_0^2-R_1^2)\). A disk replaces \(R_1^2\) by its
current-weighted mean squared radius. With the existing 4 mm/60 mm dimensions,
the relative total-torque difference is below approximately 0.45%; this geometry
assumption must not be called an explanation for a roughly 50% velocity deficit.
It can still alter current distribution, voltage conditioning and local flow.

## Existing tools and verification targets

- [OpenFOAM's axisymmetric wedge](https://doc.cfd.direct/openfoam/user-guide-v13/boundaries)
  provides an established finite-volume route for axisymmetric swirl and
  pressure/velocity coupling. The anisotropic electrical closure still needs
  implementation; choosing this code does not identify missing apparatus inputs.
- [DOLFINx's Taylor–Hood/PETSc Stokes example](https://docs.fenicsproject.org/dolfinx/main/python/demos/demo_stokes.html)
  provides a stable mixed pressure/velocity starting point for a custom coupled
  weak formulation. Its Cartesian example is not already an axisymmetric MHD
  solver; cylindrical stresses, radial measure, swirl and advection must be added
  and verified.
- Bödewadt flow is the relevant stationary-wall/rotating-fluid canonical limit.
  [Wilson & Schryer (1978)](https://doi.org/10.1017/S0022112078000750) give numerical
  similarity solutions/tables; these are solver verification, not this plasma's
  measured circulation. [Savaş (1987)](https://doi.org/10.1017/S0022112087002532)
  measures boundary-layer instability, cautioning against assuming an everywhere
  steady axisymmetric laminar solution without assessing the predicted regime.

**Recommendation:** implement variable-property azimuthal transport and the
compatibility diagnostic now. Keep a full circulation prediction unqualified
until density/energy, Hall force and gas boundary conditions are independently
specified; a new fitted circulation amplitude would not resolve the validation
problem.
