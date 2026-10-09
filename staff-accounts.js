const KBRH_MANAGED_PAGES = {"assignment-board.html": "Resident Assignment Board", "audit-log.html": "Audit Log", "bus-pass.html": "Bus Pass", "charts.html": "Charts", "chore-checks.html": "Chore Checks", "counseling-notes.html": "Counseling Notes", "digital-logbook.html": "Digital Logbook", "house-chores.html": "House Chores", "incident-report.html": "Incident Report", "index.html": "Dashboard", "meal-chores.html": "Meal Chores", "pending-admissions.html": "Pending Admissions", "prescreening.html": "Prescreening", "reports.html": "Reports", "roster.html": "Roster", "settings.html": "Settings", "staff-accounts.html": "Staff Accounts", "staff-list.html": "Staff List", "staff-profile.html": "Staff Profile", "tool-signout.html": "Tool Signout", "verbalwarning.html": "Verbalwarning", "waitlist.html": "Waitlist", "weekend-menu-builder.html": "Weekend Menu Builder", "writeups.html": "Writeups"};
function drawPageAccess(id, selected) {
  const el=document.getElementById(id); if(!el)return;
  const set=new Set(Array.isArray(selected)?selected:Object.keys(KBRH_MANAGED_PAGES));
  el.innerHTML=Object.entries(KBRH_MANAGED_PAGES).map(([path,label])=>
    `<label><input type="checkbox" value="${path}" ${set.has(path)?"checked":""}>${label}</label>`).join("");
}
function selectedPageAccess(id){return [...document.querySelectorAll(`#${id} input:checked`)].map(x=>x.value);}
async function savePageAccess(uid, pages){
  if(!isKbrhAccountManager(auth.currentUser))throw new Error("Administrator access required.");
  await db.collection("kbrh").doc("staffProfiles").update({[`profiles.${uid}.pageAccess`]:pages});
}
const functions = firebase.app().functions("northamerica-northeast1");
const call = name => functions.httpsCallable(name);
let staffAccounts = [];

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[char]));
}

function generateTempPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  const random = new Uint32Array(16);
  crypto.getRandomValues(random);
  return Array.from(random, number => chars[number % chars.length]).join("");
}

async function assertManager() {
  await new Promise(resolve => auth.currentUser ? resolve() : auth.onAuthStateChanged(() => resolve()));
  if (!isKbrhAccountManager(auth.currentUser)) {
    location.replace("index.html");
    return false;
  }
  return true;
}

function setServiceState(state, message) {
  const badge = document.getElementById("accountServiceBadge");
  badge.className = `account-service-badge ${state}`;
  badge.textContent = message;
}

function friendlyServiceError(error) {
  const code = String(error?.code || "");
  if (code.includes("not-found") || code.includes("internal")) {
    return "Account service is not active yet. Deploy this release's Firebase Functions once; after that, staff accounts are managed here.";
  }
  if (code.includes("permission-denied")) return "Your account is not authorized to manage staff accounts.";
  if (code.includes("unavailable")) return "Account service is temporarily unavailable. Check your connection and try Refresh.";
  return error?.message || "The account service could not be reached.";
}

function renderAccounts() {
  const body = document.getElementById("accountsBody");
  if (!staffAccounts.length) {
    body.innerHTML = '<tr><td colspan="6" class="account-empty">No staff accounts found.</td></tr>';
    return;
  }

  body.innerHTML = staffAccounts.map(account => `
    <tr>
      <td><strong>${esc(account.name || "—")}</strong></td>
      <td>${esc(account.email)}</td>
      <td>${esc(account.position || "—")}</td>
      <td><span class="account-status ${account.disabled ? "disabled" : "active"}">${account.disabled ? "Disabled" : "Active"}</span></td>
      <td>${account.mustChangePassword ? '<span class="account-first-login">Password change required</span>' : "Complete"}</td>
      <td>
        <div class="account-row-actions">
          <button type="button" class="secondary" onclick="openAccountEdit('${esc(account.uid)}')">Edit</button>
          <button type="button" onclick="setEnabled('${esc(account.uid)}', ${account.disabled})">${account.disabled ? "Enable" : "Disable"}</button>
          <button type="button" class="secondary" onclick="resetPassword('${esc(account.email)}')">Reset Password</button>
        </div>
      </td>
    </tr>
  `).join("");
}

async function loadAccounts() {
  if (!(await assertManager())) return;

  const body = document.getElementById("accountsBody");
  body.innerHTML = '<tr><td colspan="6">Loading staff accounts…</td></tr>';
  setServiceState("checking", "Checking account service…");

  try {
    const result = await call("listStaffAccounts")({});
    staffAccounts = result.data.accounts || [];
    setServiceState("online", "Account service online");
    renderAccounts();
  } catch (error) {
    console.error(error);
    setServiceState("offline", "Account service unavailable");
    body.innerHTML = `<tr><td colspan="6" class="account-service-error">${esc(friendlyServiceError(error))}</td></tr>`;
  }
}

async function setEnabled(uid, enable) {
  const account = staffAccounts.find(item => item.uid === uid);
  if (!confirm(`${enable ? "Enable" : "Disable"} ${account?.name || account?.email || "this staff account"}?`)) return;

  try {
    await call("setStaffAccountEnabled")({ uid, enabled: enable });
    await loadAccounts();
  } catch (error) {
    alert(friendlyServiceError(error));
  }
}

async function resetPassword(email) {
  if (!confirm(`Generate a password-reset link for ${email}?`)) return;

  try {
    const result = await call("sendStaffPasswordReset")({ email });
    const link = result.data?.resetLink || "";
    if (!link) return alert("The account service did not return a reset link.");
    prompt("Copy this secure password-reset link and send it to the staff member:", link);
  } catch (error) {
    alert(friendlyServiceError(error));
  }
}

function openAccountEdit(uid) {
  const account = staffAccounts.find(item => item.uid === uid);
  if (!account) return;

  document.getElementById("editAccountUid").value = account.uid;
  document.getElementById("editAccountName").value = account.name || "";
  document.getElementById("editAccountEmail").value = account.email || "";
  document.getElementById("editAccountPosition").value = account.position || "";
  document.getElementById("editAccountStatus").textContent = "";

  drawPageAccess("editPageAccess", account.pageAccess);
  const modal = document.getElementById("accountEditModal");
  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");
}

function closeAccountEdit() {
  const modal = document.getElementById("accountEditModal");
  modal.classList.add("hidden");
  modal.setAttribute("aria-hidden", "true");
}

async function saveAccountEdit() {
  const uid = document.getElementById("editAccountUid").value;
  const name = document.getElementById("editAccountName").value.trim();
  const email = document.getElementById("editAccountEmail").value.trim();
  const position = document.getElementById("editAccountPosition").value.trim();
  const status = document.getElementById("editAccountStatus");

  if (!uid || !name || !email) {
    status.textContent = "Name and email are required.";
    return;
  }

  status.textContent = "Saving…";
  try {
    await call("updateStaffAccount")({ uid, name, email, position });
    await savePageAccess(uid, selectedPageAccess("editPageAccess"));
    status.textContent = "Account updated.";
    await loadAccounts();
    setTimeout(closeAccountEdit, 350);
  } catch (error) {
    console.error(error);
    status.textContent = friendlyServiceError(error);
  }
}

document.getElementById("generatePassword").onclick = () => {
  document.getElementById("acctPassword").value = generateTempPassword();
};

document.getElementById("createAccount").onclick = async () => {
  const name = document.getElementById("acctName").value.trim();
  const email = document.getElementById("acctEmail").value.trim();
  const position = document.getElementById("acctPosition").value.trim();
  const temporaryPassword = document.getElementById("acctPassword").value;
  const status = document.getElementById("accountStatus");

  if (!name || !email || !temporaryPassword) {
    status.textContent = "Name, email and temporary password are required.";
    return;
  }

  status.textContent = "Creating account…";
  try {
    const created = await call("createStaffAccount")({ name, email, position, temporaryPassword });
    const uid = created.data?.uid || created.data?.user?.uid;
    if (!uid) throw new Error("Account created, but the service did not return a user ID. Refresh and set page permissions through Edit.");
    await savePageAccess(uid, selectedPageAccess("createPageAccess"));
    status.textContent = "Account created. Give the temporary password to the staff member securely.";
    ["acctName", "acctEmail", "acctPosition", "acctPassword"].forEach(id => {
      document.getElementById(id).value = "";
    });
    await loadAccounts();
  } catch (error) {
    console.error(error);
    status.textContent = friendlyServiceError(error);
  }
};

document.getElementById("refreshAccounts").onclick = loadAccounts;
document.getElementById("saveAccountEdit").onclick = saveAccountEdit;
document.getElementById("closeAccountEdit").onclick = closeAccountEdit;
document.getElementById("cancelAccountEdit").onclick = closeAccountEdit;
document.getElementById("accountEditModal").addEventListener("mousedown", event => {
  if (event.target.id === "accountEditModal") closeAccountEdit();
});

auth.onAuthStateChanged(user => {
  if (user) loadAccounts();
});

drawPageAccess("createPageAccess");
