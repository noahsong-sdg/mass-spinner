# Transport and units behind the absolute-current mismatch

12 November 2026. Independent source/equation review. No numerical execution was
performed by this reviewer. Parent must execute the new module/tests in safe-dev.

## Verified source facts and execution path

The checked path is V81 `campaign.predict_case -> fields -> solver.solve` for
the absolute-source branch. It sets conductivity normalization to1070 S/m and
passes the spatial `conductivity_shape` and `beta_field` callbacks. Scalar beta=0
is unused for those cases; the supplied field is magnetized. Thus the19–20 A
prediction is not a zero-Hall calculation or an accidentally normalized100 A run.

The [original experiment](https://doi.org/10.1515/zna-1979-0602), printed
pp.675,680,682,684, reports:

- Eq.(7): `sigmaP=sigmaParallel*(1+s)/[(1+s)^2+betaE^2]`,
  `sigmaH=sigmaParallel*betaE/[(1+s)^2+betaE^2]`.
- Eq.(8): `s=[rhoN/(rhoN+rhoI)]^2*betaE*betaI`. The square was visually
  confirmed by the parent in the original page render; text extraction loses it.
- Eq.(9): `betaEffective^2=s+betaE^2/(1+s)`.
- Section4.7 endpoints at r=0/5cm: sigmaParallel1070/950, betaE100/38,
  betaI0.94/0.18. These are inferred collision estimates, not measured2D fields.
- Table1 diffuse neutral densities `(4.3±1.0)e20` and `(45±6)e20 m^-3`, and
  electron densities `(8±2)e18` and `(22±2)e18 m^-3` at the same radii.
- Section4.7 uses `Qen=4e-20 m^2` and a roughly temperature-independent
  charge-exchange-dominated ion-neutral cross section `Qin=6e-19 m^2`.
- Section4.3 uses1.0 and2.5eV as diffuse-mode alternatives. Near-wall probes
  give1.0±0.2eV;2.5eV addresses the uncertain axial representativeness of the
  midplane measurements. It is not a measured local2D electron-temperature map.

V81 deliberately used the leading weak-ionization neutral mass fraction of one.
Squaring one still gives one: Eq.(8)'s square is not a hidden factor-of-five bug
in that campaign. V82 retains the finite-fraction correction separately from
an unchanged leading-limit baseline.

## No demonstrated SI conductivity error

Using the effective electron relaxation rate consistently,
`betaE=eB/(me*nuE)` and `sigmaParallel=ne*e^2/(me*nuE)` imply
`ne=sigmaParallel*B/(e*betaE)`. The source endpoints give approximately
8.68e18 and20.3e18 m^-3, consistent with the independently reported Table1
uncertainties. This is an algebraic scale check, not a new density measurement.
There is no justification for a factor100,1000,2pi, or electron/argon mass change.
When importing a modern Spitzer collision routine, its deflection, momentum and
conductivity-relaxation frequency conventions must be matched explicitly.

The V81 motional EMF uses the mixture/fluid azimuthal velocity. Section4.5
identifies the neutral speed with that fluid speed in this weakly ionized mode.
Ion slip is already in the conductivity tensor. Substituting an ion velocity
into the motional term without changing the generalized Ohm closure would mix
reference frames. With ur=0 and axial B, Hall current contributes radial force,
not an omitted azimuthal torque. The radial Hall force becomes essential in a
future meridional solve, but its absence is not an algebraic factor in this
purely azimuthal charge/shear operator.

## A stronger geometry sanity check: anisotropic disk access resistance

For uniform positive conductivity, pure Ohmic flow through a circular disk
contact on an insulating half-space has

`Rspread = 1/[4*a*sqrt(sigmaSurface*sigmaNormal)]`.

This is the bulk limit derived in
[Seki et al., Scientific Reports10,10633(2020), Eq.(6)](https://pmc.ncbi.nlm.nih.gov/articles/PMC7326967/).
Their surface-parallel conductivity maps to our radial sigmaP, and their normal
conductivity to our axial sigmaParallel. It also follows by stretching
`z'=z*sqrt(sigmaP/sigmaParallel)` and integrating the transformed normal current.

For a4mm disk, sigmaParallel about1000 S/m and betaEffective about14,
sigmaP is about5 S/m. The access resistance is then about0.88ohm;18.5V gives
an order-of-magnitude current near21A. The observed V81 result is already near
this independently known contact-access scale. This is a compelling diagnostic
for the imposed small equipotential disk and axial transport continuation.
It is not an exact solution of the finite, variable-property, rotating device,
nor proof of the actual hollow-cathode current footprint. A larger contact chosen
to make100A would be an electrical fit, not a justified geometry correction.

A locked-flow electrical benchmark should retain the conductivity tensor while
turning off the motional coupling. Free passive rotation adds mechanical loss:
eliminating angular speed at fixed current adds a positive quadratic term
`(T^T I)^T S^-1(T^T I)` to Ohmic dissipation. Thus the same passive network's
coupled conductance cannot exceed its locked-flow conductance. This checks the
back-EMF sign and separates contact access from rotation without velocity data.

## Justified conditional transport experiment

Changing only sigmaParallel while freezing betaE is not a microscopic collision
change. At fixed ne andB both scale inversely with the same electron rate.
Retain heavy temperature, ion Hall parameter and densities, and define
`f=nuEn(1eV)/nuTotal(1eV)`. With fixed Coulomb logarithm and fixed Qen,

`nuTotal(T)/nuTotal(1) = (1-f)*T^(-3/2) + f*T^(1/2)`

for T measured relative to1eV. Its reciprocal g must multiply both
sigmaParallel and betaE. Recompute the full ion-slip tensor afterward. In the
large-slip limit betaEffective squared grows roughly with g, so sigmaP remains
approximately fixed rather than growing in direct proportion to sigmaParallel.
The electrically conditioned V81 conductivity gain therefore cannot be read as
the electron-temperature correction needed to validate the source estimates.

The implemented source partition uses interpolated Table1 neutral density,
`nuEn=nn*Qen*sqrt(8*e*Te/(pi*me))`, and
`nuTotal(1)=eB/(me*betaE_original)`. Any fraction outside `[0,1)` raises an
error; it is not clipped. Two controls set f=0 or0.2 uniformly. Those controls
are endmembers, not bounds on the unmeasured whole vessel.

Finite neutral mass fraction uses `fn=nn/(nn+ni)` with singly charged Ar and
`ni=ne=sigmaOriginal*B/(e*betaE_original)`. The resulting density is explicitly
labelled implied, not replaced by a fitted profile. Apply `fn^2` in the slip
factor and hold it fixed under the electron-temperature sensitivity.

All ten predeclared scenarios remain: both radial shapes, each with V81-leading
1eV baseline, finite-fraction1eV, and three finite-fraction2.5eV collision
partitions. Constant Qen, fixed Coulomb logarithm, radial interpolation and axial
continuation remain conditional; electron heating is not coupled into the
heavy-particle energy balance. These variants must be predicted at absolute
source conductivity before any electrical conditioning. No measured velocity
enters the module.

## Verification recommendations

The accompanying seven test methods cover SI reference rates and independent
mean electron speed, exact1eV limiting formulas, conductivity/Hall/density
covariance, recomputed Pedersen/Hall identities, finite mass fraction squared,
scenario membership, scalar/array fields, and rejection of unsupported inputs.
Additional campaign gates should preserve power/current/angular ledgers,
independent discretization, refinements and unchanged optical scoring. Retain
negative electrical and velocity predictions rather than selecting a transport
partition or contact radius from residuals.
