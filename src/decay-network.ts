export interface DecayNode {
 id:string; decayRateS:number; products?:{to:string;fraction:number}[];
}
export interface DecayNetwork {
 nodes:DecayNode[];
 reactions?:{from:string;to:string|null;rateS:number}[];
 productionAtomsS?:number[];
}
const nonnegative=(x:number)=>Number.isFinite(x)&&x>=0;
const identity=(n:number)=>Array.from({length:n},(_,i)=>Array.from({length:n},(_,j)=>Number(i===j)));
function multiply(a:number[][],b:number[][]){
 const n=a.length,c=Array.from({length:n},()=>Array(n).fill(0) as number[]);
 for(let i=0;i<n;i++)for(let k=0;k<n;k++)for(let j=0;j<n;j++)c[i][j]+=a[i][k]*b[k][j];
 return c;
}

/** Piecewise-constant Bateman network, including reaction depletion and constant production.
 * Nonnegative uniformization exponential with scaling/squaring; no population clipping.
 * Inputs are generic scenario rates, not evaluated isotope or clinical data.
 */
export function evolveDecayNetwork(network:DecayNetwork,initial:number[],durationS:number,irradiating:boolean){
 const nodes=network.nodes,n=nodes?.length;
 if(!n||n>16||initial.length!==n||!initial.every(nonnegative)||!nonnegative(durationS))
  throw new Error('Expected 1–16 nodes, finite nonnegative populations and duration in seconds.');
 const ids=new Map(nodes.map((node,i)=>[node.id,i]));
 if(ids.size!==n||nodes.some(node=>!node.id||!nonnegative(node.decayRateS)))throw new Error('Invalid or duplicate decay node.');
 const source=network.productionAtomsS??Array(n).fill(0);
 if(source.length!==n||!source.every(nonnegative))throw new Error('Production requires nonnegative atoms/s per node.');
 const initialTotal=initial.reduce((sum,x)=>sum+x,0),sourceTotal=source.reduce((sum,x)=>sum+x,0);
 if(!Number.isFinite(initialTotal)||!Number.isFinite(sourceTotal))throw new Error('Aggregate inventory or production exceeds the finite numerical domain.');
 // Explicit lost-inventory sink and constant reservoir retain affine production without cancellation.
 const size=n+2,sink=n,reservoir=n+1,a=Array.from({length:size},()=>Array(size).fill(0) as number[]);
 for(let i=0;i<n;i++){
  let branches=0;
  for(const product of nodes[i].products??[]){
   const j=ids.get(product.to);
   if(j===undefined||j===i||!nonnegative(product.fraction))throw new Error('Invalid daughter or decay branching fraction.');
   branches+=product.fraction;a[j][i]+=nodes[i].decayRateS*product.fraction;
  }
  if(branches>1)throw new Error('Decay branches must sum to at most one.');
  a[i][i]-=nodes[i].decayRateS;a[sink][i]+=nodes[i].decayRateS*(1-branches);
 }
 for(const edge of network.reactions??[]){
  const i=ids.get(edge.from),j=edge.to===null?sink:ids.get(edge.to);
  if(i===undefined||j===undefined||i===j||!nonnegative(edge.rateS))throw new Error('Invalid irradiation transition.');
  if(irradiating){a[i][i]-=edge.rateS;a[j][i]+=edge.rateS;}
 }
 const injected=irradiating?sourceTotal*durationS:0;
 const scale=Math.max(1,initialTotal,injected);
 if(!Number.isFinite(scale))throw new Error('Inventory exceeds the finite numerical domain.');
 if(irradiating)for(let i=0;i<n;i++)a[i][reservoir]=source[i]/scale;
 const q=Math.max(...a.map((row,i)=>-row[i]),irradiating?sourceTotal/scale:0);
 const opticalTime=q*durationS;
 if(!Number.isFinite(opticalTime)||opticalTime>1e6)throw new Error('Rate × time exceeds the bounded 10⁶ numerical domain; split the interval or use a stiff depletion backend.');
 let exponential=identity(size);
 if(opticalTime>0){
  const squarings=Math.max(0,Math.ceil(Math.log2(opticalTime))),u=opticalTime/2**squarings;
  const p=identity(size).map((row,i)=>row.map((v,j)=>v+a[i][j]/q));
  let term=identity(size),weight=Math.exp(-u);
  exponential=term.map(row=>row.map(v=>v*weight));
  // u <= 1; the 32-term Poisson tail is < 2e-36 before squaring.
  for(let k=1;k<=32;k++){
   term=multiply(p,term);weight*=u/k;
   for(let i=0;i<size;i++)for(let j=0;j<size;j++)exponential[i][j]+=weight*term[i][j];
  }
  for(let k=0;k<squarings;k++)exponential=multiply(exponential,exponential);
 }
 const vector=[...initial,0,scale],values=exponential.map(row=>row.reduce((sum,v,j)=>sum+v*vector[j],0));
 const populations=values.slice(0,n),lostAtoms=values[sink],activitiesBq=populations.map((value,i)=>value*nodes[i].decayRateS);
 const balanceResidualAtoms=populations.reduce((s,x)=>s+x,0)+lostAtoms-initialTotal-injected;
 if(![...populations,lostAtoms,...activitiesBq].every(nonnegative)||!Number.isFinite(balanceResidualAtoms))throw new Error('Nonfinite or negative network result.');
 return {populations,activitiesBq,lostAtoms,
  injectedAtoms:injected,balanceResidualAtoms,
  durationS,irradiating};
}
