# Independent coupled-loading math and integration review — v24

Reviewed the new `src/target-loading.ts`, root-owned loading UI and callback,
and scope relocation in source, exposure, sample geometry and blanket UIs.
Production code was read only by this reviewer. The only implementation owned
here is `tests/loading-math-v24.test.ts`. The safe-dev README was read; all
project execution was inside a copied Apple VM, with no host mounts,
credentials or browser-policy workaround.

## Finding

No blocking equation or scientific-scope defect was found in the final
`ad06d98da87ea8623cbf81c4159f60c6f7b4575ecb2e2a90f8f46d6f1042115d`
kernel. This conclusion is confined to the stated well-mixed fixed-stopping
reference; it is not a LiT retention calibration or Marathon performance
validation. Merged application checks and deployment remain parent gates.

One nonblocking accuracy-label issue was sent to the parent: the loading UI
called an endpoint-only comparison “maximum population change.” It compares
the three **final** fractions, not the maximum error along the trajectory.
The parent reports correcting it to identify the final populations. This
matters because exhausted endpoints can agree while an early transient differs.

## Independently derived equations

Use incident dose per site `u=J t/S`, with fixed site column S, T fraction f,
D fraction d, vacancy fraction v and initial `f0`, `d0=1−f0`, `v0=0`.
Let `tau` be the unit-loading optical depth, `p=1−exp(−tau*f)`, and eta the
assumed fraction of non-fusing D making a site-replacement attempt. Then

```
df/du = −p − eta exp(−tau*f) f
dd/du = eta exp(−tau*f) (1−d)
dv/du = p − eta exp(−tau*f) v
```

These equations conserve f+d+v. Fusion consumes one incident D and target T,
leaving a hydrogen-site vacancy; replacement may fill that vacancy or eject T
or D. The independent event rates per unit u are:

```
fusion              p
non-fusing arrivals exp(−tau*f)
replacement arrivals eta exp(−tau*f)
unretained arrivals  (1−eta) exp(−tau*f)
outgoing T           eta exp(−tau*f) f
outgoing D           eta exp(−tau*f) d
```

The production transform is coherent:

```
H' = p/f, with limit tau at f=0
Q' = eta exp(−tau*f)
f = f0 exp(−H−Q)
d = 1−f0 exp(−Q)
v = f0 exp(−Q) [1−exp(−H)]
```

Differentiating these expressions gives the simultaneous physical equations
above. Positive H and Q enforce nonnegative populations without negative
population clipping. `expm1` preserves initially small vacancy and D increments.
All four separately scaled integrated event channels were differentiated by
hand and reproduce fusion, outgoing T, non-fusing arrivals and outgoing D.
Scaling non-fusing arrivals by `min(totalDose,1)` rather than a huge total dose
allows local error control to see the initial transient. This is a numerical
scaling choice, not a change in the physical event rates.

The adaptive tableau matches the standard Dormand–Prince 5(4) pair in the
[official SciPy RK45 source](https://github.com/scipy/scipy/blob/main/scipy/integrate/_ivp/rk.py).
The [SciPy method documentation](https://docs.scipy.org/doc/scipy/reference/generated/scipy.integrate.RK45.html)
also distinguishes fifth-order updates from embedded fourth-order error
estimation. The browser code uses that numerical method, not a running SciPy
library. Its componentwise maximum error norm is stricter than an RMS norm;
its step growth, initial step and monotone-stage checks differ from SciPy.
No identical step sequence or general global-error certificate is claimed.

The output grid no longer determines a Lie splitting timestep. The solver
does stop at requested plot points and retains accepted adaptive endpoints,
so changing plot density can change its internal step sequence; physically
equivalent results must agree within the tested error budget. The descriptions
should not imply bitwise trajectory independence.

## Adjacent boundaries and event accounting

- Source-on duration/current/area convert to dose consistently. Counts multiply
  normalized event integrals by `S*area`; instantaneous rates multiply reaction
  probability by particle rate. These are different units and remain separate.
- Analytic zero-current, zero-duration, zero-T, zero-hazard and eta=0 branches
  retain the intended equations. The final eta=0 branch evaluates the smaller
  fusion/transmission channel directly, avoiding incident-minus-fusion loss of
  a small positive channel. The primary solver agent owns those regressions.
- The input and solver-work guards enforce real domain/numerical boundaries.
  Local error, raw isotope/projectile budgets and positivity are checked
  separately; conserved budgets alone would not establish trajectory accuracy.
- No fusion event is simultaneously implanted. Replacement arrivals include
  D-on-D ejection and are explicitly distinguished from net retention.
- No D–D reactions, spatial implantation, diffusion, trapping, permeation,
  changing stopping matrix, thermal feedback or target renewal is introduced
  implicitly. Their omission remains in the returned assumptions.

## UI and state trace

`main.js` passes the same current source to geometry, exposure and loading
observers. Loading receives the source's fixed site column and optical depth;
its replacement/tolerance controls do not mutate that source. Its event counts
therefore form a separate evolving reference, while source and geometry
readouts retain the initial steady-source meaning and thermal forcing remains
constant. A loading error is caught locally, clears its plots/results and
disables its export. It does not invalidate valid source/thermal/geometry data.

The loading UI compares tenfold tighter tolerances, exports that comparison and
all solver/model metadata, and explicitly says local tolerance is not a global
accuracy guarantee. Both runs must succeed before plots/export are enabled.
The schema is export-only in the inspected path; no historical loading files
are imported or migrated by this application.

Scope relocation preserves the substantive boundaries inside native Model info:

- Source remains an illustrative apparatus, with independent energy ledgers,
  imposed or atomic-additivity stopping, not measured LiT scan or calibration.
- Exposure remains an assumed bulk node with fixed source yield, not resolved
  surface temperature, damage, target lifetime or coolant engineering.
- Sample geometry remains isotropic point-source free-flight current, not the
  D–T angular spectrum or shielding transport. The finite-source ratio warning
  is still visible at the interaction point.
- The future blanket has no beam-source callback. Its quoted OpenMC case is
  frozen; the optical-depth and decay controls do not recalculate TBR, gold
  output, purity, dose, economics or release date.

Moving qualifications into a disclosure changes their presentation, not their
mathematical content. No calibrated Marathon claim was found. Rendering,
assistive-technology behavior and GPU appearance were not verified here.

## Independent tests actually executed

Added three invariance regressions that do not duplicate the separate SciPy
reference study:

1. A dose-ten-million future horizon must not change its resolved early-time
   populations or small fusion ledger compared with fresh solves ending at
   those early times. This checks horizon-dependent channel normalization and
   guards against endpoint-only apparent convergence.
2. Scaling illuminated area and particle rate together preserves areal-dose
   populations and scales all total nuclei and instantaneous rate by area.
3. Increasing particle rate while decreasing exposure inversely preserves
   accumulated loading/events while scaling the instantaneous neutron rate.

Copied stage `/tmp/mass-spinner-loading-math-v24`, guest
`safe-dev-25a6ea9a6f7f9cd7`: package/lock/tsconfig, final kernel and owned test
only. After the primary solver agent's final change, the stage was explicitly
synced again and pinned dependencies reinstalled in the VM.

```
safe-dev -C /tmp/mass-spinner-loading-math-v24 run --online -- npm ci --ignore-scripts
safe-dev -C /tmp/mass-spinner-loading-math-v24 run -- ./node_modules/.bin/tsx --test tests/loading-math-v24.test.ts
safe-dev -C /tmp/mass-spinner-loading-math-v24 run -- npm run typecheck
```

Results on the final kernel: **3/3 passed; typecheck exited zero**.
`/tmp/mass-spinner-loading-math-v24-final-export` retains source hashes,
`test-v24.log`, `typecheck-v24.log` and `checks-v24.json`. This reviewer did
not execute the separate SciPy comparison, full merged suite/build, deployment
or browser checks and does not present another agent's results as its own.
