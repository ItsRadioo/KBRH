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
const blocked=(p,day,slot)=>{
 const r=restrictions()[p.id]||{};
 return (r.dates?.[day]?.includes('all')||r.dates?.[day]?.includes(slot==='lunch'?'lunch':'dinner')||r.recurring?.[DAYS[new Date(`${day}T12:00:00`).getDay()===0?6:new Date(`${day}T12:00:00`).getDay()-1]]?.includes('all')||r.recurring?.[DAYS[new Date(`${day}T12:00:00`).getDay()===0?6:new Date(`${day}T12:00:00`).getDay()-1]]?.includes(slot==='lunch'?'lunch':'dinner'))||false;
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
function editAvailability(id){const p=people().find(x=>x.id===id);if(!p)return;const day=prompt(`Availability for ${p.name}: enter YYYY-MM-DD for a specific date, or weekday name (e.g. Tuesday) for a recurring restriction.`);if(!day)return;const kind=prompt('Exclude: all, lunch, or dinner?','all')?.toLowerCase();if(!['all','lunch','dinner'].includes(kind))return;state.mealAvailability=state.mealAvailability||{};const r=state.mealAvailability[id]||{dates:{},recurring:{}};const weekday=DAYS.find(x=>x.toLowerCase()===day.trim().toLowerCase());const target=weekday?(r.recurring=r.recurring||{}):(r.dates=r.dates||{});const key=weekday||day.trim();if(!weekday&&!/^\d{4}-\d{2}-\d{2}$/.test(key)){alert('Invalid date or weekday.');return;}target[key]=[...new Set([...(target[key]||[]),kind])];state.mealAvailability[id]=r;saveAppState(state);render();}
async function publish(){if(schedule().locked){alert('Unlock before publishing changes.');return;}const rows=draft||schedule().weekSchedule||emptyRows(),issues=validate(rows);if(issues.length){alert(`Resolve all schedule conflicts before publishing:\n${issues.join('\n')}`);return;}state.mealSchedule={...schedule(),weekStart:week(),weekSchedule:structuredClone(rows),published:true,locked:true,publishedAt:new Date().toISOString(),dinnerIntroduced:[...new Set([...(schedule().dinnerIntroduced||[]),...DAYS.flatMap(d=>[rows[d].supper1,rows[d].supper2]).filter(Boolean)])]};await saveAppState(state);draft=null;dirty=false;render();}
async function unlock(){if(!confirm('Unlock the published schedule for editing? Changes will need to be published again.'))return;state.mealSchedule={...schedule(),locked:false,published:false};await saveAppState(state);render();}
function resetDraft(){if(schedule().locked){alert('Unlock before clearing.');return;}draft=emptyRows();dirty=true;render();}
function printWeek(){window.print();}
el('mealWeek').value=schedule().weekStart||mondayOf(dateISO(new Date()));
el('mealWeek').addEventListener('change',()=>{draft=null;render();});el('generateMealBtn').onclick=generate;el('randomMealBtn').onclick=generate;el('saveMealBtn').onclick=publish;el('clearMealBtn').onclick=resetDraft;el('printMealBtn').onclick=printWeek;el('unlockMealBtn').onclick=unlock;
auth.onAuthStateChanged(u=>{if(u)listenToAppState(s=>{state=s; if(!dirty)el('mealWeek').value=schedule().weekStart||el('mealWeek').value;render();});});
