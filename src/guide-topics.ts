/** Stable reading anchors and actions over the existing centrifuge controls. */
export type GuideTopic = {id:string;heading:string;diagram?:string;actions:readonly (readonly [string,string])[]};
export const guideTopics=[
 {id:'goal',heading:'What are we trying to predict?',actions:[['spin','Replay spin-up']]},
 {id:'composition',heading:'1. Why does rotation separate masses?',diagram:'composition',actions:[['composition','Show end-of-run composition'],['axis','Probe axis'],['wall','Probe wall'],['density','Show species density']]},
 {id:'bias',heading:'2. How strong is the separation?',actions:[['temperature','Compare 2× temperature'],['rotation','Compare 2× rotation'],['equilibrium','Open equilibrium calculator']]},
 {id:'drive',heading:'3. How do we spin a gas without spinning a drum?',diagram:'drive',actions:[['look','Show gas & drive'],['current','Adjust current']]},
 {id:'momentum',heading:'4. What sets the rotation speed?',actions:[['currentExperiment','Try the current experiment'],['endSpin','Show end-of-run speeds'],['spin','Replay spin-up'],['momentum','Show angular momentum'],['inertia','Show gas inertia'],['current','Adjust current'],['collisions','Adjust collisions'],['drag','Adjust wall drag']]},
 {id:'energy',heading:'5. Where does the energy go?',diagram:'energy',actions:[['work','Show drive work'],['thermal','Open thermal controls'],['thermalPlot','Show temperature']]},
 {id:'collection',heading:'6. Why do we need time and collection, too?',actions:[['collection','Show end-of-run cuts'],['cut','Probe collection curve'],['diffusion','Adjust diffusivity'],['duration','Adjust run duration']]},
 {id:'limits',heading:'Why these pieces, and what is still missing?',actions:[['pin','Pin this run as A']]},
 {id:'views',heading:'What do the menu options mean?',actions:[]},
 {id:'path',heading:'Where do we go after this guide?',actions:[]},
] as const satisfies readonly GuideTopic[];
export type GuideTopicId = typeof guideTopics[number]['id'];
export type GuideAction = typeof guideTopics[number]['actions'][number][0];
export const guideActions:ReadonlySet<string>=new Set<string>(guideTopics.flatMap(topic=>topic.actions.map(([key])=>key)));
