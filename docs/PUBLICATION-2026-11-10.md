# First public source snapshot

The public repository contains the application, its required 3D assets, Blender
scripts, application tests, selected scientific fixtures and compact research
evidence. The historical README is retained separately from the short overview.

Excluded material includes installed dependencies, local tools and credentials,
downloaded papers, full extracted article text, historical release copies, VM
exports and large raw research runs. The full local scientific directory is
approximately 19 GB; this is a curated source publication rather than a complete
archive. Some historical controller commands and documentation links refer to
excluded artifacts and cannot be replayed from this repository alone.

The intended self-contained checks are the README's application commands and
the following standard-library research checks:

```sh
python3 -m unittest discover -s scientific/diagnostic-v71 -p 'test_*.py' -v
python3 scientific/diagnostic-v71/run_report.py
python3 -m unittest discover -s scientific/field-v70 -p 'test_*.py' -v
```

All maintainer execution uses copied source in an Apple safe-dev VM. An initial
test-log command targeted the root-owned `/work` directory and failed before
executing tests; using the writable `/work/home` directory corrected that runner.
No runtime permission or isolation boundary was weakened.

## Executed checks

- `npm test`: 1,236 passed, zero failed, skipped or cancelled.
- v71 `unittest discover` command above: 11 passed; report generation passed.
- v70 independent `unittest discover` command above: 9 passed.
- `npm run typecheck`, `npm run build`, `npm run check:site`, and
  `npm run check:assets`: all passed. The build retains its existing large-chunk
  warning. Asset checks identify 176 meshes in the original separator and 261
  selectable meshes in the authored centrifuge assembly.
- `npm run dev -- --host 127.0.0.1 --port 4173 --strictPort`: application
  HTTP response, main module, and three model GLB responses passed inside the
  VM. This is a server/asset smoke check, not a rendered browser inspection.

The final 1,548-file copied VM source archive is SHA-256
`2c8cce9ba35485d28584cb6877fdabd8e8ca7100065d33bf2d953579a85b9051`.
Application tests ran before the final v71 refinement amendment; a file comparison
confirmed no application, application-test, dependency, or build-script changes
between those snapshots. The amended scientific files passed their dedicated
tests and report, followed by the required build/typecheck gates. Subsequent
edits only record verification in documentation and export the accepted JSON.

Publication checks do not establish physical accuracy or deployed browser/GPU
behavior. The v71 optical operator is research-only, with no production caller.
Its initial coarse-grid failure remains documented, and its acceptance tolerance
was not relaxed. See [the diagnostic report](DIAGNOSTIC-V71.md) and
[the experimental limits](FIRST-ORDER-ACCURACY-V70.md).
