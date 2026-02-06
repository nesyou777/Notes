const wallNotesEl = document.getElementById("wallNotes");
const hotspot = document.getElementById("tableStickyHotspot");

const modal = document.getElementById("modal");
const backdrop = document.getElementById("backdrop");
const closeBtn = document.getElementById("closeBtn");
const noteDateEl = document.getElementById("noteDate");
const noteTextEl = document.getElementById("noteText");
const modalCard = document.getElementById("modalCard");
const noteAudio = document.getElementById("noteAudio");

let TODAY_NOTE = null;
let LOADED = false;
let typingTimer = null;

function getParisDateYYYYMMDD() {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  return fmt.format(new Date());
}

function prettyDate(yyyyMmDd) {
  const [y, m, d] = yyyyMmDd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

/* positions near TV/wall */
// Wall zone (top-right area) in percentage of the scene
const WALL_ZONE = {
  left: 50,   // start X (%)
  top: 12,    // start Y (%)
  width: 28,  // zone width (%)
  height: 40  // zone height (%)
};


const COLORS = ["sticky-yellow", "sticky-pink", "sticky-blue", "sticky-white", "sticky-green"];

/* ✍️ typing animation (SLOWER by default) */
function typeText(fullText, speed = 80) { // higher = slower
  if (typingTimer) clearInterval(typingTimer);

  noteTextEl.classList.add("typing");
  noteTextEl.innerHTML = "";
  const safe = escapeHtml(fullText);

  let i = 0;
  typingTimer = setInterval(() => {
    i++;
    noteTextEl.innerHTML = safe.slice(0, i);
    if (i >= safe.length) {
      clearInterval(typingTimer);
      typingTimer = null;
      noteTextEl.classList.remove("typing");
    }
  }, speed);
}

/* 🔊 per-note music */
function playNoteMusic(note) {
  if (!noteAudio) return;

  // stop current
  noteAudio.pause();
  noteAudio.currentTime = 0;

  if (note && note.music) {
    noteAudio.src = note.music;
    noteAudio.volume = 0.9;

    // openModal is called by a click => autoplay usually allowed
    noteAudio.play().catch(() => {
      // Some browsers may still block. In that case user can tap again.
    });
  } else {
    noteAudio.removeAttribute("src");
    noteAudio.load();
  }
}

function stopMusic() {
  if (!noteAudio) return;
  noteAudio.pause();
  noteAudio.currentTime = 0;
}

/* zoom transition from clicked sticky */
function openModal(note, sourceEl = null) {
  noteDateEl.textContent = prettyDate(note.date);

  // play music for this note (if defined in notes.json)
  playNoteMusic(note);

  // reset modal to centered size first (final state)
  modalCard.style.transition = "none";
  modalCard.style.left = "50%";
  modalCard.style.top = "50%";
  modalCard.style.transform = "translate(-50%, -50%) scale(1)";
  modalCard.style.width = "min(520px, 92vw)";
  modalCard.style.height = "min(620px, 85vh)";

  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");

  // if we have a source element, animate from it
  if (sourceEl) {
    const from = sourceEl.getBoundingClientRect();

    const startLeft = from.left;
    const startTop = from.top;
    const startW = from.width;
    const startH = from.height;

    modalCard.style.left = `${startLeft}px`;
    modalCard.style.top = `${startTop}px`;
    modalCard.style.width = `${startW}px`;
    modalCard.style.height = `${startH}px`;
    modalCard.style.transform = "translate(0,0) scale(1)";

    // force reflow
    void modalCard.offsetWidth;

    // animate to center
    modalCard.style.transition = "all 420ms cubic-bezier(.2,.9,.2,1)";
    modalCard.style.left = "50%";
    modalCard.style.top = "50%";
    modalCard.style.width = "min(520px, 92vw)";
    modalCard.style.height = "min(620px, 85vh)";
    modalCard.style.transform = "translate(-50%, -50%) scale(1)";
  }

  // start slower handwriting typing
  typeText(note.text, 55);
}

function closeModal() {
  if (typingTimer) clearInterval(typingTimer);
  typingTimer = null;
  noteTextEl.classList.remove("typing");

  stopMusic();

  modal.classList.add("hidden");
  modal.setAttribute("aria-hidden", "true");
}

backdrop.addEventListener("click", closeModal);
closeBtn.addEventListener("click", closeModal);
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });

function renderWallNotes(notes) {
  wallNotesEl.innerHTML = "";

  const today = getParisDateYYYYMMDD();

  const old = notes
    .filter(n => n.date !== today)
    .sort((a, b) => b.date.localeCompare(a.date));

  // how many columns depending on count (responsive-ish)
  const count = old.length;
  const cols = count <= 6 ? 2 : count <= 12 ? 3 : count <= 20 ? 4 : 5;

  const rows = Math.ceil(count / cols);

  // spacing inside the wall zone
  const cellW = WALL_ZONE.width / cols;
  const cellH = WALL_ZONE.height / Math.max(rows, 1);

  old.forEach((note, idx) => {
    const r = Math.floor(idx / cols);
    const c = idx % cols;

    // center inside each cell + tiny random jitter
    const jitterX = (Math.random() - 0.5) * (cellW * 0.25);
    const jitterY = (Math.random() - 0.5) * (cellH * 0.25);

    const left = WALL_ZONE.left + c * cellW + cellW / 2 + jitterX;
    const top  = WALL_ZONE.top  + r * cellH + cellH / 2 + jitterY;

    const rot = (Math.random() * 14 - 7).toFixed(1); // -7..+7 degrees
    const color = COLORS[idx % COLORS.length];

    const el = document.createElement("div");
    el.className = `stickySmall ${color}`;
    el.style.left = `${left}%`;
    el.style.top = `${top}%`;
    el.style.setProperty("--rot", `${rot}deg`);
    el.innerHTML = `<div class="icon">🗒️</div>`;

    el.addEventListener("click", () => openModal(note, el));
    wallNotesEl.appendChild(el);
  });
}

hotspot.addEventListener("click", () => {
  if (!LOADED || !TODAY_NOTE) return;
  openModal(TODAY_NOTE, hotspot);
});

async function init() {
  const res = await fetch("notes.json?v=33", { cache: "no-store" });
  if (!res.ok) return;

  const notes = await res.json();
  if (!Array.isArray(notes) || notes.length === 0) return;

  const today = getParisDateYYYYMMDD();
  TODAY_NOTE = notes.find(n => n.date === today) || notes[notes.length - 1];
  LOADED = true;

  renderWallNotes(notes);
}

init().catch(console.error);




