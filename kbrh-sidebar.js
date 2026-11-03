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
  document.body.classList.add('kbrh-sidebar-layout');document.body.classList.remove('v5-sidebar-collapsed');
  const nav=document.createElement('aside');nav.id='kbrh-sidebar';nav.setAttribute('aria-label','Site navigation');
  const link=([href,label,ico])=>`<a class="kbrh-nav-link" href="${href}" ${href===current?'aria-current="page"':''}><span class="kbrh-nav-icon" aria-hidden="true">${icons[ico]||'•'}</span><span>${label}</span></a>`;
  nav.innerHTML=`<div class="kbrh-sidebar-brand"><span class="kbrh-logo">KBRH</span><small>Ken Brown Recovery Home</small><button id="kbrh-sidebar-collapse" type="button" title="Collapse sidebar" aria-label="Collapse sidebar">☰</button></div><div class="kbrh-sidebar-links">${groups.map(([label,ico,links],i)=>`<details class="kbrh-nav-group" ${i===0||links.some(x=>x[0]===current)?'open':''}><summary><span class="kbrh-nav-icon" aria-hidden="true">${icons[ico]}</span><span class="kbrh-nav-group-name">${label}</span><span class="kbrh-nav-chevron" aria-hidden="true">⌄</span></summary><div class="kbrh-nav-items">${links.map(link).join('')}</div></details>`).join('')}</div>`;
  document.body.insertAdjacentElement('afterbegin',nav);
  // Preserve page header and its title. Only the generated navigation is replaced.
  const logout=document.createElement('button');
  logout.type='button';logout.id='kbrh-sidebar-logout';logout.textContent='Sign Out';
  logout.addEventListener('click',()=>{const b=document.querySelector('header .logout-btn');if(b)b.click();else if(typeof window.logout==='function')window.logout();});
  nav.appendChild(logout);

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
  // One unified side-edge arrow replaces the legacy and floating Menu buttons.
  document.querySelectorAll('#kbrh-menu-toggle,.v5-sidebar-toggle').forEach(el=>el.remove());
  const arrow=document.createElement('button');
  arrow.id='kbrh-sidebar-edge-toggle';arrow.type='button';
  document.body.appendChild(arrow);
  const restore=()=>{try{return localStorage.getItem(KEY)==='1'}catch{return false}};
  const persist=v=>{try{localStorage.setItem(KEY,v?'1':'0')}catch{}};
  const sync=()=>{
    const hidden=document.body.classList.contains('kbrh-nav-collapsed');
    arrow.textContent=hidden?'›':'‹';
    arrow.title=hidden?'Open navigation':'Collapse navigation';
    arrow.setAttribute('aria-label',arrow.title);
    arrow.setAttribute('aria-expanded',String(!hidden));
    arrow.style.left=hidden?'0px':'274px';
    nav.querySelector('#kbrh-sidebar-collapse').setAttribute('aria-label',arrow.title);
  };
  document.body.classList.toggle('kbrh-nav-collapsed',restore());
  function collapse(){document.body.classList.toggle('kbrh-nav-collapsed');persist(document.body.classList.contains('kbrh-nav-collapsed'));sync();}
  arrow.addEventListener('click',collapse);
  nav.querySelector('#kbrh-sidebar-collapse').remove();
  // Remove the older top/side navigation from the DOM; no duplicate toggle.
  document.querySelectorAll('.v5-sidebar-toggle,#kbrh-menu-toggle,header .app-nav').forEach(el=>el.remove());
  const unify=document.createElement('style');unify.id='kbrh-single-navigation';unify.textContent=`
    .v5-sidebar-toggle,#kbrh-menu-toggle,header .app-nav{display:none!important}
    body.kbrh-sidebar-layout{padding-left:274px!important}
    body.kbrh-sidebar-layout.kbrh-nav-collapsed{padding-left:0!important}
    body.kbrh-sidebar-layout>header,body.kbrh-sidebar-layout>main,body.kbrh-sidebar-layout>footer{transform:none!important;margin-left:0!important;width:100%!important;max-width:none!important}
    body.kbrh-sidebar-layout.kbrh-nav-collapsed>header{padding-left:24px!important}
    #kbrh-sidebar{transform:translateX(0)!important;transition:transform .2s ease!important}
    body.kbrh-nav-collapsed #kbrh-sidebar{transform:translateX(-100%)!important;pointer-events:none!important}
    #kbrh-sidebar-edge-toggle{position:fixed!important;top:50%!important;transform:translateY(-50%)!important;z-index:10050!important;width:26px!important;height:60px!important;border:0!important;border-radius:0 9px 9px 0!important;background:#087c78!important;color:white!important;font-size:24px!important;font-weight:800!important;cursor:pointer!important;box-shadow:2px 2px 10px #0003!important;transition:left .2s ease!important}
    #kbrh-sidebar-edge-toggle:focus-visible{outline:3px solid #60a5fa!important}
    @media(max-width:900px){body.kbrh-sidebar-layout{padding-left:0!important}body.kbrh-sidebar-layout #kbrh-sidebar{transform:translateX(-100%)!important}body.kbrh-sidebar-layout:not(.kbrh-nav-collapsed) #kbrh-sidebar{transform:translateX(0)!important}body.kbrh-sidebar-layout>header{padding-left:24px!important}}
    @media print{#kbrh-sidebar-edge-toggle{display:none!important}}

    body.kbrh-sidebar-layout>header{display:flex!important}
    body.kbrh-sidebar-layout>main{margin-left:0!important;transform:none!important;width:100%!important;max-width:none!important}
    #kbrh-sidebar{display:flex!important;flex-direction:column!important}
    #kbrh-sidebar .kbrh-sidebar-links{flex:1!important}
    #kbrh-sidebar-logout{display:block!important;width:100%!important;padding:11px!important;border:1px solid #ffffff40!important;border-radius:9px!important;background:#ffffff14!important;color:white!important;font-weight:700!important;cursor:pointer!important;margin-top:20px!important}
    @media(max-width:900px){body.kbrh-sidebar-layout>main{margin-left:0!important;width:100%!important}}

    /* The sidebar is fixed; only the main document shifts. Do not hide the page. */
    html,body{overflow-x:hidden!important}
    body.kbrh-sidebar-layout{box-sizing:border-box!important;padding-left:274px!important;margin-left:0!important;min-height:100vh!important}
    body.kbrh-sidebar-layout.kbrh-nav-collapsed{padding-left:0!important}
    body.kbrh-sidebar-layout>header{display:flex!important;position:relative!important;left:auto!important;right:auto!important;top:auto!important;visibility:visible!important;opacity:1!important;transform:none!important;margin:0!important;width:100%!important;max-width:100%!important;box-sizing:border-box!important}
    body.kbrh-sidebar-layout>main{display:grid!important;position:relative!important;left:auto!important;right:auto!important;top:auto!important;visibility:visible!important;opacity:1!important;transform:none!important;margin:20px auto!important;width:100%!important;max-width:100%!important;box-sizing:border-box!important;min-width:0!important}
    body.kbrh-sidebar-layout>footer{position:relative!important;left:auto!important;transform:none!important;width:100%!important;box-sizing:border-box!important}
    #kbrh-sidebar{width:260px!important;left:0!important;right:auto!important;position:fixed!important;top:0!important;bottom:0!important;overflow-y:auto!important;box-sizing:border-box!important;z-index:10000!important}
    #kbrh-sidebar-edge-toggle{left:274px!important}
    body.kbrh-nav-collapsed #kbrh-sidebar-edge-toggle{left:0!important}
    @media(max-width:900px){body.kbrh-sidebar-layout{padding-left:0!important}body.kbrh-sidebar-layout>main{width:100%!important}body.kbrh-sidebar-layout>header{width:100%!important}}
  `;document.head.appendChild(unify);
  sync();
  nav.addEventListener('click',e=>{if(e.target.closest('a'))document.body.classList.remove('kbrh-nav-open')});
  document.querySelectorAll('header nav.app-nav').forEach(el=>el.remove());
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();