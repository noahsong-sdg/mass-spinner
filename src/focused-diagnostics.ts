import {centrifugeDiagnostics} from './centrifuge-diagnostics.js';
import {coldOrbitDiagnostics} from './rotating-diagnostics.js';
import type {CentrifugeResult} from './centrifuge.js';
import type {GaussianCentrifugeResult, GaussianProfile} from './gaussian-centrifuge.js';
import type {MagneticCentrifugeResult} from './magnetic-centrifuge.js';
import type {RunConfig, simulate} from './physics.js';
import type {PlotCurve} from './laboratory.js';
export type EquilibriumPresentationResult = ((CentrifugeResult & {model?: undefined}) | GaussianCentrifugeResult | MagneticCentrifugeResult) & {composition?: {boundary: 'central'} | {boundary: 'bulk'; targetFractionA: number; residual: number}};
const labels=['A','B'];
const number=(n: number | null)=>n===null?'—':Number(n.toPrecision(5)).toString();
const fraction=(n: number | null)=>n===null?'—':`${(100*n).toFixed(2)}%`;

export function equilibriumPresentation(result: EquilibriumPresentationResult,cut: number){
 const d=centrifugeDiagnostics(result,cut),r=result.profiles.map(p=>p.radius),curves: PlotCurve[]=[];
 result.species.forEach((s,i)=>{
  const series=(y: (number|null)[],yLabel: string)=>curves.push({label:labels[i],x:r,y,xLabel:'Radius (m)',yLabel});
  series(d.profiles.map(p=>p.numberFractions[i]),'Local ion number fraction');
  series(result.profiles.map(p=>Math.log10(p.ionDensities[i])),'log₁₀[nᵢ / total axis ion density]');
  series(result.profiles.map(p=>p.logSeparationFactors[i]),'ln local enrichment relative to reference species');
  series(d.profiles.map(p=>p.cumulativeSpeciesFractions[i]),'Fraction of species inventory inside radius');
 });
 const coupled=result.model==='coupled-magnetic-gaussian';
 curves.push({label:coupled?'ψ = φ − Ω ∫ B(r)r dr':'ψ = φ − ΩBr²/2',x:r,y:result.profiles.map(p=>p.effectivePotentialV),xLabel:'Radius (m)',yLabel:'Effective potential ψ (V)'});
 const gaussian=result.model==='prescribed-gaussian'||coupled;
 if(gaussian){
  for(const [field,label,unit]of [['laboratoryPotentialV','Laboratory φ','V'],['electricFieldVM','Radial E','V/m'],['currentDensityAM2','Required azimuthal current density','A/m²'],['magneticPerturbationT',coupled?'Self-consistent B − Baxis':'Estimated magnetic perturbation','T'],['electronInertiaRatio','Omitted electron-inertia force ratio','']] satisfies [keyof GaussianProfile,string,string][]){
   curves.push({label,x:r,y:result.gaussianProfiles.map(p=>p[field]),xLabel:'Radius (m)',yLabel:label+(unit?` (${unit})`:'')});
  }
  for(const [field,label]of [['ionVelocityMS','Ions'],['electronVelocityMS','Electrons']] satisfies [keyof GaussianProfile,string][])curves.push({label,x:r,y:result.gaussianProfiles.map(p=>p[field]),xLabel:'Radius (m)',yLabel:'Required azimuthal velocity (m/s)'});
  if(coupled)curves.push({label:'Solved Bz',x:r,y:result.gaussianProfiles.map(p=>p.magneticFieldT),xLabel:'Radius (m)',yLabel:'Axial magnetic field (T)'});
 }
 const mix=(values: (number|null)[])=>values.map((v,i)=>`${labels[i]} ${fraction(v)}`).join(' / ');
 return {diagnostics:d,curves,metrics:[
  `Central: ${mix(result.species.map(s=>s.axisFraction))}`,
  `Whole cylinder: ${mix(d.bulkNumberFractions)}`,
  `Inside ${number(d.cutRadius)} m: ${mix(d.inner.numberFractions)}`,
  `Outside cut: ${mix(d.outer.numberFractions)}`,
  `B inventory outside cut: ${fraction(d.outer.speciesInventoryFractions[1])}`,
  ...(result.composition?.boundary==='bulk'?[`Requested bulk A ${fraction(result.composition.targetFractionA)} · residual ${number(result.composition.residual)}`]:[]),
  ...(gaussian?[`${coupled?'Actual':'Estimated'} max |ΔB/B| ${number(result.maxRelativeMagneticPerturbation)}`,`Max omitted electron inertia ratio ${number(result.maxElectronInertiaRatio)}`,`Force-balance algebra residual ${number(result.maxRelativeForceBalanceResidual)}`]:[]),
  ...(coupled?[`${result.magneticBoundary} B boundary · axis ${number(result.axisMagneticT)} T · wall ${number(result.wallMagneticT)} T`,`Relative Ampère residual ${number(result.maxRelativeAmpereResidual)}`]:[]),
 ].join(' · '),notes:[
  'Inventory integrates 2πr nᵢ(r)dr in an axially uniform column. The radial cut divides a static equilibrium. It does not calculate extraction, feed conservation or recovery.',
  'Density is normalized to the total ion density on axis. ψ is the effective rotating-frame potential, not the laboratory electric potential.',
  coupled?'Gaussian density and rigid ion rotation remain inputs. B(r), current and potential satisfy radial force balance and Ampère’s law for the selected magnetic boundary. The model does not calculate electron inertia, the source circuit, sheaths, instability, axial losses or power. This is a bounded equilibrium, not a self-consistent discharge.':gaussian?'Gaussian total density and axial B are inputs. Radial force balance sets the required electron flow and current. The magnetic perturbation estimate does not change B. Examine the self-field and omitted-inertia ratios before use of this approximation. The model does not calculate density width, source, circuit, axial transport or power.':'This bounded common-corotation solution grows denser toward the wall. Actual vacuum-arc centrifuges have centrally peaked density. Models need additional current, rotation, source and axial-flow physics to reproduce that profile.',
  ...(result.composition?.boundary==='bulk'?['The inverse calculation gives the requested bulk species ratio at this radial resolution. The common-corotation benchmark does not fix absolute particle number. In the Gaussian model, total inventory follows the specified axis density and width.']:[]),
 ]};
}

export function rotatingPresentation(settings: RunConfig,result: ReturnType<typeof simulate>){
 const d=coldOrbitDiagnostics(settings),curves=d.species.map((s,i)=>({label:`${labels[i]} cold source-edge reference`,
  x:s.samples.map(p=>p.timeS*1e6),y:s.samples.map(p=>p.radiusM),xLabel:'Time (µs)',yLabel:'Cold reference radius (m)'}));
 const end=Math.max(...d.species.map(s=>s.samples.at(-1)!.timeS))*1e6;
 curves.push({label:'Absorbing wall',x:[0,end],y:[settings.radius,settings.radius],xLabel:'Time (µs)',yLabel:'Cold reference radius (m)'});
 result.species.forEach((s,i)=>s.paths.slice(0,3).forEach((path,j)=>curves.push({label:`${labels[i]} sampled ion ${j+1}`,
  x:path.positions.map(p=>p[2]),y:path.positions.map(p=>Math.hypot(p[0],p[1])),xLabel:'Axial z (m)',yLabel:'Simulated radial excursion (m)'})));
 return {diagnostics:d,curves,metrics:d.species.map((s,i)=>`${labels[i]}: ${s.stability} · signed ωslow ${number(s.slowRotationRadS)} rad/s · ωfast ${number(s.fastRotationRadS)} rad/s · growth ${number(s.growthRateS)} s⁻¹ · cold wall ${s.coldWallTimeS===null?'never':number(s.coldWallTimeS*1e6)+' µs'} · axial flight ${number(s.transitTimeS*1e6)} µs · reference ρ/a ${number(s.rhoOverA)}`).join(' | '),notes:[
  `Signed E×B drift frequency: ${number(d.exbRotationRadS)} rad/s. This is the weak-electric-field rotation limit, not the actual ion rotation near cutoff.`,
  'The analytic reference starts at the source edge with zero transverse velocity and fixed axial energy. It excludes RF, thermal spread and collisions. Samples stop at the first wall hit, axial exit or run duration.',
  'A bounded cold orbit can still hit the finite wall. A growing orbit can exit axially first. Neither stability nor the cutoff alone gives warm-source collector efficiency.',
  'Radial excursion curves show six sampled ion paths, not the full distribution. Neutral cross sections and fields remain inputs. Self-consistent plasma response and turbulence are not calculated.',
 ]};
}
