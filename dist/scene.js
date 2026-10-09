import * as THREE from './vendor/three.module.js';
import {RectAreaLightUniformsLib} from './vendor/addons/RectAreaLightUniformsLib.js';
import {clamp,smooth,experienceBeat,cinemaFrame} from './experience-timeline.js';
import {carouselPose,lineupPose} from './product-motion.js';

const started=performance.now();
const loading=(progress,label,ready=false)=>window.dispatchEvent(new CustomEvent('vyra-load',{detail:{progress,label,ready}}));
const state={index:0,position:0,scroll:0,motion:!matchMedia('(prefers-reduced-motion: reduce)').matches,pointer:new THREE.Vector2(),pointerTarget:new THREE.Vector2()};
const colors=['#8555ff','#ef2879','#d5db39','#16c5a2','#f78d35'];
const lacquer=['#4b376e','#6a2948','#53551e','#235d50','#694125'];
const names=['MIDNIGHT LYCHEE','RASPBERRY RUSH','CITRUS STATIC','MINT CURRENT','APRICOT AFTERGLOW'];
const headings=['BRIGHT BY NATURE','A FRESH PERSPECTIVE','THE AFTERHOURS EDITION'];
const backCopy=[['Fruit-inspired flavor.','A fine, lively sparkle.'],['A little unexpected.','Completely unmistakable.'],['Cold can. Fresh perspective.','Make the moment yours.']];
const root=document.documentElement,experience=document.querySelector('#experience');
const canvas=document.createElement('canvas');canvas.className='product-canvas';canvas.setAttribute('aria-hidden','true');document.body.append(canvas);
let renderer,scene,camera,environment,softbox,edgeLight,ceilingLight,accentLight,ambientLight,flavorSpot;
let template,brushed,trimMaterial,models=[],artworks=[],firstFrame=false,active=true,dirty=true,lastRendered=0,last=performance.now(),lastPointer=0;
let top=0,range=1,end=0,viewH=0,viewW=0,frustumH=0,frustumW=0,lastStyle='';
const beamTarget=new THREE.Vector3(),beamPosition=new THREE.Vector3();
const poseEuler=new THREE.Euler(0,0,0,'ZYX'),heroRotation=new THREE.Quaternion(),detailRotation=new THREE.Quaternion(),lineupRotation=new THREE.Quaternion(),posterRotation=new THREE.Quaternion(),partRotation=new THREE.Quaternion(),inverseRotation=new THREE.Quaternion(),lineupPosition=new THREE.Vector3();
const endAxis=new THREE.Vector3(0,1,0);
const neutral=new THREE.Color('#f2eee9'),flavorColor=new THREE.Color();
const wrap=n=>((n%5)+5)%5;
const nextPaint=()=>new Promise(resolve=>requestAnimationFrame(()=>setTimeout(resolve,0)));

function label(index){
  // Color and material maps are painted together; there is no pixel scanning,
  // baked reflection. A separate print mask adds only the focused text halo.
  const c=document.createElement('canvas');c.width=1024;c.height=2048;
  const surface=document.createElement('canvas');surface.width=512;surface.height=1024;
  const glow=document.createElement('canvas');glow.width=glow.height=1024;
  const gc=glow.getContext('2d');gc.fillStyle='#000';gc.fillRect(0,0,1024,1024);gc.scale(.5,.5);
  const ctx=c.getContext('2d'),mc=surface.getContext('2d');
  // Fine metallic grain is part of the original lacquer, never a painted highlight.
  const tile=document.createElement('canvas');tile.width=tile.height=128;
  const tileCtx=tile.getContext('2d'),paint=tileCtx.createImageData(128,128),hex=Number.parseInt(lacquer[index].slice(1),16);
  const red=hex>>16,green=(hex>>8)&255,blue=hex&255;let paintSeed=131+index;
  for(let i=0;i<paint.data.length;i+=4){
    paintSeed=(Math.imul(paintSeed,1664525)+1013904223)>>>0;
    const grain=(paintSeed%11)-5;
    paint.data[i]=red+grain;paint.data[i+1]=green+grain;paint.data[i+2]=blue+grain;paint.data[i+3]=255;
  }
  tileCtx.putImageData(paint,0,0);ctx.fillStyle=ctx.createPattern(tile,'repeat');ctx.fillRect(0,0,1024,2048);
  ctx.scale(.5,1);mc.scale(.25,.5);
  const grain=mc.createImageData(512,1024);let grainSeed=91;
  for(let i=0;i<grain.data.length;i+=4){
    grainSeed=(Math.imul(grainSeed,1664525)+1013904223)>>>0;
    grain.data[i]=0;grain.data[i+1]=52+(grainSeed%19)+Math.round(Math.sin((i/4%512)*.038)*4);grain.data[i+2]=222+(grainSeed%17);grain.data[i+3]=255;
  }
  mc.putImageData(grain,0,0);
  // Bare aluminum at the neck and heel catches the same studio lights as the ends.
  ctx.fillStyle='#adb0b2';mc.fillStyle='rgb(0,91,250)';
  for(const context of [ctx,mc]){context.fillRect(0,0,2048,32);context.fillRect(0,2018,2048,30);}
  const text=(value,x,y,font,color='#e9e6dd',align='center')=>{
    for(const [context,ink] of [[ctx,color],[mc,'rgb(0,123,18)']]){
      context.font=font;context.fillStyle=ink;context.textAlign=align;context.fillText(value,x,y);
    }
  };
  for(const context of [ctx,mc]){
    context.save();context.translate(518,995);context.rotate(-Math.PI/2);
    context.font='570px "VYRA Can"';context.textAlign='center';context.textBaseline='middle';
    context.scale(1430/context.measureText('VYRA').width,1.04);
    context.fillStyle=context===ctx?'#eeece3':'rgb(0,123,18)';context.fillText('VYRA',0,0);context.restore();
  }
  text('ENERGY',518,1800,'125px "VYRA Display"',colors[index]);
  text('250 ML  /  FIND YOUR FREQUENCY',518,1870,'23px Arial');
  text(names[index],518,1918,'bold 27px Arial');
  for(const context of [ctx,mc]){
    context.save();context.translate(255,1020);context.rotate(-Math.PI/2);context.font='bold 38px Arial';context.textAlign='center';
    context.fillStyle=context===ctx?colors[index]:'rgb(0,123,18)';context.fillText(names[index],0,0);context.restore();
  }
  text('VYRA',1536,390,'120px "VYRA Can"');
  text('FIND YOUR FREQUENCY',1536,458,'26px Arial');
  text('THE AFTERHOURS COLLECTION',1536,513,'21px Arial','#a09ca6');
  headings.forEach((heading,i)=>{
    const y=850+i*290;
    // Pale flavor ink remains readable under the neutral focused light.
    const ink=new THREE.Color(colors[index]).lerp(new THREE.Color('#e3ded9'),.22).getStyle();
    text(String(i+1).padStart(2,'0'),1274,y,'bold 25px Arial',ink);
    text(heading,1536,y,'36px "VYRA Display"',ink);
    backCopy[i].forEach((line,j)=>text(line,1536,y+51+j*31,'24px Arial','#a6a0ac'));
    // Soft ink-shaped halo stays attached to the curved label, with no fullscreen bloom pass.
    gc.textAlign='center';gc.shadowColor='#fff';gc.shadowBlur=2;
    gc.fillStyle='#fff';gc.font='36px "VYRA Display"';gc.fillText(heading,1536,y);
    gc.shadowBlur=1;gc.fillStyle='#929292';gc.font='24px Arial';
    backCopy[i].forEach((line,j)=>gc.fillText(line,1536,y+51+j*31));
    for(const [context,color] of [[ctx,'#615b68'],[mc,'rgb(0,123,18)']]){
      context.fillStyle=color;context.fillRect(1270,y+119,532,1);
    }
  });
  text('AN ORIGINAL FREQUENCY. A FRESH POINT OF VIEW.',1536,1646,'18px Arial','#9b95a2');
  text('KEEP YOUR CURIOSITY COLD.',1536,1679,'bold 21px Arial','#aaa3b2');
  // Original edition barcode and small print give the packaging a complete reverse side.
  for(const [context,ink] of [[ctx,'#a8a1ad'],[mc,'rgb(0,123,18)']]){
    context.fillStyle=ink;let x=1360;
    for(let bar=0;bar<52;bar++){const width=1+((bar*13+index*7)%4);context.fillRect(x,1710,width,45);x+=width+3;}
  }
  text('VYRA / COLLECTION 01',1536,1790,'22px Arial','#aaa2b0');
  text('250 ML',1536,1840,'bold 26px Arial');
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;
  const mask=new THREE.CanvasTexture(surface);mask.anisotropy=4;
  const halo=new THREE.CanvasTexture(glow);halo.colorSpace=THREE.SRGBColorSpace;halo.anisotropy=4;
  return {color:t,surface:mask,glow:halo};
}
function brushedMetal(){
  const c=document.createElement('canvas');c.width=512;c.height=256;
  const ctx=c.getContext('2d'),pixels=ctx.createImageData(c.width,c.height);let seed=17;
  const lines=new Float32Array(c.width);
  for(let x=0;x<c.width;x++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;lines[x]=(seed%17)-8;}
  for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++){
    seed=(Math.imul(seed,1664525)+1013904223)>>>0;
    const i=(y*c.width+x)*4,v=128+lines[x]*.6+(seed%7)-3;
    pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=v;pixels.data[i+3]=255;
  }
  ctx.putImageData(pixels,0,0);
  const texture=new THREE.CanvasTexture(c);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(3,2);return texture;
}
function focusedPrint(material){
  const center={value:1-910/2048};
  material.userData.focusCenter=center;
  material.onBeforeCompile=shader=>{
    shader.uniforms.vyraFocusCenter=center;
    shader.fragmentShader='uniform float vyraFocusCenter;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>',`
      #include <emissivemap_fragment>
      #ifdef USE_EMISSIVEMAP
        float labelDistance=(vEmissiveMapUv.y-vyraFocusCenter)/0.043;
        totalEmissiveRadiance*=exp(-0.5*labelDistance*labelDistance);
      #endif
    `);
  };
  material.customProgramCacheKey=()=> 'vyra-focused-print-v1';
}
function applyArtwork(model,logical){
  const index=wrap(logical);if(model.userData.flavor===index)return;
  const artwork=artworks[index],material=model.userData.material;
  material.map=artwork.color;material.emissiveMap=artwork.glow;material.metalnessMap=material.roughnessMap=artwork.surface;
  model.userData.flavor=index;
}
// Merge stampings by material, preserving independent lid/base transforms.
// Supporting cans reuse these buffers rather than rebuilding 3D geometry.
function mergeStatic(group){
  const geometries=[];
  for(const child of [...group.children]){
    if(!child.isMesh||child===group.children[0]&&group.name!=='lid'&&group.name!=='bottom')continue;
    child.updateMatrix();let geometry=child.geometry.clone().applyMatrix4(child.matrix);if(geometry.index)geometry=geometry.toNonIndexed();
    const color=child.material.color,colors=new Float32Array(geometry.attributes.position.count*3);
    for(let i=0;i<colors.length;i+=3){colors[i]=color.r;colors[i+1]=color.g;colors[i+2]=color.b;}
    geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));geometries.push(geometry);group.remove(child);
  }
  if(geometries.length){
    const merged=new THREE.BufferGeometry();
    for(const name of ['position','normal','uv','color']){
      const size=name==='uv'?2:3,total=geometries.reduce((sum,g)=>sum+g.attributes[name].array.length,0),array=new Float32Array(total);let offset=0;
      for(const geometry of geometries){array.set(geometry.attributes[name].array,offset);offset+=geometry.attributes[name].array.length;}
      merged.setAttribute(name,new THREE.BufferAttribute(array,size));
    }
    // Bake the preferred fuller radius into the mesh so rotations cannot stretch its ends.
    merged.scale(1.36,1,1.36);
    group.add(new THREE.Mesh(merged,trimMaterial));geometries.forEach(g=>g.dispose());
  }
}
function can(index){
  if(template){
    const data=template.userData;template.userData={};
    const g=template.clone(true);template.userData=data;
    const material=template.userData.material.clone();focusedPrint(material);
    g.children[0].material=material;
    g.userData={material,lid:g.getObjectByName('lid'),bottom:g.getObjectByName('bottom'),logical:index,flavor:-1};
    applyArtwork(g,index);return g;
  }
  const g=new THREE.Group();
  // The drawn shell rolls into a shallow heel and a gradual neck, never a sharp cylinder edge.
  const profile=[[-1.75,.402],[-1.738,.418],[-1.72,.431],[-1.695,.440],[-1.665,.442],[-1.635,.447],[-1.595,.458],[-1.55,.468],[-1.50,.474],[-1.45,.475],[1.35,.475],[1.405,.474],[1.445,.470],[1.48,.463],[1.515,.453],[1.545,.442],[1.572,.433],[1.598,.427],[1.622,.425],[1.66,.425],[1.685,.428],[1.70,.434]];
  const geometry=new THREE.LatheGeometry(profile.map(([y,r])=>new THREE.Vector2(r,y)),72,-Math.PI/2);
  // Lathe's default UVs space profile points equally; labels need real height.
  for(let i=0;i<geometry.attributes.uv.count;i++)geometry.attributes.uv.setY(i,(geometry.attributes.position.getY(i)+1.75)/3.44);
  geometry.scale(1.36,1,1.36);
  const artwork=artworks[wrap(index)];
  const material=new THREE.MeshPhysicalMaterial({map:artwork.color,emissiveMap:artwork.glow,emissive:'#ffffff',emissiveIntensity:0,metalnessMap:artwork.surface,roughnessMap:artwork.surface,metalness:1,roughness:1,clearcoat:.24,clearcoatRoughness:.24,envMapIntensity:1,bumpMap:brushed,bumpScale:.0021,anisotropy:.38});
  focusedPrint(material);g.add(new THREE.Mesh(geometry,material));
  const metal=new THREE.MeshPhysicalMaterial({color:'#aeb5b9',metalness:1,roughness:.23,clearcoat:.08,clearcoatRoughness:.3,envMapIntensity:1.5,bumpMap:brushed,bumpScale:.0007});
  const satinMetal=new THREE.MeshStandardMaterial({color:'#9aa0a3',metalness:.92,roughness:.34,envMapIntensity:1.1,bumpMap:brushed,bumpScale:.0011});
  const lid=new THREE.Group();lid.name='lid';
  const disk=new THREE.Mesh(new THREE.LatheGeometry([new THREE.Vector2(0,-.004),new THREE.Vector2(.2,-.006),new THREE.Vector2(.3,-.014),new THREE.Vector2(.36,-.011),new THREE.Vector2(.405,.01),new THREE.Vector2(.435,.012),new THREE.Vector2(.435,-.014),new THREE.Vector2(.4,-.015)],72),satinMetal);lid.add(disk);
  const rim=new THREE.Mesh(new THREE.TorusGeometry(.443,.018,8,72),metal);rim.rotation.x=Math.PI/2;rim.position.y=.018;lid.add(rim);
  const inset=new THREE.Mesh(new THREE.TorusGeometry(.36,.007,6,64),metal);inset.rotation.x=Math.PI/2;inset.position.y=.025;lid.add(inset);
  const tabShape=new THREE.Shape();tabShape.moveTo(-.095,-.13);tabShape.bezierCurveTo(-.145,-.05,-.135,.15,-.06,.21);tabShape.bezierCurveTo(-.02,.24,.06,.23,.09,.18);tabShape.bezierCurveTo(.14,.09,.14,-.06,.095,-.13);tabShape.quadraticCurveTo(0,-.19,-.095,-.13);
  const hole=new THREE.Path();hole.absellipse(0,.06,.067,.11,0,Math.PI*2,true);tabShape.holes.push(hole);
  const tab=new THREE.Mesh(new THREE.ExtrudeGeometry(tabShape,{depth:.015,bevelEnabled:true,bevelSize:.005,bevelThickness:.004,bevelSegments:2,steps:1,curveSegments:16}),metal);tab.rotation.x=-Math.PI/2;tab.position.set(0,.05,.04);lid.add(tab);
  const score=new THREE.Mesh(new THREE.RingGeometry(.255,.26,64),new THREE.MeshBasicMaterial({color:'#596065',side:THREE.DoubleSide}));score.rotation.x=-Math.PI/2;score.position.y=.029;score.scale.y=1.12;lid.add(score);
  const rivet=new THREE.Mesh(new THREE.SphereGeometry(.033,16,8),metal);rivet.scale.y=.3;rivet.position.set(0,.065,.16);lid.add(rivet);
  const opening=new THREE.Mesh(new THREE.RingGeometry(.092,.105,48),new THREE.MeshStandardMaterial({color:'#707276',metalness:.9,roughness:.4}));opening.rotation.x=-Math.PI/2;opening.scale.y=1.45;opening.position.set(0,.022,-.2);lid.add(opening);
  const underside=new THREE.Mesh(new THREE.LatheGeometry([
    new THREE.Vector2(0,-.018),new THREE.Vector2(.20,-.018),new THREE.Vector2(.28,-.023),
    new THREE.Vector2(.32,-.032),new THREE.Vector2(.348,-.03),new THREE.Vector2(.36,-.023),
    new THREE.Vector2(.395,-.022),new THREE.Vector2(.418,-.035),new THREE.Vector2(.435,-.025)
  ],64),satinMetal);lid.add(underside);
  // Aluminum pressure ribs and a smaller central stamping catch changing highlights.
  for(const radius of [.30,.398]){
    const rib=new THREE.Mesh(new THREE.TorusGeometry(radius,.006,6,64),metal);
    rib.rotation.x=Math.PI/2;rib.position.y=-.028;lid.add(rib);
  }
  lid.position.y=1.71;g.add(lid);
  // A dark well and a rolled rim remain on the can when the real lid lifts.
  const openingWell=new THREE.Mesh(new THREE.CylinderGeometry(.395,.395,.012,64),new THREE.MeshPhysicalMaterial({color:'#07080a',metalness:.72,roughness:.48}));openingWell.position.y=1.672;g.add(openingWell);
  const mouthRim=new THREE.Mesh(new THREE.TorusGeometry(.426,.014,8,72),metal);mouthRim.rotation.x=Math.PI/2;mouthRim.position.y=1.68;g.add(mouthRim);
  const base=new THREE.Mesh(new THREE.TorusGeometry(.423,.017,8,72),metal);base.rotation.x=Math.PI/2;base.position.y=-1.73;g.add(base);
  const bottom=new THREE.Group();bottom.name='bottom';
  const foot=new THREE.Mesh(new THREE.LatheGeometry([new THREE.Vector2(0,.065),new THREE.Vector2(.15,.061),new THREE.Vector2(.29,.039),new THREE.Vector2(.36,.008),new THREE.Vector2(.414,0),new THREE.Vector2(.414,-.028)],64),satinMetal);bottom.add(foot);
  const footRing=new THREE.Mesh(new THREE.TorusGeometry(.413,.018,8,72),metal);footRing.rotation.x=Math.PI/2;footRing.position.y=.018;bottom.add(footRing);
  const footInset=new THREE.Mesh(new THREE.CircleGeometry(.22,64),new THREE.MeshStandardMaterial({color:'#70767a',metalness:.92,roughness:.32,envMapIntensity:1.2}));footInset.rotation.x=-Math.PI/2;footInset.position.y=.067;bottom.add(footInset);
  const footGroove=new THREE.Mesh(new THREE.TorusGeometry(.29,.008,6,64),new THREE.MeshBasicMaterial({color:'#50565a'}));footGroove.rotation.x=Math.PI/2;footGroove.position.y=.046;bottom.add(footGroove);
  const baseDome=new THREE.Mesh(new THREE.LatheGeometry([
    new THREE.Vector2(0,-.035),new THREE.Vector2(.14,-.036),new THREE.Vector2(.23,-.044),
    new THREE.Vector2(.30,-.063),new THREE.Vector2(.36,-.07),new THREE.Vector2(.389,-.055),new THREE.Vector2(.414,-.028)
  ],64),satinMetal);bottom.add(baseDome);
  bottom.position.y=-1.73;g.add(bottom);
  mergeStatic(lid);mergeStatic(bottom);mergeStatic(g);g.userData={material,lid,bottom,logical:index,flavor:index};template=g;return g;
}

function lighting(){
  const room=new THREE.Scene();room.background=new THREE.Color('#16151b');
  const cbox=document.createElement('canvas');cbox.width=64;cbox.height=128;
  const bctx=cbox.getContext('2d'),gradient=bctx.createLinearGradient(0,0,64,0);
  gradient.addColorStop(0,'#050505');gradient.addColorStop(.17,'#868686');
  gradient.addColorStop(.42,'#ffffff');gradient.addColorStop(.7,'#ebebeb');gradient.addColorStop(1,'#111111');
  bctx.fillStyle=gradient;bctx.fillRect(0,0,64,128);
  const softReflection=new THREE.CanvasTexture(cbox);softReflection.colorSpace=THREE.SRGBColorSpace;
  const panel=(x,y,z,w,h,intensity,angle=0)=>{
    const mesh=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:softReflection,color:new THREE.Color('#eeeae4').multiplyScalar(intensity),side:THREE.DoubleSide}));
    mesh.position.set(x,y,z);mesh.rotation.y=angle;room.add(mesh);return mesh;
  };
  panel(-4,1.6,3,1.65,5.8,3.8,.75);panel(4,-.4,1,.24,6.2,5.2,-.9);
  panel(-2.7,-1.5,-2,.18,4,2.3,.4);
  panel(0,5,0,5,4,3).rotation.x=Math.PI/2;
  panel(0,-4,0,4,4,1.7).rotation.x=Math.PI/2;
  panel(0,3.5,-4,3.5,4,1.3);
  const pmrem=new THREE.PMREMGenerator(renderer);
  environment=pmrem.fromScene(room,.055,.1,30,{size:128});scene.environment=environment.texture;
  pmrem.dispose();softReflection.dispose();room.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});
  RectAreaLightUniformsLib.init();
  ambientLight=new THREE.AmbientLight('#dddbe2',.18);scene.add(ambientLight);
  const area=(color,power,w,h,x,y,z)=>{
    const light=new THREE.RectAreaLight(color,power,w,h);light.position.set(x,y,z);light.lookAt(0,0,0);scene.add(light);return light;
  };
  softbox=area('#f6f1e9',3.2,1.45,6,-3,2,4);
  edgeLight=area('#e5e4ee',5,.42,7,3,.5,1);
  ceilingLight=area('#f6f4ee',3,4,1.1,0,4,2);
  accentLight=area(colors[0],1.7,1.1,6,-2,0,2);
  // A soft horizontal gobo shapes a real light on the curved label surface.
  const c=document.createElement('canvas');c.width=c.height=128;const ctx=c.getContext('2d');
  const pixels=ctx.createImageData(128,128);
  for(let y=0;y<128;y++)for(let x=0;x<128;x++){
    const i=(y*128+x)*4,v=255*Math.exp(-.5*((x-64)/33)**2-.5*((y-64)/8.5)**2);
    pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=v;pixels.data[i+3]=255;
  }
  ctx.putImageData(pixels,0,0);
  flavorSpot=new THREE.SpotLight('#eeeaf2',0,12,.34,.72,2);
  flavorSpot.map=new THREE.CanvasTexture(c);flavorSpot.map.colorSpace=THREE.SRGBColorSpace;
  scene.add(flavorSpot,flavorSpot.target);
}
function measure(){
  viewW=innerWidth;viewH=innerHeight;top=experience.offsetTop;range=Math.max(1,experience.offsetHeight-viewH);end=top+experience.offsetHeight;
  renderer.setPixelRatio(Math.min(devicePixelRatio,viewW<=900?1.1:1.35));renderer.setSize(viewW,viewH,false);
  camera.aspect=viewW/viewH;camera.updateProjectionMatrix();
  frustumH=2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*camera.position.z;frustumW=frustumH*camera.aspect;dirty=true;
}
function setStyle(name,value){root.style.setProperty(name,value.toFixed(3));}
function draw(now){
  if(active)requestAnimationFrame(draw);
  if(!active)return;
  const y=scrollY,target=clamp((y-top)/range),mobile=viewW<=900;
  if(y>end){if(canvas.style.opacity!=='0')canvas.style.opacity='0';return;}
  const busy=dirty||Math.abs(state.index-state.position)>.002||Math.abs(target-state.scroll)>.0004||now-lastPointer<500;
  if(firstFrame&&now-lastRendered<(busy?16:33))return;
  if(!state.motion&&!busy)return;
  lastRendered=now;dirty=false;
  const dt=Math.min((now-last)/1000,.05);last=now;
  const damping=state.motion?1-Math.exp(-dt*9):1;
  const velocity=state.index-state.position;state.position+=velocity*damping;
  state.scroll+=(target-state.scroll)*damping;
  state.pointer.lerp(state.pointerTarget,damping);
  const beat=experienceBeat(state.scroll),entry=smooth((y-top+viewH)/viewH),exit=Math.min(0,(end-y-viewH)/viewH);
  const selected=wrap(state.index),reveal=beat.lineup,frame=cinemaFrame(state.scroll);
  flavorColor.set(colors[selected]);accentLight.color.lerp(flavorColor,damping);
  flavorSpot.color.copy(flavorColor).lerp(neutral,.12);
  softbox.intensity=3.7*(1-beat.focus*.96);
  edgeLight.intensity=6.5*(1-beat.focus*.93);
  ceilingLight.intensity=3.6*(1-beat.focus*.95);
  ambientLight.intensity=.18*(1-beat.focus*.85);
  accentLight.intensity=3.4*(1-beat.focus*.91);
  flavorSpot.intensity=beat.focus*80;
  trimMaterial.envMapIntensity=1.5*(1-beat.focus*.76);
  const style=[entry,beat.focus,reveal,beat.copy].map(v=>v.toFixed(3)).join('/');
  if(style!==lastStyle){
    setStyle('--studio-color-strength',(.22+entry*1.05)*(1-beat.focus*.48)*(1-reveal*.82));
    setStyle('--studio-base-strength',1-entry*.87*(1-reveal));
    setStyle('--copy-visibility',smooth((entry-.6)/.4)*beat.copy);
    setStyle('--lineup-visibility',smooth((reveal-.28)/.5));
    setStyle('--focus-dim',beat.focus);lastStyle=style;
    const lineupCopy=document.querySelector('.lineup-copy');lineupCopy.inert=reveal<.65;
    document.querySelector('.chapter-nav').inert=beat.copy<.05;
    document.querySelector('.detail-copy').inert=beat.copy<.05;
  }
  if(firstFrame&&canvas.style.opacity!=='1')canvas.style.opacity='1';
  const heroHeight=mobile?Math.min(viewH*.37,340):Math.min(viewH*.42,455);
  const heroScale=frustumH*heroHeight/viewH/3.5;
  const detailHeight=mobile?viewH*(viewH<720?.33:.41):Math.min(viewH*.88,960);
  const detailScale=frustumH*detailHeight/viewH/3.5*(1+beat.focus*(mobile?.13:.16)+beat.scan*.035*beat.focus);
  const gap=mobile?1.26:frustumW*.175;
  const lineupScale=frustumH*(mobile?.27:.34)/3.5;
  let focusModel;
  for(const model of models){
    let logical=model.userData.logical;
    if(Math.abs(logical-state.position)>5.5){logical+=Math.round((state.position-logical)/11)*11;model.userData.logical=logical;applyArtwork(model,logical);}
    const offset=logical-state.position,isSelected=logical===state.index;
    const pose=carouselPose(offset,logical,now/1000,state.pointer.x,state.pointer.y,state.motion,velocity),focus=pose.focus;
    const heroX=offset*gap,heroY=frustumH*(mobile?.075:.065)+Math.sin(logical*1.8)*.12*(1-focus)+pose.float;
    const heroZ=pose.depth;
    const detailX=mobile?frustumW*.01:frustumW*(.22-frame.track*.014);
    const detailY=frustumH*(mobile?.145:-.065+frame.track*.066)+frustumH*exit;
    const t=isSelected?entry:0;
    let scale=THREE.MathUtils.lerp(heroScale*(.84+.23*focus),detailScale,t)*(isSelected?1:1-entry*.15);
    model.position.set(THREE.MathUtils.lerp(heroX*(isSelected?1:1+entry*5),detailX,t),THREE.MathUtils.lerp(heroY,detailY,t),THREE.MathUtils.lerp(heroZ,.25,t));
    const rotation=state.motion?Math.PI*(beat.turn+beat.returnTurn):(beat.chapter>0&&!beat.returnTurn?Math.PI:0);
    heroRotation.setFromEuler(poseEuler.set(pose.pitch,pose.yaw,pose.roll,'ZYX'));
    const turnPitch=.13+Math.sin(beat.turn*Math.PI)*.22*(1-beat.focus);
    detailRotation.setFromEuler(poseEuler.set(turnPitch,rotation+state.pointer.x*.025*(1-beat.focus),.34+beat.scan*.018*beat.focus,'ZYX'));
    model.quaternion.copy(heroRotation).slerp(detailRotation,t);
    if(isSelected&&frame.withdraw>0){
      scale=THREE.MathUtils.lerp(scale,frustumH*(mobile?.30:.32)/3.5,frame.withdraw);
      model.position.lerp(lineupPosition.set(0,frustumH*(mobile?.09:.045)+frustumH*exit,.45),frame.withdraw);
      posterRotation.setFromEuler(poseEuler.set(.24,Math.PI*2-.18,.28,'ZYX'));
      model.quaternion.slerp(posterRotation,frame.withdraw);
    }
    if(reveal>0){
      scale=THREE.MathUtils.lerp(scale,lineupScale,reveal);
      const rowPose=lineupPose(offset,mobile);
      model.position.lerp(lineupPosition.set(rowPose.x*frustumW,rowPose.y*frustumH+frustumH*exit,rowPose.depth),reveal);
      lineupRotation.setFromEuler(poseEuler.set(rowPose.pitch,Math.PI*2+rowPose.yaw,rowPose.roll,'ZYX'));
      model.quaternion.slerp(lineupRotation,reveal);
    }
    model.scale.setScalar(Math.max(.0001,scale));model.visible=scale>.01&&(isSelected||entry<.7||reveal>.01)&&(Math.abs(offset)<3.5||reveal>.01);
    const material=model.userData.material;
    material.emissive.copy(flavorColor).lerp(neutral,.075);
    material.emissiveIntensity=isSelected?beat.focus*2.2:0;
    material.userData.focusCenter.value=1-(910+290*beat.scan)/2048;
    material.color.setScalar(THREE.MathUtils.lerp(.32+.68*focus,1,reveal));
    material.envMapIntensity=(.40+.95*focus)*(1-beat.focus*.88);
    material.clearcoat=.24*(1-beat.focus*.9);
    const explode=focus*(1-entry)*(1-reveal);
    // Detached ends keep their own world orientation, then align with the shell as they close.
    model.userData.lid.position.y=1.71+.67*explode;
    partRotation.setFromEuler(poseEuler.set(pose.lidPitch,0,pose.lidRoll,'ZYX'));
    partRotation.multiply(inverseRotation.setFromAxisAngle(endAxis,pose.lidYaw));
    inverseRotation.copy(model.quaternion).invert().multiply(partRotation);
    model.userData.lid.quaternion.identity().slerp(inverseRotation,explode);
    model.userData.bottom.position.y=-1.73-.63*explode;
    partRotation.setFromEuler(poseEuler.set(pose.basePitch,0,pose.baseRoll,'ZYX'));
    partRotation.multiply(inverseRotation.setFromAxisAngle(endAxis,pose.baseYaw));
    inverseRotation.copy(model.quaternion).invert().multiply(partRotation);
    model.userData.bottom.quaternion.identity().slerp(inverseRotation,explode);
    if(isSelected)focusModel=model;
  }
  if(focusModel){
    focusModel.updateMatrixWorld(true);
    const localY=1.69-(910+290*beat.scan)/2048*3.44;
    beamTarget.set(0,localY,-.475*1.36).applyMatrix4(focusModel.matrixWorld);
    beamPosition.copy(beamTarget).add(new THREE.Vector3(focusModel.scale.y*2.4,focusModel.scale.y*.1,focusModel.scale.y*1.8));
    flavorSpot.position.copy(beamPosition);flavorSpot.target.position.copy(beamTarget);
  }
  renderer.render(scene,camera);
  if(!firstFrame){
    firstFrame=true;loading(1,'YOUR FREQUENCY IS READY',true);root.classList.add('webgl-ready');root.classList.remove('scene-loading');canvas.style.opacity='1';
    window.dispatchEvent(new Event('vyra3dready'));
    console.info(`VYRA scene: first 3D frame ${Math.round(performance.now())} ms after navigation; setup ${Math.round(performance.now()-started)} ms; ${renderer.info.render.calls} draw calls; ${renderer.info.render.triangles} triangles.`);
  }
}
window.vyra3d={select(index){state.index=index;dirty=true;},motion(value){state.motion=value;if(!value)state.pointerTarget.set(0,0);dirty=true;}};
window.dispatchEvent(new Event('vyra3dinit'));
document.addEventListener('pointermove',event=>{
  if(event.pointerType==='touch'||!state.motion)return;lastPointer=performance.now();state.pointerTarget.set(event.clientX/viewW-.5,event.clientY/viewH-.5);
},{passive:true});
document.addEventListener('visibilitychange',()=>{
  active=!document.hidden;last=performance.now();dirty=true;if(active)requestAnimationFrame(draw);
});
addEventListener('scroll',()=>{dirty=true;},{passive:true});
try{
  root.classList.add('scene-loading');loading(.16,'SETTING THE STAGE');await nextPaint();
  renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'high-performance'});
  renderer.setClearColor(0,0);renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;
  scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(31,1,.1,50);camera.position.set(0,0,11);
  await nextPaint();lighting();brushed=brushedMetal();loading(.30,'SHAPING THE LIGHT');
  trimMaterial=new THREE.MeshStandardMaterial({color:'#ffffff',vertexColors:true,side:THREE.DoubleSide,metalness:1,roughness:.23,envMapIntensity:1.5,bumpMap:brushed,bumpScale:.0012});
  await Promise.all([document.fonts.load('400 40px "VYRA Can"'),document.fonts.load('400 40px "VYRA Display"')]);
  for(let i=0;i<5;i++){loading(.35+i*.085,'BRINGING THE FLAVORS TO LIFE');artworks.push(label(i));renderer.initTexture(artworks[i].color);renderer.initTexture(artworks[i].surface);renderer.initTexture(artworks[i].glow);await nextPaint();}
  for(let i=-5;i<=5;i++){const model=can(i);model.userData.logical=i;applyArtwork(model,i);scene.add(model);models.push(model);}
  measure();state.scroll=clamp((scrollY-top)/range);last=performance.now();
  loading(.86,'FINDING YOUR FREQUENCY');await renderer.compileAsync(scene,camera);state.position=state.index;requestAnimationFrame(draw);
  addEventListener('resize',measure);
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();active=false;root.classList.remove('webgl-ready');root.classList.add('webgl-fallback');canvas.style.visibility='hidden';});
  canvas.addEventListener('webglcontextrestored',()=>{active=true;firstFrame=false;dirty=true;canvas.style.visibility='';root.classList.remove('webgl-fallback');last=performance.now();requestAnimationFrame(draw);});
}catch(error){loading(1,'YOUR FREQUENCY IS READY',true);canvas.remove();root.classList.remove('scene-loading');root.classList.add('webgl-fallback');console.warn('3D unavailable; product artwork remains available.',error.message);}
