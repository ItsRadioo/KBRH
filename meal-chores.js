const MAIN_STORAGE_KEY = "residentChoreRotator.github.v1";
const MEAL_STORAGE_KEY = "residentMealChores.daily.v1";

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

function loadMealState() {
  const saved = localStorage.getItem(MEAL_STORAGE_KEY);
  if (!saved) {
    return defaultMealState();
  }

  try {
    return migrateMealState(JSON.parse(saved));
  } catch {
    return defaultMealState();
  }
}

function defaultMealState() {
  return {
    roles: [
      { id: "lunch", name: "Lunch", residentIds: [] },
      { id: "supper", name: "Supper", residentIds: [] }
    ],
    history: []
  };
}

function migrateMealState(parsed) {
  const oldRoles = Array.isArray(parsed.roles) ? parsed.roles : [];
  const lunch = oldRoles.find(role => role.id === "lunch" || role.name === "Lunch");
  const supper = oldRoles.find(role => role.id === "supper" || role.name === "Supper");

  return {
    roles: [
      {
        id: "lunch",
        name: "Lunch",
        residentIds: Array.isArray(lunch?.residentIds) ? lunch.residentIds : (lunch?.residentId ? [lunch.residentId] : [])
      },
      {
        id: "supper",
        name: "Supper",
        residentIds: Array.isArray(supper?.residentIds) ? supper.residentIds : (supper?.residentId ? [supper.residentId] : [])
      }
    ],
    history: Array.isArray(parsed.history) ? parsed.history : []
  };
}

function saveMealState() {
  localStorage.setItem(MEAL_STORAGE_KEY, JSON.stringify(mealState));
}

function activeResidents() {
  return (mainState.residents || []).filter(resident => resident.status === "active");
}

function getResidentName(id) {
  const resident = activeResidents().find(r => r.id === id);
  return resident ? resident.name : "";
}

function setMealResident(roleId, slotIndex, residentId) {
  const role = mealState.roles.find(r => r.id === roleId);
  if (!role) return;

  role.residentIds[slotIndex] = residentId;
  role.residentIds = role.residentIds.filter(Boolean);

  saveMealState();
  render();
}

function rotateMealDuties() {
  mainState = loadMainState();
  const residents = activeResidents();
  if (residents.length === 0) return;

  const currentIds = [];
  mealState.roles.forEach(role => {
    role.residentIds.forEach(id => {
      if (id && !currentIds.includes(id)) currentIds.push(id);
    });
  });

  let startIndex = 0;
  if (currentIds.length > 0) {
    const lastCurrentId = currentIds[currentIds.length - 1];
    const foundIndex = residents.findIndex(r => r.id === lastCurrentId);
    startIndex = foundIndex >= 0 ? foundIndex + 1 : 0;
  }

  const neededSlots = 3; // lunch + two supper
  const nextIds = [];

  for (let i = 0; i < Math.min(neededSlots, residents.length); i++) {
    nextIds.push(residents[(startIndex + i) % residents.length].id);
  }

  mealState.roles = [
    { id: "lunch", name: "Lunch", residentIds: nextIds.slice(0, 1) },
    { id: "supper", name: "Supper", residentIds: nextIds.slice(1, 3) }
  ];

  mealState.history.unshift({
    id: crypto.randomUUID(),
    timestamp: new Date().toLocaleString(),
    lunch: mealState.roles[0].residentIds.map(getResidentName).join(", "),
    supper: mealState.roles[1].residentIds.map(getResidentName).join(", ")
  });

  saveMealState();
  render();
}

function clearMealAssignments() {
  mealState = defaultMealState();
  saveMealState();
  render();
}

function cleanInvalidAssignments() {
  const residents = activeResidents();
  mealState.roles = mealState.roles.map(role => ({
    ...role,
    residentIds: (role.residentIds || []).filter(id => residents.some(resident => resident.id === id))
  }));
  saveMealState();
}

function render() {
  mainState = loadMainState();
  cleanInvalidAssignments();

  const residents = activeResidents();
  const body = document.getElementById("mealBody");

  body.innerHTML = mealState.roles.map(role => {
    const slotCount = role.id === "supper" ? 2 : 1;
    const selects = Array.from({ length: slotCount }).map((_, index) => `
      <select onchange="setMealResident('${role.id}', ${index}, this.value)">
        <option value="">Unassigned</option>
        ${residents.map(resident => `
          <option value="${resident.id}" ${(role.residentIds || [])[index] === resident.id ? "selected" : ""}>
            ${escapeHtml(resident.name)}
          </option>
        `).join("")}
      </select>
    `).join("");

    return `
      <tr>
        <td>${escapeHtml(role.name)}</td>
        <td class="stacked-selects">${selects}</td>
        <td><span class="empty">${role.id === "supper" ? "2 residents" : "1 resident"}</span></td>
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
  saveMealState();
  alert("Meal chores saved.");
});
document.getElementById("rotateMealBtn").addEventListener("click", rotateMealDuties);

render();
