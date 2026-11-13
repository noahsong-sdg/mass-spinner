# Existing electron-transport solver: LoKI-B++

**Executed, numerically bounded research adapter; not a magnetized discharge
closure or experimentally validated machine model.** [Bulk admission](results/bulk-admission-v2.json)
exposes only mean electron energy, mobility and diffusion at eight tested points.
Ionization and signed energy terms remain inspectable research outputs.

## Executed evidence

- Official [LoKI-B++](https://github.com/LoKI-Suite/LoKI-B-cpp), commit
  `add55181430adec223efcf56233c7139ed40b8d2`; unchanged native C++, bundled
  Eigen, single thread. Build details: [BUILD.md](BUILD.md).
- Three upstream grid/EEDF/transport test executables completed successfully.
  Transport tests print diagnostics rather than asserting every tolerance;
  their Einstein-ratio convergence is preserved in the raw log.
- The unchanged upstream argon swarm example completed 100 fields in 3.97 s.
- [Original frozen campaign](PROTOCOL.md): 24/24 cases completed and passed all
  eight normalization, positivity, energy, tail, power and SI-unit checks;
  28/32 refinement gates passed. Original global qualification remains false.
- [Prospective extension](PROTOCOL-EXTENSION.md): 20/20 cases completed; all
  diagnostic and cutoff-control gates passed. Two strict mean-energy contraction
  gates fail at 10 Td despite only 0.0016% increments. Both negative receipts
  are retained. No gates were loosened.
- Final `python3 -m unittest -v test_adapter test_admission`: **8/8 passed**,
  covering stale/legacy data, exact domain, B=0, excluded rates and independent
  reconstruction of all 14 signed native energy terms.

Independent review caught an admission provenance bug: authenticating the
receipt did not authenticate subsequently read native power bytes or table-row
values. Simply, a modified output could be paired with an old trusted receipt.
The generator now matches rows to that receipt, recomputes original gates, and
checks native-file hashes before extraction. Mutation regressions prove rejection.
This checks the actual dependency boundary without rerunning or refitting physics.
Use the supplemental `bulk-admission-v2.json`; v1 is retained historical output.

## Resolution failure and remedy

The original fixed 200 eV domain gave ionization increments of 5.3–5.4% at
10 Td; 30 Td changed by 0.334% but failed contraction. Ionization samples the
very small population above argon's 15.76 eV threshold, so bulk convergence
alone cannot establish rate convergence. Simply, a tiny energetic tail needs
finer resolution than the average electron energy.

The unchanged solver was rerun at 80 eV with 0.05, 0.025 and 0.0125 eV spacing.
Matched-spacing 40/80/160 eV controls differ by less than 3.9e-13 relative,
ruling out domain truncation here. Fine-grid ionization increments contract to
0.409–0.416% at 10 Td and 0.0386% at 30 Td. This supports grid resolution as
the cause; threshold alignment and cross-section interpolation were not
separately isolated. Refinement spends cells on the tail without changing
physical inputs or upstream mathematics; extending the original dense matrix
would spend more memory resolving an empty tail. Extension failures remain
published; its ionization values are not silently substituted into bulk admission.

## Domain and definitions

- Pure ground-state argon; DC, **B=0**; temporal-growth, two-term, spatially
  uniform stationary electron Boltzmann equation; e–e collisions disabled;
  pressure 133.32 Pa.
- E/N exactly 10, 30, 100, 300 Td; gas temperature exactly 300 or 1000 K.
  No interpolation/extrapolation admitted. Electron temperature is an output,
  `Te = 2 meanEnergy / 3` in eV, not a prescribed gas-temperature input.
- `N = p/(k_B T_g)`; `mu = (mu N)/N` in m²/(V s), `D = (D N)/N` in m²/s,
  `w = (mu N)(E/N)` in m/s, rates in m³/s. These are upstream scalar two-term
  transport coefficients, not an inferred Hall tensor.
- EEDF convention: integral `sqrt(energy) f(energy) denergy = 1`; `f` has units
  eV^(-3/2). Exact cell weights independently check normalization/mean energy.
- `powerDiagnosticsEVM3S` and `powerDiagnosticsJM3S` preserve the 14 **signed**
  global balance terms. Positive adds electron energy; negative removes it.
  Multiply J m³/s coefficients by `n_e N` for W/m³. Elastic gain/loss exchanges
  thermal energy with neutrals; excitation/ionization draw electron energy.
  Electron-density growth is dilution in the growing normalized distribution,
  **not wall heat**. Later gas/net sections repeat terms and are excluded.
  These channels have power-reconstruction checks, **no channel-wise mesh
  qualification**, and no automatic thermal-model coupling.

`admission.lookup` requires a caller-pinned SHA256, current schema, exact E/N
and gas temperature, B=0 and a per-row admitted observable. `adapter.lookup`
intentionally rejects the globally unqualified original table. Admission SHA256:
`2be0967cabb083c2402161ca5a2f534b87fc1eff67580096a84ec64f33168d0a`.

## Remaining physical barriers

A B=0 local two-term table cannot establish a magnetized apparatus's current,
electron energy or rotation. Applicability needs relaxation versus gradients
and evolution, magnetic deflection, anisotropy, metastables, e–e collisions,
sheaths and coupled electron-energy/chemistry. For example, `mu B` is already
order unity or larger for these B=0 mobilities at 0.1 T; this is a warning
indicator, not a validated magnetized coefficient. Unknown physical inputs
cannot be repaired by finer meshes. No measured device current/velocity was read
or fitted.

Data: upstream IST-Lisbon/LXCat argon set, generated 2022-09-23, SHA256
`4bcb328eff01c147a1ebb9cb31e01253344ae10fc9fa4bff508d76bce0f9d444`.
It was adjusted to historical swarm measurements: this is **not held-out
experimental validation**. Original process references remain in the retrieved
file. Cite L.L. Alves, J. Phys. Conf. Ser. 565 (2014); A. Yanguas-Gil,
J. Cotrino and L.L. Alves, J. Phys. D 38 (2005) 1588–1598; and the
[LoKI-B method paper](https://doi.org/10.1088/1361-6595/ab0537).

LoKI-B++ is GPL-3.0-or-later; its license is preserved here. Raw cross sections
are absent under the [LXCat redistribution policy](https://us.lxcat.net/instructions/redistribution.php).
Retrieve official source/data under applicable terms. This directory contains
adapter code, inputs, calculated outputs, hashes and logs; no vendored native
source, binaries or cross sections.
