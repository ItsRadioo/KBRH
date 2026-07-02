let rosterState = defaultAppState();
let editingClientId = null;
let notesClientId = null;
let editingAll = false;
let rosterSearchTerm = "";

function getInputValue(id) {
  const input = document.getElementById(id);

  if (!input) {
    alert(`Missing input field: ${id}`);
    throw new Error(`Missing input field: ${id}`);
  }

  return input.value.trim();
}

function formatPhoneNumber(value) {
  const digits = String(value || "").replace(/\D/g, "");

  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }

  return String(value || "");
}

async function saveRoster() {
  try {
    await saveAppState(rosterState);
  } catch (error) {
    console.error("Roster save failed:", error);
    alert("Could not save roster. Check Console for details.");
  }
}

function addClient() {
  rosterState.roster = Array.isArray(rosterState.roster)
    ? rosterState.roster.filter(client => client && client !== "temp")
    : [];

  const entryDate = getInputValue("entryDate");

  const client = {
    id: crypto.randomUUID(),
    roomNumber: getInputValue("roomNumber"),
    firstName: getInputValue("firstName"),
    lastName: getInputValue("lastName"),
    clientId: getInputValue("clientId"),
    dob: getInputValue("dob"),
    phone: formatPhoneNumber(getInputValue("phone")),
    address: getInputValue("address"),
    city: getInputValue("city"),
    contact: getInputValue("contact"),
    contactPhone: formatPhoneNumber(getInputValue("contactPhone")),
    entryDate,
    expectedDischargeDate: calculateExitDate(entryDate),
    opocCompleted: false,
    phase2AdmissionDate: "",
    phase: "phase1",
    archived: false,
    archivedAt: "",
    archiveReason: "",
    notes: []
  };

  if (!client.firstName || !client.lastName) {
    alert("Enter at least a first and last name.");
    return;
  }

  rosterState.roster.push(client);
  clearClientForm();
  renderRoster();
  saveRoster();
}

function clearClientForm() {
  [
    "roomNumber",
    "firstName",
    "lastName",
    "clientId",
    "dob",
    "phone",
    "address",
    "city",
    "contact",
    "contactPhone",
    "entryDate"
  ].forEach(id => {
    const input = document.getElementById(id);
    if (input) input.value = "";
  });
}

function calculateExitDate(entryDate) {
  if (!entryDate) return "";

  const [year, month, day] = entryDate.split("-").map(Number);
  const exitDate = new Date(year, month - 1, day);

  exitDate.setMonth(exitDate.getMonth() + 3);

  if (exitDate.getDate() !== day) {
    exitDate.setDate(0);
  }

  return exitDate.toISOString().slice(0, 10);
}

function getDischargeDate(client) {
  return client.expectedDischargeDate || calculateExitDate(client.entryDate);
}

function calculateDaysRemainingForClient(client) {
  const dischargeDate = getDischargeDate(client);
  if (!dischargeDate) return "";

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const exit = new Date(dischargeDate + "T00:00:00");
  const diffMs = exit.getTime() - today.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return "Due / Past";
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "1 day";

  return `${diffDays} days`;
}

function getDaysSinceAdmission(client) {
  if (!client.entryDate) return 0;

  const entry = new Date(client.entryDate + "T00:00:00");
  const today = new Date();

  entry.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  return Math.floor((today.getTime() - entry.getTime()) / (1000 * 60 * 60 * 24));
}

function getOPOCStatus(client) {
  const days = getDaysSinceAdmission(client);

  if (client.opocCompleted) {
    return `
      <label class="opoc-cell opoc-complete">
        <input type="checkbox" checked onchange="toggleOPOC('${client.id}', this.checked)" />
        <span>Complete</span>
      </label>
    `;
  }

  if (!client.entryDate) {
    return `
      <label class="opoc-cell">
        <input type="checkbox" onchange="toggleOPOC('${client.id}', this.checked)" />
      </label>
    `;
  }

  if (days >= 50) {
    return `
      <label class="opoc-cell opoc-overdue">
        <input type="checkbox" onchange="toggleOPOC('${client.id}', this.checked)" />
        <span>OPOC OVERDUE</span>
      </label>
    `;
  }

  if (days >= 40) {
    return `
      <label class="opoc-cell opoc-due">
        <input type="checkbox" onchange="toggleOPOC('${client.id}', this.checked)" />
        <span>OPOC Due</span>
      </label>
    `;
  }

  return `
    <label class="opoc-cell">
      <input type="checkbox" onchange="toggleOPOC('${client.id}', this.checked)" />
    </label>
  `;
}

function toggleOPOC(clientId, checked) {
  const client = rosterState.roster.find(item => item.id === clientId);
  if (!client) return;

  client.opocCompleted = checked;
  renderRoster();
  saveRoster();
}

function getDischargeClass(client) {
  const dischargeDate = getDischargeDate(client);
  if (!dischargeDate) return "discharge-missing";

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const exit = new Date(dischargeDate + "T00:00:00");
  const diffMs = exit.getTime() - today.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return "discharge-overdue";
  if (diffDays <= 14) return "discharge-warning";

  return "discharge-ok";
}

function getMissingAdmissionFields(client) {
  const missing = [];

  if (!client.roomNumber) missing.push("Room");
  if (!client.clientId) missing.push("Client ID");
  if (!client.dob) missing.push("DOB");
  if (!client.phone) missing.push("Phone");
  if (!client.entryDate) missing.push("Entry");
  if (!getDischargeDate(client)) missing.push("Discharge");

  return missing;
}

function getCompletionBadge(client) {
  const missing = getMissingAdmissionFields(client);

  if (!missing.length) {
    return `<span class="status active">Complete</span>`;
  }

  return `<span class="status warning-status">Missing: ${escapeHtml(missing.join(", "))}</span>`;
}

function formatDate(value) {
  if (!value) return "";

  const date = new Date(value + "T00:00:00");

  return date.toLocaleDateString("en-CA", {
    year: "numeric",
    month: "short",
    day: "2-digit"
  });
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

function startInlineEdit(clientId) {
  editingClientId = clientId;
  editingAll = false;
  updateEditAllButtons();
  renderRoster();
}

function cancelInlineEdit() {
  editingClientId = null;
  renderRoster();
}

function startEditAll() {
  editingClientId = null;
  editingAll = true;
  updateEditAllButtons();
  renderRoster();
}

function cancelEditAll() {
  editingAll = false;
  updateEditAllButtons();
  renderRoster();
}

function updateEditAllButtons() {
  const editAllBtn = document.getElementById("editAllBtn");
  const saveAllBtn = document.getElementById("saveAllBtn");
  const cancelAllBtn = document.getElementById("cancelAllBtn");

  if (!editAllBtn || !saveAllBtn || !cancelAllBtn) return;

  if (editingAll) {
    editAllBtn.classList.add("hidden");
    saveAllBtn.classList.remove("hidden");
    cancelAllBtn.classList.remove("hidden");
  } else {
    editAllBtn.classList.remove("hidden");
    saveAllBtn.classList.add("hidden");
    cancelAllBtn.classList.add("hidden");
  }
}

function saveAllEdits() {
  const roster = Array.isArray(rosterState.roster)
    ? rosterState.roster.filter(client => client && client !== "temp" && !client.archived)
    : [];

  roster.forEach(client => {
    saveClientFromEditInputs(client.id, false);
  });

  editingAll = false;
  editingClientId = null;
  updateEditAllButtons();
  renderRoster();
  saveRoster();
}

function saveClientFromEditInputs(clientId, shouldRender = true) {
  const client = rosterState.roster.find(item => item.id === clientId);
  if (!client) return;

  client.roomNumber = getInputValue(`editRoomNumber-${clientId}`);
  client.firstName = getInputValue(`editFirstName-${clientId}`);
  client.lastName = getInputValue(`editLastName-${clientId}`);
  client.clientId = getInputValue(`editClientId-${clientId}`);
  client.dob = getInputValue(`editDob-${clientId}`);
  client.phone = formatPhoneNumber(getInputValue(`editPhone-${clientId}`));
  client.expectedDischargeDate = getInputValue(`editDischargeDate-${clientId}`);

  if ((client.phase || "phase1") === "phase1") {
    client.address = getInputValue(`editAddress-${clientId}`);
    client.city = getInputValue(`editCity-${clientId}`);
    client.contact = getInputValue(`editContact-${clientId}`);
    client.contactPhone = formatPhoneNumber(getInputValue(`editContactPhone-${clientId}`));
    client.entryDate = getInputValue(`editEntryDate-${clientId}`);
  } else {
    client.phase2AdmissionDate = getInputValue(`editPhase2AdmissionDate-${clientId}`);
  }

  if (shouldRender) {
    editingClientId = null;
    renderRoster();
    saveRoster();
  }
}

function saveInlineEdit(clientId) {
  saveClientFromEditInputs(clientId, true);
}

function handleRosterAction(clientId, action) {
  if (!action) return;

  if (action === "edit") startInlineEdit(clientId);
  if (action === "phase2") moveToPhase(clientId, "phase2");
  if (action === "phase1") moveToPhase(clientId, "phase1");
  if (action === "archive") archiveClient(clientId);
  if (action === "restore") restoreClient(clientId);
  if (action === "delete") deleteArchivedClient(clientId);
}

function moveToPhase(clientId, phase) {
  const client = rosterState.roster.find(item => item.id === clientId);
  if (!client) return;

  client.phase = phase;

  if (phase === "phase2") {
    client.phase2AdmissionDate = new Date().toISOString().slice(0, 10);
  }

  renderRoster();
  saveRoster();
}

function archiveClient(clientId) {
  const client = rosterState.roster.find(item => item.id === clientId);
  if (!client) return;

  const reason = prompt("Archive / discharge reason:", "Discharged");
  if (reason === null) return;

  if (!confirm(`Archive ${client.firstName} ${client.lastName}?`)) return;

  client.archived = true;
  client.archivedAt = new Date().toISOString();
  client.archiveReason = reason.trim();

  client.notes = Array.isArray(client.notes) ? client.notes : [];
  client.notes.unshift({
    id: crypto.randomUUID(),
    text: `Archived from roster on ${new Date().toLocaleDateString("en-CA")}. Reason: ${client.archiveReason || "Not specified"}.`,
    createdAt: new Date().toISOString()
  });

  renderRoster();
  saveRoster();
}

function restoreClient(clientId) {
  const client = rosterState.roster.find(item => item.id === clientId);
  if (!client) return;

  if (!confirm(`Restore ${client.firstName} ${client.lastName} to the active roster?`)) return;

  client.archived = false;
  client.archivedAt = "";
  client.archiveReason = "";

  client.notes = Array.isArray(client.notes) ? client.notes : [];
  client.notes.unshift({
    id: crypto.randomUUID(),
    text: `Restored to active roster on ${new Date().toLocaleDateString("en-CA")}.`,
    createdAt: new Date().toISOString()
  });

  renderRoster();
  saveRoster();
}

function deleteArchivedClient(clientId) {
  const client = rosterState.roster.find(item => item.id === clientId);
  if (!client) return;

  if (!client.archived) {
    alert("Only archived roster records can be permanently deleted.");
    return;
  }

  if (!confirm(`Permanently delete archived record for ${client.firstName} ${client.lastName}? This cannot be undone.`)) return;

  rosterState.roster = rosterState.roster.filter(item => item.id !== clientId);

  renderRoster();
  saveRoster();
}

function openNotes(clientId) {
  const client = rosterState.roster.find(item => item.id === clientId);
  if (!client) return;

  notesClientId = clientId;

  document.getElementById("notesModalTitle").textContent =
    `Notes — ${client.firstName || ""} ${client.lastName || ""}`.trim();

  document.getElementById("newNoteText").value = "";

  renderNotesModal(client);
  document.getElementById("notesModal").classList.remove("hidden");
}

function closeNotesModal() {
  notesClientId = null;
  document.getElementById("notesModal").classList.add("hidden");
}

function addClientNote() {
  const client = rosterState.roster.find(item => item.id === notesClientId);
  if (!client) return;

  const text = getInputValue("newNoteText");

  if (!text) {
    alert("Enter a note first.");
    return;
  }

  client.notes = Array.isArray(client.notes) ? client.notes : [];

  client.notes.unshift({
    id: crypto.randomUUID(),
    text,
    createdAt: new Date().toISOString()
  });

  document.getElementById("newNoteText").value = "";

  renderNotesModal(client);
  renderRoster();
  saveRoster();
}

function deleteClientNote(noteId) {
  const client = rosterState.roster.find(item => item.id === notesClientId);
  if (!client) return;

  if (!confirm("Delete this note?")) return;

  client.notes = Array.isArray(client.notes)
    ? client.notes.filter(note => note.id !== noteId)
    : [];

  renderNotesModal(client);
  renderRoster();
  saveRoster();
}

function renderNotesModal(client) {
  const list = document.getElementById("notesList");
  if (!list) return;

  const notes = Array.isArray(client.notes) ? client.notes : [];

  list.innerHTML = notes.length
    ? notes.map(note => `
        <li class="note-item">
          <div>
            <div>• ${escapeHtml(note.text)}</div>
            <small>${escapeHtml(formatDateTime(note.createdAt))}</small>
          </div>
          <button type="button" class="danger" onclick="deleteClientNote('${note.id}')">Delete</button>
        </li>
      `).join("")
    : `<li class="empty">No notes yet.</li>`;
}

function handleRosterSearch(value) {
  rosterSearchTerm = String(value || "").toLowerCase().trim();
  renderRoster();
}

function matchesRosterSearch(client) {
  if (!rosterSearchTerm) return true;

  const haystack = [
    client.roomNumber,
    client.firstName,
    client.lastName,
    client.clientId,
    client.phone,
    client.city
  ].join(" ").toLowerCase();

  return haystack.includes(rosterSearchTerm);
}

function renderRoster() {
  updateEditAllButtons();
  renderPhase1Roster();
  renderPhase2Roster();
  renderArchivedRoster();
}

function getPhaseClients(phase) {
  return Array.isArray(rosterState.roster)
    ? rosterState.roster
        .filter(client =>
          client &&
          client !== "temp" &&
          !client.archived &&
          (client.phase || "phase1") === phase &&
          matchesRosterSearch(client)
        )
        .sort((a, b) => {
          const aDate = a.entryDate || "9999-12-31";
          const bDate = b.entryDate || "9999-12-31";
          return aDate.localeCompare(bDate);
        })
    : [];
}

function getArchivedClients() {
  return Array.isArray(rosterState.roster)
    ? rosterState.roster
        .filter(client => client && client !== "temp" && client.archived && matchesRosterSearch(client))
        .sort((a, b) => String(b.archivedAt || "").localeCompare(String(a.archivedAt || "")))
    : [];
}

function renderPhase1Roster() {
  const body = document.getElementById("rosterBody");
  if (!body) return;

  const roster = getPhaseClients("phase1");

  body.innerHTML = roster.length
    ? roster.map(client => renderActiveRosterRow(client, "phase1")).join("")
    : `<tr><td colspan="17" class="empty">No Phase 1 clients.</td></tr>`;
}

function renderPhase2Roster() {
  const body = document.getElementById("phase2RosterBody");
  if (!body) return;

  const roster = getPhaseClients("phase2");

  body.innerHTML = roster.length
    ? roster.map(client => renderActiveRosterRow(client, "phase2")).join("")
    : `<tr><td colspan="12" class="empty">No Phase 2 clients.</td></tr>`;
}

function renderActiveRosterRow(client, phase) {
  const isEditing = editingAll || editingClientId === client.id;
  const dischargeDate = getDischargeDate(client);
  const daysRemaining = calculateDaysRemainingForClient(client);
  const noteCount = Array.isArray(client.notes) ? client.notes.length : 0;
  const dischargeClass = getDischargeClass(client);

  if (isEditing) {
    if (phase === "phase1") {
      return `
        <tr class="editing-row">
          <td><input id="editRoomNumber-${client.id}" value="${escapeAttribute(client.roomNumber)}" /></td>
          <td><input id="editFirstName-${client.id}" value="${escapeAttribute(client.firstName)}" /></td>
          <td><input id="editLastName-${client.id}" value="${escapeAttribute(client.lastName)}" /></td>
          <td><input id="editClientId-${client.id}" value="${escapeAttribute(client.clientId)}" /></td>
          <td><input id="editDob-${client.id}" type="date" value="${escapeAttribute(client.dob)}" /></td>
          <td class="phone-cell"><input id="editPhone-${client.id}" value="${escapeAttribute(client.phone)}" /></td>
          <td><input id="editAddress-${client.id}" value="${escapeAttribute(client.address)}" /></td>
          <td><input id="editCity-${client.id}" value="${escapeAttribute(client.city)}" /></td>
          <td><input id="editContact-${client.id}" value="${escapeAttribute(client.contact)}" /></td>
          <td class="phone-cell"><input id="editContactPhone-${client.id}" value="${escapeAttribute(client.contactPhone)}" /></td>
          <td><input id="editEntryDate-${client.id}" type="date" value="${escapeAttribute(client.entryDate)}" /></td>
          <td><input id="editDischargeDate-${client.id}" type="date" value="${escapeAttribute(dischargeDate)}" /></td>
          <td class="${dischargeClass}">${escapeHtml(daysRemaining)}</td>
          <td>${getOPOCStatus(client)}</td>
          <td>${getCompletionBadge(client)}</td>
          <td><a href="#" onclick="openNotes('${client.id}'); return false;">Notes (${noteCount})</a></td>
          <td>
            ${
              editingAll
                ? `<span class="empty">Use Save All above</span>`
                : `
                  <button type="button" class="success" onclick="saveInlineEdit('${client.id}')">Save</button>
                  <button type="button" class="secondary" onclick="cancelInlineEdit()">Cancel</button>
                `
            }
          </td>
        </tr>
      `;
    }

    return `
      <tr class="editing-row">
        <td><input id="editRoomNumber-${client.id}" value="${escapeAttribute(client.roomNumber)}" /></td>
        <td><input id="editFirstName-${client.id}" value="${escapeAttribute(client.firstName)}" /></td>
        <td><input id="editLastName-${client.id}" value="${escapeAttribute(client.lastName)}" /></td>
        <td><input id="editClientId-${client.id}" value="${escapeAttribute(client.clientId)}" /></td>
        <td><input id="editDob-${client.id}" type="date" value="${escapeAttribute(client.dob)}" /></td>
        <td class="phone-cell"><input id="editPhone-${client.id}" value="${escapeAttribute(client.phone)}" /></td>
        <td><input id="editPhase2AdmissionDate-${client.id}" type="date" value="${escapeAttribute(client.phase2AdmissionDate)}" /></td>
        <td><input id="editDischargeDate-${client.id}" type="date" value="${escapeAttribute(dischargeDate)}" /></td>
        <td class="${dischargeClass}">${escapeHtml(daysRemaining)}</td>
        <td>${getCompletionBadge(client)}</td>
        <td><a href="#" onclick="openNotes('${client.id}'); return false;">Notes (${noteCount})</a></td>
        <td>
          ${
            editingAll
              ? `<span class="empty">Use Save All above</span>`
              : `
                <button type="button" class="success" onclick="saveInlineEdit('${client.id}')">Save</button>
                <button type="button" class="secondary" onclick="cancelInlineEdit()">Cancel</button>
              `
          }
        </td>
      </tr>
    `;
  }

  if (phase === "phase1") {
    return `
      <tr>
        <td>${escapeHtml(client.roomNumber)}</td>
        <td>${escapeHtml(client.firstName)}</td>
        <td>${escapeHtml(client.lastName)}</td>
        <td>${escapeHtml(client.clientId)}</td>
        <td>${escapeHtml(formatDate(client.dob))}</td>
        <td class="phone-cell">${escapeHtml(client.phone)}</td>
        <td>${escapeHtml(client.address)}</td>
        <td>${escapeHtml(client.city)}</td>
        <td>${escapeHtml(client.contact)}</td>
        <td class="phone-cell">${escapeHtml(client.contactPhone)}</td>
        <td>${escapeHtml(formatDate(client.entryDate))}</td>
        <td>${escapeHtml(formatDate(dischargeDate))}</td>
        <td class="${dischargeClass}">${escapeHtml(daysRemaining)}</td>
        <td>${getOPOCStatus(client)}</td>
        <td>${getCompletionBadge(client)}</td>
        <td><a href="#" onclick="openNotes('${client.id}'); return false;">Notes (${noteCount})</a></td>
        <td>
          <select onchange="handleRosterAction('${client.id}', this.value); this.value='';">
            <option value="">Actions</option>
            <option value="edit">Edit</option>
            <option value="phase2">Move to Phase 2</option>
            <option value="archive">Archive / Discharge</option>
          </select>
        </td>
      </tr>
    `;
  }

  return `
    <tr>
      <td>${escapeHtml(client.roomNumber)}</td>
      <td>${escapeHtml(client.firstName)}</td>
      <td>${escapeHtml(client.lastName)}</td>
      <td>${escapeHtml(client.clientId)}</td>
      <td>${escapeHtml(formatDate(client.dob))}</td>
      <td class="phone-cell">${escapeHtml(client.phone)}</td>
      <td>${escapeHtml(formatDate(client.phase2AdmissionDate))}</td>
      <td>${escapeHtml(formatDate(dischargeDate))}</td>
      <td class="${dischargeClass}">${escapeHtml(daysRemaining)}</td>
      <td>${getCompletionBadge(client)}</td>
      <td><a href="#" onclick="openNotes('${client.id}'); return false;">Notes (${noteCount})</a></td>
      <td>
        <select onchange="handleRosterAction('${client.id}', this.value); this.value='';">
          <option value="">Actions</option>
          <option value="edit">Edit</option>
          <option value="phase1">Move to Phase 1</option>
          <option value="archive">Archive / Discharge</option>
        </select>
      </td>
    </tr>
  `;
}

function renderArchivedRoster() {
  const body = document.getElementById("archivedRosterBody");
  if (!body) return;

  const archived = getArchivedClients();

  body.innerHTML = archived.length
    ? archived.map(client => {
        const noteCount = Array.isArray(client.notes) ? client.notes.length : 0;

        return `
          <tr>
            <td>${escapeHtml(client.roomNumber)}</td>
            <td>${escapeHtml(client.firstName)}</td>
            <td>${escapeHtml(client.lastName)}</td>
            <td>${escapeHtml(client.clientId)}</td>
            <td>${escapeHtml(client.phone)}</td>
            <td>${escapeHtml(formatDate(client.entryDate))}</td>
            <td>${escapeHtml(formatDate(getDischargeDate(client)))}</td>
            <td>${escapeHtml(formatDateTime(client.archivedAt))}</td>
            <td>${escapeHtml(client.archiveReason)}</td>
            <td><a href="#" onclick="openNotes('${client.id}'); return false;">Notes (${noteCount})</a></td>
            <td>
              <select onchange="handleRosterAction('${client.id}', this.value); this.value='';">
                <option value="">Actions</option>
                <option value="restore">Restore</option>
                <option value="delete">Delete Permanently</option>
              </select>
            </td>
          </tr>
        `;
      }).join("")
    : `<tr><td colspan="11" class="empty">No archived roster records.</td></tr>`;
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

auth.onAuthStateChanged(user => {
  if (!user) return;

  listenToAppState(nextState => {
    rosterState = nextState;

    rosterState.roster = Array.isArray(rosterState.roster)
      ? rosterState.roster.filter(client => client && client !== "temp")
      : [];

    rosterState.roster.forEach(client => {
      client.roomNumber = client.roomNumber || "";
      client.phase = client.phase || "phase1";
      client.notes = Array.isArray(client.notes) ? client.notes : [];
      client.phase2AdmissionDate = client.phase2AdmissionDate || "";
      client.expectedDischargeDate = client.expectedDischargeDate || calculateExitDate(client.entryDate);
      client.opocCompleted = client.opocCompleted || false;
      client.archived = client.archived || false;
      client.archivedAt = client.archivedAt || "";
      client.archiveReason = client.archiveReason || "";
      client.phone = formatPhoneNumber(client.phone);
      client.contactPhone = formatPhoneNumber(client.contactPhone);
    });

    renderRoster();
  });
});
