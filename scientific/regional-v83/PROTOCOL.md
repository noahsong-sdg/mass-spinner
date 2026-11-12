# Fixed-domain regional electrical convergence

Frozen before V83 predictions, 12 November 2026. This verifies the same imposed
disk/finite-anode model as V82; no experimental cathode or voltage correction is
introduced. Measured velocities remain excluded. Preserve V79–V82 and production.

The traced V82 path allocates exact face half-resistance Joule loss and motional
work to cells, then selects regional cells by their centers. Twenty anode Joule
failures occur on already fixed domains and require new solves. Fifty-two other
final failures use moving near-endwall cuts. The access cut also depends on the
first radial cell and therefore changes with refinement.

Use four V82 source-derived finite-neutral-fraction transports: linear/quadratic
at 1 eV and source-partition 2.5 eV. Retain both anode centers .07/.08 m and 18.5 V.
No current conditioning. Continuous-axis transport defines one access depth per
scenario before any mesh. All meshes exactly include the two anode edges and
endwall depths .004/.016/.04/.08 m and that access depth. Regional integrals are
sums of whole cells on identical physical intervals, never fractional cut-cell
extrapolations or local measured voltages.

Use cosine edge grading on both radial segments (0,a,R) with 4n/28n cells. Axial
segments between all fixed cuts use max(2,ceil(length/.005))*n cells and cosine
grading. Meshes n=1,2,4,8 are nested. Grading targets mixed electrode/insulator
edge gradients but changes no continuum equation. For linear finite-1eV, center
.07 m, additionally run radial4/axial8 and radial8/axial4, compared to8/8, to
separate directional numerical sensitivity. Do not generalize that attribution
to every scenario.

Load isolated copies of the frozen V81 primary and reference. Rebind only their
mesh generators, validating physical breakpoints and no fallback. Reference
retains independently assembled arithmetic-center velocity equations; it shares
mesh selection, not discretization. No comparison of point values at distinct
centers. Save exact arrays, source hashes, original/current/power/chord ledgers.

Require all original primary/reference residuals and reconstructed regional power
identities <1e-8. Preserve5% final current, common-chord, global power and same-
conductivity independent-reference gates. Assess every regional Joule/I and
rotor-work/I final4→8 change separately at5%, keeping zero-denominator or signed
cancellation failures explicit. No post-result mesh selection or threshold change.

Run34 primary and34 independent solves. Independently audit saved fields,
identities, inventory, exact cuts, seals and gate receipts. This is numerical
verification, not optical rescoring or experimental qualification. A converged
low current remains a failed absolute-current experimental comparison. Old V82
diagnostic failures remain preserved under their original definitions.
