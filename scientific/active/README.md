# Active scientific entry points

These tools check bounded calculations. They do not make the live centrifuge an experimentally qualified Marathon model. The [qualification report](../../docs/LIVE-MODEL-QUALIFICATION.md) remains authoritative about that distinction.

| Calculation | Owner / environment | Inputs → outputs | Admission / limits |
| --- | --- | --- | --- |
| Live centrifuge | TypeScript worker; root npm lock and Node 26.13.1 | Validated controls/history → accepted state, plots and scene | Production/domain tests and conservation/refinement checks; prescribed rigid rotors and transport closures |
| Public argon diagnostic | `campaign.py` + Snakemake 9.27.2; this uv lock, Python 3.14.10 | Frozen apparatus/observations, electrical fields and optical operators → content-addressed `results/<hash>/` | Exact source/file digests, 4,320 optical and 60 electrical alternatives; no fitting, no newly solved fields, no temperature prediction |
| Variable-property gas/wall heat | Live `src/fuel-thermal.ts` versus independent `thermal_reference.py`; SciPy 1.17.1 | Nine live histories → Radau/BDF comparisons | Same finite-volume equations and grids; temporal contraction, energy, material domain. No rotating-mixture or spatial-convergence qualification |
| Collisionless ion orbits | [Julia/SciML](../julia/README.md), committed Project/Manifest | Prescribed fields and initial states → reference checkpoints | Frozen executed Julia 1.13.3 environment; not a collision or plasma-closure model |
| Non-rigid coupled flow | [OpenFOAM v90](../coupled-openfoam-v90/README.md) | Frozen mesh/closures → momentum/energy reference and scores | Historical native environment and failed gates retained; not absorbed into this Python environment |
| Target diffusion / trapping | [FESTIM](../expert-v88/festim/README.md) | Frozen target case → bounded diffusion reference | Separate native dependency recipe; not the full reactive target model |

The versioned directories are frozen scientific records, not competing active package environments. Do not upgrade their dependencies or edit their retained source snapshots to make a current checker pass. New campaigns must record their complete source closure, lock/native runtime identities, protocol and outputs.

## Reproduce

The [Active science environment workflow](../../.github/workflows/active-science.yml) executes the complete recipe in a restricted Linux container: 2 GiB, one CPU, non-root, no capabilities, offline calculation. Setup checks the committed lock before syncing. Python 3.14 is deliberate: the pinned NumPy/SciPy wheels support it; 3.15 would require an unqualified native build.

Inside an approved isolated checkout, install only in the online setup step:

```sh
uv lock --check --project scientific/active
uv sync --frozen --project scientific/active
```

Then run offline:

```sh
uv run --frozen --offline --no-sync --project scientific/active python -m unittest discover -s scientific/active -p 'test_*.py' -v
uv run --frozen --offline --no-sync --project scientific/active snakemake --snakefile scientific/active/Snakefile --cores 1 --scheduler greedy
node --import tsx scripts/export-thermal-toolchain.ts
uv run --frozen --offline --no-sync --project scientific/active python scientific/active/thermal_reference.py science-evidence/thermal-live.json science-evidence/thermal-comparison.json
```

Snakemake reuses an identical source/environment identity. Its final admission rechecks sources, required artifacts and hashes, including on a cache hit. A changed physical source creates a new result key; a corrupt old output fails instead of silently being regenerated. The diagnostic study is replayed, not its historical field-producing campaign.

## Evidence storage

New large evidence belongs in a uniquely named GitHub Release, not another source snapshot in Git. [Publish immutable evidence](../../.github/workflows/publish-evidence.yml) admits a successful supported CI run and publishes a bundle plus a compact catalog. The catalog records producing revision, run URL, scope, byte count, bundle SHA-256 and every required file digest. Existing releases are never overwritten by this workflow.

Store the returned `catalog.json` in `scientific/catalog/`. Retrieve into a fresh directory using `python scientific/active/evidence.py retrieve catalog.json destination` in an isolated environment. Retrieval checks hashes and the complete inventory and rejects path traversal, links and oversized archives. It never executes downloaded files. Historical evidence and Git history remain intact.
