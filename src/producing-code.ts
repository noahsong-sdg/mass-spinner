export interface ProducingCodeIdentity {
 schemaVersion:1;
 algorithm:'sha256';
 sourceHash:string;
 sourceFiles:Record<string,string>;
}

/** Missing metadata identifies an old/unbundled result, never the current build. */
export function producingCode(value:unknown):ProducingCodeIdentity|null {
 if(!value||typeof value!=='object')return null;
 const identity=value as ProducingCodeIdentity;
 const digest=(value:unknown)=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
 if(identity.schemaVersion!==1||identity.algorithm!=='sha256'||!digest(identity.sourceHash)
  ||!identity.sourceFiles||typeof identity.sourceFiles!=='object'||Array.isArray(identity.sourceFiles)
  ||!Object.keys(identity.sourceFiles).length||!Object.values(identity.sourceFiles).every(digest))return null;
 return structuredClone(identity);
}

export function serializeRun(run:Record<string,unknown>):string {
 return JSON.stringify({modelVersion:10,...run,producingCode:producingCode(run.producingCode)},null,2);
}
