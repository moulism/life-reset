// Průvodce: nový profil (jméno → styl → moduly → návyky → týden → cíle) nebo přechod starého profilu na novou verzi.
import { db, profile, setProfile } from '../store.js';
import { esc, icon, toast, $ } from '../ui.js';
import { ROUTINE_SUGGEST, GYM_TEMPLATES, CAL_CATS, MODULES, defaultModules, AREA_SUGGEST, CLEAN_ACCENTS } from '../data/defaults.js';
import { applyTheme } from '../game.js';
import { signOut, sync } from '../sync.js';

let step = 0;
let st = null;
const SLOTS = [['morning', 'Ráno', 'sunrise'], ['day', 'Přes den', 'sun'], ['evening', 'Večer', 'moon']];
const DATA_OF = { school: 'subjects', hustles: 'hustles', books: 'books', archive: 'files', food: 'meals', diary: 'journal' };

function init() {
  const p = profile();
  const upgrade = !!p;
  const mods = upgrade
    ? Array.from(new Set([...defaultModules(), ...Object.entries(DATA_OF).filter(([, c]) => db.all(c).length).map(([m]) => m)]))
    : defaultModules();
  st = {
    upgrade,
    name: (p && p.name) || '', callName: (p && p.callName) || '',
    style: (p && p.style) || 'hud', accent: (p && p.accent) || 'blue', mode: (p && p.mode) || 'auto',
    modules: mods,
    routine: { morning: [], day: [], evening: [] }, custom: { morning: [], day: [], evening: [] },
    areas: [], areaCustom: [], budgets: {},
    places: (p && p.places) || [],
    targets: { kcal: 2500, protein: 140, water: 2500, gym: 3, ...((p && p.targets) || {}) },
  };
}
function steps() {
  const s = st.upgrade ? ['upgrade', 'style', 'modules'] : ['name', 'style', 'modules'];
  if (st.modules.includes('habits') && !(st.upgrade && db.all('routine').length)) s.push('habits');
  if (st.modules.includes('week')) s.push('week');
  if (st.modules.includes('food') && !st.upgrade) s.push('targets');
  s.push('done');
  return s;
}
const preview = () => applyTheme({ style: st.style, accent: st.accent, mode: st.mode, theme: (profile() || {}).theme || 'arc' });

export default {
  title: 'Nastavení profilu',
  render(root, args, { refresh, go }) {
    if (!st) init();
    const S = steps();
    step = Math.min(step, S.length - 1);
    const k = S[step];
    preview();
    const dots = `<div class="ob-dots">${S.slice(0, -1).map((_, i) => `<i class="${i <= step ? 'on' : ''}"></i>`).join('')}</div>`;
    let body = '';
    if (k === 'upgrade') {
      body = `<div class="ob-hero">
          <div class="ob-mark">${icon('bolt', 34)}</div>
          <h1>Nová verze</h1>
          <p>Life Reset je teď postavený na tvém týdnu: bloky v rozvrhu, rozpočet hodin, plán vs. skutečnost. Vyber si styl a moduly, které chceš vidět. Tvoje data zůstávají.</p>
        </div>`;
    } else if (k === 'name') {
      body = `<h2>Ahoj!</h2><p class="muted">Jak ti máme říkat? Všechno jde později změnit.</p>
        <div class="form">
          <div class="field"><label for="obN">Jméno</label><input id="obN" data-k="name" value="${esc(st.name)}" placeholder="Např. Matyáš" autocomplete="given-name"></div>
          <div class="field"><label for="obC">Přivítání při spuštění (volitelné)</label><input id="obC" data-k="callName" value="${esc(st.callName)}" placeholder="Např. Master M"><small class="hint">„Welcome, …“</small></div>
        </div>`;
    } else if (k === 'style') {
      body = `<h2>Vyber styl</h2><p class="muted">Kdykoli přepneš v Nastavení → Vzhled.</p>
        <div class="style-pick">
          <button class="style-card sc-hud ${st.style === 'hud' ? 'on' : ''}" data-act="style" data-v="hud">
            <span class="sc-prev"><i></i><i></i><i></i></span><b>JARVIS</b><small>Tmavý HUD, záře, odemykací barvy</small></button>
          <button class="style-card sc-clean ${st.style === 'clean' ? 'on' : ''}" data-act="style" data-v="clean">
            <span class="sc-prev"><i></i><i></i><i></i></span><b>Čistý</b><small>Jednoduchý, světlý nebo tmavý</small></button>
        </div>
        ${st.style === 'clean' ? `<div class="field"><label>Barva</label><div class="chips">${CLEAN_ACCENTS.map(a => `<button class="chip ${st.accent === a.id ? 'on' : ''}" data-act="accent" data-v="${a.id}" style="--c:${a.color}"><i class="dot"></i>${esc(a.name)}</button>`).join('')}</div></div>
          <div class="field"><label>Režim</label><div class="chips">${[['auto', 'Podle telefonu'], ['light', 'Světlý'], ['dark', 'Tmavý']].map(([v, l]) => `<button class="chip ${st.mode === v ? 'on' : ''}" data-act="mode" data-v="${v}">${l}</button>`).join('')}</div></div>` : ''}`;
    } else if (k === 'modules') {
      body = `<h2>Co chceš používat?</h2><p class="muted">Zapni jen to, co opravdu budeš používat. Ostatní se schová (data nezmizí).</p>
        <div class="ob-list">${MODULES.map(m => `<button class="rt ${st.modules.includes(m.id) ? 'on' : ''}" data-act="mod" data-v="${m.id}" style="--c:${m.c}"><span class="tick">${icon('check', 14)}</span><span><b>${icon(m.ic, 15)} ${esc(m.name)}</b><small>${esc(m.desc)}</small></span></button>`).join('')}</div>`;
    } else if (k === 'habits') {
      body = `<h2>Denní návyky</h2><p class="muted">Co chceš každý den odškrtnout? Vyber pár, dole přidáš vlastní.</p>
        ${SLOTS.map(([s, l, ic]) => `<div class="rt-group"><h4>${icon(ic, 16)} ${l}</h4>${[...ROUTINE_SUGGEST[s], ...st.custom[s]].map(r => `<button class="rt ${st.routine[s].includes(r) ? 'on' : ''}" data-act="rt" data-slot="${s}" data-v="${esc(r)}"><span class="tick">${icon('check', 14)}</span><span>${esc(r)}</span></button>`).join('')}
          <form class="inline-add" data-form="custom" data-slot="${s}"><input name="v" placeholder="Vlastní – ${l.toLowerCase()}…"><button class="btn sm" aria-label="Přidat">${icon('plus', 16)}</button></form></div>`).join('')}`;
    } else if (k === 'week') {
      const existing = db.all('areas').map(a => a.name);
      const all = [...AREA_SUGGEST.filter(a => !existing.includes(a.name)), ...st.areaCustom];
      body = `<h2>Na co máš týden?</h2><p class="muted">Oblasti, kterým chceš dávat čas, a kolik hodin týdně na každou. V Týdnu pak appka ukáže plán proti skutečnosti.</p>
        ${existing.length ? `<p class="small">Už máš: <b>${existing.map(esc).join(', ')}</b></p>` : ''}
        <div class="ob-list">${all.map(a => {
          const on = st.areas.includes(a.name);
          return `<div class="rt area-pick ${on ? 'on' : ''}" style="--c:${a.color}"><button class="area-tg" data-act="area" data-v="${esc(a.name)}"><span class="tick">${icon('check', 14)}</span><span>${esc(a.name)}</span></button>
            ${on ? `<label class="area-h"><input inputmode="numeric" data-budget="${esc(a.name)}" value="${st.budgets[a.name] ?? a.budget}"> h/týd</label>` : ''}</div>`;
        }).join('')}</div>
        <form class="inline-add" data-form="area"><input name="v" placeholder="Vlastní oblast (např. MetroMood)…"><button class="btn sm" aria-label="Přidat">${icon('plus', 16)}</button></form>
        <div class="field"><label for="obPl">Žiješ na dvou místech? (volitelné)</label><input id="obPl" data-places value="${esc(st.places.join(', '))}" placeholder="Např. Praha, Plzeň"><small class="hint">Bloky pak můžeš vázat na místo a v neděli jen řekneš, kde budeš který den.</small></div>`;
    } else if (k === 'targets') {
      const T = st.targets;
      body = `<h2>Denní cíle jídla</h2><p class="muted">Klidně odhadni, upravíš později.</p>
        <div class="form">
          <div class="field half"><label for="tK">Kalorie / den</label><input id="tK" inputmode="numeric" data-t="kcal" value="${T.kcal}"></div>
          <div class="field half"><label for="tP">Bílkoviny (g)</label><input id="tP" inputmode="numeric" data-t="protein" value="${T.protein}"></div>
          <div class="field half"><label for="tW">Voda (ml)</label><input id="tW" inputmode="numeric" data-t="water" value="${T.water}"></div>
          <div class="field half"><label for="tG">Tréninků / týden</label><input id="tG" inputmode="numeric" data-t="gym" value="${T.gym}"></div>
        </div>`;
    } else {
      body = `<div class="ob-hero">
          <div class="ob-mark pulse">${icon('bolt', 34)}</div>
          <h1>Hotovo</h1>
          <p>${st.modules.length} modulů${st.areas.length ? ` · ${st.areas.length} oblastí týdne` : ''}.</p>
          <p class="muted">${st.modules.includes('week') ? 'Další krok: v Týdnu si naklikej bloky rozvrhu (škola, práce, trénink…).' : 'Všechno upravíš v Nastavení.'}</p>
        </div>`;
    }
    const first = step === 0;
    const nav = `<div class="ob-nav">
        ${first ? (st.upgrade ? '' : `<button class="btn ghost" data-act="logout">Odhlásit</button>`) : `<button class="btn ghost" data-act="back">${icon('left', 18)} Zpět</button>`}
        <button class="btn primary" data-act="${k === 'done' ? 'finish' : 'next'}">${k === 'done' ? 'Spustit' : 'Dál'} ${icon('right', 18)}</button>
      </div>`;
    root.innerHTML = `<section class="ob">${k !== 'done' && k !== 'upgrade' ? dots : ''}${body}${nav}</section>`;

    const keep = () => {
      root.querySelectorAll('[data-k]').forEach(i => { st[i.dataset.k] = i.value.trim(); });
      root.querySelectorAll('[data-t]').forEach(i => { const v = parseInt(i.value, 10); if (v > 0) st.targets[i.dataset.t] = v; });
      root.querySelectorAll('[data-budget]').forEach(i => { const v = parseFloat(i.value.replace(',', '.')); st.budgets[i.dataset.budget] = v >= 0 ? v : 0; });
      const pl = root.querySelector('[data-places]');
      if (pl) st.places = pl.value.split(/[,;]/).map(x => x.trim()).filter(Boolean).slice(0, 4);
    };
    root.onclick = async e => {
      const b = e.target.closest('[data-act]');
      if (!b) return;
      const act = b.dataset.act, v = b.dataset.v;
      keep();
      if (act === 'next') {
        if (k === 'name' && !st.name) { toast('Napiš jméno', 'warn'); return; }
        step++; refresh();
      } else if (act === 'back') { step = Math.max(0, step - 1); refresh(); }
      else if (act === 'style') { st.style = v; refresh(); }
      else if (act === 'accent') { st.accent = v; refresh(); }
      else if (act === 'mode') { st.mode = v; refresh(); }
      else if (act === 'mod') { st.modules = st.modules.includes(v) ? st.modules.filter(x => x !== v) : [...st.modules, v]; refresh(); }
      else if (act === 'rt') { const s = b.dataset.slot; const l = st.routine[s]; st.routine[s] = l.includes(v) ? l.filter(x => x !== v) : [...l, v]; refresh(); }
      else if (act === 'area') { st.areas = st.areas.includes(v) ? st.areas.filter(x => x !== v) : [...st.areas, v]; refresh(); }
      else if (act === 'logout') { await signOut(); location.hash = '#/welcome'; }
      else if (act === 'finish') { create(); st = null; step = 0; go('home'); }
    };
    root.onsubmit = e => {
      e.preventDefault();
      keep();
      const f = e.target;
      const v = f.v.value.trim();
      if (!v) return;
      if (f.dataset.form === 'custom') { const s = f.dataset.slot; st.custom[s].push(v); st.routine[s].push(v); }
      if (f.dataset.form === 'area') { const colors = ['#2EC4B6', '#E0B65A', '#FF9F43', '#B07CFF', '#4FD8FF']; st.areaCustom.push({ name: v, color: colors[st.areaCustom.length % colors.length], budget: 5 }); st.areas.push(v); }
      refresh();
      setTimeout(() => { const i = $(`form[data-form="${f.dataset.form}"]${f.dataset.slot ? `[data-slot="${f.dataset.slot}"]` : ''} input`); i && i.focus(); }, 30);
    };
    void sync;
  }
};

function create() {
  const now = new Date().toISOString();
  const p = profile();
  let order = db.all('routine').length;
  const have = new Set(db.all('routine').map(r => r.name));
  SLOTS.forEach(([slot]) => st.routine[slot].filter(n => !have.has(n)).forEach(name => db.put('routine', { name, slot, days: [], order: order++, active: true })));
  const all = [...AREA_SUGGEST, ...st.areaCustom];
  let ao = db.all('areas').length;
  st.areas.forEach(n => {
    const a = all.find(x => x.name === n);
    if (a && !db.find('areas', x => x.name === n)) db.put('areas', { name: a.name, color: a.color, budget: st.budgets[n] ?? a.budget, order: ao++ });
  });
  if (st.modules.includes('gym') && !db.all('gymtpl').length) GYM_TEMPLATES.forEach(t => db.put('gymtpl', t));
  const places = st.places;
  setProfile({
    name: st.name || (p && p.name) || '', callName: st.callName,
    style: st.style, accent: st.accent, mode: st.mode, theme: (p && p.theme) || 'arc',
    modules: st.modules, places, placeDefault: (p && p.placeDefault) || (places.length ? Object.fromEntries([0, 1, 2, 3, 4, 5, 6].map(d => [d, places[0]])) : {}),
    targets: st.targets, cats: (p && p.cats) || CAL_CATS,
    unlocked: (p && p.unlocked) || ['theme-arc'], lastLevel: (p && p.lastLevel) || 1, bestStreak: (p && p.bestStreak) || 0,
    createdAt: (p && p.createdAt) || now, v2: true, lang: (p && p.lang) || 'cs', mealPlan: p ? (p.mealPlan ?? true) : false,
  });
  applyTheme();
  toast(`${icon('bolt', 18)} Připraveno${st.name ? `, ${esc(st.name)}` : ''}.`, 'gold long');
}

window.addEventListener('lr:account', () => { st = null; step = 0; });
