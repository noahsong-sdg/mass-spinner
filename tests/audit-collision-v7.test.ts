import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_DOUBLEWELL,simulateDoublewell} from '../src/doublewell-dynamics.js';

// Audit-only independent quadrature of the declared uniform pulse/cell overlap.
// This deliberately does not call the production circleRectangleArea helper.
function diskRectangle(x0:number,x1:number,y0:number,y1:number,radius:number){
 const low=Math.max(x0,-radius),high=Math.min(x1,radius),panels=8000;
 if(high<=low)return 0;
 const dx=(high-low)/panels;let area=0;
 for(let i=0;i<panels;i++){
  const x=low+(i+.5)*dx,y=Math.sqrt(Math.max(0,radius**2-x*x));
  area+=Math.max(0,Math.min(y1,y)-Math.max(y0,-y))*dx;
 }
 return area;
}
function pulseRateFactor(across:number){
 const c=DEFAULT_DOUBLEWELL,width=2*c.radius/across,nz=Math.ceil(c.length/width),dz=c.length/nz;
 const volume=Math.PI*c.sourceRadius**2*c.length*c.pulseLengthFraction;
 let factor=0;
 for(let ix=0;ix<across;ix++)for(let iy=0;iy<across;iy++){
  const x0=-c.radius+ix*width,y0=-c.radius+iy*width;
  const cellArea=diskRectangle(x0,x0+width,y0,y0+width,c.radius);
  const pulseArea=diskRectangle(x0,x0+width,y0,y0+width,c.sourceRadius);
  for(let iz=0;iz<nz;iz++){
   const overlapLength=Math.max(0,Math.min((iz+1)*dz,c.length*c.pulseLengthFraction)-iz*dz);
   const pulse=pulseArea*overlapLength,cell=cellArea*dz;
   if(cell>0)factor+=pulse*pulse/(volume*cell);
  }
 }
 return factor;
}

test('audit: piecewise-constant pulse density has a deterministic collision-rate dilution independent of marker count',t=>{
 // For uniform source density n0, the marked-particle-average cell density is
 // n0 sum(Vpulse,cell²/Vcell)/Vpulse. This is the density factor in the initial
 // infinitesimal collision generator; equal local velocity laws are assumed.
 const grids=[2,3,4,6,8,12],factors=grids.map(pulseRateFactor);
 t.diagnostic(JSON.stringify({cellsAcross:grids,initialCollisionDensityFactors:factors}));
 assert.ok(Math.abs(factors[1]-.6858581658732255)<2e-5);
 assert.ok(factors.every(v=>v>0&&v<1),'cell averaging cannot recover the sharp pulse until spatial refinement');
 // This establishes an alignment-dependent error, not a convergence pass.
 assert.ok(factors[2]<factors[1]);assert.ok(factors[4]<factors[3]);
});

test('audit: actual deployed defaults expose long-horizon raw momentum drift and unresolved local sampling',t=>{
 const r=simulateDoublewell(DEFAULT_DOUBLEWELL);
 assert.ok(r.species.every(s=>s.active+s.wall+s.end+s.source===s.injected));
 assert.ok(Number.isFinite(r.conservation.maxMomentumResidual));
 assert.ok(r.conservation.maxCorrectedMomentumResidual<=r.conservation.maxMomentumResidual);
 assert.equal(r.regimeSummary.status,'unresolved');
 t.diagnostic(JSON.stringify({durationS:r.config.duration,cellsAcross:r.config.cellsAcross,
  particlesPerSpecies:r.config.particlesPerSpecies,rawPResidual:r.conservation.maxMomentumResidual,
  torqueCorrectedResidual:r.conservation.maxCorrectedMomentumResidual,
  maxEnergyResidual:r.conservation.maxEnergyResidual,
  unresolvedSnapshots:r.regimeSummary.unresolvedSnapshots,totalSnapshots:r.regimeHistory.length,
  unpairedExposure:r.collisions.unpairedIonSteps/r.collisions.activeIonSteps,
  counts:r.species.map(s=>({active:s.active,wall:s.wall,end:s.end,source:s.source}))}));
});
