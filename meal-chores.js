const MAIN_STORAGE_KEY = "residentChoreRotator.github.v1";
const MEAL_STORAGE_KEY = "residentMealChores.github.v1";

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
    return {
      roles: [
        { id: crypto.randomUUID(), name: "Breakfast prep", residentId: "" },
        { id: crypto.randomUUID(), name: "Lunch prep", residentId: "" },
        { id: crypto.randomUUID(), name: "Supper prep", residentId: "" },
        { id: crypto.randomUUID(), name: "Dishes", residentId: "" }
      ]
    };
  }

  try {
    return JSON.parse(saved);
  } catch {
    return { roles: [] };
  }
}

function saveMealState() {
  localStorage.setItem(MEAL_STORAGE_KEY, JSON.stringify(mealState));
}

function activeResidents() {
  return (mainState.residents || []).filter(resident => resident.status === "active");
}

function setMealResident(roleId, residentId) {
  const role = mealState.roles.find(r => r.id === roleId);
  if (!role) return;

  role.residentId = residentId;
  saveMealState();
  render();
}

function addMealRole() {
  const input = document.getElementById("mealRoleName");
  const name = input.value.trim();
  if (!name) return;

  mealState.roles.push({
    id: crypto.randomUUID(),
    name,
    residentId: ""
  });

  input.value = "";
  saveMealState();
  render();
}

function removeMealRole(roleId) {
  mealState.roles = mealState.roles.filter(role => role.id !== roleId);
  saveMealState();
  render();
}

function clearMealAssignments() {
  mealState.roles = mealState.roles.map(role => ({ ...role, residentId: "" }));
  saveMealState();
  render();
}

function render() {
  mainState = loadMainState();
  const residents = activeResidents();
  const body = document.getElementById("mealBody");

  mealState.roles = mealState.roles.map(role => {
    if (role.residentId && !residents.some(resident => resident.id === role.residentId)) {
      return { ...role, residentId: "" };
    }
    return role;
  });
  saveMealState();

  if (mealState.roles.length === 0) {
    body.innerHTML = `<tr><td colspan="3" class="empty">No meal roles added.</td></tr>`;
    return;
  }

  body.innerHTML = mealState.roles.map(role => `
    <tr>
      <td>${escapeHtml(role.name)}</td>
      <td>
        <select onchange="setMealResident('${role.id}', this.value)">
          <option value="">Unassigned</option>
          ${residents.map(resident => `
            <option value="${resident.id}" ${role.residentId === resident.id ? "selected" : ""}>
              ${escapeHtml(resident.name)}
            </option>
          `).join("")}
        </select>
      </td>
      <td>
        <button class="danger" onclick="removeMealRole('${role.id}')">Remove</button>
      </td>
    </tr>
  `).join("");
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

document.getElementById("addMealRoleBtn").addEventListener("click", addMealRole);
document.getElementById("clearMealBtn").addEventListener("click", clearMealAssignments);
document.getElementById("saveMealBtn").addEventListener("click", () => {
  saveMealState();
  alert("Meal chores saved.");
});
document.getElementById("mealRoleName").addEventListener("keydown", e => {
  if (e.key === "Enter") addMealRole();
});

render();
