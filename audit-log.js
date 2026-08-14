let auditEntries = [];
let auditUnsubscribe = null;

function auditFormatDate(entry) {
  const raw = entry?.timestamp?.toDate ? entry.timestamp.toDate() : new Date(entry.timestampIso || "");
  if (!raw || Number.isNaN(raw.getTime())) return "";
  return raw.toLocaleString("en-CA", { year:"numeric", month:"short", day:"numeric", hour:"numeric", minute:"2-digit" });
}

function auditEscape(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
}

function auditPageLabel(page) {
  const labels = {
    "roster.html":"Roster", "waitlist.html":"Waitlist", "index.html":"House Chores",
    "meal-chores.html":"Meal Chores", "verbalwarning.html":"Warnings", "writeups.html":"Write-Ups",
    "chore-checks.html":"Chore Checks", "incident-report.html":"Incident Reports", "charts.html":"Charts",
    "prescreening.html":"Pre-Screening", "counseling-notes.html":"Counseling Notes"
  };
  return labels[page] || page || "System";
}

function renderAuditLog() {
  const tbody = document.getElementById("auditBody");
  const q = (document.getElementById("auditSearch")?.value || "").trim().toLowerCase();
  const rows = auditEntries.filter(entry => {
    if (!q) return true;
    return [entry.staffName, entry.staffEmail, entry.page, entry.summary, ...(entry.changes || [])]
      .join(" ").toLowerCase().includes(q);
  });
  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="4">No matching audit records.</td></tr>';
    return;
  }
  tbody.innerHTML = rows.map(entry => `
    <tr>
      <td>${auditEscape(auditFormatDate(entry))}</td>
      <td><strong>${auditEscape(entry.staffName || "Staff User")}</strong><br><span class="hint">${auditEscape(entry.staffEmail || "")}</span></td>
      <td>${auditEscape(auditPageLabel(entry.page))}</td>
      <td>${(entry.changes || [entry.summary || "Updated application data"]).map(change => `<div>${auditEscape(change)}</div>`).join("")}</td>
    </tr>`).join("");
}

function subscribeAuditLog() {
  if (auditUnsubscribe) auditUnsubscribe();
  auditUnsubscribe = db.collection("kbrhAudit").orderBy("timestamp", "desc").limit(500).onSnapshot(snapshot => {
    auditEntries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderAuditLog();
  }, error => {
    console.error(error);
    document.getElementById("auditBody").innerHTML = '<tr><td colspan="4">Audit log could not be loaded. Deploy the included Firestore rules so authenticated users can access the kbrhAudit collection.</td></tr>';
  });
}

document.getElementById("auditSearch")?.addEventListener("input", renderAuditLog);
document.getElementById("refreshAuditBtn")?.addEventListener("click", subscribeAuditLog);
auth.onAuthStateChanged(user => { if (user) subscribeAuditLog(); });
