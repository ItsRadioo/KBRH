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
function updateCount(){const nodes=document.querySelectorAll('.chat-nav-count');let count=0;nodes.forEach(n=>{count=Math.max(count,Number(n.textContent)||0)});let badge=launch.querySelector('.kbrh-chat-unread');if(count){if(!badge){badge=document.createElement('span');badge.className='kbrh-chat-unread';launch.appendChild(badge)}badge.textContent=count>99?'99+':String(count)}else badge?.remove()}
new MutationObserver(updateCount).observe(document.body,{subtree:true,childList:true,characterData:true});updateCount();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();})();
