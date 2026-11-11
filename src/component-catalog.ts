export type Component = {id:string; name:string; purpose:string; material:string; basis:string; source?:string};
const illustrative='Conceptual separator asset; materials are illustration choices, not a validated device bill of materials.';
export const separatorComponents:Component[]=[
 {id:'vessel',name:'Vacuum vessel',purpose:'Contains the low-pressure plasma. The model uses an ideal absorbing cylindrical wall; it does not solve vacuum pumping or wall sheaths.',material:'316 stainless steel appearance in this rendering.',basis:illustrative},
 {id:'coils',name:'Solenoid windings',purpose:'Illustrate the coils that supply an axial magnetic field. The slider prescribes B directly; coil current, resistance and cooling are not calculated.',material:'Copper windings; dark formers and cheek plates have an illustrative housing finish.',basis:illustrative},
 {id:'source',name:'Ion source',purpose:'Introduces ions at the source plane. The numerical source is an assumed pulsed distribution, separate from a discharge simulation.',material:'Dark housing finish, stainless-steel cooling fins and nickel-finish mounting bezel.',basis:illustrative},
 {id:'electrodes',name:'Biased source electrodes',purpose:'Illustrate radial potential control. The simulation prescribes the electric potential rather than solving electrode voltages, sheaths or breakdown.',material:'Molybdenum-like finish in the asset recipe.',basis:illustrative},
 {id:'insulators',name:'Electrical insulators',purpose:'Illustrate electrical isolation around electrodes and feedthroughs. No dielectric charging or breakdown is modeled.',material:'Alumina ceramic appearance; conducting terminal tips have a nickel finish.',basis:illustrative},
 {id:'collectors',name:'Annular end collectors',purpose:'Illustrate collection at the downstream end. Computed end collection uses the full end plane, not these individual ring apertures.',material:'316 stainless steel appearance.',basis:illustrative},
 {id:'seals',name:'Seals and supply insulation',purpose:'Illustrate vacuum seals, insulated coil supplies and compliant feet. Their gas permeation, electrical and mechanical behavior are not simulated.',material:'Dark elastomer appearance; the asset recipe labels it Viton. No grade or service qualification is specified.',basis:illustrative},
 {id:'fittings',name:'Flanges and diagnostics',purpose:'Illustrate vacuum joints, fasteners and a diagnostic port. No measurement instrument or vacuum performance is simulated.',material:'Stainless-steel body, nickel-finish fittings and dark cap finish.',basis:illustrative},
 {id:'supports',name:'Supports and mounting',purpose:'Hold the illustrative assembly. They do not participate in the ion trajectory model.',material:'Stainless-steel saddles and feet with dark housing-finish supports and rails.',basis:illustrative},
];
const published='Marathon published beam-driven-fusion architecture. Geometry here is conceptual, not to scale; unspecified construction materials are not inferred.';
export const fusionComponents:Component[]=[
 {id:'rf-source',name:'RF ion source',purpose:'Radio-frequency power ionizes deuterium gas to provide D⁺ ions. Ionization efficiency and molecular-ion fractions are not calculated here.',material:'Deuterium gas and D⁺ plasma. RF conductor, chamber and insulator materials are not specified by the public architecture page.',basis:published},
 {id:'accelerator',name:'Electrostatic acceleration gap',purpose:'An electric potential accelerates D⁺ toward the target: E = eV for singly charged deuterons. Beam optics and voltage breakdown are omitted.',material:'The gap is vacuum; electrode alloys and insulators are publicly unspecified.',basis:published},
 {id:'beam',name:'Deuteron beam',purpose:'Carries accelerated D⁺ into the target. Current sets the incident ion rate I/e. This render marks the vacuum path; the live schematic uses a symbolic line, not a computed beam envelope.',material:'Positively charged deuterium nuclei, not solid material.',basis:published},
 {id:'target',name:'Lithium-tritide target',purpose:'Supplies tritium for D + T → helium-4 + neutron + 17.6 MeV. The coupled scenario evolves depth-dependent isotope loading, stopping and heat with assumed diffusion, release and hydrogen-site renewal. Lithium deposition, erosion and surface chemistry are not solved.',material:'Lithium tritide (LiT). Layer thickness, composition and density are assumed inputs.',basis:'LiT and target regeneration: published Marathon architecture. No measured LiT retention calibration or proprietary construction is inferred. Recycling does not create replacement tritium.',source:'https://www.marathonfusion.com/'},
 {id:'substrate',name:'Cooled substrate',purpose:'Supports the target and removes deposited heat. The coupled model resolves one-dimensional film and backing cell temperatures, thermal contact and boundary cooling. Three-dimensional surface hot spots, coolant flow and target lifetime remain unresolved.',material:'Substrate alloy and coolant are publicly unspecified. The metallic finish and channel layout are illustrative.',basis:published},
 {id:'beamline',name:'Beamline housing',purpose:'Encloses the vacuum beam path and illustrates connections between source and target. Vacuum pressure and structural stresses are not calculated.',material:'Illustrative metallic housing; construction alloys are publicly unspecified.',basis:published},
 {id:'support',name:'Mounting frame',purpose:'Supports the conceptual beamline. It does not affect the beam or loading calculation.',material:'Illustrative metal frame; construction alloy is publicly unspecified.',basis:published},
 {id:'neutrons',name:'Neutron products',purpose:'D–T reactions produce fast neutrons. Rendered rays are symbolic. A separate first-flight explorer calculates finite-sample interception and first interactions, with scattered paths left unresolved; recorded OpenMC references include later collisions.',material:'Free neutrons. The interaction explorer offers assumed coefficients or evaluated hydrogen-1 cross sections at an assumed atom density; neither specifies Marathon shielding.',basis:published},
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
