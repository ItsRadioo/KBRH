let prescreenState = null;
let currentApplicantId = null;

const $ = id => document.getElementById(id);
const esc = value => String(value ?? "").replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[ch]));
const attr = value => esc(value);

const sections = [
  {
    id: "opening", title: "Opening Script", script: true,
    items: [
      ["identity", "Am I speaking with [applicant name]?"],
      ["introduction", "This is [staff name] calling from the KBRH."],
      ["availability", "The reason I’m calling is because we have an availability in our program, and you are the next person on our waitlist."],
      ["interest", "Are you still interested in attending our program?"],
      ["permission", "Do you have a few minutes to go over your application and answer some questions?"]
    ]
  },
  {
    id: "sobriety", title: "Sobriety Screening",
    intro: "We normally require potential residents to have been clean/sober for at least five days before admission. The staff decision below may account for the bed-filling timeline, a Detox plan, or an authorized override.",
    items: [
      ["lastUse", "When was the last time you used?", "date"],
      ["substance", "What was the substance?", "text"]
    ], sobriety: true
  },
  {
    id: "testing", title: "Arrival Testing and Disclosure",
    items: [
      ["arrivalScreen", "Upon arrival, we will administer a urine screen and breathalyzer."],
      ["undisclosedPositive", "A positive result for a substance not listed in the application or disclosed during this call may prevent entry to the program."],
      ["baseline", "If a listed substance may still produce a positive result, a baseline may be established and monitored with more frequent testing until it is out of the applicant’s system."],
      ["timeline", "The monitoring timeline is substance-specific."],
      ["detoxSuspension", "If the substance takes longer than expected to clear, treatment may be suspended while the applicant attends Detox; return is possible once a negative result is produced."],
      ["finalDisclosure", "A positive result for an unlisted or undisclosed substance means the applicant will not be permitted to access the program."]
    ]
  },
  {
    id: "health", title: "Application Highlights — Health Screen",
    items: [
      ["physicalHealth", "Are there any physical health problems that will prevent you from participating in the program?"],
      ["lifeSkills", "Life Skills participation explained"]
    ]
  },
  {
    id: "legal", title: "Application Highlights — Legal Status",
    items: [
      ["legalStatus", "Confirm current legal status, including anything not listed on the application"],
      ["legalVerified", "Legal status verified with applicant"]
    ]
  },
  {
    id: "medication", title: "Application Highlights — Medication and Allergies",
    items: [
      ["currentMedication", "Are you currently taking any medication?"],
      ["pharmacy", "Which pharmacy are you with? Include details needed for medication transfer."],
      ["medTransfer", "Medication transfer details confirmed"],
      ["allergies", "Do you have any allergies?"]
    ]
  },
  {
    id: "treatment", title: "Application Highlights — Treatment History and Program Expectations",
    items: [
      ["history", "Review treatment history. If no prior treatment experience, explain the 12-step-based recovery model."],
      ["allAspects", "Expected to take part in all aspects of the program"],
      ["sponsor", "Expected to find a sponsor"],
      ["stepWork", "Expected to complete step work"],
      ["meetings", "Expected to attend a minimum of four closed AA/NA meetings per week"]
    ]
  },
  {
    id: "goals", title: "Long-Term Goals / Discharge Plan",
    items: [
      ["housing", "Housing"],
      ["employment", "Employment"],
      ["counselling", "Outside counselling"]
    ]
  }
];

function getApplicants(){
  return (prescreenState?.waitlist || []).filter(a => !a.archived && a.status === "Offer Given");
}
function getRecord(applicantId){
  return (prescreenState?.preScreenings || []).find(r => r.applicantId === applicantId);
}
function formatDateTime(value){ if(!value) return "—"; const d=new Date(value); return isNaN(d)?"—":d.toLocaleString("en-CA",{dateStyle:"medium",timeStyle:"short"}); }
function applicantName(a){ return `${a.firstName||""} ${a.lastName||""}`.trim() || "Unnamed Applicant"; }

function renderList(){
  const applicants=getApplicants();
  const completed=applicants.filter(a=>getRecord(a.id)?.status==="Completed").length;
  $("prescreenSummary").innerHTML=`<strong>${completed}</strong> completed of <strong>${applicants.length}</strong> offer${applicants.length===1?"":"s"}`;
  $("prescreenApplicantBody").innerHTML=applicants.length?applicants.map(a=>{
    const r=getRecord(a.id); const status=r?.status||"Not Started";
    const cls=status==="Completed"?"status-completed":status==="In Progress"?"status-progress":"status-not-started";
    return `<tr><td><strong>${esc(applicantName(a))}</strong></td><td>${esc(a.contact||"—")}</td><td>${esc(a.dateApplied||"—")}</td><td><span class="prescreen-status ${cls}">${esc(status)}</span></td><td>${esc(formatDateTime(r?.updatedAt||r?.completedAt||r?.startedAt))}</td><td><button type="button" onclick="openPrescreen('${a.id}')">${status==="Not Started"?"Start":status==="Completed"?"View / Edit":"Continue"}</button></td></tr>`;
  }).join(""):`<tr><td colspan="6" class="empty">No active waitlist applicants are currently marked Offer Given.</td></tr>`;
}

function emptyRecord(a){
  return {
    id:crypto.randomUUID(), applicantId:a.id, applicantName:applicantName(a), status:"In Progress",
    staffUser:auth.currentUser?.email||"", startedAt:new Date().toISOString(), completedAt:"", updatedAt:new Date().toISOString(),
    answers:{}, bedTiming:"", expectedBedDate:"", sobrietyDecision:"", detoxPlan:"", overrideReason:"", outcome:"", overallNotes:""
  };
}
function answer(record, sectionId, itemId){ return record.answers?.[sectionId]?.[itemId] || {}; }
function responseOptions(sectionId,itemId,current){
  const name=`response-${sectionId}-${itemId}`;
  return `<div class="question-response" role="radiogroup" aria-label="Question status">
    ${[["completed","Asked / Reviewed"],["skipped","Skipped"],["na","Not Applicable"]].map(([value,label])=>`
      <label class="response-choice ${current===value?"selected":""}">
        <input type="radio" name="${name}" data-section="${sectionId}" data-item="${itemId}" data-field="response" value="${value}" ${current===value?"checked":""}>
        <span>${label}</span>
      </label>`).join("")}
  </div>`;
}
function renderField(section,item,record){
  const [id,label,type="text"] = item; const val=answer(record,section.id,id);
  const response=val.response||""; const notes=val.notes||"";
  const valueControl=type==="date"
    ? `<label class="answer-label">Answer<input type="date" data-section="${section.id}" data-item="${id}" data-field="value" value="${attr(val.value||"")}"></label>`
    : (section.id==="sobriety" && id==="substance")
      ? `<label class="answer-label">Answer<input type="text" data-section="${section.id}" data-item="${id}" data-field="value" value="${attr(val.value||"")}" placeholder="Substance disclosed"></label>`
      : "";
  return `<div class="prescreen-question">
    <div class="prescreen-question-text">${esc(label)}</div>
    ${responseOptions(section.id,id,response)}
    ${valueControl}
    <label class="answer-label">Notes <span class="optional-label">optional</span><textarea data-section="${section.id}" data-item="${id}" data-field="notes" rows="2">${esc(notes)}</textarea></label>
  </div>`;
}
function calculateDays(dateString){ if(!dateString)return null; const d=new Date(dateString+'T00:00:00'); const today=new Date(); today.setHours(0,0,0,0); return Math.max(0,Math.floor((today-d)/86400000)); }
function renderSobrietyDecision(record){
  const last=answer(record,"sobriety","lastUse").value; const days=calculateDays(last);
  const box=days===null
    ? `<div class="eligibility-box neutral">Enter the last-use date to calculate days clean.</div>`
    : days>=5
      ? `<div class="eligibility-box eligible"><strong>${days} day${days===1?"":"s"} clean</strong><span>Meets the normal five-day requirement.</span></div>`
      : `<div class="eligibility-box ineligible"><strong>${days} day${days===1?"":"s"} clean</strong><span>Does not currently meet the normal five-day requirement. Choose the operational decision below.</span></div>`;
  return `${box}
  <div class="decision-panel">
    <h4>Bed-Filling Timeline</h4>
    <div class="outcome-grid compact-options">
      ${[["immediate","Immediate / urgent vacancy"],["planned","Planned vacancy — time for Detox"],["flexible","Flexible / not yet confirmed"]].map(([v,l])=>`<label><input type="radio" name="bedTiming" value="${v}" ${record.bedTiming===v?"checked":""}> ${l}</label>`).join("")}
    </div>
    <label>Expected Bed Date <span class="optional-label">optional</span><input type="date" id="expectedBedDate" value="${attr(record.expectedBedDate||"")}"></label>
    <h4>Staff Decision</h4>
    <div class="outcome-grid decision-options">
      ${[
        ["meets","Meets five-day requirement — proceed"],
        ["detox","Arrange Detox and hold the offer"],
        ["return","Return applicant to waitlist and contact next eligible person"],
        ["override","Authorized override — proceed despite normal criteria"],
        ["pending","Decision pending / further review"]
      ].map(([v,l])=>`<label><input type="radio" name="sobrietyDecision" value="${v}" ${record.sobrietyDecision===v?"checked":""}> ${l}</label>`).join("")}
    </div>
    <label>Detox Plan / Arrangements <span class="optional-label">complete when applicable</span><textarea id="detoxPlan" rows="3">${esc(record.detoxPlan||"")}</textarea></label>
    <label>Override Reason / Authorization <span class="optional-label">required only when override is selected</span><textarea id="overrideReason" rows="3">${esc(record.overrideReason||"")}</textarea></label>
  </div>`;
}
function renderForm(record){
  const a=getApplicants().find(x=>x.id===currentApplicantId); if(!a)return;
  $("prescreenApplicantName").textContent=`${applicantName(a)} · ${a.contact||"No phone listed"}`;
  $("prescreenProgress").innerHTML=sections.map(s=>`<a href="#section-${s.id}">${esc(s.title.replace("Application Highlights — ",""))}</a>`).join("")+`<a href="#section-outcome">Outcome</a>`;
  let html=sections.map(section=>{
    return `<section class="prescreen-section" id="section-${section.id}">
      <h3>${esc(section.title)}</h3>
      ${section.intro?`<p class="prescreen-script-block">${esc(section.intro)}</p>`:""}
      ${section.sobriety?renderSobrietyDecision(record):""}
      ${section.items.map(item=>renderField(section,item,record)).join("")}
    </section>`;
  }).join("");
  html+=`<section class="prescreen-section" id="section-outcome"><h3>Call Outcome</h3>
    <p class="hint">Choose the result that best describes what happens after this call. Questions may be skipped or marked not applicable without preventing completion.</p>
    <div class="outcome-grid">
      ${[
        ["Approved","Approved / ready for admission"],
        ["Detox Plan","Detox arranged — offer remains active"],
        ["Returned to Waitlist","Returned to waitlist — contact next eligible applicant"],
        ["Applicant Declined","Applicant declined"],
        ["Hold","Hold / decision pending"],
        ["Further Review Required","Further review required"]
      ].map(([v,l])=>`<label><input type="radio" name="outcome" value="${attr(v)}" ${record.outcome===v?"checked":""}> ${esc(l)}</label>`).join("")}
    </div>
    <label>Overall Notes <span class="optional-label">optional</span><textarea id="overallNotes" rows="5">${esc(record.overallNotes||"")}</textarea></label>
  </section>`;
  $("prescreenForm").innerHTML=html;

  $("prescreenForm").addEventListener("input", e=>{
    if(e.target.matches('input[type="radio"][data-field="response"]')){
      e.target.closest('.question-response').querySelectorAll('.response-choice').forEach(label=>label.classList.toggle('selected',label.contains(e.target)));
    }
  });
  $("prescreenForm").querySelector('[data-section="sobriety"][data-item="lastUse"][data-field="value"]')?.addEventListener("change",()=>{
    collectForm(record); renderForm(record);
  });
}

function collectForm(record){
  record.answers=record.answers||{};
  $("prescreenForm").querySelectorAll("[data-section][data-item][data-field]").forEach(el=>{
    const {section,item,field}=el.dataset; record.answers[section]=record.answers[section]||{}; record.answers[section][item]=record.answers[section][item]||{};
    if(el.type==="radio") { if(el.checked) record.answers[section][item][field]=el.value; }
    else record.answers[section][item][field]=el.value;
  });
  record.bedTiming=$("prescreenForm").querySelector('input[name="bedTiming"]:checked')?.value||"";
  record.expectedBedDate=$("expectedBedDate")?.value||"";
  record.sobrietyDecision=$("prescreenForm").querySelector('input[name="sobrietyDecision"]:checked')?.value||"";
  record.detoxPlan=$("detoxPlan")?.value||"";
  record.overrideReason=$("overrideReason")?.value||"";
  record.outcome=$("prescreenForm").querySelector('input[name="outcome"]:checked')?.value||"";
  record.overallNotes=$("overallNotes")?.value||"";
  record.updatedAt=new Date().toISOString(); record.staffUser=auth.currentUser?.email||record.staffUser||"";
}
function addWaitlistNote(applicant,text){
  applicant.notes=Array.isArray(applicant.notes)?applicant.notes:[];
  applicant.notes.unshift({id:crypto.randomUUID(),author:auth.currentUser?.email||"Unknown",text,createdAt:new Date().toISOString()});
}
async function saveRecord(complete=false){
  const a=getApplicants().find(x=>x.id===currentApplicantId); if(!a)return;
  let r=getRecord(a.id); if(!r){r=emptyRecord(a); prescreenState.preScreenings.push(r);}
  collectForm(r);
  if(complete){
    if(!r.outcome){alert("Select a call outcome before completing the pre-screening.");return;}
    if(r.sobrietyDecision==="override" && !r.overrideReason.trim()){
      alert("Enter the override reason or authorization before completing this pre-screening.");
      $("overrideReason")?.focus(); return;
    }
    r.status="Completed"; r.completedAt=new Date().toISOString();
    if(r.outcome==="Returned to Waitlist"){
      a.status="N/A";
      addWaitlistNote(a,`Pre-screening completed: returned to waitlist. ${r.overallNotes||r.detoxPlan||"Applicant did not meet the current admission timeline."}`);
    } else if(r.outcome==="Applicant Declined"){
      a.status="N/A";
      addWaitlistNote(a,`Pre-screening completed: applicant declined. ${r.overallNotes||""}`.trim());
    } else if(r.outcome==="Detox Plan"){
      addWaitlistNote(a,`Pre-screening completed: Detox plan arranged; offer remains active. ${r.detoxPlan||r.overallNotes||""}`.trim());
    }
  } else if(r.status!=="Completed") r.status="In Progress";
  await saveAppState(prescreenState); renderList();
  alert(complete?"Pre-screening completed.":"Draft saved.");
  if(complete) closePrescreen();
}
function openPrescreen(id){
  currentApplicantId=id; const a=getApplicants().find(x=>x.id===id); if(!a)return;
  let r=getRecord(id); if(!r){r=emptyRecord(a); prescreenState.preScreenings.push(r);}
  renderForm(r); $("prescreenModal").classList.remove("hidden"); document.body.classList.add("kbrh-modal-open");
}
function closePrescreen(){ $("prescreenModal").classList.add("hidden"); document.body.classList.remove("kbrh-modal-open"); currentApplicantId=null; }

document.addEventListener("DOMContentLoaded",()=>{
  $("closePrescreenX").onclick=$("cancelPrescreenBtn").onclick=closePrescreen;
  $("saveDraftBtn").onclick=()=>saveRecord(false); $("completePrescreenBtn").onclick=()=>saveRecord(true);
  $("prescreenModal").addEventListener("click",e=>{if(e.target===$("prescreenModal"))closePrescreen();});
});
auth.onAuthStateChanged(user=>{if(!user)return;listenToAppState(state=>{prescreenState=state;prescreenState.preScreenings=Array.isArray(prescreenState.preScreenings)?prescreenState.preScreenings:[];renderList();});});
