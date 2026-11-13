# Coupled OpenFOAM reference

[Results and limitations](../../COUPLED-OPENFOAM-V90.md) ·
[Frozen protocol](PROTOCOL.md) · [Prospective refinement](REFINEMENT.md)

Native Foundation 14 `fluid` + `viscousHeating` versus the unchanged V75/V86
neutral compressible momentum/energy block. Original audit: **118/119** gates;
extended audit: **130/134**. Remaining failures concern meridional spatial
contraction. Neither numerical nor experimental qualification is claimed.

## Evidence

- [Original audit](final-evidence/v90-coupled-source06/scientific/coupled-openfoam-v90/campaign-results/audit.json)
- [Extended audit](final-evidence/v90-coupled-source06/scientific/coupled-openfoam-v90/campaign-results/audit-extension.json)
- [Original predictions and input/native hashes](final-evidence/v90-coupled-source06/scientific/coupled-openfoam-v90/campaign-results/predictions.json)
- [Refinement predictions](final-evidence/v90-coupled-source06/scientific/coupled-openfoam-v90/extension-results/predictions.json)
- [Exact output-change replay](final-evidence/v90-coupled-source06/scientific/coupled-openfoam-v90/replay-admission.json)
- [Complete final raw native fields, dictionaries, source copies and logs](final-evidence.tar.gz)
- [Archive checksum/readback receipt](final-export.json)
- [Post-prediction endwall localization and EOS comparison](diagnostics.json)
- [Application final gate](app-final/execution.json)

The final archive's 558 regular members are path/type/size checked and rehashed
after export. Compact JSON, NPZ and logs are also available under
`final-evidence/`. Attempts 01–05 retain compact evidence under `evidence/`;
their 68.9 MB full archive is local-only, authenticated by `RAW-ARCHIVES.json`.
It was preserved rather than deleted or added as an oversized Git object.
The first replay attempt used an incorrect guest path and failed before any
comparison; corrected reruns pass. `replay-admission.json` is the separately
rerun, read-back-valid admission. Old failed records remain.

## Reproduce

Run only inside safe-dev; guest source is a copy. Do not replace an existing
guest until its valuable results are exported. The adapter uses the native
OpenFOAM installation and environment helper documented in
`../expert-v88/openfoam/reference88.py`; hashes in `predictions.json` identify
the actual installed sources, binaries and libraries. Supply the same native
Foundation 14 installation and pinned `requirements.txt` in a fresh guest.

From this directory, using that guest's Python environment:

```
python -m unittest -v test_reference90
python -m unittest discover -s ../mixture-axial-v75 -p test_flow.py -v
python -m unittest discover -s ../meridional-v86 -p test_diffusion86.py -v
python -u reference90.py full campaign-results
python score90.py campaign-results
python -u reference90.py extension extension-results
python score90.py campaign-results extension-results
```

The scorers exit 1 for the recorded failed scientific gates. Output directories
and audit files refuse overwrite. Preserve that result; do not reinterpret a
successful launcher receipt as a passing scientific audit. `control/` contains
the trusted host transfer/launch/readback scripts used for these exact snapshots.
