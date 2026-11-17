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
