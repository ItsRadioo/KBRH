let prescreenState = null;
let currentApplicantId = null;
let currentRecord = null;
let currentStep = "opening";
let pendingPrescreenMoveApplicantId = null;

const $ = id => document.getElementById(id);
const esc = value => String(value ?? "").replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[ch]));
const attr = value => esc(value);

function getApplicants(){
  return (prescreenState?.waitlist || []).filter(a => !a.archived && a.status === "Offer Given");
}
function getRecord(applicantId){
  return (prescreenState?.preScreenings || []).find(r => r.applicantId === applicantId);
}
function applicantName(a){ return `${a.firstName||""} ${a.lastName||""}`.trim() || "Unnamed Applicant"; }
function staffDisplayName(){ return typeof currentStaffName === "function" ? currentStaffName() : (auth.currentUser?.displayName || auth.currentUser?.email || "Staff Member");
}
function formatDateTime(value){ if(!value) return "—"; const d=new Date(value); return isNaN(d)?"—":d.toLocaleString("en-CA",{dateStyle:"medium",timeStyle:"short"}); }
function calculateDays(dateString){ if(!dateString)return null; const d=new Date(dateString+'T00:00:00'); const today=new Date(); today.setHours(0,0,0,0); return Math.max(0,Math.floor((today-d)/86400000)); }
function addCalendarDays(dateString,days){ if(!dateString)return ""; const parts=String(dateString).split("-").map(Number); if(parts.length!==3||parts.some(Number.isNaN))return ""; const d=new Date(Date.UTC(parts[0],parts[1]-1,parts[2])); d.setUTCDate(d.getUTCDate()+days); return d.toISOString().slice(0,10); }
function addWaitlistNote(applicant,text){
  applicant.notes=Array.isArray(applicant.notes)?applicant.notes:[];
  applicant.notes.unshift({id:crypto.randomUUID(),author:typeof currentStaffName==="function"?currentStaffName():(auth.currentUser?.email||"Unknown"),text,createdAt:new Date().toISOString()});
}

function renderList(){
  const applicants=getApplicants();
  const completed=applicants.filter(a=>getRecord(a.id)?.status==="Completed").length;
  $("prescreenSummary").innerHTML=`<strong>${completed}</strong> completed of <strong>${applicants.length}</strong> offer${applicants.length===1?"":"s"}`;
  $("prescreenApplicantBody").innerHTML=applicants.length?applicants.map(a=>{
    const r=getRecord(a.id); const status=r?.status||"Not Started";
    const cls=status==="Completed"?"status-completed":status==="In Progress"?"status-progress":"status-not-started";
    return `<tr><td><strong>${esc(applicantName(a))}</strong></td><td>${esc(a.contact||a.phone||"—")}</td><td>${esc(a.dateApplied||"—")}</td><td><span class="prescreen-status ${cls}">${esc(status)}</span>${r?.workflowStatus?`<div class="hint">${esc(r.workflowStatus)}</div>`:""}</td><td>${esc(formatDateTime(r?.updatedAt||r?.completedAt||r?.startedAt))}</td><td><button type="button" onclick="openPrescreen('${a.id}')">${status==="Not Started"?"Start":status==="Completed"?"View / Edit":"Continue"}</button></td></tr>`;
  }).join(""):`<tr><td colspan="6" class="empty">No active waitlist applicants are currently marked Offer Given.</td></tr>`;
}

function emptyRecord(a){
  return {
    id:crypto.randomUUID(), applicantId:a.id, applicantName:applicantName(a), status:"In Progress",
    workflowStatus:"Opening Script", staffUser:staffDisplayName(), staffEmail:auth.currentUser?.email||"", staffUid:auth.currentUser?.uid||"", startedAt:new Date().toISOString(), completedAt:"", updatedAt:new Date().toISOString(),
    step:"opening", answers:{}, outcome:"", overallNotes:""
  };
}

function radioGroup(name, options, selected=""){
  return `<div class="prescreen-choice-grid">${options.map(([value,label,help])=>`<label class="prescreen-choice ${selected===value?"selected":""}"><input type="radio" name="${name}" value="${attr(value)}" ${selected===value?"checked":""}><span><strong>${esc(label)}</strong>${help?`<small>${esc(help)}</small>`:""}</span></label>`).join("")}</div>`;
}
function optionalTextarea(id,label,value="",placeholder=""){
  return `<label class="prescreen-field"><span>${esc(label)} <small>optional</small></span><textarea id="${id}" rows="3" placeholder="${attr(placeholder)}">${esc(value)}</textarea></label>`;
}
function field(id,label,type,value="",placeholder="",required=false){
  return `<label class="prescreen-field"><span>${esc(label)}${required?" *":""}</span><input id="${id}" type="${type}" value="${attr(value)}" placeholder="${attr(placeholder)}"></label>`;
}
function applicationLegalText(a){
  const candidates=[a.legalStatus,a.legal,a.legalIssues,a.courtInfo,a.probation];
  const value=candidates.find(v=>v && String(v).trim());
  return value?String(value):"No legal-status information was recorded on the application.";
}

function determineSteps(r){
  const a=r.answers||{};
  const steps=["opening","interest"];
  if(a.interested==="no"){
    steps.push("remain");
    if(a.remainWaitlist==="no") steps.push("removeConfirm");
    steps.push("summary");
    return steps;
  }
  if(a.interested!=="yes") return steps;
  steps.push("permission");
  if(a.permission==="no"){
    steps.push("callback","summary");
    return steps;
  }
  if(a.permission!=="yes") return steps;
  steps.push("sobriety");
  const days=calculateDays(a.lastUseDate);
  if(days!==null && days<5){
    steps.push("sobrietyFail");
    if(a.sobrietyAction==="detox") steps.push("detoxPlan");
    if(a.sobrietyAction==="schedule") steps.push("intakeSchedule");
    steps.push("summary");
    return steps;
  }
  if(days===null || days<5) return steps;
  steps.push("expectations","legal","health","medication","treatment","goals","summary");
  return steps;
}

function renderProgress(r){
  const steps=determineSteps(r); const index=Math.max(0,steps.indexOf(currentStep));
  const labels={opening:"Opening",interest:"Interest",remain:"Waitlist",removeConfirm:"Waitlist",permission:"Availability",callback:"Callback",sobriety:"Sobriety",sobrietyFail:"Decision",detoxPlan:"Detox",intakeSchedule:"Intake Date",expectations:"Expectations",legal:"Legal",health:"Health",medication:"Medication",treatment:"Treatment",goals:"Goals",summary:"Summary"};
  $("prescreenProgress").innerHTML=steps.map((s,i)=>`<span class="prescreen-step-pill ${i<index?"done":i===index?"active":""}">${esc(labels[s])}</span>`).join("");
}

function stepHtml(step,r,a){
  const x=r.answers||{};
  switch(step){
    case "opening": return `<section class="prescreen-step"><h3>Opening Script</h3><div class="prescreen-script-block">
      <p>Am I speaking with <strong>${esc(applicantName(a))}</strong>?</p>
      <p>This is <strong>${esc(staffDisplayName())}</strong> calling from the Ken Brown Recovery Home.</p>
      <p>The reason I’m calling is because we have an availability in our program and you are the next person on our waitlist.</p>
    </div><p class="hint">No acknowledgement is required. Continue when the opening has been delivered.</p></section>`;
    case "interest": return `<section class="prescreen-step"><h3>Current Interest</h3><p class="prescreen-question-large">Are you still interested in attending our program?</p>${radioGroup("interested",[["yes","Yes","Continue with the call"],["no","No","Determine whether the applicant wishes to remain on the waitlist"]],x.interested)}</section>`;
    case "remain": return `<section class="prescreen-step"><h3>Future Openings</h3><p class="prescreen-question-large">Would you like to remain on the waitlist for a future opening?</p>${radioGroup("remainWaitlist",[["yes","Yes","Return the applicant to the waitlist"],["no","No","Confirm removal from the active waitlist"]],x.remainWaitlist)}${optionalTextarea("interestNotes","Notes",x.interestNotes,"Reason for declining or relevant details")}</section>`;
    case "removeConfirm": return `<section class="prescreen-step"><h3>Remove from Waitlist</h3><div class="eligibility-box ineligible"><strong>Applicant does not want to remain on the waitlist.</strong><span>Confirm how this application should be handled.</span></div>${radioGroup("removeFromWaitlist",[["archive","Archive application","Remove from the active waitlist while preserving the record"],["keep","Keep on waitlist","Do not archive; return to regular waitlist status"]],x.removeFromWaitlist)}</section>`;
    case "permission": return `<section class="prescreen-step"><h3>Availability to Continue</h3><p class="prescreen-question-large">Do you have a few minutes to go over your application and answer some questions?</p>${radioGroup("permission",[["yes","Yes","Continue with pre-screening"],["no","No","Schedule another call"]],x.permission)}</section>`;
    case "callback": return `<section class="prescreen-step"><h3>Schedule Callback</h3><div class="prescreen-two-column">${field("callbackDate","Callback date","date",x.callbackDate||"","",true)}${field("callbackTime","Callback time","time",x.callbackTime||"","",true)}</div>${optionalTextarea("callbackNotes","Callback notes",x.callbackNotes,"Best number, preferred time, or other details")}</section>`;
    case "sobriety": {
      const days=calculateDays(x.lastUseDate);
      const badge=days===null?`<div class="eligibility-box neutral">Enter the last-use date to calculate days clean.</div>`:days>=5?`<div class="eligibility-box eligible"><strong>${days} day${days===1?"":"s"} clean</strong><span>Meets the five-day admission requirement.</span></div>`:`<div class="eligibility-box ineligible"><strong>${days} day${days===1?"":"s"} clean</strong><span>Does not meet the five-day admission requirement. There are no overrides.</span></div>`;
      return `<section class="prescreen-step"><h3>Sobriety Verification</h3><p class="prescreen-question-large">We require potential residents to have been clean/sober for a minimum of five days.</p><div class="prescreen-two-column">${field("lastUseDate","When was the last time you used?","date",x.lastUseDate||"","",true)}${field("lastUseSubstance","What was the substance?","text",x.lastUseSubstance||"","Substance disclosed",true)}</div>${badge}${optionalTextarea("sobrietyNotes","Notes",x.sobrietyNotes)}</section>`;
    }
    case "sobrietyFail": return `<section class="prescreen-step"><h3>Applicant Does Not Meet Sobriety Requirement</h3><div class="eligibility-box ineligible"><strong>No exception is available.</strong><span>Choose the operational next step. If the bed can be held, you may schedule admission for the earliest date the applicant reaches five days from last use.</span></div>${radioGroup("sobrietyAction",[["schedule","Schedule intake date and hold the offer","Set admission for the five-day sobriety date or later"],["detox","Arrange Detox and hold the offer","Use when Detox support is appropriate before admission"],["return","Return to waitlist and call next eligible applicant","Use when the bed must be filled before this applicant can meet the requirement"]],x.sobrietyAction)}</section>`;
    case "detoxPlan": return `<section class="prescreen-step"><h3>Detox Plan</h3><div class="prescreen-two-column">${field("detoxFacility","Detox facility","text",x.detoxFacility||"","Facility or service")}${field("detoxExpectedDate","Expected five-day completion date","date",x.detoxExpectedDate||"")}</div>${radioGroup("detoxContacted",[["yes","Detox contacted","Arrangements have been initiated"],["no","Not yet contacted","Follow-up is still required"]],x.detoxContacted)}${optionalTextarea("detoxNotes","Detox arrangements",x.detoxNotes,"Bed availability, contact person, transportation, follow-up")}</section>`;
    case "intakeSchedule": { const earliest=addCalendarDays(x.lastUseDate,5); const scheduled=x.scheduledIntakeDate||earliest; return `<section class="prescreen-step"><h3>Schedule Intake</h3><div class="eligibility-box neutral"><strong>Earliest five-day eligibility date: ${esc(earliest||"—")}</strong><span>The scheduled intake cannot be earlier than five calendar days after the recorded last-use date.</span></div><div class="prescreen-two-column">${field("scheduledIntakeDate","Intake date","date",scheduled,"",true)}${field("scheduledIntakeTime","Intake time","time",x.scheduledIntakeTime||"")}</div>${optionalTextarea("scheduledIntakeNotes","Intake scheduling notes",x.scheduledIntakeNotes,"Transportation, arrival instructions, contact arrangements, or other details")}</section>`; }
    case "expectations": return `<section class="prescreen-step"><h3>Admission Expectations</h3><div class="prescreen-script-block"><p>Upon arrival, we will administer a urine screen and breathalyzer.</p><p>If a disclosed substance may still produce a positive result, we may establish a baseline and monitor it until the substance is out of the applicant’s system. The timeline is substance-specific.</p><p>If the substance takes longer than expected to clear, treatment may be suspended while the resident attends Detox and can return once a negative result is produced.</p><p>If a urine screen is positive for a substance that was not listed on the application or disclosed during this call, the applicant will not be permitted to enter the program.</p></div>${radioGroup("expectationsReviewed",[["yes","Reviewed","The applicant received the admission expectations"],["deferred","Deferred","The expectations were not reviewed during this call"]],x.expectationsReviewed)}${x.expectationsReviewed==="deferred"?optionalTextarea("expectationsNotes","Reason deferred",x.expectationsNotes,"Required when deferred"):optionalTextarea("expectationsNotes","Notes",x.expectationsNotes)}</section>`;
    case "legal": return `<section class="prescreen-step"><h3>Legal Status Verification</h3><div class="application-highlight"><span>Application information</span><p>${esc(applicationLegalText(a))}</p></div><p class="prescreen-question-large">Has your legal status changed since submitting your application?</p>${radioGroup("legalChanged",[["no","No","No changes disclosed"],["yes","Yes","Record the changes and assess possible conflicts"]],x.legalChanged)}${x.legalChanged==="yes"?`${optionalTextarea("legalChangeNotes","Describe the change",x.legalChangeNotes,"New charges, warrant, bail, probation, parole, court date, curfew, peace bond, or other obligation")}<fieldset class="prescreen-fieldset"><legend>Select all that apply</legend>${["New criminal charges","Outstanding warrant","Bail conditions","Probation","Parole","House arrest","Upcoming court date","Curfew","Peace bond","Other"].map(v=>`<label class="check-row"><input type="checkbox" name="legalTypes" value="${attr(v)}" ${(x.legalTypes||[]).includes(v)?"checked":""}> <span>${esc(v)}</span></label>`).join("")}</fieldset><p class="prescreen-question-large">Could any legal obligation interfere with full participation in the program?</p>${radioGroup("legalConflict",[["no","No","No participation conflict identified"],["yes","Yes","Executive Director or designated management review is required"],["unknown","Unsure","Further verification is required"]],x.legalConflict)}${x.legalConflict!=="no"?optionalTextarea("legalConflictNotes","Conflict details",x.legalConflictNotes,"Court dates, travel restrictions, curfew, reporting requirements, attendance restrictions, or other concerns"):""}`:""}</section>`;
    case "health": return `<section class="prescreen-step"><h3>Health Screen</h3><p class="prescreen-question-large">Are there any physical health problems that will prevent you from participating in the program?</p>${radioGroup("healthConflict",[["no","No","No health barrier disclosed"],["yes","Yes","Record the condition and required review"],["unknown","Unsure","Further information is required"]],x.healthConflict)}${x.healthConflict!=="no"?optionalTextarea("healthNotes","Health details",x.healthNotes,"Describe limitations, accommodation needs, or required follow-up"):optionalTextarea("healthNotes","Notes",x.healthNotes)}<p class="prescreen-question-large">Were Life Skills participation expectations explained?</p>${radioGroup("lifeSkillsReviewed",[["yes","Yes","Reviewed during this call"],["skipped","Skipped","Not required or deferred for this call"]],x.lifeSkillsReviewed)}</section>`;
    case "medication": return `<section class="prescreen-step"><h3>Medication and Allergies</h3><p class="prescreen-question-large">Are you currently taking any medication?</p>${radioGroup("takesMedication",[["yes","Yes","Enter current medications and pharmacy details"],["no","No","Skip medication-transfer questions"],["skipped","Skipped","Question not used during this call"]],x.takesMedication)}${x.takesMedication==="yes"?`${optionalTextarea("medications","Current medications",x.medications,"Medication name, dose, and schedule when available")}<div class="prescreen-two-column">${field("pharmacy","Pharmacy","text",x.pharmacy||"","Name and location")}${field("pharmacyPhone","Pharmacy phone","tel",x.pharmacyPhone||"")}</div>${radioGroup("medTransfer",[["yes","Transfer details obtained","Medication transfer can be arranged"],["pending","Pending","Additional pharmacy information is needed"],["na","Not applicable","No transfer required"]],x.medTransfer)}`:""}<p class="prescreen-question-large">Do you have any allergies?</p>${radioGroup("hasAllergies",[["yes","Yes","Record the allergies"],["no","No","No allergies disclosed"],["skipped","Skipped","Question not used during this call"]],x.hasAllergies)}${x.hasAllergies==="yes"?optionalTextarea("allergies","Allergies",x.allergies,"Medication, food, environmental, or other allergies"):""}</section>`;
    case "treatment": return `<section class="prescreen-step"><h3>Treatment History and Program Expectations</h3><p class="prescreen-question-large">Have you attended treatment before?</p>${radioGroup("priorTreatment",[["yes","Yes","Record prior treatment experience"],["no","No","Explain the 12-step-based recovery model"],["skipped","Skipped","Question not used during this call"]],x.priorTreatment)}${x.priorTreatment==="yes"?optionalTextarea("treatmentHistory","Previous treatment",x.treatmentHistory,"Program, date, outcome, and relevant details"):""}<div class="prescreen-script-block"><p>KBRH is a 12-step-based recovery program. Residents are expected to take part in all aspects of the program, find a sponsor, complete step work, and attend a minimum of four closed AA/NA meetings per week.</p></div>${radioGroup("programReviewed",[["yes","Reviewed","Program expectations were explained"],["skipped","Skipped","Not reviewed during this call"]],x.programReviewed)}${optionalTextarea("treatmentNotes","Notes",x.treatmentNotes)}</section>`;
    case "goals": return `<section class="prescreen-step"><h3>Long-Term Goals / Discharge Plan</h3><p class="hint">These fields are optional and may be skipped when they are not useful during this call.</p>${optionalTextarea("goalHousing","Housing",x.goalHousing)}${optionalTextarea("goalEmployment","Employment",x.goalEmployment)}${optionalTextarea("goalCounselling","Outside counselling",x.goalCounselling)}</section>`;
    case "summary": return summaryHtml(r,a);
    default: return "";
  }
}

function summaryHtml(r,a){
  const x=r.answers||{}; const days=calculateDays(x.lastUseDate);
  const rows=[];
  rows.push(["Applicant",applicantName(a)]);
  rows.push(["Interest",x.interested==="yes"?"Interested":x.interested==="no"?"Not interested":"Not answered"]);
  if(x.interested==="no") rows.push(["Waitlist",x.remainWaitlist==="yes"?"Remain on waitlist":x.remainWaitlist==="no"?"Does not wish to remain":"Not answered"]);
  if(x.permission==="no") rows.push(["Callback",`${x.callbackDate||"Date not set"}${x.callbackTime?` at ${x.callbackTime}`:""}`]);
  if(days!==null) rows.push(["Sobriety",`${days} day${days===1?"":"s"} clean — ${days>=5?"Meets requirement":"Does not meet requirement"}`]);
  if(x.sobrietyAction) rows.push(["Sobriety action",x.sobrietyAction==="detox"?"Arrange Detox and hold offer":x.sobrietyAction==="schedule"?`Schedule intake${x.scheduledIntakeDate?` for ${x.scheduledIntakeDate}`:""}`:"Return to waitlist and contact next applicant"]);
  if(x.legalChanged) rows.push(["Legal status",x.legalChanged==="no"?"No change reported":x.legalConflict==="yes"?"Potential conflict — review required":x.legalConflict==="unknown"?"Verification required":"Change reported; no participation conflict identified"]);
  if(x.healthConflict) rows.push(["Health",x.healthConflict==="no"?"No barrier disclosed":x.healthConflict==="yes"?"Potential barrier — review required":"Further information required"]);
  if(x.takesMedication) rows.push(["Medication",x.takesMedication==="yes"?"Medication information reviewed":x.takesMedication==="no"?"No medication disclosed":"Skipped"]);
  const suggested = suggestedOutcome(r);
  return `<section class="prescreen-step"><h3>Pre-Screening Summary</h3><div class="summary-list">${rows.map(([k,v])=>`<div><span>${esc(k)}</span><strong>${esc(v)}</strong></div>`).join("")}</div><div class="eligibility-box ${suggested.kind}"><strong>${esc(suggested.title)}</strong><span>${esc(suggested.detail)}</span></div>${optionalTextarea("overallNotes","Overall notes",r.overallNotes||"")}<p class="hint">Completing the pre-screening will apply the outcome shown above. Use Back to correct any answer first.</p></section>`;
}

function suggestedOutcome(r){
  const x=r.answers||{};
  if(x.interested==="no"){
    if(x.remainWaitlist==="yes") return {code:"returned-interest",title:"Return to Waitlist",detail:"Applicant declined this opening but wishes to be considered for a future opening.",kind:"neutral"};
    if(x.removeFromWaitlist==="archive") return {code:"archive",title:"Archive Application",detail:"Applicant declined and does not wish to remain on the waitlist.",kind:"ineligible"};
    return {code:"returned-interest",title:"Return to Waitlist",detail:"Applicant declined this opening.",kind:"neutral"};
  }
  if(x.permission==="no") return {code:"callback",title:"Callback Scheduled",detail:"The offer remains active until the scheduled callback.",kind:"neutral"};
  const days=calculateDays(x.lastUseDate);
  if(days!==null && days<5){
    if(x.sobrietyAction==="detox") return {code:"detox",title:"Detox Plan — Offer Held",detail:"Applicant must complete Detox and satisfy the five-day sobriety requirement before admission.",kind:"neutral"};
    if(x.sobrietyAction==="schedule") return {code:"scheduled-intake",title:"Intake Scheduled — Offer Held",detail:`Applicant is scheduled for intake on ${x.scheduledIntakeDate||"the selected date"}${x.scheduledIntakeTime?` at ${x.scheduledIntakeTime}`:""}, after reaching the five-day sobriety requirement.`,kind:"neutral"};
    return {code:"returned-sobriety",title:"Return to Waitlist",detail:"Applicant does not meet the five-day sobriety requirement and the next eligible applicant should be contacted.",kind:"ineligible"};
  }
  if(x.legalConflict==="yes" || x.legalConflict==="unknown" || x.healthConflict==="yes" || x.healthConflict==="unknown") return {code:"review",title:"Further Review Required",detail:"A possible legal or health participation conflict requires review before admission.",kind:"neutral"};
  return {code:"approved",title:"Pre-Screening Complete — Eligible to Proceed",detail:"The applicant meets the documented pre-screening criteria.",kind:"eligible"};
}

function collectCurrentStep(){
  if(!currentRecord)return;
  const x=currentRecord.answers=currentRecord.answers||{};
  document.querySelectorAll('#prescreenForm input[type="radio"]:checked').forEach(el=>x[el.name]=el.value);
  document.querySelectorAll('#prescreenForm input:not([type="radio"]):not([type="checkbox"]), #prescreenForm textarea').forEach(el=>{ if(el.id) x[el.id]=el.value; });
  x.legalTypes=[...document.querySelectorAll('#prescreenForm input[name="legalTypes"]:checked')].map(el=>el.value);
  if($("overallNotes")) currentRecord.overallNotes=$("overallNotes").value;
  currentRecord.step=currentStep; currentRecord.updatedAt=new Date().toISOString(); currentRecord.staffUser=staffDisplayName(); currentRecord.staffEmail=auth.currentUser?.email||currentRecord.staffEmail||""; currentRecord.staffUid=auth.currentUser?.uid||currentRecord.staffUid||"";
}

function validateStep(step,r){
  const x=r.answers||{};
  const need=(condition,message,selector)=>{ if(!condition){alert(message); if(selector)document.querySelector(selector)?.focus(); return false;} return true; };
  if(step==="interest") return need(x.interested,"Select whether the applicant is still interested.",'input[name="interested"]');
  if(step==="remain") return need(x.remainWaitlist,"Select whether the applicant wants to remain on the waitlist.",'input[name="remainWaitlist"]');
  if(step==="removeConfirm") return need(x.removeFromWaitlist,"Choose whether to archive or keep the application on the waitlist.",'input[name="removeFromWaitlist"]');
  if(step==="permission") return need(x.permission,"Select whether the applicant is available to continue.",'input[name="permission"]');
  if(step==="callback") return need(x.callbackDate && x.callbackTime,"Enter a callback date and time.","#callbackDate");
  if(step==="sobriety") return need(x.lastUseDate && x.lastUseSubstance?.trim(),"Enter both the last-use date and substance.","#lastUseDate");
  if(step==="sobrietyFail") return need(x.sobrietyAction,"Choose whether to schedule intake, arrange Detox, or return the applicant to the waitlist.",'input[name="sobrietyAction"]');
  if(step==="intakeSchedule"){ const earliest=addCalendarDays(x.lastUseDate,5); return need(x.scheduledIntakeDate && (!earliest || x.scheduledIntakeDate>=earliest),`Choose an intake date on or after ${earliest||"the five-day sobriety date"}.`,"#scheduledIntakeDate"); }
  if(step==="expectations" && x.expectationsReviewed==="deferred") return need(x.expectationsNotes?.trim(),"Enter a reason when admission expectations are deferred.","#expectationsNotes");
  if(step==="legal" && x.legalChanged==="yes") return need(x.legalChangeNotes?.trim() && x.legalConflict,"Describe the legal change and indicate whether it may interfere with participation.","#legalChangeNotes");
  return true;
}

function renderForm(){
  const a=getApplicants().find(x=>x.id===currentApplicantId); if(!a||!currentRecord)return;
  const steps=determineSteps(currentRecord); if(!steps.includes(currentStep)) currentStep=steps[0];
  $("prescreenApplicantName").textContent=`${applicantName(a)} · ${a.contact||a.phone||"No phone listed"}`;
  renderProgress(currentRecord);
  $("prescreenForm").innerHTML=stepHtml(currentStep,currentRecord,a);
  $("prescreenForm").querySelectorAll('.prescreen-choice input').forEach(input=>input.addEventListener('change',()=>{
    input.closest('.prescreen-choice-grid').querySelectorAll('.prescreen-choice').forEach(l=>l.classList.toggle('selected',l.contains(input)));
    collectCurrentStep();
    if(["interest","remain","permission","sobrietyFail","legal","health","medication"].includes(currentStep)) renderForm();
  }));
  $("lastUseDate")?.addEventListener("change",()=>{collectCurrentStep();renderForm();});
  updateFooter();
}

function updateFooter(){
  const steps=determineSteps(currentRecord); const i=steps.indexOf(currentStep);
  $("backPrescreenBtn").disabled=i<=0;
  $("nextPrescreenBtn").classList.toggle("hidden",currentStep==="summary");
  $("completePrescreenBtn").classList.toggle("hidden",currentStep!=="summary" || currentRecord?.status==="Completed");
  $("printPrescreenBtn")?.classList.toggle("hidden",currentStep!=="summary");
  $("movePrescreenToRosterBtn")?.classList.toggle("hidden",currentStep!=="summary" || currentRecord?.status!=="Completed");
  $("nextPrescreenBtn").textContent=i===steps.length-2?"Review Summary":"Continue";
}

async function saveDraft(showAlert=true){
  collectCurrentStep();
  currentRecord.status=currentRecord.status==="Completed"?"Completed":"In Progress";
  currentRecord.workflowStatus=currentStep.replace(/([A-Z])/g," $1").replace(/^./,c=>c.toUpperCase());
  await saveAppState(prescreenState); renderList();
  if(showAlert) alert("Draft saved.");
}

async function completePrescreen(){
  collectCurrentStep();
  const a=getApplicants().find(x=>x.id===currentApplicantId); if(!a)return;
  const result=suggestedOutcome(currentRecord); const x=currentRecord.answers||{};
  currentRecord.status="Completed"; currentRecord.completedAt=new Date().toISOString(); currentRecord.updatedAt=currentRecord.completedAt; currentRecord.outcome=result.code; currentRecord.workflowStatus=result.title;
  if(result.code==="returned-interest"){
    a.status="N/A"; addWaitlistNote(a,`Pre-screening: applicant declined the current opening and ${x.remainWaitlist==="yes"?"wishes to remain on the waitlist":"was returned to the waitlist"}. ${x.interestNotes||""}`.trim());
  } else if(result.code==="archive"){
    a.archived=true; a.status="N/A"; addWaitlistNote(a,"Pre-screening: applicant declined the opening and requested removal from the active waitlist.");
  } else if(result.code==="callback"){
    addWaitlistNote(a,`Pre-screening callback scheduled for ${x.callbackDate} at ${x.callbackTime}. ${x.callbackNotes||""}`.trim());
  } else if(result.code==="detox"){
    addWaitlistNote(a,`Pre-screening: applicant does not yet meet the five-day sobriety requirement. Detox plan initiated; offer remains active. ${x.detoxFacility||""} ${x.detoxExpectedDate?`Expected completion: ${x.detoxExpectedDate}.`:""} ${x.detoxNotes||""}`.trim());
  } else if(result.code==="scheduled-intake"){
    a.status="Offer Given";
    addWaitlistNote(a,`Pre-screening: applicant does not yet meet the five-day sobriety requirement. Intake scheduled for ${x.scheduledIntakeDate||"date not recorded"}${x.scheduledIntakeTime?` at ${x.scheduledIntakeTime}`:""}; offer remains active. Last use: ${x.lastUseDate||"unknown"}; substance: ${x.lastUseSubstance||"not recorded"}. ${x.scheduledIntakeNotes||""}`.trim());
  } else if(result.code==="returned-sobriety"){
    a.status="N/A"; addWaitlistNote(a,`Pre-screening: applicant did not meet the five-day sobriety requirement and was returned to the waitlist. Last use: ${x.lastUseDate||"unknown"}; substance: ${x.lastUseSubstance||"not recorded"}. Contact the next eligible applicant.`);
  } else if(result.code==="review"){
    addWaitlistNote(a,"Pre-screening completed: further review required due to a possible legal or health participation conflict.");
  } else if(result.code==="approved"){
    addWaitlistNote(a,"Pre-screening completed: applicant meets documented pre-screening criteria and may proceed in the admissions process.");
  }
  appendPersonActivity(a,"Pre-Screening","Pre-screening completed",result.title);
  if(result.code==="scheduled-intake") appendPersonActivity(a,"Intake","Intake scheduled",`${x.scheduledIntakeDate||"Date not recorded"}${x.scheduledIntakeTime?` at ${x.scheduledIntakeTime}`:""}`);
  await saveAppState(prescreenState); renderList(); alert(result.title); currentStep="summary"; renderForm();
}

async function movePrescreenApplicantToRoster(){
  collectCurrentStep();
  const applicant=(prescreenState?.waitlist||[]).find(a=>a.id===currentApplicantId&&!a.archived);
  if(!applicant){alert("This applicant is no longer on the active waitlist.");return;}
  pendingPrescreenMoveApplicantId=applicant.id;
  $("prescreenMoveRosterName").textContent=applicantName(applicant);
  $("prescreenMoveEntryDate").value=new Date().toISOString().slice(0,10);
  $("prescreenMoveRosterModal").classList.remove("hidden");document.body.classList.add("kbrh-modal-open");
}
function closePrescreenMoveRoster(){pendingPrescreenMoveApplicantId=null;$("prescreenMoveRosterModal").classList.add("hidden");}
async function confirmPrescreenMoveRoster(){
  const applicantIndex=(prescreenState?.waitlist||[]).findIndex(a=>a.id===pendingPrescreenMoveApplicantId&&!a.archived);
  if(applicantIndex===-1){alert("Applicant is no longer on the active waitlist.");closePrescreenMoveRoster();return;}
  const applicant=prescreenState.waitlist[applicantIndex];const name=applicantName(applicant);const entryDate=$("prescreenMoveEntryDate").value;
  if(!entryDate){alert("Select the admission / entry date.");return;}
  if(!confirm(`Confirm admission of ${name} on ${entryDate}?`))return;
  prescreenState.roster=Array.isArray(prescreenState.roster)?prescreenState.roster.filter(r=>r&&r!=="temp"):[];prescreenState.transferHistory=Array.isArray(prescreenState.transferHistory)?prescreenState.transferHistory:[];
  const prevW=structuredClone(prescreenState.waitlist),prevR=structuredClone(prescreenState.roster),prevT=structuredClone(prescreenState.transferHistory);
  const identity=typeof getCurrentStaffIdentity==="function"?await getCurrentStaffIdentity():{name:staffDisplayName(),uid:auth.currentUser?.uid||"",email:auth.currentUser?.email||""};
  appendPersonActivity(applicant,"Transfer","Moved to active Phase 1 roster",`Admission date: ${entryDate}`,identity);
  const note={id:crypto.randomUUID(),author:identity.name||staffDisplayName(),authorUid:identity.uid||"",authorEmail:identity.email||"",text:`Transferred from pre-screening/waitlist to Phase 1 roster. Admission date: ${entryDate}.`,createdAt:new Date().toISOString()};
  const resident={id:crypto.randomUUID(),roomNumber:"",clientId:"",firstName:applicant.firstName||"",lastName:applicant.lastName||"",dob:applicant.dob||"",phone:applicant.contact||applicant.phone||"",address:applicant.address||"",city:applicant.city||"",contact:applicant.emergencyContact||"",contactPhone:applicant.emergencyContactPhone||"",entryDate,expectedDischargeDate:"",originalApplicationDate:applicant.originalApplicationDate||applicant.dateApplied||"",waitlistSourceId:applicant.id,phase:"phase1",phase2AdmissionDate:"",archived:false,archivedAt:"",archiveReason:"",notes:[note,...(Array.isArray(applicant.notes)?applicant.notes:[])],activityHistory:normalizeActivityHistory(applicant.activityHistory)};
  prescreenState.waitlist.splice(applicantIndex,1);prescreenState.roster.push(resident);prescreenState.transferHistory.unshift({id:crypto.randomUUID(),applicantId:applicant.id,residentId:resident.id,applicantName:name,transferredAt:new Date().toISOString(),transferredBy:identity.name||identity.email||"Staff User",undone:false,undoneAt:"",applicantSnapshot:structuredClone(applicant)});
  try{const n=normalizeAppState({waitlist:prescreenState.waitlist,roster:prescreenState.roster,transferHistory:prescreenState.transferHistory});await APP_DOC_REF().update({waitlist:n.waitlist,roster:n.roster,transferHistory:n.transferHistory,updatedAt:new Date().toISOString()});prescreenState.waitlist=n.waitlist;prescreenState.roster=n.roster;prescreenState.transferHistory=n.transferHistory;if(typeof writeAuditEntry==="function") writeAuditEntry([`Moved pre-screened applicant to roster: ${name} (admission ${entryDate})`],identity).catch(console.warn);closePrescreenMoveRoster();closePrescreen();renderList();alert(`${name} was moved to the active Phase 1 roster.`);}catch(error){console.error(error);prescreenState.waitlist=prevW;prescreenState.roster=prevR;prescreenState.transferHistory=prevT;alert(`Could not move ${name} to the roster. No changes were saved.`);}
}

function printPrescreenSummary(record=currentRecord){
  if(!record)return;
  const a=(prescreenState?.waitlist||[]).find(x=>x.id===record.applicantId) || {firstName:record.applicantName||"",lastName:""};
  const x=record.answers||{}; const days=calculateDays(x.lastUseDate); const result=suggestedOutcome(record);
  const row=(label,value)=>`<tr><th>${esc(label)}</th><td>${esc(value||"—")}</td></tr>`;
  const legalTypes=Array.isArray(x.legalTypes)&&x.legalTypes.length?x.legalTypes.join(", "):"—";
  const win=window.open("","_blank"); if(!win){alert("Allow pop-ups to print the summary.");return;}
  win.document.write(`<!doctype html><html><head><title>Pre-Screening Summary - ${esc(applicantName(a))}</title><style>@page{size:letter portrait;margin:.55in}body{font-family:Arial,sans-serif;color:#111;font-size:11pt;margin:0}h1{text-align:center;margin:0 0 4px;font-size:20pt}h2{text-align:center;margin:0 0 18px;font-size:13pt}table{width:100%;border-collapse:collapse;margin:12px 0 18px}th,td{border:1px solid #555;padding:7px;text-align:left;vertical-align:top}th{width:32%;background:#eee}h3{margin:16px 0 6px}.outcome{border:2px solid #333;padding:10px;margin:14px 0}.meta{display:flex;justify-content:space-between;gap:20px;font-size:10pt}.notes{white-space:pre-wrap;border:1px solid #777;padding:9px;min-height:45px}button{margin-top:18px}@media print{button{display:none}}</style></head><body><h1>Ken Brown Recovery Home</h1><h2>Pre-Screening Summary</h2><div class="meta"><span><strong>Applicant:</strong> ${esc(applicantName(a))}</span><span><strong>Completed:</strong> ${esc(formatDateTime(record.completedAt||record.updatedAt))}</span></div><table>${row("Staff Member",record.staffUser||"—")}${row("Interest",x.interested==="yes"?"Interested":x.interested==="no"?"Not interested":"Not answered")}${row("Available to Complete Call",x.permission==="yes"?"Yes":x.permission==="no"?"No":"Not answered")}${row("Last Use",x.lastUseDate||"—")}${row("Substance",x.lastUseSubstance||"—")}${row("Days Clean",days===null?"—":String(days))}${row("Sobriety Action",x.sobrietyAction==="schedule"?"Scheduled intake":x.sobrietyAction==="detox"?"Detox plan":x.sobrietyAction==="return"?"Returned to waitlist":"—")}${row("Scheduled Intake",x.scheduledIntakeDate?`${x.scheduledIntakeDate}${x.scheduledIntakeTime?` at ${x.scheduledIntakeTime}`:""}`:"—")}${row("Admission Expectations",x.expectationsReviewed||"—")}${row("Legal Status Changed",x.legalChanged||"—")}${row("Legal Factors",legalTypes)}${row("Legal Participation Conflict",x.legalConflict||"—")}${row("Health Participation Conflict",x.healthConflict||"—")}${row("Medication",x.takesMedication||"—")}${row("Pharmacy",x.pharmacy||"—")}${row("Allergies",x.hasAllergies==="yes"?(x.allergies||"Yes"):(x.hasAllergies||"—"))}${row("Previous Treatment",x.priorTreatment||"—")}${row("Housing Goal",x.goalHousing||"—")}${row("Employment Goal",x.goalEmployment||"—")}${row("Outside Counselling",x.goalCounselling||"—")}</table><div class="outcome"><strong>Outcome: ${esc(result.title)}</strong><div>${esc(result.detail)}</div></div><h3>Overall Notes</h3><div class="notes">${esc(record.overallNotes||"No additional notes.")}</div><button onclick="window.print()">Print Summary</button></body></html>`); win.document.close();
}

function openPrescreen(id){
  currentApplicantId=id; const a=getApplicants().find(x=>x.id===id); if(!a)return;
  currentRecord=getRecord(id); if(!currentRecord){currentRecord=emptyRecord(a); prescreenState.preScreenings.push(currentRecord);}
  currentRecord.answers=currentRecord.answers||{}; currentStep=currentRecord.step||"opening";
  if(currentRecord.status==="Completed") currentStep="summary";
  renderForm(); $("prescreenModal").classList.remove("hidden"); document.body.classList.add("kbrh-modal-open");
}
function closePrescreen(){ $("prescreenModal").classList.add("hidden"); document.body.classList.remove("kbrh-modal-open"); currentApplicantId=null; currentRecord=null; currentStep="opening"; }

function nextStep(){
  collectCurrentStep(); if(!validateStep(currentStep,currentRecord))return;
  const steps=determineSteps(currentRecord); const i=steps.indexOf(currentStep); if(i<steps.length-1){currentStep=steps[i+1]; currentRecord.step=currentStep; renderForm(); $("prescreenForm").scrollTop=0;}
}
function previousStep(){
  collectCurrentStep(); const steps=determineSteps(currentRecord); const i=steps.indexOf(currentStep); if(i>0){currentStep=steps[i-1]; currentRecord.step=currentStep; renderForm(); $("prescreenForm").scrollTop=0;}
}

document.addEventListener("DOMContentLoaded",()=>{
  $("closePrescreenX").onclick=$("cancelPrescreenBtn").onclick=closePrescreen;
  $("saveDraftBtn").onclick=()=>saveDraft(true);
  $("nextPrescreenBtn").onclick=nextStep;
  $("backPrescreenBtn").onclick=previousStep;
  $("completePrescreenBtn").onclick=completePrescreen;
  $("printPrescreenBtn").onclick=()=>printPrescreenSummary(currentRecord);
  $("movePrescreenToRosterBtn").onclick=movePrescreenApplicantToRoster;
  $("confirmPrescreenMoveRosterBtn").onclick=confirmPrescreenMoveRoster;
  $("cancelPrescreenMoveRosterBtn").onclick=$("closePrescreenMoveRosterBtn").onclick=closePrescreenMoveRoster;
  $("prescreenModal").addEventListener("click",e=>{if(e.target===$("prescreenModal"))closePrescreen();});
});
auth.onAuthStateChanged(user=>{if(!user)return;listenToAppState(state=>{prescreenState=state;prescreenState.preScreenings=Array.isArray(prescreenState.preScreenings)?prescreenState.preScreenings:[];renderList();});});
