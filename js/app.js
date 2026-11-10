// Life Reset – start aplikace, router, horní lišta a navigace.
import { profile, currentUid, setProfile } from './store.js';
import { has } from './mods.js';
import { initSync, sync } from './sync.js';
import { applyTheme, checkUnlocks, stats } from './game.js';
import { $, icon, esc, sheetOpen } from './ui.js';
import { scheduleReminders } from './common.js';
import { postDueRecurring } from './money-core.js';
import { syncPushQueue } from './reminders.js';
import { syncSocial, loadFriends } from './social.js';
import { earlyBird } from './game.js';
import { startI18n, lang, setLang } from './i18n.js';

import home from './pages/home.js';
import calendar from './pages/calendar.js';
import tasks from './pages/tasks.js';
import food from './pages/food.js';
import map from './pages/map.js';
import diary from './pages/diary.js';
import hustles from './pages/hustles.js';
import school from './pages/school.js';
import archive from './pages/archive.js';
import gym from './pages/gym.js';
import finance from './pages/finance.js';
import books from './pages/books.js';
import notes from './pages/notes.js';
import shop from './pages/shop.js';
import settings from './pages/settings.js';
import onboarding from './pages/onboarding.js';
import week from './pages/week.js';
import friends from './pages/friends.js';
import welcome from './pages/welcome.js';

const ROUTES = { home, week, friends, calendar, tasks, food, map, diary, hustles, school, archive, gym, finance, books, notes, shop, settings, onboarding, welcome };
// spodní lišta: Dnes, Týden, 2 nejdůležitější zapnuté moduly, Menu
const TAB_CANDIDATES = [['friends', 'Přátelé', 'star'], ['finance', 'Peníze', 'wallet'], ['tasks', 'Úkoly', 'tasks'], ['calendar', 'Kalendář', 'calendar'], ['notes', 'Poznámky', 'note'], ['gym', 'Trénink', 'gym'], ['food', 'Jídlo', 'food'], ['shop', 'Nákupy', 'cart']];
function tabs() {
  const t = [['home', 'Dnes', 'home']];
  if (has('week')) t.push(['week', 'Týden', 'clock']);
  const pick = TAB_CANDIDATES.filter(([k]) => has(k)).slice(0, t.length === 2 ? 2 : 3);
  return [...t, ...pick, ['map', 'Menu', 'grid']];
}
const NO_CHROME = ['onboarding', 'welcome'];

let current = { name: '', args: [] };
let prevName = '';

export function go(path) { location.hash = '#/' + path; }
export function refresh() { render(true); }

function parseHash() {
  const h = location.hash.replace(/^#\/?/, '');
  const [name, ...args] = h.split('/').map(decodeURIComponent);
  return { name: ROUTES[name] ? name : 'home', args };
}

function render(keepScroll = false) {
  const p = profile();
  // jazyk z profilu (třeba po přihlášení na novém zařízení)
  if (p && p.lang && p.lang !== lang()) { setLang(p.lang); location.reload(); return; }
  // nový modul Přátelé: profilům z doby před jeho vydáním ho jednou zapne
  if (p && p.v2 && Array.isArray(p.modules) && !p.modFriends) { setProfile({ modules: p.modules.includes('friends') ? p.modules : [...p.modules, 'friends'], modFriends: true }); }
  let { name, args } = parseHash();
  // pozvánka od kamaráda – schová se, dokud se člověk nepřihlásí a neprojde průvodcem
  if (name === 'friends' && args[0] === 'add' && args[1] && (!currentUid() || !p || !p.v2)) { try { localStorage.setItem('lr:invite', args[1]); } catch (e) { /* */ } }
  const inv = (() => { try { return localStorage.getItem('lr:invite'); } catch (e) { return null; } })();
  if (inv && currentUid() && p && p.v2 && name === 'home') { localStorage.removeItem('lr:invite'); location.replace('#/friends/add/' + inv); return; }
  if (!currentUid()) { if (name !== 'welcome') { location.replace('#/welcome'); return; } }
  else if (!p || !p.v2) { if (name !== 'onboarding') { location.replace('#/onboarding'); return; } }
  else if (NO_CHROME.includes(name)) { location.replace('#/home'); return; }
  const mod = ROUTES[name];
  const view = $('#view');
  const y = window.scrollY;
  const same = current.name === name && current.args.join('/') === args.join('/');
  current = { name, args };
  document.body.dataset.page = name;
  view.onclick = view.oninput = view.onchange = view.onsubmit = null;
  const prev = ROUTES[prevName];
  if (prev && prev.cleanup) try { prev.cleanup(); } catch (e) { /* noop */ }
  prevName = name;
  try {
    mod.render(view, args, { go, refresh });
  } catch (e) {
    console.error(e);
    view.innerHTML = `<div class="empty"><p>Na téhle stránce se něco pokazilo: ${esc(e.message)}</p><a class="btn ghost" href="#/home">Zpět domů</a></div>`;
  }
  renderTop(mod, name, args);
  renderTabs(name);
  if (keepScroll && same) window.scrollTo(0, y); else window.scrollTo(0, 0);
}

function syncDot() {
  const s = sync.status;
  const label = { off: 'Synchronizace vypnutá', idle: 'Připojeno', ok: 'Synchronizováno', syncing: 'Synchronizuji…', error: 'Chyba synchronizace', offline: 'Offline' }[s] || s;
  return `<a href="#/settings/sync" class="sync-dot s-${s}" title="${label}" aria-label="${label}">${icon('sync', 16)}</a>`;
}

function renderTop(mod, name, args) {
  const top = $('#top');
  if (NO_CHROME.includes(name)) { top.innerHTML = ''; return; }
  const isTab = tabs().some(t => t[0] === name);
  const sub = args.length > 0;
  const back = sub ? `#/${name}` : (isTab ? '' : '#/map');
  const s = stats();
  const title = typeof mod.title === 'function' ? mod.title(args) : mod.title;
  top.innerHTML = `
    ${back ? `<a class="icon-btn back" href="${back}" aria-label="Zpět">${icon('left')}</a>` : `<a class="logo" href="#/home" aria-label="Domů"><span>LR</span></a>`}
    <h1 class="top-title">${esc(name === 'home' ? 'Life Reset' : title)}</h1>
    ${has('game') ? `<a class="lvl-chip" href="#/map" title="Level ${s.level} · ${esc(s.rank)}"><b>${s.level}</b><span>${s.streak}${icon('flame', 13)}</span></a>` : ''}
    ${syncDot()}`;
}

function renderTabs(name) {
  const tabsEl = $('#tabs');
  if (NO_CHROME.includes(name)) { tabsEl.innerHTML = ''; tabsEl.hidden = true; return; }
  tabsEl.hidden = false;
  const T = tabs();
  const active = T.some(t => t[0] === name) ? name : 'map';
  tabsEl.innerHTML = T.map(([k, l, ic]) => `<a href="#/${k}" class="${k === active ? 'on' : ''}" ${k === active ? 'aria-current="page"' : ''}>${icon(ic, 22)}<span>${l}</span></a>`).join('');
}

// ---------- boot ----------
function boot() {
  const p = profile();
  applyTheme(p);
  const call = (p && (p.callName || p.name)) || '';
  $('#bootWelcome').textContent = call ? `Welcome, ${call}` : 'Life Reset';
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const bootEl = $('#boot');
  const finish = () => {
    if (bootEl.classList.contains('out')) return;
    bootEl.classList.add('out');
    $('#app').hidden = false;
    render();
    setTimeout(() => bootEl.remove(), 600);
    setTimeout(() => { if (profile()) checkUnlocks(); }, 900);
    setTimeout(() => { try { if (profile() && has('finance')) postDueRecurring(); } catch (e) { console.warn(e); } syncPushQueue(true); if (profile() && has('game')) earlyBird(); if (profile() && has('friends')) syncSocial().then(() => loadFriends()).catch(() => {}); }, 3000);
  };
  bootEl.addEventListener('click', finish);
  const quick = reduce || !p || p.style === 'clean';
  if (quick) bootEl.classList.add('quick');
  setTimeout(finish, quick ? 350 : 2600);
}

startI18n();
window.addEventListener('hashchange', () => render());
// přihlášení / odhlášení / jiný účet → jiná data v zařízení
window.addEventListener('lr:account', () => { if (sheetOpen()) return; applyTheme(); render(); scheduleReminders(); });
window.addEventListener('lr:sync', () => {
  const dot = document.querySelector('.sync-dot');
  if (dot) dot.outerHTML = syncDot();
});
window.addEventListener('lr:remote', () => {
  const a = document.activeElement;
  const typing = a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.tagName === 'SELECT');
  if (!typing && !sheetOpen()) { applyTheme(); render(true); }
  scheduleReminders();
});
window.addEventListener('lr:events', scheduleReminders);
window.addEventListener('lr:quota', () => import('./ui.js').then(u => u.toast('Úložiště v zařízení je plné – zapni synchronizaci a velké soubory nahrávej do cloudu.', 'warn long')));

boot();
initSync();
scheduleReminders();
setInterval(scheduleReminders, 30 * 60000);

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  const hadSW = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.register('sw.js').then(r => r.update()).catch(() => {});
  // nová verze aplikace → jednou obnovit, ať telefon hned běží na nejnovějším kódu
  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadSW || reloaded || sheetOpen()) return;
    reloaded = true;
    location.reload();
  });
}
