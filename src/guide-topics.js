/** Stable reading anchors and actions over the existing centrifuge controls. */
export const guideTopics=[
 {id:'goal',heading:'What are we trying to predict?',actions:[['spin','Replay spin-up']]},
 {id:'drive',heading:'1. How do we spin a gas without spinning a drum?',diagram:'drive',actions:[['look','Show gas & drive'],['current','Adjust current']]},
 {id:'composition',heading:'2. Why does rotation separate masses?',diagram:'composition',actions:[['composition','Show composition'],['axis','Probe axis'],['wall','Probe wall']]},
 {id:'bias',heading:'3. How strong is the separation?',actions:[['temperature','Compare 2× temperature'],['rotation','Compare 2× rotation']]},
 {id:'momentum',heading:'4. What sets the rotation speed?',actions:[['spin','Replay spin-up'],['current','Adjust current'],['collisions','Adjust collisions'],['drag','Adjust wall drag']]},
 {id:'energy',heading:'5. Where does the energy go?',diagram:'energy',actions:[['work','Show drive work'],['thermal','Open thermal controls'],['thermalPlot','Show temperature']]},
 {id:'collection',heading:'6. Why do we need time and collection, too?',actions:[['collection','Show purity & recovery'],['cut','Adjust collection radius'],['diffusion','Adjust diffusivity']]},
 {id:'limits',heading:'Why these pieces, and what is still missing?',actions:[['pin','Pin this run as A']]},
];
export const guideActions=new Set(guideTopics.flatMap(topic=>topic.actions.map(([key])=>key)));
