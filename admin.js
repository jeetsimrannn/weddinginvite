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
const dedupeRsvp = document.getElementById("dedupeRsvp");
const clearRsvp = document.getElementById("clearRsvp");
const storageMode = document.getElementById("storageMode");
let refreshTimer = null;

const store = window.InviteStore;

const statEls = {
  yes: document.getElementById("yesCount"),
  no: document.getElementById("noCount"),
  maybe: document.getElementById("maybeCount"),
  total: document.getElementById("totalGuests"),
};

function formatTimeStamp(iso) {
  return new Date(iso).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function normalizeName(name) {
  return store.normalizeName(name);
}

async function renderUpdates() {
  const updates = await store.getUpdates();
  updatesList.innerHTML = "";

  if (!updates.length) {
    const li = document.createElement("li");
    li.textContent = "No updates posted yet.";
    updatesList.appendChild(li);
    return;
  }

  updates.forEach((update) => {
    const li = document.createElement("li");
    li.innerHTML = `<strong>${update.message}</strong><br><small>${formatTimeStamp(update.createdAt)}</small>`;
    updatesList.appendChild(li);
  });
}

async function renderRsvps() {
  const rsvps = await store.getRsvps();
  rsvpList.innerHTML = "";

  const stats = { yes: 0, no: 0, maybe: 0, total: 0 };

  rsvps.forEach((entry) => {
    if (stats[entry.attendance] !== undefined) {
      stats[entry.attendance] += 1;
    }
    stats.total += Number(entry.guestCount) || 0;

    const li = document.createElement("li");
    li.className = "rsvp-item";

    const label =
      entry.attendance === "yes"
        ? "Attending"
        : entry.attendance === "no"
          ? "Not attending"
          : "Maybe";

    const time = entry.createdAt ? formatTimeStamp(entry.createdAt) : "Unknown time";

    li.innerHTML = `
      <div>
        <strong>${entry.name}</strong> (${entry.guestCount}) - ${label}
        <br>
        <small>${time}</small>
      </div>
      <button class="btn btn-soft mini-btn" type="button" data-delete-rsvp="${entry.id}">Delete</button>
    `;

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

async function removeDuplicateRsvps() {
  const rsvps = await store.getRsvps();
  const seen = new Set();
  const duplicates = [];

  rsvps.forEach((entry) => {
    const key = normalizeName(entry.name);
    if (seen.has(key)) {
      duplicates.push(entry.id);
      return;
    }
    seen.add(key);
  });

  await Promise.all(duplicates.map((id) => store.deleteRsvp(id)));
  await renderRsvps();
}

async function clearAllRsvps() {
  await store.clearRsvps();
  await renderRsvps();
}

async function unlock() {
  authCard.hidden = true;
  dashboard.hidden = false;
  storageMode.textContent =
    store.mode === "cloud"
      ? "Backend: Cloud (shared across devices)"
      : "Backend: Local browser only";
  await renderUpdates();
  await renderRsvps();

  if (refreshTimer) {
    clearInterval(refreshTimer);
  }
  refreshTimer = setInterval(async () => {
    await renderRsvps();
    await renderUpdates();
  }, 5000);
}

authForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const pin = String(new FormData(authForm).get("adminPin") || "").trim();

  if (pin !== ADMIN_PIN) {
    authError.hidden = false;
    return;
  }

  authError.hidden = true;
  sessionStorage.setItem(SESSION_KEY, "true");
  authForm.reset();
  await unlock();
});

updateForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const input = document.getElementById("updateMessage");
  const message = input.value.trim();
  if (!message) return;

  await store.addUpdate(message);
  input.value = "";
  await renderUpdates();
});

rsvpList.addEventListener("click", async (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;

  const id = target.getAttribute("data-delete-rsvp");
  if (!id) return;
  await store.deleteRsvp(id);
  await renderRsvps();
});

dedupeRsvp?.addEventListener("click", async () => {
  await removeDuplicateRsvps();
});

clearRsvp?.addEventListener("click", async () => {
  const ok = window.confirm("Delete all RSVP entries?");
  if (!ok) return;
  await clearAllRsvps();
});

lockDashboard.addEventListener("click", () => {
  sessionStorage.removeItem(SESSION_KEY);
  dashboard.hidden = true;
  authCard.hidden = false;
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
});

if (sessionStorage.getItem(SESSION_KEY) === "true") {
  unlock();
}
