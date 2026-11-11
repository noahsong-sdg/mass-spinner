"""Attributed transport inputs for screening; no automatic data substitution.

Li: Bouledroua2006, https://www.jspf.or.jp/JPFRS/PDF/Vol7/jpfr2006_07-217.pdf
He: Hurly/Moldover2000 TablesA1-A3, https://nvlpubs.nist.gov/nistpubs/jres/105/5/j55hur.pdf
H: actual Cantera3.1 gri30.yaml atomic H transport, isotope-scaled sensitivity.
Neither an isotope proxy nor interpolation is experimental certification.
"""
from functools import lru_cache
import math
import cantera as ct

HELIUM = {
    0.: [(300,19.919,155.863),(500,28.344,221.707),(1000,46.378,362.590),(2000,77.286,603.905)],
    1.: [(300,17.296,179.621),(500,24.606,255.451),(1000,40.259,417.739),(2000,67.087,695.745)],
    .5: [(300,18.667,166.649),(500,26.562,237.099),(1000,43.465,387.918),(2000,72.436,646.403)]}


@lru_cache(maxsize=1)
def hydrogen_isotopes():
    atom = next(s for s in ct.Species.list_from_file('gri30.yaml') if s.name == 'H')
    species = ''
    for name, mass in (('D',2.014101778),('T',3.016049282)):
        species += f'''
- name: {name}
  composition: {{{name}: 1}}
  thermo: {{model: constant-cp, T-min: 200, T-max: 3500, T0: 298.15, h0: 0, s0: 0, cp0: {2.5*ct.gas_constant}}}
  transport:
    model: gas
    geometry: atom
    diameter: {atom.transport.diameter/1e-10}
    well-depth: {atom.transport.well_depth/ct.boltzmann}
'''
    yaml = f'''
elements:
- {{symbol: D, atomic-weight: 2.014101778, atomic-number: 1}}
- {{symbol: T, atomic-weight: 3.016049282, atomic-number: 1}}
phases:
- name: atomic-isotopes
  thermo: ideal-gas
  elements: [D, T]
  species: [D, T]
  transport: mixture-averaged
  state: {{T: 500, P: 10, X: {{D: 0.5, T: 0.5}}}}
species:
{species}
'''
    return ct.Solution(yaml=yaml)


@lru_cache(maxsize=8192)
def properties(pair, temperature, fraction):
    if pair == 'lithium' and 100 <= temperature <= 3000:
        return {'muPaS':3.14e-8*temperature**.863,'kWMK':1.398e-4*temperature**.863,
                'source':'Bouledroua2006 dilute monatomic Li fit,100–3000K',
                'quality':'theoretical isotope-mixture proxy; isotope composition and uncertainty not resolved'}
    if pair == 'helium' and fraction in HELIUM and 300 <= temperature <= 2000:
        rows = HELIUM[fraction]
        for row in rows:
            if temperature == row[0]:
                return {'muPaS':row[1]*1e-6,'kWMK':row[2]*1e-3,
                        'source':'NIST Hurly/Moldover2000 A1–A3 exact table point',
                        'quality':'published dilute pure/equimolar helium theory'}
        lower, upper = next((a,b) for a,b in zip(rows,rows[1:]) if a[0] < temperature < b[0])
        weight = math.log(temperature/lower[0])/math.log(upper[0]/lower[0])
        values = [math.exp(math.log(lower[j])*(1-weight)+math.log(upper[j])*weight) for j in (1,2)]
        return {'muPaS':values[0]*1e-6,'kWMK':values[1]*1e-3,
                'source':'NIST Hurly/Moldover2000 A1–A3 sparse log interpolation',
                'quality':'approximate interpolation; error not quantified; published derivative interpolation not implemented'}
    if pair == 'dt' and 200 <= temperature <= 3500:
        gas = hydrogen_isotopes()
        gas.TPX = temperature,10.,{'D':fraction,'T':1-fraction}
        return {'muPaS':gas.viscosity,'kWMK':gas.thermal_conductivity,
                'source':'Cantera3.1.0 atomic-H gri30 transport, D/T masses',
                'quality':'Lennard-Jones isotope proxy only; not validated neutral D/T data'}
    return None
