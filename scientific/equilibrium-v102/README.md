# Centrifugal-equilibrium diagnostic

Hydro-only controls isolate whether a rotating gas that should be stationary
in the continuum acquires numerical radial motion. They do not reproduce the
argon apparatus: there is no current, viscosity, heat source or fitted input.

For constant temperature and rigid angular speed, radial pressure balance is
`dp/dr = rho*Omega²*r`, giving `rho = rho_wall*exp[Omega²(r²-R²)/(2*kT/m)]`.
We integrate density and density-weighted inertia with the cylindrical Jacobian.
The two initial-state representations are deliberately distinct:

- **Native primitives:** exact average density, constant cell temperature and
  angular speed, using the production `Flow.state` inertia `mass*mean(r²)`.
- **Conservative moments:** integrated continuum mass, angular momentum and
  energy. Production primitive recovery gives slightly different cell rotation
  and temperature because density-weighted inertia differs from the native one.

Pressure face reconstruction and the cell centrifugal source are not built
as a single equilibrium-preserving discretization. The control measures the
resulting residual, boundary-cell contribution and 0.1-microsecond drift on
both existing nested meshes at n=1/2/4. Zero-rotation controls must remain at
arithmetic scale. Neither rotating representation is required to have zero
discrete residual; that would silently assume the property being investigated.

Run inside the scientific safe-dev environment:

```
python -m unittest discover -s scientific/equilibrium-v102 -p 'test_*.py' -v
python scientific/equilibrium-v102/equilibrium102.py NEW_RESULTS.json
```

The four regression controls check independent quadrature, the zero-rotation
limit, both projection contracts, and refinement of inertia representation
error. No production equations, acceptance thresholds or live models change.
