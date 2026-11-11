const RAW_SHA256='3024d8f0db604b074e33ed8b05027eb9f5a738614041ba44c83f048e0d0bc1af';
interface NativeTable {
 MT:number;energyEV:number[];barns:number[];breakpoints:number[];interpolation:number[];
}
export interface HydrogenReferenceData {
 schemaVersion:2;format:'ENDF6-MF3-native';library:'ENDF/B-VIII.1';nuclide:'H1';
 rawSHA256:string;url:string;fastDomainEV:number[];
 channels:{total:NativeTable;elastic:NativeTable;absorption:NativeTable};
}

function validateTable(table:NativeTable,mt:number){
 if(!table||table.MT!==mt||!Array.isArray(table.energyEV)||!Array.isArray(table.barns)
  ||!Array.isArray(table.breakpoints)||!Array.isArray(table.interpolation)
  ||table.energyEV.length<2||table.energyEV.length!==table.barns.length
  ||table.breakpoints.length===0||table.breakpoints.length!==table.interpolation.length)
  throw new Error('Invalid native ENDF MF3 table shape.');
 for(let i=0;i<table.energyEV.length;i++){
  if(!Number.isFinite(table.energyEV[i])||table.energyEV[i]<=0
   ||i>0&&table.energyEV[i]<=table.energyEV[i-1]
   ||!Number.isFinite(table.barns[i])||table.barns[i]<0)
   throw new Error('Native ENDF energies must increase and cross sections must be nonnegative finite values.');
 }
 for(let i=0;i<table.breakpoints.length;i++){
  if(!Number.isInteger(table.breakpoints[i])||table.breakpoints[i]<2
   ||i>0&&table.breakpoints[i]<=table.breakpoints[i-1]
   ||table.breakpoints[i]>table.energyEV.length||![2,5].includes(table.interpolation[i]))
   throw new Error('Unsupported or invalid native ENDF interpolation region.');
 }
 if(table.breakpoints.at(-1)!==table.energyEV.length)throw new Error('Native ENDF final breakpoint must cover the table.');
}

function interpolate(table:NativeTable,energyEV:number){
 if(energyEV<table.energyEV[0]||energyEV>table.energyEV.at(-1)!)
  throw new Error('Energy is outside the native ENDF table; extrapolation is unsupported.');
 if(energyEV===table.energyEV.at(-1)!)return table.barns.at(-1)!;
 let lo=0,hi=table.energyEV.length-1;
 while(hi-lo>1){const mid=Math.floor((lo+hi)/2);if(table.energyEV[mid]<=energyEV)lo=mid;else hi=mid;}
 const x0=table.energyEV[lo],x1=table.energyEV[hi],y0=table.barns[lo],y1=table.barns[hi];
 const region=table.breakpoints.findIndex(point=>point>=hi+1),law=table.interpolation[region];
 if(law===2)return y0+(y1-y0)*(energyEV-x0)/(x1-x0);
 if(y0<=0||y1<=0)throw new Error('Log-log ENDF interpolation requires positive cross sections.');
 return y0*Math.exp(Math.log(y1/y0)*Math.log(energyEV/x0)/Math.log(x1/x0));
}

/** Exact native MF3 interpolation, then barns × 1e-28 m² × assumed H-1 density.
 * This reference describes isolated H-1 nuclei, not compound material response.
 */
export function neutronHydrogenReference(data:HydrogenReferenceData,energyMeV:number,numberDensityM3:number){
 if(!data||data.schemaVersion!==2||data.format!=='ENDF6-MF3-native'||data.library!=='ENDF/B-VIII.1'
  ||data.nuclide!=='H1'||data.rawSHA256!==RAW_SHA256||typeof data.url!=='string'
  ||!Array.isArray(data.fastDomainEV)||data.fastDomainEV.length!==2
  ||data.fastDomainEV[0]!==1e5||data.fastDomainEV[1]!==2e7||!data.channels)
  throw new Error('Expected the pinned native ENDF/B-VIII.1 hydrogen-1 reference.');
 if(!Number.isFinite(energyMeV)||energyMeV<.1||energyMeV>20
  ||!Number.isFinite(numberDensityM3)||numberDensityM3<0)
  throw new Error('Hydrogen reference requires 0.1–20 MeV and a nonnegative finite assumed number density.');
 const energyEV=energyMeV*1e6;
 validateTable(data.channels.total,1);validateTable(data.channels.elastic,2);validateTable(data.channels.absorption,102);
 const totalBarns=interpolate(data.channels.total,energyEV),elasticBarns=interpolate(data.channels.elastic,energyEV),
  absorptionBarns=interpolate(data.channels.absorption,energyEV);
 const totalMInv=totalBarns*1e-28*numberDensityM3,elasticMInv=elasticBarns*1e-28*numberDensityM3,
  absorptionMInv=absorptionBarns*1e-28*numberDensityM3;
 if(absorptionBarns>totalBarns||![totalMInv,elasticMInv,absorptionMInv].every(Number.isFinite))
  throw new Error('Hydrogen reference cross sections exceed the physical or finite numeric domain.');
 return {totalMInv,absorptionMInv,elasticMInv,totalBarns,absorptionBarns,elasticBarns,energyMeV,numberDensityM3,
  source:{library:data.library,nuclide:data.nuclide,rawSHA256:data.rawSHA256,url:data.url}};
}
