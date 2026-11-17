const drawings={
 energy:{title:'Drive energy becomes rotation and heat',description:'Electrical input supplies mechanical work and Ohmic heat. Mechanical work changes rotation or is dissipated by ion-neutral slip and wall drag; cooling removes heat.',caption:'Energy routes in the simplified model. Deposition and cooling laws remain assumptions.',body:`
 <rect x="91" y="14" width="148" height="37" rx="7"/><text x="165" y="38" text-anchor="middle">electrical input</text>
 <path d="M126 51L83 91M204 51L246 91" class="force" marker-end="url(#energy-force)"/>
 <rect x="12" y="96" width="141" height="42" rx="7"/><text x="82" y="122" text-anchor="middle">mechanical work</text>
 <rect x="179" y="96" width="139" height="42" rx="7"/><text x="248" y="122" text-anchor="middle">Ohmic heat</text>
 <path d="M80 138V175M248 138V175" class="force" marker-end="url(#energy-force)"/>
 <text x="82" y="196" text-anchor="middle">rotation ↔ redistribution</text>
 <text x="248" y="196" text-anchor="middle">gas / wall heat</text>
 <path d="M90 210Q130 246 207 210" class="force" marker-end="url(#energy-force)"/>
 <text x="165" y="255" text-anchor="middle">slip + drag convert rotation to heat</text>
 <path d="M248 205V273" class="force" marker-end="url(#energy-force)"/><text x="248" y="296" text-anchor="middle">cooling out</text>`},
};
function densityDiagram(){
 const cases=[['rest','No spin',0,500],['spin','Spinning',1500,500],['warm','Warmer',1500,1000]];
 const masses=[6.0151228874,7.0160034366],colors=['#9bd8ce','#e4ac76'];
 const curves=(speed,temperature)=>masses.map((mass,i)=>{
  const beta=mass*1.66053906892e-27*speed**2/(2*1.380649e-23*temperature);
  return {beta,wall:Math.exp(beta),path:Array.from({length:65},(_,j)=>`${j?'L':'M'}${52+264*j/64} ${220-165*Math.exp(beta*(j/64)**2)/7}`).join(' '),color:colors[i]};
 });
 return `<figure class="density-example" data-density-example data-case="spin">
 <strong>Both crowd toward the wall. The heavier isotope crowds more.</strong>
 <div class="density-cases" role="group" aria-label="Compare equilibrium density gradients">${cases.map(([id,label])=>`<button type="button" data-density-select="${id}" aria-pressed="${id==='spin'}">${label}</button>`).join('')}</div>
 <svg viewBox="0 0 360 278" role="img" aria-labelledby="composition-title composition-description">
 <title id="composition-title">Heavier atoms have a steeper equilibrium density gradient</title><desc id="composition-description">Each curve starts at one at the axis: density divided by that species' own axis density. With rotation both curves rise, lithium-7 more steeply than lithium-6. These ratios do not show mixture percentages or which species has more atoms. This is an ideal uniform-temperature example, not your live run.</desc>
 <text x="16" y="22">Density ÷ its own axis density</text>
 ${[1,3,5,7].map(y=>`<path d="M52 ${220-165*y/7}H316" stroke="#405749" stroke-width=".6"/><text x="42" y="${224-165*y/7}" text-anchor="end">${y}×</text>`).join('')}
 <path d="M52 45V220H316" fill="none" stroke="#82958a"/>
 ${cases.map(([id,,speed,temperature])=>`<g data-density-case="${id}">${curves(speed,temperature).map((c,i)=>`<path data-mass="${masses[i]}" data-beta="${c.beta}" data-wall="${c.wall}" d="${c.path}" stroke="${c.color}" stroke-width="3" ${i?'stroke-dasharray="6 3"':''} fill="none"/>`).join('')}</g>`).join('')}
 <text x="52" y="243">axis</text><text x="316" y="243" text-anchor="end">wall</text><text x="184" y="267" text-anchor="middle">distance from the axis →</text>
 </svg><div class="density-key"><span>━ ⁶Li · lighter</span><span>┄ ⁷Li · heavier</span></div>
 ${cases.map(([id,,speed,temperature])=>{const [l,h]=curves(speed,temperature);return `<div data-density-case="${id}" class="density-result"><p>${speed.toLocaleString('en-US')} m/s at the wall · ${temperature} K throughout</p><p>Wall versus axis: <b>⁶Li ${l.wall.toFixed(2)}×</b> · <b>⁷Li ${h.wall.toFixed(2)}×</b></p></div>`;}).join('')}
 <figcaption>Ideal equilibrium example, not your run. Compare equal-size volumes at different radii, not whole rings. Each isotope has its own axis reference; these curves are not isotope percentages.</figcaption></figure>`;
}
function driveDiagram(){
 const particles=(kind,points)=>points.map(([x,y])=>`<circle cx="${x}" cy="${y}" r="${kind==='ion'?4:5}"/>`).join('');
 const caption='Ion–neutral collisions pass rotation to the neutral gas. The electrodes stay still.';
 return `<figure class="drive-illustration" data-drive-diagram data-stage="gas" data-motion="paused">
 <div class="drive-heading"><span>Spin the gas. Keep the cylinder still.</span><button type="button" data-drive-motion>Play motion</button></div>
 <div class="drive-stages" role="group" aria-label="Explore how the gas spins">
 ${[['current','Current'],['ions','Turn ions'],['gas','Turn gas']].map(([id,label],i)=>`<button type="button" data-drive-stage="${id}" aria-pressed="${id==='gas'}" aria-controls="drive-explanation"><span>${i+1}</span>${label}</button>`).join('')}</div>
 <div class="drive-views">
 <div class="drive-view"><h3>The cylinder</h3>
 <svg viewBox="0 0 340 300" role="img" aria-labelledby="drive-cylinder-title drive-cylinder-description">
 <title id="drive-cylinder-title">A stationary cylindrical electrode around a central electrode</title>
 <desc id="drive-cylinder-description">Gas fills the annular gap. The magnetic field runs along the cylinder toward the viewer. The end view beside it shows current and force in that gap.</desc>
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
 <div class="drive-view"><h3>Looking into the end</h3>
 <svg viewBox="0 0 320 320" role="img" aria-labelledby="drive-title drive-description">
 <title id="drive-title">How radial current turns the gas</title>
 <desc id="drive-description">At the right, current points inward to the left, magnetic field points out of the page, and J cross B points up, giving counterclockwise torque. The same tangential force acts around the annulus. Hollow circles represent ions; filled dots represent neutral atoms, matching the 3D view's marker shapes. Motion illustrates bulk rotation, not microscopic trajectories or measured speeds.</desc>
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
 <div class="drive-key" aria-label="Diagram key"><span><i class="drive-ion-key"></i>Ions</span><span><i class="drive-neutral-key"></i>Neutral atoms</span><span class="drive-force-key">↗ Sideways force</span></div>
 <p id="drive-explanation" class="drive-explanation" aria-live="polite">${caption}</p>
 <figcaption>Illustrative bulk motion · slowed down · not simulated particle paths. Geometry is schematic.</figcaption>
 </figure>`;
}
export function guideDiagram(id){
 if(id==='drive')return driveDiagram();
 if(id==='composition')return densityDiagram();
 const d=drawings[id];if(!d)throw new Error(`Unknown guide diagram: ${id}`);
 return `<figure><svg viewBox="0 0 330 ${id==='energy'?312:270}" role="img" aria-labelledby="${id}-title ${id}-description">
 <title id="${id}-title">${d.title}</title><desc id="${id}-description">${d.description}</desc>
 <defs>${['current','force'].map((kind,i)=>`<marker id="${id}-${kind}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10Z" fill="${i?'#e4ac76':'#9bd8ce'}"/></marker>`).join('')}</defs>
 ${d.body}</svg><figcaption>${d.caption}</figcaption></figure>`;
}
