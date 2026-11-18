import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {validateBytes} from 'gltf-validator';

const files=['assets/separator.glb','web-assets/models/centrifuge-assembly.glb','release/models/centrifuge-assembly.glb'];
const reports=[];
for(const path of files){
 const bytes=await readFile(path),report=await validateBytes(bytes,{uri:path,maxIssues:1000});
 reports.push({path,bytes:bytes.byteLength,...report});
 if(report.issues.numErrors)throw new Error(`${path}: ${report.issues.numErrors} Khronos validation errors`);
 if(bytes.byteLength>8_000_000)throw new Error(`${path}: exceeds declared 8 MB uncompressed delivery budget`);
 console.log(`${path}: ${bytes.byteLength} bytes; ${report.issues.numWarnings} warnings; zero validation errors`);
}
await mkdir('output',{recursive:true});
await writeFile('output/gltf-validation.json',JSON.stringify(reports,null,2)+'\n');
