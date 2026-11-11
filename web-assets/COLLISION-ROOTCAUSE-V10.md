# Independent spatial-collision diagnosis and bounded axisymmetric increment

7 November 2026 UTC. Read-only trace of the version-9 collision paths and artifacts, followed by an isolated ring-cell module and targeted tests. This report does not claim intended-horizon convergence; the parent owns engine integration, whole-run studies, final checks and publication.

## Verified root causes

Execution is `simulateDoublewell → collisionCells → Nw/V → collideCoulombCell → scatterCoulombPair → orbit/collector/conservation histories`. Both fixed and adaptive partitions use the same random mixed-pair Coulomb generator. Within a fixed cell containing N equal-weight representatives, its even-N effective density is `(N−1)w/V` and partner probability is `1/(N−1)`; for odd N these are `Nw/V` and `1/N`. Each represented other partner therefore contributes `w/V` to the infinitesimal empirical generator. No factor/sign/reduced-mass defect was reproduced. The existing SI TA variance agrees with [Wang et al. 2008, Eq. 3](https://www.math.ucla.edu/~caflisch/Pubs/Pubs2008/nanbuConvergenceJCP2008.pdf). That homogeneous velocity-space result does not validate the spatial partition.

### 1. A geometric support error survives infinite marker count

Let the initially uniform pulse occupy Ω, with number density n₀, and let C denote a fixed physical collision cell. Its limiting histogram density is `nC=n₀|Ω∩C|/|C|`. Thus the density-squared integral relative to the true initial pulse is

`η = ΣC |Ω∩C|² / (|Ω| |C|) ≤ 1`.

Equality requires each occupied cell to lie inside the support, except boundary sets of zero volume. A partially filled cell dilutes the pulse. If M independent positions sample Ω with fixed total represented inventory, the expected self-excluded histogram statistic has the additional empirical factor `(1−1/M)η`; marker shot noise does not remove η.

For the actual default disk radius 0.08 m, slug length 0.15 m, chamber radius 0.2 m and length 0.6 m, exact circle/rectangle overlap gives:

| Cartesian cells across | Axial cells | Infinite-marker η |
| --- | --- | --- |
| 3 | 5 | 0.6858581659 |
| 4 | 6 | 0.4188790205 |
| 6 | 9 | 0.7460295847 |
| 12 | 18 | 0.8066415889 |

These values were computed from exact cell/source intersections, not fitted to simulated collection. They explain why increasing resolution can initially worsen the source-density estimate. They do **not** mean every velocity-weighted collision observable has precisely this multiplicative error.

In simple terms: the code spreads a compact source through boxes that include vacuum. Adding particles to the same boxes cannot remove that dilution.

### 2. Finite-distance impulses introduce artificial angular transport

The Cartesian TA map conserves pair kinetic energy and linear momentum. Since the two impulses act at distinct representative positions, their mechanical angular change is

`ΔPθ = (xa−xb)Δpya − (ya−yb)Δpxa`.

Positions are fixed during collision, so the qBr²/2 canonical term does not change. Summing this error exactly into a ledger diagnoses the artificial torque; subtracting it from a reported conservation residual does not repair trajectories. The previous adaptive experiment reduced torque while worsening actual pair distance and source dilution, so a small torque residual alone cannot select a better collision model.

In simple terms: equal opposite kicks at different radii can spin the sampled plasma even though they preserve pair energy. The physical local collision operator applies both kicks at one location.

### 3. Remaining errors cannot be certified away

Local present-species counts below four leave thermal-regime estimates unresolved. This is missing evidence, not a density-independent reason to disable collisions. Coulomb angular variance depends on g⁻³; rare low-relative-speed pairs retain a finite-step error. Whole-run statistical intervals and the independent homogeneous Landau candidate remain necessary. Reusing a seed label at different particle counts does not make the two realized initial populations identical.

## Smallest bounded improvement implemented

`src/axisymmetric-collisions.ts` retains the existing TA map and adds a separate, explicit axisymmetric spatial representation. The default fields, boundary, source and ensemble are axisymmetric. Each representative can therefore denote an azimuthal ring, with physical cell volume

`V = π(rhigh²−rlow²)(zhigh−zlow)`.

Particles are grouped by r and z. Each particle's velocity is rotated into its own orthonormal `(vr,vθ,vz)` basis before using the unchanged mixed-pair generator. Afterwards each velocity is rotated back to its original Cartesian azimuth. This is a positional symmetry reduction with all three velocity components; it is not a guiding-center or gyrophase approximation. [ECsim-CYL, Section 2](https://arxiv.org/html/1810.08433) independently describes the axisymmetric three-velocity representation and volume/weight bookkeeping. Its field solver and energy-conservation results are not transferred to this collision increment.

Uniform-r bins bound radial velocity shear and angular-error separation by Δr; equal-r² bins become relatively broad near the axis. Equal marker weights are preserved. The full annular volume is used even if a ring cell is only partially occupied; there is no sampled-support renormalization, collision-rate floor, nearest-neighbor probability change, thermostat or angular projection.

Pair energy and axial momentum are conserved. Global transverse Cartesian momentum of a ring is zero by azimuthal symmetry and is **not** the momentum of its displayed representative. The physical finite-radial-gap error remains explicitly

`ΔPθ = (ra−rb) Δpθa`.

There is no exact angular-conservation claim at finite Δr. Actual meridional pair separation `sqrt((ra−rb)²+(za−zb)²)` must be labeled separately from Cartesian representative distance. Ring thermal diagnostics must use local cylindrical velocities; otherwise rigid azimuthal flow is falsely counted as heat. At exactly r=0 the radial basis is a coordinate convention; initialization reaches that measure-zero point only for a zero RNG draw.

The ring representation does not resolve nonaxisymmetric perturbations, turbulence or unstable collective fields. It must remain a separate choice while the legacy Cartesian branches retain their prior behavior.

### Grid choice is evidence, not a convergence trick

Ring grids are not automatically unbiased: three radial/nine axial cells have η=0.6776543210 for the default source. For the stated discontinuous pulse, radial counts 5/10/20 and axial counts 12/24/48 exactly align the initial support and have η=1. This is an ordinary discontinuity-aligned refinement family with unchanged physical inputs, not a pulse-overlap correction to evolving rates. Nonaligned resolutions or shifted boundaries remain an important independent control. Subsequent transport changes the support and still requires convergence.

The module also accepts optional `radiusBreakM` and `axialBreakM`: declared fixed interfaces inserted into an otherwise regular grid. Parent integration can use the known initial disk/slug interfaces for pulse cases. The faces are fixed in time, independent of sampled particles, and only split cells, so maximum widths do not increase. Initial η becomes one without renormalizing any occupied volume. Equilibrium cases must ignore inactive pulse source controls. `axisymmetricGrid` is the single source for executed faces, including vacuum regions, and for cell assignment; exports can report actual widths rather than nominal regular spacing.

Independent review caught an endpoint defect in coincident-edge handling: an interior interface within 32 floating-point epsilons of the axis or wall could replace the physical endpoint. In simple terms, a requested tiny interior boundary could move the chamber boundary instead. Coalescing is now restricted to interior grid faces; exact axis/wall endpoints remain fixed, while nearby distinct interfaces are inserted. This preserves the actual physical domain and avoids rejecting valid near-boundary meshes. Interior coincident faces still coalesce to avoid artificial roundoff-width slivers. The independent reviewer adds a regression for the reproduced case.

The chosen change uses demonstrated axisymmetry to increase local-state occupancy at a given marker count without inventing new physical coefficients. A nearest-neighbor matching replacement with the old cell rate would change partner probabilities and require a separate importance-weight/rate derivation; simply shrinking the spatial pair distance would not justify it. Enforcing angular conservation by projection would change the collision law and could hide the error being measured.

## Executed narrow checks

```
./node_modules/.bin/tsx --test tests/axisymmetric-collisions.test.ts
./node_modules/.bin/tsc --noEmit --strict --target ES2022 --module NodeNext --moduleResolution NodeNext src/axisymmetric-collisions.ts
```

**7 tests passed, 0 failed; strict module typecheck passed.** They independently check exact annular volumes/inventory, the two-marker SI rate, mixed-mass energy/axial momentum, the measured radial-gap torque, independent azimuth relabeling, zero relative speed for identical local flow at opposite azimuth, aligned source support, fixed source-face insertion/width bounds and invalid geometry. Parent-requested independent reviewer tests are separate. No engine integration or collector-accuracy pass is established by these module checks.

Execution used the explicitly scoped host exception in the assigned task after safe-dev service access was denied. No browser-origin fetch, policy/hook change or credential access was used.
