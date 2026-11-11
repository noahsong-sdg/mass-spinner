# v75 execution record

All project execution below ran offline through:

```
/Users/noahs/.local/bin/safe-dev -C /private/tmp/mass-spinner-public-20261110 run -- COMMAND
```

Python is `/work/home/diagnostic-v72-venv/bin/python` in the guest. Dependencies
are FiPy 4.0.3, NumPy 2.4.6, SciPy 1.17.1, Matplotlib 3.11.2, Node 22.23.4.
Guest source is copied, never host-mounted. Source edits were explicitly synced;
valuable guest results were exported before replacement. Installed Node modules
are kept in `/work/home/v75-deps/node_modules` and linked into the guest project.

## Original producer

Snapshot `784d880c94090ed8bdd2b4373174df451b4ac5ddd1ef3ff5e6a7058444f78c0a`:
1633 files, 229921027 bytes. Within the guest project:

```
python -m unittest discover -s scientific/mixture-axial-v75 -p 'test_*.py' -v
python scientific/mixture-axial-v75/controls.py --output scientific/mixture-axial-v75/controls-01.json
python scientific/mixture-axial-v75/audit.py --output scientific/mixture-axial-v75/audit-01.json
python scientific/mixture-axial-v75/diffusion_controls.py --output scientific/mixture-axial-v75/diffusion-controls-02.json
python scientific/mixture-axial-v75/run.py --output scientific/mixture-axial-v75/study-01.json
python scientific/mixture-axial-v75/analyze.py scientific/mixture-axial-v75/study-01.json scientific/mixture-axial-v75/convergence-01.json
python scientific/mixture-axial-v75/verify.py --raw scientific/mixture-axial-v75/study-01.json --convergence scientific/mixture-axial-v75/convergence-01.json --controls scientific/mixture-axial-v75/controls-01.json --diffusion-controls scientific/mixture-axial-v75/diffusion-controls-02.json --audit scientific/mixture-axial-v75/audit-01.json --output scientific/mixture-axial-v75/receipt-01.json
python scientific/mixture-axial-v75/plot.py scientific/mixture-axial-v75/study-01.json scientific/mixture-axial-v75/convergence-01.json scientific/mixture-axial-v75/verification-01.png
```

The flow controls were first produced before the full-run snapshot, then
reused only after byte-comparing their two sealed source files. Their 24 gates
pass; the diffusion suite's 14 gates and six corruption controls pass. All
77 original tests and all 4448 trajectory steps pass local checks. Analysis
and qualification intentionally exit **1** because spatial convergence fails;
the negative JSON artifacts are valid outputs, not silently discarded errors.
Plotting exits zero and visibly labels the case NOT QUALIFIED.

The archived source/dependency tree reproduces the original directory layout.
To rerun its checks, extract the portable archive into a separate empty project
root and install its pinned dependencies in a safe-dev VM. Do not point the
ordinary current-source verifier at the older run: strict source equality
correctly rejects that mismatch.

## Revised admission code

Snapshot `94db638e4d469e3456a8136659fd657504a7ed6a4a229b1c9248340daea7e85f`:
1649 files, 263431048 bytes. Its code contains composite-domain and endpoint
admission fixes; its copied archive was still the original macOS packaging.
The later portable repack and documentation do not change executable source.

```
python -m unittest discover -s scientific/mixture-axial-v75 -p 'test_*.py' -q
python -m unittest discover -s scientific/coupled-axial-v74 -p 'test_*.py' -q
node_modules/.bin/tsx --test tests/fuel-current-precision-v74.test.ts tests/fuel-current-v66.test.ts tests/fuel-current-axis-v66.test.ts tests/fuel-current-reuse-v68.test.ts tests/fuel-spatial-operation-v66.test.ts
npm run typecheck
npm run build
npm run check:site
npm run check:assets
python scientific/mixture-axial-v75/supplemental_admission.py --raw scientific/mixture-axial-v75/study-01.json --producer-root /work/home/v75-frozen01-clean --output scientific/mixture-axial-v75/supplemental-02.json
python scientific/mixture-axial-v75/run.py --output scientific/mixture-axial-v75/pilot-02.json --only 6:6:32
```

Results: 97 new-backend tests (4.140 s), 61 adjacent tests (17.568 s), and 15
TypeScript tests pass. All four npm checks pass. The first source extraction
included AppleDouble metadata and was rejected; the clean extraction used
`tar --exclude='*/._*'` on that original archive. The portable archive extracts
the same sealed source map without this flag. Supplemental02 passes all 60
endpoints and makes no convergence claim. Pilot02 passes all 32 steps and is
bitwise-identical to pilot01 in every saved gas/solid field. The complete
4448-step study was not repeated with these later admission guards.

## Compact diagnostic

`summary-01.json` is derived from raw study01 and convergence01, with both exact
SHA-256 digests included. The parent executed an offline NumPy diagnostic that
aggregated finest-series RMS/local/observable errors and stage receipts, called
`analyze.compare_profiles` on each trajectory's saved **initial** fields, and
applied `analyze.overlap` to cell averages of `f=z` on 48→24/36 axial grids.
It also compared pilot01/pilot02 arrays with `numpy.array_equal`.

That diagnostic is post-processing, not an independently evolved trajectory.
Its initial-state and linear-transfer results expose nonnested remap error;
they do not retroactively remove any original failed gate. The raw trajectories,
convergence report and source archive remain the primary reproducible evidence.
