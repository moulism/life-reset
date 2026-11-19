// Herní systém: XP, levely, hodnosti, denní skóre, série (streak) a odemykání.
import { db, profile, setProfile } from './store.js';
import { today, addDays, weekday, sum, toast, icon, esc, dayMins, DAY_START_H } from './ui.js';
import { has } from './mods.js';
import { CLEAN_ACCENTS } from './data/defaults.js';

// ---------- XP ----------
export function award(ref, amount, reason = '') {
  if (!(amount > 0)) return 0;
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
  [40, 'Architekt'], [50, 'Legenda'], [62, 'Titán'], [75, 'Nesmrtelný'], [90, 'Mýtus'], [100, 'Bůh disciplíny'],
];
export const rankOf = L => RANKS.filter(r => r[0] <= L).pop()[1];

// ---------- denní skóre ----------
// Skóre 0–100 z modulů, které má uživatel zapnuté: bloky týdne, návyky, úkoly, deník, jídlo, tělo.
// Dnešek se hodnotí „zatím“: blok se počítá až po svém konci (nebo když je hotový), odpolední návyky
// od 12:00, večerní a deník od 20:00. Minulé dny se hodnotí celé.
export function buildIndex() {
  const idx = { rlog: {}, tasks: {}, journal: {}, kcal: {}, mealDays: new Set(), water: {}, gym: {}, bday: {}, away: {}, shield: new Set(), blocks: [] };
  db.all('routinelog').forEach(l => { idx.rlog[l.date] = l; });
  db.all('tasks').forEach(t => { if (t.due) (idx.tasks[t.due] = idx.tasks[t.due] || []).push(t); });
  db.all('journal').forEach(j => { if ((j.text && j.text.trim()) || j.mood) idx.journal[j.date] = true; });
  db.all('meals').forEach(m => { idx.kcal[m.date] = (idx.kcal[m.date] || 0) + (Number(m.kcal) || 0); idx.mealDays.add(m.date); });
  db.all('daylog').forEach(d => { idx.water[d.date] = d.water || 0; });
  db.all('workouts').forEach(w => { if (w.done) idx.gym[w.date] = true; });
  db.all('blockday').forEach(b => {
    if (b.status === 'done') (idx.bday[b.moveTo || b.date] = idx.bday[b.moveTo || b.date] || new Set()).add(b.block);
    if (b.moveTo) (idx.away[b.date] = idx.away[b.date] || new Set()).add(b.block);
  });
  db.all('shield').forEach(s => idx.shield.add(s.date));
  idx.routines = db.all('routine').filter(r => r.active !== false);
  idx.blocks = db.all('blocks').filter(b => b.active !== false);
  return idx;
}
export function routinesFor(date, routines) {
  const wd = weekday(date);
  return routines.filter(r => !r.days || !r.days.length || r.days.includes(wd));
}
const toM = s => { if (!s) return null; const [h, m] = String(s).split(':').map(Number); return h * 60 + (m || 0); };
const SLOT_AT = { morning: 0, day: 12 * 60, evening: 20 * 60 };
const EVENING = 20 * 60;
// jídlo se do skóre počítá, jen když ho člověk opravdu zapisuje (aspoň jednou za posledních 7 dní)
const eatsLogged = (idx, date) => { for (let i = 0; i < 7; i++) if (idx.mealDays.has(addDays(date, -i))) return true; return false; };

// opts.final = hodnotit dnešek jako celý den (pro bonusy)
export function dayScore(date, idx = buildIndex(), p = profile() || {}, opts = {}) {
  const parts = {};
  const W = [];
  const add = (k, w, v) => { W.push([w, v]); parts[k] = v; };
  const live = !opts.final && date === today();
  const nm = live ? dayMins() : 1e9;
  // bloky týdne
  const wd = weekday(date);
  const away = idx.away[date] || new Set();
  const bl = idx.blocks.filter(b => (b.days || []).includes(wd) && (!b.from || b.from <= date) && (!b.until || b.until >= date) && !away.has(b.id));
  const doneSet = idx.bday[date] || new Set();
  const extra = [...doneSet].filter(id => !bl.some(b => b.id === id)).length; // přesunuté sem a hotové
  const bDue = bl.filter(b => doneSet.has(b.id) || !live || (toM(b.end) != null && toM(b.end) <= nm));
  const bDone = bl.filter(b => doneSet.has(b.id)).length + extra;
  if (has('week', p) && bDue.length + extra) add('blocks', 35, Math.min(1, bDone / (bDue.length + extra)));
  // návyky
  const rs = routinesFor(date, idx.routines);
  const done = idx.rlog[date] ? idx.rlog[date].done || [] : [];
  const rDone = rs.filter(r => done.includes(r.id)).length;
  const rDue = rs.filter(r => done.includes(r.id) || nm >= (SLOT_AT[r.slot || 'morning'] ?? 0));
  if (has('habits', p) && rDue.length) add('routine', 30, rDue.filter(r => done.includes(r.id)).length / rDue.length);
  // úkoly s termínem na tento den
  const ts = idx.tasks[date] || [];
  if (has('tasks', p) && ts.length) add('tasks', 15, ts.filter(t => t.done).length / ts.length);
  // deník – dnes až od 20:00 (nebo když už je zapsaný)
  if (has('diary', p) && (idx.journal[date] || nm >= EVENING)) add('journal', 10, idx.journal[date] ? 1 : 0);
  // kalorie – jen když jídlo zapisuješ
  const kTarget = (p.targets && p.targets.kcal) || 2500;
  if (has('food', p) && eatsLogged(idx, date) && (idx.kcal[date] || nm >= EVENING)) add('kcal', 10, Math.min(1, (idx.kcal[date] || 0) / (kTarget * 0.95)));
  // trénink = bonus, nikdy nestrhává
  if (has('gym', p) && idx.gym[date]) add('body', 10, 1);
  const wsum = sum(W, x => x[0]);
  const score = wsum ? Math.round(sum(W, x => x[0] * x[1]) / wsum * 100) : 0;
  return {
    score,
    parts: {
      blocks: [bDone, bl.length + extra], routine: [rDone, rs.length],
      tasks: [ts.filter(t => t.done).length, ts.length], journal: idx.journal[date] ? 1 : 0,
      kcal: idx.kcal[date] || 0, body: idx.gym[date] ? 1 : 0,
    },
  };
}
export const STREAK_MIN = 50;
export const SHIELD_MAX = 3;

// XP získané v tomto týdnu (Po–Ne) – podle toho se soutěží s přáteli
export function weekXP(date = today()) {
  const wd = weekday(date);
  const mon = addDays(date, -((wd + 6) % 7));
  return sum(db.all('xp').filter(x => x.date >= mon && x.date <= addDays(mon, 6)), x => x.amount);
}
export function weekAvgScore(date = today()) {
  const idx = buildIndex();
  const p = profile() || {};
  const wd = weekday(date);
  const mon = addDays(date, -((wd + 6) % 7));
  const days = [];
  for (let d = mon; d <= date; d = addDays(d, 1)) days.push(d);
  return Math.round(sum(days, d => dayScore(d, idx, p).score) / days.length);
}

// série: dny se skóre 50+ za sebou; den chráněný štítem sérii nepřeruší (ale ani nepřidá)
function streakAt(t, idx, p, todayScore) {
  const start = p.createdAt ? p.createdAt.slice(0, 10) : t;
  let streak = 0;
  let d = todayScore >= STREAK_MIN ? t : addDays(t, -1);
  let guard = 0;
  while (d >= start && guard < 2000) {
    guard++;
    if (idx.shield.has(d)) { d = addDays(d, -1); continue; }
    if (dayScore(d, idx, p).score >= STREAK_MIN) { streak++; d = addDays(d, -1); } else break;
  }
  return streak;
}

export function stats() {
  const p = profile() || {};
  const xp = sum(db.all('xp'), x => x.amount);
  const level = levelOf(xp);
  const idx = buildIndex();
  const t = today();
  const todayScore = dayScore(t, idx, p);
  const streak = streakAt(t, idx, p, todayScore.score);
  const best = Math.max(p.bestStreak || 0, streak);
  if (best > (p.bestStreak || 0) && p.id) setProfile({ bestStreak: best });
  return {
    xp, level, rank: rankOf(level), title: titleOf(p),
    next: levelStart(level + 1), cur: levelStart(level),
    streak, best, today: todayScore, shields: p.shields ?? 1,
    journals: db.all('journal').filter(j => j.text || j.mood).length,
    workouts: db.all('workouts').filter(w => w.done).length,
    booksDone: db.all('books').filter(b => b.status === 'done').length,
    tasksDone: db.all('tasks').filter(t2 => t2.done).length,
    meals: db.all('meals').length,
    tx: db.all('tx').length,
    hours: Math.round((sum(db.all('blockday').filter(b => b.status === 'done'), b => b.mins) + sum(db.all('timelog'), t => t.mins)) / 60),
    early: db.filter('xp', x => (x.ref || '').startsWith('early:')).length,
    perfect: db.filter('xp', x => (x.ref || '').startsWith('score100:')).length,
    great: db.filter('xp', x => (x.ref || '').startsWith('score80:')).length,
    habits: db.filter('xp', x => (x.ref || '').startsWith('rt:')).length,
    fullRoutine: db.filter('xp', x => (x.ref || '').startsWith('rtall:')).length,
    friends: p.friendsCount || 0,
    wins: p.weekWins || 0,
    weekXP: weekXP(),
  };
}

// ---------- odemykání ----------
// kind: theme (barvy JARVIS), accent (barvy čistého stylu), title (titul u jména), badge (odznak)
export const UNLOCKS = [
  { id: 'theme-arc', kind: 'theme', name: 'Arc Reactor', desc: 'Výchozí vzhled', test: () => true },
  { id: 'theme-wayne', kind: 'theme', name: 'Wayne Gold', desc: 'Dosáhni levelu 3', test: s => s.level >= 3 },
  { id: 'theme-stark', kind: 'theme', name: 'Stark Red', desc: 'Série 7 dní', test: s => s.best >= 7 },
  { id: 'theme-steel', kind: 'theme', name: 'Statham Steel', desc: 'Dosáhni levelu 6', test: s => s.level >= 6 },
  { id: 'theme-emerald', kind: 'theme', name: 'Lazarus Green', desc: 'Dosáhni levelu 10', test: s => s.level >= 10 },
  { id: 'theme-gotham', kind: 'theme', name: 'Gotham Night', desc: 'Série 21 dní', test: s => s.best >= 21 },
  { id: 'theme-carbon', kind: 'theme', name: 'Carbon', desc: 'Dosáhni levelu 15', test: s => s.level >= 15 },
  { id: 'theme-solar', kind: 'theme', name: 'Solar Flare', desc: 'Dosáhni levelu 25', test: s => s.level >= 25 },

  { id: 'acc-blue', kind: 'accent', name: 'Modrá', desc: 'Výchozí', test: () => true },
  { id: 'acc-green', kind: 'accent', name: 'Zelená', desc: 'Výchozí', test: () => true },
  { id: 'acc-graphite', kind: 'accent', name: 'Grafit', desc: 'Výchozí', test: () => true },
  { id: 'acc-violet', kind: 'accent', name: 'Fialová', desc: 'Dosáhni levelu 2', test: s => s.level >= 2 },
  { id: 'acc-orange', kind: 'accent', name: 'Oranžová', desc: 'Dosáhni levelu 3', test: s => s.level >= 3 },
  { id: 'acc-teal', kind: 'accent', name: 'Tyrkysová', desc: 'Dosáhni levelu 5', test: s => s.level >= 5 },
  { id: 'acc-red', kind: 'accent', name: 'Červená', desc: 'Série 7 dní', test: s => s.best >= 7 },
  { id: 'acc-pink', kind: 'accent', name: 'Růžová', desc: 'Dosáhni levelu 7', test: s => s.level >= 7 },
  { id: 'acc-gold', kind: 'accent', name: 'Zlatá', desc: 'Dosáhni levelu 10', test: s => s.level >= 10 },
  { id: 'acc-ice', kind: 'accent', name: 'Ledová', desc: 'Série 14 dní', test: s => s.best >= 14 },
  { id: 'acc-emerald', kind: 'accent', name: 'Smaragdová', desc: 'Dosáhni levelu 20', test: s => s.level >= 20 },

  { id: 't-rookie', kind: 'title', name: 'Nováček', desc: 'Od začátku', test: () => true },
  { id: 't-early', kind: 'title', name: 'Ranní ptáče', desc: '10× otevřeno před 8:00', test: s => s.early >= 10 },
  { id: 't-routine', kind: 'title', name: 'Muž rutiny', desc: '10× celá rutina za den', test: s => s.fullRoutine >= 10 },
  { id: 't-habits', kind: 'title', name: 'Stroj na návyky', desc: '200 odškrtnutých návyků', test: s => s.habits >= 200 },
  { id: 't-iron', kind: 'title', name: 'Železný', desc: '10 tréninků', test: s => s.workouts >= 10 },
  { id: 't-chron', kind: 'title', name: 'Kronikář', desc: '10 zápisů v deníku', test: s => s.journals >= 10 },
  { id: 't-reader', kind: 'title', name: 'Knihomol', desc: 'Dočti 3 knihy', test: s => s.booksDone >= 3 },
  { id: 't-money', kind: 'title', name: 'Finanční mozek', desc: '100 zapsaných pohybů', test: s => s.tx >= 100 },
  { id: 't-great', kind: 'title', name: 'Na vlně', desc: '10 dní se skóre 80+', test: s => s.great >= 10 },
  { id: 't-champ', kind: 'title', name: 'Šampion', desc: 'Vyhraj týden mezi přáteli', test: s => s.wins >= 1 },
  { id: 't-unstop', kind: 'title', name: 'Nezastavitelný', desc: 'Série 30 dní', test: s => s.best >= 30 },
  { id: 't-dark', kind: 'title', name: 'Temný rytíř', desc: 'Dosáhni levelu 12', test: s => s.level >= 12 },
  { id: 't-legend', kind: 'title', name: 'Legenda', desc: 'Dosáhni levelu 50', test: s => s.level >= 50 },

  { id: 'b-day1', kind: 'badge', name: 'První den', desc: 'Den se skóre 50+', test: s => s.best >= 1 },
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
  { id: 'b-hours', kind: 'badge', name: 'Deep work', desc: '100 odpracovaných hodin', test: s => s.hours >= 100 },
  { id: 'b-l10', kind: 'badge', name: 'Level 10', desc: 'Dosáhni levelu 10', test: s => s.level >= 10 },
  { id: 'b-l20', kind: 'badge', name: 'Level 20', desc: 'Dosáhni levelu 20', test: s => s.level >= 20 },
  { id: 'b-l30', kind: 'badge', name: 'Level 30', desc: 'Dosáhni levelu 30', test: s => s.level >= 30 },
  { id: 'b-l50', kind: 'badge', name: 'Level 50', desc: 'Dosáhni levelu 50', test: s => s.level >= 50 },
  { id: 'b-l100', kind: 'badge', name: 'Level 100', desc: 'Dosáhni levelu 100', test: s => s.level >= 100 },
  { id: 'b-14', kind: 'badge', name: 'Dva týdny', desc: 'Série 14 dní', test: s => s.best >= 14 },
  { id: 'b-60', kind: 'badge', name: 'Nezastavitelný', desc: 'Série 60 dní', test: s => s.best >= 60 },
  { id: 'b-100', kind: 'badge', name: 'Stovka', desc: 'Série 100 dní', test: s => s.best >= 100 },
  { id: 'b-365', kind: 'badge', name: 'Celý rok', desc: 'Série 365 dní', test: s => s.best >= 365 },
  { id: 'b-perfect', kind: 'badge', name: 'Perfektní den', desc: 'Skóre dne 100', test: s => s.perfect >= 1 },
  { id: 'b-perfect10', kind: 'badge', name: 'Stroj', desc: '10 dní se skóre 100', test: s => s.perfect >= 10 },
  { id: 'b-early', kind: 'badge', name: 'Ranní ptáče', desc: '10× otevřeno před 8:00', test: s => s.early >= 10 },
  { id: 'b-early50', kind: 'badge', name: 'Vstávám s jistotou', desc: '50× otevřeno před 8:00', test: s => s.early >= 50 },
  { id: 'b-hours500', kind: 'badge', name: 'Workaholik', desc: '500 odpracovaných hodin', test: s => s.hours >= 500 },
  { id: 'b-tx', kind: 'badge', name: 'Účetní', desc: '100 zapsaných pohybů', test: s => s.tx >= 100 },
  { id: 'b-friend', kind: 'badge', name: 'Parťák', desc: 'Přidej kamaráda', test: s => s.friends >= 1 },
  { id: 'b-friends5', kind: 'badge', name: 'Parta', desc: '5 přátel', test: s => s.friends >= 5 },
  { id: 'b-win', kind: 'badge', name: 'Vítěz týdne', desc: 'Vyhraj týden mezi přáteli', test: s => s.wins >= 1 },
  { id: 'b-win5', kind: 'badge', name: 'Šampion', desc: 'Vyhraj 5 týdnů', test: s => s.wins >= 5 },
  { id: 'b-win20', kind: 'badge', name: 'Dynastie', desc: 'Vyhraj 20 týdnů', test: s => s.wins >= 20 },
];
export function unlocked(s = stats()) { return UNLOCKS.filter(u => u.test(s)).map(u => u.id); }
export const KIND_LABEL = { theme: 'Barva JARVIS', accent: 'Barva', title: 'Titul', badge: 'Odznak' };
export function titleOf(p = profile() || {}) {
  const t = UNLOCKS.find(u => u.id === p.title && u.kind === 'title');
  return t ? t.name : '';
}
// nejbližší zamčené odměny (podle levelu / série), aby bylo vidět, na co se hraje
export function nextRewards(s = stats(), n = 4) {
  const un = unlocked(s);
  const need = u => {
    const m = /levelu (\d+)/.exec(u.desc); if (m) return (Number(m[1]) - s.level) * 3;
    const q = /Série (\d+)/.exec(u.desc); if (q) return Number(q[1]) - s.streak;
    return 50;
  };
  return UNLOCKS.filter(u => u.kind !== 'badge' && !un.includes(u.id)).sort((a, b) => need(a) - need(b)).slice(0, n);
}

// bonusy: skvělý/perfektní den, všechny bloky dne, milníky série, ranní ptáče
const STREAK_BONUS = [[3, 50], [7, 100], [14, 200], [30, 400], [60, 700], [100, 1000], [200, 2000], [365, 3650]];
function bonuses(s, idx, p) {
  const t = today();
  const sc = dayScore(t, idx, p, { final: true }).score; // celodenní skóre, ne jen „zatím“
  const give = (ref, n, why) => { if (!db.find('xp', x => x.ref === ref)) { db.put('xp', { ref, amount: n, reason: why, date: t }); floatXP(n); toast(`${icon('bolt', 18)} <b>+${n} XP</b> · ${esc(why)}`, 'gold'); return true; } return false; };
  let got = false;
  if (sc >= 80) got = give('score80:' + t, 25, 'Skvělý den (80+)') || got;
  if (sc >= 100) got = give('score100:' + t, 50, 'Perfektní den') || got;
  const pb = s.today.parts.blocks;
  if (pb && pb[1] && pb[0] >= pb[1]) got = give('allblocks:' + t, 20, 'Všechny bloky dne') || got;
  if (s.streak) {
    const start = addDays(t, -(s.streak - 1));
    STREAK_BONUS.filter(([n]) => s.streak >= n).forEach(([n, x]) => { got = give(`streak${n}:${start}`, x, `Série ${n} dní`) || got; });
  }
  return got;
}
export function earlyBird() {
  const h = new Date().getHours();
  if (h >= DAY_START_H && h < 8 && profile()) award('early:' + today(), 10, 'Ranní ptáče');
}

// Štít série: když vynecháš den (nebo víc), štít ho automaticky pokryje a série běží dál.
// Na startu 1 štít, za každý nový level +1, max 3 najednou.
function useShields(p, idx) {
  let left = p.shields ?? 1;
  if (!left) return false;
  const t = today();
  const start = p.createdAt ? p.createdAt.slice(0, 10) : t;
  const ok = d => idx.shield.has(d) || dayScore(d, idx, p).score >= STREAK_MIN;
  const missed = [];
  let d = addDays(t, -1);
  while (d >= start && missed.length <= left && !ok(d)) { missed.push(d); d = addDays(d, -1); }
  // chránit má smysl jen když před mezerou běžela série a mezera se vejde do štítů
  if (!missed.length || missed.length > left || d < start || !ok(d)) return false;
  missed.forEach(x => { db.put('shield', { date: x }); idx.shield.add(x); });
  setProfile({ shields: left - missed.length });
  setTimeout(() => toast(`${icon('flame', 18)} <b>Štít série použit</b> · ${missed.length === 1 ? 'vynechaný den je pokrytý' : `${missed.length} vynechané dny jsou pokryté`}, série běží dál`, 'gold long'), 600);
  return true;
}

export function checkUnlocks() {
  let p = profile();
  if (!p) return;
  const G = has('game', p);
  if (p.shields === undefined) { setProfile({ shields: 1 }); p = profile(); }
  if (G) useShields(p, buildIndex());
  let s = stats();
  if (G && bonuses(s, buildIndex(), profile() || {})) s = stats();
  p = profile();
  const now = unlocked(s);
  const seen = p.unlocked || [];
  const fresh = now.filter(id => !seen.includes(id));
  if (fresh.length) {
    setProfile({ unlocked: Array.from(new Set([...seen, ...now])) });
    fresh.map(id => UNLOCKS.find(x => x.id === id)).filter(u => u.test.length > 0).forEach((u, i) => {
      setTimeout(() => toast(`${icon(u.kind === 'badge' ? 'star' : 'bolt', 18)} <b>Odemčeno:</b> ${esc(KIND_LABEL[u.kind])} „${esc(u.name)}“`, 'gold long'), 400 + i * 900);
    });
  }
  const prevL = p.lastLevel || 1;
  if (s.level > prevL) {
    const add = s.level - prevL;
    setProfile({ lastLevel: s.level, shields: Math.min(SHIELD_MAX, (p.shields ?? 1) + add) });
    setTimeout(() => toast(`${icon('bolt', 18)} <b>Level ${s.level}</b> · ${esc(s.rank)} · +${add} štít série`, 'gold long'), 200);
  }
}

export const THEMES = {
  'theme-arc': 'arc', 'theme-wayne': 'wayne', 'theme-stark': 'stark', 'theme-steel': 'steel', 'theme-gotham': 'gotham',
  'theme-emerald': 'emerald', 'theme-carbon': 'carbon', 'theme-solar': 'solar',
};

export function applyTheme(p = profile()) {
  const root = document.documentElement;
  const style = (p && p.style) || 'hud';
  root.dataset.style = style;
  root.dataset.theme = style === 'hud' ? ((p && p.theme) || 'arc') : 'clean';
  root.dataset.mode = (p && p.mode) || 'auto';
  if (style === 'clean') {
    const a = CLEAN_ACCENTS.find(x => x.id === (p && p.accent)) || CLEAN_ACCENTS[0];
    root.style.setProperty('--acc', a.color);
    const n = parseInt(a.color.slice(1), 16);
    root.style.setProperty('--acc-rgb', `${n >> 16 & 255}, ${n >> 8 & 255}, ${n & 255}`);
    root.style.setProperty('--acc-ink', '#FFFFFF');
  } else {
    ['--acc', '--acc-rgb', '--acc-ink'].forEach(k => root.style.removeProperty(k));
  }
  try { localStorage.setItem('lr:look', JSON.stringify({ style, theme: root.dataset.theme, mode: root.dataset.mode })); } catch (e) { /* */ }
  const dark = style === 'hud' || root.dataset.mode === 'dark' || (root.dataset.mode === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = dark ? (style === 'hud' ? '#080C11' : '#111315') : '#F6F7F9';
  document.querySelector('meta[name="color-scheme"]')?.setAttribute('content', dark ? 'dark' : 'light');
}
matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => applyTheme());
