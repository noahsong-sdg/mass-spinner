/** Nested equal-volume (q=r²) cells. Restriction and integrated-source
 * prolongation are adjoints: sum(τ_g Ω_g) = sum(τ_e Ω_e).
 * This defines a piecewise-constant electrical Ω, not a fine-field solve.
 */
export function createFuelRadialProjection(gasCells:number,electricalCells:number){
 const ratio=gasCells/electricalCells;
 if(!Number.isInteger(gasCells)||!Number.isInteger(electricalCells)||electricalCells<2||
  !Number.isInteger(ratio)||ratio<1)throw new RangeError('Radial coupling needs nested equal-volume gas and electrical cells.');
 const check=(values:readonly number[],length:number)=>{
  if(values.length!==length||values.some(v=>!Number.isFinite(v)))throw new RangeError('Radial projection needs finite cell values on its declared grid.');
 };
 return {
  restrictOmega(omega:readonly number[]){
   check(omega,gasCells);if(ratio===1)return [...omega];
   return Array.from({length:electricalCells},(_,j)=>{
    let average=0;for(let i=j*ratio;i<(j+1)*ratio;i++)average+=omega[i]/ratio;
    return average;
   });
  },
  prolongIntegrated(source:readonly number[]){
   check(source,electricalCells);if(ratio===1)return [...source];
   return Array.from({length:gasCells},(_,i)=>source[Math.floor(i/ratio)]/ratio);
  }
 };
}
