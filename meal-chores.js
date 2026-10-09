/* KBRH v5.6.20: date-aware meal assignments, availability, preview and publication. */
const DAYS=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const SLOTS=['lunch','supper1','supper2'];
let state=defaultAppState(), draft=null, dirty=false;
const el=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dateISO=d=>{const x=new Date(d);return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`;};
const mondayOf=d=>{const x=new Date(`${d}T12:00:00`);x.setDate(x.getDate()-(x.getDay()+6)%7);return dateISO(x);};
const dayDate=(week,idx)=>{const x=new Date(`${week}T12:00:00`);x.setDate(x.getDate()+idx);return dateISO(x);};
const week=()=>el('mealWeek').value;
const displayName=p=>p.name||`${p.firstName||''} ${p.lastName||''}`.trim()||'Unnamed resident';
const emptyRows=()=>Object.fromEntries(DAYS.map(d=>[d,{lunch:'',supper1:'',supper2:''}]));
const schedule=()=>state.mealSchedule||defaultMealSchedule();
const restrictions=()=>state.mealAvailability||{};
const people=()=>{
 const active=(state.roster||[]).filter(p=>p&&!p.archived&&(p.phase||'phase1')==='phase1').map(p=>({...p,name:displayName(p),start:p.entryDate||'',end:p.expectedDischargeDate||p.exitDate||'',pending:false}));
 const pending=(state.pendingAdmissions||[]).filter(p=>p.status==='Pending Admission'&&p.expectedIntakeDate&&p.expectedIntakeDate>=week()&&p.expectedIntakeDate<=dayDate(week(),6)).map(p=>({id:`pending:${p.id}`,name:p.applicantName||'Pending admission',start:p.expectedIntakeDate,end:'',pending:true}));
 return [...active,...pending];
};
const MINUTES = t => {const parts=String(t||'').split(':').map(Number);return parts.length===2&&parts.every(Number.isFinite)?parts[0]*60+parts[1]:0;};
// Editable meal windows; a restriction applies only if its time interval overlaps a meal.
const MEAL_WINDOWS={lunch:[660,900],dinner:[960,1260]};
const dateDiff=(a,b)=>Math.round((new Date(`${a}T12:00:00`)-new Date(`${b}T12:00:00`))/86400000);
function matchesRule(rule,day){
 if(rule.type==='once')return day>=rule.startDate&&day<=(rule.endDate||rule.startDate);
 if(rule.type==='weekly'||rule.type==='biweekly'){
  if(rule.startDate&&day<rule.startDate)return false;
  if(rule.endDate&&day>rule.endDate)return false;
  const weekday=DAYS[(new Date(`${day}T12:00:00`).getDay()+6)%7];
  if(!rule.days?.includes(weekday))return false;
  if(rule.type==='biweekly'){
   const anchor=mondayOf(rule.startDate||week());
   return Math.floor(dateDiff(mondayOf(day),anchor)/7)%2===0;
  }
  return true;
 }
 return false;
}
const blocked=(p,day,slot)=>{
 const r=restrictions()[p.id]||{};
 const meal=slot==='lunch'?'lunch':'dinner';
 const weekday=DAYS[(new Date(`${day}T12:00:00`).getDay()+6)%7];
 if(r.dates?.[day]?.some(x=>x==='all'||x===meal)||r.recurring?.[weekday]?.some(x=>x==='all'||x===meal))return true;
 return (r.rules||[]).some(rule=>{
  if(!matchesRule(rule,day))return false;
  if(rule.scope==='all')return true;
  if(rule.scope==='lunch'||rule.scope==='dinner')return rule.scope===meal;
  const [start,end]=MEAL_WINDOWS[meal];
  return MINUTES(rule.startTime)<end&&MINUTES(rule.endTime)>start;
 });
};
const eligible=(p,day,slot)=> (!p.start||day>=p.start)&&(!p.end||day<p.end)&&!blocked(p,day,slot);
const isNew=(p,day)=>p.pending||!!(p.start&&Math.floor((new Date(`${day}T12:00:00`)-new Date(`${p.start}T12:00:00`))/86400000)<7);
const experienced=(p,day)=>!p.pending&&(!p.start||(new Date(`${day}T12:00:00`)-new Date(`${p.start}T12:00:00`))/86400000>=14);
function dinnerPreviouslyAssigned(p,rows,day,slot){
 if(!isNew(p,day))return true;
 const hist=(schedule().dinnerIntroduced||[]).includes(p.id);
 if(hist)return true;
 for(let i=0;i<DAYS.length;i++){const d=dayDate(week(),i);if(d>day||(d===day&&slot==='lunch'))break;const r=rows[DAYS[i]]||{};if(r.supper1===p.id||r.supper2===p.id)return true;}
 return false;
}
function validate(rows){const errors=[];const roster=people(),lookup=new Map(roster.map(p=>[p.id,p]));
 DAYS.forEach((day,i)=>{const date=dayDate(week(),i),r=rows[day]||{},ids=SLOTS.map(s=>r[s]).filter(Boolean);
 if(new Set(ids).size!==ids.length)errors.push(`${day}: resident assigned more than once`);
 SLOTS.forEach(slot=>{const id=r[slot];if(!id){errors.push(`${day}: ${slot} unfilled`);return;}const p=lookup.get(id);if(!p){errors.push(`${day}: ${slot} resident no longer eligible`);return;}if(!eligible(p,date,slot))errors.push(`${day}: ${p.name} unavailable or outside admission dates`);if(slot==='lunch'&&!dinnerPreviouslyAssigned(p,rows,date,slot))errors.push(`${day}: ${p.name} needs a dinner assignment before lunch`);});
 const a=lookup.get(r.supper1),b=lookup.get(r.supper2);
 if(a&&b&&((isNew(a,date)&&!experienced(b,date))||(isNew(b,date)&&!experienced(a,date))))errors.push(`${day}: new resident requires experienced dinner partner`);
 });return errors;
}
function generate(){if(schedule().locked){alert('Unlock the published schedule before generating a replacement.');return;}
 const roster=people(),rows=emptyRows(),counts=new Map(roster.map(p=>[p.id,0]));
 for(let i=0;i<7;i++){const day=DAYS[i],date=dayDate(week(),i),r=rows[day];
  const choose=(slot,condition=()=>true)=>{const used=new Set(SLOTS.map(s=>r[s]).filter(Boolean));const pool=roster.filter(p=>!used.has(p.id)&&eligible(p,date,slot)&&condition(p)&& (slot!=='lunch'||dinnerPreviouslyAssigned(p,rows,date,slot)));
   pool.sort((a,b)=>(counts.get(a.id)||0)-(counts.get(b.id)||0)||a.name.localeCompare(b.name));const p=pool[0];if(p){r[slot]=p.id;counts.set(p.id,(counts.get(p.id)||0)+1);}return p;};
  choose('lunch');
  const needsDinner=roster.filter(p=>isNew(p,date)&&!dinnerPreviouslyAssigned(p,rows,date,'supper1')&&eligible(p,date,'supper1')&&(counts.get(p.id)||0)===0);
  if(needsDinner.length){const p=needsDinner[0];r.supper1=p.id;counts.set(p.id,(counts.get(p.id)||0)+1);choose('supper2',q=>experienced(q,date));if(!r.supper2){r.supper1='';counts.set(p.id,counts.get(p.id)-1);}}
  if(!r.supper1){const p=choose('supper1',q=>!isNew(q,date));if(!p)choose('supper1');}
  if(!r.supper2){const first=roster.find(p=>p.id===r.supper1);choose('supper2',q=>!first||(!isNew(first,date)||experienced(q,date))&&(!isNew(q,date)||experienced(first,date)));}
 }
 draft=rows;dirty=true;render();
}
function updateSlot(day,slot,id){if(schedule().locked){alert('Unlock before editing.');render();return;}const next=structuredClone(draft||schedule().weekSchedule||emptyRows());next[day][slot]=id;const issues=validate(next).filter(x=>x.startsWith(`${day}:`)&&!x.includes('unfilled'));if(issues.length){alert(issues.join('\n'));render();return;}draft=next;dirty=true;render();}
function render(){const rows=draft||schedule().weekSchedule||emptyRows(),roster=people();el('mealBody').innerHTML=DAYS.map((day,i)=>{const date=dayDate(week(),i),r=rows[day]||{};return `<tr><td><b>${day}</b><small style="display:block">${date}</small></td>${SLOTS.map(slot=>`<td><select ${schedule().locked?'disabled':''} onchange="updateSlot('${day}','${slot}',this.value)"><option value="">Unassigned</option>${roster.filter(p=>p.id===r[slot]||eligible(p,date,slot)).map(p=>`<option value="${esc(p.id)}" ${r[slot]===p.id?'selected':''}>${esc(p.name)}${p.pending?' (Pending)':''}</option>`).join('')}</select></td>`).join('')}</tr>`;}).join('');
 const issues=validate(rows);el('mealWarnings').innerHTML=issues.length?`<strong>${issues.length} schedule issue(s)</strong><ul>${issues.map(s=>`<li>${esc(s)}</li>`).join('')}</ul>`:'<strong>All 21 positions filled with no detected conflicts.</strong>';
 el('mealStatus').textContent=`${schedule().locked?'LOCKED':'Editable'} · ${schedule().published?'Published':'Not published'}${dirty?' · Unsaved preview':''}`;
 el('mealRoster').innerHTML=roster.map(p=>`<div style="padding:6px;border-bottom:1px solid #ddd"><b>${esc(p.name)}</b> ${p.pending?'(Pending admission)':''}<div style="font-size:12px">${esc(p.start||'No intake date')} – ${esc(p.end||'No exit date')}</div><button class="secondary" onclick="editAvailability('${esc(p.id)}')">Availability</button></div>`).join('');
}
let editingAvailabilityId=null;
const availabilityModal=()=>el('availabilityModal');
const availabilityFields=()=>({type:el('availabilityType').value,startDate:el('availabilityStart').value,endDate:el('availabilityEnd').value,days:[...document.querySelectorAll('[name="availabilityDay"]:checked')].map(x=>x.value),scope:el('availabilityScope').value,startTime:el('availabilityFrom').value,endTime:el('availabilityTo').value});
function updateAvailabilityFields(){
 const type=el('availabilityType').value,scope=el('availabilityScope').value;
 el('availabilityWeekdays').hidden=type==='once';
 el('availabilityEndWrap').hidden=type!=='once';
 el('availabilityTimes').hidden=scope!=='time';
 el('availabilityAnchorHelp').textContent=type==='biweekly'?'Select a date in the first active week. The selected weekdays repeat every other week from that week.':type==='weekly'?'Restrictions repeat every week starting with the selected date.':'Select the first and last date of the absence.';
}
function editAvailability(id){
 const p=people().find(x=>x.id===id);if(!p)return;
 editingAvailabilityId=id;editingRuleIndex=null;el('availabilitySaveRule').textContent='Add restriction';el('availabilityResident').textContent=p.name;
 el('availabilityType').value='weekly';el('availabilityScope').value='time';
 el('availabilityStart').value=week();el('availabilityEnd').value=week();
 el('availabilityFrom').value='16:00';el('availabilityTo').value='19:00';
 document.querySelectorAll('[name="availabilityDay"]').forEach(x=>x.checked=false);
 updateAvailabilityFields();renderAvailabilityRules();availabilityModal().hidden=false;
}
function closeAvailability(){availabilityModal().hidden=true;editingAvailabilityId=null;}
function renderAvailabilityRules(){
 const r=restrictions()[editingAvailabilityId]||{};
 const items=(r.rules||[]).map((x,i)=>`<li>${esc(x.type==='once'?`${x.startDate} to ${x.endDate||x.startDate}`:`${x.type==='biweekly'?'Every other':'Every'} ${x.days?.join(', ')||'day'} from ${x.startDate}`)} · ${esc(x.scope==='time'?`${x.startTime}–${x.endTime}`:x.scope)} <button type="button" class="secondary" onclick="loadAvailabilityRule(${i})">Edit</button> <button type="button" class="secondary" onclick="removeAvailabilityRule(${i})">Remove</button></li>`).join('');
 el('availabilityRules').innerHTML=items||'<li>No restrictions saved.</li>';
}
let editingRuleIndex=null;
function loadAvailabilityRule(i){const r=restrictions()[editingAvailabilityId]?.rules?.[i];if(!r)return;editingRuleIndex=i;
 el('availabilityType').value=r.type;el('availabilityScope').value=r.scope;
 el('availabilityStart').value=r.startDate||week();el('availabilityEnd').value=r.endDate||r.startDate||week();
 el('availabilityFrom').value=r.startTime||'16:00';el('availabilityTo').value=r.endTime||'19:00';
 document.querySelectorAll('[name="availabilityDay"]').forEach(x=>x.checked=(r.days||[]).includes(x.value));updateAvailabilityFields();
 el('availabilitySaveRule').textContent='Update restriction';
}
async function removeAvailabilityRule(i){const r=state.mealAvailability?.[editingAvailabilityId];if(!r)return;r.rules.splice(i,1);await saveAppState(state);renderAvailabilityRules();render();}
async function saveAvailabilityRule(){
 const v=availabilityFields();if(!v.startDate){alert('Select a starting date.');return;}
 if(v.type==='once'&&(!v.endDate||v.endDate<v.startDate)){alert('Select a valid end date.');return;}
 if(v.type!=='once'&&!v.days.length){alert('Select at least one weekday.');return;}
 if(v.scope==='time'&&MINUTES(v.endTime)<=MINUTES(v.startTime)){alert('End time must be later than start time.');return;}
 state.mealAvailability=state.mealAvailability||{};
 const r=state.mealAvailability[editingAvailabilityId]||{dates:{},recurring:{},rules:[]};r.rules=r.rules||[];
 const rule={...v,endDate:v.type==='once'?v.endDate:'',days:v.type==='once'?[]:v.days};
 if(editingRuleIndex===null)r.rules.push(rule);else r.rules[editingRuleIndex]=rule;
 state.mealAvailability[editingAvailabilityId]=r;
 await saveAppState(state);editingRuleIndex=null;el('availabilitySaveRule').textContent='Add restriction';renderAvailabilityRules();render();
}
async function publish(){if(schedule().locked){alert('Unlock before publishing changes.');return;}const rows=draft||schedule().weekSchedule||emptyRows(),issues=validate(rows);const conflicts=issues.filter(x=>!x.includes(' unfilled'));const vacancies=issues.filter(x=>x.includes(' unfilled'));if(conflicts.length){alert(`Resolve scheduling conflicts before publishing:\n${conflicts.join('\n')}`);return;}if(vacancies.length&&!confirm(`This schedule has ${vacancies.length} unfilled meal position(s):\n\n${vacancies.join('\n')}\n\nPublish with these positions marked Unassigned?`))return;state.mealSchedule={...schedule(),weekStart:week(),weekSchedule:structuredClone(rows),published:true,locked:true,publishedAt:new Date().toISOString(),dinnerIntroduced:[...new Set([...(schedule().dinnerIntroduced||[]),...DAYS.flatMap(d=>[rows[d].supper1,rows[d].supper2]).filter(Boolean)])]};await saveAppState(state);draft=null;dirty=false;render();}
async function unlock(){if(!confirm('Unlock the published schedule for editing? Changes will need to be published again.'))return;state.mealSchedule={...schedule(),locked:false,published:false};await saveAppState(state);render();}
function resetDraft(){if(schedule().locked){alert('Unlock before clearing.');return;}draft=emptyRows();dirty=true;render();}
function printWeek(){window.print();}
el('mealWeek').value=schedule().weekStart||mondayOf(dateISO(new Date()));
el('mealWeek').addEventListener('change',()=>{draft=null;render();});el('generateMealBtn').onclick=generate;el('randomMealBtn').onclick=generate;el('saveMealBtn').onclick=publish;el('clearMealBtn').onclick=resetDraft;el('printMealBtn').onclick=printWeek;el('unlockMealBtn').onclick=unlock;
auth.onAuthStateChanged(u=>{if(u)listenToAppState(s=>{state=s; if(!dirty)el('mealWeek').value=schedule().weekStart||el('mealWeek').value;render();});});

el('availabilityType').addEventListener('change',updateAvailabilityFields);
el('availabilityScope').addEventListener('change',updateAvailabilityFields);
el('availabilitySaveRule').addEventListener('click',saveAvailabilityRule);
el('availabilityClose').addEventListener('click',closeAvailability);
