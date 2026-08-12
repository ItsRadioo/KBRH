const APP_DOC_REF = () => db.collection("kbrh").doc("choreTracker");

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
    preScreenings: [],
    incidentReports: [],
    chartData: { laundry: {}, electronics: {}, meetings: {} },
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
        notes: normalizeNotes(item.notes),
        callInHistory: Array.isArray(item.callInHistory) ? item.callInHistory : []
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
        notes: normalizeNotes(client.notes)
      }))
    : [];

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

  merged.preScreenings = Array.isArray(merged.preScreenings)
    ? merged.preScreenings.filter(item => item && item !== "temp").map(item => ({
        id: item.id || crypto.randomUUID(),
        applicantId: item.applicantId || "",
        applicantName: item.applicantName || "",
        status: item.status || "Not Started",
        staffUser: item.staffUser || "",
        startedAt: item.startedAt || "",
        completedAt: item.completedAt || "",
        updatedAt: item.updatedAt || "",
        answers: item.answers && typeof item.answers === "object" ? item.answers : {},
        outcome: item.outcome || "",
        overallNotes: item.overallNotes || ""
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

async function loadAppState() {
  const snap = await APP_DOC_REF().get();

  if (!snap.exists) {
    const initial = defaultAppState();
    await saveAppState(initial);
    return initial;
  }

  return normalizeAppState(snap.data());
}

async function saveAppState(state) {
  const cleaned = normalizeAppState(state);
  cleaned.updatedAt = new Date().toISOString();

  await APP_DOC_REF().set(cleaned, { merge: true });
}

function listenToAppState(callback) {
  return APP_DOC_REF().onSnapshot(async snap => {
    if (!snap.exists) {
      const initial = defaultAppState();
      await saveAppState(initial);
      callback(initial);
      return;
    }

    callback(normalizeAppState(snap.data()));
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
