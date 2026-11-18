/** Compile-only boundary regression: absent inventory entries stay explicit. */
import type {ReleaseManifest} from '../release-manifest.ts';
declare const manifest:ReleaseManifest;
const possibleHash:string|undefined=manifest.files['absent.js'];
// @ts-expect-error An unchecked inventory lookup cannot establish a file digest.
const guaranteedHash:string=manifest.files['absent.js'];
// @ts-expect-error Omission and an explicitly undefined release identity are distinct.
const ambiguous:ReleaseManifest={...manifest,retainedFrom:undefined};
void possibleHash;void guaranteedHash;void ambiguous;
