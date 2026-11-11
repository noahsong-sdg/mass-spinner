# Marathon stopping, loading and thermal audit v31

8 November 2026. **No new demonstrated production defect in the reviewed
stopping/loading/exposure path.** Three new independent regressions and 37
adjacent tests pass; strict source typecheck passes. These are numerical checks
of reduced equations, not measurements or a calibrated Marathon reactor model.

## Actual execution paths

`fusion-ui.js` constructs the source config and calls `simulateFusionBeam`.
Material mode advances `dE/dN_formula = -S(E)` with fixed-slab RK4. Reaction
hazards use the slab midpoint energy; within each slab, exponential attenuation
and energy event integrals account for transmitted/reaction/stopping power.
`unitLoadingOpticalDepth` integrates the hazard at full fixed-site loading.

`target-loading-ui.js` feeds this depth, site inventory, current and illuminated
area to `simulateTargetLoading`. Its independent dose coordinate is incident
deuterons per site. The coupled Dormand–Prince method integrates positive
log-survival variables and separate scaled reaction ledgers. The zero-replacement
and zero-hazard branches are analytic. Replacement is a scenario input, not a
measured trapping model. A second tolerance run checks numerical sensitivity.

`target-exposure-ui.js` feeds the **initial frozen source's** conditional assembly
heat to `simulateTargetExposure`. This exact one-node constant-coefficient
response includes beam shutoff and cooldown. It does not feed temperature back
into loading, stopping or the neutron source. The assumption is disclosed in
returned data and UI model information. A temperature trace must not be read as
a solved LiT surface temperature or target-lifetime prediction.

## Independent falsification checks

### Loading: eliminate time rather than reuse the six-state ODE

For tritium-site fraction f and dimensionless dose u, the physical equation is

`df/du = -(1-exp(-tau*f)) - eta*f*exp(-tau*f)`.

Set `x = log(f0/f)` and independently integrate

`du/dx = 1 / [tau*phi(tau*f) + eta*exp(-tau*f)]`,

with `phi(z)=(1-exp(-z))/z`. Bisection determines the x corresponding to the
requested dose. Separate scalar quadratures recover fused T and replacement
hazard; D and vacancies follow from the remaining site inventory. This reference
does not import the production RK tableau, transformed six-state derivative,
adaptive controller or event-ledger helpers.

Four off-grid `(tau,eta,f0,dose)` cases are `(0.03,0.3,0.93,3.7)`,
`(2.4,0.02,0.18,0.7)`, `(11,0.94,0.87,1.4)` and `(0.4,0.001,0.37,19)`.
Independent Simpson 4096→8192 refinement clears a prospective 1e-10 relative
plus 2e-12 absolute sensitivity check. All production population/event comparisons
clear 2e-9 relative plus 3e-11 absolute. The largest fused-T absolute discrepancy
is approximately **1.07e-12 per site**. Reported scaled conservation residuals
reach approximately **1.07e-12** in these cases. The attempted hypothesis that
unequal channel scales bias the coupled solution is rejected for these cases.
This does not give a rigorous error bound over every admissible input.

### Material slab: invert the independent coordinate

Instead of advancing another energy-in-depth trajectory, independently integrate

`N_formula = integral(Eexit,E0) dE/S(E)` and
`tau_unit = integral(Eexit,E0) sigma_DT(0.6E)/S(E) dE`.

These use production S(E) and sigma(E), so they check **trajectory/quadrature
consistency**, not an independent validation of either physical dataset.
Simpson 32768→65536 is checked before comparing source results.

| Incident E, keV | Fixed formula-unit column, m^-2 | Exit E, keV | Relative column residual | Relative hazard error, 3200 slabs |
| --- | --- | --- | --- | --- |
| 20 | 2e21 | 18.3277067951 | 2.58e-14 | 2.45e-10 |
| 100 | 4e22 | 46.4809376569 | -7.51e-12 | 5.66e-9 |
| 500 | 1e23 | 396.891424169 | 3.20e-14 | 4.73e-10 |

Full tritium loading is not silently substituted: actual T column is 0.37 of
the material-site column, and actual optical depth is separately checked against
0.37 times the full-site integral. Refining 100→3200 slabs reduces the hazard
error by approximately 1024 in each case, as expected for midpoint integration.
Thus RK4 energy evolution does **not** make the complete yield quadrature fourth
order. No hidden fit or rate adjustment was introduced.

The hypothesis that the independent fixed stopping matrix is accidentally
scaled down by partial T loading is rejected. Treating its composition as fixed
is an explicit physical approximation, not validated LiT/D composition feedback.

### Alpha heat: test the actual coupling between models

Changing deposited-alpha fraction 0→1 leaves source fusion probability and
neutron rate identical, increases target/assembly heat by the alpha product
power, and increases deposited pulse energy by that power times exposure. The
thermal endpoint difference agrees with the independently derived exact
constant-power response. This tests the source-to-thermal coupling, not just
an internal residual equal to zero.

Adjacent tests independently cover direct physical-population RK4, opaque
fusion-only survivors, exact final exposure, zero hazard/dose/fuel, temperature
and signed-coolant energy, current/area conventions, stopping units and fit-domain
rejection. Existing frozen high-dose convergence studies remain unchanged.

## Primary-source checks and remaining realism limits

The freshly reopened [Marathon architecture](https://www.marathonfusion.com/beam-driven-fusion/)
supports an RF deuterium ion source, electrostatic acceleration and a solid LiT
target on a cooled substrate. It supplies no operating point, calibrated LiT
retention law, thermal coefficients or stopping table used to validate these
scenario inputs. The simulator represents that public architecture conceptually.

The pinned [Geant4 electronic model](https://raw.githubusercontent.com/Geant4/geant4/b4a16de652ec244f7a0ecc0a5cacfee21930bf75/source/processes/electromagnetic/standard/src/G4BraggModel.cc)
and [mean nuclear model](https://raw.githubusercontent.com/Geant4/geant4/b4a16de652ec244f7a0ecc0a5cacfee21930bf75/source/processes/electromagnetic/standard/src/G4ICRU49NuclearStoppingModel.cc)
were reopened. The nuclear reduced-energy relation, descending table interpolation
and eV/(10^15 atoms/cm^2) conversion are consistent with the adaptation's declared
mass-number and atomic-Bragg conventions. Existing compiled-upstream fixtures
also pass. This is **not a Geant4 transport run**, nor a sourced LiT compound or
straggling correction. Lower-energy domain rejection remains explicit.

The important unqualified physics remains the same: no calibrated implantation,
isotope exchange, diffusion/permeation, sputtering, target renewal, evolving
stopping chemistry, contact resistance, spatial conduction, hot spots, phase
changes or temperature-dependent reaction/loading feedback. The fixed-site model
cannot establish target lifetime, neutron output of a real Marathon machine, or
net power. These are disclosed model limits rather than new implementation bugs.

The nuclear reviewer separately owns product kinematics, blanket and energy-scan
presentation; any confirmed scan-domain defect is outside this module ownership.

## Exact verification and provenance

Distinct copied Apple safe-dev stage `/tmp/mass-spinner-audit31-marathon`, guest
`safe-dev-f9210fa926a3a151`. Initial package download used online
`npm ci --ignore-scripts`; after adding the new test, an explicit source sync and
offline reinstall preceded execution. No host project code, home/credential
mount, control socket, sandbox weakening or browser-policy workaround was used.
The initial guest had no unique scientific outputs before replacement.

Commands prefixed by `safe-dev -C /tmp/mass-spinner-audit31-marathon`:

```
init
run --online -- npm ci --ignore-scripts
sync --replace-guest
run -- npm ci --offline --ignore-scripts
run -- sh -c './node_modules/.bin/tsx --test tests/audit31-marathon.test.ts tests/adversarial-marathon-solvers-v29.test.ts tests/target-loading.test.ts tests/target-exposure-audit.test.ts tests/deuteron-stopping.test.ts tests/fusion-reactor.test.ts > audit31-marathon-tests.log 2>&1; status=$?; tail -12 audit31-marathon-tests.log; exit "$status"'
run -- sh -c './node_modules/.bin/tsc --noEmit > audit31-marathon-typecheck.log 2>&1; status=$?; cat audit31-marathon-typecheck.log; exit "$status"'
export /tmp/mass-spinner-audit31-marathon-final-export
```

The first export was checked against canonical modules before sealing. A concurrent
nuclear-review change introduced the typed cross-section domain error in
`fusion-reactor.ts`; its numeric kernel was unchanged. That source difference was
not silently accepted as the tested version. The first snapshot/logs remain in
`pre-rebase/`. Source was explicitly resynchronized after its export, dependencies
reinstalled offline and the same 40 tests plus typecheck rerun. The final export is
`/tmp/mass-spinner-audit31-marathon-rebased-final-export`.

**Final rebased gate: 40/40 tests pass, zero failed or skipped, 1.841 s test
duration; strict source typecheck exits zero.** No production code changed by this reviewer. The tested
map, exact new and neighbor test sources, runtime modules, fixture, lock, logs
and extracted diagnostics are retained under
`scientific/physics-audit-v31/marathon/`, with a final artifact hash manifest.
The parent owns final merged source/build and publication verification.
