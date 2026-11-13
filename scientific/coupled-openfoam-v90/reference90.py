"""Guest-only coupled neutral release; reuse native OpenFOAM, not new CFD."""
import hashlib
import json
import os
from pathlib import Path
import sys
import time

import numpy as np
from scipy.special import jn_zeros, jv

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
sys.path.insert(0, str(ROOT/'scientific/expert-v88/openfoam'))
from reference88 import command, dictionary, environment, field, read_field, read_torque
sys.path.insert(0, str(ROOT/'scientific/mixture-axial-v75'))
from flow import Flow
sys.path.insert(0, str(ROOT/'scientific/meridional-v86'))
from diffusion86 import Diffusion, KB, M_AR

R, H, RHO, MU, END = .06, .24, .001, 1.14e-4, 20e-6
RGAS = KB/M_AR
CV, CP, K = 1.5*RGAS, 2.5*RGAS, 15*RGAS*MU/4
CHI = float(jn_zeros(1, 1)[0])


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def geometry(n):
    return Flow(np.linspace(0, R, n+1), np.linspace(0, H, 2*n+1), [M_AR, M_AR])


def initial(radius, axial):
    temperature = 2900+100*jv(0, CHI*radius/R)*np.cos(np.pi*axial/H)
    swirl = 400*jv(1, CHI*radius/R)*np.cos(np.pi*axial/(2*H))
    return temperature, swirl


def make_case(case, n, steps, angle, work=True):
    if case.exists():
        raise FileExistsError(case)
    delta = np.deg2rad(angle)
    x, y = R*np.cos(delta), R*np.sin(delta)
    vertices = [(0,0,0),(x,-y,0),(x,y,0),(0,0,0),
                (0,0,H),(x,-y,H),(x,y,H),(0,0,H)]
    body = 'vertices ('+' '.join('('+' '.join(map(str,v))+')' for v in vertices)+');'
    body += f' blocks (hex (0 1 2 3 4 5 6 7) ({n} 1 {2*n}) simpleGrading (1 1 1));'
    body += (' boundary (walls {type wall; faces ((1 5 6 2)(4 5 6 7));}'
             ' midplane {type symmetryPlane; faces ((0 3 2 1));}'
             ' minus {type wedge; faces ((0 1 5 4));}'
             ' plus {type wedge; faces ((3 7 6 2));}'
             ' axis {type empty; faces ((0 4 7 3));});')
    dictionary(case/'system/blockMeshDict', body)
    funcs = 'torque {type forces; libs ("libforces.so"); patches (walls); rho rho; CofR (0 0 0);}'
    dictionary(case/'system/controlDict',
        f'application foamRun; solver fluid; startFrom startTime; startTime 0; stopAt endTime;'
        f' endTime {END:.17g}; deltaT {END/steps:.17g}; writeControl timeStep; writeInterval {steps//4};'
        ' writeFormat ascii; writePrecision 16; writeCompression off; timeFormat general;'
        ' timePrecision 16; runTimeModifiable false; adjustTimeStep no; functions {'+funcs+'}')
    dictionary(case/'system/fvSchemes',
        'ddtSchemes {default Euler;} gradSchemes {default Gauss linear;}'
        ' divSchemes {default none; div(phi,U) Gauss linear; div(phid,p) Gauss linear;'
        ' div(phi,e) Gauss linear; div(phi,K) Gauss linear; div(phi,h) Gauss linear;'
        ' div(phi,Ekp) Gauss linear; div(phi,(p|rho)) Gauss linear; div(U) Gauss linear;'
        ' div(((rho*nuEff)*dev2(T(grad(U))))) Gauss linear;}'
        ' laplacianSchemes {default Gauss linear corrected;}'
        ' interpolationSchemes {default linear;} snGradSchemes {default corrected;}')
    dictionary(case/'system/fvSolution',
        'solvers {p {solver PCG; preconditioner DIC; tolerance 1e-12; relTol 0;} pFinal {$p;}'
        ' "(rho|U|e|h)" {solver smoothSolver; smoother symGaussSeidel; tolerance 1e-12; relTol 0;}'
        ' "(rho|U|e|h)Final" {solver smoothSolver; smoother symGaussSeidel; tolerance 1e-12; relTol 0;}}'
        ' PIMPLE {momentumPredictor yes; nOuterCorrectors 3; nCorrectors 2; nNonOrthogonalCorrectors 1;}')
    dictionary(case/'constant/physicalProperties',
        'thermoType {type hePsiThermo; mixture pureMixture; transport const; thermo hConst;'
        ' equationOfState perfectGas; specie specie; energy sensibleInternalEnergy;}'
        f' mixture {{specie {{molWeight 39.948;}} thermodynamics {{Cp {CP:.17g}; hf 0;}}'
        f' transport {{mu {MU:.17g}; Pr {CP*MU/K:.17g};}}}}')
    dictionary(case/'constant/momentumTransport', 'simulationType laminar;')
    dictionary(case/'constant/fvModels', 'stressWork {type viscousHeating; libs ("libfvModels.so");}' if work else '')
    common = 'midplane {type symmetryPlane;} minus {type wedge;} plus {type wedge;} axis {type empty;}'
    count = 2*n*n
    for name, values, dim, kind, wall in (
        ('T',np.full(count,2900.),'0 0 0 1 0 0 0','volScalarField','zeroGradient;'),
        ('p',np.full(count,RHO*RGAS*2900),'1 -1 -2 0 0 0 0','volScalarField','zeroGradient;'),
        ('rho',np.full(count,RHO),'1 -3 0 0 0 0 0','volScalarField','zeroGradient;'),
        ('U',np.zeros((count,3)),'0 1 -1 0 0 0 0','volVectorField','fixedValue; value uniform (0 0 0);')):
        field(case/('0/'+name), values, dim, 'walls {type '+wall+'} '+common, kind)
    env = environment()
    calls = [command(case,['blockMesh','-case',str(case)],env,'mesh'),
             command(case,['checkMesh','-case',str(case)],env,'check-mesh')]
    for fun in ('writeCellCentres','writeCellVolumes'):
        calls.append(command(case,['foamPostProcess','-case',str(case),'-func',fun,'-time','0'],env,fun))
    c = read_field(case/'0/C',count,3)
    radius = np.hypot(c[:,0],c[:,1])
    temperature, speed = initial(radius,c[:,2])
    field(case/'0/T',temperature,'0 0 0 1 0 0 0','walls {type zeroGradient;} '+common,'volScalarField')
    field(case/'0/p',RHO*RGAS*temperature,'1 -1 -2 0 0 0 0','walls {type zeroGradient;} '+common,'volScalarField')
    velocity = np.column_stack((-speed*c[:,1]/radius,speed*c[:,0]/radius,np.zeros(count)))
    field(case/'0/U',velocity,'0 1 -1 0 0 0 0','walls {type fixedValue; value uniform (0 0 0);} '+common,'volVectorField')
    return calls


def native_packet(case,n,steps,angle):
    flow = geometry(n)
    c = read_field(case/'0/C',flow.count,3)
    radius = np.hypot(c[:,0],c[:,1])
    index = np.floor(c[:,2]/(H/(2*n))).astype(int)*n+np.floor(radius/(R/n)).astype(int)
    if sorted(index.tolist()) != list(range(flow.count)):
        raise ValueError('Native cell-to-tensor mapping is not bijective')
    order = np.argsort(index)
    volume = read_field(case/'0/Vc',flow.count)*np.pi/np.deg2rad(angle)
    states, histories = [], []
    native_rgas = []
    for step in (0,steps//4,steps//2,steps):
        t = END*step/steps
        directories = [p for p in case.iterdir() if p.is_dir() and p.name[0].isdigit()
                       and abs(float(p.name)-t) <= 1e-12*END]
        if len(directories)!=1:
            raise ValueError('Missing or ambiguous native reporting time')
        d = directories[0]
        rho, temp, pressure = [read_field(d/name,flow.count) for name in ('rho','T','p')]
        u = read_field(d/'U',flow.count,3)
        ur = (u[:,0]*c[:,0]+u[:,1]*c[:,1])/radius
        ut = (-u[:,0]*c[:,1]+u[:,1]*c[:,0])/radius
        mass = rho*volume
        q = np.array([mass,mass*ur,mass*u[:,2],mass*radius*ut,
                      mass*(CV*temp+.5*np.sum(u*u,axis=1)),.5*mass])[:,order].reshape(6,2*n,n)
        if not np.all(np.isfinite(q)) or min(rho.min(),temp.min())<=0:
            raise ValueError('Nonfinite or nonpositive native state')
        states.append(q)
        histories.append(dict(timeS=t,massKg=float(mass.sum()),energyJ=float(q[4].sum()),
                              angularKgM2S=float(q[3].sum()),maxTemperatureK=float(temp.max()),
                              peakMeridionalMPS=float(np.max(np.hypot(ur,u[:,2])))))
        if step:
            native_rgas.extend((pressure/(rho*temp)).tolist())
    times = np.arange(steps+1)*END/steps
    forces = list((case/'postProcessing/torque').rglob('forces.dat'))
    if len(forces)!=1:
        raise ValueError('Expected one native wall force history')
    impulse = read_torque(forces[0],times)[1:].sum()*END/steps*np.pi/np.deg2rad(angle)
    return np.array(states), dict(history=histories,wallImpulseKgM2S=float(impulse),
        nativeGasConstantRange=[float(min(native_rgas)),float(max(native_rgas))],
        nativeVolumeM3=float(volume.sum()),cellMapBijective=True)


def own_packet(n,steps):
    flow = geometry(n)
    r,z = np.meshgrid(flow.mean_r,(flow.z[:-1]+flow.z[1:])/2)
    temp,speed = initial(r,z)
    q = flow.state(RHO,temp,.5,speed/r)
    diffusion = Diffusion(flow,MU,conductivity=K)
    states = [q.copy()]
    histories = []
    for step in range(steps+1):
        p = flow.primitive(q)
        if step in (0,steps//4,steps//2,steps):
            histories.append(dict(timeS=END*step/steps,massKg=float(q[0].sum()),
                energyJ=float(q[4].sum()),angularKgM2S=float(q[3].sum()),
                maxTemperatureK=float(p['temperatureK'].max()),
                peakMeridionalMPS=float(np.max(np.hypot(p['vrMPS'],p['vzMPS'])))))
            if step:
                states.append(q.copy())
        if step==steps:
            break
        q = flow.advance(q,END/steps)
        q, _ = diffusion.advance(q,END/steps)
    return np.array(states),dict(history=histories)


def main():
    if sys.platform!='linux' or os.getuid()!=1000:
        raise RuntimeError('Execute only inside safe-dev')
    mode,outname = sys.argv[1:]
    out = HERE/outname
    out.mkdir(exist_ok=False)
    sources = [HERE/p for p in ('reference90.py','score90.py','test_reference90.py','PROTOCOL.md','REFINEMENT.md')]
    sources += [ROOT/'scientific'/p for p in ('mixture-axial-v75/flow.py','meridional-v86/diffusion86.py','expert-v88/openfoam/reference88.py')]
    seals = {str(p.relative_to(ROOT)):sha(p) for p in sources}
    jobs = {'pilot':[(8,512,.5,True)],
            'full':[(n,512,.5,True) for n in (8,16,32)]+[(16,s,.5,True) for s in (256,1024)]+[(16,512,.25,True),(16,512,.5,False)],
            'extension':[(64,s,.5,True) for s in (256,512,1024)]}[mode]
    result = dict(sourceSHA256=seals,cases=[],experimentalQualification=False)
    prefix = Path(environment()['WM_PROJECT_DIR'])
    native_files = ['applications/modules/fluid/thermophysicalPredictor.C',
              'applications/modules/isothermalFluid/momentumPredictor.C',
              'src/fvModels/general/viscousHeating/viscousHeating.C']
    native_files += ['platforms/linuxArm64GccDPInt32Opt/'+p for p in
               ('bin/foamRun','bin/blockMesh','bin/checkMesh','bin/foamPostProcess',
                'lib/libfluidSolver.so','lib/libfvModels.so')]
    result['nativeSHA256'] = {p:sha(prefix/p) for p in native_files}
    result['runtime'] = dict(python=sys.version,numpy=np.__version__,
                             scipy=__import__('scipy').__version__,skfem=__import__('skfem').__version__)
    for n,steps,angle,work in jobs:
        label = f'n{n}-s{steps}-a{angle}-work{int(work)}'
        row = dict(label=label,n=n,steps=steps,halfAngleDeg=angle,stressWork=work)
        print('START',label,flush=True)
        started = time.monotonic()
        try:
            case = out/label
            row['commands'] = make_case(case,n,steps,angle,work)
            row['inputSHA256'] = {str(p.relative_to(case)):sha(p) for p in case.rglob('*') if p.is_file()}
            row['commands'].append(command(case,['foamRun','-case',str(case)],environment(),'solver'))
            native, row['native'] = native_packet(case,n,steps,angle)
            own, row['v86'] = own_packet(n,steps)
            packet = out/(label+'.npz')
            np.savez_compressed(packet,native=native,v86=own)
            row.update(completed=True,packet=packet.name,packetSHA256=sha(packet))
        except Exception as error:
            row.update(completed=False,error=type(error).__name__+': '+str(error))
        row['wallSeconds'] = time.monotonic()-started
        result['cases'].append(row)
        (out/'predictions.json').write_text(json.dumps(result,indent=2,allow_nan=False)+'\n')
        print('END',label,row.get('error','complete'),row['wallSeconds'],flush=True)
        if not row['completed']:
            return 1
    if seals!={str(p.relative_to(ROOT)):sha(p) for p in sources}:
        raise RuntimeError('Source changed during execution')
    if result['nativeSHA256']!={p:sha(prefix/p) for p in native_files}:
        raise RuntimeError('Native implementation changed during execution')
    return 0


if __name__=='__main__':
    raise SystemExit(main())
