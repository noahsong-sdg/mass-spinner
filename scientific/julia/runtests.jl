using Test
include("orbit_reference.jl")
using .OrbitReference

@testset "Signed uniform B matches analytic gyro motion" begin
    for field in (0.06,-0.06,0.0), mass in (40.0,84.0)
        config=(;radius=.2,length=.6,magneticT=field,voltage=0.0,quadraticShape=0.0,massU=mass,chargeState=1)
        initial=[.02,.01,.3,1000.0,-800.0,200.0]
        times=collect(range(0,200e-6;length=201))
        run=OrbitReference.orbit(config,initial,times;tolerance=1e-13)
        for (t,state) in zip(times,run.states)
            exact=OrbitReference.exact_gyro(initial,config,t)
            @test maximum(abs.(state[1:3].-exact[1:3])) < 2e-11
            @test maximum(abs.(state[4:6].-exact[4:6])) < 2e-6
        end
    end
end

@testset "Quartic refinement and sampled invariants" begin
    for c in OrbitReference.reference_cases()
        @test last(c.runs).maxEnergyResidual < 1e-10
        @test last(c.runs).maxCanonicalMomentumResidual < 1e-10
        @test last(c.refinements).maxPositionDifferenceM < 1e-9
        @test last(c.refinements).maxVelocityDifferenceMS < 1e-4
        @test last(c.runs).maxRadiusM < c.config.radius - 0.01
        @test all(0.0 < point.state[3] < c.config.length for point in c.checkpoints)
    end
end
