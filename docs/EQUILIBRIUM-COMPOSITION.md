# Equilibrium composition and collection

Open **Plots → Equilibrium**. Set gas edge speed and temperature, then move the cut slider. The upper plot shows local composition; the lower plot shows the purity–recovery tradeoff across every cut. **Use sampled state** copies an accepted timeline state explicitly. This calculator never changes the 3D trajectory.

## What is prescribed?

Two neutral species, rigid rotation at angular speed Ω, uniform temperature T, a cylinder of radius R and length L, total neutral inventory N, and its light-species number fraction x. Gas speed v at R specifies Ω = v/R; this is not the metal vessel’s speed. Near-wall shear is not resolved. Inventory stays fixed when temperature changes. Gas-phase existence and discharge sustainment are assumed, not solved.

## Why does composition vary?

Outward centrifugal force is balanced by a pressure gradient. For each ideal species, pressure is nₛkT; this gives the density slope:

```math
kT\frac{d n_s}{dr}=n_s m_s\Omega^2 r.
```

Integrating gives an exponential that is steeper for heavier particles. Normalization matters: each species keeps its own inventory. Use y = r²/R², the fraction of cylindrical volume inside r, and define:

```math
\beta_s=\frac{m_s v^2}{2kT},\qquad Z(b)=\int_0^1e^{by}\,dy=\frac{e^b-1}{b},\qquad Z(0)=1.
```

The density relative to that species’ volume mean is qₛ = exp(βₛy)/Z(βₛ). Absolute densities and the local light-species share follow:

```math
n_L=\frac{Nx}{\pi R^2L}q_L,\quad n_H=\frac{N(1-x)}{\pi R^2L}q_H,\qquad X_L(r)=\frac{n_L}{n_L+n_H}.
```

Local composition is neither density nor the feed fraction x. Increasing v²/T strengthens the axis-to-wall odds contrast: log α = βH − βL. Local percentages do not multiply by α. Equal masses have uniform composition even while both densities rise toward the wall.

## What does a cut collect?

Let c be the inner cut radius divided by R. Integrating qₛ over cylindrical volume gives the fraction Fₛ of that species inside the cut:

```math
F_s(c)=\frac{e^{\beta_s c^2}-1}{e^{\beta_s}-1},\qquad F_s(c)=c^2\ \text{when}\ \beta_s=0.
```

The inner light purity and recovery answer different questions:

```math
P_L=\frac{xF_L}{xF_L+(1-x)F_H},\qquad \mathcal R_L=F_L.
```

Purity asks “what fraction of my sample is light?” Recovery asks “what fraction of all the light particles did I collect?” For the outer heavy product, replace F by S = 1 − F and exchange species. Absolute inner light inventory is NxFL; the two cuts together conserve each species. An empty cut has undefined purity; recovery of an absent species is undefined. These appear as gaps and “—”, not zero purity.

These are **partitions of a closed equilibrium inventory**, not continuous extraction yields. No separation time, feed flow, throughput, power or cascade performance is predicted. The evolving simulator remains a separate model.

## Numerical qualification

The screened domain is masses 1–250 u (light ≤ heavy), T 100–10,000 K, R 0.001–10 m, L 0.001–100 m, N 1–10³⁰ particles, x and c in [0,1], nonnegative wall speed ≤200,000 m/s and βH ≤100. This is a numerical domain, not a physical operating envelope. In particular, prescribed lithium gas is not a vapor/condensation calculation.

Production uses stable exponential integrals, direct outer-tail integration, and a separate enrichment-gain calculation to retain small changes. The independent Python Decimal oracle uses 80-digit direct integrals. The 5,280-case matrix compares local density/composition, cut purity/recovery, weak enrichment and species conservation. Independent Simpson integration refines through 1,024, 4,096 and 16,384 intervals. Frozen gates:

- Absolute fraction/density error ≤2×10⁻¹²; relative error ≤2×10⁻¹¹ for every positive density and species-cut fraction in the matrix.
- Species inventory split error ≤2×10⁻¹³.
- Gain absolute error ≤2×10⁻¹⁴; when |gain| ≥10⁻¹², also require error ≤10⁻⁷|gain| + 32εx(1−x)Δβ, where ε is binary64 machine epsilon. The explicit rounding term accounts for subtracting near-coincident composition levels.
- Independent quadrature final relative error ≤2×10⁻¹¹, with refinement required when the coarse error exceeds 10⁻¹².

A passing finite screen is not a proof over all real inputs or experimental validation. Plot interpolation is not covered by the pointwise gates.

**Input scenarios** evaluate the declared speed/temperature endpoint combinations. They are sampled sensitivity cases, not guaranteed profile extrema, confidence intervals or measured uncertainty. A combination outside the numerical domain invalidates the output rather than silently clamping it.

JSON exports include exact prescribed inputs, SI outputs, densities, full cut curves, selected-cut particle counts, scenario inputs, model version and hashes of the producing calculator source. Constants: [NIST 2022 CODATA](https://physics.nist.gov/cuu/pdf/JPCRD2022CODATA.pdf), k = 1.380649×10⁻²³ J/K and u = 1.66053906892×10⁻²⁷ kg. Constant, species-mass and physical-model uncertainties are not propagated.

[Open the calculator beside the simulator](/?level=2&guide=physics&topic=bias&try=equilibrium)
