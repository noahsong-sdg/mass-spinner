/** Published reference, not live neutronics and never coupled to the beam-target engine. */
export const BLANKET_PAPER_CASE=Object.freeze({
 fusionPowerMWth:1500,channelThicknessMm:210,elementalMercuryAtomFraction:.85,
 mercury198Enrichment:.90,lithium6Enrichment:.90,tritiumBreedingRatio:1.19,
 transportGoldKgPerYear:2953,depletionGoldKgPerYear:2909,
 depletionSteps:24,stepDays:15.22,
 source:'https://www.marathonfusion.com/alchemy.pdf#page=12',
});
// Legacy paper/ENSDF half-lives are retained for this reference, not advertised
// as one current evaluated dataset. NUBASE2020 instead gives 197Hg 64.93(7) h,
// 195Au 186.01(6) d and 197mHg 23.82(4) h; its 94.68(9)% IT branch rounds below.
// https://www-nds.iaea.org/amdc/ame2020/nubase_4.mas20.txt
export const HG197_HALF_LIFE_HOURS=64.14;
export const AU195_HALF_LIFE_DAYS=186.10;
export const HG197M_HALF_LIFE_HOURS=23.8;
export const HG197M_IT_BRANCH=.947;
const blanketBasis='Alchemy paper §4.1, p.12: representative OpenMC geometry, not compact beamline hardware. Illustration is not to scale.';
export const blanketComponents=[
 {id:'plasma',name:'D–T plasma / neutron source',purpose:'Source of fusion neutrons for the proposed blanket; not a LiT beam target.',material:'Deuterium–tritium plasma; the shown core is conceptual.',basis:blanketBasis},
 {id:'armor',name:'First-wall armor',purpose:'Plasma-facing layer in the paper model; structural heating and damage are not solved here.',material:'Tungsten, 5 mm in the paper model.',basis:blanketBasis},
 {id:'structure',name:'Blanket structural layers',purpose:'Bounds the modeled inner multiplier channel. Compatibility and mechanical qualification remain engineering tasks.',material:'V–4Cr–4Ti alloy: 10 mm inner and 30 mm outer structural layers in the paper model.',basis:blanketBasis},
 {id:'multiplier',name:'Mercury–lithium inner channel',purpose:'Fast-neutron multiplication and transmutation, with lithium contributing to breeding. Flow and processing are not simulated.',material:'Hg/Li mixture in the neutronics model; reference case 85 at% Hg, with Hg 90 at% ¹⁹⁸Hg and Li 90 at% ⁶Li. Practical fluids need not be directly mixed.',basis:blanketBasis},
 {id:'breeder',name:'Outer breeding blanket',purpose:'Uses the softened neutron spectrum to breed tritium; actual TBR requires neutron transport.',material:'FLiBe, a lithium-fluoride/beryllium-fluoride molten salt, in the paper model.',basis:blanketBasis},
 {id:'tank',name:'Blanket tank',purpose:'Contains the modeled blanket assembly; this render does not establish containment performance.',material:'Eurofer97 steel, 30 mm in the paper model.',basis:blanketBasis},
];

/** Single-reaction optical-depth reference, not a multiplication/TBR transport model. */
export function blanketOpticalDepth(tau:number){
 if(!Number.isFinite(tau)||tau<0)throw new RangeError('Optical depth requires a finite nonnegative value.');
 const interceptedFraction=-Math.expm1(-tau);
 return {interceptedFraction,inventoryUtilization:tau===0?1:interceptedFraction/tau};
}

/** Normalized two-parent shutdown batch; initial isomeric mixture is assumed, not calculated. */
export function mercury197Batch(timeHours:number,initialMetastableFraction=0){
 if(!Number.isFinite(timeHours)||timeHours<0)throw new RangeError('Cooldown requires finite nonnegative hours.');
 if(!Number.isFinite(initialMetastableFraction)||initialMetastableFraction<0||initialMetastableFraction>1)
  throw new RangeError('Initial metastable fraction must lie between zero and one.');
 const f=initialMetastableFraction,lg=Math.LN2/HG197_HALF_LIFE_HOURS,lm=Math.LN2/HG197M_HALF_LIFE_HOURS;
 const groundSurvival=Math.exp(-lg*timeHours),metastableSurvival=Math.exp(-lm*timeHours);
 const metastableDecayed=-Math.expm1(-lm*timeHours);
 const groundFromMetastable=HG197M_IT_BRANCH*f*lm/(lm-lg)*groundSurvival*(-Math.expm1(-(lm-lg)*timeHours));
 const mercury197=(1-f)*groundSurvival+groundFromMetastable,mercury197m=f*metastableSurvival;
 const gold197=(1-f)*(-Math.expm1(-lg*timeHours))+(1-HG197M_IT_BRANCH)*f*metastableDecayed
  +HG197M_IT_BRANCH*f*metastableDecayed-groundFromMetastable;
 return {mercury197,mercury197m,gold197};
}

/** One initial ground-state 197Hg atom-equivalent; source off, no isomer, extraction or burnup. */
export function mercury197GroundStateBatch(timeHours:number){
 if(!Number.isFinite(timeHours)||timeHours<0)throw new RangeError('Cooldown requires finite nonnegative hours.');
 const exponent=-Math.LN2*(timeHours/HG197_HALF_LIFE_HOURS);
 return {mercury197:Math.exp(exponent),gold197:-Math.expm1(exponent)};
}

/** Normalized inventory/activity of a separately specified, initially present 195Au impurity. */
export function gold195ResidualFraction(timeDays:number){
 if(!Number.isFinite(timeDays)||timeDays<0)throw new RangeError('Impurity cooldown requires finite nonnegative days.');
 return Math.exp(-Math.LN2*(timeDays/AU195_HALF_LIFE_DAYS));
}
