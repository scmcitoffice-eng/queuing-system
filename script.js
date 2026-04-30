// Queue state for each type
const queues = {
  HMO: { prefix: 'H', current: 0, history: [] },
  Cash: { prefix: 'C', current: 0, history: [] },
  Priority: { prefix: 'P', current: 0, history: [] }
};

let activeTab = 'HMO';

function fmt(prefix, n) {
  return prefix + String(n).padStart(3, '0');
}

function announceNumber(label) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const msg = new SpeechSynthesisUtterance();
  msg.text = `Now serving number ${label}. Please proceed to the window.`;
  msg.lang = 'en-US';
  msg.rate = 0.85;
  msg.pitch = 1;
  msg.volume = 1;
  window.speechSynthesis.speak(msg);
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

  if (q.current < 999) {
    nextUp.textContent = fmt(q.prefix, q.current + 1);
  } else {
    nextUp.textContent = '—';
  }

  logContainer.innerHTML = q.history.map(entry => `
    <div class="log-item">
      <span><strong>${fmt(entry.prefix, entry.num)}</strong> ${entry.action}</span>
      <span style="color: var(--text-muted)">${entry.time}</span>
    </div>
  `).join('');

  // Sync to customer display - include all queues
  const allCalled = [];
  for (const [type, data] of Object.entries(queues)) {
    data.history.filter(e => e.action === 'Called').forEach(e => {
      allCalled.push({ label: fmt(data.prefix, e.num), time: e.time, type });
    });
  }

  // Sort by raw timestamp
  const activeQ = queues[activeTab];
  const currentLabel = activeQ.current === 0 ? '—' : fmt(activeQ.prefix, activeQ.current);

  localStorage.setItem('queue_sync', JSON.stringify({
    num: currentLabel,
    sub: q.current === 0 ? '' : document.getElementById('currentSub').textContent.trim(),
    ts: Date.now(),
    allQueues: {
      HMO: { prefix: 'H', history: queues.HMO.history },
      Cash: { prefix: 'C', history: queues.Cash.history },
      Priority: { prefix: 'P', history: queues.Priority.history }
    }
  }));
}

function addHistory(action, num) {
  const q = getQ();
  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  q.history.unshift({ action, num, prefix: q.prefix, time });
  if (q.history.length > 30) q.history.pop();
}

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

  announceNumber(fmt(q.prefix, q.current));
  addHistory('Called', q.current);
  renderQueue();
}

function recallCurrent() {
  const q = getQ();
  if (q.current === 0) return;
  announceNumber(fmt(q.prefix, q.current));
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

renderQueue();