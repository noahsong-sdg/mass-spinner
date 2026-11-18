module OrbitReference

using OrdinaryDiffEqVerner: Vern9
using SciMLBase: ODEProblem, solve, successful_retcode

const ELEMENTARY_CHARGE = 1.602176634e-19
const ATOMIC_MASS_UNIT = 1.66053906660e-27

"""Lorentz orbits in laboratory φ=V(s²−κs), s=(x²+y²)/a², and uniform Bz.

The adaptive ODE is dimensionless to give position/velocity comparable absolute
error control. No Boris map, centrifugal force, collisions or boundary projection
is used. Cases must remain interior; collection/event handling is out of scope.
"""
function orbit(config, initial, times; tolerance=1e-12)
    a = config.radius
    qm = config.chargeState * ELEMENTARY_CHARGE / (config.massU * ATOMIC_MASS_UNIT)
    frequency = max(abs(qm * config.magneticT), sqrt(qm * config.voltage / a^2), 1.0)
    time_scale = 1 / frequency
    velocity_scale = a / time_scale
    u0 = vcat(initial[1:3] ./ a, initial[4:6] ./ velocity_scale)
    function lorentz!(du, u, _, _t)
        x, y = u[1], u[2]
        # Physical E components evaluated at the dimensionless coordinates.
        coefficient = 2 * config.voltage / a * (config.quadraticShape - 2 * (x*x + y*y))
        electric_scale = qm * time_scale / velocity_scale
        gyro_scale = qm * config.magneticT * time_scale
        du[1] = u[4]; du[2] = u[5]; du[3] = u[6]
        du[4] = electric_scale * coefficient * x + gyro_scale * u[5]
        du[5] = electric_scale * coefficient * y - gyro_scale * u[4]
        du[6] = 0
    end
    problem = ODEProblem(lorentz!, u0, (0.0, last(times) / time_scale))
    solution = solve(problem, Vern9(); reltol=tolerance, abstol=tolerance,
        saveat=times ./ time_scale, save_everystep=false, maxiters=10^7)
    successful_retcode(solution) || error("ODE failed: $(solution.retcode)")
    states = [vcat(u[1:3] .* a, u[4:6] .* velocity_scale) for u in solution.u]
    return (; states, steps=solution.stats.naccept, rejected_steps=solution.stats.nreject,
        time_scale, velocity_scale, tolerance)
end

function invariants(state, config)
    x, y, _z, vx, vy, vz = state
    mass = config.massU * ATOMIC_MASS_UNIT
    charge = config.chargeState * ELEMENTARY_CHARGE
    r2 = x*x + y*y
    s = r2 / config.radius^2
    H = mass * (vx*vx + vy*vy + vz*vz) / 2 + charge * config.voltage * (s*s - config.quadraticShape*s)
    Ptheta = mass * (x*vy - y*vx) + charge * config.magneticT * r2 / 2
    return (; H, Ptheta)
end

"""Analytic signed gyro motion, for q/m fixed and E=0."""
function exact_gyro(initial, config, t)
    omega = config.chargeState * ELEMENTARY_CHARGE * config.magneticT / (config.massU * ATOMIC_MASS_UNIT)
    x, y, z, vx, vy, vz = initial
    if omega == 0
        return [x+vx*t, y+vy*t, z+vz*t, vx, vy, vz]
    end
    sine, cosine = sincos(omega*t)
    return [x+(vx*sine+vy*(1-cosine))/omega,
        y+(vy*sine-vx*(1-cosine))/omega, z+vz*t,
        vx*cosine+vy*sine, vy*cosine-vx*sine, vz]
end

function case_result(name, config, initial, times)
    runs = [orbit(config, initial, times; tolerance=t) for t in (1e-9, 1e-11, 1e-13)]
    best = last(runs)
    mass = config.massU * ATOMIC_MASS_UNIT
    charge = config.chargeState * ELEMENTARY_CHARGE
    energy_scale = mass * best.velocity_scale^2 / 2 + abs(charge * config.voltage)
    momentum_scale = mass * config.radius * best.velocity_scale + abs(charge * config.magneticT * config.radius^2 / 2)
    original = invariants(initial, config)
    measurements = map(eachindex(times)) do i
        state = best.states[i]
        inv = invariants(state, config)
        (; timeS=times[i], state, energyJ=inv.H, canonicalMomentumSI=inv.Ptheta)
    end
    defects = [begin
        invs = [invariants(state, config) for state in run.states]
        (; tolerance=run.tolerance, acceptedSteps=run.steps, rejectedSteps=run.rejected_steps,
            maxEnergyResidual=maximum(abs(v.H-original.H) for v in invs)/energy_scale,
            maxCanonicalMomentumResidual=maximum(abs(v.Ptheta-original.Ptheta) for v in invs)/momentum_scale,
            maxRadiusM=maximum(hypot(state[1],state[2]) for state in run.states))
    end for run in runs]
    refinements = [begin
        left, right = runs[i], runs[i+1]
        position_difference = maximum(maximum(abs.(u[1:3].-v[1:3])) for (u,v) in zip(left.states,right.states))
        velocity_difference = maximum(maximum(abs.(u[4:6].-v[4:6])) for (u,v) in zip(left.states,right.states))
        (; coarseTolerance=left.tolerance, fineTolerance=right.tolerance,
            maxPositionDifferenceM=position_difference, maxVelocityDifferenceMS=velocity_difference)
    end for i in 1:length(runs)-1]
    return (; name, config, initialState=initial, checkpoints=measurements, runs=defects,
        refinements, energyNormalizationJ=energy_scale, momentumNormalizationSI=momentum_scale,
        boundaryTreatment="None: continuous-time interior orbit; checkpoints must remain inside cylinder")
end

function reference_cases()
    times = collect(range(0, 200e-6; length=201))
    cases = []
    for mass in (40.0,84.0)
        config = (; radius=0.2, length=0.6, magneticT=0.06, voltage=20.0,
            quadraticShape=1.2, massU=mass, chargeState=1)
        radius = 0.04
        vtheta = -ELEMENTARY_CHARGE * config.magneticT * radius / (2 * mass * ATOMIC_MASS_UNIT)
        push!(cases,case_result("quartic-$(Int(mass))u-zero-canonical",config,[radius,0,0.3,0,vtheta,0],times))
        push!(cases,case_result("quartic-$(Int(mass))u-radial-perturbation",config,[radius,0,0.3,700,vtheta*0.8,0],times))
    end
    for field in (0.06,-0.06)
        config = (; radius=0.2,length=0.6,magneticT=field,voltage=0.0,
            quadraticShape=0.0,massU=40.0,chargeState=1)
        push!(cases,case_result("uniform-B-$(field)",config,[0.02,0.01,0.3,1000,-800,0],times))
    end
    return cases
end

end
