import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:https';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {once} from 'node:events';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {downloadReleaseFile} from '../scripts/release-download.ts';

// Exercise actual curl and TLS, including the canonical .html redirects used by
// Cloudflare Assets. A local CA preserves certificate verification offline.
test('release transport follows HTTPS redirects, bounds loops and refuses HTTP downgrade',async t=>{
 const root=await mkdtemp(join(tmpdir(),'release-tls-')),key=join(root,'key.pem'),cert=join(root,'cert.pem');
 const previousCA=process.env.CURL_CA_BUNDLE;
 t.after(()=>rm(root,{recursive:true,force:true}));
 await promisify(execFile)('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-days','1','-subj','/CN=localhost','-addext','subjectAltName=IP:127.0.0.1','-keyout',key,'-out',cert]);
 const https=createServer({key:await readFile(key),cert:await readFile(cert)},(request,response)=>{
  if(request.url==='/guide.html')response.writeHead(307,{location:'/guide'}).end('redirect body');
  else if(request.url==='/loop')response.writeHead(307,{location:'/loop'}).end();
  else if(request.url==='/downgrade')response.writeHead(307,{location:'http://127.0.0.1/guide'}).end();
  else if(request.url==='/guide')response.writeHead(200,{'content-type':'text/html'}).end('qualified guide bytes');
  else response.writeHead(404).end();
 });
 t.after(async()=>{
  if(previousCA===undefined)delete process.env.CURL_CA_BUNDLE;else process.env.CURL_CA_BUNDLE=previousCA;
  if(https.listening)await new Promise<void>((resolve,reject)=>https.close(error=>error?reject(error):resolve()));
 });
 https.listen(0,'127.0.0.1');await once(https,'listening');
 const address=https.address();if(!address||typeof address==='string')throw new Error('Missing TLS fixture port');
 const origin=`https://127.0.0.1:${address.port}/`;process.env.CURL_CA_BUNDLE=cert;
 assert.equal(Buffer.from(await downloadReleaseFile('guide.html',origin)).toString(),'qualified guide bytes');
 await assert.rejects(downloadReleaseFile('loop',origin),/redirects followed/i);
 await assert.rejects(downloadReleaseFile('downgrade',origin),/Protocol.*http.*(?:disabled|not supported)/i);
});
