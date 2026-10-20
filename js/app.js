// Life Reset – start aplikace, router, horní lišta a navigace.
import { profile } from './store.js';
import { initSync, sync } from './sync.js';
import { applyTheme, checkUnlocks, stats } from './game.js';
import { $, icon, esc, sheetOpen } from './ui.js';
import { scheduleReminders } from './common.js';

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

const ROUTES = { home, calendar, tasks, food, map, diary, hustles, school, archive, gym, finance, books, notes, shop, settings, onboarding };
const TABS = [['home', 'Domů', 'home'], ['calendar', 'Kalendář', 'calendar'], ['tasks', 'Úkoly', 'tasks'], ['food', 'Jídlo', 'food'], ['map', 'Mapa', 'grid']];
const TAB_OF = { shop: 'food', gym: 'map', diary: 'map', hustles: 'map', school: 'map', archive: 'map', finance: 'map', books: 'map', notes: 'map', settings: 'map' };

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
  let { name, args } = parseHash();
  if (!p && name !== 'onboarding') { location.replace('#/onboarding'); return; }
  if (p && name === 'onboarding') { location.replace('#/home'); return; }
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
  if (name === 'onboarding') { top.innerHTML = ''; return; }
  const isTab = TABS.some(t => t[0] === name);
  const sub = args.length > 0;
  const back = sub ? `#/${name}` : (isTab ? '' : '#/map');
  const s = stats();
  const title = typeof mod.title === 'function' ? mod.title(args) : mod.title;
  top.innerHTML = `
    ${back ? `<a class="icon-btn back" href="${back}" aria-label="Zpět">${icon('left')}</a>` : `<a class="logo" href="#/home" aria-label="Domů"><span>LR</span></a>`}
    <h1 class="top-title">${esc(name === 'home' ? 'Life Reset' : title)}</h1>
    <a class="lvl-chip" href="#/map" title="Level ${s.level} · ${esc(s.rank)}"><b>${s.level}</b><span>${s.streak}${icon('flame', 13)}</span></a>
    ${syncDot()}`;
}

function renderTabs(name) {
  const tabs = $('#tabs');
  if (name === 'onboarding') { tabs.innerHTML = ''; tabs.hidden = true; return; }
  tabs.hidden = false;
  const active = TABS.some(t => t[0] === name) ? name : (TAB_OF[name] || 'map');
  tabs.innerHTML = TABS.map(([k, l, ic]) => `<a href="#/${k}" class="${k === active ? 'on' : ''}" ${k === active ? 'aria-current="page"' : ''}>${icon(ic, 22)}<span>${l}</span></a>`).join('');
}

// ---------- boot ----------
function boot() {
  const p = profile();
  applyTheme(p);
  const call = (p && p.callName) || 'Master M';
  $('#bootWelcome').textContent = `Welcome, ${call}`;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const bootEl = $('#boot');
  const finish = () => {
    if (bootEl.classList.contains('out')) return;
    bootEl.classList.add('out');
    $('#app').hidden = false;
    render();
    setTimeout(() => bootEl.remove(), 600);
    setTimeout(() => { if (profile()) checkUnlocks(); }, 900);
  };
  bootEl.addEventListener('click', finish);
  setTimeout(finish, reduce ? 600 : 2600);
}

window.addEventListener('hashchange', () => render());
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
