/** Convert the actual equilibrium controls to the worker's physical configuration.
 * @param {(id:string)=>string} value
 * @param {{massU:number,chargeState:number}[]} ions
 * @param {number} radius
 * @returns {import('./equilibrium-model.js').EquilibriumConfig}
 */
export function equilibriumConfig(value,ions,radius){
 const fraction=Number(value('axis-fraction'))/100;
 return {
  radius,rotationRadS:Number(value('rotation')),closure:value('centrifuge-closure'),
  compositionBoundary:value('composition-boundary'),bulkFractionA:fraction,
  magneticT:Number(value('gaussian-field')),densityWidthM:Number(value('gaussian-width')),
  magneticBoundary:value('magnetic-boundary'),
  axisDensityM3:10**Number(value('gaussian-density')),
  ionTemperatureEV:Number(value('ion-temperature')),electronTemperatureEV:Number(value('electron-temperature')),
  species:ions.map((s,i)=>({...s,axisFraction:i?1-fraction:fraction})),bins:Number(value('radial-resolution')),
 };
}
