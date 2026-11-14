# V107 preflight evidence review

The recorded **one-microsecond, fixed-axial-grid radial comparison passes**.
The full nine-job qualification remains **PENDING**. No experimental or live
playground qualification follows.

## Evidence checked

This review used trusted artifact reads, gzip integrity checks and SHA-256
checks. It did not execute project code or rerun the PDE. The reviewer authored
the layout adapter and its controls, independently of the producing flow
method; this is not an independent PDE implementation.

All 226 exported payload hashes match
`retained/evidence-20261113/export-inventory.json`. The 35 source entries
in the actual audit match current files. Checked seals include:

- Tested 107-input transfer: `31d24d7550a869e830e561c5276270b8daedeb8b948da30c54107cb801997cef`.
- New prediction: `4991334e3b566f49e56db3b6ed058f9878fb6f4480dcd778c43369c7ef0a952d`.
- New compressed field: `08651e081b3335b4686e547af620a3658cfea445db9f292f4161c511e11e30db`.
- Decompressed field: `9035b4f657d44d611e1a57e6240f394769bb36b649ced91cac030eb5950a4085`.
- Audit: `907f8bf06ca38f183ed2edcfea345723821910b4be1d522446ef755a296438b3`.

The prior radial summary retains its pinned `6b0bdcfe...42bb048e` hash.
Both reused 80/160-cell fields match their compressed and decompressed
summary seals. Their density-increment and radial-flow comparison values
equal the new audit's coarse changes exactly. These are reused saved
trajectories, not new coarse reruns.

## Actual result and admission

The new archive contains two conserved states at exactly 0 and 1 microsecond,
each shaped 6 by 48 by 320. It contains 2,839 accepted-step ledger records,
ending at exactly 1 microsecond. It does not contain full conserved fields
at every accepted step. The reported CFL is 0.1; the first acoustic step
and final reporting-clock-limited step agree with the retained schema.
The actual auditor checks the entire accepted clock sequence.

The three-case preflight audit records 31,122 passing gates: 25,845 history,
5,169 hydrodynamic-angular, 24 snapshot conservation, 14 refinement,
14 contraction and 56 panel-quadrature gates. Primitive/positivity,
geometry, source, torque and clock admission are also enforced as hard
checks. No failed gate is omitted from this bounded result.

At 1 microsecond, the 160-to-320-cell changes are:

| Observable | Difference | Fixed spatial limit |
| --- | ---: | ---: |
| Density increment | 2.381344% | 5% |
| Radial velocity | 0.486684% | 5% |
| Temperature increment | 0.317654% | 5% |
| Angular speed | 0.093374% | 5% |
| Axial velocity | 0.131063% | 5% |

The density comparison uses each trajectory's own initial-state increment
and the finer increment norm. Both velocity components use the finer combined
meridional-velocity norm. Background density is not substituted. Exact-panel
orders 2/3, contraction and limits are unchanged; conservative restriction
remains supplemental. The actual legacy replay records exact nested equality
except the auditor file hash, preserving all six V106 failures. The root-run
10-control receipt passes, including the logging-branch state/receipt equality.

Reported resources, 1,114.87 seconds and 660,612 KiB, match the new case receipt
and fit its declared 1 GiB profile. Peak recorded temperature is 233,957.72 K;
numerical agreement does not validate the prescribed transport closure there.

## Scope and remaining work

The report's percentages, norms, resource values and bounded-pass language
match the artifacts. Only the radial layout appears in this preflight's actual
`comparisonLayouts`. This packet contains no new full 0/1/2/4-microsecond
jobs, temporal triples, axial triples or joint triples. The preflight field
`missingFullJobs` lists six absent *geometry/CFL keys* after counting its three
short trajectories; it must not be read as six full jobs remaining. **All nine
full-clock jobs remain required**, and the explicit phase and qualification
flags correctly prevent a full pass.

The reduction from 7.451522% to 2.381344% density-increment change supports
radial underresolution as a material contributor. Mesh-dependent initial
steady torsion remains a confounder; this does not identify a unique operator
defect or bound continuum error. The original six failures remain separately
retained. No blocking discrepancy was found in this bounded result, and no
approval of full convergence, experimental fidelity or deployed behavior is
given.
