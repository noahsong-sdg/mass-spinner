# v70 independent public-source admission review

Reviewed 10 November 2026. This reviewer performed read-only source inspection
and primary-literature browsing; no project code, numerical study, or browser
application verification was executed. Parent owns safe-dev execution and sync.

## Original experimental source inspected through web parsing

The original [Wijnakker & Granneman 1980 PDF](https://www.degruyterbrill.com/document/doi/10.1515/zna-1980-0815/pdf)
was parsed through the web tool at the publisher's PDF endpoint, despite
earlier failures of the DOI landing page. It has 11 pages, journal pages
883–893. This is evidence of inspected source content, not a successful local
PDF download: parent reports that both original-paper VM downloads returned
zero-byte bodies. No valid downloaded original PDF or archival hash is claimed.

Source facts, sections 2–3 and figures 3–5: wall radius 6 cm; cathodes 48 cm
apart, diameter 1.5 cm; anodes 14 cm apart. Measurements are at the midplane.
Figure 3 is 100 A, 0.17 T, 3 Torr. Argon lines are neutral 4702 Å and ion
4807 Å. The laterally observed spectra were not Abel transformed. Authors
estimate uncorrected velocities 30–40% low, center temperatures about 30% low,
and potentially greater-than-twofold off-axis temperature errors. Figure 5
reports center temperature, not a radial temperature profile. At 0.21 T and
100 A, speed falls by a factor 1.5 from 3 to 9 Torr while center temperature
is nearly pressure independent. Reproducibility is about 15%, separately from
within-series error bars. Sections 4.1 and 4.2 treat one-fluid viscous scaling
and thermal limitations; the measured field/pressure dependence is stronger
than the center-temperature viscosity estimate explains.

**Admission judgment (inference):** the original improves provenance and
defines the diagnostic bias, but does not supply a resolved radial temperature
field or radial/axial current map for the frozen 3-Torr profile. A temperature-
conditioned prediction with arbitrary radial temperature shapes would still be
a hypothesis screen. A prescribed centroid is not automatically equivalent to
the Fabry–Perot line-profile extraction. Do not multiply data by a blanket 1.4
correction: the published bias statement is not a per-chord calibration.

The 1.5 pressure slowdown also cannot be dismissed as an old constant-mu bug:
substituting the measured nearly constant center temperature into mu(T) leaves
the fixed-current steady profile nearly pressure independent. Spatial heating,
current structure, secondary flow, mode changes and diagnostic weighting remain
distinct possibilities. This is a discrimination task, not a unique diagnosis.

## Stronger matched-input lead

[Wijnakker, Granneman & Kistemaker 1979 PDF](https://www.degruyterbrill.com/document/doi/10.1515/zna-1979-0602/pdf?licenseType=open-access)
was found at the primary publisher endpoint. Search indexes expose its first
page; direct web-tool parsing rejects the 16,446,932-byte file as too large.
The abstract says all measurements are at 1 Torr, including midplane neutral
and ion velocity, electron density and temperature, ion temperature, potential
and pressure profiles. Below 0.17 T the plasma is diffuse; above it the plasma
contracts. At low field ion/neutral speeds agree, whereas at high field their
reported speeds differ substantially. This makes its own low-field profile a
better matched-input lead than importing its temperatures into the separate
1980 3-Torr condition. It does not yet establish an admitted benchmark: full
text, figure conditions, optical response and coefficient ranges must be checked.

The [AMOLF thesis record](https://ir.amolf.nl/pub/1473) verifies the 1980
dissertation but exposes no PDF link in the returned record. No author was
contacted. Parent was given the publisher URL for a scoped VM download; that
attempt did not yield valid bytes.

## Recent model and alternatives

The [2026 two-temperature preprint](https://arxiv.org/pdf/2607.28208v2),
sections 4.1.1–4.1.2, explicitly calls its Wijnakker reconstruction approximate:
an effective 14-cm discharge length is used and measured profiles are skewed
outward relative to its predictions. It attributes that residual plausibly to
unrepresented boundaries/current structure. Its Kaneko pressure comparison
uses 0.5 Torr, 0.5 A, 0.57 T and effective 5-cm discharge length; radial Hall
force influences the pressure observable. Appendix A is useful for a future
two-temperature closure reference, not proof that its Saha approximation or
effective geometry predicts our live machine. No released executable code was
established in this review.

[Muir et al. 2025, Oxford repository](https://ora.ox.ac.uk/objects/uuid%3Afc8e4891-9869-43a8-bb5c-efb61ead7f62)
provides a peer-reviewed analytical/semi-analytical hydrogen MHD model. The
repository abstract describes theoretical radial velocity/density/pressure
solutions and parameter tables; it does not establish measured gas-velocity
holdouts. It is a useful independent mathematical limit, not a substitute for
an experimental accuracy gate.

[Stelzer et al. 2015, institutional record](https://pureportal.coventry.ac.uk/en/publications/experimental-and-numerical-study-of-electrically-driven-magnetohy/)
is a potentially stronger electrical/momentum submodel benchmark: GaInSn flow,
specified protruding annular electrode, ultrasound Doppler measurements and
finite-element comparison. Its liquid-metal/endwall regime does not validate
argon energy, ion-neutral coupling or isotope transport. The linked
[author preprint](https://jupiter.ethz.ch/~stijn/preprints/Zucchini_A_mod.pdf)
failed a fresh direct fetch with HTTP 502. It remains a bounded lead; no data
were admitted or digitized here.

[Kaneko et al. 1978, publisher abstract](https://doi.org/10.1088/0032-1028/20/11/007)
reports outer-electrode He–Ar concentration change, but full-text direct access
was denied by robots policy. Abstract extrema do not provide a complete
matched thermodynamic/current/diagnostic package. No access restriction was
bypassed.

## Recommended next gate

1. Recover and inspect the 1979 low-field **same-condition** profiles and
   optical fitting procedure, retaining their actual source coordinates,
   uncertainties and source hashes. Admit only parameters explicitly supported
   by that condition. The 1980 3-Torr challenge remains frozen separately.
2. Build a forward spectrum/diagnostic comparison where the actual published
   extraction is recoverable. Use sourced mu(T) only over its qualified range.
   Keep gas temperature, spectral apparent temperature, and peak/centroid
   velocities as different observables. Unknown emissivity must stay explicit.
3. Retain the one-amplitude/inner-points calibration and outer holdout if testing
   the old frozen profile. Any new experiment must declare its own split before
   scoring. Independent nuisance bounds must precede fitting; a successful
   flexible radial temperature or emissivity fit is not prediction.
4. Require the existing prospective <=20% resolved-signal error and <5% each
   numerical/extraction contribution. Scope a pass to the admitted observable
   and condition. Heating and separation remain unqualified without their own
   measured gates.

These recommendations are judgments about the shortest defensible route, not
claims that a passing matched benchmark is already available. More numerical
thermal refinement does not remedy the admitted-data and optical-observable
gaps described above.

## Follow-up: official alternate retrieval and field-v70 review

The [1979 publisher issue page](https://www.degruyterbrill.com/journal/key/zna/34/6/html)
and [article HTML page](https://www.degruyterbrill.com/document/doi/10.1515/zna-1979-0602/html)
were inspected. They establish article identity, pages and open-access status,
but expose metadata/abstract rather than the full article body in the returned
content. The ordinary PDF link returned HTTP 405; the license-qualified link
was rejected by the web parser for its 16,446,932-byte length. Neither response
establishes a recovered file. The [AMOLF article record](https://ir.amolf.nl/pub/2628)
and thesis record provide no full-text link in the inspected response. Scoped
searches of the institutional/ADS and legacy publisher alternatives yielded
no admissible full text. No access restriction was bypassed.

A distinct two-page [1979 conference paper](https://doi.org/10.1051/jphyscol:19797236)
is a further bibliographic lead, not a replacement for the 19-page ZNA article.
The official Journal de Physique endpoint returned HTTP 403 and an official
repository full text was not recovered. Search-index snippets and secondary
citations were not used to invent its curves, temperature or current values.
No new matched experiment is admitted by this follow-up.

Read-only inspection covered `scientific/field-v70/PROTOCOL.md`, `scaling.ts`,
`compare.ts`, `reference.py`, and the corrected marker file. The proposed
change has a defensible, narrow purpose: fixed-current steady viscous balance
uses V proportional to B/mu, whereas the old fixed-rate inventory hypothesis
used B times temperature. In plain terms, hotter neutral gas changes the
internal shear resistance; it is not justified to insert temperature through
an unrelated inventory factor. Reusing the existing neutral-Ar transport
table and one fixed calibration amplitude is preferable to fitting a new
power law to four points.

The implementation's temperature-ratio direction, viscosity-ratio direction,
and independent Q22 sensitivity direction are consistent with that hypothesis:
mu is proportional to sqrt(T)/Q22, so velocity at fixed B is proportional to
Q22/sqrt(T). A common multiplicative transport error cancels after calibration.
The Python reference reconstructs the ratios and corner studies independently
of the TS module, and locks the corrected marker hash and validation flags.
These are source-level observations; this reviewer did not run either program
or inspect a passing execution receipt.

**Claim boundary:** even a successful field-v70 screen is not evidence that
the complete simulation is first-order accurate. It conditions on measured
apparent center temperature rather than predicting heating, assumes the
effective momentum/observation factor remains common across fields, and tests
only three held-out speeds after one amplitude calibration. It does not solve
the frozen radial-profile or pressure failures. The original's approximate
shape invariance supports this ratio test, but does not establish an exact
field-independent optical correction. The common 1/0.7 temperature multiplier
is appropriately a separate sensitivity, not a corrected experimental truth.
Separate extraction, reproducibility and Q22 corner screens are not a joint
uncertainty envelope; their flags must not be combined into that claim. The
source accuracy annotation also does not establish a statistical confidence
level or bound on all model discrepancy. Keeping matched validation, live
qualification and unconditional accuracy false is therefore necessary.

**Minimal next admissible data:** recover a same-condition low-field 1979
profile with its actual figure-specific current, electrode dimensions,
temperature diagnostic and pressure boundary definition; preserve the separate
3-Torr condition. For a genuinely predictive thermoviscous benchmark, require
radial heavy-particle temperature (or an independently constrained thermal
closure), a defensible current/axial-boundary model, and the optical line-profile
extraction/response. A measured center-temperature-conditioned speed ratio is
the useful gate available now; it is not a substitute for these missing inputs.
No thermal or separation validation follows from its pass.
