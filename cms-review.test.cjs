const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const read=f=>fs.readFileSync(f,'utf8');
function element(){return {value:'',textContent:'',innerHTML:'',disabled:false,classList:{toggle(){},add(){}},addEventListener(){}};}
function context(extra={}){const nodes=new Map();return vm.createContext({console,URLSearchParams,location:{search:''},setTimeout:()=>0,clearTimeout(){},auth:{currentUser:{uid:'staff',email:'staff@kbrh.local'},onAuthStateChanged(){}},document:{getElementById(id){if(!nodes.has(id))nodes.set(id,element());return nodes.get(id);},addEventListener(){}},firebase:{firestore:{FieldValue:{serverTimestamp:()=> 'server-time'}}},...extra});}
function database(data){const writes=[];const db={collection(collection){return {doc(id='generated'){return {collection,id}},async add(value){writes.push({collection,value});}}},async runTransaction(fn){const pending=[];await fn({async get(ref){const value=data[ref.id];return {exists:!!value,data:()=>structuredClone(value)};},set(ref,value){pending.push({ref,value});}});for(const w of pending){data[w.ref.id]={...data[w.ref.id],...w.value};writes.push(w);}}};return {db,writes};}

test('urine chart excludes Phase 2 and archived residents; transaction rechecks current phase',async()=>{
 const {db,writes}=database({choreTracker:{roster:[{id:'a',firstName:'Ann',phase:'phase1'},{id:'b',phase:'phase2'}]}}),c=context({db});
 vm.runInContext(read('urine-tests.js').replace(/\}\)\(\);\s*$/, 'globalThis.api={residentsForDate,saveField,setRoster:v=>roster=v};})();'),c);
 c.api.setRoster([{id:'a',firstName:'Ann',phase:'phase1'},{id:'b',phase:'phase2'},{id:'c',archived:true}]);
 assert.deepEqual(Array.from(c.api.residentsForDate(),r=>r.id),['a']);
 await c.api.saveField('2026-11-16',{id:'a',name:'Ann'},'result','+');
 assert.equal(writes[0].value.days['2026-11-16'].a.result,'+');
 await assert.rejects(c.api.saveField('2026-11-16',{id:'b'},'done',true),/Only current Phase 1/);
});
test('writeups use counts, legacy count fallback, and never go below zero',async()=>{
 const data={choreTracker:{roster:[{id:'a',firstName:'Ann',phase:'phase1'},{id:'b',phase:'phase2'}],writeUps:[{residentId:'a'}]}},mock=database(data),c=context({db:mock.db});vm.runInContext(read('writeups.js')+'\nglobalThis.api={activeRoster,countFor,changeWriteupCount,setState:v=>writeupState=v,ready:()=>countsReady=true};',c);
 c.api.setState(data.choreTracker);c.api.ready();assert.equal(c.api.activeRoster().length,1);assert.equal(c.api.countFor('a'),1);
 await c.api.changeWriteupCount('a',1);assert.equal(data.writeupCounts.counts.a.count,2);
 await c.api.changeWriteupCount('a',-1);await c.api.changeWriteupCount('a',-1);await c.api.changeWriteupCount('a',-1);assert.equal(data.writeupCounts.counts.a.count,0);
 await c.api.changeWriteupCount('b',1);assert.equal(data.writeupCounts.counts.b,undefined);
 assert.equal(data.choreTracker.writeUps.length,1);
});
test('laundry has four columns and completion persists the displayed default date',()=>{
 const c=context({KBRHDates:{today:()=> '2026-11-16',nextMonday:()=> '2026-11-16',addDays:()=> '2026-11-22'}});vm.runInContext(read('charts.js')+'\nglobalThis.api={laundryTable,updateFromInput,setState:v=>chartState=v};',c);
 const state={roster:[{id:'a',firstName:'Ann',phase:'phase1'}],chartData:{laundry:{}}};c.api.setState(state);
 assert.match(c.api.laundryTable(),/<th>Resident Name<\/th>.*>Done<\/th><th>Date<\/th><th>Time<\/th>/);
 c.api.updateFromInput({dataset:{id:'a',kind:'laundry-check'},checked:true});assert.equal(state.chartData.laundry.a.date,'2026-11-16');
 c.api.updateFromInput({dataset:{id:'a',kind:'laundry-date'},value:''});assert.match(c.api.laundryTable(),/data-kind="laundry-date" type="date" value=""/);
});
test('edited log notifications adopt changed priority and recipients without resending unchanged settings',async()=>{
 const data={digitalLogbook:{entries:[{id:'n',note:'Edited note',notificationPriority:'important',notificationRecipients:['old']}]}},mock=database(data),c=context({db:mock.db});vm.runInContext(read('digital-logbook.js')+'\nglobalThis.api={saveLogNotificationSettings,logNotificationSettings};',c);
 await c.api.saveLogNotificationSettings('n',{priority:'urgent',recipients:['new']},'phase1',new Map());
 assert.equal(data.digitalLogbook.entries[0].notificationPriority,'urgent');assert.equal(mock.writes.filter(w=>w.ref?.collection==='kbrhNotifications').length,1);
 assert.equal(mock.writes.find(w=>w.ref?.collection==='kbrhNotifications').value.message,'Edited note');
 const before=mock.writes.length;await c.api.saveLogNotificationSettings('n',{priority:'urgent',recipients:['new']},'phase1',new Map());assert.equal(mock.writes.length,before);
 await c.api.saveLogNotificationSettings('n',{priority:'',recipients:[]},'phase1',new Map());assert.equal(data.digitalLogbook.entries[0].notificationPriority,'');assert.equal(mock.writes.filter(w=>w.ref?.collection==='kbrhNotifications').length,1);
 assert.throws(()=>c.api.logNotificationSettings({get:()=> 'urgent',getAll:()=> []}),/Select at least one/);
});
test('notification directory finishes loading before selections are captured',()=>{
 const source=read('digital-logbook.js');assert.ok(source.indexOf('if(form.querySelector(\'[name="notifyPriority"]\').value)await loading;')<source.indexOf('const fd=new FormData(form)'));
});
test('shared staff picker filters names, enforces one recipient, and resets selections',()=>{
 function node(){return {children:[],classList:{add(){}},setAttribute(){},append(...x){this.children.push(...x)},replaceChildren(){this.children=[]},hidden:false};}
 const c=context({window:{},document:{createElement:node,head:node()}});vm.runInContext(read('staff-recipient-picker.js'),c);const host=node();const picker=c.window.KBRHStaffPicker.mount(host,[{uid:'a',name:'Ann'},{uid:'b',name:'Bob'},{uid:'a',name:'Duplicate'}],{single:true,selected:['a','b']});
 const [search,count,list]=host.children;assert.equal(list.children.length,2);assert.equal(list.children.filter(x=>x.children[0].checked).length,1);
 search.value='bob';search.oninput();assert.equal(list.children[0].hidden,true);assert.equal(list.children[1].hidden,false);
 picker.reset();assert.equal(search.value,'');assert.ok(list.children.every(x=>!x.hidden&&!x.children[0].checked));assert.match(count.textContent,/0 selected/);
});
