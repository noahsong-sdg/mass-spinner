# Synthetic optical diagnostic, v71

The remaining experimental barrier includes an observation mismatch. The v64
field scaling uses apparent central optical temperature as a conditional proxy;
the v65 spatial comparison projects a uniform-emissivity velocity centroid.
Neither supplies the full historical spectral reduction. The v70 source audit
explicitly retains radial temperature, emissivity and fitting semantics as
unknowns. Consequently replacing optical temperature with local gas temperature
or assigning all broadening to thermal motion would not be justified.

In simple terms, a spectrometer sees light mixed along its sight line. Different
flow speeds can broaden that light even when every location has the same thermal
temperature. Rigid rotation is an important exception: its perpendicular LOS
velocity is constant along an infinitesimal chord, so it creates a shift but no
flow broadening on that chord.

`scientific/diagnostic-v71/chord.py` now integrates exact constant-annulus photon
weights and reports centroid, thermal variance, differential-flow variance and a
declared independent instrument variance separately. The calculation uses the
single isolated transition/species supplied by the caller, excluding unresolved
isotope/line blends. Its moments use the law of total variance, with centered
flow moments to avoid subtractive loss of
precision. It accepts a signed chord and an empty central hole. Tangent/outside
or nonemitting sight lines return no measurement, rather than a fictitious zero
temperature. Geometry and positive-emission/temperature/mass boundaries are
explicitly checked.

This is the smallest coherent next step because it improves the model-to-data
interface without fitting an arbitrary temperature/emissivity profile, changing
production physics or pretending to resolve the unknown discharge closure. Exact
annular path integration also avoids introducing a second numerical LOS grid
into a finite-volume model. A separate continuous-function LOS quadrature checks
the profile-discretization limit. The prospective controls and error gates are
in `scientific/diagnostic-v71/PROTOCOL.md`.

The parent's first isolated run used the earlier ten-test snapshot: nine passed,
but the 512-cell smooth-profile comparison failed. At impact .81 m the relative
shear-variance error was 0.0006040004730648718 against the original 0.0005 gate.
This is a 0.0604% error against a 0.05% budget. The exact annular integration was
not the limiting step: geometric midpoint values underresolve the smooth fields
near the chord tangent, where the radial optical weight is r/sqrt(r^2-b^2).
In simple terms, that sight line sees some parts of a radial cell more strongly
than its geometric middle. Refining those cells is the smallest correction.

Parent diagnostic refinement reduced that same outer-chord maximum error to
0.0000934803421 at 1024 cells and 0.0000377266586 at 2048. The declared sequence
now extends by another factor of four, 32/128/512/2048, preserving the failed
512-cell result, unchanged smooth profiles and original tolerance. Intermediate
grid/chord alignment can change the apparent convergence rate; this is not a
claim of uniform order at every resolution. No higher-order reconstruction or
fitted profile was added.

Final parent-run isolated verification passed all eleven tests and the
machine-readable refinement report. The largest finest-grid error is
0.00003772665863707122 (0.003773%), below the unchanged 0.05% gate. All three
frozen sight lines pass; the independent 25k/100k-point reference comparison
also passes. The [accepted report](../scientific/diagnostic-v71/accepted/report.json)
retains per-observable errors at every grid, including the coarse failure,
and hashes of all four scientific input files. Commands executed in the
synced safe-dev snapshot:

```
python3 -m unittest discover -s scientific/diagnostic-v71 -p 'test_*.py' -v
python3 scientific/diagnostic-v71/run_report.py
```

The 1,548-file VM snapshot has safe-dev archive SHA-256
`2c8cce9ba35485d28584cb6877fdabd8e8ca7100065d33bf2d953579a85b9051`.
Node v22.23.4 and Python 3.11.2 were used. Only documentation and exported
results changed after that gate; no scientific or production source changed.

No measured source line shape, emissivity profile or actual instrument-fitting
rule was recovered by this stage. No existing experimental failure is erased.
This module has no production caller and changes no deployed slider, plot or
render. Synthetic verification must not be described as device validation.
