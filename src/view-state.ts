/** Rendering capability and physical model are independent UI states. */
export function rendererPresentation(mode:string,ready:boolean,failed:boolean,webGPU:boolean,apparatus=false){
 const orbital=mode==='rotating'||mode==='icr';
 return {
  canvasHidden:apparatus||!orbital||!ready,
  posterHidden:true,
  loadingHidden:apparatus||!orbital||ready,
  status:apparatus?'':!orbital?'':ready?(webGPU?'WebGPU':'WebGL2'):failed?'3D unavailable':'Loading 3D…',
 };
}
