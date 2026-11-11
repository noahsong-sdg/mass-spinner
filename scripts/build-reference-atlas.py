"""Original Section II E–K educational schematics. No experimental images copied.
Run: .tools/atlas-venv/bin/python scripts/build-reference-atlas.py
All geometry is explanatory, not apparatus CAD or predicted product purity.
"""
from pathlib import Path
import json
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import Circle, Rectangle, FancyArrowPatch, Arc
from PIL import Image

OUT=Path('web-assets/reference-atlas'); OUT.mkdir(parents=True,exist_ok=True)
BG='#121918'; PANEL='#1c2925'; INK='#e6ece4'; MUTED='#a7b9ae'; GRID='#354b40'
SAGE='#a4c8af'; COPPER='#dda579'; BLUE='#9cb9d0'; NEUTRAL='#71877c'; GOLD='#d5c28b'
plt.rcParams.update({'font.family':'DejaVu Sans','font.size':12,'text.color':INK,'axes.labelcolor':MUTED,
 'xtick.color':MUTED,'ytick.color':MUTED,'axes.edgecolor':GRID,'axes.facecolor':BG,'figure.facecolor':BG})
SOURCE={'title':'Zweben, Gueroult & Fisch — Plasma mass separation (2018)','url':'https://doi.org/10.1063/1.5042845'}
SOURCE_PDF={'title':'Author-hosted tutorial PDF (PPPL)','url':'https://w3.pppl.gov/~fisch/fischpapers/2018/Zweben_PMF_POP18.pdf'}
MANIFEST=[]

def canvas(section,title,subtitle):
 fig=plt.figure(figsize=(12.8,8),dpi=125)
 fig.text(.055,.955,f'MASS SPINNER  /  SECTION {section}  /  REFERENCE ATLAS',color=COPPER,fontsize=10,weight='bold')
 fig.text(.055,.9,title,fontsize=25,weight='normal')
 fig.text(.055,.851,subtitle,fontsize=11,color=MUTED)
 ax=fig.add_axes([.055,.19,.89,.60]);ax.set(xlim=(0,10),ylim=(0,6));ax.axis('off')
 fig.text(.055,.047,'Original educational schematic · based on Zweben, Gueroult & Fisch (2018), Section '+section,fontsize=9,color=NEUTRAL)
 return fig,ax

def arrow(ax,start,end,color=SAGE,lw=2,style='-|>',rad=0,scale=15,linestyle='-'):
 p=FancyArrowPatch(start,end,arrowstyle=style,mutation_scale=scale,lw=lw,color=color,
  connectionstyle=f'arc3,rad={rad}',linestyle=linestyle);ax.add_patch(p);return p

def text(ax,x,y,label,color=INK,size=12,ha='left',va='center',**kw):
 return ax.text(x,y,label,color=color,fontsize=size,ha=ha,va=va,**kw)

def panel(ax,x,y,w,h):
 ax.add_patch(Rectangle((x,y),w,h,facecolor=PANEL,edgecolor=GRID,lw=1))

def finish(fig,ax,id,section,title,mechanism,pros,cons,limitations,alt):
 fig.text(.055,.123,'CONCEPT, NOT A DEVICE PREDICTION',fontsize=9,color=COPPER,weight='bold')
 fig.text(.055,.087,limitations,fontsize=9,color=MUTED)
 fig.savefig(OUT/f'{id}.png',dpi=125,facecolor=BG);plt.close(fig)
 MANIFEST.append({'id':id,'section':section,'title':title,'image':f'/reference-atlas/{id}.png','alt':alt,
  'mechanism':mechanism,'pros':pros,'cons':cons,'limitations':limitations,'sources':[SOURCE,SOURCE_PDF]})

# E: show endpoint physics rather than drawing a fictitious self-consistent field map.
fig,ax=canvas('II E','Magnetic centrifugal mass filter','Two different endpoint conditions can favor different masses.')
panel(ax,.05,.45,4.65,5.1);panel(ax,5.3,.45,4.65,5.1)
text(ax,.35,5.15,'INWARD END PLUG',COPPER,11,weight='bold');text(ax,5.6,5.15,'OUTWARD MAGNETIC MIRROR',SAGE,11,weight='bold')
for x,r in [(1.05,.35),(3.7,.95)]:
 ax.plot([x,x],[2.65-r,2.65+r],color=INK,lw=3)
ax.plot([1.05,3.7],[3,3.6],color=GRID,lw=2);ax.plot([1.05,3.7],[2.3,1.7],color=GRID,lw=2)
arrow(ax,(3.25,2.8),(1.2,2.8),SAGE,2.5);text(ax,2.4,3.95,'Light ions can cross',SAGE,12,ha='center')
arrow(ax,(2.25,2.1),(3.3,2.1),COPPER,2.5,rad=-.35);text(ax,2.4,1.25,'Heavier ions face a larger\ncentrifugal barrier',COPPER,12,ha='center')
text(ax,1.05,3.35,r'$r_{end}<r_{source}$',MUTED,11,ha='center')
for x,w in [(6.1,.2),(8.7,.45)]:
 ax.add_patch(Rectangle((x-w/2,1.45),w,2.65,facecolor=GRID,edgecolor=MUTED,lw=1))
arrow(ax,(6.2,2.8),(9.5,2.8),COPPER,2.5);text(ax,7.8,4.5,'Rotation can favor heavy-ion escape',COPPER,11,ha='center')
arrow(ax,(8,2),(6.5,2),SAGE,2.5,rad=-.4);text(ax,7.7,1.05,'Magnetic moment resists escape;\noutward centrifugal change assists it.',MUTED,11,ha='center')
text(ax,5.75,3.55,r'$B_{end}>B_{source}$',MUTED,11)
text(ax,5,.03,r'Endpoint barrier:  $\Delta U=\mu\Delta B-\frac{1}{2}m\Omega^2\Delta(r^2)$',INK,15,ha='center')
finish(fig,ax,'mcmf','II E','Variable-field / magnetic centrifugal filter',
 'Rotation and magnetic-mirror barriers create different escape conditions at two ends.',
 ['Two end conditions can direct light and heavy fractions to different outlets.','The separation coordinate is axial, which can simplify product access.'],
 ['Loss cones need collision-driven replenishment without excessive cross-field mixing.','Rotation, field geometry, end sheaths and collection must all be controlled.'],
 'Endpoint sketch only. A complete field, pitch-angle scattering, replenishment and throughput are not calculated.',
 'Two panels contrast an inward centrifugal end plug favoring light-ion escape with an outward magnetic mirror where rotation can favor heavier-ion escape.')

# F1: no invented experimental trajectories or mass ordering.
fig,ax=canvas('II F','Plasma-optical mass separation','POMS uses a strong magnetic core and coupled plasma optics.')
ax.add_patch(Circle((5,3.15),1.05,facecolor=GRID,edgecolor=SAGE,lw=2));ax.add_patch(Circle((5,3.15),.68,fill=False,edgecolor=MUTED,lw=1))
text(ax,5,3.15,'Strong\nmagnetic core',INK,14,ha='center');text(ax,5,1.75,'“Azimuthator”',MUTED,12,ha='center')
ax.add_patch(Rectangle((.3,2.65),1.2,1,facecolor=PANEL,edgecolor=MUTED));text(ax,.9,3.15,'Energetic\nion source',INK,12,ha='center');arrow(ax,(1.5,3.15),(3.5,3.15),INK,2.5)
arrow(ax,(3.4,3.3),(7.95,4.65),SAGE,2.5,rad=-.48);arrow(ax,(3.4,3),(8.45,1.8),COPPER,2.5,rad=.38)
for x,y in [(8.2,4.2),(8.7,1.4)]:
 ax.add_patch(Rectangle((x,y),.3,.85,facecolor=PANEL,edgecolor=MUTED,lw=2))
text(ax,8.05,5.35,'Distinct collection zones',INK,12,ha='center')
ax.add_patch(Rectangle((4.15,5.12),1.7,.22,facecolor=COPPER,edgecolor=COPPER));text(ax,5,5.65,'Thermo-electron emission',COPPER,12,ha='center')
for x in [4.35,4.8,5.3,5.65]:arrow(ax,(x,5.1),(x,4.45),BLUE,1.3,linestyle='--')
text(ax,1,1.2,'Charge separation and emitted electrons\nhelp determine the electric field.',MUTED,12)
text(ax,9.6,.25,'Paths are conceptual, not mass-calibrated.',MUTED,10,ha='right')
finish(fig,ax,'poms','II F','Plasma-optical mass separation (POMS)',
 'A strong magnetic core redirects energetic ions; electron emission and charge-separation fields participate in the optics.',
 ['The tutorial reports separation experiments with nitrogen, argon and krypton.','Collection may occur at different radial or axial locations.'],
 ['The energetic source and nonuniform magnetic optics complicate the apparatus.','Electron emission and self-generated fields are needed for predictive optics.'],
 'Original conceptual layout. It is not a reconstruction of a POMS experiment or a calculated field/trajectory map.',
 'Energetic ions enter a strong magnetic core region with thermionic electron emission; conceptual deflected paths reach separate collector zones.')

# F2: right-hand-rule field and the exact prescribed field laws.
fig,ax=canvas('II F','Azimuthal magnetic field + radial electric field','A central axial current produces a magnetic field that circles the conductor.')
# This transverse section has a metric radius: preserve circular field lines on screen.
ax.set_aspect('equal',adjustable='box')
c=(2.65,3.05)
ax.add_patch(Circle(c,2.05,fill=False,edgecolor=MUTED,lw=1.5));ax.add_patch(Circle(c,.38,facecolor=GRID,edgecolor=INK,lw=1.5));ax.add_patch(Circle(c,.07,color=INK))
text(ax,2.65,.43,'Cross-section · axial current out of page',MUTED,10,ha='center')
for r in [.85,1.35,1.8]:
 ax.add_patch(Arc(c,2*r,2*r,theta1=25,theta2=330,edgecolor=SAGE,lw=1.6));a=np.radians(330);end=(c[0]+r*np.cos(a),c[1]+r*np.sin(a));start=(c[0]+r*np.cos(a-.15),c[1]+r*np.sin(a-.15));arrow(ax,start,end,SAGE,1.6,scale=12)
for angle in [20,115,205]:
 t=np.radians(angle);arrow(ax,(c[0]+.55*np.cos(t),c[1]+.55*np.sin(t)),(c[0]+1.9*np.cos(t),c[1]+1.9*np.sin(t)),COPPER,2)
text(ax,.6,5.55,r'$B_\theta$ circles current',SAGE,12);text(ax,3.1,5.15,r'$E_r$ radial',COPPER,12)
text(ax,5.65,5.25,'IDEAL PRESCRIBED FIELD LAWS',INK,12,weight='bold')
text(ax,5.65,4.45,r'$B_\theta(r)=\frac{\mu_0 I}{2\pi r}$',SAGE,20)
text(ax,5.65,3.4,r'$\phi(r)=V\,\frac{\ln(a/r)}{\ln(a/r_{in})}$',COPPER,20)
text(ax,5.65,2.2,'Ions enter through an annular source.\nMass-to-charge response changes their orbits.',MUTED,12)
text(ax,5.65,1.15,'Large current and immersed bias electrodes\nare engineering requirements, not free inputs.',MUTED,11)
finish(fig,ax,'azimuthal','II F','Azimuthal-B / radial-E geometry',
 'An axial central current creates Bθ∝1/r; a logarithmic radial potential alters ion orbits in an annular plasma.',
 ['Calculations reviewed in the tutorial suggested separation with little ion deposition on electrodes.'],
 ['The cited concept requires a large central current and biased plasma electrodes.','Prescribed fields do not establish field penetration, sheaths or collection efficiency.'],
 'Ideal geometry and field laws only. This is distinct from POMS and from a magnetic cusp.',
 'An annular transverse cross-section shows an axial conductor, counterclockwise azimuthal B and outward radial E, with the ideal inverse-radius B and logarithmic potential equations.')

# G: local force chain with a consistent E×B sign.
fig,ax=canvas('II G','Radial advection from neutral friction','Collisions acting on azimuthal rotation can produce a radial ion drift.')
panel(ax,.2,.5,5.6,5.1);panel(ax,6.2,.5,3.6,5.1)
center=(2.85,3.1)
for x,y in [(1.2,1.5),(4.8,1.4),(1.1,4.6),(4.9,4.6),(4.6,3.4),(1.1,2.9)]:ax.add_patch(Circle((x,y),.11,facecolor=NEUTRAL,edgecolor='none'))
ax.add_patch(Circle(center,.2,color=SAGE));arrow(ax,center,(5.1,3.1),COPPER,2.5);text(ax,4.1,2.67,'Radial E',COPPER,12)
arrow(ax,center,(2.85,1.05),SAGE,2.5);text(ax,3.07,1.5,r'$E\times B$ flow',SAGE,12)
arrow(ax,(2.5,3.1),(2.5,4.85),MUTED,2.5);text(ax,2.25,4.3,'Neutral\ndrag',MUTED,12,ha='right')
ax.add_patch(Circle((1.45,3.8),.22,fill=False,edgecolor=BLUE,lw=1.7));ax.add_patch(Circle((1.45,3.8),.035,color=BLUE));text(ax,1.45,4.25,'B out',BLUE,10,ha='center')
text(ax,6.6,4.85,'THE TRANSPORT CHAIN',COPPER,11,weight='bold')
text(ax,6.65,3.95,'Azimuthal rotation',INK,15);arrow(ax,(7.8,3.6),(7.8,3.1),MUTED,1.5)
text(ax,6.65,2.8,'Mass-dependent friction',INK,13);arrow(ax,(7.8,2.45),(7.8,1.95),MUTED,1.5)
text(ax,6.65,1.65,'Radial mean drift',SAGE,15)
text(ax,.4,.12,'Local Cartesian view: E →, B ⊙, rotation ↓; friction opposes rotation.',MUTED,10)
finish(fig,ax,'advection','II G','Radial advection',
 'Neutral friction on azimuthally rotating ions produces a cross-field radial drift; reduced mass and collision law affect species response.',
 ['It may use rotation already present in a linear plasma.','It is relevant to understanding competing radial transport in other separators.'],
 ['The tutorial neutral-friction mass dependence is weak.','Spatial collision profiles, neutral composition and evolving density must be specified.'],
 'Local force-direction sketch. No neutral-rate calibration, evolved density profile or collection fraction is implied.',
 'A local E-right, B-out-of-page force diagram shows downward E-cross-B flow, upward neutral drag and the chain from rotation through friction to radial advection.')

# H: the important null result, with exactly coincident analytical curves.
fig,ax=canvas('II H','Radial diffusion can give no mass separation','Heavy-ion Coulomb diffusion: a larger orbit can be cancelled by fewer collisions.')
text(ax,.2,4.95,r'$\rho_h^2\ \propto\ m_h$',SAGE,23);text(ax,.2,3.95,r'$\nu_{h\ell}\ \propto\ 1/m_h$',COPPER,23)
text(ax,.2,2.8,r'$D_\perp\simeq\frac{1}{2}\rho_h^2\nu_{h\ell}$',INK,24)
text(ax,.2,1.55,'Leading heavy-mass dependence cancels.',INK,13)
text(ax,.2,.85,'Trace heavy ions, common temperature,\nsame charge, strongly magnetized limit.',MUTED,11)
a=fig.add_axes([.54,.295,.37,.43]);x=np.linspace(0,5,240);cdf=-np.expm1(-x*x/4)
a.plot(x,cdf,color=SAGE,lw=4,label='Heavy species A');a.plot(x,cdf,color=COPPER,lw=2,ls='--',label='Heavy species B')
a.set(xlim=(0,5),ylim=(0,1.03),xlabel=r'Radius / $\sqrt{Dt}$',ylabel='Probability inside radius');a.grid(color=GRID,alpha=.5);a.spines[['top','right']].set_visible(False);a.legend(facecolor=BG,edgecolor=GRID,labelcolor=INK,loc='lower right',fontsize=9)
finish(fig,ax,'diffusion','II H','Radial diffusion',
 'Randomized magnetized motion creates radial spread; in the tutorial heavy-on-light Coulomb limit the leading test-ion mass dependence cancels.',
 ['Collisional, relatively cool and dense plasmas may reduce auxiliary heating needs.','The conceptual geometry is simple.'],
 ['The tutorial classical Coulomb benchmark gives little or no heavy-mass separation.','Fluctuations and other collision channels can dominate the classical coefficient.'],
 'The overlaid curves intentionally coincide. Other collision operators require their own coefficients and applicability checks.',
 'Mass scaling equations show gyroradius squared growing with heavy mass while collision frequency falls inversely; two identical radial cumulative diffusion curves illustrate the resulting null separation.')

# I: conditional equal-nu comparison, not an assertion of a universal mass law.
fig,ax=canvas('II I','Collisional ion mobility','A prescribed electric field shifts a thermally spreading ion population.')
for x,sign in [(.45,'+'),(9.2,'−')]:
 ax.add_patch(Rectangle((x,.9),.3,3.95,facecolor=GRID,edgecolor=MUTED));text(ax,x+.15,5.2,sign,COPPER,25,ha='center')
arrow(ax,(1.2,5.1),(8.3,5.1),COPPER,2.5);text(ax,4.7,5.55,'Prescribed bulk E',COPPER,12,ha='center')
xx=np.linspace(1,8.8,300)
for y,mean,sigma,color,label in [(3.75,6.4,.65,SAGE,'A: faster mean drift'),(1.85,3.75,.45,COPPER,'B: slower mean drift')]:
 curve=np.exp(-.5*((xx-mean)/sigma)**2)
 ax.fill_between(xx,y-.3,y-.3+.9*curve,color=color,alpha=.25);ax.plot(xx,y-.3+.9*curve,color=color,lw=2)
 arrow(ax,(1.2,y-.6),(mean,y-.6),color,1.8);text(ax,1.2,y+.8,label,color,12)
text(ax,5,.15,r'$v_d=\mu E,\qquad \mu=\frac{q}{m\nu}$',INK,20,ha='center')
finish(fig,ax,'mobility','II I','Ion mobility',
 'Electric forcing and collisional drag set a mean drift, while thermal diffusion broadens the species distribution.',
 ['No applied magnetic field is required.','A collisional mass-dependent drift can provide a separation coordinate.'],
 ['Diffusion broadens the output and competes with the directed flow.','Debye shielding can prevent the assumed field from reaching a neutralized plasma.','Collision frequencies are species dependent, so equal ν is not a universal gas law.'],
 'Illustrative profiles assume equal positive charge and equal collision frequency; they are not calibrated output distributions.',
 'Two illustrative spreading ion profiles drift between bias electrodes; one has a faster mean at equal charge and collision frequency, beside the mobility equation.')

# J: actual Maxwellian shape, explicitly hypothetical thresholds, no rate/purity claim.
fig,ax=canvas('II J','Differential ionization','Selectivity depends on the whole electron distribution and ionization cross sections.')
a=fig.add_axes([.09,.31,.40,.41]);E=np.linspace(0,35,400);Te=5;f=np.sqrt(E)*np.exp(-E/Te);f/=np.trapezoid(f,E)
a.fill_between(E,f,color=BLUE,alpha=.2);a.plot(E,f,color=BLUE,lw=2)
for val,color,label in [(4,SAGE,'Example threshold A'),(14,COPPER,'Example threshold B')]:a.axvline(val,color=color,ls='--',lw=1.8);a.text(val+.4,.078 if val==4 else .058,label,color=color,fontsize=9,rotation=90,va='top')
a.set(xlim=(0,35),ylim=(0,.105),xlabel='Electron energy (eV)',ylabel='Normalized electron energy density');a.grid(color=GRID,alpha=.4);a.spines[['top','right']].set_visible(False)
text(ax,5.65,4.75,'Neutral feed + electrons',INK,14)
arrow(ax,(7.25,4.25),(7.25,3.6),BLUE,2)
ax.add_patch(Rectangle((5.8,2.45),3,.9,facecolor=PANEL,edgecolor=GRID));text(ax,7.3,2.9,'Ionization region',INK,14,ha='center')
arrow(ax,(6.6,2.45),(5.9,1.3),SAGE,2);arrow(ax,(8,2.45),(8.7,1.3),NEUTRAL,2)
text(ax,5.9,.95,'Ion product',SAGE,12,ha='center');text(ax,8.5,.95,'Neutral remainder',MUTED,12,ha='center')
text(ax,5,.02,r'$k_{ion}=\langle\sigma_{ion}v_e\rangle$  — a threshold alone does not determine a rate.',INK,13,ha='center')
finish(fig,ax,'ionization','II J','Differential ionization energy',
 'Electron energy control changes species-specific ionization; extraction must then separate ions from the remaining neutrals.',
 ['Different ionization thresholds offer elemental or molecular selectivity.','Low-threshold species can be attractive targets.'],
 ['Broad electron distributions and gradual cross sections limit sharp selectivity.','Measured cross sections, recombination and extraction history are required for predictive fractions.'],
 'Hypothetical thresholds and a Maxwellian shape illustrate the mechanism; no measured atomic rates or product purities are plotted.',
 'A Maxwellian electron-energy curve crosses two hypothetical ionization thresholds; a process diagram separates an ionized product branch from neutral remainder.')

# K: exact zero-width fixed-energy arrival benchmark and moving-collector mapping.
fig,ax=canvas('II K','Transit-time separation','Equal kinetic energy gives different flight times; collector motion maps time to position.')
ax.add_patch(Rectangle((.2,3.2),1.05,1.35,facecolor=PANEL,edgecolor=MUTED));text(ax,.72,3.9,'Pulsed\nsource',INK,12,ha='center')
for yy in [3.15,4.6]:ax.plot([1.4,8.25],[yy,yy],color=GRID,lw=2)
arrow(ax,(1.4,4.1),(7.6,4.1),SAGE,2.5);arrow(ax,(1.4,3.65),(5.9,3.65),COPPER,2.5)
text(ax,4.7,5.2,'Guided low-collision flight region',MUTED,12,ha='center');text(ax,4.7,2.85,'Fixed energy · narrow pulse · finite energy spread broadens arrivals',MUTED,10,ha='center')
ax.add_patch(Rectangle((8.6,3),.25,1.9,facecolor=GRID,edgecolor=MUTED));arrow(ax,(9.25,3.1),(9.25,4.75),INK,2);text(ax,9.25,5.25,'Moving\ncollector',INK,11,ha='center')
AMU=1.66053906660e-27;q=1.602176634e-19;L=10;energy=10
arrival=[L/np.sqrt(2*q*energy/(m*AMU))*1000 for m in [40,250]]
ax.plot([1.4,8],[1.2,1.2],color=MUTED,lw=1)
for t,color,label in zip(arrival,[SAGE,COPPER],['40 u','250 u']):
 x=1.4+t/4.2*6.6;arrow(ax,(x,1.2),(x,2.2),color,2.5);text(ax,x,.78,f'{label}\n{t:.2f} ms',color,10,ha='center')
text(ax,4.5,2.45,'Ideal delta-pulse arrival times · 10 eV, 10 m',MUTED,10,ha='center')
text(ax,6.3,.05,r'$t=L\sqrt{m/(2K)}$;  $\Delta x=v_{collector}\Delta t$',INK,14,ha='center')
finish(fig,ax,'transit','II K','Transit time / moving collector',
 'A narrow pulsed energy packet disperses in time; synchronized moving collectors convert arrival-time differences into deposition positions.',
 ['Arrival time is a direct separation coordinate.','Segmented collectors can make deposited fractions mechanically accessible.'],
 ['Energy spread, scattering and pulse width blur arrivals.','Slits and pulsed duty cycle reduce useful throughput.','A rapidly moving collector must operate in vacuum.'],
 'Arrival times are the exact ballistic fixed-energy limit; no source broadening, scattering, slit loss or collector efficiency is implied.',
 'A pulsed source sends equal-energy ions along a guide to a moving collector; exact ideal arrival markers for 40u and 250u at10eV over10m show time dispersion.')

# E variant: depict a generic rotating magnetic drive, not an invented separator law.
fig,ax=canvas('II E','Rotating magnetic-field proposal','A rotating magnetic field is a distinct drive concept; it is not the ICR rotating electric field.')
for x,y,w,h in [(1,1.5,.25,3.1),(4.25,1.5,.25,3.1),(1.6,4.9,2.3,.2),(1.6,.9,2.3,.2)]:
 ax.add_patch(Rectangle((x,y),w,h,facecolor=GRID,edgecolor=MUTED))
ax.add_patch(Circle((2.75,3.05),1,facecolor=PANEL,edgecolor=GRID))
for angle,color in [(0,SAGE),(90,BLUE),(180,NEUTRAL),(270,COPPER)]:
 t=np.radians(angle);arrow(ax,(2.75,3.05),(2.75+1.25*np.cos(t),3.05+1.25*np.sin(t)),color,2)
text(ax,2.75,5.6,'Successive drive phases',SAGE,13,ha='center')
text(ax,2.75,.4,'Generic transverse-field drive schematic',MUTED,10,ha='center')
text(ax,5.4,5.15,'WHAT MUST BE SPECIFIED',COPPER,12,weight='bold')
text(ax,5.4,4.2,'Field waveform and frequency',INK,14)
text(ax,5.4,3.35,'Induced electric field',INK,14)
text(ax,5.4,2.5,'Plasma response and current drive',INK,14)
text(ax,5.4,1.65,'Species transport and collection',INK,14)
text(ax,5,.04,r'$\nabla\times\mathbf{E}=-\partial\mathbf{B}/\partial t$  — a changing B also induces E.',INK,14,ha='center')
finish(fig,ax,'rotatingmagnetic','II E','Rotating magnetic-field proposal',
 'The tutorial identifies separation using rotating magnetic fields as a distinct proposal and directs the reader to external references.',
 ['[Inference] A time-dependent magnetic drive offers a different control mechanism from static electrode bias.'],
 ['Section II does not specify a complete quantitative field, plasma-response or collector model.','The induced electric field and current response must be included in any predictive implementation.'],
 'Generic rotating-field drive concept only. No separator geometry, mass selection, transport rate or performance is predicted.',
 'Four colored magnetic vectors depict successive phases of a generic transverse rotating magnetic drive; a checklist identifies the missing induced electric field, plasma response and transport closures.')

# G variant: prescribe an illustrative gradient without inventing its transport closure.
fig,ax=canvas('II G','Collisionality-gradient advection','A collision-frequency gradient coupled to diamagnetic flow can drive species-dependent transport.')
panel(ax,.15,.65,4.8,4.7);panel(ax,5.35,.65,4.5,4.7)
for i in range(8):
 x=.4+i*.53;ax.plot([x,x],[1.4,4.6],color=SAGE,alpha=.12+.085*i,lw=18)
arrow(ax,(.5,1.15),(4.55,1.15),MUTED,1.6);text(ax,2.55,.84,'Position across the gradient',MUTED,10,ha='center')
text(ax,2.55,4.95,'ASSUMED COLLISION PROFILE',COPPER,10,ha='center',weight='bold')
arrow(ax,(.7,2),(4.3,4),SAGE,2);text(ax,2.55,3.2,r'$\nu(x)$ increases',INK,14,rotation=19,ha='center')
text(ax,5.7,4.75,'Gradient + diamagnetic flow',INK,14)
arrow(ax,(7.6,4.35),(7.6,3.9),MUTED,1.5)
text(ax,7.6,3.55,'Mass- and energy-dependent drift',SAGE,13,ha='center')
text(ax,5.7,2.5,'A transport closure determines the sign,\nstrength and species response.',MUTED,12)
text(ax,5.7,1.45,'Density and temperature gradients,\nmagnetization and boundaries matter.',MUTED,11)
text(ax,5,.12,'The plotted gradient is an illustration, not a measured profile or a computed drift.',MUTED,11,ha='center')
finish(fig,ax,'collisionality','II G','Collisionality-gradient advection',
 'A collisionality gradient combined with ion diamagnetic flow can produce a radial drift depending on species mass and energy.',
 ['The tutorial cites a theoretical scheme with potentially substantial separation.'],
 ['The spatial gradients and applicable magnetized collision regime must be established.','Section II does not give a closed numerical transport model for this variant.'],
 'Illustrative collision-frequency gradient only. The direction, magnitude, collection and energetic cost of transport are not solved.',
 'An illustrative increasing collision-frequency profile is linked to diamagnetic flow and a conditional species-dependent drift, with missing transport closures stated explicitly.')

# I variant: distinguish reported cathode enrichment from a proven single mechanism.
fig,ax=canvas('II I','Capillary discharge / ion-wind separation','The tutorial reports modest isotope enrichment near the cathode in capillary discharges.')
for x,label,sign in [(.45,'Cathode','−'),(8.8,'Anode','+')]:
 ax.add_patch(Rectangle((x,2.55),.35,2,facecolor=GRID,edgecolor=MUTED));text(ax,x+.175,4.95,label,INK,13,ha='center');text(ax,x+.175,4.35,sign,COPPER,22,ha='center')
for y in [2.75,4.1]:ax.plot([.8,8.8],[y,y],color=MUTED,lw=2)
ax.add_patch(Rectangle((.8,2.75),1.55,1.35,facecolor=COPPER,alpha=.2,edgecolor='none'))
text(ax,1.6,3.4,'Heavier-isotope\nenrichment',COPPER,11,ha='center')
text(ax,5.2,3.4,'High-pressure, high-current capillary plasma',MUTED,12,ha='center')
arrow(ax,(7.5,5.2),(3,5.2),COPPER,2);text(ax,5.25,5.6,'Discharge electric field',COPPER,11,ha='center')
text(ax,.45,1.95,'CANDIDATE EXPLANATIONS',COPPER,11,weight='bold')
text(ax,.45,1.1,'Thermal diffusion\nRadial wall-loss differences',MUTED,11)
text(ax,5.2,1.1,'Differential ion–neutral friction (“ion wind”)\nconsidered most probable in the cited experiment',SAGE,11)
text(ax,5,.12,'The shaded region indicates a reported enrichment location; its size and concentration are not quantitative.',MUTED,10,ha='center')
finish(fig,ax,'ionwind','II I','Capillary discharge / ion-wind separation',
 'The tutorial reports heavier-isotope enrichment near a capillary cathode; differential ion–neutral friction was considered the most probable of several proposed explanations.',
 ['The tutorial describes experimental isotope enrichment in neon and krypton discharges.'],
 ['The process appears slow and unlikely to provide high throughput.','Thermal diffusion, differential wall losses and ion–neutral friction must be distinguished rather than assumed to be one mechanism.'],
 'Qualitative report of enrichment and candidate mechanisms only. No isotope flux, discharge solution or enrichment factor is calculated.',
 'A capillary between cathode and anode has a qualitative heavier-isotope enrichment region near the cathode; three competing explanations are listed without assigning a numerical enrichment.')

(OUT/'manifest.json').write_text(json.dumps(MANIFEST,indent=2,ensure_ascii=False)+'\n')
thumbs=[]
for item in MANIFEST:
 image=Image.open(OUT/Path(item['image']).name).convert('RGB')
 assert image.size==(1600,1000)
 thumbs.append(image.resize((640,400)))
sheet=Image.new('RGB',(1280,400*((len(thumbs)+1)//2)),BG)
for i,image in enumerate(thumbs):sheet.paste(image,((i%2)*640,(i//2)*400))
sheet.save(OUT/'contact-sheet.png')
assert len(MANIFEST)==11 and len({m['id'] for m in MANIFEST})==11
for m in MANIFEST:assert m['pros'] and m['cons'] and m['sources'] and (OUT/Path(m['image']).name).is_file()
print('11 original atlas diagrams + manifest validated; primary PNGs 1600×1000; contact sheet 1280×2400.')
