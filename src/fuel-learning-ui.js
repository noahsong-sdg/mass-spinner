import {renderPlots} from './laboratory.js';
import {publicInputCoverage} from './public-sensitivity.ts';
import {fuelLearningComparison} from './fuel-learning.js';

/** Result-owned scope and conditional comparisons, independent of pending slider values. */
export function createFuelLearningTools({document:doc,host,onCompare=()=>{}}){
 const el=(tag,text)=>{const node=doc.createElement(tag);if(text!==undefined)node.textContent=text;return node;};
 const scope=el('div'),coverage=el('details'),coverageTitle=el('summary'),coverageText=el('p');
 scope.id='fuel-result-scope';scope.className='fuel-result-scope';coverage.id='fuel-input-coverage';
 coverage.append(coverageTitle,coverageText,el('p','Screened inputs: default lithium setup at 0.015, 0.03 or 0.06 A; 1 s, 64 cells, 512 intervals, fixed temperature, no current switches. Three input nodes, not a slider range or a local-composition accuracy guarantee.'));
 const link=el('a','Qualification evidence');link.href='/qualification';coverage.append(link);
 const comparisons=el('details'),bar=el('div'),description=el('p'),plots=el('div');comparisons.id='fuel-learning-comparisons';
 comparisons.append(el('summary','Compare'),bar,description,plots);bar.className='fuel-learning-actions';plots.className='live-plots';
 const buttons=new Map();let result=null,state=null,kind=null,pending=true;
 for(const [key,label]of [['temperature','Warmer gas'],['rotation','Faster rotation'],['collection','Collection radius']]){
  const button=el('button',label);button.type='button';button.id=`fuel-compare-${key}`;button.disabled=true;button.setAttribute('aria-pressed','false');
  button.addEventListener('click',()=>{if(pending||!result)return;kind=key;onCompare();drawComparison();});bar.append(button);buttons.set(key,button);
 }
 host.append(scope,coverage,comparisons);
 function drawComparison(){
  for(const [key,button]of buttons)button.setAttribute('aria-pressed',String(kind===key));
  if(!kind||!result||pending)return;
  const comparison=fuelLearningComparison(result,state,kind);description.textContent=comparison.scope;
  renderPlots(plots,comparison.curves,{announce:false});
 }
 function setPending(message='Updating · previous accepted result'){
  pending=true;kind=null;scope.textContent=message;coverageTitle.textContent='Coverage pending';coverageText.textContent='Wait for an accepted result.';
  coverage.dataset.match='pending';for(const button of buttons.values()){button.disabled=true;button.setAttribute('aria-pressed','false');}
  description.textContent='';renderPlots(plots,[]);
 }
 function update(next,nextState,topic){
  result=next;state=nextState;pending=false;
  const timeSeries=['separation','spin','heat','thermal','momentum','inertia'].includes(topic)&&result.transport;
  const local=['composition','profile','cut','thermalProfile','gasEnergy','gasPressure'].includes(topic);
  const thermalEndpoint=['thermalProfile','gasEnergy','gasPressure'].includes(topic)&&result.transport;
  const evolving=timeSeries||thermalEndpoint||local&&Boolean(state.lightMass),thermal=evolving&&result.transport?.operation?.thermal?.enabled;
  const labels=[evolving?'Evolving trajectory':'Equilibrium / scenario reference',thermal?'Temperature evolves':`Temperature fixed · ${result.config.gasK} K`,
   topic==='pump'?'Conditional flow reference':topic==='inventory'?'Fuel-loop scenario':'Closed inventory · no extraction'];
  scope.replaceChildren(...labels.map(text=>el('span',text)));
  const coverageResult=publicInputCoverage(result);coverage.dataset.match=String(coverageResult.historicalInputMatch);
  coverageTitle.textContent=coverageResult.historicalInputMatch?'Matches screened inputs':'Exploratory inputs';
  coverageText.textContent=`${coverageResult.text} No experimental accuracy claim.`;
  for(const button of buttons.values())button.disabled=false;
  drawComparison();
 }
 setPending('Run the simulator to inspect results.');
 return {update,setPending,dispose(){renderPlots(plots,[]);scope.remove();coverage.remove();comparisons.remove();}};
}
