# Public FEniCSx reference: frozen conditional comparison

16 November 2026; freeze before execution. No experimental observations enter
this campaign. The reference is the existing `scientific/nonrigid-v98/fem98.py`
Q2 scikit-fem assembly, already compared with the separate FV research solver.
Neither implementation is the live rigid-rotation playground.

## Why adapt instead of executing the public notebook

[Public source](https://github.com/RemDelaporteMathurin/plasma-centrifuge), commit
`6ad77b4b3f2d4ba478a8574556e6da8095361132`, MIT license (see NOTICE).
The notebook's Gaussian cathode current is divided by `2*pi*R0`, while its
integration measure is `2*pi*r*dr`: its nominal 100 A therefore injects about
7 A at `R1=.07*R0`, whereas the wall anode extracts about 100 A. A finite
Dirichlet patch can supply the resulting mismatch. In simple terms, equal labels
do not mean equal integrated source currents. Reusing that calculation would
compare different electrical drives.

The notebook also treats `v_theta` with scalar weighted gradient viscosity.
For constant viscosity, the cylindrical azimuthal vector Laplacian additionally
contains `-v_theta/r^2`. Its omission incorrectly dissipates rigid corotation.
We use the existing angular-speed variable `Omega=v_theta/r` and `r^3` shear
form, rather than adding a singular term at the axis. This preserves regularity
and the established corotation nullspace. These are source-level observations,
not a claim about the authors' current private model or unmerged proposals.

## Matched equations and inputs

Use coordinates `(r,z)` on the half vessel. Solve the stationary axisymmetric
charge/torsional system with constant `sigma_parallel=1070 S/m`,
`sigma_perp=sigma_parallel/(1+3^2)`, `mu=1.14e-4 Pa s`, `B=.13 T`.
Its weak bilinear form is the polarization of

```
integral 2*pi*r*[sigma_perp*(phi_r-B*r*Omega)^2+sigma_parallel*phi_z^2]
       + 2*pi*mu*r^3*|grad Omega|^2 dr dz.
```

R=.06 m, half-length=.24 m, cathode mathematical ring r=.004 m at z=.24 m;
anode ring at r=.06 m,z=.07 m. Balanced point loads are +100 A at the anode
and -100 A at the cathode; phi(0,0)=0 is a gauge. Omega=0 at r=R and z=L;
axis and midplane have natural conditions. These match V98 exactly. Point-ring
voltage/Joule singularities do not represent finite physical electrodes.
Temperature is absent, not an independently predicted output. No measured
current/velocity is scored, no transport is selected from residuals.

## Execution and unchanged numerical screens

Use independent DOLFINx/Basix/UFL assembly and serial PETSc preonly/LU, with
diagonal symmetric scaling. Reuse the same nested physical element edges and
Q2 polynomial space as V98, n=1,2,4. Eight-degree quadrature integrates the
polynomial coefficients. Sample angular fields on the same fixed 41x31
physical grid; no interpolation between codes' coefficient arrays.

Retain all three meshes. Existing V98 limits remain: independent field
difference <5%; fine field change <5% and smaller than coarse change; linear,
source-moment torque and work residuals <1e-8. Same-space assembly agreement
is expected to be much tighter, but does not certify continuum pointwise error.
Source-current integral, reversal, zero-field, passivity and matched-assembly
tests precede the campaign. Failed gates cause a nonzero exit after retaining
the result, not a relaxed tolerance. Output records runtime and source hashes.

Build `Dockerfile` in this directory, record the resolved image digest, then run
offline/non-root with one CPU, 2 GiB maximum and writable `/tmp` compiler cache:

```sh
python3 -m unittest discover -s scientific/public-fenicsx-reference -p 'test_*.py' -v
python3 scientific/public-fenicsx-reference/reference.py NEW_RESULTS.json
```

Image tag pins DOLFINx 0.9.0; SciPy is pinned to 1.14.1 and scikit-fem to 12.0.2.
Install them with `--no-deps` so PETSc's inherited NumPy is not replaced. Record the actual
image ID and inherited NumPy/PETSc versions with the run rather than claiming
the tag identifies immutable bytes. Preserve the first failed output and log.
No host scientific execution. No deployment needed for this offline reference.
