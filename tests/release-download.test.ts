import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:https';
import {createServer as createProxy} from 'node:http';
import {connect} from 'node:net';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {once} from 'node:events';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import {downloadReleaseFile,inspectReleaseRedirect} from '../scripts/release-download.ts';
import {sealRelease} from '../scripts/release-manifest.ts';
import {bootstrapRelease} from '../scripts/bootstrap-release.ts';
import {verifyDeployedRelease} from '../scripts/verify-deployed-release.ts';

// Actual curl/TLS, canonical HTML redirects and unserved Cloudflare controls.
// A local trusted CA preserves certificate verification without external network.
test('release transport handles redirects, deployment controls and proxy CONNECT headers',async t=>{
 const root=await mkdtemp(join(tmpdir(),'release-tls-')),key=join(root,'key.pem'),cert=join(root,'cert.pem'),base=join(root,'base');
 const originalEnvironment=Object.fromEntries(['CURL_CA_BUNDLE','https_proxy','NO_PROXY','no_proxy'].map(name=>[name,process.env[name]]));
 t.after(()=>rm(root,{recursive:true,force:true}));
 await promisify(execFile)('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-days','1','-subj','/CN=localhost','-addext','subjectAltName=IP:127.0.0.1','-keyout',key,'-out',cert]);
 await mkdir(base);await writeFile(join(base,'index.html'),'qualified index bytes');await writeFile(join(base,'guide.html'),'qualified guide bytes');
 await writeFile(join(base,'_redirects'),'/old /guide#current 301\n');await writeFile(join(base,'_headers'),'/*\n  X-Test: qualified\n');
 await sealRelease(base,'a'.repeat(40));const manifest=await readFile(join(base,'release-manifest.json'));
 const requests:string[]=[];let correctRedirect=true,proxyCalls=0;
 const https=createServer({key:await readFile(key),cert:await readFile(cert)},(request,response)=>{
  requests.push(request.url??'/');
  if(request.url==='/guide.html')response.writeHead(307,{location:'/guide'}).end('redirect body');
  else if(request.url==='/old')response.writeHead(301,{location:correctRedirect?'/guide#current':'/wrong'}).end();
  else if(request.url==='/loop')response.writeHead(307,{location:'/loop'}).end();
  else if(request.url==='/downgrade')response.writeHead(307,{location:'http://127.0.0.1/guide'}).end();
  else if(request.url==='/guide')response.writeHead(200,{'content-type':'text/html'}).end('qualified guide bytes');
  else if(request.url==='/index.html')response.writeHead(200,{'content-type':'text/html'}).end('qualified index bytes');
  else if(request.url==='/release-manifest.json')response.writeHead(200,{'content-type':'application/json'}).end(manifest);
  else response.writeHead(404).end(); // _redirects and _headers are consumed, not served.
 });
 const proxy=createProxy();
 t.after(async()=>{
  for(const [name,value]of Object.entries(originalEnvironment))if(value===undefined)delete process.env[name];else process.env[name]=value;
  for(const server of [proxy,https])if(server.listening)await new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve()));
 });
 https.listen(0,'127.0.0.1');await once(https,'listening');
 const address=https.address();if(!address||typeof address==='string')throw new Error('Missing TLS fixture port');
 const origin=`https://127.0.0.1:${address.port}/`;process.env.CURL_CA_BUNDLE=cert;
 assert.equal(Buffer.from(await downloadReleaseFile('guide.html',origin)).toString(),'qualified guide bytes');
 await assert.rejects(downloadReleaseFile('loop',origin),/redirects followed/i);
 await assert.rejects(downloadReleaseFile('downgrade',origin),/Protocol.*http.*(?:disabled|not supported)/i);
 const download=(name:string)=>downloadReleaseFile(name,origin),inspect=(source:string)=>inspectReleaseRedirect(source,origin);
 await bootstrapRelease(base,join(root,'restored'),createHash('sha256').update(manifest).digest('hex'),download);
 await verifyDeployedRelease(base,download,inspect);
 assert.ok(!requests.includes('/_redirects')&&!requests.includes('/_headers'));
 correctRedirect=false;await assert.rejects(verifyDeployedRelease(base,download,inspect),/Deployed redirect differs/);correctRedirect=true;
 // curl -D emits CONNECT's 200 block before the actual HTTPS response headers.
 proxy.on('connect',(request,client,head)=>{
  assert.equal(request.url,`127.0.0.1:${address.port}`);proxyCalls++;
  const upstream=connect(address.port,'127.0.0.1',()=>{
   client.write('HTTP/1.1 200 Connection established\r\n\r\n');
   if(head.length)upstream.write(head);client.pipe(upstream);upstream.pipe(client);
  });
  client.on('error',()=>upstream.destroy());upstream.on('error',()=>client.destroy());
  client.on('close',()=>upstream.destroy());upstream.on('close',()=>client.destroy());
 });
 proxy.listen(0,'127.0.0.1');await once(proxy,'listening');
 const proxyAddress=proxy.address();if(!proxyAddress||typeof proxyAddress==='string')throw new Error('Missing proxy fixture port');
 process.env.https_proxy=`http://127.0.0.1:${proxyAddress.port}`;process.env.NO_PROXY='';process.env.no_proxy='';
 assert.deepEqual(await inspect('/old'),{status:301,location:'/guide#current'});assert.equal(proxyCalls,1);
});
