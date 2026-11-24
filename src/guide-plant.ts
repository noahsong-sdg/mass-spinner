const stages=[
 {title:'Prepare the blanket and initial fuel',where:'Before startup',reading:'The centrifuge supplies enriched lithium for the blanket. A separate initial tritium supply joins deuterium fuel. Cooling, vacuum and power systems must be ready before fusion starts.',result:'Lithium stays in the blanket. Deuterium and tritium go to the fusion chamber.',regions:['lithium'],routes:['feed'],reaction:'Separate equipment · separate materials'},
 {title:'Supply energy and start D–T fusion',where:'Fusion chamber',reading:'External equipment supplies energy to the fuel. Fusion combines deuterium and tritium. Helium and a fast neutron carry the released nuclear energy.',result:'Fusion supplies the neutrons for the blanket. A neutron does not start D–T fusion by striking the centrifuge gas.',regions:['core'],routes:['feed'],reaction:'D + T → ⁴He + n · 17.6 MeV released'},
 {title:'Multiply neutrons in the optional mercury layer',where:'Mercury layer around the chamber',reading:'A sufficiently energetic neutron can convert mercury-198 into mercury-197 and release two neutrons. This reaction consumes kinetic energy. It does not make tritium.',result:'Mercury-197 later becomes gold-197 through electron capture. The ground-state half-life is about 64 hours; an excited state also contributes.',regions:['mercury'],routes:[],reaction:'¹⁹⁸Hg + n → ¹⁹⁷Hg + 2n · later: ¹⁹⁷Hg → ¹⁹⁷Au'},
 {title:'Breed replacement tritium',where:'Lithium-bearing blanket',reading:'A neutron reacts with lithium-6 and produces tritium and helium-4. The new tritium starts inside the breeding material, outside the fusion chamber.',result:'Neutron scattering, leakage and absorption compete with these reactions. One fusion neutron does not guarantee two usable tritium atoms.',regions:['lithium'],routes:[],reaction:'⁶Li + n → T + ⁴He · about 4.8 MeV released'},
 {title:'Extract and process the new tritium',where:'Blanket → extraction unit → fuel processing',reading:'Tritium must leave the breeding material. An extraction unit collects it. Fuel processing removes impurities and prepares hydrogen isotopes for storage and fuel delivery.',result:'Extraction takes time and can lose fuel. The new tritium does not travel directly through the wall into the plasma.',regions:['lithium'],routes:['extraction','return'],reaction:'New T in material → recovered hydrogen fuel'},
 {title:'Remove heat and generate electricity',where:'Chamber and blanket → coolant → generator',reading:'Particles deposit energy in the chamber and blanket. Coolant removes recoverable heat. A power-conversion system changes part of that heat into electricity.',result:'Some heat goes to the heat sink. Some electricity operates the plant. Only the remainder can go to the grid.',regions:['core','mercury','lithium'],routes:['heat','electric'],reaction:'Recoverable thermal power × efficiency − plant electric use = net electric output'},
 {title:'Operate the loops together',where:'The operating plant',reading:'Fusion, breeding, extraction, cooling and exhaust recovery operate together after startup. Returned exhaust contains fuel that did not burn. Breeding supplies new tritium.',result:'Usable bred tritium must cover consumption, losses and decay over time. Reserves cover startup and processing delays.',regions:['core','mercury','lithium'],routes:['feed','extraction','return','exhaust','heat','electric'],reaction:'New fuel + returned fuel → continued fusion'},
] as const;
const label=(x:number,y:number,text:string)=>`<text x="${x}" y="${y}" text-anchor="middle">${text}</text>`;
const equipment=(x:number,y:number,w:number,name:string)=>`<rect x="${x}" y="${y}" width="${w}" height="40" rx="5"/>${label(x+w/2,y+25,name)}`;
const path=(id:string,d:string,kind='fuel')=>`<path data-plant-route="${id}" class="plant-route plant-${kind}" d="${d}" marker-end="url(#plant-${kind})"/>`;
export function plantCycleDiagram(){
 return `<figure class="plant-cycle" data-plant-cycle data-motion="paused">
 <div class="drive-heading"><span>From startup to continued operation</span><button type="button" data-plant-motion disabled>Play paths</button></div>
 <p data-plant-position>1 of ${stages.length} · ${stages[0].where}</p><h3 data-plant-title>${stages[0].title}</h3>
 <p data-plant-reading aria-live="polite">${stages[0].reading}</p>
 <div class="plant-views"><svg viewBox="0 0 360 340" role="img" aria-labelledby="plant-section-title plant-section-description">
 <title id="plant-section-title">Separate chamber, mercury layer and lithium blanket</title><desc id="plant-section-description">A generic section through the chamber and surrounding layers. Mercury is an optional multiplier proposed by Marathon. The centrifuge is separate equipment. This drawing does not specify the shape of a confinement device.</desc>
 <g data-plant-region="lithium" class="is-active"><circle cx="180" cy="175" r="112" class="plant-breeder"/>${label(180,42,'Lithium-bearing blanket')}</g>
 <g data-plant-region="mercury"><circle cx="180" cy="175" r="86" class="plant-mercury"/>${label(180,75,'Optional mercury layer')}</g>
 <g data-plant-region="core"><circle cx="180" cy="175" r="62" class="plant-core"/>${label(180,164,'Fusion chamber')}${label(180,187,'D + T')}</g>
 <path d="M180 47V63M180 81V89" class="plant-leader"/>
 <g data-plant-scene="prepare">${label(180,315,'Separate centrifuge → enriched lithium')}</g>
 <g data-plant-scene="fusion" hidden><circle cx="165" cy="205" r="8" class="plant-helium"/>${label(130,230,'⁴He')}
 <path d="M195 175H244" class="plant-neutron"/><circle cx="222" cy="175" r="5" class="plant-neutron-dot"/>${label(218,150,'n')}</g>
 <g data-plant-scene="multiply" hidden><path d="M194 175H247M247 175L277 140M247 175L277 210" class="plant-neutron"/>
 <circle cx="247" cy="175" r="7" class="plant-neutron-dot"/>${label(217,152,'1 n')}${label(305,175,'2 n')}${label(180,315,'Mercury-197 → decay → gold-197')}</g>
 <g data-plant-scene="breed" hidden><path d="M243 175H281" class="plant-neutron"/><circle cx="277" cy="175" r="7" class="plant-tritium"/>${label(307,182,'T')}${label(180,315,'New T is inside the blanket material.')}</g>
 <g data-plant-scene="extract" hidden><circle cx="277" cy="175" r="7" class="plant-tritium"/><path d="M284 175H335" class="plant-fuel"/>${label(300,150,'New T out')}${label(180,315,'See the extraction example below.')}</g>
 <g data-plant-scene="heat" hidden>${[105,175,245].map(y=>`<path d="M290 ${y}H338" class="plant-heat"/>`).join('')}${label(180,315,'Coolant removes deposited energy.')}</g>
 <g data-plant-scene="operate" hidden>${label(180,315,'Processes now operate together.')}</g>
 </svg><svg viewBox="0 0 360 340" role="img" aria-labelledby="plant-loops-title plant-loops-description">
 <title id="plant-loops-title">Fuel and energy paths outside the chamber</title><desc id="plant-loops-description">Initial fuel enters the chamber. New tritium passes through extraction and fuel processing. Unburned exhaust has a separate return path. Heat goes to a generator and a heat sink. Electricity supplies the plant and the grid.</desc>
 <defs>${['fuel','heat','electric','neutron'].map(kind=>`<marker id="plant-${kind}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0L10 5L0 10Z" class="plant-${kind}-head"/></marker>`).join('')}</defs>
 ${equipment(20,10,140,'Initial D + T')}${equipment(20,90,140,'Chamber')}${equipment(200,90,140,'Fuel processing')}${equipment(200,175,140,'T extraction')}
 ${equipment(20,260,140,'Generator')}${equipment(200,260,140,'Plant / grid')}
 ${path('feed','M90 50V84')}${path('exhaust','M160 100H194')}${path('return','M270 90V65H145V84')}${path('extraction','M270 175V136')}
 ${label(270,235,'New T from blanket')}${path('extraction','M270 220V216')}
 ${path('heat','M90 130V254','heat')}${label(110,202,'Coolant')}${path('electric','M160 280H194','electric')}
 ${label(90,324,'↓ Heat sink')}${label(180,152,'Unburned exhaust →')}${label(270,48,'Fuel return')}
 </svg></div>
 <p class="plant-reaction" data-plant-reaction>${stages[0].reaction}</p><p data-plant-result>${stages[0].result}</p>
 <div class="plant-navigation"><button type="button" data-plant-previous disabled>Previous</button><button type="button" data-plant-next disabled>Next: start fusion</button></div>
 <figcaption>Generic D–T plant with Marathon’s proposed mercury layer. The sequence gives dependencies, not a clock. Path motion gives direction, not rate. No plant performance is calculated.</figcaption></figure>`;
}
const extractionMethods=[
 {name:'Ceramic breeder',reading:'Tritium moves through the ceramic and leaves its surface. A helium purge gas carries tritium-bearing molecules to recovery equipment. The ceramic stays in the blanket.',material:'Ceramic grain',carrier:'Helium purge gas',note:'Purge gas is a transport gas. It is not the helium-4 produced by the breeding reaction. Tritium can leave in hydrogen molecules or water-bearing forms.'},
 {name:'Liquid lead–lithium',reading:'Liquid lead–lithium carries dissolved tritium to an extraction unit. In one proposed method, hydrogen isotopes pass through a metal membrane toward a vacuum. The liquid returns to the blanket.',material:'Liquid lead–lithium',carrier:'Vacuum side',note:'The membrane passes hydrogen isotopes, not bulk liquid. A pump maintains low hydrogen pressure on the vacuum side. This is one extraction method.'},
] as const;
export function tritiumExtractionDiagram(){
 return `<figure class="tritium-extraction" data-tritium-extraction data-motion="paused">
 <div class="drive-heading"><span>Follow tritium out of the material</span><button type="button" data-extraction-play disabled>Show path</button></div>
 <div class="diagram-cases" role="group" aria-label="Breeding material">${extractionMethods.map((m,i)=>`<button type="button" data-extraction-method="${i}" aria-pressed="${i===0}" disabled>${m.name}</button>`).join('')}</div>
 <p data-extraction-reading aria-live="polite">${extractionMethods[0].reading}</p>
 <div class="extraction-views"><svg viewBox="0 0 340 260" role="img" aria-labelledby="extraction-title extraction-description">
 <title id="extraction-title">Tritium leaves the breeding material</title><desc id="extraction-description">A marked tritium atom moves from a ceramic grain into purge gas, or from liquid lead–lithium through a membrane. The drawing follows one atom as its chemical form changes. It does not model molecular dynamics.</desc>
 <rect x="20" y="55" width="155" height="155" rx="20" class="extraction-material"/>
 <rect x="175" y="55" width="12" height="155" class="extraction-interface" data-extraction-interface hidden/>
 <text x="255" y="35" text-anchor="middle" data-extraction-carrier>${extractionMethods[0].carrier}</text>
 <path d="M95 135H280V210" class="extraction-track"/>
 <circle cx="95" cy="135" r="10" class="plant-tritium" data-extraction-dot/><text x="95" y="139" text-anchor="middle" class="extraction-t" data-extraction-t>T</text>
 ${label(255,243,'↓ To recovery equipment')}<text x="98" y="35" text-anchor="middle" data-extraction-material>${extractionMethods[0].material}</text>
 </svg><div class="extraction-processing"><h4>After extraction</h4><ol><li>Collect tritium-bearing material from the carrier stream.</li><li>Remove impurities and recover hydrogen from chemical compounds where necessary.</li><li>Separate hydrogen isotopes where necessary.</li><li>Store fuel and supply the chamber or new fuel targets.</li></ol><p>Neither the carrier stream nor blanket material goes directly into the fusion fuel.</p></div></div>
 <label class="extraction-progress">Path progress <input type="range" min="0" max="100" value="0" aria-label="Tritium extraction path progress" disabled></label>
 <p data-extraction-note>${extractionMethods[0].note}</p>
 <figcaption>Design examples, not Marathon equipment. Follow one T atom through changing chemical forms. The eight-second path gives order, not an extraction time or atom trajectory.</figcaption></figure>`;
}
export function setupPlantGuide(doc:Document){
 const win=doc.defaultView!;
 for(const figure of doc.querySelectorAll<HTMLElement>('[data-plant-cycle]')){
  let selected=0;
  const previous=figure.querySelector<HTMLButtonElement>('[data-plant-previous]')!,next=figure.querySelector<HTMLButtonElement>('[data-plant-next]')!,motion=figure.querySelector<HTMLButtonElement>('[data-plant-motion]')!;
  const stop=()=>{figure.dataset.motion='paused';motion.textContent='Play paths';};
  const paint=()=>{
   const stage=stages[selected];stop();
   for(const [selector,value]of [['position',`${selected+1} of ${stages.length} · ${stage.where}`],['title',stage.title],['reading',stage.reading],['result',stage.result],['reaction',stage.reaction]])figure.querySelector(`[data-plant-${selector}]`)!.textContent=value;
   for(const region of figure.querySelectorAll<SVGElement>('[data-plant-region]'))region.classList.toggle('is-active',(stage.regions as readonly string[]).includes(region.dataset.plantRegion!));
   for(const route of figure.querySelectorAll<SVGElement>('[data-plant-route]'))route.classList.toggle('is-active',(stage.routes as readonly string[]).includes(route.dataset.plantRoute!));
   const scene=['prepare','fusion','multiply','breed','extract','heat','operate'][selected];
   for(const panel of figure.querySelectorAll('[data-plant-scene]'))panel.toggleAttribute('hidden',panel.getAttribute('data-plant-scene')!==scene);
   previous.disabled=selected===0;next.disabled=selected===stages.length-1;
   next.textContent=selected===stages.length-1?'End of sequence':`Next: ${['','start fusion','multiply neutrons','breed tritium','extract tritium','remove heat','operate together'][selected+1]}`;
   motion.disabled=stage.routes.length===0;
  };
  previous.addEventListener('click',()=>{if(selected>0){selected--;paint();}});next.addEventListener('click',()=>{if(selected<stages.length-1){selected++;paint();}});
  motion.addEventListener('click',()=>{if(figure.dataset.motion==='running')stop();else{figure.dataset.motion='running';motion.textContent='Pause paths';}});
  doc.addEventListener('visibilitychange',()=>{if(doc.hidden)stop();});
  win.matchMedia?.('(prefers-reduced-motion: reduce)').addEventListener?.('change',e=>{if(e.matches)stop();});paint();
 }
 for(const figure of doc.querySelectorAll<HTMLElement>('[data-tritium-extraction]')){
  const play=figure.querySelector<HTMLButtonElement>('[data-extraction-play]')!,range=figure.querySelector<HTMLInputElement>('input')!;
  let progress=0,elapsed=0,frame:number|null=null,last:number|undefined;
  const paint=()=>{
   const x=95+185*Math.min(1,progress/.7),y=135+75*Math.max(0,(progress-.7)/.3);
   for(const [selector,attrs]of [['dot',{cx:x,cy:y}],['t',{x,y:y+4}]] as const)for(const [key,value]of Object.entries(attrs))figure.querySelector(`[data-extraction-${selector}]`)!.setAttribute(key,String(value));
   range.value=String(progress*100);
  };
  const pause=()=>{if(frame!==null)win.cancelAnimationFrame(frame);frame=null;last=undefined;figure.dataset.motion='paused';play.textContent=progress===1?'Replay path':'Show path';};
  const tick=(now:number)=>{frame=null;if(last!==undefined)elapsed=Math.min(8000,elapsed+Math.min(64,now-last));progress=elapsed/8000;last=now;paint();if(progress===1)pause();else frame=win.requestAnimationFrame(tick);};
  play.disabled=range.disabled=false;
  play.addEventListener('click',()=>{if(figure.dataset.motion==='running'){pause();return;}if(progress===1)progress=0;elapsed=progress*8000;last=undefined;figure.dataset.motion='running';play.textContent='Pause path';paint();frame=win.requestAnimationFrame(tick);});
  range.addEventListener('input',()=>{progress=range.valueAsNumber/100;pause();paint();});
  for(const button of figure.querySelectorAll<HTMLButtonElement>('[data-extraction-method]')){
   button.disabled=false;button.addEventListener('click',()=>{
    progress=0;pause();const method=Number(button.dataset.extractionMethod),value=extractionMethods[method];
    for(const other of figure.querySelectorAll('[data-extraction-method]'))other.setAttribute('aria-pressed',String(other===button));
    for(const [key,text]of Object.entries({reading:value.reading,note:value.note,material:value.material,carrier:value.carrier}))figure.querySelector(`[data-extraction-${key}]`)!.textContent=text;
    figure.querySelector('[data-extraction-interface]')!.toggleAttribute('hidden',method===0);paint();
   });
  }
  doc.addEventListener('visibilitychange',()=>{if(doc.hidden)pause();});
  win.matchMedia?.('(prefers-reduced-motion: reduce)').addEventListener?.('change',e=>{if(e.matches)pause();});paint();
 }
}
