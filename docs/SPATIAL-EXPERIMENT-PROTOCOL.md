# Optional argon experiment: prospective convergence protocol

Frozen before the first campaign. This is numerical characterization of the
existing UI default, not an experimental benchmark or a new physical model.
Use exactly `DEFAULT_SPATIAL_EXPERIMENT`: 1 V, 0.5 T, 1000 K, 1 µs, full drive,
and the existing common-fluid argon cell/closures. Change only resolution.

Run the full 27-case cross of radial cells {4,8,16}, axial cells {2,4,8} and
uniform timesteps {16,32,64}. Preserve the 1 cm radius, 10 cm length, exactly
half-area grounded upper contact, fixed three-cell tungsten liner and all
constitutive/boundary inputs. Retain refused trajectories and failed gates.
Do not tune physical parameters to improve convergence.

For each numerical axis, hold the other two fixed: nine three-level comparisons
per axis. Compare identical accepted clocks and the same coarsest physical
shells at every level; retain finer-only times as unassessed. Restrict species
inventories and internal energy by summation; reconstruct temperature from
restricted energy/counts. Restrict rotation as summed angular momentum divided
by summed inertia. Also compare inertia response and angular momentum directly;
retain the actual fine kinetic energy, not the energy of its averaged rotation.

For angular speed, signed outer-contact current, integrated Joule heat/torque,
kinetic energy and angular momentum use the maximum response magnitude across
the three common histories. For gas/liner temperatures, density and inertia
use excursions from each history's actual initial state; record initial
differences separately. Never use the 1000 K or equilibrium-density background
as a physical denominator. Radial electrical quantities use sums of absolute
cell-integrated differences (L1); other profiles use maximum differences.
The ideal mixed contact edge's pointwise current peak is not qualified.

Retain actual accepted interval wall heat. Sum finer intervals before dividing
by the identical coarse interval duration; no endpoint-power trapezoid or time
interpolation. A future pulse study must retain the right-continuous electrical
endpoint and the preceding interval's actual work separately.

Require both adjacent differences strictly below **1% for time**, **2% for
spatial axes**, and strict contraction of fine versus coarse differences on the
same bins/clocks/normalization. Exact zero differences at both levels satisfy
the contraction check only when the physical signal itself is resolved.
These are this new campaign's gates; they do not reinterpret older protocols.

Raw differences, scales, contraction and a separate representation-sensitivity
screen are reported. For baseline-subtracted fields the screen is
`32 * Number.EPSILON * (finest radial cells / coarsest cells) * norm(field)`
(the same maximum or L1 norm used for that field's comparison).
It is a conservative binary64 sensitivity diagnostic, **not a rigorous solver
error bound or an acceptance allowance**. Signals below it, or contraction
dominated by it, remain `unresolved`; the screen cannot produce a pass or change
the physical thresholds. Raw failed contraction is retained. Exactly zero
responses do not qualify transport. No density/temperature denominator floor.

Independent review clarified that resolution must hold at the requested
accuracy: `tolerance * scale > screen`; contraction requires
`abs(coarse difference - fine difference) > screen`, with the stated exact-zero
exception only for an accuracy-resolved signal. The initial implementation
tested the response/error amplitudes instead of these two quantities. Its raw
histories and [initial receipt](https://github.com/noahsong-sdg/mass-spinner/actions/runs/43837928441)
remain retained; corrected scores are separate. Nonfinite interval heat is
refused before assessment/JSON serialization. A fresh output directory is
required before any computation, preserving existing partial and final evidence.
Without a positive representation screen, an exact nonzero difference tie
remains a failed strict-contraction gate.

This initial campaign does not qualify finer-only times, finer radial structure
lost by coarsest-bin restriction, local causal early responses, solid spatial
resolution, physical wall-surface temperature, the full slider envelope,
continuum/accommodation assumptions, electron heating or experimental accuracy.
Native nonlinear/energy defects are retained to diagnose small-signal failures.
Every numerical/experimental promotion flag stays false. Main 3D behavior is
unchanged, regardless of the study result.

Execute `node --import tsx scripts/study-fuel-spatial.ts` inside the offline
one-CPU/1-GiB CI container. The artifact retains all histories, physical
conditions, code hashes, failures and machine-readable assessments. A green
workflow means operational completion and regression checks, not convergence.

## Resolution extension after the first measured failure

The initial 27-case run found large axial-current/heat errors and a 1.366% fine
density timestep difference at r16/z8. The extension changes only numerical
resolution: repeat that original cross and add a second full cross
`nr={8,16,32}, nz={32,64,128}, steps={64,128,256}`, plus r16/z16/t64 to connect
the axial ladders. This is 55 distinct trajectories. Score every available
consecutive doubling triple while holding the other two axes fixed. The same
physical inputs, thresholds and scope exclusions apply; browser defaults and
all qualification flags remain unchanged. The expanded bounds permit offline
reference refinement, not a claim that any newly allowed mesh is adequate.

## Independent numerical probes after the 55-case study

The [55-case receipt](https://github.com/noahsong-sdg/mass-spinner/actions/runs/43839587719)
resolves the density timestep failure at tested refined points, but retains
spatial source/heat/density failures and noncontracting electrical timestep
differences around 1e-9 relative. Before further scoring, declare two probes:

- **Upper-graded grid:** only the axial cell partition changes, to
  `z_j=L*(1-(1-j/nz)^2)`. Keep the same current operator, physical boundaries,
  contact area and default 1e-11 solve tolerance. Run the full cross
  `nr={8,16,32}, nz={8,16,32}, steps={64,128,256}` plus r32/z64/t256 and
  r32/z128/t256: 29 trajectories. The original uniform path retains its exact
  arithmetic. This tests axial truncation near the grounded electrode without
  adding a contact/sheath regularization or altering material coefficients.
- **Tighter current solve:** preserve the uniform r32/z128 mesh and physical
  condition. Cross steps {64,128,256} with current relative tolerances
  {1e-11,1e-13,1e-15}: nine trajectories. The existing current solver already
  supports this range; the adapter passes it through both current-creation
  paths. Evaluate time contraction separately at each tolerance. No tolerance
  is substituted into a physical-error denominator or used to waive a failure.

These probes are independent; grading and tightening are never combined in
this campaign. Neither changes browser defaults or promotion flags. Use fresh
output directories for `upper-graded` and `tight-current` CLI modes. All prior
uniform failures and source hashes remain retained. A grid probe failing an
operational solve still exports its failure and does not suppress the other
probe's execution. The representation diagnostic remains heuristic, not a
certified L1 or local error bound.
