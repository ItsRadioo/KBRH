
(function(){
const TESTS=["COC","MET","THC","AMP","MOR","OXY","FYL","BUP","BZD","EDDP"];
const BLOCKED=TESTS.filter(x=>!["THC","EDDP"].includes(x));
let callback=null, resident=null, correctionHandler=null;
function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function due(date){let d=new Date(String(date).slice(0,10)+"T12:00:00");if(Number.isNaN(d.getTime()))return null;d.setDate(d.getDate()+45);return [d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-");}
function records(c){return Array.isArray(c?.urineScreens)?c.urineScreens:[];}
async function loadHistory(c){
 const merged=new Map(records(c).filter(r=>r?.id).map(r=>[r.id,r]));
 if(!c?.id||!window.db)return sortScreenHistory([...merged.values()]);
 const collection=db.collection('kbrhUrineScreens').doc(c.id).collection('records');
 const snap=await collection.get();
 snap.docs.forEach(doc=>{const r=doc.data();if(r?.id)merged.set(r.id,r);});
 // Each original screening stays immutable; only the latest revision is displayed.
 await Promise.all([...merged.keys()].map(async id=>{
  const base=collection.doc(id);
  const current=await base.collection('metadata').doc('current').get();
  if(!current.exists||!current.data()?.revisionId)return;
  const revision=await base.collection('revisions').doc(current.data().revisionId).get();
  if(!revision.exists||!revision.data()?.updated)throw Error('Screening correction metadata is incomplete for '+id);
  merged.set(id,revision.data().updated);
 }));
 return sortScreenHistory([...merged.values()]);
}
function screenLastChange(record){
 const value=record.correctedAt||record.updatedAt||record.createdAt||record.date||"";
 const date=value?.toDate?.()||new Date(value);
 return Number.isFinite(date.getTime())?date.getTime():0;
}
function sortScreenHistory(items){
 return items.sort((a,b)=>screenLastChange(b)-screenLastChange(a));
}
function historyHtml(items){
 if(!items.length)return '<p>No previous screening records.</p>';
 const ordered=sortScreenHistory([...items]);
 const recordHtml=(r,latest)=>`<div class="us-record ${latest?"us-latest-record":""}">
 ${latest?'<div class="us-latest-label">MOST RECENT SCREENING CHANGE</div>':""}
 <strong>${esc(r.date)} · ${esc(r.type)}</strong>
 <div>${TESTS.map(t=>`${t}: ${esc(r.results?.[t]||"—")}`).join(" · ")}</div>
 ${r.thcRetestDue?`<div>THC retest due: ${esc(r.thcRetestDue)}</div>`:""}
 ${r.correctedAt?`<div><strong>Last corrected:</strong> ${esc(r.correctedAt)} by ${esc(r.correctedBy||"Staff")} · ${esc(r.correctionReason||"")}</div>`:""}
 <div>${esc(r.notes)}</div>
 ${correctionHandler?`<button type="button" class="us-correct" data-correct-id="${esc(r.id)}">Correct this screening</button>`:""}
 </div>`;
 return `<section class="us-latest-section" aria-label="Most recent screening change">
 ${recordHtml(ordered[0],true)}</section>
 <details class="us-older-history"><summary>Earlier screening records (${ordered.length-1})</summary>
 ${ordered.slice(1).map(r=>recordHtml(r,false)).join("")||"<p>No earlier records.</p>"}
 </details>`;
}

function open(c,onSave,mandatory,management={}){
 resident=c;callback=onSave;correctionHandler=typeof management.correctScreen==="function"?management.correctScreen:null;
 let el=document.getElementById("urineScreenOverlay");
 el.innerHTML=`<div class="us-dialog" role="dialog" aria-modal="true"><h2>Urine Drug Screening</h2>
 <p id="us-person"></p><p class="us-hint">${mandatory?"Intake screening is required before admission.":"Previous screens remain in the resident record."}</p>
 <div class="us-management"><h3>Existing screens and protocol status</h3><p class="us-hint">Historical results are retained. To remove a protocol flag, use the separate authorized action below; this does not alter a laboratory result.</p><div id="us-history"></div><div id="us-correction-zone"></div><div id="us-clear-zone"></div></div>
 <details class="us-new-screen" ${mandatory?"open":""}><summary>Record a new urine screen</summary><form id="us-form"><label>Screening date <input type="date" id="us-date" required></label>
 <label>Screening type <select id="us-type"><option>Admission</option><option>Follow-up</option><option>Other</option></select></label>
 <p class="us-hint">Check a substance only when the result is <strong>positive</strong>. Unchecked boxes are recorded as negative. Do not save an untested substance as negative.</p>
 <div class="us-grid">${TESTS.map(t=>`<label class="us-test-check"><input type="checkbox" data-us-test="${t}" aria-label="${t} positive"><span class="us-test-name">${t}</span><small>Positive if checked</small></label>`).join("")}</div>
 <div id="us-eligibility" aria-live="polite"></div>
 <label>Notes (avoid unnecessary medical details)<textarea id="us-notes" rows="2"></textarea></label>
 <label id="us-override-wrap" hidden><input type="checkbox" id="us-override"> Authorized eligibility override</label>
 <label id="us-reason-wrap" hidden>Override reason <textarea id="us-reason" rows="2"></textarea></label>
 <div class="us-actions"><button type="button" id="us-cancel">Close</button><button type="submit">Save Screening${mandatory?" & Continue":""}</button></div></form></details></div>`;
 document.getElementById("us-person").textContent=[c?.firstName,c?.lastName].filter(Boolean).join(" ");
 document.getElementById("us-date").value=new Date().toLocaleDateString("en-CA");
 document.getElementById("us-type").value=mandatory?"Admission":"Follow-up";
 const clearZone=document.getElementById("us-clear-zone");
 if(!mandatory&&typeof management.clearFlag==="function"){
   clearZone.innerHTML=`<div class="us-clear-box"><strong>THC Protocol flag management</strong><p>Remove the current flag without deleting or rewriting screening history.</p><label>Reason for clearing the flag <textarea id="us-clear-reason" rows="2" placeholder="Document the reason for removing the flag"></textarea></label><button type="button" id="us-clear-flag">Remove THC Protocol flag</button><p id="us-clear-feedback" role="status"></p></div>`;
   clearZone.querySelector("#us-clear-flag").onclick=async()=>{
     const reason=clearZone.querySelector("#us-clear-reason").value.trim();
     if(reason.length<8){alert("Enter a reason of at least 8 characters.");return;}
     if(!confirm("Remove this resident's THC Protocol flag? Screening history will remain unchanged."))return;
     const button=clearZone.querySelector("#us-clear-flag");button.disabled=true;
     try{await management.clearFlag(reason);clearZone.querySelector("#us-clear-feedback").textContent="Protocol flag removed and roster updated.";}
     catch(err){console.error("Flag removal failed",err);alert("Flag was not removed: "+(err.message||err));}
     finally{button.disabled=false;}
   };
 }
 const historyNode=document.getElementById("us-history");
 historyNode.textContent="Loading screening history…";
 const showHistory=items=>{
  if(resident!==c)return;
  historyNode.innerHTML=historyHtml(items);
  historyNode.querySelectorAll("[data-correct-id]").forEach(button=>button.onclick=()=>{
    const original=items.find(r=>r.id===button.dataset.correctId);
    if(!original)return;
    const zone=el.querySelector("#us-correction-zone");
    zone.innerHTML=`<form id="us-correction-form" class="us-clear-box"><h4>Correct recorded screening</h4>
      <p>The original results and all earlier corrections are retained for audit.</p>
      <label>Screen date <input type="date" id="us-edit-date" required></label>
      <label>Screening type <input id="us-edit-type" required></label>
      <div class="us-grid">${TESTS.map(t=>`<label> ${t} <select data-us-edit-test="${t}"><option>Negative</option><option>Positive</option><option>Not tested</option></select></label>`).join("")}</div>
      <label>Notes <textarea id="us-edit-notes" rows="3"></textarea></label>
      <label>Reason for correction <textarea id="us-edit-reason" required minlength="8" rows="2"></textarea></label>
      <div class="us-actions"><button type="button" id="us-edit-cancel">Cancel</button><button type="submit">Save correction</button></div>
      <p id="us-edit-feedback" role="status"></p></form>`;
    zone.querySelector("#us-edit-date").value=String(original.date||"").slice(0,10);
    zone.querySelector("#us-edit-type").value=original.type||"Follow-up";
    zone.querySelector("#us-edit-notes").value=original.notes||"";
    zone.querySelectorAll("[data-us-edit-test]").forEach(select=>select.value=original.results?.[select.dataset.usEditTest]||"Not tested");
    zone.querySelector("#us-edit-cancel").onclick=()=>zone.replaceChildren();
    zone.querySelector("#us-correction-form").onsubmit=async event=>{
      event.preventDefault();
      const form=event.currentTarget,submit=form.querySelector('[type="submit"]');
      const reason=form.querySelector("#us-edit-reason").value.trim();
      if(reason.length<8){alert("Provide a correction reason of at least 8 characters.");return;}
      const corrected={...original,date:form.querySelector("#us-edit-date").value,type:form.querySelector("#us-edit-type").value.trim(),
        results:Object.fromEntries([...form.querySelectorAll("[data-us-edit-test]")].map(x=>[x.dataset.usEditTest,x.value])),
        notes:form.querySelector("#us-edit-notes").value.trim()};
      submit.disabled=true;
      try{
        await correctionHandler(original,corrected,reason);
        zone.replaceChildren();
        const refreshed=await loadHistory(c);
        if(resident===c)showHistory(refreshed);
        alert("Correction saved. Original record retained in correction history.");
      }catch(error){console.error("Screen correction failed",error);form.querySelector("#us-edit-feedback").textContent="Correction failed: "+(error.message||error);}
      finally{submit.disabled=false;}
    };
  });
};
loadHistory(c).then(showHistory).catch(error=>{
  console.error("Urine screening history could not be loaded",error);
  historyNode.textContent="Screening history could not be loaded. Please check permissions and try again. Do not assume the record has no history.";
 });
 function update(){
  let results=Object.fromEntries([...el.querySelectorAll("[data-us-test]")].map(i=>[i.dataset.usTest,i.checked?"Positive":"Negative"]));
  let bad=BLOCKED.filter(t=>results[t]==="Positive");
  el.querySelector("#us-override-wrap").hidden=!bad.length;
  el.querySelector("#us-reason-wrap").hidden=!bad.length||!el.querySelector("#us-override").checked;
  el.querySelector("#us-eligibility").textContent=bad.length?`RESIDENT NOT ELIGIBLE: ${bad.join(", ")} positive. Authorized override required.`:"Eligible based on recorded screening results."+(results.THC==="Positive"?` THC retest due ${due(el.querySelector("#us-date").value)}.`:"");
 }
 el.querySelectorAll("select,input").forEach(i=>i.addEventListener("change",update));
 el.querySelector("#us-cancel").onclick=()=>{el.hidden=true;};
 el.querySelector("#us-form").onsubmit=async e=>{
  e.preventDefault();
  if(el.dataset.saving==="1")return;
  let results=Object.fromEntries([...el.querySelectorAll("[data-us-test]")].map(i=>[i.dataset.usTest,i.checked?"Positive":"Negative"]));
  let bad=BLOCKED.filter(t=>results[t]==="Positive"), override=el.querySelector("#us-override").checked;
  let reason=el.querySelector("#us-reason").value.trim();
  if(bad.length&&!override){alert("Resident Not Eligible. An authorized override is required.");return;}
  if(bad.length&&(!reason||reason.length<5)){alert("Enter an override reason.");return;}
  let author=typeof currentStaffName==="function"?currentStaffName():(window.auth?.currentUser?.email||"Staff");
  let record={id:crypto.randomUUID(),date:el.querySelector("#us-date").value,type:el.querySelector("#us-type").value,results,notes:el.querySelector("#us-notes").value.trim(),override:!!bad.length&&override,overrideReason:bad.length?reason:"",author,createdAt:new Date().toISOString(),thcRetestDue:results.THC==="Positive"?due(el.querySelector("#us-date").value):null};
  const button=el.querySelector('[type="submit"]');button.disabled=true;el.dataset.saving='1';
  try{await callback(record);el.hidden=true;}catch(err){const incidentId="US-"+Date.now().toString(36).toUpperCase();console.error("KBRH urine screening save failed",incidentId,err);const code=String(err?.code||"unknown");const detail=String(err?.message||"No further details available").slice(0,350);alert("Screening was not confirmed saved. Do not close this form.\nReference: "+incidentId+"\nError: "+code+"\nDetails: "+detail+"\nPlease report this message to the administrator.");}finally{button.disabled=false;el.dataset.saving="0";}
 };
 update();el.hidden=false;
}
window.KBRHUrine={open,records,loadHistory,TESTS};
document.addEventListener("DOMContentLoaded",()=>{
 let overlay=document.createElement("div");overlay.id="urineScreenOverlay";overlay.hidden=true;document.body.append(overlay);
 let style=document.createElement("style");style.textContent=`#urineScreenOverlay:not([hidden]){position:fixed;inset:0;background:#000a;z-index:2147483647;display:flex;align-items:center;justify-content:center;padding:14px}.us-dialog{background:white;color:#222;max-height:92vh;overflow:auto;width:min(800px,100%);padding:24px;border-radius:12px;box-shadow:0 10px 50px #0007}.us-dialog label{display:block;margin:10px 0}.us-dialog input,.us-dialog select,.us-dialog textarea{display:block;width:100%;padding:8px;box-sizing:border-box}.us-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(175px,1fr));gap:9px}.us-dialog .us-test-check{display:flex!important;align-items:center!important;flex-direction:row!important;gap:9px;padding:12px;border:1px solid #ddd;border-radius:8px;margin:0;cursor:pointer}.us-dialog .us-test-check input[type="checkbox"]{appearance:auto!important;-webkit-appearance:checkbox!important;display:inline-block!important;position:static!important;opacity:1!important;visibility:visible!important;width:20px!important;min-width:20px!important;max-width:20px!important;height:20px!important;min-height:20px!important;flex:0 0 20px!important;margin:0!important;padding:0!important;accent-color:#b45309;transform:none!important}.us-dialog .us-test-check .us-test-name{font-weight:700;min-width:0}.us-dialog .us-test-check small{font-size:11px;white-space:normal;text-align:right}.us-test-check small{margin-left:auto;color:#666}.us-test-check:has(input:checked){border-color:#b45309;background:#fff7ed}.us-actions{display:flex;justify-content:flex-end;gap:12px;margin-top:15px}.us-record{border-bottom:1px solid #ddd;padding:9px}.us-hint{color:#666}.us-management{padding:15px;border:1px solid #d8e2ec;border-radius:10px;margin:12px 0}.us-new-screen{margin-top:15px;border:1px solid #d8e2ec;border-radius:10px;padding:12px}.us-new-screen>summary{cursor:pointer;font-weight:700}.us-clear-box{background:#fff8ee;border:1px solid #e7c69e;border-radius:9px;padding:14px;margin-top:12px}.us-clear-box button{background:#9a3412;color:white;border:0;border-radius:6px;padding:10px 14px;cursor:pointer}#us-eligibility{font-weight:bold;padding:10px;background:#f3f3f3}`;
 document.head.append(style);
});
})();
