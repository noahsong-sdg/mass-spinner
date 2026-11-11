# Spatial thermal model: source and domain audit

Independent source review, 2026-11-09. This document distinguishes published material data from the proposed reduced model. No project code or scientific solver was executed by this reviewer; the parent owns isolated execution and result inspection.

## Execution path and missing physics

Reviewed `src/fuel-operation.ts` and `src/fuel-transport.ts`. The current optional closure evolves one neutral-gas temperature and one liner temperature. Liner energy is `wallCapacityJK * linerK`; conductances and material capacity are constants. The implicit thermal root feeds mean gas temperature back into centrifugal transport. Snapshots already preserve thermal energy and accepted temperatures.

This is internally a two-reservoir closure: it cannot produce a through-wall temperature gradient, finite heat penetration, or material heat capacity/conductivity changes. The proposed smallest coherent extension is a resolved cylindrical solid liner coupled to the existing well-mixed gas. A spatial gas temperature equation would additionally require justified local heat deposition, pressure/momentum closure, species thermal transport and rarefied boundary accommodation. A liner temperature map must not be presented as a solved spatial gas/plasma temperature map.

## Chosen property data

### Tungsten heat capacity and enthalpy

[NIST Chemistry WebBook, tungsten, condensed-phase data](https://webbook.nist.gov/cgi/cbook.cgi?ID=C7440337&Mask=1EFF&Units=SI) lists molar mass 183.84 g/mol and the following first solid Shomate branch for 298–1900 K, attributed to Chase (1998), last reviewed June 1966:

\[
C_p(T)=A+Bt+Ct^2+Dt^3+E/t^2,\qquad t=T/1000
\]

in J mol⁻¹ K⁻¹, with `A=23.95930`, `B=2.639680`, `C=1.257750`, `D=-0.254642`, `E=-0.048407`. Divide by `0.18384 kg/mol` for J kg⁻¹ K⁻¹. Integrating gives the specific sensible enthalpy difference:

\[
h(T)-h(T_0)=\frac{1000}{0.18384}\left[A(t-t_0)+\frac B2(t^2-t_0^2)+\frac C3(t^3-t_0^3)+\frac D4(t^4-t_0^4)-E(1/t-1/t_0)\right].
\]

The arbitrary reference cancels in energy changes. Using `Cp(T)*T` would introduce a spurious `T dCp/dT` contribution. The first implementation deliberately restricts the material states to **300–1900 K**, avoiding branch switching and melting. This restriction is narrower than the source range.

### Tungsten conductivity

[Tolias and EUROfusion MST1, §III.3](https://arxiv.org/html/1703.06302), recommends the modified Hust–Lankford fit:

\[
k(T)=149.441-0.045466T+13.193\times10^{-6}T^2-1.484\times10^{-9}T^3+3.866\times10^6/T^2
\]

in W m⁻¹ K⁻¹ for solid tungsten, 300–3695 K. Only the common 300–1900 K interval is used here. The same review supplies reference density 19250 kg/m³ at 293.15 K and discusses irradiation/alloying effects. Undamaged pure tungsten is therefore an assumed liner material, not established Marathon construction.

This is not the latest possible heat-capacity fit: Tolias recommends White–Minges rather than the older NIST fit, especially at high temperature. The narrower domain and exact NIST enthalpy make a tractable first upgrade; changing to White–Minges is a reviewable later material-model change. Neither fit is a calibration to this machine.

## Existing codes examined

| Code | Verified capability | Decision for this change |
|---|---|---|
| [FiPy, NIST](https://www.nist.gov/programs-projects/fipy) | Python finite-volume PDE solver with transient, diffusion, convection and source terms. [CylindricalGrid1D](https://pages.nist.gov/fipy/en/latest/generated/fipy.meshes.factoryMeshes.html#fipy.meshes.factoryMeshes.CylindricalGrid1D) supports an annular origin and radial geometry. | Use as an independently executed conduction oracle and convergence reference; a FiPy 4.0.3 wheelhouse already exists in the project. The browser retains a small conservative kernel for interactive response. This is external-code validation, not a claim that FiPy runs in the browser. |
| [MOOSE tungsten material](https://mooseframework.inl.gov/moose/source/materials/TungstenThermalPropertiesMaterial.html) | Existing NASA/Milner-2024 temperature-dependent conductivity, specific heat and density implementation. [Source](https://raw.githubusercontent.com/idaholab/moose/master/modules/solid_properties/src/materials/TungstenThermalPropertiesMaterial.C) enforces its individual property bounds and identifies LGPL 2.1. | Credible future solid/thermomechanical backend and alternate property model. Not needed to build a large native stack for a 1D browser liner. Do not claim this code is integrated, nor copy implementation without preserving its licensing obligations. |
| [OpenFOAM chtMultiRegionFoam](https://doc.openfoam.com/2312/tools/processing/solvers/rtm/heat-transfer/chtMultiRegionFoam/) | Transient conjugate heat transfer between compressible fluid and solid regions; requires fluid pressure, velocity and temperature fields. | Better suited after local flow/pressure/cooling geometry and boundary conditions are specified. Running it now would not supply missing discharge or rarefied-interface physics automatically. |

[FiPy licensing](https://github.com/usnistgov/fipy/blob/master/LICENSE.rst) permits reuse with its notice and warranty disclaimer. The NIST WebBook labels its compilation as copyrighted; the implementation should attribute the numerical correlation rather than redistribute the whole compilation. Material formulas are transcribed from cited scientific data; no MOOSE source is incorporated in this choice.

## Discretization recommendations and checks

These are this reviewer's physical/numerical recommendations, rather than assertions that a publication specifies this machine.

For fixed shell geometry and reference masses, evolve `m_i [h(T_i,new)-h(T_i,old)]`. Interior interface heat fluxes must appear with equal and opposite signs in adjacent cells. Use the cylindrical volumes `π L (r_outer²-r_inner²)` and radial conductance geometry; a flat slab is only an approximation for thin walls.

For piecewise constant cell conductivities, the radial intercell conductance can use series half-cell resistances:

\[
G_{ij}=\frac{2\pi L}{\ln(r_f/r_i)/k_i+\ln(r_j/r_f)/k_j}.
\]

Gas-side and coolant conductances should be identified as total W/K, versus surface heat-transfer coefficients in W m⁻² K⁻¹. Include the boundary half-cell conduction resistance when relating an interface temperature to a cell-center temperature. Wall-friction deposition naturally belongs at the inner boundary; other deposition distributions remain assumptions.

Keep mass fixed when geometry is fixed. Replacing density by `rho(T)` in a fixed cell without accounting for strain/volume and advection would create or destroy material. Thermal expansion, stress and moving geometry are outside this first upgrade. Sensible enthalpy with `Cp` is the usual solid heat-equation approximation; neglected elastic work and `Cp-Cv` corrections should not be called a full thermomechanical energy solution.

Required independent gates:

1. Zero source and equal temperatures stay stationary; closed passive conduction conserves enthalpy and obeys temperature bounds.
2. Gas-to-liner transfer cancels exactly in the combined budget, including coupled rotor work/heat terms. Numerical mechanical dissipation remains a separate ledger, never deposited as heat.
3. An isolated nonuniform liner converges to the uniform temperature obtained from total enthalpy; entropy cannot decrease in passive exchange.
4. A constant-property cylindrical shell reproduces the logarithmic steady solution. For variable `k(T)`, the Kirchhoff transform `Ψ(T)=∫k(T)dT` gives `Q=2πL[Ψ(T_inner)-Ψ(T_outer)]/ln(r_outer/r_inner)`.
5. Independently refine radial mesh and time step; compare with FiPy using the same units, geometry, material correlations, interface conventions and enthalpy equation. Agreement on one mesh alone is insufficient.
6. Current cuts/restart retain the complete thermal field; interpolation conserves enthalpy, not average temperature, for variable heat capacity. Legacy lumped records remain clearly lumped.
7. Property bounds apply to material states and nonlinear iterations. Do not extrapolate or silently clamp a failed step; report a clear out-of-domain/nonconvergence result. Preserve the last accepted state.

The remaining dominant realism uncertainties are the prescribed gas/interface conductance, deposited-power partition, neutral-gas mixing, coolant boundary, geometry/material assumptions and unmodeled axial hot spots. A richer material law does not remove these uncertainties.
