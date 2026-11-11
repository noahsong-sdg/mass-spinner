/** Offline safe-dev only. Editable complete default assembly, from runtime geometry. */
import fs from 'node:fs/promises';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {DEFAULT_FUEL_CENTRIFUGE,simulateFuelCentrifuge} from '../src/fuel-centrifuge.ts';
import {buildFuelCentrifugeGeometry} from '../src/fuel-centrifuge-geometry.js';
import {createFuelDrive} from '../src/fuel-drive.js';
globalThis.FileReader=class {readAsArrayBuffer(blob){blob.arrayBuffer().then(result=>{this.result=result;this.onloadend?.();},error=>{this.error=error;this.onerror?.(error);});}};
const out='scientific/drive49/complete';await fs.mkdir('scientific/drive49',{recursive:true});await fs.mkdir(out,{recursive:false});
const input=await fs.readFile('web-assets/models/centrifuge-assembly.glb');
const assembly=await new GLTFLoader().parseAsync(input.buffer.slice(input.byteOffset,input.byteOffset+input.byteLength),'');
const config=DEFAULT_FUEL_CENTRIFUGE,result=simulateFuelCentrifuge(config);
const {scene,motion}=buildFuelCentrifugeGeometry({config,result,assembly:assembly.scene});
motion.group.removeFromParent();scene.add(createFuelDrive(config).group);
scene.traverse(node=>{if(node.material?.roughnessMap)node.material.roughnessMap=null;});
const glb=await new GLTFExporter().parseAsync(scene,{binary:true,onlyVisible:true});
await fs.writeFile(`${out}/centrifuge-complete.glb`,Buffer.from(glb));
await fs.writeFile(`${out}/inputs.json`,JSON.stringify({config,scope:'Same accepted default hardware as runtime; drive directions are prescribed numerical glyphs. Blender geometry is illustrative, not fabrication CAD.'},null,2)+'\n');
console.log(JSON.stringify({out,bytes:glb.byteLength}));
