# Independent v71 Doppler-moment physics review

Scope: read-only derivation, primary-source verification and source inspection.
This reviewer did not execute project code, synchronize a VM or verify deployment.
The parent owns isolated execution and acceptance of the exact tested snapshot.

## Derivation and execution path

`scientific/diagnostic-v71/chord.py` accepts radial annulus edges, angular speeds,
emitter temperatures, specified nonnegative emissivities, signed impact parameter,
emitter mass, and independent zero-mean instrumental variance.

With symmetry axis +z and chord x=b viewed along +y, pure azimuthal flow has
`u_LOS = b Omega(r)`. An intersected annulus contributes photon weight
`epsilon * 2[sqrt(r_out^2-b^2)-sqrt(max(r_in^2-b^2,0))]`. This is a path integral,
not the cylindrical volume or mass weighting used by the transport solver.
The implementation uses the rationalized square-root difference for chords
passing through both annular boundaries, preserving thin-annulus path lengths.

For normalized photon weights w, the mean is `sum(w u)`. The law of total
variance gives `sum(w k_B T/m) + sum(w (u-mean)^2)`; independent instrumental
variance adds to that sum. These have velocity-squared units. Multiplication by
`m/k_B` yields a moment-equivalent temperature, not a measured local temperature.
Centered flow differences avoid cancellation of large raw second moments.

The formulas are correct for an isolated emitting species/transition with
optically thin emission and local isotropic Maxwellian velocity distributions.
Different ion/neutral line temperatures require the corresponding emitter's
temperature and mass. An unresolved mixture of spectral transitions or isotope
line shifts would need an additional model and must not be inferred here.

## Independent controls inspected

- Rigid rotation gives constant LOS speed along a chord, regardless of radial
  emissivity or temperature; it shifts the line without rotational shear width.
- At b=0, pure rotation has zero LOS speed and zero flow broadening even when
  angular speed varies radially.
- Reversing signed impact parameter reverses the rotational centroid and leaves
  brightness, thermal variance and shear variance unchanged.
- Uniformly scaling emissivity scales brightness while preserving normalized
  moments. The explicit annular hole removes its path length from the signal.
- Tangent, outside and entirely nonemitting chords return no measurement rather
  than a fictitious zero temperature.
- Two equal-photon components at 0 and 1000 m/s have centroid 500 m/s and shear
  variance 250000 m2/s2, independently of their common local temperature.
- The continuous-profile reference integrates along the sight line directly;
  it does not call the annular path formula. Its refinement comparison checks
  spatial profile representation in addition to exact annular integration.

Requested minor additions were applied and inspected: explicit isolated-transition
wording, a mass-scaling regression (doubling mass halves thermal variance at fixed
temperature), and a 1e6 m/s uniform-boost control. No blocking formula error was
found. All numerical pass claims await parent-run safe-dev evidence.

## Primary sources checked

[NIST, Spectral Line Shapes, Widths, and Shifts](https://physics.nist.gov/Pubs/AtSpec/node20.html)
identifies Maxwellian emitter motion with a Gaussian Doppler profile and separates
instrumental and pressure broadening. This supports the thermal component; it
does not establish negligible Stark or opacity effects in the historical device.

[NRL, LASCO C1 Doppler Shift and Width Analysis](https://lasco-www.nrl.navy.mil/index.php?p=content/level_1/c1/C1_dopp.html)
explicitly gives constant rigid-rotation LOS projection along a sight line and
describes fitting Gaussian profiles to measured spectra. It also illustrates why
moments of a synthetic non-Gaussian mixture cannot be equated automatically with
parameters obtained by fitting an experimental instrument's spectrum.

## Qualification boundary

The original experimental line-fitting rule, emissivity and radial thermal/current
structure remain missing. Finite aperture, opacity, Zeeman splitting, natural and
pressure broadening, anisotropic distributions, nonazimuthal flows and multi-line
blends are outside this operator. The module appropriately has no production
caller and fits no measured marker. Passing its controls would verify a synthetic
diagnostic building block; it would not resolve the retained v64-v70 experimental
failures, qualify device performance or change any live playground output.

## Post-failure refinement amendment reviewed

The parent reports that the original ten-test snapshot passed nine controls and
failed the 512-cell smooth-profile comparison at impact 0.81 m. Its shear-variance
relative error was 0.0006040004730648718 against the original 0.0005 gate. This
reviewer has not executed or independently verified that initial run's logs.

The amended protocol preserves the three frozen profiles, original tolerance,
independent 25000/100000-point LOS reference and failed 512-cell result. It extends
the factor-four radial sequence from 32/128/512 to 32/128/512/2048. This is a disclosed
post-failure resolution extension, not a passing result for the original protocol.

The diagnosis is consistent with the formulas: geometric radial midpoint sampling
is not photon-weighted sampling. Written in radial coordinates, chord weight is
proportional to `r/sqrt(r^2-b^2)`, so the tangent-containing cell has a strongly
nonuniform but integrable optical weight. Its geometric midpoint can even lie in
the unobserved portion of that cell. Refining the field representation reduces
this error without altering exact integration of a declared constant annulus.
Cell/chord alignment can change apparent convergence rates, so uniform convergence
order at every intermediate grid is not established by the selected sequence.

The new `run_report.py` retains each grid's errors, checks reference refinement,
requires decreasing maximum errors and the unchanged finest-grid tolerance, and
binds the operator, test, protocol and report hashes. Its experimental and live
qualification flags remain false. The parent must run both the complete eleven-test
suite and report on the final frozen snapshot; source review alone is insufficient.

## Final exported report inspected

The parent reports a passing safe-dev gate for the final eleven diagnostic tests,
nine v70 reference tests, typecheck, build, site and asset checks. The reported
1548-file input archive SHA-256 is
`2c8cce9ba35485d28584cb6877fdabd8e8ca7100065d33bf2d953579a85b9051`.
This reviewer did not rerun those checks or independently inspect their VM logs.

Using only trusted standard-library JSON, SHA-256 and scalar arithmetic inspection,
I independently checked `scientific/diagnostic-v71/accepted/report.json`:

- Its four source hashes match the current operator, test, protocol and report
  files. Report SHA-256 is
  `3c6d9309c28ace6d7c54e12beeeefdebf8dfaefcb402cdc1089e40e2bd80be74`.
- The original 0.0005 profile and 0.0000001 reference tolerances are retained.
  All twelve per-grid maximum errors and acceptance booleans agree with the
  exported per-observable relative errors. Every selected sequence decreases.
- The finest maximum relative errors at impacts 0.17, 0.43 and 0.81 m are
  respectively `1.5321560885026578e-6`, `6.505024882820729e-6` and
  `3.772665863707122e-5`. Reference-refinement gates pass their original budget.
- The failed 512-cell outer-chord row remains marked false. Both
  `matchedExperimentalValidation` and `liveQualified` remain false.

The report contains errors and reference values rather than every actual predicted
moment, so this inspection verifies exported arithmetic, provenance and claim
boundaries; it does not independently rerun the quadrature or reconstruct the
projected moment values. Combined with the parent's reported final execution,
acceptance is limited to the synthetic operator and declared refinement cases.
The previously stated experimental and live qualification limits remain unchanged.
