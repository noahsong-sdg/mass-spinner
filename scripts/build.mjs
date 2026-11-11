import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
const require=createRequire(import.meta.url);
// The project-local prefix supports this host's demonstrated npm prune failure.
const vite=dirname(require.resolve('vite/package.json',{paths:[process.cwd(),resolve('.tools/frontend')]}));
const build=spawnSync(process.execPath,[resolve(vite,'bin/vite.js'),'build'],{stdio:'inherit'});
process.exit(build.status??1);
