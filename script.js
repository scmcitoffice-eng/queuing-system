// ── Firebase Setup ──────────────────────────────────────────────
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase, ref, set, onValue } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";



const firebaseConfig = {
  apiKey: "AIzaSyCKaS3b8Usv9zBHWuqzq3RMCIwtx7ttc5Q",
  authDomain: "queueing-system-a35aa.firebaseapp.com",
  projectId: "queueing-system-a35aa",
  storageBucket: "queueing-system-a35aa.firebasestorage.app",
  messagingSenderId: "706820569428",
  appId: "1:706820569428:web:72792a1fef109a5a4670c1",
  measurementId: "G-2J6DHTV94S",
  databaseURL: "https://queueing-system-a35aa-default-rtdb.asia-southeast1.firebasedatabase.app"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app, firebaseConfig.databaseURL);
const queueRef = ref(db, 'queue_state');

// ── Local State ─────────────────────────────────────────────────
const queues = {
  HMO: { prefix: 'H', current: 0, history: [] },
  Cash: { prefix: 'C', current: 0, history: [] },
  Priority: { prefix: 'P', current: 0, history: [] }
};

let activeTab = 'HMO';
let isSyncing = false; // prevent echo loop when Firebase fires our own write

// ── Helpers ─────────────────────────────────────────────────────
function fmt(prefix, n) {
  return prefix + String(n).padStart(3, '0');
}

function setTab(tab) {
  activeTab = tab;
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelector(`.tab-btn[data-tab="${tab}"]`).classList.add('active');
  renderQueue();
}

function getQ() {
  return queues[activeTab];
}

// ── Push state to Firebase ──────────────────────────────────────
function pushToFirebase() {
  const activeQ = queues[activeTab];
  const currentLabel = activeQ.current === 0 ? '—' : fmt(activeQ.prefix, activeQ.current);
  const subEl = document.getElementById('currentSub');

  const payload = {
    num: currentLabel,
    sub: activeQ.current === 0 ? '' : (subEl ? subEl.textContent.trim() : ''),
    ts: Date.now(),
    allQueues: {
      HMO: { prefix: 'H', current: queues.HMO.current, history: queues.HMO.history },
      Cash: { prefix: 'C', current: queues.Cash.current, history: queues.Cash.history },
      Priority: { prefix: 'P', current: queues.Priority.current, history: queues.Priority.history }
    }
  };

  isSyncing = true;
  set(queueRef, payload).finally(() => {
    setTimeout(() => { isSyncing = false; }, 500);
  });
}

// ── Render UI ───────────────────────────────────────────────────
function renderQueue() {
  const q = getQ();
  const display = document.getElementById('current');
  const sub = document.getElementById('currentSub');
  const nextUp = document.getElementById('nextUp');
  const logContainer = document.getElementById('historyLog');

  if (q.current === 0) {
    display.textContent = '—';
    sub.innerHTML = '&nbsp;';
  } else {
    display.textContent = fmt(q.prefix, q.current);
  }

  nextUp.textContent = q.current < 999 ? fmt(q.prefix, q.current + 1) : '—';

  logContainer.innerHTML = q.history.map(entry => `
    <div class="log-item">
      <span><strong>${fmt(entry.prefix, entry.num)}</strong> ${entry.action}</span>
      <span style="color: var(--text-muted)">${entry.time}</span>
    </div>
  `).join('');

  pushToFirebase();
}

function addHistory(action, num) {
  const q = getQ();
  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  q.history.unshift({ action, num, prefix: q.prefix, time });
  if (q.history.length > 30) q.history.pop();
}

// ── Queue Actions ────────────────────────────────────────────────
function callNext() {
  const q = getQ();
  if (q.current >= 999) {
    alert('Maximum number reached. Please reset for the next day.');
    return;
  }
  q.current++;
  const display = document.getElementById('current');
  const sub = document.getElementById('currentSub');

  display.textContent = fmt(q.prefix, q.current);
  sub.textContent = 'Please proceed to the window';
  display.classList.remove('pop');
  void display.offsetWidth;
  display.classList.add('pop');

  addHistory('Called', q.current);
  renderQueue();
}

function recallCurrent() {
  const q = getQ();
  if (q.current === 0) return;
  addHistory('Recalled', q.current);
  renderQueue();
}

function skipNext() {
  const q = getQ();
  if (q.current >= 999) return;
  q.current++;
  const display = document.getElementById('current');
  const sub = document.getElementById('currentSub');
  display.textContent = fmt(q.prefix, q.current);
  sub.textContent = 'Number Skipped';
  addHistory('Skipped', q.current);
  renderQueue();
}

function resetQueue() {
  if (!confirm(`Reset the ${activeTab} queue? This cannot be undone.`)) return;
  const q = getQ();
  q.current = 0;
  q.history = [];
  const display = document.getElementById('current');
  const sub = document.getElementById('currentSub');
  display.textContent = '—';
  display.classList.remove('pop');
  sub.innerHTML = '&nbsp;';
  window.speechSynthesis && window.speechSynthesis.cancel();
  renderQueue();
}

// ── Listen for remote changes (multi-device support) ─────────────
// If another admin tab or device updates Firebase, sync local state
onValue(queueRef, (snapshot) => {
  if (isSyncing) return; // ignore our own writes
  const data = snapshot.val();
  if (!data || !data.allQueues) return;

  // Restore state from Firebase into local queues
  for (const [type, q] of Object.entries(data.allQueues)) {
    if (queues[type]) {
      queues[type].current = q.current || 0;
      queues[type].history = q.history || [];
    }
  }

  // Re-render without pushing back to Firebase
  const q = getQ();
  const display = document.getElementById('current');
  const sub = document.getElementById('currentSub');
  const nextUp = document.getElementById('nextUp');
  const logContainer = document.getElementById('historyLog');

  if (q.current === 0) {
    display.textContent = '—';
    sub.innerHTML = '&nbsp;';
  } else {
    display.textContent = fmt(q.prefix, q.current);
    sub.textContent = data.sub || 'Please proceed to the window';
  }
  nextUp.textContent = q.current < 999 ? fmt(q.prefix, q.current + 1) : '—';
  logContainer.innerHTML = q.history.map(entry => `
    <div class="log-item">
      <span><strong>${fmt(entry.prefix, entry.num)}</strong> ${entry.action}</span>
      <span style="color: var(--text-muted)">${entry.time}</span>
    </div>
  `).join('');
});

// ── Init ─────────────────────────────────────────────────────────
renderQueue();

// Expose to HTML onclick handlers
window.setTab = setTab;
window.callNext = callNext;
window.recallCurrent = recallCurrent;
window.skipNext = skipNext;
window.resetQueue = resetQueue;