let rosterState = defaultAppState();
let editingClientId = null;
let notesClientId = null;

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
    clientId: getInputValue("clientId"),
    firstName: getInputValue("firstName"),
    lastName: getInputValue("lastName"),
    dob: getInputValue("dob"),
    phone: getInputValue("phone"),
    address: getInputValue("address"),
    city: getInputValue("city"),
    contact: getInputValue("contact"),
    contactPhone: getInputValue("contactPhone"),
    entryDate: getInputValue("entryDate"),
    phase: "phase1",
    notes: []
  };

  if (!client.firstName || !client.lastName) {
    alert("Enter at least a first and last name.");
    return;
  }

  rosterState.roster.push(client);
  clearClientForm();
  saveRoster();
}

function clearClientForm() {
  [
    "clientId",
    "firstName",
    "lastName",
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

  const date = new Date(entryDate + "T00:00:00");
  date.setDate(date.getDate() + 89);

  return date.toISOString().slice(0, 10);
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
  renderRoster();
}

function cancelInlineEdit() {
  editingClientId = null;
  renderRoster();
}

function saveInlineEdit(clientId) {
  const client = rosterState.roster.find(item => item.id === clientId);
  if (!client) return;

  client.clientId = getInputValue(`editClientId-${clientId}`);
  client.firstName = getInputValue(`editFirstName-${clientId}`);
  client.lastName = getInputValue(`editLastName-${clientId}`);
  client.dob = getInputValue(`editDob-${clientId}`);
  client.phone = getInputValue(`editPhone-${clientId}`);
  client.address = getInputValue(`editAddress-${clientId}`);
  client.city = getInputValue(`editCity-${clientId}`);
  client.contact = getInputValue(`editContact-${clientId}`);
  client.contactPhone = getInputValue(`editContactPhone-${clientId}`);
  client.entryDate = getInputValue(`editEntryDate-${clientId}`);

  editingClientId = null;
  saveRoster();
}

function moveToPhase(clientId, phase) {
  const client = rosterState.roster.find(item => item.id === clientId);
  if (!client) return;

  client.phase = phase;
  saveRoster();
}

function removeClient(clientId) {
  const client = rosterState.roster.find(item => item.id === clientId);
  if (!client) return;

  if (!confirm(`Remove ${client.firstName} ${client.lastName} from the roster?`)) return;

  rosterState.roster = rosterState.roster.filter(item => item.id !== clientId);
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
  renderRosterTable("rosterBody", "phase1");
  renderRosterTable("phase2RosterBody", "phase2");
}

function renderRosterTable(bodyId, phase) {
  const body = document.getElementById(bodyId);
  if (!body) return;

  const roster = Array.isArray(rosterState.roster)
    ? rosterState.roster.filter(client =>
        client &&
        client !== "temp" &&
        (client.phase || "phase1") === phase
      )
    : [];

  body.innerHTML = roster.length
    ? roster.map((client, index) => {
        const isEditing = editingClientId === client.id;
        const exitDate = calculateExitDate(client.entryDate);
        const noteCount = Array.isArray(client.notes) ? client.notes.length : 0;

        if (isEditing) {
          return `
            <tr class="editing-row">
              <td>${index + 1}</td>
              <td><input id="editClientId-${client.id}" value="${escapeAttribute(client.clientId)}" /></td>
              <td><input id="editFirstName-${client.id}" value="${escapeAttribute(client.firstName)}" /></td>
              <td><input id="editLastName-${client.id}" value="${escapeAttribute(client.lastName)}" /></td>
              <td><input id="editDob-${client.id}" type="date" value="${escapeAttribute(client.dob)}" /></td>
              <td><input id="editPhone-${client.id}" value="${escapeAttribute(client.phone)}" /></td>
              <td><input id="editAddress-${client.id}" value="${escapeAttribute(client.address)}" /></td>
              <td><input id="editCity-${client.id}" value="${escapeAttribute(client.city)}" /></td>
              <td><input id="editContact-${client.id}" value="${escapeAttribute(client.contact)}" /></td>
              <td><input id="editContactPhone-${client.id}" value="${escapeAttribute(client.contactPhone)}" /></td>
              <td><input id="editEntryDate-${client.id}" type="date" value="${escapeAttribute(client.entryDate)}" /></td>
              <td>${escapeHtml(formatDate(exitDate))}</td>
              <td>
                <button type="button" class="success" onclick="saveInlineEdit('${client.id}')">Save</button>
                <button type="button" class="secondary" onclick="cancelInlineEdit()">Cancel</button>
              </td>
            </tr>
          `;
        }

        return `
          <tr>
            <td>${index + 1}</td>
            <td>${escapeHtml(client.clientId)}</td>
            <td>${escapeHtml(client.firstName)}</td>
            <td>${escapeHtml(client.lastName)}</td>
            <td>${escapeHtml(formatDate(client.dob))}</td>
            <td>${escapeHtml(client.phone)}</td>
            <td>${escapeHtml(client.address)}</td>
            <td>${escapeHtml(client.city)}</td>
            <td>${escapeHtml(client.contact)}</td>
            <td>${escapeHtml(client.contactPhone)}</td>
            <td>${escapeHtml(formatDate(client.entryDate))}</td>
            <td>${escapeHtml(formatDate(exitDate))}</td>
            <td>
              <a href="#" onclick="openNotes('${client.id}'); return false;">Add/View Notes (${noteCount})</a>
              <div class="actions" style="margin-top: 8px;">
                <button type="button" class="secondary" onclick="startInlineEdit('${client.id}')">Edit</button>
                ${
                  phase === "phase1"
                    ? `<button type="button" class="success" onclick="moveToPhase('${client.id}', 'phase2')">Move to Phase 2</button>`
                    : `<button type="button" class="warning" onclick="moveToPhase('${client.id}', 'phase1')">Move to Phase 1</button>`
                }
                <button type="button" class="danger" onclick="removeClient('${client.id}')">Remove</button>
              </div>
            </td>
          </tr>
        `;
      }).join("")
    : `<tr><td colspan="13" class="empty">No clients in this section.</td></tr>`;
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
  const addClientBtn = document.getElementById("addClientBtn");
  if (!addClientBtn) {
    alert("Add Client button not found.");
    return;
  }

  addClientBtn.addEventListener("click", addClient);
  document.getElementById("addNoteBtn")?.addEventListener("click", addClientNote);
  document.getElementById("closeNotesBtn")?.addEventListener("click", closeNotesModal);
});

auth.onAuthStateChanged(user => {
  if (!user) return;

  listenToAppState(nextState => {
    rosterState = nextState;

    rosterState.roster = Array.isArray(rosterState.roster)
      ? rosterState.roster.filter(client => client && client !== "temp")
      : [];

    rosterState.roster.forEach(client => {
      client.phase = client.phase || "phase1";
      client.notes = Array.isArray(client.notes) ? client.notes : [];
    });

    renderRoster();
  });
});
