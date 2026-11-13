# Largest-grid timestep and early wall-layer qualification

Frozen before V92 predictions. Continue the V91 neutral-argon release without
changing Flow, Diffusion, OpenFOAM, transport coefficients, forcing or initial
conditions. Reuse the authenticated V91 n=32,64,128 packets at1024 steps.
Add native and corrected-backend n=128 cases at512 and2048 steps, completing
the512/1024/2048 sweep. No current, velocity or profile fitting.

Hypotheses, in order: (1) operator-split timestep error contributes to the
early meridional discrepancy, predicting contraction with timestep at fixed
grid; (2) the wall layer is spatially underresolved, predicting persistent
spatial failures after time refinement; (3) differing discrete wall/pressure
or stress-work treatment leaves a persistent cross-solver error. A failed
gate is evidence against qualification, not permission to change a coefficient.

Score reporting clocks5,10,20 microseconds separately. Restrict integrated
conserved fields to a common nested grid before recovering primitives, as in
V90. Include whole states and increments for density, temperature, swirl and
the two-component meridional velocity. The global calculation must reproduce
V90's difference function to roundoff. At fixed1024 steps, score32/64/128
spatial self-differences and cross-solver contraction. At fixedn=128, score
512→1024 and1024→2048 temporal self-differences for both solvers.

Additional prospective local checks use the same fixed physical endwall band
at each reporting time: H−4sqrt(mu*t/rho)<z<H, across the full radius. Use
exact fractional cell-volume overlaps, including on the conservatively
restricted grid, rather than a grid-dependent cell-center mask. This is an
additional admission set, not a reinterpretation of the earlier V90/V91 audit.

Keep the existing limits: spatial and cross-solver relative RMS below5%,
temporal below2%, every contraction ratio strictly below1. Apply these limits
to both global and new local checks at all three clocks. Retain mass1e−8,
energy1e−6 and native wall-angular budget1% checks on all128-grid trajectories.
Report final-time global, early global, local, temporal and conservation sets
separately; no pooling overlapping gates into independent evidence. Retain all
failures, undefined normalizations and nonzero scoring exits. Joint admission
requires every set; experimental qualification stays false regardless.

Run all computation offline in safe-dev. Seal copied sources, referenced V91
manifests/packets, native implementation, new dictionaries and states before
scoring. Preserve the old snapshots and new failures. The public playground
is unchanged. A first failure does not justify enlarging the study after seeing
results; declare a new prospective study if further refinement is required.
