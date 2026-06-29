function moveToRoster(applicantId) {
  const applicant = waitlistState.waitlist.find(item => item.id === applicantId);
  if (!applicant) return;

  waitlistState.roster = Array.isArray(waitlistState.roster)
    ? waitlistState.roster.filter(client => client && client !== "temp")
    : [];

  if (!confirm(`Move ${applicant.firstName} ${applicant.lastName} to Current Roster?`)) return;

  const transferNote = {
    id: crypto.randomUUID(),
    text: `Transferred from waitlist on ${new Date().toLocaleDateString("en-CA")}.`,
    createdAt: new Date().toISOString()
  };

  waitlistState.roster.push({
    id: crypto.randomUUID(),
    roomNumber: "",
    clientId: "",
    firstName: applicant.firstName || "",
    lastName: applicant.lastName || "",
    dob: "",
    phone: formatPhoneNumber(applicant.contact || ""),
    address: "",
    city: applicant.city || "",
    contact: "",
    contactPhone: "",
    entryDate: "",
    expectedDischargeDate: "",
    phase: "phase1",
    phase2AdmissionDate: "",
    archived: false,
    archivedAt: "",
    archiveReason: "",
    notes: [transferNote, ...normalizeWaitlistNotes(applicant.notes)]
  });

  applicant.archived = true;
  applicant.archivedAt = new Date().toISOString();
  applicant.archiveReason = "Moved to Current Roster";

  renderWaitlist();
  saveWaitlist();
}

function formatPhoneNumber(value) {
  const digits = String(value || "").replace(/\D/g, "");

  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }

  return value;
}
