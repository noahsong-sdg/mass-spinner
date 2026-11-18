using JSON, SHA, Dates, Pkg
include("orbit_reference.jl")
using .OrbitReference

output = isempty(ARGS) ? "orbit-reference.json" : first(ARGS)
cases = OrbitReference.reference_cases()
sources = ["Project.toml","Manifest.toml","orbit_reference.jl","run_reference.jl","runtests.jl","install_julia.py"]
packages = Dict(string(p.name)=>string(p.version) for p in values(Pkg.dependencies()) if p.version !== nothing)
artifact = (; schemaVersion=1, createdUTC=string(now(UTC)), solver="SciML OrdinaryDiffEqVerner.Vern9",
    juliaVersion=string(VERSION), architecture=string(Sys.ARCH), packages,
    constants=(; elementaryChargeC=OrbitReference.ELEMENTARY_CHARGE, atomicMassUnitKG=OrbitReference.ATOMIC_MASS_UNIT),
    sourceHashes=Dict(f=>bytes2hex(sha256(read(joinpath(@__DIR__,f)))) for f in sources), cases,
    separatorTransportValidated=false, collisionsValidated=false,
    limitations=["Prescribed time-independent quartic potential and uniform axial B only.",
        "Interior collisionless orbit checkpoint comparison; no boundary events, plasma response, collision physics or device calibration.",
        "Tight tolerance and invariant agreement are numerical diagnostics, not rigorous global error bounds."])
open(output,"w") do io
    JSON.json(io,artifact; pretty=true)
end
println("Wrote ",output," with ",length(cases)," cases")
for c in cases
    println(c.name,": ",last(c.runs),"; final refinement ",last(c.refinements))
end
