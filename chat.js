(()=>{'use strict';const $=id=>document.getElementById(id),ref=db.collection('kbrhChatConversations');let uid='',profile={},staff=[],rooms=[],active='',unsubRooms=null,unsubMsgs=null,unsubReads=null,readMap={},staffPicker=null,directoryReady=false,creating=false;const safe=(s)=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));const stamp=t=>t?.toDate?.()?.toLocaleString()||'';function status(t){$('chatStatus').textContent=t||''}function roomName(r){if(r.type==='staffwide')return 'Staff-wide channel';if(r.type==='group')return r.name||'Group chat';return (r.memberNames||{})[Object.keys(r.memberNames||{}).find(k=>k!==uid)]||'Direct message'}function renderRooms(){const host=$('conversations');host.innerHTML='';rooms.forEach(r=>{const b=document.createElement('button');b.type='button';b.className='chat-conversation'+(r.id===active?' active':'');const unread=r.lastMessageAt?.toMillis?.()>(readMap[r.id]||0)&&r.lastSenderUid!==uid;b.innerHTML='<strong>'+safe(roomName(r))+(unread?' ●':'')+'</strong><small>'+safe(r.lastMessage||'No messages yet')+'</small>';b.onclick=()=>openRoom(r.id);host.appendChild(b)})}function markRead(id){if(!id)return;ref.doc(id).collection('reads').doc(uid).set({readAt:firebase.firestore.FieldValue.serverTimestamp()}).catch(console.error)}function openRoom(id){active=id;unsubMsgs?.();const r=rooms.find(x=>x.id===id);$('chatTitle').textContent=r?roomName(r):'Conversation';$('messages').innerHTML='';$('messages').dataset.empty='No messages yet. Start the conversation below.';renderRooms();unsubMsgs=ref.doc(id).collection('messages').orderBy('createdAt','desc').limit(150).onSnapshot(s=>{const el=$('messages');el.innerHTML='';s.docs.slice().reverse().forEach(d=>{const m=d.data(),div=document.createElement('div');div.className='chat-message'+(m.senderUid===uid?' mine':'');div.innerHTML='<div class="meta">'+'<strong>'+safe(m.senderName||'Staff')+'</strong><time>'+safe(stamp(m.createdAt))+'</time>'+'</div><div>'+safe(m.text)+'</div>';el.appendChild(div)});el.scrollTop=el.scrollHeight;markRead(id)},e=>status('Messages unavailable: '+e.message))}function watchReads(){unsubReads?.();const off=[];rooms.forEach(r=>off.push(ref.doc(r.id).collection('reads').doc(uid).onSnapshot(d=>{readMap[r.id]=d.exists?(d.data().readAt?.toMillis?.()||0):0;renderRooms()},()=>{})));unsubReads=()=>off.forEach(f=>f())}async function loadStaff(){
 const d=await db.collection('kbrh').doc('staffProfiles').get(),root=d.data()||{},byEmail=new Map();
 function walk(o,depth=0){if(!o||typeof o!=='object'||Array.isArray(o)||depth>6)return;for(const [key,v] of Object.entries(o)){if(!v||typeof v!=='object'||Array.isArray(v))continue;if(v.email){const email=String(v.email).trim().toLowerCase(),id=String(v.uid||key),rank=(v.uid?4:0)+(/^[A-Za-z0-9_-]{20,128}$/.test(id)?2:0);if(v.active===false||v.disabled===true||id.includes('/')||id.length>128||id===uid||email===String(auth.currentUser?.email||'').toLowerCase())continue;const prior=byEmail.get(email);if(!prior||rank>prior.rank)byEmail.set(email,{uid:id,name:v.name||v.fullName||email,email,rank});}else walk(v,depth+1);}}
 walk(root.profiles||{});walk(root);staff=[...byEmail.values()].sort((a,b)=>a.name.localeCompare(b.name)).map(p=>({...p,name:p.name+' · '+p.email}));
 staffPicker=KBRHStaffPicker.mount($('staffChoices'),staff,{single:$('chatType').value==='direct'});directoryReady=true;
}async function createRoom(type,members,name=''){
 const memberUids=[...new Set([uid,...members])].sort();
 if(!uid||!auth.currentUser)throw new Error('Sign in before starting a conversation.');
 if(memberUids.length>40)throw new Error('Choose no more than 39 other staff members.');
 const memberNames={[uid]:profile?.name||auth.currentUser.email||'Staff'};
 staff.forEach(s=>{if(memberUids.includes(s.uid))memberNames[s.uid]=s.name});
 if(type==='direct'){
  const id='direct_'+memberUids.join('_');
  // Query only conversations this user can read. A missing-document get is
  // denied by membership rules, and existing conversations cannot be rewritten.
  const findExisting=async()=>{
   const snapshot=await ref.where('memberUids','array-contains',uid).get();
   return snapshot.docs.find(d=>{const r=d.data();return r.type==='direct'&&r.memberUids?.length===2&&memberUids.every(x=>r.memberUids.includes(x));});
  };
  const existing=await findExisting();if(existing)return existing.id;
  try{await ref.doc(id).set({type:'direct',memberUids,memberNames,createdBy:uid,createdAt:firebase.firestore.FieldValue.serverTimestamp()});}
  catch(error){if(String(error.code||'').includes('permission-denied')){const concurrent=await findExisting();if(concurrent)return concurrent.id;}throw error;}
  return id;
 }
 const d=ref.doc();await d.set({type,name,memberUids,memberNames,createdBy:uid,createdAt:firebase.firestore.FieldValue.serverTimestamp()});return d.id;
}
function dialogStatus(text){$('newChatStatus').textContent=text||'';}
auth.onAuthStateChanged(async u=>{if(!u)return;uid=u.uid;profile=await loadCurrentStaffProfile();try{await loadStaff()}catch(e){status('Staff directory unavailable: '+e.message)}unsubRooms?.();unsubRooms=ref.where('memberUids','array-contains',uid).onSnapshot(s=>{rooms=s.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.lastMessageAt?.toMillis?.()||0)-(a.lastMessageAt?.toMillis?.()||0));if(!rooms.some(r=>r.id==='staff-wide')){rooms.push({id:'staff-wide',type:'staffwide',memberUids:[uid]})}renderRooms();watchReads();if(active&&!rooms.some(r=>r.id===active)){active='';unsubMsgs?.()}},e=>status('Chat unavailable: '+e.message))});$('newChat').onclick=async()=>{
 if(creating)return;
 $('newDialog').returnValue='';dialogStatus('');$('newDialog').showModal();
 if(!directoryReady){$('createChat').disabled=true;dialogStatus('Loading staff…');try{await loadStaff();dialogStatus(staff.length?'':'No other active staff accounts are available.');}catch(error){dialogStatus('Could not load staff. Close and reopen to retry: '+error.message);}finally{$('createChat').disabled=false;}}
};
$('chatType').onchange=()=>{const group=$('chatType').value==='group';$('groupNameWrap').hidden=!group;staffPicker?.setSingle(!group);dialogStatus('');};
$('newChatForm').addEventListener('submit',async event=>{
 event.preventDefault();if(creating)return;
 if(event.submitter?.value==='cancel'){$('newDialog').close('cancel');return;}
 const members=[...$('staffChoices').querySelectorAll('input[type="checkbox"]:checked')].map(x=>x.value),type=$('chatType').value,name=$('groupName').value.trim();
 if(!directoryReady){dialogStatus('Staff are still loading. Please try again.');return;}
 if(!members.length||(type==='direct'&&members.length!==1)||(type==='group'&&!name)){dialogStatus('Select one person for a direct message, or name a group and select members.');return;}
 if(members.length>39){dialogStatus('Choose no more than 39 other staff members.');return;}
 creating=true;$('createChat').disabled=true;dialogStatus('Opening conversation…');
 try{const id=await createRoom(type,members,name);openRoom(id);$('newDialog').close('create');status('');}
 catch(error){dialogStatus('Could not create conversation: '+error.message);}
 finally{creating=false;$('createChat').disabled=false;}
});
$('staffWide').onclick=async()=>{try{const id='staff-wide';const d=ref.doc(id);await db.runTransaction(async tx=>{const snap=await tx.get(d);if(!snap.exists)tx.set(d,{type:'staffwide',name:'Staff-wide channel',memberUids:[uid],memberNames:{[uid]:profile?.name||auth.currentUser.email},createdBy:uid,createdAt:firebase.firestore.FieldValue.serverTimestamp()})});openRoom(id)}catch(e){status(e.message)}};$('messageForm').onsubmit=async e=>{e.preventDefault();const text=$('messageText').value.trim();if(!active||!text){status('Choose a conversation first.');return}const r=ref.doc(active);try{const batch=db.batch(),m=r.collection('messages').doc();batch.set(m,{text,senderUid:uid,senderName:profile?.name||auth.currentUser.email,createdAt:firebase.firestore.FieldValue.serverTimestamp()});batch.update(r,{lastMessage:text.slice(0,120),lastMessageAt:firebase.firestore.FieldValue.serverTimestamp(),lastSenderUid:uid});await batch.commit();$('messageText').value='';status('')}catch(err){status('Message not sent: '+err.message)}};})();