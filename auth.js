const KBRH_SESSION_KEY = "kbrh.activeStaffSession";
let kbrhStaffProfile = null;
let kbrhStaffProfilePromise = null;

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

  kbrhStaffProfilePromise = db.collection("kbrh").doc("staffProfiles").get().then(snapshot => {
    const root = snapshot.exists ? snapshot.data() : {};
    const data = root?.profiles?.[user.uid] || null;
    if (!data) {
      kbrhStaffProfile = { uid:user.uid, email:user.email||"", name:"", role:"", position:"", active:false, missing:true };
    } else {
      kbrhStaffProfile = {
        uid: user.uid,
        email: String(data.email || user.email || "").trim(),
        name: String(data.name || "").trim(),
        role: String(data.role || "Staff").trim(),
        position: String(data.position || data.role || "").trim(),
        active: data.active !== false,
        missing: false
      };
    }
    window.dispatchEvent(new CustomEvent("kbrhStaffProfileReady", { detail: kbrhStaffProfile }));
    return kbrhStaffProfile;
  }).finally(() => { kbrhStaffProfilePromise = null; });

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

    const profile = await loadCurrentStaffProfile();
    if (!profile || profile.missing || !profile.name || profile.active === false) {
      sessionStorage.removeItem(KBRH_SESSION_KEY);
      try { await auth.signOut(); } catch (_) {}
      if (page !== "login.html") window.location.replace("login.html?profile=missing");
    }
  });
}

async function logout() {
  sessionStorage.removeItem(KBRH_SESSION_KEY);
  kbrhStaffProfile = null;
  try { await auth.signOut(); } finally { window.location.replace("login.html"); }
}
