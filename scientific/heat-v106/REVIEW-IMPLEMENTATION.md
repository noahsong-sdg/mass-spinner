# V106 implementation and retained-field review

**Outcome: the isolated heat correction is supported; coupled convergence and
experimental accuracy are not approved.** This review used trusted source and
retained-data reads only. The reviewer authored the adapter; independent heat
controls and separate adversarial reviewers supply the independent checks.

## Evidence checked

Inspected `heat106.py`, the base `Diffusion.advance -> conduct` path,
`Flow.primitive`, campaign initialization/evolution, `evaluate106 ->
evaluate100 -> audit99`, and the directional diagnostic. Inspected actual
`v106-candidate02` and `v106-cross01` records under
`retained/evidence-20261113`, including execution receipts, heat/method/coupled
test logs, saved field metadata, summaries, and directional comparisons.

Native SHA-256 reads match the retained producer inventory:

- Adapter: `9fd1903f0e1250a67065825e1b2688906faf1927639857c02c9eca302107ba84`.
- Base diffusion: `ca2a96c4fef47c0db54aa3913122cc5312f83484c935613bec3d8b885b0975c8`.
- Candidate02 transfer: `89fa06a1c1b5f25a4790e8708f0d21caaa2a97f3942ac7d73a127ea03db0dece`.
- Prediction: `96098e86f874d1d5f65317a882a5f14df75685afc06ecc8a98cbd7a76e48a7b4`.

## Implementation findings

The demonstrated defect was a mismatch between Q1 conduction and FV storage:
zero-capacity boundary nodes could introduce axial variation into a radial
heat field. In plain terms, the old boundary temperature unknowns exchanged
heat along an artificial grid. Replacing only conduction with existing FiPy
FV face balances removes those unknowns while retaining the stress solver
and energy accounting. This is narrower than replacing the coupled solver
or changing the physical closure.

Current incoming species masses determine `C = 1.5*kB*(mA/MA+mB/MB)` on every
`advance`. Mechanics leave these masses unchanged. After mechanical work and
heating, `conduct` resets `T = thermal/C`, refreshes `C/physical_volume`, then
updates the old temperature. Capacity has no old history. Consequently the
heat split holds **current**, rather than initial or previous-step, mass
fixed. The retained reused-versus-fresh test changes energy, density and
36/40 u composition and passes conservation, positivity and thermal entropy.

Cell ordering and `2*pi*FiPy_volume == conserved_volume` are checked. Native
zero-flux boundaries and positive scalar conductivity give conservative
orthogonal FV conduction. The native linear residual multiplied by
`2*pi*dt` has units J. The temperature trace is explicitly FV cells; the
inherited FE thermal matrix is inactive and must not represent candidate
heat flux. Mechanical trace and wall-torque accounting are unchanged.

Saved finest fields have six conserved arrays of shape `[96,80]`, matching
97 axial/81 radial edges and clocks 0/1/2/4 us. The added r4-z2 field has
shape `[48,80]` and clocks 0/1 us. Eight corner-cell checks at 0 and 4 us
reconstructed density, radial velocity and temperature directly from `q`,
cylindrical volumes and argon mass; they match stored primitives to floating
point precision. This is a sample check, not a new all-cell PDE validation.

## Results and limits

The retained logs show four independent heat controls, two method controls
and two coupled controls passing. Axial spread is below 2.3e-12 K. Bessel
spatial errors decrease 1.8976%, 0.4802%, 0.1236%, 0.03430%; timestep errors
decrease 6.6156%, 3.4753%, 1.7896%, 0.9148%. These support approximately
second-order space and first-order backward Euler for the tested mode.

The original 5% spatial and 2% temporal gates, five-case matrix, four clocks,
normalizations and independent cylindrical restriction remain present.
The evaluator exited **1**, retaining six spatial failures: density-increment
errors 20.73/22.18/23.42% and radial-flow errors 7.06/9.21/9.64% at 1/2/4 us.
Small conservation defects do not cancel these failures. Directional
refinement at 1 us shows about 20.3% density-increment and 6.94% radial-flow
differences for radial refinement, versus about 2.9% and 1.0% for axial
refinement. This points toward radial discretization/initialization as the
next investigation; it does not establish a unique root cause. The
directional matrix explicitly scores no replacement qualification gates.

No field/unit/trace mismatch or hidden acceptance change was found. The
adapter is limited to positive constant scalar conductivity and a closed
heat split. Prescribed-current neutral transport, adiabatic walls and short
transients remain conditional assumptions. The finest peak reaches about
622,000 K; the neutral closure is not experimentally justified there. All
retained optical alternatives still miss the all-point gate. Neither live
playground adoption nor experimental qualification follows from this work.
