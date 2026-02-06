const wallNotesEl = document.getElementById("wallNotes");
const hotspot = document.getElementById("tableStickyHotspot");

const modal = document.getElementById("modal");
const backdrop = document.getElementById("backdrop");
const closeBtn = document.getElementById("closeBtn");
const noteDateEl = document.getElementById("noteDate");
const noteTextEl = document.getElementById("noteText");

let TODAY_NOTE = null;
let LOADED = false;

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

/* positions near TV/wall */
const WALL_POSITIONS = [
  { left: 75, top: 18, rot: -8 },
  { left: 86, top: 20, rot: 6 },
  { left: 73, top: 31, rot: 4 },
  { left: 86, top: 33, rot: -6 },
  { left: 74, top: 44, rot: 7 },
  { left: 86, top: 46, rot: -4 }
];

function openModal(note){
  noteDateEl.textContent = prettyDate(note.date);
  noteTextEl.innerHTML = escapeHtml(note.text);
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

function renderWallNotes(notes){
  wallNotesEl.innerHTML = "";

  const today = getParisDateYYYYMMDD();

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

    // icon only
    el.innerHTML = `<div class="icon">🗒️</div>`;

    el.addEventListener("click", () => openModal(note));
    wallNotesEl.appendChild(el);
  });
}

hotspot.addEventListener("click", () => {
  if (!LOADED || !TODAY_NOTE) return;
  openModal(TODAY_NOTE);
});

async function init(){
  const res = await fetch("notes.json?v=10", { cache: "no-store" });
  if (!res.ok) return;

  const notes = await res.json();
  if (!Array.isArray(notes) || notes.length === 0) return;

  const today = getParisDateYYYYMMDD();
  TODAY_NOTE = notes.find(n => n.date === today) || notes[notes.length - 1];
  LOADED = true;

  renderWallNotes(notes);
}

init().catch(console.error);
