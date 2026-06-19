let waitlistState = defaultAppState();

function saveWaitlist() {
  saveAppState(waitlistState);
}

function addWaitlistApplicant() {
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

  waitlistState.waitlist = Array.isArray(waitlistState.waitlist)
  ? waitlistState.waitlist.filter(item => item && item !== "temp")
  : [];

waitlistState.waitlist.push(applicant);
  clearWaitlistForm();
  saveWaitlist();
}

function clearWaitlistForm() {
  ["lastName", "firstName", "contact", "status", "city", "dateApplied", "notes"].forEach(id => {
    document.getElementById(id).value = "";
  });
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

function editApplicant(applicantId) {
  const applicant = waitlistState.waitlist.find(item => item.id === applicantId);
  if (!applicant) return;

  const lastName = prompt("Last name:", applicant.lastName);
  if (lastName === null) return;

  const firstName = prompt("First name:", applicant.firstName);
  if (firstName === null) return;

  const contact = prompt("Contact:", applicant.contact);
  if (contact === null) return;

  const status = prompt("Status:", applicant.status);
  if (status === null) return;

  const city = prompt("City:", applicant.city);
  if (city === null) return;

  const dateApplied = prompt("Date applied YYYY-MM-DD:", applicant.dateApplied);
  if (dateApplied === null) return;

  const notes = prompt("Notes:", applicant.notes);
  if (notes === null) return;

  applicant.lastName = lastName.trim();
  applicant.firstName = firstName.trim();
  applicant.contact = contact.trim();
  applicant.status = status.trim();
  applicant.city = city.trim();
  applicant.dateApplied = dateApplied.trim();
  applicant.notes = notes.trim();

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

  const waitlist = waitlistState.waitlist || [];

  body.innerHTML = waitlist.length
    ? waitlist.map((item, index) => {
        const lastCall = item.callInHistory?.[0]
          ? `${item.callInHistory[0].result} — ${item.callInHistory[0].timestamp}`
          : "No call-in recorded";

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
            <td>${escapeHtml(item.notes)}</td>
            <td>
              <button type="button" class="secondary" onclick="editApplicant('${item.id}')">Edit</button>
              <button type="button" class="danger" onclick="deleteApplicant('${item.id}')">Delete</button>
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

document.getElementById("addWaitlistBtn").addEventListener("click", addWaitlistApplicant);

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
