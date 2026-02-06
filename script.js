/* ================================
   Sticky Notes — script.js (FULL)
   - table hotspot opens today's note
   - wall shows older notes as icons only (click to zoom)
   - smooth zoom transition (from sticky -> popup)
   - slow handwriting typing (emoji-safe)
   - auto music per note (mp3)
================================ */

const todayHotspot = document.getElementById("todayHotspot");
const wallNotesEl  = document.getElementById("wallNotes");

const modal     = document.getElementById("modal");
const backdrop  = document.getElementById("backdrop");
const modalCard = document.getElementById("modalCard");
const closeBtn  = document.getElementById("closeBtn");

const noteDateEl = document.getElementById("noteDate");
const noteTextEl = document.getElementById("noteText");
const audioEl    = document.getElementById("noteAudio");

/* ---- CONFIG ---- */

/* ✅ Where wall sticky notes are allowed (percent of image)
   Adjust these 4 numbers to match the red zone you highlighted. */
const WALL_ZONE = {
  leftMin: 62,  // %
  leftMax: 92,  // %
  topMin: 10,   // %
  topMax: 52    // %
};

/* Colors cycle */
const COLORS = ["sticky-yellow", "sticky-pink", "sticky-blue", "sticky-white", "sticky-green"];

/* Rotation random */
const ROT_MIN = -10;
const ROT_MAX = 10;

/* typing speed (bigger = slower) */
const TYPE_DELAY_MS = 55;

/* -------------------------------- */

let notes = [];
let typingTimer = null;

/* Preload note background so first open doesn't "load late" */
(function preloadAssets() {
  const img = new Image();
  img.src = "backgroundNote.png";
})();

/* Emoji-safe segmentation (fixes iPhone squares during typing) */
function splitGraphemes(text) {
  try {
    if ("Segmenter" in Intl) {
      const seg = new Intl.Segmenter(undefined, { granularity: "grapheme" });
      return Array.from(seg.segment(text), s => s.segment);
    }
  } catch (e) {}
  return Array.from(text); // fallback
}

/* Format date like "FEB 05, 2026" */
function formatNiceDate(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }).toUpperCase();
}

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

/* Build a grid in the wall zone (works even with 10, 20, 50 notes) */
function computeWallPositions(count) {
  const zoneW = WALL_ZONE.leftMax - WALL_ZONE.leftMin;
  const zoneH = WALL_ZONE.topMax - WALL_ZONE.topMin;

  // simple grid: choose columns based on count
  const cols = clamp(Math.ceil(Math.sqrt(count * (zoneW / zoneH))), 2, 8);
  const rows = Math.ceil(count / cols);

  const cellW = zoneW / cols;
  const cellH = zoneH / rows;

  const positions = [];
  for (let i = 0; i < count; i++) {
    const c = i % cols;
    const r = Math.floor(i / cols);

    // base center of the cell + jitter
    const left = WALL_ZONE.leftMin + c * cellW + cellW * 0.5 + rand(-cellW * 0.18, cellW * 0.18);
    const top  = WALL_ZONE.topMin  + r * cellH + cellH * 0.5 + rand(-cellH * 0.18, cellH * 0.18);

    positions.push({
      left: clamp(left, WALL_ZONE.leftMin, WALL_ZONE.leftMax),
      top:  clamp(top,  WALL_ZONE.topMin,  WALL_ZONE.topMax),
      rot:  rand(ROT_MIN, ROT_MAX)
    });
  }
  return positions;
}

/* Render older notes on the wall as ICON ONLY */
function renderWallNotes(oldNotes) {
  wallNotesEl.innerHTML = "";
  if (!oldNotes || oldNotes.length === 0) return;

  const positions = computeWallPositions(oldNotes.length);

  oldNotes.forEach((note, i) => {
    const pos = positions[i];
    const colorClass = COLORS[i % COLORS.length];

    const sticky = document.createElement("div");
    sticky.className = `stickySmall ${colorClass}`;
    sticky.style.left = `${pos.left}%`;
    sticky.style.top = `${pos.top}%`;
    sticky.style.setProperty("--rot", `${pos.rot}deg`);

    // ICON ONLY (no message on wall)
    const icon = document.createElement("div");
    icon.className = "icon";
    icon.textContent = "📝";
    sticky.appendChild(icon);

    sticky.addEventListener("click", () => openNote(note, sticky));

    wallNotesEl.appendChild(sticky);
  });
}

/* Smooth zoom (from clicked sticky position -> center modal) */
function animateFromElementToCenter(fromEl) {
  // modalCard is fixed in center already; we FLIP from start rect
  const endRect = modalCard.getBoundingClientRect();
  const startRect = fromEl.getBoundingClientRect();

  // start: put card on top of startRect (with same size)
  const scaleX = startRect.width / endRect.width;
  const scaleY = startRect.height / endRect.height;

  const startX = startRect.left + startRect.width / 2;
  const startY = startRect.top  + startRect.height / 2;

  const endX = endRect.left + endRect.width / 2;
  const endY = endRect.top  + endRect.height / 2;

  const dx = startX - endX;
  const dy = startY - endY;

  modalCard.style.transition = "none";
  modalCard.style.transform = `translate(-50%, -50%) translate(${dx}px, ${dy}px) scale(${scaleX}, ${scaleY})`;
  modalCard.style.opacity = "0.2";

  // next frame -> animate to normal
  requestAnimationFrame(() => {
    modalCard.style.transition = "transform 420ms cubic-bezier(.2,.9,.2,1), opacity 420ms ease";
    modalCard.style.transform = "translate(-50%, -50%)";
    modalCard.style.opacity = "1";
  });
}

/* Typing animation */
function typeNoteText(text) {
  clearTimeout(typingTimer);
  noteTextEl.textContent = "";
  noteTextEl.classList.add("typing");

  const chars = splitGraphemes(text || "");
  let i = 0;

  const step = () => {
    noteTextEl.textContent += chars[i] || "";
    i++;
    if (i < chars.length) {
      typingTimer = setTimeout(step, TYPE_DELAY_MS);
    } else {
      noteTextEl.classList.remove("typing");
    }
  };

  step();
}

function stopTyping() {
  clearTimeout(typingTimer);
  typingTimer = null;
  noteTextEl.classList.remove("typing");
}

/* Open note (called by wall stickies + table hotspot) */
function openNote(note, fromEl) {
  if (!note) return;

  // show modal
  modal.classList.remove("hidden");

  // reset text & date
  noteDateEl.textContent = formatNiceDate(note.date || "");
  stopTyping();
  noteTextEl.textContent = "";

  // animate zoom
  animateFromElementToCenter(fromEl);

  // start typing (slow)
  typeNoteText(note.text || "");

  // audio
  try {
    audioEl.pause();
    audioEl.currentTime = 0;
    if (note.music) {
      audioEl.src = note.music;
      // play after a tick (user click qualifies)
      setTimeout(() => {
        audioEl.play().catch(() => {});
      }, 80);
    } else {
      audioEl.removeAttribute("src");
    }
  } catch (e) {}
}

function closeNote() {
  stopTyping();
  try {
    audioEl.pause();
    audioEl.currentTime = 0;
  } catch (e) {}
  modal.classList.add("hidden");
}

/* Events */
closeBtn.addEventListener("click", closeNote);
backdrop.addEventListener("click", closeNote);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !modal.classList.contains("hidden")) closeNote();
});

/* Load notes + setup */
async function init() {
  try {
    // cache-bust so GitHub Pages updates immediately
    const res = await fetch(`notes.json?v=${Date.now()}`);
    notes = await res.json();

    // sort by date
    notes.sort((a, b) => (a.date || "").localeCompare(b.date || ""));

    // today = last
    const todayNote = notes[notes.length - 1];
    const oldNotes = notes.slice(0, -1);

    // wall icons
    renderWallNotes(oldNotes);

    // table hotspot opens today note
    todayHotspot.addEventListener("click", () => openNote(todayNote, todayHotspot));

    // ✅ do NOT auto-open anything at page load
    closeNote();

  } catch (err) {
    console.error("Failed to load notes.json:", err);
  }
}

init();
