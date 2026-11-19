# Equilibrium composition and collection

Open **Plots → Equilibrium**. Set the gas edge speed and temperature. Move the cut
slider to select an inner sample. **Use sampled state** copies the selected
timeline state; the run stays unchanged.

## What is prescribed?

Two ideal neutral species are in a closed cylinder. Rigid rotation gives one
angular speed Ω = v/R at all radii. Temperature T is uniform. Radius R, length L,
particle inventory N and light number fraction x are fixed. The vessel stays still.

The calculation does not include shear, discharge sustainment or gas-phase stability.
Thus, a lithium input at 500 K is not a vapor-stability prediction.

D/T refer to atoms; D₂ refers to molecules. Purity counts gas particles, not mass
or nuclei. For He/D₂, molecule recovery equals deuterium-nuclei recovery.

## Why does composition vary?

Pressure increases with radius to give the inward force for circular motion.
For species s, partial pressure nₛkT gives this equilibrium force balance:

```math
kT\frac{d n_s}{dr}=n_s m_s\Omega^2 r.
```

Here, nₛ is number density, mₛ is particle mass and k is Boltzmann’s constant.
During rotation, heavier particles have a larger wall-to-axis density ratio at the same temperature and angular speed.
With volume coordinate y = r²/R², integration and normalization give:

```math
\beta_s=\frac{m_s v^2}{2kT},\qquad Z(b)=\int_0^1e^{by}\,dy=\frac{e^b-1}{b},\qquad Z(0)=1.
```

Each species keeps its inventory. With qₛ = exp(βₛy)/Z(βₛ), densities and local
light fraction are:

```math
n_L=\frac{Nx}{\pi R^2L}q_L,\quad n_H=\frac{N(1-x)}{\pi R^2L}q_H,\qquad X_L(r)=\frac{n_L}{n_L+n_H}.
```

For a mixed feed, separation factor α compares heavy/light number ratios at the wall and axis:
log α = βH − βL. Larger v²/T strengthens this contrast; composition percentages
do not multiply by α. Pure feeds keep their composition. Equal masses keep uniform composition even when both
densities increase with radius.

## What does a cut collect?

A cut divides the inventory into inner and outer samples. For cut radius cR,
the fraction of species s inside is:

```math
F_s(c)=\frac{e^{\beta_s c^2}-1}{e^{\beta_s}-1},\qquad F_s(c)=c^2\ \text{when}\ \beta_s=0.
```

Light purity is the light-particle fraction in the inner sample. Light recovery
is the fraction of all light particles that the sample contains:

```math
P_L=\frac{xF_L}{xF_L+(1-x)F_H},\qquad \mathcal R_L=F_L.
```

The outer heavy sample uses 1 − F, with species exchanged. Inner light inventory
is NxFL. The two samples conserve each species.

Empty-sample purity and absent-species recovery are undefined (“—”). Particle
counts are ensemble expectations, not necessarily integers. These samples do not
give continuous extraction yields, separation times, throughput or power.

## Numerical qualification

Numerical qualification means results within specified numerical limits. Input
limits are masses 1–250 u (light ≤ heavy), T 100–10,000 K and speed
0–200,000 m/s, with βH ≤100. Other limits are R 0.001–10 m, L 0.001–100 m,
N 1–10³⁰ and x/c in [0,1]. This is not a physical operating envelope.

Stable exponential/tail integrals keep small enrichment changes and tiny-cut
counts. An independently developed Python Decimal calculation uses 80-digit
precision for 8,640 cases. Simpson quadrature uses 1,024, 4,096 and 16,384
intervals. Acceptance limits stay fixed:

- Fraction/normalized-density errors: absolute ≤2×10⁻¹², positive-value relative ≤2×10⁻¹¹.
- Species split error ≤2×10⁻¹³.
- Gain error ≤2×10⁻¹⁴; for |gain| ≥10⁻¹², also ≤10⁻⁷|gain| + 32εx(1−x)Δβ (ε is binary64 precision).
- Final quadrature relative error ≤2×10⁻¹¹; refinement is necessary when coarse error >10⁻¹².

SI-density/count tests include a tolerance of two smallest binary64 values for
subnormal rounding. Fraction underflow does not necessarily cause count underflow.
Positive cuts keep defined purity. Pointwise tests do not include plot interpolation
and do not cover all real inputs. They do not show experimental accuracy.

Speed/temperature endpoints show sampled sensitivity, not guaranteed extrema
or confidence intervals. Invalid combinations give invalid output. JSON files
contain SI inputs/results, curves, counts, input combinations and source hashes.
[NIST 2022 CODATA](https://physics.nist.gov/cuu/pdf/JPCRD2022CODATA.pdf) gives k and u.
The calculation does not propagate constant, mass or model uncertainties.

[Open the calculator beside the simulator](/?level=2&guide=physics&topic=bias&try=equilibrium)
