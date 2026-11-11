"""Controlled transformations of the frozen v53 FiPy oracle, safe-dev only.

Diagnostic variants are not production fallbacks. All retain the original
nonlinear residual and temperature-change gates. One variable changes at a time.

Usage: diagnose.py OUTPUT_DIR FROZEN_V53_REFERENCE.py ORIGINAL_CASE_PACKET.json
The frozen source must have the exact rejected v53 digest below. The case
packet must contain the one original 12 mm / 0.5 m / five-step failed case.
The corrected live oracle is deliberately not a default input.
"""
from pathlib import Path
import argparse, hashlib, json

parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('output',type=Path)
parser.add_argument('frozen_reference',type=Path)
parser.add_argument('original_case_packet',type=Path)
args=parser.parse_args()
out=args.output; out.mkdir(exist_ok=False)
path=args.frozen_reference
source=path.read_text()
assert hashlib.sha256(source.encode()).hexdigest()=='26c444105a496254fc33f99d2852469ca0f218ebf6679e0c414c7e48f38322ba'
(out/'frozen-reference.py').write_text(source)
cases=json.loads(args.original_case_packet.read_text())['cases']
assert len(cases)==1
case=cases[0]
assert case['config']['thicknessM']==.012 and case['config']['lengthM']==.5 and case['config']['cells']==16
assert case['config']['gasWallWK']==1000 and len(case['steps'])==5
assert all(step['dtS']==1/512 for step in case['steps'])
(out/'original-cases.json').write_text(json.dumps({'cases':[case]},indent=2))

helper='''
def stable_change(a,b):
    return (a-b)/MOLAR_MASS_KG * (23.95930 + 2.639680e-3*(a+b)/2
      + 1.257750e-6*(a*a+a*b+b*b)/3
      - .254642e-9*(a*a*a+a*a*b+a*b*b+b*b*b)/4
      - .048407e6/(a*b))
'''
results=[]
for mode in ('baseline','stable-secant','stable-residual','increment','increment-stable'):
    text=source+helper
    # The __main__ entry does not run under exec with this module name.
    text=text.replace("    for step in case['steps']:","    for step_index, step in enumerate(case['steps']):")
    if mode in ('stable-secant','increment-stable'):
        text=text.replace("(enthalpy(v[1:][mask], material)-enthalpy(old[1:][mask], material))/dT[mask]",
                          "stable_change(v[1:][mask],old[1:][mask])/dT[mask]")
    if mode in ('stable-residual','increment-stable'):
        text=text.replace('residual = energy(solved)-Eold-deposited',
                          'residual = np.r_[c[\'gasCapacityJK\']*(solved[0]-old[0]), masses*stable_change(solved[1:],old[1:])]-deposited')
    increment=mode in ('increment','increment-stable')
    if increment:
        text=text.replace('    cv = CellVariable(mesh=mesh, value=1.)',
                          '    delta = CellVariable(mesh=mesh, value=0., hasOld=True)\n    cv = CellVariable(mesh=mesh, value=1.)')
        text=text.replace('- ImplicitSourceTerm(coeff=sink) + source + sink*c[\'coolantK\'])',
                          '- ImplicitSourceTerm(coeff=sink) + source)')
        text=text.replace('        T.updateOld()', '        T.updateOld()\n        delta.setValue(0.); delta.updateOld()')
        text=text.replace("            source.setValue(deposited/(dt*volumes))\n            eq.solve(var=T, dt=dt, solver=lu)",
'''            old_flux=G*(old[:-1]-old[1:])
            forcing=np.zeros(n+1); forcing[:-1]-=old_flux; forcing[1:]+=old_flux
            forcing[-1]+=outer*(c['coolantK']-old[-1])
            source.setValue((deposited/dt+forcing)/volumes)
            eq.cacheMatrix(); eq.cacheRHSvector()
            eq.solve(var=delta, dt=dt, solver=lu)
            T.setValue(old+np.asarray(delta.value))''')
    else:
        text=text.replace('            eq.solve(var=T, dt=dt, solver=lu)',
                          '            eq.cacheMatrix(); eq.cacheRHSvector()\n            eq.solve(var=T, dt=dt, solver=lu)')
    marker='            if relative_residual < 1e-11'
    probe='''            matrix=eq.matrix.matrix; unknown=np.asarray(delta.value if INCREMENT else T.value)
            rhs=np.asarray(eq.RHSvector); linear=matrix@unknown-rhs
            rows.append({'step':step_index,'iteration':iteration,'node':int(np.argmax(np.abs(residual)/(1+scale))),
              'residualJ':residual.tolist(),'relativeResidual':relative_residual,
              'deltaK':float(np.max(np.abs(solved-v))),'gasK':float(solved[0]),
              'wallMinK':float(min(solved[1:])),'wallMaxK':float(max(solved[1:])),
              'linearResidualJ':(dt*geometric*linear).tolist(),
              'linearComponentwiseBackwardError':float(np.max(np.abs(linear)/(abs(matrix)@abs(unknown)+abs(rhs)+1e-300)))})
'''.replace('INCREMENT',str(increment))
    assert marker in text
    text=text.replace(marker,probe+marker)
    namespace={'__name__':'diagnostic_reference','__file__':str(path),'rows':[]}
    exec(compile(text,str(out/f'{mode}.py'),'exec'),namespace)
    try:
        result=namespace['run_case'](case); result['passed']=True
    except RuntimeError as error:
        result={'passed':False,'error':str(error)}
    result.update({'mode':mode,'trace':namespace['rows']})
    (out/f'{mode}.json').write_text(json.dumps(result,indent=2))
    rows=namespace['rows']; summary={key:value for key,value in result.items() if key not in ('states','trace')}
    summary['first']=rows[:4];summary['last']=rows[-4:];results.append(summary)
(out/'summary.json').write_text(json.dumps({'sourceSHA256':hashlib.sha256(source.encode()).hexdigest(),
    'inputSHA256':hashlib.sha256(args.original_case_packet.read_bytes()).hexdigest(),
    'diagnosticSHA256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),'variants':results},indent=2))
for r in results:
    row=r['last'][-1]
    print(json.dumps({'mode':r['mode'],'passed':r['passed'],'row':row}))
