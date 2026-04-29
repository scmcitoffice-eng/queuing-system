let currentNumber = 0;  // last number called/served
let historyLog = [];

function fmt(n) {
  return String(n).padStart(3, "0");
}

// Uses Web Speech API to announce the number out loud
function announceNumber(num) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel(); // stop any ongoing speech
  const msg = new SpeechSynthesisUtterance();
  msg.text = `Now serving number ${num}. Please proceed to the cashier.`;
  msg.lang = "en-US";
  msg.rate = 0.85;
  msg.pitch = 1;
  msg.volume = 1;
  window.speechSynthesis.speak(msg);
}

function renderQueue() {
  const nextUp = document.getElementById("nextUp");

  if (currentNumber < 100) {
    nextUp.textContent = "#" + fmt(currentNumber + 1);
  } else {
    nextUp.textContent = "—";
  }

  // Render History
  const logContainer = document.getElementById("historyLog");
  logContainer.innerHTML = historyLog.map(entry => `
    <div class="log-item">
        <span><strong>#${fmt(entry.num)}</strong> ${entry.action}</span>
        <span style="color: var(--text-muted)">${entry.time}</span>
    </div>
  `).join('');

  // Sync with Customer Display via LocalStorage
  localStorage.setItem('queue_sync', JSON.stringify({
    num: currentNumber === 0 ? "—" : "#" + fmt(currentNumber),
    sub: document.getElementById("currentSub").textContent.trim() || "",
    ts: Date.now()
  }));
}

function addHistory(action, num) {
  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  historyLog.unshift({ action, num, time });
  if (historyLog.length > 20) historyLog.pop();
}

// Calls the next number in queue (and serves it)
function callNext() {
  if (currentNumber >= 100) {
    alert("Maximum number (100) reached. Please reset for the next day.");
    return;
  }

  currentNumber++;
  const current = currentNumber;

  const display = document.getElementById("current");
  const sub = document.getElementById("currentSub");

  display.textContent = "#" + fmt(current);
  sub.textContent = "Please proceed to the cashier";

  display.classList.remove("pop");
  void display.offsetWidth;
  display.classList.add("pop");

  announceNumber(current);
  addHistory("Called", current);
  renderQueue();
}

function recallCurrent() {
  if (currentNumber === 0) return;
  announceNumber(currentNumber);
  addHistory("Recalled", currentNumber);
  renderQueue();
}

function skipNext() {
  if (currentNumber >= 100) return;
  currentNumber++;
  const display = document.getElementById("current");
  const sub = document.getElementById("currentSub");
  display.textContent = "#" + fmt(currentNumber);
  sub.textContent = "Number Skipped";
  addHistory("Skipped", currentNumber);
  renderQueue();
}

function resetQueue() {
  if (!confirm("Reset the entire queue? This cannot be undone.")) return;
  currentNumber = 0;
  historyLog = [];
  const display = document.getElementById("current");
  const sub = document.getElementById("currentSub");
  display.textContent = "—";
  display.classList.remove("pop");
  sub.innerHTML = "&nbsp;";
  window.speechSynthesis && window.speechSynthesis.cancel();
  renderQueue();
}

renderQueue();