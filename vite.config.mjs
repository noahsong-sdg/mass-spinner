import {createRequire} from 'node:module';
import {dirname,resolve} from 'node:path';
import {workerIdentityPlugin} from './scripts/worker-identity-plugin.mjs';
const require=createRequire(import.meta.url);
// This session's npm cannot prune existing optional directories. Tooling is
// installed in a project-local prefix; ordinary installs resolve from root first.
const three=resolve(dirname(require.resolve('three',{paths:[process.cwd(),resolve('.tools/frontend')]})),'..');
export default {
  publicDir:'web-assets',
  resolve:{alias:[
    {find:'three/webgpu',replacement:resolve(three,'build/three.webgpu.js')},
    {find:'three/tsl',replacement:resolve(three,'build/three.tsl.js')},
    {find:'three/addons',replacement:resolve(three,'examples/jsm')},
    {find:/^three$/,replacement:resolve(three,'build/three.module.js')},
  ]},
  build:{outDir:'release',emptyOutDir:false,target:'es2022',
    rollupOptions:{input:{main:resolve('index.html'),laurelin:resolve('laurelin.html')}}},
  worker:{format:'es',plugins:()=>[workerIdentityPlugin(process.cwd())]},
};
