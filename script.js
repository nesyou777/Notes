// ============================
// Sticky Notes - script.js
// ============================

const NOTES_URL = "notes.json";
const TYPE_DELAY_MS = 45; // slow handwriting typing (increase for slower)
let notes = [];

const hotspot = document.getElementById("tableHotspot");
const wallNotesEl = document.getElementById("wallNotes");

const modal = document.getElementById("modal");
const backdrop = document.getElementById("backdrop");
const closeBtn = document.getElementById("closeBtn");
const modalCard = document.getElementById("modalCard");

const noteDateEl = document.getElementById("noteDate");
const noteTextEl = document.getElementById("noteText");

const audioEl = document.getElementById("noteAudio");

// -------- Utils
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function stopAudio() {
  audioEl.pause();
  audioEl.currentTime = 0;
}

function getTodayParisISO() {
  const now = new Date();
  const paris = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Paris" }));
  const y = paris.getFullYear();
  const m = String(paris.getMonth() + 1).padStart(2, "0");
  const d = String(paris.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDatePretty(iso) {
  // iso: YYYY-MM-DD
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
}

// ✅ Grapheme-safe splitting (fixes emoji corruption)
function splitGraphemes(str) {
  if (window.Intl && Intl.Segmenter) {
    const seg = new Intl.Segmenter(undefined, { granularity: "grapheme" });
    return [...seg.segment(str)].map((s) => s.segment);
  }
  // fallback (handles emoji codepoints better than str[i])
  return Array.from(str);
}

// ✅ Handwriting typing (emoji-safe)
async function typeText(text) {
  noteTextEl.classList.add("typing");
  noteTextEl.textContent = "";

  const chars = splitGraphemes(text);

  for (const ch of chars) {
    noteTextEl.textContent += ch;
    await sleep(TYPE_DELAY_MS);
  }

  noteTextEl.classList.remove("typing");
}

function openModalFromRect(rect) {
  modal.classList.remove("hidden");

  // start from clicked rect (zoom-from-wall effect)
  const startLeft = rect.left + rect.width / 2;
  const startTop = rect.top + rect.height / 2;

  modalCard.style.transition = "none";
  modalCard.style.left = `${startLeft}px`;
  modalCard.style.top = `${startTop}px`;
  modalCard.style.transform = "translate(-50%, -50%) scale(0.15)";

  requestAnimationFrame(() => {
    modalCard.style.transition = "transform 320ms ease, left 320ms ease, top 320ms ease";
    modalCard.style.left = "50%";
    modalCard.style.top = "50%";
    modalCard.style.transform = "translate(-50%, -50%) scale(1)";
  });
}

function closeModal() {
  stopAudio();
  modal.classList.add("hidden");
}

// -------- Build wall sticky icons
const STICKY_COLORS = ["sticky-yellow", "sticky-pink", "sticky-blue", "sticky-white", "sticky-green"];

// If you have 50 notes, they’ll still place nicely inside a zone
const WALL_ZONE = { left: 62, top: 10, width: 33, height: 50 }; // % of image container

function positionInZone(i, total) {
  // simple grid layout that scales with note count
  const cols = Math.max(2, Math.ceil(Math.sqrt(total)));
  const rows = Math.ceil(total / cols);

  const col = i % cols;
  const row = Math.floor(i / cols);

  const cellW = WALL_ZONE.width / cols;
  const cellH = WALL_ZONE.height / rows;

  const jitterX = (Math.random() * 0.35 - 0.175) * cellW;
  const jitterY = (Math.random() * 0.35 - 0.175) * cellH;

  const left = WALL_ZONE.left + col * cellW + cellW / 2 + jitterX;
  const top = WALL_ZONE.top + row * cellH + cellH / 2 + jitterY;

  const rot = (Math.random() * 16 - 8).toFixed(1); // -8..+8 deg
  return { left, top, rot };
}

function renderWallNotes(oldNotes) {
  wallNotesEl.innerHTML = "";

  oldNotes.forEach((n, i) => {
    const div = document.createElement("div");
    div.className = `stickySmall ${STICKY_COLORS[i % STICKY_COLORS.length]}`;

    const pos = positionInZone(i, oldNotes.length);
    div.style.left = `${pos.left}%`;
    div.style.top = `${pos.top}%`;
    div.style.setProperty("--rot", `${pos.rot}deg`);

    div.innerHTML = `<span class="icon">🗒️</span>`;

    div.addEventListener("click", async () => {
      stopAudio();

      const rect = div.getBoundingClientRect();
      openModalFromRect(rect);

      noteDateEl.textContent = formatDatePretty(n.date);
      await typeText(n.text || "");

      if (n.music) {
        audioEl.src = n.music;
        audioEl.play().catch(() => {});
      }
    });

    wallNotesEl.appendChild(div);
  });
}

// -------- Open today note from table hotspot
async function openTodayNote() {
  const todayISO = getTodayParisISO();
  const today = notes.find((x) => x.date === todayISO) || notes[notes.length - 1];

  const rect = hotspot.getBoundingClientRect();
  openModalFromRect(rect);

  stopAudio();

  noteDateEl.textContent = formatDatePretty(today.date);
  await typeText(today.text || "");

  if (today.music) {
    audioEl.src = today.music;
    audioEl.play().catch(() => {});
  }
}

// -------- Init
async function init() {
  // ✅ Preload backgroundNote so it doesn’t “pop in” late on first open
  const img = new Image();
  img.src = "backgroundNote.png";

  // Load notes
  const res = await fetch(NOTES_URL, { cache: "no-store" });
  const raw = await res.text();

  // ✅ Fix: if any accidental chars exist before "[" it breaks JSON
  const cleaned = raw.trim().replace(/^[^\[]+/, "");
  notes = JSON.parse(cleaned);

  // sort by date
  notes.sort((a, b) => a.date.localeCompare(b.date));

  const todayISO = getTodayParisISO();
  const oldNotes = notes.filter((n) => n.date !== todayISO);

  renderWallNotes(oldNotes);
}

// listeners
hotspot.addEventListener("click", openTodayNote);
backdrop.addEventListener("click", closeModal);
closeBtn.addEventListener("click", closeModal);

init().catch((e) => console.error("Init error:", e));
