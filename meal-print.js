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
document.getElementById("mealWeekStart").value=KBRHDates.nextMonday();

function getMealPrintRoster() {
  const roster = Array.isArray(mealPrintState.roster)
    ? mealPrintState.roster.filter(client => client && client !== "temp")
    : [];
  const selectedIds = new Set((mealPrintState.chorePreAdmissionIds || []).map(String));
  const preAdmissions = (Array.isArray(mealPrintState.residents) ? mealPrintState.residents : [])
    .filter(resident => resident && resident.preAdmissionApplicantId && selectedIds.has(String(resident.preAdmissionApplicantId)))
    .map(resident => ({ id: resident.id, firstName: resident.name || "Unnamed Applicant", lastName: "", name: resident.name || "Unnamed Applicant" }));
  return [...roster, ...preAdmissions];
}

function getMealPrintSchedule() {
  return normalizeMealSchedule(mealPrintState.mealSchedule);
}

function getMealPrintResidentName(id) {
  if (!id) return "";

  const resident = getMealPrintRoster().find(
    client => String(client.id) === String(id)
  );

  if (!resident) return "Unresolved assignment — staff review required";

  const fullName = resident.name ||
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
  const selectedWeek=document.getElementById("mealWeekStart").value;
  const matching=schedule.weekStart===selectedWeek;
  document.getElementById("mealPrintStatus").textContent=matching ? (schedule.published?"Published schedule":"Draft schedule — not published") : "No saved meal schedule for the selected week. Generate and publish it in Meal Chores.";

  body.innerHTML = MEAL_PRINT_DAYS.map(day => {
    const row = (matching ? schedule.weekSchedule[day] : null) || {
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
  ?.addEventListener("change", renderMealPrintTemplate);

auth.onAuthStateChanged(user => {
  if (!user) return;

  listenToAppState(nextState => {
    mealPrintState = nextState;
    renderMealPrintTemplate();
  });
});
