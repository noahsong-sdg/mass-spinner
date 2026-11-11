# Isolated refinement execution

All project execution is offline in the Apple VM via:

```
/Users/noahs/.local/bin/safe-dev -C /private/tmp/mass-spinner-public-20261110 run -- COMMAND
```

No host mount, credential forwarding or sandbox exception is used. The tested
copy is snapshot `53d63424c15f1090f64e2963d0715542d69b8c6f208790e5e0c67554b4170c72`,
1689 files / 376272844 bytes, volume `safe-dev-0b0443eadcbe4bd8`. The canonical
v75 producer and v76 metric/checkpoint code are unchanged. Only the new v77
validation module and its tests are added. Host documentation edits after
sync are outside the tested copy.

Before source replacement, all twenty indexed previous export payload hashes
and both persistent guest raw05 backups were verified. The previous export
was already successful and copied/hash-checked on the host. Neither persistent
backup is overwritten by this study.

The initial six new tests pass (0.520 s). After adding the signed-observable
diagnostic, the final source is explicitly copied and synced before testing.
`checks-01.json` records nine exact command vectors, stdout, stderr, exit codes,
timings, canonical producer hashes and both v77 source hashes:

- `python -m unittest discover -s scientific/spatial-v77 -v`: 7 pass, 0.483 s.
- `python -m unittest discover -s scientific/mixture-axial-v75`: 109 pass, 7.585 s.
- `python -m unittest discover -s scientific/spatial-v76`: 17 pass, 7.027 s.
- `python -m unittest discover -s scientific/coupled-axial-v74`: 61 pass, 18.264 s.
- Five relevant TypeScript test files: 15 tests pass.
- `npm run typecheck`, `build`, `check:site`, `check:assets`: exit zero.
  The existing >500 kB bundle warning remains. Static checks are not browser
  verification. No frontend source or README change is made.

The same checks receipt is retained in persistent guest storage at
`/work/home/mass-spinner-v77-checks01.json`. Runtime is Python 3.11.2,
NumPy 2.4.6, SciPy 1.17.1, FiPy 4.0.3 and Node 22.23.4, using existing guest
dependencies. The Python executable is
`/work/home/diagnostic-v72-venv/bin/python`.

```
python scientific/spatial-v77/study.py freeze --base /work/home/mass-spinner-v76-full05/scientific/mixture-axial-v75/study-05.json --plan scientific/spatial-v77/plan-01.json
python scientific/spatial-v77/study.py run --base /work/home/mass-spinner-v76-full05/scientific/mixture-axial-v75/study-05.json --plan scientific/spatial-v77/plan-01.json --raw scientific/spatial-v77/study-01.json --backup /work/home/mass-spinner-v77-study01.json
python scientific/spatial-v77/study.py analyze --base /work/home/mass-spinner-v76-full05/scientific/mixture-axial-v75/study-05.json --plan scientific/spatial-v77/plan-01.json --raw scientific/spatial-v77/study-01.json --output scientific/spatial-v77/convergence-01.json
```

Freeze exits zero before production. The producer starts at 21:13:34 UTC on
2026-11-11, with two worker processes inside the single VM. It records a plan
SHA, exact baseline SHA, physical source map, runtime and supplementary-source
SHA in the raw checkpoint. A source/plan proof copy and every completed
checkpoint are retained under persistent guest `/work/home`, outside the
replaceable project source.

The synthetic cancellation regression demonstrates the old combined reference
passing exactly while isolated space and time comparisons both fail. Other
tests enforce all 315 gates per metric, reject a mixed-step substituted
reference, stale/migrated plans and relaxed limits, check the velocity error
budget, and prohibit a shared output/backup path. These are implementation
checks; the numerical outcomes below are separate evidence.

Both producer jobs and the analyzer exit zero. Completion is observed at
21:25:47 UTC on 2026-11-11. Two new trajectories contribute 512 outer steps
and six endpoints, without failures. All 315 cell-average and 315 common-space
gates pass. Independent admission checks 26 trajectories / 78 endpoints
(including the 24 reused trajectories), with maximum observable reconstruction
discrepancy 5.169833125605525e-13. It checks recorded substep audits and endpoint
ledgers; it does not independently replay the PDE.

At fixed 256 outer steps, the common-space local maximum falls from
3.407767878% (48² versus 96²) to 1.693207806% (64² versus 96²). The fixed
96² timestep comparison has maximum RMS/local/observable differences
0.0142965734% / 0.2955200087% / 0.0488242511%. Both metrics pass unchanged
2% RMS/observable and 5% local limits. Six earlier coarse cell-average
monotonicity failures remain in the original v75 receipt; no verdict is
overwritten. Signed observable cancellation and the closed velocity projection
budget are saved in the new analysis rather than inferred from a pass flag.

Before bounded export, all project children are moved into persistent guest
`/work/home/mass-spinner-v77-full01`; only selected v77 payloads are copied
back into `/work/project`. The full backup, separate raw checkpoint and
pre-run proof remain intact. Export to
`/private/tmp/mass-spinner-v77-final01-export` exits zero, and all ten indexed
payload hashes pass host verification before copying to the original project.
The inspected verification plot shows the recorded values without clipping.

The raw SHA is
`5379ce3ee8f242da9e9c2483e567c789d962be2768faedbdfb9ee62346cf1f3e`.
The plan SHA is
`3eb35ecaeb3da095e43b48cbacfd8165f4b33588de6941a4017a0e97cd2f8c5e`.
The source-overlay SHA is
`18706f7bdd43a1142e652c6ea7807be35a2b9f578cbf16852ea71840b8f9a329`.
The gzip expands byte-for-byte to `study-01.json`; the uncompressed duplicate
is retained locally but only the compressed file is published.

Replay uses `scientific/spatial-v76/frozen-source-05.tar.gz` first (SHA
`9ed42d01e5888215d778dbb2979bc31efa322c99c5d4d62b6278693dba87f171`),
then the v77 overlay. The overlay contains the study, tests, exact pre-run plan
and a source index. Decompress the published v75 `study-05.json.gz` and new
v77 `study-01.json.gz`, then substitute their paths into the recorded analyze
command. The dependencies and runtime must match the sealed plan. Use new
output paths: the CLI deliberately refuses to overwrite prior plans, studies
or analysis. Full frontend checks require the Git checkout and dependencies;
the archives are source provenance, not a complete binary environment.

No physical producer, public UI or README is changed. No browser or experimental
qualification is claimed. Documentation edited after the tested source sync
is not included in the tested snapshot or generated artifact index.
