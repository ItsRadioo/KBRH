'use strict';
const codec=require('./storage-codec');
const INTAKE='intake@kbrh.local',CONTROL='kbrhStorage/control',LEGACY='kbrh/choreTracker';
const MAX_OPS=350;
function createStorageService({db,admin,HttpsError}){
 const fail=(code,message)=>{throw new HttpsError(code,message);};
 const control=db.doc(CONTROL),legacy=db.doc(LEGACY);
 const records=g=>db.collection('kbrhStateGenerations').doc(g).collection('records');
 function staff(req){if(!req.auth)fail('unauthenticated','Staff sign-in required.');}
 function manager(req){staff(req);if(!['admin@kbrh.local','executivedirector@kbrh.local'].includes(String(req.auth.token.email||'').toLowerCase()))fail('permission-denied','Administrator or Executive Director access required.');}
 async function loadRecords(g){const map=new Map();let last=null;for(;;){let q=records(g).orderBy(admin.firestore.FieldPath.documentId()).limit(300);if(last)q=q.startAfter(last);const page=await q.get();page.docs.forEach(d=>map.set(d.id,d.data()));if(page.size<300)break;last=page.docs.at(-1);}return map;}
 async function read(){
  const c=await control.get(),meta=c.exists?c.data():{};
  if(meta.phase!=='active'){const s=await legacy.get();return {state:s.exists?s.data():{},meta,revision:meta.revision||0};}
  const nodes=await loadRecords(meta.generation),after=await control.get();
  if(after.data().revision!==meta.revision)fail('aborted','Records changed while loading. Retry the read.');
  return {state:codec.decode(nodes),nodes,meta,revision:meta.revision};
 }
 async function intakeUser(){try{const u=await admin.auth().getUserByEmail(INTAKE);if(u.disabled)fail('failed-precondition','The Intake account is disabled.');return u;}catch(e){if(e instanceof HttpsError)throw e;fail('failed-precondition','The Intake account must exist before applicants can be archived.');}}
 async function protectWaitlist(req,before,next,deleteId){
  const old=Array.isArray(before.waitlist)?before.waitlist:[],list=Array.isArray(next.waitlist)?next.waitlist:[];
  const ids=new Set();for(const a of list){if(a?.id===undefined||ids.has(String(a.id)))fail('invalid-argument','Waitlist IDs must be present and unique.');ids.add(String(a.id));}
  if(deleteId!==undefined){const user=await intakeUser();if(String(req.auth.token.email||'').toLowerCase()!==INTAKE||req.auth.uid!==user.uid)fail('permission-denied','Only intake@kbrh.local can permanently delete a waitlist applicant.');if(!old.some(a=>String(a.id)===String(deleteId)))fail('not-found','Applicant no longer exists.');}
  for(const a of old){if(ids.has(String(a.id)))continue;if(deleteId!==undefined&&String(a.id)===String(deleteId))continue;
   const transfer=(next.roster||[]).some(r=>String(r?.waitlistSourceId)===String(a.id))&&(next.transferHistory||[]).some(t=>String(t.applicantId||t.waitlistId)===String(a.id));
   if(!transfer)fail('permission-denied','Applicants must be archived. Only Intake can permanently delete them.');
   list.push({...a,archived:true,archivedAt:new Date().toISOString(),archiveReason:'Admitted to program'});
  }
  next.waitlist=list;
  const archived=list.filter(a=>a.archived&&!old.some(o=>String(o.id)===String(a.id)&&o.archived));
  const target=archived.length&&String(req.auth.token.email||'').toLowerCase()!==INTAKE?await intakeUser():null;
  return {archived,target,newIds:list.filter(a=>!old.some(o=>String(o.id)===String(a.id))).map(a=>String(a.id))};
 }
 async function save(req,internal={}){
  staff(req);const input=req.data||{},current=await read();
  if(current.meta.phase&&current.meta.phase!=='active')fail('failed-precondition','Storage migration is in progress. Changes are paused until verification finishes.');
  if(!Number.isInteger(input.revision)||input.revision!==current.revision)fail('aborted','Another staff member saved changes. Reload before trying again.');
  let next;
  if(input.deleteId!==undefined)next={...codec.clean(current.state),waitlist:(current.state.waitlist||[]).filter(a=>String(a.id)!==String(input.deleteId))};
  else if(current.meta.phase==='active'){
   if(!Array.isArray(input.operations)||input.operations.length>MAX_OPS)fail('invalid-argument','This change is too large for one safe save. Save fewer records at a time.');
   const merged=new Map(current.nodes),seen=new Set();
   for(const op of input.operations){if(!/^[a-f0-9]{64}$/.test(op.id)||seen.has(op.id))fail('invalid-argument','Invalid record operation.');seen.add(op.id);
    if(op.node===null)merged.delete(op.id);else{if(!Array.isArray(op.node?.path)||await codec.hash(codec.canonical(op.node.path))!==op.id||Buffer.byteLength(codec.canonical(op.node))>codec.MAX_BYTES)fail('invalid-argument','Invalid or oversized record.');merged.set(op.id,op.node);}}
   try{next=codec.decode(merged);}catch(_){fail('invalid-argument','The record update is incomplete or invalid.');}
  }else{
   if(!input.patch||typeof input.patch!=='object'||Array.isArray(input.patch))fail('invalid-argument','A state patch is required.');
   next={...current.state,...codec.clean(input.patch)};delete next._storageRevision;
  }
  const policy=await protectWaitlist(req,current.state,next,input.deleteId);
  next.updatedAt=new Date().toISOString();delete next._storageRevision;
  const encoded=await codec.encode(next,current.nodes);
  const operations=current.meta.phase==='active'?codec.diff(current.nodes,encoded):[];
  if(operations.reduce((n,op)=>n+Buffer.byteLength(JSON.stringify(op)),0)>3*1024*1024)fail('resource-exhausted','This edit is too large for one safe transaction. Save fewer records at a time.');
  if(operations.length>MAX_OPS)fail('resource-exhausted','This edit changes too many records for one atomic save. Save fewer records at a time.');
  // Stable tombstones prevent older browser sessions from resurrecting deleted applicants.
  const tombstones=await Promise.all(policy.newIds.map(async id=>db.doc('kbrhWaitlistTombstones/'+await codec.hash(id))));
  const deleteRef=input.deleteId===undefined?null:db.doc('kbrhWaitlistTombstones/'+await codec.hash(String(input.deleteId)));
  if(operations.length+policy.archived.length+(internal.backups||[]).length+4>480)fail('resource-exhausted','Too many changes for one atomic save. Save fewer records at a time.');
  const revision=current.revision+1;
  await db.runTransaction(async tx=>{
   const c=await tx.get(control),meta=c.exists?c.data():{};
   if((meta.revision||0)!==current.revision||meta.phase!==current.meta.phase)fail('aborted','Records changed before the save completed. Reload and retry.');
   if(current.meta.phase!=='active'){
    const l=await tx.get(legacy);if(codec.canonical(l.exists?l.data():{})!==codec.canonical(current.state))fail('aborted','Records changed before saving. Reload and retry.');
   }
   for(const ref of tombstones)if((await tx.get(ref)).exists)fail('failed-precondition','A permanently deleted applicant cannot be restored from an old browser session.');
   if(current.meta.phase==='active'){for(const op of operations){const ref=records(meta.generation).doc(op.id);if(op.node===null)tx.delete(ref);else tx.set(ref,op.node);}}
   else{
    if(Buffer.byteLength(JSON.stringify(next))>950000)fail('resource-exhausted','The old shared document is nearly full. Complete the storage migration before saving more data.');
    tx.set(legacy,next);
   }
   tx.set(control,{...meta,revision,updatedAt:next.updatedAt});
   for(const backup of internal.backups||[])tx.set(db.doc('kbrhRetentionBackups/'+backup.id),backup.data);
   if(deleteRef)tx.set(deleteRef,{applicantId:String(input.deleteId),deletedAt:next.updatedAt,deletedByUid:req.auth.uid});
   if(policy.target)for(const a of policy.archived){const ref=db.collection('kbrhNotifications').doc();tx.set(ref,{recipientUid:policy.target.uid,recipientEmail:INTAKE,priority:'important',source:'waitlist-archive',requiresAcknowledgement:true,title:'Waitlist applicant archived',message:[a.firstName,a.lastName].filter(Boolean).join(' ').slice(0,250)+' was archived by '+(req.auth.token.email||'Staff')+'. Reason: '+String(a.archiveReason||'Not provided').slice(0,2000),link:'waitlist.html',createdByUid:req.auth.uid,createdByEmail:req.auth.token.email||'',createdAtIso:next.updatedAt,acknowledgedAt:''});}
   tx.set(db.collection('kbrhAudit').doc(),{staffUid:req.auth.uid,staffEmail:req.auth.token.email||'',page:'State storage',summary:input.deleteId===undefined?'CMS records saved':'Waitlist applicant permanently deleted by Intake',changes:[input.deleteId===undefined?'Atomic record update':'Permanent waitlist deletion'],timestampIso:next.updatedAt,timestamp:admin.firestore.FieldValue.serverTimestamp()});
  });
  return {revision,refresh:true};
 }
 async function migrate(req){
  manager(req);const action=req.data?.action||'status';
  if(action==='status'){const snap=await control.get();return snap.exists?snap.data():{phase:'legacy',revision:0};}
  if(action==='prepare'){
   return db.runTransaction(async tx=>{
    const c=await tx.get(control),meta=c.exists?c.data():{};
    if(meta.phase)return meta;
    const source=await tx.get(legacy);if(!source.exists)fail('failed-precondition','The original CMS document is missing.');
    const state=source.data(),nodes=await codec.encode(state),generation=db.collection('kbrhStateGenerations').doc().id;
    const result={phase:'copying',generation,sourceHash:await codec.hash(codec.canonical(state)),sourceUpdateTime:source.updateTime.toDate().toISOString(),total:nodes.size,cursor:0,revision:meta.revision||0,startedBy:req.auth.uid,startedAt:new Date().toISOString()};
    tx.set(control,result);return result;
   });
  }
  if(action==='step'){
   const c=await control.get(),meta=c.data();if(meta?.phase!=='copying')return meta||{phase:'legacy'};
   const source=await legacy.get(),state=source.data();if(await codec.hash(codec.canonical(state))!==meta.sourceHash)fail('failed-precondition','The original document changed. Migration stopped without activating.');
   const nodes=await codec.encode(state),portion=Array.from(nodes).slice(meta.cursor,meta.cursor+200),cursor=meta.cursor+portion.length;
   await db.runTransaction(async tx=>{const check=await tx.get(control);if(check.data().phase!=='copying'||check.data().cursor!==meta.cursor)fail('aborted','Migration progress changed. Retry this step.');for(const [id,node] of portion)tx.set(records(meta.generation).doc(id),node);tx.update(control,{cursor,phase:cursor===nodes.size?'verifying':'copying'});});
   return {...meta,cursor,phase:cursor===nodes.size?'verifying':'copying'};
  }
  if(action==='verify'){
   const c=await control.get(),meta=c.data();if(!['verifying','ready'].includes(meta?.phase))fail('failed-precondition','Copying must finish before verification.');
   const stored=await loadRecords(meta.generation),decoded=codec.decode(stored),hash=await codec.hash(codec.canonical(decoded)),source=await legacy.get();
   const expected=await codec.encode(source.data());
   if(hash!==meta.sourceHash||stored.size!==meta.total||codec.diff(expected,stored).length)fail('data-loss','Verification failed. The original document is unchanged; the new storage has not been activated.');
   await db.runTransaction(async tx=>{const check=await tx.get(control),original=await tx.get(legacy);if(check.data().generation!==meta.generation||!['verifying','ready'].includes(check.data().phase)||await codec.hash(codec.canonical(original.data()))!==hash)fail('aborted','Migration changed during verification.');tx.update(control,{phase:'ready',verifiedAt:new Date().toISOString(),verifiedHash:hash,verifiedCount:stored.size});});
   return {...meta,phase:'ready',verifiedCount:stored.size};
  }
  if(action==='activate'){
   await db.runTransaction(async tx=>{const c=await tx.get(control),source=await tx.get(legacy),meta=c.data();if(meta?.phase!=='ready'||meta.sourceHash!==meta.verifiedHash||meta.total!==meta.verifiedCount||await codec.hash(codec.canonical(source.data()))!==meta.sourceHash)fail('failed-precondition','Verified copies matching the original are required before activation.');const staged=await tx.get(records(meta.generation)),nodes=new Map(staged.docs.map(d=>[d.id,d.data()]));if(nodes.size!==meta.total||await codec.hash(codec.canonical(codec.decode(nodes)))!==meta.sourceHash||codec.diff(await codec.encode(source.data()),nodes).length)fail('data-loss','The staged copy changed after verification. Activation was blocked.');tx.update(control,{phase:'active',revision:(meta.revision||0)+1,activatedAt:new Date().toISOString(),activatedBy:req.auth.uid});});return {phase:'active'};
  }
  if(action==='cancel'){
   // Cancel only before activation. Staged records and original are retained.
   await db.runTransaction(async tx=>{const c=await tx.get(control),meta=c.data();if(meta?.phase==='active')fail('failed-precondition','Active storage cannot be rolled back to a stale original. Restore requires a separately verified export.');if(meta?.phase)tx.set(control,{revision:meta.revision||0,cancelledGeneration:meta.generation,cancelledAt:new Date().toISOString()});});return {phase:'legacy'};
  }
  fail('invalid-argument','Unknown migration action.');
 }
 async function enforceRetention(){
  let current=await read();if(current.meta.phase&&current.meta.phase!=='active')return;
  const now=new Date(),cutoff=new Date(now);cutoff.setFullYear(cutoff.getFullYear()-2);
  const expired=(current.state.roster||[]).filter(r=>r&&r.archived&&r.archivedAt&&!isNaN(new Date(r.dischargedAt||r.archivedAt))&&new Date(r.dischargedAt||r.archivedAt)<cutoff);
  for(const resident of expired){
   current=await read();if(current.meta.phase&&current.meta.phase!=='active')return;
   const record=(current.state.roster||[]).find(r=>String(r.id)===String(resident.id));if(!record)continue;
   const next={...current.state,roster:current.state.roster.filter(r=>String(r.id)!==String(resident.id))};
   const data=current.meta.phase==='active'?{revision:current.revision,operations:codec.diff(current.nodes,await codec.encode(next,current.nodes))}:{revision:current.revision,patch:{roster:next.roster}};
   const recovery=new Date(now);recovery.setDate(recovery.getDate()+30);
   await save({auth:{uid:'system',token:{email:'system'}},data},{backups:[{id:await codec.hash(String(record.id)),data:{record,deletedFromRosterAt:now.toISOString(),recoveryUntil:recovery.toISOString(),reason:'Automatic 2-year roster retention cleanup'}}]});
  }
  const backups=await db.collection('kbrhRetentionBackups').get();let batch=db.batch(),count=0;
  for(const d of backups.docs){const until=new Date(d.data().recoveryUntil||0);if(!isNaN(until)&&until<now){batch.delete(d.ref);if(++count===400){await batch.commit();batch=db.batch();count=0;}}}if(count)await batch.commit();
 }
 return {read,save,migrate,loadRecords,enforceRetention};
}
module.exports={createStorageService,CONTROL,LEGACY};
module.exports.register=(target,deps)=>{
 const service=createStorageService(deps),options={region:deps.REGION,timeoutSeconds:120,memory:'512MiB'};
 target.saveCMSRecords=deps.onCall(options,req=>service.save(req));
 target.migrateCMSStorage=deps.onCall(options,req=>service.migrate(req));
 return service;
};
