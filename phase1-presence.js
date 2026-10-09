/* Phase 1 visual presence board. Independent of digital logbook and roster history. */
(()=>{
'use strict';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const doc=()=>db.collection('kbrh').doc('phase1Presence');
let people=[],statuses={},selected=new Set(),unsubscribeRoster=null,unsubscribePresence=null;
const isPhase1=r=>r&&r!=='temp'&&!r.archived&&String(r.phase||'phase1').toLowerCase().replace(/\s/g,'')==='phase1';
const fullName=r=>[r.firstName,r.lastName].filter(Boolean).join(' ').trim()||r.name||'Unnamed resident';
function mount(){
 const root=document.getElementById('phase1PresenceWidget');if(!root)return;
 root.innerHTML='<div class="p1-head"><div><h2>Phase 1 Resident Presence</h2><p class="hint">Live Phase 1 presence totals.</p></div><button type="button" id="p1Open">Manage In / Out</button></div><div id="p1Counts" class="p1-counts">Loading…</div>';
 document.getElementById('p1Open').addEventListener('click',openModal);
 const modal=document.createElement('div');modal.id='p1Modal';modal.className='p1-backdrop';modal.hidden=true;modal.innerHTML='<div class="p1-dialog" role="dialog" aria-modal="true" aria-labelledby="p1Title"><div class="p1-head"><h2 id="p1Title">Phase 1 — In / Out</h2><button type="button" id="p1Close" class="p1-secondary">Close</button></div><p class="hint">Select one or more Phase 1 residents. Each action creates an individual digital logbook entry and updates the visual status.</p><label class="p1-time-label">Movement time <input id="p1MovementTime" type="datetime-local" required></label><div id="p1List"></div><p id="p1Error" role="alert" class="p1-error"></p><div class="p1-actions"><button type="button" id="p1MarkOut">Mark Selected Out</button><button type="button" id="p1MarkIn">Mark Selected In</button></div></div>';
 document.body.appendChild(modal);
 document.getElementById('p1Close').addEventListener('click',closeModal);
 modal.addEventListener('click',e=>{if(e.target===modal)closeModal()});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!modal.hidden)closeModal()});
 document.getElementById('p1MarkOut').addEventListener('click',()=>update('Out'));
 document.getElementById('p1MarkIn').addEventListener('click',()=>update('In'));
 document.getElementById('p1List').addEventListener('change',e=>{if(e.target.matches('input[data-p1-id]')){const id=e.target.dataset.p1Id;if(e.target.checked)selected.add(id);else selected.delete(id)}});
 unsubscribeRoster=listenToAppState(s=>{people=(s.roster||[]).filter(isPhase1).map(r=>({id:String(r.id),name:fullName(r)})).filter(r=>r.id).sort((a,b)=>a.name.localeCompare(b.name));selected=new Set([...selected].filter(id=>people.some(p=>p.id===id)));render()});
 unsubscribePresence=doc().onSnapshot(s=>{statuses=s.exists?(s.data()?.statuses||{}):{};render()},err=>{console.error('Presence board unavailable',err);document.getElementById('p1Counts').textContent='Presence status unavailable';document.getElementById('p1Error').textContent='Could not load shared statuses.'});
}
function render(){const counts=document.getElementById('p1Counts');if(!counts)return;const outside=people.filter(p=>statuses[p.id]==='Out').length,inside=people.length-outside;
 counts.innerHTML=`<span class="p1-in">In: <strong>${inside}</strong></span><span class="p1-out">Out: <strong>${outside}</strong></span><span>Total: <strong>${people.length}</strong></span>`;
 const list=document.getElementById('p1List');if(!list)return;list.innerHTML=people.length?people.map(p=>`<label class="p1-resident"><input type="checkbox" data-p1-id="${esc(p.id)}" ${selected.has(p.id)?'checked':''}><span>${esc(p.name)}</span><strong class="${statuses[p.id]==='Out'?'p1-out':'p1-in'}">${statuses[p.id]==='Out'?'Out':'In'}</strong></label>`).join(''):'<p>No active Phase 1 residents.</p>';
}
function openModal(){selected.clear();document.getElementById('p1Error').textContent='';document.getElementById('p1MovementTime').value=localMovementTime();document.getElementById('p1Modal').hidden=false;render();document.getElementById('p1Close').focus()}
function closeModal(){document.getElementById('p1Modal').hidden=true;selected.clear()}
function localMovementTime(){const d=new Date(),p=n=>String(n).padStart(2,'0');return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`}
async function update(value){
 const ids=[...selected].filter(id=>people.some(p=>p.id===id));
 const error=document.getElementById('p1Error');
 if(!ids.length){error.textContent='Select at least one resident.';return}
 const eligible=ids.filter(id=>(statuses[id]==='Out')!==(value==='Out'));
 if(!eligible.length){error.textContent=`All selected residents are already ${value}.`;return}
 const timeValue=document.getElementById('p1MovementTime').value;
 const eventDate=new Date(timeValue);
 if(!timeValue||Number.isNaN(eventDate.getTime())){error.textContent='Enter a valid movement date and time.';return}
 const buttons=['p1MarkOut','p1MarkIn'].map(id=>document.getElementById(id));
 buttons.forEach(b=>b.disabled=true);error.textContent='';
 try{
  const identity=typeof getCurrentStaffIdentity==='function'?await getCurrentStaffIdentity():{uid:auth.currentUser?.uid||'',email:auth.currentUser?.email||'',name:auth.currentUser?.displayName||'Staff User'};
  const logRef=db.collection('kbrh').doc('digitalLogbook');
  const presenceRef=doc();
  const now=new Date().toISOString();
  const eventTime=eventDate.toISOString();
  const names=new Map(people.map(p=>[p.id,p.name]));
  // Both documents are committed together. No partial log entries or mismatched visual state.
  await db.runTransaction(async transaction=>{
   const presenceSnap=await transaction.get(presenceRef);
   const logSnap=await transaction.get(logRef);
   const current=presenceSnap.exists?(presenceSnap.data()?.statuses||{}):{};
   const actual=eligible.filter(id=>(current[id]==='Out')!==(value==='Out'));
   if(!actual.length)throw Error('These residents are already marked '+value+'. Refresh and try again.');
   const entries=logSnap.exists&&Array.isArray(logSnap.data()?.entries)?logSnap.data().entries:[];
   const newEntries=actual.map((id,i)=>({
    logScope:'phase1',id:`log-${Date.now()}-${i}-${Math.random().toString(36).slice(2,9)}`,
    type:'movement',residentId:id,residentName:names.get(id)||'Resident',
    direction:value==='Out'?'OUT':'IN',eventTime,
    summary:`${names.get(id)||'Resident'} — ${value==='Out'?'LEFT':'RETURNED'}`,
    notificationPriority:'',enteredBy:identity.name||'Unknown Staff',
    enteredByUid:identity.uid||'',enteredByEmail:identity.email||'',createdAt:now
   }));
   transaction.set(logRef,{entries:[...entries,...newEntries],updatedAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:true});
   const changes={updatedAt:firebase.firestore.FieldValue.serverTimestamp()};
   actual.forEach(id=>{changes['statuses.'+id]=value});
   transaction.set(presenceRef,changes,{merge:true});
  });
  selected.clear();render();closeModal();
 }catch(e){console.error('Could not record resident movements',e);error.textContent=e.message||'Unable to save movement. No changes were recorded.'}
 finally{buttons.forEach(b=>b.disabled=false)}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
})();
