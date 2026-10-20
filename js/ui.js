// Sdílené UI helpery: ikony, formuláře, sheety, toasty, datumy, formátování.

export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ---------- datumy ----------
export const iso = (d = new Date()) => {
  const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return z.toISOString().slice(0, 10);
};
export const today = () => iso(new Date());
export const parse = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
export const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return iso(d); };
export const diffDays = (a, b) => Math.round((parse(a) - parse(b)) / 86400000);
export const DAYS = ['neděle', 'pondělí', 'úterý', 'středa', 'čtvrtek', 'pátek', 'sobota'];
export const DAYS_SHORT = ['Ne', 'Po', 'Út', 'St', 'Čt', 'Pá', 'So'];
export const MONTHS = ['leden', 'únor', 'březen', 'duben', 'květen', 'červen', 'červenec', 'srpen', 'září', 'říjen', 'listopad', 'prosinec'];
export const MONTHS_GEN = ['ledna', 'února', 'března', 'dubna', 'května', 'června', 'července', 'srpna', 'září', 'října', 'listopadu', 'prosince'];
export const weekday = s => parse(s).getDay();
export const mondayOf = s => { const d = parse(s); const wd = (d.getDay() + 6) % 7; d.setDate(d.getDate() - wd); return iso(d); };

export function fmtDay(s, long = false) {
  const d = parse(s);
  if (long) return `${DAYS[d.getDay()]} ${d.getDate()}. ${MONTHS_GEN[d.getMonth()]}`;
  return `${DAYS_SHORT[d.getDay()].toLowerCase()} ${d.getDate()}. ${d.getMonth() + 1}.`;
}
export function relDay(s) {
  const n = diffDays(s, today());
  if (n === 0) return 'Dnes';
  if (n === 1) return 'Zítra';
  if (n === -1) return 'Včera';
  return fmtDay(s);
}
const nf = new Intl.NumberFormat('cs-CZ', { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat('cs-CZ', { maximumFractionDigits: 1 });
export const num = n => nf.format(Math.round(n || 0));
export const num1 = n => nf1.format(n || 0);
export const money = n => `${nf.format(Math.round(n || 0))} Kč`;
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const sum = (arr, f = x => x) => arr.reduce((a, x) => a + (Number(f(x)) || 0), 0);

// ---------- ikony (24×24, stroke) ----------
const P = {
  home: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  check: '<path d="M4 12l5 5L20 6"/>',
  tasks: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 9l2 2 3-3M7 15h0M13 10h4M13 15h4"/>',
  food: '<path d="M7 3v8a2 2 0 0 0 2 2v8M5 3v5M9 3v5"/><path d="M17 3c-2 2-3 5-3 8h3v10"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  diary: '<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h11"/><path d="M9 8h6"/>',
  briefcase: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 13h18"/>',
  school: '<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c3 2 9 2 12 0v-5M22 9v6"/>',
  folder: '<path d="M3 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  gym: '<path d="M6 7v10M18 7v10M3 10v4M21 10v4M6 12h12"/>',
  flame: '<path d="M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-3 2-4 2-7 1.5 1 2 2 2 3 1-2 1-4 1-6z"/>',
  wallet: '<rect x="3" y="6" width="18" height="14" rx="2"/><path d="M3 10h18M16 15h2"/><path d="M6 6l9-3 1 3"/>',
  book: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 19V5M8 7h7"/>',
  note: '<path d="M5 3h10l4 4v14H5z"/><path d="M15 3v4h4M8 12h8M8 16h5"/>',
  cart: '<path d="M3 4h2l2 11h11l2-8H6"/><circle cx="9" cy="19" r="1.5"/><circle cx="17" cy="19" r="1.5"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  left: '<path d="M15 5l-7 7 7 7"/>',
  right: '<path d="M9 5l7 7-7 7"/>',
  down: '<path d="M6 9l6 6 6-6"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M14 6l4 4"/>',
  upload: '<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v4h16v-4"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
  bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 20a2 2 0 0 0 4 0"/>',
  sync: '<path d="M4 12a8 8 0 0 1 14-5l2 2M20 12a8 8 0 0 1-14 5l-2-2"/><path d="M20 4v5h-5M4 20v-5h5"/>',
  bolt: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
  drop: '<path d="M12 3c4 5 6 8 6 11a6 6 0 0 1-12 0c0-3 2-6 6-11z"/>',
  star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  pin: '<path d="M9 4h6l-1 6 3 3H7l3-3z"/><path d="M12 13v8"/>',
  link: '<path d="M10 14a4 4 0 0 0 6 0l3-3a4 4 0 0 0-6-6l-1 1"/><path d="M14 10a4 4 0 0 0-6 0l-3 3a4 4 0 0 0 6 6l1-1"/>',
  file: '<path d="M6 3h8l5 5v13H6z"/><path d="M14 3v5h5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  chart: '<path d="M4 20V4M4 20h16"/><path d="M8 16v-5M12 16V8M16 16v-3"/>',
  download: '<path d="M12 4v12M7 11l5 5 5-5"/><path d="M4 20h16"/>',
  moon: '<path d="M20 14A8 8 0 1 1 10 4a7 7 0 0 0 10 10z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  sunrise: '<path d="M4 18h16M6 14a6 6 0 0 1 12 0"/><path d="M12 3v4M9 6l3-3 3 3"/>',
};
export const icon = (name, size = 20, cls = '') =>
  `<svg class="ic ${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] || ''}</svg>`;

// ---------- toast ----------
export function toast(msg, kind = '') {
  const t = document.createElement('div');
  t.className = `toast ${kind}`;
  t.innerHTML = msg;
  $('#toasts').appendChild(t);
  requestAnimationFrame(() => t.classList.add('in'));
  setTimeout(() => { t.classList.remove('in'); setTimeout(() => t.remove(), 300); }, kind === 'long' ? 4200 : 2400);
}

// ---------- sheet (spodní panel) ----------
const stack = [];
export function sheet({ title = '', body = '', onOpen, onClose, wide = false }) {
  const wrap = document.createElement('div');
  wrap.className = 'sheet-wrap';
  wrap.innerHTML = `<div class="sheet-bg" data-close></div>
    <section class="sheet ${wide ? 'wide' : ''}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
      <div class="sheet-grip"></div>
      <header class="sheet-head"><h2>${esc(title)}</h2><button class="icon-btn" data-close aria-label="Zavřít">${icon('x')}</button></header>
      <div class="sheet-body">${body}</div>
    </section>`;
  $('#sheets').appendChild(wrap);
  document.body.classList.add('has-sheet');
  requestAnimationFrame(() => wrap.classList.add('in'));
  const api = {
    el: wrap.querySelector('.sheet'),
    body: wrap.querySelector('.sheet-body'),
    close() {
      wrap.classList.remove('in');
      const i = stack.indexOf(api); if (i >= 0) stack.splice(i, 1);
      if (!stack.length) document.body.classList.remove('has-sheet');
      setTimeout(() => wrap.remove(), 250);
      onClose && onClose();
    }
  };
  wrap.addEventListener('click', e => { if (e.target.closest('[data-close]')) api.close(); });
  stack.push(api);
  onOpen && onOpen(api);
  const first = wrap.querySelector('input:not([type=checkbox]):not([type=color]),textarea');
  if (first && !('ontouchstart' in window)) setTimeout(() => first.focus(), 260);
  return api;
}
export const sheetOpen = () => stack.length > 0;
document.addEventListener('keydown', e => { if (e.key === 'Escape' && stack.length) stack[stack.length - 1].close(); });

export function confirmSheet(text, yes = 'Smazat') {
  return new Promise(res => {
    let done = false;
    const s = sheet({
      title: 'Potvrzení',
      body: `<p class="muted">${esc(text)}</p><div class="row-btns"><button class="btn ghost" data-no>Zpět</button><button class="btn danger" data-yes>${esc(yes)}</button></div>`,
      onClose: () => { if (!done) res(false); }
    });
    s.body.querySelector('[data-yes]').onclick = () => { done = true; res(true); s.close(); };
    s.body.querySelector('[data-no]').onclick = () => { done = true; res(false); s.close(); };
  });
}

// ---------- formuláře ----------
// field: {k, label, type: text|textarea|number|date|time|select|color|check|chips|email|password, options:[{v,l,c}], ph, step, min, max, req, half, hint}
export function fieldHTML(f, v) {
  const id = 'f_' + f.k;
  const val = v ?? f.def ?? '';
  const lab = f.label ? `<label for="${id}">${esc(f.label)}</label>` : '';
  const hint = f.hint ? `<small class="hint">${esc(f.hint)}</small>` : '';
  let input = '';
  switch (f.type) {
    case 'textarea':
      input = `<textarea id="${id}" name="${f.k}" rows="${f.rows || 4}" placeholder="${esc(f.ph || '')}">${esc(val)}</textarea>`; break;
    case 'select':
      input = `<select id="${id}" name="${f.k}">${(f.options || []).map(o => `<option value="${esc(o.v)}" ${String(o.v) === String(val) ? 'selected' : ''}>${esc(o.l)}</option>`).join('')}</select>`; break;
    case 'check':
      return `<label class="check-field ${f.half ? 'half' : ''}"><input type="checkbox" name="${f.k}" ${val ? 'checked' : ''}><span class="cbox">${icon('check', 14)}</span><span>${esc(f.label)}</span></label>`;
    case 'chips':
      input = `<div class="chips" data-chips="${f.k}">${(f.options || []).map(o => `<button type="button" class="chip ${String(o.v) === String(val) ? 'on' : ''}" data-v="${esc(o.v)}" ${o.c ? `style="--c:${o.c}"` : ''}>${o.c ? '<i class="dot"></i>' : ''}${esc(o.l)}</button>`).join('')}</div><input type="hidden" name="${f.k}" value="${esc(val)}">`; break;
    case 'color':
      input = `<div class="swatches" data-chips="${f.k}">${SWATCHES.map(c => `<button type="button" class="sw ${c === val ? 'on' : ''}" data-v="${c}" style="--c:${c}" aria-label="${c}"></button>`).join('')}</div><input type="hidden" name="${f.k}" value="${esc(val || SWATCHES[0])}">`; break;
    default:
      input = `<input id="${id}" name="${f.k}" type="${f.type || 'text'}" value="${esc(val)}" placeholder="${esc(f.ph || '')}" ${f.step ? `step="${f.step}"` : ''} ${f.min != null ? `min="${f.min}"` : ''} ${f.max != null ? `max="${f.max}"` : ''} ${f.type === 'number' ? 'inputmode="decimal"' : ''} ${f.req ? 'required' : ''} ${f.list ? `list="${f.list}"` : ''} autocomplete="${f.ac || 'off'}">`;
  }
  return `<div class="field ${f.half ? 'half' : ''}">${lab}${input}${hint}</div>`;
}
export function bindChips(root) {
  root.addEventListener('click', e => {
    const b = e.target.closest('[data-chips] [data-v]');
    if (!b) return;
    const box = b.closest('[data-chips]');
    box.querySelectorAll('[data-v]').forEach(x => x.classList.toggle('on', x === b));
    const hidden = root.querySelector(`input[name="${box.dataset.chips}"]`);
    if (hidden) { hidden.value = b.dataset.v; hidden.dispatchEvent(new Event('change', { bubbles: true })); }
  });
}
export function readForm(root, fields) {
  const out = {};
  fields.forEach(f => {
    const el = root.querySelector(`[name="${f.k}"]`);
    if (!el) return;
    if (f.type === 'check') out[f.k] = el.checked;
    else if (f.type === 'number') out[f.k] = el.value === '' ? null : parseFloat(String(el.value).replace(',', '.'));
    else out[f.k] = el.value.trim();
  });
  return out;
}
export function openForm({ title, fields, values = {}, onSave, onDelete, saveLabel = 'Uložit', extra = '' }) {
  const s = sheet({
    title,
    body: `<form class="form" novalidate>${fields.map(f => fieldHTML(f, values[f.k])).join('')}${extra}
      <div class="row-btns">${onDelete ? `<button type="button" class="btn danger ghost" data-del>${icon('trash', 18)} Smazat</button>` : ''}<button class="btn primary" type="submit">${esc(saveLabel)}</button></div></form>`
  });
  const form = s.body.querySelector('form');
  bindChips(form);
  form.addEventListener('submit', e => {
    e.preventDefault();
    const v = readForm(form, fields);
    const missing = fields.find(f => f.req && (v[f.k] === '' || v[f.k] == null));
    if (missing) { toast(`Vyplň: ${missing.label}`, 'warn'); return; }
    const r = onSave(v, form);
    if (r !== false) s.close();
  });
  if (onDelete) form.querySelector('[data-del]').onclick = async () => {
    if (await confirmSheet('Opravdu smazat? Tohle nejde vrátit.')) { onDelete(); s.close(); }
  };
  return s;
}

export const SWATCHES = ['#4FD8FF', '#6E8BFF', '#B07CFF', '#FF6FB1', '#FF5C6C', '#FF9F43', '#E0B65A', '#3DDC97', '#2EC4B6', '#9AA7B4'];

// ---------- prázdný stav ----------
export const empty = (text, btn = '', act = '') =>
  `<div class="empty"><p>${esc(text)}</p>${btn ? `<button class="btn ghost" data-act="${act}">${icon('plus', 18)} ${esc(btn)}</button>` : ''}</div>`;

// ---------- Chart.js (líně) ----------
let chartP = null;
export function loadChart() {
  if (window.Chart) return Promise.resolve(window.Chart);
  if (!chartP) chartP = new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = 'vendor/chart.umd.min.js';
    s.onload = () => {
      const C = window.Chart;
      C.defaults.color = '#8FA1AF';
      C.defaults.font.family = 'Saira, system-ui, sans-serif';
      C.defaults.font.size = 11;
      C.defaults.borderColor = 'rgba(143,161,175,.12)';
      C.defaults.plugins.legend.display = false;
      C.defaults.maintainAspectRatio = false;
      C.defaults.animation.duration = 400;
      try { C.defaults.scales.category.ticks.maxRotation = 0; C.defaults.scales.category.ticks.autoSkipPadding = 8; } catch (e) { /* starší verze */ }
      res(C);
    };
    s.onerror = () => { chartP = null; rej(new Error('Grafy se nenačetly (offline?)')); };
    document.head.appendChild(s);
  });
  return chartP;
}
const charts = new Map();
export async function chart(canvas, config) {
  if (!canvas) return;
  try {
    const C = await loadChart();
    if (charts.has(canvas.id)) charts.get(canvas.id).destroy();
    if (!document.body.contains(canvas)) return;
    charts.set(canvas.id, new C(canvas, config));
  } catch (e) {
    canvas.parentElement.innerHTML = `<p class="muted small">${esc(e.message)}</p>`;
  }
}
export const cssVar = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();

// ---------- stažení souboru ----------
export function download(name, content, type = 'application/octet-stream') {
  const blob = content instanceof Blob ? content : new Blob([content], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}

// ---------- záložky (tabs) uvnitř stránky ----------
export const segTabs = (tabs, active, act = 'tab') =>
  `<div class="seg" role="tablist">${tabs.map(([k, l]) => `<button role="tab" class="${k === active ? 'on' : ''}" aria-selected="${k === active}" data-act="${act}" data-v="${k}">${esc(l)}</button>`).join('')}</div>`;

export const progress = (v, max, color = '') =>
  `<div class="bar" ${color ? `style="--c:${color}"` : ''}><i style="width:${clamp(max ? v / max * 100 : 0, 0, 100)}%"></i></div>`;
