/** Mass Spinner adaptation of Geant4 v11.4.0, commit b4a16de652ec244f7a0ecc0a5cacfee21930bf75.
 * Copyright (c) Copyright Holders of the Geant4 Collaboration, 1994–2006.
 * This product includes software developed by Members of the Geant4 Collaboration
 * (http://cern.ch/geant4). Distributed under /GEANT4-LICENSE.txt.
 * Adapted atomic ICRU49 electronic fit and mean nuclear table; NOT a Geant4 run,
 * measured LiT dataset, compound correction, or transport/straggling calculation.
 */
export const DEUTERON_STOPPING_PROVENANCE={
 upstream:'Geant4 v11.4.0',commit:'b4a16de652ec244f7a0ecc0a5cacfee21930bf75',
 license:'/GEANT4-LICENSE.txt',projectileMassU:2,lithiumMassU:7,tritiumMassU:3,
 minimumEnergyKeV:.5/.6,maximumEnergyKeV:500,
 assumptions:'Atomic Bragg sum for Li:T=1:1; isotope mass-number approximation; no measured LiT chemical correction, angular scattering, straggling or charge-state evolution.',
} as const;
const UNIT_KEV_M2=1e-22; // eV/(10^15 atoms/cm²) → keV m² per atom
const COEFFICIENTS={
 1:[1.440,242.6,12000,.1159].map(Math.fround),
 3:[1.600,725.6,3013,.04578].map(Math.fround),
};

/** Unrestricted electronic mean stopping; E/2 is equivalent proton energy per u. */
function electronicAtom(energyKeV:number,z:1|3){
 const perU=energyKeV/2,t=Math.max(10,perU),factor=perU<10?Math.sqrt(perU/10):1;
 const [a,b,c,d]=COEFFICIENTS[z],low=a*t**.45,high=b/t*Math.log(1+c/t+d*t);
 return low*high/(low+high)*factor*UNIT_KEV_M2;
}

// Geant4 G4ICRU49NuclearStoppingModel::NuclearStoppingPower reduced table,
// in descending reduced energy. Mean only: stochastic fluctuation is disabled.
const NUCLEAR_TABLE=[
 [1e8,5.831e-8],[8e7,7.288e-8],[6e7,9.719e-8],[5e7,1.166e-7],
 [4e7,1.457e-7],[3e7,1.942e-7],[2e7,2.916e-7],[1.5e7,3.887e-7],
 [1e7,5.833e-7],[8e6,7.287e-7],[6e6,9.712e-7],[5e6,1.166e-6],
 [4e6,1.457e-6],[3e6,1.941e-6],[2e6,2.911e-6],[1.5e6,3.878e-6],
 [1e6,5.810e-6],[8e5,7.262e-6],[6e5,9.663e-6],[5e5,1.157e-5],
 [4e5,1.442e-5],[3e5,1.913e-5],[2e5,2.845e-5],[1.5e5,3.762e-5],
 [1e5,5.554e-5],[8e4,6.866e-5],[6e4,9.020e-5],[5e4,1.070e-4],
 [4e4,1.319e-4],[3e4,1.722e-4],[2e4,2.499e-4],[1.5e4,3.248e-4],
 [1e4,4.688e-4],[8e3,5.729e-4],[6e3,7.411e-4],[5e3,8.718e-4],
 [4e3,1.063e-3],[3e3,1.370e-3],[2e3,1.955e-3],[1.5e3,2.511e-3],
 [1e3,3.563e-3],[8e2,4.314e-3],[6e2,5.511e-3],[5e2,6.430e-3],
 [4e2,7.756e-3],[3e2,9.855e-3],[2e2,1.375e-2],[1.5e2,1.736e-2],
 [1e2,2.395e-2],[8e1,2.850e-2],[6e1,3.552e-2],[5e1,4.073e-2],
 [4e1,4.802e-2],[3e1,5.904e-2],[1.5e1,9.426e-2],[1e1,1.210e-1],
 [8,1.377e-1],[6,1.611e-1],[5,1.768e-1],[4,1.968e-1],
 [3,2.235e-1],[2,2.613e-1],[1.5,2.871e-1],[1,3.199e-1],
 [.8,3.354e-1],[.6,3.523e-1],[.5,3.609e-1],[.4,3.693e-1],
 [.3,3.766e-1],[.2,3.803e-1],[.15,3.788e-1],[.1,3.711e-1],
 [.08,3.644e-1],[.06,3.530e-1],[.05,3.444e-1],[.04,3.323e-1],
 [.03,3.144e-1],[.02,2.854e-1],[.015,2.629e-1],[.01,2.298e-1],
 [.008,2.115e-1],[.006,1.883e-1],[.005,1.741e-1],[.004,1.574e-1],
 [.003,1.372e-1],[.002,1.116e-1],[.0015,9.559e-2],[.001,7.601e-2],
 [.0008,6.668e-2],[.0006,5.605e-2],[.0005,5.008e-2],[.0004,4.352e-2],
 [.0003,3.617e-2],[.0002,2.768e-2],[.00015,2.279e-2],[.0001,1.723e-2],
 [.00008,1.473e-2],[.00006,1.200e-2],[.00005,1.052e-2],[.00004,8.950e-3],
 [.00003,7.246e-3],[.00002,5.358e-3],[.000015,4.313e-3],[0,3.166e-3],
] as const;

function nuclearAtom(energyKeV:number,z:1|3,targetMassU:number){
 const rm=(2+targetMassU)*Math.cbrt(z),reduced=32.536*targetMassU*energyKeV/(z*rm);
 let value:number=NUCLEAR_TABLE[0][1];
 if(reduced<NUCLEAR_TABLE[0][0])for(let i=NUCLEAR_TABLE.length-2;i>=0;i--){
  const [highX,highY]=NUCLEAR_TABLE[i], [lowX,lowY]=NUCLEAR_TABLE[i+1];
  if(reduced<=highX){value=(highY-lowY)*(reduced-lowX)/(highX-lowX)+lowY;break;}
 }
 return value*8.462*z*2/rm*UNIT_KEV_M2;
}

/** Atomic branch for explicit evolving-composition Bragg sums; not compound data. */
export function atomicStoppingCrossSection(energyKeV:number,z:1|3,targetMassU:number){
 if(!Number.isFinite(energyKeV)||energyKeV<DEUTERON_STOPPING_PROVENANCE.minimumEnergyKeV
  ||energyKeV>DEUTERON_STOPPING_PROVENANCE.maximumEnergyKeV
  ||(z!==1&&z!==3)||!Number.isFinite(targetMassU)||targetMassU<=0)
  throw new RangeError('Atomic stopping requires 0.833333…–500 keV, Z=1 or 3 and positive target mass.');
 const electronicKeVM2=electronicAtom(energyKeV,z),nuclearKeVM2=nuclearAtom(energyKeV,z,targetMassU);
 return {electronicKeVM2,nuclearKeVM2,totalKeVM2:electronicKeVM2+nuclearKeVM2};
}

/** Mean dE/dN for one Li and one T atom: keV m² per nominal formula unit.
 * Partial T loading must change reaction hazard, not remove this assumed fixed
 * hydrogen-isotope stopping matrix. Internal lower domain matches the D–T fit;
 * a trajectory below it has unresolved fusion yield and must be marked by caller.
 */
export function litStoppingCrossSection(energyKeV:number,lithiumMassU=7,tritiumMassU=3){
 if(!Number.isFinite(energyKeV)||energyKeV<DEUTERON_STOPPING_PROVENANCE.minimumEnergyKeV
  ||energyKeV>DEUTERON_STOPPING_PROVENANCE.maximumEnergyKeV
  ||![lithiumMassU,tritiumMassU].every(m=>Number.isFinite(m)&&m>0))
  throw new RangeError('LiT stopping reference requires 0.833333…–500 keV deuterons and positive isotope masses.');
 const electronicKeVM2=electronicAtom(energyKeV,1)+electronicAtom(energyKeV,3);
 const nuclearKeVM2=nuclearAtom(energyKeV,1,tritiumMassU)+nuclearAtom(energyKeV,3,lithiumMassU);
 return {electronicKeVM2,nuclearKeVM2,totalKeVM2:electronicKeVM2+nuclearKeVM2};
}
