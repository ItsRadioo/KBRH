let state = defaultAppState();
let unsubscribeApp = null;
let isSavingSync = false;

const OUTDOOR_CHORE = "Outside Yardwork";
const BATHROOM_CHORE = "Bathroom";
const UPPER_FLOORS_CHORE = "Upper floors";

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

function getActiveRosterClients() {
  return Array.isArray(state.roster)
    ? state.roster
        .filter(client =>
          client &&
          client !== "temp" &&
          !client.archived &&
          (client.phase || "phase1") === "phase1"
        )
        .sort((a, b) => {
          const aDate = a.entryDate || "9999-12-31";
          const bDate = b.entryDate || "9999-12-31";

          const dateCompare = aDate.localeCompare(bDate);

          if (dateCompare !== 0) return dateCompare;

          const aName = `${a.lastName || ""}, ${a.firstName || ""}`;
          const bName = `${b.lastName || ""}, ${b.firstName || ""}`;

          return aName.localeCompare(bName);
        })
    : [];
}

function getResidentNameFromClient(client, fallbackNumber = 1) {
  const fullName = `${client.firstName || ""} ${client.lastName || ""}`.trim();
  return fullName || `Resident ${fallbackNumber}`;
}

function findExistingResident(existingResidents, client, fullName) {
  return existingResidents.find(resident =>
    resident.rosterClientId === client.id ||
    (
      !resident.rosterClientId &&
      resident.name &&
      resident.name.toLowerCase() === fullName.toLowerCase()
    )
  );
}

function getNewResidentStartingAssignments(newClients) {
  const assignments = new Map();

  if (!newClients.length) return assignments;

  const ordered = [...newClients].sort((a, b) => {
    const aDate = a.entryDate || "9999-12-31";
    const bDate = b.entryDate || "9999-12-31";

    return aDate.localeCompare(bDate);
  });

  if (ordered.length === 1) {
    assignments.set(ordered[0].id, BATHROOM_CHORE);
    return assignments;
  }

  const oldestNewResident = ordered[0];
  const newestNewResident = ordered[ordered.length - 1];

  assignments.set(oldestNewResident.id, BATHROOM_CHORE);
  assignments.set(newestNewResident.id, UPPER_FLOORS_CHORE);

  ordered.slice(1, -1).forEach((client, index) => {
    assignments.set(
      client.id,
      index % 2 === 0 ? BATHROOM_CHORE : UPPER_FLOORS_CHORE
    );
  });

  return assignments;
}

function syncResidentsFromRoster() {
  const existingResidents = Array.isArray(state.residents)
    ? state.residents
    : [];

  const activeRosterClients = getActiveRosterClients();

  const newClients = activeRosterClients.filter(client => {
    const fullName = getResidentNameFromClient(client);

    return !findExistingResident(existingResidents, client, fullName);
  });

  const newAssignments = getNewResidentStartingAssignments(newClients);

  const syncedResidents = activeRosterClients.map((client, index) => {
    const fullName = getResidentNameFromClient(client, index + 1);
    const existing = findExistingResident(existingResidents, client, fullName);

    let choreIndex;

    if (existing && Number.isInteger(Number(existing.choreIndex))) {
      choreIndex = Number(existing.choreIndex);
    } else {
      const startingChore = newAssignments.get(client.id) || BATHROOM_CHORE;
      const startingIndex = choreIndexByName(startingChore);

      choreIndex = startingIndex >= 0 ? startingIndex : 0;
    }

    return {
      id: existing?.id || crypto.randomUUID(),
      rosterClientId: client.id,
      name: fullName,
      choreIndex,
      exceptions: Array.isArray(existing?.exceptions)
        ? existing.exceptions
        : [],
      lockedChore: existing?.lockedChore || "",
      status: existing?.status || "active",
      awayUntil: existing?.awayUntil || ""
    };
  });

  const before = JSON.stringify(existingResidents.map(resident => ({
    id: resident.id,
    rosterClientId: resident.rosterClientId || "",
    name: resident.name || "",
    choreIndex: resident.choreIndex,
    exceptions: resident.exceptions,
    lockedChore: resident.lockedChore,
    status: resident.status,
    awayUntil: resident.awayUntil
  })));

  const after = JSON.stringify(syncedResidents.map(resident => ({
    id: resident.id,
    rosterClientId: resident.rosterClientId || "",
    name: resident.name || "",
    choreIndex: resident.choreIndex,
    exceptions: resident.exceptions,
    lockedChore: resident.lockedChore,
    status: resident.status,
    awayUntil: resident.awayUntil
  })));

  state.residents = syncedResidents;

  return before !== after;
}

function autoReturnAwayResidents() {
  const today = todayDateString();
  let changed = false;

  state.residents = (state.residents || []).map(resident => {
    if (
      resident.status === "away" &&
      resident.awayUntil &&
      resident.awayUntil < today
    ) {
      changed = true;

      return {
        ...resident,
        status: "active",
        awayUntil: ""
      };
    }

    return resident;
  });

  return changed;
}

function activeResidents() {
  return (state.residents || []).filter(
    resident => resident.status === "active"
  );
}

function normalizeChoreIndex(index) {
  if (!state.chores.length) return -1;

  return (
    (Number(index) % state.chores.length) +
    state.chores.length
  ) % state.chores.length;
}

function getChoreName(index) {
  if (!state.chores.length || index < 0) return "No chore";

  return state.chores[normalizeChoreIndex(index)];
}

function choreIndexByName(choreName) {
  return state.chores.findIndex(chore => chore === choreName);
}

function getCompletedChores(resident) {
  const completed = new Set();

  const history = Array.isArray(state.history)
    ? state.history
    : [];

  history.forEach(item => {
    const sameResident =
      item.residentId === resident.id ||
      (
        !item.residentId &&
        item.residentName === resident.name
      );

    if (sameResident && item.oldChore) {
      completed.add(item.oldChore);
    }
  });

  return completed;
}

function isEligibleForOutsideYardwork(resident) {
  const requiredChores = (state.chores || []).filter(
    chore => chore !== OUTDOOR_CHORE
  );

  if (!requiredChores.length) return true;

  const completedChores = getCompletedChores(resident);

  return requiredChores.every(chore => completedChores.has(chore));
}

function canAssign(resident, choreIndex) {
  const choreName = getChoreName(choreIndex);

  const exceptions = Array.isArray(resident.exceptions)
    ? resident.exceptions
    : [];

  if (exceptions.includes(choreName)) {
    return false;
  }

  if (
    choreName === OUTDOOR_CHORE &&
    !isEligibleForOutsideYardwork(resident)
  ) {
    return false;
  }

  return true;
}

function allowsMultiple(choreName) {
  return choreName === OUTDOOR_CHORE;
}

function nextAllowedChoreIndex(
  resident,
  startIndex,
  occupiedChores = new Set()
) {
  if (!state.chores.length) return -1;

  if (
    resident.lockedChore &&
    state.chores.includes(resident.lockedChore)
  ) {
    const lockedIndex = choreIndexByName(resident.lockedChore);

    if (canAssign(resident, lockedIndex)) {
      return lockedIndex;
    }
  }

  for (let offset = 0; offset < state.chores.length; offset++) {
    const candidate = normalizeChoreIndex(startIndex + offset);
    const choreName = getChoreName(candidate);

    const occupied =
      occupiedChores.has(choreName) &&
      !allowsMultiple(choreName);

    if (
      canAssign(resident, candidate) &&
      !occupied
    ) {
      return candidate;
    }
  }

  return normalizeChoreIndex(resident.choreIndex);
}

async function saveAndRender() {
  ensureStandardChoresExist();

  try {
    await saveAppState(state);
  } catch (error) {
    console.error("Could not save chore data:", error);
    alert("Could not save chore data. Check Console for details.");
  }
}

function addChore() {
  const input = document.getElementById("choreName");
  const name = input?.value.trim() || "";

  if (!name || state.chores.includes(name)) return;

  state.chores.push(name);
  input.value = "";

  saveAndRender();
}

function resetDefaultChores() {
  const confirmed = confirm(
    "Reset the chore list to the standard 10 chores?"
  );

  if (!confirmed) return;

  state.chores = [...STANDARD_CHORES];

  state.residents = state.residents.map(resident => ({
    ...resident,
    choreIndex: normalizeChoreIndex(resident.choreIndex),
    exceptions: Array.isArray(resident.exceptions)
      ? resident.exceptions.filter(exception =>
          state.chores.includes(exception)
        )
      : [],
    lockedChore: state.chores.includes(resident.lockedChore)
      ? resident.lockedChore
      : ""
  }));

  saveAndRender();
}

function removeChore(choreName) {
  const confirmed = confirm(`Remove chore: ${choreName}?`);

  if (!confirmed) return;

  state.chores = state.chores.filter(
    chore => chore !== choreName
  );

  state.residents = state.residents.map(resident => ({
    ...resident,
    choreIndex: normalizeChoreIndex(resident.choreIndex),
    exceptions: Array.isArray(resident.exceptions)
      ? resident.exceptions.filter(
          exception => exception !== choreName
        )
      : [],
    lockedChore:
      resident.lockedChore === choreName
        ? ""
        : resident.lockedChore
  }));

  saveAndRender();
}

function setResidentChore(residentId, choreIndex) {
  const resident = state.residents.find(
    item => item.id === residentId
  );

  if (!resident) return;

  const nextIndex = Number(choreIndex);
  const choreName = getChoreName(nextIndex);

  if (
    choreName === OUTDOOR_CHORE &&
    !isEligibleForOutsideYardwork(resident)
  ) {
    alert(
      `${resident.name} cannot be assigned to Outside Yardwork until every other chore has been completed.`
    );

    render();
    return;
  }

  if (!canAssign(resident, nextIndex)) {
    alert(`${resident.name} cannot be assigned to ${choreName}.`);
    render();
    return;
  }

  resident.choreIndex = nextIndex;

  saveAndRender();
}

function setResidentStatus(id, status) {
  const resident = state.residents.find(
    item => item.id === id
  );

  if (!resident) return;

  resident.status = status;

  if (status !== "away") {
    resident.awayUntil = "";
  }

  saveAndRender();
}

function setAwayUntil() {
  const residentId =
    document.getElementById("leaveResident")?.value || "";

  const date =
    document.getElementById("awayUntilDate")?.value || "";

  const resident = state.residents.find(
    item => item.id === residentId
  );

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

  const occupiedChores = new Set();

  state.residents = state.residents.map(resident => {
    if (resident.status !== "active") return resident;

    const newIndex = nextAllowedChoreIndex(
      resident,
      resident.choreIndex,
      occupiedChores
    );

    const choreName = getChoreName(newIndex);

    if (!allowsMultiple(choreName)) {
      occupiedChores.add(choreName);
    }

    return {
      ...resident,
      choreIndex: newIndex
    };
  });

  saveAndRender();
}

function addRotationHistory(
  resident,
  timestamp,
  oldChore,
  newChore
) {
  state.history = Array.isArray(state.history)
    ? state.history
    : [];

  state.history.unshift({
    id: crypto.randomUUID(),
    timestamp,
    residentId: resident.id,
    rosterClientId: resident.rosterClientId || "",
    residentName: resident.name,
    oldChore,
    newChore
  });
}

function rotateChores() {
  if (!state.tableGenerated) {
    generateTable();
    return;
  }

  const timestamp = new Date().toLocaleString();
  const occupiedChores = new Set();

  state.residents.forEach(resident => {
    if (resident.status !== "active") return;

     if (
      resident.lockedChore &&
      state.chores.includes(resident.lockedChore) &&
      canAssign(
        resident,
        choreIndexByName(resident.lockedChore)
      )
    ) {
      resident.choreIndex = choreIndexByName(
        resident.lockedChore
      );

      if (!allowsMultiple(resident.lockedChore)) {
        occupiedChores.add(resident.lockedChore);
      }
    }
  });

  state.residents = state.residents.map(resident => {
    if (resident.status !== "active") return resident;

    const oldChore = getChoreName(resident.choreIndex);

    /*
      Save the completed old chore before choosing the next chore.
      This allows Outside Yardwork immediately after the final
      required indoor chore has been completed.
    */
    addRotationHistory(
      resident,
      timestamp,
      oldChore,
      oldChore
    );

    if (
      resident.lockedChore &&
      state.chores.includes(resident.lockedChore)
    ) {
      const lockedIndex = choreIndexByName(
        resident.lockedChore
      );

      if (canAssign(resident, lockedIndex)) {
        const lockedChore = getChoreName(lockedIndex);

        const latestHistory = state.history[0];

        if (latestHistory?.residentId === resident.id) {
          latestHistory.newChore = lockedChore;
        }

        return {
          ...resident,
          choreIndex: lockedIndex
        };
      }

      resident.lockedChore = "";
    }

    const proposedIndex = normalizeChoreIndex(
      resident.choreIndex + 1
    );

    const newIndex = nextAllowedChoreIndex(
      resident,
      proposedIndex,
      occupiedChores
    );

    const newChore = getChoreName(newIndex);

    if (!allowsMultiple(newChore)) {
      occupiedChores.add(newChore);
    }

    const latestHistory = state.history.find(
      item =>
        item.residentId === resident.id &&
        item.timestamp === timestamp &&
        item.oldChore === oldChore
    );

    if (latestHistory) {
      latestHistory.newChore = newChore;
    }

    return {
      ...resident,
      choreIndex: newIndex
    };
  });

  saveAndRender();
}

function addException() {
  const residentId =
    document.getElementById("exceptionResident")?.value || "";

  const choreName =
    document.getElementById("exceptionChore")?.value || "";

  const resident = state.residents.find(
    item => item.id === residentId
  );

  if (!resident || !choreName) return;

  if (resident.lockedChore === choreName) {
    alert(
      "This resident is locked to that chore. Clear the lock before blocking it."
    );

    return;
  }

  resident.exceptions = Array.isArray(resident.exceptions)
    ? resident.exceptions
    : [];

  if (!resident.exceptions.includes(choreName)) {
    resident.exceptions.push(choreName);
  }

  if (
    resident.status === "active" &&
    getChoreName(resident.choreIndex) === choreName
  ) {
    resident.choreIndex = nextAllowedChoreIndex(
      resident,
      resident.choreIndex + 1
    );
  }

  saveAndRender();
}

function removeException(residentId, choreName) {
  const resident = state.residents.find(
    item => item.id === residentId
  );

  if (!resident) return;

  resident.exceptions = Array.isArray(resident.exceptions)
    ? resident.exceptions.filter(
        exception => exception !== choreName
      )
    : [];

  saveAndRender();
}

function lockResidentToChore() {
  const residentId =
    document.getElementById("exceptionResident")?.value || "";

  const choreName =
    document.getElementById("exceptionChore")?.value || "";

  const resident = state.residents.find(
    item => item.id === residentId
  );

  if (!resident || !choreName) return;

  const choreIndex = choreIndexByName(choreName);

  if (choreIndex < 0) return;

  if (
    choreName === OUTDOOR_CHORE &&
    !isEligibleForOutsideYardwork(resident)
  ) {
    alert(
      `${resident.name} cannot be locked to Outside Yardwork until every other chore has been completed.`
    );

    return;
  }

  resident.lockedChore = choreName;

  resident.exceptions = Array.isArray(resident.exceptions)
    ? resident.exceptions.filter(
        exception => exception !== choreName
      )
    : [];

  resident.choreIndex = choreIndex;

  saveAndRender();
}

function clearResidentLock() {
  const residentId =
    document.getElementById("exceptionResident")?.value || "";

  const resident = state.residents.find(
    item => item.id === residentId
  );

  if (!resident) return;

  resident.lockedChore = "";

  saveAndRender();
}

function clearHistory() {
  const confirmed = confirm(
    "Clear the full rotation history log? Clearing history also resets the record used to determine Outside Yardwork eligibility."
  );

  if (!confirmed) return;

  state.history = [];

  saveAndRender();
}

function exportBackup() {
  const backup = {
    app: "residentChoreRotator",
    version: 7,
    exportedAt: new Date().toISOString(),
    state
  };

  const blob = new Blob(
    [JSON.stringify(backup, null, 2)],
    { type: "application/json" }
  );

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download =
    `resident-chore-backup-${todayDateString()}.json`;

  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}

function importBackup(event) {
  const file = event.target.files?.[0];

  if (!file) return;

  const reader = new FileReader();

  reader.onload = async () => {
    try {
      const parsed = JSON.parse(reader.result);
      const importedState = parsed.state || parsed;

      const confirmed = confirm(
        "Importing this backup will replace shared online data. Continue?"
      );

      if (!confirmed) return;

      state = normalizeAppState(importedState);

      ensureStandardChoresExist();
      syncResidentsFromRoster();

      await saveAppState(state);

      alert("Backup imported successfully.");
    } catch (error) {
      console.error(error);

      alert(
        "Could not import backup. Check that the file is valid JSON."
      );
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
  const residentList =
    document.getElementById("residentList");

  if (!residentList) return;

  const activeAndAway = state.residents.filter(
    resident => resident.status !== "archived"
  );

  residentList.innerHTML = activeAndAway.length
    ? activeAndAway.map(resident => `
        <li>
          <span>
            ${escapeHtml(resident.name)}
            ${statusBadge(resident)}
          </span>

          <span class="actions">
            ${
              resident.status === "away"
                ? `
                  <button
                    class="success"
                    onclick="setResidentStatus('${resident.id}', 'active')"
                  >
                    Return
                  </button>
                `
                : `
                  <button
                    class="warning"
                    onclick="setResidentStatus('${resident.id}', 'away')"
                  >
                    Away
                  </button>
                `
            }
          </span>
        </li>
      `).join("")
    : `<li class="empty">No active roster residents found.</li>`;
}

function statusBadge(resident) {
  if (resident.status === "away") {
    const dateText = resident.awayUntil
      ? ` until ${resident.awayUntil}`
      : "";

    return `
      <span class="status away">
        Away / Omitted${dateText}
      </span>
    `;
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

          <button
            class="danger"
            onclick="removeChore('${escapeJs(chore)}')"
          >
            Remove
          </button>
        </li>
      `).join("")
    : `<li class="empty">No chores added.</li>`;
}

function renderManualAssignments() {
  const body =
    document.getElementById("assignmentBody");

  if (!body) return;

  const residents = activeResidents();

  if (!residents.length || !state.chores.length) {
    body.innerHTML = `
      <tr>
        <td colspan="3" class="empty">
          Add active clients to the Current Roster first.
        </td>
      </tr>
    `;

    return;
  }

  body.innerHTML = residents.map(resident => `
    <tr>
      <td>${escapeHtml(resident.name)}</td>

      <td>
        <select
          onchange="setResidentChore('${resident.id}', this.value)"
          ${resident.lockedChore ? "disabled" : ""}
        >
          ${state.chores.map((chore, index) => {
            const outsideBlocked =
              chore === OUTDOOR_CHORE &&
              !isEligibleForOutsideYardwork(resident);

            return `
              <option
                value="${index}"
                ${
                  normalizeChoreIndex(resident.choreIndex) === index
                    ? "selected"
                    : ""
                }
                ${outsideBlocked ? "disabled" : ""}
              >
                ${escapeHtml(chore)}
                ${outsideBlocked ? " — Not yet eligible" : ""}
              </option>
            `;
          }).join("")}
        </select>
      </td>

      <td>
        ${
          resident.lockedChore
            ? `
              <span class="status away">
                Locked to ${escapeHtml(resident.lockedChore)}
              </span>
            `
            : `<span class="status active">Active</span>`
        }
      </td>
    </tr>
  `).join("");
}

function renderGeneratedTable() {
  const body =
    document.getElementById("rotationBody");

  if (!body) return;

  const residents = activeResidents();

  if (!state.tableGenerated) {
    body.innerHTML = `
      <tr>
        <td colspan="5" class="empty">
          Manual assignments are ready. Click Generate Table.
        </td>
      </tr>
    `;

    return;
  }

  if (!residents.length) {
    body.innerHTML = `
      <tr>
        <td colspan="5" class="empty">
          No active residents.
        </td>
      </tr>
    `;

    return;
  }

  body.innerHTML = residents.map(resident => {
    const exceptions =
      Array.isArray(resident.exceptions) &&
      resident.exceptions.length
        ? resident.exceptions.map(chore => `
            <span class="badge">
              ${escapeHtml(chore)}

              <button
                class="secondary"
                onclick="removeException('${resident.id}', '${escapeJs(chore)}')"
              >
                x
              </button>
            </span>
          `).join("")
        : `<span class="empty">None</span>`;

    const outsideEligibility =
      isEligibleForOutsideYardwork(resident)
        ? `<span class="status active">Outdoor eligible</span>`
        : `<span class="status away">Outdoor locked</span>`;

    return `
      <tr>
        <td>${escapeHtml(resident.name)}</td>
        <td>${escapeHtml(getChoreName(resident.choreIndex))}</td>
        <td>${exceptions}</td>

        <td>
          ${
            resident.lockedChore
              ? `
                <span class="status away">
                  ${escapeHtml(resident.lockedChore)}
                </span>
              `
              : `<span class="empty">Not locked</span>`
          }

          <div style="margin-top: 5px;">
            ${outsideEligibility}
          </div>
        </td>

        <td>
          <button
            class="warning"
            onclick="setResidentStatus('${resident.id}', 'away')"
          >
            Away
          </button>
        </td>
      </tr>
    `;
  }).join("");
}

function renderExceptionControls() {
  const residentSelect =
    document.getElementById("exceptionResident");

  const choreSelect =
    document.getElementById("exceptionChore");

  if (!residentSelect || !choreSelect) return;

  residentSelect.innerHTML = activeResidents()
    .map(resident => `
      <option value="${resident.id}">
        ${escapeHtml(resident.name)}
      </option>
    `)
    .join("");

  choreSelect.innerHTML = state.chores
    .map(chore => `
      <option value="${escapeHtml(chore)}">
        ${escapeHtml(chore)}
      </option>
    `)
    .join("");
}

function renderLeaveControls() {
  const select =
    document.getElementById("leaveResident");

  if (!select) return;

  select.innerHTML = state.residents
    .filter(resident => resident.status !== "archived")
    .map(resident => `
      <option value="${resident.id}">
        ${escapeHtml(resident.name)}
      </option>
    `)
    .join("");
}

function renderHistory() {
  const body =
    document.getElementById("historyBody");

  if (!body) return;

  body.innerHTML =
    Array.isArray(state.history) &&
    state.history.length
      ? state.history.slice(0, 100).map(item => `
          <tr>
            <td>${escapeHtml(item.timestamp)}</td>
            <td>${escapeHtml(item.residentName)}</td>
            <td>${escapeHtml(item.oldChore)}</td>
            <td>${escapeHtml(item.newChore)}</td>
          </tr>
        `).join("")
      : `
        <tr>
          <td colspan="4" class="empty">
            No rotation history yet.
          </td>
        </tr>
      `;
}

function escapeHtml(value) {
  return String(value || "").replace(
    /[&<>"']/g,
    character => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[character])
  );
}

function escapeJs(value) {
  return String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'");
}

document
  .getElementById("rotateBtn")
  ?.addEventListener("click", rotateChores);

document
  .getElementById("generateTableBtn")
  ?.addEventListener("click", generateTable);

document
  .getElementById("addChoreBtn")
  ?.addEventListener("click", addChore);

document
  .getElementById("resetChoresBtn")
  ?.addEventListener("click", resetDefaultChores);

document
  .getElementById("addExceptionBtn")
  ?.addEventListener("click", addException);

document
  .getElementById("lockChoreBtn")
  ?.addEventListener("click", lockResidentToChore);

document
  .getElementById("clearLockBtn")
  ?.addEventListener("click", clearResidentLock);

document
  .getElementById("setAwayUntilBtn")
  ?.addEventListener("click", setAwayUntil);

document
  .getElementById("clearHistoryBtn")
  ?.addEventListener("click", clearHistory);

document
  .getElementById("exportBackupBtn")
  ?.addEventListener("click", exportBackup);

document
  .getElementById("importBackupInput")
  ?.addEventListener("change", importBackup);

document
  .getElementById("choreName")
  ?.addEventListener("keydown", event => {
    if (event.key === "Enter") {
      addChore();
    }
  });

auth.onAuthStateChanged(user => {
  if (!user) return;

  unsubscribeApp = listenToAppState(async nextState => {
    state = nextState;

    const choresChanged =
      ensureStandardChoresExist();

    const residentsChanged =
      syncResidentsFromRoster();

    const awayChanged =
      autoReturnAwayResidents();

    render();

    if (
      (
        choresChanged ||
        residentsChanged ||
        awayChanged
      ) &&
      !isSavingSync
    ) {
      isSavingSync = true;

      try {
        await saveAppState(state);
      } catch (error) {
        console.error(
          "Automatic chore sync failed:",
          error
        );
      } finally {
        isSavingSync = false;
      }
    }
  });
});
