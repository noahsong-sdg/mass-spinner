# Independent initial-state physical references after the v17 math closure

This bounded followup leaves the closed mathematical package immutable. Its
independent physical Gaussian and weak-form Gaussian-mixture references are
copied byte-for-byte from the closed package and their hashes checked before
execution. All scientific calculations execute offline in a separate safe-dev
VM, `safe-dev-a184ed63f274cd59`, with NumPy2.4.3 and SciPy1.17.1. No producer
physics code is imported. The same prospective2% vector/Frobenius physical-rate
gates apply. This is an initial-state audit, not finite-time qualification.

## Fixed seed1701 Sobol spacing control

The parent prospectively chose one6D scrambled Sobol draw with seed1701,256
points, transformed with standard-normal quantiles and made antithetic to give
512 equal-weight positive markers per species. No whitening, fitting, rescaling,
clipping or outcome selection occurred. The producer's actual initial arrays,
full acceleration and source pins are the inputs to this audit, each checked
against externally supplied hashes. The independent reviewer's initial shape and
covariance results are separate evidence.

| qAxis | Mean vs nominal physical | Light/heavy tensor vs nominal physical | Mean vs actual GMM physical | Light/heavy tensor vs actual GMM physical |
| --- | ---: | ---: | ---: | ---: |
| 5 | 9.559% | 37.746% /32.891% | 13.689% | 37.785% /29.183% |
| 9 | 9.528% | 37.744% /32.930% | 13.652% | 37.784% /29.224% |

Every listed ODE physical-rate gate fails. q5/q9 similarity is a bounded static
quadrature diagnostic, not a proof of all-quadrature convergence. The physical
rate of the actual smooth GMM differs from nominal by6.353% in mean and
1.597%/7.919% in the two tensors. Thus improved low-order shape/covariance does
not remove all physical initial-rate differences.

For species1 in V0/s, nominal physical mean rate is
(-3386.607452,-1057.620141,+619.693875); actual smooth-GMM physical rate is
(-3530.354126,-1204.689821,+719.998779); q9 ODE gives
(-3044.466480,-1041.563677,+640.611544).

Against the **distinct finite-width Gaussian** model at alpha0.1, q9 errors are
7.406% in mean and1.533%/10.339% in the tensors. These are differences between
the represented finite-marker ODE and a regularized Gaussian target. They are
not estimates of the Gaussian regularization bias itself, which is the separate
difference between that regularized target and the physical target.

The unchanged serializer uses the generic nested field `physical2PercentGate`
even inside `vsNominalRegularizedGaussian`. Its occasional PASS, such as the
light tensor, is **only a regularized-target diagnostic**. Only the explicitly
selected `vsNominalPhysicalGaussian` and `vsActualPhysicalGmm` comparisons
determine physical status, and all Sobol physical comparisons fail. Do not
recursively count generic nested PASS labels. `output-interpretation.json`
records this boundary without changing the original source-pinned results or
their dependent bias calculations.

That regularized-Gaussian versus physical-Gaussian difference is14.055% in mean
and37.177%/28.107% in light/heavy tensors at alpha0.1. It persists even with exact
Gaussian marker integration. Consequently refining particle integration alone
at fixed alpha0.1 cannot make these nominal combined-case physical-rate errors
all satisfy2%; width must refine jointly with representation. Individual relative
errors are vector/matrix norms and cannot be subtracted as scalar corrections.
The source-pinned calculation preserves each physical/regularized/ODE vector
and matrix, their signed residuals and the exact vector-sum identity in
`regularization-bias-results.json`, SHA256
`1a929c16337522ddb738ebcc4da3842fa45c0b1b390e7cac9fd91c6d4b39dab0`.
Its frozen plan and script are retained beside it. A coarse GH heavy-ion tensor
that is closer to the physical target may reflect cancellation between errors;
closeness alone cannot establish convergence of either contribution.

Replacing the sparse GH family with this fixed spacing control improves nominal
mean-rate agreement substantially, but does not qualify the physical model and
worsens the heavy tensor comparison. The parent retained the control as static
negative evidence and kept the frozen GH campaign unchanged. No evolving Sobol
extension is inferred from these results.

Output: `scientific/general3d-math-extension-v17/sobol-physical-results.json`,
SHA256 `16173134934c43e50983ff25da8c2201cf6093181df868f18e507c740349482c`.
The source, frozen plan, immutable actual inputs and original failed physical
comparisons are retained alongside it. Actual exported bytes were hash-checked.

## Broad-width common-temperature reference

For the separately supplied commonT5,nAxis8,alpha0.5 actual GMM, the physical
initial scalar rates are -0.2292187514/+0.2292187513 eV/s for light/heavy ions.
The common-boost version agrees to about2e-12 eV/s. This is much closer to
equilibrium than the narrow alpha0.1 representation, but remains a finite GMM
rather than an exact Maxwellian. Exact nominal common-Gaussian vector and tensor
rates are zero and receive no relative-rate gate. Sampled CF lower bounds of
1.13e-4/1.20e-4 on L1 error are not upper certificates.

These raw common inputs contain no operator acceleration. The first attempted
generic force-probe audit consequently raised KeyError before producing any
scientific output. The original script and diagnostic are retained. The fix
explicitly invokes the raw-state physical-only reference path; finite-operator
rates remain unprovided until evaluated from the campaign. A regression checks
this schema and prevents silently inventing operator rates. Output
`common-physical-results.json` has SHA256
`efce21730f61d35e8a4484c0fa7f7156914ac96f9eb2e04741ff57e9a0f82116`.

The validated initial-only product-GMM entropy-force reference was then applied
to these same broad controls, retaining the actual full3V point-pair mobility.
Its fullspace regularized-marker scalar rates are only
-0.0043228420/+0.0043228420 eV/s. Common boost agrees to about1e-12eV/s and
independent1D GH512 versus adaptive force error is4.2e-16 relative. This separates
three initial references: exact nominal Gaussian0, actual physical GMM±0.2292,
and fullspace regularized-markerODE±0.004323. Campaign finite-q operator rates
are a fourth separate quantity; this initial-only calculation does not evaluate
the campaign operator or assume a later product distribution. Output
`common-force-results.json` has SHA256
`f60bc556943dcdff536f899d6c108aaf1a434cf7390dbf1d4f377734e7b110d2`.

## Direct references for all17 frozen campaign inputs

The actual producer export's original external seal is
`71eeaa26ee21a571824a7db852a7ec9052ea56cbdec8911135fae53e85cc42f0`.
Exact host membership235members plus the self-excluded seal and every actual
file hash were independently verified before use. Metadata's source pins match
the actual exported source files, and its campaign hash matches the actual plan
`4f534bc934204887c4023983e4cb0f22683b4b55c08deb5a471539bb9ba4664c`.

Nominal physical Gaussian, finite-width Gaussian and actual physical GMM
references were recomputed directly from every one of the17 actual metadata and
step0 velocity arrays, including boosts, rotations and broad common controls.
No prior-source output was relabeled. Each result records the metadata hash,
complete history hash, first JSON line hash excluding its trailingLF, exact source
pins, actual initial moments and shape lower bounds. A reference is not an ODE
gate result; the independent auditor compares its own initial finite-operator
moments against these bound inputs. Exact zero nominal references are explicitly
identified for absolute-only interpretation.

Output `main-initial-physical-results.json` has SHA256
`9645bf33177c600cbd0154562be6c42b54a2eb0e1555e8f2d08fea28189b3039`.
Frozen own input plan is
`9c8cb996c0a0ad60caed0378272c3fda1a67087c20d037c9b95e30f78db92db3`;
reader source is
`b0cd9a6776f61b427deb0878f0ee458fa923f185bb32e3e1405ab0705c51478e`.

Final extension seal is
`4a9869eaecdb86474131e79709b45f5e1481859126c1c86cd85bfb39bdcc870b`
at `scientific/general3d-math-extension-v17/closed-seal.json`. It enumerates120
members plus its self-excluded seal. Final three regression fixtures and all
frozen static/main input hashes passed. Exact actual exported membership and
all file hashes passed; canonical copy membership/hashes also passed. The
original closed math package remains separate and immutable.
