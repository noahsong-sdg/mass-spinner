import test from 'node:test';
import assert from 'node:assert/strict';
import {axisymmetricCollisionCells,axisymmetricGrid,collideAxisymmetricCell,cylindricalVelocity} from '../src/axisymmetric-collisions.js';
import {AMU,E_CHARGE,type Vec} from '../src/physics.js';

const random=()=>{let i=0;const values=[.23,.71,.41,.61,.17,.83];return()=>values[i++%values.length];};
const near=(a:number,b:number,scale=Math.max(Math.abs(a),Math.abs(b)))=>assert.ok(Math.abs(a-b)<=2e-12*scale,`${a} != ${b}`);
const ion=(r:number,angle:number,v:Vec,massU=40)=>({position:[r*Math.cos(angle),r*Math.sin(angle),.15] as Vec,
 velocity:[v[0]*Math.cos(angle)-v[1]*Math.sin(angle),v[0]*Math.sin(angle)+v[1]*Math.cos(angle),v[2]] as Vec,massU,chargeState:1});
const kinetic=(ions:ReturnType<typeof ion>[])=>ions.reduce((sum,p)=>sum+p.massU*AMU*p.velocity.reduce((a,v)=>a+v*v,0)/2,0);
const angular=(ions:ReturnType<typeof ion>[])=>ions.reduce((sum,p)=>sum+p.massU*AMU*(p.position[0]*p.velocity[1]-p.position[1]*p.velocity[0]),0);

test('annular cells cover cylinder exactly and represent each input once, including boundaries',()=>{
 const ions=Array.from({length:20},(_,i)=>ion((i%4+.5)*.05,i*.37,[1,2,3]));
 ions.forEach((p,i)=>p.position[2]=(Math.floor(i/4)+.5)*.12);
 const settings={radius:.2,length:.6,weight:7,radialCells:4,axialCells:5};
 const cells=axisymmetricCollisionCells(ions,settings);
 near(cells.reduce((sum,c)=>sum+c.volumeM3,0),Math.PI*.2**2*.6);
 assert.equal(cells.flatMap(c=>c.ions).length,ions.length);
 assert.equal(new Set(cells.flatMap(c=>c.ions)).size,ions.length);
 for(const c of cells)near(c.densityM3*c.volumeM3,c.ions.length*settings.weight);
 const boundary=axisymmetricCollisionCells([ion(0,0,[1,2,3]),{...ion(.2,0,[1,2,3]),position:[.2,0,.6] as Vec}],settings);
 assert.equal(boundary.length,2);assert.equal(boundary[1].radialHighM,.2);assert.equal(boundary[1].axialHighM,.6);
});

test('azimuthally separated copies of the same local flow have zero relative collision speed',()=>{
 const a=ion(.1,0,[1200,4000,2100]),b=ion(.1,Math.PI,[1200,4000,2100],84),before=structuredClone([a,b]);
 const d=collideAxisymmetricCell([a,b],1e18,10,1e-8,random());
 assert.equal(d.maxVariance,0);assert.equal(d.zeroRelativePairs,1);
 for(let j=0;j<2;j++)for(let k=0;k<3;k++)near([a,b][j].velocity[k],before[j].velocity[k],10000);
});

test('mixed masses retain SI rate normalization, pair energy/axial momentum and measured physical torque',()=>{
 const ions=[ion(.04,.7,[3000,6000,1000]),ion(.08,-1.2,[-1000,2000,5000],84)];
 const before=kinetic(ions),lz=angular(ions),pz=ions.reduce((sum,p)=>sum+p.massU*AMU*p.velocity[2],0);
 const g=Math.hypot(4000,4000,-4000),mu=AMU*40*84/(40+84),epsilon=8.8541878128e-12;
 // Two markers: effective partner density n/2, derived independently of the helper.
 const expected=(E_CHARGE**2/(epsilon*mu))**2*(1e18/2)*10*1e-8/(8*Math.PI*g**3);
 let torque=0;
 const d=collideAxisymmetricCell(ions,1e18,10,1e-8,random(),(a,b,dp)=>{
  torque+=(Math.hypot(a.position[0],a.position[1])-Math.hypot(b.position[0],b.position[1]))*dp[1];
 });
 near(d.maxVariance,expected);near(kinetic(ions),before);
 near(ions.reduce((sum,p)=>sum+p.massU*AMU*p.velocity[2],0),pz);
 near(angular(ions)-lz,torque,Math.max(Math.abs(lz),Math.abs(torque)));
 assert.ok(Math.abs(torque)>0,'Finite radial separation must not be projected away.');
});

test('ring collision results are invariant to independent azimuth relabeling',()=>{
 const local:Vec[]=[[3000,6000,1000],[-1000,2000,5000],[2000,-1000,-1000]];
 const a=local.map((v,i)=>ion(.04+.01*i,0,v,40+22*i)),b=local.map((v,i)=>ion(.04+.01*i,.3+1.7*i,v,40+22*i));
 const da=collideAxisymmetricCell(a,1e18,10,1e-8,random()),db=collideAxisymmetricCell(b,1e18,10,1e-8,random());
 near(da.maxVariance,db.maxVariance);assert.equal(da.unpaired,1);
 for(let i=0;i<a.length;i++){
  const va=cylindricalVelocity(a[i].position,a[i].velocity),vb=cylindricalVelocity(b[i].position,b[i].velocity);
  va.forEach((v,k)=>near(v,vb[k],10000));
 }
});

test('an aligned sharp cylindrical source has no histogram support dilution',()=>{
 const settings={radius:.2,length:.6,weight:1,radialCells:10,axialCells:12};
 const ions=Array.from({length:8},(_,i)=>({...ion((i%4+.5)*.02,0,[1,2,3]),position:[(i%4+.5)*.02,0,(Math.floor(i/4)+.5)*.05] as Vec}));
 const cells=axisymmetricCollisionCells(ions,settings);
 near(cells.reduce((sum,c)=>sum+c.volumeM3,0),Math.PI*.08**2*.1);
 // Only aligned support avoids dilution; finite marker fluctuations remain.
 const misaligned=axisymmetricCollisionCells(ions,{...settings,radialCells:3,axialCells:5});
 assert.ok(misaligned.reduce((sum,c)=>sum+c.volumeM3,0)>Math.PI*.08**2*.1);
});

test('declared fixed source interfaces remove initial support dilution on nonaligned ring grids',()=>{
 const radius=.2,length=.6,source=.08,slug=.15,radialCells=3,axialCells=5;
 const radial=[0,radius/3,source,2*radius/3,radius],axial=[0,length/5,slug,2*length/5,3*length/5,4*length/5,length];
 const ions=[];
 for(let ir=0;ir<radial.length-1;ir++)for(let iz=0;iz<axial.length-1;iz++)
  ions.push({...ion((radial[ir]+radial[ir+1])/2,0,[1,2,3]),position:[(radial[ir]+radial[ir+1])/2,0,(axial[iz]+axial[iz+1])/2] as Vec});
 const settings={radius,length,weight:1,radialCells,axialCells,radiusBreakM:source,axialBreakM:slug};
 const grid=axisymmetricGrid(settings);
 assert.equal(grid.radialEdgesM.length,5);assert.equal(grid.axialEdgesM.length,7);
 assert.ok(grid.radialEdgesM.includes(source));assert.ok(grid.axialEdgesM.includes(slug));
 const cells=axisymmetricCollisionCells(ions,settings);
 near(cells.reduce((sum,c)=>sum+c.volumeM3,0),Math.PI*radius**2*length);
 const inside=cells.filter(c=>c.radialHighM<=source&&c.axialHighM<=slug);
 near(inside.reduce((sum,c)=>sum+c.volumeM3,0),Math.PI*source**2*slug);
 for(const c of cells){
  assert.ok(c.radialHighM-c.radialLowM<=radius/radialCells*(1+1e-14));
  assert.ok(c.axialHighM-c.axialLowM<=length/axialCells*(1+1e-14));
 }
 // Inserting a coincident edge must not create an epsilon-width occupied cell.
 const coincident=axisymmetricCollisionCells([ion(.08,.3,[1,2,3])],{...settings,radialCells:5});
 assert.ok(coincident[0].radialHighM-coincident[0].radialLowM>.03);
 assert.throws(()=>axisymmetricCollisionCells([], {...settings,radiusBreakM:.3}));
 assert.throws(()=>axisymmetricCollisionCells([], {...settings,axialBreakM:NaN}));
 assert.deepEqual(axisymmetricGrid({radius,length,radialCells:1,axialCells:1}),{radialEdgesM:[0,radius],axialEdgesM:[0,length]});
});

test('ring API rejects invalid physical geometry and particle positions',()=>{
 const settings={radius:.2,length:.6,weight:1,radialCells:4,axialCells:5};
 for(const extra of [{radius:0},{length:Infinity},{weight:-1},{radialCells:0},{axialCells:1.5}])
  assert.throws(()=>axisymmetricCollisionCells([ion(.1,0,[1,2,3])],{...settings,...extra}));
 assert.throws(()=>axisymmetricCollisionCells([ion(.3,0,[1,2,3])],settings));
 assert.throws(()=>cylindricalVelocity([NaN,0,0],[1,2,3]));
 assert.throws(()=>collideAxisymmetricCell([ion(.1,0,[Infinity,2,3])],1e18,10,1e-8,random()));
});
