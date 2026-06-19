const STORAGE_KEY = "residentChoreRotator.github.v1";

let state = loadState();
migrateState();
autoReturnAwayResidents();
saveState();

function defaultState() {
  return {
    tableGenerated: false,
    residents: [
      { id: crypto.randomUUID(), name: "Resident 1", choreIndex: 0, exceptions: [], lockedChore: "", status: "active", awayUntil: "" },
      { id: crypto.randomUUID(), name: "Resident 2", choreIndex: 1, exceptions: [], lockedChore: "", status: "active", awayUntil: "" },
      { id: crypto.randomUUID(), name: "Resident 3", choreIndex: 2, exceptions: [], lockedChore: "", status: "active", awayUntil: "" }
    ],
    chores: ["Kitchen", "Bathrooms", "Common Area", "Garbage"],
    history: []
  };
}

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  const olderV2 = localStorage.getItem("residentChoreRotator.v2");
  const olderV1 = localStorage.getItem("residentChoreRotator.v1");
  const source = saved || olderV2 || olderV1;

  if (!source) return defaultState();

  try {
    const parsed = JSON.parse(source);
    if (!Array.isArray(parsed.residents) || !Array.isArray(parsed.chores)) return defaultState();
    return parsed;
  } catch {
    return defaultState();
  }
}

function migrateState() {
  state.tableGenerated = Boolean(state.tableGenerated);
  state.chores = Array.isArray(state.chores) ? state.chores : [];
  state.history = Array.isArray(state.history) ? state.history : [];

  state.residents = (Array.isArray(state.residents) ? state.residents : []).map((resident, index) => ({
    id: resident.id || crypto.randomUUID(),
    name: resident.name || `Resident ${index + 1}`,
    choreIndex: Number.isInteger(resident.choreIndex) ? resident.choreIndex : 0,
    exceptions: Array.isArray(resident.exceptions) ? resident.exceptions : [],
    lockedChore: resident.lockedChore || "",
    status: resident.status || "active",
    awayUntil: resident.awayUntil || ""
  }));
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function todayDateString() {
  return new Date().toISOString().slice(0, 10);
}

function autoReturnAwayResidents() {
  const today = todayDateString();

  state.residents = state.residents.map(resident => {
    if (resident.status === "away" && resident.awayUntil && resident.awayUntil < today) {
      return { ...resident, status: "active", awayUntil: "" };
    }
    return resident;
  });
}

function activeResidents() {
  return state.residents.filter(resident => resident.status === "active");
}

function archivedResidents() {
  return state.residents.filter(resident => resident.status === "archived");
}

function normalizeChoreIndex(index) {
  if (state.chores.length === 0) return -1;
  return ((index % state.chores.length) + state.chores.length) % state.chores.length;
}

function getChoreName(index) {
  if (state.chores.length === 0 || index < 0) return "No chore";
  return state.chores[normalizeChoreIndex(index)];
}

function choreIndexByName(choreName) {
  return state.chores.findIndex(chore => chore === choreName);
}

function canAssign(resident, choreIndex) {
  return !resident.exceptions.includes(getChoreName(choreIndex));
}

function nextAllowedChoreIndex(resident, startIndex) {
  if (state.chores.length === 0) return -1;

  if (resident.lockedChore && state.chores.includes(resident.lockedChore)) {
    return choreIndexByName(resident.lockedChore);
  }

  for (let offset = 0; offset < state.chores.length; offset++) {
    const candidate = normalizeChoreIndex(startIndex + offset);
    if (canAssign(resident, candidate)) return candidate;
  }

  return resident.choreIndex;
}

function addResident() {
  const input = document.getElementById("residentName");
  const name = input.value.trim();
  if (!name) return;

  state.residents.push({
    id: crypto.randomUUID(),
    name,
    choreIndex: 0,
    exceptions: [],
    lockedChore: "",
    status: "active",
    awayUntil: ""
  });

  input.value = "";
  saveState();
  render();
}

function editResident(id) {
  const resident = state.residents.find(r => r.id === id);
  if (!resident) return;

  const newName = prompt("Edit resident name:", resident.name);
  if (newName === null) return;

  const cleanName = newName.trim();
  if (!cleanName) return;

  resident.name = cleanName;
  saveState();
  render();
}

function setResidentStatus(id, status) {
  const resident = state.residents.find(r => r.id === id);
  if (!resident) return;

  resident.status = status;
  if (status !== "away") resident.awayUntil = "";

  saveState();
  render();
}

function setAwayUntil() {
  const residentId = document.getElementById("leaveResident").value;
  const date = document.getElementById("awayUntilDate").value;
  const resident = state.residents.find(r => r.id === residentId);

  if (!resident || !date) {
    alert("Choose a resident and an away-until date.");
    return;
  }

  resident.status = "away";
  resident.awayUntil = date;

  saveState();
  render();
}

function deleteResident(id) {
  const resident = state.residents.find(r => r.id === id);
  if (!resident) return;

  const confirmed = confirm(`Permanently delete ${resident.name}? This cannot be undone.`);
  if (!confirmed) return;

  state.residents = state.residents.filter(r => r.id !== id);
  saveState();
  render();
}

function addChore() {
  const input = document.getElementById("choreName");
  const name = input.value.trim();
  if (!name || state.chores.includes(name)) return;

  state.chores.push(name);
  saveState();
  render();
}

function removeChore(choreName) {
  const confirmed = confirm(`Remove chore: ${choreName}?`);
  if (!confirmed) return;

  state.chores = state.chores.filter(chore => chore !== choreName);
  state.residents = state.residents.map(resident => ({
    ...resident,
    choreIndex: normalizeChoreIndex(resident.choreIndex),
    exceptions: resident.exceptions.filter(exception => exception !== choreName),
    lockedChore: resident.lockedChore === choreName ? "" : resident.lockedChore
  }));

  saveState();
  render();
}

function setResidentChore(residentId, choreIndex) {
  const resident = state.residents.find(r => r.id === residentId);
  if (!resident) return;

  resident.choreIndex = Number(choreIndex);
  saveState();
  render();
}

function generateTable() {
  state.tableGenerated = true;
  state.residents = state.residents.map(resident => {
    if (resident.status !== "active") return resident;
    return { ...resident, choreIndex: nextAllowedChoreIndex(resident, resident.choreIndex) };
  });

  saveState();
  render();
}

function rotateChores() {
  if (!state.tableGenerated) {
    generateTable();
    return;
  }

  const timestamp = new Date().toLocaleString();

  state.residents = state.residents.map(resident => {
    if (resident.status !== "active") return resident;

    const oldChore = getChoreName(resident.choreIndex);
    const proposedIndex = normalizeChoreIndex(resident.choreIndex + 1);
    const newIndex = nextAllowedChoreIndex(resident, proposedIndex);
    const newChore = getChoreName(newIndex);

    state.history.unshift({
      id: crypto.randomUUID(),
      timestamp,
      residentName: resident.name,
      oldChore,
      newChore
    });

    return { ...resident, choreIndex: newIndex };
  });

  saveState();
  render();
}

function addException() {
  const residentId = document.getElementById("exceptionResident").value;
  const choreName = document.getElementById("exceptionChore").value;
  const resident = state.residents.find(r => r.id === residentId);
  if (!resident || !choreName) return;

  if (resident.lockedChore === choreName) {
    alert("This resident is locked to that chore. Clear the lock before blocking it.");
    return;
  }

  if (!resident.exceptions.includes(choreName)) resident.exceptions.push(choreName);

  if (resident.status === "active" && getChoreName(resident.choreIndex) === choreName) {
    resident.choreIndex = nextAllowedChoreIndex(resident, resident.choreIndex + 1);
  }

  saveState();
  render();
}

function removeException(residentId, choreName) {
  const resident = state.residents.find(r => r.id === residentId);
  if (!resident) return;

  resident.exceptions = resident.exceptions.filter(exception => exception !== choreName);
  saveState();
  render();
}

function lockResidentToChore() {
  const residentId = document.getElementById("exceptionResident").value;
  const choreName = document.getElementById("exceptionChore").value;
  const resident = state.residents.find(r => r.id === residentId);
  if (!resident || !choreName) return;

  resident.lockedChore = choreName;
  resident.exceptions = resident.exceptions.filter(exception => exception !== choreName);
  resident.choreIndex = choreIndexByName(choreName);

  saveState();
  render();
}

function clearResidentLock() {
  const residentId = document.getElementById("exceptionResident").value;
  const resident = state.residents.find(r => r.id === residentId);
  if (!resident) return;

  resident.lockedChore = "";
  saveState();
  render();
}

function clearHistory() {
  const confirmed = confirm("Clear the full rotation history log?");
  if (!confirmed) return;

  state.history = [];
  saveState();
  render();
}

function exportBackup() {
  const backup = {
    app: "residentChoreRotator",
    version: 2,
    exportedAt: new Date().toISOString(),
    state
  };

  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `resident-chore-backup-${todayDateString()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function importBackup(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      const importedState = parsed.state || parsed;

      if (!Array.isArray(importedState.residents) || !Array.isArray(importedState.chores)) {
        alert("This does not look like a valid chore backup file.");
        return;
      }

      const confirmed = confirm("Importing this backup will replace the current roster, chores, locks, leave status, and history. Continue?");
      if (!confirmed) return;

      state = importedState;
      migrateState();
      autoReturnAwayResidents();
      saveState();
      render();
      alert("Backup imported successfully.");
    } catch {
      alert("Could not import backup. Check that the file is valid JSON.");
    } finally {
      event.target.value = "";
    }
  };

  reader.readAsText(file);
}

function render() {
  autoReturnAwayResidents();
  renderResidentLists();
  renderChoreList();
  renderManualAssignments();
  renderGeneratedTable();
  renderExceptionControls();
  renderLeaveControls();
  renderHistory();
}

function renderResidentLists() {
  const activeAndAway = state.residents.filter(r => r.status !== "archived");
  const residentList = document.getElementById("residentList");
  const archivedList = document.getElementById("archivedResidentList");

  residentList.innerHTML = activeAndAway.length
    ? activeAndAway.map(r => `
        <li>
          <span>
            ${escapeHtml(r.name)}
            ${statusBadge(r)}
          </span>
          <span class="actions">
            <button class="secondary" onclick="editResident('${r.id}')">Edit</button>
            ${
              r.status === "away"
                ? `<button class="success" onclick="setResidentStatus('${r.id}', 'active')">Return</button>`
                : `<button class="warning" onclick="setResidentStatus('${r.id}', 'away')">Away</button>`
            }
            <button class="danger" onclick="setResidentStatus('${r.id}', 'archived')">Archive</button>
          </span>
        </li>
      `).join("")
    : `<li class="empty">No current residents added.</li>`;

  archivedList.innerHTML = archivedResidents().length
    ? archivedResidents().map(r => `
        <li>
          <span>
            ${escapeHtml(r.name)}
            <span class="status archived">Archived</span>
          </span>
          <span class="actions">
            <button class="secondary" onclick="editResident('${r.id}')">Edit</button>
            <button class="success" onclick="setResidentStatus('${r.id}', 'active')">Restore</button>
            <button class="danger" onclick="deleteResident('${r.id}')">Delete</button>
          </span>
        </li>
      `).join("")
    : `<li class="empty">No archived residents.</li>`;
}

function statusBadge(resident) {
  if (resident.status === "away") {
    const dateText = resident.awayUntil ? ` until ${resident.awayUntil}` : "";
    return `<span class="status away">Away / Omitted${dateText}</span>`;
  }

  if (resident.status === "archived") {
    return `<span class="status archived">Archived</span>`;
  }

  return `<span class="status active">Active</span>`;
}

function renderChoreList() {
  document.getElementById("choreList").innerHTML = state.chores.length
    ? state.chores.map(chore => `
        <li>
          <span>${escapeHtml(chore)}</span>
          <button class="danger" onclick="removeChore('${escapeJs(chore)}')">Remove</button>
        </li>
      `).join("")
    : `<li class="empty">No chores added.</li>`;
}

function renderManualAssignments() {
  const body = document.getElementById("assignmentBody");
  const residents = activeResidents();

  if (residents.length === 0 || state.chores.length === 0) {
    body.innerHTML = `<tr><td colspan="3" class="empty">Add active residents and chores first.</td></tr>`;
    return;
  }

  body.innerHTML = residents.map(resident => `
    <tr>
      <td>${escapeHtml(resident.name)}</td>
      <td>
        <select onchange="setResidentChore('${resident.id}', this.value)" ${resident.lockedChore ? "disabled" : ""}>
          ${state.chores.map((chore, index) => `
            <option value="${index}" ${normalizeChoreIndex(resident.choreIndex) === index ? "selected" : ""}>
              ${escapeHtml(chore)}
            </option>
          `).join("")}
        </select>
      </td>
      <td>${resident.lockedChore ? `<span class="status away">Locked to ${escapeHtml(resident.lockedChore)}</span>` : `<span class="status active">Active</span>`}</td>
    </tr>
  `).join("");
}

function renderGeneratedTable() {
  const body = document.getElementById("rotationBody");
  const residents = activeResidents();

  if (!state.tableGenerated) {
    body.innerHTML = `<tr><td colspan="5" class="empty">Manual assignments are ready. Click Generate Table.</td></tr>`;
    return;
  }

  if (residents.length === 0) {
    body.innerHTML = `<tr><td colspan="5" class="empty">No active residents. Away and archived residents are omitted.</td></tr>`;
    return;
  }

  body.innerHTML = residents.map(resident => {
    const exceptions = resident.exceptions.length
      ? resident.exceptions.map(chore => `
          <span class="badge">
            ${escapeHtml(chore)}
            <button class="secondary" onclick="removeException('${resident.id}', '${escapeJs(chore)}')">x</button>
          </span>
        `).join("")
      : `<span class="empty">None</span>`;

    return `
      <tr>
        <td>${escapeHtml(resident.name)}</td>
        <td>${escapeHtml(getChoreName(resident.choreIndex))}</td>
        <td>${exceptions}</td>
        <td>${resident.lockedChore ? `<span class="status away">${escapeHtml(resident.lockedChore)}</span>` : `<span class="empty">Not locked</span>`}</td>
        <td>
          <button class="secondary" onclick="editResident('${resident.id}')">Edit</button>
          <button class="warning" onclick="setResidentStatus('${resident.id}', 'away')">Away</button>
          <button class="danger" onclick="setResidentStatus('${resident.id}', 'archived')">Archive</button>
        </td>
      </tr>
    `;
  }).join("");
}

function renderExceptionControls() {
  document.getElementById("exceptionResident").innerHTML = activeResidents().map(r =>
    `<option value="${r.id}">${escapeHtml(r.name)}</option>`
  ).join("");

  document.getElementById("exceptionChore").innerHTML = state.chores.map(chore =>
    `<option value="${escapeHtml(chore)}">${escapeHtml(chore)}</option>`
  ).join("");
}

function renderLeaveControls() {
  const select = document.getElementById("leaveResident");
  if (!select) return;

  select.innerHTML = state.residents
    .filter(r => r.status !== "archived")
    .map(r => `<option value="${r.id}">${escapeHtml(r.name)}</option>`)
    .join("");
}

function renderHistory() {
  const body = document.getElementById("historyBody");
  if (!body) return;

  body.innerHTML = state.history.length
    ? state.history.slice(0, 100).map(item => `
        <tr>
          <td>${escapeHtml(item.timestamp)}</td>
          <td>${escapeHtml(item.residentName)}</td>
          <td>${escapeHtml(item.oldChore)}</td>
          <td>${escapeHtml(item.newChore)}</td>
        </tr>
      `).join("")
    : `<tr><td colspan="4" class="empty">No rotation history yet.</td></tr>`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[char]));
}

function escapeJs(value) {
  return String(value).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

document.getElementById("rotateBtn").addEventListener("click", rotateChores);
document.getElementById("generateTableBtn").addEventListener("click", generateTable);
document.getElementById("addResidentBtn").addEventListener("click", addResident);
document.getElementById("addChoreBtn").addEventListener("click", addChore);
document.getElementById("addExceptionBtn").addEventListener("click", addException);
document.getElementById("lockChoreBtn").addEventListener("click", lockResidentToChore);
document.getElementById("clearLockBtn").addEventListener("click", clearResidentLock);
document.getElementById("setAwayUntilBtn").addEventListener("click", setAwayUntil);
document.getElementById("clearHistoryBtn").addEventListener("click", clearHistory);
document.getElementById("exportBackupBtn").addEventListener("click", exportBackup);
document.getElementById("importBackupInput").addEventListener("change", importBackup);

document.getElementById("residentName").addEventListener("keydown", e => {
  if (e.key === "Enter") addResident();
});

document.getElementById("choreName").addEventListener("keydown", e => {
  if (e.key === "Enter") addChore();
});

render();
