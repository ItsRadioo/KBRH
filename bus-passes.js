let busPassState = null;
let busPassEntries = [];

function bpEscape(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
}

function localIsoDate() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
}

function monthKey(dateString) { return String(dateString || "").slice(0, 7); }

function openBusPassModal() {
  document.getElementById("busPassForm").reset();
  document.getElementById("busPassDate").value = localIsoDate();
  document.getElementById("busPassCount").value = "2";
  document.getElementById("busPassTripType").value = "Round trip";
  document.getElementById("busPassStaff").value = currentStaffName();
  document.getElementById("busPassFormStatus").textContent = "";
  document.getElementById("busPassModal").classList.remove("hidden");
  document.getElementById("busPassRecipient").focus();
}

function closeBusPassModal() { document.getElementById("busPassModal").classList.add("hidden"); }

function residentName(client) { return `${client.firstName || ""} ${client.lastName || ""}`.trim(); }

function populateResidentDatalist(state) {
  const list = document.getElementById("busPassResidentOptions");
  const residents = (state.roster || []).filter(r => !r.archived).map(residentName).filter(Boolean).sort((a,b)=>a.localeCompare(b));
  list.innerHTML = residents.map(name => `<option value="${bpEscape(name)}"></option>`).join("");
}

function filteredBusPasses() {
  const q = document.getElementById("busPassSearch").value.trim().toLowerCase();
  const month = document.getElementById("busPassMonthFilter").value;
  const trip = document.getElementById("busPassTripFilter").value;
  return busPassEntries.filter(entry => {
    if (month && monthKey(entry.dateIssued) !== month) return false;
    if (trip && entry.tripType !== trip) return false;
    if (!q) return true;
    return [entry.recipientName, entry.destinationPurpose, entry.tripType, entry.staffName, entry.notes]
      .join(" ").toLowerCase().includes(q);
  });
}

function renderBusPasses() {
  const tbody = document.getElementById("busPassBody");
  const rows = filteredBusPasses();
  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No bus pass records match the current filters.</td></tr>';
  } else {
    tbody.innerHTML = rows.map(entry => `
      <tr>
        <td>${bpEscape(entry.dateIssued)}</td>
        <td><strong>${bpEscape(entry.recipientName)}</strong></td>
        <td>${bpEscape(entry.destinationPurpose)}</td>
        <td>${bpEscape(entry.passesIssued)}</td>
        <td>${bpEscape(entry.tripType)}</td>
        <td>${bpEscape(entry.staffName || "Staff User")}</td>
        <td>${bpEscape(entry.notes || "")}</td>
      </tr>`).join("");
  }
  document.getElementById("busPassRecordCount").textContent = `${rows.length} record${rows.length === 1 ? "" : "s"} shown.`;

  const currentMonth = monthKey(localIsoDate());
  const thisMonth = busPassEntries.filter(e => monthKey(e.dateIssued) === currentMonth);
  document.getElementById("passesThisMonth").textContent = String(thisMonth.reduce((n,e)=>n+(Number(e.passesIssued)||0),0));
  document.getElementById("tripsThisMonth").textContent = String(thisMonth.length);
  document.getElementById("passesAllTime").textContent = String(busPassEntries.reduce((n,e)=>n+(Number(e.passesIssued)||0),0));
}

async function submitBusPass(event) {
  event.preventDefault();
  if (!busPassState) return;
  const status = document.getElementById("busPassFormStatus");
  const submitButton = event.submitter;
  const recipientName = document.getElementById("busPassRecipient").value.trim();
  const destinationPurpose = document.getElementById("busPassDestination").value.trim();
  const passesIssued = Number.parseInt(document.getElementById("busPassCount").value, 10);
  if (!recipientName || !destinationPurpose || !Number.isInteger(passesIssued) || passesIssued < 1) {
    status.textContent = "Complete the required fields before saving.";
    return;
  }
  submitButton.disabled = true;
  status.textContent = "Saving…";
  try {
    const identity = await getCurrentStaffIdentity();
    const rosterMatch = (busPassState.roster || []).find(r => residentName(r).toLowerCase() === recipientName.toLowerCase());
    const record = {
      id: crypto.randomUUID(),
      dateIssued: document.getElementById("busPassDate").value,
      residentId: rosterMatch?.id || "",
      recipientName,
      destinationPurpose,
      passesIssued,
      tripType: document.getElementById("busPassTripType").value,
      staffName: identity.name,
      staffUid: identity.uid,
      staffEmail: identity.email,
      notes: document.getElementById("busPassNotes").value.trim(),
      createdAt: new Date().toISOString()
    };
    busPassState.busPasses = [record, ...(busPassState.busPasses || [])];
    await saveAppState(busPassState);
    closeBusPassModal();
  } catch (error) {
    console.error(error);
    status.textContent = "The bus pass record could not be saved. Please try again.";
  } finally {
    submitButton.disabled = false;
  }
}

function exportBusPassCsv() {
  const rows = filteredBusPasses();
  const headers = ["Date Issued","Resident / Recipient","Destination / Purpose","Passes Issued","Trip Type","Issued By","Staff Email","Notes"];
  const quote = value => `"${String(value ?? "").replace(/"/g,'""')}"`;
  const lines = [headers.map(quote).join(",")].concat(rows.map(e => [e.dateIssued,e.recipientName,e.destinationPurpose,e.passesIssued,e.tripType,e.staffName,e.staffEmail,e.notes].map(quote).join(",")));
  const blob = new Blob(["\uFEFF" + lines.join("\r\n")], {type:"text/csv;charset=utf-8"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `KBRH_Bus_Pass_Log_${localIsoDate()}.csv`;
  document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}

function initializeBusPassPage() {
  document.getElementById("busPassDate").value = localIsoDate();
  document.getElementById("busPassStaff").value = currentStaffName();
  window.addEventListener("kbrhStaffProfileReady", () => { document.getElementById("busPassStaff").value = currentStaffName(); });
  listenToAppState(state => {
    busPassState = state;
    busPassEntries = [...(state.busPasses || [])].sort((a,b) => String(b.dateIssued).localeCompare(String(a.dateIssued)) || String(b.createdAt).localeCompare(String(a.createdAt)));
    populateResidentDatalist(state);
    renderBusPasses();
  });
}

document.getElementById("openBusPassModalBtn").addEventListener("click", openBusPassModal);
document.getElementById("closeBusPassModalX").addEventListener("click", closeBusPassModal);
document.getElementById("cancelBusPassModalBtn").addEventListener("click", closeBusPassModal);
document.getElementById("busPassForm").addEventListener("submit", submitBusPass);
document.getElementById("busPassSearch").addEventListener("input", renderBusPasses);
document.getElementById("busPassMonthFilter").addEventListener("change", renderBusPasses);
document.getElementById("busPassTripFilter").addEventListener("change", renderBusPasses);
document.getElementById("clearBusPassFiltersBtn").addEventListener("click", () => {
  document.getElementById("busPassSearch").value = "";
  document.getElementById("busPassMonthFilter").value = "";
  document.getElementById("busPassTripFilter").value = "";
  renderBusPasses();
});
document.getElementById("exportBusPassCsvBtn").addEventListener("click", exportBusPassCsv);
document.getElementById("busPassModal").addEventListener("click", e => { if (e.target.id === "busPassModal") closeBusPassModal(); });
auth.onAuthStateChanged(user => { if (user) initializeBusPassPage(); });
