const KBRH_SESSION_KEY = "kbrh.activeStaffSession";
let kbrhStaffProfile = null;
let kbrhStaffProfilePromise = null;


const KBRH_ADMIN_EMAILS = new Set([
  "admin@kbrh.local",
  "executivedirector@kbrh.local"
]);

function isKbrhAdmin(user=auth.currentUser){
  return KBRH_ADMIN_EMAILS.has(String(user?.email||"").trim().toLowerCase());
}

function isKbrhAccountManager(user=auth.currentUser){
  return isKbrhAdmin(user);
}

function applyAdminVisibility(user=auth.currentUser){
  const allowed=isKbrhAdmin(user);
  document.querySelectorAll("[data-admin-only]").forEach(el=>{
    if (allowed) {
      el.hidden = false;
      el.removeAttribute("aria-hidden");
    } else {
      // Do not merely hide admin navigation with CSS. Remove it from the
      // rendered document so non-admin staff cannot see or focus the link.
      el.remove();
    }
  });
  const accountManagerAllowed=isKbrhAccountManager(user);
  document.querySelectorAll("[data-account-manager-only]").forEach(el=>{
    if(accountManagerAllowed){ el.hidden=false; el.removeAttribute("aria-hidden"); }
    else el.remove();
  });
}

async function ensureSessionPersistence() {
  try {
    await auth.setPersistence(firebase.auth.Auth.Persistence.SESSION);
  } catch (error) {
    console.warn("Could not set session-only authentication persistence.", error);
  }
}

function fallbackStaffName(user = auth.currentUser) {
  if (!user) return "Staff User";
  if (user.displayName && user.displayName.trim()) return user.displayName.trim();
  const local = String(user.email || "Staff User").split("@")[0].replace(/[._-]+/g, " ");
  return local.replace(/\b\w/g, c => c.toUpperCase());
}

async function loadCurrentStaffProfile(force = false) {
  const user = auth.currentUser;
  if (!user) return null;
  if (!force && kbrhStaffProfile && kbrhStaffProfile.uid === user.uid) return kbrhStaffProfile;
  if (!force && kbrhStaffProfilePromise) return kbrhStaffProfilePromise;

  kbrhStaffProfilePromise = (async () => {
    try {
      const snapshot = await db.collection("kbrh").doc("staffProfiles").get();
      const root = snapshot.exists ? (snapshot.data() || {}) : {};

      // Preferred layout:
      // kbrh/staffProfiles -> profiles -> <Firebase UID> -> { name, email, role, active }
      //
      // Firestore's console makes it easy to accidentally nest the UID map one
      // level differently, so resolve the profile defensively. Exact UID always
      // wins; authenticated email is only a fallback.
      const isPlainObject = value => value && typeof value === "object" && !Array.isArray(value);
      const profiles = isPlainObject(root.profiles) ? root.profiles : {};

      function findProfileByUid(node, uid, depth = 0) {
        if (!isPlainObject(node) || depth > 6) return null;
        if (isPlainObject(node[uid])) return node[uid];
        for (const value of Object.values(node)) {
          const found = findProfileByUid(value, uid, depth + 1);
          if (found) return found;
        }
        return null;
      }

      function findProfileByEmail(node, email, depth = 0) {
        if (!isPlainObject(node) || depth > 6) return null;
        if (String(node.email || "").trim().toLowerCase() === email &&
            ("name" in node || "role" in node || "active" in node)) return node;
        for (const value of Object.values(node)) {
          const found = findProfileByEmail(value, email, depth + 1);
          if (found) return found;
        }
        return null;
      }

      let data = profiles[user.uid] || root[user.uid] || findProfileByUid(root, user.uid);

      if (!data && user.email) {
        data = findProfileByEmail(root, String(user.email).trim().toLowerCase());
      }

      if (!data) {
        kbrhStaffProfile = {
          uid: user.uid,
          email: user.email || "",
          name: "",
          role: "",
          position: "",
          active: true,
          mustChangePassword: false,
          missing: true
        };
      } else {
        kbrhStaffProfile = {
          uid: user.uid,
          email: String(data.email || user.email || "").trim(),
          name: String(data.name || "").trim(),
          role: String(data.role || "Staff").trim(),
          position: String(data.position || data.role || "").trim(),
          active: data.active !== false,
          mustChangePassword: data.mustChangePassword === true,
          missing: false
        };
      }
    } catch (error) {
      // A profile lookup must NEVER stop normal application saves. If Firestore
      // rules have not yet been updated, use the authenticated Firebase identity
      // temporarily and retry on a later page load/forced lookup.
      console.warn("Could not load staff profile; using authenticated account fallback.", error);
      kbrhStaffProfile = {
        uid: user.uid,
        email: user.email || "",
        name: "",
        role: "",
        position: "",
        active: true,
        mustChangePassword: false,
        missing: true,
        lookupFailed: true
      };
    }

    window.dispatchEvent(new CustomEvent("kbrhStaffProfileReady", { detail: kbrhStaffProfile }));
    return kbrhStaffProfile;
  })().finally(() => { kbrhStaffProfilePromise = null; });

  return kbrhStaffProfilePromise;
}

async function getCurrentStaffIdentity() {
  const user = auth.currentUser;
  if (!user) return { uid: "", email: "", name: "Unknown Staff", position: "" };
  const profile = await loadCurrentStaffProfile();
  return {
    uid: user.uid,
    email: user.email || "",
    name: profile?.name || fallbackStaffName(user),
    position: profile?.position || ""
  };
}

function currentStaffName() {
  return kbrhStaffProfile?.name || fallbackStaffName(auth.currentUser);
}

function currentStaffEmail() {
  return auth.currentUser?.email || "";
}

function currentStaffPosition() {
  return kbrhStaffProfile?.position || "";
}

async function requireLogin() {
  await ensureSessionPersistence();
  auth.onAuthStateChanged(async user => {
    const page = window.location.pathname.split("/").pop() || "index.html";
    if (!user) {
      if (page !== "login.html") window.location.replace("login.html");
      return;
    }

    const sessionUid = sessionStorage.getItem(KBRH_SESSION_KEY);
    if (sessionUid !== user.uid) {
      try { await auth.signOut(); } catch (_) {}
      if (page !== "login.html") window.location.replace("login.html");
      return;
    }

    applyAdminVisibility(user);
    if(isKbrhAccountManager(user) && !document.querySelector('a[href="staff-accounts.html"]')){const nav=document.querySelector(".app-nav");if(nav){const a=document.createElement("a");a.className="app-nav-link";a.href="staff-accounts.html";a.textContent="Staff Accounts";nav.appendChild(a);}}
    const profile = await loadCurrentStaffProfile();
    // Do not block a valid Firebase login if the staff profile has not been
    // configured yet. When a profile exists, its name is used for auditing.
    // Otherwise the app temporarily falls back to the authenticated account
    // display name/email so staff can continue working.
    if (profile?.mustChangePassword && page !== "change-password.html") {
      window.location.replace("change-password.html");
      return;
    }
    if (!profile?.mustChangePassword && page === "change-password.html") {
      window.location.replace("index.html");
      return;
    }

    if (profile && profile.active === false) {
      sessionStorage.removeItem(KBRH_SESSION_KEY);
      try { await auth.signOut(); } catch (_) {}
      if (page !== "login.html") window.location.replace("login.html?profile=inactive");
      return;
    }
    if(page !== "login.html" && page !== "change-password.html") initializeKbrhNotifications(user);
  });
}

async function logout() {
  sessionStorage.removeItem(KBRH_SESSION_KEY);
  kbrhStaffProfile = null;
  try { await auth.signOut(); } finally { window.location.replace("login.html"); }
}


let kbrhNotificationUnsubscribe=null;
function notificationEscape(value){return String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));}
function initializeKbrhNotifications(user=auth.currentUser){
  if(!user||document.getElementById("kbrhNotificationBell"))return;
  const wrap=document.createElement("div");
  wrap.className="kbrh-notification-wrap";
  wrap.innerHTML=`<button id="kbrhNotificationBell" class="kbrh-notification-bell" type="button" aria-label="Notifications">🔔<span id="kbrhNotificationCount" hidden>0</span></button><section id="kbrhNotificationPanel" class="kbrh-notification-panel" hidden><div class="kbrh-notification-head"><strong>Notifications</strong><button type="button" id="kbrhNotificationClose">×</button></div><div id="kbrhNotificationList"><p class="hint">Loading…</p></div><button type="button" class="secondary" id="kbrhEnablePushBtn">Enable Browser Alerts</button></section>`;
  document.body.appendChild(wrap);
  const panel=wrap.querySelector("#kbrhNotificationPanel");
  wrap.querySelector("#kbrhNotificationBell").onclick=()=>panel.hidden=!panel.hidden;
  wrap.querySelector("#kbrhNotificationClose").onclick=()=>panel.hidden=true;
  wrap.querySelector("#kbrhEnablePushBtn").onclick=enableKbrhBrowserNotifications;
  if(kbrhNotificationUnsubscribe)kbrhNotificationUnsubscribe();
  kbrhNotificationUnsubscribe=db.collection("kbrhNotifications").where("recipientUid","==",user.uid).limit(100).onSnapshot(snap=>{
    const rows=snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>String(b.createdAtIso||"").localeCompare(String(a.createdAtIso||""))).slice(0,40);
    const unread=rows.filter(n=>!n.acknowledgedAt).length;
    const badge=wrap.querySelector("#kbrhNotificationCount");
    badge.textContent=String(unread);
    badge.hidden=!unread;
    const list=wrap.querySelector("#kbrhNotificationList");
    list.innerHTML=rows.length?rows.map(n=>{
      const receipt=n.source==="acknowledgement-receipt"||n.requiresAcknowledgement===false;
      const done=Boolean(n.acknowledgedAt);
      const action=done
        ? `<span>✓ ${receipt?"Read":"Acknowledged"}</span>`
        : receipt
          ? `<button type="button" onclick="acknowledgeKbrhNotification('${n.id}')">Mark read</button>`
          : `<label class="kbrh-acknowledge-check"><input type="checkbox" onchange="acknowledgeKbrhNotification('${n.id}',this)"> I have read and acknowledge this note</label>`;
      return `<article class="kbrh-notification-item ${done?"":"unread"}"><div><strong>${notificationEscape((n.priority||"important").toUpperCase())}: ${notificationEscape(n.title||"Log Book notification")}</strong><small>${notificationEscape(n.createdByName||"Staff")} · ${notificationEscape(n.createdAtIso?new Date(n.createdAtIso).toLocaleString("en-CA"):"")}</small></div><div class="kbrh-notification-actions"><a href="${notificationEscape(n.link||"digital-logbook.html")}">Open</a>${action}</div></article>`;
    }).join(""):'<p class="hint">No notifications.</p>';
    showRequiredKbrhAcknowledgement(rows);
  },e=>console.warn("Notification subscription failed",e));
}
function showRequiredKbrhAcknowledgement(rows){
  const pending=rows.filter(n=>n.requiresAcknowledgement!==false&&n.source==="digital-logbook"&&!n.acknowledgedAt);
  let overlay=document.getElementById("kbrhRequiredAckOverlay");
  if(!pending.length){
    if(overlay)overlay.remove();
    document.body.classList.remove("kbrh-ack-lock");
    return;
  }
  const n=pending.slice().sort((a,b)=>String(a.createdAtIso||"").localeCompare(String(b.createdAtIso||"")))[0];
  if(!overlay){
    overlay=document.createElement("div");
    overlay.id="kbrhRequiredAckOverlay";
    overlay.className="kbrh-required-ack-overlay";
    document.body.appendChild(overlay);
  }
  document.body.classList.add("kbrh-ack-lock");
  const priority=String(n.priority||"important").toLowerCase()==="urgent"?"URGENT":"IMPORTANT";
  const message=String(n.message||"").trim();
  const remaining=pending.length>1?`<p class="kbrh-required-ack-remaining">${pending.length-1} additional notification${pending.length===2?"":"s"} waiting after this one.</p>`:"";
  overlay.innerHTML=`<section class="kbrh-required-ack-dialog" role="alertdialog" aria-modal="true" aria-labelledby="kbrhRequiredAckTitle"><div class="kbrh-required-ack-priority ${priority.toLowerCase()}">${priority} — ACKNOWLEDGEMENT REQUIRED</div><h2 id="kbrhRequiredAckTitle">${notificationEscape(n.title||"Digital Log Book notification")}</h2><p class="kbrh-required-ack-meta">From ${notificationEscape(n.createdByName||"Staff")} · ${notificationEscape(n.createdAtIso?new Date(n.createdAtIso).toLocaleString("en-CA"):"")}</p>${message?`<div class="kbrh-required-ack-message">${notificationEscape(message)}</div>`:`<p class="kbrh-required-ack-message">A protected Digital Log Book entry requires your attention.</p>`}${remaining}<label class="kbrh-required-ack-check"><input id="kbrhRequiredAckCheck" type="checkbox"> <span>I have read and acknowledge this notification.</span></label><button id="kbrhRequiredAckButton" type="button" disabled>Acknowledge and Continue</button></section>`;
  const check=overlay.querySelector("#kbrhRequiredAckCheck");
  const button=overlay.querySelector("#kbrhRequiredAckButton");
  check.onchange=()=>{button.disabled=!check.checked;};
  button.onclick=async()=>{
    if(!check.checked)return;
    check.disabled=true;button.disabled=true;button.textContent="Recording acknowledgement…";
    await acknowledgeKbrhNotification(n.id,check);
  };
}
async function acknowledgeKbrhNotification(id,checkbox=null){
  const user=auth.currentUser;
  if(!user)return;
  if(checkbox)checkbox.disabled=true;
  try{
    const ref=db.collection("kbrhNotifications").doc(id);
    const snap=await ref.get();
    if(!snap.exists)throw new Error("Notification no longer exists.");
    const notification=snap.data()||{};
    if(notification.recipientUid!==user.uid)throw new Error("This notification is not assigned to your account.");
    if(notification.acknowledgedAt)return;
    const identity=await getCurrentStaffIdentity();
    const now=new Date().toISOString();
    const batch=db.batch();
    batch.update(ref,{acknowledgedAt:now,acknowledgedByUid:user.uid,acknowledgedByName:identity.name||fallbackStaffName(user)});
    const requiresReceipt=notification.requiresAcknowledgement!==false&&notification.source==="digital-logbook"&&Boolean(notification.createdByUid)&&notification.createdByUid!==user.uid;
    if(requiresReceipt){
      const receiptRef=db.collection("kbrhNotifications").doc();
      const priority=String(notification.priority||"important").toLowerCase()==="urgent"?"urgent":"important";
      const staffName=identity.name||fallbackStaffName(user);
      batch.set(receiptRef,{
        recipientUid:notification.createdByUid,
        recipientName:notification.createdByName||"",
        priority,
        title:`${staffName} acknowledged your ${priority==="urgent"?"Urgent":"Important"} Digital Log Book note.`,
        source:"acknowledgement-receipt",
        requiresAcknowledgement:false,
        originalNotificationId:id,
        logScope:notification.logScope||"phase1",
        logEntryId:notification.logEntryId||"",
        link:notification.link||"digital-logbook.html",
        createdAtIso:now,
        createdAt:firebase.firestore.FieldValue.serverTimestamp(),
        createdByUid:user.uid,
        createdByName:staffName,
        acknowledgedAt:""
      });
    }
    await batch.commit();
  }catch(error){
    console.error("Could not acknowledge notification",error);
    if(checkbox){checkbox.checked=false;checkbox.disabled=false;}
    alert(error.message||"The notification could not be acknowledged.");
  }
}
async function loadFirebaseMessagingSdk(){if(firebase.messaging)return;await new Promise((resolve,reject)=>{const s=document.createElement("script");s.src="https://www.gstatic.com/firebasejs/10.12.5/firebase-messaging-compat.js";s.onload=resolve;s.onerror=reject;document.head.appendChild(s)});}
async function enableKbrhBrowserNotifications(){
  try{
    let vapidKey=String(window.KBRH_FCM_VAPID_KEY||"").trim();
    try{
      const settingsSnap=await db.collection("kbrh").doc("settings").get();
      vapidKey=String(settingsSnap.exists?(settingsSnap.data()?.webPushVapidKey||vapidKey):vapidKey).trim();
    }catch(error){console.warn("Could not load Web Push key from System Settings.",error);}
    if(!vapidKey){alert("Browser alerts are not configured yet. An Administrator or the Executive Director can add the Web Push public key under System Settings. In-app notifications remain active.");return;}
    if(!(await Notification.requestPermission()==="granted"))return;
    await loadFirebaseMessagingSdk();const registration=await navigator.serviceWorker.register("firebase-messaging-sw.js");const token=await firebase.messaging().getToken({vapidKey,serviceWorkerRegistration:registration});if(!token)throw new Error("No push token returned.");const user=auth.currentUser;await db.collection("kbrhPushTokens").doc(user.uid).set({uid:user.uid,email:user.email||"",tokens:firebase.firestore.FieldValue.arrayUnion(token),updatedAt:new Date().toISOString()},{merge:true});alert("Browser alerts are enabled on this device.");
  }catch(error){console.error(error);alert("Browser alerts could not be enabled. In-app notifications will continue to work.");}
}
