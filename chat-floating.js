/* KBRH chat navigation badge + floating chat; consolidated to reduce script requests. */
/* KBRH staff chat: lightweight cross-page unread indicator. */
(()=>{'use strict';
if(typeof auth==='undefined'||typeof db==='undefined')return;
let stopRooms=null,stopReads=[];const times=new Map();let rooms=[];let subscribedRoomIds="";
function show(){let count=0;for(const r of rooms){const last=r.lastMessageAt?.toMillis?.()||0;if(r.lastSenderUid!==auth.currentUser?.uid&&last>(times.get(r.id)||0))count++;}
document.querySelectorAll('a[href="chat.html"]').forEach(a=>{let b=a.querySelector('.chat-nav-count');if(!count){b?.remove();return;}if(!b){b=document.createElement('span');b.className='chat-nav-count';b.setAttribute('aria-label','Unread conversations');a.append(' ',b);}b.textContent=String(count);});}
function reset(){stopRooms?.();stopRooms=null;stopReads.forEach(f=>f());stopReads=[];times.clear();rooms=[];subscribedRoomIds="";show();}
auth.onAuthStateChanged(user=>{reset();if(!user)return;stopRooms=db.collection('kbrhChatConversations').where('memberUids','array-contains',user.uid).onSnapshot(s=>{rooms=s.docs.map(d=>({id:d.id,...d.data()}));const nextIds=rooms.map(r=>r.id).sort().join("|");if(nextIds===subscribedRoomIds){show();return;}subscribedRoomIds=nextIds;stopReads.forEach(f=>f());stopReads=[];for(const r of rooms){stopReads.push(db.collection('kbrhChatConversations').doc(r.id).collection('reads').doc(user.uid).onSnapshot(d=>{times.set(r.id,d.exists?(d.data().readAt?.toMillis?.()||0):0);show();},()=>{}));}show();},e=>console.warn('Chat badge unavailable:',e.message));});
})();

/* Floating KBRH chat, reuses the existing authenticated chat.html. */
(()=>{'use strict';if(window.__kbrhFloatingChat||location.pathname.split('/').pop()==='chat.html')return;window.__kbrhFloatingChat=true;
function init(){if(document.getElementById('kbrh-chat-launch'))return;
const css=document.createElement('link');css.rel='stylesheet';css.href='chat-floating.css?v=1';document.head.appendChild(css);
const launch=document.createElement('button');launch.id='kbrh-chat-launch';launch.type='button';launch.setAttribute('aria-label','Open staff chat');launch.title='Staff Chat';launch.textContent='✉';
const panel=document.createElement('section');panel.id='kbrh-chat-pop';panel.setAttribute('aria-label','Staff chat window');panel.innerHTML='<div id="kbrh-chat-pop-header"><span>Staff Chat</span><button type="button" id="kbrh-chat-min" title="Minimize" aria-label="Minimize chat">−</button><button type="button" id="kbrh-chat-close" title="Close" aria-label="Close chat">×</button></div>';
let iframe=null;function open(){if(!iframe){iframe=document.createElement('iframe');iframe.title='KBRH staff chat';iframe.src='chat.html?floating=1';panel.appendChild(iframe)}panel.classList.add('open');panel.classList.remove('minimized');launch.setAttribute('aria-expanded','true')}
launch.onclick=()=>panel.classList.contains('open')&&!panel.classList.contains('minimized')?panel.classList.remove('open'):open();
panel.querySelector('#kbrh-chat-min').onclick=()=>{panel.classList.toggle('minimized');launch.setAttribute('aria-expanded',String(!panel.classList.contains('minimized')))};
panel.querySelector('#kbrh-chat-close').onclick=()=>{panel.classList.remove('open');launch.setAttribute('aria-expanded','false')};
document.body.append(launch,panel);
function updateCount(){const nodes=document.querySelectorAll('.chat-nav-count');let count=0;nodes.forEach(n=>{count=Math.max(count,Number(n.textContent)||0)});let badge=launch.querySelector('.kbrh-chat-unread');if(count){if(!badge){badge=document.createElement('span');badge.className='kbrh-chat-unread';launch.appendChild(badge)}{const next=count>99?'99+':String(count);if(badge.textContent!==next)badge.textContent=next}}else badge?.remove()}
new MutationObserver(updateCount).observe(document.body,{subtree:true,childList:true,characterData:true});updateCount();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();})();
