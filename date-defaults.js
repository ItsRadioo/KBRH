/* Calendar dates are interpreted in KBRH's Eastern time zone. */
(()=>{
 'use strict';
 const today=(now=new Date())=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Toronto',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
 const addDays=(value,n)=>{const d=new Date(value+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);};
 const nextMonday=(now=new Date())=>{const value=today(now),day=new Date(value+'T12:00:00Z').getUTCDay();return addDays(value,(8-day)%7);};
 const weekIds=new Set(['mealWeek','mealWeekStart','boardWeek','startDate']);
 function fill(root=document){
  for(const input of root.querySelectorAll('input[type="date"]')){
   if(input.value||input.disabled||input.readOnly||!input.getClientRects().length)continue;
   // Identity/history fields must remain unknown until supplied; an edit must
   // never turn a missing saved date into a fabricated event.
   if(/dob|birth|discharge|lastuse|reviewed|edit/i.test(input.id)||input.closest('[data-preserve-dates]'))continue;
   const modal=input.closest('[role="dialog"]');
   if(modal&&/^\s*(edit|correct)/i.test(modal.querySelector('h2')?.textContent||''))continue;
   const weekly=weekIds.has(input.id)||/laundry-start-date|meetings-start-date/.test(input.dataset.kind||'');
   input.value=weekly?nextMonday():today();
   if(input.id==='startDate'){const end=document.getElementById('endDate');if(end&&!end.value)end.value=addDays(input.value,6);}
  }
 }
 const dateOnly=value=>String(value||"").length===10?String(value):value?today(new Date(value)):"";
 window.KBRHDates={today,addDays,nextMonday,dateOnly,fill};
 document.addEventListener('DOMContentLoaded',()=>{
  fill();
  new MutationObserver(records=>{for(const r of records){if(r.type==='childList'){for(const n of r.addedNodes)if(n.nodeType===1)fill(n.parentElement||n);}else if(r.target.matches?.('[role="dialog"],.modal,.modal-backdrop'))fill(r.target);}}).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden','class','open']});
 });
})();
