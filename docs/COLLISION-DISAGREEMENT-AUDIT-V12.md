# Independent collision-operator audit, version 12

7 November 2026 UTC. Read-only physics/source audit of the production
Takizuka–Abe (TA) path, the exact v11 input generator and exported comparison,
and the upstream WarpX 26.10 release-tag implementation. This review changes no
production solver. It separates exact algebra/source findings from explanations
that still require controlled numerical experiments.

## Main finding

These are not identical finite-step collision algorithms. The current source
evidence does **not** establish a missing factor of two, mass or density bug in
the production infinitesimal operator. It does establish two material differences:

1. WarpX 26.10's default cumulative angular law is **Bobylev**, whereas production
   samples a Gaussian for tan(theta/2). A previous general description as
   Perez/Nanbu does not identify the actual default angular law.
2. WarpX caps its transport cross section even with a positive fixed Coulomb
   logarithm. Production TA and an ordinary fixed-log Landau equation are uncapped.
   Therefore strictly decreasing the timestep does not make all three physical
   operators identical at arbitrarily low relative speed.

The first difference predicts weaker TA relaxation at finite timestep in a
controlled initial-state moment calculation. The second is a real model mismatch,
but its effect on initial Maxwellian interspecies energy exchange can be
quantified separately and should not be blamed for a percent-scale transient
without that calculation. Monte Carlo uncertainty remains substantial in v11.

## Traced execution paths and physical identity

Production `compareWarpReference` clones the exact exported WarpX initial physical
velocities, then calls `collideCoulombCell` with **total** density 1e18/m3, not the
single-species density 5e17/m3. The collision cell mixes both equal-weight species,
shuffles, pairs and applies the conservative TA rotation. Equal physical weights
justify unweighted comparison moments. Bulk flow is subtracted for the exported
temperature; raw second moment is separately retained.

WarpX input declares separate cross, self-A and self-B processes, equal weights,
exact 40 u/84 u SI masses, positive elementary charges and lnLambda=12. The fields,
spatial push, gather/deposit and correction projection are disabled. The audited
release path is `PairWiseCoulombCollisionFunc` → `ElasticCollisionPerez` →
`UpdateMomentumPerezElastic`.

The constructor defaults to `BOBYLEV`; its option belongs to **each collision
name** (`cross.cumulative_scattering_angle_model`, `selfA...`, `selfB...`), not a
global collisions setting. The v11 deck omits this option. This identifies the
expected default from release source; installed conda-package provenance and an
explicit/default runtime replay are separate evidence from reading source.
[Pinned constructor](https://github.com/BLAST-WarpX/warpx/blob/26.10/Source/Particles/Collision/BinaryCollision/Coulomb/PairWiseCoulombCollisionFunc.H)

## Independent infinitesimal-generator derivation

Let g = va - vb, g = |g|, mu = ma mb/(ma+mb), alpha = mb/(ma+mb), and
Gamma = qa² qb² lnLambda/(8 pi epsilon0²). Production draws

    delta ~ Normal(0,S),  S = Gamma n_eff dt/(mu² g³),
    cos(theta) = (1-delta²)/(1+delta²),
    sin(theta) = 2 delta/(1+delta²),

with uniform azimuth. Conservation follows from retaining center-of-mass velocity
and relative-speed magnitude. For S tending to zero,

    E[Delta g] = -2 S g_vector + O(S²),
    E[Delta g Delta g^T] = 2 S g² (I - ghat ghat^T) + O(S²).

Since Delta va = alpha Delta g, the leading one-species moments are

    E[Delta va]/dt = -2 Gamma n_eff g_vector/(ma mu g³),
    Cov(Delta va)/dt = 2 Gamma n_eff (I-ghat ghat^T)/(ma² g).

These are consistent with the weak moments of

    C_ab = (Gamma/ma) div_v integral U(g)
           [ fb/ma grad_v fa - fa/mb grad_vb fb ] dvb,
    U(g) = (I-ghat ghat^T)/g.

The factor mu cancels from diffusion but remains in the total drag after the
diffusion-divergence contribution. Treating the collision frequency, momentum
loss and thermal-energy transfer as interchangeable would obscure this check.
This derivation independently agrees with the separate PETSc physics audit.
It is an infinitesimal check, not a finite-step or spatial-convergence proof.

## Finite-N pairing is normalized consistently

Let each species have N equal-weight representatives and physical density n.
Production has M=2N and selected-pair effective density

    n_eff = 2 n (2N-1)/(2N).

A tagged particle selects an unlike partner with probability N/(2N-1); its
mean unlike-species effective density is therefore exactly n. The self-species
mean is n(N-1)/N. Equivalently, every distinct empirical partner contributes
n/N to the leading generator.

WarpX's cross n12 is wN/V=n. Its self n12 is w(N-1)/V=n(N-1)/N. For self pairs,
the index arrays split one shuffled species into two halves, but the density
arguments passed to the collision functor remain the **full species density n**.
The cap therefore uses n, not n/2 or total mixture density 2n.
[Pair effective densities](https://github.com/BLAST-WarpX/warpx/blob/26.10/Source/Particles/Collision/BinaryCollision/Coulomb/ElasticCollisionPerez.H),
[density accumulation and self call](https://github.com/BLAST-WarpX/warpx/blob/26.10/Source/Particles/Collision/BinaryCollision/BinaryCollision.H)

Thus different pairing does not by itself establish a first-order finite-N rate
normalization error. It does change step size per selected encounter, sampling
noise and finite-step composition. WarpX applies separate self/cross processes;
production applies one mixed pair per representative per step. Their finite-step
operators and splitting errors need not coincide.

## Finite-step angular law explains a directed hypothesis

In the nonrelativistic uncapped limit, WarpX's normalized scattering length s is
**2S** for the same effective partner density. Bobylev has

    D_B(s) = E[1-cos(theta)] = min(s,2).

For production TA,

    D_TA(S) = 2 E[delta²/(1+delta²)]
            = 2S - 6S² + 30S³ + O(S⁴),

where the series is only a small-S expansion. An exact stable definition is the
Gaussian expectation, not the truncated expansion. For equal density,
D_TA(s/2) = s - 1.5s² + 3.75s³ + ... . It is smaller than the Bobylev value
for sufficiently small positive s.

Mixed pairing makes the finite-step difference larger than simply comparing
the two samplers at the same S: production selects an unlike partner only about
half the steps but uses approximately twice the single-species density when
selected. Its unlike first moment is approximately D_TA(s)/2 rather than D_B(s).
Its expansion is s - 3s² + ... . This predicts slower early transfer from hot
84 u ions to cold 40 u ions, consistent with v11's coarse-step sign. This sign
agreement alone does not establish the amount of the observed discrepancy.

Nanbu's option is another cumulative-angle approximation. It should be tested
explicitly rather than assumed to be the baseline. Published cross-method error
analysis likewise distinguishes statistical and timestep errors and finds
smaller timestep error for Nanbu in its benchmark cases; that is supporting
context, not validation of our mixture.
[Wang et al., JCP 2008](https://doi.org/10.1016/j.jcp.2007.12.027)

## Hard cross-section cap is a different limiting operator

The audited WarpX implementation computes, in the nonrelativistic limit,

    b0 = |qa qb|/(2 pi epsilon0 mu g²),
    sigma_raw = pi b0² lnLambda,
    rmin = (4 pi max(na,nb)/3)^(-1/3),
    sigma_max = 1/(max(na,nb) rmin),
    s = min(sigma_raw,sigma_max) n12 dt g.

This remains active with fixed positive lnLambda. The cap boundary is

    g_cap = [qa² qb² lnLambda/(4 pi epsilon0² mu² sigma_max)]^(1/4).

Below g_cap the infinitesimal rate is multiplied by (g/g_cap)^4 relative to the
uncapped Landau rate. No runtime disable option is exposed in the audited
function. Changing the Coulomb log or reducing physical density to compensate
would change the requested physical benchmark.
[Pinned scattering implementation](https://github.com/BLAST-WarpX/warpx/blob/26.10/Source/Particles/Collision/BinaryCollision/Coulomb/UpdateMomentumPerezElastic.H)

For independent zero-mean isotropic Maxwellians, the *initial* thermal exchange
cap effect has an analytic check. Let sigma_g² = e(Ta/ma + Tb/mb), with
temperatures in eV. Conditional on g_vector,

    E[V_COM dot g_vector | g_vector]
      = e(Ta-Tb) g²/[(ma+mb) sigma_g²].

The Landau energy-transfer radial integral is consequently proportional to
integral g exp[-g²/(2 sigma_g²)] dg. Defining z=g_cap²/(2 sigma_g²), the
capped/uncapped initial-slope ratio is

    R = 2 [1 - (1+z) exp(-z)]/z²
      = 1 - 2z/3 + z²/4 - z³/15 + O(z⁴).

Use the series or a cancellation-safe evaluation for small z. This is a
quantification of the initial Maxwellian moment, not a Maxwellian closure for
the full evolving distribution. It also does not measure all self-collision
or anisotropy effects.

## Independently reviewed numerical kernel controls

The separately executed [kernel-control output](../scientific/collision-kernel-v12/results.json)
has now been inspected against the independent derivations above. Its Python
Maxwellian conditional-COM quadrature and C++ all-cross-pair formulas agree with
the physical factors, pairing probabilities and energy conversion in this audit.
The controls are nonrelativistic reconstructions of the audited laws, not an
execution of WarpX's compiled scattering function.

At 5e17/m3 per species, the cap boundaries are **230.9282, 198.3961 and
159.3556 m/s** for 40/40, 40/84 and 84/84 respectively. Initial 2/10 eV
Maxwellian thermal exchange is **27982.1633 eV/s** uncapped versus
**27959.6645 eV/s** capped: a **0.0804041%** reduction. The independently
derived ratio series and direct quadrature agree to approximately 3e-15.

Initial continuum 40 u heating rates, eV/s:

| Step | Mixed TA, uncapped | Separate TA, uncapped | Separate Bobylev, uncapped |
| --- | --- | --- | --- |
| 1 microsecond | 24093.3791 | 25278.6649 | 27476.0683 |
| 0.25 microsecond | 26138.4052 | 26744.3753 | 27780.0012 |
| 0.0625 microsecond | 27161.7402 | 27443.9502 | 27901.7262 |
| 0.015625 microsecond | 27631.9921 | 27755.8357 | 27950.2089 |

Switching only the cap at the two coarsest steps changes the mixed-TA heating
rate by approximately 0.0013 and 0.0096 eV/s; it leaves the listed Bobylev rate
unchanged at printed precision because angular saturation already limits the
affected low-speed pairs. Switching angular law and pairing has an effect of
thousands of eV/s. This establishes a causal initial-moment mechanism, not just
a correlation between code labels and outputs. It does not apportion the entire
evolved 250/500 microsecond temperature difference.

Three actual N=2048 v11 initial arrays show the same directed finite-step law
difference in deterministic sums over all 4,194,304 cross pairs. Only 113–146
pairs per array are cap-affected. Their *signed infinitesimal* uncapped/capped
rate changes have inconsistent signs, while absolute energy-weighted removed
contributions range 1.45–2.69%. These are conditional finite-array diagnostics,
not estimates with N² independent samples and not a contradiction of the
analytic continuum 0.0804% reduction.

The reason is a singular initial-rate statistic. The unsmoothed pair generator
for raw energy contains V_COM dot g_vector/g³, whose typical magnitude near
g=0 is proportional to 1/g². A Maxwellian radial measure supplies g² dg, so
the first absolute moment is integrable but its second moment contains
integral dg/g² and is divergent. Analytically conditioning V_COM on g removes
that noisy residual and gives the regular continuum thermal-exchange formula.
Finite-step rotations bound the pair's energy exchange. Neither a few extreme
instantaneous derivatives nor their maximum is a finite-time transport error bar.

## Why a simple linear timestep extrapolation is unsafe

The fixed-g expansion above is not uniform as g approaches zero. A separate
initial-Maxwellian continuum asymptotic can be derived directly. Let

    K = qa² qb² lnLambda n/(4 pi epsilon0² mu²),
    h = (K dt)^(1/3),  Z ~ Normal(0,1).

For continuum mixed TA, S=K dt/g³. The fractional initial heating-rate loss
relative to uncapped Landau has leading term

    (h²/sigma_g²) J + o(h²),
    J = [2 pi/(3 sqrt(3))] E[|Z|^(10/3)]
      = [2 pi/(3 sqrt(3))] 2^(5/3) Gamma(13/6)/sqrt(pi).

To obtain this, use 1-D_TA(S)/(2S)=E[S Z^4/(1+S Z²)], substitute g=h y,
and integrate y/(y³+Z²). The Landau radial weight is proportional to g dg;
therefore the transition region g approximately h contributes order h²,
or **dt^(2/3)**. Separate TA has leading coefficient 2^(-2/3)J because its
selected-pair variance is half as large. The corresponding uncapped Bobylev
coefficient is (3/10)2^(-2/3), obtained by integrating its saturated-angle region.
The separate PETSc physics reviewer independently rederived these coefficients
and the density convention; this is algebraic corroboration, not runtime evidence.

This is a specific *initial continuum moment* asymptotic, not a convergence
order for the full evolving system. At fixed finite N and strictly positive
minimum sampled pair speed, sufficiently small steps recover a regular local
expansion; the hard cap changes the strict limiting operator. A straight-line
fit in dt to a short ladder can consequently misidentify its continuum intercept.

## Discriminating controls and interpretation boundaries

The quarantined kernel-control workflow should compare exact Gaussian angular
moments, Bobylev and Nanbu at fixed scattering length; capped versus uncapped
rates; and their Maxwellian-weighted energy transfer. A particularly strong
test fixes the actual initial arrays and sums the conditional expected energy
increment over every unlike pair:

    E[Delta Ea | pair] = -ma alpha D V_COM dot g_vector.

For production sum over all N² cross pairs with probability 1/(2N-1) and its
mixed-pair S; for WarpX use 1/N and its single-species s. Species raw-second-moment
change is 2/(3eN) times summed energy change. Self collisions conserve species
energy, making this an initial-step discriminator without collision-RNG noise.
Centered temperature has additional finite-sample bulk-flow fluctuations, so raw
second moment is the cleaner primary quantity.

The independent v12 campaign freezes new seeds, separates timestep and marker
count, explicitly selects Bobylev/Nanbu and tests shared initial arrays. It
should retain UNKNOWN unless the full declared interval lies inside the
predeclared budget, not merely because a difference is statistically unresolved.
Pointwise intervals do not establish simultaneous or distribution equivalence.

At eV heavy-ion temperatures, relativistic corrections scale with v²/c² and are
many orders below a percent for the thermally occupied population. Exact masses
and charges are matched in the deck. The existing PlasmaPy comparison also
constrains gross coefficient errors. Those facts make relativity or the recorded
constant-convention differences implausible primary explanations of v11's
percent-scale transient. This is a scale argument, not a bound on every particle
or an excuse to skip unit checks.

The maximum sampled angular variance is not an energy-weighted error bound:
nearly comoving pairs can have huge g^-3 rates but little relative kinetic
energy. Likewise speed-CDF improvement with N can be ordinary sampling-noise
reduction. Excellent pair conservation cannot identify the correct angular
distribution, rate cap or finite-step generator.

## Verification status

This subtask performed source inspection, independent algebra and read-only
inspection of v11 JSON; it executed no project or scientific code on the host.
Runtime controls belong to the separately isolated kernel/campaign packages and
must be reported with their own exact snapshots and checks. The source-tag
review is not a binary-disassembly proof. Full physical convergence, spatial
separator validity and experimental accuracy remain separate open gates.
