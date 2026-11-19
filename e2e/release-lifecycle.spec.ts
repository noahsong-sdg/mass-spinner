import {test,expect} from '@playwright/test';
import {createServer} from 'node:http';
import {once} from 'node:events';
import {mkdtemp,mkdir,writeFile,readFile,rm,cp} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {sealRelease,retainAssets,verifyRelease} from '../scripts/release-manifest.ts';

// Real late imports across three generations and rollback, without module-cache
// assistance. This local fixture is not evidence of a Cloudflare deployment.
test('open A/B/C tabs can first load their modules after C deployment and rollback to A',async({page,context})=>{
 const root=await mkdtemp(join(tmpdir(),'release-browser-'));
 const a=join(root,'a'),b=join(root,'b'),c=join(root,'c'),rollback=join(root,'rollback');
 for(const [directory,label]of [[a,'a'],[b,'b'],[c,'c']] as const){
  await mkdir(join(directory,'assets'),{recursive:true});
  for(const action of ['load','late'])await writeFile(join(directory,`assets/${action}-${label}12345678.js`),`export const value='${label}-${action}';`);
  await writeFile(join(directory,'index.html'),`<!doctype html><title>${label}</title><button id="load">Load module</button><button id="late">Load another module</button><output id="result"></output><script type="module">for(const action of ['load','late'])document.getElementById(action).onclick=async()=>{const {value}=await import('/assets/'+action+'-${label}12345678.js');document.querySelector('#result').textContent=value;};</script>`);
  await sealRelease(directory,label.repeat(40));
 }
 await cp(a,rollback,{recursive:true});
 let serving=a;
 const server=createServer((request,response)=>{
  const name=new URL(request.url??'/', 'http://localhost').pathname;
  const file=name==='/'?'index.html':name.slice(1);
  if(!/^(?:index\.html|assets\/[A-Za-z0-9-]+\.js)$/.test(file)){response.writeHead(404).end();return;}
  void readFile(join(serving,file)).then(bytes=>{
   response.writeHead(200,{'content-type':file.endsWith('.js')?'text/javascript':'text/html','cache-control':'no-store'}).end(bytes);
  },()=>response.writeHead(404).end());
 });
 try{
  server.listen(0,'127.0.0.1');await once(server,'listening');
  const address=server.address();if(!address||typeof address==='string')throw new Error('Missing fixture port');
  const origin=`http://127.0.0.1:${address.port}`;
  await page.goto(origin);await expect(page).toHaveTitle('a');
  await retainAssets(b,a);serving=b;
  const tabB=await context.newPage();await tabB.goto(origin);await expect(tabB).toHaveTitle('b');
  await retainAssets(c,b);serving=c;
  for(const [tab,label]of [[page,'a'],[tabB,'b']] as const){
   await tab.locator('#load').click();await expect(tab.locator('#result')).toHaveText(`${label}-load`);
  }
  const tabC=await context.newPage();await tabC.goto(origin);await expect(tabC).toHaveTitle('c');
  await tabC.locator('#load').click();await expect(tabC.locator('#result')).toHaveText('c-load');
  await retainAssets(rollback,c);serving=rollback;
  for(const [tab,label]of [[page,'a'],[tabB,'b'],[tabC,'c']] as const){
   await tab.locator('#late').click();await expect(tab.locator('#result')).toHaveText(`${label}-late`);
  }
  const fresh=await context.newPage();await fresh.goto(origin);await expect(fresh).toHaveTitle('a');
  await fresh.locator('#load').click();await expect(fresh.locator('#result')).toHaveText('a-load');
  await verifyRelease(c);await verifyRelease(rollback);
  await Promise.all([tabB.close(),tabC.close(),fresh.close()]);
 }finally{
  if(server.listening)await new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve()));
  await rm(root,{recursive:true,force:true});
 }
});
