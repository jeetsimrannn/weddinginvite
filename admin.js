const STORAGE_KEYS = {
  updates: "engagement_updates",
  rsvps: "engagement_rsvps",
};

const ADMIN_PIN = "4580";
const SESSION_KEY = "engagement_admin_unlocked";

const authCard = document.getElementById("authCard");
const authForm = document.getElementById("authForm");
const authError = document.getElementById("authError");
const dashboard = document.getElementById("dashboard");
const lockDashboard = document.getElementById("lockDashboard");
const updateForm = document.getElementById("updateForm");
const updatesList = document.getElementById("updatesList");
const rsvpList = document.getElementById("rsvpList");

const statEls = {
  yes: document.getElementById("yesCount"),
  no: document.getElementById("noCount"),
  maybe: document.getElementById("maybeCount"),
  total: document.getElementById("totalGuests"),
};

function readStore(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeStore(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function formatTimeStamp(iso) {
  return new Date(iso).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function renderUpdates() {
  const updates = readStore(STORAGE_KEYS.updates, []);
  updatesList.innerHTML = "";

  if (!updates.length) {
    const li = document.createElement("li");
    li.textContent = "No updates posted yet.";
    updatesList.appendChild(li);
    return;
  }

  updates
    .slice()
    .reverse()
    .forEach((update) => {
      const li = document.createElement("li");
      li.innerHTML = `<strong>${update.message}</strong><br><small>${formatTimeStamp(update.createdAt)}</small>`;
      updatesList.appendChild(li);
    });
}

function renderRsvps() {
  const rsvps = readStore(STORAGE_KEYS.rsvps, []);
  rsvpList.innerHTML = "";

  const stats = { yes: 0, no: 0, maybe: 0, total: 0 };

  rsvps.forEach((entry) => {
    if (stats[entry.attendance] !== undefined) {
      stats[entry.attendance] += 1;
    }
    stats.total += Number(entry.guestCount) || 0;

    const li = document.createElement("li");
    const label =
      entry.attendance === "yes"
        ? "Attending"
        : entry.attendance === "no"
          ? "Not attending"
          : "Maybe";

    li.innerHTML = `<strong>${entry.name}</strong> (${entry.guestCount}) - ${label}`;
    rsvpList.appendChild(li);
  });

  statEls.yes.textContent = stats.yes;
  statEls.no.textContent = stats.no;
  statEls.maybe.textContent = stats.maybe;
  statEls.total.textContent = stats.total;

  if (!rsvps.length) {
    const li = document.createElement("li");
    li.textContent = "No RSVPs submitted yet.";
    rsvpList.appendChild(li);
  }
}

function unlock() {
  authCard.hidden = true;
  dashboard.hidden = false;
  renderUpdates();
  renderRsvps();
}

authForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const pin = String(new FormData(authForm).get("adminPin") || "").trim();

  if (pin !== ADMIN_PIN) {
    authError.hidden = false;
    return;
  }

  authError.hidden = true;
  sessionStorage.setItem(SESSION_KEY, "true");
  authForm.reset();
  unlock();
});

updateForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const input = document.getElementById("updateMessage");
  const message = input.value.trim();
  if (!message) return;

  const updates = readStore(STORAGE_KEYS.updates, []);
  updates.push({ message, createdAt: new Date().toISOString() });
  writeStore(STORAGE_KEYS.updates, updates);

  input.value = "";
  renderUpdates();
});

lockDashboard.addEventListener("click", () => {
  sessionStorage.removeItem(SESSION_KEY);
  dashboard.hidden = true;
  authCard.hidden = false;
});

if (sessionStorage.getItem(SESSION_KEY) === "true") {
  unlock();
}
