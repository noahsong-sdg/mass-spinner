"""Conceptual apparatus, not field/density/trajectory or engineering predictions.

Run inside safe-dev's extracted Debian Blender with Cycles CPU. No host process,
renderer/browser policy change or computed particle overlay is required.
"""
import json
import math
import os
from pathlib import Path
import bpy
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view

ROOT=Path.cwd(); OUT=ROOT/'web-assets/renders'; EDIT=ROOT/'render-editable'
OUT.mkdir(parents=True,exist_ok=True); EDIT.mkdir(exist_ok=True)
SIZE=int(os.environ.get('RENDER_WIDTH','1600'))
SAMPLES=int(os.environ.get('RENDER_SAMPLES','192'))
ASSETS={}


def material(name,color,metal=.7,rough=.27):
    m=bpy.data.materials.new(name);m.use_nodes=True
    s=m.node_tree.nodes.get('Principled BSDF')
    s.inputs['Base Color'].default_value=(*color,1)
    s.inputs['Metallic'].default_value=metal;s.inputs['Roughness'].default_value=rough
    return m


def finish(obj,name,mat,bevel=.012):
    obj.name=name;obj.data.materials.append(mat)
    if hasattr(obj.data,'polygons'):
        for p in obj.data.polygons:p.use_smooth=True
        if bevel:
            if bpy.app.version < (4,1,0):obj.data.use_auto_smooth=True
            mod=obj.modifiers.new('Machined edges','BEVEL');mod.width=bevel;mod.segments=3
            obj.modifiers.new('Weighted normals','WEIGHTED_NORMAL')
    return obj


def box(name,loc,size,mat,bevel=.015):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object
    o.dimensions=size;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    return finish(o,name,mat,bevel)


def cylinder(name,loc,radius,depth,mat,axis=(1,0,0)):
    bpy.ops.mesh.primitive_cylinder_add(vertices=64,radius=radius,depth=depth,location=loc)
    o=bpy.context.object;o.rotation_euler=Vector(axis).to_track_quat('Z','Y').to_euler()
    return finish(o,name,mat)


def ring(name,x,outer,inner,depth,mat,arc=math.tau):
    count=64;verts=[]
    for xx in [x-depth/2,x+depth/2]:
        for r in [outer,inner]:
            for i in range(count+1):
                a=math.pi+arc*i/count;verts.append((xx,r*math.cos(a),r*math.sin(a)))
    stride=count+1;faces=[]
    for i in range(count):
        faces.extend([(i,i+1,2*stride+i+1,2*stride+i),
                      (stride+i+1,stride+i,3*stride+i,3*stride+i+1),
                      (i+1,i,stride+i,stride+i+1),
                      (2*stride+i,2*stride+i+1,3*stride+i+1,3*stride+i)])
    if arc<math.tau:faces.extend([(0,2*stride,3*stride,stride),(count,stride+count,3*stride+count,2*stride+count)])
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update()
    obj=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(obj)
    return finish(obj,name,mat,.006)


def pipe(name,points,mat,radius=.025):
    curve=bpy.data.curves.new(name,'CURVE');curve.dimensions='3D';curve.bevel_depth=radius;curve.bevel_resolution=3
    spline=curve.splines.new('POLY');spline.points.add(len(points)-1)
    for p,co in zip(spline.points,points):p.co=(*co,1)
    obj=bpy.data.objects.new(name,curve);bpy.context.collection.objects.link(obj);obj.data.materials.append(mat)


def reset():
    bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
    global steel,copper,dark,ceramic,lit,teal
    steel=material('Illustrative brushed metal - alloy unspecified',(.34,.39,.40),.85,.24)
    copper=material('Illustrative copper coil conductor',(.49,.21,.10),.9,.23)
    dark=material('Illustrative dark housing finish',(.035,.043,.046),.65,.29)
    ceramic=material('Illustrative electrical ceramic',(.72,.69,.59),.05,.3)
    lit=material('Conceptual LiT layer - optical appearance illustrative',(.50,.39,.22),.35,.36)
    teal=material('Illustrative cooling hardware finish',(.14,.27,.24),.65,.26)


def studio(scale=7.2,look=(0,0,-.1),camera=(-5.5,-9,4.8),floor=-1.15):
    scene=bpy.context.scene
    floor_mat=material('Charcoal studio surface',(.014,.019,.021),.15,.37)
    bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,floor));bpy.context.object.data.materials.append(floor_mat)
    scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.09,.12,.13,1)
    scene.world.node_tree.nodes['Background'].inputs[1].default_value=.28
    for loc,energy,size in [((-1,-4,6),1800,5),((3,3,5),2300,4),((-5,2,3),1300,3)]:
        bpy.ops.object.light_add(type='AREA',location=loc);light=bpy.context.object
        light.data.energy=energy;light.data.shape='RECTANGLE';light.data.size=size;light.data.size_y=size*.55
        light.rotation_euler=(Vector(look)-light.location).to_track_quat('-Z','Y').to_euler()
    bpy.ops.object.camera_add(location=camera);cam=bpy.context.object
    cam.rotation_euler=(Vector(look)-cam.location).to_track_quat('-Z','Y').to_euler()
    cam.data.type='ORTHO';cam.data.ortho_scale=scale;scene.camera=cam
    scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=SAMPLES
    scene.cycles.use_denoising=False;scene.render.threads_mode='FIXED';scene.render.threads=4
    scene.view_settings.view_transform='Filmic';scene.view_settings.look='Medium High Contrast';scene.view_settings.exposure=-.3
    scene.render.resolution_x=SIZE;scene.render.resolution_y=round(SIZE*9/16);scene.render.resolution_percentage=100
    scene.render.image_settings.file_format='PNG';scene.render.film_transparent=False
    bpy.context.view_layer.update()


def save(mode,title,caption,anchors):
    scene=bpy.context.scene;scene.render.filepath=str(OUT/(mode+'.png'))
    bpy.ops.wm.save_as_mainfile(filepath=str(EDIT/(mode+'.blend')))
    bpy.ops.render.render(write_still=True)
    hotspots=[]
    for ident,label,point in anchors:
        p=world_to_camera_view(scene,scene.camera,Vector(point))
        hotspots.append({'id':ident,'label':label,'xPct':round(100*p.x,2),'yPct':round(100*(1-p.y),2)})
    ASSETS[mode]={'image':f'/renders/{mode}.png','png':f'/renders/{mode}.png','title':title,'caption':caption,'hotspots':hotspots}


def feet(xs):
    for x in xs:
        box('Support saddle',(x,0,-.68),(.23,1.0,.13),steel)
        for y in [-.38,.38]:
            box('Support upright',(x,y,-.88),(.15,.15,.4),dark)
            cylinder('Isolation foot',(x,y,-1.08),.10,.09,dark,(0,0,1))


def beam_target():
    reset();base_top=-.86+.15/2
    box('Vacuum beamline base',(0,0,-.86),(6.7,1.55,.15),dark)
    ring('Cutaway source chamber',-2.5,.49,.44,1.05,steel,math.pi)
    ring('Ceramic RF tube',-2.5,.30,.26,.88,ceramic,math.pi)
    for i in range(8):ring('RF winding',-2.88+i*.105,.39,.34,.045,copper,math.pi)
    ring('Source flange',-2.5+1.05/2+.09/2,.49,.21,.09,steel)
    cylinder('Deuterium gas feed',(-2.88,0,.35),.065,.42,steel,(0,0,1))
    box('Mounting support - source',(-2.5,0,(base_top-.49)/2),(.32,.55,-.49-base_top),dark)
    for x in [-1.48,-.98,-.48]:
        ring('Accelerator electrode',x,.40,.12,.075,steel)
        for y in [-.32,.32]:
            cylinder('Ceramic high voltage standoff',(x,y,base_top+.58/2),.065,.58,ceramic,(0,0,1))
    ring('Downstream vacuum tube cutaway',.44,.28,.24,1.23,steel,math.pi)
    substrate_front=1.63-.30/2;target_thickness=.035
    box('Cooled substrate',(1.63,0,0),(.30,1.15,1.18),steel)
    box('LiT layer - exaggerated thickness',(substrate_front-target_thickness/2,0,0),(target_thickness,.86,.86),lit,.004)
    box('Mounting support - substrate',(1.63,0,(base_top-.59)/2),(.30,.85,-.59-base_top),dark)
    # Illustrative external plumbing meets the backing; no channel flow is solved.
    cooling_x=substrate_front+.30-.02
    for z in [-.39,-.13,.13,.39]:
        cylinder('Cooling connection',(cooling_x,-.30,z),.035,.45,teal,(0,1,0))
    pipe('Cooling supply',[(cooling_x,-.30-.45/2,-.39),(cooling_x,-.6,-.39),(cooling_x,-.6,-.76),(2.8,-.6,-.76)],teal,.035)
    pipe('Cooling return',[(cooling_x,-.30-.45/2,.39),(cooling_x,-.82,.39),(2.8,-.82,.39)],teal,.035)
    for x in [-2.7,-1.0,.5,2.7]:
        for y in [-.65,.65]:cylinder('Base fastener',(x,y,base_top+.035/2),.035,.035,steel,(0,0,1))
    studio(scale=7.5,look=(-.15,0,-.05),floor=-1.12)
    save('beam-target','Compact beam–target source','Conceptual RF source, acceleration electrodes and LiT on a cooled substrate. Hardware only; layer thickness exaggerated. Unspecified alloys and dimensions are illustrative.',[
      ('rf-source','RF ion source',(-2.5,0,.25)),('accelerator','Acceleration gap',(-1.0,0,.2)),
      ('beam','Beam path - vacuum space',(.45,0,.14)),('target','LiT target',(substrate_front-target_thickness,-.30,.22)),
      ('substrate','Cooled substrate',(1.80,.30,.38)),('neutrons','Reaction region',(1.38,-.48,-.28))])


def gyro():
    reset();ring('Cutaway gyro chamber',0,1.1,1.04,2.3,steel,math.pi)
    for x in [-1.2,1.2]:
        ring('End flange',x,1.23,1.03,.10,steel,math.pi)
        ring('Field-coil former',x,1.34,1.24,.28,dark,math.pi)
        for i in range(6):ring('Axial-field coil conductor',x+(i-2.5)*.04,1.39,1.31,.028,copper,math.pi)
    o=ring('Transverse source body',0,.24,.13,.60,dark)
    o.rotation_euler.z=math.pi/2;o.location=(0,-1.35,.4)
    o=ring('Transverse source ceramic break',0,.25,.13,.10,ceramic)
    o.rotation_euler.z=math.pi/2;o.location=(0,-1.0,.4)
    box('Transverse injection slit',(0,-.59,.4),(.50,.045,.10),steel)
    for z in [.10,-.25,-.60]:
        box('Gyro-plane segmented collector',(0,-.59,z),(.55,.045,.14),lit)
    for x in [-.90,.90]:
        box('Gyro chamber support',(x,0,-1.21),(.24,1.3,.18),dark)
        for y in [-.50,.50]:cylinder('Support foot',(x,y,-1.37),.11,.16,steel,(0,0,1))
    studio(scale=6.0,look=(0,-.1,-.1),floor=-1.54)
    save('gyro','Gyro-orbit separation','Conceptual transverse injection across an axial magnetic field, with segmented collectors in the gyro plane. Hardware only; no calculated orbit or field is embedded. All apparatus dimensions and optical finishes are illustrative.',[
      ('source','Transverse ion source',(0,-1.40,.55)),('coils','Axial field coils',(-1.20,.85,-.42)),
      ('vessel','Vacuum chamber',(.65,-.7,-.67)),('electrodes','Injection slit',(0,-.59,.4)),
      ('collectors','Segmented gyro-plane collectors',(0,-.59,-.43))])


def axial(mode):
    reset();ring('Cutaway vacuum column',0,.57,.52,3.9,steel,math.pi)
    for x in [-1.99,1.99]:
        ring('Vacuum flange',x,.69,.50,.10,steel)
        for i in range(16):
            a=i*math.tau/16;cylinder('Flange fastener',(x,.62*math.cos(a),.62*math.sin(a)),.018,.13,steel)
    for x in [-1.3,-.45,.45,1.3]:
        ring('Solenoid former',x,.74,.63,.34,dark,math.pi)
        for i in range(6):ring('Exposed solenoid copper',x+(i-2.5)*.044,.79,.69,.032,copper,math.pi)
    ring('Source body',-2.30,.30,.16,.50,dark)
    ring('Source ceramic break',-2.03,.31,.16,.07,ceramic)
    if mode=='centrifuge':
        cylinder('Conducting arc cathode',(-2.18,0,0),.095,.55,steel)
        ring('Arc anode',-1.84,.43,.16,.09,copper)
    elif mode in ['rotating','doublewell']:
        for side in [-1,1]:
            for i in range(5):
                ring('Independently biased annular electrode',side*1.85,.115+i*.085,.055+i*.085,.035,lit)
                ring('Annular ceramic spacer',side*1.89,.115+i*.085,.055+i*.085,.025,ceramic)
    else:
        box('Source slit',(-1.88,-.31,.02),(.04,.12,.40),steel)
        box('Radial collector rail',(1.87,-.26,.02),(.06,.19,.88),lit)
    if mode=='icr':
        for y in [-.42,.42]:
            box('RF electrode segment',(0,y,.15),(1.95,.06,.16),copper)
            pipe('RF feed',[(0,y,.16),(0,y*1.9,.16),(0,y*1.9,-.74)],copper,.018)
    cylinder('Diagnostic port',(.72,.59,0),.09,.28,steel,(0,1,0))
    feet([-1.18,1.18]);studio(scale=6.8)
    titles={'gyro':'Gyro-orbit separation','icr':'Resonant ion heating','centrifuge':'Rotating plasma centrifuge','rotating':'Uniform-field rotating filter','doublewell':'Shaped-potential double-well filter'}
    save(mode,titles[mode],'Conceptual apparatus for the selected mechanism. Static hardware illustration: no calculated density, field or trajectory is embedded; source, electrodes and collection geometry are illustrative.',[
      ('source','Ion source',(-2.3,0,.19)),('coils','Axial field coils',(-.45,.64,-.12)),
      ('vessel','Vacuum column',(.3,-.35,-.40)),('electrodes','Drive / bias region',(-1.72,-.25,.17)),
      ('collectors','Collection / downstream region',(1.9,-.32,.19))])


def curved():
    reset();center=Vector((-1.3,.8,0));R=1.8;verts=[];nu=64;nv=32
    for r in [.29,.34]:
        for i in range(nu+1):
            u=-math.pi/2+math.pi/2*i/nu
            for j in range(nv+1):
                v=math.pi+math.pi*j/nv;verts.append(tuple(center+Vector(((R+r*math.cos(v))*math.cos(u),(R+r*math.cos(v))*math.sin(u),r*math.sin(v)))))
    faces=[];stride=nv+1;side=(nu+1)*stride
    for k in [0,side]:
        for i in range(nu):
            for j in range(nv):
                a=k+i*stride+j;face=(a,a+1,a+stride+1,a+stride)
                faces.append(face if k==0 else tuple(reversed(face)))
    mesh=bpy.data.meshes.new('Bent cutaway channel');mesh.from_pydata(verts,[],faces);mesh.update()
    obj=bpy.data.objects.new('Bent cutaway channel',mesh);bpy.context.collection.objects.link(obj);finish(obj,obj.name,steel)
    for i in range(8):
        u=-math.pi/2+math.pi/2*i/7;loc=center+Vector((R*math.cos(u),R*math.sin(u),0))
        bpy.ops.mesh.primitive_torus_add(major_segments=64,minor_segments=12,location=loc,major_radius=.40,minor_radius=.035)
        bpy.context.object.rotation_euler=Vector((-math.sin(u),math.cos(u),0)).to_track_quat('Z','Y').to_euler();finish(bpy.context.object,'Guide magnet conductor',copper,0)
    # The inlet ends on the bend's entrance plane, tangent to its centreline.
    entrance=center+Vector((0,-R,0));source_depth=.5
    ring('Source inlet',entrance.x-source_depth/2,.29,.12,source_depth,dark).location.y=entrance.y
    cylinder('Exit collector',(.5,1.13,0),.37,.06,lit,(0,1,0))
    box('Curved guide support',(-.2,-.1,-.66),(3.2,2.7,.14),dark);studio(scale=5.8,look=(-.5,-.1,-.1))
    save('curved','Curved magnetic guide','Conceptual bent magnetic guide and source/collector. No self-generated electric field or calculated drift track is drawn; the solver remains a guiding-centre diagnostic.',[
      ('source','Slit source',(entrance.x-source_depth/2,entrance.y,.1)),('coils','Guide magnets',(.2,-.05,.22)),
      ('vessel','Curved vacuum channel',(-.1,-.65,-.15)),('collectors','Collector',(.5,1.13,.20))])


def blanket():
    reset();R=2.0
    layers=[('W armor',.43,.49,steel),('Inner V4Cr4Ti structure',.49,.57,dark),('Hg-Li multiplier',.57,.87,lit),('Outer V4Cr4Ti structure',.87,.93,dark),('FLiBe blanket',.93,1.18,teal),('Eurofer97 tank',1.18,1.24,steel)]
    for name,rin,rout,mat in layers:
        verts=[];nu=96;nv=48;arc=math.pi*1.5
        for r in [rin,rout]:
            for i in range(nu+1):
                u=arc*i/nu
                for j in range(nv):
                    v=math.tau*j/nv;verts.append(((R+r*math.cos(v))*math.cos(u),(R+r*math.cos(v))*math.sin(u),r*math.sin(v)))
        stride=(nu+1)*nv;faces=[]
        for k in [0,stride]:
            for i in range(nu):
                for j in range(nv):
                    a=k+i*nv+j;b=k+i*nv+(j+1)%nv;face=(a,b,b+nv,a+nv)
                    faces.append(face if k==0 else tuple(reversed(face)))
        for i in [0,nu]:
            for j in range(nv):
                a=i*nv+j;b=i*nv+(j+1)%nv;face=(a,b,b+stride,a+stride)
                faces.append(tuple(reversed(face)) if i==0 else face)
        mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update();o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o);finish(o,name,mat,.003)
    studio(scale=8.8,look=(0,0,-.1),camera=(6,-8,6),floor=-1.3)
    save('blanket','Future power-plant blanket concept','Separate alchemy-paper concept, not the compact source. Paper-model material sequence with both inner/outer V-alloy walls. Relative radial layers only; not to scale, no neutronics/depletion result. Empty core denotes the plasma region; optical finishes are illustrative.',[
      ('plasma','Plasma source region',(2,0,0)),('armor','Tungsten armor',(2,0,.46)),
      ('structure','V4Cr4Ti structure',(1.47,0,0)),('multiplier','Hg-Li multiplier',(2,0,-.72)),
      ('breeder','FLiBe region',(3.06,0,0)),('tank','Eurofer97 tank',(2,0,1.21))])


modes=os.environ.get('RENDER_MODES','beam-target,gyro,icr,curved,centrifuge,rotating,doublewell,blanket').split(',')
for mode in modes:
    if mode=='beam-target':beam_target()
    elif mode=='gyro':gyro()
    elif mode=='curved':curved()
    elif mode=='blanket':blanket()
    else:axial(mode)
if 'doublewell' in ASSETS:ASSETS['doublewell-dynamics']={**ASSETS['doublewell'],'title':'Collisional double-well apparatus'}
(OUT/'manifest.json').write_text(json.dumps({'schemaVersion':'mass-spinner-apparatus-v1','renderEngine':'Blender Cycles CPU','hardwareOnly':True,'assets':ASSETS},indent=2)+'\n')
