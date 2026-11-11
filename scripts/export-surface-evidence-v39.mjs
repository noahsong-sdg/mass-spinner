/** Offline evidence, not a browser substitute: export the actual runtime SI layer. */
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {JSDOM} from 'jsdom';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {surfaceState} from '../src/surface-state.ts';
import {createSurfaceLayer} from '../src/surface-layer.js';
import {DEFAULT_CONFIG,simulate} from '../src/physics.ts';
import {solveEquilibrium} from '../src/equilibrium-model.ts';
import {DEFAULT_COUPLED_TARGET,simulateCoupledTarget} from '../src/coupled-target.ts';
import {DEFAULT_FUSION_BEAM} from '../src/fusion-reactor.ts';

globalThis.FileReader=class {readAsArrayBuffer(blob){blob.arrayBuffer().then(result=>{this.result=result;this.onloadend?.();},error=>{this.error=error;this.onerror?.(error);});}};
const output='scientific/surface-evidence-v39';await fs.mkdir(output,{recursive:true});
const dom=new JSDOM('<main></main>'),frame=dom.window.document.querySelector('main'),records=[];
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
async function save(name,model,settings,result,quantity,extra={}){
 const packet=surfaceState({model,settings,result,acceptedModel:model,acceptedSettings:settings,...extra});
 if(packet.status!=='ready')throw new Error(packet.reason);
 const layer=createSurfaceLayer(frame);layer.update(packet,settings);
 const select=frame.querySelector('select[aria-label="Surface quantity"]');select.value=quantity;select.dispatchEvent(new dom.window.Event('change'));
 const bytes=Buffer.from(await new GLTFExporter().parseAsync(layer.group,{binary:true,onlyVisible:true}));
 await fs.writeFile(`${output}/${name}.glb`,bytes);
 const json=JSON.stringify({model,settings,snapshot:packet.snapshot},null,2)+'\n';await fs.writeFile(`${output}/${name}.json`,json);
 records.push({name,quantity,geometrySHA256:sha(bytes),stateSHA256:sha(json),source:'Actual createSurfaceLayer and production solver output; offline CPU Blender rendering, no browser/GPU observation.'});layer.dispose();
}
const orbit={...DEFAULT_CONFIG,particlesPerSpecies:16,duration:2e-5};
await save('rotating-electric','rotating',orbit,simulate(orbit),'electric-radial');
const equilibrium={radius:.48,rotationRadS:10000,ionTemperatureEV:5,electronTemperatureEV:5,bins:64,
 species:[{massU:40,chargeState:1,axisFraction:.5},{massU:84,chargeState:1,axisFraction:.5}]};
await save('centrifuge-composition','centrifuge',equilibrium,solveEquilibrium(equilibrium),'fraction-1');
const source={...DEFAULT_FUSION_BEAM,beamCurrentA:.001,stoppingModel:'geant4-bragg',materialColumnM2:1e22,exposureS:.01};
const target={...DEFAULT_COUPLED_TARGET,depthCells:8,backingCells:4,samples:10,cooldownS:0,maxStepS:.001};
const result=simulateCoupledTarget(source,target),extra={selectedState:result.final,source,acceptedSource:source};
await save('target-backing-temperature','beam-target',target,result,'temperature-backing',extra);
await save('target-tritium','beam-target',target,result,'tritiumFraction',extra);
const sources={};for(const name of ['src/engineering-geometry.js','src/surface-state.ts','src/surface-layer.js','scripts/export-surface-evidence-v39.mjs'])sources[name]=sha(await fs.readFile(name));
await fs.writeFile(`${output}/manifest.json`,JSON.stringify({records,sources},null,2)+'\n');console.log(JSON.stringify({output,states:records.length}));
