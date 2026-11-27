import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

type Advisory={name:string;url:string;severity:string};
type Audit={vulnerabilities:Record<string,{via:(string|Advisory)[]}>};
type Review={package:string;expires:string;reason:string;upstream:string};

export function checkDependencies(audit:Audit,reviews:Record<string,Review>,now=new Date()){
 if(!audit.vulnerabilities||typeof audit.vulnerabilities!=='object')throw new Error('Missing npm audit inventory.');
 const admitted=new Set<string>();
 for(const vulnerability of Object.values(audit.vulnerabilities))for(const advisory of vulnerability.via){
  if(typeof advisory==='string'){
   if(!audit.vulnerabilities[advisory])throw new Error('Incomplete transitive advisory inventory.');
   continue;
  }
  if(advisory.severity!=='high'&&advisory.severity!=='critical')continue;
  const id=advisory.url.split('/').at(-1)!,review=reviews[id];
  if(!review||review.package!==advisory.name||review.upstream!==advisory.url||new Date(review.expires+'T00:00:00Z').getTime()<=now.getTime()||!Number.isFinite(Date.parse(review.expires)))throw new Error(`Unreviewed or expired dependency advisory: ${id}`);
  admitted.add(id);
 }
 return [...admitted];
}

if(process.argv[1]&&resolve(process.argv[1])===resolve(import.meta.filename)){
 const audit=JSON.parse(readFileSync(process.argv[2],'utf8')) as Audit;
 const reviews=JSON.parse(readFileSync('security/dependency-reviews.json','utf8')) as Record<string,Review>;
 const ids=checkDependencies(audit,reviews);
 console.log(ids.length?`Unresolved upstream advisories under temporary review: ${ids.join(', ')}`:'No high/critical dependency advisories.');
}
