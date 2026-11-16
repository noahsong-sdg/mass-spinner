# Experimental data acquisition

16 November 2026. **We recovered additional diagnostic documentation and public
reference codes, but not a complete same-condition experimental data bundle.**
This extends the [benchmark admission review](IDENTIFIABLE-BENCHMARK.md);
it does not change any qualification flag or establish experimental agreement.
No authors have been contacted.

## 1. Marathon / MIT: the most relevant acquisition route

The full [data-management plan](https://doi.org/10.48321/D10930DB2F) is publicly
downloadable as a [narrative PDF](https://dmphub.uc3prd.cdlib.net/narratives/1c0a47d59819c6a8.pdf).
It names Kevin Woller as principal investigator and Rémi Delaporte-Mathurin as
data manager. The [public structured record](https://api.dmphub.uc3prd.cdlib.net/dmps/10.48321/D10930DB2F)
lists their project contacts as `kbwoller@mit.edu` and `remidm@mit.edu`.

The plan explicitly lists novel centrifuge CSV/TXT data: optical spectra,
interferometer diode signals, electrode current/voltage traces, magnet signals,
pressure, timing and thermocouple traces. It proposes Zenodo release as data are
produced, subject to the stated dissemination/IP review process. **A release plan
is not evidence that these files have been released.** The structured record
still contains a generic dataset entry, with no individual datasets defined.
No matching deposit was recovered in the searches below.

The data manager's public [FEniCSx centrifuge model](https://github.com/RemDelaporteMathurin/plasma-centrifuge)
is a useful reference implementation, not an experimental dataset. At inspected
main commit `6ad77b4b3f2d4ba478a8574556e6da8095361132`, it contains one notebook,
environment, README and MIT license. Source inspection shows coupled potential
and azimuthal-velocity calculations and a prescribed-temperature pressure
calculation; it does not load raw experimental spectra or shot tables. Its
parameters and equations need a separate apparatus/physics audit before reuse.

[Open PR 4](https://github.com/RemDelaporteMathurin/plasma-centrifuge/pull/4)
describes a CHARYBDIS geometry, varying magnetic field and loosely coupled energy
equation. It is unmerged. Its referenced head repository returned HTTP 404, so
the proposed implementation was not fully retrieved or validated. Do not infer
that the public main notebook includes that thermal model.

**Best request:** one already releasable centrifuge condition, with a second
condition reserved for a genuinely held-out test. Ask for the bundle below,
not proprietary engineering drawings or the entire project archive.

## 2. Historical argon: recovered thesis and diagnostic details

Wijnakker's complete 1980 thesis is available from
[IAEA INIS](https://inis.iaea.org/records/ymfdn-qv182), including the
[111-page PDF](https://inis.iaea.org/records/ymfdn-qv182/files/12582976.pdf).
It includes the 1979/1980 studies, additional energy/mixture discussion, and a
Fabry–Perot appendix. Printed pages 102–103 were checked as rendered images.

Newly recovered optical details include a 3 mm plate spacing, approximately
400 mÅ free spectral range at 4806 Å, a measured apparatus profile used in
line-profile processing, and nominal scan strips of 0.2 mm radial by 2 mm axial.
These constrain an observation operator; they are not raw spectra or a complete
instrument-response calibration. The thesis also explicitly warns that the
measurements characterize the midplane and do not determine the axial profiles
(printed p. 35). It repeats the voltage-based inference of effective Hall
parameters (pp. 35–36), so those values cannot become independent no-fit inputs.

**Remaining:** original line scans and calibration response, current/voltage
curves and electrode-fall extraction, finite current footprint, axial thermal
conditions, and uncertainty/correlation definitions. The appendix improves
diagnostic identification but does not close these gaps. Keep the different
1979 and 1980 cathode configurations separate.

## 3. Wisconsin: better diagnostic software, coordinated shot access

The full [Milhone dissertation](https://wippl.wisc.edu/pub_files/theses/thesisMilhone147_2020.pdf)
and [Flanagan dissertation](https://wippl.wisc.edu/pub_files/theses/thesisFlanagan145_2020.pdf)
were downloaded and text-searched. Milhone's acquisition description documents
raw/processed MDSplus shot trees and shot logging; it does not provide a public
download of the matched shot packet needed here.

Milhone's [Fabry–Perot analysis code](https://github.com/jmilhone/fabry_perot)
is public and MIT-licensed. At commit
`cd3cb7a1dbcaa3c9382f9f2dbd3407d95447b3ce`, its tree contains calibration,
ring processing and plasma-line analysis tools, but no identified matched raw
camera/spectra/electrical experimental bundle. Example plots and synthetic-data
generators are not experimental observations. Its legacy Python dependencies
were not installed or executed.

[WiPPL's access instructions](https://wippl.wisc.edu/how-do-i-access-data/)
require institutional/static-IP coordination. The
[data-management policy](https://wippl.wisc.edu/what-is-your-data-management-plan/)
also describes PI approval. We did not attempt private access. A collaborator
could instead supply an exported HDF5/ASCII shot bundle. PCX/BRB field evolution
and regime differences would still need model-compatibility checks.

## Minimum useful bundle

For each condition, require a shared shot/run identifier and:

1. Apparatus dimensions, electrode contact areas/locations, field map, species,
   feed/pumping or discharged inventory, and operating timing.
2. Synchronized electrode current and terminal voltage, circuit definition,
   electrode-fall correction or independent plasma-potential measurements.
   Prescribe current **or** plasma-port voltage; predict the other.
3. Raw line profiles or camera frames plus calibration, sightlines/slits,
   exposure, instrument response and the published estimator. Include electron
   density/temperature constraints and their provenance.
4. Wall/cathode temperatures and cooling conditions, plus an independently
   measured heavy-particle temperature. Do not score a prescribed temperature.
5. Error definitions, repeat shots, exclusions and processing scripts. Label
   which conditions have already been used to develop or choose the model.

If only part is available, qualify that subsystem explicitly. For example,
calibration spectra can validate diagnostic processing without validating
momentum transport; a rotation curve with unknown heating cannot qualify the
coupled thermal model. Missing inputs remain unknown, not fitted replacements.

## Search coverage and evidence

Inspected the DMP narrative/structured metadata, public GitHub trees and PR
metadata, the thesis sources above, and public repository queries. The exact
Zenodo query `"plasma centrifuge"` returned one unrelated record; the DataCite
title query returned the DMP and an unrelated medical record. A Milhone creator
query on Zenodo returned no records. These bounded searches do not establish
that no suitable public dataset exists. Broad title searches were noisy and
were not treated as evidence of absence.

Download URLs, byte counts and SHA-256 receipts are retained in
[the source receipt](reviews/benchmark-data-acquisition-20261116.json).
This was a read-only literature/source investigation followed by documentation
edits: no solver, new fit, benchmark replay, application change or deployment.
