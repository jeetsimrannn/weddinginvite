const EVENT_DATE_ISO = "2026-03-14T18:30:00";
const STORAGE_KEYS = {
  rsvps: "engagement_rsvps",
};

const countdownIds = {
  days: document.getElementById("days"),
  hours: document.getElementById("hours"),
  minutes: document.getElementById("minutes"),
  seconds: document.getElementById("seconds"),
};

const rsvpForm = document.getElementById("rsvpForm");
const rsvpThanks = document.getElementById("rsvpThanks");
const musicToggle = document.getElementById("musicToggle");
const bgMusic = document.getElementById("bgMusic");
const inviteIntro = document.getElementById("inviteIntro");
const waxSeal = document.getElementById("waxSeal");

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

function tickCountdown() {
  const target = new Date(EVENT_DATE_ISO).getTime();
  const now = Date.now();
  const diff = Math.max(0, target - now);

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);

  countdownIds.days.textContent = days;
  countdownIds.hours.textContent = hours;
  countdownIds.minutes.textContent = minutes;
  countdownIds.seconds.textContent = seconds;
}

function updateMusicToggleLabel() {
  const isMuted = bgMusic.muted;
  musicToggle.textContent = isMuted ? "Unmute" : "Mute";
  musicToggle.setAttribute("aria-pressed", String(!isMuted));
}

async function ensureMusicPlaying() {
  if (bgMusic.paused) {
    try {
      await bgMusic.play();
    } catch {
      // Browser may still block playback in some contexts.
    }
  }
}

rsvpForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const formData = new FormData(rsvpForm);
  const name = String(formData.get("guestName") || "").trim();
  const guestCount = Number(formData.get("guestCount"));
  const attendance = String(formData.get("attendance") || "yes");

  if (!name || Number.isNaN(guestCount) || guestCount < 1) return;

  const rsvps = readStore(STORAGE_KEYS.rsvps, []);
  rsvps.push({
    name,
    guestCount,
    attendance,
    createdAt: new Date().toISOString(),
  });
  writeStore(STORAGE_KEYS.rsvps, rsvps);

  rsvpForm.reset();
  document.getElementById("guestCount").value = "1";
  rsvpThanks.hidden = false;
});

musicToggle.addEventListener("click", async () => {
  bgMusic.muted = !bgMusic.muted;
  await ensureMusicPlaying();
  updateMusicToggleLabel();
});

function hideIntro() {
  if (!inviteIntro || inviteIntro.hidden) return;
  inviteIntro.classList.add("is-hidden");
  document.body.classList.remove("intro-active");
  setTimeout(() => {
    inviteIntro.hidden = true;
  }, 460);
}

if (inviteIntro) {
  document.body.classList.add("intro-active");
  waxSeal?.addEventListener("click", async () => {
    if (inviteIntro.classList.contains("is-opening")) return;
    waxSeal.disabled = true;
    inviteIntro.classList.add("is-opening");
    bgMusic.muted = false;
    await ensureMusicPlaying();
    updateMusicToggleLabel();
    setTimeout(hideIntro, 2300);
  });

  waxSeal?.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      waxSeal.click();
    }
  });
}

if (!inviteIntro) {
  document.body.classList.remove("intro-active");
}

if (!waxSeal && inviteIntro) {
  setTimeout(() => {
    hideIntro();
  }, 2000);
}

bgMusic.muted = false;
updateMusicToggleLabel();
tickCountdown();
setInterval(tickCountdown, 1000);
