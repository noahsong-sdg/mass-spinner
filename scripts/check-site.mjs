import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
import {createSourceFile,ScriptTarget,isImportDeclaration,isExportDeclaration,isStringLiteral} from 'typescript';
import {resolve} from 'node:path';
for(const name of readdirSync('release').filter(name=>name.endsWith('.js'))){
 const module=createSourceFile(name,readFileSync(`release/${name}`,'utf8'),ScriptTarget.ES2022);
 for(const statement of module.statements){
  if(!isImportDeclaration(statement)&&!isExportDeclaration(statement))continue;
  const specifier=statement.moduleSpecifier;
  if(specifier&&isStringLiteral(specifier)&&specifier.text.startsWith('.'))
   assert.ok(existsSync(resolve('release',specifier.text)),`Missing module imported by ${name}: ${specifier.text}`);
 }
}
const html=readFileSync('release/index.html','utf8');
const ids=new Set([...html.matchAll(/id="([^"]+)"/g)].map(match=>match[1]));
for(const file of ['src/main.ts','src/legacy-renderer.ts','src/study-ui.ts']){
 const source=readFileSync(file,'utf8');
 for(const match of source.matchAll(/\$\('([a-z][a-z0-9-]*)'\)/g))
  assert.ok(ids.has(match[1]),`Missing application control in ${file}: ${match[1]}`);
}
for(const name of ['index.html','laurelin.html','systems.html','how-it-works.html','guide.html','tutorial-03.html','tutorial-04.html','tutorial-05.html','tutorial-06.html','tutorial-07.html','start.html','equilibrium.html','learn.html']){
 const page=readFileSync(`release/${name}`,'utf8');
 for(const match of page.matchAll(/(?:src|href)="(\/[^"#]+)"/g)){
  const path=new URL(match[1],'https://example.org').pathname;
  assert.ok(existsSync(`release${path==='/'?'/index.html':path}`),`Missing published resource in ${name}: ${match[1]}`);
 }
}
for(const name of ['controls','transport','thermal','beam','collection','evidence'])
 assert.ok(!existsSync(`release/learn-${name}.html`),`Retired reader was emitted: ${name}`);
for(const [,font]of readFileSync('release/fonts.css','utf8').matchAll(/url\((\/fonts\/[^)]+)\)/g))
 assert.ok(existsSync(`release${font}`),`Missing interface font: ${font}`);
assert.ok(existsSync('release/_redirects'),'Missing retired-reader redirects');
for(const [,font]of readFileSync('release/guide-katex/katex.min.css','utf8').matchAll(/url\((fonts\/[^)]+)\)/g))
 assert.ok(existsSync(`release/guide-katex/${font}`),`Missing guide math font: ${font}`);
const sourceRevisions=new Set();
for(const name of ['guide.html','tutorial-03.html','tutorial-04.html','tutorial-05.html','tutorial-06.html','tutorial-07.html','qualification.html','how-it-works.html']){
 const links=[...readFileSync(`release/${name}`,'utf8').matchAll(/href="https:\/\/github.com\/noahsong-sdg\/mass-spinner\/blob\/([^"?#]+)"/g)];
 assert.ok(links.length,`Missing source links in ${name}`);
 for(const [,path]of links){
  const revision=path.split('/')[0];
  assert.match(revision,/^[0-9a-f]{40}$/,`Unpinned source link in ${name}: ${path}`);
  sourceRevisions.add(revision);
 }
}
assert.equal(sourceRevisions.size,1,'Published guides must identify the same producing release.');
for(const name of readdirSync('release/assets').filter(name=>name.endsWith('.js'))){
  const parsed=spawnSync(process.execPath,['--check',`release/assets/${name}`],{encoding:'utf8'});
  assert.equal(parsed.status,0,parsed.stderr);
}
for(const name of ['how-it-works.html','guide.html','guide-reader.js','guide.css','guide-katex/katex.min.css','separator.glb','separator-cutaway.png','TUTORIAL-REVIEW.md','VALIDATION.md','qualification.html','qualification-comparison.png',
 'COUPLED-TARGET-V35.md','MARATHON-REALISM-V35.md','marathon-reference/neutrons-v35.json','marathon-reference/h1-endfb81-v35.json','marathon-reference/implantation-v35.json'])
  assert.ok(existsSync(`release/${name}`),`Missing deployment asset: ${name}`);
const atlas=JSON.parse(readFileSync('release/reference-atlas/manifest.json','utf8'));
const apparatus=JSON.parse(readFileSync('release/renders/manifest.json','utf8'));
for(const mode of ['beam-target','gyro','icr','curved','centrifuge','rotating','doublewell','doublewell-dynamics','blanket']){
 const asset=apparatus.assets[mode];assert.ok(asset,`Missing rendered mechanism: ${mode}`);
 for(const path of [asset.image,asset.png,asset.model])assert.ok(path&&existsSync(`release${path}`),`Missing apparatus resource: ${path}`);
}
assert.ok(atlas.length>=8);
for(const entry of atlas){
 assert.ok(existsSync(`release${entry.image}`),`Missing reference diagram: ${entry.image}`);
 assert.ok(entry.alt&&entry.pros.length&&entry.cons.length&&entry.sources.length,`Incomplete reference: ${entry.id}`);
}
assert.ok(readdirSync('release/assets').some(name=>name.startsWith('worker-')),'Missing physics worker');
console.log('Built modules parse; HTML resources, physics worker and deployment assets exist. Not a browser runtime check.');
