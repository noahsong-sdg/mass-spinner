import {transpileModule,ScriptTarget,ModuleKind} from 'typescript';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { copyFileSync,cpSync,mkdirSync,readFileSync,writeFileSync } from 'node:fs';
import {qualificationPage} from './qualification-page.mjs';
import {understandingPage} from './understanding-page.mjs';
import {equilibriumPage} from './equilibrium-page.mjs';
import {pinReleaseLinks,releaseSourceBase} from './release-links.mjs';
const source=spawnSync('git',['rev-parse','--verify','HEAD'],{encoding:'utf8'});
if(source.status!==0)throw new Error('Cannot identify the producing release revision.');
const revision=source.stdout.trim();
releaseSourceBase(revision);
const require=createRequire(import.meta.url);
const vite=dirname(require.resolve('vite/package.json'));
const build=spawnSync(process.execPath,[resolve(vite,'bin/vite.js'),'build'],{stdio:'inherit'});
if(build.status===0){
 writeFileSync('release/equilibrium.html',equilibriumPage(readFileSync('docs/EQUILIBRIUM-COMPOSITION.md','utf8')));
 writeFileSync('release/guide.html',understandingPage(readFileSync('docs/UNDERSTANDING-MASS-SPINNER-02.md','utf8'),revision));
 writeFileSync('release/how-it-works.html',pinReleaseLinks(readFileSync('web-assets/how-it-works.html','utf8'),revision));
 writeFileSync('release/guide-reader.js',transpileModule(readFileSync('src/guide-reader.ts','utf8'),{fileName:'guide-reader.ts',compilerOptions:{target:ScriptTarget.ES2022,module:ModuleKind.ESNext}}).outputText);
 const katexDist=resolve(dirname(require.resolve('katex/package.json')),'dist');
 mkdirSync('release/guide-katex',{recursive:true});
 copyFileSync(resolve(katexDist,'katex.min.css'),'release/guide-katex/katex.min.css');
 cpSync(resolve(katexDist,'fonts'),'release/guide-katex/fonts',{recursive:true});
 writeFileSync('release/qualification.html',qualificationPage(readFileSync('docs/PUBLIC-DATA-QUALIFICATION.md','utf8'),revision));
 copyFileSync('scientific/public-data-campaign/results/comparison.png','release/qualification-comparison.png');
}
process.exit(build.status??1);
