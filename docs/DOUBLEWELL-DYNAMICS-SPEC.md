# Conservative double-well dynamics: model and validation specification

Version-7 update: an explicitly exploratory kinetic implementation now exists. Collision/orbit, accounting and short-time equilibrium tests pass; spatial/particle convergence and experimental prediction remain open gates. See [implementation](/STAGE4-IMPLEMENTATION.md), [physics audit](/STAGE4-PHYSICS-AUDIT.md) and [numerical evidence](/STAGE4-NUMERICAL-VALIDATION.md). The original preimplementation specification below is preserved as history.

Evaluated 6 November 2026. This is the stage-four implementation specification, not an implemented transient separator or a claim of experimental validation. Only this document was added by this reviewer.

## Existing path and root cause

`laboratory.js → reducedConfig('doublewell') → worker → geometries.ts` evaluates a fixed-canonical-momentum radial Hamiltonian. It has no evolving distribution, physical density, collision partners, source/sink balance or time variable. Separately, `physics.ts → simulate` evolves independent particles and scatters them against cold stationary neutrals. That bath operator is not multispecies ion–ion equilibration.

Consequently, neither animating the landscape nor adding a relaxation coefficient can predict double-well equilibration time or collector purity. In simple terms, a map of accessible radii does not tell how a whole mixture moves between those radii. The smallest valid next step is an explicitly defined kinetic model with a separately verified Coulomb operator; it cannot be hidden inside the existing landscape calculation.

## What the primary sources establish

Gueroult, Rax & Fisch (2014), [author full text](https://w3.pppl.gov/~fisch/fischpapers/2014/Gueroult.DoubleWell.2014.pdf), [DOI](https://doi.org/10.1063/1.4864325), was reread in full. Equations 5 and 8–10 derive the mass-dependent effective wells. The paper assumes collisional redistribution and sufficient axial residence before using Boltzmann profiles. Its estimate compares residence with transverse diffusion time; it does not supply a general transient collision/extraction solver.

For the collision algorithm, [Nanbu (1997)](https://doi.org/10.1103/PhysRevE.55.4642) was checked at the publisher abstract level. [Wang et al. (2008), author full text](https://www.math.ucla.edu/~caflisch/Pubs/Pubs2008/nanbuConvergenceJCP2008.pdf), DOI [10.1016/j.jcp.2007.12.027](https://doi.org/10.1016/j.jcp.2007.12.027), provides the Landau operator, binary relative-velocity updates, and independent-seed/time/particle convergence comparisons. Their homogeneous anisotropic-Maxwellian problem is a suitable operator benchmark. The original [Takizuka–Abe (1977)](https://doi.org/10.1016/0021-9991(77)90099-7) publisher full text was inaccessible; no algorithm coefficient should be attributed to an unread original.

## Minimum proposed model

Use a new prescribed-field multispecies kinetic model. Retain the landscape as a separate diagnostic. Let `f_s(x,v,t)` be physical number phase-space density, with two positive ion species initially. In SI units:

```
∂t f_s + v·∇x f_s + (q_s/m_s)(E + v×B)·∇v f_s
    = Σ_b C_sb[f_s,f_b] + S_s.

φ(r) = V[(r/a)^4 − κ(r/a)^2]
E = −∇φ;  B = B0 zhat.
H_s = m_s |v|²/2 + q_s φ
Pθ,s = m_s(x v_y − y v_x) + q_s B0 r²/2.
```

Prescribed fields are an explicit approximation. They neither reproduce electrode voltage penetration nor supply electron/current closure. Full particles may be advanced in Cartesian coordinates to avoid an axis singularity; diagnostics and collision density bins can exploit axisymmetry. Start with equal statistical weights, not the current unit-count particles with no physical density normalization.

For weakly coupled Coulomb interactions, choose and document a Landau–Fokker–Planck discretization. One conventional normalization, for number-density-normalized `f`, is

```
Γ_sb = q_s² q_b² lnΛ_sb / (8π ε0²)
U_ij(u) = δ_ij/|u| − u_i u_j/|u|³;  u=v−v'
C_sb = (Γ_sb/m_s) ∂/∂v_i ∫ U_ij(u)
       [ (f_b/m_s) ∂f_s/∂v_j − (f_s/m_b) ∂f_b/∂v'_j ] dv'.
```

The matching numerical algorithm must reproduce this normalization, density weighting and time scaling. Do not substitute isotropic neutral scattering, a fixed collision rate, or a temperature-reset thermostat. Start by implementing the homogeneous operator independently of the orbit/UI path.

For a binary elastic velocity update at a common spatial point, define `g=v_s−v_b`, `Vcm=(m_s v_s+m_b v_b)/(m_s+m_b)`, rotate `g` to `g'` without changing its magnitude, and reconstruct

```
v'_s = Vcm + m_b g'/(m_s+m_b)
v'_b = Vcm − m_s g'/(m_s+m_b).
```

This independently proves pair kinetic-energy and momentum conservation. The Coulomb angular distribution and rate are additional physics, not determined by this kinematic identity.

## Important equilibrium and angular-momentum gate

The following is an independent statistical-mechanical derivation, not a claim that the 2014 device reaches this state. In an isolated, interspecies-collisional mixture with conserved total energy and canonical angular momentum, a candidate thermal endpoint is

```
f_s ∝ exp[−(H_s − Ω Pθ,s)/(kB T)]
n_s(r) ∝ exp{−[q_s φ(r) − (m_s Ω²+q_s Ω B0)r²/2]/(kB T)}.
```

Completing the velocity square gives common temperature and common rigid rotation `Ω`. In contrast, the paper's mass-dependent effective energy `q_s φ + q_s² B0²r²/(8m_s)` corresponds to the species-specific choice `Ω_s=−q_s B0/(2m_s)`. These frames differ between masses. Intraspecies collisions preserve each species' angular-momentum budget; interspecies collisions exchange those budgets. A simulator must therefore measure whether radial sorting occurs before cross-species drag and axial escape. It must not force every species toward its own fixed-Pθ landscape while claiming isolated-mixture momentum conservation. External drive capable of maintaining differential rotation needs an explicit torque/energy budget.

For a collision applied at one common point, pair momentum conservation also conserves pair mechanical angular momentum, and positions—and hence the magnetic contribution to total Pθ—are unchanged. Pairing particles at different locations within one cell introduces a torque error `(x_s−x_b)×Δp_s`. A cell-based implementation must demonstrate convergence of this error or use a collision discretization preserving the required angular moment. Conserving pair kinetic energy alone is insufficient.

## Inputs needed before a transient run is valid

- Absolute density and particle weights/cell volumes; species masses, charges, mixture composition and initial spatial/velocity distribution.
- Explicit pulse or forward-flux reservoir source, with source duration and energy/angular-momentum flux.
- Ti/Te and electron screening assumption; a documented Coulomb-log prescription and its regime, rather than an unexplained fitted collision rate. Check weak coupling, screening and collision magnetization assumptions.
- `a`, `L`, `B0`, independent quadratic/quartic coefficients, end/wall boundary conditions, and a specified collector acceptance.
- Physical model of any imposed drive, heat bath or replenishment. Such terms must appear in conservation ledgers.

The existing UI does not provide all of these inputs for the double-well model. Supplying declared hypothetical values is possible; inferring them from the static potential or the optional cold-neutral control is not.

## Reviewable implementation sequence and release gates

1. **Collision-only kernel.** Equal-weight homogeneous ions, then two masses. Verify exact pair momentum/energy, rotational covariance, equal-species Maxwellian stationarity, temperature equilibration, anisotropy relaxation and relative-drift decay. Compare independent ensembles and `dt,dt/2,dt/4`; reproduce an independently specified published or deterministic Landau benchmark before assigning physical seconds. Test zero relative velocity and very unequal masses without hiding a singular rate with arbitrary clipping.
2. **Collisionless quartic orbit kernel.** Add the explicitly differentiated quartic field as a separate model. Verify H and Pθ convergence, bounded-orbit turning points against a one-dimensional radial-energy quadrature, full accounting, finite-time exit/wall competition and boundary event refinement. Existing parabolic results must remain unchanged.
3. **Coupled conservative closed-column benchmark.** Combine only after stages 1–2 pass. Verify each species' inventory, total H/Pθ and no-source equilibrium over time. Quantify collision-cell torque, radial/time/particle convergence and species angular-momentum exchange. Test the common-Ω endpoint above rather than forcing the paper's species-specific-frame profiles.
4. **Open finite separator.** Add declared inlet/outlet conditions and collect flux-resolved radial composition. At every time, account for injected, active, source-return, wall and end particles; include the corresponding energy and Pθ flux. Use independent seeds and intervals. Compare redistribution, drag and axial residence times without assuming their ordering.
5. **Physical validation.** Compare one fully documented operating point using measured fields, plasma potential, source, temperatures, density, charge states and collectors. Hold out a second operating condition. Numerical conservation or similarity to a paper's plot is not experimental validation.

Useful outputs after these gates are density and radial flux versus time, each species' mean flow/temperature/Pθ, collision and source/sink budgets, conditional survivor distributions with counts, collector cumulative incidence and uncertainty. Until then, the product should offer the existing energy-landscape diagnostic and this specification, with no time slider presented as validated collisional separation.

## Decision for this increment

No transient solver was added. The unresolved collision normalization/weighting, angular-momentum discretization and source/field assumptions would make a quick relaxation feature misleading. This specification makes stage four concrete and reviewable; it does not close its numerical or physical validation gates. No project scripts, tests or browser actions were executed for this documentation-only review.
