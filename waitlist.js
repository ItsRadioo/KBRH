let waitlistState = defaultAppState();
let editingApplicantId = null;
let notesApplicantId = null;
let pendingNoLateApplicantId = null;

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

async function saveWaitlist() {
  try {
    await saveAppState(waitlistState);
  } catch (error) {
    console.error("Waitlist save failed:", error);
    alert("Could not save waitlist. Check Console for details.");
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
  return Array.isArray(waitlistState.waitlist)
    ? waitlistState.waitlist.filter(item => item && item !== "temp" && !item.archived)
    : [];
}

function getArchivedWaitlist() {
  return Array.isArray(waitlistState.waitlist)
    ? waitlistState.waitlist.filter(item => item && item !== "temp" && item.archived)
    : [];
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
  if (item.callPriority) return item.callPriority;

  const last = item.callInHistory?.[0];
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

function rebuildWaitlist(activeList, archivedList) {
  waitlistState.waitlist = [...activeList, ...archivedList];
}

function moveLateApplicantAboveNoCalls(applicantId) {
  const active = getActiveWaitlist();
  const archived = getArchivedWaitlist();

  const currentIndex = active.findIndex(item => item.id === applicantId);
  if (currentIndex === -1) return;

  const [applicant] = active.splice(currentIndex, 1);
  const firstNoCallIndex = active.findIndex(item => getCallPriority(item) === "nocall");

  if (firstNoCallIndex === -1) {
    active.push(applicant);
  } else {
    active.splice(firstNoCallIndex, 0, applicant);
  }

  rebuildWaitlist(active, archived);
}

function moveNoCallApplicantToBottom(applicantId) {
  const active = getActiveWaitlist();
  const archived = getArchivedWaitlist();

  const currentIndex = active.findIndex(item => item.id === applicantId);
  if (currentIndex === -1) return;

  const [applicant] = active.splice(currentIndex, 1);
  active.push(applicant);

  rebuildWaitlist(active, archived);
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
    contact: getInputValue("contact"),
    status: getInputValue("status"),
    city: getInputValue("city"),
    dateApplied: getInputValue("dateApplied"),
    archived: false,
    archivedAt: "",
    archiveReason: "",
    callPriority: "normal",
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
    if (input) input.value = "";
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
  applicant.contact = getInputValue(`editContact-${applicantId}`);
  applicant.status = getInputValue(`editStatus-${applicantId}`);
  applicant.city = getInputValue(`editCity-${applicantId}`);
  applicant.dateApplied = getInputValue(`editDateApplied-${applicantId}`);

  editingApplicantId = null;
  renderWaitlist();
  saveWaitlist();
}

function moveToRoster(applicantId) {
  const applicant = waitlistState.waitlist.find(item => item.id === applicantId);
  if (!applicant) return;

  waitlistState.roster = Array.isArray(waitlistState.roster)
    ? waitlistState.roster.filter(client => client && client !== "temp")
    : [];

  const clientId = prompt("Enter Client ID:", "");
  if (clientId === null) return;

  const dob = prompt("Enter DOB as YYYY-MM-DD:", "");
  if (dob === null) return;

  const entryDate = prompt("Enter admission / entry date as YYYY-MM-DD:", todayDateString());
  if (entryDate === null) return;

  if (!confirm(`Move ${applicant.firstName} ${applicant.lastName} to Current Roster?`)) return;

  waitlistState.roster.push({
    id: crypto.randomUUID(),
    clientId: clientId.trim(),
    firstName: applicant.firstName || "",
    lastName: applicant.lastName || "",
    dob: dob.trim(),
    phone: applicant.contact || "",
    address: applicant.address || "",
    city: applicant.city || "",
    contact: "",
    contactPhone: "",
    entryDate: entryDate.trim(),
    phase: "phase1",
    phase2AdmissionDate: "",
    notes: normalizeWaitlistNotes(applicant.notes)
  });

  applicant.archived = true;
  applicant.archivedAt = new Date().toISOString();
  applicant.archiveReason = "Moved to Current Roster";

  renderWaitlist();
  saveWaitlist();
}

function handleApplicantAction(applicantId, action) {
  if (!action) return;

  if (action === "edit") startInlineEdit(applicantId);
  if (action === "archive") archiveApplicant(applicantId);
  if (action === "moveToRoster") moveToRoster(applicantId);
  if (action === "delete") deleteApplicant(applicantId);
}

function handleArchivedApplicantAction(applicantId, action) {
  if (!action) return;

  if (action === "reinstate") reinstateApplicant(applicantId);
  if (action === "delete") deleteApplicant(applicantId);
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

function callInYes(applicantId) {
  const applicant = waitlistState.waitlist.find(item => item.id === applicantId);
  if (!applicant) return;

  const previousActiveOrder = getActiveOrderSnapshot();

  if (!confirm(`Record YES call-in for ${applicant.firstName} ${applicant.lastName}?`)) return;

  applicant.callPriority = "normal";
  applicant.callInHistory = Array.isArray(applicant.callInHistory) ? applicant.callInHistory : [];

  applicant.callInHistory.unshift({
    id: crypto.randomUUID(),
    result: "Yes",
    reason: "",
    details: "",
    previousActiveOrder,
    timestamp: new Date().toLocaleString(),
    createdAt: new Date().toISOString()
  });

  renderWaitlist();
  saveWaitlist();
}

function openNoLateModal(applicantId) {
  const applicant = waitlistState.waitlist.find(item => item.id === applicantId);
  if (!applicant) return;

  pendingNoLateApplicantId = applicantId;

  document.getElementById("callInModalTitle").textContent =
    `No/Late — ${applicant.firstName || ""} ${applicant.lastName || ""}`.trim();

  document.getElementById("callInReason").value = "No call";
  document.getElementById("callInDetails").value = "";

  document.getElementById("callInModal").classList.remove("hidden");
}

function closeNoLateModal() {
  pendingNoLateApplicantId = null;
  document.getElementById("callInModal").classList.add("hidden");
}

function confirmNoLateCallIn() {
  const applicant = waitlistState.waitlist.find(item => item.id === pendingNoLateApplicantId);
  if (!applicant) return;

  const previousActiveOrder = getActiveOrderSnapshot();
  const reason = getInputValue("callInReason");
  const details = getInputValue("callInDetails");

  if (!confirm(`Record "${reason}" for ${applicant.firstName} ${applicant.lastName}?`)) {
    return;
  }

  applicant.callPriority = reason === "Called late" ? "late" : "nocall";
  applicant.callInHistory = Array.isArray(applicant.callInHistory) ? applicant.callInHistory : [];

  applicant.callInHistory.unshift({
    id: crypto.randomUUID(),
    result: "No/Late",
    reason,
    details,
    previousActiveOrder,
    timestamp: new Date().toLocaleString(),
    createdAt: new Date().toISOString()
  });

  if (reason === "Called late") {
    moveLateApplicantAboveNoCalls(applicant.id);
  } else {
    moveNoCallApplicantToBottom(applicant.id);
  }

  closeNoLateModal();
  renderWaitlist();
  saveWaitlist();
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

  const reasonText = last.reason ? ` — ${last.reason}` : "";
  const detailsText = last.details ? ` (${last.details})` : "";

  return `${last.result}${reasonText}${detailsText} — ${last.timestamp}`;
}

function renderWaitlist() {
  renderActiveWaitlist();
  renderArchivedWaitlist();
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
              <td><input id="editContact-${item.id}" value="${escapeAttribute(item.contact)}" /></td>
              <td><input id="editStatus-${item.id}" value="${escapeAttribute(item.status)}" /></td>
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

        return `
          <tr>
            <td>${index + 1}</td>
            <td>${escapeHtml(item.lastName)}</td>
            <td>${escapeHtml(item.firstName)}</td>
            <td>${escapeHtml(item.contact)}</td>
            <td>${escapeHtml(item.status)}</td>
            <td>${escapeHtml(item.city)}</td>
            <td>${escapeHtml(item.dateApplied)}</td>
            <td>
              <button type="button" class="success" onclick="callInYes('${item.id}')">Yes</button>
              <button type="button" class="warning" onclick="openNoLateModal('${item.id}')">No/Late</button>
              <button type="button" class="secondary" onclick="undoLastCallIn('${item.id}')">Undo Last</button>
            </td>
            <td>${escapeHtml(lastCall)}</td>
            <td>
              <a href="#" onclick="openNotes('${item.id}'); return false;">Add/View Notes (${noteCount})</a>
            </td>
            <td>
              <select onchange="handleApplicantAction('${item.id}', this.value); this.value='';">
                <option value="">Actions</option>
                <option value="edit">Edit</option>
                <option value="moveToRoster">Move to Roster</option>
                <option value="archive">Archive</option>
                <option value="delete">Delete</option>
              </select>
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

        return `
          <tr>
            <td>${index + 1}</td>
            <td>${escapeHtml(item.lastName)}</td>
            <td>${escapeHtml(item.firstName)}</td>
            <td>${escapeHtml(item.contact)}</td>
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
                <option value="">Actions ▼</option>
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
  document.getElementById("addWaitlistBtn")?.addEventListener("click", addWaitlistApplicant);
  document.getElementById("addWaitlistNoteBtn")?.addEventListener("click", addWaitlistNote);
  document.getElementById("closeWaitlistNotesBtn")?.addEventListener("click", closeNotesModal);
  document.getElementById("confirmNoLateBtn")?.addEventListener("click", confirmNoLateCallIn);
  document.getElementById("cancelNoLateBtn")?.addEventListener("click", closeNoLateModal);
});

auth.onAuthStateChanged(user => {
  if (!user) return;

  listenToAppState(nextState => {
    waitlistState = nextState;

    waitlistState.waitlist = Array.isArray(waitlistState.waitlist)
      ? waitlistState.waitlist.filter(item => item && item !== "temp").map(item => ({
          ...item,
          archived: item.archived || false,
          archivedAt: item.archivedAt || "",
          archiveReason: item.archiveReason || "",
          callPriority: item.callPriority || getCallPriority(item),
          notes: normalizeWaitlistNotes(item.notes),
          callInHistory: Array.isArray(item.callInHistory) ? item.callInHistory : []
        }))
      : [];

    waitlistState.roster = Array.isArray(waitlistState.roster)
      ? waitlistState.roster.filter(client => client && client !== "temp")
      : [];

    renderWaitlist();
  });
});
