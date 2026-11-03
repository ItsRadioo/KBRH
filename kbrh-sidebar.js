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
  if(!document.body || document.getElementById('kbrh-sidebar'))return;
  if(document.body.classList.contains('login-body') || document.body.classList.contains('page-print') || document.body.classList.contains('page-meal-print'))return;
  const nav=document.createElement('aside');
  nav.id='kbrh-sidebar';
  nav.setAttribute('aria-label','Main navigation');
  const link=([href,label,ico])=>`<a href="${href}" ${href===current?'aria-current="page"':''}><span aria-hidden="true">${icons[ico]||'•'}</span>${label}</a>`;
  nav.innerHTML=`<div class="kbrh-sidebar-brand"><strong>KBRH</strong><small>Ken Brown Recovery Home</small></div><div class="kbrh-sidebar-links">${groups.map(([label,ico,links],i)=>`<details class="kbrh-nav-group" ${i===0||links.some(x=>x[0]===current)?'open':''}><summary><span aria-hidden="true">${icons[ico]||'•'}</span><span>${label}</span><span class="kbrh-chevron" aria-hidden="true">›</span></summary><div class="kbrh-nav-items">${links.map(link).join('')}</div></details>`).join('')}</div><button id="kbrh-sidebar-logout" type="button">Sign Out</button>`;
  document.body.prepend(nav);
  document.querySelectorAll('.v5-sidebar-toggle,#kbrh-menu-toggle,header .app-nav').forEach(el=>el.remove());
  const toggle=document.createElement('button');
  toggle.id='kbrh-sidebar-edge-toggle';toggle.type='button';
  document.body.append(toggle);
  const css=document.createElement('style');css.id='kbrh-single-sidebar-css';
  css.textContent=`
  /* One fixed sidebar; the actual header and main stay in document flow. */
  body.kbrh-single-sidebar{--kbrh-nav-width:260px;padding-left:var(--kbrh-nav-width)!important;margin:0!important;box-sizing:border-box!important;min-width:0!important}
  body.kbrh-single-sidebar.kbrh-nav-collapsed{padding-left:0!important}
  body.kbrh-single-sidebar>header,body.kbrh-single-sidebar>main,body.kbrh-single-sidebar>footer{box-sizing:border-box!important;position:relative!important;left:auto!important;right:auto!important;transform:none!important;visibility:visible!important;opacity:1!important;max-width:100%!important;width:100%!important}
  body.kbrh-single-sidebar>header{display:block!important;margin:0!important}
  body.kbrh-single-sidebar>main{display:grid!important;grid-template-columns:repeat(12,minmax(0,1fr))!important;margin:16px 0 36px!important;padding:0 18px!important;min-width:0!important;width:100%!important;max-width:none!important}
  body.kbrh-single-sidebar>main>*{min-width:0}
  .kbrh-page-title{margin:0 0 18px;padding:14px 18px;background:#0b2b4d;border-radius:10px;color:white}.kbrh-page-title h1{margin:0;color:white;font-size:clamp(22px,2.3vw,32px)}
  /* Content width follows the sidebar state; preserve the site's 12-column grid. */
  html{overflow-x:hidden}
  body.kbrh-single-sidebar{width:100%!important;max-width:none!important}
  body.kbrh-single-sidebar>main{
    display:grid!important;
    grid-template-columns:repeat(12,minmax(0,1fr))!important;
    width:100%!important;max-width:none!important;
    margin:16px 0 36px!important;padding:0 18px!important;
    box-sizing:border-box!important;min-width:0!important;
  }
  body.kbrh-single-sidebar.kbrh-nav-collapsed>main{
    width:100%!important;max-width:none!important;
    margin-left:0!important;margin-right:0!important;
    padding-left:18px!important;padding-right:18px!important;
  }
  body.kbrh-single-sidebar>main>.kbrh-page-title{grid-column:1/-1!important}
  body.kbrh-single-sidebar>main>*{max-width:100%;min-width:0}
  #kbrh-sidebar{position:fixed!important;top:0!important;bottom:0!important;left:0!important;width:260px!important;z-index:10000!important;box-sizing:border-box!important;overflow-y:auto!important;padding:14px 12px!important;background:linear-gradient(180deg,#06182d,#0a2744)!important;color:white!important;display:flex!important;flex-direction:column!important;transform:translateX(0)!important;transition:transform .2s ease!important}
  body.kbrh-nav-collapsed #kbrh-sidebar{transform:translateX(-100%)!important;pointer-events:none!important}
  #kbrh-sidebar .kbrh-sidebar-brand{text-align:center;padding:22px 4px;border-bottom:1px solid #ffffff40;margin-bottom:18px!important}
  #kbrh-sidebar .kbrh-sidebar-brand strong{display:block;font-size:29px!important;color:white!important}
  #kbrh-sidebar .kbrh-sidebar-brand small{display:block;font-size:12px;color:#dbeafe!important}
  #kbrh-sidebar .kbrh-sidebar-links{flex:1!important}
  #kbrh-sidebar .kbrh-nav-group{margin:12px 0 22px!important}
  #kbrh-sidebar .kbrh-nav-group>summary{list-style:none!important;cursor:pointer!important;display:flex!important;align-items:center!important;gap:12px!important;background:linear-gradient(105deg,#155c9d,#0d437a)!important;color:white!important;padding:13px!important;border-radius:10px!important;font-size:13px!important;font-weight:800!important}
  #kbrh-sidebar .kbrh-nav-group>summary::-webkit-details-marker{display:none}
  #kbrh-sidebar .kbrh-chevron{margin-left:auto!important;font-size:22px!important;transition:transform .2s!important}
  #kbrh-sidebar details[open] .kbrh-chevron{transform:rotate(90deg)!important}
  #kbrh-sidebar .kbrh-nav-items{padding:7px 0 0 15px!important}
  #kbrh-sidebar .kbrh-nav-items a{display:flex!important;gap:12px!important;align-items:center!important;color:#eaf3ff!important;text-decoration:none!important;padding:12px 13px!important;border-radius:8px!important;font-weight:650!important;font-size:14px!important}
  #kbrh-sidebar .kbrh-nav-items a[aria-current="page"]{background:#1973d0!important;color:#fff!important}
  #kbrh-sidebar-logout{width:100%!important;background:#ffffff18!important;color:white!important;border:1px solid #ffffff40!important;border-radius:9px!important;padding:11px!important;cursor:pointer!important}
  #kbrh-sidebar-edge-toggle{position:fixed!important;top:50%!important;left:260px!important;transform:translateY(-50%)!important;z-index:10001!important;width:26px!important;height:60px!important;background:#087c78!important;color:white!important;border:0!important;border-radius:0 9px 9px 0!important;font-size:25px!important;cursor:pointer!important;transition:left .2s!important}
  body.kbrh-nav-collapsed #kbrh-sidebar-edge-toggle{left:0!important}
  .v5-sidebar-toggle,#kbrh-menu-toggle,header .app-nav{display:none!important}


  /* Authoritative layout: older UI code must not reserve a phantom sidebar. */
  html body.kbrh-single-sidebar.kbrh-nav-collapsed,
  html body.kbrh-single-sidebar.kbrh-nav-collapsed.kbrh-sidebar-layout,
  html body.kbrh-single-sidebar.kbrh-nav-collapsed.kbrh-v5{
    padding-left:0!important;margin-left:0!important;width:100%!important;max-width:none!important;
  }
  html body.kbrh-single-sidebar:not(.kbrh-nav-collapsed),
  html body.kbrh-single-sidebar:not(.kbrh-nav-collapsed).kbrh-sidebar-layout{
    padding-left:260px!important;margin-left:0!important;width:100%!important;max-width:none!important;
  }
  html body.kbrh-single-sidebar>main,
  html body.kbrh-single-sidebar.kbrh-nav-collapsed>main{
    position:relative!important;left:0!important;right:auto!important;transform:none!important;
    width:100%!important;max-width:none!important;margin-left:0!important;margin-right:0!important;
    box-sizing:border-box!important;
  }
  html body.kbrh-single-sidebar>main>section,
  html body.kbrh-single-sidebar>main>.card,
  html body.kbrh-single-sidebar>main>.v5-page-hero,
  html body.kbrh-single-sidebar>main>.roster-summary{
    grid-column:1/-1!important;width:100%!important;max-width:none!important;min-width:0!important;
  }
  @media print{body.kbrh-single-sidebar{padding-left:0!important}#kbrh-sidebar,#kbrh-sidebar-edge-toggle{display:none!important}}
  `;
  document.head.append(css);
  document.body.classList.remove('kbrh-sidebar-layout','v5-sidebar-collapsed','kbrh-nav-open');
  document.body.classList.add('kbrh-single-sidebar');document.body.style.setProperty('--v5-sidebar','0px','important');
  const read=()=>{try{return localStorage.getItem(KEY)==='1'}catch{return false}};
  const save=v=>{try{localStorage.setItem(KEY,v?'1':'0')}catch{}};
  const sync=()=>{const closed=document.body.classList.contains('kbrh-nav-collapsed');toggle.textContent=closed?'›':'‹';toggle.setAttribute('aria-label',closed?'Open navigation':'Collapse navigation');toggle.setAttribute('aria-expanded',String(!closed));};
  document.body.classList.toggle('kbrh-nav-collapsed',read());
  toggle.addEventListener('click',()=>{const closed=document.body.classList.toggle('kbrh-nav-collapsed');save(closed);sync()});
  nav.querySelector('#kbrh-sidebar-logout').addEventListener('click',()=>{const b=document.querySelector('header .logout-btn');if(b)b.click();else if(typeof window.logout==='function')window.logout()});
  sync();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
