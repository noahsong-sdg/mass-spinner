/** Axisymmetric charge continuity with prescribed diagonal magnetized conductivity.
 * Jr=σP(-∂rφ+B rΩ), Jz=−σparallel ∂zφ. No discharge/ionization closure.
 * Cell order is j*nr+i. Null electrode faces insulate TOTAL current.
 */
export type FuelCurrentInput={radialEdgesM:readonly number[];axialEdgesM:readonly number[];
 sigmaPerpSM:readonly number[];sigmaParallelSM:readonly number[];omegaRadS:readonly number[];magneticT:number;
 innerVoltageV:readonly (number|null)[];outerVoltageV:readonly (number|null)[];
 lowerVoltageV:readonly (number|null)[];upperVoltageV:readonly (number|null)[]};
export type FuelCurrentSetup=Omit<FuelCurrentInput,'omegaRadS'>;
type Link={a:number;b:number|null;voltage:number;resistance:number;parts:{cell:number;resistance:number;torquePerAmp:number}[]};
const sum=(a:readonly number[])=>a.reduce((s,v)=>s+v,0),dot=(a:readonly number[],b:readonly number[])=>sum(a.map((v,i)=>v*b[i]));
function edges(e:readonly number[],radial:boolean){
 if(e.length<3||e.some((v,i)=>!Number.isFinite(v)||(i>0&&v<=e[i-1]))||(radial&&e[0]<0))throw new RangeError('Need at least two ordered finite cells per coordinate.');
}

/** Own a copied, fixed conductance problem; only rotation varies between solves. */
export function createFuelCurrentSolver(input:FuelCurrentSetup,relativeTolerance=1e-11){
 // Research callers may tighten the global residual to resolve weak local
 // torques. Retain the established default and never weaken its acceptance.
 if(!Number.isFinite(relativeTolerance)||relativeTolerance<4*Number.EPSILON||relativeTolerance>1e-11)
  throw new RangeError('Current relative tolerance must be between 4 epsilon and 1e-11.');
 const c=structuredClone(input);
 edges(c.radialEdgesM,true);edges(c.axialEdgesM,false);
 const nr=c.radialEdgesM.length-1,nz=c.axialEdgesM.length-1,n=nr*nz,r=c.radialEdgesM,z=c.axialEdgesM;
 if(!Number.isFinite(c.magneticT)||[c.sigmaPerpSM,c.sigmaParallelSM].some(a=>a.length!==n||a.some(v=>!Number.isFinite(v)||v<=0)))throw new RangeError('Current needs positive cell conductivities and finite common-grid rotation/field.');
 const walls=[c.innerVoltageV,c.outerVoltageV,c.lowerVoltageV,c.upperVoltageV];
 if(walls.some((a,i)=>a.length!==(i<2?nz:nr)||a.some(v=>v!==null&&!Number.isFinite(v)))||!walls.some(a=>a.some(v=>v!==null)))throw new RangeError('Need finite electrode voltages or insulating null faces, and an electrode reference.');
 if(r[0]===0&&c.innerVoltageV.some(v=>v!==null))throw new RangeError('The axis cannot be an electrode surface.');
 const voltageReferenceV=walls.flat().find((v):v is number=>v!==null)!;
 // Collocate Ω at the r² midpoint used by gas inertia. Both half-cell
 // torque weights are then B Δ(r²)/4, including the regular-axis cell.
 // The same weights define motional EMF, preserving power adjointness.
 const rc=Array.from({length:nr},(_,i)=>Math.sqrt((r[i]**2+r[i+1]**2)/2)),zc=Array.from({length:nz},(_,j)=>(z[j]+z[j+1])/2),links:Link[]=[];
 const radialPart=(cell:number,a:number,b:number,j:number)=>({cell,
  resistance:Math.log(b/a)/(2*Math.PI*(z[j+1]-z[j])*c.sigmaPerpSM[cell]),
  torquePerAmp:-c.magneticT*(b-a)*(b+a)/2});
 const append=(a:number,b:number|null,voltage:number,parts:Link['parts'])=>{
  const resistance=sum(parts.map(p=>p.resistance));
  if(!Number.isFinite(resistance)||resistance<=0)throw new RangeError('Current geometry exceeds the finite resistance domain.');
  links.push({a,b,voltage:b===null?voltage-voltageReferenceV:0,resistance,parts});
 };
 for(let j=0;j<nz;j++)for(let i=0;i<nr;i++){
  const a=j*nr+i,area=Math.PI*(r[i+1]-r[i])*(r[i+1]+r[i]);
  if(i<nr-1)append(a,a+1,0,[radialPart(a,rc[i],r[i+1],j),radialPart(a+1,r[i+1],rc[i+1],j)]);
  if(j<nz-1)append(a,a+nr,0,[{cell:a,resistance:(z[j+1]-zc[j])/(area*c.sigmaParallelSM[a]),torquePerAmp:0},
   {cell:a+nr,resistance:(zc[j+1]-z[j+1])/(area*c.sigmaParallelSM[a+nr]),torquePerAmp:0}]);
  if(i===0&&c.innerVoltageV[j]!==null){const p=radialPart(a,r[0],rc[0],j);p.torquePerAmp*=-1;append(a,null,c.innerVoltageV[j]!,[p]);}
  if(i===nr-1&&c.outerVoltageV[j]!==null)append(a,null,c.outerVoltageV[j]!,[radialPart(a,rc[i],r[nr],j)]);
  if(j===0&&c.lowerVoltageV[i]!==null)append(a,null,c.lowerVoltageV[i]!,[{cell:a,resistance:(zc[0]-z[0])/(area*c.sigmaParallelSM[a]),torquePerAmp:0}]);
  if(j===nz-1&&c.upperVoltageV[i]!==null)append(a,null,c.upperVoltageV[i]!,[{cell:a,resistance:(z[nz]-zc[j])/(area*c.sigmaParallelSM[a]),torquePerAmp:0}]);
 }
 const diagonal=Array<number>(n).fill(0),radialLower=Array<number>(n).fill(0),axialLower=Array<number>(n).fill(0);
 for(const e of links){const g=1/e.resistance;diagonal[e.a]+=g;
  if(e.b!==null){diagonal[e.b]+=g;(e.b-e.a===1?radialLower:axialLower)[e.b]=-g;}}
 // IC(0) of the five-point SPD conductance matrix. Its graph has no triangles,
 // so off-diagonal entries have no common earlier neighbour in this ordering.
 const pivots=Array<number>(n);
 for(let i=0;i<n;i++){
  if(radialLower[i]!==0)radialLower[i]/=pivots[i-1];
  if(axialLower[i]!==0)axialLower[i]/=pivots[i-nr];
  const value=diagonal[i]-radialLower[i]**2-axialLower[i]**2;
  if(!Number.isFinite(value)||value<=0)throw new RangeError('Current IC(0) factorization failed.');
  pivots[i]=Math.sqrt(value);
 }
 const precondition=(rhs:readonly number[])=>{
  const out=Array<number>(n);
  for(let i=0;i<n;i++)out[i]=(rhs[i]-(radialLower[i]!==0?radialLower[i]*out[i-1]:0)-(axialLower[i]!==0?axialLower[i]*out[i-nr]:0))/pivots[i];
  for(let i=n-1;i>=0;i--)out[i]=(out[i]-(i+1<n?radialLower[i+1]*out[i+1]:0)-(i+nr<n?axialLower[i+nr]*out[i+nr]:0))/pivots[i];
  return out;
 };
 const apply=(v:readonly number[])=>{const out=Array<number>(n).fill(0);
  for(const e of links){const t=(v[e.a]-(e.b===null?0:v[e.b]))/e.resistance;out[e.a]+=t;if(e.b!==null)out[e.b]-=t;}return out;};
 let previousPotential:number[]|undefined;
 return (omegaRadS:readonly number[])=>{
 if(omegaRadS.length!==n||omegaRadS.some(v=>!Number.isFinite(v)))throw new RangeError('Current needs finite common-grid rotation.');
 const rhs=Array<number>(n).fill(0),emfs=links.map(e=>-sum(e.parts.map(p=>p.torquePerAmp*omegaRadS[p.cell])));
 for(let i=0;i<links.length;i++){const e=links[i],g=1/e.resistance;
  if(!Number.isFinite(emfs[i]))throw new RangeError('Current geometry exceeds the finite resistance domain.');
  rhs[e.a]-=g*emfs[i];if(e.b===null)rhs[e.a]+=g*e.voltage;else rhs[e.b]+=g*emfs[i];}
 // Reuse IC(0), retaining the original true residual and physical face ledgers.
 const scale=Math.hypot(...rhs),tolerance=relativeTolerance*scale;
 // A previous solution is only an initial guess; reconstruct its residual
 // against the new RHS. Zero forcing has the exact grounded zero solution.
 const priorResidual=previousPotential?apply(previousPotential).map((v,i)=>rhs[i]-v):undefined;
 const usePrior=priorResidual!==undefined&&Math.hypot(...priorResidual)<scale;
 const potentialV=usePrior?[...previousPotential!]:Array<number>(n).fill(0);
 let residual=usePrior?priorResidual!:[...rhs],pre=precondition(residual),direction=[...pre],rz=dot(residual,pre),iterations=0;
 for(;Math.hypot(...residual)>tolerance&&iterations<Math.max(100,8*n);iterations++){
  const ap=apply(direction),denominator=dot(direction,ap);
  if(!Number.isFinite(denominator)||denominator<=0)throw new RangeError('Current SPD solve failed.');
  const alpha=rz/denominator;
  for(let i=0;i<n;i++){potentialV[i]+=alpha*direction[i];residual[i]-=alpha*ap[i];}
  pre=precondition(residual);const next=dot(residual,pre),beta=next/rz;rz=next;
  direction=pre.map((v,i)=>v+beta*direction[i]);
 }
 const trueResidual=apply(potentialV).map((v,i)=>v-rhs[i]);
 if(potentialV.some(v=>!Number.isFinite(v))||Math.hypot(...trueResidual)>20*relativeTolerance*scale)throw new RangeError('Current solve did not converge; refine or improve the electrical conditioning.');
 const torqueNm=Array<number>(n).fill(0),jouleByCellW=Array<number>(n).fill(0),cellCurrentResidualA=Array<number>(n).fill(0),boundaryCurrentsA:number[]=[];
 let electrodePowerW=0,mechanicalW=0,jouleW=0;
 for(let i=0;i<links.length;i++){const e=links[i],current=(potentialV[e.a]-(e.b===null?e.voltage:potentialV[e.b])+emfs[i])/e.resistance;
  cellCurrentResidualA[e.a]+=current;if(e.b!==null)cellCurrentResidualA[e.b]-=current;
  else{boundaryCurrentsA.push(current);electrodePowerW-=e.voltage*current;}
  for(const p of e.parts){const heat=current*current*p.resistance,torque=current*p.torquePerAmp;
   jouleByCellW[p.cell]+=heat;torqueNm[p.cell]+=torque;jouleW+=heat;mechanicalW+=torque*omegaRadS[p.cell];}
 }
 const energyResidualW=electrodePowerW-jouleW-mechanicalW;
 if([electrodePowerW,mechanicalW,jouleW,energyResidualW,...torqueNm,...jouleByCellW].some(v=>!Number.isFinite(v)))throw new RangeError('Electrical power exceeds the finite domain.');
 previousPotential=[...potentialV];
 return {potentialV:potentialV.map(v=>v+voltageReferenceV),relativePotentialV:potentialV,voltageReferenceV,
  torqueNm,jouleByCellW,jouleW,mechanicalW,electrodePowerW,energyResidualW,cellCurrentResidualA,
  maxCellCurrentResidualA:Math.max(...cellCurrentResidualA.map(Math.abs)),netBoundaryCurrentA:sum(boundaryCurrentsA),boundaryCurrentsA,iterations};
 };
}

export function solveFuelCurrent(c:FuelCurrentInput){
 return createFuelCurrentSolver(c)(c.omegaRadS);
}
