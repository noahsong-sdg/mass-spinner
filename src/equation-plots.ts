import {equilibriumPoint,type EquilibriumInput} from './fuel-equilibrium.js';
import {rotorResponse} from './fuel-centrifuge.js';

type Input={key:string;label:string;min:number;max:number;step:number;value:number};
export type EquationPlot={title:string;x:Input;y:string;labels:readonly string[];inputs:readonly Input[];note:string;values:(x:number,p:Record<string,number>)=>readonly(number|null)[]};
const input=(key:string,label:string,min:number,max:number,step:number,value:number):Input=>({key,label,min,max,step,value});
const radius=input('radius','Radius (cm)',0,12,.1,12),time=input('time','Time (s)',0,2,.01,1);
const temperature=input('temperature','Temperature (K)',250,1500,10,500);
const omega=input('omega','Angular speed (rad/s)',0,20000,100,12500);
const feed=input('feed','Light feed fraction',0,1,.0001,.0759);
const current=input('current','Current (A)',0,1,.01,.03),field=input('field','Magnetic field (T)',0,2,.01,.5);
const mass=6.0151228874*1.66053906892e-27,k=1.380649e-23,e=1.602176634e-19;
const equilibriumInputs=[temperature,omega,feed];
const perpendicularFraction=(angle:number)=>angle===180?0:Math.sin(angle*Math.PI/180);
function config(p:Record<string,number>):EquilibriumInput{return {massesU:[6.0151228874,7.0160034366],edgeSpeedMS:p.omega*.12,temperatureK:p.temperature,radiusM:.12,lengthM:.8,totalParticles:1e20,lightFraction:p.feed,cutFraction:.65};}
const point=(r:number,p:Record<string,number>)=>equilibriumPoint(config(p),r/12);
const density=(r:number,p:Record<string,number>)=>Math.exp(mass*p.omega**2*(r/100)**2/(2*k*p.temperature));
const neutral='Ideal neutral equilibrium. Rigid rotation and uniform temperature. Assumed vessel radius: 12 cm. Each species keeps its inventory.';
const pressureNote='Ideal ⁶Li gas at uniform temperature. Axis number density: 10²⁰ atoms/m³. Angular speed stays constant with radius.';
const torque=(i:number,b:number)=>i*b*(.12**2-.036**2)/2;
const rotorInputs=[input('torque','Drive torque (µN·m)',0,20,.1,10),input('coupling','Collision rate (s⁻¹)',0,10,.1,1),input('drag','Wall drag rate (s⁻¹)',0,5,.1,0)];
function rotor(t:number,p:Record<string,number>){return rotorResponse(1e-6,1e-6,p.coupling*1e-6,p.drag*1e-6,p.torque*1e-6,t);}
const rotorNote='Exact two-population solution from rest. Each inertia is 10⁻⁶ kg·m². Inertias stay constant. No radial transport or thermal evolution.';
const plot=(title:string,x:Input,y:string,labels:readonly string[],inputs:readonly Input[],note:string,values:EquationPlot['values']):EquationPlot=>({title,x,y,labels,inputs,note,values});

export const equationPlots={
 'plant-electricity':plot('Plant electricity balance',input('internal','Internal electric use (MW)',0,1000,10,150),'Power (MW)',['Gross electricity','Net electricity','Conversion heat rejection'],[input('thermal','Recoverable thermal power (MW)',0,2000,10,1000),input('efficiency','Conversion efficiency (%)',0,100,1,40)],'Conditional plant account, not a Marathon prediction. Thermal power includes energy delivered to the converter. Internal use includes all plant electric loads. Conversion heat rejection is not total site heat rejection.',(internal,p)=>{const gross=p.thermal*p.efficiency/100;return [gross,gross-internal,p.thermal-gross];}),
 speed:plot('Tangential speed',radius,'Speed (m/s)',['Gas speed'],[omega],'Rigid rotation: angular speed stays constant. Speed increases with distance from the axis.',(r,p)=>[p.omega*r/100]),
 density:plot('Density relative to the axis',radius,'Density / own axis density',['⁶Li','⁷Li'],[temperature,omega],neutral+' These ratios are not isotope percentages.',(r,p)=>[6.0151228874,7.0160034366].map(m=>Math.exp(m*1.66053906892e-27*p.omega**2*(r/100)**2/(2*k*p.temperature)))),
 composition:plot('Local isotope composition',radius,'Local light fraction (%)',['⁶Li'],equilibriumInputs,neutral+' The heavy percentage is 100 minus the light percentage. The curve shows local composition, not an inventory fraction.',(r,p)=>[100*point(r,p).lightFraction]),
 'density-gradient':plot('Number density gradient',radius,'Outward density gradient (atoms/m⁴)',['dn/dr'],[temperature,omega],pressureNote+' Multiply this gradient by kT to obtain the pressure gradient.',(r,p)=>[1e20*density(r,p)*mass*p.omega**2*r/100/(k*p.temperature)]),
 pressure:plot('Pressure gradient for circular motion',radius,'Outward pressure gradient (Pa/m)',['dp/dr'],[temperature,omega],pressureNote+' The pressure gradient is positive outward. The pressure force, −dp/dr, points inward.',(r,p)=>[mass*1e20*density(r,p)*p.omega**2*r/100]),
 'gas-pressure':plot('Partial pressure',radius,'Pressure (Pa)',['⁶Li partial pressure'],[temperature,omega],pressureNote+' Pressure equals number density times kT.',(r,p)=>[1e20*density(r,p)*k*p.temperature]),
 'mass-density':plot('Mass density',radius,'Mass density (kg/m³)',['⁶Li mass density'],[temperature,omega],pressureNote+' Mass density equals atom mass times number density.',(r,p)=>[mass*1e20*density(r,p)]),
 'log-gradient':plot('Relative density gradient',radius,'d ln n / dr (m⁻¹)',['⁶Li'],[temperature,omega],pressureNote+' This gradient measures relative density change per metre.',(r,p)=>[mass*p.omega**2*r/100/(k*p.temperature)]),
 separation:plot('Equilibrium separation factor',input('temperature','Temperature (K)',250,1500,10,500),'Wall/axis heavy-to-light ratio factor',['α'],[omega],neutral+' α compares heavy/light ratios. It does not multiply purity.',(t,p)=>[Math.exp((7.0160034366-6.0151228874)*1.66053906892e-27*(p.omega*.12)**2/(2*k*t))]),
 'magnetic-force':plot('Magnetic force on one charge',input('angle','Angle between velocity and field (°)',0,180,1,90),'Signed magnetic force (fN)',['qvB sin θ'],[field,input('speed','Particle speed (km/s)',0,100,1,10),input('charge','Charge (e)',-1,1,1,1)],'The signed component is along the positive-charge v × B direction. Negative charge reverses it. Force is perpendicular to velocity.',(angle,p)=>[p.charge*e*p.speed*1000*p.field*perpendicularFraction(angle)*1e15]),
 'force-density':plot('Magnetic force per volume',input('angle','Angle between current and field (°)',0,180,1,90),'Signed force density (N/m³)',['J × B component'],[field,input('currentDensity','Current density (A/m²)',-100,100,1,10)],'The signed component is along the positive-current J × B direction. Radial current and axial field are perpendicular.',(angle,p)=>[p.currentDensity*p.field*perpendicularFraction(angle)]),
 momentum:plot('Angular momentum',input('omega','Angular speed (rad/s)',0,100,.5,50),'Angular momentum (10⁻⁶ kg·m²/s)',['L'],[input('inertia','Moment of inertia (10⁻⁶ kg·m²)',.1,10,.1,1)],'One rigidly rotating population. Moment of inertia stays constant along each curve.',(w,p)=>[p.inertia*w]),
 'momentum-time':plot('Torque changes angular momentum',time,'Angular momentum change (10⁻⁶ kg·m²/s)',['ΔL'],[input('drive','Input torque (µN·m)',0,20,.1,10),input('loss','Loss torque (µN·m)',0,20,.1,2)],'Both torques stay constant. The curve shows change from the initial angular momentum. A negative change means loss.',(t,p)=>[(p.drive-p.loss)*t]),
 'coupled-speeds':plot('Ion and neutral rotation',time,'Angular speed (rad/s)',['Ions','Neutral gas'],rotorInputs,rotorNote,(t,p)=>{const s=rotor(t,p);return [s.ion,s.neutral];}),
 'coupled-rates':plot('Angular momentum transfer rates',time,'Torque (µN·m)',['dLᵢ/dt','dLₙ/dt','Total'],rotorInputs,rotorNote+' Collision torques cancel in the total.',(t,p)=>{const s=rotor(t,p),transfer=p.coupling*(s.ion-s.neutral),wall=p.drag*s.neutral;return [p.torque-transfer,transfer-wall,p.torque-wall];}),
 torque:plot('Electromagnetic torque',current,'Torque (mN·m)',['Drive torque'],[field,input('inner','Inner drive radius (cm)',0,11,.1,3.6)],'Radial current crosses an annulus in a uniform axial field. Outer radius: 12 cm. Current and field signs set the torque direction.',(i,p)=>[i*p.field*(.12**2-(p.inner/100)**2)/2*1000]),
 power:plot('Mechanical and resistive power',current,'Power (W)',['Mechanical','Ohmic'],[field,omega,input('resistance','Electrical resistance (Ω)',0,10,.1,1)],'Assumed drive radii: 3.6 and 12 cm. Angular speed and resistance stay fixed. Source power supplies both terms.',(i,p)=>[torque(i,p.field)*p.omega,i*i*p.resistance]),
 slip:plot('Collision heating',input('difference','Ion − neutral angular speed (rad/s)',-100,100,1,30),'Slip heating (W)',['Γ(Ωᵢ − Ωₙ)²'],[input('friction','Collision coefficient (10⁻⁶ kg·m²/s)',0,10,.1,1)],'Collision heating depends on the squared speed difference. It is zero when both populations have the same angular speed.',(dw,p)=>[p.friction*1e-6*dw*dw]),
 energy:plot('Energy storage and removal',input('time','Time (s)',0,5,.01,2),'Energy change (J)',['Input','Removed','Stored change'],[input('mechanical','Mechanical power (W)',0,10,.1,3),input('ohmic','Ohmic power (W)',0,10,.1,1),input('cooling','Cooling power (W)',0,10,.1,2)],'Powers stay constant. Stored change is input minus removal. This balance does not calculate temperature or heat partition.',(t,p)=>[(p.mechanical+p.ohmic)*t,p.cooling*t,(p.mechanical+p.ohmic-p.cooling)*t]),
 diffusion:plot('Diffusion timescale',input('radius','Vessel radius (cm)',0,30,.1,12),'Characteristic time (s)',['R²/D'],[input('diffusivity','Diffusivity (m²/s)',.001,.1,.001,.02)],'R²/D is a scale estimate, not an exact separation time. Boundaries and rotation also affect transport.',(r,p)=>[(r/100)**2/p.diffusivity]),
 collection:plot('Inner-sample purity and recovery',radius,'Fraction (%)',['Light purity','Light recovery'],equilibriumInputs,neutral+' Keep all gas inside the selected radius. Empty-sample purity and absent-species recovery are undefined.',(r,p)=>{const s=point(r,p).inner;return [s.lightPurity===null?null:100*s.lightPurity,s.lightRecovery===null?null:100*s.lightRecovery];}),
 conduction:plot('Conduction and temperature gradient',input('gradient','Outward temperature gradient (K/m)',-10000,10000,100,-1000),'Outward heat flux (W/m²)',['−k ∂T/∂r'],[input('conductivity','Thermal conductivity (W/(m·K))',.01,1,.01,.1)],'Positive heat flux is outward. A negative temperature gradient gives outward heat flow. This local law does not solve a temperature profile.',(gradient,p)=>[-p.conductivity*gradient]),
 'pump-load':plot('Pump gas load',input('pump','Pump speed (m³/s)',0,.1,.001,.02),'Gas load (Pa·m³/s)',['Q'],[],'Prescribed wall pressure: 10 Pa. The rotating gas state stays fixed. This is not flow at fixed upstream pressure.',s=>[s*10]),
 'pump-pressure':plot('Required upstream pressure',input('pump','Pump speed (m³/s)',0,.1,.001,.02),'Upstream pressure (Pa)',['pᵤ'],[input('conductance','Inlet conductance (m³/s)',.001,.1,.001,.05)],'Axis pressure: 1 Pa. Wall pressure: 10 Pa. The rotating gas state stays fixed while pump speed changes.',(s,p)=>[1+s*10/p.conductance]),
 'pump-speed':plot('Effective inlet speed',input('pump','Pump speed (m³/s)',0,.1,.001,.02),'Effective speed (m³/s)',['S effective'],[input('conductance','Inlet conductance (m³/s)',.001,.1,.001,.05)],'Axis pressure: 1 Pa. Wall pressure: 10 Pa. At large pump speed, the effective speed approaches inlet conductance.',(s,p)=>[s*10/(1+s*10/p.conductance)]),
 'fuel-burn':plot('Tritium consumption',input('power','Fusion thermal power (MW)',0,2000,10,1000),'Consumed tritium atoms (10²⁰/s)',['Tritium flow'],[],'Each D–T reaction consumes one tritium atom and releases 17.6 MeV. Power is thermal fusion power, not electric output.',mw=>[mw*1e6/(17.6e6*e)/1e20]),
 inventory:plot('Unburned tritium in processing',input('burn','Single-pass burn fraction',.01,1,.01,.05),'Exhaust tritium inventory (g)',['Unburned exhaust'],[input('power','Fusion thermal power (MW)',0,2000,10,1000),input('delay','Processing time (s)',0,500,1,100)],'Constant flow and one processing time. This includes only unburned exhaust. It excludes other plant inventories, breeding and losses.',(f,p)=>[3.016049282*1.66053906892e-27*p.power*1e6/(17.6e6*e)*(1/f-1)*p.delay*1000]),
 beta:plot('Centrifugal exponent',input('speed','Wall speed (m/s)',0,2000,10,1500),'Exponent β',['⁶Li','⁷Li'],[temperature],'β compares rotational and thermal energy. This exponent does not give an isotope percentage.',(v,p)=>[6.0151228874,7.0160034366].map(m=>m*1.66053906892e-27*v*v/(2*k*p.temperature))),
 normalization:plot('Density normalization integral',input('beta','Exponent b',0,10,.1,2),'Z(b)',['Z'],[],'Integrate exp(by) over volume coordinate y from zero to one. At zero rotation, Z(0) = 1.',b=>[b===0?1:Math.expm1(b)/b]),
 'species-density':plot('Normalized species density',radius,'Number density (10²² atoms/m³)',['⁶Li','⁷Li'],equilibriumInputs,neutral+' Total inventory: 10²⁰ atoms. Length: 0.8 m. Cylindrical volume sets the density scale.',(r,p)=>point(r,p).densityM3.map(n=>n/1e22)),
 'species-cut':plot('Species inventory inside a radius',radius,'Species fraction inside (%)',['⁶Li','⁷Li'],[temperature,omega],neutral+' The integral includes the cylindrical volume factor r dr. At zero rotation, each enclosed fraction is (r/R)².',(r,p)=>point(r,{...p,feed:.0759}).inner.speciesFractions.map(x=>100*x)),
} satisfies Record<string,EquationPlot>;

export type EquationPlotId=keyof typeof equationPlots;
export const equationGroups={
 'plant-electricity':['plant-electricity'],
 'radial-balance':['pressure','density'],speed:['speed'],density:['density'],composition:['composition'],pressure:['pressure','density-gradient'],
 'gas-law':['gas-pressure','mass-density','log-gradient'],separation:['separation'],
 'magnetic-force':['magnetic-force'],'force-density':['force-density'],momentum:['momentum','momentum-time'],
 coupled:['coupled-speeds','coupled-rates'],torque:['torque'],power:['power'],slip:['slip'],energy:['energy'],
 diffusion:['diffusion'],collection:['collection'],conduction:['conduction'],pumping:['pump-load','pump-pressure','pump-speed'],
 fuel:['inventory','fuel-burn'],normalization:['beta','normalization'],'species-density':['species-density','composition'],'species-cut':['species-cut'],
} as const satisfies Record<string,readonly EquationPlotId[]>;
export type EquationGroupId=keyof typeof equationGroups;
export function sampleEquation(id:EquationPlotId,parameters:Record<string,number>,steps=120){
 const p:EquationPlot=equationPlots[id];
 return Array.from({length:steps+1},(_,i)=>{const x=p.x.min+(p.x.max-p.x.min)*i/steps;return {x,y:p.values(x,parameters)};});
}
