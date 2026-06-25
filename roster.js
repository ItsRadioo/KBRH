ChatGPT




Resident_Chore_Schedule.xlsx
Spreadsheet
youll see names, that is where the new updated names need to go also create an exception function that prevents a resident from being rotated off a certain chore


Resident_Cooking_Schedule.docx
Document
heres the one for meal chore you should now have both templates

I have the meal chore DOCX now, and I’ll inspect both templates so the printable pages match their structure instead of using the generic table.

Thought for 2m 23s
Got both templates. I wired in template-style print pages.

Download v3 with templates

Added:

House chore print page matching the Excel layout

Meal chore print page matching the DOCX layout

Resident names populate into the print sheets

Locked chore exception stays included

Original templates included in the ZIP for reference






meal chores still doesnt work right

i want it formatted so it looks like this with a fillable date

we are almsot there i dont like the colouring and i cant read the meal lets fix that

its still not populating right see the screenshot




now we need to remove this


Pasted text(8).txt
Document


Pasted text(9).txt
Document
just rewrite the entire code for that file please, here is the full code i have currently



Pasted text(10).txt
Document


Pasted text(11).txt
Document
here you update it i cant find the openNoLateModel



Pasted text(12).txt
Document
heres my waitlsit.js

roster.html

<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Client Roster</title>
  <link rel="stylesheet" href="style.css" />

  <script src="https://www.gstatic.com/firebasejs/10.12.5/firebase-app-compat.js"></script>
  <script src="https://www.gstatic.com/firebasejs/10.12.5/firebase-auth-compat.js"></script>
  <script src="https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore-compat.js"></script>

  <script src="firebase-config.js"></script>
  <script src="auth.js"></script>
  <script src="data-store.js"></script>
  <script>requireLogin();</script>
</head>

<body>
  <header>
    <div>
      <h1>Client Roster</h1>
      <p>Current clients attending the home.</p>
    </div>

    <nav>
      <label class="page-nav-label" for="pageSelect">Go to:</label>
      <select id="pageSelect" class="page-select">
        <option value="waitlist.html">Waitlist</option>
        <option value="index.html">House Chores</option>
        <option value="meal-chores.html">Meal Chores</option>
        <option value="verbalwarning.html">Verbal Warning Log</option>
      </select>
      <button class="logout-btn" onclick="logout()">Logout</button>
    </nav>
  </header>

  <main>
    <section class="card wide">
      <h2>Add Client</h2>

      <div class="form-row">
        <div class="field-group"><label>First Name</label><input id="firstName" type="text" /></div>
        <div class="field-group"><label>Last Name</label><input id="lastName" type="text" /></div>
        <div class="field-group"><label>Client ID</label><input id="clientId" type="text" /></div>
        <div class="field-group"><label>Date of Birth</label><input id="dob" type="date" /></div>
        <div class="field-group"><label>Phone Number</label><input id="phone" type="text" /></div>
        <div class="field-group"><label>Address</label><input id="address" type="text" /></div>
        <div class="field-group"><label>City</label><input id="city" type="text" /></div>
        <div class="field-group"><label>Emergency Contact</label><input id="contact" type="text" /></div>
        <div class="field-group"><label>Emergency Contact Phone</label><input id="contactPhone" type="text" /></div>
        <div class="field-group"><label>Entry Date</label><input id="entryDate" type="date" /></div>
      </div>

      <div class="button-row">
        <button id="addClientBtn" type="button" onclick="addClient()">Add Client</button>
      </div>
    </section>

    <section class="card wide">
      <h2>Phase 1 Clients</h2>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>First Name</th>
              <th>Last Name</th>
              <th>Client ID</th>
              <th>DOB</th>
              <th>Phone</th>
              <th>Address</th>
              <th>City</th>
              <th>Contact</th>
              <th>Contact #</th>
              <th>Entry Date</th>
              <th>Exit Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="rosterBody"></tbody>
        </table>
      </div>
    </section>

    <section class="card wide">
      <h2>Phase 2 Clients</h2>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>First Name</th>
              <th>Last Name</th>
              <th>Client ID</th>
              <th>DOB</th>
              <th>Phone</th>
              <th>Entry Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="phase2RosterBody"></tbody>
        </table>
      </div>
    </section>
  </main>

  <div id="notesModal" class="modal-backdrop hidden">
    <div class="modal-card">
      <h2 id="notesModalTitle">Notes</h2>
      <textarea id="newNoteText" class="notes-box" placeholder="Add a new note..."></textarea>

      <div class="button-row">
        <button id="addNoteBtn" type="button" onclick="addClientNote()">Add Note</button>
        <button id="closeNotesBtn" type="button" class="secondary" onclick="closeNotesModal()">Close</button>
      </div>

      <ul id="notesList" class="list"></ul>
    </div>
  </div>

  <script>
    const pageSelect = document.getElementById("pageSelect");
    pageSelect.value = window.location.pathname.split("/").pop() || "index.html";
    pageSelect.addEventListener("change", () => {
      window.location.href = pageSelect.value;
    });
  </script>

  <script src="roster.js"></script>
</body>
</html>

roster.js

let rosterState = defaultAppState();
let editingClientId = null;
let notesClientId = null;

function getInputValue(id) {
  const input = document.getElementById(id);

  if (!input) {
    alert(Missing input field: ${id});
    throw new Error(Missing input field: ${id});
  }

  return input.value.trim();
}

async function saveRoster() {
  try {
    await saveAppState(rosterState);
  } catch (error) {
    console.error("Roster save failed:", error);
    alert("Could not save roster. Check Console for details.");
  }
}

function addClient() {
  rosterState.roster = Array.isArray(rosterState.roster)
    ? rosterState.roster.filter(client => client && client !== "temp")
    : [];

  const client = {
    id: crypto.randomUUID(),
    firstName: getInputValue("firstName"),
    lastName: getInputValue("lastName"),
    clientId: getInputValue("clientId"),
    dob: getInputValue("dob"),
    phone: getInputValue("phone"),
    address: getInputValue("address"),
    city: getInputValue("city"),
    contact: getInputValue("contact"),
    contactPhone: getInputValue("contactPhone"),
    entryDate: getInputValue("entryDate"),
    phase2AdmissionDate: "",
    phase: "phase1",
    notes: []
  };

  if (!client.firstName || !client.lastName) {
    alert("Enter at least a first and last name.");
    return;
  }

  rosterState.roster.push(client);
  clearClientForm();
  renderRoster();
  saveRoster();
}

function clearClientForm() {
  [
    "firstName",
    "lastName",
    "clientId",
    "dob",
    "phone",
    "address",
    "city",
    "contact",
    "contactPhone",
    "entryDate"
  ].forEach(id => {
    const input = document.getElementById(id);
    if (input) input.value = "";
  });
}

function calculateExitDate(entryDate) {
  if (!entryDate) return "";

  const date = new Date(entryDate + "T00:00:00");
  date.setDate(date.getDate() + 89);

  return date.toISOString().slice(0, 10);
}

function formatDate(value) {
  if (!value) return "";

  const date = new Date(value + "T00:00:00");

  return date.toLocaleDateString("en-CA", {
    year: "numeric",
    month: "short",
    day: "2-digit"
  });
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

function startInlineEdit(clientId) {
  editingClientId = clientId;
  renderRoster();
}

function cancelInlineEdit() {
  editingClientId = null;
  renderRoster();
}

function saveInlineEdit(clientId) {
  const client = rosterState.roster.find(item => item.id === clientId);
  if (!client) return;

  client.firstName = getInputValue(editFirstName-${clientId});
  client.lastName = getInputValue(editLastName-${clientId});
  client.clientId = getInputValue(editClientId-${clientId});
  client.dob = getInputValue(editDob-${clientId});
  client.phone = getInputValue(editPhone-${clientId});

  if ((client.phase || "phase1") === "phase1") {
    client.address = getInputValue(editAddress-${clientId});
    client.city = getInputValue(editCity-${clientId});
    client.contact = getInputValue(editContact-${clientId});
    client.contactPhone = getInputValue(editContactPhone-${clientId});
    client.entryDate = getInputValue(editEntryDate-${clientId});
  } else {
    client.phase2AdmissionDate = getInputValue(editPhase2AdmissionDate-${clientId});
  }

  editingClientId = null;
  renderRoster();
  saveRoster();
}

function moveToPhase(clientId, phase) {
  const client = rosterState.roster.find(item => item.id === clientId);
  if (!client) return;

  client.phase = phase;

  if (phase === "phase2") {
    client.phase2AdmissionDate = new Date().toISOString().slice(0, 10);
  }

  renderRoster();
  saveRoster();
}

function removeClient(clientId) {
  const client = rosterState.roster.find(item => item.id === clientId);
  if (!client) return;

  if (!confirm(Remove ${client.firstName} ${client.lastName} from the roster?)) return;

  rosterState.roster = rosterState.roster.filter(item => item.id !== clientId);
  renderRoster();
  saveRoster();
}

function openNotes(clientId) {
  const client = rosterState.roster.find(item => item.id === clientId);
  if (!client) return;

  notesClientId = clientId;

  document.getElementById("notesModalTitle").textContent =
    Notes — ${client.firstName || ""} ${client.lastName || ""}.trim();

  document.getElementById("newNoteText").value = "";

  renderNotesModal(client);
  document.getElementById("notesModal").classList.remove("hidden");
}

function closeNotesModal() {
  notesClientId = null;
  document.getElementById("notesModal").classList.add("hidden");
}

function addClientNote() {
  const client = rosterState.roster.find(item => item.id === notesClientId);
  if (!client) return;

  const text = getInputValue("newNoteText");

  if (!text) {
    alert("Enter a note first.");
    return;
  }

  client.notes = Array.isArray(client.notes) ? client.notes : [];

  client.notes.unshift({
    id: crypto.randomUUID(),
    text,
    createdAt: new Date().toISOString()
  });

  document.getElementById("newNoteText").value = "";

  renderNotesModal(client);
  renderRoster();
  saveRoster();
}

function deleteClientNote(noteId) {
  const client = rosterState.roster.find(item => item.id === notesClientId);
  if (!client) return;

  if (!confirm("Delete this note?")) return;

  client.notes = Array.isArray(client.notes)
    ? client.notes.filter(note => note.id !== noteId)
    : [];

  renderNotesModal(client);
  renderRoster();
  saveRoster();
}

function renderNotesModal(client) {
  const list = document.getElementById("notesList");
  if (!list) return;

  const notes = Array.isArray(client.notes) ? client.notes : [];

  list.innerHTML = notes.length
    ? notes.map(note => 
        <li class="note-item">
          <div>
            <div>• ${escapeHtml(note.text)}</div>
            <small>${escapeHtml(formatDateTime(note.createdAt))}</small>
          </div>
          <button type="button" class="danger" onclick="deleteClientNote('${note.id}')">Delete</button>
        </li>
      ).join("")
    : <li class="empty">No notes yet.</li>;
}

function renderRoster() {
  renderPhase1Roster();
  renderPhase2Roster();
}

function getPhaseClients(phase) {
  return Array.isArray(rosterState.roster)
    ? rosterState.roster.filter(client =>
        client &&
        client !== "temp" &&
        (client.phase || "phase1") === phase
      )
    : [];
}

function renderPhase1Roster() {
  const body = document.getElementById("rosterBody");
  if (!body) return;

  const roster = getPhaseClients("phase1");

  body.innerHTML = roster.length
    ? roster.map((client, index) => {
        const isEditing = editingClientId === client.id;
        const exitDate = calculateExitDate(client.entryDate);
        const noteCount = Array.isArray(client.notes) ? client.notes.length : 0;

        if (isEditing) {
          return 
            <tr class="editing-row">
              <td>${index + 1}</td>
              <td><input id="editFirstName-${client.id}" value="${escapeAttribute(client.firstName)}" /></td>
              <td><input id="editLastName-${client.id}" value="${escapeAttribute(client.lastName)}" /></td>
              <td><input id="editClientId-${client.id}" value="${escapeAttribute(client.clientId)}" /></td>
              <td><input id="editDob-${client.id}" type="date" value="${escapeAttribute(client.dob)}" /></td>
              <td><input id="editPhone-${client.id}" value="${escapeAttribute(client.phone)}" /></td>
              <td><input id="editAddress-${client.id}" value="${escapeAttribute(client.address)}" /></td>
              <td><input id="editCity-${client.id}" value="${escapeAttribute(client.city)}" /></td>
              <td><input id="editContact-${client.id}" value="${escapeAttribute(client.contact)}" /></td>
              <td><input id="editContactPhone-${client.id}" value="${escapeAttribute(client.contactPhone)}" /></td>
              <td><input id="editEntryDate-${client.id}" type="date" value="${escapeAttribute(client.entryDate)}" /></td>
              <td>${escapeHtml(formatDate(exitDate))}</td>
              <td>
                <button type="button" class="success" onclick="saveInlineEdit('${client.id}')">Save</button>
                <button type="button" class="secondary" onclick="cancelInlineEdit()">Cancel</button>
              </td>
            </tr>
          ;
        }

        return 
          <tr>
            <td>${index + 1}</td>
            <td>${escapeHtml(client.firstName)}</td>
            <td>${escapeHtml(client.lastName)}</td>
            <td>${escapeHtml(client.clientId)}</td>
            <td>${escapeHtml(formatDate(client.dob))}</td>
            <td>${escapeHtml(client.phone)}</td>
            <td>${escapeHtml(client.address)}</td>
            <td>${escapeHtml(client.city)}</td>
            <td>${escapeHtml(client.contact)}</td>
            <td>${escapeHtml(client.contactPhone)}</td>
            <td>${escapeHtml(formatDate(client.entryDate))}</td>
            <td>${escapeHtml(formatDate(exitDate))}</td>
            <td>
              <a href="#" onclick="openNotes('${client.id}'); return false;">Add/View Notes (${noteCount})</a>
              <div class="actions" style="margin-top: 8px;">
                <button type="button" class="secondary" onclick="startInlineEdit('${client.id}')">Edit</button>
                <button type="button" class="success" onclick="moveToPhase('${client.id}', 'phase2')">Move to Phase 2</button>
                <button type="button" class="danger" onclick="removeClient('${client.id}')">Remove</button>
              </div>
            </td>
          </tr>
        ;
      }).join("")
    : <tr><td colspan="13" class="empty">No Phase 1 clients.</td></tr>;
}

function renderPhase2Roster() {
  const body = document.getElementById("phase2RosterBody");
  if (!body) return;

  const roster = getPhaseClients("phase2");

  body.innerHTML = roster.length
    ? roster.map((client, index) => {
        const isEditing = editingClientId === client.id;
        const noteCount = Array.isArray(client.notes) ? client.notes.length : 0;

        if (isEditing) {
          return 
            <tr class="editing-row">
              <td>${index + 1}</td>
              <td><input id="editFirstName-${client.id}" value="${escapeAttribute(client.firstName)}" /></td>
              <td><input id="editLastName-${client.id}" value="${escapeAttribute(client.lastName)}" /></td>
              <td><input id="editClientId-${client.id}" value="${escapeAttribute(client.clientId)}" /></td>
              <td><input id="editDob-${client.id}" type="date" value="${escapeAttribute(client.dob)}" /></td>
              <td><input id="editPhone-${client.id}" value="${escapeAttribute(client.phone)}" /></td>
              <td><input id="editPhase2AdmissionDate-${client.id}" type="date" value="${escapeAttribute(client.phase2AdmissionDate)}" /></td>
              <td>
                <button type="button" class="success" onclick="saveInlineEdit('${client.id}')">Save</button>
                <button type="button" class="secondary" onclick="cancelInlineEdit()">Cancel</button>
              </td>
            </tr>
          ;
        }

        return 
          <tr>
            <td>${index + 1}</td>
            <td>${escapeHtml(client.firstName)}</td>
            <td>${escapeHtml(client.lastName)}</td>
            <td>${escapeHtml(client.clientId)}</td>
            <td>${escapeHtml(formatDate(client.dob))}</td>
            <td>${escapeHtml(client.phone)}</td>
            <td>${escapeHtml(formatDate(client.phase2AdmissionDate))}</td>
            <td>
              <a href="#" onclick="openNotes('${client.id}'); return false;">Add/View Notes (${noteCount})</a>
              <div class="actions" style="margin-top: 8px;">
                <button type="button" class="secondary" onclick="startInlineEdit('${client.id}')">Edit</button>
                <button type="button" class="warning" onclick="moveToPhase('${client.id}', 'phase1')">Move to Phase 1</button>
                <button type="button" class="danger" onclick="removeClient('${client.id}')">Remove</button>
              </div>
            </td>
          </tr>
        ;
      }).join("")
    : <tr><td colspan="8" class="empty">No Phase 2 clients.</td></tr>;
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

auth.onAuthStateChanged(user => {
  if (!user) return;

  listenToAppState(nextState => {
    rosterState = nextState;

    rosterState.roster = Array.isArray(rosterState.roster)
      ? rosterState.roster.filter(client => client && client !== "temp")
      : [];

    rosterState.roster.forEach(client => {
      client.phase = client.phase || "phase1";
      client.notes = Array.isArray(client.notes) ? client.notes : [];
      client.phase2AdmissionDate = client.phase2AdmissionDate || "";
    });

    renderRoster();
  });
});

Thought for 17s
Yes — this needs roster.html, roster.js, and data-store.js updated so roomNumber saves properly. Send me your current data-store.js again and I’ll give you all 3 full replacement files together.


data-store.js

const APP_DOC_REF = () => db.collection("kbrh").doc("choreTracker");

const STANDARD_CHORES = [
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

function defaultAppState() {
  return {
    tableGenerated: false,
    residents: [],
    chores: STANDARD_CHORES,
    history: [],
    mealSchedule: defaultMealSchedule(),
    waitlist: [],
    roster: [],
    verbalWarnings: [],
    updatedAt: new Date().toISOString()
  };
}

function defaultMealSchedule() {
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  return {
    weekSchedule: days.reduce((schedule, day) => {
      schedule[day] = { lunch: "", supper1: "", supper2: "" };
      return schedule;
    }, {}),
    history: []
  };
}

function normalizeNotes(notes) {
  if (Array.isArray(notes)) {
    return notes.map(note => ({
      id: note.id || crypto.randomUUID(),
      text: note.text || "",
      createdAt: note.createdAt || new Date().toISOString()
    }));
  }

  if (notes) {
    return [{
      id: crypto.randomUUID(),
      text: String(notes),
      createdAt: new Date().toISOString()
    }];
  }

  return [];
}

function getWaitlistCallPriority(item) {
  if (item.callPriority) return item.callPriority;

  const last = Array.isArray(item.callInHistory) ? item.callInHistory[0] : null;
  if (!last) return "normal";

  if (last.result === "Yes") return "normal";
  if (last.reason === "Called late") return "late";

  if (
    last.reason === "No call" ||
    last.reason === "Unable to reach" ||
    last.reason === "Wrong number / disconnected"
  ) {
    return "nocall";
  }

  return "late";
}

function normalizeAppState(state) {
  const base = defaultAppState();
  const merged = { ...base, ...(state || {}) };

  merged.chores = Array.isArray(merged.chores) && merged.chores.length
    ? merged.chores
    : STANDARD_CHORES;

  merged.residents = Array.isArray(merged.residents)
    ? merged.residents.map((resident, index) => ({
        id: resident.id || crypto.randomUUID(),
        rosterClientId: resident.rosterClientId || "",
        name: resident.name || Resident ${index + 1},
        choreIndex: Number.isInteger(Number(resident.choreIndex))
          ? Number(resident.choreIndex)
          : 0,
        exceptions: Array.isArray(resident.exceptions) ? resident.exceptions : [],
        lockedChore: resident.lockedChore || "",
        status: resident.status || "active",
        awayUntil: resident.awayUntil || ""
      }))
    : [];

  merged.history = Array.isArray(merged.history) ? merged.history : [];
  merged.mealSchedule = normalizeMealSchedule(merged.mealSchedule);

  merged.waitlist = Array.isArray(merged.waitlist)
    ? merged.waitlist
        .filter(item => item && item !== "temp")
        .map(item => ({
          id: item.id || crypto.randomUUID(),
          lastName: item.lastName || "",
          firstName: item.firstName || "",
          contact: item.contact || "",
          status: item.status || "",
          city: item.city || "",
          dateApplied: item.dateApplied || "",
          archived: item.archived || false,
          archivedAt: item.archivedAt || "",
          archiveReason: item.archiveReason || "",
          callPriority: getWaitlistCallPriority(item),
          notes: normalizeNotes(item.notes),
          callInHistory: Array.isArray(item.callInHistory) ? item.callInHistory : []
        }))
    : [];

  merged.roster = Array.isArray(merged.roster)
    ? merged.roster
        .filter(client => client && client !== "temp")
        .map(client => ({
          id: client.id || crypto.randomUUID(),
          clientId: client.clientId || "",
          firstName: client.firstName || "",
          lastName: client.lastName || "",
          dob: client.dob || "",
          phone: client.phone || "",
          address: client.address || "",
          city: client.city || "",
          contact: client.contact || "",
          contactPhone: client.contactPhone || "",
          entryDate: client.entryDate || "",
          phase: client.phase || "phase1",
          phase2AdmissionDate: client.phase2AdmissionDate || "",
          notes: normalizeNotes(client.notes)
        }))
    : [];

  merged.verbalWarnings = Array.isArray(merged.verbalWarnings)
    ? merged.verbalWarnings
        .filter(warning => warning && warning !== "temp")
        .map(warning => ({
          id: warning.id || crypto.randomUUID(),
          date: warning.date || "",
          time: warning.time || "",
          residentId: warning.residentId || "",
          residentName: warning.residentName || "",
          incident: warning.incident || "",
          staffAction: warning.staffAction || "",
          residentResponse: warning.residentResponse || "",
          staffUser: warning.staffUser || "",
          createdAt: warning.createdAt || new Date().toISOString()
        }))
    : [];

  return merged;
}

function normalizeMealSchedule(mealSchedule) {
  const base = defaultMealSchedule();
  const merged = { ...base, ...(mealSchedule || {}) };

  Object.keys(base.weekSchedule).forEach(day => {
    merged.weekSchedule[day] = {
      lunch: merged.weekSchedule?.[day]?.lunch || "",
      supper1: merged.weekSchedule?.[day]?.supper1 || "",
      supper2: merged.weekSchedule?.[day]?.supper2 || ""
    };
  });

  merged.history = Array.isArray(merged.history) ? merged.history : [];
  return merged;
}

async function loadAppState() {
  const snap = await APP_DOC_REF().get();

  if (!snap.exists) {
    const initial = defaultAppState();
    await saveAppState(initial);
    return initial;
  }

  return normalizeAppState(snap.data());
}

async function saveAppState(state) {
  const cleaned = normalizeAppState(state);
  cleaned.updatedAt = new Date().toISOString();

  await APP_DOC_REF().set(cleaned, { merge: true });
}

function listenToAppState(callback) {
  return APP_DOC_REF().onSnapshot(async snap => {
    if (!snap.exists) {
      const initial = defaultAppState();
      await saveAppState(initial);
      callback(initial);
      return;
    }

    callback(normalizeAppState(snap.data()));
  });
}

function migrateLocalStorageToFirestore() {
  const local = localStorage.getItem("residentChoreRotator.github.v1");

  if (!local) {
    alert("No local backup data found in this browser.");
    return;
  }

  let parsed;

  try {
    parsed = JSON.parse(local);
  } catch {
    alert("Could not read local browser data.");
    return;
  }

  const confirmed = confirm(
    "This will replace the shared online Firestore data with the data saved in this browser. Continue?"
  );

  if (!confirmed) return;

  loadAppState()
    .then(current => {
      const next = normalizeAppState({
        ...current,
        ...parsed,
        mealSchedule: current.mealSchedule || defaultMealSchedule(),
        waitlist: current.waitlist || [],
        roster: current.roster || [],
        verbalWarnings: current.verbalWarnings || []
      });

      return saveAppState(next);
    })
    .then(() => alert("Local browser data migrated to Firestore."))
    .catch(error => {
      console.error(error);
      alert("Migration failed. Check Firebase setup and Firestore permissions.");
    });
}

Replace these three full files.

data-store.js
const APP_DOC_REF = () => db.collection("kbrh").doc("choreTracker");

const STANDARD_CHORES = [
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

function defaultAppState() {
  return {
    tableGenerated: false,
    residents: [],
    chores: STANDARD_CHORES,
    history: [],
    mealSchedule: defaultMealSchedule(),
    waitlist: [],
    roster: [],
    verbalWarnings: [],
    updatedAt: new Date().toISOString()
  };
}

function defaultMealSchedule() {
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  return {
    weekSchedule: days.reduce((schedule, day) => {
      schedule[day] = { lunch: "", supper1: "", supper2: "" };
      return schedule;
    }, {}),
    history: []
  };
}

function normalizeNotes(notes) {
  if (Array.isArray(notes)) {
    return notes.map(note => ({
      id: note.id || crypto.randomUUID(),
      text: note.text || "",
      createdAt: note.createdAt || new Date().toISOString()
    }));
  }

  if (notes) {
    return [{
      id: crypto.randomUUID(),
      text: String(notes),
      createdAt: new Date().toISOString()
    }];
  }

  return [];
}

function getWaitlistCallPriority(item) {
  if (item.callPriority) return item.callPriority;

  const last = Array.isArray(item.callInHistory) ? item.callInHistory[0] : null;
  if (!last) return "normal";

  if (last.result === "Yes") return "normal";
  if (last.reason === "Called late") return "late";

  if (
    last.reason === "No call" ||
    last.reason === "Unable to reach" ||
    last.reason === "Wrong number / disconnected"
  ) {
    return "nocall";
  }

  return "late";
}

function normalizeAppState(state) {
  const base = defaultAppState();
  const merged = { ...base, ...(state || {}) };

  merged.chores = Array.isArray(merged.chores) && merged.chores.length
    ? merged.chores
    : STANDARD_CHORES;

  merged.residents = Array.isArray(merged.residents)
    ? merged.residents.map((resident, index) => ({
        id: resident.id || crypto.randomUUID(),
        rosterClientId: resident.rosterClientId || "",
        name: resident.name || `Resident ${index + 1}`,
        choreIndex: Number.isInteger(Number(resident.choreIndex))
          ? Number(resident.choreIndex)
          : 0,
        exceptions: Array.isArray(resident.exceptions) ? resident.exceptions : [],
        lockedChore: resident.lockedChore || "",
        status: resident.status || "active",
        awayUntil: resident.awayUntil || ""
      }))
    : [];

  merged.history = Array.isArray(merged.history) ? merged.history : [];
  merged.mealSchedule = normalizeMealSchedule(merged.mealSchedule);

  merged.waitlist = Array.isArray(merged.waitlist)
    ? merged.waitlist
        .filter(item => item && item !== "temp")
        .map(item => ({
          id: item.id || crypto.randomUUID(),
          lastName: item.lastName || "",
          firstName: item.firstName || "",
          contact: item.contact || "",
          status: item.status || "",
          city: item.city || "",
          dateApplied: item.dateApplied || "",
          archived: item.archived || false,
          archivedAt: item.archivedAt || "",
          archiveReason: item.archiveReason || "",
          callPriority: getWaitlistCallPriority(item),
          notes: normalizeNotes(item.notes),
          callInHistory: Array.isArray(item.callInHistory) ? item.callInHistory : []
        }))
    : [];

  merged.roster = Array.isArray(merged.roster)
    ? merged.roster
        .filter(client => client && client !== "temp")
        .map(client => ({
          id: client.id || crypto.randomUUID(),
          roomNumber: client.roomNumber || "",
          clientId: client.clientId || "",
          firstName: client.firstName || "",
          lastName: client.lastName || "",
          dob: client.dob || "",
          phone: client.phone || "",
          address: client.address || "",
          city: client.city || "",
          contact: client.contact || "",
          contactPhone: client.contactPhone || "",
          entryDate: client.entryDate || "",
          phase: client.phase || "phase1",
          phase2AdmissionDate: client.phase2AdmissionDate || "",
          notes: normalizeNotes(client.notes)
        }))
    : [];

  merged.verbalWarnings = Array.isArray(merged.verbalWarnings)
    ? merged.verbalWarnings
        .filter(warning => warning && warning !== "temp")
        .map(warning => ({
          id: warning.id || crypto.randomUUID(),
          date: warning.date || "",
          time: warning.time || "",
          residentId: warning.residentId || "",
          residentName: warning.residentName || "",
          incident: warning.incident || "",
          staffAction: warning.staffAction || "",
          residentResponse: warning.residentResponse || "",
          staffUser: warning.staffUser || "",
          createdAt: warning.createdAt || new Date().toISOString()
        }))
    : [];

  return merged;
}

function normalizeMealSchedule(mealSchedule) {
  const base = defaultMealSchedule();
  const merged = { ...base, ...(mealSchedule || {}) };

  Object.keys(base.weekSchedule).forEach(day => {
    merged.weekSchedule[day] = {
      lunch: merged.weekSchedule?.[day]?.lunch || "",
      supper1: merged.weekSchedule?.[day]?.supper1 || "",
      supper2: merged.weekSchedule?.[day]?.supper2 || ""
    };
  });

  merged.history = Array.isArray(merged.history) ? merged.history : [];
  return merged;
}

async function loadAppState() {
  const snap = await APP_DOC_REF().get();

  if (!snap.exists) {
    const initial = defaultAppState();
    await saveAppState(initial);
    return initial;
  }

  return normalizeAppState(snap.data());
}

async function saveAppState(state) {
  const cleaned = normalizeAppState(state);
  cleaned.updatedAt = new Date().toISOString();

  await APP_DOC_REF().set(cleaned, { merge: true });
}

function listenToAppState(callback) {
  return APP_DOC_REF().onSnapshot(async snap => {
    if (!snap.exists) {
      const initial = defaultAppState();
      await saveAppState(initial);
      callback(initial);
      return;
    }

    callback(normalizeAppState(snap.data()));
  });
}

function migrateLocalStorageToFirestore() {
  const local = localStorage.getItem("residentChoreRotator.github.v1");

  if (!local) {
    alert("No local backup data found in this browser.");
    return;
  }

  let parsed;

  try {
    parsed = JSON.parse(local);
  } catch {
    alert("Could not read local browser data.");
    return;
  }

  const confirmed = confirm(
    "This will replace the shared online Firestore data with the data saved in this browser. Continue?"
  );

  if (!confirmed) return;

  loadAppState()
    .then(current => {
      const next = normalizeAppState({
        ...current,
        ...parsed,
        mealSchedule: current.mealSchedule || defaultMealSchedule(),
        waitlist: current.waitlist || [],
        roster: current.roster || [],
        verbalWarnings: current.verbalWarnings || []
      });

      return saveAppState(next);
    })
    .then(() => alert("Local browser data migrated to Firestore."))
    .catch(error => {
      console.error(error);
      alert("Migration failed. Check Firebase setup and Firestore permissions.");
    });
}
roster.html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Client Roster</title>
  <link rel="stylesheet" href="style.css" />

  <script src="https://www.gstatic.com/firebasejs/10.12.5/firebase-app-compat.js"></script>
  <script src="https://www.gstatic.com/firebasejs/10.12.5/firebase-auth-compat.js"></script>
  <script src="https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore-compat.js"></script>

  <script src="firebase-config.js"></script>
  <script src="auth.js"></script>
  <script src="data-store.js"></script>
  <script>requireLogin();</script>
</head>

<body>
  <header>
    <div>
      <h1>Client Roster</h1>
      <p>Current clients attending the home.</p>
    </div>

    <nav>
      <label class="page-nav-label" for="pageSelect">Go to:</label>
      <select id="pageSelect" class="page-select">
        <option value="waitlist.html">Waitlist</option>
        <option value="roster.html">Current Roster</option>
        <option value="index.html">House Chores</option>
        <option value="meal-chores.html">Meal Chores</option>
        <option value="verbalwarning.html">Verbal Warning Log</option>
      </select>
      <button class="logout-btn" onclick="logout()">Logout</button>
    </nav>
  </header>

  <main>
    <section class="card wide">
      <h2>Add Client</h2>

      <div class="form-row">
        <div class="field-group"><label>Room Number</label><input id="roomNumber" type="text" /></div>
        <div class="field-group"><label>First Name</label><input id="firstName" type="text" /></div>
        <div class="field-group"><label>Last Name</label><input id="lastName" type="text" /></div>
        <div class="field-group"><label>Client ID</label><input id="clientId" type="text" /></div>
        <div class="field-group"><label>Date of Birth</label><input id="dob" type="date" /></div>
        <div class="field-group"><label>Phone Number</label><input id="phone" type="text" /></div>
        <div class="field-group"><label>Address</label><input id="address" type="text" /></div>
        <div class="field-group"><label>City</label><input id="city" type="text" /></div>
        <div class="field-group"><label>Emergency Contact</label><input id="contact" type="text" /></div>
        <div class="field-group"><label>Emergency Contact Phone</label><input id="contactPhone" type="text" /></div>
        <div class="field-group"><label>Entry Date</label><input id="entryDate" type="date" /></div>
      </div>

      <div class="button-row">
        <button id="addClientBtn" type="button" onclick="addClient()">Add Client</button>
      </div>
    </section>

    <section class="card wide">
      <h2>Phase 1 Clients</h2>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Room #</th>
              <th>First Name</th>
              <th>Last Name</th>
              <th>Client ID</th>
              <th>DOB</th>
              <th>Phone</th>
              <th>Address</th>
              <th>City</th>
              <th>Contact</th>
              <th>Contact #</th>
              <th>Entry Date</th>
              <th>Exit Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="rosterBody"></tbody>
        </table>
      </div>
    </section>

    <section class="card wide">
      <h2>Phase 2 Clients</h2>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Room #</th>
              <th>First Name</th>
              <th>Last Name</th>
              <th>Client ID</th>
              <th>DOB</th>
              <th>Phone</th>
              <th>Entry Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="phase2RosterBody"></tbody>
        </table>
      </div>
    </section>
  </main>

  <div id="notesModal" class="modal-backdrop hidden">
    <div class="modal-card">
      <h2 id="notesModalTitle">Notes</h2>
      <textarea id="newNoteText" class="notes-box" placeholder="Add a new note..."></textarea>

      <div class="button-row">
        <button id="addNoteBtn" type="button" onclick="addClientNote()">Add Note</button>
        <button id="closeNotesBtn" type="button" class="secondary" onclick="closeNotesModal()">Close</button>
      </div>

      <ul id="notesList" class="list"></ul>
    </div>
  </div>

  <script>
    const pageSelect = document.getElementById("pageSelect");
    pageSelect.value = window.location.pathname.split("/").pop() || "roster.html";
    pageSelect.addEventListener("change", () => {
      window.location.href = pageSelect.value;
    });
  </script>

  <script src="roster.js"></script>
</body>
</html>
roster.js
let rosterState = defaultAppState();
let editingClientId = null;
let notesClientId = null;

function getInputValue(id) {
  const input = document.getElementById(id);

  if (!input) {
    alert(`Missing input field: ${id}`);
    throw new Error(`Missing input field: ${id}`);
  }

  return input.value.trim();
}

async function saveRoster() {
  try {
    await saveAppState(rosterState);
  } catch (error) {
    console.error("Roster save failed:", error);
    alert("Could not save roster. Check Console for details.");
  }
}

function addClient() {
  rosterState.roster = Array.isArray(rosterState.roster)
    ? rosterState.roster.filter(client => client && client !== "temp")
    : [];

  const client = {
    id: crypto.randomUUID(),
    roomNumber: getInputValue("roomNumber"),
    firstName: getInputValue("firstName"),
    lastName: getInputValue("lastName"),
    clientId: getInputValue("clientId"),
    dob: getInputValue("dob"),
    phone: getInputValue("phone"),
    address: getInputValue("address"),
    city: getInputValue("city"),
    contact: getInputValue("contact"),
    contactPhone: getInputValue("contactPhone"),
    entryDate: getInputValue("entryDate"),
    phase2AdmissionDate: "",
    phase: "phase1",
    notes: []
  };

  if (!client.firstName || !client.lastName) {
    alert("Enter at least a first and last name.");
    return;
  }

  rosterState.roster.push(client);
  clearClientForm();
  renderRoster();
  saveRoster();
}

function clearClientForm() {
  [
    "roomNumber",
    "firstName",
    "lastName",
    "clientId",
    "dob",
    "phone",
    "address",
    "city",
    "contact",
    "contactPhone",
    "entryDate"
  ].forEach(id => {
    const input = document.getElementById(id);
    if (input) input.value = "";
  });
}

function calculateExitDate(entryDate) {
  if (!entryDate) return "";

  const date = new Date(entryDate + "T00:00:00");
  date.setDate(date.getDate() + 89);

  return date.toISOString().slice(0, 10);
}

function formatDate(value) {
  if (!value) return "";

  const date = new Date(value + "T00:00:00");

  return date.toLocaleDateString("en-CA", {
    year: "numeric",
    month: "short",
    day: "2-digit"
  });
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

function startInlineEdit(clientId) {
  editingClientId = clientId;
  renderRoster();
}

function cancelInlineEdit() {
  editingClientId = null;
  renderRoster();
}

function saveInlineEdit(clientId) {
  const client = rosterState.roster.find(item => item.id === clientId);
  if (!client) return;

  client.roomNumber = getInputValue(`editRoomNumber-${clientId}`);
  client.firstName = getInputValue(`editFirstName-${clientId}`);
  client.lastName = getInputValue(`editLastName-${clientId}`);
  client.clientId = getInputValue(`editClientId-${clientId}`);
  client.dob = getInputValue(`editDob-${clientId}`);
  client.phone = getInputValue(`editPhone-${clientId}`);

  if ((client.phase || "phase1") === "phase1") {
    client.address = getInputValue(`editAddress-${clientId}`);
    client.city = getInputValue(`editCity-${clientId}`);
    client.contact = getInputValue(`editContact-${clientId}`);
    client.contactPhone = getInputValue(`editContactPhone-${clientId}`);
    client.entryDate = getInputValue(`editEntryDate-${clientId}`);
  } else {
    client.phase2AdmissionDate = getInputValue(`editPhase2AdmissionDate-${clientId}`);
  }

  editingClientId = null;
  renderRoster();
  saveRoster();
}

function moveToPhase(clientId, phase) {
  const client = rosterState.roster.find(item => item.id === clientId);
  if (!client) return;

  client.phase = phase;

  if (phase === "phase2") {
    client.phase2AdmissionDate = new Date().toISOString().slice(0, 10);
  }

  renderRoster();
  saveRoster();
}

function removeClient(clientId) {
  const client = rosterState.roster.find(item => item.id === clientId);
  if (!client) return;

  if (!confirm(`Remove ${client.firstName} ${client.lastName} from the roster?`)) return;

  rosterState.roster = rosterState.roster.filter(item => item.id !== clientId);
  renderRoster();
  saveRoster();
}

function openNotes(clientId) {
  const client = rosterState.roster.find(item => item.id === clientId);
  if (!client) return;

  notesClientId = clientId;

  document.getElementById("notesModalTitle").textContent =
    `Notes — ${client.firstName || ""} ${client.lastName || ""}`.trim();

  document.getElementById("newNoteText").value = "";

  renderNotesModal(client);
  document.getElementById("notesModal").classList.remove("hidden");
}

function closeNotesModal() {
  notesClientId = null;
  document.getElementById("notesModal").classList.add("hidden");
}

function addClientNote() {
  const client = rosterState.roster.find(item => item.id === notesClientId);
  if (!client) return;

  const text = getInputValue("newNoteText");

  if (!text) {
    alert("Enter a note first.");
    return;
  }

  client.notes = Array.isArray(client.notes) ? client.notes : [];

  client.notes.unshift({
    id: crypto.randomUUID(),
    text,
    createdAt: new Date().toISOString()
  });

  document.getElementById("newNoteText").value = "";

  renderNotesModal(client);
  renderRoster();
  saveRoster();
}

function deleteClientNote(noteId) {
  const client = rosterState.roster.find(item => item.id === notesClientId);
  if (!client) return;

  if (!confirm("Delete this note?")) return;

  client.notes = Array.isArray(client.notes)
    ? client.notes.filter(note => note.id !== noteId)
    : [];

  renderNotesModal(client);
  renderRoster();
  saveRoster();
}

function renderNotesModal(client) {
  const list = document.getElementById("notesList");
  if (!list) return;

  const notes = Array.isArray(client.notes) ? client.notes : [];

  list.innerHTML = notes.length
    ? notes.map(note => `
        <li class="note-item">
          <div>
            <div>• ${escapeHtml(note.text)}</div>
            <small>${escapeHtml(formatDateTime(note.createdAt))}</small>
          </div>
          <button type="button" class="danger" onclick="deleteClientNote('${note.id}')">Delete</button>
        </li>
      `).join("")
    : `<li class="empty">No notes yet.</li>`;
}

function renderRoster() {
  renderPhase1Roster();
  renderPhase2Roster();
}

function getPhaseClients(phase) {
  return Array.isArray(rosterState.roster)
    ? rosterState.roster.filter(client =>
        client &&
        client !== "temp" &&
        (client.phase || "phase1") === phase
      )
    : [];
}

function renderPhase1Roster() {
  const body = document.getElementById("rosterBody");
  if (!body) return;

  const roster = getPhaseClients("phase1");

  body.innerHTML = roster.length
    ? roster.map(client => {
        const isEditing = editingClientId === client.id;
        const exitDate = calculateExitDate(client.entryDate);
        const noteCount = Array.isArray(client.notes) ? client.notes.length : 0;

        if (isEditing) {
          return `
            <tr class="editing-row">
              <td><input id="editRoomNumber-${client.id}" value="${escapeAttribute(client.roomNumber)}" /></td>
              <td><input id="editFirstName-${client.id}" value="${escapeAttribute(client.firstName)}" /></td>
              <td><input id="editLastName-${client.id}" value="${escapeAttribute(client.lastName)}" /></td>
              <td><input id="editClientId-${client.id}" value="${escapeAttribute(client.clientId)}" /></td>
              <td><input id="editDob-${client.id}" type="date" value="${escapeAttribute(client.dob)}" /></td>
              <td><input id="editPhone-${client.id}" value="${escapeAttribute(client.phone)}" /></td>
              <td><input id="editAddress-${client.id}" value="${escapeAttribute(client.address)}" /></td>
              <td><input id="editCity-${client.id}" value="${escapeAttribute(client.city)}" /></td>
              <td><input id="editContact-${client.id}" value="${escapeAttribute(client.contact)}" /></td>
              <td><input id="editContactPhone-${client.id}" value="${escapeAttribute(client.contactPhone)}" /></td>
              <td><input id="editEntryDate-${client.id}" type="date" value="${escapeAttribute(client.entryDate)}" /></td>
              <td>${escapeHtml(formatDate(exitDate))}</td>
              <td>
                <button type="button" class="success" onclick="saveInlineEdit('${client.id}')">Save</button>
                <button type="button" class="secondary" onclick="cancelInlineEdit()">Cancel</button>
              </td>
            </tr>
          `;
        }

        return `
          <tr>
            <td>${escapeHtml(client.roomNumber)}</td>
            <td>${escapeHtml(client.firstName)}</td>
            <td>${escapeHtml(client.lastName)}</td>
            <td>${escapeHtml(client.clientId)}</td>
            <td>${escapeHtml(formatDate(client.dob))}</td>
            <td>${escapeHtml(client.phone)}</td>
            <td>${escapeHtml(client.address)}</td>
            <td>${escapeHtml(client.city)}</td>
            <td>${escapeHtml(client.contact)}</td>
            <td>${escapeHtml(client.contactPhone)}</td>
            <td>${escapeHtml(formatDate(client.entryDate))}</td>
            <td>${escapeHtml(formatDate(exitDate))}</td>
            <td>
              <a href="#" onclick="openNotes('${client.id}'); return false;">Add/View Notes (${noteCount})</a>
              <div class="actions" style="margin-top: 8px;">
                <button type="button" class="secondary" onclick="startInlineEdit('${client.id}')">Edit</button>
                <button type="button" class="success" onclick="moveToPhase('${client.id}', 'phase2')">Move to Phase 2</button>
                <button type="button" class="danger" onclick="removeClient('${client.id}')">Remove</button>
              </div>
            </td>
          </tr>
        `;
      }).join("")
    : `<tr><td colspan="13" class="empty">No Phase 1 clients.</td></tr>`;
}

function renderPhase2Roster() {
  const body = document.getElementById("phase2RosterBody");
  if (!body) return;

  const roster = getPhaseClients("phase2");

  body.innerHTML = roster.length
    ? roster.map(client => {
        const isEditing = editingClientId === client.id;
        const noteCount = Array.isArray(client.notes) ? client.notes.length : 0;

        if (isEditing) {
          return `
            <tr class="editing-row">
              <td><input id="editRoomNumber-${client.id}" value="${escapeAttribute(client.roomNumber)}" /></td>
              <td><input id="editFirstName-${client.id}" value="${escapeAttribute(client.firstName)}" /></td>
              <td><input id="editLastName-${client.id}" value="${escapeAttribute(client.lastName)}" /></td>
              <td><input id="editClientId-${client.id}" value="${escapeAttribute(client.clientId)}" /></td>
              <td><input id="editDob-${client.id}" type="date" value="${escapeAttribute(client.dob)}" /></td>
              <td><input id="editPhone-${client.id}" value="${escapeAttribute(client.phone)}" /></td>
              <td><input id="editPhase2AdmissionDate-${client.id}" type="date" value="${escapeAttribute(client.phase2AdmissionDate)}" /></td>
              <td>
                <button type="button" class="success" onclick="saveInlineEdit('${client.id}')">Save</button>
                <button type="button" class="secondary" onclick="cancelInlineEdit()">Cancel</button>
              </td>
            </tr>
          `;
        }

        return `
          <tr>
            <td>${escapeHtml(client.roomNumber)}</td>
            <td>${escapeHtml(client.firstName)}</td>
            <td>${escapeHtml(client.lastName)}</td>
            <td>${escapeHtml(client.clientId)}</td>
            <td>${escapeHtml(formatDate(client.dob))}</td>
            <td>${escapeHtml(client.phone)}</td>
            <td>${escapeHtml(formatDate(client.phase2AdmissionDate))}</td>
            <td>
              <a href="#" onclick="openNotes('${client.id}'); return false;">Add/View Notes (${noteCount})</a>
              <div class="actions" style="margin-top: 8px;">
                <button type="button" class="secondary" onclick="startInlineEdit('${client.id}')">Edit</button>
                <button type="button" class="warning" onclick="moveToPhase('${client.id}', 'phase1')">Move to Phase 1</button>
                <button type="button" class="danger" onclick="removeClient('${client.id}')">Remove</button>
              </div>
            </td>
          </tr>
        `;
      }).join("")
    : `<tr><td colspan="8" class="empty">No Phase 2 clients.</td></tr>`;
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

auth.onAuthStateChanged(user => {
  if (!user) return;

  listenToAppState(nextState => {
    rosterState = nextState;

    rosterState.roster = Array.isArray(rosterState.roster)
      ? rosterState.roster.filter(client => client && client !== "temp")
      : [];

    rosterState.roster.forEach(client => {
      client.roomNumber = client.roomNumber || "";
      client.phase = client.phase || "phase1";
      client.notes = Array.isArray(client.notes) ? client.notes : [];
      client.phase2AdmissionDate = client.phase2AdmissionDate || "";
    });

    renderRoster();
  });
});

