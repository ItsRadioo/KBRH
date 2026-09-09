(function(){
 const KEY='kbrhWeekendMenuBuilderV5516';
 const editor=document.getElementById('dayEditor'), out=document.getElementById('tableOutput');
 let days=[];
 const defaults=['Friday','Saturday','Sunday','Monday'];
 function uid(){return 'd'+Date.now().toString(36)+Math.random().toString(36).slice(2,7)}
 function blank(day){return {id:uid(),day:day||'',lunch:'',supper:'',dessert:'',chore:''}}
 function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
 function load(){try{const x=JSON.parse(localStorage.getItem(KEY)||'null');days=Array.isArray(x)&&x.length?x:defaults.map(blank)}catch(e){days=defaults.map(blank)}renderEditor()}
 function save(){localStorage.setItem(KEY,JSON.stringify(days))}
 function renderEditor(){editor.innerHTML=days.map((d,i)=>`<article class="menu-day" data-id="${d.id}"><div class="menu-day-head"><h3>Day ${i+1}</h3><button class="danger-small remove-day" type="button">Remove</button></div><div class="menu-fields"><label>Day<input data-f="day" value="${esc(d.day)}" placeholder="e.g. Friday"></label><label>Lunch<textarea data-f="lunch" placeholder="Lunch menu">${esc(d.lunch)}</textarea></label><label>Supper<textarea data-f="supper" placeholder="Supper menu">${esc(d.supper)}</textarea></label><label>Sunday Dessert / Dessert<textarea data-f="dessert" placeholder="Optional dessert">${esc(d.dessert)}</textarea></label><label class="full">Chore<textarea data-f="chore" placeholder="Kitchen or food-prep chore">${esc(d.chore)}</textarea></label></div></article>`).join('');}
 editor.addEventListener('input',e=>{const f=e.target.dataset.f;if(!f)return;const card=e.target.closest('.menu-day');const d=days.find(x=>x.id===card.dataset.id);if(d){d[f]=e.target.value;save()}});
 editor.addEventListener('click',e=>{if(!e.target.classList.contains('remove-day'))return;const id=e.target.closest('.menu-day').dataset.id;days=days.filter(x=>x.id!==id);save();renderEditor()});
 document.getElementById('addDayBtn').onclick=()=>{days.push(blank(''));save();renderEditor()};
 document.getElementById('clearBtn').onclick=()=>{if(!confirm('Clear the weekend menu builder?'))return;days=defaults.map(blank);save();renderEditor();out.innerHTML='<div class="empty-note">Add your days and click Generate Table.</div>'};
 function cell(v){return esc(v).replace(/\n/g,'<br>')||'&nbsp;'}
 function generate(){if(!days.length){out.innerHTML='<div class="empty-note">Add at least one day first.</div>';return}out.innerHTML=`<table class="preview-table"><thead><tr><th>Day</th><th>Meal</th><th>Menu</th><th>Chore</th></tr></thead><tbody>${days.map(d=>{const rows=[['Lunch',d.lunch],['Supper',d.supper]];if(String(d.dessert||'').trim())rows.push(['Dessert',d.dessert]);return rows.map((r,j)=>`<tr>${j===0?`<th rowspan="${rows.length}">${cell(d.day)}</th>`:''}<td><strong>${r[0]}</strong></td><td>${cell(r[1])}</td>${j===0?`<td rowspan="${rows.length}">${cell(d.chore)}</td>`:''}</tr>`).join('')}).join('')}</tbody></table>`}
 document.getElementById('generateBtn').onclick=generate;
 document.getElementById('printBtn').onclick=()=>{if(!out.querySelector('table'))generate();setTimeout(()=>window.print(),50)};
 load();
})();
