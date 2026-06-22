let waitlistState = defaultAppState();
let editingApplicantId = null;
let notesApplicantId = null;

async function saveWaitlist() {
  try {
    await saveAppState(waitlistState);
  } catch (error) {
    console.error("Waitlist save failed:", error);
    alert("Could not save waitlist. Check Console for details.");
  }
}

function addWaitlistApplicant() {
  waitlistState.waitlist = Array.isArray(waitlistState.waitlist)
    ? waitlistState.waitlist.filter(item => item && item !== "temp")
    : [];

  const applicant = {
    id: crypto.randomUUID(),
    lastName: document.getElementById("lastName").value.trim(),
    firstName: document.getElementById("firstName").value.trim(),
    contact: document.getElementById("contact").value.trim(),
    status: document.getElementById("status").value.trim(),
    city: document.getElementById("city").value.trim(),
    dateApplied: document.getElementById("dateApplied").value,
    notes: document.getElementById("notes").value.trim(),
    callInHistory: []
  };

  if (!applicant.lastName || !applicant.firstName) {
    alert("Enter at least a first and last name.");
    return;
  }

  waitlistState.waitlist.push(applicant);
  clearWaitlistForm();
  saveWaitlist();
}

function clearWaitlistForm() {
  ["lastName", "firstName", "contact", "status", "city", "dateApplied", "notes"].forEach(id => {
    const input = document.getElementById(id);
    if (input) input.value = "";
  });
}

function startInlineEdit(applicantId) {
  editingApplicantId = applicantId;
  renderWaitlist();
}

function cancelInlineEdit() {
  editingApplicantId = null;
  renderWaitlist();
}

function saveInlineEdit(applicantId) {
  const applicant = waitlistState.waitlist.find(item => item.id === applicantId);
  if (!applicant) return;

  applicant.lastName = document.getElementById(`editLastName-${applicantId}`).value.trim();
  applicant.firstName = document.getElementById(`editFirstName-${applicantId}`).value.trim();
  applicant.contact = document.getElementById(`editContact-${applicantId}`).value.trim();
  applicant.status = document.getElementById(`editStatus-${applicantId}`).value.trim();
  applicant.city = document.getElementById(`editCity-${applicantId}`).value.trim();
  applicant.dateApplied = document.getElementById(`editDateApplied-${applicantId}`).value;

  editingApplicantId = null;
  saveWaitlist();
}

function openNotes(applicantId) {
  const applicant = waitlistState.waitlist.find(item => item.id === applicantId);
  if (!applicant) return;

  notesApplicantId = applicantId;

  document.getElementById("notesText").value = applicant.notes || "";
  document.getElementById("notesModalTitle").textContent =
    `Notes — ${applicant.firstName || ""} ${applicant.lastName || ""}`.trim();

  document.getElementById("notesModal").classList.remove("hidden");
}

function saveNotes() {
  const applicant = waitlistState.waitlist.find(item => item.id === notesApplicantId);
  if (!applicant) return;

  applicant.notes = document.getElementById("notesText").value.trim();

  closeNotesModal();
  saveWaitlist();
}

function closeNotesModal() {
  notesApplicantId = null;
  document.getElementById("notesModal").classList.add("hidden");
}

function callIn(applicantId, result) {
  const index = waitlistState.waitlist.findIndex(item => item.id === applicantId);
  if (index === -1) return;

  const applicant = waitlistState.waitlist[index];

  applicant.callInHistory = applicant.callInHistory || [];
  applicant.callInHistory.unshift({
    result,
    timestamp: new Date().toLocaleString()
  });

  if (result === "No/Late") {
    waitlistState.waitlist.splice(index, 1);
    waitlistState.waitlist.push(applicant);
  }

  saveWaitlist();
}

function deleteApplicant(applicantId) {
  const applicant = waitlistState.waitlist.find(item => item.id === applicantId);
  if (!applicant) return;

  if (!confirm(`Remove ${applicant.firstName} ${applicant.lastName} from the waitlist?`)) return;

  waitlistState.waitlist = waitlistState.waitlist.filter(item => item.id !== applicantId);
  saveWaitlist();
}

function renderWaitlist() {
  const body = document.getElementById("waitlistBody");
  if (!body) return;

  const waitlist = Array.isArray(waitlistState.waitlist)
    ? waitlistState.waitlist.filter(item => item && item !== "temp")
    : [];

  body.innerHTML = waitlist.length
    ? waitlist.map((item, index) => {
        const isEditing = editingApplicantId === item.id;

        const lastCall = item.callInHistory?.[0]
          ? `${item.callInHistory[0].result} — ${item.callInHistory[0].timestamp}`
          : "No call-in recorded";

        if (isEditing) {
          return `
            <tr class="editing-row">
              <td>${index + 1}</td>
              <td><input id="editLastName-${item.id}" value="${escapeAttribute(item.lastName)}" /></td>
              <td><input id="editFirstName-${item.id}" value="${escapeAttribute(item.firstName)}" /></td>
              <td><input id="editContact-${item.id}" value="${escapeAttribute(item.contact)}" /></td>
              <td><input id="editStatus-${item.id}" value="${escapeAttribute(item.status)}" /></td>
              <td><input id="editCity-${item.id}" value="${escapeAttribute(item.city)}" /></td>
              <td><input id="editDateApplied-${item.id}" type="date" value="${escapeAttribute(item.dateApplied)}" /></td>
              <td>
                <span class="empty">Save or cancel edit first</span>
              </td>
              <td>
                <a href="#" onclick="openNotes('${item.id}'); return false;">Add/View Notes</a>
              </td>
              <td>
                <button type="button" class="success" onclick="saveInlineEdit('${item.id}')">Save</button>
                <button type="button" class="secondary" onclick="cancelInlineEdit()">Cancel</button>
              </td>
            </tr>
          `;
        }

        return `
          <tr>
            <td>${index + 1}</td>
            <td>${escapeHtml(item.lastName)}</td>
            <td>${escapeHtml(item.firstName)}</td>
            <td>${escapeHtml(item.contact)}</td>
            <td>${escapeHtml(item.status)}</td>
            <td>${escapeHtml(item.city)}</td>
            <td>${escapeHtml(item.dateApplied)}</td>
            <td>
              <button type="button" class="success" onclick="callIn('${item.id}', 'Yes')">Yes</button>
              <button type="button" class="warning" onclick="callIn('${item.id}', 'No/Late')">No/Late</button>
              <div class="hint">${escapeHtml(lastCall)}</div>
            </td>
            <td>
              <a href="#" onclick="openNotes('${item.id}'); return false;">Add/View Notes</a>
            </td>
            <td>
              <button type="button" class="secondary" onclick="startInlineEdit('${item.id}')">Edit</button>
              <button type="button" class="danger" onclick="deleteApplicant('${item.id}')">Remove</button>
            </td>
          </tr>
        `;
      }).join("")
    : `<tr><td colspan="10" class="empty">No applicants on the waitlist.</td></tr>`;
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
  return String(value || "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[char]));
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("addWaitlistBtn")?.addEventListener("click", addWaitlistApplicant);
  document.getElementById("saveNotesBtn")?.addEventListener("click", saveNotes);
  document.getElementById("cancelNotesBtn")?.addEventListener("click", closeNotesModal);
});

auth.onAuthStateChanged(user => {
  if (!user) return;

  listenToAppState(nextState => {
    waitlistState = nextState;
    waitlistState.waitlist = Array.isArray(waitlistState.waitlist)
      ? waitlistState.waitlist.filter(item => item && item !== "temp")
      : [];

    renderWaitlist();
  });
});
