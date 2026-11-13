# Near-axis strain: a working reconstruction, an unresolved evolution limit

Native rotational-periodic boundaries plus least-squares reconstruction remove
the initial rigid-rotation strain defect on the tested collapsed sector. However,
the unchanged narrow-sector evolution is unstable at the registered timestep.
One coarse-grid case passes the rigid gates after fourfold timestep refinement.
This is a numerical diagnostic following [V95](RADIAL-AXIS-V95.md), not a
qualified replacement for the coupled reference or an experimental validation.

## Root cause and intervention

The relevant path is mesh generation → native U boundary evaluation → native
gradient reconstruction → viscous stress and momentum evolution. We checked the
installed sources and the Foundation's
[wedge implementation](https://cpp.openfoam.org/v14/wedgeFvPatchField_8C_source.html).
It rotates the patch's internal velocity to the sector face. That rotation
preserves the speed at the cell centre rather than reconstructing radial
variation to the actual face centre. The gradient scheme then consumes this
trace using its own boundary geometry.

In plain terms, a rigidly rotating fluid moves faster farther from the axis.
Rotating a velocity vector to a new angle does not adjust its speed to a new
radius. That matters especially in the triangular first radial cell. In the
thin-sector limit its centre lies near 2/3 of the outer radius, while each sector
face centre lies near 1/2. Exact face values fix the initial Gauss gradient in
our diagnostic; radial refinement alone did not fix the pointwise V95 defect.

The existing native
[cyclic boundary](https://cpp.openfoam.org/v14/cyclicFvPatch_8C_source.html)
constructs a displacement to a transformed neighbour. Coupled with native
least-squares reconstruction, that produces a consistent affine rigid-rotation
gradient in the tests below. Neither intervention alone passes. Prescribing an
analytic face velocity is useful as a control, but cannot serve as a general
evolving boundary condition; indeed, pairing it with least squares fails badly
on this skewed mesh. These results concern this configuration, not every native
mesh or solver.

The new candidate case builder changes only native dictionaries and initial
fields. It reuses the existing mesh adapter, native solver, native boundary and
gradient implementations. No library was patched, no custom CFD operator was
introduced, and no physical coefficient or gate was fitted. This is the smallest
intervention that passes the initial test while retaining periodic flow. It is
kept in the research controls because it does not yet pass evolution at the
registered operating resolution. Existing adapters and live defaults are unchanged.

## Registered initial probes

The [protocol](scientific/periodic-axis-v96/PROTOCOL.md) was published at
`130a99f` before the predictions. All ten nr16/nz32 probes completed; the table
reports maximum symmetric deviatoric strain divided by Omega. Exact strain is
zero; the unchanged bound is 1e-6.

| Boundary | Gradient | Half angle | Initial normalized strain |
|---|---|---:|---:|
| Wedge | Gauss linear | 0.5 / 0.25 / 0.125° | 0.47133 / 0.47139 / 0.47140 |
| Wedge | leastSquares | 0.5 / 0.25 / 0.125° | 0.008067 / 0.004073 / 0.002047 |
| Rotational cyclic | Gauss linear | 0.5° | 0.47126 |
| Rotational cyclic | leastSquares | 0.5° | **3.10e-13** |
| Prescribed exact faces, diagnostic only | Gauss linear | 0.5° | **2.01e-13** |
| Prescribed exact faces, diagnostic only | leastSquares | 0.5° | 52.95 |

Narrowing the wedge does not remove the Gauss error. The least-squares wedge
error approximately halves with angle, but remains above the fixed bound.
The cyclic/least-squares full-gradient error is 3.85e-13 times Omega, so its
zero-strain result is not merely a different antisymmetric gradient.

## Evolution failure and timestep follow-up

The registered campaign stopped at its first nr16/nz32, 256-step rigid case:
the native solver exited 0, but U contained NaNs by 10 us. Field admission
rejected it. The failure and full native case are retained. Consequently the
planned ten-case evolution/analytic-decay campaign is **incomplete**; the
nr32/64/128 spatial sweep and Bessel-decay comparisons were not completed.

Before additional runs, the [stability follow-up](scientific/periodic-axis-v96/STABILITY.md)
was published at `b818fed`. It changes one factor at a time on the same coarse
mesh over the same 20 us, with unchanged coefficients and initial conditions.

| Steps | Outer correctors | Outcome | Final max strain/Omega | Max saved meridional speed/A |
|---:|---:|---|---:|---:|
| 256 | 1 | Registered case: nonfinite by 10 us | Failed admission | Failed admission |
| 512 | 1 | Finite, fails rigid gates | 0.35667 | 0.005876 |
| 1024 | 1 | Passes all nine rigid gates | 6.04e-7 | 2.00e-8 |
| 256 | 2 | Nonfinite by first saved clock | Failed admission | Failed admission |
| 256 | 4 | Nonfinite by first saved clock | Failed admission | Failed admission |

At 1024 steps, max saved swirl change/A is 2.72e-13. At 512 steps it is also
small, 2.56e-13, despite the growing meridional disturbance: monitoring only
rotation speed would miss the instability. The follow-up audit has 22 gates:
four completion checks plus nine physical checks for each finite trajectory.
**Five gates fail**; nonfinite runs receive failed completion checks.

Verified: reducing dt changes an unstable trajectory into a passing coarse-grid
rigid control; additional outer iterations do not cure the coarse-step failure.
This supports a timestep-dependent discrete coupling problem. It does not yet
identify a unique unstable operator or establish a general stability bound.
The 1024-step run still records 2048 pressure solves reaching their 1000-iteration
cap; final correction solves and true residuals need a separate audit. A small
reported continuity error and a solver exit code are insufficient certificates.

Next, isolate the cyclic viscous/projection operator and audit its true residuals
and stable timestep scaling with radial/sector resolution. Then complete rigid,
Bessel-decay and coupled energy/torque refinement studies. One passing nr16
trajectory cannot qualify a finer mesh, the full coupled model, or an experiment.

## Verification and provenance

All scientific computation ran offline in safe-dev using the existing native
stack and Python environment. Fifteen native source/binary identities were
checked around the final probes and stability runs. The initial uninstrumented
probe snapshot is retained separately; source04 repeats all ten probes with
native identities. Source01 reproduces the failing wedge regression; source02
passes it after the boundary change. Source03 also exposes an overly strict
output-clock test: native quarter-interval output includes 15 us. Source04 fixes
that expectation while scoring remains at 0/5/10/20 us.

Final immutable snapshot `/work/project/v96-sector-source05` passes **76/76**
controls, including the native gradient regression, matching cyclic mesh/field
constraints, output scheduling, stale wedge metadata rejection, full-gradient
algebra and all retained V95 controls. This is single-agent verification, with
no new independent agent audit.

The unchanged 2,666-file application snapshot has tree SHA256
`ccfc2619fbc2509e31034c4b9a86535a5d8e623f7f68a3c6f8510023fba1ab7c`.
Inside safe-dev, `npm test` passed **1,238/1,238**; `npm run typecheck`,
`npm run build`, `npm run check:site` and `npm run check:assets` each exited 0.
The existing bundle-size warning remains. No live deployment or browser
verification was performed; no application source changed.

Review traced case generation, cyclic pairing, native gradient extraction,
fixed-clock comparisons and field admission. Old physical coefficients and
defaults retain their pinned identities. The unresolved evolution instability
and incomplete spatial/analytic campaign remain correctness and qualification
gaps. Passing software tests does not remove those gaps.

## Evidence

The bounded export preserves **1,114 files / 18,794,119 raw bytes**, including
the original nonfinite case and all five frozen source snapshots. Every member
was rehashed in the guest and on export. Seven partition controls passed inside
safe-dev; the unchanged transfer cap is 80 MiB per part, below safe-dev's 512 MiB
boundary. The single 4.93 MB compressed archive is a
[release asset](https://github.com/noahsong-sdg/mass-spinner/releases/tag/v96-scientific-evidence).
Verify it against the export receipt and verify extracted members against the
inventory. Historical launchers require their recorded snapshot and native stack;
current source-admission guards intentionally reject changed historical sources.

- [Final scientific tests and exact source hashes](scientific/periodic-axis-v96/v96-sector-source05-tests.json)
- [Initial probes](scientific/periodic-axis-v96/evidence/v96-sector-source04/scientific/periodic-axis-v96/probes-results/probes.json)
- [Failed registered evolution](scientific/periodic-axis-v96/evidence/v96-sector-source04/scientific/periodic-axis-v96/study-results/predictions.json)
- [Stability trajectories](scientific/periodic-axis-v96/evidence/v96-sector-source05/scientific/periodic-axis-v96/stability-results/stability.json)
- [Post hoc gate audit and input hashes](scientific/periodic-axis-v96/diagnostics.json)
- [Export checksums](scientific/periodic-axis-v96/export.json) and [complete inventory](scientific/periodic-axis-v96/evidence/ARCHIVE-MANIFEST.json)
- [Export regression checks](scientific/periodic-axis-v96/export-controls.json)
- [Application checks](scientific/periodic-axis-v96/app-final/execution.json)
