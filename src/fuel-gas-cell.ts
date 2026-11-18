import * as THREE from 'three';
import cell from '../web-assets/models/gas-cell.json' with {type:'json'};

/** Blender-authored topology, mapped to the accepted radial cell and SI length.
 * This is a quantitative cutaway, not a predicted photograph of luminous gas.
 */
export function fuelGasCell(inner: number,outer: number,length: number,side: number){
 const geometry=new THREE.BufferGeometry(),positions=Float32Array.from(cell.positions);
 for(let i=0;i<positions.length;i+=3){
  const x=positions[i],y=positions[i+1],radius=Math.hypot(x,y);
  // The authored vertices lie on exactly two radial boundaries. Preserve these
  // edges exactly rather than amplifying float32 radius error in thin cells.
  const target=radius<.75?inner:outer;
  positions[i]=side*x/radius*target;positions[i+1]=y/radius*target;positions[i+2]*=length;
 }
 // Reflecting the left half reverses winding; preserve outward-facing surfaces.
 const indices=[...cell.indices];if(side<0)for(let i=0;i<indices.length;i+=3)[indices[i+1],indices[i+2]]=[indices[i+2],indices[i+1]];
 geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));geometry.setIndex(indices);
 geometry.computeVertexNormals();return geometry;
}
