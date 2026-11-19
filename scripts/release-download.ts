import {execFile} from 'node:child_process';
import {promisify} from 'node:util';

export const RELEASE_ORIGIN='https://fieldwork-plasma-lab.fieldwork-plasma-lab.workers.dev/';
const run=promisify(execFile),flags=['--fail','--silent','--show-error','--retry','3','--max-time','60','--proto','=https'];

/** Shared production transport; callers admit paths and independently verify bytes. */
export async function downloadReleaseFile(name:string,origin=RELEASE_ORIGIN):Promise<Uint8Array>{
 const {stdout}=await run('curl',[...flags,'--location','--max-redirs','5','--proto-redir','=https',origin+name.split('/').map(encodeURIComponent).join('/')],{encoding:'buffer',maxBuffer:128*1024*1024});
 return stdout;
}

/** Inspect the first response: following it would conceal an incorrect rule. */
export async function inspectReleaseRedirect(source:string,origin=RELEASE_ORIGIN){
 const {stdout}=await run('curl',[...flags,'--dump-header','-','--output','/dev/null',new URL(source,origin).href],{encoding:'utf8',maxBuffer:1024*1024});
 const headers=stdout.trim().split(/\r?\n\r?\n/).at(-1)??'',status=/^HTTP\/[\d.]+\s+(\d{3})/.exec(headers);
 if(!status)throw new Error('Missing deployed HTTP status.');
 return {status:Number(status[1]),location:/^location:\s*([^\r\n]*)/im.exec(headers)?.[1]?.trim()??''};
}
