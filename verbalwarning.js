let warningState = defaultAppState();
let editingWarningId = null;

function getInputValue(id) {
  const input = document.getElementById(id);

  if (!input) {
    alert(`Missing field: ${id}`);
    throw new Error(`Missing field: ${id}`);
  }

  return input.value.trim();
}

function getSelectedResident() {
  const select = document.getElementById("warningResident");
  const residentId = select.value;

  const resident = (warningState.roster || []).find(client => client.id === residentId);

  return {
    residentId,
    residentName: resident
      ? `${resident.firstName || ""} ${resident.lastName || ""}`.trim()
      : ""
  };
}

function getWarningTime() {
  return `${getInputValue("warningHour")}:${getInputValue("warningMinute")} ${getInputValue("warningAmPm")}`;
}

async function saveWarnings() {
  try {
    await saveAppState(warningState);
  } catch (error) {
    console.error("Verbal warning save failed:", error);
    alert("Could not save verbal warning. Check Console for details.");
  }
}

function addVerbalWarning() {
  warningState.verbalWarnings = Array.isArray(warningState.verbalWarnings)
    ? warningState.verbalWarnings
    : [];

  const selectedResident = getSelectedResident();

  const warning = {
    id: crypto.randomUUID(),
    date: getInputValue("warningDate"),
    time: getWarningTime(),
    residentId: selectedResident.residentId,
    residentName: selectedResident.residentName,
    incident: getInputValue("warningIncident"),
    staffAction: getInputValue("warningStaffAction"),
    residentResponse: getInputValue("warningResidentResponse"),
    staffUser: auth.currentUser?.email || "",
    createdAt: new Date().toISOString()
  };

  if (!warning.date || !warning.residentId || !warning.incident) {
    alert("Date, resident, and incident are required.");
    return;
  }

  warningState.verbalWarnings.unshift(warning);
  clearWarningForm();
  renderWarnings();
  saveWarnings();
}

function clearWarningForm() {
  [
    "warningDate",
    "warningIncident",
    "warningStaffAction",
    "warningResidentResponse"
  ].forEach(id => {
    const input = document.getElementById(id);
    if (input) input.value = "";
  });

  setDefaultTime();
}

function setDefaultTime() {
  const now = new Date();
  let hour = now.getHours();
  const minute = String(now.getMinutes()).padStart(2, "0");
  const ampm = hour >= 12 ? "PM" : "AM";

  hour = hour % 12;
  if (hour === 0) hour = 12;

  const hourEl = document.getElementById("warningHour");
  const minuteEl = document.getElementById("warningMinute");
  const ampmEl = document.getElementById("warningAmPm");

  if (hourEl) hourEl.value = String(hour).padStart(2, "0");
  if (minuteEl) minuteEl.value = minute;
  if (ampmEl) ampmEl.value = ampm;
}

function populateTimeDropdowns() {
  const hourEl = document.getElementById("warningHour");
  const minuteEl = document.getElementById("warningMinute");
  const ampmEl = document.getElementById("warningAmPm");

  if (!hourEl || !minuteEl || !ampmEl) return;

  hourEl.innerHTML = Array.from({ length: 12 }, (_, i) => {
    const value = String(i + 1).padStart(2, "0");
    return `<option value="${value}">${value}</option>`;
  }).join("");

  minuteEl.innerHTML = Array.from({ length: 60 }, (_, i) => {
    const value = String(i).padStart(2, "0");
    return `<option value="${value}">${value}</option>`;
  }).join("");

  ampmEl.innerHTML = `
    <option value="AM">AM</option>
    <option value="PM">PM</option>
  `;

  setDefaultTime();
}

function populateResidentDropdown() {
  const select = document.getElementById("warningResident");
  if (!select) return;

  const roster = Array.isArray(warningState.roster)
    ? warningState.roster.filter(client => client && client !== "temp")
    : [];

  const activeClients = roster.filter(client => {
    const phase = client.phase || "phase1";
    return phase === "phase1" || phase === "phase2";
  });

  select.innerHTML = activeClients.length
    ? activeClients.map(client => {
        const name = `${client.firstName || ""} ${client.lastName || ""}`.trim();
        return `<option value="${client.id}">${escapeHtml(name)}</option>`;
      }).join("")
    : `<option value="">No clients found</option>`;
}

function startEditWarning(warningId) {
  editingWarningId = warningId;
  renderWarnings();
}

function cancelEditWarning() {
  editingWarningId = null;
  renderWarnings();
}

function saveEditWarning(warningId) {
  const warning = warningState.verbalWarnings.find(item => item.id === warningId);
  if (!warning) return;

  warning.date = getInputValue(`editDate-${warningId}`);
  warning.time = getInputValue(`editTime-${warningId}`);
  warning.incident = getInputValue(`editIncident-${warningId}`);
  warning.staffAction = getInputValue(`editStaffAction-${warningId}`);
  warning.residentResponse = getInputValue(`editResidentResponse-${warningId}`);

  editingWarningId = null;
  renderWarnings();
  saveWarnings();
}

function deleteWarning(warningId) {
  const warning = warningState.verbalWarnings.find(item => item.id === warningId);
  if (!warning) return;

  if (!confirm(`Delete warning for ${warning.residentName}?`)) return;

  warningState.verbalWarnings = warningState.verbalWarnings.filter(item => item.id !== warningId);

  renderWarnings();
  saveWarnings();
}

function renderWarnings() {
  const body = document.getElementById("warningBody");
  if (!body) return;

  const warnings = Array.isArray(warningState.verbalWarnings)
    ? warningState.verbalWarnings
    : [];

  body.innerHTML = warnings.length
    ? warnings.map(warning => {
        const isEditing = editingWarningId === warning.id;

        if (isEditing) {
          return `
            <tr class="editing-row">
              <td><input id="editDate-${warning.id}" type="date" value="${escapeAttribute(warning.date)}" /></td>
              <td><input id="editTime-${warning.id}" value="${escapeAttribute(warning.time)}" /></td>
              <td>${escapeHtml(warning.residentName)}</td>
              <td><textarea id="editIncident-${warning.id}">${escapeHtml(warning.incident)}</textarea></td>
              <td><textarea id="editStaffAction-${warning.id}">${escapeHtml(warning.staffAction)}</textarea></td>
              <td><textarea id="editResidentResponse-${warning.id}">${escapeHtml(warning.residentResponse)}</textarea></td>
              <td>
                <button type="button" class="success" onclick="saveEditWarning('${warning.id}')">Save</button>
                <button type="button" class="secondary" onclick="cancelEditWarning()">Cancel</button>
              </td>
            </tr>
          `;
        }

        return `
          <tr>
            <td>${escapeHtml(warning.date)}</td>
            <td>${escapeHtml(warning.time)}</td>
            <td>${escapeHtml(warning.residentName)}</td>
            <td>${escapeHtml(warning.incident)}</td>
            <td>${escapeHtml(warning.staffAction)}</td>
            <td>${escapeHtml(warning.residentResponse)}</td>
            <td>
              <button type="button" class="secondary" onclick="startEditWarning('${warning.id}')">Edit</button>
              <button type="button" class="danger" onclick="deleteWarning('${warning.id}')">Delete</button>
            </td>
          </tr>
        `;
      }).join("")
    : `<tr><td colspan="7" class="empty">No verbal warnings logged.</td></tr>`;
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
  populateTimeDropdowns();

  document.getElementById("addWarningBtn")?.addEventListener("click", addVerbalWarning);
});

auth.onAuthStateChanged(user => {
  if (!user) return;

  listenToAppState(nextState => {
    warningState = nextState;

    warningState.verbalWarnings = Array.isArray(warningState.verbalWarnings)
      ? warningState.verbalWarnings
      : [];

    populateResidentDropdown();
    renderWarnings();
  });
});
