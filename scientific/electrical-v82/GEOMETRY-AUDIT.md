# Electrode geometry and the absolute-current mismatch

12 November 2026. Independent source and equation review. No scientific code,
PDF parser, download, build or test was executed by this reviewer. The parent
rendered the original PDF inside safe-dev; I inspected its complete printed
pages 673, 674, 677 and 687, including Figures 1, 3 and 15. I also read the
extracted apparatus, theory, electrical and Appendix sections and traced
`flow-v81/campaign.py -> solver.solve` and the inherited V79 mesh.

## Verified apparatus and current conventions

Source: [Wijnakker, Granneman and Kistemaker (1979)](https://doi.org/10.1515/zna-1979-0602),
especially section 2.1, Figures 1/3, equations 10/11 and Appendix A.1-A.5.

| Item | Source evidence | V81 interpretation |
|---|---|---|
| Cathode separation | 48 cm | Half-domain length 24 cm; consistent |
| Central bore diameter | 12 cm **between anodes** | Constant radius 6 cm throughout; source-theory simplification |
| Anode spacing | 14 cm; reference points not explicitly specified | Centers at +/-7 cm; reasonable but not uniquely established |
| Ring thickness | 2 cm | Anode width 2 cm; consistent nominal interpretation |
| Hollow cathodes | Tantalum, **inner** radius 0.4 cm | Equipotential disk of radius 4 mm; current-footprint assumption |
| Wall | Stainless-steel rings, mutually insulated, floating except anodes | Locally insulating off anodes; source-theory approximation |
| Branch current | Up to 100 A **per source**; Fig.1 shows two circuits | 100 A in each mirrored half-domain; consistent |

Equation 11 integrates the current through one cathode plane to I. Its wording
"total current" does not justify splitting the experimentally stated 100 A
between the two separate discharge circuits. There is no verified factor-two
current correction remaining in this path.

The 14 cm anode distance admits a small declared geometry sensitivity: if it is
center-to-center, centers are +/-7 cm; if it denotes the clear gap between 2 cm
wide rings, centers are +/-8 cm. Neither interpretation may be selected using
velocity residuals. The source does not dimension the cathode outer radius,
emission footprint, exposed length, near-cathode taper, or plasma-side sheath.

## Physical geometry is not the source's solvable geometry

Figure 1 visibly contains hollow cathodes and tapering inner-wall contours near
the cathodes. Figure 3 instead uses a constant-radius cylinder, stationary flat
endwalls and infinitely thin current rings. The physical chamber's 12 cm
diameter is specified only in the central region. Schematic pixels do not give
an independently calibrated outer-region radius or cathode protrusion length.
Changing R(z) or an effective cathode radius until current reaches 100 A would
therefore fit unknown geometry, not repair a demonstrated transcription error.

V81 changes the source-theory cathode further: equation 11/A.4 prescribes a
delta-ring **Neumann current** at r=R1, while V81 prescribes a finite conducting
**Dirichlet disk** over 0<=r<=R1. Its anode is also finite-width and equipotential.
These are explicit regularizations, not exact reproductions of the mathematical
boundary conditions. A zero-width ring generally adds a spreading singularity;
replacing the disk with one grid row of imposed ring current does not identify
a finite experimentally meaningful electrode voltage.

## An independent quantitative explanation of the bottleneck

The familiar disk-access problem has an exact solution. For a uniform tensor
`diag(sigmaP,sigmaP,sigmaParallel)` and no motion, the charge equation in a
half-space is

`sigmaP*(phi_rr + phi_r/r) + sigmaParallel*phi_zz = 0`.

Let `zPrime=z*sqrt(sigmaP/sigmaParallel)`. The PDE becomes Laplace's equation,
while normal physical current density becomes
`-sqrt(sigmaP*sigmaParallel)*phi_zPrime`.

For an equipotential disk of radius a in an otherwise insulating plane,
[Newman's original report](https://escholarship.org/content/qt96z6t5r3/qt96z6t5r3.pdf)
gives the isotropic total current `I=4*a*kappa*V`. The coordinate transformation
therefore gives, without a velocity or geometry fit,

`G_access=4*a*sqrt(sigmaP*sigmaParallel)`

`R_access=sqrt(1+betaEffective^2)/(4*a*sigmaParallel)`.

With a=4 mm, sigmaParallel=1070 S/m and betaEffective approximately 14,
the conductance is approximately 1.22 S: at 18.5 V, the half-space estimate is
approximately 22.6 A. This is already close in scale to V81's 19-20 A. Finite
anode geometry, spatial coefficients and motional back-EMF differ, so the
half-space value is **not** an exact device prediction or validation target.
It identifies anisotropic cathode access as a quantitatively credible dominant
resistance, rather than evidence of a missing factor-five multiplier.

The characteristic physical axial access length is
`a*sqrt(sigmaParallel/sigmaP)=a*sqrt(1+betaEffective^2)`, approximately 5.6 cm
for this case. A cathode-region diagnostic restricted to 4 mm would miss most
of that anisotropic access region. Spatial power/current budgets should retain
fixed, declared axial cuts and report the cumulative drop, with mesh refinement.

For an independent truncated-domain verification, impose the exact exterior
potential on artificial outer boundaries, rather than calling a finite device
an infinite half-space. One convenient exact expression is

`phi(r,zPrime)=(2*V/pi)*asin(2*a/(sqrt((r+a)^2+zPrime^2)+sqrt((r-a)^2+zPrime^2)))`.

The disk flux is
`jNormal=2*V*sqrt(sigmaP*sigmaParallel)/(pi*sqrt(a^2-r^2))`.
Integrating it yields the conductance above. The edge singularity is integrable
but requires actual mesh refinement; conservation alone does not verify the
access resistance. This mathematical control is preferable to tuning the disk
radius, a contact resistance, or near-cathode conductivity to the experiment.

## Floating rings: defensible sensitivity, not an automatic correction

An isolated conducting ring enforces **net** zero current, not necessarily
pointwise zero current. A sheath-free perfect-conductor model would introduce
one unknown ring potential and one integrated-current constraint per ring,
allowing opposite local currents to redistribute along its surface. V81 instead
sets local normal current to zero, following the source's equation 11.

However, a uniform metal potential does not imply a uniform plasma-side
potential: the floating sheath drop can depend on local density and electron
temperature. Those inputs and the complete ring layout are not reported. Even
the approximate count/thickness and the additional 5 cm diagnostic ring do not
uniquely specify every segment boundary. A declared ideal-conductor/no-sheath
challenge could bound a modeling sensitivity, but it must not be promoted to a
verified apparatus correction. Adding an arbitrary wall-current bypass is not
justified.

## Verdict and reviewable next steps

No definite radius, length, polarity, branch-count or SI-unit transcription error
was found. The strongest actionable explanation is that the retained 4 mm disk
and the unmeasured extension of midplane anisotropic transport through its
access region together create a resistance of the observed order.

1. Add an independent disk-spreading control and refined local power/voltage
   budgets, keeping all source/V81 profiles frozen and velocities excluded.
2. Separate positive Ohmic drop from motional power; `P/I` is a work-conjugate
   port voltage only for the imposed port definition, not an arbitrary probe.
3. Retain the source-defined +/-7 versus +/-8 cm anode-location interpretation
   if a bounded geometry sensitivity is useful. Do not invent taper dimensions.
4. Any axial near-cathode transport or ideal floating-ring study must remain
   explicitly conditional. No measured near-cathode sigma/beta map or finite
   current footprint was found that would establish one unique corrected model.

This review verifies source interpretation and an analytical mechanism. It
does not constitute a numerical rerun or experimental qualification.
