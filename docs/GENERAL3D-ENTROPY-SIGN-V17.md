# Forced-order endpoint entropy sign check

The original broad common-temperature case passed its declared physical-H increase budget of `1e-8` per initial particle, but its estimated physical H increased. A separate, prospectively bounded diagnostic forced order 13 at only the initial and final 500 microsecond states, using the unchanged reviewer `entropy_control`, adaptive marginal integrals, orthogonal basis and density omission tolerance `1e-13`. It did not stop at order 9 or modify the original audit.

The positive estimated sign persists:

| Quantity | Result |
|---|---:|
| Initial order-13 H | -7.400725076569044 |
| Final order-13 H | -7.400725067686018 |
| Initial number | 2.0000000000000013 |
| Endpoint change per initial number | +4.441512935215993e-9 |
| Initial order-9 to order-13 sensitivity per number | 3.140316921401823e-13 |
| Final order-9 to order-13 sensitivity per number | 2.9804680140007255e-13 |
| Twice maximum sensitivity, including adaptive/tail/omission estimates | 6.280633842803646e-13 |

The estimated increase is about 7072 times that sensitivity envelope. This is evidence of a positive physical-H change, although it remains below the original declared `1e-8` allowance. It must not be described as strict preservation of the continuum H theorem. The sensitivity/error estimates are not rigorous interval certificates, so this check does not establish an analytic sign theorem.

Both endpoint jobs completed within their prospective 600 second caps: numerical wall times 64.233 and 66.443 seconds, peak RSS 145844 and 146040 KiB. They ran concurrently with one BLAS thread each in the existing isolated shard VM, under a new `/work/home/entropy-sign-v17` prefix. The exact runtime matched the original audit: Python 3.11.2, NumPy 2.2.6, SciPy 1.15.3 and Matplotlib 3.10.3.

The source, full original metadata/history and original case report were pinned before the two selected states were read. The separate packet retains every order-13 species output, adaptive/tail/omission estimate, the original order-5/order-9 controls, selected raw-line hashes, execution status, runtime and all source/data hashes. No model, parameter, rate, gate or original 17-case artifact changed, and no order-17 computation was added.

- Packet: `scientific/general3d-entropy-sign-v17`.
- Actual export: `/tmp/general3d-entropy-sign-v17-closed`.
- Plan SHA256: `5be1fe663d3d01f539d5d4eea69f2284e4d1e2f7af33240b944362ab922f3778`.
- Comparison SHA256: `07c29962dd9e7cc4eb97c93f5337587d64defae5195ce338c09afb4003b50619`.
- Seal SHA256: `da889fac2d188d16cc58d2f66c66824e708a61446ce365836e9e85a679043600`.
- Exact exported/canonical membership and every hash passed: 15 members plus the self-excluded seal. The 21 MiB archive contains the full original raw history and remains below the 512 MiB export cap.
