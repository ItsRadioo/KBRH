const TEMPLATE_FILE = "Resident_Chore_Schedule.xlsx";
const STORAGE_KEY_FOR_TEMPLATE = "residentChoreRotator.github.v1";

const CHORE_CELL_MAP = {
  "Bathroom": "B3",
  "Upper floors": "B4",
  "Main Floor (morning)": "B5",
  "Main Floor (Night)": "B6",
  "Basement": "B7",
  "Morning dishes": "B9",
  "Resident Fridge": "B10",
  "General Disinfecting": "B11",
  "Special Projects": "B12"
};

async function loadTemplateState() {
  if (typeof loadAppState === "function") {
    return await loadAppState();
  }

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
  return chores[normalizeIndex(choreIndex, chores.length)];
}

function buildAssignmentMap(state) {
  const assignments = new Map();

  (state.residents || [])
    .filter(resident => resident.status === "active")
    .forEach(resident => {
      const chore = getChoreNameFromState(state, resident.choreIndex);
      if (!chore) return;

      if (!assignments.has(chore)) assignments.set(chore, []);
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
    vertical: "middle",
    horizontal: "center"
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
    const nameText = names.length ? names.join(" + ").toUpperCase() : "N/A";

    setCellPreserveStyle(sheet, address, nameText);
  }

  const outsideNames = assignments.get("Outside Yardwork") || [];
  const outsideCell = sheet.getCell("B8");

  outsideCell.value =
    outsideNames.length
      ? `( ${outsideNames.map(name => name.toUpperCase()).join("  +  ")} )\n\n` +
        `Mow Lawn: Front, Back, Side of the home\n` +
        `Sweep: Front Porch, Ramp, Back Steps, Fire Escape, Smoking Section\n` +
        `Rake: Front Lawn, Back Yard\n\n` +
        `Recycle: Put out Grey Recycle Bins & Yard Waste per Schedule on Dining Room Info Board\n` +
        `Smoking Section: Empty Garbage Can & Cigarette Butt Can Regularly`
      : `N/A\n\n` +
        `Mow Lawn: Front, Back, Side of the home\n` +
        `Sweep: Front Porch, Ramp, Back Steps, Fire Escape, Smoking Section\n` +
        `Rake: Front Lawn, Back Yard\n\n` +
        `Recycle: Put out Grey Recycle Bins & Yard Waste per Schedule on Dining Room Info Board\n` +
        `Smoking Section: Empty Garbage Can & Cigarette Butt Can Regularly`;

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

  const state = await loadTemplateState();

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
