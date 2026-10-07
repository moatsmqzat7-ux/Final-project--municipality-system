const KEY = 'baladia_simple_v1';
const $ = (id) => document.getElementById(id);
const today = () => new Date().toISOString().slice(0, 10);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function seed() {
  return {
    users: [
      { id: 1, username: 'admin', password: 'admin123', full_name: 'مدير النظام', role: 'admin' },
      { id: 2, username: 'storekeeper', password: 'store123', full_name: 'موظف المخزن', role: 'storekeeper' },
    ],
    warehouses: [
      { id: 1, name: 'المخزن الرئيسي', location: 'مبنى البلدية - الطابق الأرضي', notes: 'مواد عامة وقرطاسية' },
      { id: 2, name: 'مخزن الصيانة', location: 'المنطقة الصناعية', notes: 'قطع غيار وأدوات' },
    ],
    materials: [
      { id: 1, code: 'CEM-001', name: 'أسمنت', category: 'مواد بناء', unit: 'كيس', quantity: 200, min_stock: 50, warehouse_id: 1 },
      { id: 2, code: 'STL-010', name: 'حديد تسليح 12مم', category: 'مواد بناء', unit: 'طن', quantity: 5, min_stock: 2, warehouse_id: 1 },
      { id: 3, code: 'PAP-100', name: 'ورق طباعة A4', category: 'قرطاسية', unit: 'علبة', quantity: 120, min_stock: 20, warehouse_id: 1 },
      { id: 4, code: 'LMP-050', name: 'مصابيح إنارة شوارع', category: 'كهرباء', unit: 'قطعة', quantity: 80, min_stock: 15, warehouse_id: 2 },
      { id: 5, code: 'PIP-020', name: 'مواسير مياه 2 بوصة', category: 'سباكة', unit: 'قطعة', quantity: 60, min_stock: 10, warehouse_id: 2 },
    ],
    transactions: [],
    seq: { user: 3, warehouse: 3, material: 6, tx: 1 },
  };
}

let DB;
try { DB = JSON.parse(localStorage.getItem(KEY)) || seed(); }
catch { DB = seed(); }
function save() { localStorage.setItem(KEY, JSON.stringify(DB)); }
function resetData() {
  if (!confirm('تصفير كل البيانات والعودة للوضع الافتراضي؟')) return;
  DB = seed(); save(); toast('تم التصفير ✅'); enterApp();
}

let me = JSON.parse(sessionStorage.getItem('baladia_me') || 'null');
const wName = (id) => (DB.warehouses.find((w) => w.id === id) || {}).name || '—';
const mName = (id) => (DB.materials.find((m) => m.id === id) || {}).name || '—';

function toast(msg) {
  const t = $('toast'); t.textContent = msg; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}


function login() {
  const u = DB.users.find((x) => x.username === $('username').value.trim() && x.password === $('password').value);
  if (!u) { $('login-error').textContent = 'بيانات الدخول غير صحيحة'; return; }
  me = { id: u.id, username: u.username, full_name: u.full_name, role: u.role };
  sessionStorage.setItem('baladia_me', JSON.stringify(me));
  enterApp();
}
function logout() { me = null; sessionStorage.removeItem('baladia_me'); $('app').classList.add('hidden'); $('login-screen').classList.remove('hidden'); }

function enterApp() {
  if (!me) return;
  $('login-screen').classList.add('hidden');
  $('app').classList.remove('hidden');
  $('user-info').innerHTML = '👤 ' + esc(me.full_name) + '<br><small>' + (me.role === 'admin' ? 'مدير النظام' : 'موظف مخزن') + '</small>';
  $('nav-users').style.display = me.role === 'admin' ? '' : 'none';
  $('in-date').value = today(); $('out-date').value = today();
  renderAll();
}
function renderAll() { renderDashboard(); renderWarehouses(); renderMaterials(); renderMovements(); renderReports(); if (me.role === 'admin') renderUsers(); fillSelects(); }


function showPage(p) {
  document.querySelectorAll('#nav button').forEach((b) => b.classList.toggle('active', b.dataset.page === p));
  document.querySelectorAll('.page').forEach((s) => s.classList.add('hidden'));
  $('page-' + p).classList.remove('hidden');
}


function renderDashboard() {
  const low = DB.materials.filter((m) => m.quantity <= m.min_stock);
  const out = DB.materials.filter((m) => m.quantity <= 0);
  $('cards').innerHTML =
    card('📦 إجمالي المواد', DB.materials.length, '') +
    card('🏬 المخازن', DB.warehouses.length, '') +
    card('⚠️ منخفضة', low.length, 'warn') +
    card('⛔ نفدت', out.length, 'danger');
  $('dash-low').innerHTML = low.length
    ? low.slice(0, 5).map((m) => '<div>⚠️ <b>' + esc(m.name) + '</b> — المتبقي: <b>' + m.quantity + '</b> ' + esc(m.unit) + '</div>').join('')
    : '<span class="muted">المخزون بحالة جيدة ✅</span>';
  const recent = [...DB.transactions].reverse().slice(0, 5);
  $('dash-recent').innerHTML = recent.length
    ? recent.map((t) => '<div>' + (t.type === 'in' ? '<span class="tag-in">إدخال</span>' : '<span class="tag-out">إخراج</span>') + ' ' + esc(mName(t.material_id)) + ' — ' + t.quantity + ' <small class="muted">' + esc(t.date) + '</small></div>').join('')
    : '<span class="muted">لا حركات بعد</span>';
}
const card = (t, v, cls) => '<div class="card ' + cls + '"><span>' + t + '</span><b>' + v + '</b></div>';

function renderWarehouses() {
  $('warehouses-list').innerHTML = DB.warehouses.map((w) => {
    const mats = DB.materials.filter((m) => m.warehouse_id === w.id);
    return '<div class="w-card"><h4 style="margin:0">🏬 ' + esc(w.name) + '</h4>' +
      '<div class="muted">📍 ' + esc(w.location || '—') + ' | 📦 ' + mats.length + ' مادة</div>' +
      '<div class="muted">' + esc(w.notes || '') + '</div><ul>' +
      (mats.map((m) => '<li>' + esc(m.name) + ' — <b>' + m.quantity + '</b> ' + esc(m.unit) + '</li>').join('') || '<li class="muted">لا مواد</li>') + '</ul>' +
      '<span class="link" onclick="openWarehouseModal(' + w.id + ')">✏️ تعديل</span>' +
      (me.role === 'admin' ? ' <span class="link" style="color:#dc2626" onclick="delWarehouse(' + w.id + ')">🗑️ حذف</span>' : '') + '</div>';
  }).join('') || '<p class="muted">لا مخازن</p>';
  $('mat-filter-w').innerHTML = '<option value="">كل المخازن</option>' + DB.warehouses.map((w) => '<option value="' + w.id + '">' + esc(w.name) + '</option>').join('');
}
let editW = null;
function openWarehouseModal(id) {
  editW = id || null;
  const w = DB.warehouses.find((x) => x.id === id) || { name: '', location: '', notes: '' };
  $('modal-title').textContent = id ? 'تعديل مخزن' : 'مخزن جديد';
  $('modal-body').innerHTML = '<div class="field"><label>الاسم</label><input id="f-name" value="' + esc(w.name) + '"></div>' +
    '<div class="field"><label>الموقع</label><input id="f-loc" value="' + esc(w.location || '') + '"></div>' +
    '<div class="field"><label>ملاحظات</label><input id="f-notes" value="' + esc(w.notes || '') + '"></div>';
  $('modal').classList.remove('hidden');
  $('modal-save').onclick = () => {
    const name = $('f-name').value.trim();
    if (!name) return toast('اسم المخزن مطلوب');
    if (editW) Object.assign(DB.warehouses.find((x) => x.id === editW), { name, location: $('f-loc').value.trim(), notes: $('f-notes').value.trim() });
    else DB.warehouses.push({ id: DB.seq.warehouse++, name, location: $('f-loc').value.trim(), notes: $('f-notes').value.trim() });
    save(); closeModal(); renderWarehouses(); renderMaterials(); toast('تم الحفظ ✅');
  };
}
function delWarehouse(id) {
  if (me.role !== 'admin') return toast('للمدير فقط');
  if (!confirm('حذف المخزن؟ (تبقى المواد بدون مخزن)')) return;
  DB.warehouses = DB.warehouses.filter((w) => w.id !== id);
  DB.materials.forEach((m) => { if (m.warehouse_id === id) m.warehouse_id = null; });
  save(); renderWarehouses(); renderMaterials(); toast('تم الحذف');
}


function status(m) {
  if (m.quantity <= 0) return '<span class="badge out">نفدت</span>';
  if (m.quantity <= m.min_stock) return '<span class="badge low">منخفضة</span>';
  return '<span class="badge ok">متوفرة</span>';
}
function renderMaterials() {
  const q = ($('mat-search').value || '').trim();
  const w = $('mat-filter-w').value;
  const lowOnly = $('mat-filter-low').checked;
  const rows = DB.materials.filter((m) =>
    (!q || m.name.includes(q) || m.code.includes(q) || (m.category || '').includes(q)) &&
    (!w || m.warehouse_id === Number(w)) &&
    (!lowOnly || m.quantity <= m.min_stock));
  $('materials-body').innerHTML = rows.map((m) =>
    '<tr><td><b>' + esc(m.code) + '</b></td><td>' + esc(m.name) + '</td><td>' + esc(m.category || '—') + '</td><td>' + esc(m.unit) +
    '</td><td><b>' + m.quantity + '</b></td><td>' + m.min_stock + '</td><td>' + esc(wName(m.warehouse_id)) + '</td><td>' + status(m) + '</td><td>' +
    '<span class="link" onclick="openMaterialModal(' + m.id + ')">✏️</span>' +
    (me.role === 'admin' ? ' <span class="link" style="color:#dc2626" onclick="delMaterial(' + m.id + ')">🗑️</span>' : '') + '</td></tr>'
  ).join('') || '<tr><td colspan="9" class="muted">لا نتائج</td></tr>';
  fillSelects();
}
let editM = null;
function openMaterialModal(id) {
  editM = id || null;
  const m = DB.materials.find((x) => x.id === id) || { code: '', name: '', category: '', unit: 'قطعة', min_stock: 10, warehouse_id: '' };
  const opts = DB.warehouses.map((w) => '<option value="' + w.id + '"' + (w.id === m.warehouse_id ? ' selected' : '') + '>' + esc(w.name) + '</option>').join('');
  $('modal-title').textContent = id ? 'تعديل مادة' : 'مادة جديدة';
  $('modal-body').innerHTML =
    '<div class="row"><div class="field"><label>الكود</label><input id="f-code" value="' + esc(m.code) + '"' + (id ? ' disabled' : '') + '></div>' +
    '<div class="field"><label>الاسم</label><input id="f-mname" value="' + esc(m.name) + '"></div></div>' +
    '<div class="row"><div class="field"><label>التصنيف</label><input id="f-cat" value="' + esc(m.category || '') + '"></div>' +
    '<div class="field"><label>الوحدة</label><input id="f-unit" value="' + esc(m.unit || 'قطعة') + '"></div></div>' +
    '<div class="row"><div class="field"><label>الحد الأدنى</label><input id="f-min" type="number" value="' + m.min_stock + '"></div>' +
    '<div class="field"><label>المخزن</label><select id="f-w"><option value="">—</option>' + opts + '</select></div></div>';
  $('modal').classList.remove('hidden');
  $('modal-save').onclick = () => {
    const code = $('f-code').value.trim(), name = $('f-mname').value.trim();
    if (!code || !name) return toast('الكود والاسم مطلوبان');
    if (!editM && DB.materials.some((x) => x.code === code)) return toast('الكود موجود مسبقاً');
    const data = { code, name, category: $('f-cat').value.trim(), unit: $('f-unit').value.trim() || 'قطعة', min_stock: Number($('f-min').value) || 0, warehouse_id: $('f-w').value ? Number($('f-w').value) : null };
    if (editM) Object.assign(DB.materials.find((x) => x.id === editM), data);
    else DB.materials.push({ id: DB.seq.material++, quantity: 0, ...data });
    save(); closeModal(); renderMaterials(); renderDashboard(); toast('تم الحفظ ✅');
  };
}
function delMaterial(id) {
  if (me.role !== 'admin') return toast('للمدير فقط');
  if (!confirm('حذف المادة وحركاتها؟')) return;
  DB.materials = DB.materials.filter((m) => m.id !== id);
  DB.transactions = DB.transactions.filter((t) => t.material_id !== id);
  save(); renderAll(); toast('تم الحذف');
}
function closeModal() { $('modal').classList.add('hidden'); }
function fillSelects() {
  const opts = DB.materials.map((m) => '<option value="' + m.id + '">' + esc(m.name) + ' (' + esc(m.code) + ') — متاح: ' + m.quantity + '</option>').join('');
  ['in-material', 'out-material', 'rep-material'].forEach((id) => { if ($(id)) $(id).innerHTML = opts; });
}


function submitIn() { move('in'); }
function submitOut() { move('out'); }
function move(type) {
  const pre = type === 'in' ? 'in' : 'out';
  const mid = Number($(pre + '-material').value);
  const qty = Number($(pre + '-qty').value);
  const mat = DB.materials.find((m) => m.id === mid);
  if (!mat || !qty || qty <= 0) return toast('حدد المادة وكمية صحيحة');
  if (type === 'out' && mat.quantity < qty) return toast('المتاح (' + mat.quantity + ') أقل من المطلوب');
  DB.transactions.push({
    id: DB.seq.tx++, type, material_id: mid, quantity: qty,
    party: $(pre + '-party').value.trim(), date: $(pre + '-date').value || today(),
    notes: $(pre + '-notes').value.trim(), user: me.full_name,
  });
  mat.quantity += type === 'in' ? qty : -qty;
  save();
  $(pre + '-qty').value = ''; $(pre + '-party').value = ''; $(pre + '-notes').value = '';
  renderAll();
  toast(type === 'in' ? 'تم الإدخال ✅ الرصيد: ' + mat.quantity : 'تم الإخراج ✅ الرصيد: ' + mat.quantity);
}


function renderMovements() {
  const type = $('mv-type').value, q = ($('mv-search').value || '').trim();
  const from = $('mv-from').value, to = $('mv-to').value;
  const rows = [...DB.transactions].reverse().filter((t) =>
    (!type || t.type === type) &&
    (!q || mName(t.material_id).includes(q) || (t.party || '').includes(q)) &&
    (!from || t.date >= from) && (!to || t.date <= to));
  $('mv-body').innerHTML = rows.map((t) => {
    const m = DB.materials.find((x) => x.id === t.material_id) || {};
    return '<tr><td>' + esc(t.date) + '</td><td>' + (t.type === 'in' ? '<span class="tag-in">إدخال</span>' : '<span class="tag-out">إخراج</span>') +
      '</td><td>' + esc(m.name || '') + ' <small class="muted">' + esc(m.code || '') + '</small></td><td><b>' + t.quantity + '</b> ' + esc(m.unit || '') +
      '</td><td>' + esc(t.party || '—') + '</td><td>' + esc(wName(m.warehouse_id)) + '</td><td>' + esc(t.user || '—') + '</td></tr>';
  }).join('') || '<tr><td colspan="7" class="muted">لا حركات</td></tr>';
}


function renderReports() {
  const low = DB.materials.filter((m) => m.quantity <= m.min_stock);
  $('rep-low').innerHTML = low.length ? '<table><thead><tr><th>الكود</th><th>المادة</th><th>المتبقي</th><th>الحد</th></tr></thead><tbody>' +
    low.map((m) => '<tr><td>' + esc(m.code) + '</td><td>' + esc(m.name) + '</td><td><b>' + m.quantity + '</b></td><td>' + m.min_stock + '</td></tr>').join('') + '</tbody></table>' : 'لا نواقص ✅';
  $('rep-stock').innerHTML = '<table><thead><tr><th>الكود</th><th>المادة</th><th>الكمية</th><th>الوحدة</th><th>المخزن</th><th>الحالة</th></tr></thead><tbody>' +
    DB.materials.map((m) => '<tr><td>' + esc(m.code) + '</td><td>' + esc(m.name) + '</td><td><b>' + m.quantity + '</b></td><td>' + esc(m.unit) + '</td><td>' + esc(wName(m.warehouse_id)) + '</td><td>' + (m.quantity <= 0 ? 'نفدت' : m.quantity <= m.min_stock ? 'منخفضة' : 'متوفرة') + '</td></tr>').join('') + '</tbody></table>';
}
function movementReport() {
  const mid = Number($('rep-material').value);
  if (!mid) return toast('اختر المادة');
  const from = $('rep-from').value, to = $('rep-to').value;
  const rows = DB.transactions.filter((t) => t.material_id === mid && (!from || t.date >= from) && (!to || t.date <= to));
  let tin = 0, tout = 0;
  rows.forEach((t) => t.type === 'in' ? tin += t.quantity : tout += t.quantity);
  const m = DB.materials.find((x) => x.id === mid);
  $('rep-movement').innerHTML = '<p>إدخال: <b>' + tin + '</b> | إخراج: <b>' + tout + '</b> | الصافي: <b>' + (tin - tout) + '</b> | الحالي: <b>' + m.quantity + '</b></p>' +
    (rows.length ? '<table><thead><tr><th>التاريخ</th><th>النوع</th><th>الكمية</th><th>الجهة</th></tr></thead><tbody>' +
      rows.map((t) => '<tr><td>' + esc(t.date) + '</td><td>' + (t.type === 'in' ? 'إدخال' : 'إخراج') + '</td><td>' + t.quantity + '</td><td>' + esc(t.party || '—') + '</td></tr>').join('') + '</tbody></table>' : '<p class="muted">لا حركة في الفترة</p>');
}
function printArea(elId, title) {
  const w = window.open('', '_blank');
  w.document.write('<html dir="rtl"><head><title>' + title + '</title><style>table{width:100%;border-collapse:collapse}td,th{border:1px solid #333;padding:8px;text-align:right}body{font-family:Arial}</style></head><body><h2>' + title + ' — ' + today() + '</h2>' + $(elId).innerHTML + '</body></html>');
  w.document.close(); w.print();
}


function renderUsers() {
  $('users-body').innerHTML = DB.users.map((u) => '<tr><td>' + esc(u.username) + '</td><td>' + esc(u.full_name) + '</td><td>' +
    (u.role === 'admin' ? 'مدير النظام' : 'موظف مخزن') + '</td><td>' +
    (u.id !== me.id ? '<span class="link" style="color:#dc2626" onclick="delUser(' + u.id + ')">حذف</span>' : '<small class="muted">أنت</small>') + '</td></tr>').join('');
}
function createUser() {
  const username = $('u-username').value.trim(), full_name = $('u-fullname').value.trim(), password = $('u-password').value;
  if (!username || !full_name || !password) return toast('جميع الحقول مطلوبة');
  if (DB.users.some((u) => u.username === username)) return toast('الاسم موجود مسبقاً');
  DB.users.push({ id: DB.seq.user++, username, full_name, password, role: $('u-role').value });
  save();
  $('u-username').value = ''; $('u-fullname').value = ''; $('u-password').value = '';
  renderUsers(); toast('تمت الإضافة ✅');
}
function delUser(id) {
  if (!confirm('حذف المستخدم؟')) return;
  DB.users = DB.users.filter((u) => u.id !== id);
  save(); renderUsers(); toast('تم الحذف');
}

if (me) enterApp();
