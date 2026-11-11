const format=value=>Number(value.toPrecision(5)).toLocaleString('en-US',{maximumSignificantDigits:5});

/** Recorded native cases only. No interpolation or live retention closure. */
export function setupFiniteFilmReference(host,data){
 const doc=host.ownerDocument,make=(tag,text)=>{const el=doc.createElement(tag);if(text!==undefined)el.textContent=text;return el;};
 const panel=make('details'),title=make('summary','Finite-film RustBCA'),scope=make('p','Recorded 100 keV D · assumed LiT / W · no live loading kernel'),select=make('select'),body=make('div');
 panel.className='finite-film-reference';panel.append(title,scope,select,body);host.append(panel);select.id='finite-film-reference-case';select.setAttribute('aria-label','Recorded finite-film case');
 if(data?.schema!==1||!Array.isArray(data.cases)||!data.cases.length)throw new RangeError('Unsupported finite-film reference dataset.');
 for(const c of data.cases){
  const counts=Object.values(c.partition);
  if(!Number.isSafeInteger(c.count)||c.count<=0||counts.length!==4||counts.some(n=>!Number.isSafeInteger(n)||n<0)||counts.reduce((a,b)=>a+b,0)!==c.count)
   throw new RangeError('Finite-film reference requires a complete incident partition.');
  const option=make('option',`${c.filmUm} µm LiT · ${c.backingUm?`${c.backingUm} µm W`:'free film'} · ${c.count} ions · seed ${c.seed}`);option.value=c.name;select.append(option);
 }
 function draw(){
  const c=data.cases.find(c=>c.name===select.value);body.replaceChildren();
  const table=make('table'),head=make('thead'),header=make('tr');for(const label of ['Outcome','Ions','Fraction · 95% interval'])header.append(make('th',label));head.append(header);table.append(head);
  const rows=make('tbody');
  for(const [key,label]of [['filmRetained','Film retained'],['backingRetained','Backing retained'],['reflected','Upstream escape'],['transmitted','Downstream escape']]){
   const row=make('tr'),interval=c.intervals95[key];row.append(make('th',label),make('td',String(c.partition[key])),make('td',`${format(c.partition[key]/c.count)} [${format(interval[0])}, ${format(interval[1])}]`));rows.append(row);
  }
  table.append(rows);body.append(table);
  const energy=make('dl');
  for(const [label,value,unit]of [['Incident',c.energy.incidentEV/c.count/1000,'keV / ion'],['Transferred',c.energy.projectileTransferredEV/c.count/1000,'keV / ion'],['Escaping projectiles',c.energy.escapedProjectileEnergyEV/c.count/1000,'keV / ion'],['Unresolved stopped projectiles',c.energy.unresolvedProjectileEnergyEV/c.count,'eV / ion']])energy.append(make('dt',label),make('dd',`${format(value)} ${unit}`));
  body.append(energy,make('p',`Projectile-energy gate: ${c.energy.passed?'pass':'fail'} · stopped residual budget 0–${format(c.energy.stoppedResidualBoundEV)} eV per case, with ±${format(c.energy.numericalToleranceEV)} eV numerical tolerance.`),
   make('p','Intervals: pointwise 95% Wilson sampling intervals per incident ion. They exclude material/model uncertainty. Energy transfers are incident-projectile transfers; recoil/binding/assembly heat is not a closed ledger.'),
   make('p',`Sampling refinement: ${data.refinement.passed?'pass':'fail'} · ${data.refinement.comparisonCount} comparisons · familywise α = ${data.refinement.alpha}.`));
  const provenance=make('details'),summary=make('summary','Evidence'),link=make('a','RustBCA source');link.href='https://github.com/lcpp-org/RustBCA';link.target='_blank';link.rel='noreferrer';
  provenance.append(summary,make('p',data.materialAssumptions),make('p',`Seed ${c.seed} · ${c.count} incident deuterons · normal incidence · ${c.energyKeV} keV`),make('p',`Input SHA256 ${c.inputSha256}`),make('p',`Binary SHA256 ${data.binarySha256}`),make('p',data.limitation),link);body.append(provenance);
 }
 select.addEventListener('change',draw);draw();return {panel,select};
}
