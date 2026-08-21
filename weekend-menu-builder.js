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

  function cell(value, fallback = "—"){
    return value ? esc(value) : `<span class="empty">${fallback}</span>`;
  }

  function generate(){
    const rows = collect();
    if (!rows.length){ addDay(); return; }
    body.innerHTML = rows.map(r => `<tr><th>${esc(r.day)}</th><td>${cell(r.lunch)}</td><td>${cell(r.supper)}</td><td>${r.day === "Sunday" ? cell(r.dessert) : '<span class="empty">—</span>'}</td><td>${cell(r.chore)}</td></tr>`).join("");
    output.hidden = false;
    output.scrollIntoView({behavior:"smooth", block:"start"});
  }

  addBtn.addEventListener("click", ()=>addDay());
  generateBtn.addEventListener("click", generate);
  clearBtn.addEventListener("click", ()=>{ cards.innerHTML=""; body.innerHTML=""; output.hidden=true; addDay("Friday"); });
  printBtn.addEventListener("click", ()=>{ if(output.hidden) generate(); setTimeout(()=>window.print(), 50); });

  addDay("Friday");
})();
