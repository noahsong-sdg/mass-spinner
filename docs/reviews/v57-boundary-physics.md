# Independent accommodation-boundary physics review

Scope: independent derivation and primary-source review for a spatial,
neutral, monatomic gas-energy reference. This review has not executed
project code or a second numerical campaign. The parent owns execution in
Apple safe-dev; results will be reviewed separately when available.

## Existing execution path and gap

The v56 report and `scientific/gas-regime-v56/assessment.py` establish that
the production path supplies a fixed total neutral inventory, one gas
temperature and a prescribed film conductance. The diagnostic computes
local density-dependent arrival references but does not evolve gas energy
in space. The wall solve therefore has no mechanism for resolving a gas
thermal boundary layer. Its converged energy balance does not establish
that the chosen film describes a physical gas/surface pair.

The smallest defensible next step is a separately qualified pure-gas
reference with explicit geometry, transport data, surface identity and
accommodation. A new multidimensional/reacting/plasma closure is not
justified by the present data.

## Boundary condition and sign convention

[Hadjiconstantinou2006, Eqs8–11, pp4–5](https://web.mit.edu/ngh/www/PhysFluids_18_111301.pdf)
uses viscosity mean free path

`lambda_mu = (mu/p)*sqrt(pi*R_specific*T/2)`.

The classical Smoluchowski approximation gives the jump distance

`b_T = ((2-alpha)/alpha)*(2*gamma/(gamma+1))*lambda_mu/Pr`.

The gas-side temperature is the extrapolated **outer hydrodynamic**
temperature, not the true kinetic temperature inside the Knudsen layer.
The paper identifies the classical diffuse-wall coefficient as approximate;
its hard-sphere result differs. It also requires transient evolution slow
relative to molecular relaxation and identifies wall-curvature corrections
as higher order in Kn. These results do not establish helium-specific
accuracy for an actual surface.

Let the normal `n` point outward from gas into solid. Then positive outward
heat flux and the Robin relation are

`q_out = -k_g*dT/dn = (k_g/b_T)*(T_g,outer - T_wall)`.

Thus a hot gas must cool and the wall must gain exactly the same heat.
Finite-volume implementation must include the gas center-to-boundary and
solid boundary-to-center resistances in series with `b_T/(k_g*A)`.
The two material control volumes must share **one** interface heat flux;
separate evaluations can break energy conservation. For a cylindrical
center-to-face layer, the exact constant-k resistance is
`ln(r_face/r_center)/(2*pi*L*k)`, with its appropriate orientation. A
radial center at zero cannot be used in this logarithm; the axis is an
insulating symmetry face.

For monatomic `gamma=5/3`, `Pr=2/3`, this approximation has
`b_T=1.875*lambda_mu*(2-alpha)/alpha`. Substituting the definitions gives

`h_jump = k_g/b_T = 4*k_B*Gamma*alpha/(2-alpha)`

when `k_g=mu*c_p/Pr` and `Gamma=n*sqrt(k_B*T/(2*pi*m))`.
This algebra is an independent dimensional check. It is **not** the v56
single-incident-Maxwellian relation `2*alpha*k_B*Gamma`. The continuum
jump relation includes a non-equilibrium incoming distribution; the
v56 diagnostic assumes a stationary incident Maxwellian. Capping the
continuum Robin coefficient by that different reference would silently
change the boundary model. Conversely, applying the continuum jump law
to arbitrary high-Kn states is unjustified.

`alpha=0` means thermally reflecting/adiabatic in this thermal-only model:
zero interface heat flux, implemented without dividing by zero. At
`alpha=1`, the jump distance remains finite at finite mean free path;
full thermal accommodation does not remove the Knudsen layer. For fixed
positive alpha, the continuum limit is approached as `lambda/L -> 0`.
Thermal accommodation must not be reused as a tangential momentum
coefficient or a recombination probability.

## Surface data that can and cannot support a reference

[Trott et al2011, DOI10.1063/1.3571269](https://doi.org/10.1063/1.3571269)
measured gas/surface accommodation through heat-flow experiments.
The authors' [Sandia presentation](https://www.osti.gov/servlets/purl/1706516)
reports helium on 304 stainless steel with 303K and 293K plates and a
10mm gap: top/bottom coefficients 0.469/0.464. The paper's TableI gives
approximately0.46 for machined untreated 304SS near298K, with repeatability
around0.02. Plasma treatment and other surface preparations change the
coefficient. A conditional near-ambient He/304SS calculation with
`alpha=0.46`, sensitivities0.44/0.48 and explicit surface preparation is
therefore evidence-informed. It is not a reproduction of their experiment
unless its geometry and measured heat flux are also matched.

[He/tungsten1974 measurements](https://doi.org/10.1016/0039-6028(74)90166-6)
report approximately0.018 for gas near300K and a specific tungsten wire
between1073K and1785K at pressures of order1e-3torr. Those conditions do
not calibrate near-isothermal tungsten at500K, rotating lithium or an
arbitrary machined/oxidized wall. No measured Li/W accommodation is
established in the present evidence. A tungsten alpha sweep must remain
a scenario parameter, never a fitted/material-default claim.

## Solid properties near ambient temperature

[NIST304SS material page](https://trc.nist.gov/cryogenics/materials/304Stainless/304Stainless_rev.htm)
provides log-polynomial k and Cp fits for4–300K data, with reported
fit deviations of2% and5% respectively. It does not authorize a
temperature-dependent extrapolation above300K. Evaluating the300K
constants and explicitly freezing them for a very small near300K
verification excursion is a constant-property approximation, not a claim
of higher-temperature data coverage.

[NASA AmesTPSX304SS](https://tpsx.arc.nasa.gov/Material?id=57)
alternatively records standard-condition density7900kg/m3, conductivity
14.9W/(mK) and Cp477J/(kgK). Its listed uncertainty and individual property
source are unknown; the general reference is Incropera/DeWitt1990.
The [specific-heat table](https://tpsx.arc.nasa.gov/MaterialProperty?id=57&property=9)
has a300K anchor. These are attributed engineering data, not specimen
measurements or uncertainty-free calibration.

## Gas pressure-work invariant

Resolving temperature while holding every gas cell's number density
fixed is not a spatial model of an otherwise free, quiescent gas:
temperature gradients create pressure gradients and induce motion.
Uniform pressure may instead be a controlled low-Mach approximation.
The material-volume energy equation for a monatomic gas is

`(3/2)*N_i*k_B*dT_i = dQ_i - p*dV_i`.

With fixed particles in each material shell and a common pressure,
`p*V_i=N_i*k_B*T_i`, and hence

`(5/2)*N_i*k_B*Tdot_i = Qdot_i + V_i*pdot`.

For a fixed total cavity volume, summing material volumes determines
the common pressure. Summing cell energy must recover
`d[(3/2)*sum(N_i*k_B*T_i)]/dt = sum(Qdot_external)`; internal face fluxes
and pressure work cancel. Shell interfaces move as temperature changes,
while particles remain fixed per shell. This is the appropriate
bookkeeping for the parent's proposed Lagrangian low-Mach reference.
Finite-step pressure work must use a consistent discrete form; multiplying
independently sampled p and dV can create a residual even when the
differential equations conserve energy.

An independent small-amplitude limit is useful for qualification. Let
`T=T0+theta` about an initially uniform state and let volume mean be
denoted `< >`. Fixed total N and volume imply
`p'=n0*k_B*<theta>`. To first order,

`(5/2)*n0*k_B*thetadot - n0*k_B*<thetadot> = k_g*Laplacian(theta)`.

Nonuniform modes therefore have Cp heat capacity, while the uniform
mode has Cv. Neither a pure Cp heat equation nor a pure Cv frozen-density
heat equation satisfies both limits. Advection of theta is second order
about uniform stationary T0; this does not justify omitting advection for
finite excursions, rotation or separation.

## Independent validation requirements

The narrow reference should demonstrate:

- Zero flux and exactly stationary equal-temperature gas/solid equilibrium.
- Alpha0 thermal isolation, finite alpha1 jump, and correct hot/cold signs.
- Exact fixed total gas N and volume, shell positivity and shared flux.
- Total gas-plus-solid energy conservation and pressure-work cancellation.
- Joint space/time refinement with resolved early-time boundary layers;
  tiny energy residual alone is not a temperature convergence gate.
- An independent analytical/spectral or separately coded comparison in
  the linear limit above, including the uniform Cv/nonuniform Cp limits.
- Physical-time forcing slow relative to both acoustic and kinetic scales;
  changing numerical timestep cannot cure an invalid low-Mach model.
- Local thermal-gradient Kn diagnostics using evolved T and density.
  Mathematical mesh refinement is not physical Knudsen-layer resolution.
- Explicitly conditional accommodation/data domains; no promotion to
  calibrated Marathon, multicomponent, plasma or reactive-wall behavior.

The reviewer independently authored
`scientific/gas-energy-v57/audit-eigenmode.py`. It imports neither the
new solver nor FiPy. With alpha0, the mean-zero radial Neumann eigenmode
is `J0(zeta1*r/R)`, where `J1(zeta1)=0`. Its decay rate is
`s=k_g*zeta1^2/(Cp_volume*R^2)`, with
`Cp_volume=5*p_reference/(2*T_reference)`. It uses exact annular averages
on the original particle labels and checks every accepted time. The
prespecified gates are decreasing joint16/32/64 error, finest weighted
RMS error divided by the0.001K initial mode coefficient below1%, and a
wrong-Cv decay control at least10times farther from the solution. This
qualifies a small-amplitude insulated mode, not the accommodation law,
finite-amplitude solution or physical gas/surface data.

## Preliminary implementation review

Read `scientific/gas-energy-v57/model.py` as implemented during this task.
The gas shell unknowns preserve particle number and reconstruct common
pressure from total `sum(N_i*T_i)`. Its finite-step work uses
`p_new*(V_new-V_old)`. The exact algebraic identity

`p_new*DeltaV_i = N_i*k_B*DeltaT_i - V_old_i*Deltap`

confirms that the assembled Cp diagonal minus pressure rank-one term is
consistent with the actual Cv-plus-work acceptance residual. Because
the cavity volume is fixed, the shell work cancels globally. Interface
heat enters adjacent gas/solid residuals with opposite signs. The
classical jump distance and cylindrical series resistances have the
correct dimensions and signs; no v56 incident-Maxwellian cap was inserted.

The reviewer flagged one implementation domain edge: a forward1e-5K
enthalpy probe for tungsten capacity would leave the permitted property
interval when starting at1900K. Analytic Cp, rather than expanding the
material interval or silently clamping temperatures, is the appropriate
root-cause correction. A subsequent source read confirms `solid_cp`
now evaluates the analytic property inside its actual domain. This source
observation is not an executed regression result; final correction/test
evidence belongs to the parent.

The reviewer also requested thermal-gradient Kn in addition to
radius-based Kn and a physical startup/forcing qualification, so a
converged large-temperature-step solve is not implicitly admitted into
the low-Mach/linear-jump domain. A subsequent source read confirms these
diagnostics were added, including face-velocity Mach and acoustic/stress
time-rate quantities. Their outputs still require numerical inspection.

The inventory parameters deserve explicit interpretation: `pressurePa`
and `referenceK` define total initial particles. A non-reference initial
temperature therefore produces a different actual initial pressure.
For example, `pressurePa=1000Pa`, `referenceK=500K`, initially uniform
800K gives1600Pa. This is consistent fixed-inventory bookkeeping, but
reports should use the reconstructed state pressure rather than calling
the inventory-reference pressure the actual initial pressure.

## Executed evidence reviewed

The reviewer inspected the parent's actual safe-dev logs and receipts for
`gas57-eigen`, `gas57-independent`, `gas57-rejections` and
`gas57-findings`. The eigenmode receipt records exit0,601source inputs,
snapshotSHA256
`3a47f5af69f015415145a6abf3e25d9abdb0ce6d4c175afd578c80ab964e6a08`,
with source verified before/after execution. The common compressed
resultsSHA256 recorded by both independent auditors is
`82990136e36adadbc8ed812826ff95ee18e749a1f034736a21491fcee4d0bb85`.

The independently authored eigenmode audit passed:

| Gas cells / steps | Worst RMS error / initial0.001K coefficient |
| --- | ---: |
|16 /80|0.000745822333|
|32 /160|0.000246340541|
|64 /320|0.0000980312323|

The finest error is0.009803% of the initial coefficient, below the
prespecified1% gate and contracting. The incorrect pure-Cv diffusion
prediction differs by6.67684% of that coefficient on the finest case,
approximately681times more than the correct Cp prediction. Maximum
particle-weighted mean-temperature error across these three cases is
1.71e-13K. This is numerical evidence for pressure-work/Cp transport in
the stated insulated linear limit, not accommodation calibration.

The all-state thermodynamic audit passed its recorded cases; the four
deliberate controls were rejected: removed interface heat, corrupted
shell work/volume, negative particle number and spurious Cp storage
energy. The FiPy small-amplitude comparison error falls approximately
quadratically with perturbation amplitude, consistent with comparison
against a linearized reference:2.83e-6K,2.83e-8K,2.83e-10K for0.1K,
0.01K,0.001K inputs respectively. This is the expected model-limit test,
not evidence of exact finite-amplitude equivalence.

Important retained failure: the large800K/500K trajectory's endpoint
refinement gates pass, but its **all-common-time** profiles do not.
Finest joint and temporal pairs differ by55.0K and17.0K respectively;
early surface/power values are also unresolved. Endpoint agreement
cannot qualify the entire transient. Its finest sampled acoustic-time
rate is0.113 and thermal-gradient Kn is0.0129; the small radius Kn does
not independently settle the startup validity question.

The near-ambient He/304SS conditional scenario has sampled maxMach
1.39e-6, radiusKn1.64e-4 and thermal-gradientKn3.28e-6. These necessary
screens are not excluded. However, its supplied alpha remains
surface-specific evidence transferred to a new geometry and its solid
properties are constant approximations. The10Pa helium sensitivity has
radiusKn0.0302 and remains outside the strict continuum screen. The Li
proxy still has no established accommodation and remains unqualified.

## Final smooth-profile qualification and evidence closeout

The preceding review records the earlier campaign and its retained step
failure. I subsequently inspected the final durable export under
`scientific/centrifuge-v44/gas57/`, including `studies/summary.json`,
`resolved-summary.json`, `audit-resolved.json`, `audit-eigenmode.json`,
`negative-controls.json`, the final receipt and test logs. No additional
scientific execution was performed by this reviewer. A trusted
standard-library, read-only integrity check verified all52payload hashes,
with no mismatches. Export-manifestSHA256 is
`df70ba558f11b2ff698577d46230bdd5d68f6fabef94e48c5c1e81291b087b8d`.

The final smooth initial condition is a separate problem from the
incompatible800K/500K step. Its exact shell averages follow
`T=500+300*(1-a)^2`, with `a` the reference enclosed-particle fraction.
It has compatible zero wall slope and is not substituted for the retained
failed step case. Its finest run has512gas cells,128wall cells and
5120steps over0.08s. The controlled comparisons show:

| Controlled change | Maximum profile difference | Maximum power difference / finer-run peak |
| --- | ---: | ---: |
|512gas/128wall:2560→5120steps|0.031630K|0.79818%|
|256gas/64wall→512gas/128wall, both5120steps|0.180922K|0.60404%|

The final timestep, joint gas/wall spatial, surface-temperature,
pressure and integrated-exchange screens pass for this smooth reference.
The additional256gas/64wall pure-time control2560→5120steps passes
with0.031628K profile difference and0.77422% peak-normalized power
difference. The fixed-gas wall-only64→128cells control changes peak-
normalized power by1.50e-7, isolating the earlier error from wall resolution.

Power is explicitly normalized by the finer trajectory's maximum absolute
power, avoiding a nearly zero instantaneous denominator at startup.
This is an observable-specific absolute error budget expressed relative
to peak power. It does not establish1% **pointwise relative** accuracy
when the true instantaneous flux is tiny. Earlier coarse joint screens
and their large near-startup relative values remain recorded. The
normalization and changed initial condition must remain visible rather
than being described as a pass of the original step-transient gate.

The independent all-state audit passes all four resolved control runs.
For `resolved-space-time`, maximum gas-row first-law residual is
2.70e-14J and cumulative total-energy residual magnitude is1.37e-10J;
particle and volume identities and entropy checks pass. Its sampled
maxMach is2.58e-4, thermal-gradientKn2.54e-4 and acoustic-time rate0.00142.
These are compatible with the stated necessary screens and do not
constitute empirical gas/surface validation.

The final eigenmode audit retains the same numerical values above and
binds to final base-resultsSHA256
`91755ba914e0df83a0c7472fa59429a24785149b177a5d7c426137618c4326cb`.
The resolved all-state audit separately binds to resultsSHA256
`9a25a776d469bf4e2ae0cca4d23f0c013a619309371d1ae23ad9ee1f618aadd4`.
All four deliberate corrupted controls are still independently rejected.

Final receipt records605source inputs with SHA256
`b1aaf70edc67986d7209bf43926a7045488317682fdbcbd3cbd697f8dbe7d2d9`
and13exit-zero commands, source verified before/after every command:
1,139application tests,16v56 regressions,15v57physical/domain regressions,
3geometry regressions, typecheck, build, site/assets checks, two worker
release checks, collision-data check, Python compile check and resolved
report regression. The151file release hash remains unchanged;
`browserVerified=false` and `calibratedMarathonDevice=false`.

## Final verdict

No remaining boundary formula/sign or pressure-work ownership blocker
was found in the source and evidence reviewed. The narrow linear gas
transport, thermodynamic checks and the specified resolved smooth-profile
numerical refinement screens pass. Accommodation is represented
by an attributed, explicit approximate boundary model; it is not newly
measured or a universal material property. The large-step transient's
all-time refinement failure and physical assumption limits must remain
visible. No full rotor/plasma model, Li/W calibration, empirical
gas/surface qualification or general finite-amplitude trajectory
qualification is granted by this review.
