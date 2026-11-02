
"use strict";
const EDOC=()=>db.collection("kbrh").doc("electronicsTurnIn");
const LREF=()=>db.collection("kbrh").doc("digitalLogbook");
let residents=[],records=[],unsubscribeElectronics=null,busy=false;
const $=id=>document.getElementById(id);
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const pad=v=>String(v).padStart(2,"0");
const localDate=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const clock=d=>`${pad(d.getHours())}:${pad(d.getMinutes())}`;
const displayTime=t=>{if(!t)return "—";const [h,m]=t.split(":").map(Number);return `${h%12||12}:${pad(m)} ${h>=12?"PM":"AM"}`};
const nameOf=c=>[c.firstName||c.first||"",c.lastName||c.last||""].join(" ").trim()||c.name||"Unknown";
const idOf=c=>String(c.id||c.clientId||c.clientID||"");
const dayRecords=()=>records.filter(r=>r.date===$("collectionDate").value);
function draw(){
 const today=dayRecords(),byId=new Map(today.map(r=>[String(r.residentId),r]));
 $("electronicsRows").innerHTML=residents.length?residents.map(c=>{
  const r=byId.get(idOf(c));
  return `<tr data-review="${Boolean(r?.reviewRequired)}"><td><input type="checkbox" data-id="${esc(idOf(c))}" ${r?"checked":""} ${busy?"disabled":""} aria-label="Device turned in for ${esc(nameOf(c))}"></td><td><strong>${esc(nameOf(c))}</strong></td><td>${esc(c.clientId||c.clientID||c.id||"")}</td><td>${r?esc(displayTime(r.time)):"—"}</td><td>${r?(r.reviewRequired?'<span class="electronics-pill review">Review required</span>':'<span class="electronics-pill">Recorded</span>'):"Pending"}</td></tr>`
 }).join(""):'<tr><td colspan="5">No current Phase 1 residents found.</td></tr>';
 const review=today.filter(r=>r.reviewRequired);
 $("electronicsReview").innerHTML=review.length?review.map(r=>`<p><strong>${esc(r.residentName)}</strong> — ${esc(displayTime(r.time))} <span class="electronics-pill review">Review required</span></p>`).join(""):"No late turn-ins flagged for this date.";
 $("electronicsStatus").textContent=`${today.length} of ${residents.length} residents checked off for ${$("collectionDate").value}.`;
 document.querySelectorAll("#electronicsRows input[type=checkbox]").forEach(box=>box.addEventListener("change",()=>{
   if(!box.checked){
     box.checked=true;
     const existing=byId.get(box.dataset.id);
     if(existing)undoTurnIn(existing);
     return;
   }
   const resident=residents.find(c=>idOf(c)===box.dataset.id);
   if(resident)beginTurnIn(resident);
 }));
}
async function undoTurnIn(record){
 if(busy)return;
 if(!confirm(`Undo the device turn-in for ${record.residentName} on ${record.date} at ${displayTime(record.time)}? A correction will be added to the log book.`))return;
 const reason=prompt("Reason for correcting this check-off (required):");
 if(!reason||!reason.trim()){draw();return}
 busy=true;draw();
 try{
  await db.runTransaction(async tx=>{
   const ref=EDOC(),log=LREF();
   const [a,b]=await Promise.all([tx.get(ref),tx.get(log)]);
   const existing=a.exists&&Array.isArray(a.data().records)?a.data().records:[];
   if(!existing.some(x=>x.id===record.id))throw Error("This turn-in has already been corrected.");
   const entries=b.exists&&Array.isArray(b.data().entries)?b.data().entries:[];
   const note=`CORRECTION: ${record.residentName}'s device turn-in at ${displayTime(record.time)} on ${record.date} was unchecked. Reason: ${reason.trim()}`;
   tx.set(ref,{records:existing.filter(x=>x.id!==record.id),updatedAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:true});
   tx.set(log,{entries:[...entries,{id:`electronics-correction-${Date.now()}-${record.id}`,type:"note",logScope:"phase1",note,summary:"Electronics Turn-In Correction",residentId:record.residentId,residentName:record.residentName,createdAt:new Date().toISOString(),enteredBy:auth.currentUser?.email||"",enteredByUid:auth.currentUser?.uid||"",electronicsRecordId:record.id,correctionReason:reason.trim()}],updatedAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:true});
  });
 }catch(e){alert("Could not correct turn-in: "+(e.message||e))}
 finally{busy=false;draw()}
}
function beginTurnIn(resident){
 const now=new Date(),selected=$("collectionDate").value;
 const afterMidnight=now.getHours()<6;
 const manual=afterMidnight||selected!==localDate(now);
 if(!manual){saveTurnIn(resident,selected,clock(now));return}
 $("electronicsModal").innerHTML=`<div class="electronics-modal"><form id="turnInForm"><h2>Record device turn-in</h2><p>${esc(nameOf(resident))}</p><p>${afterMidnight?"After midnight: select the actual turn-in time. This record will be flagged for review.":"Select the actual turn-in time for this collection date."}</p><label>Actual turn-in time <input type="time" name="time" required></label><footer><button type="button" id="cancelTurnIn">Cancel</button><button type="submit">Save turn-in</button></footer></form></div>`;
 $("cancelTurnIn").onclick=()=>{$("electronicsModal").innerHTML="";draw()};
 $("turnInForm").onsubmit=e=>{e.preventDefault();const time=new FormData(e.target).get("time");if(!time)return; $("electronicsModal").innerHTML="";saveTurnIn(resident,selected,time)};
}
async function saveTurnIn(resident,date,time){
 if(busy)return;
 const residentId=idOf(resident),residentName=nameOf(resident);
 const reviewRequired=time<"06:00"; // Post-midnight turn-ins require supervisor review.
 const now=new Date(),uid=auth.currentUser?.uid||"",email=auth.currentUser?.email||"";
 const key=`${date}_${residentId.replace(/[^a-zA-Z0-9_-]/g,"_")}`;
 const entryId=`electronics-${key}`;
 const record={id:key,residentId,residentName,date,time,reviewRequired,recordedAt:now.toISOString(),recordedByUid:uid,recordedByEmail:email,reviewStatus:reviewRequired?"pending":"not-required"};
 const note=`${residentName} turned device in at ${displayTime(time)}${reviewRequired?" — LATE TURN-IN: REVIEW REQUIRED":""}`;
 busy=true;draw();
 try{
   await db.runTransaction(async tx=>{
     const ref=EDOC(),log=LREF();
     const [a,b]=await Promise.all([tx.get(ref),tx.get(log)]);
     const existing=a.exists&&Array.isArray(a.data().records)?a.data().records:[];
     if(existing.some(x=>x.id===key))throw Error("This resident has already been checked off for the selected date.");
     const entries=b.exists&&Array.isArray(b.data().entries)?b.data().entries:[];
     tx.set(ref,{records:[...existing,record],updatedAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:true});
     tx.set(log,{entries:[...entries,{id:entryId,type:"note",logScope:"phase1",note,summary:reviewRequired?"Electronics Turn-In — Review Required":"Electronics Turn-In",residentId,residentName,eventTime:`${date}T${time}`,createdAt:now.toISOString(),enteredBy:email,enteredByUid:uid,electronicsRecordId:key,reviewRequired}],updatedAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:true});
   });
 }catch(e){alert(e.message||"Unable to save device turn-in.");}
 finally{busy=false;draw()}
}
$("collectionDate").value=localDate(new Date());
$("collectionDate").addEventListener("change",draw);
$("refreshElectronics").onclick=draw;
auth.onAuthStateChanged(u=>{
 if(!u)return;
 listenToAppState(state=>{
   residents=(state.roster||[]).filter(c=>c&&!c.archived&&String(c.phase||"phase1").toLowerCase()!=="phase2");
   draw();
 });
 if(unsubscribeElectronics)unsubscribeElectronics();
 unsubscribeElectronics=EDOC().onSnapshot(s=>{records=s.exists&&Array.isArray(s.data().records)?s.data().records:[];draw()},e=>$("electronicsStatus").textContent="Could not load device collection records: "+e.message);
});
