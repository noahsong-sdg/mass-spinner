# Prospective low-field energy-grid extension

Frozen before extension execution; original PROTOCOL.md/results remain immutable.
The original 200 eV mesh consumes resolution on an empty tail. At 10 Td the
ionization rate is approximately 1e-23 m³/s and remains 5% mesh-sensitive;
30 Td changes by 0.334% but fails monotone contraction. We test resolution and
domain independently, without changing data, solver math or tolerances.

- E/N = 10, 30 Td; gas temperature = 300, 1000 K.
- Primary domain = 80 eV; 1600, 3200, 6400 uniform cells (0.05, 0.025,
  0.0125 eV). All other original physical/numerical settings retained.
- Domain controls: 40 eV / 3200 cells (same finest spacing); 160 eV / 6400
  cells (same middle spacing). This avoids conflating cutoff and resolution.
- Original eight physical/units checks remain identical. At each physical point
  all four observables must have final increment <2% and strict contraction.
- Domain controls must change each observable by <0.5% relative to the
  corresponding 80 eV mesh. All 20 cases and every failure are retained.
- A supplemental admission may qualify individual bulk observables using the
  ORIGINAL 32 gates, explicitly listing excluded ionization points. It may not
  alter the original global qualification flag or imply experimental agreement.
- No current, measured velocity or discharge profile enters the campaign.
