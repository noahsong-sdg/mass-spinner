# Descriptive finite-time PETSc / TA / WarpX comparison

7 November 2026 UTC. This bounded follow-on uses existing audited moments;
it performs no new solver runs or acceptance tests. PETSc is **not ground truth**:
the nominal case passes selected moment budgets, but complete reference
acceptance remains UNKNOWN; the common-temperature sampled-H test fails and
the expanded-domain case has sampled negative distribution values.

The deterministic curves are PETSc `dt2.5us` (12x24 cells, radius 6, dt 2.5 us)
and `domain8` (16x32 cells, radius 8, dt 5 us). The particle groups are the previously
audited eight-seed N2048/dt 0.0625 us Bobylev runs and four-seed N8192/dt 0.25 us
Bobylev runs, each paired with its actual production TA calculation. Groups are
not pooled. All physical inputs remain 40 u/84 u, +e, nominal 2/10 eV,
n = 5e17/m3 per species and lnLambda = 12.

## Comparable raw moments

The quantity is Traw=m<|v|^2>/(3e), in eV, rather than drift-subtracted temperature.
PETSc's axisymmetric transverse bulk means vanish; its conversion is
Traw=Tcenter+m*uz^2/(3e). The stochastic records retain three bulk-velocity
components; their stored raw moments were checked against
Tcenter+m*(ux^2+uy^2+uz^2)/(3e). No velocity/time interpolation or mean-flow
subtraction is silently applied.

40 u Traw curves, eV. Particle entries are ensemble mean +/- pointwise 95%
Student-t half width (8 or 4 whole-run seeds). PETSc entries are deterministic
values without an established uncertainty band.

| Time, us | PETSc nominal | PETSc R8/dt5 | TA N2048 | WarpX N2048 | TA N8192 | WarpX N8192 |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | 1.99965 | 1.99965 | 1.98362 +/- .01978 | 1.98362 +/- .01978 | 1.98427 +/- .03197 | 1.98427 +/- .03197 |
| 100 | 3.67069 | 3.66118 | 3.62965 +/- .04293 | 3.70036 +/- .06211 | 3.63261 +/- .07126 | 3.67857 +/- .03639 |
| 250 | 4.69401 | 4.68707 | 4.66903 +/- .08430 | 4.71355 +/- .07012 | 4.67364 +/- .03793 | 4.75359 +/- .09314 |
| 500 | 5.38696 | 5.38483 | 5.37876 +/- .02734 | 5.41628 +/- .09392 | 5.38870 +/- .09108 | 5.46880 +/- .06627 |

At 500 us the corresponding 84 u raw moments are PETSc nominal 6.61094 and expanded
domain 6.61307 eV; TA/WarpX N2048 means 6.57967 +/- 0.13083 and 6.54214 +/- 0.09251 eV;
TA/WarpX N8192 means 6.71164 +/- 0.15837 and 6.63154 +/- 0.14287 eV. Coupled energy
conservation means the two species are not independent validation successes.

The three approaches show comparable relaxation scales and curve shapes in
these sampled moments. This observation does not establish numerical equivalence
or full-distribution agreement. In particular, PETSc domain8 also changes mesh
and timestep relative to the nominal curve, so their difference is a combined
sensitivity observation, not an isolated domain-error bound.

## Initial conditions and heating increments

The continuum starts from a smooth finite-element projection, not the same
empirical particle arrays. Nominal PETSc initial raw moments are 1.99965046 and
9.99825229 eV; projected densities are approximately 5.00033813e17/m3, retained
without normalization. N2048 particle ensemble initial means are 1.98361639 and
9.97480968 eV. N8192 means are 1.98427400 and 10.11606288 eV. These offsets cannot
be ignored when comparing absolute curves.

The output also reports run-paired heating increments Traw(t)-Traw(0).
At 500 us, the 40 u particle heating increment minus nominal PETSc heating is:

| Group | Difference mean, eV | Pointwise 95% half width, eV |
| --- | --- | --- |
| TA N2048 | +.007834 | .028825 |
| WarpX N2048 | +.045358 | .086737 |
| TA N8192 | +.017116 | .088718 |
| WarpX N8192 | +.097214 | .063914 |

Subtracting each species' initial raw moment removes that additive offset. It
does **not** make the partner temperature, total initial energy or velocity
distribution identical. For example, the N8192 hot species starts about 0.116 eV
above nominal 10 eV. Heating-increment residuals therefore cannot be attributed
solely to a scattering law or PETSc discretization error. Some exploratory
pointwise intervals exclude zero, but none is a new equivalence gate or an
error interval including PETSc's numerical/model uncertainty.

WarpX's capped low-speed cross-section and finite-step Bobylev law also differ
from the uncapped Landau target of PETSc/production TA. The particle uncertainty
intervals represent whole-run sampling variability only. Positivity, entropy,
domain, mesh, timestep and physical-operator qualifications remain separate.
All earlier reference/continuum/device gates remain unchanged and UNKNOWN.

## Execution and provenance

New code and output are separate from the frozen 41-case audit:
`scientific/collision-review-v12/triangulate.py`, `test_triangulate.py` and
[descriptive-triangulation.json](../scientific/collision-review-v12/descriptive-triangulation.json).
The JSON records both PETSc artifact hashes, every selected particle comparison
hash, and the new script plus unchanged independent-quantile helper hashes.
PETSc's recorded setup-source digests were verified before aggregation.

Executed offline in the existing separate safe-dev VM
`safe-dev-b0f7dc7368cabd7f`, from explicitly synced snapshot
`/tmp/mass-spinner-collision-review-v12`: 207 files, 60.0 MiB. Earlier audit source,
results and export remain preserved. No dependencies/downloads were required.

```
safe-dev -C /tmp/mass-spinner-collision-review-v12 run -- python3 -m unittest -v test_triangulate
safe-dev -C /tmp/mass-spinner-collision-review-v12 run -- python3 triangulate.py . --output descriptive-triangulation.json
safe-dev -C /tmp/mass-spinner-collision-review-v12 export /tmp/mass-spinner-collision-triangulation-export-v12
```

Three new regression tests pass; aggregation exits 0. Tests cover axial/full 3D
bulk-energy conversion, descriptive statistics without acceptance flags, and
rejection of missing checkpoints instead of interpolation. The export was
reviewed before copying only its named result to the host. No host scientific
execution, production changes, solver reruns or deployment occurred.
