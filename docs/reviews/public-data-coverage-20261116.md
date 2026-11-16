# Public-data coverage: 1979 argon

16 November 2026. New evidence is a **17-marker static-pressure extraction**;
existing rotation measurements are reused rather than redigitized. No solver,
model fit or scientific test was run on the host. No author was contacted.

## Execution path and missing evidence

The live benchmark reads five independently extracted conference rotation
sightlines through `src/fuel-benchmark.ts`. The V82 sealed replay uses the same
experimental rotation profile via V79 scoring, and predicts electrical response
conditional on prescribed heavy temperatures. Its 4,320 optical alternatives
are not 4,320 experiments. Neither existing path admits a pressure-profile target.

The recovered [Wijnakker thesis](https://inis.iaea.org/records/ymfdn-qv182)
Chapter II reproduces the **1979 tantalum hollow-cathode apparatus**, not the
different 1980 tungsten-cathode condition in Chapter III. Printed p.27/PDF32
contains Table I; printed p.39/PDF44 contains pressure Fig.12a. Both were
rendered and visually checked. The fixture retains the full pressure page,
crop, exact hash, pixel coordinates, anchors and an explicit exclusion list in
[observations.json](../../scientific/public-data-campaign/observations.json).

## Admission decisions

| Channel | Retained evidence | Permitted interpretation |
| --- | --- | --- |
| Rotation | Existing five Ar I sightlines, source/extraction hashes unchanged | Retrospective optical comparison under declared estimator alternatives |
| Pressure | 17 isolated cross markers, 0.13 T/100 A, r approximately 4.1–5.7 cm | New diagnostic comparison of midplane pressure; experimental uncertainty remains unknown |
| Electrical | 58±0.5 V terminal; 18.5±2 V after electrode-fall correction; 100 A per branch | Separate terminal and corrected observables; port mapping unresolved |
| Temperature | Central ion-line 5950±1300 K; r=5 cm corrected thermocouple 1800±400 K | Conditional inputs in V82, not independent thermal predictions |

Pressure points beyond r=6 cm lie inside the **wall probe channel** according to
the figure caption; they are excluded from the simulated gas-bore profile.
Near-wall overlaps and symbols from other B/current series are excluded by
legibility/condition, before inspecting any pressure predictions. No inferred
central 0.4 Torr value is admitted as a measured point. The nominal 1 Torr feed
behind the cathodes is not a measured midplane boundary pressure.

The pressure extraction uses ±7 pixel coordinate ranges, including axis-anchor
placement. These describe extraction uncertainty only; they are not experimental
error bars or confidence intervals. A separate component reviewer visually
checked all 17 centers and anchors against the retained images and found them
within the declared pixel ranges. This is independent visual review, not a
second independent extraction. Reviewers can inspect the retained crop. Probe response,
thermal corrections and spatial sampling are not fully characterized. A local
point-pressure comparison is therefore conditional. No new pressure pass gate
or experimental-qualification claim is introduced by this inventory.

## Required checks

Run `python -m unittest discover -s scientific/public-data-campaign -p
'test_observations.py' -v` inside the existing isolated scientific environment.
The checks seal provenance, preserve unknown uncertainty and temperature-input
roles, and reject source drift, duplicate marker IDs and out-of-bore markers.
They validate record integrity, not the accuracy of manual digitization or a
physical pressure prediction. Host-only JSON parsing/hash checks are documented
separately; a compatible forward pressure model remains required before scoring.
