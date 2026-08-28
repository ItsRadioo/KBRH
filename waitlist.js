let waitlistState = defaultAppState();
let editingApplicantId = null;
let notesApplicantId = null;
let callInApplicantId = null;
let pendingCallInStatus = null;
let actionsApplicantId = null;
let positionApplicantId = null;
let priorityOrderSavePending = false;

const COMPACT_WAITLIST_COLUMNS_STORAGE_KEY = "kbrh.waitlist.compactColumns.v1";
const ACTIVE_COMPACT_COLUMN_DEFS = [
  { key: "position", label: "#" }, { key: "applicant", label: "Applicant", required: true },
  { key: "contact", label: "Contact" }, { key: "city", label: "City" },
  { key: "dateApplied", label: "Date Applied" }, { key: "lastCallIn", label: "Last Call-In" },
  { key: "status", label: "Status" }, { key: "info", label: "Info" },
  { key: "actions", label: "Actions", required: true }
];
const ARCHIVED_COMPACT_COLUMN_DEFS = [
  { key: "position", label: "#" }, { key: "applicant", label: "Applicant", required: true },
  { key: "contact", label: "Contact" }, { key: "city", label: "City" },
  { key: "dateApplied", label: "Date Applied" }, { key: "archivedAt", label: "Archived" },
  { key: "reason", label: "Reason" }, { key: "status", label: "Status" },
  { key: "info", label: "Info" }, { key: "actions", label: "Actions", required: true }
];
const DEFAULT_ACTIVE_COMPACT_COLUMNS = ["position", "applicant", "status", "info", "actions"];
const DEFAULT_ARCHIVED_COMPACT_COLUMNS = ["position", "applicant", "status", "info", "actions"];

function sanitizeCompactColumns(value, definitions, defaults) {
  const allowed = new Set(definitions.map(column => column.key));
  const required = definitions.filter(column => column.required).map(column => column.key);
  const requested = Array.isArray(value) ? value.filter(key => allowed.has(key)) : [];
  const selected = requested.length ? requested : [...defaults];
  required.forEach(key => { if (!selected.includes(key)) selected.push(key); });
  return definitions.map(column => column.key).filter(key => selected.includes(key));
}
function loadCompactWaitlistColumnPreferences() {
  let stored = {};
  try { stored = JSON.parse(localStorage.getItem(COMPACT_WAITLIST_COLUMNS_STORAGE_KEY) || "{}"); }
  catch (error) { console.warn("Could not read compact waitlist column preferences:", error); }
  return {
    active: sanitizeCompactColumns(stored.active, ACTIVE_COMPACT_COLUMN_DEFS, DEFAULT_ACTIVE_COMPACT_COLUMNS),
    archived: sanitizeCompactColumns(stored.archived, ARCHIVED_COMPACT_COLUMN_DEFS, DEFAULT_ARCHIVED_COMPACT_COLUMNS)
  };
}
let compactWaitlistColumnPreferences = loadCompactWaitlistColumnPreferences();
function saveCompactWaitlistColumnPreferences() { localStorage.setItem(COMPACT_WAITLIST_COLUMNS_STORAGE_KEY, JSON.stringify(compactWaitlistColumnPreferences)); }
function renderCompactColumnOptions() {
  const renderGroup = (containerId, groupName, definitions) => {
    const container = document.getElementById(containerId); if (!container) return;
    const selected = compactWaitlistColumnPreferences[groupName];
    container.innerHTML = definitions.map(column => `<label class="compact-column-option ${column.required ? "compact-column-required" : ""}"><input type="checkbox" data-compact-column-group="${groupName}" data-compact-column-key="${column.key}" ${selected.includes(column.key) ? "checked" : ""} ${column.required ? "disabled" : ""}/><span>${escapeHtml(column.label)}</span>${column.required ? "<small>Required</small>" : ""}</label>`).join("");
  };
  renderGroup("activeCompactColumnOptions", "active", ACTIVE_COMPACT_COLUMN_DEFS);
  renderGroup("archivedCompactColumnOptions", "archived", ARCHIVED_COMPACT_COLUMN_DEFS);
}
function updateCompactColumnPreference(groupName, key, checked) {
  const definitions = groupName === "archived" ? ARCHIVED_COMPACT_COLUMN_DEFS : ACTIVE_COMPACT_COLUMN_DEFS;
  const defaults = groupName === "archived" ? DEFAULT_ARCHIVED_COMPACT_COLUMNS : DEFAULT_ACTIVE_COMPACT_COLUMNS;
  const current = new Set(compactWaitlistColumnPreferences[groupName]);
  checked ? current.add(key) : current.delete(key);
  compactWaitlistColumnPreferences[groupName] = sanitizeCompactColumns([...current], definitions, defaults);
  saveCompactWaitlistColumnPreferences(); renderCompactColumnOptions(); renderCompactActiveWaitlist(); renderCompactArchivedWaitlist();
}
function resetCompactColumns(groupName) {
  compactWaitlistColumnPreferences[groupName] = groupName === "archived" ? [...DEFAULT_ARCHIVED_COMPACT_COLUMNS] : [...DEFAULT_ACTIVE_COMPACT_COLUMNS];
  saveCompactWaitlistColumnPreferences(); renderCompactColumnOptions(); renderCompactActiveWaitlist(); renderCompactArchivedWaitlist();
}
function renderCompactHeader(headerId, definitions, selectedColumns) {
  const header = document.getElementById(headerId); if (!header) return;
  header.innerHTML = selectedColumns.map(key => `<th>${escapeHtml(definitions.find(column => column.key === key)?.label || key)}</th>`).join("");
}

function getInputValue(id) {
  const input = document.getElementById(id);

  if (!input) {
    alert(`Missing field: ${id}`);
    throw new Error(`Missing field: ${id}`);
  }

  return input.value.trim();
}

function todayDateString() {
  return new Date().toISOString().slice(0, 10);
}

function formatPhoneNumber(value) {
  const digits = String(value || "").replace(/\D/g, "");

  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }

  return String(value || "");
}

async function saveWaitlist() {
  try {
    // Persist the waitlist directly instead of rewriting the entire shared app
    // document. This prevents another live page/state snapshot from restoring
    // an older array order while a manual position change is being saved.
    const active = resequenceActiveWaitlist(getActiveWaitlist());
    const archived = getArchivedWaitlist();
    waitlistState.waitlist = [...active, ...archived];

    const cleanedWaitlist = normalizeAppState({ waitlist: waitlistState.waitlist }).waitlist;
    await APP_DOC_REF().update({
      waitlist: cleanedWaitlist,
      updatedAt: new Date().toISOString()
    });

    // Keep the shared in-memory baseline synchronized with the successful write.
    if (typeof KBRH_LAST_STATE !== "undefined" && KBRH_LAST_STATE) {
      KBRH_LAST_STATE = normalizeAppState({ ...KBRH_LAST_STATE, waitlist: cleanedWaitlist });
    }
  } catch (error) {
    console.error("Waitlist save failed:", error);
    alert(`Could not save waitlist${error?.code ? ` (${error.code})` : ""}. Check Console for details.`);
  }
}

function normalizeWaitlistNotes(notes) {
  if (Array.isArray(notes)) return notes;

  if (notes) {
    return [{
      id: crypto.randomUUID(),
      text: String(notes),
      createdAt: new Date().toISOString()
    }];
  }

  return [];
}

function getActiveWaitlist() {
  const active = Array.isArray(waitlistState.waitlist)
    ? waitlistState.waitlist.filter(item => item && item !== "temp" && !item.archived)
    : [];

  // waitlistPosition is the persistent source of truth for manual ordering.
  // Older records without a position keep their existing array order and are
  // assigned positions the next time the waitlist is saved/resequenced.
  return active
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const ap = Number(a.item.waitlistPosition);
      const bp = Number(b.item.waitlistPosition);
      const aValid = Number.isFinite(ap) && ap > 0;
      const bValid = Number.isFinite(bp) && bp > 0;
      if (aValid && bValid && ap !== bp) return ap - bp;
      if (aValid !== bValid) return aValid ? -1 : 1;
      return a.index - b.index;
    })
    .map(entry => entry.item);
}

function getArchivedWaitlist() {
  return Array.isArray(waitlistState.waitlist)
    ? waitlistState.waitlist.filter(item => item && item !== "temp" && item.archived)
    : [];
}

function resequenceActiveWaitlist(activeList = getActiveWaitlist()) {
  activeList.forEach((item, index) => {
    item.waitlistPosition = index + 1;
  });
  return activeList;
}

function nextWaitlistPosition() {
  const active = getActiveWaitlist();
  if (!active.length) return 1;
  return Math.max(...active.map((item, index) => {
    const value = Number(item.waitlistPosition);
    return Number.isFinite(value) && value > 0 ? value : index + 1;
  })) + 1;
}

function getActiveOrderSnapshot() {
  return getActiveWaitlist().map(item => item.id);
}

function restoreActiveOrder(orderSnapshot) {
  if (!Array.isArray(orderSnapshot) || !orderSnapshot.length) return false;

  const active = getActiveWaitlist();
  const archived = getArchivedWaitlist();

  const activeById = new Map(active.map(item => [item.id, item]));
  const ordered = [];

  orderSnapshot.forEach(id => {
    if (activeById.has(id)) {
      ordered.push(activeById.get(id));
      activeById.delete(id);
    }
  });

  activeById.forEach(item => ordered.push(item));

  waitlistState.waitlist = [...ordered, ...archived];
  return true;
}

function getCallPriority(item) {
  const stored = String(item?.callPriority || "").trim().toLowerCase();

  if (stored === "normal" || stored === "late" || stored === "nocall") {
    return stored;
  }

  const last = item?.callInHistory?.[0];
  const status = normalizeCallInStatus(last);

  if (status === "Call In") return "normal";
  if (status === "Late Call") return "late";
  if (status === "No Call") return "nocall";

  return "normal";
}

function rebuildWaitlist(activeList, archivedList) {
  resequenceActiveWaitlist(activeList);
  waitlistState.waitlist = [...activeList, ...archivedList];
}

function priorityRank(item) {
  const priority = getCallPriority(item);
  if (priority === "late") return 1;
  if (priority === "nocall") return 2;
  return 0;
}

/**
 * Keeps the active waitlist in three stable groups:
 *   1. Call In / not yet called
 *   2. Late Call
 *   3. No Call
 *
 * The sort is stable, so applicants remain in the exact order they were
 * placed inside their own group.
 */
function enforceCallPriorityOrder() {
  const active = getActiveWaitlist();
  const archived = getArchivedWaitlist();
  const before = active.map(item => item.id).join("|");

  const calledIn = [];
  const late = [];
  const noCall = [];

  active.forEach(item => {
    const priority = getCallPriority(item);
    item.callPriority = priority;

    if (priority === "late") {
      late.push(item);
    } else if (priority === "nocall") {
      noCall.push(item);
    } else {
      calledIn.push(item);
    }
  });

  const ordered = [...calledIn, ...late, ...noCall];
  const after = ordered.map(item => item.id).join("|");
  rebuildWaitlist(ordered, archived);

  return before !== after;
}

/**
 * Moves an applicant to the end of their current call-in group.
 * This preserves the order staff assign each Call In, Late Call, or No Call.
 */
function moveApplicantToEndOfPriorityGroup(applicantId) {
  const active = getActiveWaitlist();
  const archived = getArchivedWaitlist();
  const currentIndex = active.findIndex(item => item.id === applicantId);

  if (currentIndex === -1) return;

  const [applicant] = active.splice(currentIndex, 1);
  const rank = priorityRank(applicant);

  let insertAt = active.length;

  if (rank === 0) {
    const firstLowerPriority = active.findIndex(item => priorityRank(item) > 0);
    insertAt = firstLowerPriority === -1 ? active.length : firstLowerPriority;
  } else if (rank === 1) {
    const firstNoCall = active.findIndex(item => priorityRank(item) === 2);
    insertAt = firstNoCall === -1 ? active.length : firstNoCall;
  }

  active.splice(insertAt, 0, applicant);
  rebuildWaitlist(active, archived);
  enforceCallPriorityOrder();
}

function addWaitlistApplicant() {
  waitlistState.waitlist = Array.isArray(waitlistState.waitlist)
    ? waitlistState.waitlist.filter(item => item && item !== "temp")
    : [];

  const initialNote = getInputValue("notes");

  const applicant = {
    id: crypto.randomUUID(),
    lastName: getInputValue("lastName"),
    firstName: getInputValue("firstName"),
    contact: formatPhoneNumber(getInputValue("contact")),
    status: getInputValue("status") || "N/A",
    city: getInputValue("city"),
    dateApplied: getInputValue("dateApplied"),
    archived: false,
    archivedAt: "",
    archiveReason: "",
    callPriority: "normal",
    waitlistPosition: nextWaitlistPosition(),
    notes: initialNote
      ? [{
          id: crypto.randomUUID(),
          text: initialNote,
          createdAt: new Date().toISOString()
        }]
      : [],
    callInHistory: []
  };

  if (!applicant.lastName || !applicant.firstName) {
    alert("Enter at least a first and last name.");
    return;
  }

  waitlistState.waitlist.push(applicant);
  clearWaitlistForm();
  renderWaitlist();
  saveWaitlist();
}

function clearWaitlistForm() {
  ["lastName", "firstName", "contact", "status", "city", "dateApplied", "notes"].forEach(id => {
    const input = document.getElementById(id);
    if (input) input.value = id === "status" ? "N/A" : "";
  });
}

function startInlineEdit(applicantId) {
  editingApplicantId = applicantId;
  renderWaitlist();
}

function cancelInlineEdit() {
  editingApplicantId = null;
  renderWaitlist();
}

function saveInlineEdit(applicantId) {
  const applicant = waitlistState.waitlist.find(item => item.id === applicantId);
  if (!applicant) return;

  applicant.lastName = getInputValue(`editLastName-${applicantId}`);
  applicant.firstName = getInputValue(`editFirstName-${applicantId}`);
  applicant.contact = formatPhoneNumber(getInputValue(`editContact-${applicantId}`));
  const previousStatus = applicant.status || "N/A";
  const newStatus = getInputValue(`editStatus-${applicantId}`) || "N/A";
  applicant.status = newStatus;
  applicant.city = getInputValue(`editCity-${applicantId}`);
  applicant.dateApplied = getInputValue(`editDateApplied-${applicantId}`);

  if (newStatus === "Offer Given" && previousStatus !== "Offer Given") {
    const offerNote = prompt("Enter a note about the offer given:");
    if (offerNote === null || !offerNote.trim()) {
      alert("A note is required when Offer Given is selected.");
      applicant.status = previousStatus;
      renderWaitlist();
      return;
    }
    applicant.notes = normalizeWaitlistNotes(applicant.notes);
    applicant.notes.unshift({
      id: crypto.randomUUID(),
      author: typeof currentStaffName === "function" ? currentStaffName() : (auth.currentUser?.email || "Unknown"),
      text: `Offer Given: ${offerNote.trim()}`,
      createdAt: new Date().toISOString()
    });
  }

  editingApplicantId = null;
  renderWaitlist();
  saveWaitlist();
}

async function moveToRoster(applicantId) {
  const applicantIndex = waitlistState.waitlist.findIndex(item => item.id === applicantId);
  if (applicantIndex === -1) return;

  const applicant = waitlistState.waitlist[applicantIndex];

  waitlistState.roster = Array.isArray(waitlistState.roster)
    ? waitlistState.roster.filter(client => client && client !== "temp")
    : [];

  if (!confirm(`Move ${applicant.firstName} ${applicant.lastName} to Current Roster?`)) return;

  const transferNote = {
    id: crypto.randomUUID(),
    author: typeof currentStaffName === "function" ? currentStaffName() : (auth.currentUser?.email || "Unknown"),
    text: `Transferred from waitlist on ${new Date().toLocaleDateString("en-CA")}.`,
    createdAt: new Date().toISOString()
  };

  const newResident = {
    id: crypto.randomUUID(),
    roomNumber: "",
    clientId: "",
    firstName: applicant.firstName || "",
    lastName: applicant.lastName || "",
    dob: "",
    phone: formatPhoneNumber(applicant.contact || ""),
    address: "",
    city: applicant.city || "",
    contact: "",
    contactPhone: "",
    entryDate: "",
    expectedDischargeDate: "",
    originalApplicationDate: applicant.originalApplicationDate || applicant.dateApplied || "",
    waitlistSourceId: applicant.id,
    phase: "phase1",
    phase2AdmissionDate: "",
    archived: false,
    archivedAt: "",
    archiveReason: "",
    notes: [transferNote, ...normalizeWaitlistNotes(applicant.notes)]
  };

  const previousWaitlist = [...waitlistState.waitlist];
  const previousRoster = [...waitlistState.roster];

  // Moving to roster is a transfer, not an archive. Remove the applicant from
  // the waitlist entirely so they do not appear under Archived Applicants.
  waitlistState.waitlist.splice(applicantIndex, 1);
  waitlistState.roster.push(newResident);

  try {
    const active = resequenceActiveWaitlist(getActiveWaitlist());
    const archived = getArchivedWaitlist();
    const cleanedWaitlist = normalizeAppState({ waitlist: [...active, ...archived] }).waitlist;
    const cleanedRoster = normalizeAppState({ roster: waitlistState.roster }).roster;

    await APP_DOC_REF().update({
      waitlist: cleanedWaitlist,
      roster: cleanedRoster,
      updatedAt: new Date().toISOString()
    });

    waitlistState.waitlist = cleanedWaitlist;
    waitlistState.roster = cleanedRoster;

    if (typeof KBRH_LAST_STATE !== "undefined" && KBRH_LAST_STATE) {
      KBRH_LAST_STATE = normalizeAppState({
        ...KBRH_LAST_STATE,
        waitlist: cleanedWaitlist,
        roster: cleanedRoster
      });
    }

    renderWaitlist();
  } catch (error) {
    console.error("Move to roster failed:", error);
    waitlistState.waitlist = previousWaitlist;
    waitlistState.roster = previousRoster;
    renderWaitlist();
    alert(`Could not move applicant to roster${error?.code ? ` (${error.code})` : ""}. No changes were saved.`);
  }
}

function openApplicantActionsModal(applicantId) {
  const applicant = waitlistState.waitlist.find(item => item.id === applicantId);
  if (!applicant) return;

  actionsApplicantId = applicantId;
  document.getElementById("applicantActionsName").textContent =
    `${applicant.firstName || ""} ${applicant.lastName || ""}`.trim();

  const undoButton = document.getElementById("undoLastCallInActionBtn");
  if (undoButton) {
    const canUndo = Array.isArray(applicant.callInHistory) && applicant.callInHistory.length > 0;
    undoButton.hidden = !canUndo;
  }

  document.getElementById("applicantActionsModal")?.classList.remove("hidden");
  document.body.classList.add("kbrh-modal-open");
}

function closeApplicantActionsModal() {
  actionsApplicantId = null;
  document.getElementById("applicantActionsModal")?.classList.add("hidden");
  document.body.classList.remove("kbrh-modal-open");
}

function selectApplicantAction(action) {
  const applicantId = actionsApplicantId;
  if (!applicantId || !action) return;

  closeApplicantActionsModal();
  handleApplicantAction(applicantId, action);
}

function openPositionModal(applicantId) {
  const active = getActiveWaitlist();
  const currentIndex = active.findIndex(item => item.id === applicantId);
  if (currentIndex === -1) return;

  const applicant = active[currentIndex];
  positionApplicantId = applicantId;

  document.getElementById("positionApplicantName").textContent =
    `${applicant.firstName || ""} ${applicant.lastName || ""}`.trim();

  const input = document.getElementById("positionNumberInput");
  input.min = "1";
  input.max = String(active.length);
  input.value = String(currentIndex + 1);

  document.getElementById("positionRangeHint").textContent =
    `Enter a position from 1 to ${active.length}.`;

  document.getElementById("positionModal")?.classList.remove("hidden");
  document.body.classList.add("kbrh-modal-open");
  setTimeout(() => { input.focus(); input.select(); }, 0);
}

function closePositionModal() {
  positionApplicantId = null;
  document.getElementById("positionModal")?.classList.add("hidden");
  document.body.classList.remove("kbrh-modal-open");
}

function savePositionChange() {
  const active = getActiveWaitlist();
  const archived = getArchivedWaitlist();
  const currentIndex = active.findIndex(item => item.id === positionApplicantId);
  if (currentIndex === -1) return;

  const input = document.getElementById("positionNumberInput");
  const requestedPosition = Number.parseInt(input.value, 10);

  if (!Number.isInteger(requestedPosition) || requestedPosition < 1 || requestedPosition > active.length) {
    alert(`Enter a position from 1 to ${active.length}.`);
    input.focus();
    return;
  }

  const [applicant] = active.splice(currentIndex, 1);
  active.splice(requestedPosition - 1, 0, applicant);
  rebuildWaitlist(active, archived);

  // Manual positioning is an explicit staff override of the automatic
  // call-in grouping. Do not immediately re-sort the list here; the exact
  // order staff choose is persisted to Firestore. A later Call-In / Late
  // Call / No Call update may move that applicant again according to the
  // call-in workflow.
  closePositionModal();
  renderWaitlist();
  saveWaitlist();
}

function handleApplicantAction(applicantId, action) {
  if (!action) return;

  if (action === "edit") startInlineEdit(applicantId);
  if (action === "changePosition") openPositionModal(applicantId);
  if (action === "archive") archiveApplicant(applicantId);
  if (action === "moveToRoster") moveToRoster(applicantId);
  if (action === "undoCallIn") undoLastCallIn(applicantId);
  if (action === "delete") deleteApplicant(applicantId);
}

function handleArchivedApplicantAction(applicantId, action) {
  if (!action) return;

  if (action === "reinstate") reinstateApplicant(applicantId);
  if (action === "delete") deleteApplicant(applicantId);
}

function normalizeCallInStatus(record) {
  if (!record) return "";

  const result = String(record.result || "").trim().toLowerCase();
  const reason = String(record.reason || "").trim().toLowerCase();

  if (result === "call in" || result === "yes") return "Call In";
  if (result === "late call" || reason === "called late" || reason === "late call") return "Late Call";
  if (result === "no call" || reason === "no call") return "No Call";

  return record.result || record.reason || "";
}

function getConsecutiveNoCallCount(item) {
  const history = Array.isArray(item.callInHistory) ? item.callInHistory : [];
  let count = 0;

  for (const record of history) {
    if (normalizeCallInStatus(record) === "No Call") {
      count += 1;
    } else {
      break;
    }
  }

  return count;
}

function setDefaultCallInDateTime() {
  const now = new Date();
  const pad = value => String(value).padStart(2, "0");
  const dateValue = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const timeValue = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  const dateInput = document.getElementById("callInDateInput");
  const timeInput = document.getElementById("callInTimeInput");
  if (dateInput) dateInput.value = dateValue;
  if (timeInput) timeInput.value = timeValue;
}

function showCallInDateTimeStep(selected) {
  pendingCallInStatus = selected;
  document.getElementById("callInStatusChoices")?.classList.add("hidden");
  document.getElementById("callInDateTimePanel")?.classList.remove("hidden");
  document.getElementById("callInDateTimeError")?.classList.add("hidden");
  const title = document.getElementById("callInDateTimeTitle");
  if (title) title.textContent = selected === "Late Call" ? "Late Call Date & Time" : "Call-In Date & Time";
  const saveBtn = document.getElementById("saveCallInDateTimeBtn");
  if (saveBtn) saveBtn.textContent = selected === "Late Call" ? "Save Late Call" : "Save Call-In";
  setDefaultCallInDateTime();
}

function resetCallInModalStep() {
  pendingCallInStatus = null;
  document.getElementById("callInStatusChoices")?.classList.remove("hidden");
  document.getElementById("callInDateTimePanel")?.classList.add("hidden");
  document.getElementById("callInDateTimeError")?.classList.add("hidden");
}

function openCallInModal(applicantId) {
  const applicant = waitlistState.waitlist.find(item => item.id === applicantId);
  if (!applicant) return;

  callInApplicantId = applicantId;
  resetCallInModalStep();
  document.getElementById("callInApplicantName").textContent =
    `${applicant.firstName || ""} ${applicant.lastName || ""}`.trim();

  document.getElementById("callInModal")?.classList.remove("hidden");
  document.body.classList.add("kbrh-modal-open");
}

function closeCallInModal() {
  callInApplicantId = null;
  pendingCallInStatus = null;
  document.getElementById("callInModal")?.classList.add("hidden");
  document.body.classList.remove("kbrh-modal-open");
}

function saveCallInStatus(selected, recordedAt = null) {
  const applicant = waitlistState.waitlist.find(item => item.id === callInApplicantId);
  if (!applicant || !selected) return;

  const eventDate = recordedAt instanceof Date && !Number.isNaN(recordedAt.getTime())
    ? recordedAt
    : new Date();
  const previousPosition = Number(applicant.waitlistPosition) || null;
  const previousActiveOrder = getActiveOrderSnapshot();

  applicant.callInHistory = Array.isArray(applicant.callInHistory) ? applicant.callInHistory : [];
  applicant.callInHistory.unshift({
    id: crypto.randomUUID(),
    result: selected,
    reason: "",
    details: "",
    previousActiveOrder,
    timestamp: eventDate.toLocaleString(),
    createdAt: eventDate.toISOString()
  });

  if (selected === "Call In") {
    applicant.callPriority = "normal";
    // A Call In is a status/history update only. It must NEVER change the
    // applicant's manually assigned waitlist position, regardless of the
    // day/time being recorded.
    if (previousPosition !== null) applicant.waitlistPosition = previousPosition;
  } else if (selected === "Late Call") {
    applicant.callPriority = "late";
    moveApplicantToEndOfPriorityGroup(applicant.id);
  } else {
    applicant.callPriority = "nocall";
    moveApplicantToEndOfPriorityGroup(applicant.id);
  }

  closeCallInModal();
  renderWaitlist();
  saveWaitlist();
}

function savePendingCallInDateTime() {
  if (!pendingCallInStatus) return;
  const dateValue = document.getElementById("callInDateInput")?.value || "";
  const timeValue = document.getElementById("callInTimeInput")?.value || "";
  const error = document.getElementById("callInDateTimeError");

  if (!dateValue || !timeValue) {
    error?.classList.remove("hidden");
    return;
  }

  const recordedAt = new Date(`${dateValue}T${timeValue}`);
  if (Number.isNaN(recordedAt.getTime())) {
    error?.classList.remove("hidden");
    return;
  }

  saveCallInStatus(pendingCallInStatus, recordedAt);
}

function openNotes(applicantId) {
  const applicant = waitlistState.waitlist.find(item => item.id === applicantId);
  if (!applicant) return;

  notesApplicantId = applicantId;
  applicant.notes = normalizeWaitlistNotes(applicant.notes);

  document.getElementById("notesModalTitle").textContent =
    `Notes — ${applicant.firstName || ""} ${applicant.lastName || ""}`.trim();

  document.getElementById("newWaitlistNoteText").value = "";

  renderNotesModal(applicant);
  document.getElementById("notesModal").classList.remove("hidden");
}

function closeNotesModal() {
  notesApplicantId = null;
  document.getElementById("notesModal").classList.add("hidden");
}

function addWaitlistNote() {
  const applicant = waitlistState.waitlist.find(item => item.id === notesApplicantId);
  if (!applicant) return;

  const text = getInputValue("newWaitlistNoteText");

  if (!text) {
    alert("Enter a note first.");
    return;
  }

  applicant.notes = normalizeWaitlistNotes(applicant.notes);

  applicant.notes.unshift({
    id: crypto.randomUUID(),
    author: typeof currentStaffName === "function" ? currentStaffName() : (auth.currentUser?.email || "Unknown"),
    text,
    createdAt: new Date().toISOString()
  });

  document.getElementById("newWaitlistNoteText").value = "";

  renderNotesModal(applicant);
  renderWaitlist();
  saveWaitlist();
}

function deleteWaitlistNote(noteId) {
  const applicant = waitlistState.waitlist.find(item => item.id === notesApplicantId);
  if (!applicant) return;

  if (!confirm("Delete this note?")) return;

  applicant.notes = normalizeWaitlistNotes(applicant.notes).filter(note => note.id !== noteId);

  renderNotesModal(applicant);
  renderWaitlist();
  saveWaitlist();
}

function renderNotesModal(applicant) {
  const list = document.getElementById("waitlistNotesList");
  if (!list) return;

  const notes = normalizeWaitlistNotes(applicant.notes);

  list.innerHTML = notes.length
    ? notes.map(note => `
        <li class="note-item">
          <div>
            <div>• ${escapeHtml(note.text)}</div>
            <small>${escapeHtml(formatDateTime(note.createdAt))}</small>
          </div>
          <button type="button" class="danger" onclick="deleteWaitlistNote('${note.id}')">Delete</button>
        </li>
      `).join("")
    : `<li class="empty">No notes yet.</li>`;
}

function undoLastCallIn(applicantId) {
  const applicant = waitlistState.waitlist.find(item => item.id === applicantId);
  if (!applicant || !Array.isArray(applicant.callInHistory) || !applicant.callInHistory.length) return;

  const lastRecord = applicant.callInHistory[0];

  if (!confirm(`Undo the last call-in record for ${applicant.firstName} ${applicant.lastName}?`)) return;

  applicant.callInHistory.shift();
  applicant.callPriority = getCallPriority({ ...applicant, callPriority: "" });

  if (lastRecord.previousActiveOrder) {
    restoreActiveOrder(lastRecord.previousActiveOrder);
  }

  renderWaitlist();
  saveWaitlist();
}

function archiveApplicant(applicantId) {
  const applicant = waitlistState.waitlist.find(item => item.id === applicantId);
  if (!applicant) return;

  const reason = prompt("Archive reason:", "Removed from active waitlist");
  if (reason === null) return;

  if (!confirm(`Archive ${applicant.firstName} ${applicant.lastName}?`)) return;

  applicant.archived = true;
  applicant.archivedAt = new Date().toISOString();
  applicant.archiveReason = reason.trim();

  renderWaitlist();
  saveWaitlist();
}

function reinstateApplicant(applicantId) {
  const applicantIndex = waitlistState.waitlist.findIndex(item => item.id === applicantId);
  if (applicantIndex === -1) return;

  const applicant = waitlistState.waitlist[applicantIndex];

  if (!confirm(`Reinstate ${applicant.firstName} ${applicant.lastName} to the bottom of the waitlist?`)) return;

  applicant.archived = false;
  applicant.archivedAt = "";
  applicant.archiveReason = "";
  applicant.callPriority = "normal";
  applicant.waitlistPosition = nextWaitlistPosition();

  waitlistState.waitlist.splice(applicantIndex, 1);
  waitlistState.waitlist.push(applicant);

  renderWaitlist();
  saveWaitlist();
}

function deleteApplicant(applicantId) {
  const applicant = waitlistState.waitlist.find(item => item.id === applicantId);
  if (!applicant) return;

  if (!confirm(`Permanently delete ${applicant.firstName} ${applicant.lastName}? This cannot be undone.`)) return;

  waitlistState.waitlist = waitlistState.waitlist.filter(item => item.id !== applicantId);

  renderWaitlist();
  saveWaitlist();
}

function getLastCallText(item) {
  const last = item.callInHistory?.[0];
  if (!last) return "No call-in recorded.";

  const status = normalizeCallInStatus(last) || "Call-In Updated";
  const dateText = last.createdAt ? formatDateTime(last.createdAt) : String(last.timestamp || "");
  return dateText ? `${status} — ${dateText}` : status;
}

function renderWaitlist() {
  document.body.classList.toggle("waitlist-editing-active", Boolean(editingApplicantId));
  renderActiveWaitlist();
  renderCompactActiveWaitlist();
  renderArchivedWaitlist();
  renderCompactArchivedWaitlist();
}

function getWaitlistStatusClass(item) {
  const noCallCount = getConsecutiveNoCallCount(item);
  return item.status === "Offer Given"
    ? "waitlist-offer-row"
    : item.status === "Incarcerated"
      ? "waitlist-incarcerated-row"
      : noCallCount >= 2
        ? "waitlist-follow-up-row"
        : "";
}

function applicantDisplayStatus(item) {
  const noCallCount = getConsecutiveNoCallCount(item);
  if (noCallCount >= 2) return `No Call (${noCallCount})`;
  const prescreen = Array.isArray(waitlistState.preScreenings)
    ? waitlistState.preScreenings.find(record => record.applicantId === item.id)
    : null;
  if (item.status === "Offer Given" && prescreen?.status === "Completed") return "Offer Given · Pre-Screened ✓";
  return item.status || "N/A";
}

function activeCompactCell(item, index, key) {
  const fullName = `${item.firstName || ""} ${item.lastName || ""}`.trim() || "Unnamed Applicant";
  const cells = {
    position: `<td>${index + 1}</td>`,
    applicant: `<td class="compact-applicant-cell"><strong>${escapeHtml(fullName)}</strong><span>${escapeHtml(item.contact || item.city || "No contact listed")}</span></td>`,
    contact: `<td class="phone-cell">${escapeHtml(item.contact || "—")}</td>`,
    city: `<td>${escapeHtml(item.city || "—")}</td>`,
    dateApplied: `<td>${escapeHtml(item.dateApplied || "—")}</td>`,
    lastCallIn: `<td>${escapeHtml(getLastCallText(item))}</td>`,
    status: `<td>${escapeHtml(applicantDisplayStatus(item))}</td>`,
    info: `<td><button type="button" class="secondary compact-info-button" onclick="openApplicantInfoModal('${item.id}')">Display Info</button></td>`,
    actions: `<td><button type="button" class="actions-button" onclick="openApplicantActionsModal('${item.id}')">Actions</button></td>`
  };
  return cells[key] || "";
}
function archivedCompactCell(item, index, key) {
  const fullName = `${item.firstName || ""} ${item.lastName || ""}`.trim() || "Unnamed Applicant";
  const cells = {
    position: `<td>${index + 1}</td>`,
    applicant: `<td class="compact-applicant-cell"><strong>${escapeHtml(fullName)}</strong><span>${escapeHtml(item.archiveReason || "Archived applicant")}</span></td>`,
    contact: `<td class="phone-cell">${escapeHtml(item.contact || "—")}</td>`,
    city: `<td>${escapeHtml(item.city || "—")}</td>`,
    dateApplied: `<td>${escapeHtml(item.dateApplied || "—")}</td>`,
    archivedAt: `<td>${escapeHtml(formatDateTime(item.archivedAt) || "—")}</td>`,
    reason: `<td>${escapeHtml(item.archiveReason || "—")}</td>`,
    status: `<td>${escapeHtml(applicantDisplayStatus(item))}</td>`,
    info: `<td><button type="button" class="secondary compact-info-button" onclick="openApplicantInfoModal('${item.id}')">Display Info</button></td>`,
    actions: `<td><select aria-label="Archived applicant actions" onchange="handleArchivedApplicantAction('${item.id}', this.value); this.value='';"><option value="">Actions</option><option value="reinstate">Reinstate</option><option value="delete">Delete</option></select></td>`
  };
  return cells[key] || "";
}
function renderCompactActiveWaitlist() {
  const body = document.getElementById("compactWaitlistBody"); if (!body) return;
  const columns = compactWaitlistColumnPreferences.active;
  renderCompactHeader("compactWaitlistHeader", ACTIVE_COMPACT_COLUMN_DEFS, columns);
  const waitlist = getActiveWaitlist();
  body.innerHTML = waitlist.length ? waitlist.map((item, index) => `<tr class="${getWaitlistStatusClass(item)}">${columns.map(key => activeCompactCell(item, index, key)).join("")}</tr>`).join("") : `<tr><td colspan="${columns.length}" class="empty">No active applicants on the waitlist.</td></tr>`;
}
function renderCompactArchivedWaitlist() {
  const body = document.getElementById("compactArchivedWaitlistBody"); if (!body) return;
  const columns = compactWaitlistColumnPreferences.archived;
  renderCompactHeader("compactArchivedWaitlistHeader", ARCHIVED_COMPACT_COLUMN_DEFS, columns);
  const archived = getArchivedWaitlist();
  body.innerHTML = archived.length ? archived.map((item, index) => `<tr class="${getWaitlistStatusClass(item)}">${columns.map(key => archivedCompactCell(item, index, key)).join("")}</tr>`).join("") : `<tr><td colspan="${columns.length}" class="empty">No archived applicants.</td></tr>`;
}

function applicantInfoItem(label, value, full = false) {
  const displayValue = value === undefined || value === null || value === "" ? "—" : value;
  return `<div class="applicant-info-item ${full ? "applicant-info-item-full" : ""}"><span>${escapeHtml(label)}</span><strong>${escapeHtml(displayValue)}</strong></div>`;
}

function openApplicantInfoModal(applicantId) {
  const item = waitlistState.waitlist.find(applicant => applicant.id === applicantId);
  const modal = document.getElementById("applicantInfoModal");
  const body = document.getElementById("applicantInfoBody");
  if (!item || !modal || !body) return;

  const active = getActiveWaitlist();
  const archived = getArchivedWaitlist();
  const position = item.archived ? archived.findIndex(entry => entry.id === item.id) + 1 : active.findIndex(entry => entry.id === item.id) + 1;
  const fullName = `${item.firstName || ""} ${item.lastName || ""}`.trim() || "Unnamed Applicant";
  const noteCount = normalizeWaitlistNotes(item.notes).length;
  const noCallCount = getConsecutiveNoCallCount(item);

  document.getElementById("applicantInfoModalSubtitle").textContent = fullName;
  let html = `<section class="applicant-info-section"><h3>Applicant</h3><div class="applicant-info-grid">`;
  html += applicantInfoItem(item.archived ? "Archived Position" : "Waitlist Position", position || "—");
  html += applicantInfoItem("First Name", item.firstName);
  html += applicantInfoItem("Last Name", item.lastName);
  html += applicantInfoItem("Contact", item.contact);
  html += applicantInfoItem("City", item.city);
  html += applicantInfoItem("Status", item.status || "N/A");
  html += `</div></section>`;

  html += `<section class="applicant-info-section"><h3>Waitlist</h3><div class="applicant-info-grid">`;
  html += applicantInfoItem("Date Applied", item.dateApplied);
  html += applicantInfoItem("Original Application Date", item.originalApplicationDate || item.dateApplied);
  html += applicantInfoItem("Last Call-In", getLastCallText(item), true);
  html += applicantInfoItem("Consecutive No Calls", noCallCount);
  html += applicantInfoItem("Call-In Priority", item.callPriority || getCallPriority(item));
  html += applicantInfoItem("Notes", `${noteCount} note${noteCount === 1 ? "" : "s"}`);
  if (item.archived) {
    html += applicantInfoItem("Archived", formatDateTime(item.archivedAt));
    html += applicantInfoItem("Archive Reason", item.archiveReason, true);
  }
  html += `</div></section>`;

  body.innerHTML = html;
  modal.classList.remove("hidden");
  document.body.classList.add("kbrh-modal-open");
  requestAnimationFrame(() => document.getElementById("closeApplicantInfoModalBtn")?.focus());
}

function closeApplicantInfoModal() {
  document.getElementById("applicantInfoModal")?.classList.add("hidden");
  document.body.classList.remove("kbrh-modal-open");
}

function renderActiveWaitlist() {
  const body = document.getElementById("waitlistBody");
  if (!body) return;

  const waitlist = getActiveWaitlist();

  body.innerHTML = waitlist.length
    ? waitlist.map((item, index) => {
        const isEditing = editingApplicantId === item.id;
        const noteCount = normalizeWaitlistNotes(item.notes).length;
        const lastCall = getLastCallText(item);

        if (isEditing) {
          return `
            <tr class="editing-row">
              <td>${index + 1}</td>
              <td><input id="editLastName-${item.id}" value="${escapeAttribute(item.lastName)}" /></td>
              <td><input id="editFirstName-${item.id}" value="${escapeAttribute(item.firstName)}" /></td>
              <td class="phone-cell"><input id="editContact-${item.id}" value="${escapeAttribute(item.contact)}" /></td>
              <td>
                <select id="editStatus-${item.id}">
                  <option value="N/A" ${(item.status || "N/A") === "N/A" ? "selected" : ""}>N/A</option>
                  <option value="Incarcerated" ${item.status === "Incarcerated" ? "selected" : ""}>Incarcerated</option>
                  <option value="Offer Given" ${item.status === "Offer Given" ? "selected" : ""}>Offer Given</option>
                </select>
              </td>
              <td><input id="editCity-${item.id}" value="${escapeAttribute(item.city)}" /></td>
              <td><input id="editDateApplied-${item.id}" type="date" value="${escapeAttribute(item.dateApplied)}" /></td>
              <td><span class="empty">Save or cancel edit first</span></td>
              <td>${escapeHtml(lastCall)}</td>
              <td><a href="#" onclick="openNotes('${item.id}'); return false;">Add/View Notes (${noteCount})</a></td>
              <td>
                <button type="button" class="success" onclick="saveInlineEdit('${item.id}')">Save</button>
                <button type="button" class="secondary" onclick="cancelInlineEdit()">Cancel</button>
              </td>
            </tr>
          `;
        }

        const statusClass = getWaitlistStatusClass(item);

        return `
          <tr class="${statusClass}">
            <td>${index + 1}</td>
            <td>${escapeHtml(item.lastName)}</td>
            <td>${escapeHtml(item.firstName)}</td>
            <td class="phone-cell">${escapeHtml(item.contact)}</td>
            <td>${escapeHtml(applicantDisplayStatus(item))}</td>
            <td>${escapeHtml(item.city)}</td>
            <td>${escapeHtml(item.dateApplied)}</td>
            <td>
              <button type="button" class="call-in-update-btn" onclick="openCallInModal('${item.id}')">Update Call-In</button>
            </td>
            <td class="last-call-cell">${escapeHtml(lastCall)}</td>
            <td>
              <a href="#" onclick="openNotes('${item.id}'); return false;">Add/View Notes (${noteCount})</a>
            </td>
            <td>
              <button type="button" class="actions-button" onclick="openApplicantActionsModal('${item.id}')">Actions</button>
            </td>
          </tr>
        `;
      }).join("")
    : `<tr><td colspan="11" class="empty">No active applicants on the waitlist.</td></tr>`;
}

function renderArchivedWaitlist() {
  const body = document.getElementById("archivedWaitlistBody");
  if (!body) return;

  const archived = getArchivedWaitlist();

  body.innerHTML = archived.length
    ? archived.map((item, index) => {
        const noteCount = normalizeWaitlistNotes(item.notes).length;

        const statusClass = getWaitlistStatusClass(item);

        return `
          <tr class="${statusClass}">
            <td>${index + 1}</td>
            <td>${escapeHtml(item.lastName)}</td>
            <td>${escapeHtml(item.firstName)}</td>
            <td class="phone-cell">${escapeHtml(item.contact)}</td>
            <td>${escapeHtml(item.status)}</td>
            <td>${escapeHtml(item.city)}</td>
            <td>${escapeHtml(item.dateApplied)}</td>
            <td>${escapeHtml(formatDateTime(item.archivedAt))}</td>
            <td>${escapeHtml(item.archiveReason)}</td>
            <td>
              <a href="#" onclick="openNotes('${item.id}'); return false;">Add/View Notes (${noteCount})</a>
            </td>
            <td>
              <select onchange="handleArchivedApplicantAction('${item.id}', this.value); this.value='';">
                <option value="">Actions</option>
                <option value="reinstate">Reinstate</option>
                <option value="delete">Delete</option>
              </select>
            </td>
          </tr>
        `;
      }).join("")
    : `<tr><td colspan="11" class="empty">No archived applicants.</td></tr>`;
}

function formatDateTime(value) {
  if (!value) return "";

  const date = new Date(value);

  return date.toLocaleString("en-CA", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit"
  });
}

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[char]));
}

function escapeAttribute(value) {
  return escapeHtml(value);
}

document.addEventListener("DOMContentLoaded", () => {
  renderCompactColumnOptions();
  const openCompactColumnsModal = () => {
    const panel = document.getElementById("compactColumnPanel");
    if (!panel) return;
    panel.classList.remove("hidden");
    document.body.classList.add("kbrh-modal-open");
    document.getElementById("closeCompactColumnsModalBtn")?.focus();
  };

  const closeCompactColumnsModal = () => {
    const panel = document.getElementById("compactColumnPanel");
    if (!panel) return;
    panel.classList.add("hidden");
    document.body.classList.remove("kbrh-modal-open");
    document.getElementById("toggleCompactColumnsBtn")?.focus();
  };

  document.getElementById("toggleCompactColumnsBtn")?.addEventListener("click", openCompactColumnsModal);
  document.getElementById("closeCompactColumnsModalBtn")?.addEventListener("click", closeCompactColumnsModal);
  document.getElementById("doneCompactColumnsModalBtn")?.addEventListener("click", closeCompactColumnsModal);
  document.getElementById("compactColumnPanel")?.addEventListener("mousedown", event => {
    if (event.target.id === "compactColumnPanel") closeCompactColumnsModal();
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && !document.getElementById("compactColumnPanel")?.classList.contains("hidden")) {
      closeCompactColumnsModal();
    }
  });
  ["activeCompactColumnOptions", "archivedCompactColumnOptions"].forEach(id => document.getElementById(id)?.addEventListener("change", event => {
    const input = event.target.closest("input[data-compact-column-group]"); if (!input) return;
    updateCompactColumnPreference(input.dataset.compactColumnGroup, input.dataset.compactColumnKey, input.checked);
  }));
  document.getElementById("resetActiveCompactColumnsBtn")?.addEventListener("click", () => resetCompactColumns("active"));
  document.getElementById("resetArchivedCompactColumnsBtn")?.addEventListener("click", () => resetCompactColumns("archived"));
  document.getElementById("closeApplicantInfoModalBtn")?.addEventListener("click", closeApplicantInfoModal);
  document.getElementById("closeApplicantInfoModalFooterBtn")?.addEventListener("click", closeApplicantInfoModal);
  document.getElementById("applicantInfoModal")?.addEventListener("mousedown", event => {
    if (event.target.id === "applicantInfoModal") closeApplicantInfoModal();
  });
  document.getElementById("addWaitlistBtn")?.addEventListener("click", addWaitlistApplicant);
  document.getElementById("addWaitlistNoteBtn")?.addEventListener("click", addWaitlistNote);
  document.getElementById("closeWaitlistNotesBtn")?.addEventListener("click", closeNotesModal);
  document.querySelectorAll("[data-call-in-status]").forEach(button => {
    button.addEventListener("click", () => {
      const selected = button.dataset.callInStatus;
      if (selected === "Call In" || selected === "Late Call") {
        showCallInDateTimeStep(selected);
      } else {
        saveCallInStatus(selected);
      }
    });
  });
  document.getElementById("saveCallInDateTimeBtn")?.addEventListener("click", savePendingCallInDateTime);
  document.getElementById("backCallInStatusBtn")?.addEventListener("click", resetCallInModalStep);
  document.getElementById("cancelCallInModalBtn")?.addEventListener("click", closeCallInModal);
  document.getElementById("closeCallInModalBtn")?.addEventListener("click", closeCallInModal);
  document.getElementById("cancelApplicantActionsModalBtn")?.addEventListener("click", closeApplicantActionsModal);
  document.getElementById("closeApplicantActionsModalBtn")?.addEventListener("click", closeApplicantActionsModal);
  document.getElementById("cancelPositionModalBtn")?.addEventListener("click", closePositionModal);
  document.getElementById("closePositionModalBtn")?.addEventListener("click", closePositionModal);
  document.getElementById("savePositionBtn")?.addEventListener("click", savePositionChange);
  document.getElementById("positionNumberInput")?.addEventListener("keydown", event => {
    if (event.key === "Enter") savePositionChange();
  });
  document.querySelectorAll("[data-applicant-action]").forEach(button => {
    button.addEventListener("click", () => selectApplicantAction(button.dataset.applicantAction));
  });

  document.getElementById("callInModal")?.addEventListener("mousedown", event => {
    if (event.target.id === "callInModal") closeCallInModal();
  });

  document.getElementById("applicantActionsModal")?.addEventListener("mousedown", event => {
    if (event.target.id === "applicantActionsModal") closeApplicantActionsModal();
  });

  document.getElementById("positionModal")?.addEventListener("mousedown", event => {
    if (event.target.id === "positionModal") closePositionModal();
  });

  document.addEventListener("keydown", event => {
    if (event.key !== "Escape") return;

    if (!document.getElementById("applicantInfoModal")?.classList.contains("hidden")) {
      closeApplicantInfoModal();
      return;
    }

    if (!document.getElementById("callInModal")?.classList.contains("hidden")) {
      closeCallInModal();
      return;
    }

    if (!document.getElementById("applicantActionsModal")?.classList.contains("hidden")) {
      closeApplicantActionsModal();
    }

    if (!document.getElementById("positionModal")?.classList.contains("hidden")) {
      closePositionModal();
    }
  });
});

auth.onAuthStateChanged(user => {
  if (!user) return;

  listenToAppState(nextState => {
    waitlistState = nextState;

    waitlistState.waitlist = Array.isArray(waitlistState.waitlist)
      ? waitlistState.waitlist.filter(item => item && item !== "temp").map(item => ({
          ...item,
          contact: formatPhoneNumber(item.contact),
          archived: item.archived || false,
          archivedAt: item.archivedAt || "",
          archiveReason: item.archiveReason || "",
          callPriority: item.callPriority || getCallPriority(item),
          waitlistPosition: Number.isFinite(Number(item.waitlistPosition)) ? Number(item.waitlistPosition) : null,
          notes: normalizeWaitlistNotes(item.notes),
          callInHistory: Array.isArray(item.callInHistory) ? item.callInHistory : []
        }))
      : [];

    waitlistState.roster = Array.isArray(waitlistState.roster)
      ? waitlistState.roster.filter(client => client && client !== "temp")
      : [];

    // waitlistPosition is authoritative for active ordering. For legacy
    // applicants that predate this field, preserve their current stored order
    // until the next explicit waitlist save assigns sequential positions.
    renderWaitlist();
  });
});
