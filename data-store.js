const APP_DOC_REF = () => db.collection("kbrh").doc("choreTracker");

const STANDARD_CHORES = [
  "Bathroom",
  "Upper floors",
  "Main Floor (morning)",
  "Main Floor (Night)",
  "Basement",
  "Outside Yardwork",
  "Morning dishes",
  "Resident Fridge",
  "General Disinfecting",
  "Special Projects"
];

function defaultAppState() {
  return {
    tableGenerated: false,
    residents: [],
    chores: STANDARD_CHORES,
    history: [],
    mealSchedule: defaultMealSchedule(),
    updatedAt: new Date().toISOString()
  };
}

function defaultMealSchedule() {
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  return {
    weekSchedule: days.reduce((schedule, day) => {
      schedule[day] = { lunch: "", supper1: "", supper2: "" };
      return schedule;
    }, {}),
    history: []
  };
}

function normalizeAppState(state) {
  const base = defaultAppState();
  const merged = { ...base, ...(state || {}) };

  merged.chores = Array.isArray(merged.chores) && merged.chores.length
    ? merged.chores
    : STANDARD_CHORES;

  merged.residents = Array.isArray(merged.residents)
    ? merged.residents.map((resident, index) => ({
        id: resident.id || crypto.randomUUID(),
        name: resident.name || `Resident ${index + 1}`,
        choreIndex: Number.isInteger(Number(resident.choreIndex)) ? Number(resident.choreIndex) : 0,
        exceptions: Array.isArray(resident.exceptions) ? resident.exceptions : [],
        lockedChore: resident.lockedChore || "",
        status: resident.status || "active",
        awayUntil: resident.awayUntil || ""
      }))
    : [];

  merged.history = Array.isArray(merged.history) ? merged.history : [];
  merged.mealSchedule = normalizeMealSchedule(merged.mealSchedule);

  return merged;
}

function normalizeMealSchedule(mealSchedule) {
  const base = defaultMealSchedule();
  const merged = { ...base, ...(mealSchedule || {}) };

  const days = Object.keys(base.weekSchedule);
  days.forEach(day => {
    merged.weekSchedule[day] = {
      lunch: merged.weekSchedule?.[day]?.lunch || "",
      supper1: merged.weekSchedule?.[day]?.supper1 || "",
      supper2: merged.weekSchedule?.[day]?.supper2 || ""
    };
  });

  merged.history = Array.isArray(merged.history) ? merged.history : [];
  return merged;
}

async function loadAppState() {
  const snap = await APP_DOC_REF().get();

  if (!snap.exists) {
    const initial = defaultAppState();
    await saveAppState(initial);
    return initial;
  }

  return normalizeAppState(snap.data());
}

async function saveAppState(state) {
  const cleaned = normalizeAppState(state);
  cleaned.updatedAt = new Date().toISOString();
  await APP_DOC_REF().set(cleaned, { merge: false });
}

function listenToAppState(callback) {
  return APP_DOC_REF().onSnapshot(async snap => {
    if (!snap.exists) {
      const initial = defaultAppState();
      await saveAppState(initial);
      callback(initial);
      return;
    }

    callback(normalizeAppState(snap.data()));
  });
}

function migrateLocalStorageToFirestore() {
  const local = localStorage.getItem("residentChoreRotator.github.v1");
  if (!local) {
    alert("No local backup data found in this browser.");
    return;
  }

  let parsed;
  try {
    parsed = JSON.parse(local);
  } catch {
    alert("Could not read local browser data.");
    return;
  }

  const confirmed = confirm("This will replace the shared online Firestore data with the data saved in this browser. Continue?");
  if (!confirmed) return;

  loadAppState()
    .then(current => {
      const next = normalizeAppState({
        ...current,
        ...parsed,
        mealSchedule: current.mealSchedule || defaultMealSchedule()
      });
      return saveAppState(next);
    })
    .then(() => alert("Local browser data migrated to Firestore."))
    .catch(error => {
      console.error(error);
      alert("Migration failed. Check Firebase setup and Firestore permissions.");
    });
}
