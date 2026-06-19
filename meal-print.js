const MAIN_STORAGE_KEY = "residentChoreRotator.github.v1";
const MEAL_STORAGE_KEY = "residentMealChores.github.v1";
const MEAL_PRINT_SETTINGS_KEY = "residentMealPrintSettings.v1";

function loadMainState() {
  const saved = localStorage.getItem(MAIN_STORAGE_KEY);
  if (!saved) return { residents: [] };
  try { return JSON.parse(saved); } catch { return { residents: [] }; }
}

function loadMealState() {
  const saved = localStorage.getItem(MEAL_STORAGE_KEY);
  if (!saved) return { roles: [] };
  try { return JSON.parse(saved); } catch { return { roles: [] }; }
}

function loadSettings() {
  try { return JSON.parse(localStorage.getItem(MEAL_PRINT_SETTINGS_KEY)) || {}; } catch { return {}; }
}

function saveMealPrintSettings() {
  const satLabel = document.getElementById("satLabel").value.trim();
  const sunLabel = document.getElementById("sunLabel").value.trim();
  localStorage.setItem(MEAL_PRINT_SETTINGS_KEY, JSON.stringify({ satLabel, sunLabel }));
  renderLabels();
}

function renderLabels() {
  const settings = loadSettings();
  const satInput = document.getElementById("satLabel");
  const sunInput = document.getElementById("sunLabel");
  if (!satInput.value) satInput.value = settings.satLabel || "";
  if (!sunInput.value) sunInput.value = settings.sunLabel || "";
  document.getElementById("satDisplay").innerHTML = (satInput.value || "SATURDAY\nMAY ____").replace(/\n/g, "<br>");
  document.getElementById("sunDisplay").innerHTML = (sunInput.value || "SUNDAY\nMAY ____").replace(/\n/g, "<br>");
}

function residentNameById(mainState, id) {
  const resident = (mainState.residents || []).find(r => r.id === id && r.status === "active");
  return resident ? resident.name : "________________";
}

function renderMealPrint() {
  const mainState = loadMainState();
  const mealState = loadMealState();
  renderLabels();
  const body = document.getElementById("mealPrintBody");
  body.innerHTML = mealState.roles && mealState.roles.length
    ? mealState.roles.map(role => `<tr><td>${escapeHtml(role.name)}</td><td>${escapeHtml(residentNameById(mainState, role.residentId))}</td></tr>`).join("")
    : `<tr><td>Meal Chore</td><td>________________</td></tr>`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[char]));
}

renderMealPrint();
