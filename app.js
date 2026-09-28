const $ = (id) => document.getElementById(id);
const STORAGE_KEY = "retirement-counter";
const DAY = 86400000;

function loadSettings() {
  const params = new URLSearchParams(location.search);
  if (params.has("date")) {
    return { name: params.get("name") || "", date: params.get("date"), start: params.get("start") || "" };
  }
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

function saveSettings(s) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch {}
}

function shareUrl(s) {
  const params = new URLSearchParams();
  if (s.name) params.set("name", s.name);
  params.set("date", s.date);
  if (s.start) params.set("start", s.start);
  return `${location.origin}${location.pathname}?${params}`;
}

// Parse YYYY-MM-DD as local midnight.
function parseDate(str) {
  if (!str) return null;
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d);
}

// Count Mon–Fri days from tomorrow through the day before `end`.
function countWorkdays(now, end) {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const days = Math.round((end - start) / DAY);
  if (days <= 0) return 0;
  let count = Math.floor(days / 7) * 5;
  const startDow = start.getDay();
  for (let i = 0; i < days % 7; i++) {
    const dow = (startDow + i) % 7;
    if (dow !== 0 && dow !== 6) count++;
  }
  return count;
}

const pad = (n) => String(n).padStart(2, "0");
let settings = loadSettings();
let timer;

function render() {
  const target = parseDate(settings.date);
  $("title").textContent = settings.name ? `${settings.name}'s Retirement` : "Retirement Counter";

  if (!target) {
    $("countdown").hidden = true;
    $("done").hidden = true;
    $("subtitle").textContent = "Set your retirement date below to start the countdown.";
    $("settings").open = true;
    return;
  }

  $("subtitle").textContent = target.toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const now = new Date();
  const diff = target - now;

  if (diff <= 0) {
    $("countdown").hidden = true;
    $("done").hidden = false;
    return;
  }
  $("done").hidden = true;
  $("countdown").hidden = false;

  const s = Math.floor(diff / 1000);
  $("days").textContent = Math.floor(s / 86400).toLocaleString();
  $("hours").textContent = pad(Math.floor(s / 3600) % 24);
  $("minutes").textContent = pad(Math.floor(s / 60) % 60);
  $("seconds").textContent = pad(s % 60);

  $("workdays").textContent = countWorkdays(now, target).toLocaleString();
  $("weeks").textContent = Math.floor(diff / (7 * DAY)).toLocaleString();
  $("years").textContent = (diff / (365.2425 * DAY)).toFixed(2);

  const start = parseDate(settings.start);
  if (start && start < target) {
    const pct = Math.min(100, Math.max(0, ((now - start) / (target - start)) * 100));
    $("progress-wrap").hidden = false;
    $("progress-bar").style.width = `${pct}%`;
    $("progress-pct").textContent = pct.toFixed(2);
  } else {
    $("progress-wrap").hidden = true;
  }
}

function fillForm() {
  $("name").value = settings.name || "";
  $("date").value = settings.date || "";
  $("start").value = settings.start || "";
}

function toast(msg) {
  $("toast").textContent = msg;
  setTimeout(() => ($("toast").textContent = ""), 2500);
}

$("form").addEventListener("submit", (e) => {
  e.preventDefault();
  settings = { name: $("name").value.trim(), date: $("date").value, start: $("start").value };
  saveSettings(settings);
  history.replaceState(null, "", location.pathname);
  render();
  toast("Saved.");
});

$("share").addEventListener("click", async () => {
  const s = { name: $("name").value.trim(), date: $("date").value, start: $("start").value };
  if (!s.date) return toast("Pick a retirement date first.");
  try {
    await navigator.clipboard.writeText(shareUrl(s));
    toast("Link copied!");
  } catch {
    toast(shareUrl(s));
  }
});

fillForm();
render();
timer = setInterval(render, 1000);

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
