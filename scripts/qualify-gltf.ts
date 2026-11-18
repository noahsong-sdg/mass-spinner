import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {NodeIO,PropertyType,type Document,type Accessor} from '@gltf-transform/core';
import {dedup} from '@gltf-transform/functions';
import {validateBytes} from 'gltf-validator';

function stream(accessor:Accessor|null){
 const array=accessor?.getArray();
 if(!array)return null;
 return {type:array.constructor.name,hash:createHash('sha256').update(new Uint8Array(array.buffer,array.byteOffset,array.byteLength)).digest('hex')};
}
/** Exact attributes/indices and stable selectable-node identity, not just bounds. */
function geometry(document:Document){
 return document.getRoot().listNodes().map(node=>({
  name:node.getName(),extras:node.getExtras(),translation:node.getTranslation(),rotation:node.getRotation(),scale:node.getScale(),
  children:node.listChildren().map(child=>child.getName()),
  primitives:node.getMesh()?.listPrimitives().map(p=>({
   attributes:Object.fromEntries(p.listSemantics().sort().map(name=>[name,stream(p.getAttribute(name))])),
   indices:stream(p.getIndices()),material:p.getMaterial()?.getName(),mode:p.getMode(),extras:p.getExtras(),
  })),
 }));
}

await mkdir('output/gltf-trial',{recursive:true});
const source='web-assets/models/centrifuge-assembly.glb',destination='output/gltf-trial/centrifuge-assembly.glb';
const io=new NodeIO(),document=await io.read(source),before=geometry(document);
const start=performance.now();
await document.transform(dedup({propertyTypes:[PropertyType.ACCESSOR,PropertyType.MESH]}));
await io.write(destination,document);
const elapsedMS=performance.now()-start,after=await io.read(destination);
assert.deepEqual(geometry(after),before,'Lossless transform changed picking hierarchy, metadata or geometry streams');
const bytes=await readFile(destination),validation=await validateBytes(bytes,{uri:destination,maxIssues:1000});
assert.equal(validation.issues.numErrors,0,'Transformed glTF failed Khronos validation');
const sourceBytes=(await readFile(source)).byteLength;
assert.ok(bytes.byteLength<=sourceBytes,'Lossless transform increased delivery size');
assert.ok(bytes.byteLength<=1_200_000,'Assembly exceeds the measured 1.2 MB delivery budget');
const timings=[];
for(const file of [source,destination]){
 const samples=[];
 for(let i=0;i<5;i++){const start=performance.now();await io.read(file);samples.push(performance.now()-start);}
 timings.push({file,parseMS:samples.sort((a,b)=>a-b)[2]});
}
const report={kind:'lossless-accessor-mesh-dedup',source,sourceBytes,bytes:bytes.byteLength,
 savedFraction:1-bytes.byteLength/sourceBytes,elapsedMS,peakRSSKiB:process.resourceUsage().maxRSS,timings,
 selectableNodes:before.filter(node=>node.primitives).length,geometryStreamsExact:true,validation,
 scope:'NodeIO warm filesystem parsing; not browser cold-load latency, GPU memory or frame performance. Build copies this qualified asset into release/models. No quantization or decoder extension.'};
await writeFile('output/gltf-trial/report.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report));
