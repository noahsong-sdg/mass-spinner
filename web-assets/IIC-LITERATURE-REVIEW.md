# Section II C: plasma centrifuge literature and implementation audit

Review date: 2026-11-06. Scope: `src/centrifuge.ts`, its tests, and tutorial Section II C. This is mathematical verification and a primary-literature comparison; it is not experimental validation of this application.

## Finding and root cause

The existing solver correctly implements a bounded, isothermal, quasineutral equilibrium with **ions and electrons sharing one rigid angular velocity**. Its algebra is consistent. Calling its total density profile a realistic vacuum-arc centrifuge prediction would nevertheless be incorrect. The electron-corotation closure excludes the azimuthal current that can support the observed centrally peaked column. In simple terms, two different physical assumptions can give the same isotope enrichment law but very different numbers of particles at each radius.

Preserve this solver as a transparent equilibrium benchmark. Show its assumptions, density profiles, and radial inventories. A prescribed Gaussian-density, current-carrying model is a justified separate closure, described below; it must not silently replace or rescale the existing solution.

## Equations checked independently

Let temperatures `Ti`, `Te` be in eV, masses in kg, charges `Z_s e`, imposed axial field `B`, and ion rotation `vθ=Ωr`. Neglect electron inertia. Radial ion momentum is

```
e Ti d(ln n_s)/dr = m_s Ω²r - Z_s e dφ/dr + Z_s e ΩBr.
```

For common electron corotation, define `ψ=φ−ΩBr²/2`. Integration and quasineutrality give exactly the equations used by the implementation:

```
n_s(r)/n_i,total(0) = f_s exp[m_s Ω²r²/(2eTi) − Z_s ψ/Ti]
n_e(r)/n_i,total(0) = (Σ Z_s f_s) exp[ψ/Te]
Σ Z_s n_s = n_e.
```

The scalar charge-closure function is strictly decreasing in `ψ`; positive densities therefore give a unique root. For one ion species,

```
n_i(r)/n_i(0) = exp[m Ω²r² / (2e(Ti+ZTe))].
```

This necessarily increases outwards. For equal ion charges, subtracting the two ion equations cancels electric and magnetic terms:

```
ln[(n_H/n_L)(r)/(n_H/n_L)(0)] = Δm Ω²r²/(2eTi).
```

For unequal charge states the cancellation does not occur. Equal mass alone also does not imply equal distributions when charge states differ. `ψ` is an effective potential, not the laboratory potential `φ`; a field-free configuration cannot determine the latter. Rotation reversal leaves this benchmark's density unchanged, but does not establish that a real driven discharge has that symmetry.

## Primary evidence checked

| Source and access | Verified result relevant to this app |
| --- | --- |
| Hole & Simpson, *Performance of a vacuum arc centrifuge with a nonuniform magnetic field*, Physics of Plasmas 4, 3493–3500 (1997), [DOI 10.1063/1.872246](https://doi.org/10.1063/1.872246), [author/institution PDF](https://maths.anu.edu.au/files/U4348025XPUB31.pdf). Full text checked, especially equations 3–10 and 30. | The model uses an observed Gaussian ion density, rigid ion rotation, and nonzero azimuthal current. Equation 30 concerns a normalized **isotope flux-density ratio** for equal charge. A slowly varying axial field changes column radius, rotation and axial flow. These are coupled fluid predictions, not a universal correction factor for this app. |
| Yue & Simpson, *The effect of collisions on near-steady rotation in a vacuum arc centrifuge*, J. Phys. D 29, 2866 (1996), [DOI 10.1088/0022-3727/29/11/020](https://doi.org/10.1088/0022-3727/29/11/020). Publisher abstract checked; full text not retrieved. | Their two-dimensional fluid calculation includes multiply charged ions and electrons. Collisions cause radial outflow/spreading; electrical contact with the anode grid allows inward radial current and increased angular velocity. A scalar slider that merely relaxes toward a preset radial profile does not reproduce this model. |
| Geva et al., *Vacuum arc plasma centrifuge for element and isotope separation*, IEEE Trans. Plasma Sci. 15, 583–588 (1987), [DOI 10.1109/TPS.1987.4316757](https://doi.org/10.1109/TPS.1987.4316757), [authors' institutional record](https://cris.huji.ac.il/en/publications/vacuum-arc-plasma-centrifuge-for-element-and-isotope-separation/). Institutional abstract checked; full text not retrieved. | Reported behavior includes exponential enrichment versus radius squared, Gaussian radial density, and parabolic potential, interpreted with a steady multispecies fluid model. This supports comparing enrichment separately from total-density shape. |
| Hole, Dallaqua, Simpson & Del Bosco, *Instability of a Vacuum Arc Centrifuge*, AIP Conf. Proc. 669, 323 (2003), [DOI 10.1063/1.1593930](https://doi.org/10.1063/1.1593930), [UKAEA author PDF](https://scientific-publications.ukaea.uk/wp-content/uploads/Published/AIPConfProc669p323.pdf). Full text checked. Related full article: [Phys. Rev. E 65, 046409 (2002)](https://doi.org/10.1103/PhysRevE.65.046409); its publisher abstract also checked. | A two-fluid linear perturbation model of a Gaussian column is compared with probe measurements. The observed fluctuations are identified with a density-gradient-driven drift mode at finite conductivity. The conference paper compares radial amplitudes and phases as well as frequency; a random visual wobble or an arbitrary “instability penalty” is not an equivalent simulation. |

These references establish important omitted mechanisms. They do not supply a validated collision time, efficiency, instability growth rate, or extraction yield for arbitrary UI inputs. A further reference, Hole & Simpson (2001), [DOI 10.1088/0022-3727/34/20/305](https://doi.org/10.1088/0022-3727/34/20/305), was located in ANU's publication list; its full primary text was not retrieved, so no implemented numerical coefficient is attributed to it.

## A physically consistent Gaussian-envelope alternative

This subsection is an independent derivation under explicitly changed assumptions, motivated by the observed-density fluid closure above. It is not a newly validated vacuum-arc performance model.

Prescribe total ion density `N(r)=N0 exp(−r²/R²)`, common ion rotation `Ω`, common ion temperature, and equal ion charge `Z`. The equal-charge ratio law fixes species fractions; for two species, with `q(r)=(f_H/f_L) exp[Δm Ω²r²/(2eTi)]`, use `n_H=N q/(1+q)`, `n_L=N/(1+q)`. These densities satisfy each ion radial momentum equation if

```
dφ/dr = ΩBr + m̄(r)Ω²r/(Ze) + 2 Ti r/(Z R²),
```

where `m̄(r)=Σ m_s n_s/N`. Electron radial momentum then requires

```
v_eθ = (dφ/dr)/B − (Te/B) d(ln n_e)/dr
      = (dφ/dr)/B + 2 Te r/(B R²),
Jθ = Ze N(Ωr−v_eθ)
   = −N r/B [m̄(r)Ω² + 2e(Ti+ZTe)/R²].
```

Thus the Gaussian envelope is supported by a **derived electron drift and azimuthal current**, rather than imposed together with contradictory electron corotation. `B≠0` is required for this closure. It predicts neither `R` nor source drive or current availability; those are measured inputs or require an external circuit/source model. For unequal `Z`, the Gaussian total-density condition can instead determine `φ(r)` through a scalar monotone ion-density closure, after which electron flow/current must again be derived. That extension needs separate tests.

The minimum coherent implementation is a separately named prescribed-density equilibrium, with plots of required `Jθ`, electron versus ion rotation, force-balance residuals, and local charge neutrality. Simply multiplying all current densities by a Gaussian would violate the existing Boltzmann/electron equations and is not recommended.

## Useful live outputs, with correct interpretation

1. **Density and charge closure:** `n_s/n_i,total(0)`, `n_e/n_i,total(0)`, and `ΣZ_s n_s`. Offer logarithmic density scale. Keep `ψ` on a separate voltage axis/panel.
2. **Enrichment:** local fractions and `ln α` against `r²`; the equal-charge analytic slope is a strong visible benchmark. Identify the reference species and distinguish number-density ratios from axial flux ratios.
3. **Inventory:** cumulative integrals `2πL∫₀ʳ n_s(r′)r′dr′`, and bulk composition versus axis and wall composition. Length and absolute density cancel for fractions but are necessary for particles or kilograms.
4. **Hypothetical radial cut:** inner/outer inventory fractions and compositions for a selected cut radius. These describe an axially uniform cylinder partition, not recovery in a flowing collector.
5. **Sensitivity:** sweep `Ω²/Ti`, radius, electron temperature and charge state. Plot enrichment together with inventory so a large edge ratio cannot conceal a tiny or differently distributed population.

`src/centrifuge-diagnostics.ts` implements items 2–4 using density samples, including exact cylindrical integration of the piecewise-linear interpolant. The cut can pass through a sample cell. The helper does not modify equilibrium densities or assume an extraction law. Its normalized inventories are dimensionless means relative to the total on-axis ion density and full cylinder area.

An axis fraction is not feed or whole-volume composition. Holding axis fractions fixed while changing rotation changes the integrated species population ratio. A fixed-inventory model must solve the axis fractions subject to integrated inventory constraints; it is a separate boundary condition. A flowing feed additionally requires axial velocities and inlet/outlet boundary conditions.

## Next model and validation gates

For a realistic finite-length vacuum-arc device, solve coupled species continuity, radial/azimuthal/axial momentum, electron momentum/current closure and energy or justified isothermal closure. Specify anode-grid potential/conductivity, endplate and wall boundary conditions, source distribution, charge-state populations, imposed field map, and collision/viscosity model with its applicability. Preserve conservation of each species and current. A relaxation time cannot be inferred from equilibrium alone.

Validation should compare independently measured `Ω(r,z)`, density, temperatures, charge states and potential to one documented operating point before fitting collector enrichment. Then compare radial isotope flux/composition and their axial evolution with uncertainty; retain held-out conditions. A stability extension needs a documented equilibrium and an eigenvalue/initial-value perturbation model, with radial boundary conditions and resolved wavelengths, before displaying growth rates. No claim of quantitative experimental calibration is warranted yet.

The new diagnostic tests check uniform cylindrical-volume fractions, exact integrals of linear profiles with a cut inside a cell, an independent analytic exponential-inventory limit and second-order radial convergence, species ordering in inner/outer regions, absent species, and invalid inputs. These establish diagnostic correctness within the stated equilibrium model, not machine realism.
