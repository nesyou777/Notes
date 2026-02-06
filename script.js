const modal = document.getElementById("modal");
const modalCard = document.getElementById("modalCard");
const backdrop = document.getElementById("backdrop");
const closeBtn = document.getElementById("closeBtn");

const noteDateEl = document.getElementById("noteDate");
const noteTextEl = document.getElementById("noteText");

const wallNotesEl = document.getElementById("wallNotes");
const todayHotspot = document.getElementById("todayHotspot");

const audioEl = document.getElementById("noteAudio");

/* ✅ Preload backgroundNote.png so it’s instant on first open */
(function preload(){
  const img = new Image();
  img.src = "backgroundNote.png";
})();

/* positions near wall/TV — you can expand later */
const WALL_POSITIONS = [
  { left: 73, top: 16, rot: -8 },
  { left: 86, top: 18, rot: 6 },
  { left: 72, top: 29, rot: 4 },
  { left: 86, top: 31, rot: -6 },
  { left: 72, top: 42, rot: 7 },
  { left: 86, top: 44, rot: -4 }
];

const COLORS = ["sticky-yellow","sticky-pink","sticky-blue","sticky-white","sticky-green"];

/* typing speed (slow handwriting) */
const TYPE_DELAY_MS = 55;

let notes = [];
let todayNote = null;

function fmtDate(dateStr){
  // keep your exact string (ex: "Feb 06, 2026") or format it here
  return dateStr;
}

function sleep(ms){ return new Promise(r => setTimeout(r, ms)); }

async function typeText(text){
  noteTextEl.classList.add("typing");
  noteTextEl.textContent = "";
  for (let i = 0; i < text.length; i++){
    noteTextEl.textContent += text[i];
    await sleep(TYPE_DELAY_MS);
  }
  noteTextEl.classList.remove("typing");
}

function stopAudio(){
  audioEl.pause();
  audioEl.currentTime = 0;
}

function openModalFromRect(rect){
  modal.classList.remove("hidden");

  // start from clicked rect
  const startLeft = rect.left + rect.width/2;
  const startTop  = rect.top + rect.height/2;

  modalCard.style.transition = "none";
  modalCard.style.left = `${startLeft}px`;
  modalCard.style.top  = `${startTop}px`;
  modalCard.style.transform = "translate(-50%, -50%) scale(0.15)";

  // animate to center
  requestAnimationFrame(() => {
    modalCard.style.transition = "transform 320ms ease, left 320ms ease, top 320ms ease";
    modalCard.style.left = "50%";
    modalCard.style.top  = "50%";
    modalCard.style.transform = "translate(-50%, -50%) scale(1)";
  });
}

function closeModal(){
  stopAudio();
  modal.classList.add("hidden");
}

/* create sticky icons on wall */
function renderWallNotes(oldNotes){
  wallNotesEl.innerHTML = "";
  oldNotes.forEach((n, i) => {
    const pos = WALL_POSITIONS[i % WALL_POSITIONS.length];

    const div = document.createElement("div");
    div.className = `stickySmall ${COLORS[i % COLORS.length]}`;
    div.style.left = `${pos.left}%`;
    div.style.top  = `${pos.top}%`;
    div.style.setProperty("--rot", `${pos.rot}deg`);
    div.dataset.id = n.id;

    div.innerHTML = `<div class="icon">📝</div>`;

    div.addEventListener("click", () => openNote(div, n));
    wallNotesEl.appendChild(div);
  });
}

/* open note (with typing + music) */
async function openNote(sourceEl, noteObj){
  stopAudio();

  const rect = sourceEl.getBoundingClientRect();
  openModalFromRect(rect);

  noteDateEl.textContent = fmtDate(noteObj.date);

  // typing
  await typeText(noteObj.text || "");

  // music
  if (noteObj.music){
    audioEl.src = noteObj.music;
    try { await audioEl.play(); } catch(e){}
  }
}

/* load notes.json */
async function loadNotes(){
  const res = await fetch("notes.json", { cache: "no-store" });
  const data = await res.json();
  notes = Array.isArray(data) ? data : (data.notes || []);
}

/* pick today note = latest by date */
function pickToday(){
  if (!notes.length) return null;

  const sorted = [...notes].sort((a,b) => new Date(a.date) - new Date(b.date));
  return sorted[sorted.length - 1];
}

function setup(){
  todayNote = pickToday();
  const old = notes.filter(n => n.id !== todayNote?.id);

  renderWallNotes(old);

  // click hotspot opens today note
  todayHotspot.addEventListener("click", () => {
    if (!todayNote) return;
    openNote(todayHotspot, todayNote);
  });

  // modal close
  backdrop.addEventListener("click", closeModal);
  closeBtn.addEventListener("click", closeModal);
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
  });
}

/* init */
(async function init(){
  await loadNotes();
  setup();
})();
