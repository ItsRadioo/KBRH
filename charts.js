let chartState = null;
let currentChart = "laundry";
let saveTimer = null;
const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];

function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));}

function activeResidents(){
  return (chartState?.roster||[])
    .filter(r => r && !r.archived && (r.phase || "phase1") === "phase1")
    .sort((a,b)=>{
      const ra=Number(a.roomNumber)||999, rb=Number(b.roomNumber)||999;
      return ra-rb || `${a.lastName||""} ${a.firstName||""}`.localeCompare(`${b.lastName||""} ${b.firstName||""}`);
    });
}

function residentName(r){return [r.firstName,r.lastName].filter(Boolean).join(" ")||"Unnamed Resident";}

function ensureChartData(){
  chartState.chartData=chartState.chartData||{};
  chartState.chartData.laundry=chartState.chartData.laundry||{};
  chartState.chartData.laundryStartDate=chartState.chartData.laundryStartDate || chartState.chartData.laundryDate || "";
  chartState.chartData.electronics=chartState.chartData.electronics||{};
  chartState.chartData.meetings=chartState.chartData.meetings||{};
  chartState.chartData.meetingsStartDate=chartState.chartData.meetingsStartDate||"";
}

function setSaveStatus(t){const el=document.getElementById("chartSaveStatus"); if(el) el.textContent=t;}
function queueSave(){setSaveStatus("Saving…"); clearTimeout(saveTimer); saveTimer=setTimeout(async()=>{try{await saveAppState(chartState);setSaveStatus("Saved");}catch(e){console.error(e);setSaveStatus("Save failed");}},350);}

function addDays(dateString, days){
  if(!dateString) return "";
  const d = new Date(`${dateString}T00:00:00`);
  if(Number.isNaN(d.getTime())) return "";
  d.setDate(d.getDate()+days);
  return d.toISOString().slice(0,10);
}

function formatDate(dateString){
  if(!dateString) return "";
  const d = new Date(`${dateString}T00:00:00`);
  if(Number.isNaN(d.getTime())) return dateString;
  return d.toLocaleDateString("en-CA",{month:"short",day:"numeric",year:"numeric"});
}

function laundryTable(){
  const start=chartState.chartData.laundryStartDate||"";
  const end=addDays(start,6);
  const rows=activeResidents().map(r=>{
    const d=chartState.chartData.laundry[r.id]||{};
    return `<tr><td class="chart-resident-name">${esc(residentName(r))}</td><td class="laundry-mark-cell"><input aria-label="Laundry completed for ${esc(residentName(r))}" class="chart-check" data-id="${esc(r.id)}" data-kind="laundry-check" type="checkbox" ${d.checked?'checked':''}></td></tr>`;
  }).join('');
  return `<div class="laundry-sheet-heading"><h2>Laundry Checklist</h2><div class="laundry-date-range"><label class="laundry-date-label">Start Date <input aria-label="Laundry checklist start date" data-kind="laundry-start-date" type="date" value="${esc(start)}"></label><label class="laundry-date-label">End Date <input aria-label="Laundry checklist end date" type="date" value="${esc(end)}" readonly></label></div></div><table class="resident-chart laundry-chart"><thead><tr><th>Resident</th><th class="small-check-column">✓</th></tr></thead><tbody>${rows||'<tr><td colspan="2" class="empty-state">No active Phase 1 residents on the roster.</td></tr>'}</tbody></table>`;
}

function dayLabel(day){return day.slice(0,3);}

function meetingDate(dayIndex){
  const start=chartState.chartData.meetingsStartDate||"";
  return start ? addDays(start,dayIndex) : "";
}

function shortPdfDate(dateString){
  if(!dateString) return "";
  const d=new Date(`${dateString}T00:00:00`);
  if(Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-CA",{month:"short",day:"numeric"}).toUpperCase();
}

function weeklyTable(kind){
  const data=chartState.chartData[kind];
  const residents=activeResidents();
  const rows=residents.map(r=>`<tr><td class="chart-resident-name">${esc(residentName(r))}</td>${DAYS.map(day=>{const val=data[r.id]?.[day] ?? '';return `<td><input class="weekly-chart-input" data-id="${esc(r.id)}" data-day="${day}" data-kind="${kind}" value="${esc(val)}"></td>`}).join('')}</tr>`).join('');
  const heading=kind==='electronics'
    ? `<div class="paper-chart-heading"><h2>Electronic Devices</h2><p>Mark two X's for multiple devices</p></div>`
    : `<div class="paper-chart-heading"><h2>Closed AA/NA Meetings Attended</h2><label class="meetings-week-label">Week Starting <input aria-label="Meetings week start date" data-kind="meetings-start-date" type="date" value="${esc(chartState.chartData.meetingsStartDate||'')}"></label></div>`;
  const headers=DAYS.map((d,i)=>kind==='electronics'?`<th>${dayLabel(d)}<span class="day-subhead">in</span></th>`:`<th>${dayLabel(d)}${meetingDate(i)?`<span class="day-subhead">${esc(shortPdfDate(meetingDate(i)))}</span>`:''}</th>`).join('');
  return `${heading}<table class="resident-chart weekly-chart ${kind}-chart"><thead><tr><th>Resident</th>${headers}</tr></thead><tbody>${rows||`<tr><td colspan="8" class="empty-state">No active Phase 1 residents on the roster.</td></tr>`}</tbody></table>`;
}
function renderChart(){
  if(!chartState)return;ensureChartData();
  const title=document.getElementById('chartTitle'),hint=document.getElementById('chartHint'),box=document.getElementById('chartContainer');
  if(currentChart==='laundry'){title.textContent='Laundry Checklist';hint.textContent='Select the start date. The end date is automatically set six days later.';box.innerHTML=laundryTable();}
  else if(currentChart==='electronics'){title.textContent='Electronic Devices Markoff';hint.textContent='Weekly electronic-device markoff for active Phase 1 residents.';box.innerHTML=weeklyTable('electronics');}
  else{title.textContent='Meetings Chart';hint.textContent='Record meeting information for active Phase 1 residents throughout the week.';box.innerHTML=weeklyTable('meetings');}
}

function updateFromInput(el){
  ensureChartData();
  const id=el.dataset.id,kind=el.dataset.kind;
  if(kind==='laundry-start-date'){
    chartState.chartData.laundryStartDate=el.value;
    chartState.chartData.laundryDate=el.value; // backward compatibility
    renderChart();
  } else if(kind==='meetings-start-date'){
    chartState.chartData.meetingsStartDate=el.value;
    renderChart();
  } else if(kind==='laundry-check'){
    const rec=chartState.chartData.laundry[id]||{checked:false};rec.checked=el.checked;chartState.chartData.laundry[id]=rec;
  } else {
    const day=el.dataset.day;chartState.chartData[kind][id]=chartState.chartData[kind][id]||{};chartState.chartData[kind][id][day]=el.value;
  }
  queueSave();
}

function pdfFileName(){
  const stamp=new Date().toISOString().slice(0,10);
  const names={laundry:'Laundry-Checklist',electronics:'Electronic-Devices-Markoff',meetings:'Meetings-Chart'};
  return `${names[currentChart]||'Resident-Chart'}-${stamp}.pdf`;
}

function generateChartPdf(){
  if(!window.jspdf || !window.jspdf.jsPDF){
    alert('PDF generator did not load. Refresh the page and try again.');
    return;
  }
  ensureChartData();
  const {jsPDF}=window.jspdf;
  const residents=activeResidents();
  const landscape=currentChart!=='laundry';
  const doc=new jsPDF({orientation:landscape?'landscape':'portrait',unit:'pt',format:'letter'});
  const pageW=doc.internal.pageSize.getWidth();
  const pageH=doc.internal.pageSize.getHeight();
  doc.setTextColor(0,0,0);

  if(currentChart==='laundry'){
    const start=chartState.chartData.laundryStartDate||'';
    const end=addDays(start,6);
    doc.setFont('helvetica','bold'); doc.setFontSize(20);
    doc.text('Resident Laundry Checklist',pageW/2,92,{align:'center'});
    doc.setLineWidth(.8); doc.line(pageW/2-120,97,pageW/2+120,97);
    doc.setFontSize(13);
    const range=start?`${shortPdfDate(start)} - ${shortPdfDate(end)}`:'DATE: __________________';
    doc.text(range,pageW/2,122,{align:'center'});
    doc.line(pageW/2-78,127,pageW/2+78,127);
    const body=residents.map(r=>[residentName(r),chartState.chartData.laundry[r.id]?.checked?'X':'']);
    const tableWidth=238, left=(pageW-tableWidth)/2;
    doc.autoTable({
      startY:164,
      head:[], body,
      theme:'grid',
      margin:{left,right:left},
      tableWidth,
      styles:{font:'helvetica',fontSize:12,cellPadding:{top:4,right:5,bottom:4,left:5},textColor:[0,0,0],lineColor:[0,0,0],lineWidth:.65,minCellHeight:23,valign:'middle'},
      columnStyles:{0:{cellWidth:190,halign:'left'},1:{cellWidth:48,halign:'center',fontSize:15}},
      pageBreak:'avoid',rowPageBreak:'avoid'
    });
  } else {
    const isDevices=currentChart==='electronics';
    const title=isDevices?'ELECTRONIC DEVICES':'CLOSED AA/NA MEETINGS ATTENDED';
    doc.setFont('helvetica','bold'); doc.setFontSize(isDevices?15:16);
    doc.text(title,pageW/2,42,{align:'center'});
    if(isDevices){
      doc.setFontSize(8.5); doc.setFont('helvetica','normal');
      doc.text("(MARK TWO X'S FOR MULTIPLE DEVICES)",pageW/2,55,{align:'center'});
    }
    const data=chartState.chartData[currentChart];
    const body=residents.map(r=>[residentName(r),...DAYS.map(day=>data[r.id]?.[day]||'')]);
    const head=[['Resident',...DAYS.map((day,i)=>{
      const d=dayLabel(day).toUpperCase();
      if(isDevices) return `${d}\nin`;
      const dt=meetingDate(i);
      return dt?`${d}\n${shortPdfDate(dt)}`:d;
    })]];
    const startY=isDevices?68:58;
    const availableW=pageW-72;
    const residentW=170;
    const dayW=(availableW-residentW)/7;
    const col={0:{cellWidth:residentW,halign:'left',fontStyle:'normal'}};
    for(let i=1;i<=7;i++) col[i]={cellWidth:dayW,halign:'center'};
    doc.autoTable({
      startY,head,body,
      theme:'grid',
      margin:{left:36,right:36,bottom:28},
      tableWidth:availableW,
      styles:{font:'helvetica',fontSize:8.5,cellPadding:2,textColor:[0,0,0],lineColor:[0,0,0],lineWidth:.55,valign:'middle',minCellHeight:24,overflow:'linebreak'},
      headStyles:{fillColor:[255,255,255],textColor:[0,0,0],fontStyle:'bold',halign:'center',fontSize:8,lineColor:[0,0,0],lineWidth:.55,minCellHeight:31},
      columnStyles:col,
      pageBreak:'avoid',rowPageBreak:'avoid',
      didParseCell(dataCell){
        // Keep the form black-and-white like the paper originals.
        if(dataCell.section==='body') dataCell.cell.styles.fillColor=[255,255,255];
      }
    });
  }
  doc.save(pdfFileName());
}
document.addEventListener('DOMContentLoaded',()=>{
  document.getElementById('chartSelector').addEventListener('change',e=>{currentChart=e.target.value;renderChart();});
  document.getElementById('chartContainer').addEventListener('change',e=>{if(e.target.matches('input'))updateFromInput(e.target);});
  document.getElementById('chartContainer').addEventListener('input',e=>{if(e.target.matches('.weekly-chart-input'))updateFromInput(e.target);});
  document.getElementById('printChartBtn').addEventListener('click',generateChartPdf);
  listenToAppState(state=>{chartState=state;renderChart();});
});
