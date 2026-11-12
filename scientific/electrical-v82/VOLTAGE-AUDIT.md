# Voltage and current mapping audit

12 November 2026. Independent source/code review. No scientific code or PDF
parsing was executed by this reviewer, and no measured velocity was fitted.

## Verified source facts

The primary source is [Wijnakker, Granneman and Kistemaker (1979)](https://doi.org/10.1515/zna-1979-0602),
pp. 672–690. The complete local extraction was checked, together with the parent’s
render of p. 677, including Eq. (11) and its explanatory paragraph.

- §2.1, p. 673: cathode-to-cathode separation 48 cm; central diameter 12 cm;
  anode separation 14 cm; anode rings 2 cm wide; hollow-cathode inner radius 0.4 cm.
  Each plasma source can draw 100 A. These facts support the existing half-domain
  length 24 cm and branch current 100 A. “Total current” in Eq. (11) is the integral
  through one modeled cathode boundary, not a license to halve the branch input.
- Table 1, p. 678: diffuse-mode terminal arc voltage 58.0 ± 0.5 V and corrected arc
  voltage 18.5 ± 2.0 V. Contracted-mode values 83 V and 38 V must not be substituted.
  Footnote 1 identifies the correction as removal of cathode and anode falls.
- §4.5, p. 682: the corrected difference is inferred from the arc voltage/current
  plot at fixed magnetic field. The source supplies neither the raw V–I data nor
  an explicit slope/intercept estimator, local sampling locations, contact-area
  average, or finite-footprint voltage operator.
- §3, p. 677: current is prescribed using delta-ring Neumann boundaries and no
  wall-potential constraint is imposed. This differs from the V79/V81 conducting
  disk and finite equipotential anode boundary. The physical hollow-cathode
  aperture does not establish a measured plasma-current footprint.
- §4.6, p. 683: midplane probe and theoretical potential curves are aligned at
  radius 5 cm. This constrains differential profile shape, not an absolute port
  voltage. The physical midplane wall is floating.

No justified factor-of-two current or length correction was found. Replacing
18.5 V with the uncorrected 58 V would count electrode falls as bulk drive. Inferring
a new contact radius or voltage from the rotation residual would be fitting.

## Exact meaning of the implemented voltage

Tracing V81 `campaign.predict_case → solver.solve` shows that 18.5 V is imposed
between a conducting disk at z = 24 cm and the finite 2 cm-wide anode band. The
spatial source transport is applied throughout the modeled gas, including the
near-cathode region. Thus the absolute-current challenge tests this entire
boundary/transport/voltage-mapping combination, not conductivity alone.

For gas-outward current density jn, charge conservation gives the gauge-invariant
electrical input

`Pport = −∮ φ jn dA = I (φ̄anode,current − φ̄cathode,current)`.

The bars are signed current-weighted port averages. Equipotential ports reduce
this identity to `Pport/I = Vanode−Vcathode`. In the present steady shear model,

`Pport = QJoule + Wrot = QJoule + Dviscous`.

Consequently, total electrode power divided by current is a well-defined voltage
for the implemented ports. It is not independent evidence that this operator is
the corrected experimental voltage. Nor does it identify which near-electrode
regions the experimental cathode/anode-fall correction removed.

For a spatial region A, the correct electrical balance is

`−∮∂A φ J·n dA = QJoule,A + Wrot,A`.

`QJoule,A/Ibranch` and `Wrot,A/Ibranch` are additive **volt-equivalent budgets**;
they are not generally local potential differences. Local electromagnetic work
also need not equal local viscous dissipation: stress transports mechanical
energy across artificial cuts. A planar potential average without current
weighting does not satisfy this power identity.

## Analytical explanation of the current scale

[Seki et al. (2020), Eq. (6)](https://doi.org/10.1038/s41598-020-66739-7)
give the exact spreading resistance for an equipotential circular contact on a
homogeneous anisotropic conducting half-space:

`Rspread = 1/[4a√(σradial σaxial)]`.

With `σradial=σparallel/(1+βeff²)`, this becomes

`Rspread = √(1+βeff²)/(4aσparallel)`.

One derivation rescales the axial coordinate by
`z′=z√(σradial/σaxial)`, reducing the anisotropic Laplace equation to the isotropic
one. The normal flux then carries the factor `√(σradial σaxial)`. The isotropic
limit is the standard `1/(4aσ)` circular-contact result, also recorded in the
[NBS spreading-resistance symposium](https://nvlpubs.nist.gov/nistpubs/Legacy/SP/nbsspecialpublication400-10.pdf).

At a = 4 mm, near-axis σparallel = 1070 S/m and βeff ≈ 14.1, the resistance scale is
approximately 0.83 Ω. At 18.5 V this implies a current scale of roughly 22 A. This
already explains the order of the V81 prediction 19–20 A without a unit change or
velocity fit: a small contact in strongly anisotropic gas incurs substantial
current-spreading resistance.

This is an explanatory asymptotic and a solver benchmark, **not** an exact
finite-vessel prediction or rigorous bound. The vessel is finite, the return is
a sidewall band, transport varies and rotation produces motional EMF. The
half-space result does not prove that the physical hollow cathode has the same
effective contact, nor that the experimental fall correction includes spreading.

## Defensible diagnostics and tests

1. Retain the absolute 18.5 V/current calculation and the fixed 100 A drive as distinct
   challenges. At fixed prescribed transport, the linear steady system must give
   `I∝V` and `Ω∝V`; fixed-current and fixed-voltage solutions must coincide when
   their measured port conditions coincide. This provides a test without tuning
   conductivity, voltage, geometry or velocity.
2. Add independent circular-contact benchmarks with motional EMF disabled, varying anisotropy and
   contact size. Enlarge the domain in transformed coordinates and refine the
   contact edge jointly; a finite domain must not be compared to the half-space
   answer without a domain-size study.
3. Report local Joule heating, electromagnetic work and port volt-equivalent
   budgets. Use source-defined partitions: contact scale a = 4 mm, anode center 7 cm,
   finite-band edges 6/8 cm and midplane. A cut at 7 cm intersects the finite anode;
   its net axial current need not equal 100 A. The upper segment z ≥ 8 cm avoids
   cutting through the anode band. No residual-dependent threshold is needed.
4. Enforce regional and global electrical-work identities. If per-face electrical
   resistance is allocated to cells, split it by the actual half-cell resistance,
   not equally; split motional work by the same EMF/torque coupling used in the
   solver. Label cell-center estimates and unresolved boundary gradients.
5. Preserve the uncertainty in the corrected experimental voltage operator.
   A “bulk” voltage obtained by deleting a chosen layer is only a declared
   sensitivity until the excluded region is independently specified. Do not
   choose the layer to make the result 18.5 V or 100 A.

## Remaining boundary uncertainty

The physical non-anode metal rings float. Net zero current into a floating
conductor is not automatically pointwise zero plasma-normal current, and the
plasma-side potential is not automatically constant without a sheath model.
The source theory explicitly chooses the simpler pointwise-zero-current
approximation. Grounding the rings or promoting them to equipotential plasma
contacts would be an unjustified change intended to raise conductance.

The [AMOLF thesis record](https://ir.amolf.nl/pub/1473) confirms Wijnakker’s 1980
dissertation, but exposes no downloadable full text. No additional V–I estimator
or contact-voltage definition was recovered from it. Missing apparatus inputs
remain missing; neither electrical conditioning nor benchmark agreement supplies
them.
