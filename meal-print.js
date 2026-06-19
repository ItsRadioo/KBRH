const MEAL_PRINT_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

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
  if (!value) return "";
  const date = new Date(value + "T00:00:00");
  return date.toLocaleDateString("en-CA", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric"
  });
}

function updateMealPrintDates() {
  const start = document.getElementById("mealWeekStart").value;
  const end = document.getElementById("mealWeekEnd").value;

  document.getElementById("mealWeekStartPrint").textContent = formatMealPrintDate(start);
  document.getElementById("mealWeekEndPrint").textContent = formatMealPrintDate(end);
  document.getElementById("mealWeekDash").style.display = start || end ? "inline" : "none";
}

function renderMealPrintTemplate() {
  const schedule = getMealPrintSchedule();
  const body = document.getElementById("mealPrintBody");

  body.innerHTML = MEAL_PRINT_DAYS.map(day => {
    const row = schedule.weekSchedule[day] || { lunch: "", supper1: "", supper2: "" };
    const lunch = getMealPrintResidentName(row.lunch);
    const supper = [getMealPrintResidentName(row.supper1), getMealPrintResidentName(row.supper2)]
      .filter(Boolean)
      .join(" / ");

    return `
      <tr>
        <td>${escapeMealPrintHtml(day)}</td>
        <td>${escapeMealPrintHtml(lunch)}</td>
        <td>${escapeMealPrintHtml(supper)}</td>
      </tr>
    `;
  }).join("");

  updateMealPrintDates();
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

document.getElementById("mealWeekStart").addEventListener("change", updateMealPrintDates);
document.getElementById("mealWeekEnd").addEventListener("change", updateMealPrintDates);

auth.onAuthStateChanged(user => {
  if (!user) return;

  listenToAppState(nextState => {
    mealPrintState = nextState;
    renderMealPrintTemplate();
  });
});
