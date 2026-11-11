export type Polynomial=number[]; // ascending powers of the dimensionless time t/dt
export const polynomialAdd=(a:Polynomial,b:Polynomial)=>Array.from({length:Math.max(a.length,b.length)},(_,i)=>(a[i]??0)+(b[i]??0));
export const polynomialScale=(a:Polynomial,s:number)=>a.map(v=>v*s);
export const polynomialShift=(a:Polynomial)=>[0,...a];
export function polynomialMultiply(a:Polynomial,b:Polynomial){
 const result=Array(a.length+b.length-1).fill(0);
 a.forEach((x,i)=>b.forEach((y,j)=>result[i+j]+=x*y));return result as Polynomial;
}
export const polynomialValue=(a:Polynomial,t:number)=>a.reduceRight((sum,x)=>sum*t+x,0);
export const polynomialDerivative=(a:Polynomial)=>a.slice(1).map((v,i)=>v*(i+1));

/** All roots in [0,1], using derivative roots to partition monotone intervals.
 * This isolates narrow leave/reenter crossings instead of hoping an event
 * sample lies outside. Near multiple roots are candidates, checked against the
 * reintegrated position by the caller rather than silently classed as contact.
 */
export function polynomialRoots(coefficients:Polynomial):number[]{
 const a=[...coefficients];while(a.length>1&&a.at(-1)===0)a.pop();
 const scale=Math.max(...a.map(Math.abs));
 if(!Number.isFinite(scale))throw new Error('Unresolved wall polynomial: reduce timestep.');
 if(scale===0)return [0];
 for(let i=0;i<a.length;i++)a[i]/=scale;
 if(a.length===1)return [];
 if(a.length===2){const root=-a[0]/a[1];return root>=0&&root<=1?[root]:[];}
 const critical=polynomialRoots(polynomialDerivative(a)).filter(t=>t>0&&t<1);
 const cuts=[0,...critical,1],roots:number[]=[];
 const error=(t:number)=>64*Number.EPSILON*polynomialValue(a.map(Math.abs),Math.abs(t));
 for(const t of cuts)if(Math.abs(polynomialValue(a,t))<=error(t))roots.push(t);
 for(let i=1;i<cuts.length;i++){
  let low=cuts[i-1],high=cuts[i],left=polynomialValue(a,low),right=polynomialValue(a,high);
  if(left===0||right===0||Math.sign(left)===Math.sign(right))continue;
  for(let iteration=0;iteration<128;iteration++){
   const middle=(low+high)/2;if(middle===low||middle===high)break;
   const value=polynomialValue(a,middle);
   if(value===0){low=high=middle;break;}
   if(Math.sign(value)===Math.sign(left)){low=middle;left=value;}else{high=middle;right=value;}
  }
  roots.push((low+high)/2);
 }
 return [...new Set(roots)].sort((x,y)=>x-y);
}

