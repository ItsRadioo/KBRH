let checkState=defaultAppState();
let currentAreaId='';
let currentRoom='';
let editingCheckId='';
let snapshotRefreshInFlight=false;
let snapshotTimer=null;
let choreSettings=defaultKbrhSettings();
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const today=()=>new Date().toISOString().slice(0,10);
const EASTERN_TIME_ZONE='America/Toronto';
const AREA_TO_CHORE={
  'washrooms':'Bathroom',
  'upper-floors':'Upper floors',
  'main-am':'Main Floor (morning)',
  'main-pm':'Main Floor (Night)',
  'basement':'Basement'
};

function easternDateParts(date=new Date()){
  const parts=new Intl.DateTimeFormat('en-CA',{
    timeZone:EASTERN_TIME_ZONE,
    year:'numeric',month:'2-digit',day:'2-digit',
    hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'
  }).formatToParts(date);
  const out={};
  parts.forEach(part=>{if(part.type!=='literal')out[part.type]=part.value;});
  return {
    year:Number(out.year),month:Number(out.month),day:Number(out.day),
    hour:Number(out.hour),minute:Number(out.minute),second:Number(out.second)
  };
}

function effectiveAssignmentWeekKey(date=new Date()){
  const p=easternDateParts(date);
  const targetDayName=choreSettings?.choreRolloverDay||"Monday";
  const dayNames=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  const targetDay=Math.max(0,dayNames.indexOf(targetDayName));
  const [targetHour,targetMinute]=String(choreSettings?.choreRolloverTime||"00:01").split(":").map(Number);
  const currentDate=new Date(Date.UTC(p.year,p.month-1,p.day));
  const currentDow=currentDate.getUTCDay();
  let daysSince=(currentDow-targetDay+7)%7;
  const beforeTodayRollover=daysSince===0 && (p.hour<(targetHour||0) || (p.hour===(targetHour||0) && p.minute<(targetMinute||0)));
  if(beforeTodayRollover) daysSince=7;
  currentDate.setUTCDate(currentDate.getUTCDate()-daysSince);
  return `${currentDate.getUTCFullYear()}-${String(currentDate.getUTCMonth()+1).padStart(2,'0')}-${String(currentDate.getUTCDate()).padStart(2,'0')}`;
}

function liveAssignedName(areaId){
  const chore=AREA_TO_CHORE[areaId];
  if(!chore)return'';
  const idx=(checkState.chores||[]).indexOf(chore);
  const r=(checkState.residents||[]).find(x=>Number(x.choreIndex)===idx&&x.status!=='away');
  return r?.name||'';
}

function liveRoomResidentName(room){
  const r=(checkState.roster||checkState.clients||[]).find(x=>String(x.roomNumber||'').trim()===String(room||'').trim()&&!x.archived);
  return r?[r.firstName,r.lastName].filter(Boolean).join(' ').trim()||r.name||'':'';
}

function buildAssignmentSnapshot(weekKey){
  const choreAssignments={};
  Object.keys(AREA_TO_CHORE).forEach(areaId=>{choreAssignments[areaId]=liveAssignedName(areaId);});
  const roomAssignments={};
  RESIDENT_ROOM_NUMBERS.forEach(room=>{roomAssignments[String(room)]=liveRoomResidentName(room);});
  return {
    weekKey,
    refreshedAt:new Date().toISOString(),
    choreAssignments,
    roomAssignments
  };
}

async function ensureWeeklyAssignmentSnapshot(){
  if(snapshotRefreshInFlight)return false;
  const weekKey=effectiveAssignmentWeekKey();
  const current=checkState.choreCheckAssignments||{};
  if(current.weekKey===weekKey)return false;

  snapshotRefreshInFlight=true;
  try{
    checkState.choreCheckAssignments=buildAssignmentSnapshot(weekKey);
    await saveAppState(checkState);
    return true;
  }catch(error){
    console.error('Could not refresh weekly chore-check assignment snapshot.',error);
    // Keep the freshly captured local snapshot so the page remains usable, but make the failure visible.
    const el=$('assignmentWeekLabel');
    if(el)el.textContent='Assignment snapshot could not be saved. Check Firestore connectivity.';
    return false;
  }finally{
    snapshotRefreshInFlight=false;
  }
}

function assignedName(areaId){
  return checkState.choreCheckAssignments?.choreAssignments?.[areaId]||'';
}

function roomResidentName(room){
  return checkState.choreCheckAssignments?.roomAssignments?.[String(room)]||'';
}

function updateAssignmentWeekLabel(){
  const el=$('assignmentWeekLabel');
  if(!el)return;
  const snap=checkState.choreCheckAssignments||{};
  if(!snap.weekKey){el.textContent='Weekly assignment snapshot pending.';return;}
  const start=new Date(`${snap.weekKey}T12:00:00`);
  const end=new Date(start);end.setDate(end.getDate()+6);
  const fmt=d=>d.toLocaleDateString('en-CA',{month:'short',day:'numeric',year:'numeric'});
  const day=choreSettings?.choreRolloverDay||'Monday'; const time=choreSettings?.choreRolloverTime||'00:01';
  el.textContent=`Assigned names locked for ${fmt(start)} – ${fmt(end)}. Refreshes ${day}s at ${time} Eastern Time.`;
}

function latestRecord(areaId,room=''){return (checkState.choreChecks||[]).filter(x=>x.date===today()&&x.areaId===areaId&&String(x.roomNumber||'')===String(room||'')).sort((a,b)=>(b.updatedAt||b.createdAt||'').localeCompare(a.updatedAt||a.createdAt||''))[0];}
function statusFor(areaId){if(areaId==='rooms'){const done=RESIDENT_ROOM_NUMBERS.filter(n=>latestRecord('rooms',n)).length;return {label:`${done} / ${RESIDENT_ROOM_NUMBERS.length} rooms checked`,cls:done===RESIDENT_ROOM_NUMBERS.length?'complete':done?'partial':'pending'};}const rec=latestRecord(areaId);if(!rec)return{label:'Not checked',cls:'pending'};return rec.issuesFound?{label:'Checked — issues noted',cls:'issues'}:{label:'Complete',cls:'complete'};}
function renderGrid(){const grid=$('choreCheckGrid');grid.innerHTML=Object.entries(CHORE_CHECK_AREAS).map(([id,[name]])=>{const s=statusFor(id),assigned=id==='rooms'?'Room-by-room inspection':(assignedName(id)||'No resident assigned for this week');return `<button class="tracker-card ${s.cls}" onclick="startArea('${id}')"><span class="tracker-card-title">${esc(name)}</span><span>${esc(assigned)}</span><strong>${esc(s.label)}</strong></button>`}).join('');$('checkDateLabel').textContent=new Date().toLocaleDateString('en-CA',{dateStyle:'long'});updateAssignmentWeekLabel();}
function startArea(id){if(id==='rooms')return openRoomPicker();openCheck(id,'');}
function openRoomPicker(){$('roomButtonGrid').innerHTML=RESIDENT_ROOM_NUMBERS.map(n=>{const r=latestRecord('rooms',n);const resident=roomResidentName(n);return `<button class="room-pick ${r?(r.issuesFound?'issues':'complete'):''}" onclick="openCheck('rooms','${n}')">Room ${n}<span>${r?(r.issuesFound?'Issues noted':'Checked'):(resident||'Not checked')}</span></button>`}).join('');$('roomPickerModal').classList.remove('hidden');document.body.classList.add('kbrh-modal-open');}
function closeRoomPicker(){$('roomPickerModal').classList.add('hidden');if($('checkModal').classList.contains('hidden'))document.body.classList.remove('kbrh-modal-open');}
function openCheck(areaId,room=''){currentAreaId=areaId;currentRoom=room;const [name,items]=CHORE_CHECK_AREAS[areaId],record=latestRecord(areaId,room);editingCheckId=record?.id||'';$('checkModalTitle').textContent=areaId==='rooms'?'Resident Room Inspection':name;$('checkModalSubtitle').textContent=areaId==='rooms'?`Room ${room}`:'Daily chore inspection';$('assignedResidentText').textContent=areaId==='rooms'?`Resident: ${roomResidentName(room)||'Room unassigned for this week'}`:`Assigned resident: ${assignedName(areaId)||'Not assigned for this week'}`;$('backToRoomsBtn').classList.toggle('hidden',areaId!=='rooms');$('checkItems').innerHTML=items.map((item,i)=>`<label class="checklist-row"><input type="checkbox" data-check-index="${i}" ${record?.completedItems?.includes(i)?'checked':''}><span>${esc(item)}</span></label>`).join('');$('checkDate').value=record?.date||today();$('checkedBy').value=record?.checkedBy||'';$('issuesFound').checked=Boolean(record?.issuesFound);$('checkNotes').value=record?.notes||'';closeRoomPicker();$('checkModal').classList.remove('hidden');document.body.classList.add('kbrh-modal-open');}
function closeCheck(){$('checkModal').classList.add('hidden');document.body.classList.remove('kbrh-modal-open');currentAreaId='';currentRoom='';editingCheckId='';}
async function saveCheck(){const checkedBy=typeof currentStaffName==='function'?currentStaffName():$('checkedBy').value.trim();if(!checkedBy){alert('Enter the staff member who completed the check.');return;}const completedItems=[...document.querySelectorAll('[data-check-index]:checked')].map(x=>Number(x.dataset.checkIndex));const [name]=CHORE_CHECK_AREAS[currentAreaId];const rec={date:$('checkDate').value,areaId:currentAreaId,areaName:currentAreaId==='rooms'?`${name} — Room ${currentRoom}`:name,roomNumber:currentRoom,assignedResident:currentAreaId==='rooms'?roomResidentName(currentRoom):assignedName(currentAreaId),assignmentWeek:checkState.choreCheckAssignments?.weekKey||'',checkedBy,completedItems,issuesFound:$('issuesFound').checked,notes:$('checkNotes').value.trim()};checkState.choreChecks=Array.isArray(checkState.choreChecks)?checkState.choreChecks:[];if(editingCheckId){Object.assign(checkState.choreChecks.find(x=>x.id===editingCheckId),rec,{updatedAt:new Date().toISOString()});}else checkState.choreChecks.unshift({...rec,id:crypto.randomUUID(),createdAt:new Date().toISOString()});await saveAppState(checkState);const wasRoom=currentAreaId==='rooms';closeCheck();renderGrid();if(wasRoom)openRoomPicker();}

function reportAreaLabel(record){if(record.areaId==='rooms')return `Room ${record.roomNumber||''}`.trim();return record.areaName||CHORE_CHECK_AREAS[record.areaId]?.[0]||'Chore';}
function generateChoreReport(){const reportDate=today();const records=(checkState.choreChecks||[]).filter(record=>record.date===reportDate&&String(record.notes||'').trim()).slice().sort((a,b)=>{const aRoom=a.areaId==='rooms',bRoom=b.areaId==='rooms';if(aRoom!==bRoom)return aRoom?1:-1;if(aRoom&&bRoom)return Number(a.roomNumber||0)-Number(b.roomNumber||0);return reportAreaLabel(a).localeCompare(reportAreaLabel(b));});const rows=records.length?records.map(record=>`<tr><td>${esc(reportAreaLabel(record))}</td><td>${esc(String(record.notes||'').trim()).replace(/\n/g,'<br>')}</td></tr>`).join(''):'<tr><td colspan="2" class="empty">No notes were recorded for this date.</td></tr>';const formattedDate=new Date(`${reportDate}T12:00:00`).toLocaleDateString('en-CA',{dateStyle:'long'});const reportWindow=window.open('','_blank','width=980,height=760');if(!reportWindow){alert('Your browser blocked the report window. Allow pop-ups for this site and try again.');return;}reportWindow.document.write(`<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Chore Notes Report — ${esc(reportDate)}</title><style>*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#111;margin:0;padding:32px;background:#fff}main{max-width:900px;margin:0 auto}h1{font-size:22px;margin:0 0 4px}p{margin:0 0 22px;color:#333}.toolbar{display:flex;justify-content:flex-end;margin-bottom:20px}.toolbar button{font:inherit;font-weight:700;padding:9px 16px;border:1px solid #333;border-radius:6px;background:#fff;cursor:pointer}table{width:100%;border-collapse:collapse;table-layout:fixed}th,td{border:1px solid #222;padding:10px 12px;text-align:left;vertical-align:top;line-height:1.4;overflow-wrap:anywhere}th{background:#eee;font-weight:700}th:first-child,td:first-child{width:28%}.empty{text-align:center;color:#555;padding:24px}.signature{margin-top:34px}.signature-line{display:inline-block;width:300px;border-bottom:1px solid #111;height:24px;vertical-align:bottom}@media print{body{padding:0}.toolbar{display:none}main{max-width:none}thead{display:table-header-group}tr{break-inside:avoid}}</style></head><body><main><div class="toolbar"><button onclick="window.print()">Print Report</button></div><h1>Ken Brown Recovery Home</h1><p>Chore Notes Report — ${esc(formattedDate)}</p><table><thead><tr><th>Room / Chore</th><th>Note</th></tr></thead><tbody>${rows}</tbody></table><div class="signature">Prepared By: <span class="signature-line"></span></div></main></body></html>`);reportWindow.document.close();reportWindow.focus();}
function openHistory(){const items=(checkState.choreChecks||[]).slice().sort((a,b)=>(b.date||'').localeCompare(a.date||'')||(b.createdAt||'').localeCompare(a.createdAt||''));$('checkHistoryList').innerHTML=items.length?items.map(r=>`<article class="record-card"><div class="record-card-heading"><div><strong>${esc(r.areaName)}</strong><span>${esc(r.date)} · Checked by ${esc(r.checkedBy)}</span></div><span class="status-pill ${r.issuesFound?'status-danger':'status-success'}">${r.issuesFound?'Issues':'Complete'}</span></div>${r.assignedResident?`<p><strong>Assigned resident:</strong> ${esc(r.assignedResident)}</p>`:''}<p><strong>Completed:</strong> ${(r.completedItems||[]).length} / ${(CHORE_CHECK_AREAS[r.areaId]?.[1]||[]).length}</p>${r.notes?`<p><strong>Notes:</strong> ${esc(r.notes)}</p>`:''}</article>`).join(''):'<p class="empty-state">No chore checks have been saved.</p>';$('historyModal').classList.remove('hidden');document.body.classList.add('kbrh-modal-open');}
function closeHistory(){$('historyModal').classList.add('hidden');document.body.classList.remove('kbrh-modal-open');}

document.addEventListener('DOMContentLoaded',()=>{$('closeRoomPickerX').onclick=$('closeRoomPickerBtn').onclick=closeRoomPicker;$('closeCheckModalX').onclick=$('cancelCheckBtn').onclick=closeCheck;$('saveCheckBtn').onclick=saveCheck;$('backToRoomsBtn').onclick=()=>{closeCheck();openRoomPicker();};$('generateChoreReportBtn').onclick=generateChoreReport;$('viewCheckHistoryBtn').onclick=openHistory;$('closeHistoryX').onclick=$('closeHistoryBtn').onclick=closeHistory;});

auth.onAuthStateChanged(async u=>{
  if(!u)return;
  choreSettings=await loadKbrhSettings();
  listenToAppState(async s=>{
    checkState=s;
    await ensureWeeklyAssignmentSnapshot();
    renderGrid();
  });
  if(!snapshotTimer){
    snapshotTimer=setInterval(async()=>{
      if(!auth.currentUser)return;
      const changed=await ensureWeeklyAssignmentSnapshot();
      if(changed)renderGrid();
    },30000);
  }
});

window.addEventListener('beforeunload',()=>{if(snapshotTimer)clearInterval(snapshotTimer);});
window.addEventListener("kbrhStaffProfileReady",()=>{const f=document.getElementById("checkedBy");if(f){f.value=currentStaffName();f.readOnly=true;}});
