# Independent gas–wall thermal assessment

Reviewer: `/root/gas56_wall_physics`, 2026-11-09. This is an independent
derivation and source/execution-path review. No project or scientific code
was executed by this reviewer, on the host or in a VM. Parent-owned
safe-dev numerical results must be inspected separately before numerical
qualification. No production source was changed here.

## Traced assumptions and root issue

`simulateFuelOperation` obtains neutral inventory from the initial mean
pressure, full cylinder volume and gas temperature. Its thermal capacity
is `3*N*kB/2`, appropriate to the supported ideal monatomic pairs. Thermal
evolution explicitly rejects the molecular pair. The optional thermal
model exchanges heat through an independently prescribed `gasWallWK`;
its default is 0.1 W/K. This is distinct from the centrifuge's
`linerConductanceWK`, a reference-only input. The UI permits thermal film
conductance up to 1e6 W/K. No neutral collision, thermal accommodation,
gas-side conduction or mixing criterion derives this number.

The v55 study has `G=1000 W/K` and `Cg=0.000678584 J/K`, giving a nominal
0.679 microsecond gas response. It validates an ODE/PDE benchmark, but the
benchmark's capacity and geometry do not name a species or establish its
velocity distribution. Assigning a physical gas interpretation requires
those missing inputs. Refining the wall cannot establish that interpretation.

In simple terms, the simulator can remove energy from every gas atom at
once, even if the atoms or their energy cannot reach the wall that quickly.
The correct next step is a validity assessment and conditional reference,
not silently replacing the user-prescribed film with an unverified law.

## One-interface molecular reference: independent derivation

Assume a nonreactive, impermeable wall and a local Maxwellian incident
population of species `s`, density `n_s`, temperature `Tg`, zero normal
mean velocity, and no tangential slip. Define

`J_s = n_s*sqrt(kB*Tg/(2*pi*m_s)) = n_s*vbar_s/4`.

This is a particle incidence rate per area, not a bulk collision frequency.
Weighting the Maxwell distribution by incoming normal speed yields mean
incident translational energy `2*kB*Tg`: the normal degree contributes
`kB*Tg` and the two tangential degrees together contribute `kB*Tg`.
Using the bulk mean energy `3*kB*Tg/2` here is incorrect because faster
normal particles strike the wall more often.

This derivation is independently corroborated by
[NASA TM-88786, Appendix B, Eqs. B10–B19](https://ntrs.nasa.gov/api/citations/19860022180/downloads/19860022180.pdf):
its Maxwellian incident translational energy flux is particle flux times
`2*kB*T`; its accommodation expression reduces to the same monatomic
coefficient. That source uses a low-drift gas around a particle, not a
validation of this centrifuge's spatial or transient closure.

For a Maxwell diffuse/specular mixture with diffuse fraction `alpha_s`,
the fully diffuse outgoing flux carries `2*kB*Tw` per reflected atom,
while the specular part transfers no thermal energy. Thus, positive
gas→wall,

`q'' = sum_s 2*alpha_s*kB*J_s*(Tg-Tw)`

and the instantaneous chord conductance for common `Tg` is

`G_M = 2*kB*A*sum_s alpha_s*J_s`.

This is total W/K, with area matching the modeled heat-exchanging surface.
The current radial wall uses lateral area `A=2*pi*R*L`, not that area plus
end caps. For finite temperature contrasts `J_s` itself changes with gas
conditions; `G_M` is not automatically `dq/dTg` away from equilibrium.
The two-opposing-wall effective factor `alpha/(2-alpha)` must not replace
the single-interface coefficient without deriving that separate geometry.

For uniform one-species monatomic gas with `alpha=1`,

`Cg/G_M = 3*V/(A*vbar) = 1.5*R/vbar` for the lateral cylinder.

This provides a useful wall-collision supply timescale. It is not a
universal minimum thermal time in arbitrary flows or a proof of gas lumping.

**Scope of the reference maximum.** Setting every `alpha_s=1` maximizes
this specified nonreactive Maxwell-scattering model at the specified local
density and temperature. It is not a universal upper bound on bulk-to-wall
conductance in continuum flow, impinging/advected gas, an anisotropic incident
distribution or a reactive/condensing surface. Use labels such as
“fully accommodating Maxwellian incidence reference.” A prescribed value
below it is not thereby validated; gas-side gradients and unknown surface
physics can still limit the actual transfer.

## Rotation, separation and energy accounting

The incidence density must be the local density at the wall, species by
species. The initial volume-mean pressure does not supply it once a
centrifuge separates the gas. Local density may strongly exceed the mean
near the wall and be depleted near the axis. For the accepted equal-volume
radial grid, the outermost-cell estimate is
`n_s,outer=(N_s/V)*cells*P_s,outer`. It is a cellwise reconstruction, not
an independently resolved wall-side kinetic density. The equilibrium
reference `radialPDF(beta,1)` is a different closure; do not substitute it
for the evolving distribution without labeling the distinction.

Tangential relative velocity `w=u_g-u_wall` leaves `J_s` unchanged under
the same zero-normal-drift Maxwell assumption but increases the mean
incident energy in the wall frame by `m_s*|w|^2/2`. For the simple
diffuse/specular kernel, wall-frame transfer acquires
`sum_s alpha_s*J_s*m_s*|w|^2/2`. Thermal and momentum accommodation need
not be equal for a more general scattering kernel. Laboratory-frame energy
exchange also contains wall mechanical work; wall heating is not obtained
by relabeling all kinetic-energy transfer as heat for a moving wall.

The simulator already deposits prescribed wall-drag dissipation in the
liner. Adding a microscopic slip term without replacing/reconciling that
closure would double-count energy. The present regime assessment should
report slip and the conditional thermal reference, without adding new heat.

## Why one temperature can fail even with a molecular reference

A closed rarefied gas exchanging particles with differently heated surfaces
can have separate incoming/outgoing half-range distributions. One energy-
moment temperature does not determine the incoming heat flux. Even with
one wall temperature, a fast initial transient retains flight-time and
velocity-selection effects. A short ballistic crossing time is necessary
context, not sufficient proof of a Maxwellian or uniform temperature.

Conversely, collision-dominated gas may establish a local Maxwellian while
retaining a large spatial thermal gradient. Acoustic pressure equilibration
does not itself homogenize temperature. Thermal diffusion/mixing must be
compared with wall/source forcing times independently. No accommodation
measurement can by itself certify gas lumping.

The default lithium configuration also needs a phase-equilibrium caveat.
Its 10 Pa mean pressure and 500 K bulk temperature can be compared with
the already attributed NIST Antoine vapor-pressure fit, but supersaturation
is not a kinetic condensation-rate model. The 1000 K wall has a different
saturation pressure. Adsorption, evaporation, clustering or plasma-assisted
chemistry could invalidate fixed atomic inventory; those rates and surface
states are absent. Report the thermodynamic screen as conditional evidence
without inventing a phase-change rate or treating the illustrative default
as established equilibrium hardware.

## Existing implementation and data inspected

[SPARTA surface collisions](https://sparta.github.io/doc/surf_collide.html)
provide diffuse/specular mixtures, CLL scattering with separate directional
and internal-mode accommodation, and tangential translating/rotating walls.
Its [surface tally](https://sparta.github.io/doc/compute_surf.html) reports
incident particle flux, forces and kinetic-energy transfer; W versus W/m²
depends on normalization. This is an appropriate future DSMC benchmark
capability, not a claim that SPARTA is currently integrated or executed.

[The 1974 tungsten-wire experiment](https://doi.org/10.1016/0039-6028(74)90166-6)
reports helium accommodation about 0.018 and argon about 0.25, with 300 K
incident gas and tungsten 1073–1785 K at roughly 1e-3 torr. Those conditions
illustrate substantial departure from unity; neither number is a justified
coefficient for lithium or atomic D/T. The publisher search result exposes
the abstract; direct full-page retrieval was denied, so no full-text detail
beyond the abstract was used.

[NIST's acoustic-resonator review](https://www.nist.gov/publications/energy-accommodation-coefficient-extracted-acoustic-resonator-experiments)
examines helium/argon energy accommodation inferred from metal-walled
cavities near ambient temperature. It is relevant metrology, not calibration
of this gas–tungsten interface.

[BISON gap/plenum models](https://mooseframework.inl.gov/bison/theory/gap_plenum_models.html)
combine bulk conductivity, gap geometry and temperature-jump lengths and
document gas-mixture accommodation weighted by `x_s/sqrt(M_s)`. This matches
the incidence weighting derived above for equal species temperatures.
Its calibrated engineering-surface/inert-gas correlations should not be
transferred to atomic Li/D/T without evidence, nor used as a one-wall law
for this different geometry.

## Recommended validation gates

1. Exact one-dimensional Gaussian moments recover `J=n*vbar/4`, incident
   energy `2*kB*T`, zero heat at equal temperatures, and signed transfer.
2. Mixture reference is a sum of individual species contributions; pure
   endpoints and identical-mass species collapse correctly.
3. Zero accommodation gives zero thermal exchange; full accommodation
   recovers the reference. This tests the model, not a measured alpha.
4. Changing cylinder length scales `Cg` and lateral `G_M` equally, leaving
   the uniform collision-supply time unchanged. Pressure scales both equally.
5. Fixed local Maxwell parameters give the stated reference; enrichment
   changes the reference through actual local number density. Report the
   assumed density profile rather than presenting it as a solved fluid state.
6. Tangential slip must not modify normal particle incidence in this
   special geometry. A general normal drift requires another half-range
   integral, not this no-drift expression.
7. Missing species, transport data, surface data or mixing mechanism must
   produce an unresolved/conditional assessment, never an automatic pass.
   Mathematical convergence, conditional admissibility and hardware
   validation remain separate statuses.

## Final implementation and actual evidence reviewed

The current `assessment.py` enforces finite angular velocity, rejects
unsupported molecular thermal interpretation, preserves vacuum/missing-data
states as unresolved, and leaves every physical `qualified` flag false.
The initially ambiguous one-cell gradient was corrected: a single cell has
no resolved gradient estimate; explicitly uniform reference fixtures now
have two cells. Bulk acoustic/diffusion assumptions and the distinction
between density and thermal gradients are now recorded in each assessment.
These are coherent boundary/semantic fixes; no gas transport PDE, surface
calibration or production thermal closure has been added.

I inspected the exported `packet.json`, `results.json`, `findings.json`,
`audit-independent.json`, `negative-controls.json` and the final receipt
under `scientific/centrifuge-v44/gas56/`. Read-only host SHA-256 checks bind
the packet to
`3e2e58bd43bd64739e2e1b821a6baa16f470292edd1772e9657164cb0dc68394`
and results to
`4f38f1defcd2e99ceb47dcfe58fd6fd6d19578ed4f89e3911d9aa136e9664ede`;
these match the logged assessment/independent-audit identities. I did not
execute the scientific calculation independently. The parent-owned offline
VM receipts report successful assessment and independent audit, with 3,338
atomic records, 649 unsupported molecular records, and no export failures.
The independent Gaussian quadrature obtains incident energy `2*kB*T`, and
maximum species-inventory relative error is approximately `2.97e-15`.
All three deliberate corruptions (capacity, effusive energy and NIST
conductivity) are rejected. This checks implementation and data identities,
not physical accommodation or gas mixing.

The actual initial lithium record has `G=0.1 W/K`, film time 10.857 ms,
radial bulk Cp diffusion time 24.133 ms, and viscosity-convention `Kn_R`
0.00542. Thus it is a continuum *candidate* under the stated threshold,
while conduction-based lumping is not established. Its conditional local
Maxwell reference is 7.454 W/K, giving a required reference accommodation
0.0134. This is not a measured Li–W accommodation coefficient. Initial
D/T and helium have `Kn_R` near 0.0303 and 0.0302, respectively; their
bulk diffusion-to-film ratios are 0.236 and 0.280. Neither qualifies under
the stated necessary screens. D/He and T/He lack the required bulk transport
data; their false screen is an unresolved assessment, not demonstrated
physical invalidity.

All five *conditional* atomic identities assigned to the capacity-only v55
fast case give `G=1000 W/K` above their local Maxwell references, by factors
about 123–215. The original v55 benchmark specifies no species. The evidence
therefore supports retaining it as a stiff mathematical wall benchmark;
it does not establish a physically qualified lumped-gas experiment, identify
its actual gas, or prove a universal conductance bound. A distinct incoming
distribution, flow, chemistry or density would require a different analysis.

The lithium 32/64/128-cell isothermal profile comparison keeps both reported
Kn screens below 0.01 but changes the outer-cell Maxwell reference from
10.974 to 11.048 to 11.086 W/K. This supports classification sensitivity
reporting, not an exact wall density or a new quantified convergence claim.
No sampled accepted thermal state passes the conduction-lumping screen.
The 118 static-grid cases labelled `conductionLumpingNotExcluded` remain
conditional necessary-screen results, not 118 validated operating points.

The final receipt records all nine required commands exiting zero with
source identity checked before/after each command; its snapshot SHA-256 is
`50904581759190854425d366cce68e67dfd1cdf01947d97e2d7c30b606477fdb`.
The exported logs explicitly record 1,139 passing npm tests and 16 passing
gas-regime regression tests; typecheck and build also exit zero. The receipt
explicitly says browser verification and calibrated Marathon device status
are false. Passing those software gates does not change the physical verdict.

**Independent wall-physics verdict:** no blocking formula/domain error found
in this scoped assessment after the noted fixes. Its numerical and provenance
checks pass; none of the real gas–wall/lumped-temperature closures is physically
qualified by this campaign. Measured surface interaction, gas energy transport,
thermal-gradient/forcing resolution and chemistry/phase kinetics remain the
work needed to make that stronger claim.
