const APP_DOC_REF = () => db.collection("kbrh").doc("choreTracker");
const SETTINGS_DOC_REF = () => db.collection("kbrh").doc("settings");

function defaultKbrhSettings(){
  return {
    callInDay: "Monday",
    noCallWarningThreshold: 2,
    choreRolloverDay: "Monday",
    choreRolloverTime: "00:01",
    timeZone: "America/Toronto"
  };
}

async function loadKbrhSettings(){
  try{
    const snap=await SETTINGS_DOC_REF().get();
    const merged={...defaultKbrhSettings(),...(snap.exists?snap.data():{})};
    window.KBRH_SETTINGS=merged;
    return merged;
  }catch(error){
    console.warn("Could not load KBRH settings; using defaults.",error);
    const fallback=defaultKbrhSettings();
    window.KBRH_SETTINGS=fallback;
    return fallback;
  }
}

function normalizeActivityHistory(history){
  return Array.isArray(history)?history.filter(Boolean).map(item=>({
    id:item.id||crypto.randomUUID(),
    type:item.type||"Activity",
    summary:item.summary||item.text||"Activity recorded",
    detail:item.detail||"",
    staffName:item.staffName||item.author||"System",
    staffUid:item.staffUid||item.authorUid||"",
    staffEmail:item.staffEmail||item.authorEmail||"",
    createdAt:item.createdAt||new Date().toISOString()
  })):[];
}

function appendPersonActivity(person,type,summary,detail="",identity=null,createdAt=null){
  if(!person)return;
  const user=auth.currentUser;
  const staffName=identity?.name||(typeof currentStaffName==="function"?currentStaffName():(user?.email||"System"));
  person.activityHistory=normalizeActivityHistory(person.activityHistory);
  person.activityHistory.unshift({
    id:crypto.randomUUID(),type,summary,detail,staffName,
    staffUid:identity?.uid||user?.uid||"",
    staffEmail:identity?.email||user?.email||"",
    createdAt:createdAt||new Date().toISOString()
  });
}


const STANDARD_CHORES = [
  "Bathroom",
  "Upper floors",
  "Main Floor (morning)",
  "Main Floor (Night)",
  "Basement",
  "Outside Yardwork",
  "Morning dishes",
  "Resident Fridge",
  "General Disinfecting",
  "Special Projects"
];

function defaultAppState() {
  return {
    tableGenerated: false,
    residents: [],
    chores: STANDARD_CHORES,
    history: [],
    mealSchedule: defaultMealSchedule(),
    waitlist: [],
    roster: [],
    counselingNotes: [],
    verbalWarnings: [],
    writeUps: [],
    choreChecks: [],
    choreCheckAssignments: { weekKey: "", refreshedAt: "", choreAssignments: {}, roomAssignments: {} },
    preScreenings: [],
    incidentReports: [],
    chartData: { laundry: {}, electronics: {}, meetings: {} },
    transferHistory: [],
    busPassRecords: [],
    updatedAt: new Date().toISOString()
  };
}

function defaultMealSchedule() {
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  return {
    weekSchedule: days.reduce((schedule, day) => {
      schedule[day] = { lunch: "", supper1: "", supper2: "" };
      return schedule;
    }, {}),
    history: []
  };
}

function normalizeNotes(notes) {
  if (Array.isArray(notes)) {
    return notes.map(note => ({
      id: note.id || crypto.randomUUID(),
      author: note.author || "Unknown",
      authorUid: note.authorUid || "",
      authorEmail: note.authorEmail || "",
      text: note.text || "",
      createdAt: note.createdAt || new Date().toISOString()
    }));
  }

  if (notes) {
    return [{
      id: crypto.randomUUID(),
      author: "Unknown",
      text: String(notes),
      createdAt: new Date().toISOString()
    }];
  }

  return [];
}

function normalizeCounselingNotes(notes) {
  return Array.isArray(notes)
    ? notes
        .filter(note => note && note !== "temp")
        .map(note => ({
          id: note.id || crypto.randomUUID(),
          residentId: note.residentId || "",
          residentName: note.residentName || "Unknown Resident",
          author: note.author || "Unknown",
          authorUid: note.authorUid || "",
          authorEmail: note.authorEmail || "",
          note: note.note || "",
          archivedResident: note.archivedResident || false,
          createdAt: note.createdAt || new Date().toISOString()
        }))
    : [];
}

function getWaitlistCallPriority(item) {
  if (item.callPriority) return item.callPriority;

  const last = Array.isArray(item.callInHistory) ? item.callInHistory[0] : null;
  if (!last) return "normal";

  if (last.result === "Yes") return "normal";
  if (last.reason === "Called late") return "late";

  if (
    last.reason === "No call" ||
    last.reason === "Unable to reach" ||
    last.reason === "Wrong number / disconnected"
  ) {
    return "nocall";
  }

  return "late";
}

function normalizeAppState(state) {
  const base = defaultAppState();
  const merged = { ...base, ...(state || {}) };

  merged.chores = Array.isArray(merged.chores) && merged.chores.length
    ? merged.chores
    : STANDARD_CHORES;

  merged.residents = Array.isArray(merged.residents)
    ? merged.residents.map((resident, index) => ({
        id: resident.id || crypto.randomUUID(),
        rosterClientId: resident.rosterClientId || "",
        name: resident.name || `Resident ${index + 1}`,
        choreIndex: Number.isInteger(Number(resident.choreIndex)) ? Number(resident.choreIndex) : 0,
        exceptions: Array.isArray(resident.exceptions) ? resident.exceptions : [],
        lockedChore: resident.lockedChore || "",
        status: resident.status || "active",
        awayUntil: resident.awayUntil || ""
      }))
    : [];

  merged.history = Array.isArray(merged.history) ? merged.history : [];
  merged.mealSchedule = normalizeMealSchedule(merged.mealSchedule);

  merged.waitlist = Array.isArray(merged.waitlist)
    ? merged.waitlist.filter(item => item && item !== "temp").map(item => ({
        id: item.id || crypto.randomUUID(),
        lastName: item.lastName || "",
        firstName: item.firstName || "",
        contact: item.contact || "",
        status: item.status || "",
        city: item.city || "",
        dateApplied: item.dateApplied || "",
        archived: item.archived || false,
        archivedAt: item.archivedAt || "",
        archiveReason: item.archiveReason || "",
        callPriority: getWaitlistCallPriority(item),
        waitlistPosition: Number.isFinite(Number(item.waitlistPosition)) ? Number(item.waitlistPosition) : null,
        notes: normalizeNotes(item.notes),
        callInHistory: Array.isArray(item.callInHistory) ? item.callInHistory : [],
        activityHistory: normalizeActivityHistory(item.activityHistory),
        preScreeningStatus: item.preScreeningStatus || "",
        preScreeningCompletedAt: item.preScreeningCompletedAt || "",
        preScreeningRecordId: item.preScreeningRecordId || ""
      }))
    : [];

  merged.roster = Array.isArray(merged.roster)
    ? merged.roster.filter(client => client && client !== "temp").map(client => ({
        id: client.id || crypto.randomUUID(),
        roomNumber: client.roomNumber || "",
        clientId: client.clientId || "",
        firstName: client.firstName || "",
        lastName: client.lastName || "",
        dob: client.dob || "",
        phone: client.phone || "",
        address: client.address || "",
        city: client.city || "",
        contact: client.contact || "",
        contactPhone: client.contactPhone || "",
        entryDate: client.entryDate || "",
        expectedDischargeDate: client.expectedDischargeDate || "",
        opocCompleted: client.opocCompleted || false,
        phase: client.phase || "phase1",
        phase2AdmissionDate: client.phase2AdmissionDate || "",
        archived: client.archived || false,
        archivedAt: client.archivedAt || "",
        archiveReason: client.archiveReason || "",
        archivedBy: client.archivedBy || "",
        archivedByUid: client.archivedByUid || "",
        archivedByEmail: client.archivedByEmail || "",
        notes: normalizeNotes(client.notes),
        activityHistory: normalizeActivityHistory(client.activityHistory)
      }))
    : [];

  merged.transferHistory = Array.isArray(merged.transferHistory) ? merged.transferHistory.filter(Boolean).map(item => ({
    id:item.id||crypto.randomUUID(), applicantId:item.applicantId||"", residentId:item.residentId||"", applicantName:item.applicantName||"", transferredAt:item.transferredAt||new Date().toISOString(), transferredBy:item.transferredBy||"", undone:Boolean(item.undone), undoneAt:item.undoneAt||"", applicantSnapshot:item.applicantSnapshot&&typeof item.applicantSnapshot==="object"?item.applicantSnapshot:null
  })) : [];

  merged.counselingNotes = normalizeCounselingNotes(merged.counselingNotes);

  merged.verbalWarnings = Array.isArray(merged.verbalWarnings)
    ? merged.verbalWarnings.filter(warning => warning && warning !== "temp").map(warning => ({
        id: warning.id || crypto.randomUUID(),
        date: warning.date || "",
        time: warning.time || "",
        residentId: warning.residentId || "",
        residentName: warning.residentName || "",
        incident: warning.incident || "",
        staffAction: warning.staffAction || "",
        residentResponse: warning.residentResponse || "",
        staffUser: warning.staffUser || "",
        createdAt: warning.createdAt || new Date().toISOString()
      }))
    : [];


  merged.writeUps = Array.isArray(merged.writeUps)
    ? merged.writeUps.filter(item => item && item !== "temp").map(item => ({
        id: item.id || crypto.randomUUID(),
        residentId: item.residentId || "",
        residentName: item.residentName || "Unknown Resident",
        date: item.date || "",
        reason: item.reason || "",
        issuedBy: item.issuedBy || "",
        notes: item.notes || "",
        createdAt: item.createdAt || new Date().toISOString(),
        updatedAt: item.updatedAt || ""
      }))
    : [];

  merged.choreChecks = Array.isArray(merged.choreChecks)
    ? merged.choreChecks.filter(item => item && item !== "temp").map(item => ({
        id: item.id || crypto.randomUUID(),
        date: item.date || "",
        areaId: item.areaId || "",
        areaName: item.areaName || "",
        roomNumber: item.roomNumber || "",
        assignedResident: item.assignedResident || "",
        checkedBy: item.checkedBy || "",
        completedItems: Array.isArray(item.completedItems) ? item.completedItems : [],
        issuesFound: Boolean(item.issuesFound),
        notes: item.notes || "",
        createdAt: item.createdAt || new Date().toISOString(),
        updatedAt: item.updatedAt || ""
      }))
    : [];

  const assignmentSnapshot = merged.choreCheckAssignments && typeof merged.choreCheckAssignments === "object"
    ? merged.choreCheckAssignments
    : {};

  merged.choreCheckAssignments = {
    weekKey: assignmentSnapshot.weekKey || "",
    refreshedAt: assignmentSnapshot.refreshedAt || "",
    choreAssignments: assignmentSnapshot.choreAssignments && typeof assignmentSnapshot.choreAssignments === "object"
      ? assignmentSnapshot.choreAssignments
      : {},
    roomAssignments: assignmentSnapshot.roomAssignments && typeof assignmentSnapshot.roomAssignments === "object"
      ? assignmentSnapshot.roomAssignments
      : {}
  };

  const normalizedPreScreenings = Array.isArray(merged.preScreenings)
    ? merged.preScreenings.filter(item => item && item !== "temp").map(item => ({
        id: item.id || crypto.randomUUID(),
        applicantId: item.applicantId || "",
        applicantName: item.applicantName || "",
        status: item.status || "Not Started",
        workflowStatus: item.workflowStatus || "",
        staffUser: item.staffUser || "",
        staffEmail: item.staffEmail || "",
        staffUid: item.staffUid || "",
        startedAt: item.startedAt || "",
        completedAt: item.completedAt || "",
        updatedAt: item.updatedAt || "",
        step: item.step || "opening",
        answers: item.answers && typeof item.answers === "object" ? item.answers : {},
        outcome: item.outcome || "",
        overallNotes: item.overallNotes || ""
      }))
    : [];

  // Older builds could leave more than one pre-screening for the same applicant. Keep the
  // most recently changed record so refreshes never resurrect an older version.
  const latestPreScreenByApplicant = new Map();
  for (const item of normalizedPreScreenings) {
    const key=item.applicantId || item.id;
    const existing=latestPreScreenByApplicant.get(key);
    const itemTime=new Date(item.updatedAt||item.completedAt||item.startedAt||0).getTime()||0;
    const existingTime=existing ? (new Date(existing.updatedAt||existing.completedAt||existing.startedAt||0).getTime()||0) : -1;
    if(!existing || itemTime>=existingTime) latestPreScreenByApplicant.set(key,item);
  }
  merged.preScreenings = Array.from(latestPreScreenByApplicant.values());

  merged.busPassRecords = Array.isArray(merged.busPassRecords)
    ? merged.busPassRecords.filter(Boolean).map(item => ({
        id: item.id || crypto.randomUUID(),
        residentId: item.residentId || "",
        residentName: item.residentName || "",
        issuedAt: item.issuedAt || new Date().toISOString(),
        destination: item.destination || "",
        passCount: Math.max(1, Number(item.passCount) || 1),
        tripType: item.tripType || "Round Trip",
        staffName: item.staffName || "",
        staffUid: item.staffUid || "",
        staffEmail: item.staffEmail || "",
        notes: item.notes || ""
      }))
    : [];

  merged.incidentReports = Array.isArray(merged.incidentReports)
    ? merged.incidentReports.filter(item => item && item !== "temp").map(item => ({
        id: item.id || crypto.randomUUID(),
        residentId: item.residentId || "",
        residentName: item.residentName || "",
        clientDob: item.clientDob || "",
        roomNumber: item.roomNumber || "",
        admissionDate: item.admissionDate || "",
        incidentDate: item.incidentDate || "",
        incidentTime: item.incidentTime || "",
        incidentLocation: item.incidentLocation || "",
        incidentTypes: Array.isArray(item.incidentTypes) ? item.incidentTypes : [],
        otherIncidentType: item.otherIncidentType || "",
        description: item.description || "",
        immediateActions: Array.isArray(item.immediateActions) ? item.immediateActions : [],
        otherImmediateAction: item.otherImmediateAction || "",
        immediateActionDescription: item.immediateActionDescription || "",
        clientInjured: item.clientInjured || "No",
        clientInjuryDescription: item.clientInjuryDescription || "",
        othersInjured: item.othersInjured || "No",
        othersInjuryDescription: item.othersInjuryDescription || "",
        witnesses: Array.isArray(item.witnesses) ? item.witnesses : [],
        staffName: item.staffName || "",
        staffPosition: item.staffPosition || "",
        staffSignature: item.staffSignature || "",
        reportDate: item.reportDate || "",
        executiveDirectorName: item.executiveDirectorName || "",
        dateReviewed: item.dateReviewed || "",
        followUpRequired: item.followUpRequired || "No",
        executiveFollowUp: item.executiveFollowUp || "",
        executiveDirectorSignature: item.executiveDirectorSignature || "",
        followUpDetails: item.followUpDetails || "",
        status: item.status || "Submitted",
        createdAt: item.createdAt || new Date().toISOString(),
        updatedAt: item.updatedAt || ""
      }))
    : [];

  const rawChartData = merged.chartData && typeof merged.chartData === "object" ? merged.chartData : {};
  merged.chartData = {
    laundry: rawChartData.laundry && typeof rawChartData.laundry === "object" ? rawChartData.laundry : {},
    laundryDate: typeof rawChartData.laundryDate === "string" ? rawChartData.laundryDate : "",
    electronics: rawChartData.electronics && typeof rawChartData.electronics === "object" ? rawChartData.electronics : {},
    meetings: rawChartData.meetings && typeof rawChartData.meetings === "object" ? rawChartData.meetings : {}
  };

  return merged;
}

function normalizeMealSchedule(mealSchedule) {
  const base = defaultMealSchedule();
  const merged = { ...base, ...(mealSchedule || {}) };

  Object.keys(base.weekSchedule).forEach(day => {
    merged.weekSchedule[day] = {
      lunch: merged.weekSchedule?.[day]?.lunch || "",
      supper1: merged.weekSchedule?.[day]?.supper1 || "",
      supper2: merged.weekSchedule?.[day]?.supper2 || ""
    };
  });

  merged.history = Array.isArray(merged.history) ? merged.history : [];
  return merged;
}


let KBRH_LAST_STATE = null;

function kbrhPageName() {
  return window.location.pathname.split("/").pop() || "index.html";
}
function kbrhEntityName(item, fallback="Record") {
  return `${item?.firstName||""} ${item?.lastName||""}`.trim() || item?.residentName || item?.applicantName || item?.name || fallback;
}
function kbrhShort(value, max=90) {
  const text=String(value||"").replace(/\s+/g," ").trim(); return text.length>max?text.slice(0,max-1)+"…":text;
}
function kbrhMapById(list){ return new Map((Array.isArray(list)?list:[]).filter(Boolean).map(x=>[x.id,x])); }
function kbrhChanged(a,b,key){ return JSON.stringify(a?.[key]??null)!==JSON.stringify(b?.[key]??null); }
function kbrhDiffCollection(before,after,key,label,fields=[]) {
  const changes=[]; const bm=kbrhMapById(before?.[key]); const am=kbrhMapById(after?.[key]);
  for(const [id,item] of am){
    const old=bm.get(id); const name=kbrhEntityName(item,label);
    if(!old){changes.push(`Added ${label}: ${name}`); continue;}
    const changed=fields.filter(f=>kbrhChanged(old,item,f));
    if(changed.length) changes.push(`Updated ${label}: ${name} (${changed.join(", ")})`);
    const oldNotes=kbrhMapById(old.notes), newNotes=kbrhMapById(item.notes);
    for(const [nid,note] of newNotes){if(!oldNotes.has(nid))changes.push(`Added note for ${name}: ${kbrhShort(note.text||note.note)}`);}
    for(const nid of oldNotes.keys()){if(!newNotes.has(nid))changes.push(`Deleted note from ${name}`);}
  }
  for(const [id,item] of bm){if(!am.has(id))changes.push(`Removed ${label}: ${kbrhEntityName(item,label)}`);}
  return changes;
}
function describeAppStateChanges(before,after){
  if(!before) return ["Initialized shared application data"];
  let changes=[];
  changes.push(...kbrhDiffCollection(before,after,"roster","resident",["roomNumber","phase","archived","entryDate","expectedDischargeDate","opocCompleted"]));
  changes.push(...kbrhDiffCollection(before,after,"waitlist","applicant",["status","callPriority","archived","dateApplied","callInHistory"]));
  changes.push(...kbrhDiffCollection(before,after,"residents","chore assignment",["choreIndex","lockedChore","exceptions","status","awayUntil"]));
  const simple=[
    ["counselingNotes","counseling note"],["verbalWarnings","verbal warning"],["writeUps","write-up"],["choreChecks","chore check"],["preScreenings","pre-screening"],["incidentReports","incident report"]
  ];
  for(const [key,label] of simple){
    const bm=kbrhMapById(before?.[key]), am=kbrhMapById(after?.[key]);
    for(const [id,item] of am){const old=bm.get(id);const name=kbrhEntityName(item,label);if(!old)changes.push(`Added ${label}: ${name}`);else if(JSON.stringify(old)!==JSON.stringify(item))changes.push(`Updated ${label}: ${name}`);}
    for(const [id,item] of bm){if(!am.has(id))changes.push(`Deleted ${label}: ${kbrhEntityName(item,label)}`);}
  }
  if(JSON.stringify(before.mealSchedule)!==JSON.stringify(after.mealSchedule)) changes.push("Updated meal chore schedule");
  if(JSON.stringify(before.chartData)!==JSON.stringify(after.chartData)) changes.push("Updated charts");
  if(JSON.stringify(before.chores)!==JSON.stringify(after.chores)) changes.push("Updated chore list");
  return [...new Set(changes)].slice(0,30);
}
function stampNewNoteAuthors(before,state,identity){
  for(const key of ["waitlist","roster"]){
    const bm=kbrhMapById(before?.[key]);
    for(const item of (state?.[key]||[])){
      const oldNotes=kbrhMapById(bm.get(item.id)?.notes);
      if(!Array.isArray(item.notes)) continue;
      for(const note of item.notes){
        if(!oldNotes.has(note.id) && (!note.author || note.author==="Unknown")){
          note.author=identity.name; note.authorUid=identity.uid; note.authorEmail=identity.email;
        }
      }
    }
  }
  const simple=[
    ["counselingNotes","author"],["writeUps","issuedBy"],["choreChecks","checkedBy"],["verbalWarnings","staffUser"],["incidentReports","staffName"]
  ];
  for(const [key,field] of simple){const old=kbrhMapById(before?.[key]);for(const rec of (state?.[key]||[])){if(!old.has(rec.id))rec[field]=identity.name;}}
  const psOld=kbrhMapById(before?.preScreenings);for(const rec of (state?.preScreenings||[])){if(!psOld.has(rec.id)||rec.status!==psOld.get(rec.id)?.status){rec.staffUser=identity.name;rec.staffEmail=identity.email;rec.staffUid=identity.uid;}}
}
async function writeAuditEntry(changes,identity){
  if(!changes.length||!identity?.uid)return;
  try{await db.collection("kbrhAudit").add({staffUid:identity.uid,staffName:identity.name,staffEmail:identity.email,page:kbrhPageName(),changes,summary:changes[0]||"Updated application data",timestamp:firebase.firestore.FieldValue.serverTimestamp(),timestampIso:new Date().toISOString()});}
  catch(error){console.warn("Audit log write failed",error);}
}
async function loadAppState() {
  const snap = await APP_DOC_REF().get();
  if (!snap.exists) {
    const initial = defaultAppState();
    await APP_DOC_REF().set(initial, { merge: true });
    KBRH_LAST_STATE = normalizeAppState(initial);
    return KBRH_LAST_STATE;
  }
  KBRH_LAST_STATE = normalizeAppState(snap.data());
  return KBRH_LAST_STATE;
}

async function saveAppState(state) {
  let before = KBRH_LAST_STATE;
  if (!before) {
    const snap = await APP_DOC_REF().get();
    before = snap.exists ? normalizeAppState(snap.data()) : null;
  }
  let identity = {uid:auth.currentUser?.uid||"",email:auth.currentUser?.email||"",name:auth.currentUser?.displayName||auth.currentUser?.email||"Staff User",position:""};
  if (typeof getCurrentStaffIdentity === "function") {
    try { identity = await getCurrentStaffIdentity(); }
    catch (error) { console.warn("Staff identity lookup failed; continuing save with authenticated Firebase identity.", error); }
  }
  stampNewNoteAuthors(before, state, identity);
  const cleaned = normalizeAppState(state);
  cleaned.updatedAt = new Date().toISOString();
  const changes = describeAppStateChanges(before, cleaned);
  await APP_DOC_REF().set(cleaned, { merge: true });
  KBRH_LAST_STATE = normalizeAppState(cleaned);
  await writeAuditEntry(changes, identity);
}

function listenToAppState(callback) {
  return APP_DOC_REF().onSnapshot(async snap => {
    if (!snap.exists) {
      const initial = defaultAppState();
      await APP_DOC_REF().set(initial, { merge: true });
      KBRH_LAST_STATE = normalizeAppState(initial);
      callback(KBRH_LAST_STATE);
      return;
    }
    KBRH_LAST_STATE = normalizeAppState(snap.data());
    callback(KBRH_LAST_STATE);
  });
}

function migrateLocalStorageToFirestore() {
  const local = localStorage.getItem("residentChoreRotator.github.v1");

  if (!local) {
    alert("No local backup data found in this browser.");
    return;
  }

  let parsed;

  try {
    parsed = JSON.parse(local);
  } catch {
    alert("Could not read local browser data.");
    return;
  }

  const confirmed = confirm(
    "This will replace the shared online Firestore data with the data saved in this browser. Continue?"
  );

  if (!confirmed) return;

  loadAppState()
    .then(current => {
      const next = normalizeAppState({
        ...current,
        ...parsed
      });

      return saveAppState(next);
    })
    .then(() => alert("Local browser data migrated to Firestore."))
    .catch(error => {
      console.error(error);
      alert("Migration failed. Check Firebase setup and Firestore permissions.");
    });
}
