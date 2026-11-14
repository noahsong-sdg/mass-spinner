import * as THREE from 'three';

/** Fit the real assembly inside the viewport area left by tools and timeline. */
export function fitLaurelinCamera(bounds,width,height,fov=38,upOverride){
 if(bounds.isEmpty()||!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0)
  throw new RangeError('Nonempty assembly bounds and positive viewport dimensions required');
 const target=bounds.getCenter(new THREE.Vector3()),direction=new THREE.Vector3(7,4.2,8).normalize();
 // In portrait, the long reactor axis uses the available vertical dimension.
 const up=upOverride?.clone()??(width/height<.8?new THREE.Vector3(1,0,0):new THREE.Vector3(0,1,0));
 const right=new THREE.Vector3().crossVectors(up,direction).normalize();
 const vertical=new THREE.Vector3().crossVectors(direction,right).normalize();
 const top=Math.min(60,height*.12),bottom=Math.min(180,height*.3),side=Math.min(20,width*.08);
 const tanY=Math.tan(THREE.MathUtils.degToRad(fov/2)),tanX=tanY*width/height;
 const usableX=1-2*side/width,usableY=1-(top+bottom)/height;
 let distance=0;
 for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z]){
  const offset=new THREE.Vector3(x,y,z).sub(target),depth=offset.dot(direction);
  distance=Math.max(distance,depth+Math.abs(offset.dot(right))/(tanX*usableX),depth+Math.abs(offset.dot(vertical))/(tanY*usableY));
 }
 distance*=1.08;
 return {target,position:target.clone().addScaledVector(direction,distance),up,
  offsetY:(bottom-top)/2,padding:{top,bottom,side}};
}
