# V104: isolate radial pressure transport error

The [second understanding guide](docs/UNDERSTANDING-MASS-SPINNER-02.md)
connects force balance, separation, torque, heat and prediction quality.
This study **rejects adoption** of a research-only pressure reconstruction:
all six spatial failures remain. The shared research flow operator retains
V103; the faster browser equations and deployment are unchanged.

## Problem and cause

After the V103 native-equilibrium correction, six coupled spatial checks
still failed. Zero initial radial/axial velocity implies zero instantaneous
continuity derivative, even if subsequent acceleration is physically expected.
The numerical initial density-rate RMS was 0.19360, 0.08659 and 0.05356 kg/m³/s
at n=1/2/4. It arose in radial fluxes, not axial fluxes. Changing the existing
no-slip reconstruction flag made no difference to those rates.

The execution path is `campaign104 -> campaign101.case -> campaign99.evolve
-> PressureFlow.rate -> Flow.rate/_face_states`. Linear limited pressure
departures give differing pressure traces to the radial Riemann problem.
In simple terms, neighboring cells disagree about the pressure on their shared
boundary; the numerical solver moves mass immediately across that boundary.
This is distinct from genuine motion caused by an initially unbalanced gas.

One-variable probes at 1 µs locate most of the early sensitivity in radius:

| Refinement, other direction held fixed | Density-increment difference | Radial-flow difference |
|---|---:|---:|
| Endwall strip only, ×1 → ×2 | 2.61% | 0.87% |
| Endwall strip only, ×2 → ×4 | 1.43% | 0.28% |
| Radius only, 40 → 80 cells | 20.30% | 7.10% |
| Radius only, 80 → 160 cells | 7.47% | 2.14% |

These use the original exact-panel comparison, but are diagnostic slices,
not substitutes for full spatial/time qualification. They do not exclude
other axial errors. Diffusion-length estimates are dimensional diagnostics,
not measured or solved boundary-layer thicknesses.

An unlimited quadratic pressure probe reduced the zero-time flux error;
using true volume-averaged rather than sampled source profiles changed it
little. The unlimited probe was not evolved or adopted. Away from the fixed
source-profile clamp, its improvement was much larger than the whole-domain
improvement. No clamp smoothing or apparatus-specific stencil was introduced.

## Candidate and rationale

`PressureFlow` fits quadratic pressure departures using cylindrical volume
moments, limits them with the curvilinear monotone-parabolic construction of
[Mignone (2014)](https://arxiv.org/abs/1404.0537), and enforces positive pressure
throughout each cell. The same final coefficients supply the exact additional
geometric pressure-force integral. See [the method](scientific/reconstruction-v104/METHOD.md).

This is the smallest causal test of the observed pressure-trace error. It
retains HLLC, SSPRK2, shared conserved fluxes, density/velocity/species
reconstruction and all physical sources. Refinement alone is expensive;
freezing radial flow would suppress real physics; changing inputs would
invalidate the comparison. None of those alternatives is used.

The boundaries retain V103's pressure departures, smooth departure extrema
are flattened by the limiter, and the other components remain second order.
This is neither a complete PPM implementation nor a third-order flow solver.
The [frozen protocol](scientific/reconstruction-v104/PROTOCOL.md) retains every
original 5% spatial, 2% timestep, contraction, positivity, conservation and
diagnostic gate. Experimental measurements remain retrospective.

## Verification

The candidate passes 115 regression methods: 13 new pressure controls plus
102 historical methods executed with the candidate class injected before
historical imports. Two analytical red witnesses fail with V103 and pass with
the candidate. Controls cover cylindrical averages/forces, native rotational
equilibria, real perturbations, non-rigid/nonisothermal states, discontinuities,
whole-cell pressure positivity, small grids and conserved inventories.

The original five-case producer and evaluator both completed. Evaluation
correctly exits 1: six spatial gates fail. All original contraction, timestep,
positivity, mass/species, angular-momentum, energy and charge checks pass.

| Time | Density-increment difference, V103 → candidate | Radial-flow difference, V103 → candidate |
|---|---:|---:|
| 1 µs | 20.98% → 19.14% | 7.31% → 7.85% |
| 2 µs | 22.47% → 21.44% | 9.43% → 9.34% |
| 4 µs | 23.61% → 23.39% | 9.74% → 9.77% |

The unchanged spatial limit is 5%. These are finite-grid differences, not
known continuum errors. Density increments remove each run's initial density;
radial flow is normalized by total meridional-flow RMS. No optical alternative
passes the experimental screen: 0/288, best worst-point discrepancy 47.69%.
Diagnostic numerical/quadrature checks pass. The finest local temperature
still reaches 617,403 K, outside the neutral-Ar transport correlation's
reference range; the candidate does not repair the thermal assumptions.

The limited candidate reduces finest zero-time density-rate RMS only from
0.05356 to 0.04838 kg/m³/s; its coarse value worsens from 0.19360 to 0.19845.
The unlimited probe's larger smooth-region benefit does not transfer to the
complete limited method. Pressure-only quadratics are insufficient; neither
the remaining centrifugal-density discretization, boundary stencil, limited
extrema nor source-profile kink has been independently eliminated as a cause.
Do not promote a reconstruction's formal order into coupled accuracy.

At 1 µs, supplemental n=2→4 conservative restriction attributes 36.9% of
density-increment squared error to the outer-wall region, 34.4% to the anode
region, and 76.0% of radial-flow squared error to the endwall region. These
regions overlap, and restriction is not the original acceptance metric.
This does not establish the source kink as the dominant evolved error.

Retained signed-bump relative force errors at n=1/2/4/8 are
1.872%, 5.977%, 1.684%, 0.328% (negative perturbation) and
1.874%, 5.981%, 1.684%, 0.328% (positive). The coarse nonmonotonicity is retained;
resolved n=2/4/8 contract and the finest beats all coarser levels. Smooth-maximum
face errors are also retained, including the monotone limiter's accuracy cost.
Initial conserved states are byte-identical between V103 and V104 on all
three spatial grids. No measured-current/velocity fit or source smoothing occurs.

All scientific execution used one-BLAS-thread, 1G safe-dev. The original
82-file snapshot is `/work/project/v104-candidate01`, transfer SHA256
`9ea87448cb93cc9eb0dddd5b9a3a6aa8d06237a108d05404f105e1fd04e4eaef`.
The candidate SHA256 is
`1c520bf4bf4c32afe69f5a8587477017018c54b396b01e17c74d38a5484d8b3c`;
test SHA256 is
`ded0f1393c7f1c55ee8a81ff5c0caba861283e1060422a82cf0c1da879fb7aaa`.
Four historical V100/V101 note/review drafts and the first guide retain the
earlier V103 snapshot; the first guide's Part 2 link was added later. Executables,
tests and protocols match the executed copy. The supplemental
analysis file was added after the original producer/evaluator completed; all
82 frozen files were verified unchanged before and after it.

Exact regression commands/log hashes are in `execution.json`, including the
old-method red controls. Producer/evaluator commands and exit codes are in
`study-execution.json`. The five-case prediction seal is
`dc0547cf4d3437e81c4bc464fc8923b7d0dbaa32867ab79998cb3cca80df6f4c`.
The finest case takes 1,205.85 s with 6,653 steps and 370,948 KiB peak RSS.
Maximum relative defects are 3.30e-16 mass/species, 1.94e-13 energy,
4.24e-14 angular momentum and 4.93e-12 charge.

The supplemental `analyze104.py` run exits 0 and records runtime versions,
source seals, initial-state identity and all error arrays. Application checks
`npm run typecheck`, `npm run build`, `npm run check:site` and
`npm run check:assets` all pass on the unchanged 330-input app/asset snapshot
`47201c00b9770bd6daf5c11b3fafa39b68adcd046bb2d48c519de064aff5fc3e`.
The existing chunk-size advisory remains. No live-browser/GPU verification
or Cloudflare deployment is claimed in this study.

The independent [force review](scientific/reconstruction-v104/FORCE-REVIEW.md)
and [regression/evidence review](scientific/reconstruction-v104/INDEPENDENT-REVIEW.md)
both support rejecting adoption. Reviewers inspected the actual exported
artifacts and did not execute separate simulations or approve device accuracy.
[Public sources, raw fields, logs and checksums](https://github.com/noahsong-sdg/mass-spinner/releases/tag/v104-pressure-refinement)
preserve the failed candidate and every unchanged acceptance gate.

## A finite finish line

The learning release needs declared assumptions, numerically resolved outputs
over a bounded operating range, and a fast playground qualified against its
reference. Detailed graphics do not establish any of those conditions.

Predicting a real apparatus additionally needs one identifiable input-and-
diagnostic dataset and uncertainty bounds, followed by predictions without
refitting. The current closed, adiabatic, positively powered 4 µs control
cannot approach steady total energy through numerical refinement alone.

The [1980 experimental paper, §4.2](https://doi.org/10.1515/zna-1980-0815)
separates ion Joule heating, electron–heavy energy exchange and conduction,
and discusses circulation along cooled walls. Ion-carried radial current can
justify direct heavy-particle heating; the unresolved issue is its spatial
and population partition, especially through axial/electrode paths, together
with actual energy exhaust. Those experimental closures are not supplied by
more cells. Electrode emission/sheath mapping, axial inventory/temperature
and the optical response also need independent bounds.

Thus numerical progress must remain separate from apparatus qualification.
A missing public calibration packet does not mean Marathon lacks experimental
results, and argon rotation agreement alone would not establish lithium
separation or collected-product performance.
