const pinnedNotesEl = document.getElementById("pinnedNotes");
const todayHotspot = document.getElementById("todayHotspot");

const modal = document.getElementById("modal");
const modalBackdrop = document.getElementById("modalBackdrop");
const closeModalBtn = document.getElementById("closeModal");
const modalNoteEl = document.getElementById("modalNote");

const player = document.getElementById("player");
const playBtn = document.getElementById("playBtn");
const pauseBtn = document.getElementById("pauseBtn");
const muteBtn = document.getElementById("muteBtn");

let NOTES = [];
let currentNote = null;
let isMuted = false;

const palette = ["#FFF4A8","#FFD6E7","#D9F7FF","#E8FFD9","#FFE3BA","#EAD9FF"];

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
function escapeHtml(str){
  return String(str)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;");
}
function hashStr(s){
  let h = 2166136261;
  for (let i = 0; i < s.length; i++){
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0);
}

/**
 * Place old notes as sticky notes ON the wall in snote.png.
 * These are percentage positions so they adapt to screen size.
 * 👉 You can tweak positions easily.
 */
const WALL_POSITIONS = [
  { left: 68, top: 18, rot: -6 },
  { left: 80, top: 22, rot: 5 },
  { left: 72, top: 33, rot: 2 },
  { left: 84, top: 35, rot: -4 },
  { left: 66, top: 42, rot: 6 },
  { left: 78, top: 46, rot: -2 }
];

function openModal(note, autoPlay = false){
  currentNote = note;

  const date = prettyDate(note.date);
  const hasMusic = !!note.music;

  modalNoteEl.innerHTML = `
    <div class="dateLine">
      <span>${date}</span>
      <span>${hasMusic ? "🎵" : ""}</span>
    </div>
    <div class="noteText">${escapeHtml(note.text)}</div>
  `;

  modalNoteEl.style.background = palette[hashStr(note.date) % palette.length];

  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");

  if (autoPlay && note.music) {
    loadAndPlay(note);
  }
}

function closeModal(){
  modal.classList.add("hidden");
  modal.setAttribute("aria-hidden", "true");
  player.pause();
}
modalBackdrop.addEventListener("click", closeModal);
closeModalBtn.addEventListener("click", closeModal);
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });

function loadAndPlay(note){
  if (!note?.music) return;
  player.pause();
  player.currentTime = 0;
  player.src = note.music;
  player.muted = isMuted;
  player.play().catch(() => {});
}

playBtn.addEventListener("click", () => loadAndPlay(currentNote));
pauseBtn.addEventListener("click", () => player.pause());

muteBtn.addEventListener("click", () => {
  isMuted = !isMuted;
  player.muted = isMuted;
  muteBtn.textContent = isMuted ? "🔇" : "🔊";
});

function renderPinnedOldNotes(today){
  pinnedNotesEl.innerHTML = "";

  const oldNotes = NOTES
    .filter(n => n.date !== today)
    .sort((a,b) => b.date.localeCompare(a.date)); // newest first

  oldNotes.forEach((note, idx) => {
    const pos = WALL_POSITIONS[idx % WALL_POSITIONS.length];

    const el = document.createElement("div");
    el.className = "stickySmall";
    el.style.left = `${pos.left}%`;
    el.style.top = `${pos.top}%`;
    el.style.setProperty("--rot", `${pos.rot}deg`);
    el.style.background = palette[hashStr(note.date) % palette.length];

    el.innerHTML = `
      <div class="date">
        <span>${prettyDate(note.date)}</span>
        <span>${note.music ? "🎵" : ""}</span>
      </div>
      <div class="text">${escapeHtml(note.text)}</div>
    `;

    el.addEventListener("click", () => openModal(note, true));
    pinnedNotesEl.appendChild(el);
  });
}

async function init(){
  const res = await fetch("notes.json", { cache: "no-store" });
  NOTES = await res.json();
  NOTES.sort((a,b) => a.date.localeCompare(b.date));

  const today = getParisDateYYYYMMDD();
  const todayNote = NOTES.find(n => n.date === today) || NOTES[NOTES.length - 1];

  // Hotspot opens today's note (or latest if no note today)
  todayHotspot.addEventListener("click", () => openModal(todayNote, true));

  // Show old notes pinned in the room
  renderPinnedOldNotes(today);
}

init().catch(console.error);
