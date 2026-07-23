let waitlistState = defaultAppState();
let editingApplicantId = null;
let notesApplicantId = null;
let callInApplicantId = null;
let actionsApplicantId = null;
let positionApplicantId = null;

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
    contact: formatPhoneNumber(getInputValue("contact")),
    status: getInputValue("status") || "N/A",
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
      text: `Offer Given: ${offerNote.trim()}`,
      createdAt: new Date().toISOString()
    });
  }

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

  if (!confirm(`Move ${applicant.firstName} ${applicant.lastName} to Current Roster?`)) return;

  const transferNote = {
    id: crypto.randomUUID(),
    text: `Transferred from waitlist on ${new Date().toLocaleDateString("en-CA")}.`,
    createdAt: new Date().toISOString()
  };

  waitlistState.roster.push({
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
  });

  applicant.archived = true;
  applicant.archivedAt = new Date().toISOString();
  applicant.archiveReason = "Moved to Current Roster";

  renderWaitlist();
  saveWaitlist();
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

function openCallInModal(applicantId) {
  const applicant = waitlistState.waitlist.find(item => item.id === applicantId);
  if (!applicant) return;

  callInApplicantId = applicantId;
  document.getElementById("callInApplicantName").textContent =
    `${applicant.firstName || ""} ${applicant.lastName || ""}`.trim();

  document.getElementById("callInModal")?.classList.remove("hidden");
  document.body.classList.add("kbrh-modal-open");
}

function closeCallInModal() {
  callInApplicantId = null;
  document.getElementById("callInModal")?.classList.add("hidden");
  document.body.classList.remove("kbrh-modal-open");
}

function saveCallInStatus(selected) {
  const applicant = waitlistState.waitlist.find(item => item.id === callInApplicantId);
  if (!applicant) return;

  if (!selected) return;

  const previousActiveOrder = getActiveOrderSnapshot();
  applicant.callInHistory = Array.isArray(applicant.callInHistory) ? applicant.callInHistory : [];
  applicant.callInHistory.unshift({
    id: crypto.randomUUID(),
    result: selected,
    reason: "",
    details: "",
    previousActiveOrder,
    timestamp: new Date().toLocaleString(),
    createdAt: new Date().toISOString()
  });

  if (selected === "Call In") {
    applicant.callPriority = "normal";
  } else if (selected === "Late Call") {
    applicant.callPriority = "late";
    moveLateApplicantAboveNoCalls(applicant.id);
  } else {
    applicant.callPriority = "nocall";
    moveNoCallApplicantToBottom(applicant.id);
  }

  closeCallInModal();
  renderWaitlist();
  saveWaitlist();
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
  return item.status || "N/A";
}

function renderCompactActiveWaitlist() {
  const body = document.getElementById("compactWaitlistBody");
  if (!body) return;
  const waitlist = getActiveWaitlist();
  body.innerHTML = waitlist.length ? waitlist.map((item, index) => {
    const fullName = `${item.firstName || ""} ${item.lastName || ""}`.trim() || "Unnamed Applicant";
    return `
      <tr class="${getWaitlistStatusClass(item)}">
        <td>${index + 1}</td>
        <td class="compact-applicant-cell"><strong>${escapeHtml(fullName)}</strong><span>${escapeHtml(item.contact || item.city || "No contact listed")}</span></td>
        <td>${escapeHtml(applicantDisplayStatus(item))}</td>
        <td><button type="button" class="secondary compact-info-button" onclick="openApplicantInfoModal('${item.id}')">Display Info</button></td>
        <td><button type="button" class="actions-button" onclick="openApplicantActionsModal('${item.id}')">Actions</button></td>
      </tr>`;
  }).join("") : `<tr><td colspan="5" class="empty">No active applicants on the waitlist.</td></tr>`;
}

function renderCompactArchivedWaitlist() {
  const body = document.getElementById("compactArchivedWaitlistBody");
  if (!body) return;
  const archived = getArchivedWaitlist();
  body.innerHTML = archived.length ? archived.map((item, index) => {
    const fullName = `${item.firstName || ""} ${item.lastName || ""}`.trim() || "Unnamed Applicant";
    return `
      <tr class="${getWaitlistStatusClass(item)}">
        <td>${index + 1}</td>
        <td class="compact-applicant-cell"><strong>${escapeHtml(fullName)}</strong><span>${escapeHtml(item.archiveReason || "Archived applicant")}</span></td>
        <td>${escapeHtml(applicantDisplayStatus(item))}</td>
        <td><button type="button" class="secondary compact-info-button" onclick="openApplicantInfoModal('${item.id}')">Display Info</button></td>
        <td>
          <select aria-label="Archived applicant actions" onchange="handleArchivedApplicantAction('${item.id}', this.value); this.value='';">
            <option value="">Actions</option><option value="reinstate">Reinstate</option><option value="delete">Delete</option>
          </select>
        </td>
      </tr>`;
  }).join("") : `<tr><td colspan="5" class="empty">No archived applicants.</td></tr>`;
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
            <td>${escapeHtml(item.status)}</td>
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
  document.getElementById("closeApplicantInfoModalBtn")?.addEventListener("click", closeApplicantInfoModal);
  document.getElementById("closeApplicantInfoModalFooterBtn")?.addEventListener("click", closeApplicantInfoModal);
  document.getElementById("applicantInfoModal")?.addEventListener("mousedown", event => {
    if (event.target.id === "applicantInfoModal") closeApplicantInfoModal();
  });
  document.getElementById("addWaitlistBtn")?.addEventListener("click", addWaitlistApplicant);
  document.getElementById("addWaitlistNoteBtn")?.addEventListener("click", addWaitlistNote);
  document.getElementById("closeWaitlistNotesBtn")?.addEventListener("click", closeNotesModal);
  document.querySelectorAll("[data-call-in-status]").forEach(button => {
    button.addEventListener("click", () => saveCallInStatus(button.dataset.callInStatus));
  });
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
