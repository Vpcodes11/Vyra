'use strict';
const flavors = [
  {glow:'#5435c8',name:'MIDNIGHT LYCHEE',lines:['MIDNIGHT','LYCHEE'],color:'#b49aff',rgb:'143,97,255',hue:0,notes:['FLORAL','BRIGHT','CRISP'],description:'Soft lychee. A flash of citrus. A bright, sparkling finish that takes the night somewhere new.'},
  {glow:'#e5005e',name:'RASPBERRY RUSH',lines:['RASPBERRY','RUSH'],color:'#ff7bb7',rgb:'241,16,110',hue:55,notes:['BERRY','TART','ELECTRIC'],description:'A burst of raspberry with a sharp, juicy edge. Bold from the first sip, bright to the very last.'},
  {glow:'#9da622',name:'CITRUS STATIC',lines:['CITRUS','STATIC'],color:'#dded8b',rgb:'184,196,39',hue:185,notes:['ZESTY','SHARP','VIVID'],description:'Lemon and lime in perfect tension. A wave of citrus with a sparkling, dry finish.'},
  {glow:'#009e82',name:'MINT CURRENT',lines:['MINT','CURRENT'],color:'#75e2c3',rgb:'18,182,137',hue:250,notes:['COOL','FRESH','CLEAN'],description:'Cool mint meets a quiet hint of cucumber. A fresh current running through every sparkling sip.'},
  {glow:'#d76826',name:'APRICOT AFTERGLOW',lines:['APRICOT','AFTERGLOW'],color:'#ffc482',rgb:'230,119,36',hue:125,notes:['MELLOW','JUICY','GOLDEN'],description:'Sun-ripe apricot with a little citrus lift. Soft stone fruit, a bright sparkle, and a golden finish.'}
];
const $ = s => document.querySelector(s);
const root = document.documentElement;
const stage = $('.stage');
const row = $('#can-row');
const experience = $('#experience');
const motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
let selected = 0, chapter = -1, reduced = motionQuery.matches, framePending = false;
let drag = null; let visualIndex = 0;
try { const saved = localStorage.getItem('vyra-reduced-motion'); if(saved !== null) reduced = saved === 'true'; } catch {}

// Seven positions keep the ends filled while the five flavors wrap naturally.
for(let i = -3; i <= 3; i++) {
  const button = document.createElement('button'); button.className = 'can';
  button.innerHTML = '<img src="assets/can-front.webp" alt="" draggable="false" width="320" height="1000">';
  button.dataset.slot = i; button.addEventListener('click', () => { if(!stage.dataset.dragged) selectFlavor(selected+i); });
  row.append(button);
}
flavors.forEach((flavor,i) => {
  const button = document.createElement('button'); button.className='flavor-dot';
  button.setAttribute('aria-label',flavor.name); button.style.setProperty('--dot',flavor.color);
  button.addEventListener('click',()=>selectFlavor(i)); $('.flavor-dots').append(button);
});
function wrap(n){return (n+flavors.length)%flavors.length;}
function selectFlavor(index){
  const previous=selected;selected=wrap(index); const f=flavors[selected];
  let step=selected-previous; if(step>2)step-=5; if(step< -2)step+=5; visualIndex+=step; window.vyra3d?.select(visualIndex);
  root.style.setProperty('--accent',f.color);root.style.setProperty('--light-color',f.glow);root.style.setProperty('--rgb',f.rgb);root.style.setProperty('--hue',f.hue+'deg');
  $('#flavor-number').textContent=String(selected+1).padStart(2,'0')+' / 05';
  for(const id of ['#flavor-name','#detail-title']) $(id).innerHTML=f.lines.join('<br>');
  $('#detail-description').textContent=f.description;$('#detail-flavor').textContent=f.name;
  $('#flavor-notes').replaceChildren(...f.notes.map(note=>{const span=document.createElement('span');span.textContent=note;return span;}));
  document.querySelectorAll('.flavor-dot').forEach((el,i)=>el.setAttribute('aria-pressed',String(i===selected)));
  const gap=innerWidth<=760 ? 139 : Math.min(innerWidth*.175,280);
  document.querySelectorAll('.can').forEach(el=>{
    const slot=Number(el.dataset.slot),fi=wrap(selected+slot),active=slot===0;
    el.classList.toggle('selected',active);el.style.setProperty('--x',slot*gap+'px');
    el.style.setProperty('--tilt',active?'-16deg':(slot<0?'-5deg':'5deg'));
    el.style.setProperty('--scale',active?1.13: .86-Math.abs(slot)*.025);
    el.style.setProperty('--brightness',active?'1.05':'.34');el.style.setProperty('--opacity',Math.abs(slot)===3?'.7':'1');
    el.style.setProperty('--z',10-Math.abs(slot));el.style.setProperty('--can-hue',(flavors[fi].hue-50)+'deg');
    const image=el.querySelector('img');const back=!active&&Math.abs(slot)%2===1;
    image.src=back?'assets/can-back.webp':'assets/can-front.webp';
    if(back)el.style.setProperty('--can-hue',(flavors[fi].hue-50)+'deg');
    el.setAttribute('aria-label',flavors[fi].name+(active?', selected':''));el.setAttribute('aria-pressed',String(active));
    el.tabIndex=Math.abs(slot)>2?-1:0;
  });
}
$('.previous').addEventListener('click',()=>selectFlavor(selected-1));$('.next').addEventListener('click',()=>selectFlavor(selected+1));
$('#collection').addEventListener('keydown',e=>{
  if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();selectFlavor(selected+(e.key==='ArrowRight'?1:-1));}
  if(e.key==='Home'){e.preventDefault();selectFlavor(0);}if(e.key==='End'){e.preventDefault();selectFlavor(4);}
});
stage.addEventListener('pointerdown',e=>{if(e.button!==0)return;drag={x:e.clientX,y:e.clientY};delete stage.dataset.dragged;});
window.addEventListener('pointerup',e=>{
  if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;drag=null;
  if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy)){stage.dataset.dragged='true';selectFlavor(selected+(dx<0?1:-1));setTimeout(()=>delete stage.dataset.dragged,150);}
});
stage.addEventListener('pointercancel',()=>{drag=null;});
let pointerFrame=0,pointerX=0,pointerY=0;
$('#collection').addEventListener('pointermove',e=>{
  if(reduced||e.pointerType==='touch')return;
  pointerX=e.clientX;pointerY=e.clientY;
  if(pointerFrame)return;
  pointerFrame=requestAnimationFrame(()=>{
    pointerFrame=0;
    root.style.setProperty('--px',((pointerX/innerWidth-.5)*12).toFixed(1)+'px');
    root.style.setProperty('--py',((pointerY/innerHeight-.5)*8).toFixed(1)+'px');
  });
});
$('#collection').addEventListener('pointerleave',()=>{if(pointerFrame)cancelAnimationFrame(pointerFrame);pointerFrame=0;root.style.setProperty('--px','0px');root.style.setProperty('--py','0px');});
function applyMotion(){window.vyra3d?.motion(!reduced);root.classList.toggle('reduced-motion',reduced);root.style.scrollBehavior=reduced?'auto':'';$('#motion-toggle').innerHTML='MOTION '+(reduced?'OFF':'ON')+' <span>◉</span>';$('#motion-toggle').setAttribute('aria-pressed',String(reduced));updateScroll();}
$('#motion-toggle').addEventListener('click',()=>{reduced=!reduced;try{localStorage.setItem('vyra-reduced-motion',String(reduced));}catch{}applyMotion();});
motionQuery.addEventListener('change',e=>{reduced=e.matches;applyMotion();});
function updateScroll(){
  framePending=false;
  const rect=experience.getBoundingClientRect(),range=Math.max(1,experience.offsetHeight-innerHeight);
  const progress=Math.min(1,Math.max(0,-rect.top/range));
  const heroExit=Math.min(1,Math.max(0,(innerHeight-rect.top)/(innerHeight*.24)));
  const collection=$('#collection');collection.style.setProperty('--hero-exit',heroExit.toFixed(3));collection.classList.toggle('hero-exiting',heroExit>.94);
  const next=progress<.32?0:progress<.88?1:2;
  if(chapter!==next){chapter=next;document.querySelectorAll('.copy-panel').forEach((el,i)=>{el.classList.toggle('active',i===chapter);el.inert=i!==chapter;});
    document.querySelectorAll('[data-go]').forEach((el,i)=>{if(i===chapter)el.setAttribute('aria-current','step');else el.removeAttribute('aria-current');});$('#chapter-count').textContent='0'+(chapter+1)+' / 03';}
  const angle=reduced?(chapter===1?180:0):progress<.37?progress/.37*180:progress<.83?180:180+(progress-.83)/.17*180;
  const tilt=reduced?-12:-16+Math.sin(progress*Math.PI)*25;
  // Front/back render blending retains cylindrical volume at the turn.
  const backAmount=Math.min(1,Math.max(0,((1-Math.cos(angle*Math.PI/180))/2-.35)/.3));
  $('.detail-can').style.transform=`rotate(${tilt}deg) scaleX(${1-.12*Math.sin(angle*Math.PI/180)**2})`;
  $('.detail-front').style.opacity=String(1-backAmount);
  $('.detail-back').style.opacity=String(backAmount);
}
addEventListener('scroll',()=>{if(!framePending){framePending=true;requestAnimationFrame(updateScroll);}},{passive:true});
document.querySelectorAll('[data-go]').forEach(el=>el.addEventListener('click',()=>{
  const i=Number(el.dataset.go),range=experience.offsetHeight-innerHeight;
  scrollTo({top:experience.offsetTop+range*[.12,.41,.91][i],behavior:reduced?'instant':'smooth'});
}));
let resizeTimer;addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{selectFlavor(selected);updateScroll();},100);});
const menu=$('#menu'),menuButton=$('.menu-toggle');
function closeMenu(){menu.hidden=true;menuButton.setAttribute('aria-expanded','false');}
menuButton.addEventListener('click',()=>{menu.hidden=!menu.hidden;menuButton.setAttribute('aria-expanded',String(!menu.hidden));});
menu.querySelectorAll('a').forEach(a=>a.addEventListener('click',closeMenu));
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!menu.hidden){closeMenu();menuButton.focus();}});
document.addEventListener('click',e=>{if(!menu.hidden&&!menu.contains(e.target)&&!menuButton.contains(e.target))closeMenu();});
$('#year').textContent=new Date().getFullYear();selectFlavor(0);applyMotion();


addEventListener("vyra3dready",()=>{window.vyra3d.select(visualIndex);window.vyra3d.motion(!reduced);});

