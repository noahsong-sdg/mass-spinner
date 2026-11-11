# v75 retained attempts

## Before the full study

The initial targeted tests exposed an environment setup error: moving Node
dependencies to a directory not named `node_modules` broke module lookup.
Dependencies were installed from the offline npm cache in safe-dev and kept at
`/work/home/v75-deps/node_modules`; the guest project uses a symlink to it.
No host installation or project execution was used.

Uniform-state assertions initially demanded bitwise zero after EOS/face-flux
roundtrips. Their residuals were below explicitly derived floating-point face
and storage bounds. Tests/checkers now distinguish these arithmetic allowances
from the unchanged physical local and refinement tolerances. No heat or mass
correction was introduced to enforce conservation.

The first diffusion-control CLI reached output serialization but failed on a
NumPy boolean. Converting the gate value to a Python boolean and adding a JSON
serialization regression fixed reporting only. `diffusion-controls-02.json` is
the rerun; no fit, equation, mesh or gate was changed.

`pilot-01.json` is a 6×6, 32-step coupled smoke test. It is not a complete
refinement study. `controls-01.json` contains the five-mesh analytical flow
controls, whose producer source was byte-compared before reuse.

## Full frozen study01

Safe-dev source snapshot:
`784d880c94090ed8bdd2b4373174df451b4ac5ddd1ef3ff5e6a7058444f78c0a`
(1633 files, 229921027 bytes).

Before execution: all 77 Python tests passed; 24 analytical flow gates,
14 analytical diffusion gates and six deliberately corrupted coupled states
passed their required controls. The study requests 20 trajectories, 4448 steps,
and 60 scheduled endpoints. Its raw pre-run hash map is authoritative for the
producer source, rather than a later checkout's contents.

The original source and its listed scientific dependencies are archived as
portable `frozen-source-01.tar.gz`, SHA-256
`f1c87f9bd0df9a8cc843ab3b3c22ff58dfba22ff34c37247f92b8ad2a399e46c`.
The archive preserves project-relative paths; extract it into an empty project
root to inspect the frozen source. It does not contain an installed dependency
environment or credentials. Runtime package versions are recorded in the raw
study and pinned requirements; package-lock identity is separately sealed.

The initial macOS packaging is retained as `frozen-source-01-macos.tar.gz`,
SHA-256 `a3e780139cf74c7159aba9ba2587e5599a972117386b9b8cf08566f0c4375aed`.
Linux extraction produced 24 extra AppleDouble `._*.py` metadata files.
`supplemental-01.json` correctly rejected this source tree. There were no
missing or changed real producer files. Re-extracting with those metadata
files excluded passed (`supplemental-02.json`); the published portable archive
omits them entirely. This fixes cross-platform packaging rather than ignoring
unrecognized files inside the source-hash checker. No producer hash was changed.

## Post-freeze review corrections

The isolated guest kept running the original copied source while host edits
prepared stricter composite temperature admission and independent checks of the
canonical initial state and every endpoint observable. These later changes
must not be substituted into study01's pre-run hashes. Their tests, supplemental
checks and any new trajectories require an explicitly separate source snapshot.

A later observer check can re-examine saved states; it cannot recreate missing
intermediate states, repair a failed convergence gate or establish experimental
accuracy. Final numeric outcomes are reported in the v75 status document.

The first new-checker test run rejected its own synthetic observations because
the independent graph returned NumPy scalars rather than JSON-native numbers.
The observation reconstruction now explicitly returns Python floats, with a
serialization regression. The same strict saved-artifact admission remains.
All 97 revised tests pass; no physical or convergence tolerance changed.

Full study01 remains unqualified: 74/615 series gates fail and the 96×96
spatial-reference check fails, despite all local audits passing. The original
negative convergence and receipt artifacts are retained. A late independent
check of all 60 endpoints passes; it explicitly does not assess convergence.
The post-review 6×6/32-step pilot passes and has bitwise-identical conserved
and solid-temperature endpoints to pilot01.
