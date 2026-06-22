let rosterState = defaultAppState();
let editingClientId = null;

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
    firstName: document.getElementById("firstName").value.trim(),
    lastName: document.getElementById("lastName").value.trim(),
    dob: document.getElementById("dob").value,
    entryDate: document.getElementById("entryDate").value
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
  ["firstName", "lastName", "dob", "entryDate"].forEach(id => {
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

  client.firstName = document.getElementById(`editFirstName-${clientId}`).value.trim();
  client.lastName = document.getElementById(`editLastName-${clientId}`).value.trim();
  client.dob = document.getElementById(`editDob-${clientId}`).value;
  client.entryDate = document.getElementById(`editEntryDate-${clientId}`).value;

  editingClientId = null;
  saveRoster();
}

function removeClient(clientId) {
  const client = rosterState.roster.find(item => item.id === clientId);
  if (!client) return;

  if (!confirm(`Remove ${client.firstName} ${client.lastName} from the roster?`)) return;

  rosterState.roster = rosterState.roster.filter(item => item.id !== clientId);
  saveRoster();
}

function renderRoster() {
  const body = document.getElementById("rosterBody");
  if (!body) return;

  const roster = Array.isArray(rosterState.roster)
    ? rosterState.roster.filter(client => client && client !== "temp")
    : [];

  body.innerHTML = roster.length
    ? roster.map((client, index) => {
        const isEditing = editingClientId === client.id;
        const exitDate = calculateExitDate(client.entryDate);

        if (isEditing) {
          return `
            <tr class="editing-row">
              <td>${index + 1}</td>
              <td><input id="editFirstName-${client.id}" value="${escapeAttribute(client.firstName)}" /></td>
              <td><input id="editLastName-${client.id}" value="${escapeAttribute(client.lastName)}" /></td>
              <td><input id="editDob-${client.id}" type="date" value="${escapeAttribute(client.dob)}" /></td>
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
            <td>${escapeHtml(client.firstName)}</td>
            <td>${escapeHtml(client.lastName)}</td>
            <td>${escapeHtml(formatDate(client.dob))}</td>
            <td>${escapeHtml(formatDate(client.entryDate))}</td>
            <td>${escapeHtml(formatDate(exitDate))}</td>
            <td>
              <button type="button" class="secondary" onclick="startInlineEdit('${client.id}')">Edit</button>
              <button type="button" class="danger" onclick="removeClient('${client.id}')">Remove</button>
            </td>
          </tr>
        `;
      }).join("")
    : `<tr><td colspan="7" class="empty">No clients on the current roster.</td></tr>`;
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
  document.getElementById("addClientBtn")?.addEventListener("click", addClient);
});

auth.onAuthStateChanged(user => {
  if (!user) return;

  listenToAppState(nextState => {
    rosterState = nextState;
    rosterState.roster = Array.isArray(rosterState.roster)
      ? rosterState.roster.filter(client => client && client !== "temp")
      : [];

    renderRoster();
  });
});
