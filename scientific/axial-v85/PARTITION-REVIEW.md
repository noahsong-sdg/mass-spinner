# Independent assessment of the boundary half-cell work failures

12 November 2026. Source/formula review only; no scientific execution or VM
operation by this reviewer. The parent reports 32 final failures restricted to
the radial-wall and endwall work partitions, with coarse/fine relative changes
near 3. Identity, flow and pressure-loop gates reportedly pass. These execution
claims require the parent-owned exported audit and receipts; they were not
independently recomputed here.

## Root cause

`diagnostics85.analyze` calls its boundary terms `radialWallW` and `endWallW`,
but both are **fluid viscous dissipation in the boundary half-cell**, not
mechanical power delivered through the stationary wall. The latter is zero
because the no-slip wall velocity is zero. The numerical half-cell occupies a
shrinking physical volume as the mesh is refined.

For finite local shear and viscosity, let h be the center-to-wall distance.
No slip gives `Omega_cell = O(h)`. The shear conductance scales as `g = O(1/h)`.
Consequently wall torque `g Omega_cell` has a finite limit, whereas half-cell
fluid dissipation `g Omega_cell² = O(h)` tends to zero. The same argument applies
to radial cylindrical shear after retaining its smooth wall metric.

The frozen nested cosine mesh has boundary-cell width proportional to
`sin²(pi/(2k))`, asymptotically `k^-2`. Doubling refinement therefore divides
boundary half-cell width and dissipation by approximately four. The original
relative statistic then approaches

`abs(W_coarse - W_fine) / abs(W_fine) -> 3`.

Thus a roughly 300% relative change in these vanishing terms is expected. It
does not establish divergence of fixed-volume dissipation. Finite stress is
an assumption of this local argument: measured width/work scaling and retained
wall-torque convergence must be checked before attributing every case to it.
This argument does not excuse the independent singular electrical contact
power, which is a different quantity with a different limiting behavior.

## Smallest defensible response

Preserve the original frozen protocol, all 32 failed gates and
`allRequiredNumericalPass=false`. Do not alter old thresholds, replace failed
receipts or claim the original partition qualification passed.

Add a separately labeled supplemental assessment:

1. Compare `radialInteriorW + radialWallW` and
   `axialInteriorW + endWallW` under refinement using the original 5% threshold.
   These represent directional shear dissipation over the fixed whole fluid
   domain, including the boundary half-cell contribution.
2. Report the shrinking half-cell work as a share of total shear work, and
   `abs(W_half,coarse - W_half,fine) / W_total,fine` as an absolute contribution
   diagnostic. Do not describe this as the original relative gate passing.
3. Bind the actual physical center-to-wall widths and their ratios, and check
   whether wall torque approaches a finite limit while half-cell work vanishes.
4. Retain coarse failures and any failure of the supplemental directional
   work, wall torque or pressure-loop tests. Supplemental acceptance must remain
   separate from original-protocol and experimental qualification.

No change of solver, viscosity, heating or contact geometry follows from this
finding. The defect is comparing relative convergence of work over a shrinking
domain as if it were a fixed physical observable. The existing work accounting
and identity need not be modified.

## Final exported-evidence review

The earlier execution statements above describe the pre-export review. I have
now read the actual exported `audit.json`, `paired-summary.json`, optical audit,
final receipt, control/application logs and `AXIAL-TRANSPORT-V85.md`. Trusted
host hashing confirms the current audit, test, producer and diagnostic sources
match the final receipt. Prediction hash is
`5654356e7fca335d0bc66c35420eeb2665134e39c84f23a78c7cc625c9d5fc92`;
diagnostic hash is
`c07e4ab087fee814515b0a6674e71195fb179ad7c54d5ff3fd31fca24b551c24`.

The actual report retains `partitionNumericalPass=false`, all 32 final boundary
half-cell failures, `allRequiredNumericalPass=false` and audit exit status 1.
The supplemental assessment is explicitly post hoc, with maximum directional
work change 0.0797899%; pressure-loop change is 0.105491%. An inspected radial
half-cell witness has work ratio 4.00012 and width ratio 3.99967; its corresponding
endwall witness has work ratio 3.95552 and width ratio 3.96157. These observations
support the shrinking-region interpretation rather than finite wall-power
divergence. Original gates were not replaced by supplemental acceptance.

The logs record 27 passing scientific controls, 1,238 passing application tests,
and successful typecheck/build. Both 576-alternative families retain zero optical
matches; current remains input, circulation speed unpredicted, and experimental
qualification false. The root report's figures and acceptance/scope statements
match the inspected summaries. No material reporting or gate-retention defect
was found. I did not rerun the scientific computation or independently
reconstruct force fields, spectral modes or LP dual optima.
