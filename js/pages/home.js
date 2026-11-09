import { db, profile } from '../store.js';
import { stats, award, revoke, routinesFor, STREAK_MIN } from '../game.js';
import { esc, icon, today, fmtDay, num, toast, progress, sum, clamp } from '../ui.js';
import { taskRow, toggleTask, editTask, eventsOn, cat, newNote, editEvent, editTx } from '../common.js';
import { planFor, PLAN } from '../data/mealplan.js';
import { has } from '../mods.js';
import { blocksOn, statusFor, nowNext, weekStats, places, placeOn, setPlace, area, hrs, timer } from '../week-core.js';
import { blockRow, blockMenu, toggleBlock, timerCard, startClock, handleTimerAct, budgetBars } from './week.js';
import { weekday, addDays, mondayOf } from '../ui.js';
import { pushOn, pushSupported } from '../reminders.js';
import { getMeta, setMeta } from '../store.js';

export function greeting(h = new Date().getHours()) {
  if (h >= 4 && h < 11) return 'Dobré ráno';
  if (h >= 11 && h < 17) return 'Dobré odpoledne';
  if (h >= 17 && h < 22) return 'Dobrý večer';
  return 'Dobrou noc';
}

const SLOTS = [['morning', 'Ráno', 'sunrise'], ['day', 'Přes den', 'sun'], ['evening', 'Večer', 'moon']];
const MOODS = ['Na dně', 'Slabší', 'OK', 'Dobrý', 'Skvělý'];

function reactor(score, s) {
  const N = 48;
  const on = Math.round(score / 100 * N);
  const ticks = Array.from({ length: N }, (_, i) => {
    const a = (i / N) * Math.PI * 2 - Math.PI / 2;
    const r1 = 78, r2 = i % 4 === 0 ? 92 : 88;
    const x1 = 100 + r1 * Math.cos(a), y1 = 100 + r1 * Math.sin(a);
    const x2 = 100 + r2 * Math.cos(a), y2 = 100 + r2 * Math.sin(a);
    return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" class="${i < on ? 'on' : ''}"/>`;
  }).join('');
  const lvlPct = clamp((s.xp - s.cur) / (s.next - s.cur), 0, 1);
  const C = 2 * Math.PI * 64;
  return `<svg viewBox="0 0 200 200" class="reactor-svg" role="img" aria-label="Skóre dne ${score} ze 100">
    <g class="ticks">${ticks}</g>
    <circle cx="100" cy="100" r="64" class="lvl-track"/>
    <circle cx="100" cy="100" r="64" class="lvl-fill" stroke-dasharray="${(C * lvlPct).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 100 100)"/>
    <text x="100" y="104" class="score">${score}</text>
    <text x="100" y="126" class="score-l">skóre dne</text>
  </svg>`;
}

export default {
  title: 'Dnes',
  render(root, args, { refresh }) {
    const p = profile();
    const t = today();
    const s = stats();
    const parts = s.today.parts;

    // rutina
    const routines = routinesFor(t, db.all('routine').filter(r => r.active !== false)).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const log = db.find('routinelog', l => l.date === t);
    const done = (log && log.done) || [];
    const slotHTML = SLOTS.map(([k, label, ic]) => {
      const list = routines.filter(r => (r.slot || 'morning') === k);
      if (!list.length) return '';
      const d = list.filter(r => done.includes(r.id)).length;
      return `<div class="rt-group"><h4>${icon(ic, 16)} ${label} <small>${d}/${list.length}</small></h4>
        ${list.map(r => `<button class="rt ${done.includes(r.id) ? 'on' : ''}" data-act="rt" data-id="${r.id}" aria-pressed="${done.includes(r.id)}"><span class="tick">${icon('check', 14)}</span><span>${esc(r.name)}</span></button>`).join('')}</div>`;
    }).join('');

    // úkoly
    const due = db.filter('tasks', x => !x.done && x.due && x.due <= t).sort((a, b) => (b.prio || 2) - (a.prio || 2));
    const doneToday = db.filter('tasks', x => x.done && x.due === t);
    // kalendář
    const evs = eventsOn(t);
    // jídlo
    const meals = db.filter('meals', m => m.date === t);
    const kcal = sum(meals, m => m.kcal), prot = sum(meals, m => m.protein);
    const tg = p.targets || {};
    const dl = db.find('daylog', d => d.date === t);
    const water = (dl && dl.water) || 0;
    const plan = planFor(t);
    let planHTML = '';
    if (plan.status === 'on') planHTML = `<p class="plan-line"><b>Oběd:</b> ${esc(plan.lunch.name)} · <b>Večeře:</b> ${esc(plan.dinner.name)}${plan.cookToday ? ` <br><span class="gold">Dnes večer vaříš na Čt–Pá.</span>` : ''}</p>`;
    else if (plan.status === 'weekend') planHTML = `<p class="plan-line">${esc(PLAN.weekend)}${plan.cookToday ? ` <br><span class="gold">Dnes vaříš 6 krabiček na Po–St.</span>` : ''}</p>`;
    else if (plan.status === 'before') planHTML = `<p class="plan-line">Plán krabiček startuje v neděli 25. 10. vařením na týden 1.</p>`;
    // deník
    const j = db.find('journal', x => x.date === t) || {};
    const h = new Date().getHours();
    const showJournalFirst = h >= 19 || h < 4;

    const journal = `<section class="panel" id="journal">
        <div class="panel-head"><h3>${icon('diary', 18)} Večerní zápis</h3><a href="#/diary/${t}" class="link">Celý deník</a></div>
        <div class="moods" role="group" aria-label="Nálada">${MOODS.map((m, i) => `<button class="mood m${i + 1} ${j.mood === i + 1 ? 'on' : ''}" data-act="mood" data-v="${i + 1}" aria-pressed="${j.mood === i + 1}">${m}</button>`).join('')}</div>
        <div class="sleep-row"><label for="jSleep">${icon('moon', 16)} Spánek minulou noc</label><input id="jSleep" type="number" inputmode="decimal" step="0.5" min="0" max="16" value="${j.sleep ?? ''}" placeholder="h"></div>
        <textarea id="jText" rows="3" placeholder="Jak šel den? Co se povedlo, co zítra jinak?">${esc(j.text || '')}</textarea>
        <div class="row-btns end"><button class="btn primary sm" data-act="j-save">${j.id ? 'Uložit zápis' : 'Zapsat'}</button></div>
      </section>`;

    const blocks = has('week') ? blocksOn(t) : [];
    const nn = has('week') ? nowNext(t) : {};
    const pl = places();
    const isSun = weekday(t) === 0;
    const reviewed = db.find('weekplan', x => x.week === addDays(mondayOf(t), 7) && x.reviewed);
    const bDone = blocks.filter(b => { const x = statusFor(t, b); return x && x.status === 'done'; }).length;
    const ws = has('week') ? weekStats(t).filter(a => a.target) : [];
    const name = p.name ? `, ${esc(p.name)}` : '';
    const card = (b, label) => { const a = area(b.area); return `<div class="nn" style="--c:${a.color}"><small>${label}</small><b>${esc(b.title || a.name)}</b><span>${esc(b.start)}–${esc(b.end || '')}${b.place ? ' · ' + esc(b.place) : ''}</span></div>`; };

    root.innerHTML = `
      <section class="hello">
        <p class="hello-date">${esc(fmtDay(t, true))}${pl.length ? ` · ${esc(placeOn(t) || '')}` : ''}</p>
        <h2>${greeting()}${name}</h2>
      </section>

      ${!pushOn() && pushSupported() && !getMeta('pushAskHidden') ? `<div class="panel banner"><span>${icon('bell', 22)}</span><div><b>Zapni upozornění</b><small>Připomínky bloků, večerního zápisu a plateb i při zamčeném telefonu.</small></div><a class="btn sm primary" href="#/settings/notify">Zapnout</a><button class="icon-btn sm" data-act="push-hide" aria-label="Skrýt">${icon('x', 14)}</button></div>` : ''}

      ${has('week') && isSun && !reviewed ? `<a class="panel banner" href="#/week/review">${icon('sunrise', 22)}<div><b>Neděle = příprava týdne</b><small>Jak dopadl týden + kde budeš příští dny. 15 minut.</small></div>${icon('right', 18)}</a>` : ''}

      ${has('game') ? `<section class="panel hud reactor">
        ${reactor(s.today.score, s)}
        <div class="reactor-side">
          <div class="stat"><span class="k">Level</span><b>${s.level}</b><span class="v">${esc(s.rank)}</span></div>
          <div class="stat"><span class="k">XP</span><b>${num(s.xp - s.cur)}<small>/${num(s.next - s.cur)}</small></b><span class="v">do levelu ${s.level + 1}</span></div>
          <div class="stat ${s.streak ? 'hot' : ''}"><span class="k">Série</span><b>${s.streak}${icon('flame', 18)}</b><span class="v">${s.today.score >= STREAK_MIN ? 'dnešek se počítá' : `ještě ${STREAK_MIN - s.today.score} bodů`}</span></div>
        </div>
        <ul class="parts">
          ${has('week') && parts.blocks[1] ? `<li><span>Bloky</span><b>${parts.blocks[0]}/${parts.blocks[1]}</b></li>` : ''}
          ${has('habits') && parts.routine[1] ? `<li><span>Návyky</span><b>${parts.routine[0]}/${parts.routine[1]}</b></li>` : ''}
          ${has('tasks') ? `<li><span>Úkoly</span><b>${parts.tasks[1] ? `${parts.tasks[0]}/${parts.tasks[1]}` : '–'}</b></li>` : ''}
          ${has('diary') ? `<li><span>Deník</span><b>${parts.journal ? 'ano' : 'ne'}</b></li>` : ''}
          ${has('food') ? `<li><span>Kalorie</span><b>${num(parts.kcal)}</b></li>` : ''}
        </ul>
      </section>` : ''}

      ${has('week') && (nn.now || nn.next) ? `<section class="nn-row">${nn.now ? card(nn.now, 'Teď') : ''}${nn.next ? card(nn.next, nn.minsTo <= 90 ? `Za ${nn.minsTo} min` : 'Další') : ''}</section>` : ''}

      ${has('week') ? timerCard() : ''}

      ${has('week') ? `<section class="panel">
        <div class="panel-head"><h3>${icon('clock', 18)} Dnešní bloky <small class="muted">${bDone}/${blocks.length}</small></h3><a href="#/week" class="link">Týden</a></div>
        ${pl.length ? `<div class="chips pl-chips">${pl.map(x => `<button class="chip sm ${placeOn(t) === x ? 'on' : ''}" data-act="place" data-v="${esc(x)}">${esc(x)}</button>`).join('')}</div>` : ''}
        ${blocks.length ? blocks.map(b => blockRow(b, t)).join('') : `<p class="muted">${db.all('blocks').length ? 'Dnes nic v rozvrhu.' : 'Rozvrh je prázdný.'} <a class="link" href="#/week/plan">${db.all('blocks').length ? 'Upravit' : 'Nastavit rozvrh'}</a></p>`}
      </section>` : ''}

      <section class="capture">
        <input id="capIn" placeholder="Rychlý zápis…" aria-label="Rychlý zápis">
        ${has('notes') ? `<button class="btn sm" data-act="cap-note" title="Poznámka">${icon('note', 18)}</button>` : ''}
        ${has('tasks') ? `<button class="btn sm" data-act="cap-task" title="Úkol na dnes">${icon('tasks', 18)}</button>` : ''}
        ${has('finance') ? `<button class="btn sm" data-act="cap-tx" title="Výdaj">${icon('wallet', 18)}</button>` : ''}
      </section>

      ${has('diary') && showJournalFirst ? journal : ''}

      ${has('habits') ? `<section class="panel">
        <div class="panel-head"><h3>${icon('bolt', 18)} Návyky</h3><a href="#/settings/routines" class="link">Upravit</a></div>
        ${routines.length ? slotHTML : `<p class="muted">Zatím žádné návyky.</p><a class="btn ghost sm" href="#/settings/routines">${icon('plus', 16)} Přidat</a>`}
      </section>` : ''}

      ${has('tasks') ? `<section class="panel">
        <div class="panel-head"><h3>${icon('tasks', 18)} Úkoly na dnes</h3><a href="#/tasks" class="link">Všechny</a></div>
        ${due.length ? due.slice(0, 6).map(taskRow).join('') : `<p class="muted">${doneToday.length ? 'Všechno na dnes hotové.' : 'Na dnes nic nečeká.'}</p>`}
        ${due.length > 6 ? `<a class="link more" href="#/tasks">+ dalších ${due.length - 6}</a>` : ''}
        <button class="btn ghost sm" data-act="task-new">${icon('plus', 16)} Úkol</button>
      </section>` : ''}

      ${has('calendar') && evs.length ? `<section class="panel">
        <div class="panel-head"><h3>${icon('calendar', 18)} Dnes v kalendáři</h3><a href="#/calendar" class="link">Kalendář</a></div>
        ${evs.map(e => `<a class="row ev" href="#/calendar/${t}" style="--c:${cat(e.cat).color}"><span class="ev-time">${e.allDay || !e.start ? 'celý den' : esc(e.start)}</span><div class="row-main"><p class="row-title">${esc(e.title)}</p>${e.place ? `<p class="row-meta"><span>${esc(e.place)}</span></p>` : ''}</div></a>`).join('')}
      </section>` : ''}

      ${has('food') ? `<section class="panel">
        <div class="panel-head"><h3>${icon('food', 18)} Jídlo</h3><a href="#/food" class="link">Zapsat jídlo</a></div>
        <div class="macro"><span>Kalorie</span><b>${num(kcal)} / ${num(tg.kcal || 2500)} kcal</b></div>
        ${progress(kcal, tg.kcal || 2500)}
        <div class="macro"><span>Bílkoviny</span><b>${num(prot)} / ${num(tg.protein || 140)} g</b></div>
        ${progress(prot, tg.protein || 140, 'var(--gold)')}
        <div class="water">
          <span>${icon('drop', 16)} Voda <b>${num1l(water)}</b> / ${num1l(tg.water || 2500)} l</span>
          <button class="btn sm" data-act="water" data-v="250">+250 ml</button><button class="btn sm" data-act="water" data-v="500">+500 ml</button>
        </div>
        ${p.mealPlan ? planHTML : ''}
      </section>` : ''}

      ${ws.length ? `<section class="panel">
        <div class="panel-head"><h3>${icon('chart', 18)} Týden</h3><a href="#/week" class="link">Detail</a></div>
        ${budgetBars(ws, true)}
      </section>` : ''}

      ${has('diary') && !showJournalFirst ? journal : ''}
    `;
    startClock(root);

    root.onclick = e => {
      const b = e.target.closest('[data-act]');
      if (!b) return;
      const act = b.dataset.act, id = b.dataset.id;
      if (handleTimerAct(act, b, refresh)) return;
      if (act === 'push-hide') { setMeta('pushAskHidden', true); refresh(); return; }
      if (act === 'b-done') { e.stopPropagation(); const blk = blocks.find(x => x.id === id); if (blk) { toggleBlock(blk, t); refresh(); } return; }
      if (act === 'b-menu') { const blk = blocks.find(x => x.id === id); if (blk) blockMenu(blk, t, refresh); return; }
      if (act === 'place') { setPlace(t, b.dataset.v); refresh(); return; }
      if (act === 'cap-tx') {
        const v = root.querySelector('#capIn').value.trim();
        const m = v.match(/(\d+[\d\s]*(?:[.,]\d+)?)/);
        editTx({ type: 'out', amount: m ? parseFloat(m[1].replace(/\s/g, '').replace(',', '.')) : null, note: v.replace(m ? m[1] : '', '').replace(/k[čc]/i, '').trim(), date: t }, refresh);
        root.querySelector('#capIn').value = '';
        return;
      }
      if (act === 'rt') {
        const l = db.find('routinelog', x => x.date === t);
        const set = new Set((l && l.done) || []);
        const on = !set.has(id);
        on ? set.add(id) : set.delete(id);
        db.put('routinelog', { ...(l || {}), date: t, done: [...set] });
        const ref = `rt:${t}:${id}`;
        if (on) award(ref, 10, 'Rutina'); else revoke(ref);
        const all = routines.every(r => set.has(r.id));
        if (all && routines.length) award(`rtall:${t}`, 25, 'Celá rutina'); else revoke(`rtall:${t}`);
        refresh();
      } else if (act === 'task-toggle') { e.stopPropagation(); toggleTask(id); refresh(); }
      else if (act === 'task-edit') editTask(db.get(id), refresh);
      else if (act === 'task-new') editTask({ due: t }, refresh);
      else if (act === 'ev-new') editEvent({ date: t }, refresh);
      else if (act === 'cap-note' || act === 'cap-task') {
        const v = root.querySelector('#capIn').value.trim();
        if (!v) { root.querySelector('#capIn').focus(); return; }
        if (act === 'cap-note') { newNote({ title: v.slice(0, 60), body: v.length > 60 ? v : '', tags: ['rychlý zápis'] }); award('cap:' + Date.now(), 2, 'Zápis'); toast('Uloženo do poznámek'); }
        else { db.put('tasks', { title: v, due: t, prio: 2, done: false, created: new Date().toISOString() }); toast('Úkol na dnes přidán'); }
        refresh();
      } else if (act === 'water') {
        const d = db.find('daylog', x => x.date === t);
        db.put('daylog', { ...(d || {}), date: t, water: ((d && d.water) || 0) + Number(b.dataset.v) });
        refresh();
      } else if (act === 'mood') {
        const cur = db.find('journal', x => x.date === t);
        const text = root.querySelector('#jText').value;
        db.put('journal', { ...(cur || {}), date: t, mood: Number(b.dataset.v), text, sleep: sleepVal(root) });
        award('journal:' + t, 25, 'Deník');
        refresh();
      } else if (act === 'j-save') {
        const cur = db.find('journal', x => x.date === t);
        const text = root.querySelector('#jText').value.trim();
        if (!text && !(cur && cur.mood)) { toast('Napiš aspoň pár slov'); return; }
        db.put('journal', { ...(cur || {}), date: t, text, sleep: sleepVal(root) });
        award('journal:' + t, 25, 'Deník');
        toast('Zápis uložen');
        refresh();
      }
    };
    root.querySelector('#capIn').addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); const b = root.querySelector('.capture [data-act]'); b && b.click(); }
    });
  }
};

function num1l(ml) { return (ml / 1000).toFixed(ml % 1000 === 0 ? 0 : 2).replace('.', ',').replace(/0$/, ''); }

function sleepVal(root) { const i = root.querySelector('#jSleep'); const v = i && parseFloat(String(i.value).replace(',', '.')); return v >= 0 ? v : null; }
void hrs; void timer;
