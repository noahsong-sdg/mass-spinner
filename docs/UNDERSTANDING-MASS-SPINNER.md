# Understanding Mass Spinner

Continue afterward with [Part 2: from rotation to a prediction](UNDERSTANDING-MASS-SPINNER-02.md).

We started with a visual way to explore plasma mass separation. The project now
contains an interactive playground and a separate research model that tests how
far its simplifying assumptions can be trusted. You do not need to understand
the research code to start using the playground.

## Start with the gas

A gas contains moving atoms or molecules. An **ion** is an atom or molecule with
an electric charge; a **neutral** has no net charge. A partially ionized gas
contains both, plus electrons. **Isotopes** are atoms of the same element with
different neutron counts and therefore different masses: lithium-6 and lithium-7
are our default example.

The centrifuge concept uses electromagnetic forces to rotate gas. “Rotor” in
our equations means rotating gas, not a spinning metal drum or turbine blades.
Current crosses the gas radially; a magnetic field points along the chamber.
Their interaction produces a sideways force per unit volume, **J × B**, and hence
torque. J is current density: electrical current per unit area.
Ions transfer angular momentum to neutrals through collisions.

```text
Electrical drive → ion rotation → collisions → neutral rotation
                         ↓                        ↓
                        heat            radial density/composition
                         └──── temperature feedback ────┘
```

Both isotopes can become denser toward the wall. The heavier isotope does so
more strongly, leaving the inner gas relatively enriched in the lighter isotope.
This changes composition; it does not turn one isotope into another. This
centrifuge model does not calculate a fusion reaction or neutrino production.
Other models under Advanced include a separate beam-target neutron-source model.

## Three relationships explain most of the playground

1. **Drive competes with losses.** In the simple annular-current reference,
   torque is `τ = I B (R² − r_in²)/2`. Here I is current, B magnetic field,
   and the two radii mark the driven annulus. Torque increases gas angular
   momentum; collisions share it and wall drag removes it. Ions and neutrals
   need not initially rotate at the same speed.
2. **Rotation competes with thermal mixing.** For ideal, isothermal neutral
   gas rotating rigidly at angular speed Ω, the wall/axis heavy-to-light ratio
   changes by `α = exp[(m_heavy − m_light) Ω² R² / (2 k_B T)]`.
   Faster rotation strengthens equilibrium separation; hotter gas weakens it
   at the same rotation speed. This formula gives a possible equilibrium,
   not the time to reach it or the purity of an extracted product.
3. **The drive also costs heat.** At fixed conductivity and geometry, resistive
   heating scales as `I²`, while the reference torque scales as `I B`.
   Ion-neutral slip and boundary drag also dissipate mechanical energy.
   Holding temperature fixed assumes external thermal control; an evolving temperature
   requires an explicit energy and heat-transfer model.

An inner collection cut illustrates another tradeoff: a purer sample can recover
less of the desired isotope. Inventory fractions, ideal cascade routing and
pumping references are not measured extraction rates or solved outlet flows.

## What the computer actually does

| Part | Its job | Main limitation |
|---|---|---|
| Browser playground | Quickly evolve simplified ion/neutral rotation and radial species transport; optional gas/wall thermal evolution | Bulk angular speeds are rigid; local fluid momentum is not solved |
| 3D scene | Display apparatus, weighted tracers and selected numerical results | Materials/dimensions are illustrative; dots are not microscopic orbit calculations |
| Python research backend | Resolve radial and axial flow, charge/current, viscosity and thermal transport | Current argon study still fails spatial and experimental checks |

In the browser, controls send inputs through [`worker.ts`](../src/worker.ts).
[`fuel-centrifuge.ts`](../src/fuel-centrifuge.ts) computes the bulk rotation and
equilibrium references. [`fuel-transport.ts`](../src/fuel-transport.ts) and
[`fuel-operation.ts`](../src/fuel-operation.ts) add evolving radial distributions,
changing gas inertia, current schedules and optional thermal models. Their
outputs feed the plots and 3D visualization. Optional models matter: an
equilibrium overlay and an evolving species distribution answer different questions.

The research path starts from [`campaign99.py`](../scientific/coupled-v99/campaign99.py);
[V101](../SPATIAL-FLOW-V101.md) changes its spatial grid and checks refinement.
It divides a radius–length cross-section into cells and assumes rotational
symmetry around the axis. Each cell stores mass, momentum, energy and composition.
Small time steps move these quantities between cells and apply forces and heat.
The present benchmark puts the same argon mass in both species slots: it tests
flow and heating, not lithium isotope separation. Its advances are not deployed
automatically into the browser.

## What is assumed, and what is checked?

Inputs such as current and field strength specify the experiment. A **closure**
supplies unresolved physics, such as an assumed collision rate or conductivity.
Changing an input slider recomputes outputs within the selected model; it does
not make prescribed ionization or conductivity self-consistent. Electron, gas
and wall temperatures describe different populations and must not be interchanged.

**Verification** asks whether the code solves its chosen equations: do inventories
balance, does energy go somewhere accounted for, and do smaller cells/time steps
give the same answer? **Validation** asks whether those equations and inputs
reproduce measurements. Passing verification cannot answer validation.

The argon experiment supplies a measured rotation profile, which tests the
rigid-rotation assumption. Our [live-model assessment](LIVE-MODEL-QUALIFICATION.md)
finds that assumption incompatible with the profile under the stated optical
measurement model. The more detailed [V101 study](../SPATIAL-FLOW-V101.md) still
has unresolved spatial errors and experimental disagreement. Its very hot local
regions also expose assumptions that need reassessment. An optical diagnostic
is the rule mapping simulated flow to the Doppler signal an instrument measures.

The [playground](https://fieldwork-plasma-lab.fieldwork-plasma-lab.workers.dev)
is useful for conditional cause-and-effect exploration. Experimentally accurate
rotation, isotope enrichment, product throughput and a complete fusion fuel cycle
are separate claims requiring separate evidence. The next work is to establish
consistent energy/transport assumptions, resolve spatial errors and validate a
matched operating condition before adopting a richer interactive model.

For more equations, see [How it works](https://fieldwork-plasma-lab.fieldwork-plasma-lab.workers.dev/how-it-works.html)
and the original [plasma mass separation tutorial](https://w3.pppl.gov/~fisch/fischpapers/2018/Zweben_PMF_POP18.pdf).
