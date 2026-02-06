const introScene = document.getElementById("introScene");
const notesApp = document.getElementById("notesApp");
const stickyHotspot = document.getElementById("stickyHotspot");

const wallNotesEl = document.getElementById("wallNotes");
const mainNoteEl = document.getElementById("mainNote");
const hintTextEl = document.getElementById("hintText");
const todayLabelEl = document.getElementById("todayLabel");

const modal = document.getElementById("modal");
const modalBackdrop = document.getElementById("modalBackdrop");
const closeModalBtn = document.getElementById("closeModal");
const modalNoteEl = document.getElementById("modalNote");

const player = document.getElementById("player");
const playBtn = document.getElementById("playBtn");
const pauseBtn = document.getElementById("pauseBtn");
const modalPlay = document.getElementById("modalPlay");
const modalPause = document.getElementById("modalPause");
const muteBtn = document.getElementById("muteBtn");
const shuffleBtn = document.getElementById("shuffleBtn");

let NOTES = [];
let currentNote = null;
let isMuted = false;
let shuffleSalt = 0;

const palette = ["#FFF4A8","#FFD6E7","#D9F7FF","#E8FFD9","#FFE3BA","#EAD9FF"];

// Paris date
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
function prng(seed){
  let t = seed + 0x6D2B79F5;
  return function(){
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function renderStickyHTML(note){
  const date = prettyDate(note.date);
  const hasMusic = !!note.music;
  return `
    <div class="dateLine">
      <span>${date}</span>
      <span class="musicTag">${hasMusic ? "🎵" : ""}</span>
    </div>
    <div class="text">${escapeHtml(note.text)}</div>
  `;
}

function setMainNote(note, reasonText){
  currentNote = note;
  mainNoteEl.innerHTML = renderStickyHTML(note);
  const color = palette[hashStr(note.date) % palette.length];
  mainNoteEl.style.background = color;
  mainNoteEl.style.setProperty("--rot", `${-2 + Math.random() * 4}deg`);
  hintTextEl.textContent = reasonText || "Tap Play to start the note music 🎵";
}

function renderWallNotes(){
  wallNotesEl.innerHTML = "";
  const maxW = wallNotesEl.clientWidth - 18;
  const maxH = wallNotesEl.clientHeight - 18;

  const others = NOTES.filter(n => n.date !== currentNote?.date).slice().reverse();

  others.forEach((note) => {
    const seed = hashStr(note.date) + shuffleSalt * 99991;
    const rnd = prng(seed);

    const x = Math.floor(rnd() * (maxW - 210)) + 12;
    const y = Math.floor(rnd() * (maxH - 160)) + 12;
    const rot = (rnd() * 10 - 5).toFixed(1);

    const el = document.createElement("div");
    el.className = "wallNote";
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.style.setProperty("--rot", `${rot}deg`);
    el.style.setProperty("--color", palette[hashStr(note.date) % palette.length]);

    el.innerHTML = renderStickyHTML(note);
    el.addEventListener("click", () => openModal(note));
    wallNotesEl.appendChild(el);
  });
}

// Modal
function openModal(note){
  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");
  modalNoteEl.innerHTML = renderStickyHTML(note);
  modalNoteEl.style.background = palette[hashStr(note.date) % palette.length];
  currentNote = note;
}
function closeModal(){
  modal.classList.add("hidden");
  modal.setAttribute("aria-hidden", "true");
}
modalBackdrop.addEventListener("click", closeModal);
closeModalBtn.addEventListener("click", closeModal);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeModal();
});

// Audio
function loadAndPlay(note){
  if (!note?.music) {
    alert("No music attached to this note 🎧");
    return;
  }
  player.pause();
  player.currentTime = 0;
  player.src = note.music;
  player.muted = isMuted;
  player.play().catch(() => {});
}
playBtn.addEventListener("click", () => loadAndPlay(currentNote));
pauseBtn.addEventListener("click", () => player.pause());
modalPlay.addEventListener("click", () => loadAndPlay(currentNote));
modalPause.addEventListener("click", () => player.pause());

muteBtn.addEventListener("click", () => {
  isMuted = !isMuted;
  player.muted = isMuted;
  muteBtn.textContent = isMuted ? "🔇" : "🔊";
});

shuffleBtn.addEventListener("click", () => {
  shuffleSalt++;
  renderWallNotes();
});

// Intro → show app
function openTodayFromScene(){
  introScene.classList.add("hidden");
  notesApp.classList.remove("hidden");

  // Render wall after visible (so it has correct width/height)
  requestAnimationFrame(() => renderWallNotes());
}
stickyHotspot.addEventListener("click", openTodayFromScene);

// Load notes
async function init(){
  const today = getParisDateYYYYMMDD();
  todayLabelEl.textContent = `Paris date: ${today}`;

  const res = await fetch("notes.json", { cache: "no-store" });
  NOTES = await res.json();
  NOTES.sort((a,b) => a.date.localeCompare(b.date));

  const todayNote = NOTES.find(n => n.date === today);
  if (todayNote){
    setMainNote(todayNote, "Today’s note 💘 (tap Play for the music)");
  } else {
    const latest = NOTES[NOTES.length - 1];
    setMainNote(latest, "No new note today 😏 New one soon…");
  }

  window.addEventListener("resize", () => {
    if (!notesApp.classList.contains("hidden")) renderWallNotes();
  });
}

init().catch(err => {
  console.error(err);
  mainNoteEl.innerHTML = `<div class="text">Could not load notes.json 😭</div>`;
});
