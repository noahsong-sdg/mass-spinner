# v68 prospective resolved-current evolution

Frozen before scoring the evolving matrix. Keep the v67 case and all its failed
studies unchanged. This is numerical qualification of prescribed common-fluid
physics, not device or experimental calibration, and does not promote a live backend.

Use exactly the v67 Li6/Li7 physical inputs and1 ms duration. The five explicit
cases in specifications.json share a fine anchor:64 radial gas cells,64 axial
electrical cells,128 inner-wall-graded solid cells and256 quadratic accepted
timesteps. Change exactly one axis per comparison:32 gas cells,32 electrical
cells,64 wall cells, or128 timesteps; keep every other setting at the fine anchor.
The electrode edge stays at q/R²=0.5. Wall edges are R+thickness*(i/Nwall)²;
time knots are duration*(k/Nstep)². No physical coefficient changes are allowed.

Reuse frozen v67 setup/initial-state/time-support validators, conservative shell
mapping, seven primary history gates, separate physical-surface gates and
unchanged local causal diagnostics. Score every shared accepted endpoint, initial
electrical state and first nonzero interval. Fine-only times remain explicitly
uncompared. Preserve incomplete trajectories and fail closed; campaign exit zero
alone is never an acceptance result. Retain each accepted record as NDJSON during
execution and write a complete hashable one-case packet at case completion.

Add independent electrical-history gates: at every initial/accepted state,
reconstruct charge, Lorentz torque, positive Joule heat and power from exported
potentials using the existing independent operator. Gate charge/work/reported
outputs at1e-9 on their natural current/power scales. The solve's source Omega
must match the exported accepted endpoint to the existing fixed-point criterion.
Conservatively restrict extensive fine radial torque/heat to coarse shells.

For each shared-time pair gate powers by max over both complete histories of
|Pe|+Qjoule+|Pmechanical|; projected torque L1 by maximum sum absolute torque;
Joule-profile L1 by maximum total Joule heat; each physical terminal by maximum
sum absolute physical terminal currents. Limits:1% time refinement,2% spatial
refinement. Zero signals require equality; no positive denominator floor.
Global gas-spin insensitivity cannot replace these electrical-specific gates.

Retain earliest local-relative failures. Additionally report separately, without
replacing any global/all-shared-time metric, fixed shared physical checkpoints
T*(m/128)² for m=4,8,16,32,64,128. These distinguish finite-time response from
the singular initial boundary response as the first quadratic knot moves to zero.

Before relying on the optimization, rerun unchanged static FiPy electrical
gates, compare retained baseline/current numerical outputs, and test setup and
returned-result mutation, zero forcing, signed/nonuniform rotation and abrupt
forcing-scale changes. Factorization and prior guesses may be reused only in an
explicit solver owning a copied fixed setup; recompute the actual residual for
every new RHS and retain the existing true-residual and physical ledger gates.

All scientific execution is parent-owned inside offline safe-dev. Independent
reviewers inspect source and exported evidence. Source snapshots and raw packet
hashes bind each assessment. Failed earlier results remain retained.
