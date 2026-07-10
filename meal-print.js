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

function getMealPrintRoster() {
  return Array.isArray(mealPrintState.roster)
    ? mealPrintState.roster.filter(client =>
        client &&
        client !== "temp"
      )
    : [];
}

function getMealPrintSchedule() {
  return normalizeMealSchedule(mealPrintState.mealSchedule);
}

function getMealPrintResidentName(id) {
  if (!id) return "";

  const resident = getMealPrintRoster().find(client => client.id === id);

  if (!resident) return "Unknown Resident";

  return `${resident.firstName || ""} ${resident.lastName || ""}`.trim() ||
    "Unnamed Resident";
}

function formatMealPrintDate(value) {
  if (!value) return "";

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString("en-CA", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric"
  });
}

function updateMealPrintDates() {
  const startInput = document.getElementById("mealWeekStart");
  const endInput = document.getElementById("mealWeekEnd");
  const startPrint = document.getElementById("mealWeekStartPrint");
  const endPrint = document.getElementById("mealWeekEndPrint");
  const dash = document.getElementById("mealWeekDash");

  const start = startInput?.value || "";
  const end = endInput?.value || "";

  if (startPrint) {
    startPrint.textContent = formatMealPrintDate(start);
  }

  if (endPrint) {
    endPrint.textContent = formatMealPrintDate(end);
  }

  if (dash) {
    dash.style.display = start || end ? "inline" : "none";
  }
}

function renderMealPrintTemplate() {
  const body = document.getElementById("mealPrintBody");

  if (!body) return;

  const schedule = getMealPrintSchedule();

  body.innerHTML = MEAL_PRINT_DAYS.map(day => {
    const row = schedule.weekSchedule[day] || {
      lunch: "",
      supper1: "",
      supper2: ""
    };

    const lunch = getMealPrintResidentName(row.lunch);

    const supperNames = [
      getMealPrintResidentName(row.supper1),
      getMealPrintResidentName(row.supper2)
    ].filter(Boolean);

    return `
      <tr>
        <td>${escapeMealPrintHtml(day)}</td>
        <td>${escapeMealPrintHtml(lunch)}</td>
        <td>${escapeMealPrintHtml(supperNames[0] || "")}</td>
        <td>${escapeMealPrintHtml(supperNames[1] || "")}</td>
      </tr>
    `;
  }).join("");

  updateMealPrintDates();
}

function escapeMealPrintHtml(value) {
  return String(value || "").replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[character]));
}

document
  .getElementById("mealWeekStart")
  ?.addEventListener("change", updateMealPrintDates);

document
  .getElementById("mealWeekEnd")
  ?.addEventListener("change", updateMealPrintDates);

auth.onAuthStateChanged(user => {
  if (!user) return;

  listenToAppState(nextState => {
    mealPrintState = nextState;
    renderMealPrintTemplate();
  });
});
