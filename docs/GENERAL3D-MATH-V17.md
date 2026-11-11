# Independent mathematics and initial-rate references for general 3V evolution

Prospective analysis, 7 November 2026 UTC. Numerical results are added only after
the independent fixtures execute in their own safe-dev VM. The candidate evolves
arbitrary three-component particle centers, not Gaussian moment closures. Drift
vectors and covariance tensors below are diagnostics and initial reference data.

## Why the entropy backend changes

The old global-grid path computes every Gaussian at every 3D entropy node inside
each nonlinear residual. Refining both particles and quadrature cubes both
counts. Isotropy removed this cost in v16 but cannot describe arbitrary drift or
anisotropy. In simple terms, the angular information now matters, so the radial
shortcut is unavailable.

The coherent full-3V replacement evaluates the same type-I smoothed entropy by
particle-centered Gaussian cubature. With normalized Gaussian nodes xi_a and
positive weights omega_a,

    F_s(x) = sum_{j in s} w_j K_epsilon_s(x-v_j),
    H_Q = sum_{i,a} w_i omega_a log F_s(v_i+sqrt(epsilon_s) xi_a).

This is quadrature of integral F log F after expanding F as a positive mixture.
It costs O(N_s² p) rather than O(N_s q³) on a global Cartesian box. It still
has direct quadratic particle interactions and finite-cubature error; a faster
representation does not establish physical accuracy.

For x_ia=v_i+sqrt(epsilon_s)xi_a, d_ija=x_ia-v_j and responsibilities
rho_ija=w_j K(d_ija)/F_s(x_ia), each ordered i,j,a contributes

    t = w_i omega_a rho_ija d_ija/epsilon_s,
    G_j += t,   G_i -= t.

The first update differentiates a density center and the second differentiates
the moving integration location. Both are required for the exact derivative
of the finite scalar H_Q. The density-center term integrates to zero only in
the full-space exact-integration limit; dropping it at finite p changes the
gradient without changing the scalar being solved. The paired scatter also
gives sum_i G_i=0 in exact arithmetic. A finite-difference test and a deliberately
omitted-term control distinguish the correct derivative from this tempting error.

Along an actual displacement delta_v, the relative Gaussian exponent changes by

    delta log K = -[d_ija dot (delta_v_i-delta_v_j)
                    + |delta_v_i-delta_v_j|²/2]/epsilon_s.

The outer cubature weights are fixed, so delta H_Q is their weighted sum of
log-mixture changes. It is not the Eulerian F log F density-increment formula
from v16. Stable mixture-ratio arithmetic must respect this different callsite.

The underlying regularized multispecies variational model, conservation laws,
and common m_s epsilon_s requirement are established in
[Carrillo, Hu and Van Fleet](https://arxiv.org/html/2310.16143v1).
The moving finite-cubature differentiation above is this project's explicit
derivation, not a claim that the cited paper validates our implementation.

## Pair mobility and finite-time identities

For Q(z)=(I-zz^T/|z|²)/|z|, define b=G_i/(w_i m_i)-G_j/(w_j m_j).
Each unordered pair contributes

    a_i = -w_j Q(z)b/m_i,   a_j = +w_i Q(z)b/m_j,
    D_ij = w_i w_j b^T Q(z)b >= 0.

These updates preserve total vector momentum and kinetic energy by Q(z)z=0,
and give dH_Q/dtau=-sum D_ij. Distinct coincident marker centers use the stated
Q(0)=0 discrete convention; this is not a proof of a continuum self-collision
limit and needs particle-refinement checks.

The weighted Gonzalez gradient

    Gbar = G_mid + W delta_v [delta H_Q-G_mid:delta_v]
                              /(delta_v:W delta_v)

has the same finite entropy chain rule in sqrt(W)v coordinates. Midpoint
velocities in Q preserve quadratic energy. Nonlinear residual contractions
must accompany reported conservation/entropy; neither midpoint alone nor an
unconverged root proves an H theorem. No uniform conditioning bound follows
from removing explicit inverse individual weights in the correction.

Full-space entropy is exactly Galilean invariant and rotationally covariant.
The finite particle-centered rule is exactly boost invariant and covariant under
simultaneous marker/node rotation. A fixed tensor GH node orientation is not
invariant under general rotations. The physical fixed-node rotation experiment
and cubature refinement must therefore be reported separately, rather than
testing only a simultaneous coordinate change.

## Gaussian continuum reference with arbitrary means and SPD tensors

Let the represented smooth Gaussian covariance be C_s=T_s/(5m_s), in the fixed
velocity unit sqrt(5 eV/(40u)), and marker covariance A_s=C_s-epsilon_s I.
The regularized Gaussian entropy force is h_s(v)=-C_s^-1(v-U_s). Thus the
zero-smoothing reference is the physical unregularized Landau Gaussian, and
finite smoothing is a different regularized-continuum diagnostic.

For a species pair, put A=A_a, B=A_b, S=A+B, D=U_a-U_b,
P_a=C_a^-1/m_a, P_b=C_b^-1/m_b, L_a=A S^-1, L_b=B S^-1,
V=A-A S^-1 A and C=(P_a A+P_b B)S^-1. Relative velocity z is N(D,S).
Conditional Gaussian identities give

    E[y_a|z] = L_a(z-D),   E[y_b|z] = -L_b(z-D),
    E[b|z] = -C(z-D),
    Cov(y_a,b|z)=Cov(y_b,b|z)=V(P_b-P_a)^T.

Define f=E[Q(z)C(z-D)], J=E[(z-D)(z-D)^T C^T Q(z)] and R=E[Q(z)].
For normalized species densities one, the rates in dimensionless collision time
are

    dU_a = f/m_a,   dU_b = -f/m_b,
    dC_a = sym[L_a J - V(P_b-P_a)^T R]/m_a,
    dC_b = sym[L_b J + V(P_b-P_a)^T R]/m_b,

where sym(X)=X+X^T. Self collisions use the a=b expression once. Physical
tensor-temperature rates are 5m_s kappa dC_s, not merely their traces. Off-axis
entries are retained. The conditional covariance term is essential to thermal
exchange even with zero bulk drift.

The independent code evaluates these expectations using

    1/r = (1/sqrt(pi)) integral_0^infinity t^-1/2 exp(-t r²) dt,
    1/r³ = (2/sqrt(pi)) integral_0^infinity t^1/2 exp(-t r²) dt.

The tilted normal has V_t=(S^-1+2tI)^-1, mu_t=(I+2tS)^-1 D and normalization
Z_t=det(I+2tS)^-1/2 exp[-t D^T(I+2tS)^-1D]. Its second through fourth moments
are analytic Isserlis moments. Substituting t=u² removes the endpoint square-root
singularity. Separate direct 3D polar integration checks the Laplace calculation.
These are independent numerical references, not interval certificates.

## Actual represented Gaussian-mixture moment reference

Nominal Gaussian references alone conflate initial-shape error with operator
error. For arbitrary smooth PDFs, integrating the Coulomb weak first/second
moments by parts removes nonlinear log scores. Since div Q(z)=-2z/|z|³,

    dU_a = -2/m_a (1/m_a+1/m_b) E[z/r³],
    dC_a = 2/m_a² E[Q(z)]
             -2/m_a (1/m_a+1/m_b) E[sym((v-U_a)z^T)/r³].

These expectations refer to the actual smooth PDFs, not marker delta functions.
For one pair of isotropic Gaussian components, z is N(D,sigma² I). Let

    U = erf(r/(sqrt(2)sigma))/r,
    A = erf(r/(sqrt(2)sigma))/r³
          -sqrt(2/pi) exp[-r²/(2sigma²)]/(sigma r²).

Then E[z/r³]=D A and

    E[Q] = (U-sigma² A)I + (3sigma² A-U) D D^T/r².

The r=0 limits and small-r series are explicit; no denominator floor is used.
Conditional v|z supplies the mixed second moment. Summing positive component
weights gives an O(N²) actual-GMM physical rate reference. It includes same-
component physical encounters, unlike the discrete marker Q(0)=0 convention.
Differences between this physical reference and the regularized finite-particle
ODE are reported as such, not fitted away by changing the collision coefficient.

## Drift-energy accounting and comparison gates

Species tensor temperatures remove each species' own bulk mean. Total energy
also includes the kinetic energy of those means. The common center of mass is
U_com=sum_s n_s m_s U_s/sum_s n_s m_s, and the ultimate common smooth temperature
obeys

    T_eq = [sum_s n_s trace(T_s)
            +5 sum_s n_s m_s |U_s-U_com|²]/[3 sum_s n_s].

Fixed Gaussian smoothing adds a time-independent energy/tensor offset. It does
not remove drift energy or justify assuming 5 eV equilibrium after introducing
relative flows. Energy conservation alone can conceal incorrect redistribution,
which is why all vector and tensor rates are compared independently.

The prospective physical-rate gate is 2% in vector Euclidean norm or full matrix
Frobenius norm, separately for each nonzero species reference. All six tensor
entries and their absolute errors remain visible. Zero references use separately
declared absolute/invariant checks. Neither matching covariance nor matching
these rates qualifies a full-PDF or finite-time entropy study.

## Execution and evidence

Independent source package: `scientific/general3d-math-v17`. It imports no
producer physics. Initial source and plan are copied by safe-dev into its own
guest; dependencies are installed only there. Actual source hashes, commands,
negative controls, outputs and numerical limits are retained before acceptance.
Scientific implementation, finite-time studies and public browser changes remain
separate evidence owned by the parent and other reviewers.

### Verified independent results

Seven mathematical fixtures pass. Finite entropy directional derivative error
is 2.29e-13; deliberately omitting the moving-node derivative gives 0.06795.
The independent Gaussian Laplace calculation agrees with separate direct 3D
polar quadrature to 4.05e-15 absolute. Closed Gaussian-component physical GMM
rates agree with the separate Gaussian reference to 1.62e-15 for the mean vector
and 6.18e-15 for the full tensor. These qualify the reference calculations and
algebra, not the producer's physical continuum approximation.

The original 2/10 eV zero-drift physical heating reference remains
27982.16330006834 eV/s. For the specified relative drift, eventual common smooth
temperature is 6.2368055556 eV; drift energy supplies the extra heat. The combined
case's physical initial mean rate for species 1 is
(-3386.607452,-1057.620141,+619.693875) V0/s.

All 25 actual principal-axis initial arrays were audited against their external
byte hashes. For combined alpha=0.1, nAxis=4/6/8, actual smooth-GMM physical mean
rate differences from nominal Gaussian are 18.61%/4.35%/0.956%. At nAxis=8 its
tensor differences are 0.397%/2.051% for light/heavy ions. The actual PDFs remain
far from Gaussian: the independently sampled characteristic-function lower bound
on relative L1 error exceeds 0.42 for the hot species at nAxis=8. Matching their
mean and covariance does not qualify their initial shape. Even the common-5-eV
finite GMM is not a physical Maxwellian equilibrium: its actual physical initial
light-ion heating is -608.76 eV/s at nAxis=8, alpha=0.1.

All six original qAxis=3/5 combined-case pilot moment comparisons fail the 2%
physical-rate gates. At nAxis=8,qAxis=5, nominal physical errors are 41.64% in the
mean vector and 38.34%/7.49% in the two temperature tensors. Against the actual
smooth-GMM physical reference, mean error is still 41.08%, so nominal initial
shape differences alone cannot explain the discrepancy. No coefficient was fit.

### Causal isolation of entropy quadrature

The prepared initial GH array has a special, independently checked property:
in its principal axes, its smooth GMM is exactly a product of three 1D GMMs,
up to floating-point assembly error. This provides a cheap initial-only fullspace
entropy-force reference:

    G_i/w_i = R E_xi[score_f1(x_i1+sqrt(epsilon)xi),
                    score_f2(x_i2+sqrt(epsilon)xi),
                    score_f3(x_i3+sqrt(epsilon)xi)].

The density-center derivative integrates to zero in this exact fullspace
reference. It is still retained in the producer's finite 3D cubature derivative.
The independent reference checks coordinate clustering, factorized weights, and
full joint density at off-grid points to 1e-12 before using this shortcut. It then
applies the full actual-marker 3D Landau pair metric, including the producer's
Q(0)=0 convention. This is **never an evolved product closure** and is not a new
backend optimization.

Adaptive 1D integration was crosschecked with prespecified GH orders32/64/128/256.
Order256 narrowly failed the prospective 1e-8 force-relative reference gate
(2.04e-8 at nAxis=6;1.42e-8 at nAxis=8). That result is preserved. A separately
frozen extension to512/1024 plus tighter adaptive tolerances passed unchanged
gates: order512 errors3.70e-11/3.34e-12; order1024 errors5.96e-15/3.22e-15.

Against this fullspace initial regularized-marker ODE, producer qAxis=17 errors
are tiny:

| nAxis | Mean vector | Light tensor | Heavy tensor |
| --- | ---: | ---: | ---: |
| 6 | 0.01216% | 0.00505% | 0.01169% |
| 8 | 0.00769% | 0.00129% | 0.00829% |

Yet the nAxis=8 fullspace regularized-marker initial species-1 mean rate is
(-2077.036553,-482.927334,+277.479921) V0/s, retaining the large physical deficit.
This demonstrates that entropy cubature is a small error at qAxis=17 for this
initial state. The dominant remaining discrepancy is below it, in the finite
marker/regularized model. It does not distinguish all individual contributions
from smoothing, discrete entropy scores and point-pair integration; those require
joint representation/width refinement or separately justified controls. It also
does not establish quadrature convergence for arbitrary later deformed PDFs.

The initial/pilot source family is core6afb19cf... and initialization98de6180....
The static-probe source is core76b57576... and initialization9ba64f7b.... A source
diff shows only explicit constructor boundaries, the demonstrated boxed-closure
sum-allocation fix, and exported factor metadata. The entropy and mobility
formulas and the actual initial marker arrays are unchanged. The physical
negative conclusion is therefore not based on assuming unrelated source versions
are equivalent.

### Evidence boundaries and closure

Independent outputs are `math-results.json`, `initial-physical-results.json`,
`pilot-moment-results.json`, `initial-force-results.json`, and
`initial-force-extension-results.json` in the source package. Their prospective
plans, copied input/source snapshots, hashes and failed controls are retained.
An initial validation manifest accidentally included generated Python bytecode,
which safe-dev export intentionally excludes. The failed export-membership check
is retained under `provenance/pycache-export-diagnostic`; all scientific output
bytes that were actually exported matched their hashes. The final manifest
excludes generated bytecode and includes nested prior evidence manifests.

Two seed configurations of antithetic Sobol normals are retained. The first
was generated from an implementation-agent request (17018/17019), then left
unused when the parent prospectively selected one6D Sobol seed1701. No force
outcomes of the old configuration were inspected before this change. Neither
sample is whitened, fit, rescaled or clipped. Actual finite-sample covariance
departures are retained and must not be called exact nominal tensors.

This audit qualifies the independent references and identifies a physical
convergence failure. Finite-time convergence, general evolved joint-PDF entropy,
fixed-node rotation controls, browser behavior and deployment remain separate
parent/reviewer gates. A small root residual or conserved energy cannot change
the explicit failed physical-rate and initial-shape status.

Final closed package: [closed-seal.json](../scientific/general3d-math-v17/closed-seal.json),
SHA256 `31de487b64cea15424ce8111d340190bbbbfed95ae026ca76c7084b48b265563`.
The seal enumerates175 members; including the self-excluded seal itself there
are176 actual files. Exact host-export membership and all enumerated hashes were
verified. Followup input-specific references are separate in
`scientific/general3d-math-extension-v17`; the closed package remains immutable.
