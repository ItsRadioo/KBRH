let state = defaultAppState();
let unsubscribeApp = null;
let isSavingSync = false;

function todayDateString() {
  return new Date().toISOString().slice(0, 10);
}

function ensureStandardChoresExist() {
  let changed = false;

  if (!Array.isArray(state.chores) || state.chores.length === 0) {
    state.chores = [...STANDARD_CHORES];
    return true;
  }

  STANDARD_CHORES.forEach(chore => {
    if (!state.chores.includes(chore)) {
      state.chores.push(chore);
      changed = true;
    }
  });

  return changed;
}

function syncResidentsFromRoster() {
  const existingResidents = Array.isArray(state.residents) ? state.residents : [];
  const roster = Array.isArray(state.roster)
    ? state.roster.filter(client => client && client !== "temp")
    : [];

  const phaseOneClients = roster.filter(client => (client.phase || "phase1") === "phase1");

  const syncedResidents = phaseOneClients.map((client, index) => {
    const fullName = `${client.firstName || ""} ${client.lastName || ""}`.trim();

    const existing = existingResidents.find(resident =>
      resident.rosterClientId === client.id ||
      resident.name?.toLowerCase() === fullName.toLowerCase()
    );

    return {
      id: existing?.id || crypto.randomUUID(),
      rosterClientId: client.id,
      name: fullName || `Resident ${index + 1}`,
      choreIndex: Number.isInteger(Number(existing?.choreIndex))
        ? Number(existing.choreIndex)
        : index,
      exceptions: Array.isArray(existing?.exceptions) ? existing.exceptions : [],
      lockedChore: existing?.lockedChore || "",
      status: existing?.status || "active",
      awayUntil: existing?.awayUntil || ""
    };
  });

  const before = JSON.stringify(existingResidents.map(r => ({
    rosterClientId: r.rosterClientId || "",
    name: r.name,
    choreIndex: r.choreIndex,
    exceptions: r.exceptions,
    lockedChore: r.lockedChore,
    status: r.status,
    awayUntil: r.awayUntil
  })));

  const after = JSON.stringify(syncedResidents.map(r => ({
    rosterClientId: r.rosterClientId || "",
    name: r.name,
    choreIndex: r.choreIndex,
    exceptions: r.exceptions,
    lockedChore: r.lockedChore,
    status: r.status,
    awayUntil: r.awayUntil
  })));

  state.residents = syncedResidents;

  return before !== after;
}

function autoReturnAwayResidents() {
  const today = todayDateString();
  let changed = false;

  state.residents = state.residents.map(resident => {
    if (resident.status === "away" && resident.awayUntil && resident.awayUntil < today) {
      changed = true;
      return { ...resident, status: "active", awayUntil: "" };
    }

    return resident;
  });

  return changed;
}

function activeResidents() {
  return (state.residents || []).filter(resident => resident.status === "active");
}

function archivedResidents() {
  return (state.residents || []).filter(resident => resident.status === "archived");
}

function normalizeChoreIndex(index) {
  if (!state.chores.length) return -1;
  return ((index % state.chores.length) + state.chores.length) % state.chores.length;
}

function getChoreName(index) {
  if (!state.chores.length || index < 0) return "No chore";
  return state.chores[normalizeChoreIndex(index)];
}

function choreIndexByName(choreName) {
  return state.chores.findIndex(chore => chore === choreName);
}

function canAssign(resident, choreIndex) {
  return !resident.exceptions.includes(getChoreName(choreIndex));
}

function allowsMultiple(choreName) {
  return choreName === "Outside Yardwork";
}

function nextAllowedChoreIndex(resident, startIndex, occupiedChores = new Set()) {
  if (!state.chores.length) return -1;

  if (resident.lockedChore && state.chores.includes(resident.lockedChore)) {
    return choreIndexByName(resident.lockedChore);
  }

  for (let offset = 0; offset < state.chores.length; offset++) {
    const candidate = normalizeChoreIndex(startIndex + offset);
    const choreName = getChoreName(candidate);
    const occupied = occupiedChores.has(choreName) && !allowsMultiple(choreName);

    if (canAssign(resident, candidate) && !occupied) return candidate;
  }

  return resident.choreIndex;
}

async function saveAndRender() {
  ensureStandardChoresExist();
  await saveAppState(state);
}

function addChore() {
  const input = document.getElementById("choreName");
  const name = input.value.trim();

  if (!name || state.chores.includes(name)) return;

  state.chores.push(name);
  input.value = "";
  saveAndRender();
}

function resetDefaultChores() {
  const confirmed = confirm("Reset the chore list to the standard 10 chores?");
  if (!confirmed) return;

  state.chores = [...STANDARD_CHORES];

  state.residents = state.residents.map(resident => ({
    ...resident,
    choreIndex: normalizeChoreIndex(resident.choreIndex),
    exceptions: resident.exceptions.filter(exception => state.chores.includes(exception)),
    lockedChore: state.chores.includes(resident.lockedChore) ? resident.lockedChore : ""
  }));

  saveAndRender();
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

  saveAndRender();
}

function setResidentChore(residentId, choreIndex) {
  const resident = state.residents.find(r => r.id === residentId);
  if (!resident) return;

  resident.choreIndex = Number(choreIndex);
  saveAndRender();
}

function setResidentStatus(id, status) {
  const resident = state.residents.find(r => r.id === id);
  if (!resident) return;

  resident.status = status;
  if (status !== "away") resident.awayUntil = "";

  saveAndRender();
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

  saveAndRender();
}

function generateTable() {
  state.tableGenerated = true;

  state.residents = state.residents.map(resident => {
    if (resident.status !== "active") return resident;
    return { ...resident, choreIndex: nextAllowedChoreIndex(resident, resident.choreIndex) };
  });

  saveAndRender();
}

function rotateChores() {
  if (!state.tableGenerated) {
    generateTable();
    return;
  }

  const timestamp = new Date().toLocaleString();
  const occupiedChores = new Set();

  state.residents.forEach(resident => {
    if (resident.status === "active" && resident.lockedChore && state.chores.includes(resident.lockedChore)) {
      resident.choreIndex = choreIndexByName(resident.lockedChore);
      if (!allowsMultiple(resident.lockedChore)) occupiedChores.add(resident.lockedChore);
    }
  });

  state.residents = state.residents.map(resident => {
    if (resident.status !== "active") return resident;

    const oldChore = getChoreName(resident.choreIndex);

    if (resident.lockedChore && state.chores.includes(resident.lockedChore)) {
      const lockedIndex = choreIndexByName(resident.lockedChore);
      const newChore = getChoreName(lockedIndex);

      state.history.unshift({
        id: crypto.randomUUID(),
        timestamp,
        residentName: resident.name,
        oldChore,
        newChore
      });

      return { ...resident, choreIndex: lockedIndex };
    }

    const proposedIndex = normalizeChoreIndex(resident.choreIndex + 1);
    const newIndex = nextAllowedChoreIndex(resident, proposedIndex, occupiedChores);
    const newChore = getChoreName(newIndex);

    if (!allowsMultiple(newChore)) occupiedChores.add(newChore);

    state.history.unshift({
      id: crypto.randomUUID(),
      timestamp,
      residentName: resident.name,
      oldChore,
      newChore
    });

    return { ...resident, choreIndex: newIndex };
  });

  saveAndRender();
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

  saveAndRender();
}

function removeException(residentId, choreName) {
  const resident = state.residents.find(r => r.id === residentId);
  if (!resident) return;

  resident.exceptions = resident.exceptions.filter(exception => exception !== choreName);
  saveAndRender();
}

function lockResidentToChore() {
  const residentId = document.getElementById("exceptionResident").value;
  const choreName = document.getElementById("exceptionChore").value;
  const resident = state.residents.find(r => r.id === residentId);

  if (!resident || !choreName) return;

  resident.lockedChore = choreName;
  resident.exceptions = resident.exceptions.filter(exception => exception !== choreName);
  resident.choreIndex = choreIndexByName(choreName);

  saveAndRender();
}

function clearResidentLock() {
  const residentId = document.getElementById("exceptionResident").value;
  const resident = state.residents.find(r => r.id === residentId);

  if (!resident) return;

  resident.lockedChore = "";
  saveAndRender();
}

function clearHistory() {
  const confirmed = confirm("Clear the full rotation history log?");
  if (!confirmed) return;

  state.history = [];
  saveAndRender();
}

function exportBackup() {
  const backup = {
    app: "residentChoreRotator",
    version: 6,
    exportedAt: new Date().toISOString(),
    state
  };

  const blob = new Blob([JSON.stringify(backup, null, 2)], {
    type: "application/json"
  });

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

  reader.onload = async () => {
    try {
      const parsed = JSON.parse(reader.result);
      const importedState = parsed.state || parsed;

      const confirmed = confirm("Importing this backup will replace shared online data. Continue?");
      if (!confirmed) return;

      state = normalizeAppState(importedState);
      ensureStandardChoresExist();

      await saveAppState(state);
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
  renderResidentLists();
  renderChoreList();
  renderManualAssignments();
  renderGeneratedTable();
  renderExceptionControls();
  renderLeaveControls();
  renderHistory();
}

function renderResidentLists() {
  const residentList = document.getElementById("residentList");
  if (!residentList) return;

  const activeAndAway = state.residents.filter(r => r.status !== "archived");

  residentList.innerHTML = activeAndAway.length
    ? activeAndAway.map(r => `
        <li>
          <span>
            ${escapeHtml(r.name)}
            ${statusBadge(r)}
          </span>
          <span class="actions">
            ${
              r.status === "away"
                ? `<button class="success" onclick="setResidentStatus('${r.id}', 'active')">Return</button>`
                : `<button class="warning" onclick="setResidentStatus('${r.id}', 'away')">Away</button>`
            }
          </span>
        </li>
      `).join("")
    : `<li class="empty">No Phase 1 clients found in Current Roster.</li>`;
}

function statusBadge(resident) {
  if (resident.status === "away") {
    const dateText = resident.awayUntil ? ` until ${resident.awayUntil}` : "";
    return `<span class="status away">Away / Omitted${dateText}</span>`;
  }

  return `<span class="status active">Active</span>`;
}

function renderChoreList() {
  const list = document.getElementById("choreList");
  if (!list) return;

  list.innerHTML = state.chores.length
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
  if (!body) return;

  const residents = activeResidents();

  if (!residents.length || !state.chores.length) {
    body.innerHTML = `<tr><td colspan="3" class="empty">Add Phase 1 clients in Current Roster first.</td></tr>`;
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
  if (!body) return;

  const residents = activeResidents();

  if (!state.tableGenerated) {
    body.innerHTML = `<tr><td colspan="5" class="empty">Manual assignments are ready. Click Generate Table.</td></tr>`;
    return;
  }

  if (!residents.length) {
    body.innerHTML = `<tr><td colspan="5" class="empty">No active residents.</td></tr>`;
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
          <button class="warning" onclick="setResidentStatus('${resident.id}', 'away')">Away</button>
        </td>
      </tr>
    `;
  }).join("");
}

function renderExceptionControls() {
  const residentSelect = document.getElementById("exceptionResident");
  const choreSelect = document.getElementById("exceptionChore");

  if (!residentSelect || !choreSelect) return;

  residentSelect.innerHTML = activeResidents().map(r =>
    `<option value="${r.id}">${escapeHtml(r.name)}</option>`
  ).join("");

  choreSelect.innerHTML = state.chores.map(chore =>
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
  return String(value || "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[char]));
}

function escapeJs(value) {
  return String(value || "").replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

document.getElementById("rotateBtn")?.addEventListener("click", rotateChores);
document.getElementById("generateTableBtn")?.addEventListener("click", generateTable);
document.getElementById("addChoreBtn")?.addEventListener("click", addChore);
document.getElementById("resetChoresBtn")?.addEventListener("click", resetDefaultChores);
document.getElementById("addExceptionBtn")?.addEventListener("click", addException);
document.getElementById("lockChoreBtn")?.addEventListener("click", lockResidentToChore);
document.getElementById("clearLockBtn")?.addEventListener("click", clearResidentLock);
document.getElementById("setAwayUntilBtn")?.addEventListener("click", setAwayUntil);
document.getElementById("clearHistoryBtn")?.addEventListener("click", clearHistory);
document.getElementById("exportBackupBtn")?.addEventListener("click", exportBackup);
document.getElementById("importBackupInput")?.addEventListener("change", importBackup);

document.getElementById("choreName")?.addEventListener("keydown", e => {
  if (e.key === "Enter") addChore();
});

auth.onAuthStateChanged(user => {
  if (!user) return;

  unsubscribeApp = listenToAppState(async nextState => {
    state = nextState;

    const choresChanged = ensureStandardChoresExist();
    const residentsChanged = syncResidentsFromRoster();
    const awayChanged = autoReturnAwayResidents();

    render();

    if ((choresChanged || residentsChanged || awayChanged) && !isSavingSync) {
      isSavingSync = true;
      await saveAppState(state);
      isSavingSync = false;
    }
  });
});
