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
`32 * Number.EPSILON * (finest radial cells / coarsest cells) * max|field|`.
It is a conservative binary64 sensitivity diagnostic, **not a rigorous solver
error bound or an acceptance allowance**. Signals below it, or contraction
dominated by it, remain `unresolved`; the screen cannot produce a pass or change
the physical thresholds. Raw failed contraction is retained. Exactly zero
responses do not qualify transport. No density/temperature denominator floor.

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
