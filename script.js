const wallNotesEl = document.getElementById("wallNotes");
const tableHotspot = document.getElementById("tableHotspot");
const modal = document.getElementById("modal");
const modalCard = document.getElementById("modalCard");
const backdrop = document.getElementById("backdrop");
const closeBtn = document.getElementById("closeBtn");

const noteDateEl = document.getElementById("noteDate");
const noteTextEl = document.getElementById("noteText");
const audioEl = document.getElementById("noteAudio");

let NOTES = [];
let currentNote = null;
let modalOpen = false;         // ✅ prevent “music restart after close”
let pendingTapToPlay = null;   // ✅ to cancel tap handler

/** 🎨 Colors */
const COLOR_CLASSES = ["sticky-yellow", "sticky-pink", "sticky-blue", "sticky-white", "sticky-green"];

/** ✅ Wall zone (percent of sceneWrap) */
const WALL_ZONE = {
  leftMin: 58,
  leftMax: 92,
  topMin: 6,
  topMax: 52
};

function lerp(a, b, t) { return a + (b - a) * t; }
function rand(a, b) { return a + Math.random() * (b - a); }

function computeWallPosition(i, total) {
  const cols = total <= 6 ? 2 : total <= 12 ? 3 : 4;
  const rows = Math.ceil(total / cols);

  const col = i % cols;
  const row = Math.floor(i / cols);

  const x = lerp(WALL_ZONE.leftMin, WALL_ZONE.leftMax, cols === 1 ? 0.5 : col / (cols - 1));
  const yGap = (WALL_ZONE.topMax - WALL_ZONE.topMin) / Math.max(rows, 1);
  const y = WALL_ZONE.topMin + row * yGap + yGap * 0.35;

  const jitterX = rand(-1.3, 1.3);
  const jitterY = rand(-1.0, 1.0);
  const rot = rand(-10, 10);

  return { left: x + jitterX, top: y + jitterY, rot };
}

function getParisISODate() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date());

  const y = parts.find(p => p.type === "year").value;
  const m = parts.find(p => p.type === "month").value;
  const d = parts.find(p => p.type === "day").value;
  return `${y}-${m}-${d}`;
}

function formatDatePretty(iso) {
  try {
    const d = new Date(iso + "T00:00:00");
    return new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "2-digit" }).format(d);
  } catch {
    return iso;
  }
}

function splitGraphemes(str) {
  return Array.from(str);
}

function typeTextSlow(el, text, msPerChar = 55) {
  return new Promise((resolve) => {
    el.textContent = "";
    el.classList.add("typing");

    const chars = splitGraphemes(text);
    let i = 0;

    const tick = () => {
      if (!modalOpen) return; // ✅ if modal closed during typing, stop cleanly

      el.textContent += chars[i] ?? "";
      i += 1;

      if (i >= chars.length) {
        el.classList.remove("typing");
        resolve();
        return;
      }
      setTimeout(tick, msPerChar);
    };

    setTimeout(tick, msPerChar);
  });
}

/** ✅ Preload popup background */
(function preloadAssets() {
  const img = new Image();
  img.src = "backgroundNote.png";
})();

function renderWallNotes(todayIso) {
  wallNotesEl.innerHTML = "";

  // ✅ Old notes only = everything except today's note (if it exists)
  const old = NOTES.filter(n => n.date !== todayIso);

  old.forEach((note, idx) => {
    const pos = computeWallPosition(idx, old.length);
    const color = COLOR_CLASSES[idx % COLOR_CLASSES.length];

    const el = document.createElement("div");
    el.className = `stickySmall ${color}`;
    el.style.left = `${pos.left}%`;
    el.style.top = `${pos.top}%`;
    el.style.setProperty("--rot", `${pos.rot}deg`);
    el.innerHTML = `<div class="icon">🗒️</div>`;
    el.title = note.date;

    el.addEventListener("click", () => openNote(note, el));
    wallNotesEl.appendChild(el);
  });
}

/** ✅ hard-stop audio */
function stopAudioHard() {
  try {
    audioEl.pause();
    audioEl.currentTime = 0;
    audioEl.removeAttribute("src"); // ✅ important: prevents restart / caching weirdness
    audioEl.load();
  } catch {}
}

/** ✅ allow tap-to-play only while modal is open */
function attachTapToPlay() {
  if (pendingTapToPlay) return;

  pendingTapToPlay = () => {
    if (!modalOpen) return;
    if (!currentNote?.music) return;
    if (!audioEl.paused) return;

    audioEl.play().catch(() => {
      // still blocked, user can tap again
      pendingTapToPlay = null;
      attachTapToPlay();
    });
  };

  modalCard.addEventListener("click", pendingTapToPlay, { once: true });
}

async function openNote(note, fromEl = null) {
  // close any previous state
  stopAudioHard();

  currentNote = note;
  modalOpen = true;

  // show modal
  modal.classList.remove("hidden");

  // zoom animation
  if (fromEl) {
    const r = fromEl.getBoundingClientRect();
    const startX = r.left + r.width / 2;
    const startY = r.top + r.height / 2;

    modalCard.style.transition = "none";
    modalCard.style.transformOrigin = "top left";

    const end = modalCard.getBoundingClientRect();
    const endX = end.left;
    const endY = end.top;

    const dx = startX - endX;
    const dy = startY - endY;

    modalCard.style.transform = `translate(${dx}px, ${dy}px) scale(0.15)`;
    modalCard.offsetHeight;

    modalCard.style.transition = "transform 320ms cubic-bezier(.2,.8,.2,1)";
    modalCard.style.transform = "translate(-50%, -50%) scale(1)";
  }

  // set date + type text
  noteDateEl.textContent = note.date ? formatDatePretty(note.date) : "";
  await typeTextSlow(noteTextEl, note.text || "", 55);

  // ✅ MUSIC: play only if note has music AND modal still open
  if (modalOpen && note.music) {
    try {
      audioEl.autoplay = false;
      audioEl.loop = false;
      audioEl.src = note.music;
      audioEl.load();

      // must be in user gesture context; if blocked, user can tap popup once
      audioEl.play().catch(() => {
        pendingTapToPlay = null;
        attachTapToPlay();
      });
    } catch (e) {
      console.warn("Audio error:", e);
    }
  }
}

function closeModal() {
  modalOpen = false;

  modal.classList.add("hidden");
  noteTextEl.textContent = "";
  noteTextEl.classList.remove("typing");
  noteDateEl.textContent = "";

  // ✅ stop music and prevent any restart
  stopAudioHard();

  // ✅ clear pending tap handler
  pendingTapToPlay = null;
}

backdrop.addEventListener("click", closeModal);
closeBtn.addEventListener("click", closeModal);
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeModal();
});

/** ✅ Table click: open today's note OR placeholder if missing */
tableHotspot.addEventListener("click", () => {
  const today = getParisISODate();
  const todayNote = NOTES.find(n => n.date === today);

  if (todayNote) {
    openNote(todayNote, tableHotspot);
    return;
  }

  // ✅ placeholder when today's note doesn't exist
  openNote({
    date: today,
    text: "Full day but i keep thinking about u… will get today’s note done ASAP 💛✨",
    music: "" // no music
  }, tableHotspot);
});

/** ✅ load notes */
async function loadNotes() {
  try {
    const res = await fetch(`notes.json?v=${Date.now()}`, { cache: "no-store" });
    const data = await res.json();

    if (!Array.isArray(data)) throw new Error("notes.json must be an array");

    NOTES = data.slice().sort((a, b) => (a.date > b.date ? 1 : -1));

    const today = getParisISODate();
    renderWallNotes(today);
  } catch (e) {
    console.error("Failed to load notes.json:", e);
    wallNotesEl.innerHTML = "";
  }
}

loadNotes();

