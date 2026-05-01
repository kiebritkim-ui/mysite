// --- FINANCE: BILLS ---
let billEditIndex = -1;

function showFinanceTab(tab) {
  document.getElementById('finance-bills').style.display = tab === 'bills' ? '' : 'none';
  document.getElementById('finance-networth').style.display = tab === 'networth' ? '' : 'none';
  document.querySelectorAll('.finance-tabs button').forEach(b => b.classList.remove('ft-active'));
  event.target.classList.add('ft-active');
  if (tab === 'networth') renderNWHistory();
}

function renderBills() {
  const list = DATA.bills, el = document.getElementById('bill-list');
  document.getElementById('bill-count').textContent = `${list.length} bills`;
  if (!list.length) { el.innerHTML = '<div class="empty">No bills yet</div>'; return; }
  const today = new Date().toISOString().slice(0, 10);
  const sorted = list.map((b, i) => ({...b, _i: i})).sort((a, b) => (a.due || '').localeCompare(b.due || ''));
  el.innerHTML = sorted.map(b => {
    let statusClass = 'pending';
    if (b.status === 'Paid') statusClass = 'paid';
    else if (b.due && b.due < today) statusClass = 'overdue';
    return `<div class="bill-card" onclick="editBill(${b._i})">
      <div class="info">
        <div class="name">${esc(b.name)}</div>
        <div class="meta">${b.due ? esc(b.due) : 'No due date'} · ${esc(b.category||'')}${b.autopay==='yes' ? ' · Auto-pay' : ''}</div>
        ${b.notes ? `<div class="meta" style="color:#aaa;font-style:italic">${esc(b.notes)}</div>` : ''}
      </div>
      <div>
        <div class="amount ${statusClass}">$${esc(String(b.amount||0))}</div>
        <div style="font-size:11px;text-align:right" class="${statusClass}">${b.status === 'Paid' ? '✓ Paid' : statusClass === 'overdue' ? 'Overdue' : 'Pending'}</div>
      </div>
    </div>`;
  }).join('');
}

function openBillModal(idx) {
  billEditIndex = idx !== undefined ? idx : -1;
  document.getElementById('bill-modal-title').textContent = billEditIndex >= 0 ? 'Edit Bill' : 'Add Bill';
  if (billEditIndex >= 0) {
    const b = DATA.bills[billEditIndex];
    document.getElementById('b-name').value = b.name || '';
    document.getElementById('b-amount').value = b.amount || '';
    document.getElementById('b-due').value = b.due || '';
    document.getElementById('b-category').value = b.category || 'Utilities';
    document.getElementById('b-status').value = b.status || 'Pending';
    document.getElementById('b-autopay').value = b.autopay || 'no';
    document.getElementById('b-notes').value = b.notes || '';
  } else {
    ['b-name','b-amount','b-due','b-notes'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('b-category').value = 'Utilities';
    document.getElementById('b-status').value = 'Pending';
    document.getElementById('b-autopay').value = 'no';
  }
  document.getElementById('bill-modal').classList.add('show');
}
function closeBillModal() { document.getElementById('bill-modal').classList.remove('show'); billEditIndex = -1; }
function editBill(i) { openBillModal(i); }

async function saveBill() {
  const name = document.getElementById('b-name').value.trim();
  if (!name) return;
  const entry = {
    name,
    amount: parseFloat(document.getElementById('b-amount').value) || 0,
    due: document.getElementById('b-due').value,
    category: document.getElementById('b-category').value,
    status: document.getElementById('b-status').value,
    autopay: document.getElementById('b-autopay').value,
    notes: document.getElementById('b-notes').value.trim()
  };
  if (billEditIndex >= 0) DATA.bills[billEditIndex] = entry;
  else DATA.bills.push(entry);
  await saveKey('bills');
  closeBillModal();
  renderBills();
  renderDashboard();
}

// --- FINANCE: NET WORTH ---
function openNWModal() {
  document.getElementById('nw-date').value = new Date().toISOString().slice(0, 10);
  document.getElementById('nw-total').value = '';
  document.getElementById('nw-notes').value = '';
  document.getElementById('nw-modal').classList.add('show');
}
function closeNWModal() { document.getElementById('nw-modal').classList.remove('show'); }

async function saveNWSnapshot() {
  const total = parseFloat(document.getElementById('nw-total').value);
  if (isNaN(total)) return;
  DATA.networth.push({
    date: document.getElementById('nw-date').value,
    total,
    notes: document.getElementById('nw-notes').value.trim()
  });
  DATA.networth.sort((a, b) => a.date.localeCompare(b.date));
  await saveKey('networth');
  closeNWModal();
  renderNWHistory();
  renderDashboard();
}

function renderNWHistory() {
  const list = DATA.networth;
  const el = document.getElementById('nw-history');
  const cur = document.getElementById('nw-current');
  if (!list.length) {
    cur.innerHTML = '';
    el.innerHTML = '<div class="empty">No snapshots yet. Log your first one!</div>';
    return;
  }
  const latest = list[list.length - 1];
  const prev = list.length > 1 ? list[list.length - 2] : null;
  const change = prev ? latest.total - prev.total : 0;
  const changeStr = change >= 0 ? `+$${change.toLocaleString()}` : `-$${Math.abs(change).toLocaleString()}`;
  cur.innerHTML = `<div class="dash-card"><div class="dash-label">Current Net Worth</div><div class="dash-value">$${latest.total.toLocaleString()}</div>${prev ? `<div class="dash-sub" style="color:${change >= 0 ? '#66bb6a' : '#ff4444'}">${changeStr} since ${prev.date}</div>` : ''}</div>`;
  el.innerHTML = '<h3 style="font-size:15px;color:#aaa;margin-bottom:10px">History</h3>' + list.slice().reverse().map((s, i) =>
    `<div class="card"><div class="info"><div class="name">$${s.total.toLocaleString()}</div><div class="meta">${esc(s.date)}${s.notes ? ' · ' + esc(s.notes) : ''}</div></div><button class="del" onclick="delNW(${list.length - 1 - i})">×</button></div>`
  ).join('');
}

async function delNW(i) { DATA.networth.splice(i, 1); await saveKey('networth'); renderNWHistory(); renderDashboard(); }

// --- DASHBOARD ---
function renderDashboard() {
  // Net worth
  const nw = DATA.networth;
  if (nw.length) {
    const latest = nw[nw.length - 1];
    const prev = nw.length > 1 ? nw[nw.length - 2] : null;
    document.getElementById('dash-networth').textContent = '$' + latest.total.toLocaleString();
    if (prev) {
      const diff = latest.total - prev.total;
      document.getElementById('dash-nw-change').innerHTML = `<span style="color:${diff >= 0 ? '#66bb6a' : '#ff4444'}">${diff >= 0 ? '+' : ''}$${diff.toLocaleString()}</span> from last`;
    } else {
      document.getElementById('dash-nw-change').textContent = '';
    }
  } else {
    document.getElementById('dash-networth').textContent = '—';
    document.getElementById('dash-nw-change').textContent = 'No data yet';
  }

  // Monthly expenses (sum of pending + paid bills)
  const totalBills = DATA.bills.reduce((sum, b) => sum + (parseFloat(b.amount) || 0), 0);
  document.getElementById('dash-expenses').textContent = '$' + totalBills.toLocaleString();
  document.getElementById('dash-bills-count').textContent = `${DATA.bills.length} bills tracked`;

  // Bills due soon (next 7 days)
  const today = new Date();
  const soon = new Date(today); soon.setDate(soon.getDate() + 7);
  const todayStr = today.toISOString().slice(0, 10);
  const soonStr = soon.toISOString().slice(0, 10);
  const dueSoon = DATA.bills.filter(b => b.status !== 'Paid' && b.due && b.due >= todayStr && b.due <= soonStr);
  const overdue = DATA.bills.filter(b => b.status !== 'Paid' && b.due && b.due < todayStr);
  const el = document.getElementById('dash-bills-due');
  const allDue = [...overdue, ...dueSoon];
  if (!allDue.length) {
    el.innerHTML = '<div style="color:#555;font-size:13px">No bills due soon ✓</div>';
  } else {
    el.innerHTML = allDue.map(b => {
      const isOverdue = b.due < todayStr;
      return `<div class="card" style="border-color:${isOverdue ? '#ff4444' : '#ff9800'}33"><div class="info"><div class="name">${esc(b.name)}</div><div class="meta">${esc(b.due)} · $${b.amount}${isOverdue ? ' · <span style="color:#ff4444">OVERDUE</span>' : ''}</div></div></div>`;
    }).join('');
  }

  // Upcoming events (next 14 days)
  const evEl = document.getElementById('dash-events');
  const upcoming = [];
  for (let i = 0; i < 14; i++) {
    const d = new Date(today); d.setDate(d.getDate() + i);
    (DATA.events || []).forEach(ev => {
      if (typeof eventOccursOn === 'function' && eventOccursOn(ev, d.getFullYear(), d.getMonth(), d.getDate())) {
        upcoming.push({ name: ev.name, date: d.toLocaleDateString('default', {month: 'short', day: 'numeric'}) });
      }
    });
  }
  if (!upcoming.length) {
    evEl.innerHTML = '<div style="color:#555;font-size:13px">No events in the next 2 weeks</div>';
  } else {
    evEl.innerHTML = upcoming.map(u => `<div class="card"><div class="info"><div class="name">${esc(u.name)}</div><div class="meta">${esc(u.date)}</div></div></div>`).join('');
  }
}

// --- DOCUMENTS ---
let docEditIndex = -1;

function renderDocs() {
  const list = DATA.documents, el = document.getElementById('doc-list');
  if (!list.length) { el.innerHTML = '<div class="empty">No documents yet</div>'; return; }
  const grouped = {};
  list.forEach((d, i) => { const cat = d.category || 'Other'; if (!grouped[cat]) grouped[cat] = []; grouped[cat].push({...d, _i: i}); });
  el.innerHTML = Object.keys(grouped).sort().map(cat =>
    `<h3 style="font-size:14px;color:#888;margin:14px 0 8px">${esc(cat)}</h3>` +
    grouped[cat].map(d => {
      const nameHtml = d.link ? `<a href="${esc(d.link)}" target="_blank" onclick="event.stopPropagation()">${esc(d.title)}</a>` : esc(d.title);
      const embedBtn = d.embed ? `<button onclick="event.stopPropagation();viewEmbed(${d._i})" style="background:none;border:1px solid #333;color:#aaa;padding:4px 10px;border-radius:6px;font-size:12px;cursor:pointer;margin-left:8px">📊 View</button>` : '';
      return `<div class="doc-card" onclick="editDoc(${d._i})" style="cursor:pointer"><div class="info"><div class="name">${nameHtml}${embedBtn}</div>${d.notes ? `<div class="meta">${esc(d.notes)}</div>` : ''}</div><button class="del" onclick="event.stopPropagation();delDoc(${d._i})">×</button></div>`;
    }).join('')
  ).join('');
}

function viewEmbed(i) {
  const d = DATA.documents[i];
  if (!d.embed) return;
  const overlay = document.createElement('div');
  overlay.className = 'overlay show';
  overlay.style.zIndex = '25';
  overlay.innerHTML = `<div style="width:95vw;height:90vh;background:#1a1a1a;border-radius:12px;border:1px solid #333;display:flex;flex-direction:column;overflow:hidden">
    <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px;border-bottom:1px solid #333">
      <span style="font-weight:600">${esc(d.title)}</span>
      <button onclick="this.closest('.overlay').remove()" style="background:none;border:none;color:#aaa;font-size:22px;cursor:pointer">×</button>
    </div>
    <iframe src="${esc(d.embed)}" style="flex:1;border:none;background:#fff" allowfullscreen></iframe>
  </div>`;
  document.body.appendChild(overlay);
}

function openDocModal(idx) {
  docEditIndex = idx !== undefined ? idx : -1;
  document.getElementById('doc-modal-title').textContent = docEditIndex >= 0 ? 'Edit Document' : 'Add Document';
  if (docEditIndex >= 0) {
    const d = DATA.documents[docEditIndex];
    document.getElementById('d-title').value = d.title || '';
    document.getElementById('d-category').value = d.category || 'Other';
    document.getElementById('d-link').value = d.link || '';
    document.getElementById('d-embed').value = d.embed || '';
    document.getElementById('d-notes').value = d.notes || '';
  } else {
    ['d-title','d-link','d-embed','d-notes'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('d-category').value = 'Insurance';
  }
  document.getElementById('doc-modal').classList.add('show');
}
function closeDocModal() { document.getElementById('doc-modal').classList.remove('show'); docEditIndex = -1; }
function editDoc(i) { openDocModal(i); }

async function saveDoc() {
  const title = document.getElementById('d-title').value.trim();
  if (!title) return;
  const entry = {
    title,
    category: document.getElementById('d-category').value,
    link: document.getElementById('d-link').value.trim(),
    embed: document.getElementById('d-embed').value.trim(),
    notes: document.getElementById('d-notes').value.trim()
  };
  if (docEditIndex >= 0) DATA.documents[docEditIndex] = entry;
  else DATA.documents.push(entry);
  await saveKey('documents');
  closeDocModal();
  renderDocs();
}

async function delDoc(i) { DATA.documents.splice(i, 1); await saveKey('documents'); renderDocs(); }
