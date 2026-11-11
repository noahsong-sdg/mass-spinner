import {modelInsights,globalTakeaways,TUTORIAL_SOURCE,LITHIUM_PRESET_NOTE} from './tutorial-insights.ts';

export function setupTutorialInsights(host){
 const details=document.createElement('details'),summary=document.createElement('summary'),body=document.createElement('div');
 details.className='source-controls';summary.textContent='What changes the outcome?';details.append(summary,body);host.append(details);
 const paragraph=(label,text)=>{const p=document.createElement('p'),b=document.createElement('strong');b.textContent=label+' ';p.append(b,document.createTextNode(text));body.append(p);};
 return {show(mode){
  const insight=modelInsights[mode];details.hidden=!insight;body.replaceChildren();if(!insight)return;
  paragraph(insight.section,insight.equation);paragraph('Try it.',insight.meaning);
  paragraph('Shown here.',insight.observable);paragraph('Boundary.',insight.boundary);
  if(mode==='centrifuge')paragraph('Li-6 / Li-7 preset.',LITHIUM_PRESET_NOTE);
  const failures=document.createElement('details'),heading=document.createElement('summary');heading.textContent='Shared limits: charge, neutrals, fields and useful output';failures.append(heading);
  for(const entry of globalTakeaways){const p=document.createElement('p'),b=document.createElement('strong');b.textContent=entry.title+'. ';p.append(b,document.createTextNode(entry.equation+' · '+entry.meaning));failures.append(p);}
  body.append(failures);const link=document.createElement('a');link.href=TUTORIAL_SOURCE;link.textContent='Tutorial: equations, mechanisms and limitations ↗';body.append(link);
  const coverage=document.createElement('p'),coverageLink=document.createElement('a');coverageLink.href='/CORE-COVERAGE.md';coverageLink.textContent='Coverage: interactive, reference and unresolved physics ↗';coverage.append(coverageLink);body.append(coverage);
 }};
}
