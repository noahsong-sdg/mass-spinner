/** Fixed-volume, overdamped radial monatomic gas. Mobility is prescribed;
 * this is not a Maxwell–Stefan or radial momentum/acoustic solver. */
const K=1.380649e-23;
export type FuelGasOptions={conductivityWMK:number};
export type FuelGasGeometry={number:number;radiusM:number;lengthM:number;lightFraction:number};
export type FuelGasState={cellEnergyJ:number[];temperatureK:number[];pressurePa:number[];radiusM:number[];
 meanK:number;minK:number;maxK:number;energyJ:number;speciesEnergyJ:number[][]};
const sum=(values:readonly number[])=>values.reduce((total,value)=>total+value,0);
function positive(value:number,name:string){
 if(!Number.isFinite(value)||value<=0)throw new RangeError(`${name} must be finite and positive.`);
}
function inventory(mass:readonly number[]){
 if(mass.length<2||mass.length>1024||mass.some(value=>!Number.isFinite(value)||value<0)||Math.abs(sum(mass)-1)>2e-8)
  throw new RangeError('Gas transport needs 2–1024 positive, normalized cell inventories.');
}
/** Entropy-compatible enthalpy temperature: the reciprocal logarithmic mean
 * of reciprocal temperatures. It satisfies T* Δ(1/T)=−Δln(T). */
export function fuelGasFaceTemperature(leftK:number,rightK:number){
 positive(leftK,'Left gas temperature');positive(rightK,'Right gas temperature');
 if(leftK===rightK)return leftK;
 const low=Math.min(leftK,rightK),high=Math.max(leftK,rightK),d=(high-low)/high;
 return low*(d<.5?-Math.log1p(-d):Math.log(high)-Math.log(low))/d;
}
/** Reconstruct canonical temperature and partial energy from cell U and N.
 * Each species mass array is a probability distribution, not a kg inventory. */
export function fuelGasState(lightMass:readonly number[],heavyMass:readonly number[],cellEnergyJ:readonly number[],geometry:FuelGasGeometry):FuelGasState{
 inventory(lightMass);inventory(heavyMass);
 const n=lightMass.length,{number,radiusM,lengthM,lightFraction:x}=geometry;
 positive(number,'Gas particle number');positive(radiusM,'Gas radius');positive(lengthM,'Gas length');
 if(!Number.isFinite(x)||x<0||x>1||heavyMass.length!==n||cellEnergyJ.length!==n)
  throw new RangeError('Gas energy, species and geometry must share a physical radial grid.');
 const volume=Math.PI*radiusM**2*lengthM/n,temperatureK:number[]=[],pressurePa:number[]=[],speciesEnergyJ=[[] as number[],[] as number[]];
 for(let i=0;i<n;i++){
  const nl=number*x*lightMass[i],nh=number*(1-x)*heavyMass[i],count=nl+nh,u=cellEnergyJ[i];
  positive(count,'Cell particle number');positive(u,'Cell gas energy');
  const t=u/(1.5*K*count);positive(t,'Cell gas temperature');
  temperatureK.push(t);pressurePa.push(count*K*t/volume);
  speciesEnergyJ[0].push(u*nl/count);speciesEnergyJ[1].push(u*nh/count);
 }
 const energyJ=sum(cellEnergyJ),meanK=energyJ/(1.5*K*number);
 return {cellEnergyJ:[...cellEnergyJ],temperatureK,pressurePa,speciesEnergyJ,energyJ,meanK,
  radiusM:Array.from({length:n},(_,i)=>radiusM*Math.sqrt((i+.5)/n)),minK:Math.min(...temperatureK),maxK:Math.max(...temperatureK)};
}
function bernoulli(z:number){
 if(z<1e-5)return 1-z/2+z*z/12-z**4/720;
 return z>50?z*Math.exp(-z)/(-Math.expm1(-z)):z/Math.expm1(z);
}
/** Positive backward-Euler SG flux for J=−D/T [∇(nT)−n mΩ²r/kB].
 * Equal-volume y=r²/R² cells; face ζ uses trapezoidal reciprocal T.
 * Signed face transfers are probabilities moving outward over this step.
 * Their cumulative reconstruction enforces the exact discrete continuity
 * relation without subtracting two large near-equilibrium rate products. */
export function advanceFuelGasMass(mass:readonly number[],temperatureK:readonly number[],speciesMassKg:number,omega:number|readonly number[],radiusM:number,diffusivityM2S:number,dtS:number){
 inventory(mass);positive(speciesMassKg,'Species mass');positive(radiusM,'Gas radius');
 if(temperatureK.length!==mass.length)throw new RangeError('Gas temperatures must share the species grid.');
 temperatureK.forEach(t=>positive(t,'Gas temperature'));
 const rotation=typeof omega==='number'?Array<number>(mass.length).fill(omega):omega;
 if(rotation.length!==mass.length||rotation.some(v=>!Number.isFinite(v))||!Number.isFinite(diffusivityM2S)||diffusivityM2S<0||!Number.isFinite(dtS)||dtS<0)
  throw new RangeError('Gas rotation must be finite; diffusivity and timestep nonnegative.');
 const n=mass.length;
 if(dtS===0||diffusivityM2S===0)return {mass:[...mass],faceTransfers:Array<number>(n-1).fill(0)};
 const outward:number[]=[],inward:number[]=[];
 for(let i=0;i<n-1;i++){
  // Matches symmetric centrifugal-work deposition in the spatial momentum ledger.
  const coefficient=speciesMassKg*radiusM**2/(2*K*n)*(.5*rotation[i]**2+.5*rotation[i+1]**2);
  const inverseT=.5/temperatureK[i]+.5/temperatureK[i+1],z=coefficient*inverseT,b=bernoulli(z);
  const scale=dtS*4*diffusivityM2S/radiusM**2*(i+1)*n*inverseT;
  outward.push(scale*temperatureK[i]*(b+z));inward.push(scale*temperatureK[i+1]*b);
 }
 const diagonal:number[]=[],rhs:number[]=[];let retained=1;
 for(let i=0;i<n;i++){
  const remainder=1+(i?inward[i-1]*retained:0),pivot=remainder+(i<n-1?outward[i]:0);
  if(!Number.isFinite(pivot)||pivot<=0)throw new RangeError('Gas transport exceeds the finite stiffness domain.');
  diagonal.push(pivot);rhs.push(mass[i]+(i?outward[i-1]*rhs[i-1]/diagonal[i-1]:0));retained=remainder/pivot;
 }
 const next=Array<number>(n);next[n-1]=rhs[n-1]/diagonal[n-1];
 for(let i=n-2;i>=0;i--)next[i]=(rhs[i]+inward[i]*next[i+1])/diagonal[i];
 if(next.some(value=>!Number.isFinite(value)||value<0)||Math.abs(sum(next)-sum(mass))>2e-10)
  throw new RangeError('Gas transport failed positivity or particle conservation.');
 let transferred=0;
 const faceTransfers=Array.from({length:n-1},(_,i)=>transferred+=mass[i]-next[i]);
 return {mass:next,faceTransfers};
}
