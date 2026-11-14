# Common-input source restriction diagnostic

Read independently admitted, sealed V107 full 80/160/320 × 48 states at
0/1/2/4 µs. Preserve every existing source, equation, input, gate and failure.
Root alone performs all execution in the offline safe-dev VM; this source
and its tests were drafted statically. No new trajectory is authorized.

For each adjacent radial pair, R sums radial children of all six extensive
conserved channels. Axial edges are identical and radial edges exactly nested;
there are no volume weights or primitive interpolation. Reject unsupported
geometry, nonfinite states or nonpositive collapsed thermal energy. Retain
the explicit failure/log; never repair a common input or substitute a state.

Apply actual E and Q1-stress/active-FiPy-heat D separately, at h = 1 ps and
0.5 ps. Define S(q,h) = [Op(q,h) − q]/h. Report signed terms in

    Sc(qc) − R Sf(qf) = [Sc(qc) − Sc(Rqf)] + [Sc(Rqf) − R Sf(qf)].

The second bracket is a restriction commutator, not pure operator error.
Collapse preserves the six extensive inventories up to summation roundoff,
but changes coarse inertia, resolved shear/moment kinetic energy, thermal
energy and pressure. Report those mapping changes explicitly. Neither bracket
isolates one physical cause of the evolved discrepancy. Preserve incoming q
and native source mass/species exactly; E also preserves axial momentum.
Retain native scalar receipts, per-channel signed/absolute integrals,
volume-weighted RMS densities, maximum densities, signed algebra residuals
and h-halving differences. Tiny-step subtraction can amplify roundoff; do not
fit or extrapolate a rate limit. No new numerical qualification is scored.

Keep the original global statistics and additionally report every signed term
and h-halving difference in the existing fixed `source_response107.BOUNDS`.
Regional common-input thermal/kinetic energy densities and pressure differences
show local changes hidden by global cancellation. These exact cell-intersection
allocations use piecewise-constant intensities; overlapping regions are
nonadditive and are neither cut-boundary flux budgets nor convergence norms.
Rate-density fields divide the declared channel units by m³; their signed
regional integrals recover the channel units. Pressure integrals have Pa m³.

Driver usage (inside the frozen scientific source environment):

1. `ring_flux107.read_case(prediction, expected_sha, producer_snapshot)` for
   each explicitly pinned full case; retain packet/source/packed/raw seals.
2. Recreate native f, d, e using unchanged `campaign107` mesh/inputs and
   require bitwise initialized q0 equality with the archived q0. Do not
   replace its initializer or transport fields to make common states match.
3. Compute `cache = source_commutator107.freeze_sources(ff, df, ef, fine_state)`.
   Delete the fine D/E operators and collect them before assembling coarse
   operators. Fine `ff` retains only its inexpensive geometry. Do not hold
   two large source operator sets without a declared resource preflight.
4. Call `source_commutator107.diagnose(fc, dc, ec, coarse_state,
   ff, fine_state, cache)` for 80→160 and 160→320; write distinct exclusive
   JSON outputs and retain source/test/driver hashes, logs and input seals.
   If staging in separate invocations, seal the cache and its original field,
   source, step and receipt provenance; never accept an unsealed substituted rate.

Only one large operator set needs residency at a time; the fine rate arrays
are small compared with the native operator setup. Required
data are the three complete full field archives, prediction/source seals and
frozen physical inputs/native scientific dependencies. Run focused controls
first: exact child sums, equal-level identity, uniform primitive/rigid swirl
restriction, native source inventories, signed algebra and rejected collapsed
thermal states. This does not replace the canonical convergence audit.
