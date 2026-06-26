let rosterState = defaultAppState();
let editingClientId = null;
let notesClientId = null;
let editingAll = false;

function getInputValue(id) {
  const input = document.getElementById(id);

  if (!input) {
    alert(`Missing input field: ${id}`);
    throw new Error(`Missing input field: ${id}`);
  }

  return input.value.trim();
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

  const client = {
    id: crypto.randomUUID(),
    roomNumber: getInputValue("roomNumber"),
    firstName: getInputValue("firstName"),
    lastName: getInputValue("lastName"),
    clientId: getInputValue("clientId"),
    dob: getInputValue("dob"),
    phone: getInputValue("phone"),
    address: getInputValue("address"),
    city: getInputValue("city"),
    contact: getInputValue("contact"),
    contactPhone: getInputValue("contactPhone"),
    entryDate: getInputValue("entryDate"),
    phase2AdmissionDate: "",
    phase: "phase1",
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

function calculateDaysRemaining(entryDate) {
  const exitDate = calculateExitDate(entryDate);
  if (!exitDate) return "";

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const exit = new Date(exitDate + "T00:00:00");
  const diffMs = exit.getTime() - today.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return "Due / Past";
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "1 day";

  return `${diffDays} days`;
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
    ? rosterState.roster.filter(client => client && client !== "temp")
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
  client.phone = getInputValue(`editPhone-${clientId}`);

  if ((client.phase || "phase1") === "phase1") {
    client.address = getInputValue(`editAddress-${clientId}`);
    client.city = getInputValue(`editCity-${clientId}`);
    client.contact = getInputValue(`editContact-${clientId}`);
    client.contactPhone = getInputValue(`editContactPhone-${clientId}`);
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

function removeClient(clientId) {
  const client = rosterState.roster.find(item => item.id === clientId);
  if (!client) return;

  if (!confirm(`Remove ${client.firstName} ${client.lastName} from the roster?`)) return;

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

function renderRoster() {
  updateEditAllButtons();
  renderPhase1Roster();
  renderPhase2Roster();
}

function getPhaseClients(phase) {
  return Array.isArray(rosterState.roster)
    ? rosterState.roster.filter(client =>
        client &&
        client !== "temp" &&
        (client.phase || "phase1") === phase
      )
    : [];
}

function renderPhase1Roster() {
  const body = document.getElementById("rosterBody");
  if (!body) return;

  const roster = getPhaseClients("phase1");

  body.innerHTML = roster.length
    ? roster.map(client => {
        const isEditing = editingAll || editingClientId === client.id;
        const exitDate = calculateExitDate(client.entryDate);
        const daysRemaining = calculateDaysRemaining(client.entryDate);
        const noteCount = Array.isArray(client.notes) ? client.notes.length : 0;

        if (isEditing) {
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
              <td>${escapeHtml(formatDate(exitDate))}</td>
              <td>${escapeHtml(daysRemaining)}</td>
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
            <td>${escapeHtml(formatDate(exitDate))}</td>
            <td>${escapeHtml(daysRemaining)}</td>
            <td>
              <a href="#" onclick="openNotes('${client.id}'); return false;">Add/View Notes (${noteCount})</a>
              <div class="actions" style="margin-top: 8px;">
                <button type="button" class="secondary" onclick="startInlineEdit('${client.id}')">Edit</button>
                <button type="button" class="success" onclick="moveToPhase('${client.id}', 'phase2')">Move to Phase 2</button>
                <button type="button" class="danger" onclick="removeClient('${client.id}')">Remove</button>
              </div>
            </td>
          </tr>
        `;
      }).join("")
    : `<tr><td colspan="14" class="empty">No Phase 1 clients.</td></tr>`;
}

function renderPhase2Roster() {
  const body = document.getElementById("phase2RosterBody");
  if (!body) return;

  const roster = getPhaseClients("phase2");

  body.innerHTML = roster.length
    ? roster.map(client => {
        const isEditing = editingAll || editingClientId === client.id;
        const noteCount = Array.isArray(client.notes) ? client.notes.length : 0;
        const exitDate = calculateExitDate(client.entryDate);
        const daysRemaining = calculateDaysRemaining(client.entryDate);

        if (isEditing) {
          return `
            <tr class="editing-row">
              <td><input id="editRoomNumber-${client.id}" value="${escapeAttribute(client.roomNumber)}" /></td>
              <td><input id="editFirstName-${client.id}" value="${escapeAttribute(client.firstName)}" /></td>
              <td><input id="editLastName-${client.id}" value="${escapeAttribute(client.lastName)}" /></td>
              <td><input id="editClientId-${client.id}" value="${escapeAttribute(client.clientId)}" /></td>
              <td><input id="editDob-${client.id}" type="date" value="${escapeAttribute(client.dob)}" /></td>
              <td class="phone-cell"><input id="editPhone-${client.id}" value="${escapeAttribute(client.phone)}" /></td>
              <td><input id="editPhase2AdmissionDate-${client.id}" type="date" value="${escapeAttribute(client.phase2AdmissionDate)}" /></td>
              <td>${escapeHtml(formatDate(exitDate))}</td>
              <td>${escapeHtml(daysRemaining)}</td>
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
          <tr>
            <td>${escapeHtml(client.roomNumber)}</td>
            <td>${escapeHtml(client.firstName)}</td>
            <td>${escapeHtml(client.lastName)}</td>
            <td>${escapeHtml(client.clientId)}</td>
            <td>${escapeHtml(formatDate(client.dob))}</td>
            <td class="phone-cell">${escapeHtml(client.phone)}</td>
            <td>${escapeHtml(formatDate(client.phase2AdmissionDate))}</td>
            <td>${escapeHtml(formatDate(exitDate))}</td>
            <td>${escapeHtml(daysRemaining)}</td>
            <td>
              <a href="#" onclick="openNotes('${client.id}'); return false;">Add/View Notes (${noteCount})</a>
              <div class="actions" style="margin-top: 8px;">
                <button type="button" class="secondary" onclick="startInlineEdit('${client.id}')">Edit</button>
                <button type="button" class="warning" onclick="moveToPhase('${client.id}', 'phase1')">Move to Phase 1</button>
                <button type="button" class="danger" onclick="removeClient('${client.id}')">Remove</button>
              </div>
            </td>
          </tr>
        `;
      }).join("")
    : `<tr><td colspan="10" class="empty">No Phase 2 clients.</td></tr>`;
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
    });

    renderRoster();
  });
});
