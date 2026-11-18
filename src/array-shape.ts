/** Boolean shape check without Array.isArray's mutable any[] narrowing of readonly arrays. */
export const isArrayShape:(value:unknown)=>boolean=Array.isArray;
