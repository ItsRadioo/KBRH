/* KBRH Professional v5 — non-destructive UI composition layer */
(() => {
  "use strict";

  const PAGE_META = {
    "page-roster": ["Resident Management", "Client Roster", "Manage active residents, placements, status, and archived records."],
    "page-waitlist": ["Admissions", "Waitlist", "Prioritize applicants, track call-ins, offers, and admission readiness."],
    "page-index": ["Operations", "House Chores", "Manage resident chore assignments, exceptions, leave, and rotation history."],
    "page-meal-chores": ["Operations", "Meal Chores", "Build and maintain the weekly resident meal-duty schedule."],
    "page-verbalwarning": ["Case Management", "Verbal Warnings", "Record and review resident verbal warnings."],
    "page-writeups": ["Case Management", "Write-Up Tracker", "Track resident write-ups and supporting details in one place."],
    "page-chore-checks": ["Operations", "Chore Check Tracker", "Complete daily area and resident-room inspections and review history."],
    "page-prescreening": ["Admissions", "Pre-Screening", "Guide offer-ready applicants through the admission pre-screening workflow."],
    "page-incident-report": ["Safety & Compliance", "Incident Reports", "Document, review, and retain confidential resident incident reports."],
    "page-counseling-notes": ["Case Management", "Counseling Notes", "Record resident counselling interactions and review archived notes."],
    "page-audit-log": ["Administration", "Audit Log", "Review authenticated staff activity across the system."],
    "page-staff-profile": ["Administration", "Staff Profile", "Manage the staff identity attached to your account activity."],
    "page-staff-list": ["Administration", "Staff Contacts", "Quick access to active staff names and primary phone numbers."]
  };

  function currentPageClass() {
    return Object.keys(PAGE_META).find(c => document.body.classList.contains(c));
  }

  function buildHero() {
    const pageClass = currentPageClass();
    const main = document.querySelector("main");
    if (!pageClass || !main || main.querySelector(".v5-page-hero")) return;

    const [eyebrow, title, description] = PAGE_META[pageClass];
    const hero = document.createElement("section");
    hero.className = "v5-page-hero";
    hero.innerHTML = `
      <div class="v5-page-hero-copy">
        <p class="v5-eyebrow">${eyebrow}</p>
        <h1>${title}</h1>
        <p>${description}</p>
      </div>
      <div class="v5-page-hero-badge" id="v5StaffBadge">Signed in</div>
    `;
    main.prepend(hero);
  }

  function classifyCards() {
    document.querySelectorAll("main .card").forEach(card => {
      if (card.querySelector("table")) card.classList.add("v5-data-card");
      if (card.querySelector("input, select, textarea") && !card.querySelector("table")) card.classList.add("v5-form-card");
    });
  }

  function enhanceActionCard() {
    const actionCard = document.querySelector("main .page-action-card");
    if (!actionCard) return;
    const titleBlock = actionCard.querySelector(".card-heading-row > div:first-child");
    if (titleBlock) titleBlock.classList.add("v5-redundant-title");
    const row = actionCard.querySelector(".card-heading-row");
    if (row) row.style.justifyContent = "flex-end";
  }

  function textCount(selector) {
    return document.querySelectorAll(selector).length;
  }

  function addWaitlistKpis() {
    const main = document.querySelector("main");
    if (!main || !document.body.classList.contains("page-waitlist") || main.querySelector(".v5-kpi-strip")) return;
    const strip = document.createElement("section");
    strip.className = "v5-kpi-strip";
    strip.innerHTML = `
      <article class="v5-kpi"><span class="v5-kpi-label">Active Applicants</span><strong class="v5-kpi-value" data-kpi="active">0</strong><span class="v5-kpi-detail">Current waitlist</span></article>
      <article class="v5-kpi"><span class="v5-kpi-label">Offers Given</span><strong class="v5-kpi-value" data-kpi="offers">0</strong><span class="v5-kpi-detail">Awaiting admission workflow</span></article>
      <article class="v5-kpi"><span class="v5-kpi-label">Follow-Up</span><strong class="v5-kpi-value" data-kpi="followup">0</strong><span class="v5-kpi-detail">Two consecutive no-calls</span></article>
      <article class="v5-kpi"><span class="v5-kpi-label">Archived</span><strong class="v5-kpi-value" data-kpi="archived">0</strong><span class="v5-kpi-detail">Historical applicants</span></article>
    `;
    const hero = main.querySelector(".v5-page-hero");
    hero?.insertAdjacentElement("afterend", strip);

    const update = () => {
      const activeRows = [...document.querySelectorAll("#waitlistBody tr")].filter(r => !r.querySelector("td[colspan]"));
      const archivedRows = [...document.querySelectorAll("#archivedWaitlistBody tr")].filter(r => !r.querySelector("td[colspan]"));
      const offers = activeRows.filter(r => /offer given/i.test(r.textContent || "")).length;
      const followup = activeRows.filter(r => r.classList.contains("waitlist-follow-up-row")).length;
      strip.querySelector('[data-kpi="active"]').textContent = String(activeRows.length);
      strip.querySelector('[data-kpi="offers"]').textContent = String(offers);
      strip.querySelector('[data-kpi="followup"]').textContent = String(followup);
      strip.querySelector('[data-kpi="archived"]').textContent = String(archivedRows.length);
    };
    update();
    [document.getElementById("waitlistBody"), document.getElementById("archivedWaitlistBody")].filter(Boolean).forEach(node => {
      new MutationObserver(update).observe(node,{childList:true,subtree:true,attributes:true});
    });
  }

  function addRosterKpis() {
    const main = document.querySelector("main");
    const summary = document.querySelector(".roster-summary");
    if (!main || !summary || main.querySelector(".v5-roster-secondary-kpis")) return;
    const strip = document.createElement("section");
    strip.className = "v5-kpi-strip v5-roster-secondary-kpis";
    strip.innerHTML = `
      <article class="v5-kpi"><span class="v5-kpi-label">Phase 2</span><strong class="v5-kpi-value" data-kpi="phase2">0</strong><span class="v5-kpi-detail">Current Phase 2 clients</span></article>
      <article class="v5-kpi"><span class="v5-kpi-label">Archived</span><strong class="v5-kpi-value" data-kpi="archived">0</strong><span class="v5-kpi-detail">Historical roster records</span></article>
      <article class="v5-kpi"><span class="v5-kpi-label">Beds Available</span><strong class="v5-kpi-value" data-kpi="beds">18</strong><span class="v5-kpi-detail">Phase 1 capacity</span></article>
    `;
    summary.insertAdjacentElement("afterend",strip);
    const update = () => {
      const p2 = [...document.querySelectorAll("#phase2RosterBody tr")].filter(r => !r.querySelector("td[colspan]")).length;
      const archived = [...document.querySelectorAll("#archivedRosterBody tr")].filter(r => !r.querySelector("td[colspan]")).length;
      const p1Text = document.getElementById("phase1ResidentCount")?.textContent || "0";
      const p1 = Number.parseInt(p1Text,10) || 0;
      strip.querySelector('[data-kpi="phase2"]').textContent = String(p2);
      strip.querySelector('[data-kpi="archived"]').textContent = String(archived);
      strip.querySelector('[data-kpi="beds"]').textContent = String(Math.max(0,18-p1));
    };
    update();
    ["phase2RosterBody","archivedRosterBody","phase1ResidentCount"].map(id=>document.getElementById(id)).filter(Boolean).forEach(node=>new MutationObserver(update).observe(node,{childList:true,subtree:true,characterData:true}));
  }

  function modernizeTables() {
    document.querySelectorAll(".table-wrap").forEach(wrap => wrap.setAttribute("role","region"));
  }


  function addSidebarToggle() {
    if (document.querySelector(".v5-sidebar-toggle")) return;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "v5-sidebar-toggle";
    button.setAttribute("aria-label", "Hide navigation menu");
    button.setAttribute("aria-expanded", "true");
    button.title = "Hide menu";
    button.textContent = "‹";
    document.body.appendChild(button);

    const key = "kbrh.sidebarCollapsed";
    const applyState = collapsed => {
      document.body.classList.toggle("v5-sidebar-collapsed", collapsed);
      button.textContent = collapsed ? "›" : "‹";
      button.title = collapsed ? "Show menu" : "Hide menu";
      button.setAttribute("aria-label", collapsed ? "Show navigation menu" : "Hide navigation menu");
      button.setAttribute("aria-expanded", collapsed ? "false" : "true");
    };

    let collapsed = false;
    try { collapsed = localStorage.getItem(key) === "true"; } catch (_) {}
    applyState(collapsed);

    button.addEventListener("click", () => {
      collapsed = !document.body.classList.contains("v5-sidebar-collapsed");
      applyState(collapsed);
      try { localStorage.setItem(key, String(collapsed)); } catch (_) {}
      window.dispatchEvent(new Event("resize"));
    });
  }

  function init() {
    if (document.body.classList.contains("page-login") || document.body.classList.contains("page-print") || document.body.classList.contains("page-meal-print")) return;
    document.body.classList.add("kbrh-v5");
    addSidebarToggle();
    buildHero();
    classifyCards();
    enhanceActionCard();
    modernizeTables();
    addWaitlistKpis();
    addRosterKpis();
    const updateStaffBadge=()=>{const badge=document.getElementById("v5StaffBadge");if(badge&&typeof currentStaffName==="function")badge.textContent=`Signed in: ${currentStaffName()}`;};
    updateStaffBadge(); window.addEventListener("kbrhStaffProfileReady",updateStaffBadge);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();

/* v5.5 usability layer */
(() => {
  "use strict";
  const NAV_GROUPS = [
    ["Residents", ["dashboard.html","roster.html","waitlist.html","prescreening.html"]],
    ["Daily Operations", ["index.html","meal-chores.html","chore-checks.html","charts.html"]],
    ["Documentation", ["incident-report.html","verbalwarning.html","writeups.html","counseling-notes.html"]],
    ["Staff", ["staff-list.html","audit-log.html","staff-profile.html","settings.html"]]
  ];
  const labels={"dashboard.html":"Dashboard"};
  function basename(h){try{return new URL(h,location.href).pathname.split('/').pop()||'index.html';}catch(_){return h;}}
  function groupNavigation(){
    const nav=document.querySelector('.app-nav'); if(!nav||nav.dataset.v55Grouped) return;
    nav.dataset.v55Grouped='1';
    if(![...nav.querySelectorAll('a')].some(a=>basename(a.href)==='dashboard.html')){
      const a=document.createElement('a'); a.className='app-nav-link'; a.href='dashboard.html'; a.textContent='Dashboard'; nav.prepend(a);
    }
    const links=[...nav.querySelectorAll(':scope > a.app-nav-link')];
    const map=new Map(links.map(a=>[basename(a.getAttribute('href')||a.href),a]));
    nav.innerHTML='';
    NAV_GROUPS.forEach(([title,files],i)=>{
      const section=document.createElement('section'); section.className='v55-nav-group';
      const head=document.createElement('button'); head.type='button'; head.className='v55-nav-group-title'; head.innerHTML=`<span>${title}</span><span aria-hidden="true">⌄</span>`;
      const body=document.createElement('div'); body.className='v55-nav-group-links';
      files.forEach(file=>{const a=map.get(file); if(a){if(labels[file])a.textContent=labels[file]; body.appendChild(a); map.delete(file);}});
      if(body.children.length){section.append(head,body);nav.appendChild(section); const key='kbrh.nav.'+title; let open=true; try{open=localStorage.getItem(key)!=='closed';}catch(_){}; section.classList.toggle('is-collapsed',!open); head.setAttribute('aria-expanded',String(open)); head.onclick=()=>{const next=!section.classList.contains('is-collapsed');section.classList.toggle('is-collapsed',next);head.setAttribute('aria-expanded',String(!next));try{localStorage.setItem(key,next?'closed':'open');}catch(_){}};}
    });
    map.forEach(a=>nav.appendChild(a));
  }
  function addGlobalSearch(){
    if(document.querySelector('.v55-global-search')) return;
    const header=document.querySelector('.header-top'); if(!header) return;
    const wrap=document.createElement('div'); wrap.className='v55-global-search';
    wrap.innerHTML=`<input type="search" aria-label="Search residents or applicants" placeholder="Search residents or applicants…"><div class="v55-search-results" hidden></div>`;
    const logout=header.querySelector('.logout-btn'); header.insertBefore(wrap,logout||null);
    const input=wrap.querySelector('input'), results=wrap.querySelector('.v55-search-results'); let timer;
    input.addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(async()=>{const q=input.value.trim().toLowerCase();if(q.length<2){results.hidden=true;return;}try{const s=await loadAppState();const people=[];(s.roster||[]).forEach(p=>{if(!p.archived)people.push({kind:'Resident',name:`${p.firstName||''} ${p.lastName||''}`.trim(),detail:p.roomNumber?`Room ${p.roomNumber}`:'Active roster',href:'roster.html'});});(s.waitlist||[]).forEach(p=>{people.push({kind:p.archived?'Archived Applicant':'Applicant',name:`${p.firstName||''} ${p.lastName||''}`.trim(),detail:p.archived?'Archived waitlist':'Current waitlist',href:'waitlist.html'});});const hits=people.filter(p=>(p.name+' '+p.detail).toLowerCase().includes(q)).slice(0,8);results.innerHTML=hits.length?hits.map(p=>`<a href="${p.href}?search=${encodeURIComponent(p.name)}"><strong>${escapeV55(p.name)}</strong><span>${p.kind} · ${escapeV55(p.detail)}</span></a>`).join(''):'<div class="v55-search-empty">No matching person found.</div>';results.hidden=false;}catch(e){results.innerHTML='<div class="v55-search-empty">Search unavailable.</div>';results.hidden=false;}},180);});
    document.addEventListener('click',e=>{if(!wrap.contains(e.target))results.hidden=true;});
  }
  function escapeV55(v){return String(v||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function stickyHeaders(){document.querySelectorAll('.table-wrap table').forEach(t=>t.classList.add('v55-sticky-table'));}
  function init55(){if(document.body.classList.contains('page-login')||document.body.classList.contains('page-print')||document.body.classList.contains('page-meal-print'))return;document.body.classList.add('kbrh-v55');groupNavigation();addGlobalSearch();stickyHeaders();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init55);else init55();
})();
