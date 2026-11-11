import type {Vec} from './physics.js';

/** Exact rectangle/circular-wall intersection area, including cut collision cells. */
export function circleRectangleArea(x0:number,x1:number,y0:number,y1:number,a:number){
 const primitive=(x:number,y:number)=>{
  const sign=Math.sign(x)*Math.sign(y);x=Math.min(Math.abs(x),a);y=Math.min(Math.abs(y),a);
  if(x*x+y*y<=a*a)return sign*x*y;
  const cut=Math.sqrt(Math.max(0,a*a-y*y));
  const integral=(u:number)=>(u*Math.sqrt(Math.max(0,a*a-u*u))+a*a*Math.asin(u/a))/2;
  return sign*(cut*y+integral(x)-integral(cut));
 };
 return Math.max(0,primitive(x1,y1)-primitive(x0,y1)-primitive(x1,y0)+primitive(x0,y0));
}

type Box={low:Vec;high:Vec};
export interface LocalityCell<T> {ions:T[];densityM3:number;volumeM3:number;bounds:Box;depth:number}
export interface LocalitySettings {radius:number;length:number;weight:number;target:number;maxDepth:number}

/** Geometric bisection with exact cylinder-cut volumes. Leaves form an
 * empirical histogram, not a nearest-neighbor collision-rate correction.
 * Partitioning uses positions only; conditional on each leaf, the existing
 * random mixed-pair generator remains unchanged. Data-dependent density bias
 * is NOT claimed absent: target occupancy and spatial scale must both converge.
 */
export function adaptiveCollisionCells<T extends {position:Vec}>(ions:T[],s:LocalitySettings):LocalityCell<T>[]{
 if(![s.radius,s.length,s.weight].every(Number.isFinite)||s.radius<=0||s.length<=0||s.weight<=0
  ||!Number.isInteger(s.target)||s.target<16||s.target>256||!Number.isInteger(s.maxDepth)||s.maxDepth<3||s.maxDepth>24)
  throw new Error('Adaptive collision cells require positive geometry/weight, target 16–256 and depth 3–24.');
 for(const p of ions)if(!p.position.every(Number.isFinite)||Math.hypot(p.position[0],p.position[1])>s.radius*(1+64*Number.EPSILON)
  ||p.position[2]<0||p.position[2]>s.length)throw new Error('Adaptive collision particles must lie inside the finite cylinder.');
 const cells:LocalityCell<T>[]=[],minimum=s.target/4;
 function visit(group:T[],box:Box,depth:number){
  if(!group.length)return;
  if(group.length>s.target&&depth<s.maxDepth){
   const axes=[0,1,2].sort((i,j)=>(box.high[j]-box.low[j])-(box.high[i]-box.low[i])||i-j);
   for(const axis of axes){
    const midpoint=(box.low[axis]+box.high[axis])/2;
    const left:T[]=[],right:T[]=[];
    for(const p of group)(p.position[axis]<midpoint?left:right).push(p);
    // Avoid forming singleton/subtarget leaves just to claim finer geometry.
    // A wholly empty half is a legitimate vacuum part of the partition.
    if((left.length&&left.length<minimum)||(right.length&&right.length<minimum))continue;
    const leftBox={low:[...box.low] as Vec,high:[...box.high] as Vec};leftBox.high[axis]=midpoint;
    const rightBox={low:[...box.low] as Vec,high:[...box.high] as Vec};rightBox.low[axis]=midpoint;
    visit(left,leftBox,depth+1);visit(right,rightBox,depth+1);return;
   }
  }
  const volumeM3=circleRectangleArea(box.low[0],box.high[0],box.low[1],box.high[1],s.radius)*(box.high[2]-box.low[2]);
  if(!(volumeM3>0))throw new Error('Occupied adaptive collision leaf has zero physical volume.');
  cells.push({ions:group,densityM3:group.length*s.weight/volumeM3,volumeM3,bounds:box,depth});
 }
 visit(ions,{low:[-s.radius,-s.radius,0],high:[s.radius,s.radius,s.length]},0);
 return cells;
}

/** Histogram diagnostics. N(N−1), rather than N², removes the empirical self
 * term for a FIXED partition. Position-adaptive partitions retain additional
 * selection bias; this statistic does not certify their collision rate.
 */
export function collisionDensityDiagnostics(cells:{ions:unknown[];volumeM3:number}[],weight:number){
 const n=cells.reduce((sum,c)=>sum+c.ions.length,0);
 return {occupiedCells:cells.length,representedInventory:n*weight,
  empiricalDensitySquaredIntegral:cells.reduce((sum,c)=>sum+c.ions.length**2*weight**2/c.volumeM3,0),
  selfExcludedDensitySquaredIntegral:cells.reduce((sum,c)=>sum+c.ions.length*(c.ions.length-1)*weight**2/c.volumeM3,0),
  markerMeanCellDensityM3:n?cells.reduce((sum,c)=>sum+c.ions.length**2*weight/c.volumeM3,0)/n:null,
  minimumOccupancy:cells.length?Math.min(...cells.map(c=>c.ions.length)):null,
  maximumOccupancy:cells.length?Math.max(...cells.map(c=>c.ions.length)):null};
}
