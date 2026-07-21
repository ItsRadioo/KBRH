let warningState = defaultAppState();
let editingWarningId = null;

const $ = id => document.getElementById(id);

function getInputValue(id) {
  const input = $(id);
  if (!input) throw new Error(`Missing field: ${id}`);
  return String(input.value || "").trim();
}

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[char]));
}
function escapeAttribute(value) { return escapeHtml(value); }

async function saveWarnings() {
  try { await saveAppState(warningState); }
  catch (error) {
    console.error("Verbal warning save failed:", error);
    alert("Could not save verbal warning. Check Console for details.");
  }
}

function populateTimeDropdowns() {
  if (!$('warningHour') || !$('warningMinute') || !$('warningAmPm')) return;
  $('warningHour').innerHTML = Array.from({length:12},(_,i)=>{const v=String(i+1).padStart(2,'0');return `<option value="${v}">${v}</option>`}).join('');
  $('warningMinute').innerHTML = Array.from({length:60},(_,i)=>{const v=String(i).padStart(2,'0');return `<option value="${v}">${v}</option>`}).join('');
  $('warningAmPm').innerHTML = '<option value="AM">AM</option><option value="PM">PM</option>';
}

function setDefaultTime() {
  const now = new Date();
  let hour = now.getHours();
  $('warningAmPm').value = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12 || 12;
  $('warningHour').value = String(hour).padStart(2,'0');
  $('warningMinute').value = String(now.getMinutes()).padStart(2,'0');
}

function setTimeFromString(value) {
  const match = String(value || '').match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return setDefaultTime();
  $('warningHour').value = String(match[1]).padStart(2,'0');
  $('warningMinute').value = match[2];
  $('warningAmPm').value = match[3].toUpperCase();
}

function getWarningTime() {
  return `${getInputValue('warningHour')}:${getInputValue('warningMinute')} ${getInputValue('warningAmPm')}`;
}

function populateResidentDropdown(selectedId = '') {
  const select = $('warningResident');
  if (!select) return;
  const roster = Array.isArray(warningState.roster) ? warningState.roster.filter(c => c && c !== 'temp') : [];
  const options = roster.filter(c => ['phase1','phase2'].includes(c.phase || 'phase1')).map(c => {
    const name = `${c.firstName || ''} ${c.lastName || ''}`.trim();
    return `<option value="${escapeAttribute(c.id)}">${escapeHtml(name)}</option>`;
  }).join('');
  select.innerHTML = `<option value="">Select resident...</option>${options}<option value="OTHER">Other / Manual Entry</option>`;
  if ([...select.options].some(o => o.value === selectedId)) select.value = selectedId;
  toggleOtherResidentField();
}

function toggleOtherResidentField() {
  const other = $('warningResident')?.value === 'OTHER';
  $('otherResidentWrap')?.classList.toggle('hidden', !other);
  if (!other && $('otherResidentName')) $('otherResidentName').value = '';
}

function clearWarningForm() {
  ['warningDate','warningIncident','warningStaffAction','warningResidentResponse','otherResidentName'].forEach(id => { if ($(id)) $(id).value=''; });
  if ($('warningResident')) $('warningResident').value='';
  setDefaultTime();
  toggleOtherResidentField();
}

function openWarningModal(warningId = null) {
  editingWarningId = warningId;
  populateResidentDropdown();
  clearWarningForm();
  $('warningDate').value = new Date().toISOString().slice(0,10);

  if (warningId) {
    const warning = (warningState.verbalWarnings || []).find(item => item.id === warningId);
    if (!warning) return;
    $('warningModalTitle').textContent = 'Edit Verbal Warning';
    $('saveWarningBtn').textContent = 'Save Changes';
    $('warningDate').value = warning.date || '';
    setTimeFromString(warning.time);
    const knownResident = [...$('warningResident').options].some(o => o.value === warning.residentId && warning.residentId !== 'OTHER');
    $('warningResident').value = knownResident ? warning.residentId : 'OTHER';
    toggleOtherResidentField();
    if ($('warningResident').value === 'OTHER') $('otherResidentName').value = warning.residentName || '';
    $('warningIncident').value = warning.incident || '';
    $('warningStaffAction').value = warning.staffAction || '';
    $('warningResidentResponse').value = warning.residentResponse || '';
  } else {
    $('warningModalTitle').textContent = 'Add Verbal Warning';
    $('saveWarningBtn').textContent = 'Add Verbal Warning';
  }

  $('warningModal').classList.remove('hidden');
  document.body.classList.add('kbrh-modal-open');
  setTimeout(() => $('warningDate')?.focus(), 0);
}

function closeWarningModal() {
  $('warningModal')?.classList.add('hidden');
  document.body.classList.remove('kbrh-modal-open');
  editingWarningId = null;
}

function getSelectedResident() {
  const residentId = getInputValue('warningResident');
  if (residentId === 'OTHER') return {residentId:'OTHER', residentName:getInputValue('otherResidentName')};
  const resident = (warningState.roster || []).find(c => c.id === residentId);
  return {residentId, residentName: resident ? `${resident.firstName || ''} ${resident.lastName || ''}`.trim() : ''};
}

async function saveWarningFromModal() {
  const selected = getSelectedResident();
  const record = {
    date: getInputValue('warningDate'), time: getWarningTime(), residentId: selected.residentId,
    residentName: selected.residentName, incident: getInputValue('warningIncident'),
    staffAction: getInputValue('warningStaffAction'), residentResponse: getInputValue('warningResidentResponse')
  };
  if (!record.date || !record.residentName || !record.incident) {
    alert('Date, resident name, and incident are required.');
    return;
  }
  warningState.verbalWarnings = Array.isArray(warningState.verbalWarnings) ? warningState.verbalWarnings : [];
  if (editingWarningId) {
    const existing = warningState.verbalWarnings.find(item => item.id === editingWarningId);
    if (!existing) return;
    Object.assign(existing, record, {updatedAt:new Date().toISOString()});
  } else {
    warningState.verbalWarnings.unshift({...record,id:crypto.randomUUID(),staffUser:auth.currentUser?.email || '',createdAt:new Date().toISOString()});
  }
  renderWarnings();
  await saveWarnings();
  closeWarningModal();
}

function startEditWarning(id) { openWarningModal(id); }

function deleteWarning(id) {
  const warning = (warningState.verbalWarnings || []).find(item => item.id === id);
  if (!warning || !confirm(`Delete warning for ${warning.residentName}?`)) return;
  warningState.verbalWarnings = warningState.verbalWarnings.filter(item => item.id !== id);
  renderWarnings(); saveWarnings();
}

function renderWarnings() {
  const body = $('warningBody'); if (!body) return;
  const warnings = Array.isArray(warningState.verbalWarnings) ? warningState.verbalWarnings : [];
  body.innerHTML = warnings.length ? warnings.map(w => `<tr><td>${escapeHtml(w.date)}</td><td>${escapeHtml(w.time)}</td><td>${escapeHtml(w.residentName)}</td><td>${escapeHtml(w.incident)}</td><td>${escapeHtml(w.staffAction)}</td><td>${escapeHtml(w.residentResponse)}</td><td><div class="actions"><button type="button" class="secondary" onclick="startEditWarning('${w.id}')">Edit</button><button type="button" class="danger" onclick="deleteWarning('${w.id}')">Delete</button></div></td></tr>`).join('') : '<tr><td colspan="7" class="empty">No verbal warnings logged.</td></tr>';
}

document.addEventListener('DOMContentLoaded', () => {
  populateTimeDropdowns(); setDefaultTime();
  $('openWarningModalBtn')?.addEventListener('click', () => openWarningModal());
  $('warningResident')?.addEventListener('change', toggleOtherResidentField);
  $('saveWarningBtn')?.addEventListener('click', saveWarningFromModal);
  $('cancelWarningModalBtn')?.addEventListener('click', closeWarningModal);
  $('closeWarningModalX')?.addEventListener('click', closeWarningModal);
  $('warningModal')?.addEventListener('mousedown', e => { if (e.target === $('warningModal')) closeWarningModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('warningModal')?.classList.contains('hidden')) closeWarningModal(); });
});

auth.onAuthStateChanged(user => {
  if (!user) return;
  listenToAppState(nextState => {
    warningState = nextState;
    warningState.verbalWarnings = Array.isArray(warningState.verbalWarnings) ? warningState.verbalWarnings : [];
    populateResidentDropdown(); renderWarnings();
  });
});
