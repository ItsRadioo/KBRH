const MEAL_PRINT_DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday"
];

let mealPrintState = defaultAppState();

function activeMealPrintResidents() {
  return (mealPrintState.residents || []).filter(resident => resident.status === "active");
}

function getMealPrintSchedule() {
  return normalizeMealSchedule(mealPrintState.mealSchedule);
}

function getMealPrintResidentName(id) {
  const resident = activeMealPrintResidents().find(r => r.id === id);
  return resident ? resident.name : "";
}

function formatMealPrintDate(value) {
  if (!value) return "Week of";

  const date = new Date(value + "T00:00:00");

  return `Week of ${date.toLocaleDateString("en-CA", {
    month: "long",
    day: "numeric",
    year: "numeric"
  })}`;
}

function updateMealPrintDate() {
  const startInput = document.getElementById("mealWeekStart");
  const printTarget = document.getElementById("mealWeekStartPrint");

  if (!startInput || !printTarget) return;

  printTarget.textContent = formatMealPrintDate(startInput.value);
}

function renderMealPrintTemplate() {
  const schedule = getMealPrintSchedule();
  const body = document.getElementById("mealPrintBody");

  if (!body) return;

  body.innerHTML = MEAL_PRINT_DAYS.map(day => {
    const row = schedule.weekSchedule[day] || {
      lunch: "",
      supper1: "",
      supper2: ""
    };

    return `
      <div class="dish-day-block">
        <h3>${escapeMealPrintHtml(day)}</h3>

        <table class="dish-day-table">
          <tr>
            <th>Lunch</th>
            <td>${escapeMealPrintHtml(getMealPrintResidentName(row.lunch))}</td>
          </tr>
          <tr>
            <th>Dinner</th>
            <td>${escapeMealPrintHtml(getMealPrintResidentName(row.supper1))}</td>
          </tr>
          <tr>
            <th>Dinner</th>
            <td>${escapeMealPrintHtml(getMealPrintResidentName(row.supper2))}</td>
          </tr>
        </table>
      </div>
    `;
  }).join("");

  updateMealPrintDate();
}

function escapeMealPrintHtml(value) {
  return String(value || "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[char]));
}

document.addEventListener("DOMContentLoaded", () => {
  const dateInput = document.getElementById("mealWeekStart");

  if (dateInput) {
    dateInput.addEventListener("change", updateMealPrintDate);
  }
});

auth.onAuthStateChanged(user => {
  if (!user) return;

  listenToAppState(nextState => {
    mealPrintState = nextState;
    renderMealPrintTemplate();
  });
});
