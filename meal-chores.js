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

  saveAppState(state);
}

function randomMealWeek() {
  const residents = activeResidents();

  if (residents.length === 0) {
    alert("Add active residents first.");
    return;
  }

  state.mealSchedule = getMealSchedule();

  const counts = new Map(residents.map(r => [r.id, 0]));
  let previousLunchId = "";

  DAYS.forEach(day => {
    const usedToday = new Set();

    const lunch = pickResident(residents, counts, usedToday, [previousLunchId]);
    if (lunch) {
      usedToday.add(lunch.id);
      counts.set(lunch.id, counts.get(lunch.id) + 1);
    }

    const supper1 = pickResident(residents, counts, usedToday, []);
    if (supper1) {
      usedToday.add(supper1.id);
      counts.set(supper1.id, counts.get(supper1.id) + 1);
    }

    const supper2 = pickResident(residents, counts, usedToday, []);
    if (supper2) {
      usedToday.add(supper2.id);
      counts.set(supper2.id, counts.get(supper2.id) + 1);
    }

    state.mealSchedule.weekSchedule[day] = {
      lunch: lunch ? lunch.id : "",
      supper1: supper1 ? supper1.id : "",
      supper2: supper2 ? supper2.id : ""
    };

    previousLunchId = lunch ? lunch.id : "";
  });

  saveAppState(state);
}

function pickResident(residents, counts, usedToday, avoidIds) {
  const avoid = new Set((avoidIds || []).filter(Boolean));

  let pool = residents.filter(r => !usedToday.has(r.id) && !avoid.has(r.id));

  if (pool.length === 0) {
    pool = residents.filter(r => !usedToday.has(r.id));
  }

  if (pool.length === 0) {
    pool = residents;
  }

  const lowest = Math.min(...pool.map(r => counts.get(r.id) || 0));
  const fairest = pool.filter(r => (counts.get(r.id) || 0) === lowest);

  return fairest[Math.floor(Math.random() * fairest.length)];
}

function clearMealAssignments() {
  if (!confirm("Clear the weekly meal schedule?")) return;

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
    const row = mealSchedule.weekSchedule[day] || {
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
    const row = mealSchedule.weekSchedule[day] || {
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

document.getElementById("clearMealBtn")?.addEventListener("click", clearMealAssignments);
document.getElementById("saveMealBtn")?.addEventListener("click", () => {
  saveAppState(state);
  alert("Meal schedule saved.");
});
document.getElementById("generateMealBtn")?.addEventListener("click", generateMealWeek);
document.getElementById("randomMealBtn")?.addEventListener("click", randomMealWeek);
document.getElementById("printMealBtn")?.addEventListener("click", printMealSchedule);

auth.onAuthStateChanged(user => {
  if (!user) return;

  listenToAppState(nextState => {
    state = nextState;
    render();
  });
});
