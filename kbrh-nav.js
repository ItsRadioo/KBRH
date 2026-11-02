(() => {
 const rosterPages=[["roster.html","Phase 1"],["phase2.html","Phase 2"],["roster-archive.html","Archive"]];
 function install(){
  const nav=document.querySelector("nav.app-nav");if(!nav)return;
  const current=location.pathname.split("/").pop()||"index.html";
  const roster=nav.querySelector('a[href="roster.html"],details.kbrh-roster-nav-dropdown');
  const html=`<details class="kbrh-roster-nav-dropdown"><summary class="app-nav-link${rosterPages.some(([p])=>p===current)?" active":""}">Roster ▾</summary><div class="kbrh-roster-nav-menu">${rosterPages.map(([href,label])=>`<a class="app-nav-link${href===current?" active":""}" href="${href}">${label}</a>`).join("")}</div></details>`;
  if(roster)roster.outerHTML=html;
  else nav.insertAdjacentHTML("afterbegin",html);
  if(!nav.querySelector('a[href="electronics-turn-in.html"]'))nav.insertAdjacentHTML("beforeend",'<a class="app-nav-link" href="electronics-turn-in.html">Electronics Turn-In</a>');
  const electronics=nav.querySelector('a[href="electronics-turn-in.html"]');
  if(electronics&&current==="electronics-turn-in.html")electronics.classList.add("active");
  if(!document.getElementById("kbrh-roster-nav-style")){
   const style=document.createElement("style");style.id="kbrh-roster-nav-style";
   style.textContent=`nav.app-nav .kbrh-roster-nav-dropdown{position:relative;display:inline-flex;z-index:100;align-items:center}
nav.app-nav .kbrh-roster-nav-dropdown>summary{display:inline-flex;cursor:pointer;list-style:none}
nav.app-nav .kbrh-roster-nav-dropdown>summary::-webkit-details-marker{display:none}
nav.app-nav .kbrh-roster-nav-menu{position:absolute;top:100%;left:0;z-index:250;min-width:165px;padding:5px;background:white;border:1px solid #cbd5e1;border-radius:9px;box-shadow:0 10px 24px #0003}
nav.app-nav .kbrh-roster-nav-menu a{display:block;padding:10px 12px;color:#17324d;text-decoration:none;white-space:nowrap;border-radius:5px}
nav.app-nav .kbrh-roster-nav-menu a:hover,nav.app-nav .kbrh-roster-nav-menu a.active{background:#e0f2fe;color:#075985}
.roster-view-switch{display:flex;align-items:center;flex-wrap:wrap;gap:9px;margin:14px 0 20px}
.roster-view-switch a{padding:10px 16px;border:1px solid #b9c9d7;border-radius:9px;background:#fff;color:#164e63;text-decoration:none;font-weight:700}
.roster-view-switch a[aria-current=page]{background:#164e63;color:white}
@media(max-width:700px){nav.app-nav .kbrh-roster-nav-menu{left:auto;right:0}}`;
   document.head.appendChild(style);
  }
  if(document.body?.dataset.rosterView&&!document.getElementById("roster-view-switch")){
   const bar=document.createElement("div");bar.id="roster-view-switch";bar.className="roster-view-switch";
   bar.setAttribute("aria-label","Switch roster section");
   bar.innerHTML=rosterPages.map(([href,label])=>`<a href="${href}"${href===current?' aria-current="page"':""}>${label==="Phase 1"?"Phase 1 Roster":label==="Phase 2"?"Phase 2 Roster":"Archive"}</a>`).join("");
   const main=document.querySelector("main");if(main)main.insertAdjacentElement("afterbegin",bar);
   else document.querySelector("header")?.insertAdjacentElement("afterend",bar);
  }
 }
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",install);else install();
})();