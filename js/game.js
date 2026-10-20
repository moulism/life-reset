// Herní systém: XP, levely, hodnosti, denní skóre, série (streak) a odemykání.
import { db, profile, setProfile } from './store.js';
import { today, addDays, weekday, sum, toast, icon, esc } from './ui.js';

// ---------- XP ----------
export function award(ref, amount, reason = '') {
  if (db.find('xp', x => x.ref === ref)) return 0;
  db.put('xp', { ref, amount, reason, date: today() });
  floatXP(amount);
  setTimeout(checkUnlocks, 50);
  return amount;
}
export function revoke(ref) {
  db.filter('xp', x => x.ref === ref).forEach(x => db.del(x.id));
}
export const hasXP = ref => !!db.find('xp', x => x.ref === ref);

function floatXP(n) {
  const el = document.createElement('div');
  el.className = 'xp-float';
  el.textContent = `+${n} XP`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1300);
}

export const levelStart = L => 50 * L * (L - 1); // L1 = 0, L2 = 100, L3 = 300 …
export function levelOf(xp) {
  let L = 1;
  while (levelStart(L + 1) <= xp) L++;
  return L;
}
export const RANKS = [
  [1, 'Rekrut'], [3, 'Učeň'], [5, 'Operativec'], [8, 'Strážce noci'], [12, 'Temný rytíř'],
  [16, 'Miliardář ve stínu'], [20, 'Iron Legend'], [26, 'Transporter'], [32, 'Mistr systému'],
];
export const rankOf = L => RANKS.filter(r => r[0] <= L).pop()[1];

// ---------- denní skóre ----------
// váhy: rutina 40, úkoly 20, deník 15, kalorie 15, tělo (trénink nebo voda) 10
export function buildIndex() {
  const idx = { rlog: {}, tasks: {}, journal: {}, kcal: {}, water: {}, gym: {} };
  db.all('routinelog').forEach(l => { idx.rlog[l.date] = l; });
  db.all('tasks').forEach(t => { if (t.due) (idx.tasks[t.due] = idx.tasks[t.due] || []).push(t); });
  db.all('journal').forEach(j => { if ((j.text && j.text.trim()) || j.mood) idx.journal[j.date] = true; });
  db.all('meals').forEach(m => { idx.kcal[m.date] = (idx.kcal[m.date] || 0) + (Number(m.kcal) || 0); });
  db.all('daylog').forEach(d => { idx.water[d.date] = d.water || 0; });
  db.all('workouts').forEach(w => { if (w.done) idx.gym[w.date] = true; });
  idx.routines = db.all('routine').filter(r => r.active !== false);
  return idx;
}
export function routinesFor(date, routines) {
  const wd = weekday(date);
  return routines.filter(r => !r.days || !r.days.length || r.days.includes(wd));
}
export function dayScore(date, idx = buildIndex(), p = profile() || {}) {
  const rs = routinesFor(date, idx.routines);
  const done = idx.rlog[date] ? idx.rlog[date].done || [] : [];
  const rDone = rs.filter(r => done.includes(r.id)).length;
  const rPart = rs.length ? rDone / rs.length : 0;
  const ts = idx.tasks[date] || [];
  const tPart = ts.length ? ts.filter(t => t.done).length / ts.length : 1;
  const jPart = idx.journal[date] ? 1 : 0;
  const kTarget = (p.targets && p.targets.kcal) || 3000;
  const kPart = Math.min(1, (idx.kcal[date] || 0) / (kTarget * 0.95));
  const wTarget = (p.targets && p.targets.water) || 3000;
  const bPart = idx.gym[date] ? 1 : Math.min(1, (idx.water[date] || 0) / wTarget);
  const score = Math.round(rPart * 40 + tPart * 20 + jPart * 15 + kPart * 15 + bPart * 10);
  return { score, parts: { routine: [rDone, rs.length], tasks: [ts.filter(t => t.done).length, ts.length], journal: jPart, kcal: idx.kcal[date] || 0, body: bPart } };
}
export const STREAK_MIN = 60;

export function stats() {
  const p = profile() || {};
  const xp = sum(db.all('xp'), x => x.amount);
  const level = levelOf(xp);
  const idx = buildIndex();
  const t = today();
  const start = p.createdAt ? p.createdAt.slice(0, 10) : t;
  const todayScore = dayScore(t, idx, p);
  let streak = 0;
  let d = todayScore.score >= STREAK_MIN ? t : addDays(t, -1);
  let guard = 0;
  while (d >= start && guard < 1000) {
    if (dayScore(d, idx, p).score >= STREAK_MIN) { streak++; d = addDays(d, -1); guard++; } else break;
  }
  const best = Math.max(p.bestStreak || 0, streak);
  if (best > (p.bestStreak || 0) && p.id) setProfile({ bestStreak: best });
  return {
    xp, level, rank: rankOf(level),
    next: levelStart(level + 1), cur: levelStart(level),
    streak, best, today: todayScore,
    journals: db.all('journal').filter(j => j.text || j.mood).length,
    workouts: db.all('workouts').filter(w => w.done).length,
    booksDone: db.all('books').filter(b => b.status === 'done').length,
    tasksDone: db.all('tasks').filter(t2 => t2.done).length,
    meals: db.all('meals').length,
    tx: db.all('tx').length,
  };
}

// ---------- odemykání ----------
export const UNLOCKS = [
  { id: 'theme-arc', kind: 'theme', name: 'Arc Reactor', desc: 'Výchozí vzhled', test: () => true },
  { id: 'theme-wayne', kind: 'theme', name: 'Wayne Gold', desc: 'Dosáhni levelu 3', test: s => s.level >= 3 },
  { id: 'theme-stark', kind: 'theme', name: 'Stark Red', desc: 'Série 7 dní', test: s => s.best >= 7 },
  { id: 'theme-steel', kind: 'theme', name: 'Statham Steel', desc: 'Dosáhni levelu 6', test: s => s.level >= 6 },
  { id: 'theme-gotham', kind: 'theme', name: 'Gotham Night', desc: 'Série 21 dní', test: s => s.best >= 21 },
  { id: 'b-day1', kind: 'badge', name: 'První den', desc: 'Den se skóre 60+', test: s => s.best >= 1 },
  { id: 'b-week', kind: 'badge', name: 'Týden v kuse', desc: 'Série 7 dní', test: s => s.best >= 7 },
  { id: 'b-month', kind: 'badge', name: 'Měsíc disciplíny', desc: 'Série 30 dní', test: s => s.best >= 30 },
  { id: 'b-90', kind: 'badge', name: 'Nový člověk', desc: 'Série 90 dní', test: s => s.best >= 90 },
  { id: 'b-journal', kind: 'badge', name: 'Kronikář', desc: '10 zápisů v deníku', test: s => s.journals >= 10 },
  { id: 'b-gym10', kind: 'badge', name: 'Železo', desc: '10 tréninků', test: s => s.workouts >= 10 },
  { id: 'b-gym50', kind: 'badge', name: 'Ocel', desc: '50 tréninků', test: s => s.workouts >= 50 },
  { id: 'b-book', kind: 'badge', name: 'První kniha', desc: 'Dočti knihu', test: s => s.booksDone >= 1 },
  { id: 'b-shelf', kind: 'badge', name: 'Celá police', desc: 'Dočti 7 knih', test: s => s.booksDone >= 7 },
  { id: 'b-tasks', kind: 'badge', name: 'Exekutor', desc: '50 hotových úkolů', test: s => s.tasksDone >= 50 },
  { id: 'b-meals', kind: 'badge', name: 'Krabičkář', desc: '100 zapsaných jídel', test: s => s.meals >= 100 },
  { id: 'b-l10', kind: 'badge', name: 'Level 10', desc: 'Dosáhni levelu 10', test: s => s.level >= 10 },
  { id: 'b-l20', kind: 'badge', name: 'Level 20', desc: 'Dosáhni levelu 20', test: s => s.level >= 20 },
];
export function unlocked(s = stats()) { return UNLOCKS.filter(u => u.test(s)).map(u => u.id); }

export function checkUnlocks() {
  const p = profile();
  if (!p) return;
  const s = stats();
  const now = unlocked(s);
  const seen = p.unlocked || [];
  const fresh = now.filter(id => !seen.includes(id));
  if (fresh.length) {
    setProfile({ unlocked: Array.from(new Set([...seen, ...now])) });
    fresh.forEach((id, i) => {
      const u = UNLOCKS.find(x => x.id === id);
      if (u.id === 'theme-arc') return;
      setTimeout(() => toast(`${icon(u.kind === 'theme' ? 'bolt' : 'star', 18)} <b>Odemčeno:</b> ${esc(u.name)}`, 'gold long'), 400 + i * 900);
    });
  }
  const prevL = p.lastLevel || 1;
  if (s.level > prevL) {
    setProfile({ lastLevel: s.level });
    setTimeout(() => toast(`${icon('bolt', 18)} <b>Level ${s.level}</b> · ${esc(s.rank)}`, 'gold long'), 200);
  }
}

export const THEMES = {
  'theme-arc': 'arc', 'theme-wayne': 'wayne', 'theme-stark': 'stark', 'theme-steel': 'steel', 'theme-gotham': 'gotham',
};
export function applyTheme(p = profile()) {
  document.documentElement.dataset.theme = (p && p.theme) || 'arc';
}
