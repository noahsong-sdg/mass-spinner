import {createRequire} from 'node:module';
import {dirname,resolve} from 'node:path';
import {workerIdentityPlugin} from './scripts/worker-identity-plugin.mjs';
import {equilibriumIdentityPlugin} from './scripts/equilibrium-identity-plugin.mjs';
const require=createRequire(import.meta.url);
const three=resolve(dirname(require.resolve('three')),'..');
export default {
  plugins:[equilibriumIdentityPlugin(process.cwd())],
  publicDir:'web-assets',
  resolve:{alias:[
    {find:'three/webgpu',replacement:resolve(three,'build/three.webgpu.js')},
    {find:'three/tsl',replacement:resolve(three,'build/three.tsl.js')},
    {find:'three/addons',replacement:resolve(three,'examples/jsm')},
    {find:/^three$/,replacement:resolve(three,'build/three.module.js')},
  ]},
  build:{outDir:'release',emptyOutDir:true,target:'es2022',
    rollupOptions:{input:{main:resolve('index.html'),laurelin:resolve('laurelin.html')}}},
  worker:{format:'es',plugins:()=>[workerIdentityPlugin(process.cwd())]},
};
