# Independent review: axisymmetric collision representation and source-fitted rings

7 November 2026 UTC. This reviewer read the collision/locality/orbit/regime execution paths independently, reopened primary sources, added seven independent regression/physics tests, and made no production edits. The author corrected one demonstrated mesh-boundary defect identified in this review. Scientific campaign results and the final repository-wide gate remain with the parent.

## Verdict and evidence boundary

The new method is a defensible **axisymmetric spatial discretization of the existing equal-weight mixed-ion collision generator**. It is not a new Coulomb coefficient, a gyroaveraged model, an exact angular-momentum method, or a proof of transport convergence. Its restrictions match the current double-well source, fields and cylindrical boundaries, which are axisymmetric in distribution. A finite random collection of plotted points is not exactly symmetric; the ring representation approximates the symmetric distribution those points sample.

No blocking collision-basis, ring-volume, normalization or energy defect was reproduced in the reviewed path after the boundary correction. Preserve raw finite-radius torque and the original statistical convergence gates. Do not promote the stationarity checks below into arbitrary non-equilibrium spatial accuracy.

## Independently derived reduction

For an axisymmetric distribution, write the three velocity coordinates as `(v_r,v_theta,v_z)` in each marker's own physical cylindrical basis. The full local collision operator is rotationally covariant: rotating a physical point and its velocity together changes its azimuth label, not this local distribution. Thus samples at different azimuths can represent the same local cylindrical velocity population. The correct ring-cell measure is

```
V_j = pi (r_high² - r_low²) (z_high - z_low).
n_j = N_j w / V_j.
```

Uniform-r cells bound the radial pair gap by their actual width. Computing differences of original Cartesian velocities across an entire annulus instead would confuse a change in the basis direction with a velocity difference and falsely scatter copies of identical local flow.

The implementation transforms every ion into its own basis, executes the existing TA map and equal-weight matching, then transforms back. This preserves pair kinetic energy, axial momentum and common-cylindrical-frame momentum. **Global Cartesian transverse point-pair momentum is not an exact invariant of this symmetry-reduced sample.** It must not be advertised as conserved. The ring representation's integrated transverse momentum vanishes over azimuth, while its physically important rotation moment remains explicit.

For a selected pair, local tangential impulses obey `delta p_theta,b = -delta p_theta,a`. Since positions do not change during scattering,

```
delta P_theta = (r_a - r_b) delta p_theta,a.
```

The vector-potential contribution to canonical angular momentum is unchanged in this collision substep. This is real finite-grid angular error, not zero. Its accumulation must be measured on the actual Cartesian trajectories and exit fluxes. Root integration does this, and also records radial and meridional pair distances. The meridional distance is an r-z metric, not the Euclidean distance between two displayed points.

Conditional on a fixed ring cell, the existing random mixed pairing has each other marker's infinitesimal rate equal to `w/V_j`: even-N inclusion probability `1/(N-1)` times effective density `(N-1)w/V_j`, or odd-N probability `1/N` times `Nw/V_j`. The same finite-N empirical interpretation remains; symmetry reduction does not remove finite timestep, low-relative-speed, matching or sampling effects.

## Fixed source interfaces: justified scope

Appending the declared INITIAL pulse radius and slug end to a regular mesh is deterministic source-fitted meshing. The faces remain fixed in time and do not depend on realized particle positions. Inserting a face only splits a cell; the rate still uses its full physical annular volume. With a uniform initial top-hat source and all support interfaces included, no occupied initial cell mixes source volume with vacuum. This removes the previously derived initial support-overlap factor below one; it does not remove finite-count noise or the empirical self-exclusion convention.

This is preferable to dividing by estimated occupied support, a time-dependent initial-pulse correction, or changing the supplied physical density. Once the pulse moves and develops gradients, fixed cells again smooth density and shear. Fitted/unfitted comparisons, the actual executed faces and independent radial/axial/marker/time refinement remain required. For equilibrium initial states, source-radius and slug controls are inactive; the engine correctly ignores pulse fitting there.

### Boundary defect found and corrected

**Problem:** a declared source interface within the edge-coalescing tolerance of zero or the outer wall could replace the physical domain endpoint. A particle could then be assigned a cell whose declared bounds did not contain it.

**Technical cause:** the roundoff coalescer treated endpoint and interior grid indices equally. For example `radius=.2`, `radiusBreakM=1e-16` replaced the zero edge with `1e-16`, although a valid marker could have radius `5e-17`. The same issue occurred near the axial and outer endpoints.

**Plain explanation:** an attempt to avoid tiny duplicate cells moved the actual chamber boundary.

**Fix and choice:** retain exact physical endpoints; only interior near-coincident grid faces may coalesce. A distinct near-endpoint interface is inserted and its positive finite volume is tested normally. This enforces the real partition invariant without clipping particle positions, deleting a valid source layer, or relaxing the geometry check. The independent regression checks both near-zero and near-wall radial/axial cases.

## Primary-source cross-checks and alternatives

- [ECsim-CYL, Gonzalez-Herrero et al., 2018](https://arxiv.org/abs/1810.08433), [DOI](https://doi.org/10.1016/j.cpc.2018.10.026), supports the general axisymmetric two-position/three-velocity representation. It does not validate our collision discretization or authorize transferring that paper's electromagnetic solver accuracy to this app.
- [Skovorodko, 2004](https://arxiv.org/html/physics/0401026), §§2–3, directly identifies artificial rotation changes from collisions between different radii in axisymmetric DSMC. Its proposed angular-conserving neutral-gas modification changes tangential mass factors, rescales other velocity components and may reject collisions. We do not import that modification into Coulomb TA; conserving a scalar after changing its kinetic generator would require new independent collision benchmarks.
- [Bailo, Carrillo & Hu, 2024](https://doi.org/10.1017/S0022377824001077), §2.2, develops a distinct deterministic variational C-PIC approach with spatial/velocity regularization. Its use of nonnegative symmetric normalized spatial splines makes regularized inhomogeneous collision methods a reasonable future comparison. This app does not implement that scheme or inherit its entropy/conservation claims.

An alternative independently derived here is an explicit symmetric normalized spatial kernel `K_h(x_a-x_b)`, with each unordered pair carrying partner density `w K_h`. An all-pairs or exact compact-support sparse sweep has an identifiable empirical generator and spatial scale, but adds cost and still introduces finite-h torque. Nearest-neighbor matching with the old random-pair rate would instead change inclusion probabilities without compensation. Given the current exact symmetry and browser resource budget, rings are a smaller and clearer first improvement; genuinely three-dimensional or unstable azimuthal states would require a different method.

## Executed independent checks

```
./node_modules/.bin/tsx --test tests/review-axisymmetric.test.ts tests/axisymmetric-collisions.test.ts
```

**14 passed, 0 failed** on the reviewed integration snapshot: seven author tests and seven independent tests. The independent tests check:

1. Arbitrary individual azimuth relabeling preserves the actual collision distribution and measured raw torque for odd mixed populations.
2. In an antithetic rigid-flow probe with a fixed nonzero axial relative speed, finite-gap torque is nonzero and damps rotation. Halving radial gap from 10 to 5 to 2.5 mm reduces mean angular changes per AMU from `-0.0007481321` to `-0.0001870541` to `-0.00004676485`, consistent with the derived quadratic leading term. This is not a general pathwise quadratic-error theorem.
3. Annular volumes independently integrate the physical cylindrical measure and physical represented inventory.
4. Source-fitted near-endpoint interfaces keep particles within their true physical cells and retain exact chamber endpoints.
5. Four independent 8192-marker mixed-mass common-5-eV Maxwellians, 32 collision steps of 1 microsecond at `1e18 m^-3`, have mean species temperature changes `+0.003645/-0.003645 eV`; five radial-component CDF changes have magnitude at most `0.0025635`. Predeclared test allowances were 0.08 eV and 0.012. These are controlled stationarity/sampling checks, not a finite-time non-equilibrium Landau acceptance test.
6. The actual engine's initial local-regime assessment uses cylindrical flow: a strong-rotation uniform-disk probe gives minimum local temperature `1.67197 eV`, near the independent continuum lower-mass value `1.76772 eV` with a 0.5-eV finite-sampling allowance. Cartesian mean subtraction would add nine times the rigid-rotation variance in this specified probe.
7. Changing inactive pulse radius/slug controls leaves equilibrium histories, local-regime assessments, collision diagnostics and spatial outputs identical.

The tests are frozen for the parent final gate. Host execution followed the existing user-scoped project exception after inaccessible safe-dev service; no settings, hooks, credential access or denied browser-origin workaround was used. No deployed browser, GPU or apparatus-validity claim is made.
