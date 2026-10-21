/* KBRH staff chat: lightweight cross-page unread indicator. */
(()=>{'use strict';
if(typeof auth==='undefined'||typeof db==='undefined')return;
let stopRooms=null,stopReads=[];const times=new Map();let rooms=[];
function show(){let count=0;for(const r of rooms){const last=r.lastMessageAt?.toMillis?.()||0;if(r.lastSenderUid!==auth.currentUser?.uid&&last>(times.get(r.id)||0))count++;}
document.querySelectorAll('a[href="chat.html"]').forEach(a=>{let b=a.querySelector('.chat-nav-count');if(!count){b?.remove();return;}if(!b){b=document.createElement('span');b.className='chat-nav-count';b.setAttribute('aria-label','Unread conversations');a.append(' ',b);}b.textContent=String(count);});}
function reset(){stopRooms?.();stopRooms=null;stopReads.forEach(f=>f());stopReads=[];times.clear();rooms=[];show();}
auth.onAuthStateChanged(user=>{reset();if(!user)return;stopRooms=db.collection('kbrhChatConversations').where('memberUids','array-contains',user.uid).onSnapshot(s=>{stopReads.forEach(f=>f());stopReads=[];rooms=s.docs.map(d=>({id:d.id,...d.data()}));for(const r of rooms){stopReads.push(db.collection('kbrhChatConversations').doc(r.id).collection('reads').doc(user.uid).onSnapshot(d=>{times.set(r.id,d.exists?(d.data().readAt?.toMillis?.()||0):0);show();},()=>{}));}show();},e=>console.warn('Chat badge unavailable:',e.message));});
})();
