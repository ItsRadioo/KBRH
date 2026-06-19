const AUTH_KEY = "residentChoreRotator.staffLoggedIn";
const PASSWORD_HASH = "KBRH2026";
// Default password: changeme

async function sha256(text) {
  const data = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(byte => byte.toString(16).padStart(2, "0"))
    .join("");
}

function isLoggedIn() {
  return sessionStorage.getItem(AUTH_KEY) === "true";
}

function requireLogin() {
  if (!isLoggedIn()) {
    window.location.href = "login.html";
  }
}

function logout() {
  sessionStorage.removeItem(AUTH_KEY);
  window.location.href = "login.html";
}
