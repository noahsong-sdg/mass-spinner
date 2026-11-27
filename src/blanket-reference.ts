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
const blanketBasis='The dimensions come from the Alchemy paper §4.1, Table 1, pp.12–14. They describe a published model, not built hardware or original CAD. The D-shaped contour and poloidal layer interpolation are reconstruction assumptions. The model does not include unknown plasma-wall clearance. The paper does not specify coils, cryostat or services. The added outer hardware shows a concept.';
const plantBasis='The tokamak hardware around the published blanket reference shows a concept. Dimensions, coil count, winding technology, materials, supports and service routing are assumptions. They do not describe disclosed Marathon engineering. The model does not calculate magnetic equilibrium, stress, cryogenics or plant heat balance.';
export const blanketComponents=[
 {id:'plasma',name:'D–T plasma / neutron source',purpose:'This D–T plasma supplies fusion neutrons to the proposed blanket. It is not a LiT beam target. The inset envelope marks a location. It does not show calculated equilibrium or optical emission.',material:'Deuterium–tritium plasma. The core shows a concept.',basis:blanketBasis},
 {id:'armor',name:'First-wall armor',purpose:'This layer faces the plasma in the paper model. The simulator does not calculate structural heating or damage.',material:'Tungsten, 5 mm in the paper model.',basis:blanketBasis},
 {id:'structure',name:'Blanket structural layers',purpose:'This structure contains the modeled inner multiplier channel. Compatibility and mechanical qualification need separate engineering studies.',material:'V–4Cr–4Ti alloy: 10 mm inner and 30 mm outer structural layers in the paper model.',basis:blanketBasis},
 {id:'multiplier',name:'Mercury–lithium inner channel',purpose:'This channel provides fast-neutron multiplication and transmutation. Lithium reactions produce tritium. The simulator does not calculate flow or processing.',material:'The neutronics model uses an Hg/Li mixture with 85 at% Hg. The Hg contains 90 at% ¹⁹⁸Hg. The Li contains 90 at% ⁶Li. A practical system does not necessarily mix these fluids directly.',basis:blanketBasis},
 {id:'breeder',name:'Outer breeding blanket',purpose:'The lower-energy neutron spectrum produces tritium in this layer. A tritium breeding ratio (TBR) calculation needs neutron transport.',material:'FLiBe is a molten salt of lithium fluoride and beryllium fluoride. For the reference 210 mm channel, the fixed outer build gives thicknesses of 545 mm inboard and 795 mm outboard.',basis:blanketBasis},
 {id:'tank',name:'Blanket tank',purpose:'This tank contains the modeled blanket assembly. The image does not establish containment performance.',material:'Eurofer97 steel, 30 mm in the paper model.',basis:blanketBasis},
 {id:'tf-coils',name:'Toroidal-field magnets',purpose:'These magnets produce the field around the torus that helps keep the charged plasma inside. The display opening shows the blanket. It does not give a calculated field strength or confinement solution.',material:'The winding and metal case show a concept. Conductor technology and alloys are not specified.',basis:plantBasis},
 {id:'pf-coils',name:'Poloidal coils & central solenoid',purpose:'These coils show plasma shape control and inductive current drive. Their geometry does not establish a stable or steady-state plasma.',material:'The conductors and insulation show a concept. Engineering materials are not specified.',basis:plantBasis},
 {id:'cryostat',name:'Cryostat envelope',purpose:'This enclosure shows vacuum insulation around superconducting magnets. The display opening and transparency show the interior. The model does not calculate cooling or shielding.',material:'The metal enclosure shows a concept. It is not transparent glass or a specified Marathon vessel.',basis:plantBasis},
 {id:'plant-supports',name:'Reactor supports',purpose:'These supports show the load path to a foundation. The model does not calculate structural loads or seismic qualification.',material:'The structural metal shows a concept. Grades and dimensions are not specified.',basis:plantBasis},
 {id:'plant-services',name:'Heat & fuel interfaces',purpose:'These interfaces show blanket heat extraction and fuel processing. Fuel purification can use a separate centrifuge. The model does not calculate plant plumbing, pumping or heat-to-electric conversion.',material:'The metal pipes and service manifolds show a concept. Fluids and operating conditions are not specified.',basis:plantBasis},
];

/** Single-reaction optical-depth reference, not a multiplication/TBR transport model. */
export function blanketOpticalDepth(tau:number){
 if(!Number.isFinite(tau)||tau<0)throw new RangeError('Use a finite nonnegative optical depth.');
 const interceptedFraction=-Math.expm1(-tau);
 return {interceptedFraction,inventoryUtilization:tau===0?1:interceptedFraction/tau};
}

/** Normalized two-parent shutdown batch; initial isomeric mixture is assumed, not calculated. */
export function mercury197Batch(timeHours:number,initialMetastableFraction=0){
 if(!Number.isFinite(timeHours)||timeHours<0)throw new RangeError('Use a finite nonnegative cooldown time in hours.');
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
 if(!Number.isFinite(timeHours)||timeHours<0)throw new RangeError('Use a finite nonnegative cooldown time in hours.');
 const exponent=-Math.LN2*(timeHours/HG197_HALF_LIFE_HOURS);
 return {mercury197:Math.exp(exponent),gold197:-Math.expm1(exponent)};
}

/** Normalized inventory/activity of a separately specified, initially present 195Au impurity. */
export function gold195ResidualFraction(timeDays:number){
 if(!Number.isFinite(timeDays)||timeDays<0)throw new RangeError('Use a finite nonnegative impurity cooldown time in days.');
 return Math.exp(-Math.LN2*(timeDays/AU195_HALF_LIFE_DAYS));
}
