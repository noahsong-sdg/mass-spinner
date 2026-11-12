# Axial transport: source constraints

12 November 2026. Independent literature/code inspection only. No project,
scientific, PDF-parsing or download code executed; no shared VM operation.

**No independently measured axial transport map was recovered.** A fitted
axial taper would not be a source-supported resolution of the velocity mismatch.

## Direct primary evidence

[Wijnakker, Granneman and Kistemaker (1979)](https://www.researchgate.net/publication/276453995_A_Study_of_a_Weakly_Ionized_Rotating_Plasma),
DOI [10.1515/zna-1979-0602](https://doi.org/10.1515/zna-1979-0602):

- Section 2 diagnostics are in the symmetry plane; no axial temperature,
  electron-density, ionization or conductivity scan was recovered.
- Section 4.5, printed p.682, expressly says only midplane information is
  available and whether it represents the rest of the vessel is unknown.
- The same section uses neutral-argon viscosity 1.14e-4 Pa s at an adopted
  average 2900 K. It discusses radial, not measured axial, transport variation.
- Section 3, p.677, acknowledges that centrifugal radial pressure in the
  rotating middle and vanishing radial pressure gradient at stopped endwalls
  imply axial pressure gradients and secondary flow. Outward midplane flow is
  its qualitative inference, not a measured circulation field.
- Section 4.5 speculates that stronger anode-plane rotation drives midplane
  neutrals through viscosity; it does not supply an axial velocity measurement.

[Wijnakker and Granneman (1980)](https://www.researchgate.net/publication/253120741_Limitations_on_Mass_Separation_by_the_Weakly_Ionized_Plasma_Centrifuge),
DOI [10.1515/zna-1980-0815](https://doi.org/10.1515/zna-1980-0815):

- Section 2.1, p.884, again locates all measurements in the symmetry plane.
- Section 4 treats small central axial gradients and absent secondary flows as
  theoretical approximations. This does not measure axial transport uniformity.
- Section 4.2, pp.890-891, notes that circulation could carry hot core gas along
  cooled walls and alter separation. It supplies no measured flow rate or
  axial thermodynamic map for the earlier experiment.
- The 400 K wall temperature used in its illustrative thermal calculation is
  an assumption, not a complete measured thermal boundary for the 1979 device.

Both full primary-article OCR rehosts were reopened at these sections. No new
visual equation/figure inspection was performed by this reviewer. The retained
1979 PDF exists in `scientific/optical-v80/sources/journal.pdf`; parent-side
visual confirmation is separate evidence. The 1980 apparatus has different
cathodes, so its construction parameters must not silently replace the 1979
ones.

## Execution-path finding

Read-only trace: `boundary-v84/campaign84 -> electrical-v82/model82.properties
-> transport82.profile -> flow-v81/transport.source_collision_profile`.
`model82.properties` deliberately returns radial fields plus `0*z`. V84 solves
axial electrical current and axial viscous momentum transport, but extends the
inferred midplane material profiles along the whole device. Therefore the
missing physics is not simply an absent axial derivative: it is unidentified
axial constitutive fields and omitted meridional advection/thermal closure.

## Justified next implementation

The following are deductions and proposed diagnostics, not newly recovered
experimental inputs:

1. Add source/torque/work maps and axial flux partitions to the frozen-current
   result. Determine how much midplane rotation depends on axial viscous
   transport versus local Lorentz torque before choosing a mechanism to change.
2. Quantify radial centrifugal support versus axial shear, with a compatible
   pressure/meridional momentum residual. A nonzero residual establishes that
   pure torsion is not a full mechanical equilibrium; it does not determine the
   missing flow or prove the sign of its effect on measured speeds.
3. If adding prescribed axial transport variations, freeze every family and
   amplitude before scoring, preserve the symmetry-plane fields, report every
   result, and call them conditional sensitivity. Neither a wall cooling taper
   nor an axial ionization taper is an identified experiment from these sources.
4. A predictive meridional extension must solve mass, radial/axial momentum,
   angular momentum and energy consistently. Meridional advection can
   redistribute angular momentum; it is not a free extra torque. Measured or
   independently justified wall/contact thermal and mass-flow conditions are
   still required for an experimental prediction.

Symmetry enforces zero axial first derivatives for even fields at the midplane.
It does not enforce zero axial curvature, constant temperature, uniform
ionization or absent circulation elsewhere. A closure that uses zero curvature
just because the first derivative vanishes would introduce a new unsupported
assumption.

## Search coverage and limits

Exact-title, author/axial-temperature and meridional searches found the two
articles and dissertation metadata, but no inspectable same-apparatus axial
dataset. The [AMOLF institutional listing](https://ir.amolf.nl/year/2025?prev=50)
confirms the 1980 dissertation, *Centrifugal effects in a weakly ionized rotating
gas*. Direct AMOLF record and ADS routes were inaccessible in this pass; no
full dissertation was recovered. This is an access limitation, not proof that
the data do not exist. No author was contacted.

Do not transfer axial-gradient observations from another centrifuge into this
apparatus merely because a review discusses them near its description.
