# V101: bounded memory, faster solves, fixed-input refinement

Research backend only; the live playground is unchanged.

`profile101.py` measures the actual coupled path. `ordering101.py` compares
SuperLU orderings on its real stress/heat matrices. `benchmark101.py` runs
three alternating fresh-worker pairs and checks all six conserved fields.

Production changes preserve equations and quadrature: ordered electrical
heat scatter, scalar-component interpolation, bounded stress assembly, and
minimum-degree ordering of symmetric diffusion systems. Capacities and
factorizations remain fresh as density and timestep evolve.

`reconstruction101.py` tests actual FV averages, source projection and the
smooth source/contact-aligned nested mesh. `campaign101.py` keeps all V99
physical inputs, clocks and five jobs. `evaluate101.py` reuses the original
5% spatial, 2% timestep and optical gates; `geometry101.py` independently
reconstructs the new expected mesh. Stale geometry remains rejected.

See the frozen [protocol](PROTOCOL.md), [physics derivation](reconstruction_notes.md),
[performance reasoning](performance_notes.md), and [independent review](INDEPENDENT-REVIEW.md).
Passing numerical controls does not establish experimental accuracy.
