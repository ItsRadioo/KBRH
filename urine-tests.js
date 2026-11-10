(()=>{'use strict';
let roster=[],days={},pending=0,ready=false,chain=Promise.resolve();const $=id=>document.getElementById(id);
const escape=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const date=new Date();$('testDate').value=[date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-');
const ref=()=>db.collection('kbrh').doc('houseUrineTests');
function status(text,error=false){$('testStatus').textContent=text;$('testStatus').classList.toggle('error',error);}
function residentsForDate(){
 const saved=days[$('testDate').value]||{},people=new Map();
 for(const r of roster)if(r&&r!=='temp'&&!r.archived)people.set(r.id,{id:r.id,name:[r.firstName,r.lastName].filter(Boolean).join(' '),phase:r.phase||'phase1'});
 for(const [id,r] of Object.entries(saved))if(!people.has(id))people.set(id,{id,name:r.name||'Former resident',phase:r.phase||'phase1'});
 const phase=$('testPhase').value;return [...people.values()].filter(r=>phase==='all'||r.phase===phase).sort((a,b)=>a.name.localeCompare(b.name));
}
function render(){
 if(!ready||pending)return;
 // Do not replace a staff member's unsaved text while a live snapshot arrives.
 if(document.activeElement?.matches('#testRows input[type=text]'))return;
 const saved=days[$('testDate').value]||{};
 $('testRows').innerHTML=residentsForDate().map(r=>{const v=saved[r.id]||{};return `<tr data-id="${escape(r.id)}"><td>${escape(r.name)}</td><td><input type="checkbox" data-field="done" aria-label="Done for ${escape(r.name)}" ${v.done?'checked':''}></td><td><select data-field="result" class="${v.result==='+'?'positive':v.result==='-'?'negative':''}" aria-label="Result for ${escape(r.name)}"><option value="" ${!v.result?'selected':''}>Select…</option><option value="+" ${v.result==='+'?'selected':''}>+</option><option value="-" ${v.result==='-'?'selected':''}>−</option></select></td><td><input type="text" maxlength="200" data-field="testedFor" aria-label="Tested for ${escape(r.name)}" value="${escape(v.testedFor||'')}" placeholder="e.g. COC, THC"></td></tr>`;}).join('')||'<tr><td colspan="4">No residents to display.</td></tr>';
}
async function saveField(day,resident,field,value){
 let changed=false;
 await db.runTransaction(async tx=>{
  const doc=ref(),snap=await tx.get(doc),data=snap.exists?snap.data():{};
  const allDays=data.days||{},rows=allDays[day]||{},previous=rows[resident.id]||{};
  changed=previous[field]!==value;
  tx.set(doc,{days:{...allDays,[day]:{...rows,[resident.id]:{...previous,name:resident.name,phase:resident.phase,[field]:value,updatedAt:new Date().toISOString(),updatedByUid:auth.currentUser.uid}}}},{merge:true});
 });
 if(changed)try{
  const identity=typeof getCurrentStaffIdentity==='function'?await getCurrentStaffIdentity():{uid:auth.currentUser.uid,email:auth.currentUser.email};
  const label={done:'Done status',result:'Test result',testedFor:'Tested-for field'}[field];
  await db.collection('kbrhAudit').add({page:'urine-tests.html',residentId:resident.id,summary:`House-wide urine test updated: ${resident.name}`,changes:[`Test date: ${day}`,`${label} updated`],staffUid:identity.uid||auth.currentUser.uid,staffName:identity.name||identity.email||'Staff',staffEmail:identity.email||'',timestamp:firebase.firestore.FieldValue.serverTimestamp(),timestampIso:new Date().toISOString()});
 }catch(error){console.warn('Urine test saved; audit logging failed',error);}
}
$('testRows').addEventListener('change',event=>{
 const input=event.target,field=input.dataset.field;if(!['done','result','testedFor'].includes(field))return;
 const day=$('testDate').value;if(!day)return;
 const person=residentsForDate().find(r=>r.id===input.closest('tr').dataset.id);if(!person)return;
 const value=field==='done'?input.checked:input.value;if(field==='result'&&!['','+','-'].includes(value))return;
 pending++;status('Saving…');$('testDate').disabled=true;
 chain=chain.then(()=>saveField(day,person,field,value)).then(()=>status('Saved')).catch(error=>{console.error(error);status('Save failed. Change the field again to retry: '+(error.message||error),true);}).finally(()=>{pending--;$('testDate').disabled=!!pending;if(!pending)render();});
});
$('testDate').addEventListener('change',()=>{if(!$('testDate').value)return;render();});$('testPhase').addEventListener('change',render);$('printTests').onclick=()=>window.print();
auth.onAuthStateChanged(user=>{if(!user)return;listenToAppState(state=>{roster=state.roster||[];render();});ref().onSnapshot(snap=>{days=snap.exists?(snap.data().days||{}):{};ready=true;status(pending?'Saving…':'Changes save automatically');render();},error=>{console.error(error);status('Could not load saved tests: '+error.message,true);});});
})();
