const drawings={
 drive:{title:'How radial current turns the gas',description:'End view: current points outward to the right, magnetic field points out of the page, and J cross B points down, giving clockwise torque.',caption:'End view · schematic geometry and chosen field directions.',body:`
 <circle cx="165" cy="111" r="83" fill="#1d2c25" stroke="#82958a" stroke-width="3"/>
 <circle cx="165" cy="111" r="24" fill="#101715" stroke="#82958a" stroke-width="2"/>
 <path d="M194 111H242" class="current" marker-end="url(#drive-current)"/>
 <path d="M247 118V170" class="force" marker-end="url(#drive-force)"/>
 <circle cx="115" cy="68" r="11" fill="none" stroke="#9bd8ce" stroke-width="2"/><circle cx="115" cy="68" r="3" fill="#9bd8ce"/>
 <text x="52" y="40">B out of page</text><text x="207" y="99">J</text><text x="258" y="153">J × B</text>
 <text x="165" y="116" text-anchor="middle">axis</text><text x="165" y="216" text-anchor="middle">outer electrode</text>
 <text x="165" y="247" text-anchor="middle">ions turn → collisions turn neutrals</text>`},
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
export function guideDiagram(id){
 const d=drawings[id];if(!d)throw new Error(`Unknown guide diagram: ${id}`);
 return `<figure><svg viewBox="0 0 330 ${id==='energy'?312:270}" role="img" aria-labelledby="${id}-title ${id}-description">
 <title id="${id}-title">${d.title}</title><desc id="${id}-description">${d.description}</desc>
 <defs>${['current','force'].map((kind,i)=>`<marker id="${id}-${kind}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10Z" fill="${i?'#e4ac76':'#9bd8ce'}"/></marker>`).join('')}</defs>
 ${d.body}</svg><figcaption>${d.caption}</figcaption></figure>`;
}
