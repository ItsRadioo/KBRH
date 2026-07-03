let counselingState = defaultAppState();
let counselingSearchTerm = "";

function getInputValue(id) {
  const input = document.getElementById(id);

  if (!input) {
    alert(`Missing input field: ${id}`);
    throw new Error(`Missing input field: ${id}`);
  }

  return input.value.trim();
}

function formatDateTime(value) {
  if (!value) return "";

  const date = new Date(value);

  return date.toLocaleString("en-CA", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit"
  });
}

async function saveCounselingNotes() {
  try {
    await saveAppState(counselingState);
  } catch (error) {
    console.error("Counseling notes save failed:", error);
    alert("Could not save counseling notes. Check Console for details.");
  }
}

function getRosterResidents(mode = "active") {
  const roster = Array.isArray(counselingState.roster)
    ? counselingState.roster.filter(client => client && client !== "temp")
    : [];

  return roster
    .filter(client => {
      const archived = !!client.archived;

      if (mode === "active") return !archived;
      if (mode === "archived") return archived;
      return true;
    })
    .sort((a, b) => {
      const aName = `${a.lastName || ""}, ${a.firstName || ""}`.toLowerCase();
      const bName = `${b.lastName || ""}, ${b.firstName || ""}`.toLowerCase();
      return aName.localeCompare(bName);
    });
}

function getResidentDisplayName(client) {
  const name = `${client.firstName || ""} ${client.lastName || ""}`.trim();
  return name || "Unnamed Resident";
}

function populateResidentDropdowns() {
  const mode = document.getElementById("showArchivedResidents")?.value || "active";
  const entrySelect = document.getElementById("residentSelect");
  const filterSelect = document.getElementById("noteFilterResident");

  if (!entrySelect || !filterSelect) return;

  const entryResidents = getRosterResidents(mode);
  const allResidents = getRosterResidents("all");

  const currentEntryValue = entrySelect.value;
  const currentFilterValue = filterSelect.value;

  entrySelect.innerHTML = `<option value="">Select resident...</option>` + entryResidents.map(client => {
    const recordType = client.archived ? "Archived" : "Active";
    const displayName = getResidentDisplayName(client);

    return `
      <option value="${escapeAttribute(client.id)}">
        ${escapeHtml(displayName)} — ${recordType}
      </option>
    `;
  }).join("");

  filterSelect.innerHTML = `<option value="">All residents</option>` + allResidents.map(client => {
    const recordType = client.archived ? "Archived" : "Active";
    const displayName = getResidentDisplayName(client);

    return `
      <option value="${escapeAttribute(client.id)}">
        ${escapeHtml(displayName)} — ${recordType}
      </option>
    `;
  }).join("");

  if ([...entrySelect.options].some(option => option.value === currentEntryValue)) {
    entrySelect.value = currentEntryValue;
  }

  if ([...filterSelect.options].some(option => option.value === currentFilterValue)) {
    filterSelect.value = currentFilterValue;
  }
}

function addCounselingNote() {
  const residentId = getInputValue("residentSelect");
  const author = getInputValue("staffName");
  const note = getInputValue("counselingNoteText");

  if (!residentId) {
    alert("Select a resident.");
    return;
  }

  if (!author) {
    alert("Enter the staff member name.");
    return;
  }

  if (!note) {
    alert("Enter a counseling note.");
    return;
  }

  const resident = getRosterResidents("all").find(client => client.id === residentId);

  if (!resident) {
    alert("Could not find selected resident.");
    return;
  }

  counselingState.counselingNotes = Array.isArray(counselingState.counselingNotes)
    ? counselingState.counselingNotes
    : [];

  counselingState.counselingNotes.unshift({
    id: crypto.randomUUID(),
    residentId: resident.id,
    residentName: getResidentDisplayName(resident),
    author,
    note,
    archivedResident: !!resident.archived,
    createdAt: new Date().toISOString()
  });

  document.getElementById("counselingNoteText").value = "";

  renderCounselingNotes();
  saveCounselingNotes();
}

function clearCounselingForm() {
  const residentSelect = document.getElementById("residentSelect");
  const staffName = document.getElementById("staffName");
  const counselingNoteText = document.getElementById("counselingNoteText");

  if (residentSelect) residentSelect.value = "";
  if (staffName) staffName.value = "";
  if (counselingNoteText) counselingNoteText.value = "";
}

function deleteCounselingNote(noteId) {
  const note = counselingState.counselingNotes?.find(item => item.id === noteId);
  if (!note) return;

  if (!confirm(`Delete this counseling note for ${note.residentName || "this resident"}?`)) return;

  counselingState.counselingNotes = counselingState.counselingNotes.filter(item => item.id !== noteId);

  renderCounselingNotes();
  saveCounselingNotes();
}

function getFilteredCounselingNotes() {
  const notes = Array.isArray(counselingState.counselingNotes)
    ? counselingState.counselingNotes
    : [];

  const selectedResidentId = document.getElementById("noteFilterResident")?.value || "";
  const searchTerm = counselingSearchTerm.toLowerCase().trim();

  return notes
    .filter(note => {
      if (selectedResidentId && note.residentId !== selectedResidentId) return false;

      if (!searchTerm) return true;

      const haystack = [
        note.residentName,
        note.author,
        note.note,
        note.archivedResident ? "archived" : "active"
      ].join(" ").toLowerCase();

      return haystack.includes(searchTerm);
    })
    .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
}

function renderCounselingNotes() {
  const body = document.getElementById("counselingNotesBody");
  if (!body) return;

  const notes = getFilteredCounselingNotes();

  body.innerHTML = notes.length
    ? notes.map(note => {
        const recordType = note.archivedResident ? "Archived" : "Active";

        return `
          <tr>
            <td>${escapeHtml(formatDateTime(note.createdAt))}</td>
            <td>${escapeHtml(note.residentName || "Unknown Resident")}</td>
            <td>${escapeHtml(note.author || "Unknown")}</td>
            <td>${escapeHtml(note.note || "")}</td>
            <td><span class="status ${note.archivedResident ? "archived" : "active"}">${recordType}</span></td>
            <td>
              <button type="button" class="danger" onclick="deleteCounselingNote('${note.id}')">Delete</button>
            </td>
          </tr>
        `;
      }).join("")
    : `<tr><td colspan="6" class="empty">No counseling notes found.</td></tr>`;
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

function escapeAttribute(value) {
  return escapeHtml(value);
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("addCounselingNoteBtn")?.addEventListener("click", addCounselingNote);
  document.getElementById("clearCounselingFormBtn")?.addEventListener("click", clearCounselingForm);

  document.getElementById("showArchivedResidents")?.addEventListener("change", () => {
    populateResidentDropdowns();
  });

  document.getElementById("noteFilterResident")?.addEventListener("change", () => {
    renderCounselingNotes();
  });

  document.getElementById("noteSearch")?.addEventListener("input", event => {
    counselingSearchTerm = event.target.value || "";
    renderCounselingNotes();
  });
});

auth.onAuthStateChanged(user => {
  if (!user) return;

  listenToAppState(nextState => {
    counselingState = nextState;

    counselingState.roster = Array.isArray(counselingState.roster)
      ? counselingState.roster.filter(client => client && client !== "temp")
      : [];

    counselingState.counselingNotes = Array.isArray(counselingState.counselingNotes)
      ? counselingState.counselingNotes.filter(note => note && note !== "temp").map(note => ({
          id: note.id || crypto.randomUUID(),
          residentId: note.residentId || "",
          residentName: note.residentName || "Unknown Resident",
          author: note.author || "Unknown",
          note: note.note || "",
          archivedResident: note.archivedResident || false,
          createdAt: note.createdAt || new Date().toISOString()
        }))
      : [];

    populateResidentDropdowns();
    renderCounselingNotes();
  });
});
