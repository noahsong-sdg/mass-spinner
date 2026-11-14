// Run inside the checked app guest; Python oracle never imports this module.
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {simulateLaurelin} from '../../src/laurelin-physics.js';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const protocolBytes=readFileSync(new URL('./oracle2-cases.json',import.meta.url));
const protocol=JSON.parse(protocolBytes),rows=[];
for(const spec of protocol.cases)for(const steps of protocol.steps)
 rows.push({name:spec.name,steps,result:simulateLaurelin(spec.input,steps)});
writeFileSync(process.argv[2],JSON.stringify({protocolSHA256:sha(protocolBytes),
 productionSourceSHA256:sha(readFileSync(new URL('../../src/laurelin-physics.js',import.meta.url))),
 nodeVersion:process.version,rows})+'\n',{flag:'wx'});
