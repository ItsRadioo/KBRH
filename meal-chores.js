const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday"
];

const DAY_MS = 24 * 60 * 60 * 1000;
const NEW_RESIDENT_DAYS = 7;
const SENIOR_RESIDENT_DAYS = 14;

let state = defaultAppState();

function todayAtMidnight() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function parseLocalDate(value) {
  if (!value) return null;

  const date = new Date(`${value}T00:00:00`);

  return Number.isNaN(date.getTime()) ? null : date;
}

function getDaysSinceEntry(client) {
  const entryDate = parseLocalDate(client.entryDate);

  if (!entryDate) {
    return null;
  }

  return Math.floor(
    (todayAtMidnight().getTime() - entryDate.getTime()) / DAY_MS
  );
}

function isNewResident(client) {
  const days = getDaysSinceEntry(client);

  return days !== null && days >= 0 && days < NEW_RESIDENT_DAYS;
}

function isSeniorResident(client) {
  const days = getDaysSinceEntry(client);

  return days !== null && days >= SENIOR_RESIDENT_DAYS;
}

function getRosterStatusRecord(client) {
  const residents = Array.isArray(state.residents)
    ? state.residents
    : [];

  return residents.find(resident =>
    resident &&
    (
      resident.rosterClientId === client.id ||
      (
        !resident.rosterClientId &&
        resident.name?.toLowerCase() ===
          `${client.firstName || ""} ${client.lastName || ""}`
            .trim()
            .toLowerCase()
      )
    )
  );
}

function activeResidents() {
  const roster = Array.isArray(state.roster)
    ? state.roster
    : [];

  return roster
    .filter(client => {
      if (!client || client === "temp") return false;
      if (client.archived) return false;

      const residentStatus = getRosterStatusRecord(client);

      if (residentStatus?.status === "away") {
        return false;
      }

      return true;
    })
    .sort((a, b) => {
      const aDate = a.entryDate || "9999-12-31";
      const bDate = b.entryDate || "9999-12-31";

      const dateComparison = aDate.localeCompare(bDate);

      if (dateComparison !== 0) {
        return dateComparison;
      }

      const aName = getResidentDisplayName(a).toLowerCase();
      const bName = getResidentDisplayName(b).toLowerCase();

      return aName.localeCompare(bName);
    });
}

function lunchEligibleResidents() {
  return activeResidents().filter(client => !isNewResident(client));
}

function seniorResidents() {
  return activeResidents().filter(isSeniorResident);
}

function newResidents() {
  return activeResidents().filter(isNewResident);
}

function getResidentDisplayName(client) {
  const fullName =
    `${client.firstName || ""} ${client.lastName || ""}`.trim();

  return fullName || "Unnamed Resident";
}

function getMealSchedule() {
  return normalizeMealSchedule(state.mealSchedule);
}

function getResidentById(id) {
  return activeResidents().find(client => client.id === id) || null;
}

function getResidentName(id) {
  const resident = getResidentById(id);

  return resident ? getResidentDisplayName(resident) : "";
}

function getOtherSupperSlot(slot) {
  return slot === "supper1" ? "supper2" : "supper1";
}

function pickLeastAssignedResident(
  residents,
  assignmentCounts,
  excludedIds = []
) {
  const exclusions = new Set(excludedIds.filter(Boolean));

  let pool = residents.filter(
    resident => !exclusions.has(resident.id)
  );

  if (!pool.length) {
    return null;
  }

  const lowestCount = Math.min(
    ...pool.map(
      resident => assignmentCounts.get(resident.id) || 0
    )
  );

  pool = pool.filter(
    resident =>
      (assignmentCounts.get(resident.id) || 0) === lowestCount
  );

  return pool[Math.floor(Math.random() * pool.length)] || null;
}

function incrementAssignmentCount(assignmentCounts, resident) {
  if (!resident) return;

  assignmentCounts.set(
    resident.id,
    (assignmentCounts.get(resident.id) || 0) + 1
  );
}

function setMealResident(day, slot, residentId) {
  state.mealSchedule = getMealSchedule();

  const daySchedule =
    state.mealSchedule.weekSchedule[day] || {
      lunch: "",
      supper1: "",
      supper2: ""
    };

  if (!residentId) {
    daySchedule[slot] = "";
    state.mealSchedule.weekSchedule[day] = daySchedule;
    saveAppState(state);
    return;
  }

  const selectedResident = getResidentById(residentId);

  if (!selectedResident) {
    alert("The selected resident is no longer active.");
    render();
    return;
  }

  if (slot === "lunch" && isNewResident(selectedResident)) {
    alert(
      `${getResidentDisplayName(selectedResident)} was admitted within the last 7 days and cannot be assigned to lunch.`
    );

    render();
    return;
  }

  if (
    slot !== "lunch" &&
    daySchedule.lunch === residentId
  ) {
    alert(
      "A resident cannot be assigned to both lunch and supper on the same day."
    );

    render();
    return;
  }

  if (
    slot === "lunch" &&
    (
      daySchedule.supper1 === residentId ||
      daySchedule.supper2 === residentId
    )
  ) {
    alert(
      "A resident cannot be assigned to both lunch and supper on the same day."
    );

    render();
    return;
  }

  if (slot === "supper1" || slot === "supper2") {
    const otherSlot = getOtherSupperSlot(slot);
    const otherResident = getResidentById(daySchedule[otherSlot]);

    if (
      otherResident &&
      otherResident.id === selectedResident.id
    ) {
      alert(
        "The same resident cannot fill both supper positions."
      );

      render();
      return;
    }

    if (isNewResident(selectedResident)) {
      const seniors = seniorResidents().filter(
        resident => resident.id !== selectedResident.id
      );

      if (!seniors.length) {
        alert(
          "A new resident must be paired with someone admitted at least 14 days ago, but no eligible senior resident is available."
        );

        render();
        return;
      }

      if (!otherResident || !isSeniorResident(otherResident)) {
        const replacementSenior =
          seniors.find(
            resident =>
              resident.id !== daySchedule.lunch
          ) || seniors[0];

        daySchedule[otherSlot] =
          replacementSenior?.id || "";
      }
    } else if (
      otherResident &&
      isNewResident(otherResident) &&
      !isSeniorResident(selectedResident)
    ) {
      alert(
        `${getResidentDisplayName(otherResident)} is a new resident and must be paired with someone admitted at least 14 days ago.`
      );

      render();
      return;
    }
  }

  daySchedule[slot] = residentId;
  state.mealSchedule.weekSchedule[day] = daySchedule;

  saveAppState(state);
}

function validateGenerationRequirements() {
  const residents = activeResidents();
  const newResidentList = newResidents();
  const seniorResidentList = seniorResidents();
  const lunchResidents = lunchEligibleResidents();

  if (!residents.length) {
    alert("There are no active roster residents available.");
    return false;
  }

  if (!lunchResidents.length) {
    alert(
      "There are no lunch-eligible residents. Residents admitted within the last 7 days cannot be assigned to lunch."
    );

    return false;
  }

  if (
    newResidentList.length &&
    !seniorResidentList.length
  ) {
    alert(
      "The schedule cannot be generated because new residents must be paired at supper with someone admitted at least 14 days ago."
    );

    return false;
  }

  if (residents.length < 2) {
    alert(
      "At least two active residents are required because supper has two assignments."
    );

    return false;
  }

  return true;
}

function buildMealWeek(randomize = false) {
  if (!validateGenerationRequirements()) {
    return;
  }

  const residents = activeResidents();
  const lunchPool = lunchEligibleResidents();
  const newResidentPool = newResidents();
  const seniorPool = seniorResidents();

  const assignmentCounts = new Map(
    residents.map(resident => [resident.id, 0])
  );

  const newResidentQueue = [...newResidentPool];
  let newResidentIndex = 0;
  let previousLunchId = "";

  state.mealSchedule = getMealSchedule();

  DAYS.forEach(day => {
    let lunch;

    if (randomize) {
      lunch = pickLeastAssignedResident(
        lunchPool,
        assignmentCounts,
        [previousLunchId]
      );

      if (!lunch) {
        lunch = pickLeastAssignedResident(
          lunchPool,
          assignmentCounts
        );
      }
    } else {
      const availableLunchPool = lunchPool.filter(
        resident => resident.id !== previousLunchId
      );

      const selectedPool = availableLunchPool.length
        ? availableLunchPool
        : lunchPool;

      lunch = selectedPool.reduce((best, resident) => {
        if (!best) return resident;

        const residentCount =
          assignmentCounts.get(resident.id) || 0;

        const bestCount =
          assignmentCounts.get(best.id) || 0;

        return residentCount < bestCount
          ? resident
          : best;
      }, null);
    }

    incrementAssignmentCount(assignmentCounts, lunch);

    let supper1 = null;
    let supper2 = null;

    if (newResidentQueue.length) {
      const newResident =
        newResidentQueue[
          newResidentIndex % newResidentQueue.length
        ];

      newResidentIndex += 1;

      const senior = pickLeastAssignedResident(
        seniorPool,
        assignmentCounts,
        [newResident.id, lunch?.id]
      ) || pickLeastAssignedResident(
        seniorPool,
        assignmentCounts,
        [newResident.id]
      );

      if (day === "Monday" || day === "Wednesday" || day === "Friday" || day === "Sunday") {
        supper1 = senior;
        supper2 = newResident;
      } else {
        supper1 = newResident;
        supper2 = senior;
      }
    }

    if (!supper1) {
      supper1 = pickLeastAssignedResident(
        residents,
        assignmentCounts,
        [lunch?.id]
      );
    }

    if (!supper2) {
      let supper2Pool = residents.filter(
        resident =>
          resident.id !== lunch?.id &&
          resident.id !== supper1?.id
      );

      if (supper1 && isNewResident(supper1)) {
        supper2Pool = supper2Pool.filter(
          isSeniorResident
        );
      }

      supper2 = pickLeastAssignedResident(
        supper2Pool,
        assignmentCounts
      );
    }

    if (
      supper2 &&
      isNewResident(supper2) &&
      (!supper1 || !isSeniorResident(supper1))
    ) {
      supper1 = pickLeastAssignedResident(
        seniorPool,
        assignmentCounts,
        [supper2.id, lunch?.id]
      ) || pickLeastAssignedResident(
        seniorPool,
        assignmentCounts,
        [supper2.id]
      );
    }

    incrementAssignmentCount(assignmentCounts, supper1);
    incrementAssignmentCount(assignmentCounts, supper2);

    state.mealSchedule.weekSchedule[day] = {
      lunch: lunch?.id || "",
      supper1: supper1?.id || "",
      supper2: supper2?.id || ""
    };

    previousLunchId = lunch?.id || "";
  });

  state.mealSchedule.history =
    Array.isArray(state.mealSchedule.history)
      ? state.mealSchedule.history
      : [];

  state.mealSchedule.history.unshift({
    id: crypto.randomUUID(),
    timestamp: new Date().toLocaleString("en-CA"),
    type: randomize
      ? "Random weekly meal schedule"
      : "Generated weekly meal schedule"
  });

  saveAppState(state);
}

function generateMealWeek() {
  buildMealWeek(false);
}

function randomMealWeek() {
  buildMealWeek(true);
}

function clearMealAssignments() {
  const confirmed = confirm(
    "Clear the weekly meal schedule?"
  );

  if (!confirmed) return;

  state.mealSchedule = defaultMealSchedule();
  saveAppState(state);
}

function residentSelect(day, slot, selectedId) {
  const residents =
    slot === "lunch"
      ? lunchEligibleResidents()
      : activeResidents();

  return `
    <select onchange="setMealResident('${day}', '${slot}', this.value)">
      <option value="">Unassigned</option>

      ${residents.map(resident => {
        let label = getResidentDisplayName(resident);

        if (isNewResident(resident)) {
          label += " — New resident";
        } else if (isSeniorResident(resident)) {
          label += " — Senior";
        }

        return `
          <option
            value="${escapeAttribute(resident.id)}"
            ${selectedId === resident.id ? "selected" : ""}
          >
            ${escapeHtml(label)}
          </option>
        `;
      }).join("")}
    </select>
  `;
}

function render() {
  const body = document.getElementById("mealBody");

  if (!body) return;

  const mealSchedule = getMealSchedule();

  body.innerHTML = DAYS.map(day => {
    const row =
      mealSchedule.weekSchedule[day] || {
        lunch: "",
        supper1: "",
        supper2: ""
      };

    return `
      <tr>
        <td><strong>${escapeHtml(day)}</strong></td>
        <td>${residentSelect(day, "lunch", row.lunch)}</td>
        <td>${residentSelect(day, "supper1", row.supper1)}</td>
        <td>${residentSelect(day, "supper2", row.supper2)}</td>
      </tr>
    `;
  }).join("");
}

function printMealSchedule() {
  const mealSchedule = getMealSchedule();

  const rows = DAYS.map(day => {
    const row =
      mealSchedule.weekSchedule[day] || {
        lunch: "",
        supper1: "",
        supper2: ""
      };

    return `
      <tr>
        <td>${escapeHtml(day)}</td>
        <td>${escapeHtml(getResidentName(row.lunch))}</td>
        <td>${escapeHtml(getResidentName(row.supper1))}</td>
        <td>${escapeHtml(getResidentName(row.supper2))}</td>
      </tr>
    `;
  }).join("");

  const printWindow = window.open("", "_blank");

  if (!printWindow) {
    alert(
      "The print window was blocked. Allow pop-ups and try again."
    );

    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <title>Weekly Meal Schedule</title>

      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 32px;
          color: #000;
        }

        h1 {
          text-align: center;
          margin: 0 0 5px;
        }

        .subtitle {
          text-align: center;
          margin-bottom: 24px;
          font-weight: bold;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 16px;
        }

        th,
        td {
          border: 2px solid black;
          padding: 12px;
          text-align: left;
        }

        th {
          background: #e5e7eb;
          text-align: center;
        }

        td:first-child {
          width: 18%;
          font-weight: bold;
        }

        .note {
          margin-top: 24px;
          font-size: 14px;
          font-weight: bold;
        }
      </style>
    </head>

    <body>
      <h1>RESIDENT COOKING SCHEDULE</h1>

      <div class="subtitle">
        Lunch requires one resident. Supper requires two residents.
      </div>

      <table>
        <thead>
          <tr>
            <th>Day</th>
            <th>Lunch</th>
            <th>Supper 1</th>
            <th>Supper 2</th>
          </tr>
        </thead>

        <tbody>
          ${rows}
        </tbody>
      </table>

      <p class="note">
        Residents are responsible for checking the posted cooking schedule.
      </p>
    </body>
    </html>
  `);

  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
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

function escapeAttribute(value) {
  return escapeHtml(value);
}

document
  .getElementById("clearMealBtn")
  ?.addEventListener("click", clearMealAssignments);

document
  .getElementById("saveMealBtn")
  ?.addEventListener("click", async () => {
    try {
      await saveAppState(state);
      alert("Meal schedule saved.");
    } catch (error) {
      console.error("Meal schedule save failed:", error);
      alert("Could not save the meal schedule.");
    }
  });

document
  .getElementById("generateMealBtn")
  ?.addEventListener("click", generateMealWeek);

document
  .getElementById("randomMealBtn")
  ?.addEventListener("click", randomMealWeek);

document
  .getElementById("printMealBtn")
  ?.addEventListener("click", printMealSchedule);

auth.onAuthStateChanged(user => {
  if (!user) return;

  listenToAppState(nextState => {
    state = nextState;
    state.mealSchedule = getMealSchedule();
    render();
  });
});
