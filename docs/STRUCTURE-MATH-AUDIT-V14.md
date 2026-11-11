# Independent two-ion structure-method mathematical audit, v14

This is an independent derivation and executable algebra check, not a verdict
on a producer run. The reviewer imports no producer numerical implementation.
The candidate selected by the parent reuses the licensed Julia Gonzalez/pair
construction and changes its entropy representation to a positive Gaussian
mixture in full Cartesian 3V. Actual source and trajectory acceptance remain
separate requirements. No production browser backend is changed by this audit.

## Source basis and actual execution path

Primary sources reopened: [multispecies regularized Landau](https://arxiv.org/html/2310.16143v1),
equations 1.2–1.3, 2.7, 3.1–3.6 and Corollary 2.4;
[particle-basis PETSc](https://arxiv.org/html/2306.12606v1); and
[exponential Galerkin/discrete gradients](https://arxiv.org/html/1804.08546v1).
These establish different methods; their theorems cannot be combined by name.
The latter paper treats single-species normalized collisions. This report's
unequal-species formulas below are derived directly from the symmetric Landau
pair bracket and checked independently, not asserted to be an implemented
multispecies result of that paper.

The inspected previous path is Maxwellian projection into an ordinary Q2
distribution, a conservative collision residual, backward Euler, and a monitor
evaluating a positive-part entropy. Its representation can be negative between
nodes and its test space need not contain log(F). Therefore positive nodes,
conserved moments and a converged root do not supply a physical H theorem.
The corrective path must make the representation, entropy scalar/derivative,
collision metric and time advance compatible. A tighter solve or clipping
does not create the missing algebra.

## Unlike-mass bracket and weights

Let marker i belong to species s, have velocity v_i and fixed positive number
weight w_i. In homogeneous SI units w_i sums to number density. Set

```
Gamma_st = q_s^2 q_t^2 lnLambda / (8 pi epsilon0^2) = Gamma_ts
Q(z) = (I - z z^T / |z|^2) / |z|
g_i = (1/w_i) partial H / partial v_i
b_ij = g_i/m_s - g_j/m_t
dv_i/dt = -sum_j Gamma_st w_j/m_s Q(v_i-v_j) b_ij.
```

For a single unordered pair, w_i m_s a_i + w_j m_t a_j = 0.
Its energy derivative is proportional to `(v_i-v_j) dot Q(v_i-v_j)b_ij=0`.
Summing entropy work gives

```
dH/dt = -1/2 sum_ij Gamma_st w_i w_j b_ij^T Q(v_i-v_j) b_ij <= 0.
```

These identities require reciprocal pair coefficients, both mass factors,
the actual number weights and a symmetric evaluation of Q. Dividing the
coordinate entropy gradient by its marker weight is essential. Equal weights
can hide a missing division. The factor1/2 belongs to an ordered-pair sum;
an unordered pair loop counts that dissipation once. At identical velocities,
the singular Coulomb kernel needs an explicitly specified diagonal convention;
the reference sets the self/identical pair contribution to zero, not a fitted
velocity cutoff. Cross-species coincident nodes must be reviewed explicitly.

## Discrete gradient and fully discrete conservation

Use actual endpoint positions V0,V1 and a discrete gradient satisfying
`H(V1)-H(V0)=DG_H dot (V1-V0)`. The Gonzalez construction adds a multiple of
the full coordinate increment to the midpoint gradient to enforce this chain
rule. With unequal weights, first compute that coordinate gradient, then set
`gbar_i=DG_H_i/w_i` in the pair bracket. The ordinary Euclidean Gonzalez formula
does not itself need a mass-weighted inner product.

Evaluate Q at midpoint relative velocities. This annihilates the difference
of the midpoint kinetic-energy gradients, giving exact finite energy change
zero at an exact implicit root. Momentum cancellation is independent of the
entropy gradient. The discrete chain rule then yields nonpositive H change.
Every assertion is conditional on solving the full implicit equation accurately;
a small step correction or a converged flag alone is not such a proof.

If `r_i = delta_v_i-dt*a_i`, measured conservation and entropy defects contain
`sum w_i m_i vbar_i dot r_i`, `sum w_i m_i r_i`, and `DG_H dot r`, respectively.
These contractions are more informative than a scale-free nonlinear residual
norm. Include them in exports where available. A numerical Gonzalez correction
computed from subtracting large nearly equal H values can lose its chain-rule
accuracy; measure a stable entropy difference and the actual chain-rule defect.

Midpoint integration by itself conserves quadratic energy but does not satisfy
the entropy chain rule for a nonlinear H. The independent exponential-scalar
regression demonstrates a nonzero midpoint chain-rule defect and its correction.

## Gaussian variance, positive reconstruction and physical moments

Write the reconstructed number PDF as
`F_s(v)=sum_p w_sp (2*pi*eps_s)^(-3/2) exp(-|v-v_sp|^2/(2 eps_s))`.
Here **eps is the component variance**, with physical units velocity squared.
Positive weights/variance give a positive full-space density analytically.
This does not describe the sign of an unrelated spline reconstruction.

The scalar `H_eps=sum_s integral F_s log(F_s/fstar) d3v` is physical H of the
smoothed PDF F and regularized entropy of the underlying marker distribution.
It is not the unregularized entropy of an empirical delta distribution. A
regularized-H pass does not prove convergence to unregularized Landau dynamics.

For a continuum Maxwellian of marker temperature T_s, its Gaussian-smoothed
variance is `T_s/m_s + eps_s`. Its entropy-force gradient divided by mass is
proportional to `-v/(T_s + m_s eps_s)` in energy units. Common physical marker
temperature is therefore compatible with equilibrium only when
`m_s eps_s` is common. For40/84u, `eps_84/eps_40=40/84`.
If a source uses kernel width h rather than variance, the condition is
`m_s h_s^2=constant`, not `m_s h_s=constant`. Finite marker sets still need
their own equilibrium/refinement tests; this continuum condition is necessary,
not a finite-N stationarity theorem.

Exact full-space reconstructed moments are

```
N_s = sum_p w_sp
P_s = m_s sum_p w_sp v_sp
E_smooth = E_markers + (3/2) sum_s N_s m_s eps_s
T_smooth,eV = T_markers,eV + m_s eps_s/e.
```

Fixed variance/weights make that energy offset constant, but absolute initial
5eV comparisons must state which PDF is targeted. Matching smoothed5eV requires
marker variance `5e/m_s-eps_s>0`; this is a prospective representation choice,
not post-run temperature correction. Save both moments and every variance.

With fixed finite quadrature, differentiate the exact implemented scalar:
`partial H/partial v_sp = w_sp sum_q W_q psi_s(x_q-v_sp)
(x_q-v_sp)/eps_s * (log(F_s(x_q)/fstar)+1)`.
The +1 term vanishes analytically on full space but need not vanish for finite
quadrature. Moving quadrature nodes require their own derivative terms; a fixed
grid avoids that complication. Signed Gaussian derivatives, density scaling
and quadrature volume weights are indispensable. A finite-difference check of
the actual producer scalar is required before any dynamics.

## Independent SI initial thermal rate

For zero-drift Maxwellians let `S=T_aJ/m_a+T_bJ/m_b`. Conditional Gaussian
integration of the pair energy work gives

```
nu_ab = (4/3) sqrt(2/pi) Gamma_ab n_b / (m_a m_b S^(3/2))
dT_a,eV/dt = nu_ab (T_b,eV-T_a,eV).
```

Derivation: write v_a=(sigma_a^2/S)g+eta and
v_b=-(sigma_b^2/S)g+eta, where g and eta are independent,
`Var(eta)=sigma_a^2 sigma_b^2/S`. Q annihilates g;
`E[eta dot Q(g) eta]=2 Var(eta) sqrt(2/pi)/sqrt(S)` in3V.
Converting energy work to temperature produces the factor4/3 above.
This result uses the uncut Coulomb kernel and no entropy smoothing.

At40/84u,2/10eV,n_each5e17m^-3,lnLambda12, the light-species reference is
**+27982.1633001eV/s**, with opposite heavy-species slope at equal densities.
The independent executable computes this from SI constants, not a copied
producer coefficient. Density/log scaling and the zero common-T rate are tested.
Finite regularization and finite markers may change the measured rate; they
must converge to this value rather than fitting Gamma to it.

For the type-I Gaussian regularization with common smoothing energy
`c=m_s eps_s/e`, the continuum marker Maxwellian temperatures Ta,Tb instead
give an initial rate proportional to
`Ta*Tb*(1/(Ta+c)-1/(Tb+c))/S_marker^(3/2)`.
If the **smoothed** initial targets are2/10eV, marker temperatures are2-c/10-c;
the ratio to the unregularized target rate is
`((2-c)*(10-c)/20)*(S_target/S_marker)^(3/2)`, where
`S_target=2/m_a+10/m_b` and `S_marker=(2-c)/m_a+(10-c)/m_b`.
This predicts an additional regularization bias even with infinitely many
markers; it is not a retuning formula. Report it alongside, never in place of,
the unchanged physical rate gate and zero-variance refinement.

## Mapping to the unchanged v13 gates

Retain v13 number/energy/momentum residual budgets1e-8, negative-number1e-10,
adjacent and cumulative H increase/N01e-8, H quadrature resolution/N02e-10,
L1 stationarity1e-3, common100us evolution-increment difference2e-4,
L1 quadrature resolution1e-6 and negative-fraction resolution1e-12.
The old reference-dependent relative-H gate is additionally retained, not
replaced by its per-particle namesake. Same actual initial numbers normalize
changes; no per-snapshot renormalization, Maxwellian refitting or clipping.

For the new positive Gaussian PDF, full3V integration replaces cylindrical
integration; use the actual mathematical measure, never a Cartesian2V shortcut.
Refine the integration on identical saved particles/variance before attributing
an H/L1 difference to evolution. Analytic mixture positivity makes the negative
fraction exactly zero, but finite-quadrature moment/H accuracy still needs
qualification. Finite-domain tails require a separate bound/refinement.

Particle-count, variance and timestep refinement are distinct axes. Record raw
initial projection differences separately from evolution-increment differences.
CDF agreement cannot replace the L1 gate. A short homogeneous or regularized
pass cannot qualify500us convergence, the zero-smoothing limit, spatial separator
collisions or device performance. Under-resolved integrals/missing comparisons
remain UNKNOWN. A common-T initialization does not replace the unequal-T rate
test: a frozen collision operator would pass stationarity while failing physics.

## Executed reviewer checks and limits

The independent package is `scientific/structure-math-review-v14`. Its six tests
exercise unequal weights and masses, exact pair P/E and H sign, the necessary
mass-times-variance condition, finite-difference derivatives of a fixed discrete
entropy scalar, Gonzalez chain rule, and a finite midpoint pair energy increment.
The initial six tests pass in0.001s in `safe-dev-ea513959c9dac6f7`; their source,
log and manifest were exported and actual host hashes verified before the final
source sync. Final rerun/output hashes are recorded in the package evidence.
No upstream/producer implementation is imported by these tests. Thus these
checks validate the independent algebra, **not** a future adapter's runtime.

The first final explicitly synced three-file source snapshot passes all six
regressions in0.001s and emits `reference-results.json` with actual
`+27982.16330006834/-27982.16330006834eV/s`. The pre-export five-file SHA256
manifest passes against every actual exported host file and again against the
authoritative package. Final export:
`/tmp/mass-spinner-structure-math-v14-final-export`. No dependencies, physical
evolution, upstream implementation or frontend build is part of this math-only
package; parent-owned producer and application checks remain separate.

The parent's follow-up request for the finite-variance initial-rate prediction
adds `regularized_rate_ev_s` and its independent zero-width/refinement regression.
The preceding export is preserved; after explicit six-file source/evidence sync,
all **seven** tests pass in0.001s. Actual rates for smoothed2/10eV targets with
smoothing energies1,.5,.1,.05,.025,0eV are18219.7263,23711.7105,27203.1524,
27596.8101,27790.5049,27982.1633eV/s. This predicts a34.89% low rate at1eV
smoothing even in the infinite-marker continuum limit; it is distinct from
finite-marker error. The current five-record manifest passes in the separate
final `/tmp/mass-spinner-structure-math-v14-rate-export` and authoritative
package. This later evidence supersedes the six-test source for current
reference code while preserving all earlier exports.

## Initial producer source trace

The first inspected `scientific/structure-preserving-v14/core.jl` snapshot has
SHA256 `e767615cc96346f04b2ad9765b1ec5b00115fdbac5356bf25a8bcc4f52db4951`;
`run.jl` is `1d1dcbff42cf3bcc208d2fe7878339b9d2d5c9180b9f6256c715525e35e0caf9`.
This is a source audit before accepted dynamics, not a claim those files passed
the independent trajectory gates. Any changed source needs a new identity.

The actual path is `run.jl -> make_model/initial_state -> entropy -> advance ->
newton_krylov!(residual!) -> discrete_gradient -> entropy_increment/mobility`,
then actual endpoint invariant/velocity JSON export. Source checks confirm:

- SI scale `v0=sqrt(5e/m0)`, `kappa=Gamma*n0/(m0^2*v0^3)` and physical dt
  conversion; normalized mass1/2.1 and per-species number1.
- Full3V tensor GH initialization, positive Gaussian variance alpha/m, fixed
  Cartesian GL entropy integration and analytically correct +1 gradient.
- Actual coordinate gradient division by weight and mass inside the pair b;
  symmetric unordered-pair momentum/energy cancellation; midpoint relative Q.
- Global Gonzalez correction and stable Gaussian density increments with the
  correct signed exponent change, rather than changing the collision rate.
- Separate marker/smoothed temperature ledger, actual residual re-evaluation,
  refusal of stale output directories, and failure retention on an unconverged
  step rather than advancing silently.

No demonstrated mathematical coefficient/sign defect was found in this snapshot.
The producer's first GH2 metric test has equal weights, so it does not exercise
the unequal-weight invariant; an explicit unequal-weight regression was requested.
The chosen finite-domain quadrature H is the scalar in the discrete theorem;
the independently refined full-PDF H gate remains necessary. Direct versus stable
H agreement and residual work contractions were requested as actual-step checks.
These source observations do not establish physical equilibrium or convergence.

## Follow-up: exact Hermite parity before a singular pair kernel

An unequal-weight odd-GH stress fixture exposed an eigensolver central node
of order1e-15 instead of mathematical zero. Species-dependent thermal scaling
then turned the intended shared origin into a spurious roundoff-scale relative
velocity. The Coulomb Q scales as1/|z|, amplifying that coordinate roundoff to enormous
pair forces for the arbitrary-gradient stress test. Cancellation of those large
forces can have a large absolute roundoff residual while retaining a small
relative one. This is not evidence that the analytic mass factors are wrong.

The proposed correction enforces the known quadrature symmetry when constructing
GH nodes: each pair becomes `[-a,+a]`, with `a=(x_hi-x_lo)/2`, paired weights
become their positive average, and an odd central node becomes exact zero.
[NIST DLMF Table18.6.1](https://dlmf.nist.gov/18.6) gives Hermite parity;
[Gauss-Hermite tables](https://dlmf.nist.gov/3.5#v) explicitly exhibit paired
nodes/weights and odd-rule zero. Projection onto these exact invariants preserves
paired total weight and positivity; polynomial moments must remain accurate to
roundoff. It removes the artificial displacement at its source without changing
Q at any nonzero physical separation or introducing a velocity cutoff.

The requested regression covers odd-rule exact-zero centers, exact shared
origin between species, positive symmetric weights, second/fourth moments,
finite pair outputs and normalized momentum/energy nullspaces. The failed
pre-fix log must remain. Actual patched source/tests are a separate acceptance
step, not established merely by this mathematical recommendation.

The actual patched core is now inspected and SHA-checked against the export:
`f9bd22a542cd4189e14113b6e1173e207adc6154aa8e7b56bcdd21fea1e9b265`.
It uses the equivalent `a=(abs(x_lo)+abs(x_hi))/2` for the ordered negative/
positive node pair, averages their weights and sets the odd center to0. No
nonzero-distance collision cutoff was added. The exported test source is
`716eeebb839075ff5d8eea3dedf61476681ac9a5a73088582dc6cbd2314ec303`;
actual log `logs/core-tests.txt` SHA
`084a4415d68b5d025966832c1c28139942840f8a13987105373bc17b99646e40`
records3 upstream JFNK,10 parity,13 entropy/chain-rule and8 metric assertions,
all34 passing. The reviewer independently hashes these actual files in
`/tmp/mass-spinner-structure-v14-pilot-first-export` and compares exported core
with current canonical core. This accepts the stated source/regression scope,
not dynamics. Explicit positive-weight/sum/second/fourth GH moment regressions
were additionally requested for the final test snapshot; the34-log does not
yet contain those explicit checks. The original0.2578125 absolute momentum
stress-test failure is retained in canonical `diagnostics/core-tests-first.txt`.

The subsequent actual46-assertion log closes that explicit-moment test gap:
3 JFNK,22 parity/positive-weight/normalization/moment,13 entropy/chain-rule and
8 metric assertions all pass. Independently checked export:
`/tmp/mass-spinner-structure-v14-pilot-q32-accepted-export`.
Actual test-source SHA is
`c36f08b7ab4af77ffd0e513b73dd28d659fbb11c9ddf71de78de75474e9c3028`;
log SHA `75f607377fd0af57fde59fcaf610319cc0893bddd4c3ada31da12004689060d3`;
serialized GH-rule SHA `82c5e6313b03b34fae62fe031856c51ecc757b33b769cfa114504b7a4946fd2f`.
Its producer manifest passes against actual host files. The independent reviewer
also evaluates all serialized monomial moments through degree2n−1 for
n2/3/4/5/6/8: largest scaled error1.08e−14, positive weights and exact parity.
The actual raw odd centers1.11022e−15 and8.88178e−16 become exact zero.

## Independent reconstruction of two actual implicit steps

A separate package `scientific/structure-step-review-v14` reads accepted raw
pilot metadata and all three saved128-marker states (64/species), q12,alpha.25,
R6,dt1us. It imports no producer/Julia implementation. It uses the independently
derived Gaussian entropy derivative and pair bracket. A4/8-point Gauss integral
of the gradient along the actual endpoint segment measures H change without
subtracting two large endpoint totals. The actual source path is
`audit.py -> scalar_gradient/line_change -> independent Gonzalez/pair bracket
-> full implicit residual and its invariant/entropy contractions`.

| Independent measurement | Step1 | Step2 |
|---|---:|---:|
| Stable line-integral H change | −0.007239588631291156 | −0.006030673100387006 |
| 4→8 line-integral discrepancy | −3.47e−18 | −4.34e−18 |
| Difference from producer stable change | −9.54e−18 | −2.60e−18 |
| Independently reconstructed implicit residual norm | 3.25316e−14 | 9.24928e−13 |
| Producer recomputed residual norm | 3.23074e−14 | 9.25065e−13 |
| Nonnegative metric production | 0.66670471269 | 0.55537384534 |
| H balance minus discrete-gradient residual work | 1.55e−19 | 1.05e−18 |
| Actual energy increment | 4.63e−16 | 2.65e−15 |
| Energy contraction of the implicit residual | 4.63e−16 | 2.65e−15 |

Momentum changes are about2.2e−17/3.3e−17 per component and agree with the
independent residual contractions. Independently reconstructed endpoint H
differs from producer totals by at most5.33e−15. These comparisons support the
actual fixed-quadrature bracket and nonlinear solve, not merely a parallel
reference formula. They do not establish refined physical-H monotonicity.

The actual pilot runner is
`2eb416ba415279ca60c94cd0b08d77cbd99adcab88d3422ef6ed4f08ea503e5e`,
with unchanged patched core f9bd22a… . A later runner revision adds descriptive
units/plan metadata only and is not substituted into this pilot identity.
Independent SI recomputation gives m0=6.6421562664e−26kg,
v0=3472.847033714796m/s, Gamma=4.013151005517349e−54 and
kappa=10858.76324776031/s, all exactly matching the saved binary64 metadata.

Execution is offline in distinct `safe-dev-da3f0bd8ca19a929`. The initial five-
file0.3MiB snapshot passes two regression methods and both actual step audits;
all eight exported manifest hashes are checked before source replacement.
Further explicitly synced snapshots add stale/duplicate/incomplete-history,
SI-scale mutation and GH-parity regression coverage. The final13-file copied
snapshot passes **five** regression methods in0.001s; accepted actual-step
auditor source and its two outputs are unchanged. Exact actual commands:

```
python3 -m unittest -v test_audit test_qualify
timeout 300 python3 audit.py inputs/pilot --step 1
timeout 300 python3 audit.py inputs/pilot --step 2
python3 qualify.py inputs/pilot/metadata.json inputs/rules.json
```

All were prefixed by the package-specific `safe-dev ... run --` boundary.
Final export `/tmp/mass-spinner-structure-step-v14-qualified-export` and canonical
package both pass all13 actual SHA256 records. Final manifest SHA is
`c2a08e8676bceaf08daa66a74b49c4ec9fae7dac554b8003b86d49ce5739a65a`;
actual-step output hashes are cbf298c0… /8a0ead93… and independent scale/rule
output f050f67c… . Earlier exports remain preserved.

## Separate full-space diagnostic tail-bound check

The reviewer independently traces `structure-gate-review-v14/box.py`.
For each Gaussian component, logF is bounded below by
`L_k−|Z|^2/2` and above by `K=logN−1.5log(2*pi*eps)`. Therefore
`|logF| <= |L_k|+max(K,0)+|Z|^2/2`. Outside a box, the3D union inequality and
independence give `P <= sum_j p_j` and
`E[|Z|^2 1outside] <= sum_j(secondTail_j+2p_j)`.
The implemented normal second tails `lo−a*phi(a)+hi+b*phi(b)` are correct.
The resulting mixture entropy-tail bound and summed-number L1-tail bound are
mathematically valid for the normalized log reference. Evaluation is binary64,
not interval arithmetic; this distinction remains explicit. A different SI log
reference would add its constant times the number-tail bound. This check does
not itself rerun the gate agent's full-space quadrature.

## Prospective main-campaign review

The draft `scientific/structure-preserving-v14/campaign-plan.json` was reviewed
before the main freeze. Baselineq48, full500us versus100us sensitivity horizons,
separate particle-count/operator-quadrature/timestep axes, explicitly coupled
variance/quadrature refinements and the unchanged2% physical rate gate are
mathematically coherent. All specified smoothed2/10eV rate cases retain positive
marker variances. Actual initial KDE-versus-Maxwellian shape is separately
reported; a nearly stationary non-Gaussian distribution cannot qualify physical
Maxwellian equilibrium. No case-normalization or mass/variance error was found.

One concrete independent-coverage improvement was requested before freeze:
order192 rechecks should include both endpoints of the largest refined
physical-H128/160 adjacent rise and the maximum cumulative physical-H state,
not only worst discrete-H endpoints. The discrete and refined physical series
can peak at different states. This preserves the previously corrected v13
endpoint-selection boundary. Sensitivity-series global monotonicity correctly
remains UNKNOWN unless all states are covered or a resolved failure is observed.
The draft's source hashes/status still require final freeze before launch.

## Prospective analytic L1 certificates

For two equal-variance isotropic normalized Gaussian components centered a
distance d apart, the likelihood-ratio sign changes at the perpendicular
bisector hyperplane. Integrating on its two sides reduces to one normal
coordinate and gives

```
integral |G_sigma(v-a)-G_sigma(v-b)| d3v
    = 2 erf(d/(2 sqrt(2) sigma)).
```

For a fixed positive mixture with fixed component variances and weights,
triangle inequality therefore bounds every actual-state L1 drift by
`sum_i w_i * 2erf(|v_i(t)-v_i(0)|/(2sqrt(2)sigma_i))`.
Divide by the exact fixed initial species number. This is an upper bound on
the full-space represented PDF, not on a sampled quadrature proxy. It can be
computed for every saved state in linear marker-count work. Likewise,
`||(Fc(t)-Fc(0))-(Fb(t)-Fb(0))||_1` is bounded by the sum of the case and
baseline drift upper bounds; normalize by the fixed baseline species number.
The comparison remains valid when cases use different particle counts or
different fixed variances. If the upper bound is below a gate, the represented
norm meets that gate; a loose upper bound above the gate cannot establish FAIL.

A mathematically strict serialized-data version can avoid erf entirely:
`2erf(d/(2sqrt(2)sigma)) <= min(2,d/sigma)
<= min(2,||delta_v||_1/sigma_lower)`.
Use positive rational sigma_lower whose square is independently checked no
larger than the serialized component variance. Exact rational weights, exact
differences of the serialized endpoints and exact summed number then give a
rigorous, somewhat looser upper bound. Compute `Fraction(v1)-Fraction(v0)`,
not a rational conversion of a previously rounded velocity subtraction.
Ordinary floating erf evaluation instead requires its binary64 scope to remain
explicit; an analytic inequality is not by itself an outward-rounded machine
enclosure. Either bound can be useful far below the frozen1e-3/2e-4 budgets.
The separate quadrature-resolution gate is not silently converted into a pass.

For initial shape, the bounded observable `cos(k dot v)` gives the lower bound

```
initial L1 / N >= abs(
  sum_i w_i exp(-eps_i |k|^2/2) cos(k dot v_i)
  - N exp(-sigma_Maxwellian^2 |k|^2/2)) / N.
```

The Maxwellian here is zero-mean with the stated target variance and same
number N. Nonzero target drift adds its cosine factor. Frequencies1…8 along
the coordinate axes in the common physical velocity normalization can be fixed
prospectively; taking their maximum remains a deterministic lower bound and
does not involve statistical multiple-comparison inference. A lower bound
above a declared shape criterion establishes failure of that criterion; a
small lower bound does not prove closeness. Standard exp/cos evaluation is
binary64 unless a separate interval/rounding certificate is provided.
Initial KDE-to-Maxwellian shape is distinct from subsequent stationarity
relative to the actual initial KDE; the existing stationarity budget must not
be silently reassigned to this different initial-projection quantity.

## Frozen-case finite-smoothing rate predictions

The now-frozen campaign retains smooth target temperatures2/10eV, with common
smoothing energy `c=5alpha eV`. The corresponding continuum marker Maxwellians
have temperatures `2-c` and `10-c`. For those marker Maxwellians, the independent
conditional-Gaussian calculation above gives

```
Rregularized(c) / Rphysical(2,10)
  = ((2-c)(10-c)/20)
    * [(2/ma+10/mb)/((2-c)/ma+(10-c)/mb)]^(3/2).
```

Both numerator temperatures must be strictly positive. The smooth temperature
derivative equals the marker derivative because the variance and its energy
offset are fixed. Equal species densities make the heavy rate the negative of
the light rate. The physical smooth-Maxwellian reference is still
`27982.16330006834 eV/s`; the frozen2% gate remains unchanged.

| alpha | c(eV) | Marker temperatures(eV) | Regularized continuum light rate(eV/s) | Relative difference from physical target |
|---|---:|---|---:|---:|
| .25 | 1.25 | .75/8.75 | 14808.737455633262 | 47.0779392686% |
| .125 | .625 | 1.375/9.375 | 22474.459276612783 | 19.6829100180% |
| .0625 | .3125 | 1.6875/9.6875 | 25429.50998658159 | 9.12243019281% |

Consequently, even a perfect continuum solve of this regularized operator at
these three widths would not satisfy the2% unsmoothed physical rate gate.
This identifies a prospective model-bias limitation; it does not predict the
exact finite-GH rates. The marker distribution of each actual run is a finite
Gaussian-Hermite quadrature measure, rather than the continuum Maxwellian
assumed in this derivation. Finite particle resolution, finite operator-entropy
quadrature, nonlinear residual and finite timestep can contribute additional
error. A measured deviation from this continuum regularized formula is not,
by itself, evidence of a missing SI prefactor. Agreement with that formula is
not, by itself, physical qualification.

Execution evidence: new independent package
`scientific/structure-rate-review-v14/rate_bias.py` was copied explicitly by
`safe-dev init` into dedicated offline guest `safe-dev-230a5e670b5ae20c`.
Four regression methods passed: zero-width reference, independently rearranged
ratio formula, positive-marker-variance boundary and refinement direction.
The exact tested source, JSON predictions and test log were exported to
`/tmp/mass-spinner-structure-rate-v14-prediction-export`; all three manifest
records passed actual host SHA256 checks there and after reviewed canonical
copy. No producer code was imported, edited or executed in this package.
At this prediction checkpoint no actual campaign rate export had been compared.

Qualification must separately report initial KDE-to-Maxwellian shape, drift
relative to that actual initial KDE, resolved full-space physical H, and the
physical nonzero-rate gate. A nearly stationary non-Maxwellian mixture can pass
its drift gate while failing to represent Maxwellian equilibrium. Neither
conserved moments nor the discrete entropy chain rule resolves that distinction.

### Baseline source continuity and partial-export check

The actual baseline export
`/tmp/mass-spinner-structure-v14-baseline-sealed-export/results/baseline`
was checked read-only: every one of13 raw-manifest members passed actual host
SHA256 verification. Decompressing `metadata.json.gz` gives checksum
`42db7f9e4332d4b3030e648458b648391ddc175f4a92ac32ac70e6439a42234f`,
matching the sealed plaintext-content checksum. The exact numeric-core source
diff from the independently audited `f9bd22a5...` pilot snapshot to baseline
`e1392802...` changes only matrix JSON serialization, from materialized copied
rows to streamed row views. The numerical entropy, gradient, pair mobility,
Gonzalez correction, initialization and implicit step functions are unchanged
in that diff. Thus previous mathematical source conclusions extend to the same
equations, while the earlier actual step-recomputation evidence remains bound
to its exact q12 pilot.

The sealed process record reports elapsed600.034765108s, wall watchdog,
process exit-9 and run `historyComplete=false`, with no recorded integrity
failures. This partial baseline contains states through445us; its500us outcome
is UNKNOWN. This source/artifact review did not rerun expensive q48 line-integral
or nonlinear-root diagnostics, and does not claim independent q48 trajectory
or physical-H qualification.

### Actual rate-control comparison

The four subsequently exported controls under
`/tmp/mass-spinner-structure-v14-rates-sealed-export/results/` were independently
checked after export. All52 constituent raw-manifest member hashes passed on
the host, and each decompressed metadata content hash passed inside the review
VM. Actual rates below were recomputed from the raw endpoint velocities,
weights and species masses. The computation uses the stable quadratic increment
`sum w*(2*v0*delta_v+delta_v^2)` with the corresponding species bulk-energy
increment subtracted. It therefore avoids subtracting two almost equal printed
temperatures. Fixed Gaussian variances make the smooth and marker temperature
slopes equal. It imports no producer scientific function.

| Actual control | Raw-velocity light slope(eV/s) | Error versus physical27982.1633 | Ratio to continuum regularized prediction | Frozen2% gate |
|---|---:|---:|---:|---|
| rate-baseline,n4,alpha.25,q48 | 16900.18065242916 | 39.6037380270% | 1.14123035154 | FAIL |
| rate-fine-n6,alpha.25,q48 | 16585.578469701082 | 40.7280334553% | 1.11998598931 | FAIL |
| rate-variance-alpha125,n4,q64 | 24480.56923243069 | 12.5136646159% | 1.08926176737 | FAIL |
| rate-variance-alpha0625,n4,q96 | 17306.153775691506 | 38.1529098015% | .680553962102 | FAIL |

The heavy rates are opposite to within7e-8eV/s in the independent endpoint
calculation. Recorded root residual norms range1.23e-15 to3.36e-15, so these
large physical-rate discrepancies coexist with tight recorded implicit solves.
This cheap audit verifies the output moments, artifact consistency and analytic
references; it does not independently recompute those roots or entropy gradients.
One10ns step is not a timestep-refinement study of the initial derivative.

The same raw inputs provide a direct initial-shape check: the maximum cosine
characteristic-function discrepancy at frozen frequencies1…8 on the common-v0
coordinate axes is a full-space L1 lower bound. Binary64 evaluations give:

| Control | Light initial KDE-to-Maxwellian L1 lower bound | Heavy lower bound |
|---|---:|---:|
| rate-baseline | .00217551865876 | .340657203897 |
| rate-fine-n6 | .000116161622661 | .203688311230 |
| rate-variance-alpha125 | .0622432223576 | .579856156511 |
| rate-variance-alpha0625 | .259618808142 | .751170838399 |

These shape results concern the actual represented initial PDFs against the
nominal2/10eV Maxwellians, rather than subsequent stationarity. They are analytic
observable inequalities evaluated in binary64, not outward-rounded interval
certificates. In particular the alpha.0625 case does not approach a resolved
Maxwellian initialization at fixedn4: its temperature is correct while the
represented shape is far away. Shrinking a Gaussian kernel around a fixed
small collection of centers exposes the discrete point structure. In simple
terms, making each blob narrower does not add the missing blobs. This is a
demonstrated initial-representation problem, distinct from the independently
predicted finite-smoothing bias. The individual contributions of particle
resolution, finite operator quadrature and timestep to the remaining rate
differences are not isolated by these four controls; calling them a measured
single-cause prefactor error would exceed the evidence.

The appropriate next qualification split is to establish initial-distribution
resolution under coupled particle-count/width refinement, resolve the entropy
operator at each width, and separately test timestep sensitivity. The unchanged
physical target must remain visible beside the regularized-continuum diagnostic.
Changing the SI coefficient to fit a rate would conceal two demonstrated
model/representation errors, whereas coupled refinement addresses their actual
sources. No physical qualification or production replacement follows from the
current structural tests.

Exact review evidence: the first prediction export was preserved before explicit
`safe-dev sync --replace-guest`; the new copied snapshot contained61 files,
23.9MiB in guest `safe-dev-230a5e670b5ae20c`. Six regression methods passed,
including duplicate metadata and incomplete/stale history rejection. No
scientific producer snapshot was executed. The tested source, immutable input
copies and actual outputs were exported to
`/tmp/mass-spinner-structure-rate-v14-actual-export`. All62 final manifest
records passed actual host hashes in that export and after reviewed canonical
copy. The canonical result is
`scientific/structure-rate-review-v14/actual-rate-comparison.json`, SHA256
`3ad574c6d10379f313db098e167e366f19af38df66fe31355251d575632c22b2`;
the sealed review manifest SHA256 is
`cf136f0f39ef41cf218f29459099e3093e64b67d26709c7d6db266fbc363d059`.
The post-export [rate-review README](../scientific/structure-rate-review-v14/README.md)
records the exact executed commands, copied snapshot identity and evidence
scope; it is intentionally outside the unchanged sealed 62-record manifest.
