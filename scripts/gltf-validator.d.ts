declare module 'gltf-validator' {
 export function validateBytes(bytes:Uint8Array,options:{uri:string;maxIssues:number}):Promise<{
  issues:{numErrors:number;numWarnings:number;numInfos:number;numHints:number;messages:unknown[]};
 }>;
}
