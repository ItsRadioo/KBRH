(() => {
  const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
  const cards = document.getElementById("dayCards");
  const body = document.getElementById("generatedMenuBody");
  const output = document.getElementById("generatedMenu");
  const addBtn = document.getElementById("addDayBtn");
  const generateBtn = document.getElementById("generateTableBtn");
  const clearBtn = document.getElementById("clearDaysBtn");
  const pdfBtn = document.getElementById("printTableBtn");

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

  function pdfFileName(){
    const stamp = new Date().toISOString().slice(0,10);
    return `Weekend-Menu-Chores-${stamp}.pdf`;
  }

  function drawUnderlinedLabel(doc, text, x, y, centerX){
    doc.setFont("times","bold");
    doc.setFontSize(19);
    const w = doc.getTextWidth(text);
    const tx = centerX ? x - w/2 : x;
    doc.text(text, tx, y);
    doc.setLineWidth(.6);
    doc.line(tx, y + 2, tx + w, y + 2);
  }

  function textBlockHeight(doc, value, width, fontSize=15.5){
    doc.setFont("times","normal");
    doc.setFontSize(fontSize);
    const lines = doc.splitTextToSize(value || "—", width);
    return Math.max(18, lines.length * (fontSize * 1.16));
  }

  function measureDayHeight(doc, row, colW){
    const valueW = colW - 28;
    const labelH = 28;
    const gap = 18;
    const mealValues = [row.lunch, row.supper];
    if(row.day === "Sunday") mealValues.push(row.dessert);
    let mealsH = 10;
    mealValues.forEach((v, i) => {
      mealsH += labelH + textBlockHeight(doc, v, valueW);
      if(i < mealValues.length - 1) mealsH += gap;
    });
    mealsH += 12;
    const choreH = 10 + labelH + 20 + textBlockHeight(doc, row.chore, valueW) + 12;
    return Math.max(row.day === "Sunday" ? 205 : 145, mealsH, choreH) + 28;
  }

  function drawDay(doc, row, x, y, width, height){
    const titleH = 28;
    const contentY = y + titleH;
    const colW = width / 2;
    const contentH = height - titleH;

    doc.setDrawColor(20,20,20);
    doc.setLineWidth(.8);
    doc.rect(x, y, width, height);
    doc.line(x, contentY, x + width, contentY);
    doc.line(x + colW, contentY, x + colW, y + height);

    doc.setFont("times","bold");
    doc.setFontSize(20);
    doc.text(row.day, x + width/2, y + 20, {align:"center"});

    const leftCenter = x + colW/2;
    const rightCenter = x + colW + colW/2;
    const valueWidth = colW - 30;
    let ly = contentY + 25;

    const drawMealSection = (label, value) => {
      drawUnderlinedLabel(doc, label, leftCenter, ly, true);
      ly += 22;
      doc.setFont("times","normal");
      doc.setFontSize(15.5);
      const lines = doc.splitTextToSize(value || "—", valueWidth);
      doc.text(lines, leftCenter, ly, {align:"center", lineHeightFactor:1.16});
      ly += Math.max(18, lines.length * 18) + 17;
    };

    drawMealSection("Lunch", row.lunch);
    drawMealSection("Supper", row.supper);
    if(row.day === "Sunday") drawMealSection("Dessert", row.dessert);

    let ry = contentY + 25;
    drawUnderlinedLabel(doc, "Chore", rightCenter, ry, true);
    ry += 42;
    doc.setFont("times","normal");
    doc.setFontSize(15.5);
    const choreLines = doc.splitTextToSize(row.chore || "—", valueWidth);
    doc.text(choreLines, rightCenter, ry, {align:"center", lineHeightFactor:1.16});
  }

  function generatePdf(){
    if(!window.jspdf || !window.jspdf.jsPDF){
      alert("PDF generator did not load. Refresh the page and try again.");
      return;
    }
    const rows = collect();
    if(!rows.length){
      alert("Add at least one day before generating the PDF.");
      return;
    }

    // Keep the on-screen preview in sync with exactly what is exported.
    generate();

    const {jsPDF} = window.jspdf;
    const doc = new jsPDF({orientation:"portrait", unit:"pt", format:"letter"});
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const marginX = 42;
    const marginTop = 42;
    const marginBottom = 42;
    const width = pageW - marginX * 2;
    const colW = width / 2;
    let y = marginTop;

    rows.forEach((row, index) => {
      const h = measureDayHeight(doc, row, colW);
      if(index > 0 && y + h > pageH - marginBottom){
        doc.addPage();
        y = marginTop;
      }
      drawDay(doc, row, marginX, y, width, h);
      y += h;
    });

    doc.save(pdfFileName());
  }

  addBtn.addEventListener("click", ()=>addDay());
  generateBtn.addEventListener("click", generate);
  clearBtn.addEventListener("click", ()=>{ cards.innerHTML=""; body.innerHTML=""; output.hidden=true; addDay("Friday"); });
  pdfBtn.addEventListener("click", generatePdf);

  addDay("Friday");
})();
