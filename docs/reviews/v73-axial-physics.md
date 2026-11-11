# v73 independent axial-momentum physics review

10 November 2026. Recommended scope: a research-only **torsional diffusion**
operator on prescribed, time-independent positive density and viscosity.
No live replacement or experimental qualification follows. This review traced
`fuel-spatial-operation.ts` and the v65 qualification document; no project code
was executed by this reviewer.

## Execution-path finding

The current coupling repeats radial angular speed into the electrical r-z grid,
then sums each axial row's torque and Joule power back into radial cells.
Consequently it cannot transfer angular momentum by axial viscous stress or
represent endwall shear. The proposed independent operator addresses that
specific missing degree of freedom; it does not yet repair the coupled species,
energy, current or optical models.

## Governing equation and conservative discretization

For axisymmetric Newtonian azimuthal motion `vθ=rΩ`, with `ur=uz=0`,

```
τrθ = μ r ∂rΩ;       τzθ = μ r ∂zΩ
ρ r² ∂tΩ = (1/r)∂r(μ r³ ∂rΩ) + ∂z(μ r² ∂zΩ) + r fθ
```

Multiplication by the cylindrical measure `2πr dr dz` gives radial **and axial**
torque flux proportional to `2π μ r³`. Face area without the extra lever arm
and the factor relating `vθ` to `Ω` gives an incorrect axial torque.

For cell `(i,j)` between radial edges `r−,r+` and axial edges `z−,z+`, define

```
Wi = π/2 (r+⁴-r−⁴)
Iij = ρij Wi Δzj
Qij = ∫cell r fθ dV
Iij (Ωnew-Ωold)/Δt = Qij + Σfaces Gface(Ωneighbor-Ωnew)
```

An imposed wall uses its angular speed as the neighboring value. Integrate
source torque with its own volume/lever-arm measure; do not infer it from the
inertia-weighted field. Preserve signs from the existing current convention.

- Radial conductance is the reciprocal of the two half-cell resistances
  `∫dr/(2π Δz μ r³)`. For piecewise constant cell viscosity, add the two exact
  integrals in series; do not arithmetic-average viscosity across a jump.
- Axial conductance is
  `Gz = Wi / (δzj/μij + δzk/μik)`, with center-to-face half-distances.
  A wall has only the adjacent gas half-resistance.
- Internal face torques must be exactly reciprocal. At the axis impose regular
  finite Ω and zero radial torque, without evaluating a singular resistance to
  an imaginary wall. A torque-free gas core remains emitting, massive fluid.
- Null/stress-free axial boundaries mean zero torque. A stationary no-slip
  endwall instead has `Ωwall=0`; these are physically different conditions.

These choices provide positive face conductances and a symmetric dissipative
matrix, with positive diagonal inertia in the backward-Euler system.

## Mechanical ledger

For fixed inertia, use `L=ΣIΩ` and `K=ΣIΩ²/2`. With all quantities evaluated at
the accepted endpoint, the discrete identity is

```
ΔK = Δt ΣQ Ωnew + Δt Σwalls Twall Ωwall - Hshear - NBE
Hshear = Δt Σinternal G(ΔΩnew)² + Δt Σwalls G(Ωwall-Ωnew)²
NBE = ΣI(Ωnew-Ωold)²/2
```

Both dissipative terms are nonnegative but have different meanings. Viscous
heat enters the gas. BE numerical loss is reported separately, not silently
added to physical heating. A stationary endwall can remove angular momentum
while doing zero mechanical work. Check global impulse against drive plus wall
impulse and retain each wall's signed torque/work separately.

Prescribing density changes in time without mass flux and angular-momentum
transport invalidates this derivation. Keep this stage's inertia fixed, even
though it varies spatially. Likewise prescribed viscosity is not a predicted
temperature-dependent energy model.

## Meaningful independent controls

1. **Rigid rotation:** arbitrary positive spatial rho/mu, stress-free boundaries,
   zero forcing. Preserve constant Ω, total L and K with zero physical/numerical
   loss. Add signed rotation and unequal cell sizes.
2. **Radial reduction:** identical axial slices with zero axial stress reproduce
   the v65 radial operator and its integrated torque/heat, not merely its shape.
3. **Pure axial diffusion:** radial zero stress, constant properties;
   `Ω=A sin(πz/L) exp[-ν(π/L)²t]` with stationary axial walls, or a cosine mode
   with stress-free axial walls. The solution is radially constant. This isolates
   axial conductance, endwall torque and BE temporal error.
4. **Both directions:** regular full-cylinder mode
   `Ω=A J1(kr)/r sin(πz/L) exp[-ν(k²+(π/L)²)t]`, where `J1(kR)=0` and the axis
   limit is `Ak/2`. Stationary radial/axial walls give a genuinely two-dimensional
   analytic decay, sensitive to the radial `r³` measure.
5. **Axial material interface:** radial zero stress; steady imposed end speeds,
   piecewise constant `μ(z)`. Ω is linear in `∫dz/μ`, with continuous axial
   stress. Use varying rho and unequal/aligned/shifted axial grids. The exact
   total end torque includes `ΣWi`; a normalized shape alone can hide a missing
   geometric factor.
6. **Variable-property manufactured solution:** smooth positive rho/mu varying
   in both coordinates, regular nonseparable Ω, and independently differentiated
   volume-integrated source. This tests coefficient gradients and source
   integration. Manufactured forcing is a numerical check, not an electrode
   model or experimental result.

Use at least three radial/axial refinements and an independently refined time
sequence. Hold a known initial amplitude as the error denominator. Separate
spatial error from BE error, then run a joint refinement. Retain every coarse
failure. Ledger errors should meet the existing `1e-9` natural-scale criterion;
freeze analytic and cross-code accuracy gates before running (v65's 0.5%
cross-code criterion is a defensible inherited target). Include early times,
not only a converged steady endpoint. Incompatible initial/endwall data create
a thin transient boundary layer and require their own joint resolution study.

An independent [NIST FiPy cylindrical 2D mesh](https://pages.nist.gov/fipy/en/4.0.2/generated/fipy.meshes.factoryMeshes.html)
is suitable for a continuum cross-check. In its `r dr dz` measure the transient
coefficient is `ρr²` and diffusion coefficient is `μr²`. Exact cell capacity
uses `ρ(r−²+r+²)/2`; an axial face averaged under `r dr` likewise needs the
corresponding radial mean of `r²`. Merely setting a scalar Cartesian diffusion
coefficient or using radial-center `r²` without a refinement check can hide a
geometry mismatch. FiPy assembly should remain independent of the tested matrix.

## Physical scope boundary

An arbitrary z-dependent swirl with zero meridional flow is generally **not a
complete hydrodynamic equilibrium**. Without additional meridional forces,
radial momentum requires `∂rp=ρrΩ²`, while axial momentum requires `∂zp=0`.
If the centrifugal term varies with z, these constraints conflict and secondary
flow is expected. This follows directly from the omitted momentum equations.

Therefore describe the result as constrained azimuthal transport and an isolated
endwall-stress sensitivity. Do not claim a full finite-length reactor solution,
radial pressure prediction, separation correction or a uniquely identified cure
for the historical profile mismatch. Coupling a changing mixture or predicting
secondary flow needs a separate conservative extension and qualification stage.
