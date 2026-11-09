// Připomínky: spočítá, co a kdy připomenout (události, bloky rozvrhu, večerní zápis, nedělní příprava, platby),
// a pošle je do fronty na serveru, odkud přijdou jako upozornění i při zamčeném telefonu (Web Push).
import { db, profile, getMeta, setMeta, onChange, currentUid } from './store.js';
import { today, addDays, parse, weekday } from './ui.js';
import { has } from './mods.js';
import { blocksOn, area as wArea } from './week-core.js';
import { eventsOn } from './common.js';
import { upcoming } from './money-core.js';
import { sync, supa } from './sync.js';

export const notifPrefs = () => ({ checkin: '21:30', review: true, pay: true, habits: '', ...((profile() || {}).notif || {}) });
const at = (d, hm) => { const [h, m] = hm.split(':').map(Number); const x = parse(d); x.setHours(h, m || 0, 0, 0); return x; };

// všechny připomínky v okně [teď, teď + hodiny]
export function upcomingReminders(hours = 48) {
  const now = Date.now(), end = now + hours * 3600e3;
  const P = notifPrefs();
  const out = [];
  const push = (key, when, title, body, url = './#/home') => { const t = when.getTime(); if (t >= now - 60e3 && t <= end) out.push({ key, at: when, title, body, url }); };
  for (let i = 0; i <= Math.ceil(hours / 24); i++) {
    const d = addDays(today(), i);
    if (has('calendar')) eventsOn(d).forEach(e => {
      if (e.remind == null || Number(e.remind) < 0) return;
      const t = at(d, e.allDay || !e.start ? '09:00' : e.start);
      push(`ev:${e.id}:${d}`, new Date(t.getTime() - Number(e.remind) * 60e3), e.title, `${e.allDay || !e.start ? 'Celý den' : e.start}${e.place ? ' · ' + e.place : ''}`, `./#/calendar/${d}`);
    });
    if (has('week')) blocksOn(d).forEach(b => {
      if (!b.start || b.remind == null || Number(b.remind) < 0) return;
      const t = at(d, b.start);
      const n = b.title || wArea(b.area).name;
      push(`bl:${b.id}:${d}`, new Date(t.getTime() - Number(b.remind) * 60e3), n, `${Number(b.remind) ? `Za ${b.remind} min` : 'Teď'} · ${b.start}–${b.end || ''}${b.place ? ' · ' + b.place : ''}`, './#/home');
    });
    if (P.habits && has('habits')) push(`hb:${d}`, at(d, P.habits), 'Ranní návyky', 'Odškrtni, co máš hotové.', './#/home');
    if (P.checkin && has('diary')) push(`ci:${d}`, at(d, P.checkin), 'Večerní zápis', 'Jak šel den? 30 sekund a máš to.', './#/home');
    if (P.review && has('week') && weekday(d) === 0) push(`rv:${d}`, at(d, '18:00'), 'Příprava týdne', '15 minut: jak dopadl týden a co příště.', './#/week/review');
  }
  if (P.pay && has('finance')) upcoming(addDays(today(), 2)).forEach(r => push(`py:${r.id}:${r.due}`, at(addDays(r.due, -1), '18:00'), `Zítra: ${r.name}`, `${Math.round(r.amount)} Kč`, './#/finance'));
  return out.sort((a, b) => a.at - b.at);
}

// ---------- Web Push ----------
const b64 = s => { const p = '='.repeat((4 - s.length % 4) % 4); const r = atob((s + p).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from(r, c => c.charCodeAt(0)); };
export const pushSupported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
export const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
export const pushOn = () => !!getMeta('pushOn') && 'Notification' in window && Notification.permission === 'granted';

export async function enablePush() {
  if (!pushSupported()) throw new Error(isStandalone() ? 'Tenhle prohlížeč upozornění nepodporuje.' : 'Na iPhonu fungují upozornění jen v appce přidané na plochu (Sdílet → Přidat na plochu).');
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') throw new Error('Upozornění nejsou povolená. Povol je v Nastavení iPhonu → Oznámení → Life Reset.');
  const key = (window.LR_CONFIG || {}).vapidPublic;
  if (!key) throw new Error('Chybí klíč pro upozornění.');
  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(key) });
  const j = sub.toJSON();
  const c = await supa();
  if (!c || !sync.user) throw new Error('Pro upozornění musíš být online a přihlášený.');
  const { error } = await c.from('lr_push_subs').upsert({ endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth, user_id: sync.user.id });
  if (error) throw new Error(error.message);
  setMeta('pushOn', true);
  await syncPushQueue(true);
}
export async function disablePush() {
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    const c = await supa();
    if (sub) { if (c) await c.from('lr_push_subs').delete().eq('endpoint', sub.endpoint); await sub.unsubscribe(); }
    if (c && sync.user) await c.from('lr_push_queue').delete().eq('user_id', sync.user.id).eq('sent', false);
  } catch (e) { console.warn(e); }
  setMeta('pushOn', false);
}

let lastSig = '';
let busy = false;
export async function syncPushQueue(force = false) {
  if (!pushOn() || busy || !navigator.onLine) return;
  const c = await supa();
  if (!c || !sync.user) return;
  const uid = sync.user.id;
  const list = upcomingReminders(48).filter(r => r.at.getTime() > Date.now());
  const rows = list.map(r => ({ id: `${uid}:${r.key}`, user_id: uid, at: r.at.toISOString(), title: r.title.slice(0, 120), body: r.body.slice(0, 200), url: r.url, sent: false }));
  const sig = JSON.stringify(rows.map(r => [r.id, r.at, r.title, r.body]));
  if (!force && sig === lastSig) return;
  busy = true;
  try {
    // ponechá už odeslané, budoucí neodeslané nahradí aktuálním stavem
    const { error: e1 } = await c.from('lr_push_queue').delete().eq('user_id', uid).eq('sent', false).gt('at', new Date().toISOString());
    if (e1) throw e1;
    if (rows.length) {
      const { data: sentRows } = await c.from('lr_push_queue').select('id').eq('user_id', uid).eq('sent', true).in('id', rows.map(r => r.id));
      const done = new Set((sentRows || []).map(r => r.id));
      const fresh = rows.filter(r => !done.has(r.id));
      if (fresh.length) { const { error: e2 } = await c.from('lr_push_queue').upsert(fresh); if (e2) throw e2; }
    }
    lastSig = sig;
  } catch (e) { console.warn('push queue', e); }
  finally { busy = false; }
}
let t = null;
onChange(() => { clearTimeout(t); t = setTimeout(() => syncPushQueue(), 4000); });
setInterval(() => syncPushQueue(), 30 * 60e3);
void currentUid;
