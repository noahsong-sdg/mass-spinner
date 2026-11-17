import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { copyFileSync,cpSync,mkdirSync,readFileSync,writeFileSync } from 'node:fs';
import {qualificationPage} from './qualification-page.mjs';
import {understandingPage} from './understanding-page.mjs';
const require=createRequire(import.meta.url);
// The project-local prefix supports this host's demonstrated npm prune failure.
const vite=dirname(require.resolve('vite/package.json',{paths:[process.cwd(),resolve('.tools/frontend')]}));
const build=spawnSync(process.execPath,[resolve(vite,'bin/vite.js'),'build'],{stdio:'inherit'});
if(build.status===0){
 writeFileSync('release/guide.html',understandingPage(readFileSync('docs/UNDERSTANDING-MASS-SPINNER-02.md','utf8')));
 copyFileSync('src/guide-reader.js','release/guide-reader.js');
 const katexDist=resolve(dirname(require.resolve('katex/package.json')),'dist');
 mkdirSync('release/guide-katex',{recursive:true});
 copyFileSync(resolve(katexDist,'katex.min.css'),'release/guide-katex/katex.min.css');
 cpSync(resolve(katexDist,'fonts'),'release/guide-katex/fonts',{recursive:true});
 writeFileSync('release/qualification.html',qualificationPage(readFileSync('docs/PUBLIC-DATA-QUALIFICATION.md','utf8')));
 copyFileSync('scientific/public-data-campaign/results/comparison.png','release/qualification-comparison.png');
}
process.exit(build.status??1);
