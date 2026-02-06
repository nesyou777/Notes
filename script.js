// ========= Helpers =========
const $ = (sel) => document.querySelector(sel);

function formatPrettyDate(iso) {
  // iso: YYYY-MM-DD
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "2-digit" });
}

// Slow handwriting typing animation
async function typeTextSlow(el, text, msPerChar = 55) {
  el.classList.add("typing");
  el.textContent = "";
  for (let i = 0; i < text.length; i++) {
    el.textContent += text[i];
    // small pause variety
    const extra = (text[i] === "\n" || text[i] === "." || text[i] === "!" || text[i] === "?") ? 120 : 0;
    await new Promise(r => setTimeout(r, msPerChar + extra));
  }
  el.classList.remove("typing");
}

// ========= Elements =========
const wallNotesEl = $("#wallNotes");
const hotspot = $("#todayHotspot");

const modal = $("#modal");
const backdrop = $("#backdrop");
const closeBtn = $("#closeBtn");
const modalCard = $("#modalCard");

const noteDateEl = $("#noteDate");
const noteTextEl = $("#noteText");

// ========= Preload assets to avoid first-time lag =========
(function preload() {
  const img = new Image();
  img.src = "backgroundNote.png";
})();

// ========= Wall zone (relative to sceneWrap) =========
// Adjust these if needed (you were asking about WALL_ZONE).
const WALL_ZONE = {
  leftMin: 55,   // % from left
  leftMax: 92,   // % from left
  topMin: 8,     // % from top
  topMax: 48     // % from top
};

// Colors cycle for old notes
const COLORS = ["sticky-yellow", "sticky-pink", "sticky-blue", "sticky-white", "sticky-green"];

function randomBetween(a, b) {
  return a + Math.random() * (b - a);
}

// ========= Music =========
let currentAudio = null;
function playMusic(src) {
  try {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio = null;
    }
    if (!src) return;

    currentAudio = new Audio(src);
    currentAudio.preload = "auto";
    currentAudio.play().catch(() => {
      // autoplay may fail until user interacts; it's okay because this is triggered by click
    });
  } catch (e) {}
}

// ========= Modal open/close + zoom-from-sticky =========
function openNoteFromElement(note, fromEl) {
  // Fill content
  noteDateEl.textContent = formatPrettyDate(note.date);

  // Zoom animation: start from the clicked sticky position
  const rect = fromEl.getBoundingClientRect();

  // Start tiny at clicked position
  modalCard.style.transition = "none";
  modalCard.style.left = `${rect.left}px`;
  modalCard.style.top = `${rect.top}px`;
  modalCard.style.width = `${rect.width}px`;
  modalCard.style.height = `${rect.height}px`;
  modalCard.style.transform = "translate(0, 0)";

  // Show modal
  modal.classList.remove("hidden");

  // Force reflow
  modalCard.getBoundingClientRect();

  // Animate to center
  requestAnimationFrame(() => {
    modalCard.style.transition = "all 360ms cubic-bezier(.2,.9,.2,1)";
    modalCard.style.left = "50%";
    modalCard.style.top = "50%";
    modalCard.style.width = "min(520px, 92vw)";
    modalCard.style.height = "min(620px, 85vh)";
    modalCard.style.transform = "translate(-50%, -50%)";
  });

  // Type text slowly
  typeTextSlow(noteTextEl, note.text, 55);

  // Play music for this note
  playMusic(note.music);
}

function closeModal() {
  modal.classList.add("hidden");
  noteTextEl.textContent = "";
  noteTextEl.classList.remove("typing");
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
}

backdrop.addEventListener("click", closeModal);
closeBtn.addEventListener("click", closeModal);
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeModal();
});

// ========= Load notes and render =========
async function init() {
  let data;
  try {
    const res = await fetch("notes.json", { cache: "no-store" });
    data = await res.json();
  } catch (e) {
    console.error("❌ Failed to load notes.json. Check JSON format!", e);
    return;
  }

  const notes = Array.isArray(data) ? data : (data?.notes || []);
  if (!notes.length) return;

  // Sort ascending by date
  notes.sort((a, b) => (a.date || "").localeCompare(b.date || ""));

  const todayNote = notes[notes.length - 1];
  const oldNotes = notes.slice(0, -1).reverse(); // newest old first

  // ✅ Hotspot opens today's note
  hotspot.addEventListener("click", () => {
    openNoteFromElement(todayNote, hotspot);
  });

  // ✅ Render old notes as small icons only (no text)
  wallNotesEl.innerHTML = "";
  oldNotes.forEach((note, i) => {
    const div = document.createElement("div");
    div.className = `stickySmall ${COLORS[i % COLORS.length]}`;
    div.style.left = `${randomBetween(WALL_ZONE.leftMin, WALL_ZONE.leftMax)}%`;
    div.style.top = `${randomBetween(WALL_ZONE.topMin, WALL_ZONE.topMax)}%`;
    div.style.setProperty("--rot", `${randomBetween(-10, 10)}deg`);

    div.innerHTML = `<div class="icon">🗒️</div>`;
    div.addEventListener("click", () => openNoteFromElement(note, div));

    wallNotesEl.appendChild(div);
  });
}

init();
