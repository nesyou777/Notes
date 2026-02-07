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

/** ✅ Colors for wall sticky icons */
const COLOR_CLASSES = ["sticky-yellow", "sticky-pink", "sticky-blue", "sticky-white", "sticky-green"];

/**
 * ✅ Wall placement zone (percent of the sceneWrap)
 * Change these numbers to move the cluster.
 */
const WALL_ZONE = {
  leftMin: 58,
  leftMax: 92,
  topMin: 6,
  topMax: 52
};

/**
 * ✅ Layout for many notes (>10)
 * Uses a grid inside WALL_ZONE.
 */
function computeWallPosition(i, total) {
  const cols = total <= 6 ? 2 : total <= 12 ? 3 : 4;
  const rows = Math.ceil(total / cols);

  const col = i % cols;
  const row = Math.floor(i / cols);

  const x = lerp(WALL_ZONE.leftMin, WALL_ZONE.leftMax, cols === 1 ? 0.5 : col / (cols - 1));
  const yGap = (WALL_ZONE.topMax - WALL_ZONE.topMin) / Math.max(rows, 1);
  const y = WALL_ZONE.topMin + row * yGap + yGap * 0.35;

  // Small randomness so it looks natural
  const jitterX = rand(-1.3, 1.3);
  const jitterY = rand(-1.0, 1.0);
  const rot = rand(-10, 10);

  return { left: x + jitterX, top: y + jitterY, rot };
}

function lerp(a, b, t) { return a + (b - a) * t; }
function rand(a, b) { return a + Math.random() * (b - a); }

/** ✅ Paris date as YYYY-MM-DD */
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

/** ✅ Prevent emoji breaking typing */
function splitGraphemes(str) {
  return Array.from(str);
}

/** ✅ Slow handwriting typing */
function typeTextSlow(el, text, msPerChar = 55) {
  return new Promise((resolve) => {
    el.textContent = "";
    el.classList.add("typing");

    const chars = splitGraphemes(text);
    let i = 0;

    const tick = () => {
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

/** ✅ Preload popup background so it doesn't "appear later" */
(function preloadAssets() {
  const img = new Image();
  img.src = "backgroundNote.png";
})();

/** ✅ Build wall icons from old notes */
function renderWallNotes(todayIso) {
  wallNotesEl.innerHTML = "";

  // Old notes = everything except today's note
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

    el.addEventListener("click", () => {
      openNote(note, el);
    });

    wallNotesEl.appendChild(el);
  });
}

/** ✅ Modal open with zoom-from-sticky animation */
async function openNote(note, fromEl = null) {
  currentNote = note;

  // --- MUSIC: must start immediately inside the click gesture ---
  try {
    if (note.music) {
      audioEl.pause();
      audioEl.currentTime = 0;
      audioEl.src = note.music;
      audioEl.load();

      // DON'T await here (keep user gesture)
      audioEl.play().catch(() => {
        // iOS may block; user can tap the note to start
        // (we enable that below)
      });
    }
  } catch (e) {
    console.warn("Audio error:", e);
  }

  // Show modal
  modal.classList.remove("hidden");

  // Zoom animation from clicked sticky note
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
    modalCard.offsetHeight; // reflow

    modalCard.style.transition = "transform 320ms cubic-bezier(.2,.8,.2,1)";
    modalCard.style.transform = "translate(-50%, -50%) scale(1)";
  }

  // Fill content (typing)
  noteDateEl.textContent = formatDatePretty(note.date);
  await typeTextSlow(noteTextEl, note.text, 55);

  // If autoplay was blocked, allow tap on the note to start music
  modalCard.addEventListener("click", tryPlayIfBlocked, { once: true });
}

function tryPlayIfBlocked() {
  if (!currentNote?.music) return;
  if (!audioEl.paused) return;

  audioEl.play().catch(() => {
    // still blocked; user can tap again
    modalCard.addEventListener("click", tryPlayIfBlocked, { once: true });
  });
}

/** ✅ Close modal */
function closeModal() {
  modal.classList.add("hidden");
  noteTextEl.textContent = "";
  noteTextEl.classList.remove("typing");

  audioEl.pause();
  audioEl.currentTime = 0;
}

backdrop.addEventListener("click", closeModal);
closeBtn.addEventListener("click", closeModal);
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeModal();
});

/** ✅ Click table sticky => open today's note */
tableHotspot.addEventListener("click", () => {
  const today = getParisISODate();
  const note = NOTES.find(n => n.date === today) || NOTES[NOTES.length - 1];
  if (!note) return;
  openNote(note, tableHotspot);
});

/** ✅ Date format */
function formatDatePretty(iso) {
  try {
    const d = new Date(iso + "T00:00:00");
    return new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "2-digit" }).format(d);
  } catch {
    return iso;
  }
}

/** ✅ Load notes */
async function loadNotes() {
  try {
    const res = await fetch(`notes.json?v=${Date.now()}`, { cache: "no-store" });
    const data = await res.json();

    if (!Array.isArray(data)) throw new Error("notes.json must be an array");

    // sort by date
    NOTES = data.slice().sort((a, b) => (a.date > b.date ? 1 : -1));

    const today = getParisISODate();
    renderWallNotes(today);
  } catch (e) {
    console.error("Failed to load notes.json:", e);
    wallNotesEl.innerHTML = "";
  }
}

loadNotes();
