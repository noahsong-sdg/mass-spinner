# Stationary-wall diagnosis and refinement

See [results, mechanism and limitations](../../ENDWALL-REFERENCE-V91.md).
The corrected candidate passes the separate 32→64→128 spatial study (73/73),
but the 16→32→64 extension still fails two mirrored contraction checks
(132/134). Finest-grid time refinement and experimental qualification remain
incomplete. The deployed playground is unchanged.

- `PROTOCOL.md`, `WALL-TRACE.md`: prospective diagnosis and prediction rules.
- `probe91.py`, `inspect91.py`: reproduce old failures and isolate wall shear.
- `refine91.py`: unchanged native/own 1024-step baseline at n=32 and128.
- `candidate91.py`: corrected backend; authenticated native results reused.
- `score91.py`: unchanged V90 gates, separate fine and baseline comparisons.
- `test91.py`: seven new controls plus 27 existing controls; all34 pass.
- `time-diagnostics.json`: early-time and endwall-region diagnostics, not gates.
- `app-final/execution.json`: exact final application commands and source seal.
- `evidence/`: authenticated compact predictions, arrays, scores and logs.
- `evidence.tar.gz`, `export.json`: full source snapshots/native case files,
  archive hash and verified export receipt. Historical V90 packets remain in
  `../coupled-openfoam-v90/`; the archive preserves their reference hashes.
- `control/`: trusted host transfer/launch/export controllers. All scientific
  computation executes offline inside safe-dev, with no host credentials.

The controllers record installation-specific paths; they are not a portable
one-command installer. Reproduction needs the recorded OpenFOAM Foundation14
installation, V90 packets, pinned Python environment and safe-dev volume.
Use the archived frozen source maps to replay an existing copy; source04's
map predates this README and refuses silent changes. For a new source copy,
review the paths and transfer map first. Preserve old outputs and score failures.

The red source03 controls, green source04 controls, two unchanged baseline
trajectories, twelve candidate trajectories and nonzero scoring exit are all
retained. No failed observable is discarded, no gate relaxed and no current or
velocity fit. Gate sets overlap and must not be pooled as independent evidence.
