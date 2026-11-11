// Node transport adaptation only. Imports the actual browser-worker handler.
import {parentPort} from 'node:worker_threads';
import {tsImport} from 'tsx/esm/api';
globalThis.self={postMessage:data=>parentPort.postMessage(data)};
await tsImport('../../src/worker.ts',import.meta.url);
parentPort.on('message',data=>self.onmessage({data}));
