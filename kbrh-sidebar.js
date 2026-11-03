(()=>{
 const groups=[
 ['MAIN','house',[['dashboard.html','Dashboard','layout-dashboard']]],
 ['ROSTER','users',[['roster.html','Phase 1','users'],['phase2.html','Phase 2','users'],['roster-archive.html','Archive','archive']]],
 ['ADMISSIONS','clipboard-check',[['prescreening.html','Prescreening','clipboard-check'],['pending-admissions.html','Pending Admission','user-plus'],['waitlist.html','Waitlist','list'],['do-not-readmit.html','Do Not Readmit','shield-alert']]],
 ['DAILY OPERATIONS','calendar-days',[['operations.html','Daily Operations','calendar'],['house-chores.html','House Chores','check-square'],['meal-chores.html','Meal Chores','utensils'],['electronics-turn-in.html','Electronics Turn In','smartphone'],['digital-logbook.html','Log Book','book-open'],['assignment-board.html','Assignment Board','layout-grid'],['chore-checks.html','Chore Checks','check-circle'],['bus-passes.html','Bus Passes','ticket'],['tool-signout.html','Tool Signout','wrench']]],
 ['STAFF & RECORDS','contact',[['staff-list.html','Staff Contacts','users'],['staff-profile.html','My Profile','user'],['chat.html','Staff Chat','message-square'],['counseling-notes.html','Counseling Notes','folder'],['incident-report.html','Incident Reports','file-text'],['verbalwarning.html','Warnings','alert-triangle'],['writeups.html','Write-Ups','file-text']]],
 ['REPORTS & ADMIN','chart-column',[['charts.html','Charts','chart-column'],['reports.html','Reports','file-bar-chart'],['audit-log.html','Audit Log','history'],['settings.html','Settings','settings'],['staff-accounts.html','Staff Accounts','user-cog'],['system-health.html','System Health','activity']]]
 ];
 const icons={house:'⌂',users:'♟','layout-dashboard':'▦','clipboard-list':'☷',archive:'▣','clipboard-check':'☑','user-plus':'⊕',list:'☷','shield-alert':'⚑','calendar-days':'▦',calendar:'▦','check-square':'☑',utensils:'♜',smartphone:'▯','book-open':'▤','layout-grid':'▦','check-circle':'✓',ticket:'▤',wrench:'⚒',contact:'▣',user:'♙','message-square':'▤',folder:'▱','file-text':'▤','alert-triangle':'⚠','chart-column':'▥','file-bar-chart':'▥',history:'◷',settings:'⚙','user-cog':'♙',activity:'⌁'};
 const current=location.pathname.split('/').pop()||'dashboard.html';
 const KEY='kbrh-nav-collapsed-v2';
 function init(){
  if(!document.body||document.getElementById('kbrh-sidebar'))return;
  document.body.classList.add('kbrh-sidebar-layout');
  const nav=document.createElement('aside');nav.id='kbrh-sidebar';nav.setAttribute('aria-label','Site navigation');
  const link=([href,label,ico])=>`<a class="kbrh-nav-link" href="${href}" ${href===current?'aria-current="page"':''}><span class="kbrh-nav-icon" aria-hidden="true">${icons[ico]||'•'}</span><span>${label}</span></a>`;
  nav.innerHTML=`<div class="kbrh-sidebar-brand"><span class="kbrh-logo">KBRH</span><small>Ken Brown Recovery Home</small><button id="kbrh-sidebar-collapse" type="button" title="Collapse sidebar" aria-label="Collapse sidebar">☰</button></div><div class="kbrh-sidebar-links">${groups.map(([label,ico,links],i)=>`<details class="kbrh-nav-group" ${i===0||links.some(x=>x[0]===current)?'open':''}><summary><span class="kbrh-nav-icon" aria-hidden="true">${icons[ico]}</span><span class="kbrh-nav-group-name">${label}</span><span class="kbrh-nav-chevron" aria-hidden="true">⌄</span></summary><div class="kbrh-nav-items">${links.map(link).join('')}</div></details>`).join('')}</div>`;
  document.body.insertAdjacentElement('afterbegin',nav);
  const navStyle=document.createElement('style');navStyle.id='kbrh-sidebar-header-restore';navStyle.textContent='#kbrh-sidebar .kbrh-nav-group>summary{background:linear-gradient(100deg,#105494,#0b417a)!important;color:#fff!important;border:1px solid rgba(112,184,255,.22)!important;border-radius:10px!important;padding:12px 14px!important;font-weight:800!important;display:flex!important;align-items:center!important;gap:11px!important;cursor:pointer!important}#kbrh-sidebar .kbrh-nav-group>summary .kbrh-nav-chevron{margin-left:auto!important;color:white!important}#kbrh-sidebar .kbrh-nav-group{margin:12px 0 14px!important}#kbrh-sidebar .kbrh-nav-items a[aria-current=page]{background:#1973d0!important;color:white!important}';document.head.appendChild(navStyle);
  const finalCSS=document.createElement('style');finalCSS.id='kbrh-nav-final';finalCSS.textContent=`
  #kbrh-sidebar{background:linear-gradient(180deg,#06182d,#0a2744)!important}
  #kbrh-sidebar .kbrh-nav-group>summary{display:flex!important;background:linear-gradient(105deg,#155c9d,#0d437a)!important;color:#fff!important;border-radius:10px!important;padding:12px 13px!important;margin:0!important;box-shadow:0 2px 5px #00132640!important;letter-spacing:.025em!important}
  #kbrh-sidebar .kbrh-nav-group>summary:hover{background:linear-gradient(105deg,#1b72bd,#15508b)!important}
  #kbrh-sidebar .kbrh-nav-group>summary .kbrh-nav-chevron{margin-left:auto!important;font-size:20px!important;transform:rotate(-90deg)!important}
  #kbrh-sidebar .kbrh-nav-group[open]>summary .kbrh-nav-chevron{transform:rotate(0)!important}
  #kbrh-sidebar .kbrh-nav-items a{background:transparent!important;color:#eaf3ff!important}
  #kbrh-sidebar .kbrh-nav-items a[aria-current=page]{background:#1973d0!important;color:white!important}
  #kbrh-sidebar #kbrh-sidebar-collapse{display:block!important;color:#fff!important;background:#155c9d!important;border:1px solid #719cc7!important}
  body.kbrh-nav-collapsed #kbrh-menu-toggle{display:block!important}
  @media(max-width:900px){body.kbrh-sidebar-layout #kbrh-menu-toggle{display:block!important}body.kbrh-sidebar-layout.kbrh-nav-open #kbrh-sidebar{transform:translateX(0)!important}}
  `;document.head.appendChild(finalCSS);
  const toggle=document.createElement('button');toggle.id='kbrh-menu-toggle';toggle.type='button';toggle.setAttribute('aria-label','Open navigation');toggle.textContent='☰ Menu';document.body.appendChild(toggle);
  const restore=()=>{try{return localStorage.getItem(KEY)==='1'}catch{return false}};
  const persist=(v)=>{try{localStorage.setItem(KEY,v?'1':'0')}catch{}};
  if(restore())document.body.classList.add('kbrh-nav-collapsed');
  function collapse(){const collapsed=document.body.classList.toggle('kbrh-nav-collapsed');document.body.classList.remove('kbrh-nav-open');persist(collapsed);nav.querySelector('#kbrh-sidebar-collapse').setAttribute('aria-label',collapsed?'Expand sidebar':'Collapse sidebar');}
  nav.querySelector('#kbrh-sidebar-collapse').addEventListener('click',collapse);
  toggle.onclick=()=>{
   if(document.body.classList.contains('kbrh-nav-collapsed')){
    document.body.classList.remove('kbrh-nav-collapsed');persist(false);
   }
   document.body.classList.toggle('kbrh-nav-open');
  };
  nav.addEventListener('click',e=>{if(e.target.closest('a'))document.body.classList.remove('kbrh-nav-open')});
  document.querySelectorAll('header nav.app-nav').forEach(el=>el.remove());
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();