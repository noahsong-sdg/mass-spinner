# Nested endwall mesh qualification

Register before new coupled trajectories. Continue the V90/V91/V92 closed,
adiabatic, constant-property neutral-argon release. Keep initial functions,
transport, wall conditions, pressure schemes, operator splitting, native
OpenFOAM 14 implementation and the 20 microsecond horizon unchanged. No
current, velocity, transport or emissivity fitting; experimental status false.

Use radial n uniform cells and axial N=2n cells with fixed map
z(s)=H*(1-exp(-4s))/(1-exp(-4)), s=i/N. Every other fine edge is a coarse edge.
OpenFOAM simpleGrading needs the LAST/FIRST cell-width ratio
exp(-4*(N-1)/N), not exp(-4). Verify native axial centres, per-cell volumes,
bijective mapping and nested conservative restriction before predictions.
The strength 4 is fixed from the wall-layer scale and available timestep
budget, not selected from prediction errors. Keep uniform defaults unchanged.

Hypotheses, ranked: (1) axial wall-layer underresolution dominates early local
flow errors: graded spatial differences should shrink; (2) comparison-grid
averaging contributes to nonmonotone ratios: fixed-coarse projection should
alter some ratios but cannot replace admission; (3) pressure/stress-work
discretization differences persist even after resolving the layer.

Run exactly five native/custom pairs: n=16,32,64 at 2048 steps, plus n=64 at
1024 and 4096 steps. Mesh-only controls are not flow predictions. Reject any
case violating the existing explicit acoustic CFL guard; do not silently
subcycle or enlarge the declared sweep. Save initial, 5, 10, 20 microseconds.
No additional grids after inspecting these results without a new protocol.

Score density, temperature, swirl and two-component meridional velocity,
whole and response-increment norms, at every saved positive clock. Restrict
integrated conserved states on the nested graded mesh before recovering
primitives. Global volume and the physical band H-4sqrt(mu*t/rho)<z<H use
actual graded volumes and exact fractional axial overlaps. Keep spatial and
cross-solver fine changes <5%, temporal <2%, every contraction ratio <1;
undefined ratios fail. Report spatial global/local and temporal global/local
sets separately. Keep mass drift <1e-8, energy <1e-6, native angular wall
budget <1%. Require every gate for this campaign's pass, retaining all V90-92
failures as separate evidence. Never promote code agreement into experimental
accuracy or live-playground qualification.

Seal source copies, protocol, native binaries/libraries and referenced V92
manifests before/after execution. All computations run offline in safe-dev;
host controllers only copy/hash/launch/export. Preserve refused admissions,
failed controls, incomplete cases and nonzero scientific scoring exits.
