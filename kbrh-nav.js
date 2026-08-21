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
    ["bus-passes.html", "Bus Passes"],
    ["staff-list.html", "Staff List"],
    ["audit-log.html", "Audit Log"],
    ["staff-profile.html", "My Profile"],
    ["print.html", "Print Chores"],
    ["meal-print.html", "Print Meals"]
  ];

  function installNavigation() {
    const nav = document.querySelector("nav.app-nav");
    if (!nav) return;
    const current = window.location.pathname.split("/").pop() || "index.html";
    nav.innerHTML = pages.map(([href, label]) => {
      const active = href === current;
      return `<a class="app-nav-link${active ? " active" : ""}"${active ? ' aria-current="page"' : ""} href="${href}">${label}</a>`;
    }).join("");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", installNavigation);
  else installNavigation();
})();
