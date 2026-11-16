# Execution record — 16 November 2026

All scientific execution and application checks ran in Apple Container guests,
non-root, with one CPU and no network after dependency preparation. Writable
source/dependencies were a temporary copy under `/tmp/mass-spinner-public-campaign-20261116`,
not a host credential/home mount. One GiB ceiling for Node/data runs; two GiB for
FEniCSx. Scientific production source was not executed on the host.

## Environment

- `safe-dev:2026-10-29`, manifest digest
  `sha256:a663ff8e7aa605e2838fb8432b463dab3173535114546154a6137fa06b86e882`.
  Node 22.23.4; Python 3.11; NumPy 2.4.6; Matplotlib 3.10.8. Application packages
  installed with `npm ci --ignore-scripts --no-audit --no-fund` from package lock.
- Official `ghcr.io/fenics/dolfinx/dolfinx:v0.9.0`, manifest-list digest
  `sha256:628f40dd62c7f37962ccadc5a745f23d52c56b2ac3ad9b9b6a86c567c07aa27b`;
  executed ARM64 variant `sha256:41ae1810df1498d61ac59b6b14a210ff6efc77916b61cae4184281de49d9e778`.
  Python 3.12.3, DOLFINx 0.9.0, inherited NumPy 2.0.2, PETSc 3.22.0;
  SciPy 1.14.1/scikit-fem 12.0.2 installed with `--no-deps` to preserve the ABI.
  The supplemental path is prepended to the inherited image PYTHONPATH.
- Public dependency downloads needed explicit container DNS `1.1.1.1` after
  default DNS returned EAI_AGAIN. No host DNS or browser policy was changed.
- Source identities are retained in `source-manifest.json` and individual result
  receipts. Package/runtime inventories are in `logs/python-runtime.txt` and the
  FEniCSx receipt. No CPU/GPU speed or memory-peak benchmark is claimed.

## Exact guest commands and results

```sh
python3 -m unittest discover -s scientific/public-data-campaign -p 'test_*.py' -v
python3 scientific/public-data-campaign/study.py campaign-results/public-data-final
node --import tsx --test --test-concurrency=1 tests/public-components.test.ts
node --import tsx scripts/qualify-public-components.mjs campaign-results/components-final.json
python3 -m unittest discover -s scientific/public-fenicsx-reference -p 'test_*.py' -v
python3 scientific/public-fenicsx-reference/reference.py campaign-results/fenics-reference-final.json
node --import tsx --test --test-concurrency=1 tests/public-sensitivity.test.ts tests/public-sensitivity-ui.test.ts
node --import tsx --test --test-concurrency=1 tests/*.test.ts
npm run typecheck
npm run build
npm run check:site
npm run check:assets
```

- Public-data tests: **7 passed** (`logs/public-data-tests-final.log.gz`). Diagnostic
  replay retained all 4,320 optical and 60 finest electrical alternatives;
  **zero optical all-point matches**. No fitting, new field solve or relaxed gate.
- Components: **2 tests passed, 60 metrics passed** (`components.json` and logs).
- FEniCSx: **5 tests passed**, all three numerical screens passed
  (`../../public-fenicsx-reference/results/reference.json`).
  Point-contact power/voltage continuum convergence is explicitly excluded.
- Final sensitivity implementation: **11 tests passed** (`logs/sensitivity-final.log.gz`).
  This includes final schema/history identity and thermal/switched-drive controls.
- Initial integrated application: **1,356 tests passed**, no failures/skips;
  typecheck, build, site and Blender asset checks passed. Final full rerun: **1,356/1,356 passed**, zero failures/cancellations/skips
  (`logs/all-tests-final.log.gz`, 194.3 seconds), after all final source edits.
- Vite reports the existing main-chunk size warning; this is not a failed build.

The first FEniCSx launch failed before running tests because replacing PYTHONPATH
hid the image's DOLFINx module. `logs/fenics-tests.log.gz` retains the failure.
Appending to the inherited path fixed the launch; no equation, coefficient or
acceptance criterion changed. Failed first launches are not counted as passes.

## Independent review

Separate agents reviewed the extraction coordinates/series identity, component
oracles and original gates, sensitivity resource lifecycle, and DOLFINx weak
form/complete field arrays. A reviewer caught weakened power/current tolerance
semantics in the initial component draft: original absolute power/charge and
relative-current limits were restored before the final receipt. Another caught
unnecessary checkpoint cloning and missing parent disposal: the UI retains an
immutable accepted-result reference and aborts abandoned workers. Regression
checks cover these execution paths. No remaining blocking finding was reported
within these bounded scopes; scientific omissions remain in the main report.

## Browser and publication

Browser Use succeeded through the supported in-app browser, without a policy
bypass. Static preview served from the isolated guest copy on localhost.
Wall-drag 1/current/4 s^-1, conductivity .5/current/2 S/m, and collision-rate
5000/current/20000 s^-1 produced three observable plots through the real worker.
The keyboard-accessible light-fraction endpoint changed across drag samples:
0.07891 nominal, sampled range 0.07694–0.08195. A zero conductivity endpoint was
rejected. Coefficient edits cleared old plots. Layout measured 320/320 and
390/390 viewport/document widths; panels remained within viewport bounds.
Desktop and mobile screenshots, final full-suite and deployment receipts follow.

Full-suite logs are losslessly gzip-compressed; the original bytes were checked
after compression. All logs are retained losslessly; runtime text remains plain.

Published to the existing Cloudflare site using the pre-existing isolated guest
login (Wrangler 4.158.0); no host credentials copied or new permissions granted.
Version: `1c8ad085-44c2-4787-b583-70a839ccbb09`. The deployed page was reopened
in IAB. All three coefficient families produced three-setting plots; zero
conductivity was rejected, and editing coefficients cleared earlier plots.
Browser console inspection reported no warning/error entries during these checks.
The deployed drag endpoint reproduced 0.07891 [0.07694, 0.08195]. This verifies
UI/worker behavior, not experimental physics or every possible slider value.

A separate scripted HTTP read received 403 for `/index.html` and `/`; therefore
no claim of byte-for-byte deployed HTTP verification is made. The supported
browser loaded the root page successfully and verified the actual controls,
worker plots and 3D apparatus. The status/observed deployment version are in
`deployment.json`; no browser-policy or access-control bypass was attempted.

## Documentation delivery correction

The deployed `.md` evidence navigation returned `ERR_BLOCKED_BY_CLIENT` in IAB,
although the simulator itself loaded. The client did not identify the blocking
layer. The public report is now built as ordinary `/qualification.html`, with
its local comparison image and source links resolving to the campaign's public
GitHub branch. Marked 18.2.1 is a pinned build-only parser; no Markdown runtime or
new JavaScript is added to the client. This reuses a maintained parser instead of
introducing a partial Markdown implementation or duplicating report prose.
Only reviewed repository Markdown enters this renderer. No browser policy changed.

All 14 targeted report/component/sensitivity tests passed. Typecheck, corrected
HTML build, site and asset checks passed (`logs/*html-final*.log.gz`). The first
HTML build correctly failed because the new comparison image had not yet been
copied into the isolated source snapshot. That failed log is retained; supplying
the already retained image fixed the input snapshot, without a fallback or gate
change. An independent source review found no blocker in the publisher/link path.

Final HTML candidate full application run: **1,357/1,357 passed**, zero failures,
cancellations or skips, 189.6 seconds (`logs/all-tests-html-final.log.gz`). This
includes the new HTML report regression. Component receipt was re-executed after
the parser lockfile addition and its production/package hashes match current
source. The separate seven public-data and five FEniCSx tests remain passed;
their scientific source identities remain unchanged.
