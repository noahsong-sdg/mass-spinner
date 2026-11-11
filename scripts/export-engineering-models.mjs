/** Run inside safe-dev. Export the SAME procedural surfaces used by the live viewer. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {buildEngineeringGeometry} from '../src/engineering-geometry.js';

// GLTFExporter uses the browser FileReader API for its binary buffer, even without textures.
globalThis.FileReader=class {
 readAsArrayBuffer(blob){blob.arrayBuffer().then(result=>{this.result=result;this.onloadend?.();},error=>{this.error=error;this.onerror?.(error);});}
};
const out=path.resolve(process.argv[2]??'scientific/engineering-v39');
await fs.mkdir(out,{recursive:true});
const modes=process.argv.slice(3);
const requested=modes.length?modes:['rotating','icr','doublewell','doublewell-dynamics','centrifuge','gyro','curved','beam-target'];
const records=[];
for(const mode of requested){
 const inputs={mode,radiusM:.48,lengthM:2.8,curvatureRadiusM:2,boundary:'open',beamAreaM2:1e-4,filmThicknessM:1e-6,backingThicknessM:.001};
 if(mode==='beam-target')inputs.lengthM=.45;
 const built=buildEngineeringGeometry(inputs),file=`${mode}.glb`;
 const bytes=await new GLTFExporter().parseAsync(built.group,{binary:true,onlyVisible:true});
 await fs.writeFile(path.join(out,file),Buffer.from(bytes));
 records.push({mode,file,inputs,domain:built.domain,surfaceIds:[...built.surfaces.keys()],source:'src/engineering-geometry.js',basis:'Same procedural geometry as runtime. Construction assumptions are not a validated device bill of materials.'});
 built.dispose();
}
await fs.writeFile(path.join(out,'geometry-manifest.json'),JSON.stringify(records,null,2)+'\n');
console.log(JSON.stringify({directory:out,models:records.length}));
