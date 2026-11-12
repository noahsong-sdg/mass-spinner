# Cathode footprint: independent source investigation

12 November 2026. Read-only literature investigation; no scientific code,
downloaders or PDF parsers were executed by this reviewer. V82/V83 reports and
their geometry, voltage and boundary-source reviews were checked first.

## Decision

**No independently measured finite current footprint was recovered.** The
published ring-current boundary is specific enough for a mathematical replay,
but does not supply the finite emission geometry needed for an absolute-voltage
experiment. Do not select a radius, annular width, conductivity gain or voltage
offset by matching the known current or velocity.

## Verified primary-source facts

- [1979 original article, publisher-provided full-text OCR rehost](https://www.researchgate.net/publication/276453995_A_Study_of_a_Weakly_Ionized_Rotating_Plasma),
  §2.1 p.673: hollow tantalum cathodes, **inner radius 4 mm**, maximum 100 A
  per source. No outer radius, emitting length or resolved current distribution
  was recovered there.
- The same article, §3 p.677 Eq.11 and Appendix p.686 A.4: prescribed normal
  current on an infinitesimal cathode ring, proportional to
  `I δ(r−R1)/(2πr)`; zero normal current elsewhere except the anodes. The
  text explicitly imposes no wall-potential constraints. This is a Neumann
  current model, not an equipotential disk.
- [1980 follow-up, publisher-provided full-text OCR rehost](https://www.researchgate.net/publication/253120741_Limitations_on_Mass_Separation_by_the_Weakly_Ionized_Plasma_Centrifuge),
  §2.1 p.884: **tungsten cathodes, diameter 1.5 cm**, with tip heating by plasma
  ions and internal electron bombardment. It describes the earlier device as
  similar. These are not a measured footprint for the 1979 tantalum source.
- [1979 conference paper](https://doi.org/10.1051/jphyscol:19797236), retained
  `scientific/profile-v79/sources/hal-conference.pdf`: both original pages
  C7-487–488 were extracted/rendered in the safe-dev VM by the parent and
  independently read by this reviewer in
  `source-review/conference-page-1.png` and `conference-page-2.png`. C7-487
  specifies diameter 12 cm, length about 50 cm, and 24 electrically insulated
  stainless-steel rings, 2 cm thick. Fig.1 labels each discharge 100 V / 100 A;
  it is a schematic without dimensioned cathode emission geometry. C7-488
  explicitly obtains effective Hall parameters 3 and 9 by feeding the measured
  plasma voltage, 18 ± 2 V after electrode-fall corrections, into the model
  along with current and transport inputs. It gives no electrode-fall
  measurement method or finite current-footprint measurement.

These facts confirm the existing uncertainty; they do not identify a new
experimentally justified contact boundary. The conference pages were visually
checked; the longer article and 1980 follow-up were checked as OCR rehosts.

## Retrieval coverage and limits

The [AMOLF institutional dissertation record](https://ir.amolf.nl/pub/1473) was
successfully opened by following its link from the institutional publication
listing. It confirms Wijnakker's title, University of Amsterdam, promoter
J. Kistemaker and 3 September 1980 date, but exposes no full-text attachment.
The [institutional follow-up record](https://ir.amolf.nl/pub/2706) confirms the
1980 article bibliographic identity. Neither record supplies new geometry.

The [1979 conference record](https://www.researchgate.net/publication/45703766_A_STUDY_OF_A_WEAKLY_IONIZED_ROTATING_PLASMA)
web preview was unavailable, and its DOI/publisher PDF route returned
inaccessible/403. Those web retrieval failures do not describe source coverage:
the complete retained conference PDF was subsequently inspected as described
above. The original longer article's
[publisher PDF with open-access query](https://www.degruyterbrill.com/document/doi/10.1515/zna-1979-0602/pdf?licenseType=open-access)
reported 16,446,932 bytes to the web fetcher but exceeded its size limit. This
retrieval lead was sent to the parent for a scoped VM attempt; it is not a local
PDF inspection by this reviewer. ADS dissertation abstract/PDF routes were
inaccessible. Broader exact-title searches recovered citations and metadata,
not an inspectable dissertation. This does not establish that no copy exists.

## Consequences for implementation

**Mathematical inference:** a zero-width boundary ring has a singular local
self-potential. Interior flow convergence does not by itself certify a finite
contact voltage or local power at that ring. A one-cell injection ring hides a
mesh-dependent width; it cannot be presented as a measured cathode footprint.

A finite annulus with prescribed current density and a finite equipotential
annulus are different physical boundary conditions. The former fixes the
injection shape; the latter lets the solution select its current distribution.
Neither is selected uniquely by an aperture's inner radius. The emitted plasma
also need not retain the solid emitter's projected footprint.

Admissible work without fitting is therefore:

1. Retain the disk case explicitly as a conditional contact model.
2. Implement source-prescribed 100 A ring injection as a separate published
   current-conditioned theory comparison. Using that published current as an
   input is legitimate; it is not a prediction or fit of current. If widths
   are varied, freeze them before prediction and retain every case as
   sensitivity rather than choosing a matching width.
3. For the separate absolute-voltage comparison, keep current as an output. A replay
   driven by measured 100 A cannot independently validate that same current.
4. Require a finite contact/emission geometry, axial plasma measurements and
   documented plasma-voltage extraction before promoting a new boundary to an
   experimental model. Do not infer those inputs from central-plane velocities.

No production parameter change is justified by this source pass alone.
