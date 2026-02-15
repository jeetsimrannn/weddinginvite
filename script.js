const EVENT_DATE_ISO = "2026-03-14T18:30:00";

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
const envelopeMedia = document.getElementById("envelopeMedia");
const introVideo = document.getElementById("introVideo");
const heroBgVideo = document.getElementById("heroBgVideo");

const store = window.InviteStore;

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
  musicToggle.textContent = isMuted ? "🔇" : "🔊";
  musicToggle.setAttribute("aria-label", isMuted ? "Unmute music" : "Mute music");
  musicToggle.setAttribute("aria-pressed", String(!isMuted));
}

async function ensureMusicPlaying() {
  if (bgMusic.paused) {
    try {
      await bgMusic.play();
    } catch {
      // Browser may block playback.
    }
  }
}

rsvpForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const formData = new FormData(rsvpForm);
  const name = String(formData.get("guestName") || "").trim();
  const guestCount = Number(formData.get("guestCount"));
  const attendance = String(formData.get("attendance") || "yes");

  if (!name || Number.isNaN(guestCount) || guestCount < 1) return;

  try {
    await store.upsertRsvp({
      name,
      guestCount,
      attendance,
      createdAt: new Date().toISOString(),
    });

    rsvpForm.reset();
    document.getElementById("guestCount").value = "1";
    rsvpThanks.textContent = "Thank you! Your RSVP has been received.";
    rsvpThanks.hidden = false;
  } catch {
    rsvpThanks.textContent = "Could not save RSVP right now. Please try again.";
    rsvpThanks.style.color = "#9f2318";
    rsvpThanks.hidden = false;
    return;
  }
  rsvpThanks.style.color = "";
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
  document.body.classList.add("intro-complete");
  startHeroBgVideo();
  setTimeout(() => {
    inviteIntro.hidden = true;
  }, 760);
}

async function startHeroBgVideo() {
  if (!heroBgVideo) return;
  heroBgVideo.currentTime = 0;
  try {
    await heroBgVideo.play();
  } catch {
    // Ignore playback blocking and keep the hero visible.
  }
}

if (inviteIntro) {
  document.body.classList.remove("intro-complete");
  document.body.classList.add("intro-active");
  envelopeMedia?.addEventListener("click", async () => {
    if (inviteIntro.classList.contains("is-opening")) return;
    inviteIntro.classList.add("is-opening");
    if (introVideo) {
      introVideo.currentTime = 0;
      try {
        await introVideo.play();
      } catch {
        // If intro video cannot autoplay, continue anyway.
      }
    }
    bgMusic.muted = false;
    await ensureMusicPlaying();
    updateMusicToggleLabel();
  });

  envelopeMedia?.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      envelopeMedia.click();
    }
  });
}

if (!inviteIntro) {
  document.body.classList.remove("intro-active");
  document.body.classList.add("intro-complete");
  startHeroBgVideo();
}

if (!envelopeMedia && inviteIntro) {
  setTimeout(() => {
    hideIntro();
  }, 2000);
}

if (introVideo) {
  introVideo.addEventListener("ended", hideIntro);
  introVideo.addEventListener("error", () => {
    setTimeout(hideIntro, 1800);
  });
  setTimeout(() => {
    if (inviteIntro?.classList.contains("is-opening") && !inviteIntro.hidden) {
      hideIntro();
    }
  }, 12000);
}

bgMusic.muted = false;
bgMusic.volume = 0.5;
updateMusicToggleLabel();
tickCountdown();
setInterval(tickCountdown, 1000);
