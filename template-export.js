const TEMPLATE_FILE = "Resident_Chore_Schedule.xlsx";
const STORAGE_KEY_FOR_TEMPLATE = "residentChoreRotator.github.v1";

const CHORE_CELL_MAP = {
  "Bathroom": "A3",
  "Upper floors": "A4",
  "Main Floor (morning)": "A5",
  "Main Floor (Night)": "A6",
  "Basement": "A7",
  "Morning dishes": "A9",
  "Resident Fridge": "A10",
  "General Disinfecting": "A11",
  "Special Projects": "A12"
};

const STANDARD_CHORE_LABELS_IN_TEMPLATE = {
  "Bathroom": "WASHROOMS\n(2ND / 3RD FLOOR + STAFF)\n(Complete by 9 AM)",
  "Upper floors": "UPSTAIRS FLOORS",
  "Main Floor (morning)": "MAIN FLOOR\n(MORNING)",
  "Main Floor (Night)": "MAIN FLOOR\n(NIGHT)",
  "Basement": "BASEMENT",
  "Morning dishes": "MORNING DISHES",
  "Resident Fridge": "RESIDENT FRIDGE\n(Complete Friday)",
  "General Disinfecting": "GENERAL DISINFECTING",
  "Special Projects": "SPECIAL PROJECTS"
};

function loadTemplateState() {
  const saved = localStorage.getItem(STORAGE_KEY_FOR_TEMPLATE);
  if (!saved) return { residents: [], chores: [] };

  try {
    return JSON.parse(saved);
  } catch {
    return { residents: [], chores: [] };
  }
}

function normalizeIndex(index, length) {
  if (!length) return -1;
  return ((index % length) + length) % length;
}

function getChoreNameFromState(state, choreIndex) {
  const chores = state.chores || [];
  if (!chores.length || choreIndex < 0) return "";

  const normalized = ((choreIndex % chores.length) + chores.length) % chores.length;
  return chores[normalized];
}

function buildAssignmentMap(state) {
  const assignments = new Map();

  (state.residents || [])
    .filter(resident => resident.status === "active")
    .forEach(resident => {
      const chore = getChoreNameFromState(state, resident.choreIndex);

      if (!chore) return;

      if (!assignments.has(chore)) {
        assignments.set(chore, []);
      }

      assignments.get(chore).push(resident.name);
    });

  return assignments;
}

function setCellPreserveStyle(sheet, address, value) {
  const cell = sheet.getCell(address);
  cell.value = value;
  cell.alignment = {
    ...cell.alignment,
    wrapText: true,
    vertical: "middle"
  };
}

function formatExcelDateLabel(value) {
  if (!value) return "";
  const date = new Date(value + "T00:00:00");
  return date.toLocaleDateString("en-CA", {
    weekday: "short",
    month: "short",
    day: "2-digit"
  }).toUpperCase();
}

function updateTemplateHeader(sheet) {
  const startInput = document.getElementById("startDate");
  const endInput = document.getElementById("endDate");

  const start = startInput ? startInput.value : "";
  const end = endInput ? endInput.value : "";

  if (!start && !end) return;

  const dateLine = `${formatExcelDateLabel(start)} - ${formatExcelDateLabel(end)}`;
  const header =
    `Weekly Chore Schedule\n${dateLine}\n` +
    `Morning chores must be completed by 8:30 AM on Weekdays -11 AM on Weekends + Holidays\n` +
    `*9:00 AM for Washroom Chore*\n` +
    `Replacements must be pre-approved by Staff`;

  setCellPreserveStyle(sheet, "B1", header);
}

function applyAssignmentsToTemplate(sheet, state) {
  const assignments = buildAssignmentMap(state);

  for (const [chore, address] of Object.entries(CHORE_CELL_MAP)) {
    const names = assignments.get(chore) || [];
    const nameText = names.join(" + ");
    const label = STANDARD_CHORE_LABELS_IN_TEMPLATE[chore] || chore.toUpperCase();

    setCellPreserveStyle(sheet, address, nameText ? `${label}\n\n${nameText.toUpperCase()}` : label);
  }

  const outsideNames = assignments.get("Outside Yardwork") || [];
  const outsideCell = sheet.getCell("B8");

  if (outsideNames.length) {
    outsideCell.value =
      `( ${outsideNames.map(name => name.toUpperCase()).join("  +  ")} )\n\n` +
      `Mow Lawn: Front, Back, Side of the home\n` +
      `Sweep: Front Porch, Ramp, Back Steps, Fire Escape, Smoking Section\n` +
      `Rake: Front Lawn, Back Yard\n\n` +
      `Recycle: Put out Grey Recycle Bins & Yard Waste per Schedule on Dining Room Info Board\n` +
      `Smoking Section: Empty Garbage Can & Cigarette Butt Can Regularly`;
  }

  outsideCell.alignment = {
    ...outsideCell.alignment,
    wrapText: true,
    vertical: "middle"
  };
}

async function downloadFilledExcelTemplate() {
  if (!window.ExcelJS) {
    alert("Excel export library did not load. Check your internet connection and try again.");
    return;
  }

  const state = loadTemplateState();

  const response = await fetch(TEMPLATE_FILE);
  if (!response.ok) {
    alert("Could not find Resident_Chore_Schedule.xlsx. Make sure it is uploaded to the same folder as index.html.");
    return;
  }

  const arrayBuffer = await response.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(arrayBuffer);

  const sheetName = document.getElementById("seasonSelect")?.value || "Spring+Summer";
  const sheet = workbook.getWorksheet(sheetName) || workbook.getWorksheet("Spring+Summer") || workbook.worksheets[0];

  updateTemplateHeader(sheet);
  applyAssignmentsToTemplate(sheet, state);

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  });

  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "Filled_Resident_Chore_Schedule.xlsx";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(link.href);
}

document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("downloadFilledTemplateBtn");
  if (btn) {
    btn.addEventListener("click", downloadFilledExcelTemplate);
  }
});
