import * as THREE from 'three';
import asset from '../web-assets/models/gas-markers.json' with {type:'json'};

/** Blender supplies marker shape only. Accepted SI sample positions supply motion.
 * Markers are enlarged, weighted samples: neither atom sizes nor gas emission.
 */
export function createFuelBulkMarkers(positions: number[],color: THREE.ColorRepresentation,radiusM: number,ion: boolean){
 const source=asset.markers[ion?'ion':'neutral'],geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(source.positions,3));
 geometry.setIndex(source.indices);geometry.computeVertexNormals();
 geometry.setAttribute('samplePosition',new THREE.Float32BufferAttribute(positions,3));
 const material=new THREE.MeshStandardMaterial({color,roughness:.4,metalness:0,transparent:true,opacity:ion?1:.85,depthWrite:false});
 const mesh=new THREE.InstancedMesh(geometry,material,positions.length/3);
 mesh.name=ion?'Blender ion markers':'Blender neutral markers';mesh.frustumCulled=false;
 mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
 mesh.userData={componentId:'motion',quantitativeOnly:true,nonPickable:true,
  geometrySource:asset.generator,materialBasis:'Enlarged numerical markers; no physical material or optical emission',
  markerRadiusM:radiusM,purpose:'Weighted bulk samples; shape size exaggerated, centre positions in SI metres'};
 syncFuelBulkMarkers(mesh);return mesh;
}

export function syncFuelBulkMarkers(mesh: THREE.InstancedMesh){
 const positions=mesh.geometry.getAttribute('samplePosition'),matrix=new THREE.Matrix4(),size=mesh.userData.markerRadiusM as number;
 for(let i=0;i<positions.count;i++){
  matrix.makeScale(size,size,size);matrix.setPosition(positions.getX(i),positions.getY(i),positions.getZ(i));mesh.setMatrixAt(i,matrix);
 }
 mesh.instanceMatrix.needsUpdate=true;
}
