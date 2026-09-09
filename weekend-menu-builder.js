(() => {
  const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
  const cards = document.getElementById("dayCards");
  const body = document.getElementById("generatedMenuBody");
  const output = document.getElementById("generatedMenu");
  const addBtn = document.getElementById("addDayBtn");
  const generateBtn = document.getElementById("generateTableBtn");
  const clearBtn = document.getElementById("clearDaysBtn");
  const printBtn = document.getElementById("printTableBtn");

  function nextUnusedDay(){
    const used = new Set([...cards.querySelectorAll("select[data-field='day']")].map(s=>s.value));
    return DAYS.find(d=>!used.has(d)) || "Friday";
  }

  function esc(value){
    return String(value ?? "").replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[ch]));
  }

  function addDay(day = nextUnusedDay(), values = {}){
    const card = document.createElement("section");
    card.className = "menu-day-card";
    card.innerHTML = `
      <div class="menu-day-head">
        <label><strong>Day</strong><br><select data-field="day">${DAYS.map(d=>`<option value="${d}"${d===day?" selected":""}>${d}</option>`).join("")}</select></label>
        <button type="button" class="secondary remove-day">Remove Day</button>
      </div>
      <div class="menu-day-fields">
        <label>Lunch<textarea data-field="lunch" placeholder="e.g. Hot Dogs & KD">${esc(values.lunch||"")}</textarea></label>
        <label>Supper<textarea data-field="supper" placeholder="e.g. Chicken drumsticks with mashed potatoes and vegetables">${esc(values.supper||"")}</textarea></label>
        <label class="dessert-field">Dessert<textarea data-field="dessert" placeholder="Sunday dessert">${esc(values.dessert||"")}</textarea></label>
        <label>Chore<textarea data-field="chore" placeholder="e.g. Wash kitchen fridge\nCut & seal lunch meat">${esc(values.chore||"")}</textarea></label>
      </div>`;
    cards.appendChild(card);

    const daySelect = card.querySelector("select[data-field='day']");
    const dessert = card.querySelector(".dessert-field");
    const syncDessert = () => dessert.hidden = daySelect.value !== "Sunday";
    daySelect.addEventListener("change", syncDessert);
    syncDessert();
    card.querySelector(".remove-day").addEventListener("click", ()=>card.remove());
  }

  function collect(){
    return [...cards.querySelectorAll(".menu-day-card")].map(card => {
      const get = name => card.querySelector(`[data-field='${name}']`).value.trim();
      const day = get("day");
      return {day, lunch:get("lunch"), supper:get("supper"), dessert:day === "Sunday" ? get("dessert") : "", chore:get("chore")};
    });
  }

  function valueHtml(value, fallback = "—"){
    return value ? esc(value) : `<span class="document-empty">${fallback}</span>`;
  }

  function sectionHtml(label, value){
    return `<section class="document-section"><div class="document-label">${esc(label)}</div><div class="document-value">${valueHtml(value)}</div></section>`;
  }

  function generate(){
    const rows = collect();
    if (!rows.length){ addDay(); return; }
    body.innerHTML = rows.map(r => {
      const mealCount = r.day === "Sunday" ? 3 : 2;
      const dessert = r.day === "Sunday" ? sectionHtml("Dessert", r.dessert) : "";
      return `<section class="document-day meals-${mealCount}">
        <div class="document-day-title">${esc(r.day)}</div>
        <div class="document-day-content">
          <div class="document-meals">
            ${sectionHtml("Lunch", r.lunch)}
            ${sectionHtml("Supper", r.supper)}
            ${dessert}
          </div>
          <div class="document-chore">
            <div class="document-label">Chore</div>
            <div class="document-value">${valueHtml(r.chore)}</div>
          </div>
        </div>
      </section>`;
    }).join("");
    output.hidden = false;
    output.scrollIntoView({behavior:"smooth", block:"start"});
  }

  addBtn.addEventListener("click", ()=>addDay());
  generateBtn.addEventListener("click", generate);
  clearBtn.addEventListener("click", ()=>{ cards.innerHTML=""; body.innerHTML=""; output.hidden=true; addDay("Friday"); });
  function printGeneratedMenu(){
    if (output.hidden) generate();

    const menu = body.cloneNode(true);
    const printWindow = window.open("", "_blank", "noopener,noreferrer");
    if (!printWindow) {
      alert("The PDF/print window was blocked. Allow pop-ups for this site and try again.");
      return;
    }

    printWindow.document.open();
    printWindow.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Weekend Menu &amp; Chores</title>
<style>
  @page{size:letter portrait;margin:.55in}
  *{box-sizing:border-box}
  html,body{background:#fff;color:#111;margin:0;padding:0}
  .document-menu{width:100%;border:1px solid #111;background:#fff;color:#111;font-family:"Times New Roman",Times,serif}
  .document-day{break-inside:avoid;page-break-inside:avoid}
  .document-day + .document-day{border-top:1px solid #111}
  .document-day-title{font-family:"Times New Roman",Times,serif;font-size:20pt;font-weight:700;line-height:1.05;text-align:center;padding:2px 8px 3px;border-bottom:1px solid #555}
  .document-day-content{display:grid;grid-template-columns:1fr 1fr;min-height:135px}
  .document-day.meals-3 .document-day-content{min-height:220px}
  .document-meals,.document-chore{padding:6px 12px 9px;text-align:center;display:flex;flex-direction:column;justify-content:flex-start;align-items:stretch}
  .document-chore{border-left:1px solid #111}
  .document-section{margin:0 0 18px}
  .document-section:last-child{margin-bottom:0}
  .document-label{font-size:19pt;font-weight:700;text-decoration:underline;text-underline-offset:3px;line-height:1.05;margin:0 0 4px}
  .document-value{font-size:15.5pt;line-height:1.15;white-space:pre-line;overflow-wrap:anywhere}
  .document-chore .document-label{font-size:19pt}
  .document-chore .document-value{margin-top:20px}
  .document-empty{opacity:.42;font-style:italic}
</style>
</head>
<body>${menu.outerHTML}</body>
</html>`);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(()=>{
      printWindow.print();
      printWindow.onafterprint = ()=>printWindow.close();
    }, 150);
  }

  printBtn.addEventListener("click", printGeneratedMenu);

  addDay("Friday");
})();
