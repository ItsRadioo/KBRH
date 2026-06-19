const STORAGE_KEY = "residentChoreRotator.github.v1";
const STANDARD_CHORES = ['Bathroom', 'Upper floors', 'Main Floor (morning)', 'Main Floor (Night)', 'Basement', 'Outside Yardwork', 'Morning dishes', 'Resident Fridge', 'General Disinfecting', 'Special Projects'];

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return { residents: [], chores: STANDARD_CHORES };

  try {
    return JSON.parse(saved);
  } catch {
    return { residents: [], chores: STANDARD_CHORES };
  }
}

function getChoreName(state, index) {
  const chores = state.chores && state.chores.length ? state.chores : STANDARD_CHORES;
  if (index < 0) return "No chore";
  const normalized = ((index % chores.length) + chores.length) % chores.length;
  return chores[normalized];
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value + "T00:00:00");
  return date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

function renderPrintSheet() {
  const state = loadState();
  const residents = (state.residents || []).filter(resident => resident.status === "active");

  const assignments = new Map();

  residents.forEach(resident => {
    const choreName = getChoreName(state, resident.choreIndex);
    if (!assignments.has(choreName)) assignments.set(choreName, []);
    assignments.get(choreName).push(resident.name);
  });

  document.getElementById("templateChoreBody").innerHTML = STANDARD_CHORES.map(chore => {
    const names = assignments.get(chore) || [];
    return `
      <tr>
        <td>${escapeHtml(chore)}</td>
        <td>${names.length ? escapeHtml(names.join(", ")) : "&nbsp;"}</td>
      </tr>
    `;
  }).join("");

  updatePrintedDates();
}

function updatePrintedDates() {
  const start = document.getElementById("startDate").value;
  const end = document.getElementById("endDate").value;

  document.getElementById("startDatePrint").textContent = formatDate(start);
  document.getElementById("endDatePrint").textContent = formatDate(end);
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

document.getElementById("startDate").addEventListener("change", updatePrintedDates);
document.getElementById("endDate").addEventListener("change", updatePrintedDates);

renderPrintSheet();
