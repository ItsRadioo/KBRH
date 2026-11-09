/* Searchable staff checklists shared by log notifications and new conversations. */
(()=>{'use strict';
window.KBRHStaffPicker={mount(host,people,options={}){
 host.replaceChildren();host.classList.add('staff-picker');host.setAttribute('aria-label','Choose staff');
 const search=document.createElement('input');search.type='search';search.placeholder='Search staff by name…';search.setAttribute('aria-label','Search staff by name');
 const count=document.createElement('div');count.className='staff-picker-count';count.setAttribute('role','status');
 const list=document.createElement('div');list.className='staff-picker-list';
 const empty=document.createElement('p');empty.className='staff-picker-empty';empty.textContent='No matching staff.';empty.hidden=true;
 host.append(search,count,list,empty);
 let single=!!options.single;const selected=new Set((options.selected||[]).map(String)),rows=[];
 const unique=new Map();for(const person of people)if(person.uid&&!unique.has(person.uid))unique.set(person.uid,person);
 const update=()=>{const checked=rows.filter(x=>x.input.checked);count.textContent=checked.length+' selected'+(single?' · Choose one person':' · Choose one or more people');};
 for(const person of [...unique.values()].sort((a,b)=>String(a.name).localeCompare(String(b.name)))){
  const label=document.createElement('label');label.className='staff-picker-person';
  const input=document.createElement('input');input.type='checkbox';input.name=options.name||'staffRecipients';input.value=person.uid;input.checked=selected.has(person.uid);
  const name=document.createElement('span');name.textContent=person.name||'Staff member';label.append(input,name);list.append(label);
  input.onchange=()=>{if(single&&input.checked)rows.forEach(r=>{if(r.input!==input)r.input.checked=false});update();};
  rows.push({label,input,name:String(person.name||'').toLowerCase()});
 }
 search.oninput=()=>{const q=search.value.trim().toLowerCase();let shown=0;rows.forEach(r=>{r.label.hidden=!r.name.includes(q);if(!r.label.hidden)shown++;});empty.hidden=shown>0;};
 update();empty.hidden=rows.length>0;
 return {setSingle(value){single=!!value;if(single){let kept=false;rows.forEach(r=>{if(r.input.checked){if(kept)r.input.checked=false;kept=true;}});}update();}};
}};
const style=document.createElement('style');style.textContent=`
.staff-picker{display:grid!important;gap:10px!important;min-width:0}
.staff-picker>input[type=search]{box-sizing:border-box;width:100%;padding:11px 12px;border:1px solid #b8c8d8;border-radius:8px;background:white;color:#14283f;font:inherit}
.staff-picker-count{font-size:.85rem;color:#526277}
.staff-picker-list{display:flex!important;flex-direction:column!important;gap:7px;max-height:240px;overflow:auto;padding:3px}
.staff-picker .staff-picker-person{display:flex!important;align-items:center!important;gap:12px!important;border:1px solid #d8e2ec;border-radius:8px;padding:12px!important;margin:0!important;background:#fff;color:#14283f;cursor:pointer;font-weight:600;min-height:46px;box-sizing:border-box}
.staff-picker .staff-picker-person[hidden]{display:none!important}
.staff-picker .staff-picker-person:has(input:checked){border-color:#087f78;background:#e7f6f4}
.staff-picker .staff-picker-person input[type=checkbox]{appearance:auto!important;-webkit-appearance:checkbox!important;position:static!important;display:block!important;opacity:1!important;visibility:visible!important;width:19px!important;min-width:19px!important;max-width:19px!important;height:19px!important;flex:0 0 19px!important;margin:0!important;padding:0!important;accent-color:#087f78}
.staff-picker-empty{margin:4px;color:#526277}
#newDialog{box-sizing:border-box;width:min(540px,calc(100vw - 24px))!important;max-width:calc(100vw - 24px)!important;max-height:calc(100dvh - 24px);overflow:auto;padding:20px!important}
#newDialog [hidden]{display:none!important}#newDialog form{display:grid;gap:16px}#newDialog h2{margin:0;color:#14283f}#newDialog form>label{display:grid;gap:7px}#newDialog select,#newDialog input:not([type=checkbox]){padding:10px;box-sizing:border-box;width:100%}#newDialog #staffChoices{min-width:0;margin:0;padding:12px;border:1px solid #d8e2ec;border-radius:10px;max-height:none!important}
#newDialog .dialog-actions{margin:0;gap:10px}.chat-message{line-height:1.5;max-width:92%!important}.chat-message .meta{display:flex;flex-direction:column;gap:2px;margin-bottom:7px!important}.chat-message .meta strong{color:#173c5c}.chat-message .meta time{font-size:.72rem;color:#596b7d}.chat-messages{gap:14px!important}.chat-conversation strong{display:block;margin-bottom:5px}.chat-conversation small{line-height:1.4;overflow-wrap:anywhere}
.lb-head{position:sticky;top:0;background:#fff;z-index:2}.lb-head h2{color:#14283f!important}.lb-notify-box{display:grid;gap:12px}.lb-notify-box .lb-field{margin:0}.lb-notify-box small{line-height:1.4}
`;document.head.append(style);
})();
