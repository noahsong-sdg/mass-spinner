# Initial-state roundoff: interpretation, not a gate override

The two axial initial-clock contraction checks remain **FAIL**. No norm,
threshold, saved field, reporting clock or original verdict is changed.

The [production initializer](../coupled-v99/campaign99.py#L53) prescribes
density and temperature as radial profiles. [State encoding and recovery](../mixture-axial-v75/flow.py#L55)
multiply density by cell volume, then divide; temperature also subtracts
kinetic energy from total energy. Different axial volumes leave different last
bits. Their approximately 1e-16 relative differences have no demonstrated
monotone mesh-order law. Initial rotation genuinely depends on the
two-dimensional current/endwall solve and is not covered by this explanation.

For normal, nonoverflowing round-to-nearest operations, let `u = 2^-53`.
The [standard rounding model](https://nhigham.com/wp-content/uploads/2023/10/high93s.pdf)
bounds the density multiply/divide round trip by `gamma2 = 2u/(1-2u)`.
Two recoveries of the same positive input can differ, relative to either
recovered density, by up to
`2*gamma2/(1-gamma2)`, approximately 4.44e-16. This is a conditional analytical
bound, not a new tolerance or a whole-solver certificate. Temperature's
conditioning additionally depends on kinetic/thermal-energy cancellation.

The existing [independent arithmetic witnesses](REVIEW-FULL-PARTIAL-PHYSICS.md)
reproduce the saved scalar round trips. Exact-Q1 subtraction, Decimal 40/60
comparisons, Gaussian orders 2/3 and the no-evolution diagnostic separately
check that these are retained initial-state differences rather than the earlier
interpolant-cancellation defect. This explains the two checks; it does not bound
accumulated PDE roundoff or certify finite-time spatial accuracy.

[NASA's grid-convergence guidance](https://www.grc.nasa.gov/www/wind/valid/tutorial/spatconv.html)
distinguishes ordered discretization error from computer roundoff.
[NIST's arithmetic reference](https://dlmf.nist.gov/3.1) describes finite
precision and interval arithmetic. Applying asymptotic contraction to these
initial scalar differences is therefore uninformative about physical axial
transport, even though the frozen predicate genuinely fails.

Decision: retain the failed gates and complete the useful finite-time spatial
studies under the original 5% limits. Report each completed subset separately;
no complete-matrix or experimental approval follows from this disposition.
The completed full r16-z2 follow-up is recorded in [the study report](../../REFINEMENT-V107.md#full-radial-trajectory);
its genuine 4 µs density-increment failure remains separate from this roundoff issue.

No new interval engine is introduced. If a formal operation-level certificate
becomes necessary, [Gappa](https://gappa.gitlabpages.inria.fr/gappa/)
explicitly represents floating-point rounding. High-precision evaluation alone
would not certify the original binary64 operation sequence. Gappa has not been
run for this study, and such a local certificate would not validate the PDE.
