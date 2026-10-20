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

let initP = null;
export function initSync() { if (!initP) initP = initSyncInner(); return initP; }
async function initSyncInner() {
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
// Přihlášení heslem nebo 6místným kódem z e-mailu. Kód funguje i v aplikaci na ploše iPhonu
// (odkaz z e-mailu by se otevřel v Safari, které má oddělené úložiště).
function redirect() { return location.href.split('#')[0]; }
const normEmail = e => String(e || '').trim().toLowerCase();
async function client() {
  if (!sb && initP) { try { await initP; } catch (e) { /* níže */ } }
  if (!sb) { initP = null; try { await initSync(); } catch (e) { /* níže */ } } // druhý pokus
  if (!sb) throw new Error('Synchronizace se nenačetla – zkontroluj internet a zkus to znovu.');
  return sb;
}
export function czErr(e) {
  const m = (e && (e.message || e.error_description)) || String(e || '');
  if (/invalid login credentials/i.test(m)) return 'Špatný e-mail nebo heslo. Zkus přihlášení kódem z e-mailu.';
  if (/email not confirmed/i.test(m)) return 'E-mail ještě není potvrzený – přihlas se kódem z e-mailu.';
  if (/already registered|already been registered/i.test(m)) return 'Tenhle e-mail už účet má – přihlas se heslem nebo kódem.';
  if (/token has expired|invalid.*(otp|token)|otp.*(expired|invalid)/i.test(m)) return 'Kód je špatný nebo vypršel. Pošli si nový.';
  if (/rate limit|too many|security purposes/i.test(m)) return 'Moc pokusů za sebou – počkej minutu a zkus znovu.';
  if (/password.*(at least|short|weak)/i.test(m)) return 'Heslo je moc krátké (aspoň 6 znaků).';
  if (/failed to fetch|network/i.test(m)) return 'Nejde se spojit se serverem – jsi online?';
  return m;
}
async function afterLogin() {
  setMeta('lastPull', null); setMeta('lastPullS', null);
  markAllDirty();
  return syncNow();
}
export async function signIn(email, password) {
  const c = await client();
  const { error } = await c.auth.signInWithPassword({ email: normEmail(email), password });
  if (error) throw new Error(czErr(error));
  return afterLogin();
}
export async function signUp(email, password) {
  const c = await client();
  const { data, error } = await c.auth.signUp({ email: normEmail(email), password, options: { emailRedirectTo: redirect() } });
  if (error) throw new Error(czErr(error));
  if (data.session) { await afterLogin(); return 'in'; }
  return 'confirm';
}
export async function sendCode(email) {
  const c = await client();
  const { error } = await c.auth.signInWithOtp({ email: normEmail(email), options: { shouldCreateUser: true, emailRedirectTo: redirect() } });
  if (error) throw new Error(czErr(error));
}
export async function verifyCode(email, code) {
  const c = await client();
  let raw = String(code || '').trim();
  for (let i = 0; i < 3 && /%3F|%26|%3D/i.test(raw); i++) { try { raw = decodeURIComponent(raw); } catch (e) { break; } } // odkaz zabalený Gmailem/Outlookem
  let res;
  // vložený odkaz z e-mailu (…/auth/v1/verify?token=…&type=magiclink) → přihlášení přímo tady
  const m = raw.match(/[?&]token=([^&#\s]+)/);
  if (m) {
    const tm = raw.match(/[?&]type=([a-z_]+)/);
    const token_hash = decodeURIComponent(m[1]);
    const types = [tm ? tm[1] : 'magiclink', 'magiclink', 'email', 'signup', 'recovery'];
    for (const type of [...new Set(types)]) {
      res = await c.auth.verifyOtp({ token_hash, type });
      if (!res.error) break;
    }
  } else {
    const token = raw.replace(/\D/g, '');
    res = await c.auth.verifyOtp({ email: normEmail(email), token, type: 'email' });
    if (res.error) res = await c.auth.verifyOtp({ email: normEmail(email), token, type: 'signup' });
  }
  if (res.error) throw new Error(czErr(res.error));
  return afterLogin();
}
export const magicLink = sendCode;
export async function setPassword(password) {
  const c = await client();
  const { error } = await c.auth.updateUser({ password });
  if (error) throw new Error(czErr(error));
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
