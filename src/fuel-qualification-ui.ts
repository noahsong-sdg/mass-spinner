import {fuelBenchmarkReport} from './fuel-benchmark.js';
import {renderPlots} from './laboratory.js';

/** Model-level evidence stays separate from the current, unmatched lithium scenario. */
export function mountFuelQualification(host: HTMLElement){
 const doc=host.ownerDocument,el=<K extends keyof HTMLElementTagNameMap>(tag: K,text?: string)=>{const n=doc.createElement(tag);if(text)n.textContent=text;return n;};
 const report=fuelBenchmarkReport(),section=el('section');section.className='fuel-qualification';
 section.setAttribute('aria-label','Live model qualification');
 section.append(el('h3','Experimental accuracy: unqualified'));
 const detail=el('details'),summary=el('summary','Measured rotation benchmark');detail.append(summary);section.append(detail);
 detail.append(el('p','The 1979 neutral-argon experiment gives a test of the assumed rotation profile. These data do not describe your current settings.'));
 detail.append(el('p',`Rigid rotation has one angular speed. The five measured sightlines give different angular speeds. The minimum worst-point difference is ${(100*report.nominalMinimaxFraction).toFixed(1)}% before uncertainty. A drag change cannot correct that profile shape.`));
 const table=el('table'),caption=el('caption','20% per-signal compatibility screen'),head=el('tr');
 head.append(el('th','Observation ranges'),el('th','Any rigid speed?'));const thead=el('thead');thead.append(head);table.append(caption,thead);
 const tbody=el('tbody');
 for(const [key,label]of [['nominal','Nominal markers'],['digitization','Digitization boxes'],['bars','Published bars + radius boxes'],['combined','Bars + digitization sensitivity']] as const){
  const row=el('tr'),result=report.cases[key];row.append(el('th',label),el('td',result.status==='incompatible'?'Excluded':'Not excluded'));tbody.append(row);
 }
 table.append(tbody);detail.append(table);
 const plot=el('div');plot.className='live-plots';detail.append(plot);
 // Render after disclosure opens, so the existing responsive plot receives its real width.
 const render=()=>{if(!detail.open)return;const p=report.points;renderPlots(plot,[{
  label:'Apparent speed / sightline offset',x:p.map(p=>p.radiusM*100),y:p.map(p=>p.velocityMS/p.radiusM),
  low:p.map(p=>p.combinedRangeMS[0]/p.radiusRangeM[1]),high:p.map(p=>p.combinedRangeMS[1]/p.radiusRangeM[0]),
  xLabel:'Sightline offset (cm)',yLabel:'Apparent angular speed (rad/s)',
 }]);};detail.addEventListener('toggle',render);
 detail.append(el('p','Shading combines published bars and digitization sensitivity. It is not a confidence band. Rigid rotation would give a horizontal line. The comparison keeps all five resolved points but omits two unresolved near-axis features. The first and last points have limited digitization precision.'));
 detail.append(el('p',report.observationOperator));
 const blockers=el('details');blockers.append(el('summary','Remaining accuracy limits'));
 const list=el('ul');for(const text of report.blockers)list.append(el('li',text));blockers.append(list);detail.append(blockers);
 const source=el('a','Original experiment ↗');source.href=report.source.url;source.target='_blank';source.rel='noopener';detail.append(source);
 const status=el('a','Qualification record ↗');status.href='https://github.com/noahsong-sdg/mass-spinner/blob/main/docs/LIVE-MODEL-QUALIFICATION.md';status.target='_blank';status.rel='noopener';const record=el('p');record.append(status);detail.append(record);
 const identity=el('details');identity.append(el('summary','Source identity'),el('p',report.source.conditions),el('p',report.source.independence));
 for(const key of ['pdfSha256','cropSha256','extractionSha256'] as const){const line=el('p');line.append(el('span',`${key}: `),el('code',report.source[key]));identity.append(line);}detail.append(identity);
 host.prepend(section);return {report,dispose(){detail.removeEventListener('toggle',render);renderPlots(plot,[]);section.remove();}};
}
