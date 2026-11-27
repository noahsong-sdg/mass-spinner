import test from 'node:test';
import assert from 'node:assert/strict';
import {readdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
import ts from 'typescript';

test('every frontend source module is TypeScript included in the strict compiler gate',()=>{
 const config=ts.readConfigFile('tsconfig.json',ts.sys.readFile);assert.equal(config.error,undefined);
 const parsed=ts.parseJsonConfigFileContent(config.config,ts.sys,process.cwd());assert.deepEqual(parsed.errors,[]);
 assert.equal(parsed.options.strict,true);assert.notEqual(parsed.options.allowJs,true);
 const checked=new Set(parsed.fileNames.map(file=>resolve(file))),modules:string[]=[];
 function walk(directory:string){
  for(const item of readdirSync(directory,{withFileTypes:true})){
   const file=join(directory,item.name);
   if(item.isDirectory())walk(file);else if(/\.[cm]?[jt]sx?$/.test(file))modules.push(file);
  }
 }
 walk('src');assert.ok(modules.length>0);
 for(const file of modules){assert.match(file,/\.tsx?$/,'frontend modules must not escape strict checking as JavaScript');assert.ok(checked.has(resolve(file)),`${file} is outside the strict compiler gate`);}
});
