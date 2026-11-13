import {fuelBenchmarkReport} from './fuel-benchmark.ts';
import {renderPlots} from './laboratory.js';

/** Model-level evidence stays separate from the current, unmatched lithium scenario. */
export function mountFuelQualification(host){
 const doc=host.ownerDocument,el=(tag,text)=>{const n=doc.createElement(tag);if(text)n.textContent=text;return n;};
 const report=fuelBenchmarkReport(),section=el('section');section.className='fuel-qualification';
 section.setAttribute('aria-label','Live model qualification');
 section.append(el('h3','Experimental accuracy: unqualified'));
 const detail=el('details'),summary=el('summary','Measured rotation benchmark');detail.append(summary);section.append(detail);
 detail.append(el('p','1979 neutral-argon experiment · retrospective structural test. This is not a matched prediction from your current settings.'));
 detail.append(el('p',`Any rigid rotation has one angular speed. The five measured sightlines require incompatible angular speeds: the smallest possible worst-point discrepancy is ${(100*report.nominalMinimaxFraction).toFixed(1)}% before uncertainty. No drag adjustment can change that shape.`));
 const table=el('table'),caption=el('caption','20% per-signal compatibility screen'),head=el('tr');
 head.append(el('th','Observation ranges'),el('th','Any rigid speed?'));const thead=el('thead');thead.append(head);table.append(caption,thead);
 const tbody=el('tbody');
 for(const [key,label]of [['nominal','Nominal markers'],['digitization','Digitization boxes'],['bars','Published bars + radius boxes'],['combined','Bars + digitization sensitivity']]){
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
 detail.append(el('p','Shading is a bar-plus-digitization sensitivity range, not a confidence band. A rigid profile would be horizontal. All five admitted points are retained; two unresolved near-axis features remain excluded. The first and last points have limited digitization precision.'));
 detail.append(el('p',report.observationOperator));
 const blockers=el('details');blockers.append(el('summary','What remains unqualified'));
 const list=el('ul');for(const text of report.blockers)list.append(el('li',text));blockers.append(list);detail.append(blockers);
 const source=el('a','Original experiment ↗');source.href=report.source.url;source.target='_blank';source.rel='noopener';detail.append(source);
 const status=el('a','Qualification record ↗');status.href='https://github.com/noahsong-sdg/mass-spinner/blob/main/docs/LIVE-MODEL-QUALIFICATION.md';status.target='_blank';status.rel='noopener';const record=el('p');record.append(status);detail.append(record);
 const identity=el('details');identity.append(el('summary','Source identity'),el('p',report.source.conditions),el('p',report.source.independence));
 for(const key of ['pdfSha256','cropSha256','extractionSha256']){const line=el('p');line.append(el('span',`${key}: `),el('code',report.source[key]));identity.append(line);}detail.append(identity);
 host.prepend(section);return {report,dispose(){detail.removeEventListener('toggle',render);renderPlots(plot,[]);section.remove();}};
}
