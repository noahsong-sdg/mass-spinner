// Layout preferences contain geometry only, never simulation inputs or results.
export type WorkspaceLayout = {version:1;left:number;right:number;split:number};
export type WorkspaceStorage = Pick<Storage,'getItem'|'setItem'|'removeItem'>;
export const workspaceLayoutKey='mass-spinner.workspace-layout';
export const defaultWorkspaceLayout=Object.freeze<WorkspaceLayout>({version:1,left:.24,right:.36,split:.5});
export const clamp=(value:number,min:number,max:number)=>Math.max(min,Math.min(max,value));

export function readWorkspaceLayout(storage?:Pick<Storage,'getItem'>|null):WorkspaceLayout{
 try{
  const saved:unknown=JSON.parse(storage?.getItem(workspaceLayoutKey)??'null');
  if(!saved||typeof saved!=='object'||!('version' in saved)||saved.version!==1)return {...defaultWorkspaceLayout};
  if(!('left' in saved)||typeof saved.left!=='number'||!Number.isFinite(saved.left)||!('right' in saved)||typeof saved.right!=='number'||!Number.isFinite(saved.right)||!('split' in saved)||typeof saved.split!=='number'||!Number.isFinite(saved.split))return {...defaultWorkspaceLayout};
  if(saved.left<.15||saved.left>.5||saved.right<.15||saved.right>.5||saved.split<.2||saved.split>.8)return {...defaultWorkspaceLayout};
  return {version:1,left:saved.left,right:saved.right,split:saved.split};
 }catch{return {...defaultWorkspaceLayout};}
}

export function workspaceGeometry(layout:WorkspaceLayout,width:number,leftOpen:boolean,rightOpen:boolean){
 // Reserve at least 32% of the viewport for the scene when both rails are open.
 const budget=Math.max(0,width*.68-64);
 let left=clamp(layout.left*width,Math.min(220,budget*.44),Math.min(440,budget));
 let right=clamp(layout.right*width,Math.min(260,budget*.56),Math.min(660,budget));
 if(leftOpen&&rightOpen&&left+right>budget){const scale=budget/(left+right);left*=scale;right*=scale;}
 return {left:Math.round(left),right:Math.round(right)};
}
