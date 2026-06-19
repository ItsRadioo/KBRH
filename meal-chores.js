const MAIN_STORAGE_KEY = "residentChoreRotator.github.v1";
const MEAL_STORAGE_KEY = "residentMealChores.weekly.v1";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

let mainState = loadMainState();
let mealState = loadMealState();

function loadMainState() {
  const saved = localStorage.getItem(MAIN_STORAGE_KEY);
  if (!saved) return { residents: [] };

  try {
    return JSON.parse(saved);
  } catch {
    return { residents: [] };
  }
}

function defaultMealState() {
  return {
    weekSchedule: DAYS.reduce((schedule, day) => {
      schedule[day] = { lunch: "", supper1: "", supper2: "" };
      return schedule;
    }, {}),
    history: []
  };
}

function loadMealState() {
  const saved = localStorage.getItem(MEAL_STORAGE_KEY);
  if (!saved) return defaultMealState();

  try {
    return JSON.parse(saved);
  } catch {
    return defaultMealState();
  }
}

function saveMealState() {
  localStorage.setItem(MEAL_STORAGE_KEY, JSON.stringify(mealState));
}

function activeResidents() {
  return (mainState.residents || []).filter(resident => resident.status === "active");
}

function setMealResident(day, slot, residentId) {
  mealState.weekSchedule[day][slot] = residentId;
  saveMealState();
  render();
}

function generateMealWeek() {
  mainState = loadMainState();
  const residents = activeResidents();

  if (residents.length === 0) {
    alert("Add active residents first.");
    return;
  }

  let index = 0;

  DAYS.forEach(day => {
    mealState.weekSchedule[day] = {
      lunch: residents[index % residents.length].id,
      supper1: residents[(index + 1) % residents.length].id,
      supper2: residents[(index + 2) % residents.length].id
    };

    index += 3;
  });

  saveMealState();
  render();
}

function clearMealAssignments() {
  mealState = defaultMealState();
  saveMealState();
  render();
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
  mainState = loadMainState();

  const body = document.getElementById("mealBody");

  body.innerHTML = DAYS.map(day => {
    const row = mealState.weekSchedule[day] || { lunch: "", supper1: "", supper2: "" };

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
    "'": "&#039;",
  }[char]));
}

document.getElementById("clearMealBtn").addEventListener("click", clearMealAssignments);
document.getElementById("saveMealBtn").addEventListener("click", () => {
  saveMealState();
  alert("Meal schedule saved.");
});
document.getElementById("rotateMealBtn").addEventListener("click", generateMealWeek);

render();
