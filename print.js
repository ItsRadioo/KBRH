const STORAGE_KEY = "residentChoreRotator.github.v1";
const PRINT_SETTINGS_KEY = "residentChoreRotator.printSettings.v1";

const TEMPLATE_ROWS = [
  { key: "Washrooms", aliases: ["washroom", "washrooms", "bathroom", "bathrooms"], subtitle: "(2ND / 3RD FLOOR + STAFF)<br>(Complete by 9 AM)", tasks: [
    "<u>Sweep & Mop:</u> Bathroom Floors",
    "<u>Clean:</u> Toilets (Bowl Inside & Out, Seat, Base, Tank), Urinal, Counter Top, Cabinet, Sink Bowl, Faucet, Mirror, Shower & Tub",
    "<u>Empty:</u> Garbage Cans of Waste (Wash Garbage Bins Weekly)",
    "<u>Replenish:</u> Toilet Paper, Paper Towel, Hand Soap",
    "<u>Wash:</u> Bathmats and Shower Curtains from ALL washrooms once a week on the weekend (Sat or Sun)"
  ]},
  { key: "Upstairs Floors", aliases: ["upstairs floors", "upstairs", "2nd floor", "third floor", "3rd floor"], subtitle: "", tasks: [
    "<u>Sweep & Mop:</u> 2nd/3rd Floor Hallways, Stairs, 2nd Floor Office (+ Remove Garbage from Office)",
    "<u>Dust:</u> Handrails on Stairways",
    "<u>Wipe:</u> 2nd Floor Stairway Window"
  ]},
  { key: "Main Floor", label: "MAIN FLOOR", aliases: ["main floor morning", "main floor (morning)", "morning main floor"], subtitle: "(MORNING)", tasks: [
    "<u>Sweep & Mop:</u> Entranceway, Living Room, Group Room, Offices",
    "<u>Offices:</u> Empty Garbage Bins into Garbage Bag and Dispose of In the Front Dumpster",
    "<u>Vacuum:</u> Main Entrance Rugs, Group Room Rug, Group Room Office",
    "<u>Dust:</u> Phone Table, Bookshelves, TV Stand, Window Ledges",
    "<u>Wipe Down:</u> All Couches and Chairs with Cleaner",
    "<u>Windows:</u> Wash Weekly or More As Needed"
  ]},
  { key: "Main Floor Night", label: "MAIN FLOOR", aliases: ["main floor night", "main floor (night)", "night main floor"], subtitle: "(NIGHT)", tasks: [
    "<u>Dining Room:</u> Place Chairs Upside Down On Table, Sweep & Mop Dining Room Floor, Take Out Garbages",
    "<u>Kitchen:</u> Remove Floor Mats, Sweep & Mop Floor, Take Out Garbage",
    "<u>Back Entrance:</u> Remove Floor Mats, Recycling Bins, Shoe Rack, Sweep & Mop Floor",
    "<u>Dining Room:</u> After Placing Chairs Back on Floor, Wipe Down Tables, Chairs, Resident Sink & Counter with Cleaner"
  ]},
  { key: "Basement", aliases: ["basement"], subtitle: "", tasks: [
    "<u>Sweep & Mop Entirety of Basement:</u> Steps, Donation Area, Hallway, Laundry Area, Washroom, Recreation Room",
    "<u>Washroom:</u> Clean Toilet Inside & Out, Clean Sink, Empty Garbage Can, Replace Toilet Paper & Paper Towel as needed",
    "<u>Check:</u> Lint Trap to Ensure it is Free of Lint",
    "<u>Organize:</u> Mops/Supply Wall to Ensure Everything is Correctly Put Away"
  ]},
  { key: "Outside Yardwork", aliases: ["outside yardwork", "outside", "yardwork", "yard work"], subtitle: "", tasks: [
    "<u>Mow Lawn:</u> Front, Back, Side of the home",
    "<u>Sweep:</u> Front Porch, Ramp, Back Steps, Fire Escape, Smoking Section",
    "<u>Rake:</u> Front Lawn, Back Yard",
    "<u>Recycle:</u> Put out Grey Recycle Bins & Yard Waste per Schedule on Dining Room Info Board (<strong>EVERYONE</strong>)",
    "<u>Smoking Section:</u> Empty Garbage Can & Cigarette Butt Can Regularly (<strong>EVERYONE</strong>)"
  ]},
  { key: "Morning Dishes", aliases: ["morning dishes", "dishes"], subtitle: "", tasks: [
    "<u>Wash:</u> All dishes in the Gray Bin after Breakfast is done (8:30 AM)",
    "<u>Wipe Down:</u> All Counters and TableTop Surfaces in Kitchen and Dining Room"
  ]},
  { key: "Resident Fridge", aliases: ["resident fridge", "fridge"], subtitle: "(Complete Friday)", tasks: [
    "<u>Remove:</u> All items from the Resident Fridge",
    "<u>Dispose:</u> Any items without a Labelled Name or Date on them",
    "<u>Clean:</u> Inside of Fridge (Shelves / Crispers / Door Storage)"
  ]},
  { key: "General Disinfecting", aliases: ["general disinfecting", "disinfecting"], subtitle: "", tasks: [
    "<u>Wipe Down:</u> All High Touch Surfaces in Home Twice A Day with Lysol Wipes (After Group + After Dinner)<br>Door Handles, Light Switches, Fridge Handles, Stairway Railings"
  ]},
  { key: "Special Projects", aliases: ["special projects", "special project"], subtitle: "", tasks: []}
];

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return { residents: [], chores: [] };
  try { return JSON.parse(saved); } catch { return { residents: [], chores: [] }; }
}

function loadPrintSettings() {
  try { return JSON.parse(localStorage.getItem(PRINT_SETTINGS_KEY)) || {}; } catch { return {}; }
}

function savePrintSettings() {
  const weekRange = document.getElementById("weekRange").value.trim();
  localStorage.setItem(PRINT_SETTINGS_KEY, JSON.stringify({ weekRange }));
  renderHeader();
}

function getChoreName(state, index) {
  if (!state.chores || state.chores.length === 0 || index < 0) return "No chore";
  const normalized = ((index % state.chores.length) + state.chores.length) % state.chores.length;
  return state.chores[normalized];
}

function normalize(text) {
  return String(text || "").toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}

function residentsForRow(state, row) {
  const aliases = row.aliases.map(normalize);
  return (state.residents || [])
    .filter(r => r.status === "active")
    .filter(r => aliases.some(alias => normalize(getChoreName(state, r.choreIndex)).includes(alias) || alias.includes(normalize(getChoreName(state, r.choreIndex)))))
    .map(r => r.name);
}

function renderHeader() {
  const settings = loadPrintSettings();
  const weekInput = document.getElementById("weekRange");
  if (weekInput && !weekInput.value) weekInput.value = settings.weekRange || "";
  document.getElementById("weekRangeDisplay").textContent = weekInput.value || "MON ____ - SUN ____";
}

function renderPrintSheet() {
  const state = loadState();
  renderHeader();
  const body = document.getElementById("weeklyTemplateBody");
  body.innerHTML = TEMPLATE_ROWS.map(row => {
    const names = residentsForRow(state, row);
    const nameText = names.length ? names.map(escapeHtml).join(" + ") : "________________";
    const title = row.label || row.key.toUpperCase();
    const tasks = row.tasks.length ? row.tasks.join("<br>") : nameText;
    const specialName = row.tasks.length ? `<div class="template-name">${nameText}</div>` : "";
    return `
      <tr>
        <td class="template-left">
          <div class="template-chore">${escapeHtml(title)}</div>
          <div class="template-subtitle">${row.subtitle || ""}</div>
          ${specialName}
        </td>
        <td class="template-tasks">${tasks}</td>
      </tr>`;
  }).join("");
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[char]));
}

renderPrintSheet();
