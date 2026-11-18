import {test,expect} from '@playwright/test';
import {createServer} from 'node:http';
import {once} from 'node:events';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {sealRelease,retainAssets,verifyRelease} from '../scripts/release-manifest.ts';

// Exercise real browser module loading across a switch and rollback. This is a
// local release-lifecycle fixture, not evidence of a Cloudflare deployment.
test('an open tab can load a retained module after deployment and rollback',async({page,context})=>{
 const root=await mkdtemp(join(tmpdir(),'release-browser-'));
 const previous=join(root,'previous'),current=join(root,'current');
 const versions=[[previous,'previous','a'],[current,'current','b']] as const;
 for(const [directory,label,sha]of versions){
  await mkdir(join(directory,'assets'),{recursive:true});
  await writeFile(join(directory,`assets/lazy-${label}12345678.js`),`export const value=${JSON.stringify(label)};`);
  await writeFile(join(directory,'index.html'),`<!doctype html><title>${label}</title><button id="load">Load module</button><output id="result"></output><script type="module">document.querySelector('#load').onclick=async()=>{const {value}=await import('/assets/lazy-${label}12345678.js');document.querySelector('#result').textContent=value;};</script>`);
  await sealRelease(directory,sha.repeat(40));
 }
 await retainAssets(current,previous);
 let serving=previous;
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
  await page.goto(origin);await expect(page).toHaveTitle('previous');
  serving=current;
  await page.locator('#load').click();await expect(page.locator('#result')).toHaveText('previous');
  const fresh=await context.newPage();
  await fresh.goto(origin);await expect(fresh).toHaveTitle('current');
  await fresh.locator('#load').click();await expect(fresh.locator('#result')).toHaveText('current');
  serving=previous;
  await page.reload();await expect(page).toHaveTitle('previous');
  await page.locator('#load').click();await expect(page.locator('#result')).toHaveText('previous');
  await verifyRelease(previous);await verifyRelease(current);
  await fresh.close();
 }finally{
  if(server.listening)await new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve()));
  await rm(root,{recursive:true,force:true});
 }
});
