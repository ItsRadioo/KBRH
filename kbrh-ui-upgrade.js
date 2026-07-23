/*
  KBRH UI Upgrade — compatibility fix
  Replace the previous kbrh-ui-upgrade.js with this file.

  This version does not attempt to overwrite top-level let/function bindings.
  It intercepts the existing desktop controls and calls the modal/override
  behaviour directly, which is compatible with the current project files.
*/
(() => {
  "use strict";

  const MODAL_ID = "kbrhEditModal";
  const OUTDOOR = "Outside Yardwork";

  let modalType = "";
  let recordId = "";
  let waitlistSearchTerm = "";

  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[c]));
  const valueOf = id => String($(id)?.value || "").trim();

  function inputField(id, label, value = "", type = "text", required = false, full = false) {
    return `
      <label class="kbrh-modal-field ${full ? "kbrh-modal-field-full" : ""}">
        <span>${esc(label)}${required ? ' <strong class="kbrh-required-mark">*</strong>' : ""}</span>
        <input
          id="${esc(id)}"
          type="${esc(type)}"
          value="${esc(value)}"
          data-label="${esc(label)}"
          data-required="${required ? "true" : "false"}"
          autocomplete="off"
        >
      </label>
    `;
  }

  function selectField(id, label, value = "", options = [], required = false, full = false) {
    const optionHtml = options.map(option => {
      const optionValue = typeof option === "string" ? option : option.value;
      const optionLabel = typeof option === "string" ? option : option.label;
      return `<option value="${esc(optionValue)}" ${String(optionValue) === String(value) ? "selected" : ""}>${esc(optionLabel)}</option>`;
    }).join("");

    return `
      <label class="kbrh-modal-field ${full ? "kbrh-modal-field-full" : ""}">
        <span>${esc(label)}${required ? ' <strong class="kbrh-required-mark">*</strong>' : ""}</span>
        <select
          id="${esc(id)}"
          data-label="${esc(label)}"
          data-required="${required ? "true" : "false"}"
        >${optionHtml}</select>
      </label>
    `;
  }

  function offerNoteField(id) {
    return `
      <label id="${esc(id)}Wrap" class="kbrh-modal-field kbrh-modal-field-full hidden">
        <span>Offer Note <strong class="kbrh-required-mark">*</strong></span>
        <textarea
          id="${esc(id)}"
          data-label="Offer Note"
          data-required="false"
          placeholder="Enter the offer details..."
        ></textarea>
      </label>
    `;
  }

  function configureOfferNote(statusId, noteId) {
    const status = $(statusId);
    const note = $(noteId);
    const wrap = $(`${noteId}Wrap`);
    if (!status || !note || !wrap) return;

    const update = () => {
      const offerGiven = status.value === "Offer Given";
      wrap.classList.toggle("hidden", !offerGiven);
      note.dataset.required = offerGiven ? "true" : "false";
      if (!offerGiven) {
        note.value = "";
        note.classList.remove("kbrh-required-missing", "kbrh-optional-missing");
      }
    };

    status.addEventListener("change", update);
    update();
  }

  function textareaField(id, label, value = "", required = false, full = true) {
    return `
      <label class="kbrh-modal-field ${full ? "kbrh-modal-field-full" : ""}">
        <span>${esc(label)}${required ? ' <strong class="kbrh-required-mark">*</strong>' : ""}</span>
        <textarea
          id="${esc(id)}"
          data-label="${esc(label)}"
          data-required="${required ? "true" : "false"}"
          autocomplete="off"
        >${esc(value)}</textarea>
      </label>
    `;
  }

  function checkboxField(id, label, checked = false) {
    return `
      <label class="kbrh-modal-check kbrh-modal-field-full">
        <input id="${esc(id)}" type="checkbox" ${checked ? "checked" : ""}>
        <span>${esc(label)}</span>
      </label>
    `;
  }

  function sectionHeading(title, description = "") {
    return `
      <div class="kbrh-modal-section-heading kbrh-modal-field-full">
        <h3>${esc(title)}</h3>
        ${description ? `<p>${esc(description)}</p>` : ""}
      </div>
    `;
  }

  function ensureModal() {
    if ($(MODAL_ID)) return;

    const modal = document.createElement("div");
    modal.id = MODAL_ID;
    modal.className = "kbrh-modal-backdrop hidden";
    modal.innerHTML = `
      <section class="kbrh-edit-modal" role="dialog" aria-modal="true" aria-labelledby="kbrhModalTitle">
        <header class="kbrh-edit-modal-header">
          <div>
            <h2 id="kbrhModalTitle">Edit Record</h2>
            <p id="kbrhModalSubtitle"></p>
          </div>
          <button type="button" class="secondary kbrh-modal-close" aria-label="Close">×</button>
        </header>

        <div id="kbrhModalMessage" class="kbrh-modal-message hidden"></div>

        <form id="kbrhModalForm" class="kbrh-edit-modal-form" novalidate>
          <div class="kbrh-edit-modal-body">
            <div id="kbrhModalFields" class="kbrh-modal-grid"></div>
          </div>

          <footer class="kbrh-edit-modal-footer">
            <button type="button" class="secondary" id="kbrhModalCancel">Cancel</button>
            <button type="submit" class="success" id="kbrhModalSave">Save Changes</button>
          </footer>
        </form>
      </section>
    `;

    document.body.appendChild(modal);

    modal.querySelector(".kbrh-modal-close").addEventListener("click", closeModal);
    $("kbrhModalCancel").addEventListener("click", closeModal);
    $("kbrhModalForm").addEventListener("submit", saveModal);

    modal.addEventListener("mousedown", event => {
      if (event.target === modal) closeModal();
    });

    document.addEventListener("keydown", event => {
      if (event.key === "Escape" && !modal.classList.contains("hidden")) {
        closeModal();
      }
    });
  }

  function openModal(type, id, title, subtitle, fields, saveLabel = "Save Changes") {
    ensureModal();

    modalType = type;
    recordId = id;

    $("kbrhModalTitle").textContent = title;
    $("kbrhModalSubtitle").textContent = subtitle || "";
    $("kbrhModalFields").innerHTML = fields;
    $("kbrhModalSave").textContent = saveLabel;
    $("kbrhModalMessage").className = "kbrh-modal-message hidden";
    $("kbrhModalMessage").textContent = "";

    $(MODAL_ID).classList.remove("hidden");
    document.body.classList.add("kbrh-modal-open");

    $(MODAL_ID).querySelectorAll("input, select, textarea").forEach(control => {
      control.addEventListener("input", () => {
        if (String(control.value || "").trim()) {
          control.classList.remove("kbrh-required-missing", "kbrh-optional-missing");
        }
      });
    });

    $(MODAL_ID).querySelector("input")?.focus();
  }

  function closeModal() {
    $(MODAL_ID)?.classList.add("hidden");
    document.body.classList.remove("kbrh-modal-open");
    modalType = "";
    recordId = "";
  }

  function validateModal() {
    const required = [];
    const optional = [];

    $(MODAL_ID).querySelectorAll("[data-label]").forEach(control => {
      control.classList.remove("kbrh-required-missing", "kbrh-optional-missing");

      if (control.type === "checkbox" || control.disabled) return;
      if (String(control.value || "").trim()) return;

      const label = control.dataset.label || "Unnamed field";

      if (control.dataset.required === "true") {
        required.push(label);
        control.classList.add("kbrh-required-missing");
      } else {
        optional.push(label);
        control.classList.add("kbrh-optional-missing");
      }
    });

    return { required, optional };
  }

  function showMessage(text, error = false) {
    const box = $("kbrhModalMessage");
    box.textContent = text;
    box.className = `kbrh-modal-message ${
      error ? "kbrh-modal-message-error" : "kbrh-modal-message-warning"
    }`;
  }

  async function saveModal(event) {
    event.preventDefault();

    const result = validateModal();

    if (result.required.length) {
      showMessage(
        `This record cannot be saved. Complete: ${result.required.join(", ")}.`,
        true
      );
      $(MODAL_ID).querySelector(".kbrh-required-missing")?.focus();
      return;
    }

    if (result.optional.length) {
      showMessage(`Optional information is blank: ${result.optional.join(", ")}.`);

      const saveAnyway = confirm(
        `The following optional fields are blank:\n\n` +
        `${result.optional.join("\n")}\n\n` +
        `Select OK to save anyway, or Cancel to return to the form.`
      );

      if (!saveAnyway) return;
    }

    if (modalType === "waitlist") await saveWaitlistRecord();
    if (modalType === "waitlist-add") await addWaitlistRecord();
    if (modalType === "roster") await saveRosterRecord();
    if (modalType === "roster-add") await addRosterRecord();
  }

  function openAddWaitlistModal() {
    openModal(
      "waitlist-add",
      "",
      "Add Waitlist Applicant",
      "Enter the applicant information below.",
      [
        inputField("kwaFirst", "First Name", "", "text", true),
        inputField("kwaLast", "Last Name", "", "text", true),
        inputField("kwaContact", "Contact / Phone Number"),
        selectField("kwaStatus", "Status", "N/A", ["N/A", "Incarcerated", "Offer Given"], true),
        inputField("kwaCity", "City"),
        inputField("kwaDate", "Date Applied", new Date().toISOString().slice(0, 10), "date"),
        textareaField("kwaNotes", "Initial Note"),
        offerNoteField("kwaOfferNote")
      ].join(""),
      "Add Applicant"
    );
    configureOfferNote("kwaStatus", "kwaOfferNote");
  }

  async function addWaitlistRecord() {
    waitlistState.waitlist = Array.isArray(waitlistState.waitlist)
      ? waitlistState.waitlist.filter(item => item && item !== "temp")
      : [];

    const initialNote = valueOf("kwaNotes");
    const offerNote = valueOf("kwaOfferNote");
    const status = valueOf("kwaStatus") || "N/A";
    const createdAt = new Date().toISOString();
    const notes = [];
    if (initialNote) notes.push({ id: crypto.randomUUID(), text: initialNote, createdAt });
    if (status === "Offer Given" && offerNote) {
      notes.push({ id: crypto.randomUUID(), text: `Offer Given: ${offerNote}`, createdAt });
    }

    const applicant = {
      id: crypto.randomUUID(),
      firstName: valueOf("kwaFirst"),
      lastName: valueOf("kwaLast"),
      contact: typeof formatPhoneNumber === "function"
        ? formatPhoneNumber(valueOf("kwaContact"))
        : valueOf("kwaContact"),
      status,
      city: valueOf("kwaCity"),
      dateApplied: valueOf("kwaDate"),
      archived: false,
      archivedAt: "",
      archiveReason: "",
      callPriority: "normal",
      notes,
      callInHistory: []
    };

    waitlistState.waitlist.push(applicant);
    closeModal();
    renderWaitlist();
    await saveWaitlist();
    applyWaitlistSearch();
  }

  function openWaitlistEditor(id) {
    if (typeof waitlistState === "undefined") {
      alert("The waitlist data has not finished loading. Refresh and try again.");
      return;
    }

    const applicant = (waitlistState.waitlist || []).find(item => item?.id === id);

    if (!applicant) {
      alert("The selected waitlist applicant could not be found.");
      return;
    }

    openModal(
      "waitlist",
      id,
      "Edit Waitlist Applicant",
      `${applicant.firstName || ""} ${applicant.lastName || ""}`.trim(),
      [
        inputField("kwFirst", "First Name", applicant.firstName, "text", true),
        inputField("kwLast", "Last Name", applicant.lastName, "text", true),
        inputField("kwContact", "Contact", applicant.contact),
        selectField("kwStatus", "Status", applicant.status || "N/A", ["N/A", "Incarcerated", "Offer Given"], true),
        inputField("kwCity", "City", applicant.city),
        inputField("kwDate", "Date Applied", applicant.dateApplied, "date"),
        offerNoteField("kwOfferNote")
      ].join("")
    );
    configureOfferNote("kwStatus", "kwOfferNote");
  }

  async function saveWaitlistRecord() {
    const applicant = (waitlistState.waitlist || []).find(item => item?.id === recordId);
    if (!applicant) return;

    applicant.firstName = valueOf("kwFirst");
    applicant.lastName = valueOf("kwLast");
    applicant.contact = valueOf("kwContact");
    applicant.status = valueOf("kwStatus") || "N/A";
    applicant.city = valueOf("kwCity");
    applicant.dateApplied = valueOf("kwDate");

    const offerNote = valueOf("kwOfferNote");
    if (applicant.status === "Offer Given" && offerNote) {
      applicant.notes = typeof normalizeWaitlistNotes === "function"
        ? normalizeWaitlistNotes(applicant.notes)
        : (Array.isArray(applicant.notes) ? applicant.notes : []);
      applicant.notes.unshift({
        id: crypto.randomUUID(),
        text: `Offer Given: ${offerNote}`,
        createdAt: new Date().toISOString()
      });
    }

    closeModal();
    renderWaitlist();
    await saveWaitlist();
    applyWaitlistSearch();
  }

  function openAddRosterModal() {
    openModal(
      "roster-add",
      "",
      "Add Client",
      "Enter the new resident information below.",
      [
        inputField("kraRoom", "Room Number"),
        inputField("kraClientId", "Client ID", "", "text", true),
        inputField("kraFirst", "First Name", "", "text", true),
        inputField("kraLast", "Last Name", "", "text", true),
        inputField("kraDob", "Date of Birth", "", "date"),
        inputField("kraPhone", "Phone Number"),
        inputField("kraAddress", "Address", "", "text", false, true),
        inputField("kraCity", "City"),
        inputField("kraContact", "Emergency Contact"),
        inputField("kraContactPhone", "Emergency Contact Phone"),
        inputField("kraEntry", "Entry Date", new Date().toISOString().slice(0, 10), "date")
      ].join(""),
      "Add Client"
    );
  }

  async function addRosterRecord() {
    rosterState.roster = Array.isArray(rosterState.roster)
      ? rosterState.roster.filter(client => client && client !== "temp")
      : [];

    const entryDate = valueOf("kraEntry");
    const client = {
      id: crypto.randomUUID(),
      roomNumber: valueOf("kraRoom"),
      clientId: valueOf("kraClientId"),
      firstName: valueOf("kraFirst"),
      lastName: valueOf("kraLast"),
      dob: valueOf("kraDob"),
      phone: typeof formatPhoneNumber === "function"
        ? formatPhoneNumber(valueOf("kraPhone"))
        : valueOf("kraPhone"),
      address: valueOf("kraAddress"),
      city: valueOf("kraCity"),
      contact: valueOf("kraContact"),
      contactPhone: typeof formatPhoneNumber === "function"
        ? formatPhoneNumber(valueOf("kraContactPhone"))
        : valueOf("kraContactPhone"),
      entryDate,
      expectedDischargeDate: typeof calculateExitDate === "function"
        ? calculateExitDate(entryDate)
        : "",
      opocCompleted: false,
      phase2AdmissionDate: "",
      phase: "phase1",
      archived: false,
      archivedAt: "",
      archiveReason: "",
      notes: []
    };

    rosterState.roster.push(client);
    closeModal();
    renderRoster();
    await saveRoster();
  }

  function openRosterEditor(id) {
    if (typeof rosterState === "undefined") {
      alert("The roster data has not finished loading. Refresh and try again.");
      return;
    }

    const client = (rosterState.roster || []).find(item => item?.id === id);

    if (!client) {
      alert("The selected resident could not be found.");
      return;
    }

    const discharge =
      client.expectedDischargeDate ||
      (typeof calculateExitDate === "function"
        ? calculateExitDate(client.entryDate)
        : "");

    openModal(
      "roster",
      id,
      "Edit Resident",
      `${client.firstName || ""} ${client.lastName || ""}`.trim(),
      [
        sectionHeading("Resident Information", "Core identifying and contact details."),
        inputField("krFirst", "First Name", client.firstName, "text", true),
        inputField("krLast", "Last Name", client.lastName, "text", true),
        inputField("krClientId", "Client ID", client.clientId, "text", true),
        inputField("krDob", "Date of Birth", client.dob, "date"),
        inputField("krPhone", "Phone", client.phone),
        inputField("krAddress", "Address", client.address, "text", false, true),
        inputField("krCity", "City", client.city),

        sectionHeading("Admission and Placement", "Room, phase, and program dates."),
        inputField("krRoom", "Room", client.roomNumber),
        inputField("krEntry", "Admission Date", client.entryDate, "date"),
        inputField("krDischarge", "Expected Discharge", discharge, "date"),
        `
          <label class="kbrh-modal-field">
            <span>Phase</span>
            <select id="krPhase" data-label="Phase" data-required="false">
              <option value="phase1" ${(client.phase || "phase1") === "phase1" ? "selected" : ""}>Phase 1</option>
              <option value="phase2" ${client.phase === "phase2" ? "selected" : ""}>Phase 2</option>
            </select>
          </label>
        `,
        inputField("krPhase2", "Phase 2 Admission Date", client.phase2AdmissionDate, "date"),
        checkboxField("krOpoc", "OPOC Completed", Boolean(client.opocCompleted)),

        sectionHeading("Emergency Contact"),
        inputField("krContact", "Emergency Contact", client.contact),
        inputField("krContactPhone", "Emergency Contact Phone", client.contactPhone)
      ].join("")
    );

    const phase = $("krPhase");
    const phase2Date = $("krPhase2");

    const updatePhaseField = () => {
      const enabled = phase.value === "phase2";
      phase2Date.disabled = !enabled;
      phase2Date
        .closest(".kbrh-modal-field")
        ?.classList.toggle("kbrh-field-disabled", !enabled);
    };

    phase.addEventListener("change", updatePhaseField);
    updatePhaseField();
  }

  async function saveRosterRecord() {
    const client = (rosterState.roster || []).find(item => item?.id === recordId);
    if (!client) return;

    const previousPhase = client.phase || "phase1";

    client.roomNumber = valueOf("krRoom");
    client.clientId = valueOf("krClientId");
    client.firstName = valueOf("krFirst");
    client.lastName = valueOf("krLast");
    client.dob = valueOf("krDob");

    client.phone =
      typeof formatPhoneNumber === "function"
        ? formatPhoneNumber(valueOf("krPhone"))
        : valueOf("krPhone");

    client.address = valueOf("krAddress");
    client.city = valueOf("krCity");
    client.contact = valueOf("krContact");

    client.contactPhone =
      typeof formatPhoneNumber === "function"
        ? formatPhoneNumber(valueOf("krContactPhone"))
        : valueOf("krContactPhone");

    client.entryDate = valueOf("krEntry");
    client.expectedDischargeDate = valueOf("krDischarge");
    client.phase = valueOf("krPhase") || "phase1";
    client.phase2AdmissionDate =
      client.phase === "phase2" ? valueOf("krPhase2") : "";
    client.opocCompleted = Boolean($("krOpoc")?.checked);

    if (
      previousPhase !== "phase2" &&
      client.phase === "phase2" &&
      !client.phase2AdmissionDate
    ) {
      client.phase2AdmissionDate = new Date().toISOString().slice(0, 10);
    }

    closeModal();
    renderRoster();
    await saveRoster();
  }

  function parseFirstQuotedArgument(text) {
    const match = String(text || "").match(/\(\s*['"]([^'"]+)['"]/);
    return match ? match[1] : "";
  }

  function installAddModalButtons() {
    const rosterButton = $("openAddClientModalBtn");
    if (rosterButton && rosterButton.dataset.kbrhInstalled !== "true") {
      rosterButton.dataset.kbrhInstalled = "true";
      rosterButton.addEventListener("click", openAddRosterModal);
    }

    const waitlistButton = $("openAddWaitlistModalBtn");
    if (waitlistButton && waitlistButton.dataset.kbrhInstalled !== "true") {
      waitlistButton.dataset.kbrhInstalled = "true";
      waitlistButton.addEventListener("click", openAddWaitlistModal);
    }
  }

  function installEditInterception() {
    document.addEventListener(
      "change",
      event => {
        const select = event.target.closest("select");
        if (!select || select.value !== "edit") return;

        const inline = select.getAttribute("onchange") || "";

        if (inline.includes("handleApplicantAction")) {
          const id = parseFirstQuotedArgument(inline);
          if (!id) return;

          event.preventDefault();
          event.stopImmediatePropagation();
          select.value = "";
          openWaitlistEditor(id);
          return;
        }

        if (
          inline.includes("handleRosterAction") ||
          inline.includes("handleClientAction")
        ) {
          const id = parseFirstQuotedArgument(inline);
          if (!id) return;

          event.preventDefault();
          event.stopImmediatePropagation();
          select.value = "";
          openRosterEditor(id);
        }
      },
      true
    );

    document.addEventListener(
      "click",
      event => {
        const button = event.target.closest("button");
        if (!button) return;

        const inline = button.getAttribute("onclick") || "";

        if (inline.includes("startInlineEdit")) {
          const id = parseFirstQuotedArgument(inline);
          if (!id) return;

          event.preventDefault();
          event.stopImmediatePropagation();

          if (typeof waitlistState !== "undefined") {
            openWaitlistEditor(id);
          } else if (typeof rosterState !== "undefined") {
            openRosterEditor(id);
          }
        }
      },
      true
    );
  }

  function installWaitlistSearch() {
    const body = $("waitlistBody");
    if (!body || $("waitlistSearch")) return;

    const table = body.closest("table");
    if (!table) return;

    const bar = document.createElement("div");
    bar.className = "kbrh-search-row";
    bar.innerHTML = `
      <label class="kbrh-search-field">
        <span>Search Waitlist</span>
        <input
          id="waitlistSearch"
          type="search"
          placeholder="Search by name, contact, status, city, or date"
          autocomplete="off"
        >
      </label>
      <div id="waitlistSearchCount" class="kbrh-search-count"></div>
    `;

    table.parentElement.insertBefore(bar, table);

    $("waitlistSearch").addEventListener("input", event => {
      waitlistSearchTerm = String(event.target.value || "").toLowerCase().trim();
      applyWaitlistSearch();
    });

    applyWaitlistSearch();
  }

  function applyWaitlistSearch() {
    const body = $("waitlistBody");
    if (!body) return;

    let total = 0;
    let visible = 0;

    body.querySelectorAll("tr").forEach(row => {
      if (row.querySelector("td.empty")) return;

      total += 1;
      const matches =
        !waitlistSearchTerm ||
        row.textContent.toLowerCase().includes(waitlistSearchTerm);

      row.hidden = !matches;
      if (matches) visible += 1;
    });

    const count = $("waitlistSearchCount");
    if (count) {
      count.textContent = waitlistSearchTerm
        ? `Showing ${visible} of ${total}`
        : `${total} active applicant${total === 1 ? "" : "s"}`;
    }
  }

  function installOutdoorOverride() {
    const residentSelect = $("exceptionResident");
    const choreSelect = $("exceptionChore");
    const lockButton = $("lockChoreBtn");

    if (!residentSelect || !choreSelect || !lockButton) return;

    if (!$("outdoorEligibilityOverride")) {
      const label = document.createElement("label");
      label.className = "kbrh-outdoor-override hidden";
      label.innerHTML = `
        <input id="outdoorEligibilityOverride" type="checkbox">
        <span>Override Outside Yardwork eligibility for this forced assignment</span>
      `;

      lockButton.parentElement.appendChild(label);

      const refresh = () => {
        const active = choreSelect.value === OUTDOOR;
        label.classList.toggle("hidden", !active);

        if (!active) {
          $("outdoorEligibilityOverride").checked = false;
        }
      };

      choreSelect.addEventListener("change", refresh);
      refresh();
    }

    if (lockButton.dataset.kbrhOverrideInstalled === "true") return;
    lockButton.dataset.kbrhOverrideInstalled = "true";

    lockButton.addEventListener(
      "click",
      event => {
        const residentId = residentSelect.value;
        const choreName = choreSelect.value;
        const override = Boolean($("outdoorEligibilityOverride")?.checked);

        if (choreName !== OUTDOOR || !override) return;

        const resident = (state.residents || []).find(item => item.id === residentId);
        if (!resident) return;

        event.preventDefault();
        event.stopImmediatePropagation();

        const confirmed = confirm(
          `${resident.name} has not completed the normal indoor rotation.\n\n` +
          `Select OK to force and lock this resident to Outside Yardwork.`
        );

        if (!confirmed) return;

        resident.outdoorEligibilityOverride = true;
        resident.lockedChore = OUTDOOR;
        resident.exceptions = Array.isArray(resident.exceptions)
          ? resident.exceptions.filter(chore => chore !== OUTDOOR)
          : [];
        resident.choreIndex = choreIndexByName(OUTDOOR);

        $("outdoorEligibilityOverride").checked = false;

        saveAndRender();
      },
      true
    );
  }

  function install() {
    ensureModal();
    installAddModalButtons();
    installEditInterception();
    installWaitlistSearch();
    applyWaitlistSearch();
    installOutdoorOverride();
  }

  document.addEventListener("DOMContentLoaded", install);
  window.addEventListener("load", install);

  let attempts = 0;
  const timer = setInterval(() => {
    install();
    attempts += 1;
    if (attempts >= 20) clearInterval(timer);
  }, 500);
})();
