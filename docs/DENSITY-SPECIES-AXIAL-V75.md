# Evolving density and species: v75

Research backend only. The public playground and experimental qualification
are unchanged. The original protocol and manifest are preserved in
[frozen-source-01](../scientific/mixture-axial-v75/frozen-source-01.tar.gz).
The current code follows the [spatial-convergence revision](SPATIAL-CONVERGENCE-V76.md).

## What changed and why

The v74 current/thermal solve kept each gas cell's mass and composition fixed.
Consequently it could resolve axial shear and endwall heating, but could not
represent material carrying momentum and heat between cells. In everyday terms,
the gas could spin and warm up without redistributing its density or species.

The new backend evolves cell-integrated total mass, both meridional momenta,
angular momentum, total energy and species-1 mass. Density, pressure, gas inertia
and particle heat capacity are recovered from these inventories, then passed to
the existing FiPy/current solve at each step. Binary diffusion carries equal and
opposite species mass fluxes and their associated enthalpy. Radial velocity also
produces azimuthal current, magnetic braking and Joule heat under the existing
prescribed-conductivity, no-Hall Ohm law.

For each cell, the thermodynamic reconstruction is

```
rho = M/V
N = M1/m1 + (M-M1)/m2
I = M <r²>
U = Etotal - (Mr²+Mz²)/(2M) - L²/(2I)
T = U/[(3/2) kB N]
p = (2/3) U/V
```

Thus transporting species changes particle heat capacity, transporting total
mass changes inertia, and pressure work exchanges thermal and kinetic energy
without an extra corrective heat term.

This conservative transport layer keeps the previously checked source solve
and exposes its coupling error to timestep refinement. A reduced incompressible
model would remove the density dynamics requested here; replacing the complete
electrical and thermal backend would discard existing independent verification.
This implementation remains a research model, rather than a replacement for a
general plasma or multicomponent Navier–Stokes code.

## Corrections made while tracing the execution path

- **Angular-momentum and species fluxes:** independently diffusing these
  conserved fields with a Rusanov penalty produced angular transport without
  mass transport. Simply, a stationary rotating gas could lose its rotation
  profile numerically. Both now use the common numerical mass flux and upwind
  specific angular momentum/composition. Tests cover stationary rotation and
  uniform composition under changing density.
- **Time-dependent FiPy storage:** updating only diagnostic density would leave
  the transient coefficient stale. Both the actual angular-inertia coefficient
  and energy-ledger inertia are refreshed from transported mass, together with
  the exact binary particle heat capacity. A reused solver is compared against
  a newly constructed one at the changed density. Refreshing the coefficients
  directly fixes the stored-state mismatch without reconstructing the full
  solver on every step.
- **Species energy flux:** separate donor temperatures created heat transport
  between identical species labels. A common face temperature in the binary
  enthalpy flux preserves that physical invariant. Tests cover identical masses,
  heat-flux sign and local independent reconstruction.
- **Radial moment diagnostic:** an arithmetic radial midpoint biases a
  cylindrical cell's mass centroid. The diagnostic now uses the exact
  volume-mean radius; a uniform cylinder recovers its centroid of 2R/3.
- **Qualification sensitivity:** initial heterogeneity can mask errors in small
  transport increments. Density and composition changes now receive their own
  response-normalized refinement gates, alongside the complete fields. This
  measures the requested dynamics rather than only their initial background.
- **Composite temperature domain:** the inherited thermal source permits
  temperatures above the diffusion correlation's 418 K ceiling. In particular,
  a final source step could return an unsupported state before another
  diffusion step had a chance to reject it. The composite now admits only
  300–418 K at construction, source input/output and accepted split-stage
  boundaries. The independent source audit enforces the same limit. Nonlinear
  trial states retain their actual wider thermal-property domain because no
  diffusion coefficient is evaluated there. This enforces the real model
  boundary without clipping temperatures or breaking the source line search.
- **Saved-output admission:** a wrong but positive initial state or a common
  bias in cached plot values could survive the previous structural checks.
  The new independent checker reconstructs the analytic initial state and all
  14 endpoint observations from the conserved fields, including fresh sparse
  current and viscous graphs. Original producer and later checker hashes are
  recorded separately. This catches shared reporting errors without claiming
  that an endpoint check reruns the intervening trajectory.

## Physical scope

The case is a closed cylinder containing nominal 36 u/40 u neutral species at
350 K, using natural-argon properties as explicit isotope approximations.
It is not lithium, an ionization model, or a published Marathon operating point.
The gas-property intersection is 300–418 K. Electrical conductivity is prescribed;
changing density affects current through velocity and thermal feedback, not a
derived conductivity closure. The sinusoidal wall voltage is a manufactured
distributed boundary condition, not a claim about a continuous metal electrode.
Applying the electrical force and Joule heat to this common heavy-gas fluid
assumes local carrier-to-gas momentum and energy transfer. Neither the carrier
population nor its equilibration time is derived here.

The equations include compressible inviscid meridional flow, azimuthal viscosity,
heat conduction, binary pressure diffusion, species enthalpy, wall heat storage
and electrical work. They omit meridional viscous stresses, Soret/Dufour terms,
electron energy, ionization, Hall current, induction, sheaths and extraction.
Natural-argon self diffusion is an approximation to binary isotope diffusion.
The blocked face flux is consistent and monotone; it is not claimed to integrate
the finite-face Maxwell–Stefan equation exactly or prove global entropy decay.

Hydrodynamic numerical mixing is truncation error, not measured viscous heat.
The implicit source's backward-Euler loss remains a separately recorded
numerical sink. No clipping, inventory renormalization or energy correction is
used to obtain a passing ledger.

In the raw observations, `jouleW` is the r–z electrical solve's Joule power;
`radialMotionalJouleW` is the separate azimuthal-current contribution. Their
sum is the instantaneous total. The magnetic stage integrates its heat
analytically, rather than using endpoint power multiplied by the timestep.

The previous experimental velocity/field-scaling discrepancies remain
unresolved. This extension does not supersede the
[v74 qualification limits](AXIAL-CURRENT-THERMAL-V74.md#physical-limitations).

## Evidence and acceptance

The current run uses independent per-stage reconstructions, local electrical,
momentum and thermal residuals, global conservation ledgers, analytical acoustic
and diffusion controls, and six deliberately corrupted coupled states. Grid,
timestep, radial, axial, solver-tolerance and reference refinements are required
by the protocol. Passing a local ledger alone is insufficient for qualification.

The first full study was frozen before the final composite-domain and output-
admission review corrections. Its original producer hash map is retained. Later
checks must identify their own source snapshot separately; they cannot rewrite
the original provenance or claim to have run before they existed.

### Completed study: not numerically qualified

All 20 trajectories completed: 4448 steps with four independently checked
stages per step, 60 saved endpoints, no producer failures. The analytical
flow controls pass all 24 gates; diffusion controls pass all 14 gates; all six
deliberate coupled corruptions are rejected. Maximum recorded local transport
score is 0.00975 against an admission limit of 1. Maximum independent source
total-energy residual is 6.31e-12 J. These checks establish bookkeeping and
local equation agreement, not spatial accuracy.

The frozen convergence checker correctly returns **unqualified**. Of the 615
series gates, 74 fail: joint 18, spatial 29, radial 19, axial 8, temporal 0.
Separate linear, thermal and combined tolerance repeats pass, as does halving
the finest reference timestep. Doubling reference spatial resolution fails.
All thresholds remain unchanged.

Worst scheduled response-normalized errors comparing 48×48 with 96×96:

| Quantity | RMS | Local maximum / observable |
| --- | ---: | ---: |
| Density change | 2.134% | 16.116% |
| Species-fraction change | 2.005% | 5.653% |
| Gas temperature | 1.686% | 13.775% |
| Endwall torque | — | 22.953% |
| Meridional kinetic energy | — | 4.013% |
| Radial-motional Joule power | — | 4.092% |

The density-change error is small relative to background density but large
relative to the evolution being simulated. It must not be reported as accurate
transport. The reference-timestep comparison is much smaller: maximum 0.0157%
RMS, 0.1127% local error and 0.00675% observable error. Tightening the nonlinear
or linear solver therefore does not resolve the tested spatial discrepancies.

Independent triage identifies two spatial problems and one comparison issue:

1. **Endwall gradient resolution.** Axial coarsening alone produces about 55.6%
   early torque error, whereas radial coarsening with 48 axial cells stays below
   the torque gate. Candidate viscous lengths are 0.5–1.0 mm, versus axial cells
   of 2.92 mm and 1.46 mm at 48 and 96. This supports an unresolved wall-gradient
   explanation. Boundary-compatible initial rotation means a startup layer
   must be diagnosed from actual solutions, not presumed from dimensional
   scaling. Graded axial refinement and an independent wall-gradient control
   are the next defensible tests; a drag multiplier is not a fix.
2. **Radial transport/temperature resolution.** Radial refinement exposes local
   gas and density errors while timestep and source residual checks pass.
   First-order Rusanov mass/energy diffusion is a leading candidate: its
   characteristic coefficient is roughly 0.22→0.11 m²/s on the reference grids,
   compared with the modeled physical diffusivity around 0.03–0.04 m²/s.
   Composition is carried by that numerical mass flux; it does not have an
   independently applied Rusanov species penalty. Hydro-only and source-only
   spatial controls are needed to separate this effect from wall conduction.
3. **Nonnested remapping.** The 36-cell Ω error is already 0.22315% at zero
   evolution, almost the same as at 10 μs; its initial Y error is 0.31874%.
   A manufactured linear `f=z` transfer from 48 to 36 cells incurs 0.24306 mm
   coordinate error, while 48→24 is exact to roundoff. Piecewise-constant
   restriction therefore aliases nonnested grids before dynamics starts.
   A verified higher-order conservative restriction or prospectively nested
   comparison sequence is needed. This finding does not waive the original
   gates or explain away the separate 48→96 failures.

No live backend replacement is justified by these results. Physical no-slip
and accommodation assumptions also remain unvalidated: nominal mean free path
is about 0.115 mm, so bulk continuum plausibility does not qualify submillimeter
wall transport. See the independent source review for the regime calculation.

### Post-review checks and provenance

All 97 Python tests pass on revised-source safe-dev snapshot
`94db638e4d469e3456a8136659fd657504a7ed6a4a229b1c9248340daea7e85f`
(1649 files, 263431048 bytes), including real hot-wall domain rejection and
wrong-initial-state/stale-observation regressions. All 61 adjacent v74 tests,
15 targeted TypeScript current/coupling tests, typecheck, build, site and asset
checks pass. The existing large JavaScript chunk warning remains. Synthetic
same-spatial-grid admission fixtures also emit an undefined observed-order
warning; no frozen-study refinement ratio equals one.

The later independent endpoint check passes all 60 states and all 14 required
observations. Worst reconstructed current and Joule relative differences are
1.15e-12 and 1.73e-12, respectively. It separately records original producer
and later checker identities and explicitly makes no convergence qualification
claim. The revised 32-step pilot passes all stages and produces bitwise-identical
gas and solid fields to the original pilot. The full 4448-step study was not
rerun after the admission-only corrections; it retains its original hashes.

The portable source archive changes packaging only: every original source
digest matches the raw producer map. The first macOS archive also contained
AppleDouble metadata files, correctly rejected as extra source files by the
strict checker; that failed receipt and archive are retained. The portable
archive omits these metadata files instead of weakening source identity checks.

Evidence: [raw study](../scientific/mixture-axial-v75/study-01.json),
[convergence](../scientific/mixture-axial-v75/convergence-01.json),
[negative qualification receipt](../scientific/mixture-axial-v75/receipt-01.json),
[late endpoint admission](../scientific/mixture-axial-v75/supplemental-02.json),
[compact summary and remap diagnostic](../scientific/mixture-axial-v75/summary-01.json),
[figure](../scientific/mixture-axial-v75/verification-01.png), and
[attempt history](../scientific/mixture-axial-v75/ATTEMPTS.md).
The figure was inspected after export; it is scientific output, not a device
render. [EXECUTION.md](../scientific/mixture-axial-v75/EXECUTION.md) records commands
and the two source snapshots. README and frontend behavior remain unchanged.

## Primary references

- [NIST TN 2279](https://nvlpubs.nist.gov/nistpubs/TechnicalNotes/NIST.TN.2279.pdf):
  natural-argon self-diffusion correlation and stated temperature interval.
- [Sandia Fuego conservation models](https://www.sandia.gov/files/sierra/Fuego_Users_5_26/theory/mathmodels/laminar.html):
  mass, species, energy and axisymmetric-swirl bookkeeping; its low-Mach closure
  is not substituted for this backend's compressible equations.
- [Independent equation review](reviews/v75-equations.md),
  [validation design](reviews/v75-validation-design.md), and
  [transport sources](reviews/v75-transport-sources.md).
