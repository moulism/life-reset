// Synchronizace se Supabase (tabulka lr_items + bucket lr-files).
import { exportDirty, markClean, applyRemote, getMeta, setMeta, markAllDirty, onChange } from './store.js';

const CDN = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm';
let sb = null;
let timer = null;
let busy = false;
let again = false;
let useSynced = true;

export const sync = { status: 'off', user: null, error: '', last: null };

// knihovna je přibalená ve vendor/ (funguje offline), CDN jen jako záloha
function loadLib() {
  if (window.supabase && window.supabase.createClient) return Promise.resolve(window.supabase);
  return new Promise(res => {
    const s = document.createElement('script');
    s.src = 'vendor/supabase.js';
    s.onload = () => res(window.supabase);
    s.onerror = () => res(null);
    document.head.appendChild(s);
  }).then(m => m || import(CDN));
}

function setStatus(s, err = '') {
  sync.status = s;
  sync.error = err;
  window.dispatchEvent(new CustomEvent('lr:sync', { detail: s }));
}

export async function initSync() {
  const cfg = window.LR_CONFIG;
  if (!cfg || !cfg.supabaseUrl) return;
  try {
    const m = await loadLib();
    sb = m.createClient(cfg.supabaseUrl, cfg.supabaseKey, { auth: { persistSession: true, storageKey: 'lr-auth', detectSessionInUrl: true } });
  } catch (e) {
    setStatus('offline', 'Knihovna pro synchronizaci se nenačetla (jsi offline?).');
    return;
  }
  const { data } = await sb.auth.getSession();
  sync.user = data.session ? data.session.user : null;
  setStatus(sync.user ? 'idle' : 'off');
  sb.auth.onAuthStateChange((ev, session) => {
    const before = sync.user;
    sync.user = session ? session.user : null;
    if (!sync.user) { setStatus('off'); return; }
    if (!before || ev === 'SIGNED_IN') syncNow();
  });
  onChange(() => scheduleSync());
  if (sync.user) syncNow();
  document.addEventListener('visibilitychange', () => { if (!document.hidden) syncNow(); });
  window.addEventListener('online', () => syncNow());
  setInterval(() => syncNow(), 60000);
}

export function scheduleSync() {
  if (!sync.user) return;
  clearTimeout(timer);
  timer = setTimeout(syncNow, 1500);
}

export async function syncNow() {
  if (!sb || !sync.user) return 0;
  if (busy) { again = true; return 0; }
  busy = true;
  setStatus('syncing');
  const table = window.LR_CONFIG.table;
  let changed = 0;
  try {
    const dirty = exportDirty();
    for (let i = 0; i < dirty.length; i += 200) {
      const chunk = dirty.slice(i, i + 200);
      const { error } = await sb.from(table).upsert(chunk, { onConflict: 'id' });
      if (error) throw error;
      markClean(chunk);
    }
    // Stahuje se podle serverového času (synced_at), pokud ho tabulka má – nezávisí na hodinách zařízení.
    // Starší schéma bez synced_at: záloha přes updated_at s rezervou 5 minut.
    const key = useSynced ? 'synced_at' : 'updated_at';
    const since = getMeta(useSynced ? 'lastPullS' : 'lastPull') || '1970-01-01T00:00:00Z';
    const sinceAdj = new Date(Date.parse(since) - (useSynced ? 1000 : 5 * 60000)).toISOString();
    let from = 0;
    let max = Date.parse(since);
    for (;;) {
      const { data, error } = await sb.from(table)
        .select(`id,col,data,updated_at,deleted${useSynced ? ',synced_at' : ''}`)
        .gt(key, sinceAdj)
        .order(key, { ascending: true })
        .range(from, from + 999);
      if (error && useSynced && /synced_at/.test(error.message || '')) { useSynced = false; again = true; return 0; }
      if (error) throw error;
      changed += applyRemote(data);
      data.forEach(r => { const t = Date.parse(r[key]); if (t > max) max = t; });
      if (data.length < 1000) break;
      from += 1000;
    }
    setMeta(useSynced ? 'lastPullS' : 'lastPull', new Date(max).toISOString());
    sync.last = new Date();
    setStatus('ok');
    if (changed) window.dispatchEvent(new CustomEvent('lr:remote', { detail: changed }));
  } catch (e) {
    console.warn('sync', e);
    setStatus('error', e.message || String(e));
  } finally {
    busy = false;
    if (again) { again = false; scheduleSync(); }
  }
  return changed;
}

// ---- účet ----
function redirect() { return location.href.split('#')[0]; }
export async function signIn(email, password) {
  if (!sb) throw new Error('Synchronizace není dostupná – zkontroluj internet.');
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw error;
  setMeta('lastPull', null); setMeta('lastPullS', null);
  markAllDirty();
  return syncNow();
}
export async function signUp(email, password) {
  if (!sb) throw new Error('Synchronizace není dostupná – zkontroluj internet.');
  const { data, error } = await sb.auth.signUp({ email, password, options: { emailRedirectTo: redirect() } });
  if (error) throw error;
  if (data.session) { markAllDirty(); await syncNow(); return 'in'; }
  return 'confirm';
}
export async function magicLink(email) {
  if (!sb) throw new Error('Synchronizace není dostupná – zkontroluj internet.');
  const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: redirect() } });
  if (error) throw error;
}
export async function signOut() {
  if (!sb) return;
  await sb.auth.signOut();
  setMeta('lastPull', null); setMeta('lastPullS', null);
  setStatus('off');
}

// ---- soubory ----
export function canUpload() { return !!(sb && sync.user); }
export async function uploadFile(file) {
  const safe = file.name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w.\-]+/g, '_');
  const path = `${sync.user.id}/${Date.now()}-${safe}`;
  const { error } = await sb.storage.from(window.LR_CONFIG.bucket).upload(path, file, { contentType: file.type || 'application/octet-stream' });
  if (error) throw error;
  return path;
}
export async function fileUrl(path) {
  const { data, error } = await sb.storage.from(window.LR_CONFIG.bucket).createSignedUrl(path, 3600);
  if (error) throw error;
  return data.signedUrl;
}
export async function removeFile(path) {
  if (!sb || !sync.user) return;
  await sb.storage.from(window.LR_CONFIG.bucket).remove([path]);
}
