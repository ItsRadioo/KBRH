/*
  KBRH UI Upgrade
  Load this file AFTER script.js, waitlist.js, or roster.js.
*/
(() => {
  "use strict";

  const MODAL_ID = "kbrhEditModal";
  const OUTDOOR_CHORE_NAME = "Outside Yardwork";
  let waitlistSearchTerm = "";
  let currentModalType = "";
  let currentRecordId = "";

  const byId = id => document.getElementById(id);
  const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));

  function fieldHtml({ id, label, value = "", type = "text", required = false, full = false }) {
    return `<label class="kbrh-modal-field ${full ? "kbrh-modal-field-full" : ""}">
      <span>${esc(label)}${required ? '<strong class="kbrh-required-mark"> *</strong>' : ""}</span>
      <input id="${esc(id)}" type="${esc(type)}" value="${esc(value)}" data-label="${esc(label)}" data-required="${required ? "true" : "false"}" autocomplete="off">
    </label>`;
  }

  function checkboxHtml({ id, label, checked = false, full = false }) {
    return `<label class="kbrh-modal-check ${full ? "kbrh-modal-field-full" : ""}">
      <input id="${esc(id)}" type="checkbox" ${checked ? "checked" : ""} data-label="${esc(label)}" data-required="false">
      <span>${esc(label)}</span>
    </label>`;
  }

  function ensureModal() {
    if (byId(MODAL_ID)) return;
    const modal = document.createElement("div");
    modal.id = MODAL_ID;
    modal.className = "kbrh-modal-backdrop hidden";
    modal.innerHTML = `<section class="kbrh-edit-modal" role="dialog" aria-modal="true" aria-labelledby="kbrhEditModalTitle">
      <header class="kbrh-edit-modal-header">
        <div><h2 id="kbrhEditModalTitle">Edit Record</h2><p id="kbrhEditModalSubtitle"></p></div>
        <button type="button" class="secondary kbrh-modal-close" aria-label="Close">×</button>
      </header>
      <div id="kbrhEditModalMessage" class="kbrh-modal-message hidden"></div>
      <form id="kbrhEditModalForm" novalidate>
        <div id="kbrhEditModalFields" class="kbrh-modal-grid"></div>
        <footer class="kbrh-edit-modal-footer">
          <button type="button" class="secondary" id="kbrhModalCancelBtn">Cancel</button>
          <button type="submit" class="success" id="kbrhModalSaveBtn">Save Changes</button>
        </footer>
      </form>
    </section>`;
    document.body.appendChild(modal);
    modal.querySelector(".kbrh-modal-close").addEventListener("click", closeModal);
    byId("kbrhModalCancelBtn").addEventListener("click", closeModal);
    byId("kbrhEditModalForm").addEventListener("submit", handleModalSubmit);
    modal.addEventListener("mousedown", e => { if (e.target === modal) closeModal(); });
    document.addEventListener("keydown", e => { if (e.key === "Escape" && !modal.classList.contains("hidden")) closeModal(); });
  }

  function openModal(type, recordId, title, subtitle, fieldsHtml) {
    ensureModal();
    currentModalType = type;
    currentRecordId = recordId;
    byId("kbrhEditModalTitle").textContent = title;
    byId("kbrhEditModalSubtitle").textContent = subtitle || "";
    byId("kbrhEditModalFields").innerHTML = fieldsHtml;
    byId("kbrhEditModalMessage").className = "kbrh-modal-message hidden";
    byId("kbrhEditModalMessage").textContent = "";
    const modal = byId(MODAL_ID);
    modal.classList.remove("hidden");
    document.body.classList.add("kbrh-modal-open");
    modal.querySelectorAll("input, select").forEach(input => {
      input.addEventListener("input", () => {
        if (String(input.value || "").trim()) input.classList.remove("kbrh-required-missing", "kbrh-optional-missing");
      });
      input.addEventListener("change", () => input.classList.remove("kbrh-required-missing", "kbrh-optional-missing"));
    });
    modal.querySelector("input")?.focus();
  }

  function closeModal() {
    byId(MODAL_ID)?.classList.add("hidden");
    document.body.classList.remove("kbrh-modal-open");
    currentModalType = "";
    currentRecordId = "";
  }

  function value(id) { return String(byId(id)?.value || "").trim(); }

  function validateModal() {
    const requiredMissing = [];
    const optionalMissing = [];
    byId(MODAL_ID)?.querySelectorAll("[data-label]").forEach(input => {
      input.classList.remove("kbrh-required-missing", "kbrh-optional-missing");
      if (input.type === "checkbox" || input.disabled || input.dataset.ignoreEmpty === "true") return;
      if (String(input.value || "").trim()) return;
      const label = input.dataset.label || "Unnamed field";
      if (input.dataset.required === "true") {
        requiredMissing.push(label);
        input.classList.add("kbrh-required-missing");
      } else {
        optionalMissing.push(label);
        input.classList.add("kbrh-optional-missing");
      }
    });
    return { requiredMissing, optionalMissing };
  }

  function showMessage(message, type) {
    const box = byId("kbrhEditModalMessage");
    box.textContent = message;
    box.className = `kbrh-modal-message kbrh-modal-message-${type}`;
  }

  function handleModalSubmit(event) {
    event.preventDefault();
    const { requiredMissing, optionalMissing } = validateModal();
    if (requiredMissing.length) {
      showMessage(`This record cannot be saved. Complete: ${requiredMissing.join(", ")}.`, "error");
      byId(MODAL_ID)?.querySelector(".kbrh-required-missing")?.focus();
      return;
    }
    if (optionalMissing.length) {
      showMessage(`Optional information is blank: ${optionalMissing.join(", ")}.`, "warning");
      if (!confirm(`The following optional fields are blank:\n\n${optionalMissing.join("\n")}\n\nSelect OK to save anyway, or Cancel to return to the form.`)) return;
    }
    if (currentModalType === "waitlist") saveWaitlistModal();
    if (currentModalType === "roster") saveRosterModal();
  }

  function installWaitlistSearch() {
    const body = byId("waitlistBody");
    if (!body || byId("waitlistSearch")) return;
    const table = body.closest("table");
    if (!table) return;
    const bar = document.createElement("div");
    bar.className = "kbrh-search-row";
    bar.innerHTML = `<label class="kbrh-search-field"><span>Search Waitlist</span><input id="waitlistSearch" type="search" placeholder="Search by name, contact, status, city, or date" autocomplete="off"></label><div id="waitlistSearchCount" class="kbrh-search-count"></div>`;
    table.parentElement.insertBefore(bar, table);
    byId("waitlistSearch").addEventListener("input", e => { waitlistSearchTerm = String(e.target.value || "").toLowerCase().trim(); applyWaitlistSearch(); });
    applyWaitlistSearch();
  }

  function applyWaitlistSearch() {
    const body = byId("waitlistBody");
    if (!body) return;
    let visible = 0, total = 0;
    body.querySelectorAll("tr").forEach(row => {
      if (row.querySelector("td.empty") || row.children.length === 0) return;
      total++;
      const matches = !waitlistSearchTerm || row.textContent.toLowerCase().includes(waitlistSearchTerm);
      row.hidden = !matches;
      if (matches) visible++;
    });
    const count = byId("waitlistSearchCount");
    if (count) count.textContent = waitlistSearchTerm ? `Showing ${visible} of ${total}` : `${total} active applicant${total === 1 ? "" : "s"}`;
  }

  function openWaitlistModal(applicantId) {
    if (typeof waitlistState === "undefined") return;
    const a = (waitlistState.waitlist || []).find(x => x?.id === applicantId);
    if (!a) return;
    const fields = [
      fieldHtml({ id:"kbrhWaitFirstName", label:"First Name", value:a.firstName, required:true }),
      fieldHtml({ id:"kbrhWaitLastName", label:"Last Name", value:a.lastName, required:true }),
      fieldHtml({ id:"kbrhWaitContact", label:"Contact", value:a.contact }),
      fieldHtml({ id:"kbrhWaitStatus", label:"Status", value:a.status }),
      fieldHtml({ id:"kbrhWaitCity", label:"City", value:a.city }),
      fieldHtml({ id:"kbrhWaitDateApplied", label:"Date Applied", value:a.dateApplied, type:"date" })
    ].join("");
    openModal("waitlist", applicantId, "Edit Waitlist Applicant", `${a.firstName || ""} ${a.lastName || ""}`.trim(), fields);
  }

  async function saveWaitlistModal() {
    const a = (waitlistState.waitlist || []).find(x => x?.id === currentRecordId);
    if (!a) return;
    a.firstName = value("kbrhWaitFirstName");
    a.lastName = value("kbrhWaitLastName");
    a.contact = value("kbrhWaitContact");
    a.status = value("kbrhWaitStatus");
    a.city = value("kbrhWaitCity");
    a.dateApplied = value("kbrhWaitDateApplied");
    closeModal();
    if (typeof renderWaitlist === "function") renderWaitlist();
    if (typeof saveWaitlist === "function") await saveWaitlist();
    applyWaitlistSearch();
  }

  function upgradeWaitlist() {
    if (typeof window.startInlineEdit === "function" && typeof window.waitlistState !== "undefined") window.startInlineEdit = openWaitlistModal;
    if (typeof window.renderWaitlist === "function" && !window.__kbrhWaitlistRenderWrapped) {
      const original = window.renderWaitlist;
      window.renderWaitlist = function(...args) { const result = original.apply(this, args); installWaitlistSearch(); applyWaitlistSearch(); return result; };
      window.__kbrhWaitlistRenderWrapped = true;
    }
  }

  function openRosterModal(clientId) {
    if (typeof rosterState === "undefined") return;
    const c = (rosterState.roster || []).find(x => x?.id === clientId);
    if (!c) return;
    const fields = [
      fieldHtml({ id:"kbrhRosterRoom", label:"Room", value:c.roomNumber }),
      fieldHtml({ id:"kbrhRosterClientId", label:"Client ID", value:c.clientId, required:true }),
      fieldHtml({ id:"kbrhRosterFirstName", label:"First Name", value:c.firstName, required:true }),
      fieldHtml({ id:"kbrhRosterLastName", label:"Last Name", value:c.lastName, required:true }),
      fieldHtml({ id:"kbrhRosterDob", label:"Date of Birth", value:c.dob, type:"date" }),
      fieldHtml({ id:"kbrhRosterPhone", label:"Phone", value:c.phone }),
      fieldHtml({ id:"kbrhRosterAddress", label:"Address", value:c.address, full:true }),
      fieldHtml({ id:"kbrhRosterCity", label:"City", value:c.city }),
      fieldHtml({ id:"kbrhRosterContact", label:"Emergency Contact", value:c.contact }),
      fieldHtml({ id:"kbrhRosterContactPhone", label:"Emergency Contact Phone", value:c.contactPhone }),
      fieldHtml({ id:"kbrhRosterEntryDate", label:"Admission Date", value:c.entryDate, type:"date" }),
      fieldHtml({ id:"kbrhRosterDischargeDate", label:"Expected Discharge", value:c.expectedDischargeDate || "", type:"date" }),
      `<label class="kbrh-modal-field"><span>Phase</span><select id="kbrhRosterPhase" data-label="Phase" data-required="false"><option value="phase1" ${(c.phase || "phase1") === "phase1" ? "selected" : ""}>Phase 1</option><option value="phase2" ${c.phase === "phase2" ? "selected" : ""}>Phase 2</option></select></label>`,
      fieldHtml({ id:"kbrhRosterPhase2Date", label:"Phase 2 Admission Date", value:c.phase2AdmissionDate, type:"date" }),
      checkboxHtml({ id:"kbrhRosterOpoc", label:"OPOC Completed", checked:Boolean(c.opocCompleted), full:true })
    ].join("");
    openModal("roster", clientId, "Edit Resident", `${c.firstName || ""} ${c.lastName || ""}`.trim(), fields);
    const phase = byId("kbrhRosterPhase");
    const date = byId("kbrhRosterPhase2Date");
    const refresh = () => {
      const enabled = phase.value === "phase2";
      date.disabled = !enabled;
      date.dataset.ignoreEmpty = enabled ? "false" : "true";
      date.closest(".kbrh-modal-field").classList.toggle("kbrh-field-disabled", !enabled);
      if (!enabled) date.classList.remove("kbrh-optional-missing");
    };
    phase.addEventListener("change", refresh);
    refresh();
  }

  async function saveRosterModal() {
    const c = (rosterState.roster || []).find(x => x?.id === currentRecordId);
    if (!c) return;
    const oldPhase = c.phase || "phase1";
    c.roomNumber = value("kbrhRosterRoom");
    c.clientId = value("kbrhRosterClientId");
    c.firstName = value("kbrhRosterFirstName");
    c.lastName = value("kbrhRosterLastName");
    c.dob = value("kbrhRosterDob");
    c.phone = typeof formatPhoneNumber === "function" ? formatPhoneNumber(value("kbrhRosterPhone")) : value("kbrhRosterPhone");
    c.address = value("kbrhRosterAddress");
    c.city = value("kbrhRosterCity");
    c.contact = value("kbrhRosterContact");
    c.contactPhone = typeof formatPhoneNumber === "function" ? formatPhoneNumber(value("kbrhRosterContactPhone")) : value("kbrhRosterContactPhone");
    c.entryDate = value("kbrhRosterEntryDate");
    c.expectedDischargeDate = value("kbrhRosterDischargeDate");
    c.phase = value("kbrhRosterPhase") || "phase1";
    c.phase2AdmissionDate = c.phase === "phase2" ? value("kbrhRosterPhase2Date") : "";
    c.opocCompleted = Boolean(byId("kbrhRosterOpoc")?.checked);
    if (oldPhase !== "phase2" && c.phase === "phase2" && !c.phase2AdmissionDate) c.phase2AdmissionDate = new Date().toISOString().slice(0, 10);
    closeModal();
    if (typeof renderRoster === "function") renderRoster();
    if (typeof saveRoster === "function") await saveRoster();
  }

  function upgradeRoster() {
    if (typeof window.startInlineEdit === "function" && typeof window.rosterState !== "undefined") window.startInlineEdit = openRosterModal;
  }

  function installOutdoorOverrideControl() {
    const resident = byId("exceptionResident");
    const chore = byId("exceptionChore");
    if (!resident || !chore || byId("outdoorEligibilityOverride")) return;
    const label = document.createElement("label");
    label.className = "kbrh-outdoor-override";
    label.innerHTML = `<input id="outdoorEligibilityOverride" type="checkbox"><span>Override Outside Yardwork eligibility for this forced assignment</span>`;
    (byId("lockChoreBtn")?.parentElement || chore.parentElement)?.appendChild(label);
    const refresh = () => {
      const outdoor = chore.value === OUTDOOR_CHORE_NAME;
      label.classList.toggle("hidden", !outdoor);
      if (!outdoor) byId("outdoorEligibilityOverride").checked = false;
    };
    chore.addEventListener("change", refresh);
    refresh();
  }

  function upgradeOutdoorLogic() {
    if (typeof window.isEligibleForOutsideYardwork === "function" && !window.__kbrhOutdoorEligibilityWrapped) {
      const original = window.isEligibleForOutsideYardwork;
      window.isEligibleForOutsideYardwork = resident => resident?.outdoorEligibilityOverride ? true : original(resident);
      window.__kbrhOutdoorEligibilityWrapped = true;
    }
    if (typeof window.lockResidentToChore === "function" && !window.__kbrhOutdoorLockWrapped) {
      const original = window.lockResidentToChore;
      window.lockResidentToChore = function() {
        const residentId = byId("exceptionResident")?.value || "";
        const choreName = byId("exceptionChore")?.value || "";
        const resident = (window.state?.residents || []).find(x => x.id === residentId);
        const override = Boolean(byId("outdoorEligibilityOverride")?.checked);
        if (resident && choreName === OUTDOOR_CHORE_NAME && !resident.outdoorEligibilityOverride && override) {
          if (!confirm(`${resident.name} has not completed the normal indoor rotation.\n\nSelect OK to force and lock this resident to Outside Yardwork.`)) return;
          resident.outdoorEligibilityOverride = true;
        }
        original();
        if (byId("outdoorEligibilityOverride")) byId("outdoorEligibilityOverride").checked = false;
      };
      window.__kbrhOutdoorLockWrapped = true;
    }
    if (typeof window.clearResidentLock === "function" && !window.__kbrhClearOutdoorLockWrapped) {
      const original = window.clearResidentLock;
      window.clearResidentLock = function() {
        const residentId = byId("exceptionResident")?.value || "";
        const resident = (window.state?.residents || []).find(x => x.id === residentId);
        original();
        if (resident) {
          resident.outdoorEligibilityOverride = false;
          if (typeof window.saveAndRender === "function") window.saveAndRender();
        }
      };
      window.__kbrhClearOutdoorLockWrapped = true;
    }
  }

  function install() {
    ensureModal();
    upgradeWaitlist();
    upgradeRoster();
    installWaitlistSearch();
    applyWaitlistSearch();
    upgradeOutdoorLogic();
    installOutdoorOverrideControl();
  }

  document.addEventListener("DOMContentLoaded", install);
  window.addEventListener("load", install);
  let tries = 0;
  const timer = setInterval(() => { install(); if (++tries >= 20) clearInterval(timer); }, 500);
})();
