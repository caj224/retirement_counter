const $ = (id) => document.getElementById(id);
const STORAGE_KEY = "retirement-counter-days";
const TARGET_KEY = "retirement-counter-target";
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

// History calendar: the month being shown, and the day selected for editing.
let viewMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
let editDay = null;

// The calendar starts at the earliest logged month, or January of this year.
function firstMonth() {
  const days = Object.keys(log).sort();
  const today = new Date();
  const jan = new Date(today.getFullYear(), 0, 1);
  if (!days.length) return jan;
  const [y, m] = days[0].split("-").map(Number);
  const first = new Date(y, m - 1, 1);
  return first < jan ? first : jan;
}

function renderHistory() {
  const today = isoDate(new Date());
  const y = viewMonth.getFullYear();
  const m = viewMonth.getMonth();
  const now = new Date();
  $("month-title").textContent = viewMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  $("prev-month").disabled = viewMonth <= firstMonth();
  $("next-month").disabled = y > now.getFullYear() || (y === now.getFullYear() && m >= now.getMonth());

  const cells = ["S", "M", "T", "W", "T", "F", "S"].map((d) => {
    const el = document.createElement("div");
    el.className = "dow";
    el.textContent = d;
    return el;
  });
  for (let i = 0; i < new Date(y, m, 1).getDay(); i++) cells.push(document.createElement("div"));

  const counts = { educational: 0, retire: 0, none: 0 };
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    const day = `${y}-${pad(m + 1)}-${pad(d)}`;
    const type = log[day];
    const future = day > today;
    if (!future) counts[type || "none"]++;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "day" + (type ? ` ${type}` : future ? " future" : " none");
    if (day === today) btn.classList.add("today");
    if (day === editDay) btn.classList.add("editing");
    btn.textContent = d;
    btn.disabled = future;
    btn.title = `${formatDay(day)} — ${type ? LABELS[type] : "No choice"}`;
    btn.addEventListener("click", () => {
      editDay = day;
      renderHistory();
    });
    cells.push(btn);
  }
  $("calendar").replaceChildren(...cells);
  $("month-summary").textContent =
    `This month: ${counts.educational} educational, ${counts.retire} retire, ${counts.none} with no choice`;

  $("editor").hidden = !editDay;
  if (editDay) {
    $("editor-title").textContent = formatDay(editDay);
    document.querySelectorAll(".edit-choice").forEach((b) =>
      b.classList.toggle("selected", b.dataset.type === (log[editDay] || "")));
  }
}

function renderAll() {
  renderPicker();
  renderStats();
  renderHistory();
}

// Custom target date (YYYY-MM-DD), or null to use the next January 1.
function loadTarget() {
  try { return localStorage.getItem(TARGET_KEY); } catch { return null; }
}

function saveTarget(value) {
  try {
    if (value) localStorage.setItem(TARGET_KEY, value);
    else localStorage.removeItem(TARGET_KEY);
  } catch {}
}

let customTarget = loadTarget();

function getTarget(now) {
  if (customTarget) {
    const [y, m, d] = customTarget.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date(now.getFullYear() + 1, 0, 1);
}

function renderCountdown() {
  const now = new Date();
  const target = getTarget(now);
  const label = target.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
  const s = Math.max(0, Math.floor((target - now) / 1000));
  $("countdown-title").textContent = s > 0 ? `Countdown to ${label}` : `${label} is here! 🎉`;
  $("days").textContent = Math.floor(s / 86400).toLocaleString();
  $("hours").textContent = pad(Math.floor(s / 3600) % 24);
  $("minutes").textContent = pad(Math.floor(s / 60) % 60);
  $("seconds").textContent = pad(s % 60);
  if (document.activeElement !== $("target")) $("target").value = isoDate(target);
  $("reset-target").hidden = !customTarget;
  $("weekdays-left").textContent = weekdaysBetween(now, target).toLocaleString();
}

// Mon–Fri days from today (inclusive) up to the target (exclusive).
function weekdaysBetween(from, to) {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  let count = 0;
  while (d < to) {
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) count++;
    d.setDate(d.getDate() + 1);
  }
  return count;
}

$("target").addEventListener("change", () => {
  customTarget = $("target").value || null;
  saveTarget(customTarget);
  renderCountdown();
});

$("reset-target").addEventListener("click", () => {
  customTarget = null;
  saveTarget(null);
  renderCountdown();
});

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

document.querySelectorAll(".edit-choice").forEach((button) => {
  button.addEventListener("click", () => {
    if (!editDay) return;
    if (button.dataset.type) log[editDay] = button.dataset.type;
    else delete log[editDay];
    saveLog();
    renderAll();
  });
});

$("prev-month").addEventListener("click", () => {
  viewMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1);
  renderHistory();
});

$("next-month").addEventListener("click", () => {
  viewMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1);
  renderHistory();
});

document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((t) => t.setAttribute("aria-selected", t === tab));
    $("panel-today").hidden = tab.dataset.tab !== "today";
    $("panel-history").hidden = tab.dataset.tab !== "history";
    if (tab.dataset.tab === "today") renderPicker();
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
