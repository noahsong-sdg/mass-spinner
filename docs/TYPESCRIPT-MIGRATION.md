# TypeScript migration

The physics core is already strict TypeScript. The interface and renderers were
JavaScript, so `tsc` did not check their contracts with the physics core. Vite
accepting those files did not provide static type checking.

The first migration covers shared scenarios and pinned plot snapshots:

- Versioned scenarios distinguish legacy inputs from inputs plus drive history.
- Untrusted URLs and snapshots enter as `unknown` and retain runtime validation.
- DOM inputs are narrowed before reading checkbox, select, and numeric values.
- Pinned snapshots remain cloned and immutable; callers receive typed results.
- Compile-only contract tests check that invalid shapes are rejected by TypeScript.

`npm run typecheck` checks both production TypeScript and those contract tests.
Existing runtime tests still exercise legacy links, invalid input, deferred
restoration, run history, and baseline behavior. The migration changes ownership
and checking, not the numerical model or historical link format.

The remaining 69 UI and rendering modules have now been migrated, including
main entrypoints, workspaces, guides, plots, component selection, all playground
controllers and Three.js renderers. Every module under `src/` is included in the
strict compiler gate. Build and scientific export scripts retain `.mjs` where
no browser-facing contract requires migration.

Each batch must pass strict checking and the relevant behavior tests before
publication. Renaming files while disabling checking would hide the original
problem. Browser bundles will still be JavaScript: TypeScript checks authored
source and erases types when building. Independent scientific Python, Julia, and
OpenFOAM tools retain their native languages.

## Historical first-batch verification

Source revision: `639634e58db402b41c3f2a70535febf3a98453ae`.
[Isolated CI run](https://github.com/noahsong-sdg/mass-spinner/actions/runs/44124864675)
passed both strict compiler configurations, 30 focused sharing/baseline cases,
all 1,436 runtime tests, the existing qualification groups, 20 Python tests,
the production build, and site/asset checks. Independent source review found no
blocking regressions. At that revision, source contained 86 TypeScript and 69
JavaScript modules; those JavaScript callers were still outside `tsc`.

Native deployed-browser checks confirmed:

- Current entry, worker and graphics bundles loaded and the 3D apparatus rendered.
- Cutting power at 0.5 s produced a version 3 link retaining the initial 0.03 A,
  the 0 A intervention, transport mode and selected time. Opening that link in a
  fresh tab restored its history, power state, plot and physical time.
- In Models, pinning at 10,000 rad/s and changing to 12,000 rad/s kept the baseline
  curves; Restore returned 10,000 rad/s and the original equilibrium outputs.
- No browser console errors were recorded in the fresh-release checks.

A deployment transition exposed cached HTML referencing the previous hashed
worker after its removal. The immediate remedy retains the previous green
release's hashed assets alongside the new ones; fresh navigation confirmed the
new entry and worker. Final Cloudflare version:
`8b48eafe-1ada-4406-9d6b-d138a5b1cae1`. This preserves open-tab compatibility more
safely than forcing a reload and discarding a user's in-progress run. Future
publishing should retain prior hashes too; long-lived tabs spanning older
releases are not qualified by this check. A separate terminal HTTPS body/hash
check was blocked with HTTP 403, so it is not claimed as verification evidence.

The migration keeps runtime guards and adds genuine compiler coverage. A bulk
extension rename or unchecked TypeScript would leave the same contract gap.

## Remaining UI and rendering migration

The root cause of the checking gap was the compiler boundary: strict mode only
covered TypeScript source, leaving JavaScript callers free to pass incompatible
settings, solver results or scene state. In plain terms, the physics code had
contracts that the interface did not have to obey.

The fix brings existing execution paths under the same compiler, without a new
framework or a second numerical model:

- Worker request discriminants select the matching result type and are shared
  with the actual worker dispatcher. Dynamic requests remain `unknown`.
- Plot samples, nullable values, domains, callbacks and pinned state are typed.
- Three.js declarations match the installed runtime version exactly. Geometry,
  materials, picking, clipping, camera and disposal have concrete contracts.
- DOM controls use their actual element types; stored state and external JSON
  keep runtime validation. Legacy scenario links keep their historical format.
- Standalone guide source is compiled to browser JavaScript rather than copied
  with TypeScript syntax. Entry paths and producing-code hashes follow renames.
- Compile-only negative cases check worker, plotting and precision-control
  contracts. A runtime test prevents new JavaScript source escaping strict mode.

Three real boundary defects were found during the migration:

1. References listened for `toggle` on an inner `<div>`, which never owns native
   disclosure state. The listener now uses the actual `<details>`. This keeps
   lazy activation and the existing append host, rather than adding synthetic
   state or polling. Tests exercise the real owner and repeated clean reopens.
2. The deferred renderer assumed every mesh had one material. Three.js also
   permits material arrays; clone, opacity and disposal now handle both legal
   shapes. This uses the renderer's existing lifecycle instead of flattening or
   replacing authored material assignments. Both shapes have regression tests.
3. Target film thickness used a positive comparison that accepted numeric strings
   and infinity. A finite positive-number check now enforces the physical length
   boundary before geometry construction; valid numerical inputs are unchanged.

Types do not establish experimental accuracy or validate a numerical closure.
Existing scientific qualification labels remain unchanged. Preexisting broad
internal types in `surface-state.ts` and sparse-array validation limitations in
`apparatus-state.ts` remain separate follow-up work; this migration does not claim they were solved.

### Final verification

Producing source: `3cb9a172499f49189ea8a45802f3971e9462ab19`.
There are now **157 TypeScript modules and no JavaScript modules under `src/`**.
[Final isolated CI](https://github.com/noahsong-sdg/mass-spinner/actions/runs/44177051948)
passed:

- `npm run typecheck`: strict production and compile-only contract configurations.
- `node --import tsx --test --test-concurrency=1 tests/*.test.ts`: 1,443/1,443
  runtime tests, with no failures or skips.
- All required focused qualification groups and 20 Python tests.
- `npm run build`, `npm run check:site`, and `npm run check:assets`.

Independent adversarial agents reviewed all 69 migrated modules, runtime changes
after type erasure, 46 entrypoint DOM contracts, worker dispatch, old v2/v3 links,
cancellation, comparison state, provenance and renderer resource ownership.
No migration blockers remain. A full-suite failure in an input mock was fixed by
modeling native DOMString coercion for `value`, `min`, `max` and `step`; the
production behavior and physical assertions were preserved before the green run.

The verified artifact was deployed to the
[live simulator](https://fieldwork-plasma-lab.fieldwork-plasma-lab.workers.dev/?level=2),
Cloudflare version `9abace8a-de62-4cb2-9e34-bf0d0420f89b`. Twelve previous-release
hashed assets were retained after byte comparison. An already-open old-release
tab still completed a new worker calculation; fresh navigation loaded the new
`main-DRLDZuHn.js` entry and `worker-D8ywqXOz.js` worker.

Native browser verification exercised the deployed artifact, without a headless
or policy bypass:

| Playground | Observed checks |
| --- | --- |
| Centrifuge | Current intervention and fresh-tab share restoration; thermal and spatial-temperature plots; composition and purity/recovery endpoint; clipping, camera, direct hardware picking and material inspection; guide-to-plot links. |
| Mass Spinner | Magnetic-field/mass changes, rerun, no-electric-field control, collection plots and GPU-rendered apparatus. |
| Models | Equilibrium baseline/restore; static and collisional double wells; gyro, drift, resonance and rotating-filter outputs; independent comparison cards. Increasing drift curvature radius from 2 to 3 m changed the displayed drift from 225 to 150 m/s. Reversing RF polarization suppressed resonant heating. |
| Research | Combined operating-point selection, saved-step scrubbing, temperature tensors and lazy distribution/entropy plots; qualification remained withheld. |
| Beam target | Energy slider, zero output with beam off, material-model activation, finite-time energy ledger, References disclosure and lazy exposure controls. |
| Future blanket | Rendered blanket assembly and decay response to time and initial isomer fraction. |
| Laurelin | Compression and timeline changes updated state and traces; direct coil picking reported its assumed material. |

At 390 × 844, the centrifuge, Mass Spinner, Models, Research, beam target and
Laurelin layouts were checked; document width equaled scroll width (390 px).
Responsive panel switching and representative plots/controls remained usable.
Screenshots were inspected at desktop and mobile sizes. Main and Laurelin pages
recorded no console errors during these checks. These are representative
end-to-end regression checks, not exhaustive parameter-space validation or new
experimental qualification. The preexisting exploratory collision warnings are
still displayed.
