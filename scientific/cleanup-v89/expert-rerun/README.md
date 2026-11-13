# V89 expert-code physical reruns

All six reruns are complete; [results and retained failures](RESULTS.md) summarize
their verified execution. The unchanged upstream LoKI example is a failed
numerical smoke despite exit zero; the 44 bounded cases are assessed separately.

This folder contains replay orchestration, not a new physical closure. The frozen
V88 producers, protocols and gates are copied unchanged into new guest output
directories. All scientific/native execution is inside safe-dev; exported
receipts, coverage reports and source recovery maps accompany the new packets.

The coordinator serializes these campaigns against the V86/V87 job. Native
environments are reused only after their recorded identity checks. FESTIM alone
requires `/work/project`; its previous root files are moved into a verified
guest-only preservation directory before the fresh campaign writes results.

Each rerun records source/baseline hashes, commands, exit codes, logs, complete
case counts, unchanged numerical gates and descriptive numerical differences.
`executionCompleted` means all requested execution stages finished, including
retained scientific failures; it is not a physical qualification.

`compare.py` selects physical fields from each original packet and counts every
numeric mismatch. Array lengths and dictionary inventories are checked explicitly;
a matching prefix cannot hide a missing tail. The original packets remain
authoritative and are preserved separately. Four comparison controls plus a
nested failure-receipt retention control run before each campaign.
`warm-eligibility.py` authenticates new WarpX arrays and requires the
warm collision-off and collision-on initial states to match exactly; reflected
trajectories are not admitted as free-space orbit controls.

Evidence bundles exclude native environments, private LoKI/LXCat input data,
duplicated baseline payloads, caches and intermediate OpenFOAM expanded cases.
They retain native compressed OpenFOAM fields, all fresh result packets and
execution logs. Each bundle stays within safe-dev's 512 MiB transfer boundary.
Public compact records and any local-only raw archives must be distinguished in
the final execution report.

Public compact packets omit byte-identical source copies only after checking
their aliases. `SOURCE-RECOVERY.json` pins frozen inputs to their original Git
commit/blob where available. New V89 helpers instead name their current canonical
path and SHA; they are never labeled as old V88 code. Every full local bundle
retains the exact source bytes, including inputs absent from the older Git tree.

Executed bounded coverage:

| Campaign | Physical producers | Existing software/control checks |
|---|---:|---:|
| OpenFOAM | 13 | 4 tests, 86 gates |
| LoKI-B++ | 24 original + 20 extension + upstream example | 3 upstream executables, 8 adapter/admission tests |
| FESTIM | 36 | 9 tests, 94 gates |
| WarpX | 12 original + matched warm-off | 9 tests, new eligibility witness |
| Target/Radau | 9 requested browser trajectories + 3 cases at 2 reference tolerances | 9 reference controls, 4 zero-rate controls |
| Snakemake/FiPy | Fresh fine solve + integration-test physical controls | 8 integration tests and cached admission |

Original LoKI, WarpX and target failures remain failures. None of these numerical
replays establishes agreement with experiment or changes the live playground.
