# Bounded independent entropy-diagnostic performance profile

The reviewer recomputes the same adaptive1D marginal integrals, their errors and
tail bounds at each entropy quadrature order for an unchanged physical state.
Those quantities depend on the mixture and basis, not the requested3D quadrature
order. In simple terms, each rung repeats work whose answer is already known.
This was identified by tracing the unchanged reviewer `physical_entropy` caller
and `entropy_control` body before prototyping.

A separate prototype retains the first rung's marginal values/errors/tails only
inside one same-state ladder call. It never persists controls between states.
The full joint3D density correction and1D GH control arithmetic are copied
unchanged. A local fingerprint verifies that centers, weights, variance and
basis remain unchanged during the ladder. This is a performance prototype,
not a change to the actual reviewer or its gates. A scoped preparation closure
would be an appropriate production interface if adopted; no general persistent
cache is needed.

Two actual producer states at50us were tested, with the reviewer's exact
NumPy-eigh basis, density omission tolerance1e-13, and q5/9/13/17. Their source
and complete raw metadata/history hashes are frozen in the new packet. The
original producer seal is71eeaa26..., gaussian source813e3e..., densityb8fae4...,
case188f2c..., reviewer0f0b249.... No producer physics is imported by the entropy
profile. All work ran inside the existing isolated safe-dev VM in a new guest
directory, leaving both closed math projects and actual reviewer sources intact.

| State | Baseline wall | Reuse wall | Speedup | Baseline/reuse adaptive part | Baseline/reuse joint block |
| --- | ---: | ---: | ---: | ---: | ---: |
| nAxis4,alpha0.1 | 3.835s | 2.724s | 1.408x | 1.458/0.381s | 2.295/2.267s |
| nAxis8,alpha0.05 | 46.776s | 37.444s | 1.249x | 10.159/2.270s | 35.625/34.233s |

CPU speedups are1.408x/1.249x, closely matching wall ratios. Each ladder reduces
adaptive calls24→6. Sixteen baseline/prototype entropy-output pairs match bit
for bit in every returned field, including adaptive errors, tails, density
interaction counts and omission bounds. The unchanged actual caller was replayed
against those stored outputs with its original2e-10 budget: complete caller
outputs, sensitivities and gate decisions also match bit for bit for both states.

The cache is useful but the full joint block occupies about76% of the larger
baseline. These measurements do not support an order-of-magnitude speed claim
or directly explain a whole-case66s/385s elapsed time that includes other states,
replays and distribution diagnostics. The profile runtime is NumPy2.4.3 and
SciPy1.17.1, unlike the reviewer's NumPy2.2.6/SciPy1.15.3. Compare paired results
within this environment; adoption requires regressions in the actual reviewer
environment. Simultaneous other VM workers were present, though CPU/wall ratios
show little scheduling distortion in this bounded run.

A separate single-thread actual n8alpha0.05 probe recorded Linux process peak
RSS:116996KiB before diagnostics,130972KiB after physicalHq17,270240KiB after a
complete independent45→50us replay using pinned reviewer physics5527c3ec....
Kernel `Threads:1` confirms single-thread execution. H took24.28s and replay7.79s;
replay residual is5.59e-14 and entropy-balance residual-4.89e-16. Four times the
observed combined peak is1.031GiB, below4GiB for this selected workload. This is
not a bound on all QMC, histories, checkpoints or full-case diagnostics.

The closed packet is `scientific/general3d-diagnostic-performance-v17`.
Its seal enumerates28members plus its self-excluded seal, SHA256
`e1e769600ea9d5889ac43baf7f2ed93e9eaf7879c05b1afef2bc85cb747bf4f2`.
Actual exported/canonical membership and every file hash were verified.
Profile results areb3272be2..., memory resultsdc1fda0b..., and unchanged-caller
replaye4d838bc.... No main audit was restarted or altered by this subtask.
