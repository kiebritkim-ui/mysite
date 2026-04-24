// --- Tab switching ---
function showTab(id) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('nav button').forEach(b => b.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  document.querySelector(`nav button[onclick="showTab('${id}')"]`).classList.add('active');
  if (id === 'calendar') renderCalendar();
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
}
init();
