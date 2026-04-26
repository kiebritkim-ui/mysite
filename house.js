// --- HOUSE TRACKER ---
let houseEditIndex = -1;
let housePhotos = []; // temp array for photo base64 during add/edit
let maintItemIndex = -1;

function toggleHouseFields() {
  const cat = document.getElementById('h-category').value;
  document.querySelectorAll('.cat-fields').forEach(el => el.style.display = 'none');
  if (cat === 'Paint') document.getElementById('paint-fields').style.display = '';
  else if (cat === 'Appliance') document.getElementById('appliance-fields').style.display = '';
  else if (cat === 'Construction') document.getElementById('construction-fields').style.display = '';
}

function renderHouse() {
  const list = DATA.house, el = document.getElementById('h-list');
  const q = document.getElementById('h-search').value.toLowerCase();
  const catF = document.getElementById('h-cat-filter').value;
  const filtered = list.map((h, i) => ({...h, _i: i})).filter(h => {
    if (catF && h.category !== catF) return false;
    if (!q) return true;
    return [h.name, h.category, h.room, h.notes, h.tags, h.store,
      h.paint_brand, h.paint_color, h.paint_code,
      h.app_brand, h.app_model, h.con_material, h.con_product
    ].some(f => (f||'').toLowerCase().includes(q));
  });
  document.getElementById('h-count').textContent = `${filtered.length} of ${list.length} items`;
  if (!filtered.length) { el.innerHTML = '<div class="empty">No items found</div>'; return; }

  el.innerHTML = filtered.map(h => {
    const metaParts = [h.room, h.condition, h.date].filter(Boolean);
    const catExtra = getCatSummary(h);
    const maintCount = (h.maintenance || []).length;
    let photosHtml = '';
    if (h.photos && h.photos.length) {
      photosHtml = '<div class="h-photos">' + h.photos.map(p => `<img src="${p}" alt="photo">`).join('') + '</div>';
    }
    return `<div class="h-card" onclick="editHouseItem(${h._i})">
      <div class="h-top">
        <div class="info">
          <div class="name">${esc(h.name)}</div>
          ${metaParts.length ? `<div class="meta">${metaParts.map(esc).join(' · ')}</div>` : ''}
          ${catExtra ? `<div class="meta">${catExtra}</div>` : ''}
          ${h.store ? `<div class="meta">📍 ${esc(h.store)}</div>` : ''}
          ${h.cost ? `<div class="meta">💰 $${esc(String(h.cost))}</div>` : ''}
          ${h.notes ? `<div class="comment">${esc(h.notes)}</div>` : ''}
          <div class="h-tags">
            <span class="h-tag cat">${esc(h.category)}</span>
            ${h.priority && h.priority !== 'Medium' ? `<span class="h-tag priority-${h.priority}">${esc(h.priority)}</span>` : ''}
            ${h.status === 'Needs Repair' ? '<span class="h-tag" style="color:#ff9800">Needs Repair</span>' : ''}
            ${(h.tags||'').split(',').filter(t=>t.trim()).map(t => `<span class="h-tag">${esc(t.trim())}</span>`).join('')}
          </div>
        </div>
        <div class="h-actions">
          <button onclick="event.stopPropagation();openMaintModal(${h._i})" title="Maintenance log">🔧${maintCount ? '<sup>'+maintCount+'</sup>' : ''}</button>
          <button onclick="event.stopPropagation();delHouseItem(${h._i})" title="Delete">×</button>
        </div>
      </div>
      ${photosHtml}
    </div>`;
  }).join('');
}

function getCatSummary(h) {
  if (h.category === 'Paint') {
    return [h.paint_brand, h.paint_color, h.paint_code, h.paint_finish].filter(Boolean).map(esc).join(' · ');
  }
  if (h.category === 'Appliance') {
    return [h.app_brand, h.app_model ? 'Model: ' + h.app_model : ''].filter(Boolean).map(esc).join(' · ');
  }
  if (h.category === 'Construction') {
    return [h.con_material, h.con_product, h.con_who].filter(Boolean).map(esc).join(' · ');
  }
  return '';
}

function openHouseModal(idx) {
  houseEditIndex = idx !== undefined ? idx : -1;
  document.getElementById('house-modal-title').textContent = houseEditIndex >= 0 ? 'Edit House Item' : 'Add House Item';
  housePhotos = [];

  const fields = ['h-name','h-room','h-date','h-cost','h-store','h-tags','h-notes',
    'h-paint-brand','h-paint-color','h-paint-code','h-paint-qty','h-paint-coats','h-paint-surface','h-paint-touchup',
    'h-app-brand','h-app-model','h-app-serial','h-app-warranty','h-app-maint',
    'h-con-material','h-con-product','h-con-mix','h-con-method','h-con-warranty'];
  fields.forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  document.getElementById('h-category').value = 'Paint';
  document.getElementById('h-condition').value = 'New';
  document.getElementById('h-status').value = 'Active';
  document.getElementById('h-priority').value = 'Medium';
  document.getElementById('h-paint-finish').value = '';
  document.getElementById('h-paint-type').value = '';
  document.getElementById('h-con-who').value = '';
  document.getElementById('h-photo-input').value = '';
  document.getElementById('h-photo-preview').innerHTML = '';

  if (houseEditIndex >= 0) {
    const h = DATA.house[houseEditIndex];
    document.getElementById('h-name').value = h.name || '';
    document.getElementById('h-category').value = h.category || 'Paint';
    document.getElementById('h-room').value = h.room || '';
    document.getElementById('h-date').value = h.date || '';
    document.getElementById('h-condition').value = h.condition || 'New';
    document.getElementById('h-status').value = h.status || 'Active';
    document.getElementById('h-priority').value = h.priority || 'Medium';
    document.getElementById('h-cost').value = h.cost || '';
    document.getElementById('h-store').value = h.store || '';
    document.getElementById('h-tags').value = h.tags || '';
    document.getElementById('h-notes').value = h.notes || '';
    // Paint
    document.getElementById('h-paint-brand').value = h.paint_brand || '';
    document.getElementById('h-paint-color').value = h.paint_color || '';
    document.getElementById('h-paint-code').value = h.paint_code || '';
    document.getElementById('h-paint-finish').value = h.paint_finish || '';
    document.getElementById('h-paint-type').value = h.paint_type || '';
    document.getElementById('h-paint-qty').value = h.paint_qty || '';
    document.getElementById('h-paint-coats').value = h.paint_coats || '';
    document.getElementById('h-paint-surface').value = h.paint_surface || '';
    document.getElementById('h-paint-touchup').value = h.paint_touchup || '';
    // Appliance
    document.getElementById('h-app-brand').value = h.app_brand || '';
    document.getElementById('h-app-model').value = h.app_model || '';
    document.getElementById('h-app-serial').value = h.app_serial || '';
    document.getElementById('h-app-warranty').value = h.app_warranty || '';
    document.getElementById('h-app-maint').value = h.app_maint || '';
    // Construction
    document.getElementById('h-con-material').value = h.con_material || '';
    document.getElementById('h-con-product').value = h.con_product || '';
    document.getElementById('h-con-mix').value = h.con_mix || '';
    document.getElementById('h-con-method').value = h.con_method || '';
    document.getElementById('h-con-who').value = h.con_who || '';
    document.getElementById('h-con-warranty').value = h.con_warranty || '';
    // Photos
    housePhotos = (h.photos || []).slice();
    renderPhotoPreview();
  }
  toggleHouseFields();
  document.getElementById('house-modal').classList.add('show');
}

function closeHouseModal() { document.getElementById('house-modal').classList.remove('show'); houseEditIndex = -1; }
function editHouseItem(i) { openHouseModal(i); }

function previewHousePhotos() {
  const input = document.getElementById('h-photo-input');
  Array.from(input.files).forEach(file => {
    const reader = new FileReader();
    reader.onload = e => {
      // Resize to max 400px to save Firebase space
      const img = new Image();
      img.onload = () => {
        const max = 400;
        let w = img.width, h = img.height;
        if (w > max || h > max) {
          if (w > h) { h = h * max / w; w = max; }
          else { w = w * max / h; h = max; }
        }
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        c.getContext('2d').drawImage(img, 0, 0, w, h);
        housePhotos.push(c.toDataURL('image/jpeg', 0.7));
        renderPhotoPreview();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function renderPhotoPreview() {
  const el = document.getElementById('h-photo-preview');
  el.innerHTML = housePhotos.map((p, i) =>
    `<div style="position:relative;display:inline-block">
      <img src="${p}" style="width:70px;height:70px;object-fit:cover;border-radius:6px;border:1px solid #333">
      <button onclick="housePhotos.splice(${i},1);renderPhotoPreview()" style="position:absolute;top:-4px;right:-4px;background:#ff6b6b;color:#fff;border:none;border-radius:50%;width:18px;height:18px;font-size:12px;cursor:pointer;line-height:18px;padding:0">×</button>
    </div>`
  ).join('');
}

async function saveHouseItem() {
  const name = document.getElementById('h-name').value.trim();
  if (!name) return;
  const cat = document.getElementById('h-category').value;
  const entry = {
    name,
    category: cat,
    room: document.getElementById('h-room').value.trim(),
    date: document.getElementById('h-date').value,
    condition: document.getElementById('h-condition').value,
    status: document.getElementById('h-status').value,
    priority: document.getElementById('h-priority').value,
    cost: document.getElementById('h-cost').value,
    store: document.getElementById('h-store').value.trim(),
    tags: document.getElementById('h-tags').value.trim(),
    notes: document.getElementById('h-notes').value.trim(),
    photos: housePhotos,
    maintenance: houseEditIndex >= 0 ? (DATA.house[houseEditIndex].maintenance || []) : []
  };
  // Paint fields
  if (cat === 'Paint') {
    entry.paint_brand = document.getElementById('h-paint-brand').value.trim();
    entry.paint_color = document.getElementById('h-paint-color').value.trim();
    entry.paint_code = document.getElementById('h-paint-code').value.trim();
    entry.paint_finish = document.getElementById('h-paint-finish').value;
    entry.paint_type = document.getElementById('h-paint-type').value;
    entry.paint_qty = document.getElementById('h-paint-qty').value.trim();
    entry.paint_coats = document.getElementById('h-paint-coats').value;
    entry.paint_surface = document.getElementById('h-paint-surface').value.trim();
    entry.paint_touchup = document.getElementById('h-paint-touchup').value;
  }
  // Appliance fields
  if (cat === 'Appliance') {
    entry.app_brand = document.getElementById('h-app-brand').value.trim();
    entry.app_model = document.getElementById('h-app-model').value.trim();
    entry.app_serial = document.getElementById('h-app-serial').value.trim();
    entry.app_warranty = document.getElementById('h-app-warranty').value;
    entry.app_maint = document.getElementById('h-app-maint').value.trim();
  }
  // Construction fields
  if (cat === 'Construction') {
    entry.con_material = document.getElementById('h-con-material').value.trim();
    entry.con_product = document.getElementById('h-con-product').value.trim();
    entry.con_mix = document.getElementById('h-con-mix').value.trim();
    entry.con_method = document.getElementById('h-con-method').value.trim();
    entry.con_who = document.getElementById('h-con-who').value;
    entry.con_warranty = document.getElementById('h-con-warranty').value.trim();
  }

  if (houseEditIndex >= 0) DATA.house[houseEditIndex] = entry;
  else DATA.house.push(entry);
  await saveKey('house');
  closeHouseModal();
  renderHouse();
}

async function delHouseItem(i) {
  if (!confirm('Delete this item?')) return;
  DATA.house.splice(i, 1);
  await saveKey('house');
  renderHouse();
}

// --- MAINTENANCE LOG ---
function openMaintModal(i) {
  maintItemIndex = i;
  const h = DATA.house[i];
  document.getElementById('maint-modal-title').textContent = `🔧 ${h.name} — Maintenance`;
  document.getElementById('mt-date').value = '';
  document.getElementById('mt-next').value = '';
  document.getElementById('mt-cost').value = '';
  document.getElementById('mt-notes').value = '';
  renderMaintList();
  document.getElementById('maint-modal').classList.add('show');
}

function closeMaintModal() { document.getElementById('maint-modal').classList.remove('show'); maintItemIndex = -1; }

function renderMaintList() {
  const h = DATA.house[maintItemIndex];
  const list = h.maintenance || [];
  const el = document.getElementById('maint-list');
  if (!list.length) { el.innerHTML = '<div class="empty" style="padding:10px">No maintenance entries yet</div>'; return; }
  el.innerHTML = list.map((m, i) =>
    `<div class="maint-entry">
      <div>
        <div><strong>${esc(m.type)}</strong> — ${esc(m.date||'no date')}</div>
        ${m.next ? `<div style="color:#888">Next due: ${esc(m.next)}</div>` : ''}
        ${m.cost ? `<div style="color:#888">$${esc(String(m.cost))}</div>` : ''}
        ${m.who ? `<div style="color:#888">By: ${esc(m.who)}</div>` : ''}
        ${m.notes ? `<div style="color:#aaa;font-style:italic">${esc(m.notes)}</div>` : ''}
      </div>
      <button class="del" onclick="delMaintEntry(${i})">×</button>
    </div>`
  ).join('');
}

async function addMaintEntry() {
  const date = document.getElementById('mt-date').value;
  if (!date) return;
  const h = DATA.house[maintItemIndex];
  if (!h.maintenance) h.maintenance = [];
  h.maintenance.push({
    type: document.getElementById('mt-type').value,
    date,
    next: document.getElementById('mt-next').value,
    cost: document.getElementById('mt-cost').value,
    who: document.getElementById('mt-who').value,
    notes: document.getElementById('mt-notes').value.trim()
  });
  await saveKey('house');
  document.getElementById('mt-date').value = '';
  document.getElementById('mt-next').value = '';
  document.getElementById('mt-cost').value = '';
  document.getElementById('mt-notes').value = '';
  renderMaintList();
  renderHouse();
}

async function delMaintEntry(i) {
  DATA.house[maintItemIndex].maintenance.splice(i, 1);
  await saveKey('house');
  renderMaintList();
  renderHouse();
}
