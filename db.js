const DB_URL = 'https://mysite-7f3e9-default-rtdb.firebaseio.com';

async function dbGet(path) {
  const r = await fetch(`${DB_URL}/${path}.json`);
  return await r.json();
}

async function dbSet(path, data) {
  await fetch(`${DB_URL}/${path}.json`, {
    method: 'PUT',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(data)
  });
}

// Cache in memory, sync to/from Firebase
let DATA = { restaurants: [], movies: [], events: [] };

async function loadAll() {
  const d = await dbGet('');
  if (d) {
    DATA.restaurants = d.restaurants || [];
    DATA.movies = d.movies || [];
    DATA.events = d.events || [];
  }
}

async function saveKey(key) {
  await dbSet(key, DATA[key]);
}

function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
