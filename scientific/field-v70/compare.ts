import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {candidates,matchedPoints,score,cornerSensitivity,transportSensitivity} from './scaling.js';
const raw=readFileSync(process.argv[2]),protocol=readFileSync('scientific/field-v70/PROTOCOL.md');
const sha=(b:Buffer)=>createHash('sha256').update(b).digest('hex');
const data=JSON.parse(raw.toString()),points=matchedPoints(data);
const scenarios=[{id:'nominal',temperatureScale:1},{id:'common-central-temperature-sensitivity',temperatureScale:1/.7}];
const cases=scenarios.flatMap(scenario=>candidates.map(candidate=>({...scenario,candidate,
 ...score(candidate,points,scenario.temperatureScale),
 extraction:cornerSensitivity(candidate,points,scenario.temperatureScale,'extraction'),
 reproducibility:cornerSensitivity(candidate,points,scenario.temperatureScale,'independent-reproducibility'),
 transportSensitivity:candidate==='neutral-viscosity'?transportSensitivity(points,scenario.temperatureScale):null})));
const packet={schemaVersion:1,markersSHA256:sha(raw),protocolSHA256:sha(protocol),
 matchedExperimentalValidation:false,liveQualified:false,unconditionalAccuracy:false,
 observable:'Maximum apparent neutral Doppler speed ratio, fixed100A and3Torr; central optical temperature is only a scalar proxy',
 sourceUrl:'https://www.degruyterbrill.com/document/doi/10.1515/zna-1980-0815/pdf',
 trainingFieldT:.17,heldoutFieldsT:[.13,.21,.255],target:.2,cases,
 unresolved:['radial-profile','pressure-sweep','independent-current','radial-temperature','diagnostic-fit','predicted-heating','separation-products']};
writeFileSync(process.argv[3],JSON.stringify(packet,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(cases.map(c=>({id:c.id,candidate:c.candidate,maxError:c.maximumHeldoutRelativeError,
 conditionedPass:c.conditionedScreenPassed,extraction:c.extraction.maximumErrorRange,
 reproducibility:c.reproducibility.maximumErrorRange,unavailable:c.reproducibility.outsidePropertyDomain})),null,2));
