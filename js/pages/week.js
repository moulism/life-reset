// Týden & hodiny: týdenní přehled (bloky po dnech, rozpočet hodin, stopky), editor rozvrhu a nedělní příprava.
import { db, profile, setProfile } from '../store.js';
import { esc, icon, today, addDays, fmtDay, parse, mondayOf, weekday, DAYS_SHORT, openForm, toast, sheet, confirmSheet, clamp, sum, SWATCHES, relDay } from '../ui.js';
import {
  DAY_ORDER, areas, area, blockMins, hrs, places, placeOn, setPlace, weekPlan, blocksOn, statusFor, setBlock, moveBlock,
  weekDays, weekStats, doneMins, timer, startTimer, stopTimer, logTime, fromMin,
} from '../week-core.js';
import { award, revoke } from '../game.js';
import { has } from '../mods.js';
import { icsBlocks } from '../common.js';
import { download } from '../ui.js';

const SUB = { plan: 'Rozvrh týdne', review: 'Nedělní příprava' };
let selDay = null;

export default {
  title: a => SUB[a[0]] || 'Týden',
  render(root, args, ctx) {
    if (args[0] === 'plan') return planView(root, ctx);
    if (args[0] === 'review') return reviewView(root, ctx, args[1]);
    return weekView(root, ctx, args[0]);
  },
  cleanup() { clearInterval(tick); },
};

let tick = null;

// ---------- sdílené kousky ----------
export function budgetBars(stats, compact = false) {
  if (!stats.length) return `<p class="muted small">Zatím žádné oblasti. <a class="link" href="#/week/plan">Přidej je v rozvrhu</a>.</p>`;
  return stats.map(a => {
    const pct = a.target ? clamp(a.done / a.target * 100, 0, 100) : 0;
    const left = Math.max(0, a.target - a.done);
    const over = a.target && a.done > a.target;
    return `<div class="bud ${compact ? 'compact' : ''}" style="--c:${a.color}">
      <div class="bud-top"><span><i class="cat-dot"></i>${esc(a.name)}</span><b>${hrs(a.done)}<small> / ${a.target ? hrs(a.target) : '—'}</small></b></div>
      <div class="bar"><i style="width:${pct}%"></i></div>
      ${compact ? '' : `<small class="muted">${a.target ? (over ? `o ${hrs(a.done - a.target)} víc než plán` : `zbývá ${hrs(left)}`) : 'bez cíle'}</small>`}
    </div>`;
  }).join('');
}

export function timerCard() {
  const t = timer();
  const A = areas();
  if (!A.length) return '';
  if (t && t.area) {
    const a = area(t.area);
    return `<section class="panel timer on" style="--c:${a.color}">
      <div class="timer-row"><span class="pulse-dot"></span><div class="row-main"><p class="row-title">${esc(a.name)}${t.note ? ` · ${esc(t.note)}` : ''}</p><p class="row-meta"><span>běží od ${new Date(t.started).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}</span></p></div>
      <b class="timer-clock" data-started="${esc(t.started)}">0:00</b></div>
      <button class="btn primary big" data-act="t-stop">${icon('check', 18)} Stop a zapsat</button>
    </section>`;
  }
  return `<section class="panel timer">
    <div class="panel-head"><h3>${icon('clock', 18)} Stopky</h3><button class="link" data-act="t-log">Zapsat čas ručně</button></div>
    <div class="chips">${A.map(a => `<button class="chip" data-act="t-start" data-id="${a.id}" style="--c:${a.color}"><i class="dot"></i>${esc(a.name)}</button>`).join('')}</div>
    <p class="small muted">Klepni, na čem začínáš pracovat. Po stopnutí se čas připíše do týdne.</p>
  </section>`;
}

export function startClock(root) {
  clearInterval(tick);
  const upd = () => root.querySelectorAll('.timer-clock').forEach(el => {
    const s = Math.max(0, Math.floor((Date.now() - Date.parse(el.dataset.started)) / 1000));
    el.textContent = `${Math.floor(s / 3600)}:${String(Math.floor(s / 60) % 60).padStart(2, '0')}${s < 3600 ? ':' + String(s % 60).padStart(2, '0') : ''}`;
  });
  upd();
  tick = setInterval(upd, 1000);
}

export function blockRow(b, date) {
  const a = area(b.area);
  const st = statusFor(date, b);
  const mins = blockMins(b);
  const time = b.start ? `${esc(b.start)}<br><small>${esc(b.end || fromMin(toM(b.start) + mins))}</small>` : `<small>${hrs(mins)}</small>`;
  return `<div class="row blk ${st && st.status === 'done' ? 'done' : ''} ${st && st.status === 'skip' ? 'skip' : ''}" style="--c:${a.color}" data-act="b-menu" data-id="${b.id}" data-date="${date}">
    <span class="ev-time">${time}</span>
    <div class="row-main"><p class="row-title">${esc(b.title || a.name)}</p><p class="row-meta"><span><i class="dot" style="--c:${a.color}"></i>${esc(a.name)}</span>${b.place ? `<span>${esc(b.place)}</span>` : ''}${b.movedFrom ? `<span>přesunuto z ${esc(fmtDay(b.movedFrom))}</span>` : ''}${st && st.status === 'done' && st.mins !== mins ? `<span>${hrs(st.mins)}</span>` : ''}${st && st.status === 'skip' ? '<span>vynecháno</span>' : ''}</p></div>
    <button class="tick" data-act="b-done" data-id="${b.id}" data-date="${date}" aria-label="Hotovo" aria-pressed="${!!(st && st.status === 'done')}">${icon('check', 14)}</button>
  </div>`;
}
const toM = t => { const [h, m] = t.split(':').map(Number); return h * 60 + (m || 0); };

// klepnutí na řádek bloku → co s ním
export function blockMenu(b, date, after) {
  const st = statusFor(date, b);
  const mins = blockMins(b);
  const s = sheet({
    title: b.title || area(b.area).name,
    body: `<p class="muted small">${esc(fmtDay(date, true))} · ${b.start ? `${esc(b.start)}–${esc(b.end || '')} · ` : ''}plán ${hrs(mins)}</p>
      <div class="field"><label for="bmM">Kolik jsi reálně odmakal (minuty)</label><input id="bmM" type="number" inputmode="numeric" min="0" step="5" value="${st && st.status === 'done' ? st.mins : mins}"></div>
      <div class="row-btns"><button class="btn primary" data-a="done">${icon('check', 18)} Hotovo</button></div>
      <div class="row-btns">
        <button class="btn ghost sm" data-a="skip">Vynechat dnes</button>
        <button class="btn ghost sm" data-a="move">Přesunout</button>
        ${st ? `<button class="btn ghost sm" data-a="clear">Vrátit</button>` : ''}
        <button class="btn ghost sm" data-a="edit">${icon('edit', 16)} Upravit blok</button>
      </div>`,
  });
  s.body.onclick = e => {
    const a = e.target.closest('[data-a]');
    if (!a) return;
    const k = a.dataset.a;
    const ref = `blk:${date}:${b.id}`;
    if (k === 'done') {
      const m = parseInt(s.body.querySelector('#bmM').value, 10);
      setBlock(b.movedFrom || date, b, 'done', m >= 0 ? m : mins);
      award(ref, 10, 'Blok');
    } else if (k === 'skip') { setBlock(b.movedFrom || date, b, 'skip'); revoke(ref); }
    else if (k === 'clear') { setBlock(b.movedFrom || date, b, ''); revoke(ref); }
    else if (k === 'edit') { s.close(); editBlock(db.get(b.id), after); return; }
    else if (k === 'move') {
      s.close();
      const days = Array.from({ length: 7 }, (_, i) => addDays(date, i + 1));
      openForm({
        title: 'Přesunout na', fields: [{ k: 'to', label: 'Den', type: 'chips', options: days.map(d => ({ v: d, l: relDay(d) })), def: days[0] }],
        onSave: v => { moveBlock(b.movedFrom || date, b, v.to); toast(`Přesunuto na ${relDay(v.to)}`); after(); }, saveLabel: 'Přesunout',
      });
      return;
    }
    s.close();
    after();
  };
}
export function toggleBlock(b, date) {
  const st = statusFor(date, b);
  const ref = `blk:${date}:${b.id}`;
  if (st && st.status === 'done') { setBlock(b.movedFrom || date, b, ''); revoke(ref); }
  else { setBlock(b.movedFrom || date, b, 'done'); award(ref, 10, 'Blok'); }
}

export function handleTimerAct(act, el, after) {
  if (act === 't-start') { startTimer(el.dataset.id); toast(`Stopky: ${esc(area(el.dataset.id).name)}`); after(); return true; }
  if (act === 't-stop') { const t = timer(); const m = stopTimer(); if (m) { toast(`Zapsáno ${hrs(m)} · ${esc(area(t.area).name)}`); award('tl:' + t.started, Math.min(30, Math.round(m / 6)), 'Čas'); } after(); return true; }
  if (act === 't-log') { logTimeForm(after); return true; }
  return false;
}
export function logTimeForm(after, preArea = '') {
  const A = areas();
  openForm({
    title: 'Zapsat odpracovaný čas',
    fields: [
      { k: 'area', label: 'Oblast', type: 'chips', options: A.map(a => ({ v: a.id, l: a.name, c: a.color })), def: preArea || (A[0] && A[0].id) },
      { k: 'mins', label: 'Minuty', type: 'number', step: '5', min: 0, req: true, ph: '60', half: true },
      { k: 'date', label: 'Den', type: 'date', def: today(), half: true },
      { k: 'note', label: 'Na čem (volitelné)' },
    ],
    onSave: v => { if (!(v.mins > 0)) { toast('Zadej minuty', 'warn'); return false; } logTime(v.area, v.mins, v.date || today(), v.note); toast('Zapsáno'); after(); },
  });
}

// ---------- týdenní přehled ----------
function weekView(root, { refresh, go }, arg) {
  const base = arg && /^\d{4}-\d{2}-\d{2}$/.test(arg) ? arg : today();
  const days = weekDays(base);
  if (!selDay || !days.includes(selDay)) selDay = days.includes(today()) ? today() : days[0];
  const stats = weekStats(base);
  const totalT = sum(stats, a => a.target), totalD = sum(stats, a => a.done);
  const pl = places();
  const list = blocksOn(selDay);
  const isThis = mondayOf(base) === mondayOf(today());
  const noBlocks = !db.all('blocks').length;
  const sunday = weekday(today()) === 0 && isThis;
  const nextReviewed = db.find('weekplan', x => x.week === addDays(mondayOf(today()), 7) && x.reviewed);

  root.innerHTML = `
    <section class="cal-head">
      <button class="icon-btn" data-act="prevw" aria-label="Předchozí týden">${icon('left')}</button>
      <h2>${parse(days[0]).getDate()}. ${parse(days[0]).getMonth() + 1}. – ${parse(days[6]).getDate()}. ${parse(days[6]).getMonth() + 1}.</h2>
      <button class="icon-btn" data-act="nextw" aria-label="Další týden">${icon('right')}</button>
      ${isThis ? '' : `<button class="btn sm ghost" data-act="thisw">Tento</button>`}
    </section>

    ${sunday && !nextReviewed ? `<a class="panel banner" href="#/week/review">${icon('sunrise', 22)}<div><b>Neděle = příprava týdne</b><small>15 minut: jak dopadl týden a kde budeš příští dny.</small></div>${icon('right', 18)}</a>` : ''}

    <section class="panel">
      <div class="panel-head"><h3>${icon('chart', 18)} Hodiny tento týden</h3><b class="tot">${hrs(totalD)}<small> / ${hrs(totalT)}</small></b></div>
      ${budgetBars(stats)}
    </section>

    ${isThis ? timerCard() : ''}

    <section class="week-strip wk">${days.map(d => {
      const bl = blocksOn(d);
      const dn = bl.filter(b => { const s = statusFor(d, b); return s && s.status === 'done'; }).length;
      return `<button class="ws ${d === selDay ? 'on' : ''} ${d === today() ? 'today' : ''}" data-act="day" data-v="${d}">
        <small>${DAYS_SHORT[weekday(d)]}</small><b>${parse(d).getDate()}</b>
        ${pl.length ? `<em class="pl">${esc((placeOn(d) || '–').slice(0, 3))}</em>` : ''}
        <i class="mini-bar"><u style="width:${bl.length ? dn / bl.length * 100 : 0}%"></u></i></button>`;
    }).join('')}</section>

    <section class="panel">
      <div class="panel-head"><h3>${esc(fmtDay(selDay, true))}</h3>
        ${pl.length ? `<div class="chips pl-chips">${pl.map(p => `<button class="chip sm ${placeOn(selDay) === p ? 'on' : ''}" data-act="place" data-v="${esc(p)}">${esc(p)}</button>`).join('')}</div>` : ''}</div>
      ${list.length ? list.map(b => blockRow(b, selDay)).join('') : `<p class="muted">${noBlocks ? 'Rozvrh je prázdný. Přidej bloky – škola, práce, trénink…' : 'Na tenhle den nic v rozvrhu.'}</p>`}
      <div class="row-btns end"><button class="btn ghost sm" data-act="log">${icon('clock', 16)} Zapsat čas</button><button class="btn ghost sm" data-act="new">${icon('plus', 16)} Blok</button></div>
    </section>

    <div class="row-btns">
      <a class="btn ghost" href="#/week/plan">${icon('edit', 18)} Upravit rozvrh</a>
      <a class="btn ghost" href="#/week/review">${icon('sunrise', 18)} Příprava týdne</a>
    </div>
    ${has('calendar') ? `<p class="small muted center">Události mimo rozvrh (lékař, akce) patří do <a class="link" href="#/calendar">Kalendáře</a>.</p>` : ''}`;

  startClock(root);
  root.onclick = e => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const act = b.dataset.act;
    if (handleTimerAct(act, b, refresh)) return;
    if (act === 'prevw') { selDay = null; go('week/' + addDays(days[0], -7)); }
    else if (act === 'nextw') { selDay = null; go('week/' + addDays(days[0], 7)); }
    else if (act === 'thisw') { selDay = null; go('week'); }
    else if (act === 'day') { selDay = b.dataset.v; refresh(); }
    else if (act === 'place') { setPlace(selDay, b.dataset.v); refresh(); }
    else if (act === 'new') editBlock({ days: [weekday(selDay)] }, refresh);
    else if (act === 'log') logTimeForm(refresh);
    else if (act === 'b-done') { e.stopPropagation(); const blk = list.find(x => x.id === b.dataset.id); if (blk) { toggleBlock(blk, b.dataset.date); refresh(); } }
    else if (act === 'b-menu') { const blk = list.find(x => x.id === b.dataset.id); if (blk) blockMenu(blk, b.dataset.date, refresh); }
  };
}

// ---------- editor rozvrhu ----------
function planView(root, { refresh }) {
  const A = areas();
  const B = db.all('blocks');
  const pl = places();
  root.innerHTML = `
    <p class="lead">Tvůj ideální týden. Každý blok se opakuje ve vybrané dny. Bez času = flexibilní blok (jen délka), třeba „Práce 2 h“ kdykoli během dne.</p>
    <section class="panel">
      <div class="panel-head"><h3>${icon('target', 18)} Oblasti a cíl hodin</h3><button class="btn sm ghost" data-act="area-new">${icon('plus', 16)} Oblast</button></div>
      ${A.length ? A.map(a => {
        const planned = sum(B.filter(b => b.area === a.id && b.active !== false), b => blockMins(b) * (b.days || []).length);
        return `<button class="row" data-act="area" data-id="${a.id}"><i class="cat-dot" style="--c:${a.color}"></i><div class="row-main"><p class="row-title">${esc(a.name)}</p><p class="row-meta"><span>cíl ${a.budget ? hrs(a.budget * 60) : '—'} / týden</span><span>v rozvrhu ${hrs(planned)}</span></p></div>${icon('right', 18)}</button>`;
      }).join('') : `<p class="muted">Začni oblastmi – na co chceš mít čas (škola, práce, projekt, trénink…).</p>`}
    </section>
    ${DAY_ORDER.map(d => {
      const list = B.filter(b => (b.days || []).includes(d)).sort((a, b) => (a.start || '99').localeCompare(b.start || '99'));
      return `<section class="panel day-plan">
        <div class="panel-head"><h3>${['Neděle', 'Pondělí', 'Úterý', 'Středa', 'Čtvrtek', 'Pátek', 'Sobota'][d]}</h3><small class="muted">${hrs(sum(list.filter(b => b.active !== false), blockMins))}</small></div>
        ${list.map(b => { const a = area(b.area); return `<button class="row blk plan ${b.active === false ? 'off' : ''}" data-act="edit" data-id="${b.id}" style="--c:${a.color}"><span class="ev-time">${b.start ? `${esc(b.start)}<br><small>${esc(b.end || '')}</small>` : `<small>${hrs(blockMins(b))}</small>`}</span><div class="row-main"><p class="row-title">${esc(b.title || a.name)}</p><p class="row-meta"><span>${esc(a.name)}</span>${b.place ? `<span>${esc(b.place)}</span>` : ''}${b.active === false ? '<span>pozastaveno</span>' : ''}</p></div></button>`; }).join('') || '<p class="muted small">Volno.</p>'}
        <button class="btn ghost xs" data-act="new" data-day="${d}">${icon('plus', 14)} Blok</button>
      </section>`;
    }).join('')}
    <section class="panel">
      <div class="panel-head"><h3>${icon('calendar', 18)} Do kalendáře v iPhonu</h3></div>
      <p class="small muted">Stáhne rozvrh (bloky s časem) jako opakované události. Na iPhonu soubor otevři → Přidat vše. Připomínky pak hlídá systém, i když je appka zavřená.</p>
      <button class="btn ghost" data-act="ics">${icon('download', 18)} Exportovat rozvrh (.ics)</button>
    </section>
    <section class="panel">
      <div class="panel-head"><h3>Místa</h3></div>
      <p class="small muted">Když žiješ na dvou místech (např. Praha a Plzeň), bloky můžeš vázat na místo. Ukážou se jen ve dny, kdy tam jsi.</p>
      <form class="inline-add" data-form="places"><input name="v" value="${esc(pl.join(', '))}" placeholder="Např. Praha, Plzeň"><button class="btn sm">Uložit</button></form>
      ${pl.length ? `<div class="field"><label>Kde bývám obvykle</label><div class="place-def">${DAY_ORDER.map(d => `<label><span>${DAYS_SHORT[d]}</span><select data-pd="${d}">${pl.map(p => `<option ${((profile().placeDefault || {})[d] || pl[0]) === p ? 'selected' : ''}>${esc(p)}</option>`).join('')}</select></label>`).join('')}</div></div>` : ''}
    </section>`;
  root.onclick = e => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const act = b.dataset.act;
    if (act === 'area-new') editArea({}, refresh);
    else if (act === 'area') editArea(db.get(b.dataset.id), refresh);
    else if (act === 'new') { if (!areas().length) { toast('Nejdřív přidej oblast', 'warn'); editArea({}, refresh); return; } editBlock({ days: b.dataset.day ? [Number(b.dataset.day)] : [] }, refresh); }
    else if (act === 'edit') editBlock(db.get(b.dataset.id), refresh);
    else if (act === 'ics') { if (!B.some(x => x.start)) { toast('Rozvrh nemá bloky s časem', 'warn'); return; } download('life-reset-rozvrh.ics', icsBlocks(B), 'text/calendar'); }
  };
  root.onchange = e => {
    const s = e.target.closest('[data-pd]');
    if (!s) return;
    setProfile({ placeDefault: { ...(profile().placeDefault || {}), [s.dataset.pd]: s.value } });
    toast('Uloženo');
  };
  root.onsubmit = e => {
    e.preventDefault();
    if (e.target.dataset.form !== 'places') return;
    const list = e.target.v.value.split(/[,;]/).map(x => x.trim()).filter(Boolean).slice(0, 4);
    const def = {};
    DAY_ORDER.forEach(d => { const cur = (profile().placeDefault || {})[d]; def[d] = list.includes(cur) ? cur : (list[0] || ''); });
    setProfile({ places: list, placeDefault: def });
    toast('Uloženo');
    refresh();
  };
}

export function editArea(a = {}, after = () => {}) {
  openForm({
    title: a.id ? 'Upravit oblast' : 'Nová oblast',
    fields: [
      { k: 'name', label: 'Název', req: true, ph: 'Např. Škola, Práce, MetroMood' },
      { k: 'budget', label: 'Cíl hodin za týden', type: 'number', step: '0.5', min: 0, ph: 'Např. 10', hint: 'Nech prázdné = cíl se spočítá z bloků v rozvrhu' },
      { k: 'color', label: 'Barva', type: 'color' },
    ],
    values: { color: SWATCHES[areas().length % SWATCHES.length], ...a },
    onSave: v => { db.put('areas', { order: areas().length, ...a, ...v, budget: v.budget || 0 }); after(); },
    onDelete: a.id ? async () => {
      const n = db.filter('blocks', b => b.area === a.id).length;
      db.filter('blocks', b => b.area === a.id).forEach(b => db.del(b.id));
      db.del(a.id);
      if (n) toast(`Smazáno i ${n} bloků`);
      after();
    } : null,
  });
}

export function editBlock(b = {}, after = () => {}) {
  const A = areas();
  const days = b.days || [];
  const pl = places();
  const REM = [{ v: -1, l: 'Bez připomínky' }, { v: 0, l: 'V čas začátku' }, { v: 10, l: '10 min předem' }, { v: 30, l: '30 min předem' }];
  openForm({
    title: b.id ? 'Upravit blok' : 'Nový blok',
    fields: [
      { k: 'area', label: 'Oblast', type: 'chips', options: A.map(a => ({ v: a.id, l: a.name, c: a.color })), def: A[0] && A[0].id },
      { k: 'title', label: 'Název (volitelné)', ph: 'Např. Přednášky, Gym – nohy, Focení' },
      { k: 'start', label: 'Od', type: 'time', half: true },
      { k: 'end', label: 'Do', type: 'time', half: true },
      { k: 'mins', label: 'Délka bez času (min)', type: 'number', step: '15', min: 0, ph: '60', hint: 'Jen když nevyplníš Od–Do' },
      ...(pl.length ? [{ k: 'place', label: 'Místo', type: 'chips', options: [{ v: '', l: 'Kdekoli' }, ...pl.map(p => ({ v: p, l: p }))], def: '' }] : []),
      { k: 'remind', label: 'Připomínka', type: 'select', options: REM, def: b.start ? 10 : -1 },
      { k: 'active', label: 'Aktivní', type: 'check', def: true },
    ],
    values: { active: b.active !== false, ...b },
    extra: `<div class="field"><label>Dny</label><div class="days-pick">${DAY_ORDER.map(d => `<label><input type="checkbox" name="day" value="${d}" ${days.includes(d) ? 'checked' : ''}><span>${DAYS_SHORT[d]}</span></label>`).join('')}</div></div>`,
    onSave: (v, form) => {
      const ds = [...form.querySelectorAll('[name="day"]:checked')].map(x => Number(x.value));
      if (!ds.length) { toast('Vyber aspoň jeden den', 'warn'); return false; }
      if (!v.area) { toast('Vyber oblast', 'warn'); return false; }
      if ((v.start && !v.end) || (!v.start && v.end)) { toast('Vyplň Od i Do, nebo nic', 'warn'); return false; }
      db.put('blocks', { ...b, ...v, days: ds, mins: v.start ? null : (v.mins || 60), remind: Number(v.remind), movedFrom: undefined });
      window.dispatchEvent(new CustomEvent('lr:events'));
      after();
    },
    onDelete: b.id ? () => { db.del(b.id); after(); } : null,
  });
}

// ---------- nedělní příprava ----------
function reviewView(root, { refresh, go }) {
  const t = today();
  // v neděli hodnotíme právě končící týden, jinak ten minulý
  const lastMon = weekday(t) === 0 ? mondayOf(t) : addDays(mondayOf(t), -7);
  const lastDays = Array.from({ length: 7 }, (_, i) => addDays(lastMon, i));
  const nextMon = weekday(t) === 0 ? addDays(mondayOf(t), 7) : mondayOf(t);
  const nextDays = Array.from({ length: 7 }, (_, i) => addDays(nextMon, i));
  const stats = weekStats(lastMon);
  const tot = sum(stats, a => a.target), dn = sum(stats, a => a.done);
  const blocksAll = lastDays.flatMap(d => blocksOn(d).map(b => ({ b, d })));
  const blocksDone = blocksAll.filter(({ b, d }) => { const s = statusFor(d, b); return s && s.status === 'done'; }).length;
  const pl = places();
  const wp = db.find('weekplan', x => x.week === nextMon) || { week: nextMon, places: {} };
  const which = nextMon === mondayOf(t) ? 'tento týden' : 'příští týden';
  const best = stats.filter(a => a.target).sort((a, b) => b.done / b.target - a.done / a.target)[0];
  const worst = stats.filter(a => a.target).sort((a, b) => a.done / a.target - b.done / b.target)[0];

  root.innerHTML = `
    <section class="panel hud">
      <div class="panel-head"><h3>${icon('chart', 18)} Týden ${parse(lastDays[0]).getDate()}. – ${parse(lastDays[6]).getDate()}. ${parse(lastDays[6]).getMonth() + 1}.</h3></div>
      <div class="kpis">
        <div><span>Hodiny</span><b>${Math.round(dn / 60)}<small>/${Math.round(tot / 60)}</small></b></div>
        <div><span>Bloky</span><b>${blocksDone}<small>/${blocksAll.length}</small></b></div>
        <div><span>Plnění</span><b>${tot ? Math.round(dn / tot * 100) : 0}<small>%</small></b></div>
      </div>
      <div class="sp"></div>
      ${budgetBars(stats, true)}
      ${best && worst && best.id !== worst.id ? `<p class="small">Nejlíp: <b>${esc(best.name)}</b>. Nejvíc zaostalo: <b>${esc(worst.name)}</b> – zkus mu příští týden dát pevný čas.</p>` : ''}
    </section>

    ${pl.length ? `<section class="panel">
      <div class="panel-head"><h3>${icon('calendar', 18)} Kde budeš ${which}</h3></div>
      <div class="place-week">${nextDays.map(d => {
        const wd = String(weekday(d));
        const cur = wp.places && wp.places[wd] != null ? wp.places[wd] : ((profile().placeDefault || {})[wd] || pl[0]);
        return `<div class="pw-day"><span>${DAYS_SHORT[weekday(d)]} ${parse(d).getDate()}.</span><div class="chips">${pl.map(p => `<button class="chip sm ${cur === p ? 'on' : ''}" data-act="pl" data-d="${d}" data-v="${esc(p)}">${esc(p)}</button>`).join('')}</div></div>`;
      }).join('')}</div>
    </section>` : ''}

    <section class="panel">
      <div class="panel-head"><h3>${icon('target', 18)} 3 priority na ${which}</h3></div>
      <form class="form" data-form="focus">
        ${[0, 1, 2].map(i => `<div class="field"><input name="f${i}" value="${esc((wp.focus || [])[i] || '')}" placeholder="${['Např. Odevzdat esej', 'Např. 3× trénink', 'Např. Drop 02 – focení'][i]}"></div>`).join('')}
        <label class="check-field"><input type="checkbox" name="mk" ${wp.reviewed ? '' : 'checked'}><span class="cbox">${icon('check', 14)}</span><span>${nextMon === mondayOf(t) ? 'Přidat je jako úkoly na dnes' : 'Přidat je jako úkoly na pondělí'}</span></label>
        <button class="btn primary big" type="submit">${icon('check', 18)} Týden připravený</button>
      </form>
    </section>
    <div class="row-btns"><a class="btn ghost" href="#/week/plan">${icon('edit', 18)} Upravit rozvrh</a></div>`;

  root.onclick = e => {
    const b = e.target.closest('[data-act="pl"]');
    if (!b) return;
    setPlace(b.dataset.d, b.dataset.v);
    refresh();
  };
  root.onsubmit = e => {
    e.preventDefault();
    const f = e.target;
    const focus = [0, 1, 2].map(i => f[`f${i}`].value.trim()).filter(Boolean);
    const cur = db.find('weekplan', x => x.week === nextMon) || { week: nextMon, places: {} };
    const due = nextMon < today() ? today() : nextMon;
    if (f.mk.checked && has('tasks')) focus.forEach(title => { if (!db.find('tasks', x => x.title === title && x.due === due)) db.put('tasks', { title, due, prio: 3, done: false, created: new Date().toISOString() }); });
    db.put('weekplan', { ...cur, focus, reviewed: new Date().toISOString() });
    award('review:' + nextMon, 40, 'Příprava týdne');
    toast(`${icon('bolt', 18)} Týden připravený`, 'gold');
    go('week/' + nextMon);
  };
  void weekPlan; void doneMins;
}
