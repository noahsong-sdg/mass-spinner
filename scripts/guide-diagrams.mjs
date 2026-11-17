const drawings={
 composition:{title:'Composition is a fraction, not a density',description:'A qualitative graph of light-isotope number fraction decreasing from the axis toward the wall, crossing the feed fraction. No numerical predictions are drawn.',caption:'Schematic trend, not computed data. Use Composition for the actual profile.',body:`
 <path d="M48 35V192H290" fill="none" stroke="#82958a" stroke-width="2"/>
 <path d="M48 118H290" fill="none" stroke="#82958a" stroke-dasharray="5 5"/>
 <path d="M48 73C135 73 211 125 286 155" fill="none" stroke="#9bd8ce" stroke-width="4"/>
 <text x="48" y="22">light-isotope number fraction</text><text x="230" y="109">feed</text>
 <text x="48" y="216">axis</text><text x="264" y="216">wall</text><text x="165" y="244" text-anchor="middle">radius →</text>
 <text x="67" y="60" fill="#9bd8ce">relatively light-rich</text>`},
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
function driveDiagram(){
 const particles=(kind,points)=>points.map(([x,y])=>`<circle cx="${x}" cy="${y}" r="${kind==='ion'?4:5}"/>`).join('');
 const caption='Ion–neutral collisions pass rotation to the neutral gas. The electrodes stay still.';
 return `<figure class="drive-illustration" data-drive-diagram data-stage="gas" data-motion="paused">
 <div class="drive-heading"><span>Spin the gas. Keep the cylinder still.</span><button type="button" data-drive-motion aria-pressed="true">Play motion</button></div>
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
 <path d="M234 112L60 202" fill="none" stroke="#b5c5cf" stroke-width="2" stroke-dasharray="5 5" marker-end="url(#drive-axis-arrow)"/>
 <text x="28" y="227" class="drive-field-label">B along the axis</text>
 <path d="M116 162L204 150H290" class="drive-leader"/><text x="208" y="142">Inner electrode</text>
 <path d="M142 207L203 227H307" class="drive-leader"/><text x="208" y="248">Outer electrode</text>
 <path d="M88 112L37 58H16" class="drive-leader"/><text x="12" y="45">Gas in the gap</text>
 <text x="125" y="284" text-anchor="middle" class="drive-muted">Look into this end →</text>
 </svg></div>
 <div class="drive-view"><h3>Looking into the end</h3>
 <svg viewBox="0 0 320 320" role="img" aria-labelledby="drive-title drive-description">
 <title id="drive-title">How radial current turns the gas</title>
 <desc id="drive-description">At the right, current points inward to the left, magnetic field points out of the page, and J cross B points up, giving counterclockwise torque. The same tangential force acts around the annulus. Filled dots represent ions; hollow circles represent neutral atoms. Motion illustrates bulk rotation, not microscopic trajectories or measured speeds.</desc>
 <defs>${[['current','#9bd8ce'],['force','#e4ac76']].map(([kind,color])=>`<marker id="drive-${kind}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0L10 5L0 10Z" fill="${color}"/></marker>`).join('')}</defs>
 <circle cx="160" cy="160" r="116" fill="#1d3329" stroke="#a1b3a4" stroke-width="3"/>
 ${[58,84,104].map(r=>`<circle cx="160" cy="160" r="${r}" class="drive-track"/>`).join('')}
 <g class="drive-field">${[[105,105],[215,105],[105,215],[215,215]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="8"/><circle cx="${x}" cy="${y}" r="2" class="drive-field-dot"/>`).join('')}</g>
 <g class="drive-currents"><path d="M268 160H198M52 160H122M160 52V122M160 268V198" marker-end="url(#drive-current)"/>
 <text x="215" y="184">J</text></g>
 <g class="drive-orbit drive-ions">${particles('ion',[[219,160],[118,118],[118,202],[252,160],[160,68],[68,160],[160,252]])}</g>
 <g class="drive-orbit drive-neutrals">${particles('neutral',[[210,210],[110,210],[110,110],[210,110],[259,160],[160,61],[61,160],[160,259]])}</g>
 <g class="drive-forces"><path d="M253 150V105M150 67H105M67 170V215M170 253H215" marker-end="url(#drive-force)"/><text x="247" y="96">J × B</text></g>
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
 const d=drawings[id];if(!d)throw new Error(`Unknown guide diagram: ${id}`);
 return `<figure><svg viewBox="0 0 330 ${id==='energy'?312:270}" role="img" aria-labelledby="${id}-title ${id}-description">
 <title id="${id}-title">${d.title}</title><desc id="${id}-description">${d.description}</desc>
 <defs>${['current','force'].map((kind,i)=>`<marker id="${id}-${kind}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10Z" fill="${i?'#e4ac76':'#9bd8ce'}"/></marker>`).join('')}</defs>
 ${d.body}</svg><figcaption>${d.caption}</figcaption></figure>`;
}
