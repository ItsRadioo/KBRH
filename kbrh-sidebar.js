(()=>{
 const groups=[
 ['MAIN','house',[['dashboard.html','Dashboard','layout-dashboard'],['waitlist.html','Waitlist','list'],['digital-logbook.html','Log Book','book-open']]],
 ['ADMISSIONS','clipboard-check',[['prescreening.html','Prescreening','clipboard-check'],['pending-admissions.html','Pending Admission','user-plus'],['do-not-readmit.html','Do Not Readmit','shield-alert']]],
 ['RESIDENTS','users',[['roster.html','Phase 1','users'],['phase2.html','Phase 2','users'],['roster-archive.html','Resident Archive','archive']]],
 ['HOUSE OPERATIONS','calendar-days',[['operations.html','Daily Operations','calendar'],['assignment-board.html','Assignment Board','layout-grid'],['bed-readiness.html','Bed Readiness','check-square'],['bus-passes.html','Bus Passes','ticket'],['tool-signout.html','Tool Signout','wrench']]],
 ['CHORES & CHECKLISTS','check-square',[['house-chores.html','House Chores','check-square'],['meal-chores.html','Meal Chores','utensils'],['chore-checks.html','Chore Checks','check-circle'],['electronics-turn-in.html','Electronics Turn-In','smartphone'],['charts.html','Resident Checklists','chart-column']]],
 ['RESIDENT RECORDS','file-text',[['incident-report.html','Incident Reports','file-text'],['verbalwarning.html','Verbal Warnings','alert-triangle'],['writeups.html','Write-Up Counts','file-text']]],
 ['STAFF','contact',[['staff-list.html','Staff Contacts','users'],['chat.html','Staff Chat','message-square'],['staff-profile.html','My Profile','user']]],
 ['REPORTS & ADMIN','chart-column',[['urine-tests.html','House-Wide Urine Tests','check-square'],['reports.html','Reports','file-bar-chart'],['audit-log.html','Audit Log','history'],['settings.html','Settings','settings'],['staff-accounts.html','Staff Accounts','user-cog'],['system-health.html','System Health','activity']]]
 ];
 // Consistent local outline icons; no font or external image request required.
 const icons={
 house:'<path d="m3 10 9-7 9 7v10H3Z"/><path d="M9 20v-7h6v7"/>',
 users:'<circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3m1-16a3 3 0 0 1 0 6m2 3a6 6 0 0 1 3 5v2"/>',
 user:'<circle cx="12" cy="7" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',
 'layout-dashboard':'<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/>',
 'clipboard-check':'<rect x="5" y="5" width="14" height="16" rx="2"/><rect x="9" y="2" width="6" height="5" rx="1"/><path d="m9 14 2 2 4-4"/>',
 'user-plus':'<circle cx="9" cy="7" r="4"/><path d="M2 21v-2a7 7 0 0 1 14 0v2m3-14v6m-3-3h6"/>',
 list:'<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
 archive:'<rect x="3" y="3" width="18" height="5" rx="1"/><path d="M5 8v13h14V8m-10 5h6"/>',
 'shield-alert':'<path d="m12 2 9 4v6c0 5-9 10-9 10S3 17 3 12V6Zm0 5v6m0 4h.01"/>',
 calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 2v6m10-6v6M3 11h18"/>',
 'check-square':'<rect x="3" y="3" width="18" height="18" rx="2"/><path d="m7 12 3 3 7-7"/>',
 utensils:'<path d="M4 3v6a3 3 0 0 0 6 0V3M7 3v18m13 0V3c-5 2-5 10 0 10"/>',
 smartphone:'<rect x="6" y="2" width="12" height="20" rx="2"/><path d="M11 18h2"/>',
 'book-open':'<path d="M12 5C8 2 3 3 2 4v16c3-2 7-1 10 1 3-2 7-3 10-1V4c-3-2-7-1-10 1Zm0 0v16"/>',
 'layout-grid':'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
 'check-circle':'<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
 ticket:'<path d="M3 5h18v5a2 2 0 0 0 0 4v5H3v-5a2 2 0 0 0 0-4Zm12 0v3m0 3v2m0 3v3"/>',
 wrench:'<path d="M21 3a6 6 0 0 1-7 8L5 21l-3-3 10-9a6 6 0 0 1 8-7l-4 4 2 2Z"/>',
 'message-square':'<path d="M21 3H3v14h5l4 4 4-4h5Z"/>',
 'file-text':'<path d="M5 2h10l4 4v16H5Zm9 0v6h5M8 12h8m-8 4h8"/>',
 'alert-triangle':'<path d="m12 3 10 18H2Zm0 6v5m0 3h.01"/>',
 'chart-column':'<path d="M3 3v18h18M7 16v-5m5 5V6m5 10v-8"/>',
 history:'<path d="M3 10a9 9 0 1 1 1 7M3 3v7h7m2-4v6l4 2"/>',
 settings:'<path d="m9 3-1 3-3 1-2 4 2 2v4l4 2 3-1 3 1 4-2v-4l2-2-2-4-3-1-1-3Z"/><circle cx="12" cy="11" r="3"/>',
 activity:'<path d="M2 12h5l3-9 4 18 3-9h5"/>'
 };
 icons['calendar-days']=icons.calendar;icons.contact=icons.users;icons['user-cog']=icons.user;icons['file-bar-chart']=icons['chart-column'];
 const icon=key=>`<svg class="kbrh-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[key]||icons['file-text']}</svg>`;
 const SECTION_KEY='kbrh-nav-sections-v3';
 let sectionState={};try{const value=JSON.parse(localStorage.getItem(SECTION_KEY)||'{}');if(value&&typeof value==='object'&&!Array.isArray(value))sectionState=value;}catch{}
 const sectionOpen=(label,links,index)=>links.some(x=>x[0]===current)||(typeof sectionState[label]==='boolean'?sectionState[label]:index===0);
 const current=location.pathname.split('/').pop()||'dashboard.html';
 const KEY='kbrh-nav-collapsed-v2';

 function init(){
  // Floating chat is an embedded tool, not a second copy of the site shell.
  if(current==='chat.html' && (new URLSearchParams(location.search).get('floating')==='1' || window.self!==window.top))return;
  if(!document.body || document.getElementById('kbrh-sidebar'))return;
  if(document.body.classList.contains('login-body') || document.body.classList.contains('page-print') || document.body.classList.contains('page-meal-print'))return;
  const nav=document.createElement('aside');
  nav.id='kbrh-sidebar';
  nav.setAttribute('aria-label','Main navigation');
  const link=([href,label,ico])=>`<a href="${href}" ${href===current?'aria-current="page"':''}><span aria-hidden="true">${icon(ico)}</span>${label}</a>`;
  nav.innerHTML=`<div class="kbrh-sidebar-brand"><strong>KBRH</strong><small>Ken Brown Recovery Home</small></div><label class="kbrh-nav-search"><span>Find a page</span><input id="kbrh-nav-search" type="search" placeholder="Search menu…" autocomplete="off" aria-controls="kbrh-sidebar-pages"></label><p id="kbrh-nav-empty" role="status" hidden>No matching pages.</p><div class="kbrh-sidebar-links" id="kbrh-sidebar-pages">${groups.map(([label,ico,links],i)=>`<details class="kbrh-nav-group" data-section="${label}" ${sectionOpen(label,links,i)?'open':''}><summary><span aria-hidden="true">${icon(ico)}</span><span>${label}</span><span class="kbrh-chevron" aria-hidden="true">›</span></summary><div class="kbrh-nav-items">${links.map(link).join('')}</div></details>`).join('')}</div><button id="kbrh-sidebar-logout" type="button">Sign Out</button>`;
  document.body.prepend(nav);
  const search=nav.querySelector('#kbrh-nav-search');
  const applySearch=()=>{
    const query=search.value.trim().toLowerCase();let visible=0;
    nav.querySelectorAll('details').forEach(group=>{
      let matches=0;
      group.querySelectorAll('a[href]').forEach(a=>{a.hidden=!a.textContent.toLowerCase().includes(query);if(!a.hidden)matches++;});
      group.hidden=matches===0;visible+=matches;
      group.open=query?matches>0:sectionOpen(group.dataset.section,groups.find(x=>x[0]===group.dataset.section)?.[2]||[],groups.findIndex(x=>x[0]===group.dataset.section));
    });
    nav.querySelector('#kbrh-nav-empty').hidden=visible>0;
  };
  search.addEventListener('input',applySearch);
  search.addEventListener('keydown',event=>{if(event.key==='Escape'){search.value='';applySearch();}});
  nav.querySelectorAll('details').forEach(group=>group.addEventListener('toggle',()=>{
    // Programmatic search expansion must not overwrite the user's preferences.
    if(search.value.trim()||group.open===sectionOpen(group.dataset.section,[], -1))return;
    sectionState[group.dataset.section]=group.open;
    try{localStorage.setItem(SECTION_KEY,JSON.stringify(sectionState));}catch{}
  }));
  const filterAccess=()=>{
    if(typeof kbrhPageAllowed!=="function"||typeof kbrhStaffProfile==="undefined"||!kbrhStaffProfile)return;
    nav.querySelectorAll('a[href]').forEach(a=>{if(!kbrhPageAllowed(a.getAttribute('href'),kbrhStaffProfile))a.remove();});
    nav.querySelectorAll('details').forEach(group=>{if(!group.querySelector('a'))group.remove();});
    applySearch();
  };
  filterAccess();document.addEventListener('kbrhStaffProfileReady',filterAccess);window.addEventListener('kbrhStaffProfileReady',filterAccess);
  document.querySelectorAll('.v5-sidebar-toggle,#kbrh-menu-toggle,header .app-nav').forEach(el=>el.remove());
  const toggle=document.createElement('button');
  toggle.id='kbrh-sidebar-edge-toggle';toggle.type='button';
  document.body.append(toggle);
  const css=document.createElement('style');css.id='kbrh-single-sidebar-css';
  css.textContent=`
  /* One fixed sidebar; the actual header and main stay in document flow. */
  body.kbrh-single-sidebar{--kbrh-nav-width:260px;padding-left:260px!important;margin:0!important;box-sizing:border-box!important;min-width:0!important}
  body.kbrh-single-sidebar.kbrh-nav-collapsed{padding-left:0!important}
  body.kbrh-single-sidebar>header,body.kbrh-single-sidebar>main,body.kbrh-single-sidebar>footer{box-sizing:border-box!important;position:relative!important;left:auto!important;right:auto!important;transform:none!important;visibility:visible!important;opacity:1!important;max-width:100%!important;width:100%!important}
  body.kbrh-single-sidebar>header{display:block!important;margin:0!important}
  body.kbrh-single-sidebar:not(.page-tool-signout)>main{display:grid!important;grid-template-columns:repeat(12,minmax(0,1fr))!important;margin:16px 0 36px!important;padding:0 18px!important;min-width:0!important;width:100%!important;max-width:none!important}
  body.kbrh-single-sidebar>main>*{min-width:0}
  .kbrh-page-title{margin:0 0 18px;padding:14px 18px;background:#0b2b4d;border-radius:10px;color:white}.kbrh-page-title h1{margin:0;color:white;font-size:clamp(22px,2.3vw,32px)}
  /* Content width follows the sidebar state; preserve the site's 12-column grid. */
  html{overflow-x:hidden}
  body.kbrh-single-sidebar{width:100%!important;max-width:none!important}
  body.kbrh-single-sidebar:not(.page-tool-signout)>main{
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
  #kbrh-sidebar .kbrh-sidebar-links{flex:1!important;display:flex!important;flex-direction:column!important;justify-content:flex-start!important;gap:8px!important}
  #kbrh-sidebar .kbrh-nav-group{flex:0 0 auto!important;margin:0!important}
  #kbrh-sidebar .kbrh-nav-group>summary{list-style:none!important;cursor:pointer!important;display:flex!important;align-items:center!important;gap:12px!important;background:#ffffff08!important;color:white!important;padding:11px 10px!important;border-radius:8px!important;font-size:11px!important;letter-spacing:.06em!important;font-weight:700!important}
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


  #kbrh-sidebar .kbrh-nav-icon{display:block;width:19px;height:19px;flex:0 0 19px}
  #kbrh-sidebar .kbrh-sidebar-brand{padding:12px 4px 16px;margin-bottom:14px!important}
  #kbrh-sidebar .kbrh-nav-search{display:grid;gap:6px;margin:0 2px 16px;color:#cad9e8;font-size:12px}
  #kbrh-nav-search{box-sizing:border-box;min-width:0;width:100%;min-height:40px;border:1px solid #ffffff40;border-radius:8px;background:#ffffff0c;color:white;padding:9px 10px;font:inherit}
  #kbrh-nav-search::placeholder{color:#b4c6d9}
  #kbrh-nav-empty{margin:0 4px 14px;font-size:13px;color:#dbeafe}
  #kbrh-sidebar [hidden]{display:none!important}
  #kbrh-sidebar .kbrh-nav-items a{padding:10px!important;font-size:13px!important;line-height:1.4}
  #kbrh-sidebar .kbrh-nav-items a:hover{background:#ffffff12!important}
  #kbrh-sidebar .kbrh-nav-items a[aria-current="page"]{background:#1669b4!important;box-shadow:inset 3px 0 #7dd3fc}
  #kbrh-sidebar :is(a,summary,input,button):focus-visible{outline:2px solid #7dd3fc;outline-offset:2px}

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
  body.kbrh-single-sidebar.page-tool-signout>main.tool-signout-main{
    display:flex!important;flex-direction:column!important;align-items:stretch!important;
    grid-template-columns:none!important;width:100%!important;max-width:none!important;
    min-width:0!important;margin:0!important;padding:20px 24px 48px!important;gap:18px!important;
  }
  body.kbrh-single-sidebar.page-tool-signout>main.tool-signout-main>section.card,
  body.kbrh-single-sidebar.page-tool-signout>main.tool-signout-main>.v5-page-hero{
    display:block!important;grid-column:auto!important;flex:0 0 auto!important;
    width:100%!important;max-width:none!important;min-width:0!important;box-sizing:border-box!important;
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
