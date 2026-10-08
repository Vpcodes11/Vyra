import * as THREE from './vendor/three.module.js';
import {RectAreaLightUniformsLib} from './vendor/addons/RectAreaLightUniformsLib.js';

// Geometry, typography and lighting are original to VYRA. No screenshot crops.
const state={index:0,position:0,scroll:0,motion:true,pointer:new THREE.Vector2()};
const colors=['#6150ce','#bb155d','#b3bc35','#239d86','#c57632'];
const lacquer=['#1a1438','#320d27','#252812','#103027','#342011'];
let renderer,scene,camera,models=[],environment,accentLight,softbox,edgeLight,ceilingLight,ambientLight,shoulderSpot,flavorSpot,active=true,last=performance.now();
let firstFrameReady=false;
let lastRendered=0,lastPointerMove=0;
const canvas=document.createElement('canvas');canvas.className='product-canvas';canvas.setAttribute('aria-hidden','true');
canvas.style.opacity='0';
document.body.append(canvas);
const experience=document.querySelector('#experience'),sticky=document.querySelector('.experience-sticky');
let lastFocusStyle='';
const nextPaint=()=>new Promise(resolve=>requestAnimationFrame(()=>setTimeout(resolve,0)));

function label(index){
  // The artwork is displayed at under 800 CSS pixels even in the close-up.
  // Build it at 1024px and keep the two lighting masks at 512px instead of
  // allocating three 2048px GPU textures for every flavor.
  const size=1024,maskSize=512;
  const c=document.createElement('canvas');c.width=c.height=size;const ctx=c.getContext('2d');
  ctx.scale(size/2048,size/2048);
  ctx.fillStyle=lacquer[index];ctx.fillRect(0,0,2048,2048);
  // The reference keeps the face almost black. Flavor color catches the curved
  // edges as narrow anodized bands; the long white streaks come from softboxes.
  const color=new THREE.Color(colors[index]);
  const tint=(amount)=>new THREE.Color(lacquer[index]).lerp(color,amount).getStyle();
  const edge=ctx.createLinearGradient(0,0,2048,0);
  for(const [stop,color] of [
    [0,'#09080d'],[.055,tint(.75)],[.105,tint(.28)],[.18,tint(.12)],
    [.31,tint(.31)],[.43,tint(.43)],[.52,tint(.3)],[.67,tint(.15)],
    [.79,tint(.36)],[.92,tint(.7)],[.975,tint(.28)],[1,'#09080d']
  ]) edge.addColorStop(stop,color);
  ctx.fillStyle=edge;ctx.fillRect(0,0,2048,2048);
  // A few restrained, broad reflections live in the finish. The bright studio
  // panels still come from the real environment map and move with the model.
  const sheen=ctx.createLinearGradient(0,0,2048,0);
  for(const [stop,alpha] of [[0,0],[.16,0],[.235,.09],[.27,0],[.72,0],[.78,.075],[.82,0],[1,0]])sheen.addColorStop(stop,`rgba(255,255,255,${alpha})`);
  ctx.fillStyle=sheen;ctx.fillRect(0,0,2048,2048);
  ctx.save();ctx.translate(515,1000);ctx.rotate(-Math.PI/2);
  ctx.fillStyle='#f4f1e8';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.font='570px "VYRA Can"';ctx.scale(1470/ctx.measureText('VYRA').width,1.08);ctx.fillText('VYRA',0,0);ctx.restore();
  ctx.textAlign='center';ctx.fillStyle='#e6d8ee';ctx.font='138px "VYRA Can"';ctx.fillText('ENERGY',515,1835);
  ctx.font='26px Arial';ctx.fillStyle='#d2c8d5';ctx.fillText('250 ML  /  AFTERHOURS',515,1905);
  ctx.save();ctx.translate(260,1030);ctx.rotate(-Math.PI/2);ctx.fillStyle=tint(.88);ctx.font='bold 33px Arial';ctx.textAlign='center';ctx.letterSpacing='7px';ctx.fillText(['MIDNIGHT LYCHEE','RASPBERRY RUSH','CITRUS STATIC','MINT CURRENT','APRICOT AFTERGLOW'][index],0,0);ctx.restore();
  ctx.fillStyle='#d1c7df';ctx.font='italic 130px "VYRA Display"';ctx.fillText('VYRA',1540,520);
  ctx.font='34px Arial';ctx.fillText('FIND YOUR FREQUENCY',1540,635);
  const headings=['BRIGHT FLAVOR','A FRESH PERSPECTIVE','THE AFTERHOURS EDITION'];
  headings.forEach((h,i)=>{ctx.fillStyle=colors[index];ctx.font='bold 40px Arial';ctx.fillText(h,1540,960+i*250);ctx.fillStyle='#a39aaf';ctx.font='24px Arial';ctx.fillText('VYRA ENERGY  /  COLLECTION 01',1540,1025+i*250);});
  ctx.font='30px Arial';ctx.fillText('250 ML',1540,1850);
  ctx.font='bold 28px Arial';ctx.fillStyle='#e5dce9';ctx.fillText(['MIDNIGHT LYCHEE','RASPBERRY RUSH','CITRUS STATIC','MINT CURRENT','APRICOT AFTERGLOW'][index],515,1940);
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;
  // Ink and lacquer need different reflectance. White print stays readable
  // while the colored aluminum carries the long studio reflections.
  const mask=document.createElement('canvas');mask.width=mask.height=maskSize;const mc=mask.getContext('2d');
  const print=document.createElement('canvas');print.width=print.height=maskSize;const pc=print.getContext('2d');
  mc.drawImage(c,0,0,maskSize,maskSize);const pixels=mc.getImageData(0,0,maskSize,maskSize);
  for(let n=0;n<pixels.data.length;n+=4){
    const r=pixels.data[n],g=pixels.data[n+1],b=pixels.data[n+2];
    const printInk=Math.max(r,g,b)>160&&Math.max(r,g,b)-Math.min(r,g,b)<38;
    const v=printInk?75:188;pixels.data[n]=v;pixels.data[n+1]=v;pixels.data[n+2]=v;
  }
  // The spotlight texture contains only the lettering. Inferring it from the
  // colored lacquer caused the entire back panel to glow on bright flavors.
  pc.fillStyle='#000';pc.fillRect(0,0,maskSize,maskSize);pc.scale(maskSize/2048,maskSize/2048);
  pc.textAlign='center';pc.fillStyle='#fff';
  headings.forEach((h,i)=>{pc.font='bold 40px Arial';pc.fillText(h,1540,960+i*250);pc.font='24px Arial';pc.fillText('VYRA ENERGY  /  COLLECTION 01',1540,1025+i*250);});
  mc.putImageData(pixels,0,0);const metalness=new THREE.CanvasTexture(mask);metalness.anisotropy=4;
  const emissive=new THREE.CanvasTexture(print);emissive.colorSpace=THREE.SRGBColorSpace;emissive.anisotropy=4;
  return {color:t,metalness,emissive};
}
function brushedMetal(){
  const c=document.createElement('canvas');c.width=512;c.height=512;const ctx=c.getContext('2d');const d=ctx.createImageData(512,512);let seed=17;
  const rnd=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  for(let y=0;y<512;y++){const line=rnd()*18;for(let x=0;x<512;x++){const p=(y*512+x)*4,v=115+line+rnd()*12;d.data[p]=d.data[p+1]=d.data[p+2]=v;d.data[p+3]=255;}}
  ctx.putImageData(d,0,0);const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(6,6);return t;
}
const brushed=brushedMetal();
function can(index){
  const g=new THREE.Group();
  const profile=[[-1.75,.40],[-1.73,.422],[-1.70,.438],[-1.66,.443],[-1.61,.456],[-1.55,.47],[-1.49,.475],[1.40,.475],[1.46,.473],[1.51,.464],[1.56,.446],[1.61,.428],[1.65,.423],[1.69,.424]];
  const geometry=new THREE.LatheGeometry(profile.map(([y,r])=>new THREE.Vector2(r,y)),96,-Math.PI/2);
  // Lathe's default UVs space profile points equally; labels need real height.
  for(let i=0;i<geometry.attributes.uv.count;i++)geometry.attributes.uv.setY(i,(geometry.attributes.position.getY(i)+1.75)/3.44);
  const artwork=label(index);
  const material=new THREE.MeshPhysicalMaterial({map:artwork.color,metalnessMap:artwork.metalness,metalness:.88,roughness:.24,clearcoat:1,clearcoatRoughness:.11,envMapIntensity:1.45,bumpMap:brushed,bumpScale:.00045,emissive:new THREE.Color(colors[index]),emissiveMap:artwork.emissive,emissiveIntensity:0});
  const textLightY={value:1-1000/2048};
  material.onBeforeCompile=shader=>{
    shader.uniforms.textLightY=textLightY;
    shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
      float textBeam = exp(-0.5 * pow((vEmissiveMapUv.y - textLightY) / 0.052, 2.0));
      totalEmissiveRadiance *= textBeam;`);
    shader.fragmentShader=shader.fragmentShader.replace('void main() {','uniform float textLightY;\nvoid main() {');
  };
  g.add(new THREE.Mesh(geometry,material));
  const metal=new THREE.MeshPhysicalMaterial({color:'#aeb5b9',metalness:.69,roughness:.29,clearcoat:.48,clearcoatRoughness:.17,envMapIntensity:1.75,bumpMap:brushed,bumpScale:.0007});
  const satinMetal=new THREE.MeshStandardMaterial({color:'#9aa0a3',metalness:.43,roughness:.38,envMapIntensity:1.35,bumpMap:brushed,bumpScale:.00045});
  const lid=new THREE.Group();
  const disk=new THREE.Mesh(new THREE.CylinderGeometry(.434,.434,.025,80),satinMetal);lid.add(disk);
  const rim=new THREE.Mesh(new THREE.TorusGeometry(.443,.027,12,96),metal);rim.rotation.x=Math.PI/2;rim.position.y=.018;lid.add(rim);
  const inset=new THREE.Mesh(new THREE.TorusGeometry(.36,.009,8,80),metal);inset.rotation.x=Math.PI/2;inset.position.y=.025;lid.add(inset);
  const tabShape=new THREE.Shape();tabShape.moveTo(-.095,-.13);tabShape.bezierCurveTo(-.145,-.05,-.135,.15,-.06,.21);tabShape.bezierCurveTo(-.02,.24,.06,.23,.09,.18);tabShape.bezierCurveTo(.14,.09,.14,-.06,.095,-.13);tabShape.quadraticCurveTo(0,-.19,-.095,-.13);
  const hole=new THREE.Path();hole.absellipse(0,.06,.067,.11,0,Math.PI*2,true);tabShape.holes.push(hole);
  const tab=new THREE.Mesh(new THREE.ExtrudeGeometry(tabShape,{depth:.015,bevelEnabled:true,bevelSize:.005,bevelThickness:.004,bevelSegments:2,steps:1,curveSegments:16}),metal);tab.rotation.x=-Math.PI/2;tab.position.set(0,.05,.04);lid.add(tab);
  const score=new THREE.Mesh(new THREE.RingGeometry(.255,.26,64),new THREE.MeshBasicMaterial({color:'#596065',side:THREE.DoubleSide}));score.rotation.x=-Math.PI/2;score.position.y=.029;score.scale.y=1.12;lid.add(score);
  const rivet=new THREE.Mesh(new THREE.SphereGeometry(.033,16,8),metal);rivet.scale.y=.3;rivet.position.set(0,.065,.16);lid.add(rivet);
  const opening=new THREE.Mesh(new THREE.RingGeometry(.092,.105,48),new THREE.MeshStandardMaterial({color:'#707276',metalness:.9,roughness:.4}));opening.rotation.x=-Math.PI/2;opening.scale.y=1.45;opening.position.set(0,.022,-.2);lid.add(opening);
  const recessed=new THREE.Mesh(new THREE.CylinderGeometry(.345,.345,.008,64),satinMetal);recessed.position.y=.018;lid.add(recessed);
  lid.position.y=1.71;g.add(lid);
  // A dark well and a rolled rim remain on the can when the real lid lifts.
  const openingWell=new THREE.Mesh(new THREE.CylinderGeometry(.395,.395,.012,80),new THREE.MeshPhysicalMaterial({color:'#07080a',metalness:.72,roughness:.48}));openingWell.position.y=1.672;g.add(openingWell);
  const mouthRim=new THREE.Mesh(new THREE.TorusGeometry(.426,.014,8,96),metal);mouthRim.rotation.x=Math.PI/2;mouthRim.position.y=1.68;g.add(mouthRim);
  const base=new THREE.Mesh(new THREE.TorusGeometry(.423,.027,12,96),metal);base.rotation.x=Math.PI/2;base.position.y=-1.73;g.add(base);
  const bottom=new THREE.Group();
  const foot=new THREE.Mesh(new THREE.CylinderGeometry(.414,.414,.032,80),satinMetal);bottom.add(foot);
  const footRing=new THREE.Mesh(new THREE.TorusGeometry(.413,.018,10,96),metal);footRing.rotation.x=Math.PI/2;footRing.position.y=.018;bottom.add(footRing);
  const footInset=new THREE.Mesh(new THREE.CircleGeometry(.32,80),new THREE.MeshStandardMaterial({color:'#858c90',metalness:.38,roughness:.43,envMapIntensity:1.2}));footInset.rotation.x=-Math.PI/2;footInset.position.y=.019;bottom.add(footInset);
  const footGroove=new THREE.Mesh(new THREE.TorusGeometry(.29,.006,6,80),new THREE.MeshBasicMaterial({color:'#50565a'}));footGroove.rotation.x=Math.PI/2;footGroove.position.y=.024;bottom.add(footGroove);
  bottom.position.y=-1.73;g.add(bottom);
  g.userData={index,material,lid,bottom,textLightY};return g;
}
function lighting(){
  const room=new THREE.Scene();room.background=new THREE.Color('#08080b');
  const box=(x,y,z,w,h,color,intensity,ry=0)=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({color:new THREE.Color(color).multiplyScalar(intensity),side:THREE.DoubleSide}));m.position.set(x,y,z);m.rotation.y=ry;room.add(m);};
  box(-4,1,4,1.8,8,'#fff7ec',5.5,.75);box(5,.5,1,.42,9,'#ffffff',6,-.9);box(0,5,2,7,2,'#ffffff',2.5);box(0,-3,4,6,1.5,'#a6a0a6',.6);
  const pmrem=new THREE.PMREMGenerator(renderer);environment=pmrem.fromScene(room,.035);scene.environment=environment.texture;pmrem.dispose();
  RectAreaLightUniformsLib.init();ambientLight=new THREE.AmbientLight('#e7e4e6',.3);scene.add(ambientLight);
  softbox=new THREE.RectAreaLight('#fff8ef',4.5,2.5,7);softbox.position.set(-3,2.8,5);softbox.lookAt(0,0,0);scene.add(softbox);
  edgeLight=new THREE.RectAreaLight('#ffffff',7,.42,7);edgeLight.position.set(3,.6,-1);edgeLight.lookAt(0,0,0);scene.add(edgeLight);
  ceilingLight=new THREE.RectAreaLight('#ffffff',3.5,5,1.2);ceilingLight.position.set(0,4.5,2);ceilingLight.lookAt(0,0,0);scene.add(ceilingLight);
  accentLight=new THREE.RectAreaLight(colors[0],3.5,1.1,7);accentLight.position.set(-2,-.5,2);accentLight.lookAt(0,0,0);scene.add(accentLight);
  shoulderSpot=new THREE.SpotLight('#fff5ed',18,5,.31,.95,1.5);
  flavorSpot=new THREE.SpotLight(colors[0],33,5,.34,.95,1.5);
  scene.add(shoulderSpot,shoulderSpot.target,flavorSpot,flavorSpot.target);
}
function resize(){const w=innerWidth,h=innerHeight;renderer.setPixelRatio(Math.min(devicePixelRatio,w<760?1.1:1.2));renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
const smooth=(x)=>{x=THREE.MathUtils.clamp(x,0,1);return x*x*(3-2*x);};
const follow=(vector,x,y,z,damping)=>{
  vector.set(THREE.MathUtils.lerp(vector.x,x,damping),THREE.MathUtils.lerp(vector.y,y,damping),THREE.MathUtils.lerp(vector.z,z,damping));
};
function draw(now){
  requestAnimationFrame(draw);if(!active)return;
  const expRect=experience.getBoundingClientRect();
  const scrollTarget=THREE.MathUtils.clamp(-expRect.top/(experience.offsetHeight-innerHeight),0,1);
  const busy=Math.abs(state.index-state.position)>.005||Math.abs(scrollTarget-state.scroll)>.005||now-lastPointerMove<350;
  if(firstFrameReady&&now-lastRendered<(busy?16:32))return;
  lastRendered=now;
  const dt=Math.min((now-last)/1000,.05);last=now;
  const damping=state.motion?1-Math.exp(-dt*7.5):1;
  const velocity=state.index-state.position;state.position+=velocity*damping;
  const selectedIndex=((Math.round(state.index)%5)+5)%5;
  const flavorColor=new THREE.Color(colors[selectedIndex]);
  accentLight.color.lerp(flavorColor,damping);
  flavorSpot.color.lerp(flavorColor,damping);
  const rect=expRect;
  if(rect.bottom<=0){if(canvas.style.opacity!=='0')canvas.style.opacity='0';return;}
  const target=scrollTarget;
  state.scroll+=(target-state.scroll)*(state.motion?1-Math.exp(-dt*9):1);
  const mobile=innerWidth<=760,H=innerHeight;
  const focusWindow=smooth((state.scroll-.27)/.10)*(1-smooth((state.scroll-.79)/.09));
  const textSweep=THREE.MathUtils.clamp((state.scroll-.39)/.34,0,1);
  const secondLine=smooth((textSweep-.20)/.15);
  const thirdLine=smooth((textSweep-.61)/.15);
  const textLightY=1-(1000+250*secondLine+250*thirdLine)/2048;
  const lateZoom=smooth((state.scroll-.83)/.17);
  const focusStyle=focusWindow.toFixed(3);
  if(focusStyle!==lastFocusStyle){
    sticky.style.setProperty('--detail-brightness',(1-focusWindow*.48).toFixed(3));
    sticky.style.setProperty('--focus-dim',focusStyle);
    lastFocusStyle=focusStyle;
  }
  const enter=smooth((H-rect.top)/H),exit=Math.min(0,rect.bottom-H)/H;
  if(firstFrameReady&&canvas.style.opacity!=='1')canvas.style.opacity='1';
  const visibleHeight=2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*camera.position.z;
  const vw=visibleHeight*camera.aspect;
  const bob=state.motion?Math.sin(now*.0008)*.045:0;
  // The reference closes the studio softboxes for a single focused beat,
  // leaving just a tight flavor-colored beam on the back print.
  softbox.intensity=4.5*(1-focusWindow*.96);
  edgeLight.intensity=7*(1-focusWindow*.94);
  ceilingLight.intensity=3.5*(1-focusWindow*.96);
  ambientLight.intensity=.3*(1-focusWindow*.9);
  accentLight.intensity=2.8*(1-focusWindow*.8);
  shoulderSpot.intensity=18*(1-focusWindow*.96);
  flavorSpot.intensity=22*(1-focusWindow);
  flavorSpot.angle=THREE.MathUtils.lerp(.34,.17,focusWindow);
  models.forEach((m,i)=>{
    let offset=i-state.position;offset=((offset+2.5)%5+5)%5-2.5;
    const focus=1-smooth(Math.abs(offset));const selected=i===((Math.round(state.index)%5)+5)%5;
    const heroHeight=mobile?Math.min(H*.41,360):Math.min(H*(H<950?.40:.45),460);
    const heroScale=visibleHeight*heroHeight/H/3.5;
    const detailHeight=mobile?H*.43:Math.min(H*.77,720);
    const detailScale=visibleHeight*detailHeight/H/3.5*(mobile?1+.15*focusWindow+.08*lateZoom:.92+.24*focusWindow+.45*lateZoom)*(1+.055*textSweep*focusWindow);
    const gap=mobile?1.05:vw*.185;
    const x=offset*gap;
    const heroY=visibleHeight*(mobile?.035:.045)+(.11+(!mobile&&H<760?.12:0))*focus+Math.sin(i*2.2)*.08*(1-focus);
    const detailX=mobile?vw*.035:vw*(.19+lateZoom*.05);
    const detailY=visibleHeight*(mobile?.11:-.045*focusWindow-.17*lateZoom+.065*textSweep*focusWindow)+visibleHeight*exit;
    const t=selected?enter:0;
    m.position.set(THREE.MathUtils.lerp(x,detailX,t),THREE.MathUtils.lerp(heroY+bob*focus,detailY,t),THREE.MathUtils.lerp(-.55*(1-focus),.5,t));
    const scl=THREE.MathUtils.lerp(heroScale*(.85+.2*focus),detailScale,t)*(selected?1:1-enter);
    // Keep the modeled body at the same classic-can aspect ratio as the
    // artwork shown while WebGL initializes, including through the zoom.
    m.scale.set(Math.max(.0001,scl*1.36),Math.max(.0001,scl),Math.max(.0001,scl*1.36));m.visible=scl>.01&&rect.bottom>0;
    // Turn to the back, hold it still while the light reads each line,
    // then rotate away only after the final line has been featured.
    const rotation=state.motion?Math.PI*(smooth((state.scroll-.15)/.22)+smooth((state.scroll-.83)/.15)):(target>=.32&&target<.88?Math.PI:0);
    m.rotation.set(.08,THREE.MathUtils.lerp((1-focus)*Math.PI*.92,rotation,t)+state.pointer.x*.055*focus-velocity*.1,THREE.MathUtils.lerp(.24*focus+Math.sin(i*1.9)*.065*(1-focus),-.1+Math.cos(state.scroll*Math.PI*2)*.34-lateZoom*.55,t)+state.pointer.y*.025*focus+velocity*.025);
    // The selected object and its reflections move as a single continuous model.
    m.userData.material.envMapIntensity=(.2+focus*.95+enter*.25)*(1-focusWindow*.91);
    m.userData.material.color.setScalar(.25+focus*.75-(selected?focusWindow*.78:0));
    m.userData.material.clearcoat=.3+focus*.65;
    m.userData.material.emissiveIntensity=selected?focusWindow*3.7:0;
    m.userData.textLightY.value=textLightY;
    const explode=focus*(1-enter);
    m.userData.lid.position.y=1.71+.49*explode;
    m.userData.lid.rotation.x=.55*explode;
    m.userData.bottom.position.y=-1.73-.28*explode;
    m.userData.bottom.rotation.x=.32*explode;
  });
  const focusModel=models[selectedIndex],s=focusModel.scale.y;
  const lightDamping=state.motion?1-Math.exp(-dt*5):1;
  follow(shoulderSpot.position,focusModel.position.x-s*1.7+state.pointer.x*.18,focusModel.position.y+s*1.4+state.pointer.y*.12,focusModel.position.z+2.7,lightDamping);
  follow(shoulderSpot.target.position,focusModel.position.x,focusModel.position.y+s*.85,focusModel.position.z,lightDamping);
  const beamHeight=s*(.18-.39*secondLine-.39*thirdLine);
  follow(flavorSpot.position,focusModel.position.x+s*(1.6-focusWindow*1.05)-state.pointer.x*.24,focusModel.position.y+beamHeight+s*.3+state.pointer.y*.1,focusModel.position.z+2.4,lightDamping);
  follow(flavorSpot.target.position,focusModel.position.x,focusModel.position.y+beamHeight,focusModel.position.z,lightDamping);
  renderer.render(scene,camera);
  if(!firstFrameReady){firstFrameReady=true;rootReady();canvas.style.opacity='1';}
  window.vyra3d.stats={calls:renderer.info.render.calls,triangles:renderer.info.render.triangles};
}
window.vyra3d={select(index){state.index=index;},motion(value){state.motion=value;if(!value)state.pointer.set(0,0);},stats:{}};
document.addEventListener('pointermove',e=>{if(e.pointerType==='touch'||!state.motion)return;lastPointerMove=performance.now();state.pointer.set(e.clientX/innerWidth-.5,e.clientY/innerHeight-.5);},{passive:true});
document.addEventListener('visibilitychange',()=>{active=!document.hidden;last=performance.now();});
try{
  // Let the lightweight product artwork paint before any WebGL setup work.
  await nextPaint();
  renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'high-performance'});renderer.setClearColor(0,0);renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.3;
  scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(31,1,.1,50);camera.position.set(0,0,11);await nextPaint();lighting();
  await Promise.all([document.fonts.load('400 40px "VYRA Display"'),document.fonts.load('400 40px "VYRA Can"')]);
  for(let i=0;i<colors.length;i++){const m=can(i);scene.add(m);models.push(m);await nextPaint();}
  resize();addEventListener('resize',resize);
  // A restored scroll position must start on the matching product face.
  state.scroll=THREE.MathUtils.clamp(-experience.getBoundingClientRect().top/(experience.offsetHeight-innerHeight),0,1);
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();active=false;document.documentElement.classList.remove('webgl-ready');document.documentElement.classList.add('webgl-fallback');canvas.style.visibility='hidden';});
  canvas.addEventListener('webglcontextrestored',()=>{active=true;last=performance.now();canvas.style.visibility='';document.documentElement.classList.remove('webgl-fallback');rootReady();});
  requestAnimationFrame(draw);
}catch(error){canvas.remove();document.documentElement.classList.add('webgl-fallback');console.warn('3D view unavailable; using product artwork fallback.',error.message);}
function rootReady(){document.documentElement.classList.add('webgl-ready');document.documentElement.classList.remove('scene-loading');window.dispatchEvent(new Event('vyra3dready'));}
