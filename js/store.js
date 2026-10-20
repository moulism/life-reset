// Local-first úložiště. Všechno je v jedné mapě položek {id, col, data, updated_at, deleted, dirty}.
// Synchronizace (sync.js) posílá "dirty" položky do Supabase a stahuje novější.

const KEY = 'lr:v1';
let S = read();
const cache = new Map();
let listeners = [];

function read() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    if (s && s.items) return { items: s.items, meta: s.meta || {} };
  } catch (e) { /* prázdné úložiště */ }
  return { items: {}, meta: {} };
}

let saveT = null;
function save() {
  cache.clear();
  clearTimeout(saveT);
  saveT = setTimeout(flush, 120);
  listeners.forEach(f => { try { f(); } catch (e) { console.error(e); } });
}
export function flush() {
  clearTimeout(saveT);
  try { localStorage.setItem(KEY, JSON.stringify(S)); }
  catch (e) { console.error(e); window.dispatchEvent(new CustomEvent('lr:quota')); }
}
window.addEventListener('pagehide', flush);
document.addEventListener('visibilitychange', () => { if (document.hidden) flush(); });

export function onChange(f) { listeners.push(f); }

export function uuid() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

const now = () => new Date().toISOString();

export const db = {
  all(col) {
    if (cache.has(col)) return cache.get(col);
    const out = [];
    for (const id in S.items) {
      const i = S.items[id];
      if (i.col === col && !i.deleted) out.push({ id, ...i.data });
    }
    cache.set(col, out);
    return out;
  },
  get(id) {
    const i = S.items[id];
    return i && !i.deleted ? { id, ...i.data } : null;
  },
  find(col, fn) { return this.all(col).find(fn) || null; },
  filter(col, fn) { return this.all(col).filter(fn); },
  one(col) { return this.all(col)[0] || null; },
  put(col, obj) {
    const { id: oid, ...data } = obj;
    const id = oid || uuid();
    S.items[id] = { id, col, data: JSON.parse(JSON.stringify(data)), updated_at: now(), deleted: false, dirty: true };
    save();
    return id;
  },
  patch(id, partial) {
    const i = S.items[id];
    if (!i || i.deleted) return null;
    return this.put(i.col, { id, ...i.data, ...partial });
  },
  del(id) {
    const i = S.items[id];
    if (!i) return;
    S.items[id] = { id, col: i.col, data: {}, updated_at: now(), deleted: true, dirty: true };
    save();
  },
  count() { return Object.values(S.items).filter(i => !i.deleted).length; }
};

// ---- meta (lokální, nesynchronizuje se) ----
export function getMeta(k) { return S.meta[k]; }
export function setMeta(k, v) { S.meta[k] = v; flush(); }

// ---- sync helpers ----
export function exportDirty() {
  return Object.values(S.items).filter(i => i.dirty)
    .map(i => ({ id: i.id, col: i.col, data: i.data, updated_at: i.updated_at, deleted: i.deleted }));
}
export function markClean(rows) {
  rows.forEach(r => {
    const i = S.items[r.id];
    if (i && i.updated_at === r.updated_at) i.dirty = false;
  });
  flush();
}
export function applyRemote(rows) {
  let n = 0;
  rows.forEach(r => {
    const l = S.items[r.id];
    const rt = Date.parse(r.updated_at);
    if (l) {
      const lt = Date.parse(l.updated_at);
      if (rt === lt) { l.dirty = false; return; }
      if (l.dirty && lt > rt) return;
      if (!l.dirty && lt > rt) return;
    }
    S.items[r.id] = { id: r.id, col: r.col, data: r.data || {}, updated_at: new Date(rt).toISOString(), deleted: !!r.deleted, dirty: false };
    n++;
  });
  if (n) save(); else flush();
  return n;
}
export function markAllDirty() {
  Object.values(S.items).forEach(i => { i.dirty = true; });
  flush();
}

// ---- záloha ----
export function exportAll() {
  return { app: 'life-reset', version: 1, exported: now(), items: Object.values(S.items).filter(i => !i.deleted).map(({ dirty, ...r }) => r) };
}
export function importAll(json) {
  if (!json || !Array.isArray(json.items)) throw new Error('Soubor neobsahuje zálohu Life Reset.');
  json.items.forEach(r => {
    S.items[r.id] = { id: r.id, col: r.col, data: r.data || {}, updated_at: now(), deleted: false, dirty: true };
  });
  save();
  return json.items.length;
}
export function wipe() {
  S = { items: {}, meta: {} };
  cache.clear();
  flush();
}

// ---- profil (singleton) ----
export function profile() { return db.one('profile'); }
export function setProfile(partial) {
  const p = profile();
  if (p) db.patch(p.id, partial); else db.put('profile', partial);
  return profile();
}
