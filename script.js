// ==============================
// Notes page - script.js (UPDATED with Drag & Save)
// ==============================

const NOTES_JSON = "notes.json";

/* Positions near TV/wall (used as default if no saved drag position) */
const WALL_POSITIONS = [
  { left: 73, top: 16, rot: -8 },
  { left: 86, top: 18, rot: 6 },
  { left: 72, top: 29, rot: 4 },
  { left: 86, top: 31, rot: -6 },
  { left: 72, top: 42, rot: 7 },
  { left: 86, top: 44, rot: -4 }
];

/* Colors cycle */
const COLORS = ["sticky-yellow", "sticky-pink", "sticky-blue", "sticky-white", "sticky-green"];

const hotspot = document.getElementById("hotspot");
const wallNotesEl = document.getElementById("wallNotes");

const modal = document.getElementById("modal");
const backdrop = document.getElementById("backdrop");
const modalCard = document.getElementById("modalCard");
const closeBtn = document.getElementById("closeBtn");

const noteDateEl = document.getElementById("noteDate");
const noteTextEl = document.getElementById("noteText");

const playBtn = document.getElementById("playBtn");
const pauseBtn = document.getElementById("pauseBtn");

let notesData = [];
let todayNote = null;

let audio = null;
let typingTimer = null;

// ------------------------------
// Load notes.json
// ------------------------------
async function loadNotes() {
  const res = await fetch(NOTES_JSON, { cache: "no-store" });
  if (!res.ok) throw new Error("Cannot load notes.json");
  return await res.json();
}

function getParisDateISO() {
  // Uses local device time; if you need strict Paris time always, we can force timezone conversion
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function findTodayNote(allNotes) {
  const today = getParisDateISO();
  // Notes should have date like "2026-02-06"
  return allNotes.find(n => n.date === today) || allNotes[allNotes.length - 1] || null;
}

function stopTyping() {
  if (typingTimer) clearTimeout(typingTimer);
  typingTimer = null;
  noteTextEl.classList.remove("typing");
}

function typeTextSlow(el, fullText, speedMs = 60) {
  stopTyping();
  el.textContent = "";
  el.classList.add("typing");

  let i = 0;
  function tick() {
    el.textContent = fullText.slice(0, i);
    i++;
    if (i <= fullText.length) {
      typingTimer = setTimeout(tick, speedMs);
    } else {
      el.classList.remove("typing");
    }
  }
  tick();
}

// ------------------------------
// Audio
// ------------------------------
function stopAudio() {
  if (audio) {
    audio.pause();
    audio.currentTime = 0;
  }
}

function loadAudio(src) {
  stopAudio();
  if (!src) return;
  audio = new Audio(src);
  audio.loop = false;
}

function playAudio() {
  if (!audio) return;
  audio.play().catch(() => {
    // Autoplay can be blocked; user can press Play manually
  });
}

// ------------------------------
// Modal open/close with zoom animation
// ------------------------------
function openModal(note, fromEl) {
  todayNote = note;

  // Fill content
  noteDateEl.textContent = formatDate(note.date);
  typeTextSlow(noteTextEl, note.text || "", 65); // slow handwriting

  // Audio for this note
  loadAudio(note.music || "");
  // don't autoplay here (better UX); user uses Play

  // Prepare zoom animation from clicked sticky
  const startRect = fromEl.getBoundingClientRect();

  // target size = current modalCard size when centered
  modal.classList.remove("hidden");

  // get final rect after visible
  const endRect = modalCard.getBoundingClientRect();

  // Set modalCard to start position/size
  modalCard.style.transition = "none";
  modalCard.style.left = `${startRect.left}px`;
  modalCard.style.top = `${startRect.top}px`;
  modalCard.style.width = `${startRect.width}px`;
  modalCard.style.height = `${startRect.height}px`;
  modalCard.style.transform = "none";
  modalCard.style.opacity = "1";

  // Force reflow
  void modalCard.offsetHeight;

  // Animate to center
  modalCard.style.transition = "all 240ms ease";
  modalCard.style.left = `${endRect.left}px`;
  modalCard.style.top = `${endRect.top}px`;
  modalCard.style.width = `${endRect.width}px`;
  modalCard.style.height = `${endRect.height}px`;

  // After animation, snap back to centered rules
  setTimeout(() => {
    modalCard.style.transition = "";
    modalCard.style.left = "50%";
    modalCard.style.top = "50%";
    modalCard.style.width = "";
    modalCard.style.height = "";
    modalCard.style.transform = "translate(-50%, -50%)";
  }, 260);
}

function closeModal() {
  stopTyping();
  stopAudio();
  modal.classList.add("hidden");
}

// ------------------------------
// Render wall stickies
// ------------------------------
function renderWallNotes(allNotes, today) {
  wallNotesEl.innerHTML = "";

  const older = allNotes.filter(n => n !== today).slice(-30); // show last 30 old notes max
  older.forEach((note, idx) => {
    const pos = WALL_POSITIONS[idx % WALL_POSITIONS.length];
    const colorClass = COLORS[idx % COLORS.length];

    const el = document.createElement("div");
    el.className = `stickySmall ${colorClass}`;
    el.style.left = `${pos.left}%`;
    el.style.top = `${pos.top}%`;
    el.style.setProperty("--rot", `${pos.rot}deg`);

    // icon only
    const icon = document.createElement("div");
    icon.className = "icon";
    icon.textContent = "🗒️";
    el.appendChild(icon);

    // Draggable + saved positions
    makeDraggable(el, note.id || note.date || `note_${idx}`);

    // Click opens modal (but not if we were dragging)
    el.addEventListener("click", () => {
      if (el.dataset.dragging === "1") return;
      openModal(note, el);
    });

    wallNotesEl.appendChild(el);
  });
}

// ------------------------------
// Hotspot click => open today's note
// ------------------------------
function setupHotspot(today) {
  hotspot.addEventListener("click", () => {
    // open today note from the hotspot area (use hotspot element for zoom)
    openModal(today, hotspot);
  });
}

// ------------------------------
// Helpers
// ------------------------------
function formatDate(iso) {
  // "2026-02-06" -> "Feb 06, 2026"
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "2-digit" });
}

// ------------------------------
// Drag & drop (Option 1) + save in localStorage
// ------------------------------
function makeDraggable(el, key) {
  // Load saved position if exists
  const saved = loadPos(key);
  if (saved) {
    el.style.left = saved.left + "%";
    el.style.top = saved.top + "%";
  }

  let dragging = false;

  const onDown = (e) => {
    dragging = true;
    el.dataset.dragging = "1";

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    document.addEventListener("touchmove", onMove, { passive: false });
    document.addEventListener("touchend", onUp);
  };

  const onMove = (e) => {
    if (!dragging) return;
    e.preventDefault();

    const p = getPoint(e);
    const rect = wallNotesEl.getBoundingClientRect();

    const xPct = ((p.x - rect.left) / rect.width) * 100;
    const yPct = ((p.y - rect.top) / rect.height) * 100;

    // clamp inside scene
    const clampedX = Math.max(0, Math.min(100, xPct));
    const clampedY = Math.max(0, Math.min(100, yPct));

    el.style.left = clampedX + "%";
    el.style.top = clampedY + "%";
  };

  const onUp = () => {
    if (!dragging) return;
    dragging = false;

    document.removeEventListener("mousemove", onMove);
    document.removeEventListener("mouseup", onUp);
    document.removeEventListener("touchmove", onMove);
    document.removeEventListener("touchend", onUp);

    // save
    savePos(key, parseFloat(el.style.left), parseFloat(el.style.top));

    // allow click again shortly after drop
    setTimeout(() => {
      delete el.dataset.dragging;
    }, 80);
  };

  el.addEventListener("mousedown", onDown);
  el.addEventListener("touchstart", onDown, { passive: true });
}

function getPoint(e) {
  if (e.touches && e.touches[0]) {
    return { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }
  return { x: e.clientX, y: e.clientY };
}

function savePos(id, left, top) {
  const all = JSON.parse(localStorage.getItem("notePositions") || "{}");
  all[id] = { left, top };
  localStorage.setItem("notePositions", JSON.stringify(all));
}

function loadPos(id) {
  const all = JSON.parse(localStorage.getItem("notePositions") || "{}");
  return all[id] || null;
}

// ------------------------------
// Buttons / close
// ------------------------------
backdrop.addEventListener("click", closeModal);
closeBtn.addEventListener("click", closeModal);

playBtn.addEventListener("click", () => playAudio());
pauseBtn.addEventListener("click", () => {
  if (audio) audio.pause();
});

// ------------------------------
// Init
// ------------------------------
(async function init() {
  try {
    const data = await loadNotes();
    notesData = Array.isArray(data.notes) ? data.notes : (Array.isArray(data) ? data : []);
    todayNote = findTodayNote(notesData);

    if (!todayNote) return;

    renderWallNotes(notesData, todayNote);
    setupHotspot(todayNote);
  } catch (e) {
    console.error(e);
  }
})();
