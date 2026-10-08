import * as THREE from './vendor/three.module.js';
import {RectAreaLightUniformsLib} from './vendor/addons/RectAreaLightUniformsLib.js';

// Geometry, typography and lighting are original to VYRA. No screenshot crops.
const state={index:0,position:0,scroll:0,motion:true,pointer:new THREE.Vector2()};
const colors=['#6150ce','#bb155d','#b3bc35','#239d86','#c57632'];
const lacquer=['#120e24','#220a16','#151707','#0b1b18','#211208'];
let renderer,scene,camera,models=[],environment,accentLight,softbox,active=true,last=performance.now();
const canvas=document.createElement('canvas');canvas.className='product-canvas';canvas.setAttribute('aria-hidden','true');
document.body.append(canvas);

function label(index){
  const c=document.createElement('canvas');c.width=2048;c.height=2048;const ctx=c.getContext('2d');
  ctx.fillStyle=lacquer[index];ctx.fillRect(0,0,c.width,c.height);
  // The reference keeps the face almost black. Flavor color catches the curved
  // edges as narrow anodized bands; the long white streaks come from softboxes.
  const edge=ctx.createLinearGradient(0,0,2048,0);
  for(const [stop,color] of [
    [0,lacquer[index]],[.055,colors[index]],[.13,'#171018'],[.24,lacquer[index]],
    [.36,lacquer[index]],[.47,colors[index]],[.53,lacquer[index]],[.68,lacquer[index]],
    [.88,'#130e16'],[.98,colors[index]],[1,lacquer[index]]
  ]) edge.addColorStop(stop,color);
  ctx.globalAlpha=.55;ctx.fillStyle=edge;ctx.fillRect(0,0,c.width,c.height);ctx.globalAlpha=1;
  ctx.save();ctx.translate(515,1010);ctx.rotate(-Math.PI/2);ctx.fillStyle='#eeeada';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.font='italic 460px "VYRA Display"';ctx.scale(1540/ctx.measureText('VYRA').width,1.06);ctx.fillText('VYRA',0,0);ctx.restore();
  ctx.textAlign='center';ctx.fillStyle='#d1c7df';ctx.font='bold 74px Arial';ctx.fillText('ENERGY',515,1820);
  ctx.font='23px Arial';ctx.fillStyle='#c7c1cf';ctx.fillText('AFTERHOURS / 250 ML',515,1900);
  ctx.fillStyle='#d1c7df';ctx.font='italic 130px "VYRA Display"';ctx.fillText('VYRA',1540,520);
  ctx.font='34px Arial';ctx.fillText('FIND YOUR FREQUENCY',1540,635);
  const headings=['BRIGHT FLAVOR','A FRESH PERSPECTIVE','THE AFTERHOURS EDITION'];
  headings.forEach((h,i)=>{ctx.fillStyle=colors[index];ctx.font='bold 40px Arial';ctx.fillText(h,1540,960+i*250);ctx.fillStyle='#a39aaf';ctx.font='24px Arial';ctx.fillText('VYRA ENERGY  /  COLLECTION 01',1540,1025+i*250);});
  ctx.font='30px Arial';ctx.fillText('250 ML',1540,1850);
  ctx.font='bold 28px Arial';ctx.fillStyle='#e5dce9';ctx.fillText(['MIDNIGHT LYCHEE','RASPBERRY RUSH','CITRUS STATIC','MINT CURRENT','APRICOT AFTERGLOW'][index],515,1940);
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;
  // Ink and lacquer need different reflectance. White print stays readable
  // while the colored aluminum carries the long studio reflections.
  const mask=document.createElement('canvas');mask.width=2048;mask.height=2048;const mc=mask.getContext('2d');
  mc.drawImage(c,0,0);const pixels=mc.getImageData(0,0,2048,2048);
  for(let n=0;n<pixels.data.length;n+=4){const bright=Math.max(pixels.data[n],pixels.data[n+1],pixels.data[n+2]);const v=bright>160?46:215;pixels.data[n]=v;pixels.data[n+1]=v;pixels.data[n+2]=v;}
  mc.putImageData(pixels,0,0);const metalness=new THREE.CanvasTexture(mask);metalness.anisotropy=4;
  return {color:t,metalness};
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
  const material=new THREE.MeshPhysicalMaterial({map:artwork.color,metalnessMap:artwork.metalness,metalness:1,roughness:.31,clearcoat:.92,clearcoatRoughness:.16,envMapIntensity:1.05,bumpMap:brushed,bumpScale:.0007});
  g.add(new THREE.Mesh(geometry,material));
  const metal=new THREE.MeshPhysicalMaterial({color:'#d7d9d8',metalness:1,roughness:.27,envMapIntensity:1.5,bumpMap:brushed,bumpScale:.0015});
  const lid=new THREE.Group();
  const disk=new THREE.Mesh(new THREE.CylinderGeometry(.434,.434,.025,80),metal);lid.add(disk);
  const rim=new THREE.Mesh(new THREE.TorusGeometry(.443,.027,12,96),metal);rim.rotation.x=Math.PI/2;rim.position.y=.018;lid.add(rim);
  const inset=new THREE.Mesh(new THREE.TorusGeometry(.36,.009,8,80),metal);inset.rotation.x=Math.PI/2;inset.position.y=.025;lid.add(inset);
  const tabShape=new THREE.Shape();tabShape.moveTo(-.095,-.13);tabShape.bezierCurveTo(-.145,-.05,-.135,.15,-.06,.21);tabShape.bezierCurveTo(-.02,.24,.06,.23,.09,.18);tabShape.bezierCurveTo(.14,.09,.14,-.06,.095,-.13);tabShape.quadraticCurveTo(0,-.19,-.095,-.13);
  const hole=new THREE.Path();hole.absellipse(0,.06,.067,.11,0,Math.PI*2,true);tabShape.holes.push(hole);
  const tab=new THREE.Mesh(new THREE.ExtrudeGeometry(tabShape,{depth:.015,bevelEnabled:true,bevelSize:.005,bevelThickness:.004,bevelSegments:2,steps:1,curveSegments:16}),metal);tab.rotation.x=-Math.PI/2;tab.position.set(0,.05,.04);lid.add(tab);
  const rivet=new THREE.Mesh(new THREE.SphereGeometry(.033,16,8),metal);rivet.scale.y=.3;rivet.position.set(0,.065,.16);lid.add(rivet);
  const opening=new THREE.Mesh(new THREE.RingGeometry(.092,.105,48),new THREE.MeshStandardMaterial({color:'#707276',metalness:.9,roughness:.4}));opening.rotation.x=-Math.PI/2;opening.scale.y=1.45;opening.position.set(0,.022,-.2);lid.add(opening);
  const recessed=new THREE.Mesh(new THREE.CylinderGeometry(.345,.345,.008,64),metal);recessed.position.y=.018;lid.add(recessed);
  lid.position.y=1.71;g.add(lid);
  // A dark well and a rolled rim remain on the can when the real lid lifts.
  const openingWell=new THREE.Mesh(new THREE.CylinderGeometry(.395,.395,.012,80),new THREE.MeshPhysicalMaterial({color:'#07080a',metalness:.72,roughness:.48}));openingWell.position.y=1.672;g.add(openingWell);
  const mouthRim=new THREE.Mesh(new THREE.TorusGeometry(.426,.014,8,96),metal);mouthRim.rotation.x=Math.PI/2;mouthRim.position.y=1.68;g.add(mouthRim);
  const base=new THREE.Mesh(new THREE.TorusGeometry(.423,.027,12,96),metal);base.rotation.x=Math.PI/2;base.position.y=-1.73;g.add(base);
  const bottom=new THREE.Group();
  const foot=new THREE.Mesh(new THREE.CylinderGeometry(.414,.414,.032,80),metal);bottom.add(foot);
  const footRing=new THREE.Mesh(new THREE.TorusGeometry(.413,.018,10,96),metal);footRing.rotation.x=Math.PI/2;footRing.position.y=.018;bottom.add(footRing);
  const footInset=new THREE.Mesh(new THREE.CircleGeometry(.32,80),new THREE.MeshPhysicalMaterial({color:'#57575c',metalness:.9,roughness:.35}));footInset.rotation.x=-Math.PI/2;footInset.position.y=.019;bottom.add(footInset);
  bottom.position.y=-1.73;g.add(bottom);
  g.userData={index,material,lid,bottom};return g;
}
function lighting(){
  const room=new THREE.Scene();room.background=new THREE.Color('#08080b');
  const box=(x,y,z,w,h,color,intensity,ry=0)=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({color:new THREE.Color(color).multiplyScalar(intensity),side:THREE.DoubleSide}));m.position.set(x,y,z);m.rotation.y=ry;room.add(m);};
  box(-4,1,4,1.8,8,'#fff7ec',5.5,.75);box(5,.5,1,.42,9,'#ffffff',6,-.9);box(0,5,2,7,2,'#ffffff',2.5);box(0,-3,4,6,1.5,'#a6a0a6',.6);
  const pmrem=new THREE.PMREMGenerator(renderer);environment=pmrem.fromScene(room,.08);scene.environment=environment.texture;pmrem.dispose();
  RectAreaLightUniformsLib.init();scene.add(new THREE.AmbientLight('#e7e4e6',.3));
  softbox=new THREE.RectAreaLight('#fff8ef',4.5,2.5,7);softbox.position.set(-3,2.8,5);softbox.lookAt(0,0,0);scene.add(softbox);
  const edge=new THREE.RectAreaLight('#ffffff',7,.42,7);edge.position.set(3,.6,-1);edge.lookAt(0,0,0);scene.add(edge);
  const ceiling=new THREE.RectAreaLight('#ffffff',3.5,5,1.2);ceiling.position.set(0,4.5,2);ceiling.lookAt(0,0,0);scene.add(ceiling);
  accentLight=new THREE.RectAreaLight(colors[0],3.5,1.1,7);accentLight.position.set(-2,-.5,2);accentLight.lookAt(0,0,0);scene.add(accentLight);
}
function resize(){const w=innerWidth,h=innerHeight;renderer.setSize(w,h,false);renderer.setPixelRatio(Math.min(devicePixelRatio,w<760?1.5:1.75));camera.aspect=w/h;camera.updateProjectionMatrix();}
const smooth=(x)=>{x=THREE.MathUtils.clamp(x,0,1);return x*x*(3-2*x);};
function draw(now){
  requestAnimationFrame(draw);if(!active)return;
  const dt=Math.min((now-last)/1000,.05);last=now;
  const damping=state.motion?1-Math.exp(-dt*7.5):1;
  const velocity=state.index-state.position;state.position+=velocity*damping;
  accentLight.color.lerp(new THREE.Color(colors[((Math.round(state.index)%5)+5)%5]),damping);
  const exp=document.querySelector('#experience'),rect=exp.getBoundingClientRect();
  const target=THREE.MathUtils.clamp(-rect.top/(exp.offsetHeight-innerHeight),0,1);
  state.scroll+=(target-state.scroll)*(state.motion?1-Math.exp(-dt*9):1);
  const mobile=innerWidth<=760,H=innerHeight;
  const enter=smooth((H-rect.top)/H),exit=Math.min(0,rect.bottom-H)/H;
  canvas.style.opacity=rect.bottom<=0?'0':'1';
  const visibleHeight=2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*camera.position.z;
  const vw=visibleHeight*camera.aspect;
  const bob=state.motion?Math.sin(now*.0008)*.045:0;
  models.forEach((m,i)=>{
    let offset=i-state.position;offset=((offset+2.5)%5+5)%5-2.5;
    const focus=1-smooth(Math.abs(offset));const selected=i===((Math.round(state.index)%5)+5)%5;
    const heroHeight=mobile?Math.min(H*.41,360):Math.min(H*.45,460);
    const heroScale=visibleHeight*heroHeight/H/3.5;
    const detailHeight=mobile?H*.43:Math.min(H*.77,720);
    const detailScale=visibleHeight*detailHeight/H/3.5;
    const gap=mobile?1.05:vw*.185;
    const x=offset*gap;
    const heroY=visibleHeight*(mobile?.035:.045)+.11*focus+Math.sin(i*2.2)*.08*(1-focus);
    const detailX=mobile?vw*.035:vw*.14;
    const detailY=visibleHeight*(mobile?.11:0)+visibleHeight*exit;
    const t=selected?enter:0;
    m.position.set(THREE.MathUtils.lerp(x,detailX,t),THREE.MathUtils.lerp(heroY+bob*focus,detailY,t),THREE.MathUtils.lerp(-.55*(1-focus),.5,t));
    const scl=THREE.MathUtils.lerp(heroScale*(.85+.2*focus),detailScale,t)*(selected?1:1-enter);
    m.scale.setScalar(Math.max(.0001,scl));m.visible=scl>.01&&rect.bottom>0;
    const rotation=state.motion?state.scroll*Math.PI*2:(Math.floor(target*3)===1?Math.PI:0);
    m.rotation.set(.08,THREE.MathUtils.lerp((1-focus)*Math.PI*.92,rotation,t)+state.pointer.x*.055*focus-velocity*.1,THREE.MathUtils.lerp(.24*focus+Math.sin(i*1.9)*.065*(1-focus),-.1+Math.cos(state.scroll*Math.PI*2)*.34,t)+state.pointer.y*.025*focus+velocity*.025);
    // The selected object and its reflections move as a single continuous model.
    m.userData.material.envMapIntensity=.2+focus*.95+enter*.25;
    m.userData.material.color.setScalar(.25+focus*.75);
    m.userData.material.clearcoat=.3+focus*.65;
    const explode=focus*(1-enter);
    m.userData.lid.position.y=1.71+.49*explode;
    m.userData.lid.rotation.x=.55*explode;
    m.userData.bottom.position.y=-1.73-.28*explode;
    m.userData.bottom.rotation.x=.32*explode;
  });
  renderer.render(scene,camera);
  window.vyra3d.stats={calls:renderer.info.render.calls,triangles:renderer.info.render.triangles};
}
window.vyra3d={select(index){state.index=index;},motion(value){state.motion=value;if(!value)state.pointer.set(0,0);},stats:{}};
document.addEventListener('pointermove',e=>{if(e.pointerType==='touch'||!state.motion)return;state.pointer.set(e.clientX/innerWidth-.5,e.clientY/innerHeight-.5);},{passive:true});
document.addEventListener('visibilitychange',()=>{active=!document.hidden;last=performance.now();});
try{
  renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'high-performance'});renderer.setClearColor(0,0);renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.3;
  scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(31,1,.1,50);camera.position.set(0,0,11);lighting();
  await document.fonts.load('400 40px "VYRA Display"');
  models=colors.map((_,i)=>{const m=can(i);scene.add(m);return m;});resize();addEventListener('resize',resize);
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();active=false;document.documentElement.classList.remove('webgl-ready');document.documentElement.classList.add('webgl-fallback');canvas.style.visibility='hidden';});
  canvas.addEventListener('webglcontextrestored',()=>{active=true;last=performance.now();canvas.style.visibility='';document.documentElement.classList.remove('webgl-fallback');rootReady();});
  rootReady();requestAnimationFrame(draw);
}catch(error){canvas.remove();document.documentElement.classList.add('webgl-fallback');console.warn('3D view unavailable; using product artwork fallback.',error.message);}
function rootReady(){document.documentElement.classList.add('webgl-ready');document.documentElement.classList.remove('scene-loading');window.dispatchEvent(new Event('vyra3dready'));}
