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

function weeklyTable(kind){
  const data=chartState.chartData[kind];
  const rows=activeResidents().map(r=>`<tr><td class="chart-resident-name">${esc(residentName(r))}</td>${DAYS.map(day=>{const val=data[r.id]?.[day] ?? '';return `<td><input class="weekly-chart-input" data-id="${esc(r.id)}" data-day="${day}" data-kind="${kind}" value="${esc(val)}"></td>`}).join('')}</tr>`).join('');
  return `<table class="resident-chart weekly-chart"><thead><tr><th>Resident</th>${DAYS.map(d=>`<th>${d}</th>`).join('')}</tr></thead><tbody>${rows||`<tr><td colspan="8" class="empty-state">No active Phase 1 residents on the roster.</td></tr>`}</tbody></table>`;
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
  const { jsPDF }=window.jspdf;
  const landscape=currentChart!=='laundry';
  const doc=new jsPDF({orientation:landscape?'landscape':'portrait',unit:'pt',format:'letter'});
  const margin=28;
  let y=34;
  doc.setFont('helvetica','bold');
  doc.setFontSize(16);
  const title=currentChart==='laundry'?'Laundry Checklist':currentChart==='electronics'?'Electronic Devices Markoff':'Meetings Chart';
  doc.text(title,doc.internal.pageSize.getWidth()/2,y,{align:'center'});
  y+=18;
  if(currentChart==='laundry'){
    const start=chartState.chartData.laundryStartDate||'';
    const end=addDays(start,6);
    doc.setFont('helvetica','normal'); doc.setFontSize(10);
    doc.text(start?`${formatDate(start)} - ${formatDate(end)}`:'Date: ____________________',doc.internal.pageSize.getWidth()/2,y,{align:'center'});
    y+=18;
    const body=activeResidents().map(r=>[residentName(r),chartState.chartData.laundry[r.id]?.checked?'X':'']);
    doc.autoTable({startY:y,head:[['Resident','✓']],body,margin:{left:70,right:70},styles:{fontSize:10,cellPadding:5,valign:'middle'},headStyles:{halign:'center'},columnStyles:{0:{cellWidth:'auto'},1:{cellWidth:48,halign:'center'}}});
  } else {
    const data=chartState.chartData[currentChart];
    const body=activeResidents().map(r=>[residentName(r),...DAYS.map(day=>data[r.id]?.[day]||'')]);
    doc.autoTable({
      startY:y,
      head:[['Resident',...DAYS]],
      body,
      margin:{left:18,right:18,bottom:18},
      theme:'grid',
      styles:{fontSize:7,cellPadding:2.2,overflow:'linebreak',valign:'middle',minCellHeight:18},
      headStyles:{fontSize:7.5,halign:'center'},
      columnStyles:{0:{cellWidth:96,fontStyle:'bold'},1:{cellWidth:64},2:{cellWidth:64},3:{cellWidth:64},4:{cellWidth:64},5:{cellWidth:64},6:{cellWidth:64},7:{cellWidth:64}},
      pageBreak:'avoid',
      rowPageBreak:'avoid'
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
