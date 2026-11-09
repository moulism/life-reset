// Týden & hodiny – data a výpočty (bloky v týdenní šabloně, místa, plán vs. skutečnost, stopky).
// Kolekce: areas, blocks, blockday, timelog, weekplan, timer.
import { db, profile } from './store.js';
import { today, addDays, weekday, mondayOf, sum } from './ui.js';

export const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

export const areas = () => db.all('areas').slice().sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
export const area = id => db.get(id) || { id: '', name: 'Bez oblasti', color: '#5C6E7C', budget: 0 };

const toMin = t => { if (!t) return null; const [h, m] = t.split(':').map(Number); return h * 60 + (m || 0); };
export const fromMin = m => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
export function blockMins(b) {
  const s = toMin(b.start), e = toMin(b.end);
  if (s != null && e != null) return e > s ? e - s : e + 1440 - s;
  return Number(b.mins) || 60;
}
export const hrs = m => {
  const h = Math.round((m || 0) / 6) / 10;
  return String(h).replace('.', ',') + ' h';
};

// ---------- místa (např. Praha / Plzeň) ----------
export const places = () => (profile() && profile().places) || [];
export function weekPlan(date) {
  const w = mondayOf(date);
  return db.find('weekplan', x => x.week === w);
}
export function placeOn(date) {
  if (!places().length) return '';
  const wp = weekPlan(date);
  const wd = String(weekday(date));
  if (wp && wp.places && wp.places[wd] != null) return wp.places[wd];
  const def = (profile() && profile().placeDefault) || {};
  return def[wd] || '';
}
export function setPlace(date, place) {
  const w = mondayOf(date);
  const wp = weekPlan(date) || { week: w, places: {} };
  db.put('weekplan', { ...wp, places: { ...(wp.places || {}), [String(weekday(date))]: place } });
}

// ---------- bloky ----------
export function blocksOn(date) {
  const wd = weekday(date);
  const pl = placeOn(date);
  const moved = db.filter('blockday', x => x.moveTo === date);
  const list = db.all('blocks').filter(b => b.active !== false && (b.days || []).includes(wd) && (!b.place || !pl || b.place === pl)
    && (!b.from || b.from <= date) && (!b.until || b.until >= date));
  const out = list.filter(b => { const s = dayStatus(date, b.id); return !(s && s.moveTo); });
  moved.forEach(m => { const b = db.get(m.block); if (b && !out.some(x => x.id === b.id)) out.push({ ...b, movedFrom: m.date }); });
  return out.sort((a, b) => (a.start || '99:99').localeCompare(b.start || '99:99') || (a.order ?? 0) - (b.order ?? 0));
}
export const dayStatus = (date, blockId) => db.find('blockday', x => x.date === date && x.block === blockId);
// stav bloku v daný den – u přesunutého bloku se hledá i podle původního dne
export function statusFor(date, b) {
  return dayStatus(date, b.id) || (b.movedFrom ? db.find('blockday', x => x.date === b.movedFrom && x.block === b.id && x.moveTo === date && x.status) : null);
}
export function setBlock(date, b, status, mins) {
  const cur = dayStatus(date, b.id);
  if (!status) { if (cur) db.del(cur.id); return; }
  db.put('blockday', { ...(cur || {}), date, block: b.id, area: b.area, status, mins: status === 'done' ? (mins ?? blockMins(b)) : 0 });
}
export function moveBlock(date, b, toDate) {
  const cur = dayStatus(date, b.id);
  db.put('blockday', { ...(cur || {}), date, block: b.id, area: b.area, status: '', mins: 0, moveTo: toDate });
}

// ---------- týden: plán vs. skutečnost ----------
export function weekDays(date = today()) {
  const m = mondayOf(date);
  return Array.from({ length: 7 }, (_, i) => addDays(m, i));
}
export function doneMins(dates, areaId) {
  const set = new Set(dates);
  const b = sum(db.filter('blockday', x => set.has(x.date) && x.status === 'done' && (!areaId || x.area === areaId)), x => x.mins);
  const moved = sum(db.filter('blockday', x => x.moveTo && set.has(x.moveTo) && x.status === 'done' && (!areaId || x.area === areaId) && !set.has(x.date)), x => x.mins);
  const t = sum(db.filter('timelog', x => set.has(x.date) && (!areaId || x.area === areaId)), x => x.mins);
  return b + moved + t;
}
export function plannedMins(dates, areaId) {
  return sum(dates.flatMap(d => blocksOn(d).filter(b => !areaId || b.area === areaId)), blockMins);
}
export function weekStats(date = today()) {
  const days = weekDays(date);
  return areas().map(a => {
    const planned = plannedMins(days, a.id);
    const target = a.budget ? a.budget * 60 : planned;
    return { ...a, target, planned, done: doneMins(days, a.id) };
  });
}

// ---------- stopky ----------
export const timer = () => db.one('timer');
export function startTimer(areaId, note = '') {
  const t = timer();
  if (t && t.area) stopTimer();
  db.put('timer', { ...(timer() || {}), area: areaId, note, started: new Date().toISOString() });
}
export function stopTimer() {
  const t = timer();
  if (!t || !t.area) return 0;
  const mins = Math.max(1, Math.round((Date.now() - Date.parse(t.started)) / 60000));
  db.put('timelog', { date: today(), area: t.area, mins, note: t.note || '', start: t.started });
  db.put('timer', { ...t, area: '', started: '' });
  return mins;
}
export function logTime(areaId, mins, date = today(), note = '') {
  if (!(mins > 0)) return;
  db.put('timelog', { date, area: areaId, mins, note });
}

// ---------- „teď / další“ ----------
export function nowNext(date = today()) {
  const nowM = new Date().getHours() * 60 + new Date().getMinutes();
  const list = blocksOn(date).filter(b => b.start);
  let now = null, next = null;
  list.forEach(b => {
    const s = toMin(b.start), e = s + blockMins(b);
    if (s <= nowM && nowM < e && !now) now = b;
    if (s > nowM && !next) next = b;
  });
  return { now, next, minsTo: next ? toMin(next.start) - nowM : 0 };
}
