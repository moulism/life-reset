// Vytvoření profilu – průvodce "Life Reset".
import { db, setProfile } from '../store.js';
import { esc, icon, toast, $ } from '../ui.js';
import { ROUTINE_SUGGEST, HUSTLE_SUGGEST, GYM_TEMPLATES, SCHOOLS, CAL_CATS } from '../data/defaults.js';
import { BOOKS } from '../data/books.js';
import { sync } from '../sync.js';
import { mountAuth } from '../auth-ui.js';

const STEPS = ['start', 'name', 'why', 'morning', 'day', 'evening', 'hustles', 'targets', 'done'];
let step = 0;
const st = {
  name: 'Matthew', callName: 'Master M', sir: 'pane',
  why: '', focus: [],
  routine: { morning: ROUTINE_SUGGEST.morning.slice(0, 5), day: ROUTINE_SUGGEST.day.slice(0, 4), evening: ROUTINE_SUGGEST.evening.slice(0, 3) },
  custom: { morning: [], day: [], evening: [] },
  hustles: ['MetroMood', 'Anděl'],
  targets: { kcal: 3000, protein: 160, water: 3000, gym: 4, sleep: 8 },
};
const FOCUS = ['Disciplína', 'Tělo & síla', 'Peníze', 'Škola', 'Business', 'Klid v hlavě', 'Spánek', 'Čtení'];
const SLOT_T = { morning: ['Ranní rutina', 'Co chceš mít hotové každé ráno?'], day: ['Přes den', 'Co se má stát během dne?'], evening: ['Večerní rutina', 'Jak zavřeš den?'] };

export default {
  title: 'Nový profil',
  render(root, args, { refresh, go }) {
    const k = STEPS[step];
    const dots = `<div class="ob-dots">${STEPS.slice(1, -1).map((_, i) => `<i class="${i < step ? 'on' : ''}"></i>`).join('')}</div>`;
    let body = '';
    if (k === 'start') {
      body = `<div class="ob-hero">
          <div class="ob-mark">LR</div>
          <h1>Life Reset</h1>
          <p>Osobní systém pro rutinu, kalendář, jídlo, trénink, peníze a projekty. Každý splněný den = XP, levely a série.</p>
        </div>
        <button class="btn primary big" data-act="next">Vytvořit profil ${icon('right', 18)}</button>
        <details class="ob-login"><summary>Už mám účet – stáhnout data z cloudu</summary><div id="obAuth"></div></details>`;
    } else if (k === 'name') {
      body = `<h2>Kdo jsi?</h2><p class="muted">Všechno jde později změnit v Nastavení.</p>
        <div class="form">
          <div class="field"><label for="obN">Jméno</label><input id="obN" data-k="name" value="${esc(st.name)}"></div>
          <div class="field"><label for="obC">Jak tě má systém vítat</label><input id="obC" data-k="callName" value="${esc(st.callName)}"><small class="hint">„Welcome, ${esc(st.callName)}“ při spuštění</small></div>
          <div class="field"><label for="obS">Oslovení na hlavní stránce</label><input id="obS" data-k="sir" value="${esc(st.sir)}"><small class="hint">„Dobré ráno, ${esc(st.sir)}“</small></div>
        </div>`;
    } else if (k === 'why') {
      body = `<h2>Proč Life Reset?</h2><p class="muted">Na co se chceš teď soustředit? Vyber, co sedí.</p>
        <div class="chips wrap">${FOCUS.map(f => `<button class="chip ${st.focus.includes(f) ? 'on' : ''}" data-act="focus" data-v="${esc(f)}">${esc(f)}</button>`).join('')}</div>
        <div class="field"><label for="obW">Moje hlavní „proč“ (uvidíš ho v přehledu)</label><textarea id="obW" data-k="why" rows="3" placeholder="Např. Chci mít tělo, peníze a hlavu pod kontrolou.">${esc(st.why)}</textarea></div>`;
    } else if (SLOT_T[k]) {
      const [t, sub] = SLOT_T[k];
      const all = [...ROUTINE_SUGGEST[k], ...st.custom[k]];
      body = `<h2>${t}</h2><p class="muted">${sub} Klepnutím vybereš, dole přidáš vlastní.</p>
        <div class="ob-list">${all.map(r => `<button class="rt ${st.routine[k].includes(r) ? 'on' : ''}" data-act="rt" data-v="${esc(r)}"><span class="tick">${icon('check', 14)}</span><span>${esc(r)}</span></button>`).join('')}</div>
        <form class="inline-add" data-form="custom"><input name="v" placeholder="Vlastní bod rutiny…"><button class="btn sm" aria-label="Přidat">${icon('plus', 16)}</button></form>`;
    } else if (k === 'hustles') {
      body = `<h2>Side hustles & projekty</h2><p class="muted">Každý dostane vlastní stránku s cíli, úkoly, poznámkami, soubory a penězi.</p>
        <div class="ob-list">${HUSTLE_SUGGEST.map(h => `<button class="rt ${st.hustles.includes(h.name) ? 'on' : ''}" data-act="hustle" data-v="${esc(h.name)}" style="--c:${h.color}"><span class="tick">${icon('check', 14)}</span><span><b>${esc(h.name)}</b>${h.desc ? `<small>${esc(h.desc)}</small>` : ''}</span></button>`).join('')}</div>`;
    } else if (k === 'targets') {
      const T = st.targets;
      body = `<h2>Denní cíle</h2><p class="muted">Předvyplněno podle plánu na nabírání (krabičky).</p>
        <div class="form">
          <div class="field half"><label for="tK">Kalorie / den</label><input id="tK" inputmode="numeric" data-t="kcal" value="${T.kcal}"></div>
          <div class="field half"><label for="tP">Bílkoviny (g)</label><input id="tP" inputmode="numeric" data-t="protein" value="${T.protein}"></div>
          <div class="field half"><label for="tW">Voda (ml)</label><input id="tW" inputmode="numeric" data-t="water" value="${T.water}"></div>
          <div class="field half"><label for="tG">Tréninků / týden</label><input id="tG" inputmode="numeric" data-t="gym" value="${T.gym}"></div>
        </div>`;
    } else {
      const n = st.routine.morning.length + st.routine.day.length + st.routine.evening.length;
      body = `<div class="ob-hero">
          <div class="ob-mark pulse">${icon('bolt', 34)}</div>
          <h1>Systém připraven</h1>
          <p>${n} bodů rutiny · ${st.hustles.length} projektů · 7 knih · plán krabiček na 8 týdnů.</p>
          <p class="muted">Den se počítá do série, když máš skóre aspoň 60. Skóre = rutina, úkoly, deník, kalorie a trénink/voda.</p>
        </div>`;
    }
    const nav = k === 'start' ? '' : `<div class="ob-nav">
        <button class="btn ghost" data-act="back">${icon('left', 18)} Zpět</button>
        <button class="btn primary" data-act="${k === 'done' ? 'finish' : 'next'}">${k === 'done' ? 'Spustit Life Reset' : 'Dál'} ${icon('right', 18)}</button>
      </div>`;
    root.innerHTML = `<section class="ob">${k !== 'start' && k !== 'done' ? dots : ''}${body}${nav}</section>`;

    const keep = () => {
      root.querySelectorAll('[data-k]').forEach(i => { st[i.dataset.k] = i.value.trim(); });
      root.querySelectorAll('[data-t]').forEach(i => { const v = parseInt(i.value, 10); if (v > 0) st.targets[i.dataset.t] = v; });
    };
    root.onclick = e => {
      const b = e.target.closest('[data-act]');
      if (!b) return;
      const act = b.dataset.act, v = b.dataset.v;
      if (act === 'next') { keep(); step = Math.min(STEPS.length - 1, step + 1); refresh(); }
      else if (act === 'back') { keep(); step = Math.max(0, step - 1); refresh(); }
      else if (act === 'focus') { keep(); st.focus = st.focus.includes(v) ? st.focus.filter(x => x !== v) : [...st.focus, v]; refresh(); }
      else if (act === 'rt') { const l = st.routine[k]; st.routine[k] = l.includes(v) ? l.filter(x => x !== v) : [...l, v]; refresh(); }
      else if (act === 'hustle') { st.hustles = st.hustles.includes(v) ? st.hustles.filter(x => x !== v) : [...st.hustles, v]; refresh(); }
      else if (act === 'finish') { create(); step = 0; go('home'); }
    };
    root.onsubmit = async e => {
      e.preventDefault();
      const f = e.target;
      if (f.dataset.form === 'custom') {
        const v = f.v.value.trim();
        if (v) { st.custom[k].push(v); st.routine[k].push(v); refresh(); setTimeout(() => { const i = $('.inline-add input'); i && i.focus(); }, 30); }
      }
    };
    const ab = root.querySelector('#obAuth');
    if (ab) mountAuth(ab, { onDone: () => {
      if (db.one('profile')) { go('home'); }
      else { toast('Přihlášeno – v cloudu zatím žádný profil, vytvoř ho.'); step = 1; refresh(); }
    } });
    void sync;
  }
};

function create() {
  const now = new Date().toISOString();
  let order = 0;
  ['morning', 'day', 'evening'].forEach(slot => st.routine[slot].forEach(name => db.put('routine', { name, slot, days: [], order: order++, active: true })));
  HUSTLE_SUGGEST.filter(h => st.hustles.includes(h.name)).forEach((h, i) => db.put('hustles', { ...h, order: i }));
  if (!db.all('books').length) BOOKS.forEach((b, i) => db.put('books', { ...b, status: i === 0 ? 'reading' : 'want', page: 0, notes: '', takeaways: [], order: i }));
  if (!db.all('gymtpl').length) GYM_TEMPLATES.forEach(t => db.put('gymtpl', t));
  if (!db.all('subjects').length) {
    [['Programování', SCHOOLS[0], '#6E8BFF'], ['Angličtina', SCHOOLS[0], '#4FD8FF'], ['Business Fundamentals', SCHOOLS[1], '#B07CFF'], ['Microeconomics', SCHOOLS[1], '#E0B65A']]
      .forEach(([name, school, color]) => db.put('subjects', { name, school, color }));
  }
  if (!db.all('folders').length) [['Doklady', '#E0B65A'], ['Smlouvy', '#FF9F43'], ['Inspirace', '#FF6FB1']].forEach(([name, color]) => db.put('folders', { name, color }));
  setProfile({
    name: st.name || 'Matthew', callName: st.callName || 'Master M', sir: st.sir || 'pane',
    why: st.why, focus: st.focus, targets: st.targets,
    cats: CAL_CATS, schools: SCHOOLS, theme: 'arc', unlocked: ['theme-arc'], lastLevel: 1, bestStreak: 0, createdAt: now,
  });
  toast(`${icon('bolt', 18)} Profil vytvořen. Vítej, ${esc(st.callName || 'Master M')}.`, 'gold long');
}
