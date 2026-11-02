(() => {
  const pages = [
    ["roster.html", "Roster"],
    ["waitlist.html", "Waitlist"],
    ["index.html", "House Chores"],
    ["meal-chores.html", "Meal Chores"],
    ["verbalwarning.html", "Warnings"],
    ["writeups.html", "Write-Ups"],
    ["chore-checks.html", "Chore Checks"],
    ["incident-report.html", "Incident Reports"],
    ["charts.html", "Charts"],
    ["prescreening.html", "Pre-Screening"],
    ["counseling-notes.html", "Counseling Notes"],
    ["operations.html?mode=bus", "Equipment & Transportation"],
    ["electronics-turn-in.html", "Electronics Turn-In"],
    ["staff-list.html", "Staff List"],
    ["audit-log.html", "Audit Log"],
    ["staff-profile.html", "My Profile"],
  ];
  const rosterPages = [
    ["roster.html", "Phase 1 Roster"],
    ["phase2.html", "Phase 2 Roster"],
    ["roster-archive.html", "Roster Archive"],
  ];
  function installNavigation() {
    const nav = document.querySelector("nav.app-nav");
    if (!nav) return;
    const current = window.location.pathname.split("/").pop() || "index.html";
    const rosterActive = rosterPages.some(([href]) => href === current);
    nav.innerHTML = pages.map(([href, label]) => {
      if (href === "roster.html") {
        return `<details class="kbrh-roster-nav-dropdown"${rosterActive ? ' data-active="true"' : ''}>
          <summary class="app-nav-link${rosterActive ? ' active' : ''}" aria-label="Roster pages">Roster ▾</summary>
          <div class="kbrh-roster-nav-menu">${rosterPages.map(([target, text]) =>
            `<a class="app-nav-link${current === target ? ' active' : ''}"${current === target ? ' aria-current="page"' : ''} href="${target}">${text}</a>`
          ).join("")}</div>
        </details>`;
      }
      const active = href.split("?")[0] === current;
      return `<a class="app-nav-link${active ? " active" : ""}"${active ? ' aria-current="page"' : ""} href="${href}">${label}</a>`;
    }).join("");
    if (!document.getElementById("kbrh-roster-navigation-style")) {
      const style = document.createElement("style");
      style.id = "kbrh-roster-navigation-style";
      style.textContent = `
        nav.app-nav .kbrh-roster-nav-dropdown { position:relative; display:inline-flex; align-items:center; z-index:100; }
        nav.app-nav .kbrh-roster-nav-dropdown > summary { display:inline-flex; align-items:center; cursor:pointer; list-style:none; user-select:none; }
        nav.app-nav .kbrh-roster-nav-dropdown > summary::-webkit-details-marker { display:none; }
        nav.app-nav .kbrh-roster-nav-menu { position:absolute; top:100%; left:0; z-index:200; min-width:190px; padding:5px; border:1px solid #cbd5e1; border-radius:9px; background:#fff; box-shadow:0 10px 25px #0002; }
        nav.app-nav .kbrh-roster-nav-menu a { display:block; color:#17324d; padding:10px 12px; border-radius:5px; text-decoration:none; white-space:nowrap; }
        nav.app-nav .kbrh-roster-nav-menu a:hover, nav.app-nav .kbrh-roster-nav-menu a.active { background:#e0f2fe; color:#075985; }
        @media(max-width:700px) { nav.app-nav .kbrh-roster-nav-menu { left:auto; right:0; } }
      `;
      document.head.appendChild(style);
    }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", installNavigation);
  else installNavigation();
})();
