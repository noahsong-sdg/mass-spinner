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

## Verified first batch

Source revision: `639634e58db402b41c3f2a70535febf3a98453ae`.
[Isolated CI run](https://github.com/noahsong-sdg/mass-spinner/actions/runs/44124864675)
passed both strict compiler configurations, 30 focused sharing/baseline cases,
all 1,436 runtime tests, the existing qualification groups, 20 Python tests,
the production build, and site/asset checks. Independent source review found no
blocking regressions. Source now contains 86 TypeScript and 69 JavaScript modules;
the remaining JavaScript callers are still outside `tsc`.

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

The isolated strict compiler passed both production and contract configurations
on the 157-module integration snapshot. The initial isolated runtime batch passed
85/85 cases with no failures, skips or cancellations. Full final test/build and
deployment/browser evidence will be added after those gates complete.
