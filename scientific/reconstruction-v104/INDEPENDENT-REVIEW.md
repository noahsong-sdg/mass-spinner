# Independent regression and convergence review

2026-11-13. **Reject adoption of the V104 pressure candidate.** Its analytical
controls pass, but the complete coupled study still fails six unchanged spatial
gates. Shared `Flow` retains V103; the live equations are unchanged. This review checked
retained safe-dev evidence; the reviewer did not execute project code.

The original defect is real: at zero meridional velocity, mismatched pressure
traces can create a Riemann mass flux although continuum continuity initially
requires zero density derivative. Better interior pressure reconstruction is
therefore justified. The candidate reconstructs cylindrical cell averages,
preserves the local rotating reference and integrates its final limited
pressure departure consistently in the radial geometric source. I independently
checked that integral and authored controls for the resulting force and faces.

Evidence checked under `retained/evidence-20261113`:

- All 82 archived source members match transfer manifest `9ea87448…e4eaef`.
  Candidate `1c520bf4…d8b3c` and test `ded0f139…b7aaa` match their frozen hashes.
- All 14 test/study logs match execution receipts; all five packed and
  decompressed field packets match their producer seals. The campaign succeeds;
  the unchanged numerical evaluator exits **1**, retaining its failures.
- The command bootstrap injects the candidate into historical tests, and each
  campaign worker imports the candidate before calling the original evolution.
  The actual logs show **115 passing checks** and two intended old-method
  failures of the new analytical pressure-face and force controls.
- Original physical manifest, scenario, clocks, baseline identity and all prior
  executable source hashes equal V103. Supplemental analysis verifies identical
  initial conservative states at n=1/2/4; no measured current or velocity is fit.

The original exact-panel metric remains authoritative. At 1/2/4 µs, its finest
spatial differences are:

| Quantity | 1 µs | 2 µs | 4 µs | Unchanged gate |
|---|---:|---:|---:|---:|
| Density increment | 19.14% | 21.44% | 23.39% | 5% |
| Radial velocity | 7.85% | 9.34% | 9.77% | 5% |

All 56 contraction checks, 2% timestep comparisons, conservation/charge/history
checks and panel quadratures pass. These do not waive the six spatial failures.
The optical comparison still has zero all-point matches among 288 alternatives;
numerical improvement does not establish experimental accuracy.

Both bump signs and all n=1/2/4/8 errors are retained. Negative-bump relative
errors are 1.872%, 5.977%, 1.684%, 0.328%: coarse nonmonotonicity remains visible.
Smooth-maximum errors also remain visible on both meshes. The monotone limiter
flattens extrema; boundary reconstruction and other fields remain lower order.
This is neither a complete third-order solver nor an extremum-preserving method.
Native isothermal equilibrium stationarity is distinct from convergence of
nonnative/nonrigid or conservative-moment projections and real pressure forces.

The unlimited pressure-only, radial-only and endwall-only probes diagnose
specific mechanisms; they are not candidate evolution or replacement gates.
The simplest justified disposition is to preserve this negative result and
retain the verified balance fix while pursuing coupled spatial convergence.
Five current host documents differ from the frozen archive (the understanding
guide and four prior review documents); all executable inputs match. Claims
here concern the archived snapshot, not later documentation or live verification.
