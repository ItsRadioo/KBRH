(()=>{
 const groups=[
  ['Main',[['index.html','Dashboard','layout-dashboard'],['roster.html','Roster','users']]],
  ['Roster',[['roster.html','Phase 1'],['phase2.html','Phase 2'],['roster-archive.html','Archive']]],
  ['Admissions',[['prescreening.html','Prescreening'],['pending-admissions.html','Pending Admission'],['waitlist.html','Waitlist'],['do-not-readmit.html','Do Not Readmit']]],
  ['Daily Operations',[['digital-logbook.html','Log Book'],['house-chores.html','House Chores'],['meal-chores.html','Meal Chores'],['electronics-turn-in.html','Electronics Turn In'],['chore-checks.html','Chore Checks'],['assignment-board.html','Assignment Board'],['bus-passes.html','Bus Passes'],['tool-signout.html','Tool Signout']]],
  ['Staff & Records',[['staff-list.html','Staff Contacts'],['staff-profile.html','My Profile'],['chat.html','Staff Chat'],['counseling-notes.html','Counseling Notes'],['incident-report.html','Incident Reports'],['verbalwarning.html','Warnings'],['writeups.html','Write-Ups']]],
  ['Reports & Admin',[['charts.html','Charts'],['reports.html','Reports'],['audit-log.html','Audit Log'],['settings.html','Settings'],['staff-accounts.html','Staff Accounts'],['system-health.html','System Health']]]
 ];
 const current=location.pathname.split('/').pop()||'index.html';
 function init(){
  if(!document.body||document.getElementById('kbrh-sidebar'))return;
  document.body.classList.add('kbrh-sidebar-layout');
  const nav=document.createElement('aside');nav.id='kbrh-sidebar';nav.setAttribute('aria-label','Site navigation');
  const makeLink=([href,label])=>`<a href="${href}" ${href===current?'aria-current="page"':''}>${label}</a>`;
  nav.innerHTML=`<div class="kbrh-sidebar-brand"><span class="kbrh-logo">KBRH</span><small>Ken Brown Recovery Home</small></div><div class="kbrh-sidebar-links">${groups.map(([label,links],i)=>`<section class="kbrh-nav-group"><div class="kbrh-nav-group-label">${label}</div>${i>1?`<details ${links.some(x=>x[0]===current)?'open':''}><summary>${label}</summary>${links.map(makeLink).join('')}</details>`:links.map(makeLink).join('')}</section>`).join('')}</div>`;
  document.body.insertAdjacentElement('afterbegin',nav);
  const toggle=document.createElement('button');toggle.id='kbrh-menu-toggle';toggle.type='button';toggle.setAttribute('aria-label','Toggle navigation');toggle.textContent='☰ Menu';toggle.onclick=()=>document.body.classList.toggle('kbrh-nav-open');document.body.appendChild(toggle);
  nav.addEventListener('click',e=>{if(e.target.closest('a'))document.body.classList.remove('kbrh-nav-open')});
  document.querySelectorAll('header nav.app-nav').forEach(el=>el.setAttribute('aria-hidden','true'));
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();