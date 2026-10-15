
(function(){
const TESTS=["COC","MET","THC","AMP","MOR","OXY","FYL","BUP","BZD","EDDP"];
const BLOCKED=TESTS.filter(x=>!["THC","EDDP"].includes(x));
let callback=null, resident=null;
function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function due(date){let d=new Date(date+"T12:00:00");d.setDate(d.getDate()+45);return d.toISOString().slice(0,10);}
function records(c){return Array.isArray(c?.urineScreens)?c.urineScreens:[];}
function open(c,onSave,mandatory){
 resident=c;callback=onSave;
 let el=document.getElementById("urineScreenOverlay");
 el.innerHTML=`<div class="us-dialog" role="dialog" aria-modal="true"><h2>Urine Drug Screening</h2>
 <p id="us-person"></p><p class="us-hint">${mandatory?"Intake screening is required before admission.":"Previous screens remain in the resident record."}</p>
 <div id="us-history"></div>
 <form id="us-form"><label>Screening date <input type="date" id="us-date" required></label>
 <label>Screening type <select id="us-type"><option>Admission</option><option>Follow-up</option><option>Other</option></select></label>
 <div class="us-grid">${TESTS.map(t=>`<label>${t}<select data-us-test="${t}" required><option value="">Select result</option><option>Negative</option><option>Positive</option><option>Invalid</option><option>Not Tested</option></select></label>`).join("")}</div>
 <div id="us-eligibility" aria-live="polite"></div>
 <label>Notes (avoid unnecessary medical details)<textarea id="us-notes" rows="2"></textarea></label>
 <label id="us-override-wrap" hidden><input type="checkbox" id="us-override"> Authorized eligibility override</label>
 <label id="us-reason-wrap" hidden>Override reason <textarea id="us-reason" rows="2"></textarea></label>
 <div class="us-actions"><button type="button" id="us-cancel">Close</button><button type="submit">Save Screening${mandatory?" & Continue":""}</button></div></form></div>`;
 document.getElementById("us-person").textContent=[c?.firstName,c?.lastName].filter(Boolean).join(" ");
 document.getElementById("us-date").value=new Date().toLocaleDateString("en-CA");
 document.getElementById("us-type").value=mandatory?"Admission":"Follow-up";
 document.getElementById("us-history").innerHTML=records(c).length?`<details><summary>Previous screening records (${records(c).length})</summary>${records(c).slice().reverse().map(r=>`<div class="us-record"><strong>${esc(r.date)} · ${esc(r.type)}</strong><div>${TESTS.map(t=>`${t}: ${esc(r.results?.[t]||"—")}`).join(" · ")}</div>${r.thcRetestDue?`<div>THC retest due: ${esc(r.thcRetestDue)}</div>`:""}${r.override?`<div>Override by ${esc(r.author)}: ${esc(r.overrideReason)}</div>`:""}<div>${esc(r.notes)}</div></div>`).join("")}</details>`:"";
 function update(){
  let results=Object.fromEntries([...el.querySelectorAll("[data-us-test]")].map(i=>[i.dataset.usTest,i.value]));
  let bad=BLOCKED.filter(t=>results[t]==="Positive"), incomplete=TESTS.some(t=>!["Positive","Negative"].includes(results[t]));
  el.querySelector("#us-override-wrap").hidden=!bad.length;
  el.querySelector("#us-reason-wrap").hidden=!bad.length||!el.querySelector("#us-override").checked;
  el.querySelector("#us-eligibility").textContent=bad.length?`RESIDENT NOT ELIGIBLE: ${bad.join(", ")} positive. Authorized override required.`:incomplete?"All ten results must be valid before admission.":"Eligible based on recorded screening results."+(results.THC==="Positive"?` THC retest due ${due(el.querySelector("#us-date").value)}.`:"");
 }
 el.querySelectorAll("select,input").forEach(i=>i.addEventListener("change",update));
 el.querySelector("#us-cancel").onclick=()=>{el.hidden=true;};
 el.querySelector("#us-form").onsubmit=async e=>{
  e.preventDefault();
  let results=Object.fromEntries([...el.querySelectorAll("[data-us-test]")].map(i=>[i.dataset.usTest,i.value]));
  if(TESTS.some(t=>!["Positive","Negative"].includes(results[t]))){alert("Complete all ten screening results with Positive or Negative.");return;}
  let bad=BLOCKED.filter(t=>results[t]==="Positive"), override=el.querySelector("#us-override").checked;
  let reason=el.querySelector("#us-reason").value.trim();
  if(bad.length&&!override){alert("Resident Not Eligible. An authorized override is required.");return;}
  if(bad.length&&(!reason||reason.length<5)){alert("Enter an override reason.");return;}
  let author=typeof currentStaffName==="function"?currentStaffName():(window.auth?.currentUser?.email||"Staff");
  let record={id:crypto.randomUUID(),date:el.querySelector("#us-date").value,type:el.querySelector("#us-type").value,results,notes:el.querySelector("#us-notes").value.trim(),override:!!bad.length&&override,overrideReason:bad.length?reason:"",author,createdAt:new Date().toISOString(),thcRetestDue:results.THC==="Positive"?due(el.querySelector("#us-date").value):null};
  const button=el.querySelector('[type="submit"]');button.disabled=true;
  try{await callback(record);el.hidden=true;}catch(err){console.error(err);alert("Screening or admission could not be saved. Please retry.");}finally{button.disabled=false;}
 };
 update();el.hidden=false;
}
window.KBRHUrine={open,records,TESTS};
document.addEventListener("DOMContentLoaded",()=>{
 let overlay=document.createElement("div");overlay.id="urineScreenOverlay";overlay.hidden=true;document.body.append(overlay);
 let style=document.createElement("style");style.textContent=`#urineScreenOverlay:not([hidden]){position:fixed;inset:0;background:#000a;z-index:2147483647;display:flex;align-items:center;justify-content:center;padding:14px}.us-dialog{background:white;color:#222;max-height:92vh;overflow:auto;width:min(800px,100%);padding:24px;border-radius:12px;box-shadow:0 10px 50px #0007}.us-dialog label{display:block;margin:10px 0}.us-dialog input,.us-dialog select,.us-dialog textarea{display:block;width:100%;padding:8px;box-sizing:border-box}.us-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px}.us-actions{display:flex;justify-content:flex-end;gap:12px;margin-top:15px}.us-record{border-bottom:1px solid #ddd;padding:9px}.us-hint{color:#666}#us-eligibility{font-weight:bold;padding:10px;background:#f3f3f3}`;
 document.head.append(style);
});
})();
