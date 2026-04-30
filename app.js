// --- Sidebar & Tab switching ---
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sidebar-overlay').classList.toggle('show');
}

function showTab(id) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.sidebar button').forEach(b => b.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  const btn = document.querySelector(`.sidebar button[onclick="showTab('${id}')"]`);
  if (btn) btn.classList.add('active');
  const titles = {dashboard:'Dashboard',finance:'Finance',restaurants:'Restaurants',movies:'Movies',house:'House',calendar:'Calendar',documents:'Documents'};
  document.getElementById('page-title').textContent = titles[id] || id;
  if (id === 'calendar') renderCalendar();
  if (id === 'dashboard' && typeof renderDashboard === 'function') renderDashboard();
  if (id === 'finance' && typeof renderBills === 'function') renderBills();
  if (id === 'documents' && typeof renderDocs === 'function') renderDocs();
  // Close sidebar on mobile
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebar-overlay').classList.remove('show');
}

// --- RESTAURANTS ---
let editIndex = -1;

function renderRestaurants() {
  const list = DATA.restaurants, el = document.getElementById('r-list');
  const q = document.getElementById('r-search').value.toLowerCase();
  const filtered = list.map((r, i) => ({...r, _i: i})).filter(r =>
    !q || r.name.toLowerCase().includes(q) || (r.type||'').toLowerCase().includes(q) || (r.location||'').toLowerCase().includes(q) || (r.comments||'').toLowerCase().includes(q)
  );
  document.getElementById('r-count').textContent = `${filtered.length} of ${list.length} restaurants`;
  if (!filtered.length) { el.innerHTML = '<div class="empty">No restaurants found</div>'; return; }
  el.innerHTML = filtered.map(r => {
    const nameHtml = r.url ? `<a href="${esc(r.url)}" target="_blank" onclick="event.stopPropagation()">${esc(r.name)}</a>` : esc(r.name);
    const metaParts = [r.location, r.type].filter(Boolean).map(esc);
    return `<div class="card" onclick="editRestaurant(${r._i})" style="cursor:pointer">
      <div class="info">
        <div class="name">${nameHtml}</div>
        ${metaParts.length ? `<div class="meta">${metaParts.join(' · ')}</div>` : ''}
        ${r.comments ? `<div class="comment">${esc(r.comments)}</div>` : ''}
      </div>
      <button class="del" onclick="event.stopPropagation();delRestaurant(${r._i})">×</button>
    </div>`;
  }).join('');
}

function openRestModal(idx) {
  editIndex = idx !== undefined ? idx : -1;
  document.getElementById('rest-modal-title').textContent = editIndex >= 0 ? 'Edit Restaurant' : 'Add Restaurant';
  if (editIndex >= 0) {
    const r = DATA.restaurants[editIndex];
    document.getElementById('r-name').value = r.name || '';
    document.getElementById('r-location').value = r.location || '';
    document.getElementById('r-type').value = r.type || '';
    document.getElementById('r-comments').value = r.comments || '';
    document.getElementById('r-url').value = r.url || '';
  } else {
    ['r-name','r-location','r-type','r-comments','r-url'].forEach(id => document.getElementById(id).value = '');
  }
  document.getElementById('rest-modal').classList.add('show');
}
function closeRestModal() { document.getElementById('rest-modal').classList.remove('show'); editIndex = -1; }
function editRestaurant(i) { openRestModal(i); }

async function saveRestaurant() {
  const name = document.getElementById('r-name').value.trim();
  if (!name) return;
  const entry = {
    name,
    location: document.getElementById('r-location').value.trim(),
    type: document.getElementById('r-type').value.trim(),
    comments: document.getElementById('r-comments').value.trim(),
    url: document.getElementById('r-url').value.trim()
  };
  if (editIndex >= 0) DATA.restaurants[editIndex] = entry;
  else DATA.restaurants.push(entry);
  await saveKey('restaurants');
  closeRestModal();
  renderRestaurants();
}

async function delRestaurant(i) {
  DATA.restaurants.splice(i, 1);
  await saveKey('restaurants');
  renderRestaurants();
}

// --- MOVIES ---
function renderMovies() {
  const list = DATA.movies, el = document.getElementById('m-list');
  if (!list.length) { el.innerHTML = '<div class="empty">No movies yet</div>'; return; }
  el.innerHTML = list.map((m, i) => `<div class="card"><div class="info"><div class="name">${esc(m.title)}</div>${m.genre ? `<div class="meta">${esc(m.genre)}</div>` : ''}</div><button class="del" onclick="delMovie(${i})">×</button></div>`).join('');
}

async function addMovie() {
  const title = document.getElementById('m-title').value.trim();
  if (!title) return;
  DATA.movies.push({ title, genre: document.getElementById('m-genre').value.trim() });
  await saveKey('movies');
  document.getElementById('m-title').value = '';
  document.getElementById('m-genre').value = '';
  renderMovies();
}

async function delMovie(i) {
  DATA.movies.splice(i, 1);
  await saveKey('movies');
  renderMovies();
}

// --- CALENDAR ---
let calYear, calMonth;
(function() { const d = new Date(); calYear = d.getFullYear(); calMonth = d.getMonth(); })();

function changeMonth(dir) { calMonth += dir; if (calMonth > 11) { calMonth = 0; calYear++; } if (calMonth < 0) { calMonth = 11; calYear--; } renderCalendar(); }

function eventOccursOn(ev, year, month, day) {
  const d = new Date(ev.date + 'T00:00:00');
  const eM = d.getMonth(), eD = d.getDate(), eY = d.getFullYear();
  switch (ev.recur) {
    case 'yearly': return eM === month && eD === day;
    case 'monthly': return eD === day;
    case 'biannual': return eM === month && eD === day && (year - eY) % 2 === 0;
    case 'quarterly': return eD === day && (month - eM + 12) % 3 === 0;
    case 'once': return eY === year && eM === month && eD === day;
  }
  return false;
}

function renderCalendar() {
  const events = DATA.events;
  document.getElementById('cal-title').textContent = new Date(calYear, calMonth).toLocaleString('default', { month: 'long', year: 'numeric' });
  const grid = document.getElementById('cal-grid');
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  let html = days.map(d => `<div class="day-label">${d}</div>`).join('');
  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const today = new Date();
  for (let i = 0; i < firstDay; i++) html += '<div class="day empty-day"></div>';
  for (let d = 1; d <= daysInMonth; d++) {
    const isToday = d === today.getDate() && calMonth === today.getMonth() && calYear === today.getFullYear();
    const hasEvent = events.some(e => eventOccursOn(e, calYear, calMonth, d));
    html += `<div class="day${isToday ? ' today' : ''}${hasEvent ? ' has-event' : ''}" onclick="showDayEvents(${d})">${d}</div>`;
  }
  grid.innerHTML = html;
  renderUpcoming(events);
}

function renderUpcoming(events) {
  const el = document.getElementById('upcoming');
  const today = new Date();
  const upcoming = [];
  for (let i = 0; i < 90; i++) {
    const d = new Date(today); d.setDate(d.getDate() + i);
    events.forEach(ev => {
      if (eventOccursOn(ev, d.getFullYear(), d.getMonth(), d.getDate())) {
        upcoming.push({ ...ev, next: new Date(d) });
      }
    });
  }
  if (!upcoming.length) { el.innerHTML = '<div class="empty">No upcoming events</div>'; return; }
  const labels = { yearly: 'Annual', monthly: 'Monthly', biannual: 'Every 2 yrs', quarterly: 'Quarterly', once: 'One-time' };
  el.innerHTML = '<h3>Upcoming (next 90 days)</h3>' + upcoming.map(u =>
    `<div class="event-card"><div class="info"><div class="name">${esc(u.name)}</div><div class="meta">${u.next.toLocaleDateString('default',{month:'short',day:'numeric',year:'numeric'})}${u.notes ? ' · ' + esc(u.notes) : ''}</div></div><span class="recur">${labels[u.recur]}</span></div>`
  ).join('');
}

function showDayEvents(day) {
  const matches = DATA.events.filter(e => eventOccursOn(e, calYear, calMonth, day));
  if (!matches.length) return;
  alert(matches.map(e => `${e.name}${e.notes ? ' — ' + e.notes : ''}`).join('\n'));
}

function openEventModal() { document.getElementById('event-modal').classList.add('show'); }
function closeEventModal() { document.getElementById('event-modal').classList.remove('show'); }

async function addEvent() {
  const name = document.getElementById('e-name').value.trim();
  const date = document.getElementById('e-date').value;
  if (!name || !date) return;
  DATA.events.push({ name, date, recur: document.getElementById('e-recur').value, notes: document.getElementById('e-notes').value.trim() });
  await saveKey('events');
  document.getElementById('e-name').value = '';
  document.getElementById('e-date').value = '';
  document.getElementById('e-notes').value = '';
  closeEventModal();
  renderCalendar();
}

// --- BULK IMPORT ---
let importTarget = '';

function openImportModal(target) {
  importTarget = target;
  const labels = {restaurants:'Restaurants',movies:'Movies',house:'House Items'};
  document.getElementById('import-modal-title').textContent = `📋 Import ${labels[target]}`;
  document.getElementById('import-text').value = '';
  document.getElementById('import-preview').textContent = '';
  document.getElementById('import-modal').classList.add('show');
  document.getElementById('import-text').oninput = () => {
    const items = parseImportItems();
    document.getElementById('import-preview').textContent = items.length ? `${items.length} item${items.length>1?'s':''} detected` : '';
  };
}

function closeImportModal() { document.getElementById('import-modal').classList.remove('show'); }

// Detect if a line is a detail (not a new item name)
function isDetailLine(line) {
  if (/^https?:\/\//i.test(line)) return true;
  if (/^(price|cost|quote|total|warranty|model|serial|brand|phone|email|address|note|invoice|order|ref|receipt|amount|paid|balance|estimate|vendor|contractor|contact|purchased|installed|delivered)/i.test(line)) return true;
  if (/^\$\d/.test(line)) return true;
  if (/\d{1,3}[-.]\d{3}[-.]\d{4}/.test(line)) return true;
  if (/^[\w.-]+@[\w.-]+\.\w+/.test(line)) return true;
  if (/^\d+\s*(per|each|for|x)\s/i.test(line)) return true;
  if (/^#\d+/.test(line)) return true;
  return false;
}

// Group pasted text into items: name line + following detail lines merged into notes
function parseImportItems() {
  const raw = document.getElementById('import-text').value;
  const lines = raw.split('\n').map(l => l.trim()).filter(l => l && !l.match(/^#+$/) && !l.match(/^[-=]+$/));
  const items = [];
  lines.forEach(line => {
    if (!items.length || !isDetailLine(line)) {
      // New item — extract URL or email if embedded in the name line
      let name = line, notes = '', url = '';
      const urlMatch = line.match(/(https?:\/\/\S+)/);
      if (urlMatch) { url = urlMatch[1]; name = line.replace(urlMatch[1], '').trim(); }
      const emailMatch = name.match(/([\w.-]+@[\w.-]+\.\w+)/);
      if (emailMatch) { notes = emailMatch[1]; name = name.replace(emailMatch[1], '').trim(); }
      name = name.replace(/^[-*•]\s*/, '').replace(/[,\s]+$/, '').trim();
      if (name) items.push({name, url, notes, details: []});
      else if (items.length) items[items.length - 1].details.push(line);
    } else {
      // Detail line — attach to previous item
      if (items.length) items[items.length - 1].details.push(line);
    }
  });
  // Smart field extraction from details
  items.forEach(item => {
    const all = [item.notes, ...item.details].filter(Boolean);
    item.url = ''; item.cost = ''; item.store = ''; item.phone = '';
    item.email = ''; item.date = ''; item.brand = ''; item.model = '';
    item.serial = ''; item.warranty = '';
    const leftover = [];

    all.forEach(line => {
      // URL
      const urlM = line.match(/(https?:\/\/\S+)/);
      if (urlM && !item.url) { item.url = urlM[1]; line = line.replace(urlM[1], '').trim(); }
      // Email
      const emM = line.match(/([\w.-]+@[\w.-]+\.\w+)/);
      if (emM) { item.email = emM[1]; line = line.replace(emM[1], '').trim(); }
      // Phone
      const phM = line.match(/(\+?1?[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/);
      if (phM) { item.phone = phM[1]; line = line.replace(phM[1], '').trim(); }
      // Cost/Price
      const costM = line.match(/\$(\d[\d,.]*)/);
      if (costM && !item.cost) { item.cost = costM[1].replace(/,/g, ''); }
      // Date (YYYY-MM-DD or Month Day, Year or DD/MM/YYYY)
      const dateM = line.match(/(\d{4}-\d{2}-\d{2})/);
      if (dateM && !item.date) { item.date = dateM[1]; line = line.replace(dateM[1], '').trim(); }
      // Key: value extraction
      const kvM = line.match(/^(brand|model|serial|warranty|room|location|material|product)\s*[:=]\s*(.+)$/i);
      if (kvM) {
        const key = kvM[1].toLowerCase(), val = kvM[2].trim();
        if (key === 'brand') item.brand = val;
        else if (key === 'model') item.model = val;
        else if (key === 'serial') item.serial = val;
        else if (key === 'warranty') item.warranty = val;
        else if (key === 'room' || key === 'location') item.room = val;
        else if (key === 'material') item.material = val;
        else if (key === 'product') item.product = val;
        return;
      }
      // Anything remaining goes to leftover notes
      if (line.trim()) leftover.push(line.trim());
    });

    // Build store/vendor from email + phone + url
    const storeParts = [item.email, item.phone, item.url].filter(Boolean);
    item.store = storeParts.join(' | ');
    item.notes = leftover.join(' | ');
  });
  return items;
}

async function runImport() {
  const items = parseImportItems();
  if (!items.length) return;
  let added = 0;

  if (importTarget === 'restaurants') {
    const existing = new Set(DATA.restaurants.map(r => r.name.toLowerCase()));
    items.forEach(item => {
      if (existing.has(item.name.toLowerCase())) return;
      existing.add(item.name.toLowerCase());
      const storeParts = [item.store, item.phone].filter(Boolean);
      DATA.restaurants.push({name: item.name, location:'', type:'', comments: item.notes, url: item.url});
      added++;
    });
    await saveKey('restaurants');
    renderRestaurants();
  }
  else if (importTarget === 'movies') {
    const existing = new Set(DATA.movies.map(m => m.title.toLowerCase()));
    items.forEach(item => {
      if (existing.has(item.name.toLowerCase())) return;
      existing.add(item.name.toLowerCase());
      DATA.movies.push({title: item.name, genre: item.notes});
      added++;
    });
    await saveKey('movies');
    renderMovies();
  }
  else if (importTarget === 'house') {
    const existing = new Set(DATA.house.map(h => h.name.toLowerCase()));
    items.forEach(item => {
      if (existing.has(item.name.toLowerCase())) return;
      existing.add(item.name.toLowerCase());
      const entry = {name: item.name, category:'Other', room: item.room||'', date: item.date||'', condition:'New', status:'Active', priority:'Medium', cost: item.cost, store: item.store, tags:'', notes: item.notes, photos:[], maintenance:[]};
      // Appliance fields
      if (item.brand) entry.app_brand = item.brand;
      if (item.model) { entry.app_model = item.model; entry.category = 'Appliance'; }
      if (item.serial) { entry.app_serial = item.serial; entry.category = 'Appliance'; }
      if (item.warranty) entry.app_warranty = item.warranty;
      if (item.brand && entry.category === 'Appliance') entry.app_brand = item.brand;
      // Construction fields
      if (item.material) { entry.con_material = item.material; entry.category = 'Construction'; }
      if (item.product) entry.con_product = item.product;
      DATA.house.push(entry);
      added++;
    });
    await saveKey('house');
    if (typeof renderHouse === 'function') renderHouse();
  }

  closeImportModal();
  alert(`Imported ${added} items. Tap any item to edit and add details.`);
}

// --- INIT ---
async function init() {
  await loadAll();
  // Seed defaults if DB is empty
  if (!DATA.restaurants.length) {
    DATA.restaurants = DEFAULT_RESTAURANTS;
    await saveKey('restaurants');
  }
  if (!DATA.movies.length) {
    DATA.movies = DEFAULT_MOVIES;
    await saveKey('movies');
  }
  renderRestaurants();
  renderMovies();
  if (typeof renderHouse === 'function') renderHouse();
  if (typeof renderDashboard === 'function') renderDashboard();
  if (typeof renderBills === 'function') renderBills();
  if (typeof renderDocs === 'function') renderDocs();
}
