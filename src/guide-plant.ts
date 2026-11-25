const stages=[
 {title:'Prepare the blanket and initial fuel',where:'Before startup',reading:'The centrifuge supplies enriched lithium for the blanket. A separate initial tritium supply joins deuterium fuel. Lithium stays outside the fusion chamber.',regions:['lithium'],routes:['feed','return']},
 {title:'Supply energy and start D–T fusion',where:'Fusion chamber',reading:'External equipment supplies energy to the fuel. D + T → ⁴He + n releases 17.6 MeV. Fusion supplies neutrons for the blanket.',regions:['core'],routes:['feed','return']},
 {title:'Multiply neutrons in the optional mercury layer',where:'Mercury layer',reading:'An energetic neutron can cause ¹⁹⁸Hg + n → ¹⁹⁷Hg + 2n. This reaction consumes kinetic energy. Mercury-197 later decays into gold-197.',regions:['mercury'],routes:[]},
 {title:'Breed replacement tritium',where:'Lithium blanket',reading:'The reaction ⁶Li + n → T + ⁴He releases about 4.8 MeV. The new tritium remains in the blanket material until extraction.',regions:['lithium'],routes:[]},
 {title:'Extract and process the new tritium',where:'Blanket and external fuel equipment',reading:'Tritium must leave the breeding material. An extraction unit collects it. Fuel processing removes impurities and prepares hydrogen isotopes for fuel delivery.',regions:['lithium'],routes:['extraction','return']},
 {title:'Remove heat and generate electricity',where:'Vessel and external power equipment',reading:'Coolant removes heat from the chamber and blanket. Power conversion changes part of that heat into electricity. The plant uses some electricity and rejects heat.',regions:['core','mercury','lithium'],routes:['heat','electric']},
 {title:'Operate the loops together',where:'The operating plant',reading:'Fusion, breeding, extraction and cooling operate together. Exhaust recovery returns fuel that did not burn. Breeding supplies new tritium to replace consumed fuel.',regions:['core','mercury','lithium'],routes:['feed','extraction','return','exhaust','heat','electric']},
] as const;
const label=(x:number,y:number,text:string)=>`<text x="${x}" y="${y}" text-anchor="middle">${text}</text>`;
const equipment=(x:number,y:number,w:number,name:string)=>`<rect x="${x}" y="${y}" width="${w}" height="40" rx="5"/>${label(x+w/2,y+25,name)}`;
const path=(id:string,d:string,kind='fuel')=>`<path data-plant-route="${id}" class="plant-route plant-${kind}" d="${d}" marker-end="url(#plant-${kind})"/>`;
export function plantCycleDiagram(){
 return `<figure class="plant-cycle" data-plant-cycle>
 <div class="drive-heading"><span>From startup to continued operation</span></div>
 <p data-plant-position>1 of ${stages.length} · ${stages[0].where}</p><h3 data-plant-title>${stages[0].title}</h3>
 <div class="plant-navigation"><button type="button" data-plant-previous disabled>Previous</button><button type="button" data-plant-next disabled>Next: start fusion</button></div>
 <p data-plant-reading aria-live="polite">${stages[0].reading}</p>
 <div class="plant-views"><svg viewBox="0 0 360 360" role="img" aria-labelledby="plant-section-title plant-section-description">
 <title id="plant-section-title">Inside the reactor vessel</title><desc id="plant-section-description">The dotted boundary encloses the chamber and surrounding layers. Mercury is an optional multiplier proposed by Marathon. The centrifuge is separate equipment. This generic section does not specify a confinement device or measured dimensions.</desc>
 <rect x="4" y="4" width="352" height="352" rx="8" class="plant-boundary" data-plant-location="vessel"/>
 ${label(180,30,'Reactor vessel')}
 <g data-plant-region="lithium" class="is-active"><circle cx="135" cy="210" r="108" class="plant-breeder"/></g>
 <g data-plant-region="mercury"><circle cx="135" cy="210" r="83" class="plant-mercury"/></g>
 <g data-plant-region="core"><circle cx="135" cy="210" r="58" class="plant-core"/></g>
 <path d="M222 146L245 118H335M206 166L245 158H335" class="plant-leader"/>
 ${label(275,108,'Lithium blanket')}${label(275,148,'Mercury (optional)')}
 ${label(135,204,'Fusion chamber')}${label(135,225,'D + T')}
 <g data-plant-scene="prepare"></g>
 <g data-plant-scene="fusion" hidden><circle cx="125" cy="242" r="7" class="plant-helium"/>${label(105,266,'⁴He')}
 <path d="M156 238L190 254" class="plant-neutron"/><circle cx="172" cy="246" r="5" class="plant-neutron-dot"/>${label(187,272,'n')}</g>
 <g data-plant-scene="multiply" hidden><path d="M177 245H204M204 245L226 227M204 245L226 263" class="plant-neutron"/>
 <circle cx="204" cy="245" r="6" class="plant-neutron-dot"/>${label(179,269,'1 n')}${label(251,250,'2 n')}</g>
 <g data-plant-scene="breed" hidden><path d="M200 245H231" class="plant-neutron"/><circle cx="231" cy="245" r="7" class="plant-tritium"/>${label(253,251,'T')}</g>
 <g data-plant-scene="extract" hidden><circle cx="231" cy="245" r="7" class="plant-tritium"/><path d="M240 245H327" class="plant-fuel" marker-end="url(#plant-fuel)"/></g>
 <g data-plant-scene="heat" hidden>${[190,230,270].map(y=>`<path d="M250 ${y}H327" class="plant-heat" marker-end="url(#plant-heat)"/>`).join('')}</g>
 <g data-plant-scene="operate" hidden></g>
 </svg><svg viewBox="0 0 360 450" role="img" aria-labelledby="plant-loops-title plant-loops-description">
 <title id="plant-loops-title">Equipment outside the reactor vessel</title><desc id="plant-loops-description">The dotted boundary groups equipment outside the vessel. It does not specify a shared room or measured layout. Initial fuel enters fuel processing. Fuel delivery and unburned exhaust connect to the chamber. New tritium from the blanket passes through extraction and fuel processing. Heat goes to power conversion, with electricity output and rejected heat. Paths show connections, not rates. No plant performance is calculated.</desc>
 <defs>${['fuel','heat','electric','neutron'].map(kind=>`<marker id="plant-${kind}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0L10 5L0 10Z" class="plant-${kind}-head"/></marker>`).join('')}</defs>
 <g data-plant-location="external">
 <rect x="4" y="4" width="352" height="442" rx="8" class="plant-boundary"/>
 ${label(180,30,'Outside the vessel')}
 ${equipment(180,50,160,'Initial D + T')}${equipment(180,125,160,'Fuel processing')}${equipment(180,240,160,'Tritium extraction')}
 ${equipment(20,350,170,'Power conversion')}${equipment(240,350,100,'Plant / grid')}
 ${path('feed','M260 90V119')}${path('return','M180 145H40V109')}${label(68,96,'Fuel to chamber')}
 ${path('exhaust','M40 190H260V171')}${label(93,181,'Unburned fuel')}
 ${path('extraction','M260 240V171')}${path('extraction','M40 260H174')}${label(88,245,'Blanket tritium')}
 ${path('heat','M40 310V344','heat')}${label(111,319,'Vessel heat')}${path('electric','M190 370H234','electric')}
 ${path('heat','M105 390V424','heat')}${label(183,419,'Rejected heat')}
 </g></svg></div></figure>`;
}
const extractionMethods=[
 {name:'Ceramic breeder',reading:'Tritium leaves the ceramic surface. Helium purge gas carries tritium-bearing molecules to fuel processing. The ceramic stays in the blanket.',material:'Ceramic grain',carrier:'Helium purge gas',retained:'Stays in blanket',transport:'Carries tritium'},
 {name:'Liquid lead–lithium',reading:'In this extraction method, hydrogen isotopes pass through a metal membrane toward a vacuum. The bulk liquid returns to the blanket.',material:'Lead–lithium',carrier:'Vacuum side',retained:'Liquid returns',transport:'Gas removed'},
] as const;
export function tritiumExtractionDiagram(){
 return `<figure class="tritium-extraction" data-tritium-extraction>
 <div class="drive-heading"><span>Tritium extraction</span></div>
 <div class="diagram-cases" role="group" aria-label="Breeding material">${extractionMethods.map((m,i)=>`<button type="button" data-extraction-method="${i}" aria-pressed="${i===0}" disabled>${m.name}</button>`).join('')}</div>
 <p data-extraction-reading aria-live="polite">${extractionMethods[0].reading}</p>
 <svg viewBox="0 0 360 280" role="img" aria-labelledby="extraction-title extraction-description">
 <title id="extraction-title">Tritium leaves the breeding material</title><desc id="extraction-description">Static process diagram, not an atom trajectory or an extraction-time calculation. The carrier gas and bulk breeding material do not enter the fusion fuel. Fuel processing removes impurities and prepares hydrogen isotopes. These are design examples, not verified Marathon equipment. Purge helium is supplied transport gas, not helium produced by breeding.</desc>
 <defs><marker id="extraction-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#9bd8ce"/></marker></defs>
 <rect x="10" y="35" width="140" height="140" rx="8" class="extraction-material"/>
 <rect x="180" y="35" width="170" height="140" rx="8" class="plant-boundary"/>
 <rect x="150" y="35" width="10" height="140" class="extraction-interface" data-extraction-interface hidden/>
 <text x="80" y="63" text-anchor="middle" data-extraction-material>${extractionMethods[0].material}</text>
 <text x="265" y="63" text-anchor="middle" data-extraction-carrier>${extractionMethods[0].carrier}</text>
 <path d="M105 110H240M265 175V224" class="extraction-track" marker-end="url(#extraction-arrow)"/>
 ${label(199,97,'Tritium')}
 <text x="80" y="155" text-anchor="middle" data-extraction-retained>${extractionMethods[0].retained}</text>
 <text x="265" y="155" text-anchor="middle" data-extraction-transport>${extractionMethods[0].transport}</text>
 <g data-extraction-membrane hidden><path d="M155 175V199H132" class="plant-leader"/>${label(77,203,'Metal membrane')}</g>
 ${equipment(190,230,150,'Fuel processing')}
 </svg></figure>`;
}

export function setupPlantGuide(doc:Document){
 for(const figure of doc.querySelectorAll<HTMLElement>('[data-plant-cycle]')){
  let selected=0;
  const previous=figure.querySelector<HTMLButtonElement>('[data-plant-previous]')!,next=figure.querySelector<HTMLButtonElement>('[data-plant-next]')!;
  const paint=()=>{
   const stage=stages[selected];
   for(const [selector,value]of [['position',`${selected+1} of ${stages.length} · ${stage.where}`],['title',stage.title],['reading',stage.reading]])figure.querySelector(`[data-plant-${selector}]`)!.textContent=value;
   for(const region of figure.querySelectorAll<SVGElement>('[data-plant-region]'))region.classList.toggle('is-active',(stage.regions as readonly string[]).includes(region.dataset.plantRegion!));
   for(const route of figure.querySelectorAll<SVGElement>('[data-plant-route]'))route.classList.toggle('is-active',(stage.routes as readonly string[]).includes(route.dataset.plantRoute!));
   const scene=['prepare','fusion','multiply','breed','extract','heat','operate'][selected];
   for(const panel of figure.querySelectorAll('[data-plant-scene]'))panel.toggleAttribute('hidden',panel.getAttribute('data-plant-scene')!==scene);
   previous.disabled=selected===0;next.disabled=selected===stages.length-1;
   next.textContent=selected===stages.length-1?'End of sequence':`Next: ${['','start fusion','multiply neutrons','breed tritium','extract tritium','remove heat','operate together'][selected+1]}`;
  };
  previous.addEventListener('click',()=>{if(selected>0){selected--;paint();}});next.addEventListener('click',()=>{if(selected<stages.length-1){selected++;paint();}});
  paint();
 }
 for(const figure of doc.querySelectorAll<HTMLElement>('[data-tritium-extraction]')){
  for(const button of figure.querySelectorAll<HTMLButtonElement>('[data-extraction-method]')){
   button.disabled=false;button.addEventListener('click',()=>{
    const method=Number(button.dataset.extractionMethod),value=extractionMethods[method];
    for(const other of figure.querySelectorAll('[data-extraction-method]'))other.setAttribute('aria-pressed',String(other===button));
    for(const [key,text]of Object.entries({reading:value.reading,material:value.material,carrier:value.carrier,retained:value.retained,transport:value.transport}))figure.querySelector(`[data-extraction-${key}]`)!.textContent=text;
    for(const part of figure.querySelectorAll('[data-extraction-interface],[data-extraction-membrane]'))part.toggleAttribute('hidden',method===0);
   });
  }
 }
}
