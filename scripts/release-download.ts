import {execFile} from 'node:child_process';
import {promisify} from 'node:util';

const run=promisify(execFile);

/** Shared production transport; callers admit paths and independently verify bytes. */
export async function downloadReleaseFile(name:string,origin='https://fieldwork-plasma-lab.fieldwork-plasma-lab.workers.dev/'):Promise<Uint8Array>{
 const {stdout}=await run('curl',['--fail','--location','--max-redirs','5','--proto','=https','--proto-redir','=https','--silent','--show-error','--retry','3','--max-time','60',origin+name.split('/').map(encodeURIComponent).join('/')],{encoding:'buffer',maxBuffer:128*1024*1024});
 return stdout;
}
