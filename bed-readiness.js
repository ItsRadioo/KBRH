(()=>{
'use strict';
// Same 18 Phase 1 beds and room IDs as the roster's assignment inventory.
const ROOMS=[1,2,3,4,6,7,8,9,10,11,12,13,14];
const SINGLE=new Set([3,4,6,9,10,11,13,14]);
const BEDS=ROOMS.flatMap(room=>SINGLE.has(room)?[String(room)]:[`${room}-1`,`${room}-2`]);
let state=null, saving=false;
const grid=document.getElementById('bed-room-grid');
const totals=document.getElementById('bed-totals');
const message=document.getElementById('bed-message');
const escapeHtml=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const status=bed=>state?.bedReadiness?.[bed]?.ready===true;
// Occupancy is derived from the live Phase 1 roster, never stored as a manual flag.
// Single-bed rooms may have legacy IDs such as 6-1.
const normalizeBed=value=>String(value??'').trim().replace(/^(3|4|6|9|10|11|13|14)-1$/,'$1');
function occupiedBeds(){
 const occupied=new Set();
 for(const resident of (Array.isArray(state?.roster)?state.roster:[])){
  if(!resident||resident==='temp'||resident.archived||(resident.phase||'phase1')!=='phase1')continue;
  const bed=normalizeBed(resident.roomNumber);
  if(BEDS.includes(bed))occupied.add(bed);
 }
 return occupied;
}
function render(){
 if(!state)return;
 const occupied=occupiedBeds();
 const ready=BEDS.filter(b=>!occupied.has(b)&&status(b)).length;
 const unready=BEDS.length-ready-occupied.size;
 totals.innerHTML=`<div class="bed-total"><strong>${ready}</strong><span>Ready</span></div><div class="bed-total"><strong>${unready}</strong><span>Unready</span></div><div class="bed-total occupied-total"><strong>${occupied.size}</strong><span>Occupied</span></div><div class="bed-total"><strong>${BEDS.length}</strong><span>Total Phase 1 beds</span></div>`;
 grid.innerHTML=ROOMS.map(room=>{
  const beds=BEDS.filter(b=>b===String(room)||b.startsWith(room+'-'));
  return `<article class="bed-room"><h2>Room ${room}</h2><div class="bed-room-beds">${beds.map(b=>{
   const ready=status(b), isOccupied=occupied.has(b), record=state.bedReadiness?.[b]||{};
   return `<div class="bed-item ${isOccupied?'occupied':ready?'ready':'unready'}"><div><strong>Bed ${escapeHtml(b)}</strong><small>${isOccupied?'Occupied':ready?'Ready':'Unready'}${!isOccupied&&record.updatedAt?' · Updated '+escapeHtml(new Date(record.updatedAt).toLocaleDateString('en-CA')):''}</small></div><button type="button" data-bed="${escapeHtml(b)}" aria-pressed="${ready}" ${(saving||isOccupied)?'disabled':''} aria-label="${isOccupied?'Bed '+escapeHtml(b)+' is occupied':'Mark bed '+escapeHtml(b)+' '+(ready?'unready':'ready')}">${isOccupied?'Occupied':ready?'✓ Ready':'Unready'}</button></div>`;
  }).join('')}</div></article>`;
 }).join('');
}
async function toggle(bed){
 if(saving||!state||!BEDS.includes(bed)||occupiedBeds().has(bed))return;
 saving=true;message.textContent='';
 const previous=state.bedReadiness?.[bed];
 const ready=!status(bed);
 const next={...state,bedReadiness:{...(state.bedReadiness||{}),[bed]:{ready,updatedAt:new Date().toISOString(),updatedBy:auth.currentUser?.email||''}}};
 state=next;render();
 try{await saveAppState(next);message.textContent='';}
 catch(e){console.error('Bed readiness save failed',e);state.bedReadiness={...state.bedReadiness};if(previous)state.bedReadiness[bed]=previous;else delete state.bedReadiness[bed];message.textContent='Unable to save bed readiness. Please retry.';}
 finally{saving=false;render();}
}
grid.addEventListener('click',e=>{const button=e.target.closest('button[data-bed]');if(button)toggle(button.dataset.bed);});
auth.onAuthStateChanged(user=>{
 if(!user)return;
 listenToAppState(next=>{if(saving)return;state=next;render();});
});
})();