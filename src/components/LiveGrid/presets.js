/* ============================================================
   <LiveGrid> presets — small, self-contained example configs for
   the REAL Photon Grid (photon-grid-core). Each returns
   { columns, data, options } for `new PhotonGrid.GridCore(el, ...)`.
   Renderers return DOM nodes via `renderer.display(p)` where
   p.value is the cell value and p.row is the whole row object.
   Kept intentionally light so docs pages stay fast.
   ============================================================ */

/* ---- small render helpers (return DOM nodes) ---- */
const AVATAR_COLORS = ['#7c3aed', '#d946ef', '#2563eb', '#059669', '#d97706', '#0891b2', '#dc2626', '#4f46e5'];
function colorFor(name) {
  let h = 0;
  for (let i = 0; i < name?.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS?.length];
}
function initials(name) {
  const p = String(name).trim().split(/\s+/);
  return ((p[0] || '')[0] || '') + ((p[1] || '')[0] || '');
}
function personCell(p) {
  const wrap = document.createElement('div');
  wrap.className = 'lg-person';
  const av = document.createElement('span');
  av.className = 'lg-avatar';
  av.style.background = colorFor(p.value);
  av.textContent = initials(p.value).toUpperCase();
  const info = document.createElement('div');
  info.className = 'lg-person__info';
  info.innerHTML =
    '<span class="lg-person__name">' + p.value + '</span>' +
    '<span class="lg-person__sub">' + (p.row.email || '') + '</span>';
  wrap.appendChild(av);
  wrap.appendChild(info);
  return wrap;
}
function badgeCell(text, kind) {
  const b = document.createElement('span');
  b.className = 'lg-badge lg-badge--' + (kind || 'violet');
  b.textContent = text;
  return b;
}
function moneyCell(p) {
  const s = document.createElement('span');
  s.className = 'lg-num';
  s.textContent = '$' + Number(p.value).toLocaleString();
  return s;
}
function changeCell(p) {
  const v = Number(p.value);
  const s = document.createElement('span');
  s.className = 'lg-badge lg-badge--' + (v >= 0 ? 'green' : 'red');
  s.textContent = (v >= 0 ? '▲ ' : '▼ ') + Math.abs(v).toFixed(2) + '%';
  return s;
}

const DEPT_KIND = {
  Engineering: 'violet', Finance: 'green', Marketing: 'blue',
  Sales: 'amber', Design: 'pink', Operations: 'cyan',
  'Human Resources': 'slate', 'Customer Support': 'slate',
};

/* ============================================================
   Preset 1 — quickStart (matches the Quick Start code sample)
   ============================================================ */
function quickStart() {
  const columns = [
    {field: 'id', header: 'ID', colId: 'id', width: 80},
    {field: 'name', header: 'Employee', colId: 'name', flex: 1, minWidth: 160},
    {field: 'department', header: 'Department', colId: 'department', flex: 1, minWidth: 150},
    {field: 'salary', header: 'Salary', colId: 'salary', flex: 1, minWidth: 120,
      type: 'number', renderer: {display: moneyCell}},
  ];
  const data = [
    {id: 1, name: 'John Smith', department: 'Engineering', salary: 85000},
    {id: 2, name: 'Sarah Johnson', department: 'Finance', salary: 72000},
    {id: 3, name: 'Michael Brown', department: 'Marketing', salary: 68000},
    {id: 4, name: 'Emma Wilson', department: 'Human Resources', salary: 61000},
    {id: 5, name: 'David Miller', department: 'Engineering', salary: 93000},
    {id: 6, name: 'Olivia Taylor', department: 'Sales', salary: 65000},
    {id: 7, name: 'James Anderson', department: 'Operations', salary: 78000},
    {id: 8, name: 'Sophia Thomas', department: 'Customer Support', salary: 54000},
  ];
  return {columns, data, options: {}};
}

/* ============================================================
   Preset 2 — richCells (custom renderers: avatar, badges, money)
   ============================================================ */
function richCells() {
  const base = quickStart();
  const data = base.data.map((r) => ({
    ...r,
    email: r.name.toLowerCase().replace(/\s+/g, '.') + '@photongrid.dev',
    status: r.salary >= 75000 ? 'Senior' : 'Member',
  }));
  const columns = [
    {field: 'name', header: 'Employee', colId: 'name', flex: 1.6, minWidth: 220,
      renderer: {display: personCell}},
    {field: 'department', header: 'Department', colId: 'department', flex: 1, minWidth: 150,
      renderer: {display: (p) => badgeCell(p.value, DEPT_KIND[p.value] || 'slate')}},
    {field: 'status', header: 'Level', colId: 'status', width: 120,
      renderer: {display: (p) => badgeCell(p.value, p.value === 'Senior' ? 'violet' : 'slate')}},
    {field: 'salary', header: 'Salary', colId: 'salary', width: 140, type: 'number',
      renderer: {display: moneyCell}},
  ];
  return {columns, data, options: {rowHeight: 52}};
}

/* ============================================================
   Preset 3 — finance (sortable watchlist with colored change %)
   ============================================================ */
function finance() {
  const columns = [
    {field: 'symbol', header: 'Symbol', colId: 'symbol', width: 110},
    {field: 'company', header: 'Company', colId: 'company', flex: 1, minWidth: 170},
    {field: 'price', header: 'Price', colId: 'price', width: 120, type: 'number',
      renderer: {display: (p) => {
        const s = document.createElement('span');
        s.className = 'lg-num';
        s.textContent = '$' + Number(p.value).toFixed(2);
        return s;
      }}},
    {field: 'change', header: 'Change', colId: 'change', width: 120, type: 'number',
      renderer: {display: changeCell}},
    {field: 'rating', header: 'Analyst', colId: 'rating', width: 130,
      renderer: {display: (p) => badgeCell(p.value,
        p.value === 'Strong Buy' ? 'green' : p.value === 'Buy' ? 'blue' : p.value === 'Hold' ? 'amber' : 'red')}},
  ];
  const data = [
    {symbol: 'AAPL', company: 'Apple Inc.', price: 229.35, change: 1.24, rating: 'Strong Buy'},
    {symbol: 'MSFT', company: 'Microsoft Corp.', price: 441.02, change: 0.68, rating: 'Buy'},
    {symbol: 'NVDA', company: 'NVIDIA Corp.', price: 132.9, change: 3.41, rating: 'Strong Buy'},
    {symbol: 'TSLA', company: 'Tesla Inc.', price: 251.44, change: -2.17, rating: 'Hold'},
    {symbol: 'AMZN', company: 'Amazon.com Inc.', price: 186.71, change: -0.42, rating: 'Buy'},
    {symbol: 'META', company: 'Meta Platforms', price: 512.2, change: 1.05, rating: 'Buy'},
    {symbol: 'NFLX', company: 'Netflix Inc.', price: 678.5, change: -1.33, rating: 'Sell'},
    {symbol: 'AMD', company: 'Adv. Micro Devices', price: 158.02, change: 2.28, rating: 'Buy'},
  ];
  return {columns, data, options: {rowHeight: 46}};
}

export const PRESETS = {
  quickStart,
  richCells,
  finance,
};
