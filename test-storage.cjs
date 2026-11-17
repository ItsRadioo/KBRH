'use strict';
if(!process.env.FIRESTORE_EMULATOR_HOST)throw Error('Refusing to run without the Firestore emulator.');
const assert=require('node:assert/strict'),codec=require('./storage-codec'),admin=require('firebase-admin');
const {HttpsError}=require('firebase-functions/v2/https');
const {createStorageService}=require('./state-storage-service');
const projectId='demo-kbrh-storage';admin.initializeApp({projectId});const db=admin.firestore();
const fakeAdmin={firestore:admin.firestore,auth:()=>({getUserByEmail:async()=>({uid:'intake',email:'intake@kbrh.local',disabled:false})})};
const api=createStorageService({db,admin:fakeAdmin,HttpsError});
let passed=0;
const check=async(name,fn)=>{await fn();console.log('PASS',name);passed++;};
const as=(uid,email,data)=>({auth:{uid,token:{email}},data});
const manager=data=>as('admin','admin@kbrh.local',data),staff=data=>as('staff','attendant@kbrh.local',data),intake=data=>as('intake','intake@kbrh.local',data);
async function edit(transform,actor=staff){const old=await api.read(),state=codec.clean(old.state);transform(state);const operations=codec.diff(old.nodes,await codec.encode(state,old.nodes));return api.save(actor({revision:old.revision,operations}));}
(async()=>{
 await check('Codec preserves nested values, duplicates, order and long Unicode text',async()=>{
  const input={roster:[{id:'a',notes:[{id:1,text:'😀é'.repeat(30000)},{id:1,text:'duplicate ID retained'}],missing:null},{id:'b',nested:{x:[false,0,'',null]}}],special:JSON.parse('{"__proto__":"safe","constructor":"field"}')};
  const nodes=await codec.encode(input);assert.deepEqual(codec.decode(nodes),input);assert.ok([...nodes.values()].every(n=>Buffer.byteLength(codec.canonical(n))<=codec.MAX_BYTES));
 });
 const original={roster:[{id:'r',firstName:'Synthetic',phase:'phase1',notes:[{id:'n',text:'Original note'}]}],waitlist:[{id:'w',firstName:'Synthetic applicant',archived:false,notes:[]}],preScreenings:[],transferHistory:[],counselingNotes:Array.from({length:320},(_,i)=>({id:'synthetic-'+i,text:'Synthetic migration fixture'})),updatedAt:'2026-11-17',nested:{a:1}};
 await db.doc('kbrh/choreTracker').set(original);
 await check('Only a manager can start migration',async()=>assert.rejects(api.migrate(staff({action:'prepare'})),e=>e.code==='permission-denied'));
 let start;
 await check('Prepare freezes migration and preserves the original',async()=>{start=await api.migrate(manager({action:'prepare'}));assert.equal(start.phase,'copying');assert.deepEqual((await db.doc('kbrh/choreTracker').get()).data(),original);});
 await check('Prepare is idempotent and retains generation',async()=>assert.equal((await api.migrate(manager({action:'prepare'}))).generation,start.generation));
 await check('Changes are blocked while copying',async()=>assert.rejects(api.save(staff({revision:0,patch:{nested:{a:2}}})),e=>e.code==='failed-precondition'));
 await check('Activation is blocked before verification',async()=>assert.rejects(api.migrate(manager({action:'activate'})),e=>e.code==='failed-precondition'));
 let state=await api.migrate(manager({action:'step'}));await check('Migration resumes from its saved cursor after interruption',async()=>{assert.equal(state.cursor,200);assert.equal(state.phase,'copying');const again=await api.migrate(manager({action:'prepare'}));assert.equal(again.cursor,200);assert.equal(again.generation,start.generation);});while(state.phase==='copying')state=await api.migrate(manager({action:'step'}));
 await check('Corrupt staged data cannot pass verification',async()=>{const ref=db.collection('kbrhStateGenerations').doc(start.generation).collection('records').doc('bad');await ref.set({path:['invalid'],kind:'scalar',value:1});await assert.rejects(api.migrate(manager({action:'verify'})));await ref.delete();});
 await check('Verification compares all values and document counts',async()=>{const m=await api.migrate(manager({action:'verify'}));assert.equal(m.phase,'ready');assert.equal(m.verifiedCount,start.total);});
 await check('A copy corrupted after verification still cannot activate',async()=>{const ref=db.collection('kbrhStateGenerations').doc(start.generation).collection('records').doc('extra-after-verification');await ref.set({path:['invalid'],kind:'scalar',value:1});await assert.rejects(api.migrate(manager({action:'activate'})));await ref.delete();assert.equal((await db.doc('kbrhStorage/control').get()).data().phase,'ready');});
 await check('Activation switches only after verification',async()=>{await api.migrate(manager({action:'activate'}));const loaded=await api.read();assert.deepEqual(loaded.state,original);assert.equal(loaded.meta.phase,'active');});
 await check('Ordinary edits save and reload from record documents',async()=>{await edit(s=>{s.roster[0].firstName='Updated synthetic';s.roster[0].notes.push({id:'n2',text:'A second note'});});assert.equal((await api.read()).state.roster[0].notes.length,2);assert.equal((await db.doc('kbrh/choreTracker').get()).data().roster[0].firstName,'Synthetic');});
 await check('Stale concurrent edits cannot overwrite another staff save',async()=>{const old=await api.read(),next=codec.clean(old.state);next.nested.a=9;const ops=codec.diff(old.nodes,await codec.encode(next,old.nodes));await edit(s=>s.nested.a=3);await assert.rejects(api.save(staff({revision:old.revision,operations:ops})),e=>e.code==='aborted');assert.equal((await api.read()).state.nested.a,3);});
 for(const actor of [staff,manager])await check('Staff and administrators cannot remove applicants',async()=>assert.rejects(edit(s=>s.waitlist=[],actor),e=>e.code==='permission-denied'));
 await check('Missing Intake account prevents both archive and notification',async()=>{const missing=createStorageService({db,admin:{firestore:admin.firestore,auth:()=>({getUserByEmail:async()=>{throw Error('missing')}})},HttpsError});const old=await api.read(),next=codec.clean(old.state);next.waitlist[0].archived=true;await assert.rejects(missing.save(staff({revision:old.revision,operations:codec.diff(old.nodes,await codec.encode(next,old.nodes))})),e=>e.code==='failed-precondition');assert.equal((await api.read()).state.waitlist[0].archived,false);assert.equal((await db.collection('kbrhNotifications').get()).size,0);});
 await check('Archive and Intake notification commit together',async()=>{await edit(s=>{s.waitlist[0].archived=true;s.waitlist[0].archiveReason='Synthetic test';});const notices=await db.collection('kbrhNotifications').get();assert.equal(notices.size,1);assert.equal(notices.docs[0].data().recipientUid,'intake');assert.equal(notices.docs[0].data().source,'waitlist-archive');});
 await check('Unrelated saves do not duplicate archive notifications',async()=>{await edit(s=>s.nested.a=4);assert.equal((await db.collection('kbrhNotifications').get()).size,1);});
 await check('Administrator cannot call permanent deletion endpoint',async()=>{const s=await api.read();await assert.rejects(api.save(manager({revision:s.revision,deleteId:'w'})),e=>e.code==='permission-denied');});
 await check('Intake can permanently delete a waitlist applicant',async()=>{const s=await api.read();await api.save(intake({revision:s.revision,deleteId:'w'}));assert.equal((await api.read()).state.waitlist.length,0);});
 await check('Deleted applicants cannot be resurrected from stale data',async()=>assert.rejects(edit(s=>s.waitlist.push(original.waitlist[0])),e=>e.code==='failed-precondition'));
 await check('Aggregate state can exceed 1 MiB while individual docs stay bounded',async()=>{
  for(let i=0;i<8;i++)await edit(s=>s.roster.push({id:'large-'+i,firstName:'Synthetic',notes:[{id:'long',text:'😀'.repeat(40000)}]}));
  const s=await api.read();assert.ok(Buffer.byteLength(JSON.stringify(s.state))>1048576);assert.ok([...s.nodes.values()].every(n=>Buffer.byteLength(JSON.stringify(n))<=codec.MAX_BYTES));assert.deepEqual((await db.doc('kbrh/choreTracker').get()).data(),original);
 });
 await check('Active storage cannot roll back to a stale original',async()=>assert.rejects(api.migrate(manager({action:'cancel'})),e=>e.code==='failed-precondition'));
 await check('Prepending to a long history does not rewrite all older notes',async()=>{
  const a={roster:[{id:'r',notes:Array.from({length:1000},(_,i)=>({id:'n'+i,text:'Synthetic'}))}]},before=await codec.encode(a);a.roster[0].notes.unshift({id:'new',text:'New synthetic note'});const after=await codec.encode(a,before);assert.ok(codec.diff(before,after).length<=2);assert.deepEqual(codec.decode(after),a);
 });
 await check('Browser adapter saves and preserves the revision of each snapshot',async()=>{
  const vm=require('node:vm'),fs=require('node:fs');
  const context={console,TextEncoder,crypto,structuredClone,db,firebase:{firestore:{FieldPath:admin.firestore.FieldPath},app:()=>({functions:()=>({httpsCallable:name=>async data=>({data:await api.save(staff(data))})})})}};context.window=context;vm.createContext(context);vm.runInContext(fs.readFileSync('storage-codec.js','utf8'),context);vm.runInContext(fs.readFileSync('storage-client.js','utf8'),context);
  const ref=context.kbrhStateRef(),snap=await ref.get(),oldRevision=snap.data()._storageRevision;
  const patch={nested:{a:88},_storageRevision:oldRevision};await ref.update(patch);assert.equal((await api.read()).state.nested.a,88);assert.ok(patch._storageRevision>oldRevision);assert.equal(snap.data()._storageRevision,oldRevision);
  await assert.rejects(ref.update({nested:{a:99},_storageRevision:oldRevision}),e=>e.code==='aborted');assert.equal((await api.read()).state.nested.a,88);
 });
 await check('Retention backs up an expired resident in the same atomic removal',async()=>{
  await edit(s=>s.roster.push({id:'expired',firstName:'Synthetic',archived:true,archivedAt:'2020-01-01',dischargedAt:'2020-01-01'}));await api.enforceRetention();assert.ok(!(await api.read()).state.roster.some(r=>r.id==='expired'));const backup=await db.doc('kbrhRetentionBackups/'+await codec.hash('expired')).get();assert.equal(backup.data().record.id,'expired');
 });
 const {initializeTestEnvironment,assertFails,assertSucceeds}=require('@firebase/rules-unit-testing');
 const {doc,setDoc,deleteDoc,getDoc}=require('firebase/firestore');
 const env=await initializeTestEnvironment({projectId,firestore:{host:'127.0.0.1',port:8089,rules:require('node:fs').readFileSync('firestore.rules','utf8')}});
 for(const [uid,email] of [['staff','attendant@kbrh.local'],['admin','admin@kbrh.local'],['intake','intake@kbrh.local']]){
  const client=env.authenticatedContext(uid,{email}).firestore();
  await check('Rules block direct core-state edits for '+email,async()=>{await assertFails(setDoc(doc(client,'kbrh/choreTracker'),{waitlist:[]}));await assertFails(deleteDoc(doc(client,'kbrh/choreTracker')));});
  await check('Rules block migration and record bypasses for '+email,async()=>{await assertFails(setDoc(doc(client,'kbrhStorage/control'),{phase:'active'}));await assertFails(setDoc(doc(client,'kbrhStateGenerations/fake/records/fake'),{path:[],kind:'object',value:{}}));await assertFails(setDoc(doc(client,'kbrhWaitlistTombstones/fake'),{applicantId:'w'}));});
  await check('Authenticated staff can read core state for '+email,async()=>assertSucceeds(getDoc(doc(client,'kbrh/choreTracker'))));
 }
 const anon=env.unauthenticatedContext().firestore();await check('Anonymous users cannot read core state',async()=>assertFails(getDoc(doc(anon,'kbrh/choreTracker'))));
 await env.cleanup();console.log(`${passed} storage checks passed`);await db.terminate();
})().catch(async e=>{console.error(e);process.exitCode=1;await db.terminate();});
