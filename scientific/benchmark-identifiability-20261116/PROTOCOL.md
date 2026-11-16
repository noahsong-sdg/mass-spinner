# Same-condition benchmark admission and no-fit replay

Frozen before this replay, 16 November 2026. Existing Wijnakker measurements and
V82 failures are already known. This is retrospective development-data diagnosis,
not an untouched holdout, a new PDE prediction or a replacement for live physics.

## Selection and identifiability

Select Wijnakker's **1979 diffuse argon case** as the closest conditional reference:
R=0.06 m, cathode gap=0.48 m, anode gap=0.14 m, anode width=0.02 m,
B=0.13 T, 100 A per opposed discharge branch, 1 Torr feed behind the cathodes.
The 4 mm hollow-cathode inner radius is measured aperture geometry, not a
measured emitting-current footprint. Retain both existing anode-center
interpretations (0.07/0.08 m) as labelled sensitivities, not residual-selected data.

Keep terminal 58 +/-0.5 V, corrected arc 18.5 +/-2 V and the modeled bulk port
voltage distinct. The equality of corrected arc voltage and modeled port voltage
is an unqualified hypothesis. Never assign the whole terminal voltage to bulk
Joule heating. Never pool the 1980 tungsten-cathode apparatus and 3-Torr thermal
sweep with this 1979 tantalum-hollow-cathode case.

A joint rotation/temperature/electrical benchmark requires: independently bounded
physical inputs; a defined operator for each measured observable; a forward model
that predicts rather than prescribes each target; numerical/extraction uncertainty;
and explicit target-exposure status. Missing data remain missing, with no default
physical range. A condition failing this admission is not experimentally qualified
even if a conditional curve agrees. No full three-observable admission is presently
supported by the inspected sources or existing forward code.

## Executable bounded test

Reuse the sealed V82 absolute-voltage fields and V80 diagnostic predictions;
do not duplicate a PDE solver or replace the existing optical operator. V82's
transport alternatives are source-informed assumptions, not inferred fitted
velocities. They prescribe heavy-temperature profiles and electron-temperature
alternatives: **temperature is not an output prediction**. Transport and diagnostic
inputs from the same experiment make this a conditional test, not independent
joint validation.

Authenticate the original prediction, index, point, property, operator and source
identities; require the complete unique inventory of 20 groups. Reuse
`compare82.compare` at the exact admitted five sightline offsets, preserving its
estimator/brightness/edge/thermal/instrument alternatives and numerical gates.
Keep all 4,320 absolute-voltage optical rows: ten transport alternatives x two
geometries x three voltages x 72 diagnostic alternatives. No best-case selection,
parameter refit or discarded failed alternative is allowed. The historical scorer
also visits fixed-current records for its own complete join; those 1,440
current-conditioned rows are excluded from this new no-fit test and admission.

Report current predictions at all three port-voltage hypotheses (16.5,18.5,20.5 V),
with errors relative to reported 100 A per branch. Missing current uncertainty and
unknown voltage operator prevent interpreting a nominal discrepancy as a statistical
rejection or using a fabricated electrical confidence interval. Preserve source
collision-partition controls separately from source-motivated alternatives.

Retain the original 20% optical point-match criterion and original numerical
optical-resolution gates. Nominal point match, numerical resolution, electrical
mapping, source-input identifiability and experimental qualification are separate.
Do not reinterpret all-point pass as a joint gate or make temperature residuals by
comparing a prescribed input to itself. Joint experimental and live-promotion flags
remain false. Existing optical failures and thermal unavailability must be reported.

The independent auditor must use separately written scalar formulas to reconstruct
all output point errors, eligibility masks, counts and nominal current discrepancies;
verify full input/output identities; and reject deliberate corruptions. It must not
import the reused scorer. This tests the replay's arithmetic, not the old field
solver, experimental correctness or the unknown instrument operator.

## Execution and evidence

Run the new tests, replay and independent audit offline in non-root GitHub Docker
with one CPU, 1 GiB memory, no network, no extra capabilities and no credentials.
Use a fresh output directory and refuse stale inputs before creating scientific
output. Record exact runtime versions, source/input hashes and run identity.
No host scientific execution, automatic scientific retries, gate relaxation or
resource increase. Complete the repository's required final verification separately.

If this conditional test fails, do not fit contact size, conductivity, temperature,
viscosity or optical weighting to repair it. The next experimental step is obtaining
one documented operating-condition bundle with voltage/current operators, emitting
footprint, axial thermal boundaries and spectra or independent local diagnostics.
The historical case remains development data; reserve another condition for future
confirmation before selecting a new physical closure.
