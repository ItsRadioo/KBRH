const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

let state = defaultAppState();

function activeResidents() {
  return (state.residents || []).filter(resident => resident.status === "active");
}

function getMealSchedule() {
  return normalizeMealSchedule(state.mealSchedule);
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
    timestamp: new Date().toLocaleString()
  });

  saveAppState(state);
}

function clearMealAssignments() {
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
        <td><strong>${day}</strong></td>
        <td>${residentSelect(day, "lunch", row.lunch)}</td>
        <td>${residentSelect(day, "supper1", row.supper1)}</td>
        <td>${residentSelect(day, "supper2", row.supper2)}</td>
      </tr>
    `;
  }).join("");
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

document.getElementById("clearMealBtn").addEventListener("click", clearMealAssignments);
document.getElementById("saveMealBtn").addEventListener("click", () => {
  saveAppState(state);
  alert("Meal schedule saved.");
});
document.getElementById("rotateMealBtn").addEventListener("click", generateMealWeek);

auth.onAuthStateChanged(user => {
  if (!user) return;

  listenToAppState(nextState => {
    state = nextState;
    render();
  });
});
