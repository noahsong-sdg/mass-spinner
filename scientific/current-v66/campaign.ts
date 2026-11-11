import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {solveFuelCurrent} from '../../src/fuel-current.js';
const raw=readFileSync(process.argv[2]),packet=JSON.parse(raw.toString());
const cases=packet.cases.map((spec:any)=>({id:spec.id,...solveFuelCurrent(spec)}));
writeFileSync(process.argv[3],JSON.stringify({sourceSHA256:createHash('sha256').update(raw).digest('hex'),cases},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({cases:cases.length}));
