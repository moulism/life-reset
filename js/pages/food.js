// Jídlo: kalorický tracker + plán "Krabičky na nabírání" (8 týdnů), recepty a info.
import { db, profile } from '../store.js';
import { award, revoke } from '../game.js';
import { esc, icon, today, addDays, fmtDay, relDay, num, num1, sum, progress, openForm, toast, segTabs, chart, cssVar, mondayOf, sheet, parse } from '../ui.js';
import { PLAN, PRESETS, RECIPES, WEEKS, WEEKS_NOTE, COOK_INTRO, COOK_STEPS, HOW_TO_SHOP, STORAGE, ADJUST, HARD_TO_EAT, AFTER, recipe, planFor } from '../data/mealplan.js';

let tab = 'today';
let day = null;
const SLOTS = [['snidane', 'Snídaně'], ['obed', 'Oběd'], ['svacina', 'Svačina / shake'], ['vecere', 'Večeře'], ['jine', 'Ostatní']];

const targets = () => ({ kcal: 3000, protein: 160, water: 3000, ...((profile() || {}).targets || {}) });

function addMeal(m, d) {
  db.put('meals', { date: d, slot: m.slot || 'jine', name: m.name, kcal: Number(m.kcal) || 0, protein: Number(m.protein) || 0, ref: m.ref || '', at: new Date().toISOString() });
  checkGoal(d);
  toast(`${esc(m.name)} · ${num(m.kcal)} kcal`);
}
function checkGoal(d) {
  const t = targets();
  const k = sum(db.filter('meals', x => x.date === d), x => x.kcal);
  if (k >= t.kcal * 0.95) award('kcal:' + d, 20, 'Kalorie splněny'); else revoke('kcal:' + d);
}
function editMeal(m = {}, d, after) {
  openForm({
    title: m.id ? 'Upravit jídlo' : 'Vlastní jídlo',
    fields: [
      { k: 'name', label: 'Co', req: true, ph: 'Např. Kebab, Proteinová tyčinka' },
      { k: 'kcal', label: 'kcal', type: 'number', half: true, req: true },
      { k: 'protein', label: 'Bílkoviny (g)', type: 'number', half: true },
      { k: 'slot', label: 'Kdy', type: 'chips', options: SLOTS.map(([v, l]) => ({ v, l })), def: 'jine' },
      { k: 'save', label: 'Uložit do mých jídel (příště na 1 klik)', type: 'check' },
    ],
    values: m,
    onSave: v => {
      if (m.id) { db.put('meals', { ...m, ...v, kcal: v.kcal || 0, protein: v.protein || 0 }); checkGoal(m.date); }
      else addMeal(v, d);
      if (v.save && !db.find('foods', f => f.name === v.name)) db.put('foods', { name: v.name, kcal: v.kcal || 0, protein: v.protein || 0, slot: v.slot });
      after();
    },
    onDelete: m.id ? () => { db.del(m.id); checkGoal(m.date); after(); } : null,
  });
}

export default {
  title: 'Jídlo',
  render(root, args, { refresh }) {
    if (!day) day = today();
    let body = '';
    if (tab === 'today') body = todayView(day);
    else if (tab === 'plan') body = planView();
    else if (tab === 'recipes') body = recipesView();
    else if (tab === 'stats') body = statsView();
    else body = infoView();
    root.innerHTML = `${segTabs([['today', 'Tracker'], ['plan', 'Plán'], ['recipes', 'Recepty'], ['stats', 'Grafy'], ['info', 'Pravidla']], tab)}${body}`;
    if (tab === 'stats') drawStats(root);

    root.onclick = e => {
      const b = e.target.closest('[data-act]');
      if (!b) return;
      const act = b.dataset.act, v = b.dataset.v;
      if (act === 'tab') { tab = v; refresh(); }
      else if (act === 'day') { day = addDays(day, Number(v)); refresh(); }
      else if (act === 'day-today') { day = today(); refresh(); }
      else if (act === 'preset') { const p = PRESETS.find(x => x.id === v); addMeal({ ...p, ref: p.id }, day); refresh(); }
      else if (act === 'box') { const r = recipe(v); addMeal({ name: r.name, kcal: r.kcal, protein: r.protein, slot: b.dataset.slot, ref: r.id }, day); refresh(); }
      else if (act === 'food') { const f = db.get(b.dataset.id); addMeal(f, day); refresh(); }
      else if (act === 'food-del') { e.stopPropagation(); db.del(b.dataset.id); refresh(); }
      else if (act === 'custom') editMeal({}, day, refresh);
      else if (act === 'meal') editMeal(db.get(b.dataset.id), day, refresh);
      else if (act === 'water') {
        const d = db.find('daylog', x => x.date === day);
        db.put('daylog', { ...(d || {}), date: day, water: Math.max(0, ((d && d.water) || 0) + Number(v)) });
        refresh();
      } else if (act === 'recipe') showRecipe(v);
      else if (act === 'to-shop') {
        import('./shop.js').then(m => { m.addList(v); toast('Přidáno do nákupního seznamu'); });
      }
    };
  }
};

function todayView(d) {
  const t = targets();
  const meals = db.filter('meals', m => m.date === d).sort((a, b) => SLOTS.findIndex(s => s[0] === a.slot) - SLOTS.findIndex(s => s[0] === b.slot) || (a.at || '').localeCompare(b.at || ''));
  const kcal = sum(meals, m => m.kcal), prot = sum(meals, m => m.protein);
  const dl = db.find('daylog', x => x.date === d);
  const water = (dl && dl.water) || 0;
  const plan = planFor(d);
  const left = Math.max(0, t.kcal - kcal);
  const foods = db.all('foods');
  let planBox = '';
  if (plan.status === 'on') {
    planBox = `<div class="plan-boxes">
      <button class="box-btn" data-act="box" data-v="${plan.lunch.id}" data-slot="obed"><small>Oběd · krabička</small><b>${esc(plan.lunch.name)}</b><span>${plan.lunch.kcal} kcal · ${plan.lunch.protein} g B</span></button>
      <button class="box-btn" data-act="box" data-v="${plan.dinner.id}" data-slot="vecere"><small>Večeře · krabička</small><b>${esc(plan.dinner.name)}</b><span>${plan.dinner.kcal} kcal · ${plan.dinner.protein} g B</span></button>
    </div>${plan.cookToday ? `<p class="plan-line gold">${icon('clock', 14)} Dnes večer vaříš na Čt–Pá: ${plan.cookToday.map(id => esc(recipe(id).name)).join(' + ')} (2+2 porce)</p>` : ''}`;
  } else if (plan.status === 'weekend') {
    planBox = `<p class="plan-line">${esc(PLAN.weekend)}</p>${plan.cookToday ? `<p class="plan-line gold">${icon('clock', 14)} Dnes vaříš 6 krabiček na Po–St: ${plan.cookToday.map(id => esc(recipe(id).name)).join(' + ')} (3+3 porce)</p>` : ''}`;
  } else if (plan.status === 'before') {
    planBox = `<p class="plan-line">Plán startuje v neděli 25. 10. – vaříš ${WEEKS[0].sun.map(id => esc(recipe(id).name)).join(' + ')}. Do té doby jez normálně a drž snídani + shake.</p>`;
  } else planBox = `<p class="plan-line">${esc(AFTER)}</p>`;

  return `
    <section class="day-nav">
      <button class="icon-btn" data-act="day" data-v="-1" aria-label="Předchozí den">${icon('left')}</button>
      <button class="link-plain" data-act="day-today"><b>${esc(relDay(d))}</b><small>${esc(fmtDay(d, true))}</small></button>
      <button class="icon-btn" data-act="day" data-v="1" aria-label="Další den">${icon('right')}</button>
    </section>
    <section class="panel hud">
      <div class="kcal-big"><b>${num(kcal)}</b><span>/ ${num(t.kcal)} kcal</span></div>
      ${progress(kcal, t.kcal)}
      <p class="small muted">${left ? `Ještě ${num(left)} kcal – to je zhruba ${left >= 700 ? 'jedna krabička' : left >= 500 ? 'shake' : 'svačina'}.` : 'Cíl splněn. Přebytek drží růst.'}</p>
      <div class="macro"><span>Bílkoviny</span><b>${num(prot)} / ${num(t.protein)} g</b></div>
      ${progress(prot, t.protein, 'var(--gold)')}
      <div class="water">
        <span>${icon('drop', 16)} Voda <b>${num1(water / 1000)}</b> / ${num1(t.water / 1000)} l</span>
        <button class="btn sm" data-act="water" data-v="250">+250</button><button class="btn sm" data-act="water" data-v="500">+500</button><button class="btn sm ghost" data-act="water" data-v="-250" aria-label="Ubrat 250 ml">−</button>
      </div>
    </section>
    <section class="panel">
      <div class="panel-head"><h3>${icon('food', 18)} Podle plánu</h3>${plan.week ? `<small class="muted">týden ${plan.week.n} · ${plan.week.ab}</small>` : ''}</div>
      ${planBox}
      <div class="preset-row">${PRESETS.map(p => `<button class="chip" data-act="preset" data-v="${p.id}">${icon('plus', 14)} ${esc(p.name.replace('Snídaně ', 'Sn. '))} <small>${p.kcal}</small></button>`).join('')}</div>
      ${foods.length ? `<h4 class="sub">Moje jídla</h4><div class="preset-row">${foods.map(f => `<span class="chip food-chip"><button class="link-plain" data-act="food" data-id="${f.id}">${icon('plus', 14)} ${esc(f.name)} <small>${num(f.kcal)}</small></button><button class="x" data-act="food-del" data-id="${f.id}" aria-label="Odebrat z mých jídel">${icon('x', 12)}</button></span>`).join('')}</div>` : ''}
      <button class="btn ghost sm" data-act="custom">${icon('plus', 16)} Vlastní jídlo</button>
    </section>
    <section class="panel">
      <div class="panel-head"><h3>Snědeno</h3><small class="muted">${meals.length} položek</small></div>
      ${meals.length ? SLOTS.map(([k, l]) => {
        const list = meals.filter(m => (m.slot || 'jine') === k);
        if (!list.length) return '';
        return `<h4 class="sub">${l}</h4>${list.map(m => `<button class="row" data-act="meal" data-id="${m.id}"><div class="row-main"><p class="row-title">${esc(m.name)}</p><p class="row-meta"><span>${num(m.protein)} g bílkovin</span></p></div><b>${num(m.kcal)} kcal</b></button>`).join('')}`;
      }).join('') : '<p class="muted">Zatím nic. Klepni na jídlo z plánu výš.</p>'}
    </section>`;
}

function planView() {
  const t = today();
  const cur = planFor(t);
  const curN = cur.week ? cur.week.n : 0;
  return `
    <section class="panel">
      <h3 class="plan-title">${esc(PLAN.title)}</h3>
      <p class="muted small">${esc(COOK_INTRO)}</p>
    </section>
    <section class="panel">
      <div class="panel-head"><h3>Jak vypadá den</h3></div>
      <p class="small muted">${esc(PLAN.dayIntro)}</p>
      <table class="tbl"><thead><tr><th>Jídlo</th><th>Co</th><th>kcal</th><th>B</th></tr></thead>
      <tbody>${PLAN.day.map((r, i) => `<tr class="${i === PLAN.day.length - 1 ? 'total' : ''}"><td>${esc(r[0])}</td><td>${esc(r[1])}</td><td>${esc(r[2])}</td><td>${esc(r[3])}</td></tr>`).join('')}</tbody></table>
      ${PRESETS.map(p => `<p class="small"><b>${esc(p.name)}:</b> ${esc(p.text)} <span class="muted">~${p.kcal} kcal, ${p.protein} g B</span></p>`).join('')}
      <p class="small muted">${esc(PLAN.weekend)}</p>
    </section>
    <section class="panel">
      <div class="panel-head"><h3>Rozpis na 8 týdnů</h3></div>
      <div class="weeks">${WEEKS.map(w => `<div class="wk ${w.n === curN ? 'cur' : ''} ${w.ab === 'B' ? 'b' : ''}">
          <div class="wk-head"><b>Týden ${w.n} · ${w.ab}</b><small>od ${esc(fmtDay(w.from))}</small></div>
          <p><span class="muted">Ne (3+3):</span> ${w.sun.map(id => `<button class="link-plain" data-act="recipe" data-v="${id}">${esc(recipe(id).name)}</button>`).join(' + ')}</p>
          <p><span class="muted">St (2+2):</span> ${w.wed.map(id => `<button class="link-plain" data-act="recipe" data-v="${id}">${esc(recipe(id).name)}</button>`).join(' + ')}</p>
          ${w.check ? `<p class="gold small">${icon('target', 12)} ${esc(w.check)}</p>` : ''}
          <button class="btn xs ghost" data-act="to-shop" data-v="${w.ab}">${icon('cart', 14)} Nákup týdne ${w.ab}</button>
        </div>`).join('')}</div>
      <p class="small muted">${esc(WEEKS_NOTE)}</p>
    </section>
    <section class="panel">
      <div class="panel-head"><h3>Postup v den vaření</h3></div>
      <ol class="steps">${COOK_STEPS.map(s => `<li>${esc(s)}</li>`).join('')}</ol>
    </section>`;
}

function recipesView() {
  return `<p class="lead">Gramáže na 1 krabičku, suroviny syrové/suché. Při vaření násobíš počtem porcí (3 nebo 2).</p>
    <div class="recipe-grid">${RECIPES.map((r, i) => `<button class="recipe-card" data-act="recipe" data-v="${r.id}">
      <span class="rn">${i + 1}</span><b>${esc(r.name)}</b><small>${r.kcal} kcal · ${r.protein} g bílkovin</small></button>`).join('')}</div>`;
}

function showRecipe(id) {
  const r = recipe(id);
  let portions = 1;
  const s = sheet({
    title: r.name,
    body: `<div class="kpis"><div><span>kcal</span><b>${r.kcal}</b></div><div><span>Bílkoviny</span><b>${r.protein} g</b></div><div><span>Porce</span><b class="portions">
      <button class="btn xs" data-p="1">1</button><button class="btn xs" data-p="2">2</button><button class="btn xs" data-p="3">3</button></b></div></div>
      <h4 class="sub">Suroviny <small class="muted" id="pLab">na 1 krabičku</small></h4><ul class="ing" id="ing"></ul>
      <h4 class="sub">Postup</h4><ol class="steps">${r.steps.map(x => `<li>${esc(x)}</li>`).join('')}</ol>`
  });
  const draw = () => {
    s.body.querySelector('#ing').innerHTML = r.ing.map(x => `<li>${esc(scale(x, portions))}</li>`).join('');
    s.body.querySelector('#pLab').textContent = portions === 1 ? 'na 1 krabičku' : `na ${portions} krabičky`;
    s.body.querySelectorAll('[data-p]').forEach(b => b.classList.toggle('primary', Number(b.dataset.p) === portions));
  };
  s.body.onclick = e => { const b = e.target.closest('[data-p]'); if (b) { portions = Number(b.dataset.p); draw(); } };
  draw();
}
// násobí čísla na začátku suroviny ("150 g kuřecích prsou" → "450 g …")
function scale(text, n) {
  if (n === 1) return text;
  return text.replace(/^(\d+(?:[.,]\d+)?)(\s*(?:g|ml|ks|velké|stroužek|lžíce|lžička)?)/, (m, a, unit) => {
    const v = parseFloat(a.replace(',', '.')) * n;
    return `${String(Math.round(v * 10) / 10).replace('.', ',')}${unit}`;
  }).replace(/^½/, n === 2 ? '1' : '1½');
}

function statsView() {
  const t = today();
  const days = Array.from({ length: 14 }, (_, i) => addDays(t, i - 13));
  const k = days.map(d => sum(db.filter('meals', m => m.date === d), m => m.kcal));
  const logged = k.filter(x => x > 0);
  const avg = logged.length ? sum(logged) / logged.length : 0;
  const hit = k.filter(x => x >= targets().kcal * 0.95).length;
  const weights = db.all('weights').sort((a, b) => a.date.localeCompare(b.date));
  const gain = gainInfo(weights);
  return `
    <section class="panel hud"><div class="kpis">
      <div><span>Průměr 14 dní</span><b>${num(avg)}<small> kcal</small></b></div>
      <div><span>Splněné dny</span><b>${hit}<small>/14</small></b></div>
      <div><span>Váha</span><b>${weights.length ? num1(weights[weights.length - 1].kg) + '<small> kg</small>' : '–'}</b></div>
    </div></section>
    <section class="panel"><div class="panel-head"><h3>Kalorie – 14 dní</h3></div><div class="chart-box"><canvas id="fK"></canvas></div></section>
    <section class="panel"><div class="panel-head"><h3>Bílkoviny – 14 dní</h3></div><div class="chart-box"><canvas id="fP"></canvas></div></section>
    <section class="panel"><div class="panel-head"><h3>${icon('target', 18)} Úpravy podle váhy</h3><a class="link" href="#/gym">Zapsat váhu</a></div>
      ${gain ? `<p>Přírůstek za poslední 2 týdny: <b class="${gain.v >= 0.4 && gain.v <= 1.2 ? 'green' : 'gold'}">${gain.v >= 0 ? '+' : ''}${num1(gain.v)} kg</b> <span class="muted small">(týdenní průměry)</span></p><p class="plan-line">${esc(gain.tip)}</p>` : '<p class="muted">Potřebuju vážení aspoň ze 2 týdnů (3× týdně ráno nalačno). Pak ti řeknu, jestli přidat nebo ubrat.</p>'}
    </section>`;
}
function gainInfo(ws) {
  if (ws.length < 2) return null;
  const t = today();
  const avg = (a, b) => { const l = ws.filter(w => w.date > a && w.date <= b); return l.length ? sum(l, w => w.kg) / l.length : null; };
  const now = avg(addDays(t, -7), t), before = avg(addDays(t, -21), addDays(t, -14));
  if (now == null || before == null) return null;
  const v = now - before;
  const tip = v < 0.4 ? ADJUST[0][1] : v > 1.2 ? ADJUST[2][1] : ADJUST[1][1];
  return { v, tip };
}
function drawStats(root) {
  const t = today();
  const days = Array.from({ length: 14 }, (_, i) => addDays(t, i - 13));
  const T = targets();
  const lab = days.map(d => `${parse(d).getDate()}.`);
  const line = v => ({ type: 'line', data: days.map(() => v), borderColor: cssVar('--gold'), borderDash: [4, 4], pointRadius: 0, borderWidth: 1.5 });
  chart(root.querySelector('#fK'), { type: 'bar', data: { labels: lab, datasets: [{ data: days.map(d => sum(db.filter('meals', m => m.date === d), m => m.kcal)), backgroundColor: cssVar('--acc'), borderRadius: 4, maxBarThickness: 22 }, line(T.kcal)] }, options: { scales: { y: { beginAtZero: true }, x: { grid: { display: false } } } } });
  chart(root.querySelector('#fP'), { type: 'bar', data: { labels: lab, datasets: [{ data: days.map(d => sum(db.filter('meals', m => m.date === d), m => m.protein)), backgroundColor: cssVar('--green'), borderRadius: 4, maxBarThickness: 22 }, line(T.protein)] }, options: { scales: { y: { beginAtZero: true }, x: { grid: { display: false } } } } });
}

function infoView() {
  return `
    <section class="panel"><div class="panel-head"><h3>Základy</h3></div>
      <p>${esc(PLAN.goal)}</p><p class="muted">${esc(PLAN.why)}</p></section>
    <section class="panel"><div class="panel-head"><h3>Pravidla</h3></div><ol class="steps">${PLAN.rules.map(r => `<li>${esc(r)}</li>`).join('')}</ol></section>
    <section class="panel"><div class="panel-head"><h3>Jak nakupovat</h3><a class="link" href="#/shop">Nákupní seznam</a></div><ul class="ul">${HOW_TO_SHOP.map(r => `<li>${esc(r)}</li>`).join('')}</ul></section>
    <section class="panel"><div class="panel-head"><h3>Skladování</h3></div><ul class="ul">${STORAGE.map(r => `<li>${esc(r)}</li>`).join('')}</ul></section>
    <section class="panel"><div class="panel-head"><h3>Úpravy podle váhy (týdny 3, 5, 7)</h3></div>
      <table class="tbl"><thead><tr><th>Přírůstek za 2 týdny</th><th>Co udělat</th></tr></thead><tbody>${ADJUST.map(r => `<tr><td>${esc(r[0])}</td><td>${esc(r[1])}</td></tr>`).join('')}</tbody></table></section>
    <section class="panel"><div class="panel-head"><h3>Když se nedaří sníst všechno</h3></div><ul class="ul">${HARD_TO_EAT.map(r => `<li>${esc(r)}</li>`).join('')}</ul></section>
    <p class="plan-line">${esc(AFTER)}</p>`;
}
void mondayOf;
