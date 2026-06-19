const PRINT_STANDARD_CHORES = [
  "Bathroom",
  "Upper floors",
  "Main Floor (morning)",
  "Main Floor (Night)",
  "Basement",
  "Outside Yardwork",
  "Morning dishes",
  "Resident Fridge",
  "General Disinfecting",
  "Special Projects"
];

let printState = defaultAppState();

function addDaysToDateString(value, days) {
  if (!value) return "";
  const date = new Date(value + "T00:00:00");
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function getPrintChoreName(state, index) {
  const chores = state.chores && state.chores.length ? state.chores : PRINT_STANDARD_CHORES;
  const numericIndex = Number(index);
  if (!chores.length || Number.isNaN(numericIndex) || numericIndex < 0) return "";
  const normalized = ((numericIndex % chores.length) + chores.length) % chores.length;
  return chores[normalized];
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value + "T00:00:00");
  return date.toLocaleDateString("en-CA", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric"
  });
}

function updatePrintedDates() {
  const startInput = document.getElementById("startDate");
  const endInput = document.getElementById("endDate");

  if (!startInput || !endInput) return;

  if (startInput.value) {
    endInput.value = addDaysToDateString(startInput.value, 7);
  } else {
    endInput.value = "";
  }

  document.getElementById("startDatePrint").textContent = formatDate(startInput.value);
  document.getElementById("endDatePrint").textContent = formatDate(endInput.value);
}

function renderPrintSheet() {
  const residents = (printState.residents || []).filter(resident => resident.status === "active");
  const assignments = new Map();

  residents.forEach(resident => {
    const choreName = getPrintChoreName(printState, resident.choreIndex);
    if (!choreName) return;

    if (!assignments.has(choreName)) assignments.set(choreName, []);
    assignments.get(choreName).push(resident.name);
  });

  const body = document.getElementById("templateChoreBody");
  if (!body) return;

  body.innerHTML = PRINT_STANDARD_CHORES.map(chore => {
    const names = assignments.get(chore) || [];
    return `
      <tr>
        <td>${escapeHtml(chore)}</td>
        <td>${names.length ? escapeHtml(names.join(", ")) : "N/A"}</td>
      </tr>
    `;
  }).join("");

  updatePrintedDates();
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

document.getElementById("startDate")?.addEventListener("change", () => {
  updatePrintedDates();
});

auth.onAuthStateChanged(user => {
  if (!user) return;

  listenToAppState(nextState => {
    printState = nextState;
    renderPrintSheet();
  });
});
