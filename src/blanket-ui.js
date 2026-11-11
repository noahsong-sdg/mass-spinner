import {BLANKET_PAPER_CASE as paper,HG197_HALF_LIFE_HOURS,HG197M_HALF_LIFE_HOURS,AU195_HALF_LIFE_DAYS,mercury197Batch,gold195ResidualFraction,blanketOpticalDepth} from './blanket-reference.ts';
import {renderPlots} from './laboratory.js';
const element=(tag,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e;};
const percent=f=>`${(100*f).toFixed(3)}%`;

/** Independent future-plant reference. No beam-target source output is accepted. */
export function setupBlanketExplorer(host){
 const panel=element('details'),summary=element('summary','Blanket');panel.className='fusion-model-notes';
 const render=element('div');render.id='blanket-render';
 const note=element('p','Separate proposed power-plant blanket: fast D–T neutrons drive ¹⁹⁸Hg(n,2n)¹⁹⁷Hg → ¹⁹⁷Au. Multiplication can also support ⁶Li(n,α)T breeding. This is a reference and decay explorer, not a coupled simulation of the compact LiT beamline.');
 const reference=element('details'),referenceTitle=element('summary','Published OpenMC case');
 reference.append(referenceTitle,element('p',`${paper.fusionPowerMWth} MWth; ${paper.channelThicknessMm} mm LiHg channel; ${paper.elementalMercuryAtomFraction*100} at% elemental Hg. Hg is ${paper.mercury198Enrichment*100} at% ¹⁹⁸Hg and Li ${paper.lithium6Enrichment*100} at% ⁶Li. Frozen transport TBR ${paper.tritiumBreedingRatio}; ${paper.transportGoldKgPerYear} kg Au/year static estimate; ${paper.depletionGoldKgPerYear} kg removed in the depletion year.`),element('p',`The depletion scenario approximates continuous operation with ${paper.depletionSteps} × ${paper.stepDays} day steps, extracting all Au and replacing it with enriched Hg after each step. These figures are not recalculated by the controls here.`));
 const source=element('a','Paper §§4.1–4.1.1, pp.12–16 ↗');source.href=paper.source;reference.append(source);
 const controls=element('div'),box=element('div'),label=element('label'),time=element('output'),input=element('input');
 controls.className='instrument-controls';box.className='control';input.id='blanket-cooldown-hours';input.type='range';input.min=0;input.max=500;input.step=1;input.value=0;
 label.htmlFor=input.id;label.append(element('span','Time after irradiation stops'),time);box.append(label,input);controls.append(box);
 const isotopeBox=element('div'),isotopeLabel=element('label'),isotopeOut=element('output'),isotopeInput=element('input');isotopeBox.className='control';
 isotopeInput.id='blanket-isomer-fraction';isotopeInput.type='range';isotopeInput.min=0;isotopeInput.max=1;isotopeInput.step=.01;isotopeInput.value=0;
 isotopeLabel.htmlFor=isotopeInput.id;isotopeLabel.append(element('span','Initial metastable fraction (assumed)'),isotopeOut);isotopeBox.append(isotopeLabel,isotopeInput);controls.append(isotopeBox);
 const assumption=element('p',`One initial unit of ¹⁹⁷Hg + ¹⁹⁷ᵐHg, zero gold. Ground-state half-life ${HG197_HALF_LIFE_HOURS} h; metastable ${HG197M_HALF_LIFE_HOURS} h, with 94.7% feeding ground state and 5.3% decaying to gold. No continuing production, extraction or neutron burnup. The initial mixture is assumed; evaluated spectrum/reaction data are needed to predict it.`);
 const metrics=element('div'),mercury=element('output'),metastable=element('output'),gold=element('output'),status=element('p'),plot=element('div');
 metrics.className='fusion-readouts';plot.className='live-plots';status.setAttribute('role','status');
 for(const [title,output]of [['¹⁹⁷Hg',mercury],['¹⁹⁷ᵐHg',metastable],['¹⁹⁷Au',gold]]){const row=element('div');row.append(element('span',title),output);metrics.append(row);}
 const update=()=>{
  mercury.textContent='—';metastable.textContent='—';gold.textContent='—';plot.replaceChildren();
  try{
   const hours=Number(input.value),fraction=Number(isotopeInput.value),result=mercury197Batch(hours,fraction);time.textContent=`${hours} h`;isotopeOut.textContent=percent(fraction);
   mercury.textContent=percent(result.mercury197);metastable.textContent=percent(result.mercury197m);gold.textContent=percent(result.gold197);
   const x=[...new Set([...Array.from({length:101},(_,i)=>i*5),hours])].sort((a,b)=>a-b);
   const common={x,xLabel:'Post-irradiation cooldown (h)',yLabel:'Fraction of initial batch',yDomain:[0,1],selectedX:hours};
   renderPlots(plot,[['¹⁹⁷Hg parent','mercury197'],['¹⁹⁷ᵐHg parent','mercury197m'],['Stable ¹⁹⁷Au','gold197']].map(([label,key])=>({...common,label,y:x.map(t=>mercury197Batch(t,fraction)[key])})));
   status.textContent='';
  }catch(error){time.textContent='—';isotopeOut.textContent='—';status.textContent=error.message;}
 };
 input.addEventListener('input',update);isotopeInput.addEventListener('input',update);
 const optical=element('details'),opticalControls=element('div'),opticalBox=element('div'),opticalLabel=element('label'),opticalOut=element('output'),opticalInput=element('input'),opticalPlot=element('div');
 opticalControls.className='instrument-controls';opticalBox.className='control';opticalPlot.className='live-plots';opticalInput.id='blanket-optical-depth';opticalInput.type='range';opticalInput.min=0;opticalInput.max=8;opticalInput.step=.05;opticalInput.value=1;
 opticalLabel.htmlFor=opticalInput.id;opticalLabel.append(element('span','Assumed optical depth τ = σ n ℓ'),opticalOut);opticalBox.append(opticalLabel,opticalInput);opticalControls.append(opticalBox);
 const opticalStatus=element('p');opticalStatus.setAttribute('role','status');
 const updateOptical=()=>{opticalPlot.replaceChildren();try{
  const tau=Number(opticalInput.value),result=blanketOpticalDepth(tau);opticalOut.textContent=tau.toFixed(2);
  opticalStatus.textContent=`Reaction fraction η = ${percent(result.interceptedFraction)} · utilization Ξ = ${result.inventoryUtilization.toFixed(4)}`;
  const x=[...new Set([...Array.from({length:81},(_,i)=>i/10),tau])].sort((a,b)=>a-b),common={x,xLabel:'Assumed optical depth τ',yLabel:'Dimensionless reference factor',selectedX:tau,yDomain:[0,1]};
  renderPlots(opticalPlot,[{...common,label:'Reaction fraction η',y:x.map(t=>blanketOpticalDepth(t).interceptedFraction)},{...common,label:'Utilization Ξ = η / τ',y:x.map(t=>blanketOpticalDepth(t).inventoryUtilization)}]);
 }catch(error){opticalOut.textContent='—';opticalStatus.textContent=error.message;}};
 const opticalInfo=element('details');opticalInfo.append(element('summary','Model info'),element('p','Idealized single-reaction, constant-cross-section slab: η = 1 − exp(−τ), Ξ = η/τ, with Ξ(0) = 1. No dimensional cross section is assumed here. This does not compute multiplication, scattering, TBR or yield for a real LiHg blanket. Frozen paper TBR and yield remain unchanged.'));
 opticalInput.addEventListener('input',updateOptical);optical.append(element('summary','Capture & utilization'),opticalControls,opticalStatus,opticalPlot,opticalInfo);updateOptical();
 const impurity=element('details'),impurityPlot=element('div');impurityPlot.className='live-plots';
 impurity.append(element('summary','¹⁹⁵Au cooldown'),element('p',`Any initially present ¹⁹⁵Au impurity decays much more slowly (${AU195_HALF_LIFE_DAYS} days). This separate curve normalizes its own initial inventory/activity to one; it is not a predicted concentration, dose or purity of the Hg batch above.`),impurityPlot);
 const days=Array.from({length:101},(_,i)=>i*AU195_HALF_LIFE_DAYS/10);
 renderPlots(impurityPlot,[{label:'Initial ¹⁹⁵Au impurity',x:days,y:days.map(gold195ResidualFraction),xLabel:'Separate impurity cooldown (days)',yLabel:'Fraction of initial ¹⁹⁵Au inventory/activity',yDomain:[0,1]}]);
 const scope=element('details');scope.append(element('summary','Model info'),note,assumption,element('p','Analytic decay only; no product purity, usable yield or release date is calculated.'),element('p','Neutron multiplication, parasitic capture, leakage and spectral slowing jointly determine breeding and transmutation. TBR = tritium born / tritium consumed; this explorer does not solve that budget. Fuel recycling recovers existing tritium; breeding creates replacement nuclei.'),element('p','More blanket inventory can intercept more neutrons while reducing output per unit inventory. Wall heat, enrichment, extraction history and impurity decay constrain practical output. Economic breakeven differs from electrical breakeven; price, market size, energy costs and delayed sales are conditional assumptions. Qbeam here is not future-plasma Qplas. Mercury compatibility, containment and activated-material handling remain engineering requirements.'),element('p','Coverage: decay = analytic reference; OpenMC case = published result; blanket/fuel cycle = process explanation; transport, regeneration kinetics, irradiation products and economics = not modeled.'));
 const decayData=element('p','Decay inputs retain legacy paper/ENSDF half-lives with a rounded modern isomer branch; they are not one current evaluated dataset. For ¹⁹⁷Hg, ENSDF (2005) gives 64.14(5) h and NUBASE2020 gives 64.93(7) h. This evaluation conflict changes the cooldown curve; no uncertainty band is calculated. ');
 const ensdf=element('a','ENSDF ↗'),nubase=element('a','NUBASE2020 ↗');ensdf.href='https://www.nndc.bnl.gov/nudat3/getdecaydataset.jsp?dsid=197hg+it+decay+%2823.8+h%29&nucleus=197HG';nubase.href='https://www-nds.iaea.org/amdc/ame2020/nubase_4.mas20.txt';decayData.append(ensdf,document.createTextNode(' · '),nubase);scope.append(decayData);
 const broader=element('a','Isotope Production in Fusion Systems: §§II–V and Eq.3 ↗');broader.href='https://arxiv.org/html/2512.09242v2';scope.append(element('p','Asymmetric neutron wall loading can improve feedstock utilization, but is reference-only here; no spin polarization or angular transport is solved.'),element('p','Other Marathon pathways remain references: neutron irradiation of fusion materials; ²²⁶Ra(n,2n)²²⁵Ra followed by decay toward ²²⁵Ac; fuel purification/compression and reinjection; and higher-power beams for future plasma heating. Their spectra, reaction networks, inventories and engineering efficiencies are not calculated here.'),broader);
 const coverageLink=element('a','Coverage: interactive, reference and unresolved physics ↗');coverageLink.href='/CORE-COVERAGE.md';scope.append(coverageLink);
 panel.append(summary,render,reference,element('h3','Cooldown'),controls,metrics,status,plot,optical,impurity,scope);host.append(panel);update();
 return {panel,render};
}
