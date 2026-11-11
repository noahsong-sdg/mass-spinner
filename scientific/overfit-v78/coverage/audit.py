"""Read-only physical-coverage audit of frozen v75 study05, no PDE solves."""
import hashlib,json,math,sys
from pathlib import Path
import numpy as np
ROOT=Path("/work/home/mass-spinner-v77-full01")
BASE=Path("/work/home/mass-spinner-v76-study05.json")
sys.path.insert(0,str(ROOT/"scientific/mixture-axial-v75"))
from analyze import primitives
from diffusion import argon_diffusivity
digest=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
raw=json.loads(BASE.read_text())
assert digest(BASE)=="8e951889c880d477afc81d474a8fd327908ce57eba24ad4c4fe339ae7d5c687d"
assert all(digest(ROOT/p)==sha for p,sha in raw["sourceHashes"].items())
t=next(t for t in raw["cases"] if (t["nr"],t["nz"],t["nt"],t["mode"])==(48,48,256,"base"))
m=raw["manifest"]
a=primitives(t,dict(q=t["initialQ"],solidK=t["initialSolidK"]))
rows=[]
for e in t["cases"]:
 b=primitives(t,e)
 fields={k:dict(initialMin=float(a[k].min()),initialMax=float(a[k].max()),finalMin=float(b[k].min()),finalMax=float(b[k].max()),maxAbsoluteChange=float(np.max(abs(b[k]-a[k])))) for k in a}
 rows.append(dict(timeS=e["timeS"],fields=fields,observables=e["observables"]))
kb=1.380649e-23;u=1.66053906892e-27
rho=m["densityKgM3"];T=m["initialGasK"];R=m["radiusM"];L=m["lengthM"]
mass=1/(.5/(36*u)+.5/(40*u));p=rho*kb*T/mass
D=float(argon_diffusivity(T,p));ar=39.948*u
mu=5/16*math.sqrt(math.pi*ar*kb*T)/(math.pi*1e-20*(12.88+(T-300)/200*(11.12-12.88)))
k=15*kb*mu/(4*ar);cv=1.5*kb/mass;cs=math.sqrt(5/3*kb*T/mass)
scales=dict(pressurePa=p,diffusivityM2S=D,viscosityPaS=mu,conductivityWmK=k,soundSpeedMPS=cs,radialSoundS=R/cs,axialSoundS=L/cs,radialSpeciesDiffusionS=R*R/D,axialSpeciesDiffusionS=L*L/D,radialViscousS=R*R*rho/mu,axialViscousS=L*L*rho/mu,radialThermalS=R*R*rho*cv/k,rotationPeriodLowerBoundS=2*math.pi/900,magneticRadialDampingS=rho/(.03*.2*.2))
q=np.array(t["initialQ"]);thermal=1.5*kb*(q[5]/(36*u)+(q[0]-q[5])/(40*u))*a["gas"]
initial_thermal=float(thermal.sum())
duration=max(m["timesS"])
result=dict(scope="Read-only raw evidence and nominal dimensional scales; not a new solve or validation of omitted closures.",inputPath=str(BASE),inputSha256=digest(BASE),sourceRoot=str(ROOT),sourceHashes=raw["sourceHashes"],sourceHashesMatched=True,trajectoryKey=[48,48,256,"base"],physicalConditionCount=1,trajectoryCount=len(raw["cases"]),scales=scales,ratios={name:duration/value for name,value in scales.items() if name.endswith("S")},gasMassKg=float(q[0].sum()),gasInitialThermalJ=initial_thermal,integrals=t["integrals"],electrodeWorkOverInitialThermal=t["integrals"]["electrodeJ"]/initial_thermal,radialMotionalHeatOverInitialThermal=t["integrals"]["radialMotionalJouleJ"]/initial_thermal,hypotheticalUniform900RadSSeparationFactor=math.exp((40-36)*u*900**2*R**2/(2*kb*T)),rows=rows,scriptSha256=digest(Path(__file__)),notes=["All trajectory requests share the same physical manifest and continuum ICs; numerical resolutions and solver modes vary.","Nominal time scales use unperturbed rho,T and equimass composition, not measured relaxation times or rigorous modal bounds.","R^2/D and R^2/alpha omit geometric eigenvalue factors and are dimensional characteristic scales.","2pi/900 is the fastest-rotation lower period bound; the imposed differential profile rotates more slowly away from its maximum.","The hypothetical uniform-rotation isotope factor is not an equilibrium result of the actual differential-flow trajectory.","Primitive gas-temperature changes include compressional/acoustic work; do not label all deltaT Joule heating.","All physical and live qualifications remain false."])
output=Path(__file__).parent/"results.json"
assert not output.exists()
output.write_text(json.dumps(result,indent=2,allow_nan=False)+"\n")
print(json.dumps(dict(output=str(output),bytes=output.stat().st_size,sha256=digest(output),sourceHashesMatched=True,physicalConditionCount=1,trajectoryCount=len(raw["cases"]),scales=scales,workFraction=result["electrodeWorkOverInitialThermal"],finalMaxChanges={k:v["maxAbsoluteChange"] for k,v in rows[-1]["fields"].items()})))
