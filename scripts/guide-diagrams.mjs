import {tsImport} from 'tsx/esm/api';
const {equilibriumPoint}=/** @type {typeof import('../src/fuel-equilibrium.js')} */(await tsImport('../src/fuel-equilibrium.ts',import.meta.url));

const {conceptDiagram}=/** @type {typeof import('./guide-concepts.js')} */(await tsImport('./guide-concepts.ts',import.meta.url));

function heatDiagram(){
 /** @type {[string,string,number[]][]} */
 const cases=[['gas','Gas hotter',[900,800,600,400,300]],['wall','Wall hotter',[300,400,600,800,900]],['equal','Same temperature',[600,600,600,600,600]]];
 return `<figure class="heat-example" data-heat-example data-case="gas" data-motion="paused">
 <div class="drive-heading"><span>Heat flows from higher to lower temperature.</span><button type="button" data-heat-motion disabled>Play motion</button></div>
 <div class="diagram-cases" role="group" aria-label="Compare heat-flow directions">${cases.map(([id,label])=>`<button type="button" data-heat-select="${id}" aria-pressed="${id==='gas'}" disabled>${label}</button>`).join('')}</div>
 <svg viewBox="0 0 360 330" role="img" aria-labelledby="heat-title heat-description">
 <title id="heat-title">The temperature gradient sets the conduction direction</title>
 <desc id="heat-description">The temperature profile is above a radial strip of gas, liner and coolant. If temperature decreases outward, heat flows outward by conduction. If temperature increases outward, heat flows inward. At uniform temperature, no heat flows by conduction. These example profiles are prescribed, not calculated from a thermal simulation.</desc>
 <defs><marker id="heat-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#e4ac76"/></marker></defs>
 <text x="16" y="20">Temperature (K)</text>
 ${[300,600,900].map(T=>`<path d="M50 ${200-(T-300)/5}H320" class="diagram-grid"/><text x="42" y="${204-(T-300)/5}" text-anchor="end">${T}</text>`).join('')}
 <path d="M50 65V200H320" class="diagram-axis"/>
 <path d="M230 60V282M280 60V282" class="diagram-grid"/>
 ${cases.map(([id,,temperatures])=>{const y=temperatures.map(T=>200-(T-300)/5);return `<g data-heat-case="${id}" data-temperatures="${temperatures.join(',')}"><path d="M50 ${y[0]}C95 ${y[0]} 165 ${y[1]} 230 ${y[2]}L280 ${y[3]}L320 ${y[4]}" class="heat-profile"/></g>`;}).join('')}
 <text x="50" y="222">axis</text><text x="320" y="222" text-anchor="end">outward →</text>
 <rect x="50" y="242" width="180" height="40"/><rect x="230" y="242" width="50" height="40" class="heat-wall"/><rect x="280" y="242" width="40" height="40"/>
 ${cases.filter(([id])=>id!=='equal').map(([id])=>`<g data-heat-case="${id}" class="heat-flow" data-direction="${id==='gas'?1:-1}"><path d="M${id==='gas'?'80 262H210':'210 262H80'}" marker-end="url(#heat-arrow)"/><path d="M${id==='gas'?'240 262H310':'310 262H240'}" marker-end="url(#heat-arrow)"/><circle class="heat-packet" cx="${id==='gas'?90:185}" cy="262" r="4"/></g>`).join('')}
 <text x="140" y="308" text-anchor="middle">gas</text><text x="255" y="308" text-anchor="middle">liner</text><text x="311" y="308" text-anchor="middle">coolant</text>
 </svg>
 <p class="diagram-reading" data-heat-reading aria-live="polite">Temperature decreases outward → heat flows outward by conduction.</p>
 <figcaption>These prescribed profiles are examples, not your run. Motion shows the direction, not the heat-flow rate. This diagram excludes gas motion and temperature jumps at interfaces.</figcaption></figure>`;
}

function collectionDiagram(){
 // Use 100 inventory units for the ideal mixture. The cylindrical integrals
 // retain the r dr volume weighting and the empty-cut case.
 const config={massesU:/** @type {[number,number]} */([20,40]),edgeSpeedMS:1000,temperatureK:500,radiusM:.1,lengthM:.5,totalParticles:100,lightFraction:.5,cutFraction:.65};
 /** @type {[number,number,number|null,number|null][]} */
 const samples=Array.from({length:101},(_,i)=>{const s=equilibriumPoint(config,i/100).inner;return [s.speciesParticles[0],s.speciesParticles[1],s.lightPurity,s.lightRecovery];});
 const selected=samples[65];
 /** @param {number|null} value */
 const percent=value=>value===null?'undefined':`${(value*100).toFixed(1)}%`;
 // Equal-weight quantile samples show the same radial inventories.
 // These samples are not atom counts or simulated particle paths.
 const particles=[0,1].flatMap(species=>Array.from({length:50},(_,i)=>{
  let lo=0,hi=1;const target=(i+.5)/50;
  for(let j=0;j<32;j++){const mid=(lo+hi)/2;if(equilibriumPoint(config,mid).inner.speciesFractions[species]<target)lo=mid;else hi=mid;}
  const r=(lo+hi)/2,angle=i*2.399963229728653+species*1.1;
  return `<circle data-cut-particle="${r}" cx="${140+110*r*Math.cos(angle)}" cy="${140+110*r*Math.sin(angle)}" r="3" class="cut-${species?'heavy':'light'}${r>.65?' cut-outside':''}"/>`;
 })).join('');
 return `<figure class="collection-example" data-collection-example data-cut-values='${JSON.stringify(samples)}'>
 <strong>A high-purity sample can contain few of the light atoms.</strong>
 <label class="cut-control" for="example-cut-radius">Keep all gas inside <output for="example-cut-radius" data-cut-radius-label>0.65 R</output></label>
 <input id="example-cut-radius" type="range" min="0" max="100" step="1" value="65" aria-label="Example collection radius, percent of vessel radius" disabled>
 <div class="collection-views"><svg viewBox="0 0 280 280" role="img" aria-labelledby="cut-title cut-description">
 <title id="cut-title">A radius cut keeps all gas inside the selected radius</title>
 <desc id="cut-description">This end view shows an ideal rotating mixture. Green markers show lighter atoms. Amber markers show heavier atoms. These equal-weight samples show the calculated radial distributions. Markers outside the cut have lower brightness. The values come from density integrals, not marker counts.</desc>
 <circle cx="140" cy="140" r="110" class="cut-vessel"/>
 <circle data-cut-area cx="140" cy="140" r="71.5" class="cut-area"/>
 ${particles}
 <circle data-cut-boundary cx="140" cy="140" r="71.5" class="cut-boundary"/>
 <text x="140" y="19" text-anchor="middle">End view · all gas inside the cut</text>
 <text x="140" y="269" text-anchor="middle">Lower brightness = outside the cut</text>
 </svg><div class="cut-inventory">
 <p class="cut-key"><span>● Light · 20 u</span><span>● Heavy · 40 u</span></p>
 <p>Of 50 light units, keep <b data-cut-light>${selected[0].toFixed(1)}</b></p><div class="cut-bar"><span data-cut-light-bar style="transform:scaleX(${selected[0]/50})"></span></div>
 <p>Of 50 heavy units, keep <b data-cut-heavy>${selected[1].toFixed(1)}</b></p><div class="cut-bar cut-heavy-bar"><span data-cut-heavy-bar style="transform:scaleX(${selected[1]/50})"></span></div>
 <dl><div><dt>Purity · light fraction in sample</dt><dd data-cut-purity>${percent(selected[2])}</dd></div><div><dt>Recovery · light atoms kept</dt><dd data-cut-recovery>${percent(selected[3])}</dd></div></dl>
 </div></div>
 <p class="diagram-reading" data-cut-reading aria-live="polite">Move the cut toward the wall to keep more atoms of both species.</p>
 <figcaption>This ideal equilibrium example uses the simulator’s equilibrium reference, not your run. Temperature is uniform at 500 K. Rotation is rigid, with a wall speed of 1,000 m/s. The feed contains 50% light atoms, with 100 total inventory units. Dots are distribution samples. The model does not calculate extraction flow.</figcaption></figure>`;
}

function densityDiagram(){
 /** @type {[string,string,number,number][]} */
 const cases=[['rest','No rotation',0,500],['spin','Rotation',1500,500],['warm','Higher temperature',1500,1000]];
 const readings={rest:'Without rotation, neither isotope needs an outward density increase. Both curves stay at 1×.',
  spin:'Rotation needs an inward pressure force. Both densities increase toward the wall. The heavier isotope needs a larger increase.',
  warm:'The rotation speed stays at 1,500 m/s at the wall. With the same number of atoms per volume, hotter gas has higher pressure. A smaller relative density increase supplies the necessary inward force. These normalized density curves become less steep.'};
 const masses=[6.0151228874,7.0160034366],colors=['#9bd8ce','#e4ac76'];
 /** @param {number} speed @param {number} temperature */
 const curves=(speed,temperature)=>masses.map((mass,i)=>{
  const beta=mass*1.66053906892e-27*speed**2/(2*1.380649e-23*temperature);
  return {beta,wall:Math.exp(beta),path:Array.from({length:65},(_,j)=>`${j?'L':'M'}${52+264*j/64} ${220-165*Math.exp(beta*(j/64)**2)/7}`).join(' '),color:colors[i]};
 });
 return `<figure class="density-example" data-density-example data-case="spin">
 <strong>Compare rotation first. Then increase temperature at the same speed.</strong>
 <div class="density-cases" role="group" aria-label="Compare equilibrium density gradients">${cases.map(([id,label])=>`<button type="button" data-density-select="${id}" aria-pressed="${id==='spin'}">${label}</button>`).join('')}</div>
 <svg viewBox="0 0 360 278" role="img" aria-labelledby="composition-title composition-description">
 <title id="composition-title">The heavier isotope has a steeper equilibrium density gradient</title><desc id="composition-description">Each curve shows density divided by the axis density of that species. With rotation, both curves increase outward. Lithium-7 has a steeper increase than lithium-6. These ratios do not show composition or total atom numbers. This ideal equilibrium example has a uniform temperature. It is not your live run.</desc>
 <text x="16" y="22">Density ÷ axis density of that species</text>
 ${[1,3,5,7].map(y=>`<path d="M52 ${220-165*y/7}H316" stroke="#405749" stroke-width=".6"/><text x="42" y="${224-165*y/7}" text-anchor="end">${y}×</text>`).join('')}
 <path d="M52 45V220H316" fill="none" stroke="#82958a"/>
 ${cases.map(([id,,speed,temperature])=>`<g data-density-case="${id}">${curves(speed,temperature).map((c,i)=>`<path data-mass="${masses[i]}" data-beta="${c.beta}" data-wall="${c.wall}" d="${c.path}" stroke="${c.color}" stroke-width="3" ${i?'stroke-dasharray="6 3"':''} fill="none"/>`).join('')}</g>`).join('')}
 <text x="52" y="243">axis</text><text x="316" y="243" text-anchor="end">wall</text><text x="184" y="267" text-anchor="middle">distance from the axis →</text>
 </svg><div class="density-key"><span>━ ⁶Li · lighter</span><span>┄ ⁷Li · heavier</span></div>
 ${cases.map(([id,,speed,temperature])=>{const [l,h]=curves(speed,temperature);return `<div data-density-case="${id}" class="density-result"><p>${speed.toLocaleString('en-US')} m/s at the wall · ${temperature} K throughout</p><p>${readings[/** @type {keyof typeof readings} */(id)]}</p><p>Wall ÷ axis density: <b>⁶Li ${l.wall.toFixed(2)}×</b> · <b>⁷Li ${h.wall.toFixed(2)}×</b></p></div>`;}).join('')}
 <figcaption>This ideal equilibrium example is not your run. Compare equal-size volumes at different radii, not whole rings. Each isotope has its own axis reference. These curves are not isotope percentages.</figcaption></figure>`;
}
function driveDiagram(){
 /** @param {string} kind @param {number[][]} points */
 const particles=(kind,points)=>points.map(([x,y])=>`<circle cx="${x}" cy="${y}" r="${kind==='ion'?4:5}"/>`).join('');
 const caption='Ion–neutral collisions transfer rotation to the neutral gas. The electrodes stay still.';
 return `<figure class="drive-illustration" data-drive-diagram data-stage="gas" data-motion="paused">
 <div class="drive-heading"><span>Turn the gas. Keep the cylinder still.</span><button type="button" data-drive-motion>Play motion</button></div>
 <div class="drive-stages" role="group" aria-label="How the gas turns">
 ${[['current','Current'],['ions','Turn the ions'],['gas','Turn the gas']].map(([id,label],i)=>`<button type="button" data-drive-stage="${id}" aria-pressed="${id==='gas'}" aria-controls="drive-explanation"><span>${i+1}</span>${label}</button>`).join('')}</div>
 <div class="drive-views">
 <div class="drive-view"><h3>The cylinder</h3>
 <svg viewBox="0 0 340 300" role="img" aria-labelledby="drive-cylinder-title drive-cylinder-description">
 <title id="drive-cylinder-title">A stationary cylindrical electrode around a central electrode</title>
 <desc id="drive-cylinder-description">Gas fills the gap between the electrodes. The magnetic field points along the cylinder axis toward you. The end view shows current and force in that gap.</desc>
 <defs><linearGradient id="drive-metal" x2="1" y2="1"><stop stop-color="#81948c"/><stop offset=".45" stop-color="#354b42"/><stop offset="1" stop-color="#192a23"/></linearGradient><marker id="drive-axis-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#b5c5cf"/></marker></defs>
 <path d="M105 76L230 28A65 87 0 0 1 230 202L105 250Z" fill="url(#drive-metal)" stroke="#7e9588"/>
 <ellipse cx="230" cy="115" rx="65" ry="87" fill="#294037" stroke="#7e9588"/>
 <path d="M105 76L230 28M105 250L230 202" stroke="#a4b5a9" stroke-width="2"/>
 <path d="M105 145L230 97A14 18 0 0 1 230 133L105 181Z" fill="#82938a" stroke="#c2cbbf"/>
 <ellipse cx="105" cy="163" rx="65" ry="87" fill="#1d3329" fill-opacity=".88" stroke="#bac5b8" stroke-width="3"/>
 <ellipse cx="105" cy="163" rx="52" ry="70" fill="#233e32" stroke="#547361"/>
 <ellipse cx="105" cy="163" rx="14" ry="18" fill="#899a8e" stroke="#c2cbbf"/>
 <path d="M255 105.4L60 180.28" fill="none" stroke="#b5c5cf" stroke-width="2" stroke-dasharray="5 5" marker-end="url(#drive-axis-arrow)"/>
 <text x="28" y="227" class="drive-field-label">B along the axis</text>
 <path d="M116 162L204 150H290" class="drive-leader"/><text x="208" y="142">Inner electrode</text>
 <path d="M142 207L203 227H307" class="drive-leader"/><text x="208" y="248">Outer electrode</text>
 <path d="M88 112L37 58H16" class="drive-leader"/><text x="12" y="45">Gas in the gap</text>
 <text x="125" y="284" text-anchor="middle" class="drive-muted">View from this end</text>
 </svg></div>
 <div class="drive-view"><h3>End view</h3>
 <svg viewBox="0 0 320 320" role="img" aria-labelledby="drive-title drive-description">
 <title id="drive-title">How radial current turns the gas</title>
 <desc id="drive-description">At the right, current points inward to the left. The magnetic field points out of the page. J cross B points up and causes counterclockwise torque. This force acts tangentially around the gap. Hollow circles show ions and filled dots show neutral atoms, as in the 3D view. Motion shows bulk rotation, not particle paths or measured speeds.</desc>
 <defs>${[['current','#9bd8ce'],['force','#e4ac76']].map(([kind,color])=>`<marker id="drive-${kind}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0L10 5L0 10Z" fill="${color}"/></marker>`).join('')}</defs>
 <circle cx="160" cy="160" r="116" fill="#1d3329" stroke="#a1b3a4" stroke-width="3"/>
 ${[58,84,104].map(r=>`<circle cx="160" cy="160" r="${r}" class="drive-track"/>`).join('')}
 <g class="drive-field">${[[105,105],[215,105],[105,215],[215,215]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="8"/><circle cx="${x}" cy="${y}" r="2" class="drive-field-dot"/>`).join('')}</g>
 <g class="drive-currents">${['M268 160H198','M52 160H122','M160 52V122','M160 268V198'].map(d=>`<path d="${d}" marker-end="url(#drive-current)"/>`).join('')}
 <text x="215" y="184">J</text></g>
 <g class="drive-orbit drive-ions">${particles('ion',[[219,160],[118,118],[118,202],[252,160],[160,68],[68,160],[160,252]])}</g>
 <g class="drive-orbit drive-neutrals">${particles('neutral',[[210,210],[110,210],[110,110],[210,110],[259,160],[160,61],[61,160],[160,259]])}</g>
 <g class="drive-forces">${['M253 160V108','M160 67H108','M67 160V212','M160 253H212'].map(d=>`<path d="${d}" marker-end="url(#drive-force)"/>`).join('')}<text x="247" y="96">J × B</text></g>
 <circle cx="160" cy="160" r="29" fill="#14221b" stroke="#a1b3a4" stroke-width="2"/>
 <text x="160" y="157" text-anchor="middle" class="drive-inner-label">Inner</text><text x="160" y="171" text-anchor="middle" class="drive-inner-label">electrode</text>
 <text x="160" y="304" text-anchor="middle">Outer electrode · stationary</text>
 <g class="drive-field-key"><circle cx="56" cy="19" r="7"/><circle cx="56" cy="19" r="2" class="drive-field-dot"/><text x="70" y="23">B toward you, out of the screen</text></g>
 </svg></div></div>
 <div class="drive-key" role="group" aria-label="Diagram key"><span><i class="drive-ion-key"></i>Ions</span><span><i class="drive-neutral-key"></i>Neutral atoms</span><span class="drive-force-key">↗ Sideways force</span></div>
 <p id="drive-explanation" class="drive-explanation" aria-live="polite">${caption}</p>
 <figcaption>This slow motion shows bulk rotation, not simulated particle paths. The geometry is schematic.</figcaption>
 </figure>`;
}
/** @param {string} id */
export function guideDiagram(id){
 if(id==='heat-flow')return heatDiagram();
 if(id==='inventory-cut')return collectionDiagram();
 if(id==='drive')return driveDiagram();
 if(id==='composition')return densityDiagram();
 const concept=conceptDiagram(id);if(concept)return concept;
 throw new Error(`Unknown guide diagram: ${id}`);
}
