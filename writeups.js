let writeupState={roster:[],writeUps:[]},writeupCounts={},countsReady=false;const writeupBusy=new Set();
const $=id=>document.getElementById(id),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function activeRoster(){return (writeupState.roster||[]).filter(r=>r&&r!=='temp'&&!r.archived&&(r.phase||'phase1')==='phase1').sort((a,b)=>`${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`));}
function legacyWriteupCount(state,id){return (state.writeUps||[]).filter(w=>w&&w.residentId===id).length;}
function countFor(id){const count=writeupCounts[id]?.count;return Number.isInteger(count)&&count>=0?count:legacyWriteupCount(writeupState,id);}
function renderRoster(){
 const rows=activeRoster();$('writeupRosterBody').innerHTML=rows.map(r=>{const count=countFor(r.id),busy=writeupBusy.has(r.id)||!countsReady,name=[r.firstName,r.lastName].filter(Boolean).join(' ');return `<tr><td>${esc(name)}</td><td><div class="cms-count-controls"><button type="button" data-id="${esc(r.id)}" data-delta="-1" aria-label="Remove one write-up for ${esc(name)}" ${busy||count===0?'disabled':''}>−</button><strong class="cms-count">${count}</strong><button type="button" data-id="${esc(r.id)}" data-delta="1" aria-label="Add one write-up for ${esc(name)}" ${busy?'disabled':''}>+</button></div></td></tr>`;}).join('')||'<tr><td colspan="2">No current Phase 1 residents.</td></tr>';
}
async function changeWriteupCount(id,delta){
 if(writeupBusy.has(id)||!countsReady||![-1,1].includes(delta))return;
 writeupBusy.add(id);renderRoster();$('writeupStatus').textContent='Saving…';
 let name='',before=0,after=0;
 try{
  const st=typeof getCurrentStaffIdentity==='function'?await getCurrentStaffIdentity():{uid:auth.currentUser.uid,email:auth.currentUser.email};
  await db.runTransaction(async tx=>{
   const appRef=db.collection('kbrh').doc('choreTracker'),countRef=db.collection('kbrh').doc('writeupCounts');
   const [appSnap,countSnap]=await Promise.all([tx.get(appRef),tx.get(countRef)]);const state=appSnap.exists?appSnap.data():{};
   const resident=(state.roster||[]).find(r=>r&&r.id===id&&!r.archived&&(r.phase||'phase1')==='phase1');
   if(!resident)throw Error('This resident is no longer in Phase 1.');
   const counts=countSnap.exists?(countSnap.data().counts||{}):{},stored=counts[id]?.count;
   before=Number.isInteger(stored)&&stored>=0?stored:legacyWriteupCount(state,id);after=Math.max(0,before+delta);
   name=[resident.firstName,resident.lastName].filter(Boolean).join(' ');
   tx.set(countRef,{counts:{[id]:{count:after,updatedAt:new Date().toISOString(),updatedByUid:st.uid||auth.currentUser.uid}}},{merge:true});
  });
  writeupCounts[id]={...writeupCounts[id],count:after};$('writeupStatus').textContent='Saved';
  if(before!==after)try{await db.collection('kbrhAudit').add({page:'writeups.html',summary:`Write-up count updated: ${name}`,changes:[`Count: ${before} → ${after}`],residentId:id,staffUid:st.uid||'',staffName:st.name||st.email||'Staff',staffEmail:st.email||'',timestamp:firebase.firestore.FieldValue.serverTimestamp(),timestampIso:new Date().toISOString()});}catch(error){console.warn('Count saved; audit failed',error);$('writeupStatus').textContent='Count saved; audit logging failed.';}
 }catch(error){console.error(error);$('writeupStatus').textContent='Save failed: '+(error.message||error);}finally{writeupBusy.delete(id);renderRoster();}
}
$('writeupRosterBody').addEventListener('click',event=>{const b=event.target.closest('button[data-id]');if(b)changeWriteupCount(b.dataset.id,Number(b.dataset.delta));});
auth.onAuthStateChanged(user=>{if(!user)return;listenToAppState(state=>{writeupState=state;renderRoster();});db.collection('kbrh').doc('writeupCounts').onSnapshot(snap=>{writeupCounts=snap.exists?(snap.data().counts||{}):{};countsReady=true;$('writeupStatus').textContent='Counts save automatically';renderRoster();},error=>{$('writeupStatus').textContent='Could not load counts: '+error.message;});});
