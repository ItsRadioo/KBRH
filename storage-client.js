/* Central CMS storage access. Old pages retain their snapshot API; writes are server-authorized. */
(function(){'use strict';
 const control=db.doc('kbrhStorage/control'),legacy=db.doc('kbrh/choreTracker'),codec=window.KBRHStorageCodec;
 let baseline=null,baselineNodes=null,baselineUid=null,meta={},revision=0,loadQueue=Promise.resolve(),saveQueue=Promise.resolve();
 const snapshot=state=>{const capturedRevision=revision;return {exists:true,data:()=>({...codec.clean(state),_storageRevision:capturedRevision})};};
 async function call(name,data){if(!firebase.app().functions)throw Error('Firebase Functions SDK is missing.');return (await firebase.app().functions('northamerica-northeast1').httpsCallable(name)(codec.clean(data))).data;}
 function clearCache(){try{for(let i=sessionStorage.length-1;i>=0;i--){const key=sessionStorage.key(i);if(key.startsWith('kbrh.recordCache.'))sessionStorage.removeItem(key);}}catch(_){}baseline=null;baselineNodes=null;baselineUid=null;}
 function cached(uid){
  if(!uid)return null;if(baselineUid===uid&&baselineNodes&&meta.phase==='active')return {nodes:new Map(baselineNodes),generation:meta.generation,revision};
  try{const value=JSON.parse(sessionStorage.getItem('kbrh.recordCache.'+uid)||'null');if(value?.version!==1||!Array.isArray(value.entries))return null;return {...value,nodes:new Map(value.entries)};}catch(_){return null;}
 }
 function remember(uid,m,nodes){if(!uid||!nodes)return;try{sessionStorage.setItem('kbrh.recordCache.'+uid,JSON.stringify({version:1,generation:m.generation,revision:m.revision,entries:[...nodes]}));}catch(_){try{sessionStorage.removeItem('kbrh.recordCache.'+uid);}catch(__){}}}
 async function incremental(m,prior){
  if(!prior||prior.generation!==m.generation||prior.revision>m.revision||m.revision-prior.revision>25)return null;
  const entries=new Map(prior.nodes);if(prior.revision===m.revision)return entries;
  const generation=db.collection('kbrhStateGenerations').doc(m.generation);
  const changes=await generation.collection('changes').where('revision','>',prior.revision).where('revision','<=',m.revision).orderBy('revision').limit(25).get({source:'server'});
  if(changes.size!==m.revision-prior.revision)return null;
  const actions=new Map();let expected=prior.revision+1;
  for(const doc of changes.docs){const value=doc.data();if(value.revision!==expected++)return null;for(const id of value.upsert||[])actions.set(id,'upsert');for(const id of value.remove||[])actions.set(id,'remove');}
  const ids=[];for(const [id,action] of actions){if(action==='remove')entries.delete(id);else ids.push(id);}
  for(let i=0;i<ids.length;i+=10){const page=await generation.collection('records').where(firebase.firestore.FieldPath.documentId(),'in',ids.slice(i,i+10)).get({source:'server'});if(page.size!==ids.slice(i,i+10).length)return null;page.docs.forEach(d=>entries.set(d.id,d.data()));}
  return entries;
 }
 async function load(){
  const uid=typeof auth==='object'?auth.currentUser?.uid:null;
  for(let attempt=0;attempt<3;attempt++){
   const c=await control.get({source:'server'}),m=c.exists?c.data():{};let state,nodes=null;
   if(m.phase==='active'){
    try{nodes=await incremental(m,cached(uid));if(nodes)state=codec.decode(nodes);}catch(_){nodes=null;}
    if(!nodes){
     const entries=new Map();let last=null;
     for(;;){let q=db.collection('kbrhStateGenerations').doc(m.generation).collection('records').orderBy(firebase.firestore.FieldPath.documentId()).limit(300);if(last)q=q.startAfter(last);const page=await q.get({source:'server'});page.docs.forEach(d=>entries.set(d.id,d.data()));if(page.size<300)break;last=page.docs[page.docs.length-1];}
     state=codec.decode(entries);nodes=entries;
    }
   }else{const s=await legacy.get({source:'server'});if(!s.exists)throw Error('CMS data is missing. An administrator must restore or initialize it.');state=s.data();}
   const after=await control.get({source:'server'}),a=after.exists?after.data():{};
   if((a.revision||0)!==(m.revision||0)||a.phase!==m.phase||a.generation!==m.generation)continue;
   if(uid&&auth.currentUser?.uid!==uid)throw Error('The signed-in account changed during loading.');
   baseline=codec.clean(state);baselineNodes=nodes;baselineUid=uid;meta=m;revision=m.revision||0;remember(uid,m,nodes);return snapshot(state);
  }throw Error('Records changed while loading. Please retry.');
 }
 function get(){const result=loadQueue.catch(()=>{}).then(load);loadQueue=result;return result;}
 function save(patch){
  // Capture this page's baseline NOW, before an unrelated live snapshot can advance it.
  const expected=patch._storageRevision??revision,captured=baseline&&codec.clean(baseline),capturedMeta={...meta},capturedNodes=baselineNodes&&new Map(baselineNodes);
  const run=async()=>{
   if(!captured)throw Error('Load the current CMS records before saving.');
   if(capturedMeta.phase&&capturedMeta.phase!=='active')throw Error('Storage migration is in progress. Changes are temporarily paused.');
   const cleanPatch=codec.clean(patch);delete cleanPatch._storageRevision;
   let data={revision:expected};
   if(capturedMeta.phase==='active')data.operations=codec.diff(capturedNodes,await codec.encode({...captured,...cleanPatch},capturedNodes));else data.patch=cleanPatch;
   const result=await call('saveCMSRecords',data);
   const fresh=await get();const state=fresh.data();patch._storageRevision=state._storageRevision;
   // Keep callers with array references aligned with server-retained admission/archive records.
   for(const key of Object.keys(patch))if(Array.isArray(patch[key])&&Array.isArray(state[key]))patch[key].splice(0,patch[key].length,...state[key]);
   return result;
  };
  const result=saveQueue.catch(()=>{}).then(run);saveQueue=result;return result;
 }
 function onSnapshot(next,error=console.error){let stopped=false,scheduled=false,again=false;
  async function refresh(){if(stopped)return;if(scheduled){again=true;return;}scheduled=true;do{again=false;try{const s=await get();if(!stopped)next(s);}catch(e){if(!stopped)error(e);}}while(again&&!stopped);scheduled=false;}
  const off=control.onSnapshot(refresh,error);return()=>{stopped=true;off();};
 }
 const ref={get,set:save,update:save,onSnapshot};window.kbrhStateRef=()=>ref;
 window.kbrhEditAppState=async transform=>{for(let n=0;n<3;n++){const s=await get(),state=s.data(),patch=await transform(codec.clean(state));try{await save({...patch,_storageRevision:state._storageRevision});return;}catch(e){if(!['functions/aborted','aborted'].includes(e.code)||n===2)throw e;}}};
 window.kbrhPermanentlyDeleteApplicant=async id=>{const s=await get();await call('saveCMSRecords',{revision:s.data()._storageRevision,deleteId:id});await get();};
 // Real Firestore transactions may read CMS data and atomically guard its revision.
 window.kbrhCMSReadGuard=async()=>{const s=await get(),expected=s.data()._storageRevision;return {data:s.data(),check:async tx=>{const c=await tx.get(control);if((c.exists?c.data().revision||0:0)!==expected)throw Error('Resident details changed. Reload and retry.');}};};
 window.kbrhStorageMigration=async action=>call('migrateCMSStorage',{action});
 auth.onAuthStateChanged(user=>{if(!user)clearCache();});
})();
