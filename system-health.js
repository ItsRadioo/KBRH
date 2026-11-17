(function(){"use strict";
const $=id=>document.getElementById(id);
function status(id,message,good){const el=$(id);if(!el)return;el.textContent=message;el.className=good?'ok':'bad';}
function withTimeout(p,ms){return Promise.race([p,new Promise((_,reject)=>setTimeout(()=>reject(new Error('Timeout after '+ms+' ms')),ms))]);}
function safeError(e){return String(e?.code||e?.name||'error').replace(/[^a-zA-Z0-9_./-]/g,'').slice(0,80);}
async function check(){
 status('auth-status','Checking...',false);status('profile-status','Checking...',false);status('db-status','Checking...',false);
 const user=await withTimeout(new Promise(resolve=>{let stop=auth.onAuthStateChanged(u=>{stop();resolve(u);},()=>{stop();resolve(null);});}),10000).catch(()=>null);
 if(!user){status('auth-status','Not signed in',false);return;}
 status('auth-status','Authenticated (account identifier available)',true);
 const email=String(user.email||'').toLowerCase();
 if(!['admin@kbrh.local','executivedirector@kbrh.local'].includes(email)){
  status('profile-status','Administrator access required',false);status('db-status','Administrator access required',false);$('health-details').hidden=true;return;
 }
 $('health-details').hidden=false;$('storage-maintenance').hidden=false;await storageStatus();
 try{const snap=await withTimeout(db.collection('kbrh').doc('staffProfiles').get({source:'server'}),10000);const p=snap.data()?.profiles;const profiles=Array.isArray(p)?p:Object.values(p||{});const match=profiles.find(v=>v&&(v.uid===user.uid||String(v.email||'').toLowerCase()===email));status('profile-status',match?'Staff profile found':'No matching profile in staffProfiles',!!match);}catch(e){status('profile-status','Profile check failed: '+safeError(e),false);}
 try{const snap=await withTimeout(kbrhStateRef().get({source:'server'}),12000);status('db-status',snap.exists?'Resident data document reachable':'Resident data document missing',snap.exists);}catch(e){status('db-status','Database check failed: '+safeError(e),false);}
}
let storageBusy=false;
function paintStorage(m){
 m={phase:"legacy",...m};
 $('storage-progress').textContent=m.phase==='active'?'Separate record storage is active.':m.phase==='ready'?`Verified ${m.verifiedCount} records. Ready to activate.`:`Storage: ${m.phase}. Copied ${m.cursor||0} of ${m.total||0} records.`;
 $('storage-copy').hidden=['active','ready'].includes(m.phase);$('storage-copy').disabled=storageBusy;
 $('storage-activate').hidden=m.phase!=='ready';$('storage-activate').disabled=storageBusy;
 $('storage-cancel').hidden=!['copying','verifying','ready'].includes(m.phase);$('storage-cancel').disabled=storageBusy;
}
async function storageStatus(){try{paintStorage(await kbrhStorageMigration('status'));}catch(e){$('storage-progress').textContent='Storage status unavailable: '+e.message;}}
async function copyStorage(){if(storageBusy)return;let migrationError='';storageBusy=true;$('storage-copy').disabled=true;
 try{let m=await kbrhStorageMigration('prepare');paintStorage(m);while(m.phase==='copying'){m=await kbrhStorageMigration('step');paintStorage(m);}if(m.phase==='verifying'||m.phase==='ready')m=await kbrhStorageMigration('verify');paintStorage(m);}
 catch(e){migrationError='Migration paused: '+e.message+' The original is retained. Retry to resume.';}
 finally{storageBusy=false;await storageStatus();if(migrationError)$('storage-progress').textContent=migrationError;}
}
async function activateStorage(){if(storageBusy)return;storageBusy=true;try{await kbrhStorageMigration('activate');}catch(e){alert('Activation failed: '+e.message);}finally{storageBusy=false;await storageStatus();}}
async function cancelStorage(){if(storageBusy)return;storageBusy=true;try{await kbrhStorageMigration('cancel');}catch(e){alert('Could not resume original storage: '+e.message);}finally{storageBusy=false;await storageStatus();}}
window.addEventListener('DOMContentLoaded' ,()=>{ $('run-health').addEventListener('click',check);$('app-version').textContent='KBRH CMS · Record storage repair';$('storage-copy').onclick=copyStorage;$('storage-activate').onclick=activateStorage;$('storage-cancel').onclick=cancelStorage;check();});
})();
