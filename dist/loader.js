const root=document.documentElement;
const loader=document.querySelector('#loader');
const status=document.querySelector('#loader-status');
const started=performance.now();
let finished=false;
function reveal(){
  if(finished)return;
  finished=true;
  clearTimeout(watchdog);
  status.textContent='Collection ready';
  document.querySelector('#loader-percent').textContent='100';
  loader.style.setProperty('--load',1);
  setTimeout(()=>{
    root.classList.remove('is-loading');
    for(const el of document.querySelectorAll('[data-loading-inert]')){el.inert=false;el.removeAttribute('data-loading-inert');}
    loader.classList.add('loader-exit');
    setTimeout(()=>loader.remove(),750);
  },Math.max(0,850-(performance.now()-started)));
}
for(const el of document.querySelectorAll('header,main,footer,.skip-link')){el.inert=true;el.setAttribute('data-loading-inert','');}
window.addEventListener('vyra-load',event=>{
  if(finished)return;
  loader.style.setProperty('--load',event.detail.progress);
  status.textContent='Preparing the collection';
  document.querySelector('#loader-percent').textContent=String(Math.round(event.detail.progress*100)).padStart(2,'0');
  if(event.detail.ready)reveal();
});
document.querySelector('#loader-enter').addEventListener('click',reveal);
const watchdog=setTimeout(reveal,12000);
setTimeout(()=>{if(!finished)document.querySelector('#loader-enter').hidden=false;},5000);
