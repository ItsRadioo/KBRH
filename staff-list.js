let staffDirectoryEntries = [];

function staffListEscape(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
}

function normalizePhone(value) {
  return String(value || "").trim();
}

function phoneHref(value) {
  const cleaned = String(value || "").replace(/[^+\d]/g, "");
  return cleaned ? `tel:${cleaned}` : "";
}

function collectStaffProfiles(root) {
  const found = [];
  const seen = new Set();
  const isObject = value => value && typeof value === "object" && !Array.isArray(value);

  function walk(node, key = "", depth = 0) {
    if (!isObject(node) || depth > 8) return;

    const looksLikeProfile = ("name" in node || "email" in node) && ("role" in node || "active" in node || "primaryPhone" in node || "phone" in node);
    if (looksLikeProfile) {
      const email = String(node.email || "").trim().toLowerCase();
      const name = String(node.name || "").trim();
      const identityKey = email || `${key}:${name}`;
      if (!seen.has(identityKey)) {
        seen.add(identityKey);
        found.push({
          uid: key,
          name,
          email: String(node.email || "").trim(),
          role: String(node.role || node.position || "").trim(),
          primaryPhone: normalizePhone(node.primaryPhone || node.phone || node.primary_phone || ""),
          active: node.active !== false
        });
      }
      return;
    }

    for (const [childKey, child] of Object.entries(node)) walk(child, childKey, depth + 1);
  }

  walk(root);
  return found.filter(person => person.active && person.name).sort((a,b) => a.name.localeCompare(b.name, "en", { sensitivity:"base" }));
}

function renderStaffDirectory() {
  const tbody = document.getElementById("staffListBody");
  const query = (document.getElementById("staffListSearch")?.value || "").trim().toLowerCase();
  const rows = staffDirectoryEntries.filter(person => !query || [person.name, person.primaryPhone, person.role].join(" ").toLowerCase().includes(query));

  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="2">No matching active staff members.</td></tr>';
    return;
  }

  tbody.innerHTML = rows.map(person => {
    const href = phoneHref(person.primaryPhone);
    const phone = person.primaryPhone
      ? (href ? `<a class="staff-phone-link" href="${staffListEscape(href)}">${staffListEscape(person.primaryPhone)}</a>` : staffListEscape(person.primaryPhone))
      : '<span class="hint">Not listed</span>';
    return `<tr><td><strong>${staffListEscape(person.name)}</strong>${person.role ? `<div class="hint">${staffListEscape(person.role)}</div>` : ""}</td><td>${phone}</td></tr>`;
  }).join("");
}

async function loadStaffDirectory() {
  const status = document.getElementById("staffListStatus");
  const tbody = document.getElementById("staffListBody");
  if (status) status.textContent = "";
  if (tbody) tbody.innerHTML = '<tr><td colspan="2">Loading staff directory…</td></tr>';

  try {
    const snapshot = await db.collection("kbrh").doc("staffProfiles").get();
    if (!snapshot.exists) {
      staffDirectoryEntries = [];
      renderStaffDirectory();
      if (status) status.textContent = "The kbrh/staffProfiles document does not exist yet.";
      return;
    }

    staffDirectoryEntries = collectStaffProfiles(snapshot.data() || {});
    renderStaffDirectory();
    if (status) status.textContent = `${staffDirectoryEntries.length} active staff member${staffDirectoryEntries.length === 1 ? "" : "s"} listed.`;
  } catch (error) {
    console.error("Could not load staff directory", error);
    staffDirectoryEntries = [];
    if (tbody) tbody.innerHTML = '<tr><td colspan="2">Staff directory could not be loaded.</td></tr>';
    if (status) status.textContent = "Could not read kbrh/staffProfiles. Confirm your Firestore rules allow authenticated users to read that document.";
  }
}

document.getElementById("staffListSearch")?.addEventListener("input", renderStaffDirectory);
document.getElementById("refreshStaffListBtn")?.addEventListener("click", loadStaffDirectory);
auth.onAuthStateChanged(user => { if (user) loadStaffDirectory(); });
