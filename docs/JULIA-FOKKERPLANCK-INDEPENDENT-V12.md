# Independent Julia multi-species source audit — v12

Reviewed 2026-11-06 by `collision_disagreement_audit_v12`, independently of the
Julia qualification implementer. Scope: KineticsforTransport/FokkerPlanck.jl
multi-species commit **`869e22dbbeda603caf99848c9d58052d9ec9d362`**. These findings
apply to that pinned branch, not the previously reviewed self-collision-only main
branch.

**Evidence boundary:** read-only primary-source inspection and independent
algebra. This reviewer executed no Julia code, installed no dependencies, changed
no solver or harness source, and claims no runtime agreement. The separate Julia
agent owns execution and its logs. All scientific execution is required to occur
inside its dedicated safe-dev VM. Saving this report is the only mutation in
this bounded follow-up.

## Unlike-ion normalization

No mass or factor-of-two defect was found for common species reference speeds
and densities. Define

\[
\Gamma_{ab}=\frac{Z_a^2Z_b^2e^4\ln\Lambda}{8\pi\epsilon_0^2},\qquad
U(g)=\frac{I-\hat g\hat g^T}{|g|},\qquad g=v-v'.
\]

For the conventional Rosenbluth potentials
\(H_b=\int f_b(v')/|g|\,d^3v'\) and
\(G_b=\int f_b(v')|g|\,d^3v'\),
\(\nabla\nabla G_b=\int U(g)f_b\,d^3v'\).
Integration by parts gives
\(\int U(g)\nabla_{v'}f_b\,d^3v'=2\nabla H_b\), hence

\[
C_{ab}=\frac{\Gamma_{ab}}{m_a^2}\nabla_v\cdot
\left[(\nabla\nabla G_b)\nabla_v f_a
-2\frac{m_a}{m_b}f_a\nabla H_b\right].
\]

The implementation includes the receiving mass squared in the diffusion
coefficient, the mass product in the summed friction coefficient, and
`massfac = 2.0*(ms/msp)` in assembly. These match the Landau generator derived
independently from the production TA kernel. Evidence: [assembly mass factor,
line 2770](https://github.com/KineticsforTransport/FokkerPlanck.jl/blob/869e22dbbeda603caf99848c9d58052d9ec9d362/src/fokker_planck_calculus.jl#L2770)
and [summed G/H factors, lines 3423–3424](https://github.com/KineticsforTransport/FokkerPlanck.jl/blob/869e22dbbeda603caf99848c9d58052d9ec9d362/src/fokker_planck_calculus.jl#L3423).

A common fixed Coulomb logarithm of 12 fits the common prefactor. The source
notes missing pair-specific logarithm factors; distinct pair logarithms require
additional work. That limitation is not itself a defect for our fixed-log case.

## Exact 40/84 u matching is feasible, not executed

Use \(m_{ref}=40u\), `mass=[1.0,2.1]`, `zeds=[1.0,1.0]`,
`c0ref=n0ref=[1.0,1.0]`, `u0ref=[0.0,0.0]`, and
\(n_{ref}=5\times10^{17}\,m^{-3}\). For chosen physical speed and time units,

\[
\nu_{ref}=\frac{e^4\ln\Lambda}{8\pi\epsilon_0^2}
\frac{n_{ref}t_{ref}}{m_{ref}^2c_{ref}^3}.
\]

The [Maxwellian helper, line 209](https://github.com/KineticsforTransport/FokkerPlanck.jl/blob/869e22dbbeda603caf99848c9d58052d9ec9d362/src/fokker_planck_test.jl#L209)
uses \(\exp(-v^2/v_{th}^2)/(\pi^{3/2}v_{th}^3)\), so its input is
\(v_{th,a}=\sqrt{2eT_a/m_a}/c_{ref}\), rather than the one-component standard
deviation. Common reference speeds avoid interspecies grid interpolation.
The [reference-frequency documentation](https://github.com/KineticsforTransport/FokkerPlanck.jl/blob/869e22dbbeda603caf99848c9d58052d9ec9d362/src/FokkerPlanck.jl#L75)
should be interpreted alongside the actual mass-dependent coefficients above.

## Conservation, positivity, and entropy

[Pairwise moment projections, lines 3845–3938](https://github.com/KineticsforTransport/FokkerPlanck.jl/blob/869e22dbbeda603caf99848c9d58052d9ec9d362/src/fokker_planck_calculus.jl#L3845)
enforce individual densities and combined momentum/energy. A separate
[closed-system end-step projection, lines 3940–4038](https://github.com/KineticsforTransport/FokkerPlanck.jl/blob/869e22dbbeda603caf99848c9d58052d9ec9d362/src/fokker_planck_calculus.jl#L3940)
corrects the distribution. Conserved moments alone therefore cannot establish
operator accuracy. Record correction norms and demonstrate their decrease under
resolution and nonlinear-tolerance refinement.

Polynomial corrections have no explicit positivity constraint. The
[entropy diagnostic, lines 271–310](https://github.com/KineticsforTransport/FokkerPlanck.jl/blob/869e22dbbeda603caf99848c9d58052d9ec9d362/src/FokkerPlanck.jl#L271)
uses `log(abs(f)+1e-15)`. It can return a finite value for a negative
distribution, so its value alone cannot establish positivity or a discrete
H-theorem. Report minimum f, weighted negative mass, and entropy under an explicit
positivity criterion. This is a source-level qualification gap, not an observed
negative-distribution failure in our target case.

## Nonlinear-success handling: verified harness gap

The [upstream stepping loop, line 192](https://github.com/KineticsforTransport/FokkerPlanck.jl/blob/869e22dbbeda603caf99848c9d58052d9ec9d362/test/ImplicitCollisionsTest.jl#L192)
discards the [backward-Euler solver's success return, line 424](https://github.com/KineticsforTransport/FokkerPlanck.jl/blob/869e22dbbeda603caf99848c9d58052d9ec9d362/src/FokkerPlanck.jl#L424),
then copies the iterate into the accepted state. Thus failed nonlinear steps can
continue; completing the loop does not imply convergence.

The qualification implementer reported preparing a single harness change that
asserts every return is true and counts accepted steps, without modifying solver
physics. This is the smallest correction: enforce the solver's existing success
contract rather than alter the algorithm. **This reviewer has not executed or
verified that corrected rerun.** Even 100 successful steps would establish
nonlinear convergence for that smoke fixture, not accuracy or convergence of the
40/84 u physical case.

## Next qualification gate

Run the matched 40/84 u, 2/10 eV fixture against the analytic initial exchange
slope; verify common-temperature equilibrium; refine time step, grid, and domain;
compare both assembly strategies; and retain correction-on/off and positivity
diagnostics. The existing upstream two-species regression fixture has different
masses, charges, and initial distributions, so reproducing it is an installation
and regression qualification rather than our cross-code physics benchmark.
