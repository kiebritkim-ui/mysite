const firebaseConfig = {
  apiKey: "AIzaSyCTRzCyEZQ6iIAwVWKODtpZxgyDnvyzpAo",
  authDomain: "mysite-7f3e9.firebaseapp.com",
  databaseURL: "https://mysite-7f3e9-default-rtdb.firebaseio.com",
  projectId: "mysite-7f3e9",
  storageBucket: "mysite-7f3e9.firebasestorage.app",
  messagingSenderId: "940204190251",
  appId: "1:940204190251:web:53158dfb7fdbbfab57986e"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const provider = new firebase.auth.GoogleAuthProvider();

let DATA = { restaurants: [], movies: [], events: [], house: [], bills: [], networth: [], documents: [], contacts: [], todos: [] };
let authToken = null;

// --- Auth ---
function signIn() {
  auth.signInWithPopup(provider).catch(err => {
    alert('Sign-in failed: ' + err.message);
  });
}

function signOut() {
  auth.signOut();
}

auth.onAuthStateChanged(async user => {
  if (user) {
    authToken = await user.getIdToken();
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('app').style.display = 'block';
    document.getElementById('user-info').textContent = user.displayName || user.email;
    try {
      await init();
    } catch(e) {
      console.error('Init error:', e);
      alert('Error loading data: ' + e.message);
    }
  } else {
    authToken = null;
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('app').style.display = 'none';
  }
});

// --- Database (REST with auth token) ---
const DB_URL = firebaseConfig.databaseURL;

async function dbGet(path) {
  const r = await fetch(`${DB_URL}/${path}.json?auth=${authToken}`);
  if (!r.ok) throw new Error('DB read failed');
  return await r.json();
}

async function dbSet(path, data) {
  const r = await fetch(`${DB_URL}/${path}.json?auth=${authToken}`, {
    method: 'PUT',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(data)
  });
  if (!r.ok) throw new Error('DB write failed');
}

async function loadAll() {
  const d = await dbGet('');
  if (d) {
    DATA.restaurants = d.restaurants || [];
    DATA.movies = d.movies || [];
    DATA.events = d.events || [];
    DATA.house = d.house || [];
    DATA.bills = d.bills || [];
    DATA.networth = d.networth || [];
    DATA.documents = d.documents || [];
    DATA.contacts = d.contacts || [];
    DATA.todos = d.todos || [];
  }
}

async function saveKey(key) {
  await dbSet(key, DATA[key]);
}

function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
