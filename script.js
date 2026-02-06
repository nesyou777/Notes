const debugEl = document.getElementById("debug");
debugEl.textContent = "JS loaded ✅";

const wallNotesEl = document.getElementById("wallNotes");
const hotspot = document.getElementById("tableStickyHotspot");

const modal = document.getElementById("modal");
const backdrop = document.getElementById("backdrop");
const closeBtn = document.getElementById("closeBtn");
const noteDateEl = document.getElementById("noteDate");
const noteTextEl = document.getElementById("noteText");
const noteCardEl = document.getElementById("noteCard");

const palette = ["#FFF4A8","#FFD6E7","#D9F7FF","#E8FFD9","#FFE3BA","#EAD9FF"];

let NOTES = [];
let TODAY_NOTE = null;
let LOADED = false;
let OPEN_WHEN_READY = false;

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

const WALL_POSITIONS = [
  { left: 73, top: 18, rot: -6 },
  { left: 85, top: 20, rot: 5 },
  { left: 75, top: 30, rot: 2 },
  { left: 87, top: 32, rot: -4 },
  { left: 72, top: 41, rot: 6 },
  { left: 85, top: 44, rot: -2 }
];

function openModal(note){
  noteDateEl.textContent = prettyDate(note.date);
  noteTextEl.innerHTML = escapeHtml(note.text);

  noteCardEl.style.background = palette[hashStr(note.date) % palette.length];

  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");
}

function closeModal(){
  modal.classList.add("hidden");
  modal.setAttribute("aria-hidden", "true");
}

backdrop.addEventListener("click", closeModal);
closeBtn.addEventListener("click", closeModal);
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });

function renderWallNotes(notes, today){
  wallNotesEl.innerHTML = "";

  const old = notes
    .filter(n => n.date !== today)
    .sort((a,b) => b.date.localeCompare(a.date));

  old.forEach((note, idx) => {
    const pos = WALL_POSITIONS[idx % WALL_POSITIONS.length];

    const el = document.createElement("div");
    el.className = "stickySmall";
    el.style.left = `${pos.left}%`;
    el.style.top = `${pos.top}%`;
    el.style.setProperty("--rot", `${pos.rot}deg`);
    el.style.background = palette[hashStr(note.date) % palette.length];

    el.innerHTML = `
      <div class="date">${prettyDate(note.date)}</div>
      <div class="text">${escapeHtml(note.text)}</div>
    `;

    el.addEventListener("click", () => openModal(note));
    wallNotesEl.appendChild(el);
  });
}

function tryOpenToday(){
  if (!LOADED) {
    debugEl.textContent = "HOTSPOT CLICK ✅ (loading notes…)";
    OPEN_WHEN_READY = true;
    return;
  }
  if (!TODAY_NOTE) {
    debugEl.textContent = "Loaded ✅ but no note found ❌";
    return;
  }
  debugEl.textContent = "Opening today note ✅";
  openModal(TODAY_NOTE);
}

hotspot.addEventListener("click", tryOpenToday);

async function init(){
  debugEl.textContent = "Loading notes.json…";

  const res = await fetch("notes.json?v=4", { cache: "no-store" });
  if (!res.ok) {
    debugEl.textContent = `notes.json error ❌ (${res.status})`;
    return;
  }

  const notes = await res.json();
  if (!Array.isArray(notes) || notes.length === 0) {
    debugEl.textContent = "notes.json invalid/empty ❌";
    return;
  }

  NOTES = notes;
  LOADED = true;

  const today = getParisDateYYYYMMDD();
  TODAY_NOTE = notes.find(n => n.date === today) || notes[notes.length - 1];

  debugEl.textContent = `notes loaded ✅ (${notes.length})`;

  renderWallNotes(notes, today);

  if (OPEN_WHEN_READY) {
    OPEN_WHEN_READY = false;
    tryOpenToday();
  }
}

init().catch((e) => {
  console.error(e);
  debugEl.textContent = "JS error ❌ (open console)";
});
