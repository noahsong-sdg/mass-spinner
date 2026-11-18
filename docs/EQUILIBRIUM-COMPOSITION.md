# Equilibrium composition and collection

Open **Plots → Equilibrium**. Set gas edge speed and temperature; move the cut
slider. **Use sampled state** copies a timeline state without changing the run.

## What is prescribed?

Two ideal neutral species in a cylinder: rigid rotation Ω = v/R, uniform
temperature T, radius R, length L, fixed inventory N and light number fraction x.
The vessel stays still. Shear, gas-phase existence and discharge sustainment are
not solved: prescribed lithium at 500 K is not a vapor-stability prediction.

D/T mean atoms; D₂ means molecules. Purity counts gas particles, not mass or
nuclei. In He/D₂, D₂ recovery also equals deuterium-nuclei recovery.

## Why does composition vary?

Circular motion requires an outward-rising pressure. With partial pressure nₛkT,
each species’ equilibrium density satisfies

```math
kT\frac{d n_s}{dr}=n_s m_s\Omega^2 r.
```

Integration gives a steeper exponential for heavier particles. Normalize each
to its fixed inventory, using volume coordinate y = r²/R²:

```math
\beta_s=\frac{m_s v^2}{2kT},\qquad Z(b)=\int_0^1e^{by}\,dy=\frac{e^b-1}{b},\qquad Z(0)=1.
```

With qₛ = exp(βₛy)/Z(βₛ), density and local light fraction are

```math
n_L=\frac{Nx}{\pi R^2L}q_L,\quad n_H=\frac{N(1-x)}{\pi R^2L}q_H,\qquad X_L(r)=\frac{n_L}{n_L+n_H}.
```

Larger v²/T strengthens heavy/light odds contrast: log α = βH − βL.
Percentages do not multiply by α. Equal masses keep uniform composition even
when both densities rise outward.

## What does a cut collect?

For cut radius cR, the fraction of species s inside is

```math
F_s(c)=\frac{e^{\beta_s c^2}-1}{e^{\beta_s}-1},\qquad F_s(c)=c^2\ \text{when}\ \beta_s=0.
```

Light purity measures the sample’s composition; recovery measures how much of
all light particles it keeps:

```math
P_L=\frac{xF_L}{xF_L+(1-x)F_H},\qquad \mathcal R_L=F_L.
```

The outer heavy product uses 1 − F and exchanged species. Inner light inventory
is NxFL; both cuts conserve each species. Empty-cut purity and absent-species
recovery are undefined (“—”). Counts are ensemble expectations, not integers.
These closed-equilibrium partitions are not continuous extraction yields.
They predict no settling time, throughput or power.

## Numerical qualification

Screened inputs: masses 1–250 u (light ≤ heavy), T 100–10,000 K, R 0.001–10 m,
L 0.001–100 m, N 1–10³⁰, x/c in [0,1], speed 0–200,000 m/s and βH ≤100.
**This numerical domain is not a physical operating envelope.**

Stable exponential/tail integrals preserve weak enrichment and tiny-cut counts.
An independent 80-digit Python Decimal oracle checks 8,640 cases; Simpson
quadrature refines through 1,024, 4,096 and 16,384 intervals. Frozen gates:

- Fraction/normalized-density errors: absolute ≤2×10⁻¹², positive-value relative ≤2×10⁻¹¹.
- Species split error ≤2×10⁻¹³.
- Gain error ≤2×10⁻¹⁴; for |gain| ≥10⁻¹², also ≤10⁻⁷|gain| + 32εx(1−x)Δβ (ε is binary64 precision).
- Final quadrature relative error ≤2×10⁻¹¹; require refinement when coarse error >10⁻¹².

SI-density/count regressions allow two smallest binary64 values for subnormal
rounding. Fraction underflow need not imply count underflow; positive cuts
retain defined purity. Pointwise tests cover neither plot interpolation nor
all real inputs, and are not experimental validation.

Speed/temperature endpoint scenarios are sampled sensitivities, not guaranteed
extrema or confidence intervals; invalid combinations invalidate output.
JSON exports retain SI inputs/results, curves, counts, scenarios and source hashes.
[NIST 2022 CODATA](https://physics.nist.gov/cuu/pdf/JPCRD2022CODATA.pdf) supplies k and u;
constant, mass and model uncertainties are not propagated.

[Open the calculator beside the simulator](/?level=2&guide=physics&topic=bias&try=equilibrium)
