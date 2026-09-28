const $ = (id) => document.getElementById(id);
const STORAGE_KEY = "retirement-counter-days";
const LABELS = { educational: "📚 Educational day", retire: "🌴 Retire day" };

// { "YYYY-MM-DD": "educational" | "retire" }
function loadLog() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

function saveLog() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(log)); } catch {}
}

const pad = (n) => String(n).padStart(2, "0");
const isoDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const formatDay = (iso) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" });
};

let log = loadLog();

function renderPicker() {
  const day = $("day").value;
  const type = log[day];
  document.querySelectorAll(".choice").forEach((b) => b.classList.toggle("selected", b.dataset.type === type));
  $("status").textContent = type ? `${formatDay(day)} is marked as ${LABELS[type]}.` : "";
}

function renderStats() {
  const year = String(new Date().getFullYear());
  const counts = { educational: 0, retire: 0 };
  for (const [day, type] of Object.entries(log)) {
    if (day.startsWith(year) && counts[type] !== undefined) counts[type]++;
  }
  $("count-educational").textContent = counts.educational;
  $("count-retire").textContent = counts.retire;
  $("stats-label").textContent = `Totals for ${year}`;
}

function renderHistory() {
  const days = Object.keys(log).sort().reverse();
  $("history-empty").hidden = days.length > 0;
  $("history").replaceChildren(...days.map((day) => {
    const li = document.createElement("li");
    const text = document.createElement("span");
    text.textContent = `${formatDay(day)} — ${LABELS[log[day]]}`;
    const remove = document.createElement("button");
    remove.textContent = "Remove";
    remove.addEventListener("click", () => {
      delete log[day];
      saveLog();
      renderAll();
    });
    li.append(text, remove);
    return li;
  }));
}

function renderAll() {
  renderPicker();
  renderStats();
  renderHistory();
}

function renderCountdown() {
  const now = new Date();
  const target = new Date(now.getFullYear() + 1, 0, 1);
  $("countdown-title").textContent = `Countdown to January 1, ${target.getFullYear()}`;
  const s = Math.floor((target - now) / 1000);
  $("days").textContent = Math.floor(s / 86400);
  $("hours").textContent = pad(Math.floor(s / 3600) % 24);
  $("minutes").textContent = pad(Math.floor(s / 60) % 60);
  $("seconds").textContent = pad(s % 60);
}

document.querySelectorAll(".choice").forEach((button) => {
  button.addEventListener("click", () => {
    const day = $("day").value;
    if (!day) return;
    // Clicking the already-selected choice clears it.
    if (log[day] === button.dataset.type) delete log[day];
    else log[day] = button.dataset.type;
    saveLog();
    renderAll();
  });
});

$("day").value = isoDate(new Date());
$("day").max = $("day").value;
$("day").addEventListener("change", renderPicker);

renderAll();
renderCountdown();
setInterval(renderCountdown, 1000);

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
