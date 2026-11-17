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

Remaining batches, in dependency order:

1. Interface adapters, worker clients, and plotting inputs.
2. Interactive renderers and component selection, with Three.js types.
3. Playground composition and entrypoints, then development/build scripts where
   TypeScript improves their contracts.

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
