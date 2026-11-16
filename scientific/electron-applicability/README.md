# Electron energy applicability screen

**Implemented; all 17 regressions passed in isolated offline CI. No live/PDE closure changes.**

The centrifuge's prescribed conductivity and immediate heavy-gas Ohmic heating
do not resolve electron energy or internal atomic states. A conserved heavy
energy ledger cannot test those omitted reservoirs. In plain terms, accounting
for every joule does not establish which particles receive it.

This adapter makes the already executed [LoKI-B++ reference](../expert-v88/electrons/README.md)
usable for a bounded **unmagnetized** energy-channel study. It does not build a
second electron solver, insert an arbitrary heating fraction, or turn the B=0
reference into magnetized centrifuge coefficients. The official [LoKI description](https://nprime.tecnico.ulisboa.pt/loki/tools.html)
distinguishes electron Boltzmann power channels from the coupled global chemistry
and gas-energy calculation; [LoKI-MC](https://github.com/LoKI-Suite/LoKI-MC)
is the separately proposed crossed-field backend, not installed by this change.

## What it computes

- Authentic source chain: caller-pinned bulk admission → original table/receipt
  → all three native power/rate file pairs at the selected condition.
- Fourteen signed global electron-energy coefficients, excluding duplicate
  aggregate/species blocks; W/m³ is `coefficient[eV m³/s] × e × ne × N`.
- The original 2% plus contraction mesh screen, now applied separately to every
  power channel and eight net channel groups. Failures remain failures. This
  supplements the original admission and never rewrites it.
- Direct elastic transfer to heavy particles is **minus** net elastic electron
  power. Excitation, ionization and normalized-density growth are kept separate;
  none automatically becomes heavy heat, radiation or a wall loss.
- Derived elastic heating/fraction and throughput time require the contributing
  channel/group mesh screens. Failed derived values are unavailable; raw signed
  coefficients remain diagnostics with their individual gate records.
- Electron stored energy divided by field power gives an **energy-throughput
  time**, not a kinetic relaxation eigenvalue or a locality/stationarity test.
- If the original ionization rate passes its existing mesh screen, separate
  conditional neutral-depletion `1/(ne kion)` and electron-multiplication
  `1/(N kion)` times. Zero denominators give no finite time. Reverse reactions,
  metastables and transport are not represented, so these are single-channel
  scales, not a chemistry evolution or prediction of net depletion.
  An underflowed/overflowed positive rate scale is rejected, not treated as zero.

Inputs require explicit neutral-rest electric field, B=0, neutral and electron
densities, gas temperature, duration, and assumption/measurement/simulation
provenance bound to actual source-file hashes. Source identity does not certify
measurement accuracy. Heavy density or the passive 0.5 tracer cannot silently
be substituted for neutral density or ionization. Only the eight exact executed
E/N/temperature points and their executed neutral-density conditions are allowed;
there is no interpolation, pressure rescaling, magnetic correction or fallback.

## Execute inside safe-dev only

```sh
cd scientific/electron-applicability
python3 -m unittest -v test_screen
python3 screen.py --electron-root ../expert-v88/electrons \
  --admission-sha256 2be0967cabb083c2402161ca5a2f534b87fc1eff67580096a84ec64f33168d0a \
  --state STATE.json --state-sha256 STATE_SHA256 \
  --field-td 100 --gas-temperature-k 300 --output NEW_SCREEN.json
```

`STATE.json` uses schema `electron-applicability-state-v1`, `fieldFrame` equal to
`neutral-rest`, and keys `neutralDensityM3`, `electronDensityM3`,
`gasTemperatureK`, `electricFieldNeutralFrameVm` (three signed components),
`magneticFieldT` and `durationS`. For each of those six keys, `provenance` contains
`kind`, `citation`, and an existing source artifact's relative `path` and `sha256`.
`kind` must be `assumption`, `measurement` or `simulation`. Source artifacts stay
within the input packet's directory. Missing operating data remain assumptions;
the adapter never declares them measurements. The output path must be new.

## Actual checks and retained failure

The first isolated offline [CI run](https://github.com/noahsong-sdg/mass-spinner/actions/runs/43831545876)
passed 15 of 16 energy tests. Its sole failure was a manufactured-fixture
assertion comparing a roughly `5e14 s` result to seven absolute decimal places;
the binary64 difference was `0.0625 s`, approximately one representable increment
at that scale. This was a test-scale error, not an original scientific-gate
failure. Both large fixture times now compare their normalized ratio to one at
14 decimal places. The original 2% plus contraction gates are unchanged.
A new subprocess control covers the actual CLI with source-bound assumed inputs,
the retained 100 Td/300 K native point, magnetic refusal, and no overwrite.
The corrected 17-test suite passed in [isolated offline CI](https://github.com/noahsong-sdg/mass-spinner/actions/runs/43832326328)
at commit `409bd963713643df319554b51116dc6aa5c2f1cb`; the adapter and tests
were unchanged in the later [spatial integration check](https://github.com/noahsong-sdg/mass-spinner/actions/runs/43833292908),
which also passed all 17. Source inspection independently checked normalization,
channel accounting, applicability refusal and finite-output handling. These are
software and declared-domain checks, not an experimental validation of the rates.

**Remaining:** magnetic solver/data admission; electron/internal-state and boundary inputs; channel-wise
experimental reference and transient/locality checks. No numerical screen here
establishes experimental, apparatus or Marathon qualification.
