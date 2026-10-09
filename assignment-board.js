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
 document.getElementById('meals').innerHTML=published?BOARD_DAYS.map((day,i)=>{const row=meal.weekSchedule?.[day]||{},today=boardWeekOffset(week,i)===boardDate(new Date());return `<div class="entry ${today?'today':''}"><b>${day}</b><div>Lunch: <span class="name">${label(row.lunch)}</span></div><div>Dinner: <span class="name">${label(row.supper1)} · ${label(row.supper2)}</span></div></div>`;}).join(''):'<div class="entry">No published meal schedule for this week. Staff must publish the schedule in Meal Chores.</div>';
 const chores=Array.isArray(s.chores)?s.chores:[];
 const residents=(s.residents||[]).filter(p=>p&&p.status!=='away'&&p.status!=='archived'&&p.status!=='inactive');
 document.getElementById('chores').innerHTML=s.tableGenerated&&residents.length?residents.map(p=>{const idx=Number(p.choreIndex);const chore=p.lockedChore||(Number.isInteger(idx)&&idx>=0&&idx<chores.length?chores[idx]:'Unassigned');return `<div class="entry"><b>${boardEsc(chore)}</b><div>${boardEsc(p.name||'Resident')}</div></div>`;}).join(''):'<div class="entry">No generated house chore assignments. Staff must generate the table in House Chores.</div>';
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
