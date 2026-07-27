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
    intro: "We require that potential residents have been clean/sober for a minimum of 5 days.",
    items: [
      ["lastUse", "When was the last time you used?", "date"],
      ["substance", "What was the substance?"],
      ["cleanRequirement", "Five-day clean/sober requirement reviewed", "check"],
      ["detox", "If under five days, contact Detox for bed availability", "check"]
    ], daysClean: true
  },
  {
    id: "testing", title: "Arrival Testing and Disclosure",
    items: [
      ["arrivalScreen", "Upon arrival, we will administer a urine screen and breathalyzer."],
      ["undisclosedPositive", "A positive result for a substance not listed in the application or disclosed during this call will prevent entry to the program."],
      ["baseline", "If a listed substance may still produce a positive result, a baseline will be established and monitored with more frequent testing until it is out of the applicant’s system."],
      ["timeline", "The monitoring timeline is substance-specific."],
      ["detoxSuspension", "If the substance takes longer than expected to clear, treatment will be suspended while the applicant attends Detox; return is possible once a negative result is produced."],
      ["finalDisclosure", "A positive result for an unlisted or undisclosed substance means the applicant will not be permitted to access the program."]
    ]
  },
  {
    id: "health", title: "Application Highlights — Health Screen",
    items: [
      ["physicalHealth", "Are there any physical health problems that will prevent you from participating in the program?"],
      ["lifeSkills", "Life Skills participation explained", "check"]
    ]
  },
  {
    id: "legal", title: "Application Highlights — Legal Status",
    items: [
      ["legalStatus", "Confirm current legal status, including anything not listed on the application"],
      ["legalVerified", "Legal status verified with applicant", "check"]
    ]
  },
  {
    id: "medication", title: "Application Highlights — Medication and Allergies",
    items: [
      ["currentMedication", "Are you currently taking any medication?"],
      ["pharmacy", "Which pharmacy are you with? Include details needed for medication transfer."],
      ["medTransfer", "Medication transfer details confirmed", "check"],
      ["allergies", "Do you have any allergies?"]
    ]
  },
  {
    id: "treatment", title: "Application Highlights — Treatment History and Program Expectations",
    items: [
      ["history", "Review treatment history. If no prior treatment experience, explain the 12-step-based recovery model."],
      ["allAspects", "Expected to take part in all aspects of the program", "check"],
      ["sponsor", "Expected to find a sponsor", "check"],
      ["stepWork", "Expected to complete step work", "check"],
      ["meetings", "Expected to attend a minimum of four closed AA/NA meetings per week", "check"]
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
  return {id:crypto.randomUUID(), applicantId:a.id, applicantName:applicantName(a), status:"In Progress", staffUser:auth.currentUser?.email||"", startedAt:new Date().toISOString(), completedAt:"", updatedAt:new Date().toISOString(), answers:{}, outcome:"", overallNotes:""};
}
function answer(record, sectionId, itemId){ return record.answers?.[sectionId]?.[itemId] || {}; }
function renderField(section,item,record){
  const [id,label,type="text"] = item; const val=answer(record,section.id,id);
  const checked=Boolean(val.reviewed); const notes=val.notes||"";
  const control=type==="date"?`<input type="date" data-section="${section.id}" data-item="${id}" data-field="value" value="${attr(val.value||"")}">`:
    type==="check"?`<label class="prescreen-check"><input type="checkbox" data-section="${section.id}" data-item="${id}" data-field="reviewed" ${checked?"checked":""}><span>Confirmed / reviewed</span></label>`:
    section.script?`<label class="prescreen-check"><input type="checkbox" data-section="${section.id}" data-item="${id}" data-field="reviewed" ${checked?"checked":""}><span>Read / confirmed</span></label>`:"";
  return `<div class="prescreen-question"><div class="prescreen-question-text">${esc(label)}</div>${control}<label>Notes<textarea data-section="${section.id}" data-item="${id}" data-field="notes" rows="2">${esc(notes)}</textarea></label></div>`;
}
function calculateDays(dateString){ if(!dateString)return null; const d=new Date(dateString+'T00:00:00'); const today=new Date(); today.setHours(0,0,0,0); return Math.max(0,Math.floor((today-d)/86400000)); }
function renderForm(record){
  const a=getApplicants().find(x=>x.id===currentApplicantId); if(!a)return;
  $("prescreenApplicantName").textContent=`${applicantName(a)} · ${a.contact||"No phone listed"}`;
  $("prescreenProgress").innerHTML=sections.map(s=>`<a href="#section-${s.id}">${esc(s.title.replace("Application Highlights — ",""))}</a>`).join("");
  let html=sections.map(section=>{
    let extra="";
    if(section.daysClean){ const last=answer(record,"sobriety","lastUse").value; const days=calculateDays(last); extra=days===null?`<div class="eligibility-box neutral">Enter the last-use date to calculate days clean.</div>`:days>=5?`<div class="eligibility-box eligible"><strong>${days} day${days===1?"":"s"} clean</strong><span>Meets the five-day requirement.</span></div>`:`<div class="eligibility-box ineligible"><strong>${days} day${days===1?"":"s"} clean</strong><span>Does not meet the five-day requirement. Contact Detox for bed availability.</span></div>`; }
    return `<section class="prescreen-section" id="section-${section.id}"><h3>${esc(section.title)}</h3>${section.intro?`<p class="prescreen-script-block">${esc(section.intro)}</p>`:""}${extra}${section.items.map(item=>renderField(section,item,record)).join("")}</section>`;
  }).join("");
  html+=`<section class="prescreen-section" id="section-outcome"><h3>Outcome</h3><div class="outcome-grid">${["Approved","Needs Detox First","Hold","Applicant Declined","Further Review Required"].map(o=>`<label><input type="radio" name="outcome" value="${attr(o)}" ${record.outcome===o?"checked":""}> ${esc(o)}</label>`).join("")}</div><label>Overall Notes<textarea id="overallNotes" rows="5">${esc(record.overallNotes||"")}</textarea></label></section>`;
  $("prescreenForm").innerHTML=html;
  $("prescreenForm").querySelectorAll("input,textarea").forEach(el=>el.addEventListener("change",()=>{ if(el.dataset.section==="sobriety"&&el.dataset.item==="lastUse") collectForm(record); renderForm(record); }));
}

function collectForm(record){
  record.answers=record.answers||{};
  $("prescreenForm").querySelectorAll("[data-section][data-item][data-field]").forEach(el=>{
    const {section,item,field}=el.dataset; record.answers[section]=record.answers[section]||{}; record.answers[section][item]=record.answers[section][item]||{};
    record.answers[section][item][field]=el.type==="checkbox"?el.checked:el.value;
  });
  record.outcome=$("prescreenForm").querySelector('input[name="outcome"]:checked')?.value||"";
  record.overallNotes=$("overallNotes")?.value||"";
  record.updatedAt=new Date().toISOString(); record.staffUser=auth.currentUser?.email||record.staffUser||"";
}
async function saveRecord(complete=false){
  const a=getApplicants().find(x=>x.id===currentApplicantId); if(!a)return;
  let r=getRecord(a.id); if(!r){r=emptyRecord(a); prescreenState.preScreenings.push(r);}
  collectForm(r);
  if(complete){
    if(!r.outcome){alert("Select an outcome before completing the pre-screening.");return;}
    r.status="Completed"; r.completedAt=new Date().toISOString();
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
