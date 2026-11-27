import {BLANKET_PAPER_CASE as paper,HG197_HALF_LIFE_HOURS,HG197M_HALF_LIFE_HOURS,AU195_HALF_LIFE_DAYS,mercury197Batch,gold195ResidualFraction,blanketOpticalDepth} from './blanket-reference.js';
import {renderPlots} from './laboratory.js';
const element=<K extends keyof HTMLElementTagNameMap>(tag:K,text?:string):HTMLElementTagNameMap[K]=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e;};
const percent=(f:number)=>`${(100*f).toFixed(3)}%`;

/** Independent future-plant reference. No beam-target source output is accepted. */
export function setupBlanketExplorer(host:HTMLElement){
 const panel=element('details'),summary=element('summary','Blanket');panel.className='fusion-model-notes';
 const render=element('div');render.id='blanket-render';
 const note=element('p','This proposed power-plant blanket uses fast D–T neutrons for ¹⁹⁸Hg(n,2n)¹⁹⁷Hg → ¹⁹⁷Au. Neutron multiplication can also increase tritium production through ⁶Li(n,α)T. These reference calculations have no connection to the compact LiT beamline simulation.');
 const reference=element('details'),referenceTitle=element('summary','Published OpenMC case');
 reference.append(referenceTitle,element('p',`The published case uses ${paper.fusionPowerMWth} MWth and a ${paper.channelThicknessMm} mm LiHg channel. Elemental Hg has an atom fraction of ${paper.elementalMercuryAtomFraction*100}%. Hg contains ${paper.mercury198Enrichment*100} at% ¹⁹⁸Hg; Li contains ${paper.lithium6Enrichment*100} at% ⁶Li. The transport calculation gives a tritium breeding ratio (TBR) of ${paper.tritiumBreedingRatio}. Its fixed-composition gold estimate is ${paper.transportGoldKgPerYear} kg/year. The depletion calculation removes ${paper.depletionGoldKgPerYear} kg of gold during one year.`),element('p',`The depletion calculation represents continuous operation with ${paper.depletionSteps} steps of ${paper.stepDays} days. After each step, it removes all Au and replaces it with enriched Hg. These controls do not change the published results.`));
 const source=element('a','Paper §§4.1–4.1.1, pp.12–16 ↗');source.href=paper.source;reference.append(source);
 const controls=element('div'),box=element('div'),label=element('label'),time=element('output'),input=element('input');
 controls.className='instrument-controls';box.className='control';input.id='blanket-cooldown-hours';input.type='range';input.min='0';input.max='500';input.step='1';input.value='0';
 label.htmlFor=input.id;label.append(element('span','Time after irradiation stops'),time);box.append(label,input);controls.append(box);
 const isotopeBox=element('div'),isotopeLabel=element('label'),isotopeOut=element('output'),isotopeInput=element('input');isotopeBox.className='control';
 isotopeInput.id='blanket-isomer-fraction';isotopeInput.type='range';isotopeInput.min='0';isotopeInput.max='1';isotopeInput.step='.01';isotopeInput.value='0';
 isotopeLabel.htmlFor=isotopeInput.id;isotopeLabel.append(element('span','Initial metastable fraction (assumption)'),isotopeOut);isotopeBox.append(isotopeLabel,isotopeInput);controls.append(isotopeBox);
 const assumption=element('p',`The initial batch contains one unit of ¹⁹⁷Hg + ¹⁹⁷ᵐHg and no gold. The ground-state half-life is ${HG197_HALF_LIFE_HOURS} h. The metastable half-life is ${HG197M_HALF_LIFE_HOURS} h; 94.7% becomes ground-state mercury, and 5.3% becomes gold. The model does not include continued production, extraction or neutron burnup. You select the initial mixture; evaluated neutron-spectrum and reaction data are necessary for a prediction.`);
 const metrics=element('div'),mercury=element('output'),metastable=element('output'),gold=element('output'),status=element('p'),plot=element('div');
 metrics.className='fusion-readouts';plot.className='live-plots';status.setAttribute('role','status');
 for(const [title,output]of [['¹⁹⁷Hg',mercury],['¹⁹⁷ᵐHg',metastable],['¹⁹⁷Au',gold]] as const){const row=element('div');row.append(element('span',title),output);metrics.append(row);}
 const update=()=>{
  mercury.textContent='—';metastable.textContent='—';gold.textContent='—';renderPlots(plot,[]);
  try{
   const hours=Number(input.value),fraction=Number(isotopeInput.value),result=mercury197Batch(hours,fraction);time.textContent=`${hours} h`;isotopeOut.textContent=percent(fraction);
   mercury.textContent=percent(result.mercury197);metastable.textContent=percent(result.mercury197m);gold.textContent=percent(result.gold197);
   const x=[...new Set([...Array.from({length:101},(_,i)=>i*5),hours])].sort((a,b)=>a-b);
   const common={x,xLabel:'Post-irradiation cooldown (h)',yLabel:'Fraction of initial batch',yDomain:[0,1] as const,selectedX:hours};
   renderPlots(plot,([['¹⁹⁷Hg parent','mercury197'],['¹⁹⁷ᵐHg parent','mercury197m'],['Stable ¹⁹⁷Au','gold197']] as const).map(([label,key])=>({...common,label,y:x.map(t=>mercury197Batch(t,fraction)[key])})));
   status.textContent='';
  }catch(error){time.textContent='—';isotopeOut.textContent='—';status.textContent=error instanceof Error?error.message:String(error);}
 };
 input.addEventListener('input',update);isotopeInput.addEventListener('input',update);
 const optical=element('details'),opticalControls=element('div'),opticalBox=element('div'),opticalLabel=element('label'),opticalOut=element('output'),opticalInput=element('input'),opticalPlot=element('div');
 opticalControls.className='instrument-controls';opticalBox.className='control';opticalPlot.className='live-plots';opticalInput.id='blanket-optical-depth';opticalInput.type='range';opticalInput.min='0';opticalInput.max='8';opticalInput.step='.05';opticalInput.value='1';
 opticalLabel.htmlFor=opticalInput.id;opticalLabel.append(element('span','Optical depth τ = σ n ℓ (assumption)'),opticalOut);opticalBox.append(opticalLabel,opticalInput);opticalControls.append(opticalBox);
 const opticalStatus=element('p');opticalStatus.setAttribute('role','status');
 const updateOptical=()=>{renderPlots(opticalPlot,[]);try{
  const tau=Number(opticalInput.value),result=blanketOpticalDepth(tau);opticalOut.textContent=tau.toFixed(2);
  opticalStatus.textContent=`Reaction fraction η = ${percent(result.interceptedFraction)} · utilization Ξ = ${result.inventoryUtilization.toFixed(4)}`;
  const x=[...new Set([...Array.from({length:81},(_,i)=>i/10),tau])].sort((a,b)=>a-b),common={x,xLabel:'Optical depth τ (assumption)',yLabel:'Dimensionless reference factor',selectedX:tau,yDomain:[0,1] as const};
  renderPlots(opticalPlot,[{...common,label:'Reaction fraction η',y:x.map(t=>blanketOpticalDepth(t).interceptedFraction)},{...common,label:'Utilization Ξ = η / τ',y:x.map(t=>blanketOpticalDepth(t).inventoryUtilization)}]);
 }catch(error){opticalOut.textContent='—';opticalStatus.textContent=error instanceof Error?error.message:String(error);}};
 const opticalInfo=element('details');opticalInfo.append(element('summary','Model info'),element('p','This slab reference uses one reaction and a constant cross section: η = 1 − exp(−τ), Ξ = η/τ, with Ξ(0) = 1. It specifies no dimensional cross section. It does not calculate neutron multiplication, scattering, TBR or yield for a LiHg blanket. The published TBR and yield stay fixed.'));
 opticalInput.addEventListener('input',updateOptical);optical.append(element('summary','Capture & utilization'),opticalControls,opticalStatus,opticalPlot,opticalInfo);updateOptical();
 const impurity=element('details'),impurityPlot=element('div');impurityPlot.className='live-plots';
 impurity.append(element('summary','¹⁹⁵Au cooldown'),element('p',`The ¹⁹⁵Au impurity has a longer half-life: ${AU195_HALF_LIFE_DAYS} days. This separate curve starts at one for its own inventory and activity. It does not give the concentration, dose or purity of the Hg batch.`),impurityPlot);
 const days=Array.from({length:101},(_,i)=>i*AU195_HALF_LIFE_DAYS/10);
 renderPlots(impurityPlot,[{label:'Initial ¹⁹⁵Au impurity',x:days,y:days.map(gold195ResidualFraction),xLabel:'Separate impurity cooldown (days)',yLabel:'Fraction of initial ¹⁹⁵Au inventory/activity',yDomain:[0,1]}]);
 const scope=element('details');scope.append(element('summary','Model info'),note,assumption,element('p','This calculation gives analytic decay curves. It does not calculate product purity, usable yield or a release date.'),element('p','Neutron multiplication, parasitic capture, leakage and changes in neutron energy affect breeding and transmutation. TBR = tritium born / tritium consumed. This reference does not calculate that balance. Fuel recycling recovers existing tritium; breeding produces new tritium nuclei.'),element('p','More blanket material can increase the fraction of neutrons that interact but decrease output per unit of material. Wall heat, enrichment, extraction history and impurity decay limit the output. Economic breakeven depends on prices, market size, energy costs and sales delays; electrical breakeven depends on the energy balance. Qbeam here is different from future-plasma Qplas. Mercury compatibility, containment and procedures for activated material remain engineering requirements.'),element('p','The decay curves use analytic solutions. The OpenMC case gives published results. The blanket and fuel cycle have process descriptions only. This page does not calculate transport, regeneration kinetics, irradiation products or economics.'));
 const decayData=element('p','The inputs combine older paper/ENSDF half-lives with a rounded modern isomer branching fraction. They do not form one current evaluated dataset. For ¹⁹⁷Hg, ENSDF (2005) gives 64.14(5) h and NUBASE2020 gives 64.93(7) h. This difference changes the cooldown curve. The curve has no uncertainty band. ');
 const ensdf=element('a','ENSDF ↗'),nubase=element('a','NUBASE2020 ↗');ensdf.href='https://www.nndc.bnl.gov/nudat3/getdecaydataset.jsp?dsid=197hg+it+decay+%2823.8+h%29&nucleus=197HG';nubase.href='https://www-nds.iaea.org/amdc/ame2020/nubase_4.mas20.txt';decayData.append(ensdf,document.createTextNode(' · '),nubase);scope.append(decayData);
 const broader=element('a','Isotope Production in Fusion Systems: §§II–V and Eq.3 ↗');broader.href='https://arxiv.org/html/2512.09242v2';scope.append(element('p','An asymmetric neutron wall load can improve feedstock utilization. This page gives a reference only; it does not calculate spin polarization or angular transport.'),element('p','Other Marathon pathways have references only. These include fusion-material irradiation and ²²⁶Ra(n,2n)²²⁵Ra, then decay to ²²⁵Ac. They also include fuel purification, compression, reinjection and higher-power beams for future plasma heating. This page does not calculate their spectra, reaction networks, inventories or efficiencies.'),broader);
 const coverageLink=element('a','Model coverage ↗');coverageLink.href='/CORE-COVERAGE.md';scope.append(coverageLink);
 panel.append(summary,render,reference,element('h3','Cooldown'),controls,metrics,status,plot,optical,impurity,scope);host.append(panel);update();
 return {panel,render};
}
