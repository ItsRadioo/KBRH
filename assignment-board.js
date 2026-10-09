const DAYS=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;', '"':'&quot;',"'":'&#39;'}[c]));
let current=null;
function draw(s){current=s;const meal=s.mealSchedule||{},today=new Date(),iso=today.toLocaleDateString('en-CA');const monday=new Date(today);monday.setDate(today.getDate()-(today.getDay()+6)%7);const wk=`${monday.getFullYear()}-${String(monday.getMonth()+1).padStart(2,'0')}-${String(monday.getDate()).padStart(2,'0')}`;
 document.getElementById('week').textContent=`Week beginning ${meal.weekStart||wk}`;
 const names=new Map([...(s.roster||[]).map(p=>[p.id,`${p.firstName||''} ${p.lastName||''}`.trim()]),...(s.pendingAdmissions||[]).map(p=>[`pending:${p.id}`,p.applicantName||'Pending admission'])]);
 document.getElementById('meals').innerHTML=meal.published&&meal.weekStart===wk?DAYS.map((day,i)=>{const row=meal.weekSchedule?.[day]||{},dt=new Date(`${wk}T12:00:00`);dt.setDate(dt.getDate()+i);const currentDay=dt.toLocaleDateString('en-CA')===iso;return `<div class="entry ${currentDay?'today':''}"><b>${day}</b><div>Lunch: <span class="name">${esc(names.get(row.lunch)||'Unassigned')}</span></div><div>Dinner: <span class="name">${esc(names.get(row.supper1)||'Unassigned')} · ${esc(names.get(row.supper2)||'Unassigned')}</span></div></div>`;}).join(''):'<div class="entry">No published meal schedule for this week.</div>';
 const residents=(s.residents||[]).filter(p=>p&&p.status!=='away'&&p.status!=='archived');const chores=s.chores||[];
 document.getElementById('chores').innerHTML=s.tableGenerated?residents.map(p=>{const chore=p.lockedChore||chores[(Number(p.choreIndex??p.currentChoreIndex??-1)+chores.length)%chores.length]||'See house chore schedule';return `<div class="entry"><b>${esc(chore)}</b><div>${esc(p.name||'Resident')}</div></div>`;}).join(''):'<div class="entry">No published weekly house chores.</div>';
}
auth.onAuthStateChanged(u=>{if(u)listenToAppState(draw);});setInterval(()=>{document.getElementById('clock').textContent=new Date().toLocaleString('en-CA',{weekday:'short',hour:'numeric',minute:'2-digit'});if(current)draw(current);},60000);
