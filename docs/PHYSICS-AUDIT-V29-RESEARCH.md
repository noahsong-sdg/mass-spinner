# Adversarial research-backend audit, v29

8 November 2026. Independent bounded rechecks of frozen full3V collision data and
the research replay. **The full3V backend remains physically unqualified. No new
hidden production physics defect was demonstrated in this pass.** The negative
convergence and rotation outcomes are real, not merely a historical report's
interpretation. Production sources and frozen histories were not changed.

## What was checked independently

The new standard-library Python checker imports neither the producer nor its
previous reviewer. It reconstructs mixture moments from raw velocities, weights,
masses and widths at **all 617 states of 17 trajectories**, checks represented
initial tensors and common `mass × variance`, checks the three public replay
cases against all their raw states, and evaluates new full3D Fourier lower
witnesses on every saved refinement/rotation comparison.

| Fresh check | Result |
| --- | --- |
| Raw moments, 617 states | PASS; largest tensor discrepancy from producer 2.8422e-14 eV |
| Smooth total energy conservation | Largest relative change 8.7338e-14 |
| Total momentum conservation | Largest change / positive initial momentum scale 1.2368e-16 |
| Positive fixed weights/widths; common mass × width variance; declared initial smooth tensors | PASS for all 17 cases |
| Public replay identity | All 63 states in 3 cases exactly equal saved times, steps, means and tensors |
| Fresh full3D refinement lower witnesses | 28 FAIL; 4 not proved by this bounded search; **zero convergence PASS claims** |
| Fresh full3D rotation lower witnesses | 8 FAIL, including both q5 and q9 |

These tests did **not** rerun Julia trajectories, independently repeat physical-H
integration, repeat Landau initial-rate integration, or qualify an actual device.
The previously recorded 30 FAIL / 2 UNKNOWN refinement result additionally uses
QMC diagnostics for two heavy-species timestep failures; this pass independently
reproduces only the 28 analytic-witness failures. Its four unresolved timestep
witnesses cannot be promoted to either PASS or UNKNOWN under the complete older
contract merely because this smaller diagnostic cannot decide them.

## Findings, ranked by qualification impact

### P1, existing blocker: full3V dynamics are far from the physical convergence gate

**Witness.** At 100 µs, n6→n8 particle refinement has fresh normalized increment
L1 lower witnesses **0.044835 and 0.086851**, against the unchanged **0.0002**
budget. At that same time, width α=.10→.05 has witnesses **0.057657 and
0.053926**. Even q5→q9 produces **0.014221 and 0.006896**. Each number is a
lower bound on the full3D signed evolution-increment discrepancy, not an estimate
of its upper bound or of exact continuum error.

**Technical reason.** Fixed-width Gaussian regularization, sparse marker
discretization, and finite entropy cubature alter the collision force. The pair
metric can preserve its invariants while evolving this inaccurate force. The
v17 retained physical-rate evidence independently separates nominal-Gaussian
input error from the actual represented mixture: n8/q5 combined drift-rate
error is about 41.08% against that mixture's physical Landau rate. Increasing
entropy cubature through q17 changes that drift vector only about 1.5%; q alone
cannot repair it. The earlier rate study also identifies finite-width bias.
Those rate integrations were inspected, **not rerun here**.

**Plain explanation.** Conserving energy exactly does not mean particles exchange
it at the correct speed or approach the correct distribution.

**Required fix / choice.** Keep full3V qualification withheld. Future solver work
needs a prospective joint particle/width limit with independently integrated
physical rates first, followed by finite-time distributions. Improve entropy
cubature and angular covariance together. This targets the demonstrated force
bias; tighter Newton tolerances or a smaller timestep alone cannot resolve these
large fixed-time particle/width discrepancies. This is a new scientific work
package, not a safe small production patch.

### P1, existing blocker: rotational covariance is still unresolved

**Witness.** Fresh full3D characteristic witnesses fail all 8 comparisons. At
100 µs q5 gives **0.007694 / 0.002824**; q9 gives **0.002267 / 0.000866**. The
smallest of all eight witnesses is **0.00070285**, over 3.5 times the gate.

**Technical reason.** `initialization.jl:21-30` rotates velocities and declared
tensors but deliberately keeps the producer entropy nodes in laboratory axes.
The exact continuous isotropic Gaussian integral is rotationally invariant;
its finite Cartesian node rule need not be. `core.jl:50-90` differentiates that
finite rule exactly, so a perfectly solved discrete chain rule cannot remove
its orientation dependence.

**Plain explanation.** Turning the same collision experiment in space changes
the predicted answer because the numerical integration has preferred axes.

**Required fix / choice.** Qualify a rotation-resolved entropy evaluation before
using this backend for orientation-sensitive separator physics. Merely rotating
the quadrature with the initial condition would compare two jointly transformed
discretizations and hide the fixed-laboratory error under test. Keep the current
negative control and compare converged rules against it. No such change is made
to frozen studies.

### P1 qualification boundary: decreasing H_Q is not a physical entropy theorem

**Source trace.** `core.jl:50-90` computes the moving-node functional
`H_Q = Σ_i w_i Σ_a ω_a log F_s(v_i + sqrt(ε_s) ξ_a)`, including both node-motion
and mixture-center derivatives. `core.jl:181-213` uses its stable signed
increment and weighted Gonzalez correction. The implicit midpoint pair metric
therefore decreases that **finite-rule** functional, up to nonlinear residual.
It does not prove monotonicity of `Σ_s ∫ F_s log F_s d³v`.

**Witness / limit.** The retained independent physical-H audit has two case-level
budget PASS and fifteen UNKNOWN, with 400 state integration decisions UNKNOWN.
The two passes permit a small positive estimated change within the prospective
budget. Their status does not mean a physical H-theorem. This pass inspected
those compact records and source definitions; it did not recompute their costly
full-space integrals.

**Plain explanation.** A solver can reduce its own approximate entropy while a
more accurate entropy measurement remains uncertain.

**Required fix / choice.** Preserve separate labels for H_Q balance, physical-H
integration sensitivity, and the physical increase budget. Refine independent
integration before accepting physical entropy; never compensate with density
floors or loosened gates. Existing UI/report language already maintains this
distinction, so no corrective production change is warranted.

## Structural and physical consistency trace

The pair tensor in `core.jl:162-179` is `(|z|²I - zzᵀ)/|z|³` with positive
weights and inverse masses. Its nullspace annihilates `z`; pair exchanges cancel
total momentum and midpoint quadratic energy. The recorded coincident-marker
convention sets the undefined `z=0` pair contribution to zero; it is explicit,
and is not a proof of the singular continuum limit. No density floor, velocity
clipping or fitted physical-rate correction was found in this execution path.

The entropy gradient pairs the mixture-center and moving-node scatter. Fixed
positive component weights and ε>0 make each reconstructed Gaussian mixture
positive mathematically; that representation property does not imply an accurate
distribution. The smooth temperature tensor adds fixed component covariance,
and smooth energy differs from marker energy by a fixed offset. Independent raw
reconstruction agrees. All 17 setups satisfy the common `m_s ε_s` condition; it
is not missing from these experiments.

The published multispecies method distinguishes its regularized equation from
the unregularized Landau equation and requires a regularization relation for a
shared equilibrium temperature. A method's invariant proof does not certify
this adapter's finite cubature, parameters, or Coulomb convergence. The source's
BKW exact-solution comparison is for Maxwell collisions; it is not an external
Coulomb validation of our full3V histories. [Carrillo, Hu and Van Fleet,
2024](https://link.springer.com/article/10.1007/s10440-024-00692-9).

The v16 radial reduction is restricted to isotropic, zero-drift homogeneous
states. Its finer radial convergence cannot be transferred to this v17 drift /
anisotropy problem. Neither implementation supplies self-consistent fields,
electrons, spatial transport, sources, losses, wall interactions or a Marathon
target. Inherited Newton–Krylov code is a nonlinear-solver component, not an
independently validated full collision application.

## UI/replay truthfulness

The actual path is lazy load → fetch `/research-recordings.json` → select an
integer saved-state index → render stored moments. `src/research-ui.js:16-46`
does not integrate collisions or interpolate. At line 28 it explicitly displays
`qualification WITHHELD` and says no solver runs when scrubbing. Case labels
include the simultaneous 2/10 eV thermal exchange; they do not present drift or
anisotropy as isolated experiments. Velocity is normalized by V₀ and temperature
tensors are in eV. The packet's scope and limitations exclude a spatial machine.

All 63 published values tested exactly match frozen raw invariants. The packet
contains moments, not the entire velocity distribution or a complete public
reproduction archive; this is explicitly disclosed. `src/convergence-evidence.js:7`
also says its separate historical matrix is static and is not rerun by sliders.
No current false live-solver, device-qualification or physical-convergence claim
was demonstrated in this path. This is a source/data audit, **not browser or GPU
verification**.

## Reproduction and exact evidence

The final scoped snapshot was explicitly resynced after changing the independent
checker: **179 files, 91.9 MiB**, own VM `safe-dev-46788b5da84f1dfa`, offline.
No dependencies were installed; Python 3.11.2 standard library, Linux aarch64.

```
safe-dev -C /tmp/mass-spinner-physics-audit-v29-research init
safe-dev -C /tmp/mass-spinner-physics-audit-v29-research sync --replace-guest
safe-dev -C /tmp/mass-spinner-physics-audit-v29-research run -- python3 audit_saved_states.py
safe-dev -C /tmp/mass-spinner-physics-audit-v29-research export /tmp/mass-spinner-physics-audit-v29-research-export-final
```

Final result: **5 unittest checks PASS, 6.890 seconds**, exit 0. Export was reviewed
and only compact new evidence copied into `scientific/physics-audit-v29/research/`.
The input manifest hashes all 179 copied files, including every raw state input.
These five test functions include diagnostic generation; their green status does
not mean the 28 refinement or 8 rotation failures became passes.

| Artifact | SHA256 |
| --- | --- |
| Independent checker | `0b8623cb06c77e90655ca9ee4c17510147e90f515320ad07587f66c45a6f21d6` |
| Input hash manifest | `a1cad925ad25762581839a4ae894fe7cb5aeef75c859b42b86234bbd859e4ea8` |
| Audit results | `f0b49cecbdc908c38e9571c04d8c4264e099029660eb82ffe24ef2265c50ab02` |
| Frozen full3V core | `76b575768e85a946267ff866ff2c027b8886e1a49d14bf0adb40d4c2382bafaf` |
| Frozen initializer | `6366d59e95c52fc68c4eeadd6fbbcd3fa421d4802158fc5cad2ad085368fd0bf` |
| Research UI traced | `81954606c6ce7aa462de92cf9e635619f7ba6f51b8a5ec6842010c82da68abe7` |
| Public packet checked | `82b0cddac960f5260bf1ba090c59382cea1635afc4d2a259e6102d84137b6f5d` |

For a Gaussian-mixture species normalized to one, the new diagnostic uses
`φ(k)=Σ_i (w_i/n_s) exp(-ε_i |k|²/2) exp(i k·v_i)`. Since
`|exp(i k·v)|=1`, `|φ_A(t)-φ_A(0)-φ_B(t)+φ_B(0)|` cannot exceed the full3D L1
increment discrepancy. It is a rigorous inequality evaluated in ordinary
binary64, **not certified interval arithmetic**. A 1e-12 arithmetic allowance is
reserved before declaring FAIL; all reported non-timestep failures are separated
from the 2e-4 gate by much more. The finite search cannot prove convergence or an
upper error bound. Rotated velocities are mapped back using the saved rotation;
the initial increment removes initial representation mismatch. Requested times
must match a saved state within 1e-14 s.

No application build/typecheck was run in this delegated audit because production
sources were unchanged; the parent owns the final repository gate.
