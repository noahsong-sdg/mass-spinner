/** Accepted finite-volume samples only. No spatial interpolation or CAD scale is inferred. */
export function targetSceneState(value:any){
 if(!value)return null;
 const {result,state,source}=value,n=state?.depthM?.length,c=result?.config;
 if(!c||!Number.isInteger(n)||n<1||n!==c.depthCells||!(c.filmThicknessM>0))return null;
 const names=['depthM','tritiumFraction','deuteriumFraction','vacancyFraction','temperatureK'];
 if(names.some(key=>!Array.isArray(state[key])||state[key].length<n||!state[key].every(Number.isFinite)))return null;
 if(!Number.isFinite(state.timeS)||state.timeS<0||state.temperatureK.some((x:number)=>x<=0))return null;
 if(state.depthM.some((x:number,i:number)=>x<=0||x>=c.filmThicknessM||(i>0&&x<=state.depthM[i-1])))return null;
 for(let i=0;i<n;i++)if(['tritiumFraction','deuteriumFraction','vacancyFraction'].some(k=>state[k][i]<0||state[k][i]>1+1e-12)||
  Math.abs(state.tritiumFraction[i]+state.deuteriumFraction[i]+state.vacancyFraction[i]-1)>1e-10)return null;
 const beam=source;
 return {timeS:state.timeS,filmThicknessM:c.filmThicknessM,cells:state.depthM.map((depthM:number,i:number)=>({
  depthM,temperatureK:state.temperatureK[i],tritiumFraction:state.tritiumFraction[i],deuteriumFraction:state.deuteriumFraction[i],vacancyFraction:state.vacancyFraction[i]})),
  neutronRateS:Number.isFinite(state.neutronRateS)?state.neutronRateS:null,heatW:Number.isFinite(state.assemblyHeatW)?state.assemblyHeatW:null,
  beamAreaM2:beam&&Number.isFinite(beam.beamAreaM2)&&beam.beamAreaM2>0?beam.beamAreaM2:null,
  beamEnergyKeV:beam&&Number.isFinite(beam.beamEnergyKeV)?beam.beamEnergyKeV:null,
  beamOn:!!state.beamOn,scope:'Accepted 1D cell averages; uniform illuminated area. Depth expanded; apparatus not to scale.'};
}
export const TARGET_FIELDS=[['temperatureK','Temperature','K'],['tritiumFraction','Tritium','fraction'],['deuteriumFraction','Deuterium','fraction'],['vacancyFraction','Vacancies','fraction']] as const;
export function targetFieldDomain(state:NonNullable<ReturnType<typeof targetSceneState>>,field:string){
 if(!TARGET_FIELDS.some(([key])=>key===field))throw new RangeError('Unknown target field.');
 const values=state.cells.map((cell:any)=>cell[field]);
 return field==='temperatureK'?[Math.min(...values),Math.max(...values)]:[0,1];
}
