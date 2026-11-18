import test from 'node:test';
import assert from 'node:assert/strict';
import {Ajv} from 'ajv';
import schema from '../schemas/scenario-v2-v3.schema.json' with {type:'json'};
import {validateScenario} from '../src/scenario-state.ts';

test('shared schema preserves old setup links and rejects malformed current history',()=>{
 const validate=new Ajv({strict:true,strictNumbers:true}).compile(schema);
 const legacy={version:2,level:'1',controls:{field:.1}};
 const current={version:3,level:'2',controls:{'marathon-apparatus':'centrifuge','fuel-durationS':2},fuelRun:{initialCurrentA:.03,events:[{timeS:1,currentA:0}],mode:'transport',timeS:1}};
 for(const value of [legacy,current]){assert.equal(validate(value),true);assert.doesNotThrow(()=>validateScenario(value));}
 for(const value of [null,{...legacy,version:1},{...legacy,fuelRun:current.fuelRun},{...current,fuelRun:{...current.fuelRun,events:[{}]}},{...current,controls:{x:Infinity}},{...legacy,controls:{x:'x'.repeat(161)}}])assert.equal(validate(value),false);
 // Shape is necessary, but ordered events and supported control IDs remain domain checks.
 const invalid={...current,fuelRun:{...current.fuelRun,events:[{timeS:1,currentA:0},{timeS:.5,currentA:.03}]}};
 assert.equal(validate(invalid),true);assert.throws(()=>validateScenario(invalid));
});
