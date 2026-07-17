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

  const resident = getMealPrintRoster().find(
    client => client.id === id
  );

  if (!resident) return "UNKNOWN RESIDENT";

  const fullName =
    `${resident.firstName || ""} ${resident.lastName || ""}`.trim();

  return (fullName || "UNNAMED RESIDENT").toUpperCase();
}

function formatMealPrintDate(value) {
  if (!value) return "";

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString("en-CA", {
    month: "long",
    day: "numeric",
    year: "numeric"
  });
}

function updateMealPrintDate() {
  const startInput =
    document.getElementById("mealWeekStart");

  const startPrint =
    document.getElementById("mealWeekStartPrint");

  const start = startInput?.value || "";

  if (startPrint) {
    startPrint.textContent =
      formatMealPrintDate(start) ||
      "________________";
  }
}

function renderMealPrintTemplate() {
  const body =
    document.getElementById("mealPrintBody");

  if (!body) return;

  const schedule = getMealPrintSchedule();

  body.innerHTML = MEAL_PRINT_DAYS.map(day => {
    const row = schedule.weekSchedule[day] || {
      lunch: "",
      supper1: "",
      supper2: ""
    };

    const lunch =
      getMealPrintResidentName(row.lunch);

    const dinnerOne =
      getMealPrintResidentName(row.supper1);

    const dinnerTwo =
      getMealPrintResidentName(row.supper2);

    return `
      <section class="dish-day-block">
        <h2 class="dish-day-title">
          ${escapeMealPrintHtml(day)}
        </h2>

        <table class="dish-day-table">
          <tbody>
            <tr>
              <td class="dish-meal-label">Lunch</td>
              <td class="dish-resident-name">
                ${escapeMealPrintHtml(lunch)}
              </td>
            </tr>

            <tr>
              <td class="dish-meal-label">Dinner</td>
              <td class="dish-resident-name">
                ${escapeMealPrintHtml(dinnerOne)}
              </td>
            </tr>

            <tr>
              <td class="dish-meal-label">Dinner</td>
              <td class="dish-resident-name">
                ${escapeMealPrintHtml(dinnerTwo)}
              </td>
            </tr>
          </tbody>
        </table>
      </section>
    `;
  }).join("");

  updateMealPrintDate();
}

function escapeMealPrintHtml(value) {
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

document
  .getElementById("mealWeekStart")
  ?.addEventListener("change", updateMealPrintDate);

auth.onAuthStateChanged(user => {
  if (!user) return;

  listenToAppState(nextState => {
    mealPrintState = nextState;
    renderMealPrintTemplate();
  });
});
