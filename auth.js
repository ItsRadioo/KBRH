const AUTH_KEY = "residentChoreRotator.staffLoggedIn";
const STAFF_PASSWORD = "KBRH2026";

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
