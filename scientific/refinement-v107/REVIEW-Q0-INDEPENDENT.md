# Independent initial-clock review

**Conclusion:** the retained witness contains two genuine failures of the
unchanged strict contraction predicate. They prevent a complete canonical
stable-norm nine-case PASS **if the declared initializer, numerical environment
and initial states are retained**. This is a source-path inference from a
supplemental initial-clock experiment, not an executed full-matrix audit or a
finding about unrun finite-time convergence.

## Evidence independently checked

I did not author `stable107.py`, `precision107.py` or `q0-diagnostic.py`.
I authored the V107 campaign runner. This review used trusted artifact reads,
gzip decompression, SHA256 checks and arithmetic only; no project code, tests
or VM were executed.

All **277** payload hashes in the full-partial export inventory match. The
diagnostic JSON seal is
`7bd41151c8d843acd238af9c64f92652c0b6696612409d0ff11fa967e93e773d`.
Its producer-source inventory matches the actual copied checker sources and
both saved comparison packets; their physical manifests and scenarios also
match exactly. Packed and decompressed seals match for all three compared
field archives. The generated q0 archive's raw SHA256 is
`a718039c009a9e5b6e4e865ecd69788263774aab508ddb74ad2acea26b5bfd01`.

The actual states share identical 160-cell radial edges and identical domain
endpoints. Their axial cell counts are **24/48/96**, as declared for r8z1/2/4.
The generated r8z1 packet contains only clock zero and an empty history; the
other two are the sealed full r8z2 CFL 0.1 and r8z4 preflight packets.
([diagnostic artifact](retained/full-partial-evidence-20261113/v107-entry02/q0-diagnostic01/diagnostic.json))

## Reproducibility and gate consequence

The diagnostic binds `old.mesh` to `campaign.geometry(8,1)` and calls the
production `old.initialize`, then recovers primitive fields. Production makes
the same binding before `old.evolve`; its first target is zero, so no advance
precedes the saved initial snapshot. The progress subclass changes only
`advance`, not construction or steady torsion. The import chain supplies
`campaign105.CoupledFlow` and `heat106.FVDiffusion` in both paths. Thus no
different geometry, initializer, evolution or thermal solve explains away the
chosen q0 comparison. A future full r8z1 initial state has not itself been
observed; identical last bits additionally depend on retaining the numerical
environment.
([diagnostic:57](retained/full-partial-evidence-20261113/v107-entry02/q0-diagnostic.py#L57),
[runner:121](campaign107.py#L121), [initializer:53](../coupled-v99/campaign99.py#L53),
[saved clocks:75](../coupled-v99/campaign99.py#L75))

Independent arithmetic using the recorded integrals reproduces:

| Relative norm | r8z1→r8z2 | r8z2→r8z4 |
|---|---:|---:|
| Density | 3.1657282912882755e-17 | 3.201790156772644e-17 |
| Temperature | 1.168507693378509e-16 | 1.1776439379494985e-16 |

Both finer changes are larger. `audit99` requires `fine < coarse`, or both
exactly zero, at **every reporting clock**; `audit107` includes this axial
triple. The supplemental driver uses that exact predicate. Stable arithmetic
retains these positive differences rather than zeroing them. Their tiny
physical size does not satisfy strict contraction, and later timesteps cannot
alter a saved q0.
([predicate:223](../coupled-v99/audit99.py#L223),
[axial layout:199](audit107.py#L199), [diagnostic:76](retained/full-partial-evidence-20261113/v107-entry02/q0-diagnostic.py#L76))

The prescribed radial scalar profiles undergo volume multiplication/division
and, for temperature, total-energy addition/subtraction. Axial-volume and
torsional rounding can therefore leave mesh-dependent scalar roundoff. This
explains a plausible numerical origin; this review did not independently
recompute the complete field norm. It neither waives these failures nor
approves unrun finite-time, finest-grid timestep, experimental or live-model
qualification. Original failures and the incomplete nine-case status remain.
