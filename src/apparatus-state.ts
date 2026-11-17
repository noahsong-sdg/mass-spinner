export type TargetCell = {
 depthM: number; temperatureK: number; tritiumFraction: number; deuteriumFraction: number; vacancyFraction: number;
};
export type TargetSceneSnapshot = {
 timeS: number; filmThicknessM: number; cells: TargetCell[];
 neutronRateS: number | null; heatW: number | null; beamAreaM2: number | null; beamEnergyKeV: number | null;
 beamOn: boolean; scope: string;
};
function isRecord(value: unknown): value is Record<string, unknown> { return value!==null&&typeof value==='object'; }
function finite(value: unknown): value is number { return typeof value==='number'&&Number.isFinite(value); }
function finiteArray(value: unknown): value is number[] { return Array.isArray(value)&&value.every(finite); }

/** Accepted finite-volume samples only. No spatial interpolation or CAD scale is inferred. */
export function targetSceneState(value: unknown): TargetSceneSnapshot | null {
 if(!isRecord(value)||!isRecord(value.result)||!isRecord(value.state)||!isRecord(value.result.config))return null;
 const {state,source}=value,c=value.result.config;
 if(!finiteArray(state.depthM))return null;
 const n=state.depthM.length;
 if(n<1||n!==c.depthCells||!finite(c.filmThicknessM)||!(c.filmThicknessM>0))return null;
 const {depthM,tritiumFraction,deuteriumFraction,vacancyFraction,temperatureK}=state,filmThicknessM=c.filmThicknessM;
 if(!finiteArray(tritiumFraction)||!finiteArray(deuteriumFraction)||!finiteArray(vacancyFraction)||!finiteArray(temperatureK)||
  [tritiumFraction,deuteriumFraction,vacancyFraction,temperatureK].some(values=>values.length<n))return null;
 if(!finite(state.timeS)||state.timeS<0||temperatureK.some(x=>x<=0))return null;
 if(depthM.some((x,i)=>x<=0||x>=filmThicknessM||(i>0&&x<=depthM[i-1])))return null;
 for(let i=0;i<n;i++)if([tritiumFraction[i],deuteriumFraction[i],vacancyFraction[i]].some(x=>x<0||x>1+1e-12)||
  Math.abs(tritiumFraction[i]+deuteriumFraction[i]+vacancyFraction[i]-1)>1e-10)return null;
 const beam=isRecord(source)?source:null;
 return {timeS:state.timeS,filmThicknessM,cells:depthM.map((depthM,i)=>({
  depthM,temperatureK:temperatureK[i],tritiumFraction:tritiumFraction[i],deuteriumFraction:deuteriumFraction[i],vacancyFraction:vacancyFraction[i]})),
  neutronRateS:finite(state.neutronRateS)?state.neutronRateS:null,heatW:finite(state.assemblyHeatW)?state.assemblyHeatW:null,
  beamAreaM2:beam&&finite(beam.beamAreaM2)&&beam.beamAreaM2>0?beam.beamAreaM2:null,
  beamEnergyKeV:beam&&finite(beam.beamEnergyKeV)?beam.beamEnergyKeV:null,
  beamOn:!!state.beamOn,scope:'Accepted 1D cell averages; uniform illuminated area. Depth expanded; apparatus not to scale.'};
}
export const TARGET_FIELDS=[['temperatureK','Temperature','K'],['tritiumFraction','Tritium','fraction'],['deuteriumFraction','Deuterium','fraction'],['vacancyFraction','Vacancies','fraction']] as const;
export type TargetField = typeof TARGET_FIELDS[number][0];
export function targetFieldDomain(state: TargetSceneSnapshot,field: string): [number, number] {
 const entry=TARGET_FIELDS.find(([key])=>key===field);
 if(!entry)throw new RangeError('Unknown target field.');
 const values=state.cells.map(cell=>cell[entry[0]]);
 return field==='temperatureK'?[Math.min(...values),Math.max(...values)]:[0,1];
}
