let chartState = null;
let currentChart = "laundry";
let saveTimer = null;
const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];

function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));}
function activeResidents(){return (chartState?.roster||[]).filter(r=>!r.archived).sort((a,b)=>{const ra=Number(a.roomNumber)||999, rb=Number(b.roomNumber)||999; return ra-rb || `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`);});}
function residentName(r){return [r.firstName,r.lastName].filter(Boolean).join(" ")||"Unnamed Resident";}
function ensureChartData(){chartState.chartData=chartState.chartData||{}; chartState.chartData.laundry=chartState.chartData.laundry||{}; chartState.chartData.laundryDate=chartState.chartData.laundryDate||""; chartState.chartData.electronics=chartState.chartData.electronics||{}; chartState.chartData.meetings=chartState.chartData.meetings||{};}
function setSaveStatus(t){const el=document.getElementById("chartSaveStatus"); if(el) el.textContent=t;}
function queueSave(){setSaveStatus("Saving…"); clearTimeout(saveTimer); saveTimer=setTimeout(async()=>{try{await saveAppState(chartState);setSaveStatus("Saved");}catch(e){console.error(e);setSaveStatus("Save failed");}},350);}
function laundryTable(){
  const rows=activeResidents().map(r=>{
    const d=chartState.chartData.laundry[r.id]||{};
    return `<tr><td class="chart-resident-name">${esc(residentName(r))}</td><td class="laundry-mark-cell"><input aria-label="Laundry completed for ${esc(residentName(r))}" class="chart-check" data-id="${esc(r.id)}" data-kind="laundry-check" type="checkbox" ${d.checked?'checked':''}></td></tr>`;
  }).join('');
  return `<div class="laundry-sheet-heading"><h2>Laundry Checklist</h2><label class="laundry-date-label">Date <input aria-label="Laundry checklist date" data-kind="laundry-date" type="date" value="${esc(chartState.chartData.laundryDate||'')}"></label></div><table class="resident-chart laundry-chart"><thead><tr><th>Resident</th><th class="small-check-column">✓</th></tr></thead><tbody>${rows||'<tr><td colspan="2" class="empty-state">No active residents on the roster.</td></tr>'}</tbody></table>`;
}
function weeklyTable(kind){
  const data=chartState.chartData[kind];
  const rows=activeResidents().map(r=>`<tr><td class="chart-resident-name">${esc(residentName(r))}</td>${DAYS.map(day=>{const val=data[r.id]?.[day] ?? '';return `<td><input class="weekly-chart-input" data-id="${esc(r.id)}" data-day="${day}" data-kind="${kind}" value="${esc(val)}"></td>`}).join('')}</tr>`).join('');
  return `<table class="resident-chart weekly-chart"><thead><tr><th>Resident</th>${DAYS.map(d=>`<th>${d}</th>`).join('')}</tr></thead><tbody>${rows||`<tr><td colspan="8" class="empty-state">No active residents on the roster.</td></tr>`}</tbody></table>`;
}
function renderChart(){
  if(!chartState)return;ensureChartData();
  const title=document.getElementById('chartTitle'),hint=document.getElementById('chartHint'),box=document.getElementById('chartContainer');
  if(currentChart==='laundry'){title.textContent='Laundry Checklist';hint.textContent='Select one date for the checklist, then mark each resident as completed.';box.innerHTML=laundryTable();}
  else if(currentChart==='electronics'){title.textContent='Electronic Devices Markoff';hint.textContent='Weekly electronic-device markoff for each resident.';box.innerHTML=weeklyTable('electronics');}
  else{title.textContent='Meetings Chart';hint.textContent='Record meeting information for each resident throughout the week.';box.innerHTML=weeklyTable('meetings');}
}
function updateFromInput(el){
  ensureChartData();
  const id=el.dataset.id,kind=el.dataset.kind;
  if(kind==='laundry-date'){chartState.chartData.laundryDate=el.value;}
  else if(kind==='laundry-check'){const rec=chartState.chartData.laundry[id]||{checked:false};rec.checked=el.checked;chartState.chartData.laundry[id]=rec;}
  else{const day=el.dataset.day;chartState.chartData[kind][id]=chartState.chartData[kind][id]||{};chartState.chartData[kind][id][day]=el.value;}
  queueSave();
}
document.addEventListener('DOMContentLoaded',()=>{document.getElementById('chartSelector').addEventListener('change',e=>{currentChart=e.target.value;renderChart();});document.getElementById('chartContainer').addEventListener('change',e=>{if(e.target.matches('input'))updateFromInput(e.target);});document.getElementById('chartContainer').addEventListener('input',e=>{if(e.target.matches('.weekly-chart-input'))updateFromInput(e.target);});document.getElementById('printChartBtn').addEventListener('click',()=>window.print());listenToAppState(state=>{chartState=state;renderChart();});});
