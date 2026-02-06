const wallNotesEl = document.getElementById("wallNotes");
const hotspot = document.getElementById("tableStickyHotspot");

const modal = document.getElementById("modal");
const backdrop = document.getElementById("backdrop");
const closeBtn = document.getElementById("closeBtn");
const noteDateEl = document.getElementById("noteDate");
const noteTextEl = document.getElementById("noteText");
const modalCard = document.getElementById("modalCard");

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

function escapeHtml(str){
  return String(str)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;");
}

/* positions near TV/wall */
const WALL_POSITIONS = [
  { left: 73, top: 16, rot: -8 },
  { left: 86, top: 18, rot: 6 },
  { left: 72, top: 29, rot: 4 },
  { left: 86, top: 31, rot: -6 },
  { left: 72, top: 42, rot: 7 },
  { left: 86, top: 44, rot: -4 }
];

const COLORS = ["sticky-yellow","sticky-pink","sticky-blue","sticky-white","sticky-green"];

/* typing animation */
function typeText(fullText, speed = 22){
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

/* zoom transition from clicked sticky */
function openModal(note, sourceEl = null){
  noteDateEl.textContent = prettyDate(note.date);

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
    const to = modalCard.getBoundingClientRect(); // not perfect yet because just opened, but ok

    // set modalCard starting position = from
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

  // start typing
  typeText(note.text, 18);
}

function closeModal(){
  if (typingTimer) clearInterval(typingTimer);
  typingTimer = null;
  noteTextEl.classList.remove("typing");

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
    const color = COLORS[idx % COLORS.length];

    const el = document.createElement("div");
    el.className = `stickySmall ${color}`;
    el.style.left = `${pos.left}%`;
    el.style.top = `${pos.top}%`;
    el.style.setProperty("--rot", `${pos.rot}deg`);
    el.innerHTML = `<div class="icon">🗒️</div>`;

    el.addEventListener("click", () => openModal(note, el));
    wallNotesEl.appendChild(el);
  });
}

hotspot.addEventListener("click", () => {
  if (!LOADED || !TODAY_NOTE) return;
  openModal(TODAY_NOTE, hotspot);
});

async function init(){
  const res = await fetch("notes.json?v=22", { cache: "no-store" });
  if (!res.ok) return;

  const notes = await res.json();
  if (!Array.isArray(notes) || notes.length === 0) return;

  const today = getParisDateYYYYMMDD();
  TODAY_NOTE = notes.find(n => n.date === today) || notes[notes.length - 1];
  LOADED = true;

  renderWallNotes(notes);
}

init().catch(console.error);
