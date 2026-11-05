let auditEntries = [];
let auditUnsubscribe = null;

function auditFormatDate(entry) {
  const raw = entry?.timestamp?.toDate ? entry.timestamp.toDate() : new Date(entry.timestampIso || "");
  if (!raw || Number.isNaN(raw.getTime())) return "";
  return raw.toLocaleString("en-CA", { year:"numeric", month:"short", day:"numeric", hour:"numeric", minute:"2-digit" });
}

function auditEscape(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
}

function auditPageLabel(page) {
  const labels = {
    "roster.html":"Roster", "waitlist.html":"Waitlist", "house-chores.html":"House Chores",
    "meal-chores.html":"Meal Chores", "verbalwarning.html":"Warnings", "writeups.html":"Write-Ups",
    "chore-checks.html":"Chore Checks", "incident-report.html":"Incident Reports", "charts.html":"Charts",
    "prescreening.html":"Pre-Screening", "counseling-notes.html":"Counseling Notes"
  };
  return labels[page] || page || "System";
}

function renderAuditLog() {
  const tbody = document.getElementById("auditBody");
  const q = (document.getElementById("auditSearch")?.value || "").trim().toLowerCase();
  const rows = auditEntries.filter(entry => {
    if (!q) return true;
    return [entry.staffName, entry.staffEmail, entry.page, entry.summary, ...(entry.changes || [])]
      .join(" ").toLowerCase().includes(q);
  });
  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="4">No matching audit records.</td></tr>';
    return;
  }
  tbody.innerHTML = rows.map(entry => `
    <tr>
      <td>${auditEscape(auditFormatDate(entry))}</td>
      <td><strong>${auditEscape(entry.staffName || "Staff User")}</strong><br><span class="hint">${auditEscape(entry.staffEmail || "")}</span></td>
      <td>${auditEscape(auditPageLabel(entry.page))}</td>
      <td>${(entry.changes || [entry.summary || "Updated application data"]).map(change => `<div>${auditEscape(change)}</div>`).join("")}</td>
    </tr>`).join("");
}

function subscribeAuditLog() {
  if (auditUnsubscribe) auditUnsubscribe();
  auditUnsubscribe = db.collection("kbrhAudit").orderBy("timestamp", "desc").limit(500).onSnapshot(snapshot => {
    auditEntries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderAuditLog();
  }, error => {
    console.error(error);
    document.getElementById("auditBody").innerHTML = '<tr><td colspan="4">Audit log could not be loaded. Deploy the included Firestore rules so authenticated users can access the kbrhAudit collection.</td></tr>';
  });
}

document.getElementById("auditSearch")?.addEventListener("input", renderAuditLog);
document.getElementById("refreshAuditBtn")?.addEventListener("click", subscribeAuditLog);
auth.onAuthStateChanged(user => {
  if(!user)return;
  if(!isKbrhAdmin(user)){ location.replace("index.html"); return; }
  subscribeAuditLog();
});


// Historical recovery is deliberately conservative: only an explicitly stored
// creation timestamp is accepted as an event date. No inferred staff identity.
let waitlistBackfillCandidates=[];
function backfillDate(value){
  if(value?.toDate)value=value.toDate();
  const d=value instanceof Date?value:new Date(value||"");
  return Number.isFinite(d.getTime())?d:null;
}
function historicalCreationEvidence(person){
  for(const field of ["createdAt","addedAt","waitlistAddedAt"]){
    const d=backfillDate(person[field]);
    if(d)return {date:d,field};
  }
  return null;
}
function historicalActorEvidence(person){
  const uid=person.createdByUid||person.addedByUid||person.createdBy?.uid||"";
  const name=person.createdByName||person.addedByName||person.createdBy?.name||"";
  const email=person.createdByEmail||person.addedByEmail||person.createdBy?.email||"";
  return {uid,name,email};
}
function auditApplicantId(entry){
  if(entry.applicantId)return String(entry.applicantId);
  const text=[entry.summary,...(entry.changes||[])].join(" ");
  const m=text.match(/Applicant ID:\s*([a-zA-Z0-9-]+)/i);
  return m?m[1]:"";
}
async function inspectHistoricalWaitlist(){
  const report=document.getElementById("waitlistHistoryReport");
  const apply=document.getElementById("applyWaitlistHistory");
  apply.disabled=true;waitlistBackfillCandidates=[];
  report.textContent="Inspecting stored waitlist and existing audit records…";
  try{
    const [stateDoc,auditSnap]=await Promise.all([
      APP_DOC_REF().get(),db.collection("kbrhAudit").get()
    ]);
    if(!stateDoc.exists)throw new Error("Application state document not found.");
    const state=stateDoc.data()||{};
    const applicants=(state.waitlist||[]).filter(a=>a&&a!=="temp"&&a.id);
    const audited=new Set();
    auditSnap.forEach(doc=>{
      const entry=doc.data();
      if(/added to waitlist/i.test([entry.summary,...(entry.changes||[])].join(" "))){
        const id=auditApplicantId(entry);
        if(id)audited.add(id);
      }
    });
    const candidates=[],unknown=[];
    for(const person of applicants){
      const id=String(person.id);
      if(audited.has(id))continue;
      const evidence=historicalCreationEvidence(person);
      const actor=historicalActorEvidence(person);
      if(!evidence){unknown.push(person);continue;}
      candidates.push({person,id,evidence,actor});
    }
    waitlistBackfillCandidates=candidates;
    const attributed=candidates.filter(x=>x.actor.uid).length;
    report.textContent=`Inspected ${applicants.length} existing waitlist records and ${auditSnap.size} audit entries. ${audited.size} applicant IDs already audited; ${candidates.length} have an explicit creation timestamp (${attributed} with recorded staff UID). ${unknown.length} lack reliable creation timestamps and will NOT be backdated. Historical records no longer in the current waitlist may not be recoverable from this data.`;
    apply.disabled=!candidates.length;
  }catch(error){
    console.error("Historical audit inspection failed",error);
    report.textContent=`Inspection failed: ${error.message||error}`;
  }
}
async function applyHistoricalWaitlist(){
  const report=document.getElementById("waitlistHistoryReport");
  const apply=document.getElementById("applyWaitlistHistory");
  if(!waitlistBackfillCandidates.length)return;
  if(!confirm(`Create up to ${waitlistBackfillCandidates.length} labelled historical waitlist audit entries? Existing entries will not be changed.`))return;
  apply.disabled=true;
  let added=0,skipped=0;
  try{
    // Recheck existing audit entries immediately before writing.
    const existing=await db.collection("kbrhAudit").get();
    const ids=new Set();
    existing.forEach(doc=>{
      const e=doc.data();
      if(/added to waitlist/i.test([e.summary,...(e.changes||[])].join(" "))){
        const id=auditApplicantId(e);if(id)ids.add(id);
      }
    });
    for(const candidate of waitlistBackfillCandidates){
      if(ids.has(candidate.id)){skipped++;continue;}
      const {person,id,evidence,actor}=candidate;
      const ref=db.collection("kbrhAudit").doc("historical-waitlist-"+id.replace(/[^a-zA-Z0-9-]/g,""));
      const old=await ref.get();
      if(old.exists){skipped++;continue;}
      const fullName=[person.firstName,person.lastName].filter(Boolean).join(" ");
      const when=evidence.date.toISOString();
      await ref.set({
        applicantId:id,staffUid:actor.uid||"",staffName:actor.name||"Unknown — not recorded",
        staffEmail:actor.email||"",page:"waitlist.html",historical:true,action:"waitlist_added",
        historicalSource:`waitlist.${evidence.field}`,historicalConfidence:"Recorded creation timestamp",
        historicalEventDate:when,
        summary:`Historical — added to waitlist: ${fullName}`,
        changes:[`Historical waitlist addition: ${fullName} (Applicant ID: ${id})`,
          `Creation date recovered from ${evidence.field}: ${when}`,
          actor.uid?`Recorded staff UID: ${actor.uid}`:"Staff identity not recorded — unknown",
          "Backfilled from current application record; not an original audit event."],
        timestamp:firebase.firestore.Timestamp.fromDate(evidence.date),
        timestampIso:when,backfilledAt:firebase.firestore.FieldValue.serverTimestamp()
      });
      ids.add(id);added++;
    }
    report.textContent=`Backfill complete: ${added} historical entries created, ${skipped} skipped as duplicates. Unverifiable records were left unchanged.`;
    waitlistBackfillCandidates=[];
  }catch(error){
    console.error("Historical audit backfill failed",error);
    report.textContent=`Backfill stopped after ${added} entries: ${error.message||error}. Reinspect before retrying; existing entries are preserved.`;
  }
}
document.getElementById("inspectWaitlistHistory")?.addEventListener("click",inspectHistoricalWaitlist);
document.getElementById("applyWaitlistHistory")?.addEventListener("click",applyHistoricalWaitlist);
