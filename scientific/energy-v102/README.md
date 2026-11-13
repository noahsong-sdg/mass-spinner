# Energy accounting before changing the closure

The V101 current-driven Ar campaign evolves one monatomic heavy-particle
temperature. Electrical transport, ionization, electron temperature, viscosity
and conductivity remain prescribed. Closed walls do not remove heat. A large
hotspot therefore cannot by itself tell us which omitted mechanism matters.

`energy102.py PREDICTIONS_JSON NEW_OUTPUT_JSON` reuses the sealed-field loader
and reconstructs kinetic/thermal energy directly from integrated conserved
fields. It reports hotspot location, mass/volume mean temperatures, cumulative
physical/numerical heat, global energy balance and inferred terminal voltage.
No measured velocity, fitted coefficient or new physical gate is introduced.

The history mixes **cumulative electrical work** with **per-step heat in
joules**. The report takes the last work value and sums the heat increments;
it does not sum cumulative work or multiply joules by timestep again.
Accepted-step intervals must cover the complete history; otherwise omitted
records could silently undercount heat. The known equal-Ar initializer source
identity and exact saved-temperature shape prevent stale/misapplied inputs.
Viscous heating converts kinetic energy to heat; it is not external input.
The thermal remainder also includes pressure work/hydro numerical conversion,
so it is not labeled missing external power.

The fraction of mass outside 84–10000 K refers only to the documented dilute
neutral-Ar viscosity correlation, whose source hash and scope are retained.
The campaign uses fixed viscosity, so this is not a claim that it numerically
extrapolated that correlation. Being inside this range does not validate a
partially ionized plasma closure. The heavy/electron temperature ratio is
context, not an equilibration threshold. No validity cutoff was invented.

This diagnostic is supplemental and does not change V101's failed spatial or
experimental gates. Exact source IDs and retained packet seals remain separate
from experimental credibility. Tests/execution are coordinator-owned; run only
inside safe-dev with the recorded environment and immutable source snapshot.
