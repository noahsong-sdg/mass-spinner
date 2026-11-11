/** Research JSON-lines adapter: reuse the actual current and sourced properties. */
import {createInterface} from 'node:readline';
import {createFuelCurrentSolver, type FuelCurrentSetup} from '../../src/fuel-current.js';
import {fuelArgonNeutralTransport} from '../../src/fuel-neutral-transport.js';
import {tungstenThermalProperties} from '../../src/fuel-thermal.js';
let current: ReturnType<typeof createFuelCurrentSolver> | undefined;
for await (const line of createInterface({input: process.stdin})) {
 try {
  const c=JSON.parse(line); let result: unknown;
  if(c.command==='setup') {current=createFuelCurrentSolver(c.setup as FuelCurrentSetup,c.relativeTolerance);result={ready:true};}
  else if(c.command==='current') {if(!current)throw new Error('Current setup required');result=current(c.omega);}
  else if(c.command==='props') {
   const gas=c.gas.map((t:number)=>fuelArgonNeutralTransport(t));
   const solid=c.solid.map((t:number)=>tungstenThermalProperties(t));
   result={mu:gas.map((p:ReturnType<typeof fuelArgonNeutralTransport>)=>p.viscosityPaS),
    k:gas.map((p:ReturnType<typeof fuelArgonNeutralTransport>)=>p.conductivityWmK),
    solidK:solid.map((p:ReturnType<typeof tungstenThermalProperties>)=>p.conductivityWMK),
    solidCp:solid.map((p:ReturnType<typeof tungstenThermalProperties>)=>p.heatCapacityJKgK),
    solidH:solid.map((p:ReturnType<typeof tungstenThermalProperties>)=>p.specificEnthalpyJKg)};
  } else throw new Error('Unknown bridge command');
  process.stdout.write(JSON.stringify({result})+'\n');
 } catch(error) {process.stdout.write(JSON.stringify({error:String(error)})+'\n');}
}
