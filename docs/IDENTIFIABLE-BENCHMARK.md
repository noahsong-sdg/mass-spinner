# Experimental benchmark admission

16 November 2026. **No inspected dataset yet supports a fully identified,
same-condition prediction of rotation, temperature and electrical response.**
This is a bounded search and admission result, not proof that suitable data do
not exist. Numerical verification remains separate from experimental accuracy.

## The closest case

Keep **Wijnakker's 1979 diffuse argon discharge** as the nearest conditional
reference: 6 cm radius, 48 cm cathode gap, 14 cm anode gap, 0.13 T, 100 A per
opposed branch, and 1 Torr feed behind the cathodes. Its tantalum hollow cathodes
have 4 mm inner radius. An aperture is not a measured current-density footprint.

This apparatus reports Doppler rotation and line widths, pressure, a near-wall
thermocouple and electrical values. However, 58±0.5 V terminal voltage,
18.5±2 V after electrode-fall correction, and the simulated finite-contact port
voltage are different quantities. Their mapping remains unresolved. The central
5950±1300 K temperature is an optical estimate; neither it nor the thermocouple
is an independent local neutral-temperature profile. The nominal fill pressure
does not specify the discharged gas inventory or axial heat sinks.

**Do not merge the 1980 experiment into this condition.** It uses different
tungsten cathodes and heating; its 3 Torr magnetic-field sweep does not share
the earlier electrical/thermal operating point. The earlier effective Hall
parameters 3 and 9 were inferred using measured voltage. The selected V82 replay
instead retains its collision-derived transport alternatives; it does not reuse
those voltage-calibrated Hall values.

See the [primary-source apparatus audit](reviews/benchmark-apparatus-20261116.md)
and [diagnostic audit](reviews/benchmark-diagnostics-20261116.md).

## What the search found

| Candidate | Useful evidence | Why it is not an admitted replacement |
| --- | --- | --- |
| MCX, Messer 2004 | Strongest public joint apparatus document found: Doppler rotation/temperature and electrical diagnostics | Nearly fully ionized hydrogen mirror; impurity-line interpretation and profile uncertainty; no matched raw bundle recovered |
| PCX, Flanagan 2020 | Best new argon diagnostic lead: direct optical ion temperature/flow, current and magnetic measurements | No matched voltage/temperature shot packet found; observed Hall-driven field changes invalidate our fixed-field approximation |
| PCX 2014 | Flow and electron diagnostics | Ion temperature is fitted from the velocity being tested |
| UT-Austin 2026 | Boundary temperatures, calibrated pressure/composition | Optical spokes are phase motion, not measured bulk rotation; 75 m/s is inferred by fitting composition |
| Marathon/MIT data-management plan | Relevant planned diagnostic releases | A plan was located; an actual centrifuge data deposit was not recovered |

WiPPL stores shot diagnostics in MDSplus, but its documented external access
requires institutional/static-IP coordination. A publication's data policy is not
evidence that its actual joint dataset was downloaded. No authors were contacted.
Primary links, search coverage and access limits are recorded in the
[independent data review](reviews/identifiable-benchmark-data-20261116.md).

## Executable comparison

The existing forward path prescribes heavy-particle temperature and transport;
it cannot independently predict the temperatures supplied to it. In plain terms,
scoring that temperature would mark an input as a successful prediction.
Adding another solver would not repair missing boundary or diagnostic data.

The smallest justified change is a sealed, fresh-output wrapper around the
existing V82 electrical/V80 optical scorer, plus a separately implemented scalar
auditor. It preserves exact sightline locations, every declared alternative and
the original gates. Reuse avoids creating another divergent diagnostic model.
It tests existing frozen predictions, **not a newly executed PDE solution**.
Existing observations have already informed development; this is not a blind
holdout. The [frozen protocol](../scientific/benchmark-identifiability-20261116/PROTOCOL.md)
defines the inventory and exclusions.

### Executed result

[Offline run 43945680619](https://github.com/noahsong-sdg/mass-spinner/actions/runs/43945680619)
at commit `f688220f175e06b44af826289b94fdbb38ddec6c` completed successfully.
The 15 new tests passed, including real-packet arithmetic and deliberate
error/current/count/identity/qualification corruption checks. A separate scalar
auditor reconstructed every optical and electrical row without importing the
historical scorer. This validates the replay arithmetic, not the physical model.

| Channel | Fresh rescore of existing frozen predictions | Meaning |
| --- | --- | --- |
| Rotation | 0/4,320 all-point matches; 0/4,320 eligible-point matches | The original 20% optical screen fails across every retained alternative; numerical optical gates remain separate |
| Electrical | 60 finest-grid voltage-driven cases retained; at nominal 18.5 V, currents span 19.346–30.859 A versus reported 100 A per branch | A large conditional discrepancy; unknown current uncertainty and port mapping prevent a statistical rejection claim |
| Temperature | Unavailable | Heavy temperature is prescribed, not independently predicted |

The nominal current range includes collision-partition controls; it is **not**
a physical uncertainty interval. For the source-motivated 2.5 eV collision
alternatives with anode center 0.07 m, linear/quadratic heavy profiles give
27.906/28.251 A. These are labelled examples, not residual-selected winners.
No new parameters, currents or velocities were fitted in this replay. All joint/experimental
qualification flags remain false; fixed-current scaled states are excluded.

Retained [replay and runtime evidence](../scientific/benchmark-identifiability-20261116/results/)
include the full compressed output and independent audit. The producer's
`replaySHA256` identifies **raw JSON bytes** (`c9c0facb…d0e40e`); the auditor's
same-named field identifies **sorted-key reserialized JSON** (`1089053e…633cc`).
They are distinct checksum conventions, not a matching pair; the evidence manifest
labels both explicitly. Scientific execution used offline non-root Docker,
one CPU and 1 GiB, with no host scientific execution or gate changes.

Independent post-run source/receipt reviewers found no blocker in this bounded
interpretation. Their approval covers diagnostic arithmetic, source identity and
reporting only; it does not establish an experimental match or thermal prediction.

### Final verification

[Application run 43945680256](https://github.com/noahsong-sdg/mass-spinner/actions/runs/43945680256)
passed at the same source commit: 1,343 TypeScript tests (plus the existing
24/29-test targeted subsets), 17 electron-applicability and 3 export Python tests,
typecheck, production build, site-resource checks and Blender asset checks.
The exact new scientific commands were:

```sh
python -m unittest discover -s scientific/benchmark-identifiability-20261116 -p 'test_*.py' -v
python scientific/benchmark-identifiability-20261116/replay.py benchmark-output/replay
python scientific/benchmark-identifiability-20261116/audit_replay.py benchmark-output/replay
```

Application commands and complete logs are retained with the evidence. No live
browser or deployed-site verification was performed by this benchmark campaign.

## What would unlock the requested test

Obtain one same-condition bundle containing finite electrode geometry/current
footprint, drive circuit and electrode-fall correction, magnetic field, discharged
density/inventory, electron diagnostics and thermal sinks, plus calibrated optical
spectra/estimator/exposure and electrical traces with uncertainty definitions.
Prescribe current **or** plasma-port voltage; predict the other. Do not prescribe
the thermal quantity scored as an output. Unknown inputs stay unknown; broad
sensitivity intervals are not confidence intervals or experimental qualification.

Only then adapt the compatible existing solver, freeze inputs and observation
operators, establish numerical uncertainty, and compare all three channels.
Reserve a genuinely unexposed condition for confirmation. The next bottleneck is
an identifiable experiment, not another transport sweep against known curves.
