# Mass Spinner: learning levels and research status

7 November 2026. Levels change subject and detail, not the validity of a model.

1. Mass Spinner: a collisionless prescribed-field rotating filter. Four controls,
   a pinned source and seed, finite-device orbits, live plots and share links.
2. Marathon Fusion: beam–target controls, a responsive footprint, live readouts
   and sensitivity plots using illustrative inputs and a sourced D–T cross
   section. Not a calibrated company machine. Model notes are expandable.
3. Model lab: the existing Section II A–D workbench, collisional double-well
   experiments, failure coverage and sampling studies. Numerical limitations
   remain visible; no experimental separator validation is established.
4. Research replay: three recorded Julia cases, 63 exact saved states, mean
   velocities and full temperature tensors. Case/time selectors replay saved
   moments; they do not run a solver or change physical inputs. Raw recorded
   moments and input/source hashes are in [the public packet](research-recordings.json).
   Full solver sources/velocity arrays remain local; this is partial public
   provenance, not a complete reproducible solver release.

## Offline studies

The isotropic v16 benchmark completed 14 trajectories and 494 states. Fine width
and timestep distribution differences pass their stated 2e-4 L1 budget. Scope
remains this homogeneous, field-free, zero-drift isotropic two-ion benchmark.
There are 16 passing and six failing coarse refinement records. These compare
evolution increments; differences do not certify exact continuum error or
resolve initial representation bias.

The v17 general three-velocity backend completed 17 trajectories, 600 steps and
617 states. Independent audits checked all saved states and replayed 51 selected
complete equations. Number, momentum, energy and positive-mixture structure pass.
Every nonzero initial physical-rate comparison fails the 2% gate. Distribution
refinements give 30 FAIL and two UNKNOWN; boost tests ten PASS, rotation eight
FAIL. Two physical-H budget passes allow a small positive H estimate; 15 cases
remain UNKNOWN. This is not an H theorem or physical qualification.

WarpX completed 21 separate runs; all 20 nonzero physical-rate families remain
unresolved under the seed-level uncertainty budget. Established software and
conservation alone do not establish physical agreement.

## Figure provenance

The public drift/tensor and distribution figures are byte-identical copies from
the closed v17 independent audit, seal:
`51b7fef7862527194b4508bda97aec804e9ab0cb8c8ca0701a0eb4540d2890fa`.
The entropy image is from its separately sealed label-only presentation packet:
`1f37aa91f6a5cbd780c4f0e6fa62d72e821cd1c608d04ae9c9d93b3ce3b87dd4`.
It explicitly distinguishes H-rise-budget acceptance from strict physical-H
monotonicity. Raw scientific archives are not deployed with the teaching app.
