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
  printBtn.addEventListener("click", ()=>{ if(output.hidden) generate(); setTimeout(()=>window.print(), 50); });

  addDay("Friday");
})();
