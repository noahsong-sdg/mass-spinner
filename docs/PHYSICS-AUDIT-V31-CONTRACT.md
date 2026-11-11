# Public physics contract and research replay audit, v31

8 November 2026. Independent source, actual-DOM and saved-array review. No new
demonstrated production defect was found within this scope. The public research
replay remains correctly identified as recorded, physically unqualified data;
the passing v30 raw-angular gate must remain separate from failed local sampling
and unresolved physical transport. No production source or frozen artifact was
changed by this reviewer.

## Traced paths and meaning of the outputs

- Playground 01 pins a thermal, collisionless 40+/B+ source and uses the same
  orbit solver and worker as Models. The share link records only its four exposed
  controls. It is not a serialized general-model or Marathon run.
- Models selects orbit, static equilibrium, reduced geometry/transport or live
  double-well dynamics. `main.js:config → calculate → worker.ts` preserves the
  selected model and physical settings. The centrifugal reduced variant
  deliberately dispatches the mirror invariant with its nonzero rotation input.
- Orbit collection plots use `arrivalCurves`, not the unused older `orbitCurves`
  helper. Right-continuous incidence counts each competing outlet against the
  injected inventory. Conditional collected-energy CDFs are separately labeled.
  Radial histogram values are fractions per bin, not density per unit radius.
- Equilibrium diagnostics integrate normalized number densities with cylindrical
  `2r dr` measure. The local composition, total inventory and hypothetical radial
  cut are different observables; the UI explicitly excludes extraction recovery.
  The normalized density label is consistent with the actual producer values.
- Orbit studies use independent whole-run seed jobs, preserve A/B pairing for
  purity bootstrap, withhold purity bounds when either collector component is
  unobserved, and distinguish timestep/model errors from sampling intervals.
  Four-to-sixteen batches do not guarantee accurate bootstrap coverage; the UI
  explicitly warns that few batches limit interval resolution.
- Live double-well temperature subtracts a fitted rigid rotation and axial mean;
  it is labeled **residual kinetic temperature**, and assumptions say it is not
  local thermodynamic temperature. Local-regime temperatures use a different,
  local drift subtraction. They must not be treated as interchangeable.
- Research fetches `/research-recordings.json`, selects an integer saved-state
  index and renders its stored moments. No solver, parameter change or temporal
  interpolation is performed by scrubbing. Mean velocities are in V₀ and the
  full centered temperature tensors are in eV. The UI displays **qualification
  WITHHELD** at every saved state.
- The live-model convergence panel is a separately identified frozen v9-source
  matrix. It says that moving sliders does not rerun it and displays its source
  hash. Its old FAIL status is not a claim that a new Nanbu matrix was executed.
  Updating the visible evidence with a separately identified v30 packet could be
  useful later, but the current explicit historical identity is not a physics bug.

No live browser, GPU render or mobile layout was observed. Source routing and
DOM tests establish a narrower contract than end-to-end deployed visual approval.

## Fresh independent checks

The new standard-library Python checker imports neither production nor earlier
reviewer code. For each public case, it verifies the actual audit/metadata/history
SHA-256s, reconstructs weighted species means and centered covariance directly
from velocity arrays, adds the fixed Gaussian component variance, then converts
to eV using the saved mass and velocity normalization. All **63 public states**
match their raw saved means/tensors exactly; independent reconstruction differs
by at most **1.954e−14** in the checked mean/tensor quantities.

Actual-JSDOM tests scrub all 63 states and verify the rendered tensor values,
three plot groups, persistent qualification label and single data fetch. A
separate test renders the frozen convergence packet and checks status, source
identity, rows and static-versus-live wording. An actual thermal-source orbit
run exercises immediate source returns and proves that the four incidence
curves sum to one at every pre/post-event sample, with final values matching
the collected particle ledger.

### Existing P1 qualification blockers are still real

Archived full3V decisions independently recount to **30 FAIL / 2 UNKNOWN** for
evolution-increment refinements and **8 rotation FAIL**; the serialized continuum
qualification flag is false. Counting decisions alone would not establish their
physical validity, so fresh raw characteristic witnesses were computed as well.

For normalized Gaussian mixtures,
`φ(k)=Σ_i (w_i/n_s) exp(−ε_i |k|²/2) exp(i k·v_i)`.
Since the complex test function has unit magnitude, the absolute Fourier
coefficient of a signed distribution difference cannot exceed its full3D L1
norm. The checker compares **evolution increments**, subtracting each case's own
initial characteristic function; rotated arrays are mapped back to the original
frame. A finite direction search gives these lower witnesses at 100 µs:

| Comparison | 40u | 84u | Frozen L1 budget |
| --- | ---: | ---: | ---: |
| Combined n6→n8, q5, α=.10 | 0.04483465 | 0.04802346 | 0.0002 |
| Combined q5 rotation | 0.00769386 | 0.00267387 | 0.0002 |

All four fail by much more than the reserved 1e−12 arithmetic allowance. These
are lower bounds evaluated in binary64, not interval-certified L1 integrals or
upper error estimates. This bounded search does not independently reproduce all
30 refinements or integrate physical entropy. It does freshly falsify continuum
particle convergence and rotational covariance for these key saved comparisons.

In plain terms, preserving energy does not ensure the correct evolving
distribution, and rotating the same experiment can still change this discrete
backend's answer. Keeping qualification withheld is necessary. The numerical
remedy requires new joint marker/width and rotation-resolved integration studies;
changing a replay label or tightening a nonlinear tolerance cannot fix these
demonstrated distribution discrepancies. The current labels already preserve
this boundary, so no production patch is justified by this finding.

### The v30 improvement has the claimed limited scope

All six fine annular raw artifacts use the advertised Nanbu method, source-fitted
mesh, N1024/species, nr12/nz9, 100 ns steps and full 200 µs horizon. Taking the
maximum absolute **raw** history residual reproduces the producer diagnostics.
The worst is **0.0004236513 = 0.04236513%**, so all six pass 0.1% raw angular
budget. Unresolved exposure is still **25.58–26.87%**, against 1%. These inputs
cannot support an overall transport PASS. No torque-corrected residual was
substituted for the raw angular quantity in the reported improvement.

This pass checks the saved v30 claim against its actual configurations and
histories; the locality reviewer separately reconstructs exit-flux ledgers and
tests the convergence executor. It is not another independent collision solve.

## Rejected hypothesis and test correction

The first new thermal-source test requested `parallelEV=0`, outside the existing
run-config API's positive directed-beam domain. The resulting error correctly
rejected that fixture before any trajectory ran. The corrected fixture uses
0.01 eV directed energy and 2 eV axial thermal spread, retaining plentiful source
returns. No production guard or physics acceptance threshold was changed. The
first log is preserved as a rejected test-design assumption, not a physics bug.

## Exact execution and evidence

Bounded stage `/tmp/mass-spinner-audit31-contract`, distinct Apple guest
`safe-dev-4520909d9a3ae742`: **101 mapped files, 16.7 MiB**. Only selected raw
histories, source, tests, configs and public packets were copied; no host home,
credentials or control sockets were mounted. Dependency installation used the
guest network once. After correcting the test fixture, the first outputs were
exported before explicit source replacement and offline reinstall.

Final commands, prefixed with
`/Users/noahs/.local/bin/safe-dev -C /tmp/mass-spinner-audit31-contract`:

```
sync --replace-guest
run -- npm ci --offline --ignore-scripts
run -- sh -c './node_modules/.bin/tsx --test tests/audit31-contract.test.ts tests/research-controls-v20.test.ts tests/ensemble.test.ts tests/study-ui.test.ts > contract-tests.log 2>&1'
run -- sh -c 'python3 audit_saved.py > contract-raw.log 2>&1'
run -- sh -c './node_modules/.bin/tsc --noEmit > contract-typecheck.log 2>&1'
export /tmp/mass-spinner-audit31-contract-final-export
```

Final gates: **21/21 TypeScript tests pass**, zero failures/skips, including the
three new tests and 18 existing ensemble/research/study neighbors; duration
1.245 seconds. **4/4 independent raw-data checks pass**, 0.842 seconds. Strict
source `tsc --noEmit` exits zero. The input-map SHA-256 is
`1827cfa955c043e48824a3a73249ca00ad971fa0da578d4bbb311c00c7366771`.
Every one of its 101 input digests was rechecked after the final executions and
again against the reviewed export. Execution used Python 3.11.2, Linux aarch64.

Exact logs, tested source, new test, checker, source map and outputs are sealed
under `scientific/physics-audit-v31/contract/`. The first 20/21 test log is also
retained with its zero-beam fixture explanation. No frozen history, plan or
physics gate changed. No active guest jobs or unique unexported results remain.
The parent owns the final merged repository build/typecheck, any other reviewers'
fixes and publishing. This delegated pass does not approve unseen later edits.
