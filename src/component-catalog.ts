export type Component = {id:string; name:string; purpose:string; material:string; basis:string; source?:string};
const illustrative='This separator shows a possible construction. Its materials do not come from a verified device parts list.';
export const separatorComponents:Component[]=[
 {id:'vessel',name:'Vacuum vessel',purpose:'Contains the low-pressure plasma. The cylindrical wall absorbs particles. The model does not calculate vacuum pumping or wall sheaths, the thin charged layers at walls.',material:'316 stainless steel appearance.',basis:illustrative},
 {id:'coils',name:'Solenoid windings',purpose:'Show the coils that supply an axial magnetic field. The slider sets B directly. The model does not calculate coil current, resistance or cooling.',material:'Copper windings with dark formers and end plates. The finish is for the illustration.',basis:illustrative},
 {id:'source',name:'Ion source',purpose:'Supplies an ion pulse at the source plane. The model uses a specified velocity distribution. It does not calculate the discharge.',material:'Dark housing, stainless-steel cooling fins and a nickel-finish mounting bezel.',basis:illustrative},
 {id:'electrodes',name:'Biased source electrodes',purpose:'Show electrodes for radial potential control. The model uses a specified electric potential. It does not calculate electrode voltages, sheaths or electrical breakdown.',material:'Molybdenum appearance.',basis:illustrative},
 {id:'insulators',name:'Electrical insulators',purpose:'Give electrical isolation around electrodes and feedthroughs. The model does not calculate dielectric charging or electrical breakdown.',material:'Alumina ceramic appearance with nickel-finish conducting terminals.',basis:illustrative},
 {id:'collectors',name:'Annular end collectors',purpose:'Show collection at the downstream end. The calculation counts arrivals across the full end plane, not the individual ring openings.',material:'316 stainless steel appearance.',basis:illustrative},
 {id:'seals',name:'Seals and supply insulation',purpose:'Show vacuum seals, insulated coil supplies and flexible feet. The model does not calculate their gas permeation, electrical properties or mechanical properties.',material:'Dark elastomer appearance, named Viton in the asset recipe. The grade and service limits are not specified.',basis:illustrative},
 {id:'fittings',name:'Flanges and diagnostics',purpose:'Show vacuum joints, fasteners and a measurement port. The model does not calculate instrument response or vacuum performance.',material:'Stainless-steel body with nickel-finish fittings and dark caps.',basis:illustrative},
 {id:'supports',name:'Supports and mounting',purpose:'Hold the assembly. They do not change the calculated ion paths.',material:'Stainless-steel saddles and feet with dark supports and rails.',basis:illustrative},
];
const published='Marathon published this beam-driven fusion arrangement. This illustration is not to scale. Construction materials are unknown unless a source specifies them.';
export const fusionComponents:Component[]=[
 {id:'rf-source',name:'RF ion source',purpose:'Radio-frequency (RF) power ionizes deuterium gas to supply D⁺ ions. The model does not calculate ionization efficiency or molecular-ion fractions.',material:'Deuterium gas and D⁺ plasma. The public page does not specify the RF conductor, chamber or insulator materials.',basis:published},
 {id:'accelerator',name:'Electrostatic acceleration gap',purpose:'An electric potential accelerates D⁺ to the target: E = eV for singly charged deuterons. The model does not calculate beam optics or electrical breakdown.',material:'The gap contains vacuum. The public page does not specify electrode alloys or insulators.',basis:published},
 {id:'beam',name:'Deuteron beam',purpose:'Carries accelerated D⁺ into the target. Current sets the incident ion rate I/e. The illustration shows the vacuum path, not a calculated beam envelope.',material:'Positively charged deuterium nuclei, not solid material.',basis:published},
 {id:'target',name:'Lithium-tritide target',purpose:'Supplies tritium for D + T → helium-4 + neutron + 17.6 MeV. The coupled model calculates changes in isotope loading, stopping and heat through the target depth. Diffusion, release and hydrogen-site renewal coefficients are inputs. The model does not calculate lithium deposition, erosion or surface chemistry.',material:'Lithium tritide (LiT). Layer thickness, composition and density are inputs without measurement data.',basis:'Marathon publishes LiT and target regeneration as design features. Measured LiT retention and private construction details are unknown. Recycling does not create replacement tritium.',source:'https://www.marathonfusion.com/'},
 {id:'substrate',name:'Cooled substrate',purpose:'Supports the target and removes deposited heat. The coupled model calculates temperature through the film and backing depth, with thermal contact and boundary cooling. It does not calculate three-dimensional hot spots, coolant flow or target life.',material:'The public page does not specify the substrate alloy or coolant. The metal finish and channel arrangement are for the illustration.',basis:published},
 {id:'beamline',name:'Beamline housing',purpose:'Contains the vacuum beam path and shows connections between the source and target. The model does not calculate vacuum pressure or structural stress.',material:'Metal appearance. The public page does not specify construction alloys.',basis:published},
 {id:'support',name:'Mounting frame',purpose:'Supports the beamline. It does not change the beam or loading calculation.',material:'Metal appearance. The public page does not specify the construction alloy.',basis:published},
 {id:'neutrons',name:'Neutron products',purpose:'D–T reactions produce fast neutrons. The drawn rays show possible directions. The separate first-flight calculation samples intersections and first interactions. It does not follow scattered paths. Saved OpenMC reference runs include later collisions.',material:'Free neutrons. The interaction calculation uses specified coefficients or evaluated hydrogen-1 cross sections at a specified atom density. These inputs do not specify Marathon shielding.',basis:published},
];
/** glTF loaders sanitize Blender names; normalize both spellings without guessing materials. */
export function separatorComponentId(name:string):string|null{
 const n=name.toLowerCase().replace(/[^a-z]+/g,' ').trim();
 if(/electrode insulator|electrical break|ceramic feedthrough|feedthrough terminal/.test(n))return 'insulators';
 if(/biased source electrode/.test(n))return 'electrodes';
 if(/end collector/.test(n))return 'collectors';
 if(/seal line|insulated coil supply|levelling foot/.test(n))return 'seals';
 if(/copper winding|solenoid|coil terminal|coil power/.test(n))return 'coils';
 if(/source body|source cooling|source mounting/.test(n))return 'source';
 if(/vessel exterior|vessel rear/.test(n))return 'vessel';
 if(/vessel support|saddle|support foot|foot fixing|mounting rail/.test(n))return 'supports';
 if(/flange|fastener|diagnostic|concentric groove/.test(n))return 'fittings';
 return null;
}
