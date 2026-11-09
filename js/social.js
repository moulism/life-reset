// Přátelé: kód přátel, žádosti, žebříček a soutěž o týden. Na server jdou jen souhrnná čísla (level, XP, série, skóre).
import { profile, setProfile, getMeta, setMeta, onChange, db } from './store.js';
import { today, addDays, weekday } from './ui.js';
import { stats, weekXP, weekAvgScore, unlocked, award } from './game.js';
import { has } from './mods.js';
import { sync, supa } from './sync.js';
import { CLEAN_ACCENTS } from './data/defaults.js';

export const mondayOfD = d => addDays(d, -((weekday(d) + 6) % 7));
export const myCode = () => getMeta('friendCode') || '';
export const cachedFriends = () => getMeta('friends') || [];
export const inviteUrl = code => `${location.origin}${location.pathname}#/friends/add/${code}`;

export function myStats() {
  const s = stats();
  const t = today();
  const mon = mondayOfD(t);
  const p = profile() || {};
  return {
    level: s.level, xp: s.xp, rank: s.rank, streak: s.streak, best: s.best,
    score: s.today.score, day: t, week: mon, weekXP: s.weekXP, weekAvg: weekAvgScore(t),
    prevWeek: { week: addDays(mon, -7), xp: weekXP(addDays(mon, -1)) },
    badges: unlocked(s).filter(id => id.startsWith('b-')).length, wins: p.weekWins || 0,
  };
}
const colorOf = p => (CLEAN_ACCENTS.find(a => a.id === p.accent) || {}).color || '#4FD8FF';

let busy = false;
export async function syncSocial() {
  const p = profile();
  if (!p || !has('friends') || busy || !navigator.onLine) return null;
  const c = await supa();
  if (!c || !sync.user) return null;
  busy = true;
  try {
    const { data, error } = await c.rpc('lr_social_sync', { p_name: p.name || '', p_color: colorOf(p), p_stats: myStats() });
    if (error) throw error;
    if (data && data !== myCode()) setMeta('friendCode', data);
    return data;
  } catch (e) { console.warn('social', e); return null; }
  finally { busy = false; }
}

export async function loadFriends() {
  const c = await supa();
  if (!c || !sync.user) return cachedFriends();
  const { data, error } = await c.rpc('lr_friends_list');
  if (error) throw new Error(error.message);
  const list = (data || []).map(r => ({ ...r, stats: r.stats || {} }));
  setMeta('friends', list);
  const n = list.filter(f => f.status === 'accepted').length;
  if ((profile() || {}).friendsCount !== n) setProfile({ friendsCount: n });
  if (n >= 1) award('friend1', 50, 'První kamarád');
  checkWeekWin(list);
  return list;
}

const ERR = { not_found: 'Kód neexistuje – zkontroluj ho.', self: 'To je tvůj vlastní kód.', already: 'Už jste přátelé.', pending: 'Žádost už čeká na potvrzení.' };
export async function addFriend(code) {
  const c = await supa();
  if (!c || !sync.user) throw new Error('Pro přátele musíš být online a přihlášený.');
  if (!myCode()) await syncSocial();
  const { data, error } = await c.rpc('lr_friend_add', { p_code: String(code || '').trim().toUpperCase() });
  if (error) throw new Error(error.message);
  if (ERR[data]) throw new Error(ERR[data]);
  await loadFriends();
  return data; // requested | accepted
}
export async function respond(id, accept) {
  const c = await supa();
  if (!c) throw new Error('Jsi offline.');
  const { error } = await c.rpc('lr_friend_respond', { p_other: id, p_accept: accept });
  if (error) throw new Error(error.message);
  return loadFriends();
}
export async function nudge(id, msg) {
  const c = await supa();
  if (!c) throw new Error('Jsi offline.');
  const { data, error } = await c.rpc('lr_friend_nudge', { p_other: id, p_msg: msg });
  if (error) throw new Error(error.message);
  if (data === 'later') throw new Error('Tohohle kamaráda jsi už popíchl – zkus to za hodinu.');
  if (data !== 'sent') throw new Error('Nejde to – nejste přátelé.');
}

// výsledky týdne: čísla kamaráda pro daný týden (pokud je už zveřejnil)
export function friendWeekXP(f, mon) {
  const s = f.stats || {};
  if (s.week === mon) return s.weekXP || 0;
  if (s.prevWeek && s.prevWeek.week === mon) return s.prevWeek.xp || 0;
  return 0;
}
// vítěz minulého týdne – vyhodnotí se od pondělí
export function lastWeekResult(list = cachedFriends()) {
  const fr = list.filter(f => f.status === 'accepted');
  if (!fr.length) return null;
  const lastMon = addDays(mondayOfD(today()), -7);
  const me = { name: (profile() || {}).name || 'Já', me: true, xp: weekXP(addDays(lastMon, 6)) };
  const all = [me, ...fr.map(f => ({ name: f.name, color: f.color, xp: friendWeekXP(f, lastMon) }))].sort((a, b) => b.xp - a.xp);
  return { week: lastMon, rows: all, winner: all[0].xp > 0 && all[0].xp > (all[1] ? all[1].xp : -1) ? all[0] : null };
}
function checkWeekWin(list) {
  const r = lastWeekResult(list);
  if (!r || !r.winner || !r.winner.me) return;
  if (db.find('xp', x => x.ref === 'win:' + r.week)) return;
  award('win:' + r.week, 150, 'Vítěz týdne');
  setProfile({ weekWins: ((profile() || {}).weekWins || 0) + 1 });
}

// po změnách se čísla pošlou do minuty
let tmr = null;
onChange(() => { clearTimeout(tmr); tmr = setTimeout(() => syncSocial(), 20000); });
setInterval(() => { if (document.visibilityState === 'visible') syncSocial(); }, 10 * 60e3);
