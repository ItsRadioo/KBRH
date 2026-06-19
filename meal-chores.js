const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

let state = defaultAppState();

function activeResidents() {
  return (state.residents || []).filter(resident => resident.status === "active");
}

function getMealSchedule() {
  return normalizeMealSchedule(state.mealSchedule);
}

function getResidentName(id) {
  const resident = activeResidents().find(r => r.id === id);
  return resident ? resident.name : "";
}

function setMealResident(day, slot, residentId) {
  state.mealSchedule = getMealSchedule();
  state.mealSchedule.weekSchedule[day][slot] = residentId;
  saveAppState(state);
}

function generateMealWeek() {
  const residents = activeResidents();

  if (residents.length === 0) {
    alert("Add active residents first.");
    return;
  }

  state.mealSchedule = getMealSchedule();

  let index = 0;

  DAYS.forEach(day => {
    state.mealSchedule.weekSchedule[day] = {
      lunch: residents[index % residents.length].id,
      supper1: residents[(index + 1) % residents.length].id,
      supper2: residents[(index + 2) % residents.length].id
    };

    index += 3;
  });

  state.mealSchedule.history.unshift({
    id: crypto.randomUUID(),
    timestamp: new Date().toLocaleString(),
    type: "Generated weekly meal schedule"
  });

  saveAppState(state);
}

function randomMealWeek() {
  const residents = activeResidents();

  if (residents.length === 0) {
    alert("Add active residents first.");
    return;
  }

  if (residents.length < 3) {
    alert("Random meal generation works best with at least 3 active residents because supper requires two people.");
  }

  state.mealSchedule = getMealSchedule();

  const assignmentCounts = new Map(residents.map(resident => [resident.id, 0]));
  let previousLunchId = "";

  DAYS.forEach(day => {
    const lunch = pickRandomResident(residents, assignmentCounts, [previousLunchId]);
    const supper1 = pickRandomResident(residents, assignmentCounts, [lunch?.id]);
    const supper2 = pickRandomResident(residents, assignmentCounts, [lunch?.id, supper1?.id]);

    state.mealSchedule.weekSchedule[day] = {
      lunch: lunch?.id || "",
      supper1: supper1?.id || "",
      supper2: supper2?.id || ""
    };

    [lunch, supper1, supper2].forEach(resident => {
      if (resident) {
        assignmentCounts.set(resident.id, (assignmentCounts.get(resident.id) || 0) + 1);
      }
    });

    previousLunchId = lunch?.id || "";
  });

  state.mealSchedule.history.unshift({
    id: crypto.randomUUID(),
    timestamp: new Date().toLocaleString(),
    type: "Random weekly meal schedule"
  });

  saveAppState(state);
}

function pickRandomResident(residents, assignmentCounts, excludedIds = []) {
  const exclusions = new Set(excludedIds.filter(Boolean));

  let pool = residents.filter(resident => !exclusions.has(resident.id));

  if (pool.length === 0) {
    pool = residents;
  }

  const lowestCount = Math.min(...pool.map(resident => assignmentCounts.get(resident.id) || 0));
  const fairestPool = pool.filter(resident => (assignmentCounts.get(resident.id) || 0) === lowestCount);

  return fairestPool[Math.floor(Math.random() * fairestPool.length)];
}

function clearMealAssignments() {
  const confirmed = confirm("Clear the weekly meal schedule?");
  if (!confirmed) return;

  state.mealSchedule = defaultMealSchedule();
  saveAppState(state);
}

function residentSelect(day, slot, selectedId) {
  const residents = activeResidents();

  return `
    <select onchange="setMealResident('${day}', '${slot}', this.value)">
      <option value="">Unassigned</option>
      ${residents.map(resident => `
        <option value="${resident.id}" ${selectedId === resident.id ? "selected" : ""}>
          ${escapeHtml(resident.name)}
        </option>
      `).join("")}
    </select>
  `;
}

function render() {
  const body = document.getElementById("mealBody");
  if (!body) return;

  const mealSchedule = getMealSchedule();

  body.innerHTML = DAYS.map(day => {
    const row = mealSchedule.weekSchedule[day] || { lunch: "", supper1: "", supper2: "" };

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
    const row = mealSchedule.weekSchedule[day] || { lunch: "", supper1: "", supper2: "" };

    return `
      <tr>
        <td>${escapeHtml(day)}</td>
        <td>${escapeHtml(getResidentName(row.lunch) || "")}</td>
        <td>${escapeHtml(getResidentName(row.supper1) || "")}</td>
        <td>${escapeHtml(getResidentName(row.supper2) || "")}</td>
      </tr>
    `;
  }).join("");

  const printWindow = window.open("", "_blank");
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Weekly Meal Schedule</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 32px; }
        h1 { text-align: center; margin-bottom: 4px; }
        .subtitle { text-align: center; margin-bottom: 24px; font-weight: bold; }
        table { width: 100%; border-collapse: collapse; font-size: 16px; }
        th, td { border: 2px solid black; padding: 12px; text-align: left; }
        th { background: #e5e7eb; text-align: center; }
        td:first-child { font-weight: bold; width: 22%; }
        .note { margin-top: 24px; font-size: 14px; font-weight: bold; }
      </style>
    </head>
    <body>
      <h1>RESIDENT COOKING SCHEDULE</h1>
      <div class="subtitle">Lunch requires 1 resident. Supper requires 2 residents.</div>
      <table>
        <thead>
          <tr>
            <th>Day</th>
            <th>Lunch</th>
            <th>Supper 1</th>
            <th>Supper 2</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <p class="note">Residents are responsible for checking the posted cooking schedule.</p>
    </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
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

document.getElementById("clearMealBtn").addEventListener("click", clearMealAssignments);
document.getElementById("saveMealBtn").addEventListener("click", () => {
  saveAppState(state);
  alert("Meal schedule saved.");
});
document.getElementById("generateMealBtn").addEventListener("click", generateMealWeek);
document.getElementById("randomMealBtn").addEventListener("click", randomMealWeek);
document.getElementById("printMealBtn").addEventListener("click", printMealSchedule);

auth.onAuthStateChanged(user => {
  if (!user) return;

  listenToAppState(nextState => {
    state = nextState;
    render();
  });
});
