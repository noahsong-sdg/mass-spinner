# Independent full-clock timestep physics review

**The declared three-level timestep block passes on 160 × 48 cells through
4 µs. Overall qualification remains PENDING: five spatial jobs are missing.**
This is numerical agreement for the frozen conditional fluid equations, not
experimental or whole-model validation.

## Actual evidence checked

Inspected the new CFL0.05 packet, fields, all 19,874 accepted steps and replay
under `retained/timestep-evidence-20261114`. Independently recomputed hashes:

- New prediction: `258db38c8b84584101ff26124eeb0a194d0842b119ebcfaecbcd2cc4961fab36`.
- Compressed fields: `415feee4fae1231f42a3a5c53e5f63afd5b3a1de8d947ecc13d00f2bd8bb05d2`.
- Decompressed fields: `02d88f4d5e8c1f9ba54c3a2ea0413a9455cae3b71c578f61dd740ed6e70a8ae5`.
- Stable audit: `8d85807cb41344ff98b88b791d13a79e9e316694684bd217def84938bd8eb669`.

All match their receipts. All three CFL packets share identical frozen
source/input/scenario/manifest maps and full reporting clocks 0/1/2/4 µs.
Their entire canonical q0 snapshots are identical, SHA-256
`27ffd23f94a5e3727dd486ef9708833802dca8ad36c01f4802ba5f9075371dab`.
The separately attributed stable metric/entry hashes remain unchanged;
producer fields are not rewritten. The preserved q0 diagnostic still hashes
to `7bd41151c8d843acd238af9c64f92652c0b6696612409d0ff11fa967e93e773d`.

## New trajectory invariants

Independent arithmetic from all four conserved snapshots reproduces every
saved density, velocity, angular speed, temperature, pressure, sound speed,
thermal/kinetic energy and mass fraction exactly in the inspected binary64
operations. Density and temperature are positive; species fractions remain
inside [0,1]. Accepted timesteps are positive, sum to 4 µs and exactly match
the declared min(cap, remaining reporting interval, CFL × acoustic unit)
rule. Maximum clock closure is 4.24e-22 s, CFL overshoot 6.94e-18.

Saved history maxima are 3.30e-16 mass/species drift, 1.50e-13 relative energy
defect, 2.40e-13 angular defect and 2.41e-12 charge residual, all below their
unchanged gates. Independent snapshot sums give energy-minus-electrical-work
discrepancy at most 8.41e-14 J and angular balance discrepancy 2.35e-18 kg m²/s.
External impulse matches prescribed discrete torque times time to 7.80e-15
relative. Resource use is 3,630.75 s and 415,416 KiB, below the 1 GiB budget.

## Timestep result and meaning

The actual audit has **242,154 checks, zero failures**, with only the timestep
comparison layout admitted. Most checks are repeated step-ledger checks;
their count is not a count of independent physical validations. All seven
observables pass the original 2% fine-change limit and contraction predicate
at all four clocks. The largest fine change is 0.082646% (density increment,
1 µs); radial velocity's largest is 0.040431%, axial velocity's 0.014973%.
Both velocities retain the combined meridional reference normalization.

For nonzero clocks, fine/coarse discrepancy ratios span 0.49434–0.49901.
This is consistent with first-order temporal behavior of the split implicit
sources, despite the hydrodynamic substep's second-order integrator. It is
not evidence of higher-order accuracy or a rigorous continuum-error bound.

## Still failed, pending or conditional

The separate axial q0 diagnostic's two strict-contraction failures remain
unchanged: scalar conserved-to-primitive roundtrip scatter does not contract
monotonically. The six historical V106 spatial failures remain unsuperseded.
Five required full spatial jobs are absent; no full radial, axial or joint
qualification follows from this successful temporal block. Temporal accuracy
on this grid also does not independently certify the finest spatial grid.

Peak temperature reaches 619,365 K; minimum history temperature is 1,798.69 K.
Conservation and small timestep changes do not justify fixed heavy-particle
viscosity/conductivity, prescribed electrical properties or omitted evolving
ionization/electron-energy physics at that hotspot. Experimental, Marathon
apparatus and live-playground qualification remain false. The actual full
matrix flags correctly remain false with overall status PENDING.

This reviewer used sequential trusted file/hash/gzip/JSON arithmetic only,
loading one state archive at a time. No project code/tests or VM were executed;
all scientific execution comes from the retained root-operated safe-dev runs.
