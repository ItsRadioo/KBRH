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
 $('health-details').hidden=false;
 try{const snap=await withTimeout(db.collection('kbrh').doc('staffProfiles').get({source:'server'}),10000);const p=snap.data()?.profiles;const profiles=Array.isArray(p)?p:Object.values(p||{});const match=profiles.find(v=>v&&(v.uid===user.uid||String(v.email||'').toLowerCase()===email));status('profile-status',match?'Staff profile found':'No matching profile in staffProfiles',!!match);}catch(e){status('profile-status','Profile check failed: '+safeError(e),false);}
 try{const snap=await withTimeout(db.collection('kbrh').doc('choreTracker').get({source:'server'}),12000);status('db-status',snap.exists?'Resident data document reachable':'Resident data document missing',snap.exists);}catch(e){status('db-status','Database check failed: '+safeError(e),false);}
}
window.addEventListener('DOMContentLoaded',()=>{ $('run-health').addEventListener('click',check);$('app-version').textContent='Operational handover test · 2026-10-28';check();});
})();
