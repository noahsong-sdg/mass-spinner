"""Admit original, independently gated bulk observables; retain failed rates."""
import json
from pathlib import Path
import re
import adapter as a

BULK=('meanEnergyEV','mobilityM2VS','diffusionM2S')

def make_admission(root):
    path=root/'results/transport-table.json'; table=json.loads(path.read_text())
    receipt=root/'results/receipt.json'
    if a.digest(receipt)!=table['receiptSHA256']: raise ValueError('Stale receipt')
    original=json.loads(receipt.read_text())
    if any(table[k]!=original[k] for k in ('upstreamCommit','dataSHA256')):
        raise ValueError('Stale table provenance')
    rows=[]
    for row in table['rows']:
        matches=[r for r in original['cases'] if r['label']==row['label']]
        if len(matches)!=1 or row!=matches[0] or row['cells']!=4000:
            raise ValueError('Stale source-table row')
        accepted=[]
        for key in BULK:
            gates=[g for g in table['refinements'] if g['td']==row['reducedFieldTd'] and g['tg']==row['gasTemperatureK'] and g['key']==key]
            cases=sorted([r for r in original['cases'] if r['reducedFieldTd']==row['reducedFieldTd'] and r['gasTemperatureK']==row['gasTemperatureK']],key=lambda r:r['cells'])
            if [r['cells'] for r in cases]!=[1000,2000,4000]: raise ValueError('Incomplete original refinement')
            x,y,z=[r[key] for r in cases]; coarse=abs(y-x); fine=abs(z-y)
            relative=fine/max(abs(y),abs(z)) if y or z else 0
            passed=relative<.02 and (fine<coarse or fine==coarse==0)
            if len(gates)!=1 or gates[0]['relative']!=relative or gates[0]['passGate']!=passed:
                raise ValueError('Stale original refinement gate')
            if passed and all(r['completed'] and all(r['checks'].values()) for r in cases): accepted.append(key)
        folder=root/'output'/row['label']; power=next(folder.rglob('powerBalance.txt'))
        if a.digest(power)!=row['nativeHashes'][str(power.relative_to(folder))]:
            raise ValueError('Stale native power output')
        prefix=power.read_text().split('---',1)[0]
        # First block is the global balance; later gas/aggregate blocks duplicate terms.
        coefficients={name.strip():float(value) for name,value in re.findall(r'^\s*(.*?)\s*=\s*([+\-\deE.]+)\s+\(eVm3/s\)',prefix,re.M)}
        rows.append({**row,'qualifiedObservables':accepted,'powerDiagnosticsEVM3S':coefficients,
            'powerDiagnosticsJM3S':{k:v*1.602176634e-19 for k,v in coefficients.items()}})
    return dict(schema='loki-bulk-admission-v1',upstreamCommit=table['upstreamCommit'],
        dataSHA256=table['dataSHA256'],sourceTableSHA256=a.digest(path),receiptSHA256=a.digest(receipt),
        domain=table['domain'],pressurePa=133.32,experimentalQualification=False,
        qualification='Original mesh gates only; bulk observables explicitly listed per row. Ionization and power terms are research diagnostics.',rows=rows)

def lookup(path,expected,td,tg,observable,magnetic_field_t=0):
    if a.digest(path)!=expected: raise ValueError('Stale admitted table')
    data=json.loads(Path(path).read_text())
    if data.get('schema')!='loki-bulk-admission-v1' or data['domain']['magneticFieldT']!=0 or magnetic_field_t!=0:
        raise ValueError('Outside unmagnetized table domain')
    rows=[r for r in data['rows'] if r['reducedFieldTd']==td and r['gasTemperatureK']==tg]
    if len(rows)!=1: raise ValueError('Outside executed electron-table grid')
    if observable not in rows[0]['qualifiedObservables']: raise ValueError('Unqualified observable')
    return rows[0][observable]

if __name__=='__main__':
    target=a.ROOT/'results/bulk-admission-v2.json'
    if target.exists(): raise ValueError('Admission already exists')
    target.write_text(json.dumps(make_admission(a.ROOT),indent=2,allow_nan=False)+'\n')
