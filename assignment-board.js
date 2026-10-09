/* KBRH v5.6.22 — read-only assignment board, synced to application state. */
const BOARD_DAYS=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const boardEsc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const boardDate=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const boardMonday=d=>{const x=new Date(d);x.setHours(12,0,0,0);x.setDate(x.getDate()-(x.getDay()+6)%7);return boardDate(x);};
const boardWeekOffset=(week,i)=>{const d=new Date(week+'T12:00:00');d.setDate(d.getDate()+i);return boardDate(d);};
let boardState=null,boardSelectedWeek=null;
function boardDraw(){
 if(!boardState)return;
 const s=boardState, meal=s.mealSchedule||{}, currentWeek=boardMonday(new Date()), week=boardSelectedWeek||currentWeek;
 const published=!!meal.published&&meal.weekStart===week;
 document.getElementById('week').textContent='Week beginning '+week;
 document.getElementById('boardWeek').value=week;
 document.getElementById('clock').textContent=new Date().toLocaleString('en-CA',{weekday:'short',hour:'numeric',minute:'2-digit'});
 const names=new Map();
 for(const p of s.roster||[])names.set(String(p.id),p.name||[p.firstName,p.lastName].filter(Boolean).join(' ').trim()||'Resident');
 for(const p of s.pendingAdmissions||[])names.set('pending:'+p.id,p.applicantName||p.name||[p.firstName,p.lastName].filter(Boolean).join(' ')||'Pending admission');
 const label=id=>boardEsc(names.get(String(id))|| (id?'Resident not found':'Unassigned'));
 const mealRows=BOARD_DAYS.map((day,i)=>{const row=meal.weekSchedule?.[day]||{},today=boardWeekOffset(week,i)===boardDate(new Date());return `<tr class="${today?'today':''}"><td class="day-cell">${day}</td><td><div>Lunch</div><div class="assignment-name">${label(row.lunch)}</div></td><td><div>Dinner</div><div class="assignment-name">${label(row.supper1)}</div><div class="assignment-name">${label(row.supper2)}</div></td></tr>`;}).join('');
 document.getElementById('meals').innerHTML=published?`<table class="schedule-table"><thead><tr><th style="width:20%">Day</th><th style="width:35%">Lunch</th><th>Dinner (2 residents)</th></tr></thead><tbody>${mealRows}</tbody></table>`:'<div class="entry">No published meal schedule for this week. Staff must publish the schedule in Meal Chores.</div>';
 const chores=Array.isArray(s.chores)?s.chores:[];
 const residents=(s.residents||[]).filter(p=>p&&p.status!=='away'&&p.status!=='archived'&&p.status!=='inactive');
 const choreAssignments=new Map();
 for(const p of residents){const idx=Number(p.choreIndex);const chore=p.lockedChore||(Number.isInteger(idx)&&idx>=0&&idx<chores.length?chores[idx]:null);if(chore){const key=String(chore);if(!choreAssignments.has(key))choreAssignments.set(key,[]);choreAssignments.get(key).push(boardEsc(p.name||'Resident'));}}
 const choreRows=chores.map((chore,i)=>{const title=typeof chore==='string'?chore:(chore?.name||chore?.title||'Chore '+(i+1));const details=typeof chore==='object'?(chore.description||chore.duties||''):'';const assigned=choreAssignments.get(String(chore))||choreAssignments.get(String(title))||[];return `<tr><td><strong>${boardEsc(title)}</strong></td><td class="assignment-name">${assigned.length?assigned.join(' · '):'Unassigned'}</td><td class="duty-description">${boardEsc(details)}</td></tr>`;}).join('');
 document.getElementById('chores').innerHTML=s.tableGenerated&&chores.length?`<table class="schedule-table"><thead><tr><th style="width:26%">Weekly Chore</th><th style="width:25%">Assigned Resident(s)</th><th>Duties / Instructions</th></tr></thead><tbody>${choreRows}</tbody></table>`:'<div class="entry">No generated house chore assignments. Staff must generate the table in House Chores.</div>';
 document.getElementById('notice').textContent='Read-only display · '+(published?'Meal schedule published':'Meal schedule not published for selected week')+' · '+(s.tableGenerated?'House chores generated':'House chores not generated');
}
document.getElementById('boardWeek').addEventListener('change',e=>{if(e.target.value){boardSelectedWeek=boardMonday(new Date(e.target.value+'T12:00:00'));boardDraw();}});
document.getElementById('boardCurrent').addEventListener('click',()=>{boardSelectedWeek=null;boardDraw();});
setInterval(boardDraw,60000);
auth.onAuthStateChanged(user=>{if(!user){document.getElementById('notice').textContent='Sign in to view assignments.';return;}listenToAppState(s=>{boardState=s;boardDraw();});});


// v5.6.27 display controls: independent full-screen panels with automatic rotation.
let boardActivePanel='meal',boardRotationTimer=null;
function boardShowPanel(which){
 boardActivePanel=which==='chore'?'chore':'meal';
 document.getElementById('mealPanel').classList.toggle('active',boardActivePanel==='meal');
 document.getElementById('chorePanel').classList.toggle('active',boardActivePanel==='chore');
}
function boardStopRotation(){if(boardRotationTimer){clearInterval(boardRotationTimer);boardRotationTimer=null;}}
function boardStartRotation(){
 boardStopRotation();
 const seconds=Number(document.getElementById('boardInterval').value)||30;
 boardRotationTimer=setInterval(()=>boardShowPanel(boardActivePanel==='meal'?'chore':'meal'),seconds*1000);
}
document.getElementById('boardMeals').addEventListener('click',()=>{boardShowPanel('meal');if(document.body.classList.contains('display-mode'))boardStartRotation();});
document.getElementById('boardChores').addEventListener('click',()=>{boardShowPanel('chore');if(document.body.classList.contains('display-mode'))boardStartRotation();});
document.getElementById('boardInterval').addEventListener('change',()=>{if(document.body.classList.contains('display-mode'))boardStartRotation();});
function boardExitDisplay(){
 document.body.classList.remove('display-mode');
 boardStopRotation();
 document.getElementById('boardDisplay').textContent='Start Display Mode';
}
document.getElementById('boardDisplay').addEventListener('click',async()=>{
 if(document.body.classList.contains('display-mode')){
  if(document.fullscreenElement&&document.exitFullscreen)await document.exitFullscreen().catch(()=>{});
  boardExitDisplay();return;
 }
 document.body.classList.add('display-mode');
 document.getElementById('boardDisplay').textContent='Exit Display Mode';
 boardStartRotation();
 if(document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen().catch(()=>{});
});
document.addEventListener('fullscreenchange',()=>{if(!document.fullscreenElement&&document.body.classList.contains('display-mode'))boardExitDisplay();});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&document.body.classList.contains('display-mode'))boardExitDisplay();});
