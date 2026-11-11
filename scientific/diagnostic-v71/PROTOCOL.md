# v71: synthetic Doppler observation operator

Freeze before execution. Research only; no experimental marker is fitted or
scored and no production source/default is changed.

Assume one isolated emitting species/transition (no unresolved isotope/line
blends), an axisymmetric optically thin emitter, infinitesimal perpendicular chord,
nonrelativistic local isotropic Maxwellians, pure azimuthal mean flow and specified
nonnegative emissivity. A radial cell is a constant-field annulus, optionally
outside an empty central hole. Integrate each cell's exact geometric path length.
The axis is +z, the chord is x=b and positive LOS velocity is +y, so local LOS
speed is b Omega(r). Photon weights are emissivity
times path length, not cylindrical inventory weights.

For normalized photon weights w, compute centroid <u>, thermal variance <kT/m>,
and flow variance <(u-<u>)^2> separately. Their sum plus a declared independent
zero-mean instrumental variance gives the observed second moment. Multiplying
by m/k gives a *moment-equivalent* apparent temperature, not a local temperature
or the temperature returned by fitting a Gaussian/FWHM to a non-Gaussian spectrum.
No pressure/Stark/natural broadening, opacity, finite aperture or instrument
deconvolution is supplied. Lorentzian wings cannot be represented by silently
adding a finite variance. Unknown inputs remain supplied assumptions.

Prospective controls: rigid rotation with arbitrary emissivity; uniform T;
two equal-photon components with an analytic shear variance; signed chords;
central chord; annular hole; empty/tangent chord unavailable; emissivity scaling;
uniform LOS velocity boost; emitter-mass thermal-width scaling; additive
instrument variance; thin annulus; invalid
fields. Compare smooth profiles against independently coded direct y quadrature
at 25k/100k midpoints (reference agreement <1e-7). Annular 32/128/512/2048-cell errors
must decrease for three frozen impact parameters and finish below 5e-4 in each
of brightness, centroid, thermal variance and shear variance. No result may be
called a matched reconstruction of the historical spectral reduction.

Retained first-run failure: the original 32/128/512 protocol produced 9 passing
tests and one failure. At b=.81 m, the 512-cell shear-variance relative error was
0.0006040004730648718, exceeding the unchanged 0.0005 gate. Annular LOS integration
is exact, but smooth fields are sampled at geometric radial midpoints; the LOS
radial weight r/sqrt(r^2-b^2) emphasizes the near-tangent part of a cell. Extend
the same factor-four sequence to 2048 cells, keeping all profiles, coarse results
and tolerances. This is an explicitly post-failure refinement extension, not a
retrospective claim that the original protocol passed. Parent diagnostics at
1024/2048 support the resolution diagnosis; the accepted sequence does not
require every possible intervening grid alignment to converge monotonically.
`run_report.py` retains all four accepted-sequence grids in machine-readable JSON.

Primary basis: NIST Atomic Spectroscopy, Spectral Line Shapes
https://physics.nist.gov/Pubs/AtSpec/node20.html (thermal Doppler broadening).
NRL LASCO C1 Doppler description
https://lasco-www.nrl.navy.mil/index.php?p=content%2Flevel_1%2Fc1%2FC1_dopp.html
(constant LOS projection for rigid rotation). The variance decomposition follows
directly by integrating conditional Gaussian first and second moments.

Existing data limits remain in docs/FIRST-ORDER-ACCURACY-V70.md. A synthetic pass
does not qualify measured emissivity, temperature, actual spectral fitting,
separation, throughput, heating or any Marathon operating point.
