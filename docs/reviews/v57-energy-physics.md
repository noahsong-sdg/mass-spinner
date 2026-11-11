# Independent spatial gas-energy physics review

## Scope and evidence

This review independently checks the proposed pure-monatomic, nonrotating,
radial low-Mach gas/solid reference. It is separate from solver authorship.
It initially inspected `docs/GAS-REGIME-V56.md`, the actual-FiPy reference
`scientific/thermal-v53/reference-fipy.py`, and the existing independent
wall-energy audit `scientific/thermal-v55/audit-physics.py`. Execution and
raw-result checks are recorded below when available. No project code was
executed on the host by this reviewer.

The primary low-Mach basis is the [Nalu derivation, section 1](https://nalu.readthedocs.io/en/stable/source/theory/lowMachNumberDerivation.html).
It retains spatially uniform, time-dependent thermodynamic pressure in the
ideal-gas state law and its time derivative in the enthalpy equation. The
[NIST FDS mathematical model, section 2.4](https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.1018e6.pdf)
also retains that pressure work. These establish the governing closure,
not this apparatus's validity or this numerical implementation's accuracy.

## Root cause addressed

Spatial diffusion with fixed cell density and only `Cv*dT/dt` is not a
freely mobile quiescent gas model: nonuniform temperature creates a
nonuniform ideal-gas pressure, which drives motion. Merely replacing Cv
with Cp is also incorrect for a closed rigid cylinder because it loses
the mean-mode pressure response and gives the wrong total heat capacity.
In simple terms, heating rearranges the gas; the work involved must be
accounted for even if the sound waves are filtered out.

The proposed moving-shell formulation addresses this particular gap
without requiring a new compressible acoustics solver. It is appropriate
only for the stated one-dimensional, low-Mach, negligible-body-force
reference, not for the rotating multicomponent live simulator.

## Independent thermodynamic derivation

Each material shell has fixed particle number `Ni`. For monatomic ideal
gas, `Cv_i=3*Ni*kB/2` and `Cp_i=5*Ni*kB/2`. At each accepted state:

```
p = kB * sum(Ni*Ti) / Vtotal
Vi = Ni*kB*Ti/p
r_face,j = sqrt(sum_i<j(Vi)/(pi*L))
```

The center face remains zero, the outer gas face stays at the rigid
cylinder radius, every shell has positive volume, and total number is
unchanged. Mean pressure may evolve; it must not be held at its initial
value. Material-shell expansion is transport, not a new heat source.

For a backward-Euler step, the proposed row equation is

```
Cv_i*(Ti_new-Ti_old) + p_new*(Vi_new-Vi_old)
    = dt*(Qin_new-Qout_new) + Esource_i
```

Using the ideal-gas law at both endpoints, its left side is identically

```
Cp_i*(Ti_new-Ti_old) - Vi_old*(p_new-p_old).
```

This is an exact algebraic identity for the stated discrete scheme, not
a replacement of pressure work by an approximate fitted capacity. Since
the outer volume is fixed, summing the `p_new*dVi` terms gives zero.
Consequently, global gas internal energy is `sum(Cv_i*Ti)`, and a shared
gas/solid interface heat transfer cancels exactly in the combined budget.
The pressure-work discretization remains first order in time and needs
timestep refinement; conservation alone does not establish its accuracy.

## Entropy, positivity and boundary invariants

For a material ideal-gas shell, changes in entropy are

```
dSi = Ni*kB * [1.5*ln(Ti_new/Ti_old) + ln(Vi_new/Vi_old)].
```

Using only `Cv*ln(Tnew/Told)` omits the volume contribution and is wrong
for this model. Concavity of ideal-gas entropy gives the discrete lower
bound `dSi >= [dUi+p_new*dVi]/Ti_new`. For a passive face heat flux from
hot to cold, summing `Q*(1/Tcold-1/Thot)` is nonnegative. Include wall
entropy and, if used, bath entropy `Qbath/Tbath` in the closed budget.
The numerical entropy test must use the actual accepted row energies,
not the solver's claimed residual or a fixed-density entropy formula.

Require positive finite temperatures, particle numbers, pressure,
conductivity, capacities and strictly ordered radii. Accommodation is a
separate boundary parameter, not momentum accommodation or an ion-neutral
collision rate. A single shared interface flux must appear with opposite
signs in gas and solid rows. No surface slip/friction heat is added in
this nonrotating reference. Zero accommodation must give exactly zero
interface heat transfer rather than a small artificial conductance.

## Independent limiting solutions and proposed gates

1. **Uniform isolated state:** equal gas/wall temperatures remain equal,
   with fixed pressure, geometry, inventories and zero flux.
2. **Uniform isolated heating:** when all gas shells receive equal
   energy per particle, they stay uniform. `dT=Etotal/(1.5*N*kB)` and
   `pnew/pold=Tnew/Told`; the correct global capacity is Cv.
3. **Insulated Bessel mode:** linearize about uniform `T0,p0`, set
   gas/solid transfer to zero, and use a small perturbation proportional
   to `J0(zeta*r/R)` where `J1(zeta)=0`. Its volume average vanishes.
   The analytic decay rate is `k*zeta^2/(n*cp*R^2)`, involving Cp, not Cv.
   Compare cell-average Bessel values; separately reduce perturbation
   amplitude so finite-amplitude error is not confused with grid error.
4. **FiPy small-amplitude limit:** linearized closed-gas storage is
   `n*cp*dtheta/dt - n*kB*d<theta>V/dt`, not independent Cp cells.
   The corresponding mass matrix is
   `Mij=n*cp*Vi*delta_ij - n*kB*Vi*Vj/Vtotal`. It is positive definite:
   the uniform mode has Cv storage and all mean-zero modes Cp storage.
   An independent FiPy solve may treat the uniform pressure derivative
   as a globally iterated source. Compare under amplitude, spatial and
   temporal refinement; large-amplitude disagreement is expected.
5. **Combined passive equilibration:** for insulated gas plus solid,
   total internal energy fixes the final common temperature. Use the
   integral of temperature-dependent solid Cp, not `Cp(T)*T`. Interface
   exchange must cancel to the numerical solve tolerance at every step.
6. **Gas/solid refinement:** refine gas cells, wall cells and timestep
   independently, then jointly. Compare gas volume/number mean T,
   center-to-wall contrast, pressure, cumulative heat and wall surface T.
   A stable integral energy budget cannot substitute for field convergence.

Each gate must distinguish an exact invariant, discretization convergence,
and physical-regime screen. Neither the NIST transport source nor a FiPy
agreement qualifies an unknown gas/surface accommodation coefficient.

## Physical-regime limits

The shell-face velocity is `(rface_new-rface_old)/dt`; assess its Mach
number against local monatomic sound speed. Pressure communication must
also be fast compared with the imposed thermal forcing, including the
initial boundary transient. Small velocity alone does not guarantee this
when a wall temperature is changed impulsively. Mean-free-path/geometry
and thermal-gradient lengths need explicit checks; cells thinner than a
mean free path are a numerical resolution choice, not independently
resolved kinetic physics. Temperature jump can require an appreciable
length for small accommodation, even when the radius-based Kn is small.

No centrifugal work, species diffusion enthalpy, ion energy, chemistry,
evaporation, condensation, axial/endcap heat flow, gravity-driven
convection or dynamic-pressure feedback is included by this reference.
Existing continuum data and a justified kinetic boundary *form* do not
supply missing device-specific boundary data. A pass here should support
the next controlled integration step, not a calibrated Marathon claim.

## Executed evidence and final verdict

Parent-owned safe-dev execution of campaigns 3/5 and independent checks
has been inspected in the actual host-exported controller receipts/logs.
The final release gate and durable raw-export integrity are also inspected
below.

- `gas57-independent` exited zero on 601 hash-verified inputs; snapshot
  `ae7576d206d34f638f64e061ca37be719541b7ff7f3577318176f8dc7276ce0b`.
  Its independent script SHA was
  `fa6dcbeacd3ed2c969fa99b37ba2fe11046ca1d5ca5ee4d70ef2302de7b49f80`,
  binding raw compressed results SHA
  `82990136e36adadbc8ed812826ff95ee18e749a1f034736a21491fcee4d0bb85`.
- All four deliberate record-corruption controls were rejected. The
  fictitious Cp-minus-Cv storage source failed the row-energy budget by
  more than nine orders of magnitude.
- The 0.001 K linear case's independently reconstructed maximum gas-row
  residual was `1.92314e-14 J`, solid-row residual `1.13527e-11 J` and
  cumulative energy error `1.18011e-11 J`. The larger wall's heat capacity
  does not hide the separate gas-row errors. A cumulative roundoff budget
  is an error allowance, not the observed error or a convergence estimate.
- Actual FiPy differences contracted from `2.83432e-6 K` at 0.1 K amplitude
  to `2.83421e-10 K` at 0.001 K amplitude. This is the expected small-signal
  agreement, not a finite-amplitude independent reference.
- The independently authored Bessel checker reported normalized RMS errors
  `7.45822e-4`, `2.46341e-4`, `9.80312e-5` for 16/32/64 cells with joint
  time refinement. The wrong Cv decay gave approximately `0.06677` at
  the finest level, clearly distinguishable from the correct Cp mode.

**Important retained failure:** endpoint refinement at 80 ms passes the
one-percent gates, but the initial 800 K gas / 500 K wall contact is not
resolved across the whole transient. Joint 32-to-64 refinement gives a
maximum common-time profile difference of 55.0 K and pointwise power
difference of 44.6%; time refinement 160-to-320 gives 17.0 K and 26.5%.
The coarser joint run also has an acoustic-rate screen of 0.02096.
Conservation, endpoint agreement and a small velocity Mach number do not
qualify that startup. This review requested all-common-time comparisons
and initial-state gradient screening so this failure could not be hidden
by endpoint-only metrics.

The parent is retaining that abrupt-start failure and testing a separate
smooth-start finite-amplitude profile. Its initial gas temperature is
`500+300*(1-a)^2 K`, with `a` the reference enclosed-particle fraction;
shell-averaged initialization preserves the profile definition. The gas
wall value and derivative initially match the uniform 500 K solid and
zero interface flux. This is a different physically compatible reference,
not a fix or relabeling of the unresolved abrupt-contact transient.

The independent audit script is
`scientific/gas-energy-v57/audit-independent.py`. It imports neither the
nonlinear model, its properties nor FiPy, and reconstructs every accepted
state rather than trusting emitted residuals. It separately reconstructs
the exact NIST helium anchors, the declared lithium fit, solid enthalpy
and entropy, logarithmic shell resistances, jump/half-cell series
resistance, every heat flux, moving-shell number/volume/pressure and
reported Kn/Mach/rate screens. Its energy row budget has no one-joule
absolute floor: it separates 128 floating-point epsilons times stored
energy from `2e-10` times the actual exchanged/work/storage-change energy.
Gas and solid residuals are reported separately so a massive wall cannot
conceal a small gas error. The reduced entropy subtracts source energy
divided by endpoint temperature; it is an algorithmic entropy bound, not
a claim that an unspecified external heat source has that physical entropy.

`scientific/gas-energy-v57/reject-tamper.py` deliberately removes shared
interface heat, changes a shell-volume/work geometry, makes a particle
inventory negative and adds fictitious `(Cp-Cv)*dT` source energy. These
must be rejected by the independently reconstructed equations. The last
control is explicitly a corrupted energy record, not a second solver
experiment with a changed equation of state.

Source inspection found one real domain defect: the nonlinear iteration
estimated coincident solid Cp by evaluating enthalpy at `T+1e-5`. At the
valid 1900 K tungsten endpoint, that probe was outside the stated domain.
The parent replaced the finite-difference probe with the exact Cp
polynomial and retained the enthalpy secant for nonzero finite steps.
This is preferable to widening the property domain or reducing valid
temperature limits, because it uses the derivative already specified by
the material model. Parent-owned regression execution preserved the
initial failure and reported 13 passing tests after that correction;
the expanded final suite and raw-output checks are verified below.

The actual-FiPy linear reference was inspected independently. Its
pressure-response solve has the correct `dp/dt` source units and rank-one
feedback sign. Its frozen 500 K coefficients and fixed geometry are only
the small-amplitude limit of the nonlinear moving-shell model. Initial
particle numbers in the nonlinear model are defined from reference
temperature and pressure, so an arbitrary nonuniform initial temperature
also changes the initial thermodynamic pressure and shell radii. The
record must disclose actual initial pressure/geometry rather than
describing the reference pressure as the actual pressure of every case.

## Fine-shell reconstruction defect found during extended refinement

The original independent audit rejected campaign 5 at its pressure-work
identity assertion on a 512-cell refinement. This failure is preserved in
`scientific/fixes-v43/gas57-independent-5.log`. The algebraic identity
error is precisely the difference of the two endpoints' ideal-gas
reconstruction errors. The original budget accounted for roundoff on
cell stored energy but not cancellation in reconstructed shell volume.

Technically, serialized gas radii are cumulative volume square roots.
Reconstructing `Vi=pi*L*(rR-rL)*(rR+rL)` subtracts nearly equal radii.
Its absolute error therefore scales with
`eps*pi*L*(rL^2+rR^2)`, rather than only with the much smaller `eps*Vi`.
Adjacent cumulative sums share their prior accumulated rounding error,
which cancels on differencing; sqrt/square and annulus reconstruction
still retain errors scaled to the face radii. In simple terms, thin-shell
volumes are small differences of large numbers, and the initial audit
treated those differences as more precise than the exported radii allow.

The fix adds a separately identified 16-epsilon geometric volume budget,
propagated through `p*dV`, both endpoint EOS terms and the pressure-form
identity. The original 128-epsilon stored-energy budget and relative
actual-heat allowance remain distinct. No solver, physical equations,
trajectory, mesh, interpolation data or convergence threshold is changed.
This is preferable to a blanket residual-tolerance relaxation: it scales
with the actual cancellation operation and leaves gas energy, real
geometry corruption and thermal convergence checks independent.

The new `tests/test_gas_energy_geometry_v57.py` covers 16 deterministic
512-shell cumulative-sqrt/reconstruction pairs, one actual failing-cell
excerpt from the full 512-cell trajectory and a genuine perturbed edge.
The independent extractor records the case, time, shell index, number,
temperatures, endpoint pressures and adjacent radii, bound to campaign-5
result SHA
`91755ba914e0df83a0c7472fa59429a24785149b177a5d7c426137618c4326cb`.
It requires that the actual old stored-only budget is demonstrably
insufficient, the propagated budget accepts valid roundoff, and a
one-part-per-million edge corruption is rejected. Parent-owned execution
in `gas57-geometry-green.log` reports all three tests passing. The actual
failed excerpt is `smooth-512`, state 973, shell 500, time 0.03040625 s;
the old budget ratio is 1.40034022. The corrected full-trajectory audit
passes with maximum propagated identity ratio 0.0733923 for that case.
Its observed maximum gas-row residual is `2.83905e-14 J`, so the data do
not show a newly introduced large gas-energy error hidden by the fix.

## Extended smooth-start result and independent closure

Campaign 5 contains 30 cases and 9,760 accepted steps. The corrected
all-state audit passes, with script SHA
`1b119e2984832baec76de1a35ce387f4db56be299af1b9a8fdc0f647b5cf1489`
bound to unchanged campaign-5 results SHA
`91755ba914e0df83a0c7472fa59429a24785149b177a5d7c426137618c4326cb`.
Receipt `gas57-independent-5-corrected` records exit zero, 603 verified
source inputs and source snapshot
`c5ac5f3107a67968f955848c27fd175a8917a2ff3d48c1359090f3be9f2f978c`.

An additional four-case pure-time/space/wall refinement set is audited by
the same independent script, bound to raw results SHA
`9a25a776d469bf4e2ae0cca4d23f0c013a619309371d1ae23ad9ee1f618aadd4`.
The `gas57-resolved-independent` receipt records exit zero, 604 verified
source inputs and snapshot
`777ef7cb255af8fc701f179405638e6e5c25557183c659f12b214c51546bded4`.
The 512-gas/128-wall-cell, 5,120-step resolved case has:

| Independently reconstructed quantity | Value |
| --- | ---: |
| Maximum gas-row energy residual | 2.69613e-14 J |
| Maximum solid-row energy residual | 2.02059e-11 J |
| Cumulative combined energy residual | -1.36946e-10 J |
| Minimum reduced entropy increment | 4.58226e-8 J/K |
| Maximum local EOS relative error | 1.28443e-13 |
| Maximum geometry identity budget ratio | 0.0754898 |
| Maximum face-velocity Mach | 0.000258365 |
| Maximum thermal-gradient Kn proxy | 0.000253817 |
| Maximum acoustic-time rate | 0.00141929 |

The independently inspected refinement report compares all common times.
At fixed 512-gas/128-wall mesh, 2,560 to 5,120 steps gives a maximum power
difference of 0.79818% of peak reference power, profile difference
0.0316300 K, surface difference 0.00246474 K and pressure difference
0.00176616%. At fixed fine timestep, 256 to 512 gas cells with accompanying
wall refinement gives 0.60404% peak-normalized power difference and
0.180922 K profile difference. A separate wall-only refinement changes
peak-normalized power by only `1.49752e-7`. These checks support the
stated one-percent smooth-start numerical screen; they do not qualify
the retained abrupt-start case, all possible initial data or the unknown
He/W accommodation value.

**Physics verdict:** no remaining energy/pressure-work, particle inventory,
rigid-volume, passive-flux or entropy blocker was found in the reviewed
reference and executed scopes. The low-Mach, pure-gas, nonrotating model
has a defensible controlled numerical reference, including one resolved
finite-amplitude compatible-start trajectory. Surface accommodation is
still conditional and the abrupt-contact startup remains unresolved.
No live-rotor integration or calibrated Marathon behavior is granted.

## Final required checks

The reviewer inspected `scientific/fixes-v43/gas57-final.receipt.json`
and parsed only the receipt/log fields of its actual JSON execution log.
The final source snapshot contains 605 inputs, SHA
`b1aaf70edc67986d7209bf43926a7045488317682fdbcbd3cbd697f8dbe7d2d9`,
verified before and after every command. All 13 final commands exited zero:

- `npm test`: 1,139 passed, zero failed/cancelled/skipped.
- `npm run typecheck`, `npm run build`, `npm run check:site` and
  `npm run check:assets`: passed.
- Both actual bundled release-worker verifiers: passed.
- Existing collision-data probe and all 16 v56 gas-regime regressions: passed.
- All 15 spatial-gas physics/domain and three geometry regressions: passed.
- New scientific Python compilation and cached controlled-refinement report
  reproduction: passed.

The 151-file release hash remains
`64f89013eb53c7f9a08122f646707a812522fa7df3529fd0e11fcceba07caf7e`.
The receipt correctly leaves browser verification and calibrated Marathon
device flags false. These checks demonstrate tested reference code and
unchanged public build, not production integration of the new model.

## Durable evidence binding

The reviewer independently performed a read-only standard-library
SHA256 manifest check of all 52 payload files under
`scientific/centrifuge-v44/gas57/`. Every payload matches; all exported
`source/` files match the current corresponding host source. Export
manifest SHA is
`df70ba558f11b2ff698577d46230bdd5d68f6fabef94e48c5c1e81291b087b8d`.
The final `studies/` raw main/resolved files have the exact SHA values
bound by their two passing independent audit JSONs above. The exported
negative controls reject all four corruptions and bind the final main
results, rather than an earlier campaign. The final receipt binds the
tested 605-input snapshot and unchanged release hash quoted above.
The earlier 24-case export is separately preserved as
`studies-initial24/`; it is not the final evidence packet.

This review is complete for the stated scientific reference, numerical
tests and provenance. No remaining blocker was found in those scopes.
The physical and integration exclusions in the verdict remain open.
