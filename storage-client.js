/* Central CMS storage access. Old pages retain their snapshot API; writes are server-authorized. */
(function(){'use strict';
 const control=db.doc('kbrhStorage/control'),legacy=db.doc('kbrh/choreTracker'),codec=window.KBRHStorageCodec;
 let baseline=null,baselineNodes=null,meta={},revision=0,loadQueue=Promise.resolve(),saveQueue=Promise.resolve();
 const snapshot=state=>{const capturedRevision=revision;return {exists:true,data:()=>({...codec.clean(state),_storageRevision:capturedRevision})};};
 async function call(name,data){if(!firebase.app().functions)throw Error('Firebase Functions SDK is missing.');return (await firebase.app().functions('northamerica-northeast1').httpsCallable(name)(data)).data;}
 async function load(){
  for(let attempt=0;attempt<3;attempt++){
   const c=await control.get({source:'server'}),m=c.exists?c.data():{};let state,nodes=null;
   if(m.phase==='active'){
    const entries=new Map();let last=null;
    for(;;){let q=db.collection('kbrhStateGenerations').doc(m.generation).collection('records').orderBy(firebase.firestore.FieldPath.documentId()).limit(300);if(last)q=q.startAfter(last);const page=await q.get({source:'server'});page.docs.forEach(d=>entries.set(d.id,d.data()));if(page.size<300)break;last=page.docs[page.docs.length-1];}
    state=codec.decode(entries);nodes=entries;
   }else{const s=await legacy.get({source:'server'});if(!s.exists)throw Error('CMS data is missing. An administrator must restore or initialize it.');state=s.data();}
   const after=await control.get({source:'server'}),a=after.exists?after.data():{};
   if((a.revision||0)!==(m.revision||0)||a.phase!==m.phase||a.generation!==m.generation)continue;
   baseline=codec.clean(state);baselineNodes=nodes;meta=m;revision=m.revision||0;return snapshot(state);
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
})();
